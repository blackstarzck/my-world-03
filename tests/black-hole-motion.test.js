import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { blackHoleActivation, createBlackHoleMotion } from "../src/world/black-hole-motion.js";
import { canStand, destinations } from "../src/world/layout.js";
import { centralExhibit } from "../src/world/central-exhibit.js";

function fixture() {
  const exhibit = new THREE.Group();
  exhibit.position.y = centralExhibit.height;
  const tilt = new THREE.Group();
  tilt.rotation.z = 0.375;
  exhibit.add(tilt);
  const disk = new THREE.Group();
  disk.name = "black_hole_ring";
  disk.rotation.x = -Math.PI / 2;
  tilt.add(disk);
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({
    name: "ring", map: texture, emissiveMap: texture, alphaMap: texture.clone(),
    emissive: "#ffffff", emissiveIntensity: 1.6,
  });
  disk.add(new THREE.Mesh(new THREE.RingGeometry(0.23, 1.6, 64), material));
  const motion = createBlackHoleMotion(exhibit);
  const step = (distance, seconds, fps = 60, options) => {
    const viewer = new THREE.Vector3(distance, 1.75, 0);
    for (let frame = 0; frame < Math.round(seconds * fps); frame++)
      motion.update(1 / fps, viewer, options);
    return motion.state();
  };
  return { exhibit, disk, texture, material, motion, step };
}

test("approach awakens smoothly, holding a distance settles, retreat leaves a fading response", () => {
  const [x, , z] = destinations.lobby.position;
  assert.equal(destinations.lobby.target[1], destinations.lobby.position[1]);
  assert.equal(centralExhibit.height, destinations.lobby.position[1]);
  const distance = Math.hypot(x, z);
  for (let radius = distance; radius >= 2.1; radius -= 0.1)
    assert.ok(canStand(x * radius / distance, z * radius / distance),
      "the initial approach to the black hole clears the curved benches");
  assert.equal(blackHoleActivation(8), 0);
  assert.equal(blackHoleActivation(2.1), 1);
  const f = fixture();
  const far = f.step(9, 2);
  const initial = f.step(2.5, 1 / 60);
  assert.ok(initial.scale < 1.02, "no sudden size jump on crossing the activation range");
  const near = f.step(2.5, 3);
  assert.equal(f.material.alphaMap.offset.x, f.texture.offset.x,
    "flow keeps the separate opacity mask aligned with its luminous atlas");
  assert.ok(near.scale > 1.75 && near.scale < 1.9);
  assert.ok(near.glow > far.glow * 1.05 && near.glow < 1.1,
    "the response keeps the authored light layers from overexposing");
  assert.equal(near.height, far.height, "expansion keeps the center at eye level");
  const leaving = f.step(9, 0.5);
  assert.ok(leaving.scale > 1.35, "retreat has a gentle afterglow");
  const settled = f.step(9, 5);
  assert.ok(settled.scale < 1.02 && settled.activation < 0.01);
  assert.ok(settled.glow < 1.03);
});

test("the response and orbital flow agree at 30, 60 and 120 fps", () => {
  const states = [30, 60, 120].map((fps) => fixture().step(2.5, 3, fps));
  for (const state of states) {
    assert.ok(Math.abs(state.scale - states[0].scale) < 0.002);
    assert.ok(Math.abs(state.height - states[0].height) < 0.002);
    assert.ok(Math.abs(state.phase - states[0].phase) < 0.005);
    assert.ok(Math.abs(state.flow - states[0].flow) < 0.002);
  }
  const idle = fixture();
  const active = fixture();
  assert.ok(active.step(2.5, 4).phase > idle.step(10, 4).phase * 3);
});

test("expansion and pulse keep the center level without clipping the plinth", () => {
  const f = fixture();
  const bounds = new THREE.Box3();
  const viewer = new THREE.Vector3(-2.061, 1.75, 0);
  // Worst case: the visitor is already against the plinth before it awakens.
  for (let frame = 0; frame < 60 * 20; frame++) {
    f.motion.update(1 / 60, viewer);
    bounds.setFromObject(f.exhibit, true);
    assert.ok(bounds.min.y > 0.45, "never clips the plinth");
    assert.ok(bounds.max.y < 5, "stays below the 6m ceiling");
    assert.equal(f.exhibit.position.y, viewer.y, `center stays level at frame ${frame}`);
  }
  f.motion.update(1 / 60, new THREE.Vector3(0, 53, 0), { overview: true });
  assert.equal(f.exhibit.position.y, viewer.y, "overview never pulls the model up to the camera");
});

test("reduced motion stops orbit, texture drift, bobbing and pulse; overview settles to idle", () => {
  const f = fixture();
  const rotation = f.disk.quaternion.clone();
  const near = f.step(2.5, 12, 60, { reducedMotion: true });
  assert.ok(near.scale > 1.84);
  assert.equal(f.texture.offset.x, 0);
  assert.deepEqual(f.disk.quaternion.toArray(), rotation.toArray());
  const held = f.step(2.5, 4, 60, { reducedMotion: true });
  assert.ok(Math.abs(held.height - near.height) < 0.00001);
  assert.ok(Math.abs(held.scale - near.scale) < 0.00001);
  const overview = f.step(2.5, 8, 60, { overview: true });
  assert.ok(overview.scale < 1.001 && overview.glow < 1.003);
  assert.deepEqual(f.disk.quaternion.toArray(), rotation.toArray());
});
