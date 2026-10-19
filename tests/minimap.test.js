import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildMiniature } from "../src/world/minimap.js";
import { canStand, currentRoom } from "../src/world/layout.js";

test("miniature floors and click targets match walkable world coordinates", () => {
  const { model, floors } = buildMiniature();
  model.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  try {
    // Sample the whole plan, including the curved lobby and rotated galleries.
    // This catches mirrored/rotated maps that otherwise look plausible.
    for (let x = -36; x <= 36; x += 1) {
      for (let z = -36; z <= 36; z += 1) {
        if (!canStand(x, z)) continue;
        ray.set(new THREE.Vector3(x, 20, z), down);
        const hits = ray.intersectObjects(Object.values(floors), false);
        assert.ok(hits.length > 0, `Missing floor at ${x}, ${z}`);
        assert.ok(
          hits.some((hit) => hit.object.userData.room === currentRoom(x, z)),
          `Incorrect room at ${x}, ${z}`,
        );
      }
    }
  } finally {
    const materials = new Set();
    model.traverse((object) => {
      object.geometry?.dispose();
      if (object.material) materials.add(object.material);
    });
    materials.forEach((material) => material.dispose());
  }
});
