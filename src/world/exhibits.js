import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { design, radians } from "./layout.js";
import { box, mesh } from "./architecture.js";
import { labelTexture } from "./materials.js";
import artworks from "./artworks.json";

const names = [
  "침묵의 초상",
  "시간을 담은 그릇",
  "연속된 형태",
  "사유의 얼굴",
  "빛을 품은 항아리",
  "균형의 조각",
  "고요한 얼굴",
  "유기적 구조",
  "비어 있는 중심",
  "시간의 흔적",
];
function frameGeometry() {
  const geometries = [];
  for (const x of [-0.59, 0.59])
    for (const z of [-0.59, 0.59])
      geometries.push(
        new THREE.BoxGeometry(0.02, 2.4, 0.02).translate(x, 1.2, z),
      );
  for (const y of [0.01, 2.39]) {
    for (const z of [-0.59, 0.59])
      geometries.push(
        new THREE.BoxGeometry(1.2, 0.02, 0.02).translate(0, y, z),
      );
    for (const x of [-0.59, 0.59])
      geometries.push(
        new THREE.BoxGeometry(0.02, 0.02, 1.2).translate(x, y, 0),
      );
  }
  const result = mergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  return result;
}
function vessel(type) {
  const points = [];
  for (let i = 0; i <= 48; i++) {
    const y = i / 48;
    let r =
      type === 1
        ? 0.05 + 0.18 * Math.sin(Math.PI * y) ** 0.8
        : 0.055 + 0.16 * Math.sin(Math.PI * y) ** 1.4;
    if (y > 0.78) r = 0.075 + (y - 0.78) * 0.16;
    if (y < 0.06) r = 0.085;
    points.push(new THREE.Vector2(r, y * 0.7));
  }
  points.push(new THREE.Vector2(0.09, 0.7), new THREE.Vector2(0.07, 0.66));
  return new THREE.LatheGeometry(points, 64);
}
export async function buildExhibits(groups, m, contactMat, manager) {
  const loader = new THREE.TextureLoader(manager);
  const [pictures, portrait] = await Promise.all([
    Promise.all(
      artworks.map(async (a) => {
        const map = await loader.loadAsync(a.src);
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        return { ...a, map };
      }),
    ),
    new GLTFLoader(manager).loadAsync("/assets/portrait.glb"),
  ]);
  const selectable = [];
  let index = 0;
  function painting(
    parent,
    id,
    position,
    rotation,
    width = 1.5,
    height = 2,
    modern = false,
  ) {
    const work = pictures[index++ % pictures.length];
    const group = new THREE.Group();
    group.position.set(...position);
    group.rotation.y = rotation;
    parent.add(group);
    const border = modern ? 0.035 : 0.085,
      mat = modern ? m.dark : m.brass;
    const ratio = work.map.image.width / work.map.image.height,
      availableW = width - border * 2 - 0.1,
      availableH = height - border * 2 - 0.1;
    const w = Math.min(availableW, availableH * ratio),
      h = w / ratio;
    width = w + border * 2 + 0.1;
    height = h + border * 2 + 0.1;
    box(group, m.dark, [width - 0.012, height - 0.012, 0.08], [0, 0, 0]);
    box(group, m.plaster, [width - 0.08, height - 0.08, 0.018], [0, 0, 0.045]);
    for (const y of [-height / 2 + border / 2, height / 2 - border / 2])
      box(group, mat, [width, border, 0.085], [0, y, 0.065]);
    for (const x of [-width / 2 + border / 2, width / 2 - border / 2])
      box(group, mat, [border, height - border * 2, 0.085], [x, 0, 0.065]);
    if (!modern) {
      for (const y of [-height / 2 + 0.12, height / 2 - 0.12])
        box(group, m.bronze, [width - 0.2, 0.018, 0.025], [0, y, 0.12]);
      for (const x of [-width / 2 + 0.12, width / 2 - 0.12])
        box(group, m.bronze, [0.018, height - 0.24, 0.025], [x, 0, 0.12]);
    }
    const image = mesh(
      group,
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: work.map,
        roughness: 0.86,
        metalness: 0,
        emissive: "#ffffff",
        emissiveMap: work.map,
        emissiveIntensity: 0.11,
      }),
      [0, 0, 0.11],
      false,
    );
    const data = {
      ...work,
      id: `${id}-${work.id}`,
      kind: "회화",
      room: parent.userData.room ?? parent.name,
      description:
        "화면 속 작품을 가까이에서 감상해 보세요. 실제 미술관의 공개 소장품 이미지를 사용했습니다.",
    };
    image.userData.artwork = data;
    selectable.push(image);
    const label = mesh(
      group,
      new THREE.PlaneGeometry(0.32, 0.16),
      new THREE.MeshBasicMaterial({
        map: labelTexture(
          [work.artist_display.split("(")[0].slice(0, 24), work.date_display],
          { size: 512, color: modern ? "#484943" : "#c7c2af" },
        ),
        transparent: true,
        depthWrite: false,
      }),
      [width / 2 + 0.2, -height / 2 + 0.05, 0.02],
      false,
    );
    label.userData.artwork = data;
    selectable.push(label);
  }
  for (const a of design.artworks) {
    const parent = groups[a.room];
    painting(
      parent,
      a.id,
      a.face === "end"
        ? [0, a.center_z, -23.91]
        : [a.t - Math.sign(a.t) * 0.1, a.center_z, -a.v],
      a.face === "end" ? 0 : a.t < 0 ? Math.PI / 2 : -Math.PI / 2,
      a.w,
      a.h,
      a.room !== "01",
    );
  }
  for (const p of design.panels) {
    const parent = new THREE.Group();
    parent.name = p.id;
    parent.userData.room = groups[p.room].name;
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
      if (p.room === "01")
        painting(
          parent,
          p.id,
          [side * (p.w / 2 + 0.015), 1.5, 0],
          (side * Math.PI) / 2,
          1.5,
          2,
          false,
        );
      else
        painting(
          parent,
          p.id,
          [0, 1.5, side * (p.l / 2 + 0.015)],
          side === 1 ? 0 : Math.PI,
          1.5,
          2,
          true,
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
    const parent = groups[b.room];
    box(parent, m.oak, [b.w, 0.1, b.l], [b.t, 0.4, -b.v]);
    for (const d of [-0.7, 0.7])
      box(parent, m.dark, [0.48, 0.35, 0.16], [b.t, 0.175, -b.v + d]);
    const shadow = mesh(
      parent,
      new THREE.PlaneGeometry(1.1, 2.6),
      contactMat,
      [b.t, 0.009, -b.v],
      false,
    );
    shadow.rotation.x = -Math.PI / 2;
  }
  const portraitBounds = new THREE.Box3().setFromObject(portrait.scene),
    portraitSize = portraitBounds.getSize(new THREE.Vector3()),
    portraitCenter = portraitBounds.getCenter(new THREE.Vector3());
  const frames = frameGeometry();
  for (let i = 0; i < design.cases.length; i++) {
    const c = design.cases[i],
      group = new THREE.Group();
    group.name = c.id;
    group.position.set(c.t, 0, -c.v);
    groups["03"].add(group);
    mesh(group, frames, m.dark);
    box(group, m.dark, [1.2, 0.028, 1.2], [0, 0.014, 0]);
    box(group, m.glass, [1.178, 2.37, 1.178], [0, 1.2, 0], false);
    const pedestal = box(group, m.marble, [0.6, 1, 0.6], [0, 0.5, 0]);
    const sculpture = new THREE.Group();
    group.add(sculpture);
    sculpture.position.y = 1;
    const material = i % 3 === 0 ? m.marble : i % 3 === 1 ? m.bronze : m.brass;
    if ([0, 3, 6].includes(i)) {
      const head = portrait.scene.clone(true);
      const scale = 0.7 / portraitSize.y;
      head.scale.setScalar(scale);
      head.position.set(
        -portraitCenter.x * scale,
        -portraitBounds.min.y * scale,
        -portraitCenter.z * scale,
      );
      head.rotation.y = i === 3 ? -0.25 : 0.2;
      head.traverse((o) => {
        if (o.isMesh) {
          o.material = material;
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      sculpture.add(head);
    } else if ([1, 4, 9].includes(i)) {
      mesh(sculpture, vessel(i % 2), material);
      if (i === 1 || i === 9)
        for (const side of [-1, 1]) {
          const handle = mesh(
            sculpture,
            new THREE.TorusGeometry(0.1, 0.014, 10, 32, Math.PI * 1.6),
            material,
            [side * 0.17, 0.49, 0],
          );
          handle.rotation.z = side === 1 ? -0.8 : 2.35;
        }
    } else if (i === 2 || i === 8) {
      const knot = mesh(
        sculpture,
        new THREE.TorusKnotGeometry(0.155, 0.044, 112, 16, 2, i === 2 ? 3 : 5),
        material,
        [0, 0.35, 0],
      );
      knot.scale.set(0.95, 1.45, 0.95);
      knot.rotation.z = 0.28;
      box(sculpture, m.marble, [0.24, 0.06, 0.24], [0, 0.03, 0]);
    } else {
      const geo = new THREE.IcosahedronGeometry(0.22, 4),
        p = geo.attributes.position;
      for (let j = 0; j < p.count; j++) {
        const x = p.getX(j),
          y = p.getY(j),
          z = p.getZ(j),
          f = 1 + 0.16 * Math.sin(y * 22 + x * 14);
        p.setXYZ(j, x * f, y * 1.55, z * f);
      }
      geo.computeVertexNormals();
      mesh(sculpture, geo, material, [0, 0.35, 0]);
    }
    const info = {
      id: c.id,
      title: names[i],
      artist_display: [0, 3, 6].includes(i)
        ? "Lee Perry-Smith · 3D scan / material study"
        : "TRIAD · Form studies",
      date_display: "형태와 재료의 연구",
      kind: "조각",
      description:
        "돌의 표면, 금속의 반사, 유리 너머의 깊이를 살펴보는 전시입니다.",
      url: [0, 3, 6].includes(i) ? "https://www.triplegangers.com/" : null,
    };
    sculpture.traverse((o) => {
      if (o.isMesh) {
        o.userData.artwork = info;
        selectable.push(o);
      }
    });
    pedestal.userData.artwork = info;
    selectable.push(pedestal);
    const label = mesh(
      group,
      new THREE.PlaneGeometry(0.29, 0.145),
      new THREE.MeshBasicMaterial({
        map: labelTexture([c.id, names[i]], { color: "#575246" }),
        transparent: true,
        depthWrite: false,
      }),
      [0, 0.84, 0.303],
      false,
    );
    label.userData.artwork = info;
    const shadow = mesh(
      group,
      new THREE.PlaneGeometry(1.8, 1.8),
      contactMat,
      [0, 0.008, 0],
      false,
    );
    shadow.rotation.x = -Math.PI / 2;
  }
  return { selectable, pictures };
}
