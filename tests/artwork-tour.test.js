import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  canStand,
  currentRoom,
  destinations,
  design,
  radians,
  roomPoint,
} from "../src/world/layout.js";
import { artworkView } from "../src/world/artwork-view.js";
import { clearSegment, planRoute } from "../src/world/camera-route.js";
import {
  createCameraMotion,
  sampleCameraMotion,
} from "../src/world/camera-motion.js";
import { navigation } from "../src/world/navigation.js";

function wallArtwork(room, t, v) {
  const target = roomPoint(room, t, v, 1.5);
  const toward = roomPoint(room, t + (t < 0 ? 1 : -1), v, 1.5);
  return {
    id: `${room}-${t}-${v}`,
    room,
    kind: "회화",
    target,
    normal: toward.map((x, i) => x - target[i]),
    width: 1.5,
    height: 2,
  };
}
function assertRoute(route) {
  for (let i = 1; i < route.length; i++)
    assert.ok(
      clearSegment(route[i - 1], route[i]),
      `unsafe route segment ${i}`,
    );
}

test("artwork views stay on accessible floor and face their actual room for wide and narrow viewports", () => {
  for (const room of ["01", "02", "03"])
    for (const t of [-5.9, 5.9])
      for (const v of [4, 8, 12, 16, 20]) {
        const artwork = wallArtwork(room, t, v);
        for (const aspect of [1.12, 0.47, 2.1]) {
          const view = artworkView(artwork, aspect);
          assert.ok(canStand(view.position[0], view.position[2]), artwork.id);
          assert.equal(currentRoom(view.position[0], view.position[2]), room);
          assert.deepEqual(view.target, artwork.target);
          assert.equal(view.position[1], artwork.target[1]);
          const camera = new THREE.PerspectiveCamera(
            view.fov,
            aspect,
            0.075,
            250,
          );
          camera.position.fromArray(view.position);
          camera.lookAt(...view.target);
          camera.updateMatrixWorld();
          const center = new THREE.Vector3(...artwork.target),
            normal = new THREE.Vector3(...artwork.normal).normalize(),
            right = new THREE.Vector3(0, 1, 0).cross(normal);
          const corners = [
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
          ].map(([x, y]) =>
            center
              .clone()
              .addScaledVector(right, (x * artwork.width) / 2)
              .add(new THREE.Vector3(0, (y * artwork.height) / 2, 0))
              .project(camera),
          );
          // A frontal arrival must show a rectangle rather than a trapezoid.
          assert.ok(Math.abs(corners[0].y - corners[1].y) < 1e-8);
          assert.ok(Math.abs(corners[2].y - corners[3].y) < 1e-8);
          assert.ok(Math.abs(corners[0].x - corners[3].x) < 1e-8);
          assert.ok(Math.abs(corners[1].x - corners[2].x) < 1e-8);
          assert.ok(
            Number.isFinite(view.fov) && view.fov >= 45 && view.fov < 145,
          );
        }
      }
});

test("both faces of every diagonal panel have a reachable viewing position", () => {
  for (const panel of design.panels)
    for (const side of [-1, 1]) {
      const matrix = new THREE.Matrix4().makeRotationY(
        radians(design.rooms[panel.room].angle - 90),
      );
      matrix.setPosition(...roomPoint(panel.room, 0, 0));
      const local = new THREE.Matrix4().makeRotationY(
        radians(panel.rotation_y),
      );
      local.setPosition(panel.t, 0, -panel.v);
      matrix.multiply(local);
      const normal = new THREE.Vector3(
        ...(panel.room === "01" ? [side, 0, 0] : [0, 0, side]),
      );
      const target = normal
        .clone()
        .multiplyScalar((panel.room === "01" ? panel.w : panel.l) / 2 + 0.125);
      target.y = 1.5;
      const artwork = {
        id: `${panel.id}-${side}`,
        kind: "회화",
        target: target.applyMatrix4(matrix).toArray(),
        normal: normal.transformDirection(matrix).toArray(),
        width: 1.5,
        height: 2,
      };
      const view = artworkView(artwork, 1.12);
      assert.ok(canStand(view.position[0], view.position[2]), artwork.id);
      assertRoute(planRoute(destinations[panel.room].position, view.position));
    }
});

