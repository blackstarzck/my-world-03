import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createExhibitLighting } from "../src/world/exhibit-lighting.js";
import { renderQuality } from "../src/world/render-settings.js";

test("art spotlights follow the position and facing of rotated display walls", () => {
  const scene = new THREE.Scene();
  const panel = new THREE.Group();
  panel.position.set(10, 1.5, -8);
  panel.rotation.y = Math.PI / 2;
  scene.add(panel);
  const rig = createExhibitLighting(scene, [{
    object: panel, source: [0, 3, 1.8], target: [0, 0, 0.12], facing: true,
  }]);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(15, 1.7, -8);
  camera.lookAt(10, 1.5, -8);
  rig.update(camera);
  const light = scene.children.find(object => object.isSpotLight);
  assert.ok(light.position.distanceTo(new THREE.Vector3(11.8, 4.5, -8)) < 1e-6);
  assert.ok(light.target.position.distanceTo(new THREE.Vector3(10.12, 1.5, -8)) < 1e-6);
});

test("moving between exhibits reuses a fixed spotlight budget", () => {
  const scene = new THREE.Scene();
  const targets = Array.from({ length: 40 }, (_, index) => {
    const object = new THREE.Group();
    object.position.set(index * 4, 0, 0);
    scene.add(object);
    return { object, source: [0, 4, 1.8], target: [0, 1.5, 0] };
  });
  const rig = createExhibitLighting(scene, targets);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 1.7, 8);
  camera.lookAt(0, 1.5, 0);
  rig.update(camera);
  const lights = scene.children.filter(object => object.isSpotLight);
  assert.equal(lights.length, 16);
  const firstTargets = lights.map(light => light.target.position.x);
  camera.position.x = 140;
  camera.lookAt(140, 1.5, 0);
  rig.update(camera);
  rig.setIntensity(2.8);
  assert.deepEqual(scene.children.filter(object => object.isSpotLight), lights);
  assert.notDeepEqual(lights.map(light => light.target.position.x), firstTargets);
  assert.ok(lights.every(light => light.visible && !light.castShadow));
});

test("overview and small screens use light rendering, desktop interiors restore detail", () => {
  assert.equal(renderQuality(1440, false), "high");
  assert.equal(renderQuality(1440, true), "balanced");
  assert.equal(renderQuality(390, false), "balanced");
  assert.equal(renderQuality(1440, false, true), "balanced");
});
