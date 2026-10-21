import * as THREE from "three";
import { loadCentralExhibit } from "./central-exhibit.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { design, radians } from "./layout.js";
import { box, mesh } from "./architecture.js";
import { labelTexture } from "./materials.js";
import { canvasDimensions } from "./canvas-display.js";
import { portfolioExhibits, posterUrl } from "../portfolio.js";

function caseFrame() {
  const parts = [];
  for (const x of [-0.59, 0.59])
    for (const z of [-0.59, 0.59])
      parts.push(new THREE.BoxGeometry(0.02, 2.4, 0.02).translate(x, 1.2, z));
  for (const y of [0.01, 2.39])
    for (const z of [-0.59, 0.59])
      parts.push(new THREE.BoxGeometry(1.2, 0.02, 0.02).translate(0, y, z));
  for (const y of [0.01, 2.39])
    for (const x of [-0.59, 0.59])
      parts.push(new THREE.BoxGeometry(0.02, 0.02, 1.2).translate(x, y, 0));
  const result = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return result;
}
export async function buildExhibits(groups, m, contactMat, manager,
  { loadCentral = loadCentralExhibit } = {}) {
  const loader = new THREE.TextureLoader(manager);
  const [pictures, blackHole] = await Promise.all([
    Promise.all(portfolioExhibits.map(async (data) => {
      const src = posterUrl(data), map = await loader.loadAsync(src);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
      return { ...data, src, map };
    })),
    loadCentral(manager),
  ]);
  groups.lobby.add(blackHole);
  const picturesById = new Map(pictures.map((p) => [p.id, p]));
  const selectable = [],
    collection = [],
    lightingTargets = [
      { object: groups.lobby, target: [0, 1.65, 0], source: [3, 5.6, 2] },
    ];
  function register(data, object, target, normal, width, height) {
    object.updateWorldMatrix(true, false);
    const entry = {
      ...data,
      target: object.localToWorld(new THREE.Vector3(...target)).toArray(),
      normal: new THREE.Vector3(...normal)
        .transformDirection(object.matrixWorld)
        .toArray(),
      width,
      height,
      date_display: "프로젝트 포트폴리오",
    };
    collection.push(entry);
    return entry;
  }
  function select(object, entry) {
    object.userData.artwork = entry;
    selectable.push(object);
  }
  const canvasSide = new THREE.MeshStandardMaterial({ color: "#eee9df", roughness: 0.98 });
  function painting(parent, id, position, rotation, endWall = false, inCase = false) {
    const work = picturesById.get(id);
    if (!work) return null;
    const { width, height, depth } = canvasDimensions(inCase ? "case" : work.slotKind, endWall);
    const group = new THREE.Group();
    group.name = `canvas-${id}`;
    group.position.set(...position);
    group.rotation.y = rotation;
    parent.add(group);
    // The side ends behind the painted face: no front rail or mat covers the image.
    const side = box(group, canvasSide, [width, height, depth], [0, 0, depth / 2]);
    const image = mesh(group, new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: work.map, toneMapped: false }), [0, 0, depth + 0.001], false);
    const { map: _map, ...metadata } = work;
    const entry = register(metadata, group, [0, 0, depth + 0.002], [0, 0, 1], width, height);
    select(image, entry);
    select(side, entry);
    if (!inCase) {
      const shade = mesh(group, new THREE.PlaneGeometry(width * 1.13, height * 1.18),
        contactMat, [0.015, -0.025, 0.001], false);
      shade.renderOrder = 0;
      const panel = work.slotKind === "panel";
      const label = mesh(group, new THREE.PlaneGeometry(0.66, 0.33),
        new THREE.MeshBasicMaterial({
          map: labelTexture([work.shortName, work.title,
            `${work.projects.length} PROJECT${work.projects.length > 1 ? "S" : ""}`],
            { size: 1024, color: work.room === "01" ? "#d6c6a6" : "#48564b" }),
          transparent: true, depthWrite: false,
        }),
        panel ? [0, -height / 2 - 0.23, depth + 0.003]
          : [width / 2 + 0.48, -height / 2 + 0.12, depth + 0.003], false);
      select(label, entry);
      lightingTargets.push({ object: group, target: [0, 0, depth], source: [0, 3, 1.8], facing: true });
    }
    return entry;
  }
  for (const a of design.artworks)
    painting(
      groups[a.room],
      a.id,
      a.face === "end"
        ? [0, a.center_z, -23.91]
        : [a.t - Math.sign(a.t) * 0.1, a.center_z, -a.v],
      a.face === "end" ? 0 : a.t < 0 ? Math.PI / 2 : -Math.PI / 2,
      a.face === "end",
    );
  for (const p of design.panels) {
    const parent = new THREE.Group();
    parent.name = p.id;
    parent.userData.room = p.room;
    parent.position.set(p.t, 0, -p.v);
    parent.rotation.y = radians(p.rotation_y ?? 0);
    groups[p.room].add(parent);
    box(
      parent,
      p.room === "01" ? m.teal : m.concrete,
      [p.w, p.h, p.l],
      [0, p.h / 2, 0],
    );
    for (const side of [-1, 1]) {
      const front = p.room === "01" ? (p.t < 0 ? 1 : -1) : 1;
      painting(
        parent,
        `${p.id}-${side === front ? "F" : "B"}`,
        p.room === "01"
          ? [side * (p.w / 2 + 0.015), 1.5, 0]
          : [0, 1.5, side * (p.l / 2 + 0.015)],
        p.room === "01" ? (side * Math.PI) / 2 : side === 1 ? 0 : Math.PI,
      );
    }
    const shadow = mesh(
      parent,
      new THREE.PlaneGeometry(p.w + 1, p.l + 1),
      contactMat,
      [0, 0.008, 0],
      false,
    );
    shadow.rotation.x = -Math.PI / 2;
  }
  for (const b of design.benches) {
    box(groups[b.room], m.oak, [b.w, 0.1, b.l], [b.t, 0.4, -b.v]);
    for (const d of [-0.7, 0.7])
      box(groups[b.room], m.dark, [0.48, 0.35, 0.16], [b.t, 0.175, -b.v + d]);
  }
  const frames = caseFrame();
  for (const c of design.cases) {
    const data = picturesById.get(c.id), group = new THREE.Group();
    group.name = c.id;
    group.position.set(c.t, 0, -c.v);
    groups[c.room].add(group);
    mesh(group, frames, m.dark);
    box(group, m.dark, [1.2, 0.028, 1.2], [0, 0.014, 0]);
    box(group, m.glass, [1.178, 2.37, 1.178], [0, 1.2, 0], false);
    const pedestal = box(group, m.marble, [0.6, 1, 0.6], [0, 0.5, 0]);
    // The canvas sits entirely inside the glass, supported by a narrow rear stand.
    box(group, canvasSide, [0.045, 0.5, 0.045], [0, 1.25, -0.04]);
    const entry = painting(group, c.id, [0, 1.45, 0.12], 0, false, true);
    select(pedestal, entry);
    const label = mesh(
      group,
      new THREE.PlaneGeometry(0.62, 0.31),
      new THREE.MeshBasicMaterial({
        map: labelTexture([data.shortName, data.title, c.id], {
          size: 1024,
          color: "#48564b",
        }),
        transparent: true,
        depthWrite: false,
      }),
      [0, 0.76, 0.625],
      false,
    );
    select(label, entry);
    lightingTargets.push({
      object: group,
      target: [0, 1.45, 0.15],
      source: [0, 4.8, 0.6],
    });
    const shadow = mesh(
      group,
      new THREE.PlaneGeometry(1.8, 1.8),
      contactMat,
      [0, 0.009, 0],
      false,
    );
    shadow.rotation.x = -Math.PI / 2;
  }
  collection.sort((a, b) => a.room.localeCompare(b.room) || a.order - b.order);
  return { selectable, pictures, lightingTargets, collection, blackHole };
}
