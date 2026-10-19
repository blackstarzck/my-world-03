import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  atriumDetails,
  lobbyBays,
  lobbyRadius,
  radians,
  design,
} from "./layout.js";

// An open-bottom arch: the passage is real geometry, not a painted silhouette.
export function archBand(radius, spring, width) {
  const shape = new THREE.Shape();
  shape.moveTo(-radius - width, 0);
  shape.lineTo(-radius - width, spring);
  shape.absarc(0, spring, radius + width, Math.PI, 0, true);
  shape.lineTo(radius + width, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, spring);
  shape.absarc(0, spring, radius, 0, Math.PI, false);
  shape.lineTo(-radius, 0);
  shape.closePath();
  return shape;
}
export function portalSpandrel() {
  const { portalRadius: r, portalSpring: spring } = atriumDetails;
  const shape = new THREE.Shape();
  shape.moveTo(-r, 6);
  shape.lineTo(r, 6);
  shape.lineTo(r, spring);
  shape.absarc(0, spring, r, 0, Math.PI, false);
  shape.closePath();
  return shape;
}
export function extrude(shape, depth) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 32,
  });
}

// Hundreds of small moldings become just a few static meshes per facade.
function stonework(parent) {
  const batches = new Map();
  const add = (
    geometry,
    material,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
  ) => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    );
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.applyMatrix4(matrix);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g);
  };
  const box = (mat, size, pos) => add(new THREE.BoxGeometry(...size), mat, pos);
  const finish = () => {
    for (const [material, pieces] of batches) {
      const object = new THREE.Mesh(mergeGeometries(pieces, false), material);
      object.castShadow = object.receiveShadow = true;
      parent.add(object);
      pieces.forEach((g) => g.dispose());
    }
  };
  return { add, box, finish };
}
function surround(batch, m, radius, spring, depth) {
  for (const [offset, width, z, thickness] of [
    [0, 0.1, depth, 0.14],
    [0.12, 0.17, depth - 0.07, 0.13],
    [0.31, 0.07, depth + 0.02, 0.1],
  ])
    batch.add(
      extrude(archBand(radius + offset, spring, width), thickness),
      m.plaster,
      [0, 0, z],
    );
  // Radiating stone joints and the central keystone emphasize the arch's depth.
  for (let i = 1; i < 12; i++) {
    const a = (i * Math.PI) / 12;
    batch.add(
      new THREE.BoxGeometry(0.022, 0.26, 0.04),
      m.marble,
      [
        (radius + 0.22) * Math.cos(a),
        spring + (radius + 0.22) * Math.sin(a),
        depth + 0.1,
      ],
      [0, 0, a - Math.PI / 2],
    );
  }
  batch.box(
    m.marble,
    [0.23, 0.43, 0.22],
    [0, spring + radius + 0.18, depth + 0.08],
  );
  for (const side of [-1, 1]) {
    const x = side * (radius + 0.22);
    batch.box(m.marble, [0.65, 0.19, 0.46], [x, 0.095, depth - 0.05]);
    batch.box(m.plaster, [0.5, 0.12, 0.38], [x, 0.25, depth - 0.02]);
    batch.box(m.plaster, [0.65, 0.15, 0.44], [x, spring - 0.02, depth - 0.01]);
    batch.box(m.marble, [0.73, 0.07, 0.48], [x, spring + 0.08, depth - 0.01]);
  }
}

export function buildAtriumPortal(parent, m) {
  const b = stonework(parent);
  const {
    portalRadius: r,
    portalSpring: spring,
    portalDepth: depth,
  } = atriumDetails;
  for (const side of [-1, 1])
    b.box(m.plaster, [4, 6, depth], [side * 4, 3, depth / 2]);
  b.add(extrude(portalSpandrel(), depth), m.plaster);
  surround(b, m, r, spring, 0.65);
  for (const side of [-1, 1]) {
    // Shallow framed panels give the broad shoulders of each portal a rhythm.
    const x = side * 4.55;
    b.box(m.marble, [1.6, 3.55, 0.035], [x, 2.35, 0.77]);
    for (const dx of [-0.88, 0.88])
      b.box(m.plaster, [0.1, 3.85, 0.13], [x + dx, 2.35, 0.79]);
    for (const y of [0.43, 4.27])
      b.box(m.plaster, [1.86, 0.1, 0.13], [x, y, 0.79]);
  }
  for (const [y, h, d] of [
    [5.5, 0.12, 0.85],
    [5.68, 0.18, 0.96],
    [5.86, 0.12, 1.08],
  ])
    b.box(m.plaster, [12, h, d], [0, y, d / 2]);
  b.finish();
}

