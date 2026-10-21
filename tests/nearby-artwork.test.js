import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createNearbyArtworkTracker } from "../src/world/nearby-artwork.js";

const artwork = (id = "front", x = 0, normal = [0, 0, 1]) => ({
  id, room: "01", target: [x, 1.5, 0], normal,
});
function view(x = 0, z = 2) {
  const camera = new THREE.PerspectiveCamera(59, 16 / 9, 0.075, 250);
  camera.position.set(x, 1.7, z);
  camera.lookAt(x, 1.5, 0);
  return camera;
}

test("walking near a canvas reveals it, with a stable exit boundary", () => {
  const art = artwork(), tracker = createNearbyArtworkTracker([art], new THREE.Scene());
  assert.equal(tracker.update(view(0, 4), "01"), null);
  assert.equal(tracker.update(view(), "01"), art);
  assert.equal(tracker.update(view(0, 3.2), "01"), art);
  assert.equal(tracker.update(view(0, 3.6), "01"), null);
  assert.equal(tracker.update(view(0, 3.2), "01"), null);
  assert.equal(tracker.update(view(), "01"), art);
  tracker.reset();
  assert.equal(tracker.update(view(0, 3.2), "01"), null);
});

test("turning away, entering another room, and panel reverse faces cannot select a hidden project", () => {
  const front = artwork(), back = artwork("reverse", 0, [0, 0, -1]);
  const tracker = createNearbyArtworkTracker([back, front], new THREE.Scene());
  const camera = view();
  assert.equal(tracker.update(camera, "01"), front);
  camera.lookAt(0, 1.5, 4);
  assert.equal(tracker.update(camera, "01"), null);
  assert.equal(tracker.update(view(), "02"), null);
  assert.equal(tracker.update(view(0, -2), "01"), back);
});

test("nearby projects switch deliberately instead of flickering at their shared boundary", () => {
  const left = artwork("left", -0.6), right = artwork("right", 0.6);
  const tracker = createNearbyArtworkTracker([left, right], new THREE.Scene());
  assert.equal(tracker.update(view(-0.8), "01"), left);
  assert.equal(tracker.update(view(0.1), "01"), left);
  assert.equal(tracker.update(view(-0.1), "01"), left);
  assert.equal(tracker.update(view(1.5), "01"), right);
});

test("opaque partitions obstruct captions while glass cases and hidden geometry do not", () => {
  const art = artwork(), scene = new THREE.Scene();
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.1), new THREE.MeshBasicMaterial());
  obstacle.position.set(0, 1.5, 1);
  const group = new THREE.Group();
  group.add(obstacle);
  scene.add(group);
  scene.updateMatrixWorld(true);
  const tracker = createNearbyArtworkTracker([art], scene);
  assert.equal(tracker.update(view(), "01"), null);
  obstacle.material.transparent = true;
  obstacle.material.opacity = 0.1;
  assert.equal(tracker.update(view(), "01"), art);
  obstacle.material.transparent = false;
  group.visible = false;
  assert.equal(tracker.update(view(), "01"), art);
});