test("cross-room flights and return flights go through the gallery entrances without crossing walls", () => {
  const views = ["01", "02", "03"].map((room) =>
    artworkView(wallArtwork(room, -5.9, 20), 1.12),
  );
  for (let i = 0; i < views.length; i++) {
    const route = planRoute(
      views[i].position,
      views[(i + 1) % views.length].position,
    );
    assertRoute(route);
    assert.ok(route.some((p) => currentRoom(p[0], p[2]) === "lobby"));
    assertRoute(
      planRoute(
        views[i].position,
        destinations[["01", "02", "03"][i]].position,
      ),
    );
  }
});

test("each sculpture can be viewed from the front without entering its glass case", () => {
  for (const item of design.cases) {
    const target = roomPoint("03", item.t, item.v, 1.35);
    const front = roomPoint("03", item.t, item.v - 1, 1.35);
    const artwork = {
      id: item.id,
      kind: "조각",
      target,
      normal: front.map((value, i) => value - target[i]),
      width: 0.9,
      height: 1.1,
    };
    for (const aspect of [1.12, 0.9]) {
      const view = artworkView(artwork, aspect);
      assert.ok(canStand(view.position[0], view.position[2]), item.id);
      assert.equal(currentRoom(view.position[0], view.position[2]), "03");
    }
  }
});

test("camera motion follows a safe route, converges exactly, and can be retargeted mid-flight", () => {
  const to = artworkView(wallArtwork("02", -5.9, 20), 1.12);
  const route = planRoute(destinations.lobby.position, to.position);
  const motion = createCameraMotion(
    route,
    destinations.lobby.target,
    to.target,
    59,
    to.fov,
  );
  assert.ok(motion.duration > 1);
  let previous = sampleCameraMotion(motion, 0);
  for (let seconds = 0.02; seconds < motion.duration; seconds += 0.02) {
    const pose = sampleCameraMotion(motion, seconds);
    assert.ok(canStand(pose.position[0], pose.position[2]));
    assert.ok(
      Math.abs(pose.yaw - previous.yaw) < 0.16,
      "no abrupt camera spin",
    );
    assert.ok(
      [pose.yaw, pose.pitch, pose.fov, ...pose.position].every(Number.isFinite),
    );
    previous = pose;
  }
  const last = sampleCameraMotion(motion, motion.duration);
  assert.deepEqual(last.position, to.position);
  assert.equal(last.fov, to.fov);
  assert.equal(last.done, true);
  const interrupted = sampleCameraMotion(motion, motion.duration * 0.42);
  const alternate = artworkView(wallArtwork("03", -5.9, 12), 1.12);
  assertRoute(planRoute(interrupted.position, alternate.position));
});

test("stationary camera turns and tiny movements remain finite", () => {
  for (const points of [
    [
      [0, 1.7, 4],
      [0, 1.7, 4],
    ],
    [
      [0, 1.7, 4],
      [0.001, 1.7, 4],
    ],
  ]) {
    const motion = createCameraMotion(points, [0, 1.7, 0], [0, 1.7, 8], 59, 45);
    for (let i = 0; i <= 10; i++) {
      const pose = sampleCameraMotion(motion, (motion.duration * i) / 10);
      assert.ok(
        [
          motion.duration,
          pose.yaw,
          pose.pitch,
          pose.fov,
          ...pose.position,
        ].every(Number.isFinite),
      );
    }
  }
});

