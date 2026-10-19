import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildAtriumPortal,
  buildAtriumRelief,
  buildAtriumDome,
} from "../src/world/atrium.js";
import {
  atriumDetails,
  canStand,
  roomPoint,
  roomIds,
  lobbyBays,
  lobbyRadius,
  radians,
  design,
} from "../src/world/layout.js";

const materials = () =>
  Object.fromEntries(
    ["plaster", "marble", "dark", "skylight"].map((key) => [
      key,
      new THREE.MeshStandardMaterial(),
    ]),
  );
function dispose(group) {
  const materials = new Set();
  group.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) materials.add(o.material);
  });
  materials.forEach((m) => m.dispose());
}
test("arched portals have a real walk-through opening and a solid curved crown", () => {
  const group = new THREE.Group();
  buildAtriumPortal(group, materials());
  group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const hit = (x, y) => {
    ray.set(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1));
    return ray.intersectObject(group, true).length > 0;
  };
  try {
    for (const x of [-1.7, 0, 1.7])
      assert.equal(hit(x, 1.75), false, `clear passage ${x}`);
    assert.equal(hit(0, 4.4), false, "open below the arch apex");
    assert.equal(hit(0, 4.8), true, "solid above the arch apex");
    assert.equal(hit(1.8, 3.8), true, "curved shoulder is solid");
    assert.equal(hit(3, 1.75), true, "solid jamb");
    assert.ok(
      group.children.length <= 2,
      "stone details are batched by material",
    );
  } finally {
    dispose(group);
  }
});
test("new stone bases block walking while gallery entrances remain connected", () => {
  for (const id of roomIds) {
    for (let v = -2; v <= 1; v += 0.1) {
      const [x, , z] = roomPoint(id, 0, v);
      assert.equal(canStand(x, z), true, `${id} center aisle ${v}`);
    }
    const [x, , z] = roomPoint(id, 3, -0.8);
    assert.equal(canStand(x, z), false, `${id} projecting facade`);
  }
  for (const bay of lobbyBays) {
    const a = radians(bay.angle),
      r = lobbyRadius + 0.4;
    assert.equal(
      canStand(
        bay.center[0] + r * Math.cos(a),
        -bay.center[1] - r * Math.sin(a),
      ),
      false,
    );
  }
  for (const c of design.lobby.columns)
    assert.equal(
      canStand(c.x + atriumDetails.columnBaseRadius - 0.02, -c.y),
      false,
    );
});
test("all atrium ornament and dome geometry has finite bounds", () => {
  const group = new THREE.Group(),
    m = materials();
  buildAtriumRelief(group, m);
  buildAtriumDome(group, m);
  try {
    assert.equal(
      group.getObjectByName("Arched stone wall relief").children.length,
      3,
    );
    group.traverse((o) => {
      if (!o.geometry) return;
      o.geometry.computeBoundingSphere();
      assert.ok(Number.isFinite(o.geometry.boundingSphere.radius));
      assert.ok(
        [...o.geometry.getAttribute("position").array].every(Number.isFinite),
      );
    });
  } finally {
    dispose(group);
  }
});