export function buildAtriumRelief(parent, m) {
  const relief = new THREE.Group();
  relief.name = "Arched stone wall relief";
  parent.add(relief);
  // Recess-colored infill behind projecting archivolts creates blind arcades.
  const inset = m.marble.clone();
  inset.color.set("#b8ae99");
  for (const bay of lobbyBays) {
    const a = radians(bay.angle),
      group = new THREE.Group();
    group.position.set(
      bay.center[0] + lobbyRadius * Math.cos(a),
      0,
      -bay.center[1] - lobbyRadius * Math.sin(a),
    );
    group.rotation.y = Math.PI / 2 + a;
    relief.add(group);
    const b = stonework(group);
    const r = 1.35,
      spring = 2.5;
    const panel = new THREE.Shape();
    panel.moveTo(-r, 0.3);
    panel.lineTo(r, 0.3);
    panel.lineTo(r, spring);
    panel.absarc(0, spring, r, 0, Math.PI, false);
    panel.closePath();
    b.add(extrude(panel, 0.025), inset, [0, 0, 0.08]);
    surround(b, m, r, spring, 0.27);
    b.box(m.marble, [2.5, 0.08, 0.06], [0, 1.0, 0.13]);
    b.box(m.plaster, [2.58, 0.08, 0.12], [0, 0.42, 0.18]);
    // A small round medallion above each blind arch, with concentric relief.
    b.add(
      new THREE.TorusGeometry(0.23, 0.048, 8, 32),
      m.plaster,
      [0, 4.73, 0.19],
    );
    b.add(new THREE.CircleGeometry(0.18, 32), inset, [0, 4.73, 0.15]);
    b.finish();
  }
  // Merge across the eight bays as well, keeping only three wall-detail draws.
  relief.updateMatrixWorld(true);
  const inverse = relief.matrixWorld.clone().invert();
  const combined = stonework(relief);
  relief.traverse((object) => {
    if (!object.isMesh) return;
    const geometry = object.geometry
      .clone()
      .applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld),
      );
    combined.add(geometry, object.material);
    object.geometry.dispose();
  });
  relief.clear();
  combined.finish();
  const columns = stonework(parent);
  for (const col of design.lobby.columns) {
    const p = [col.x, 0, -col.y];
    // Revolved stepped profiles provide bases, shafts and capitals in one mesh.
    const profile = [
      [0.36, 0],
      [0.36, 0.16],
      [0.3, 0.2],
      [0.3, 0.29],
      [0.25, 0.34],
      [0.22, 0.48],
      [0.19, 4.9],
      [0.24, 4.98],
      [0.24, 5.1],
      [0.31, 5.14],
      [0.31, 5.29],
      [0.36, 5.34],
      [0.36, 5.49],
      [0.24, 5.53],
      [0.24, 6],
    ];
    columns.add(
      new THREE.LatheGeometry(
        profile.map((p) => new THREE.Vector2(...p)),
        32,
      ),
      m.plaster,
      p,
    );
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      columns.add(new THREE.CylinderGeometry(0.012, 0.015, 4.15, 6), m.marble, [
        p[0] + 0.215 * Math.cos(a),
        2.65,
        p[2] + 0.215 * Math.sin(a),
      ]);
    }
  }
  columns.finish();
}

export function buildAtriumDome(roof, m) {
  const b = stonework(roof);
  for (const [r, y, tube] of [
    [4, 6.05, 0.1],
    [4.16, 5.97, 0.13],
    [4.39, 5.85, 0.1],
    [4.57, 5.9, 0.08],
  ])
    b.add(
      new THREE.TorusGeometry(r, tube, 12, 128),
      m.plaster,
      [0, y, 0],
      [Math.PI / 2, 0, 0],
    );
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24;
    b.add(
      new THREE.BoxGeometry(0.15, 0.14, 0.24),
      m.marble,
      [4.32 * Math.cos(a), 5.82, 4.32 * Math.sin(a)],
      [0, -a, 0],
    );
  }
  const dome = new THREE.SphereGeometry(
    3.98,
    64,
    20,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  dome.scale(1, 0.45, 1);
  const glass = new THREE.Mesh(dome, m.skylight);
  glass.position.y = 6.12;
  roof.add(glass);
  // Slender radial ribs and latitude rings follow the curved glass shell.
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const points = Array.from({ length: 25 }, (_, j) => {
      const t = (j * Math.PI) / 48;
      return new THREE.Vector3(
        3.96 * Math.sin(t) * Math.cos(a),
        6.12 + 1.78 * Math.cos(t),
        3.96 * Math.sin(t) * Math.sin(a),
      );
    });
    b.add(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        32,
        0.018,
        6,
        false,
      ),
      m.dark,
    );
  }
  for (let j = 1; j <= 6; j++) {
    const t = (j * Math.PI) / 12;
    b.add(
      new THREE.TorusGeometry(3.96 * Math.sin(t), 0.019, 6, 96),
      m.dark,
      [0, 6.12 + 1.78 * Math.cos(t), 0],
      [Math.PI / 2, 0, 0],
    );
  }
  b.finish();
}
