import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import {
  design,
  roomIds,
  radians,
  roomPoint,
  lobbyArcs,
  lobbyRadius,
  lobbyOutline,
} from "./layout.js";
import { labelTexture, contactTexture } from "./materials.js";
import {
  buildAtriumPortal,
  buildAtriumRelief,
  buildAtriumDome,
} from "./atrium.js";

export function box(parent, material, size, position, shadows = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function mesh(
  parent,
  geometry,
  material,
  position = [0, 0, 0],
  cast = true,
) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = cast;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
export function makeRoom(id) {
  const group = new THREE.Group();
  group.name = `Gallery ${id}`;
  group.position.fromArray(roomPoint(id, 0, 0));
  group.rotation.y = radians(design.rooms[id].angle - 90);
  return group;
}
function rectangle(shape, x, y, w, h) {
  shape.moveTo(x, y);
  shape.lineTo(x + w, y);
  shape.lineTo(x + w, y + h);
  shape.lineTo(x, y + h);
  shape.closePath();
  return shape;
}
function slab(parent, shape, material, height, depth = 0.3) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 96,
  });
  geo.rotateX(-Math.PI / 2);
  return mesh(parent, geo, material, [0, height, 0]);
}
function archShape(center, r, start, end, thickness = 0.3) {
  const s = new THREE.Shape();
  s.absarc(...center, r, radians(start), radians(end), false);
  s.absarc(...center, r - thickness, radians(end), radians(start), true);
  s.closePath();
  return s;
}
function area(
  parent,
  position,
  target,
  width,
  height,
  intensity,
  color = "#fff2df",
) {
  const light = new THREE.RectAreaLight(color, intensity, width, height);
  light.position.set(...position);
  light.lookAt(...target);
  parent.add(light);
  light.userData.dayIntensity = intensity;
  return light;
}
function skylight(parent, roof, m, x, v, w, l, h, lights) {
  const glass = mesh(
    roof,
    new THREE.PlaneGeometry(w, l),
    m.skylight,
    [x, h + 0.17, -v],
    false,
  );
  glass.rotation.x = -Math.PI / 2;
  for (const z of [-l / 2, l / 2])
    box(roof, m.plaster, [w + 0.18, 0.18, 0.09], [x, h - 0.05, -v + z]);
  for (const t of [-w / 2, w / 2])
    box(roof, m.plaster, [0.09, 0.18, l], [x + t, h - 0.05, -v]);
  for (let z = -l / 2 + 2; z < l / 2; z += 2)
    box(roof, m.dark, [w, 0.035, 0.035], [x, h + 0.16, -v + z], false);
  lights.push(area(parent, [x, h - 0.22, -v], [x, 0, -v], w, l, 4.5));
}
function sign(parent, text, small, position, width = 2.4) {
  const mat = new THREE.MeshBasicMaterial({
    map: labelTexture([text, small]),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return mesh(
    parent,
    new THREE.PlaneGeometry(width, width / 2),
    mat,
    position,
    false,
  );
}
export function buildArchitecture(scene, m) {
  RectAreaLightUniformsLib.init();
  const roofParts = [],
    lights = [],
    groups = {};
  const lobby = new THREE.Group();
  lobby.name = "Atrium";
  scene.add(lobby);
  groups.lobby = lobby;
  const floorShape = new THREE.Shape(
    lobbyOutline().map((p) => new THREE.Vector2(...p)),
  );
  const lobbyFloor = slab(lobby, floorShape, m.lobby, -0.2, 0.2);
  lobbyFloor.geometry.computeBoundingBox();
  const uv = lobbyFloor.geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i) / 25 + 0.5, uv.getY(i) / 25 + 0.5);
  const roofShape = floorShape.clone();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 4, 0, Math.PI * 2, true);
  roofShape.holes.push(hole);
  const lobbyRoof = new THREE.Group();
  lobby.add(lobbyRoof);
  roofParts.push(lobbyRoof);
  slab(lobbyRoof, roofShape, m.ceiling, 6);
  buildAtriumDome(lobbyRoof, m);
  lights.push(area(lobby, [0, 5.8, 0], [0, 0, 0], 6, 6, 6));
  for (let i = 0; i < 3; i++) {
    const a = lobbyArcs[i];
    if (i === 1) {
      const gap = (Math.asin(1.5 / lobbyRadius) * 180) / Math.PI;
      slab(
        lobby,
        archShape(a.center, lobbyRadius, 60, 90 - gap),
        m.plaster,
        0,
        6,
      );
      slab(
        lobby,
        archShape(a.center, lobbyRadius, 90 + gap, 120),
        m.plaster,
        0,
        6,
      );
      slab(
        lobby,
        archShape(a.center, lobbyRadius, 90 - gap, 90 + gap),
        m.plaster,
        3,
        3,
      );
    } else
      slab(
        lobby,
        archShape(a.center, lobbyRadius, a.start, a.end),
        m.plaster,
        0,
        6,
      );
    for (const [level, width, height] of [
      [0.1, 0.12, 0.14],
      [5.44, 0.12, 0.1],
      [5.6, 0.24, 0.18],
      [5.82, 0.36, 0.12],
    ])
      slab(
        lobby,
        archShape(a.center, lobbyRadius + width, a.start, a.end, width + 0.04),
        m.plaster,
        level,
        height,
      );
  }
  buildAtriumRelief(lobby, m);
  const doorZ = -design.lobby.entry.y;
  for (const x of [-0.75, 0.75]) {
    box(lobby, m.glass, [1.46, 2.93, 0.012], [x, 1.5, doorZ], false);
    box(lobby, m.dark, [0.025, 3, 0.05], [x + 0.735, 1.5, doorZ], false);
    box(
      lobby,
      m.brass,
      [0.025, 0.55, 0.055],
      [x + (x < 0 ? 0.58 : -0.58), 1.3, doorZ - 0.03],
      false,
    );
  }
  box(lobby, m.dark, [3, 0.04, 0.05], [0, 3, doorZ]);
  mesh(
    lobby,
    new THREE.CylinderGeometry(1.8, 1.8, 0.45, 96),
    m.marble,
    [0, 0.225, 0],
  );
  const sculptureShape = new THREE.Shape();
  sculptureShape.absarc(0, 0, 1.2, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path();
  ringHole.absarc(0, 0, 1.05, 0, Math.PI * 2, true);
  sculptureShape.holes.push(ringHole);
  const sculpture = mesh(
    lobby,
    new THREE.ExtrudeGeometry(sculptureShape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.008,
      bevelSegments: 3,
      curveSegments: 128,
    }),
    m.bronze,
    [0, 1.65, 0],
  );
  sculpture.rotation.y = Math.PI / 2;
  sculpture.position.x = -0.075;
  for (const b of design.lobby.benches) {
    const shape = archShape([0, 0], 5.3, b.angle - 20, b.angle + 20, 0.6);
    slab(lobby, shape, m.oak, 0.35, 0.1);
    for (const a of [b.angle - 15, b.angle + 15]) {
      const p = [5 * Math.cos(radians(a)), 0.175, -5 * Math.sin(radians(a))];
      const leg = box(lobby, m.dark, [0.12, 0.35, 0.5], p);
      leg.rotation.y = radians(a - 90);
    }
  }
  const contactMap = contactTexture(),
    contactMat = new THREE.MeshBasicMaterial({
      map: contactMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
  const cs = mesh(
    lobby,
    new THREE.PlaneGeometry(5.2, 5.2),
    contactMat,
    [0, 0.006, 0],
    false,
  );
  cs.rotation.x = -Math.PI / 2;
  for (const id of roomIds) {
    const group = makeRoom(id);
    scene.add(group);
    groups[id] = group;
    const h = design.rooms[id].height;
    const wall =
      id === "01" ? m.teal : id === "02" ? m.concrete : m.sculptureWall;
    const floor =
      id === "01" ? m.woodFloor : id === "02" ? m.concreteFloor : m.stone;
    const floorMesh = mesh(
      group,
      new THREE.PlaneGeometry(12, 24),
      floor,
      [0, 0.001, -12],
      false,
    );
    floorMesh.rotation.x = -Math.PI / 2;
    box(group, m.plaster, [12.6, 0.2, 24.6], [0, -0.11, -12]);
    box(group, wall, [0.3, h, 24.3], [-6.15, h / 2, -12]);
    if (id !== "03") box(group, wall, [0.3, h, 24.3], [6.15, h / 2, -12]);
    else {
      box(group, wall, [0.3, 0.9, 24.3], [6.15, 0.45, -12]);
      box(group, wall, [0.3, 0.6, 24.3], [6.15, 5.7, -12]);
      for (const v of [1, 23])
        box(group, wall, [0.3, 4.5, 2], [6.15, 3.15, -v]);
      for (const v of design.window.mullions) {
        box(group, m.plaster, [0.4, 4.5, 0.3], [6.1, 3.15, -v]);
        box(group, m.dark, [0.065, 4.5, 0.045], [5.98, 3.15, -v]);
      }
      for (const h2 of [0.9, 5.4])
        box(group, m.dark, [0.065, 0.04, 20], [5.98, h2, -12]);
      const window = mesh(
        group,
        new THREE.PlaneGeometry(20, 4.5),
        m.glass,
        [6.05, 3.15, -12],
        false,
      );
      window.rotation.y = -Math.PI / 2;
      lights.push(
        area(group, [5.7, 3.4, -12], [0, 1.5, -12], 19, 4, 5, "#e5eff7"),
      );
    }
    box(group, wall, [12.6, h, 0.3], [0, h / 2, -24.15]);
    buildAtriumPortal(group, m);
    const portalRoof = box(group, m.ceiling, [12, 0.3, 0.3], [0, 6.15, 0.15]);
    roofParts.push(portalRoof);
    sign(
      group,
      `0${Number(id)}`,
      id === "01"
        ? "THE CLASSIC"
        : id === "02"
          ? "THE CONTEMPORARY"
          : "THE OBJECT",
      [0, 5.15, 0.92],
      1.6,
    );
    const roof = new THREE.Group();
    group.add(roof);
    roofParts.push(roof);
    const shape = rectangle(new THREE.Shape(), -6, 0, 12, 24);
    const skies = design.skylights.filter((s) => s.room === id);
    for (const sky of skies) {
      shape.holes.push(
        rectangle(
          new THREE.Path(),
          sky.t - sky.w / 2,
          sky.v - sky.l / 2,
          sky.w,
          sky.l,
        ),
      );
    }
    slab(roof, shape, id === "02" ? m.concrete : m.ceiling, h);
    for (const sky of skies)
      skylight(group, roof, m, sky.t, sky.v, sky.w, sky.l, h, lights);
    if (id === "02") {
      for (const v of design.beams.v)
        box(roof, m.concrete, [12, 0.6, 0.3], [0, 4.7, -v]);
      for (const side of [-1, 1])
        for (let v = 3; v < 24; v += 3)
          box(
            group,
            m.concrete,
            [0.012, h, 0.011],
            [side * 5.991, h / 2, -v],
            false,
          );
    }
    for (const side of [-1, 1]) {
      box(
        group,
        id === "01" ? m.plaster : wall,
        [0.1, 0.18, 24],
        [side * 5.96, 0.09, -12],
      );
      if (id === "01") {
        for (const [y, w, t] of [
          [5.4, 0.3, 0.08],
          [5.48, 0.2, 0.08],
          [5.55, 0.12, 0.06],
        ])
          box(roof, m.plaster, [w, t, 24], [side * (6 - w / 2), y, -12]);
        for (let v = 2; v < 24; v += 4) {
          box(roof, m.plaster, [0.04, 0.025, 3.65], [side * 4.85, 5.965, -v]);
        }
      }
    }
    for (const track of design.tracks.filter((t) => t.room === id)) {
      box(roof, m.dark, [0.055, 0.055, 20], [track.t, track.h, -12]);
      for (let v = 3; v < 23; v += 4) {
        box(
          roof,
          m.dark,
          [0.012, h - track.h, 0.012],
          [track.t, (h + track.h) / 2, -v],
          false,
        );
        const fixture = mesh(
          roof,
          new THREE.CylinderGeometry(0.055, 0.067, 0.15, 12),
          m.dark,
          [track.t, track.h - 0.13, -v],
        );
        fixture.rotation.z = track.t > 0 ? -0.45 : 0.45;
        const lens = mesh(
          roof,
          new THREE.CircleGeometry(0.043, 12),
          m.light,
          [track.t, track.h - 0.2, -v],
          false,
        );
        lens.rotation.x = -Math.PI / 2;
      }
    }
  }
  const ground = mesh(
    scene,
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: "#dddcd0", roughness: 1 }),
    [0, -0.24, 0],
    false,
  );
  ground.rotation.x = -Math.PI / 2;
  return { groups, roofParts, lights, contactMat };
}