test("explicit room navigation clears selection; lobby walking preserves a level eye line", (context) => {
  const fakeDocument = new EventTarget(),
    fakeWindow = new EventTarget(),
    canvas = new EventTarget();
  fakeWindow.matchMedia = () => ({ matches: true });
  canvas.getRootNode = () => fakeDocument;
  canvas.ownerDocument = fakeDocument;
  canvas.style = {};
  canvas.clientWidth = 1008;
  canvas.clientHeight = 1000;
  const previousDocument = globalThis.document,
    previousWindow = globalThis.window;
  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  context.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  const camera = new THREE.PerspectiveCamera(59, 1.008, 0.075, 250);
  const controls = navigation(camera, canvas, {
    onRoom() {},
    onLock() {},
    onSelect() {},
    selectable: [],
  });
  context.after(() => controls.dispose());
  for (const room of ["01", "02", "03"]) {
    controls.goTo(room);
    controls.focusArtwork(wallArtwork(room, -5.9, 8));
    assert.ok(controls.state().selectedArtwork);
    controls.goTo(room, { animated: true });
    controls.update(0.016);
    assert.deepEqual(camera.position.toArray(), destinations[room].position);
    assert.equal(controls.state().room, room);
    assert.equal(controls.state().selectedArtwork, null);
    assert.equal(controls.state().moving, false);
    assert.equal(camera.fov, 59);
  }
  for (const aspect of [1.44, 0.47]) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    controls.goTo("lobby");
    controls.setMove("forward", true);
    for (let frame = 0; frame < 90; frame++) {
      controls.update(1 / 60);
      assert.equal(camera.position.y, destinations.lobby.target[1],
        "walking must not lower the camera below the black-hole center");
      assert.ok(Math.abs(camera.getWorldDirection(new THREE.Vector3()).y) < 1e-12,
        "wide and mobile lobby cameras keep a horizontal sightline");
    }
    controls.setMove("forward", false);
  }
});

test("travel progress follows the camera timeline, resets on retarget, and completes on cancel or reduced motion", (context) => {
  const fakeDocument = new EventTarget(),
    fakeWindow = new EventTarget(),
    canvas = new EventTarget();
  let now = 0,
    reduced = false;
  context.mock.method(performance, "now", () => now);
  fakeWindow.matchMedia = () => ({ matches: reduced });
  canvas.getRootNode = () => fakeDocument;
  canvas.ownerDocument = fakeDocument;
  canvas.style = {};
  canvas.clientWidth = 1440;
  canvas.clientHeight = 1000;
  const previousDocument = globalThis.document,
    previousWindow = globalThis.window;
  globalThis.document = fakeDocument;
  globalThis.window = fakeWindow;
  const progress = [];
  const camera = new THREE.PerspectiveCamera(59, 1.44, 0.075, 250);
  const controls = navigation(camera, canvas, {
    onRoom() {},
    onLock() {},
    onSelect() {},
    onTravelProgress: (value) => progress.push(value),
    selectable: [],
  });
  context.after(() => {
    controls.dispose();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  function start(artwork) {
    const from = camera.position.toArray(),
      target = camera
        .getWorldDirection(new THREE.Vector3())
        .multiplyScalar(5)
        .add(camera.position)
        .toArray(),
      view = artworkView(artwork, camera.aspect);
    const planned = createCameraMotion(
      planRoute(from, view.position),
      target,
      view.target,
      camera.fov,
      view.fov,
    );
    controls.focusArtwork(artwork);
    assert.equal(progress.at(-1), 0);
    return planned.duration * 1000;
  }
  const first = wallArtwork("01", -5.9, 8),
    second = wallArtwork("02", 5.9, 16);
  const duration = start(first);
  now = duration / 4;
  controls.update(0.016);
  assert.ok(Math.abs(progress.at(-1) - 0.25) < 1e-10);
  now = duration * 0.75;
  controls.update(0.016);
  assert.ok(Math.abs(progress.at(-1) - 0.75) < 1e-10);
  const retargetedDuration = start(second),
    retargetedAt = now;
  now += retargetedDuration / 2;
  controls.update(0.016);
  assert.ok(Math.abs(progress.at(-1) - 0.5) < 1e-10);
  now = retargetedAt + retargetedDuration + 1;
  controls.update(0.016);
  assert.equal(progress.at(-1), 1);
  assert.equal(controls.state().moving, false);
  start(first);
  controls.goTo("lobby");
  assert.equal(progress.at(-1), 1);
  assert.equal(controls.state().moving, false);
  reduced = true;
  controls.focusArtwork(second);
  assert.equal(progress.at(-1), 1);
  assert.equal(controls.state().moving, false);
  assert.ok(
    progress.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    ),
  );
});
