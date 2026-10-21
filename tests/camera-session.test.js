import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { navigation } from "../src/world/navigation.js";
import { roomPoint, canStand, design, radians } from "../src/world/layout.js";
import { clearSegment, planRoute } from "../src/world/camera-route.js";
import { destinations } from "../src/world/layout.js";
import { artworkView } from "../src/world/artwork-view.js";

function harness(context, reduced = false) {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const doc = new EventTarget(), win = new EventTarget(), canvas = new EventTarget();
  let now = 0;
  win.matchMedia = () => ({ matches: reduced });
  doc.exitPointerLock = () => {};
  canvas.getRootNode = () => doc;
  canvas.ownerDocument = doc;
  canvas.style = {};
  canvas.clientWidth = 1366; canvas.clientHeight = 768;
  canvas.focus = () => {};
  canvas.setPointerCapture = () => {};
  canvas.hasPointerCapture = () => false;
  globalThis.document = doc; globalThis.window = win;
  context.mock.method(performance, "now", () => now);
  const camera = new THREE.PerspectiveCamera(59, 1366 / 768, .075, 250);
  const controls = navigation(camera, canvas, { onRoom() {}, onLock() {}, onSelect() {}, selectable: [] });
  context.after(() => {
    controls.dispose();
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  });
  const advance = ms => { now += ms; controls.update(ms / 1000); };
  const finish = () => {
    let samples = 0;
    while (controls.state().moving) {
      advance(16);
      assert(++samples < 3000, "motion terminates");
      if (!controls.state().overview) assert(canStand(camera.position.x, camera.position.z), "safe intermediate position");
    }
  };
  return { camera, controls, canvas, advance, finish };
}
function artwork(room, v = 8) {
  const target = roomPoint(room, -5.9, v, 1.5);
  const toward = roomPoint(room, -4.9, v, 1.5);
  return { id: `${room}-${v}`, room, target, normal: toward.map((x,i) => x-target[i]), width:1.65, height:1.65/1.4 };
}
function assertRestored(camera, controls, origin, { fov = true } = {}) {
  assert(camera.position.distanceTo(new THREE.Vector3(...origin.position)) < 1e-10);
  assert(camera.quaternion.angleTo(new THREE.Quaternion(...origin.quaternion)) < 1e-7);
  if (fov) assert.equal(camera.fov, origin.fov);
  assert.equal(controls.state().room, origin.room);
  assert.equal(controls.state().overview, origin.overview);
}

for (const reduced of [false, true]) {
  test(`closing after several projects restores the original arbitrary view (reduced motion: ${reduced})`, context => {
    const { camera, controls, finish, advance } = harness(context, reduced);
    controls.goTo("01");
    camera.position.fromArray(roomPoint("01", 1, 5, 1.7));
    camera.lookAt(...roomPoint("01", -1, 8, 2.1));
    camera.fov = 63; camera.updateProjectionMatrix();
    const origin = controls.captureView();
    controls.focusArtwork(artwork("02", 20)); finish();
    controls.focusArtwork(artwork("03", 12)); finish();
    controls.restoreView(origin); finish();
    assertRestored(camera, controls, origin);
    for (let i=0;i<20;i++) advance(16);
    assertRestored(camera, controls, origin);
    assert.equal(controls.state().selectedArtwork, null);
  });
}

test("cancelling approach and reopening mid-return never runs an obsolete completion", context => {
  const { camera, controls, finish, advance } = harness(context);
  const firstOrigin = controls.captureView();
  controls.focusArtwork(artwork("02", 20)); advance(250);
  const cancelledAt = camera.position.clone();
  controls.restoreView(firstOrigin);
  assert(camera.position.distanceTo(cancelledAt) < 1e-10, "no jump at cancellation");
  advance(100);
  const secondOrigin = controls.captureView();
  controls.focusArtwork(artwork("03", 20)); finish();
  controls.restoreView(secondOrigin); finish();
  assertRestored(camera, controls, secondOrigin);
  advance(30000);
  assertRestored(camera, controls, secondOrigin);
});

test("opening an index pauses travel and resumes from the same timeline", context => {
  const { camera, controls, finish, advance } = harness(context);
  controls.focusArtwork(artwork("02", 20)); advance(200);
  controls.setSuspended(true, { pauseMotion: true });
  const paused = controls.captureView();
  advance(10000);
  assertRestored(camera, controls, paused);
  assert.equal(controls.state().paused, true);
  controls.setSuspended(false);
  advance(16);
  assert.equal(controls.state().moving, true, "does not skip paused time");
  assert(camera.position.distanceTo(new THREE.Vector3(...paused.position)) < .5);
  finish();
  assert.equal(controls.state().selectedArtwork, "02-20");
});

test("returning from overview restores the exact orbit view without damping drift", context => {
  const { camera, controls, finish, advance } = harness(context);
  controls.goTo("overview"); camera.fov = 48;
  const origin = controls.captureView();
  controls.goTo("02"); controls.focusArtwork(artwork("02")); finish();
  controls.setSuspended(true);
  controls.restoreView(origin);
  assertRestored(camera, controls, origin);
  controls.setSuspended(false);
  for(let i=0;i<30;i++) advance(16);
  assertRestored(camera, controls, origin);
});

test("returning to a preview restores its selection; resizing adjusts lens without changing original position", context => {
  const { camera, controls, finish } = harness(context);
  controls.focusArtwork(artwork("01")); finish();
  const origin = controls.captureView();
  controls.focusArtwork(artwork("03",20)); finish();
  camera.aspect = 390/844; camera.updateProjectionMatrix();
  controls.restoreView(origin); finish();
  assertRestored(camera, controls, origin, {fov:false});
  assert(camera.fov >= origin.fov);
  assert.equal(controls.state().selectedArtwork, "01-8");
});

test("manual walking clears artwork focus so resizing cannot pull the visitor back", context => {
  const { camera, controls, finish } = harness(context);
  controls.focusArtwork(artwork("01")); finish();
  controls.setMove("back",true); controls.update(.1); controls.setMove("back",false);
  const freeView = controls.captureView();
  assert.equal(controls.state().selectedArtwork,null);
  camera.aspect = .47; controls.reframeArtwork();
  assert.equal(controls.state().moving,false);
  assertRestored(camera, controls, freeView);
});

test("a short segment cannot cut through a diagonal panel corner between clear endpoints", () => {
  const panel = design.panels[0], angle = radians(panel.rotation_y);
  const corner = [panel.w / 2 + .259, panel.l / 2 + .259];
  const point = (x,z) => roomPoint(panel.room,
    panel.t + Math.cos(angle)*x - Math.sin(angle)*z,
    panel.v + Math.sin(angle)*x + Math.cos(angle)*z,1.7);
  const a = point(corner[0]-.04,corner[1]+.04);
  const b = point(corner[0]+.04,corner[1]-.04);
  const middle = point(...corner);
  assert(canStand(a[0],a[2]) && canStand(b[0],b[2]));
  assert(!canStand(middle[0],middle[2]));
  assert.equal(clearSegment(a,b),false);
});

test("visitors standing close to walls and case corners still have a safe route out", () => {
  const origins = [];
  for (const room of ["01","02","03"])
    for (const t of [-5.7399,5.7399])
      for (const v of [4,20]) origins.push({room,position:roomPoint(room,t,v,1.7)});
  for (const object of [design.panels[0],design.panels[4],...design.cases.slice(0,2)])
    for (const x of [-1,1]) for (const z of [-1,1]) {
      const angle = radians(object.rotation_y || 0),
        localX = x*(object.w/2+.2601), localZ = z*(object.l/2+.2601);
      origins.push({room:object.room,position:roomPoint(object.room,
        object.t+Math.cos(angle)*localX-Math.sin(angle)*localZ,
        object.v+Math.sin(angle)*localX+Math.cos(angle)*localZ,1.7)});
    }
  let tested = 0;
  for (const origin of origins) {
    if (!canStand(origin.position[0],origin.position[2])) continue;
    const route = planRoute(origin.position,destinations[origin.room].position);
    for(let i=1;i<route.length;i++) assert(clearSegment(route[i-1],route[i]));
    tested++;
  }
  assert(tested >= 20);
});

function closeView(camera, item, { depth = .35, sideways = 0 } = {}) {
  camera.position.fromArray(item.target).addScaledVector(new THREE.Vector3(...item.normal), depth);
  camera.position.x += item.normal[2] * sideways;
  camera.position.z -= item.normal[0] * sideways;
  camera.position.y = 1.7;
  camera.lookAt(...item.target);
  camera.fov = 59;
  camera.updateProjectionMatrix();
}

for (const sideways of [0, .45, -.45]) {
  test(`close selection backs away without turning from the painting, then retraces entry (offset ${sideways})`, context => {
    const { camera, controls, advance, finish } = harness(context);
    controls.goTo("01");
    const item = artwork("01");
    closeView(camera, item, { sideways });
    const origin = controls.captureView();
    controls.focusArtwork(item, { origin });
    assert.equal(controls.state().motionKind, "framing");
    assert(controls.state().motionDuration < (sideways ? 1.2 : .65), "short framing respects the gaze turn rate without a 1.8 second floor");
    const direction = new THREE.Vector3();
    let previousDepth = .35;
    while (controls.state().moving) {
      advance(8);
      const toward = new THREE.Vector3(...item.target).sub(camera.position).normalize();
      assert(camera.getWorldDirection(direction).dot(toward) > 1 - 1e-10, "keeps looking at the painting");
      const depth = camera.position.clone().sub(new THREE.Vector3(...item.target)).dot(new THREE.Vector3(...item.normal));
      assert(depth >= previousDepth - 1e-10, "backs away monotonically");
      previousDepth = depth;
      assert(canStand(camera.position.x, camera.position.z));
    }
    controls.restoreView(origin);
    assert.equal(controls.state().motionKind, "framing-return");
    while (controls.state().moving) {
      advance(8);
      const toward = new THREE.Vector3(...item.target).sub(camera.position).normalize();
      assert(camera.getWorldDirection(direction).dot(toward) > 1 - 1e-10);
      assert(canStand(camera.position.x, camera.position.z));
    }
    finish(); assertRestored(camera, controls, origin);
  });
}

for (const elapsed of [0, 32, 150, 350]) {
  test(`cancelling a close approach at ${elapsed}ms reverses only its travelled segment`, context => {
    const { camera, controls, advance, finish } = harness(context);
    controls.goTo("01");
    const item = artwork("01");
    closeView(camera, item);
    const origin = controls.captureView();
    controls.focusArtwork(item, { origin }); advance(elapsed);
    const cancelledAt = camera.position.clone(), cancelledDirection = camera.quaternion.clone();
    controls.restoreView(origin);
    assert(camera.position.distanceTo(cancelledAt) < 1e-10);
    assert(camera.quaternion.angleTo(cancelledDirection) < 1e-7, "cancellation never jumps or spins");
    const maxDistance = cancelledAt.distanceTo(new THREE.Vector3(...origin.position));
    while (controls.state().moving) {
      advance(8);
      assert(camera.position.distanceTo(new THREE.Vector3(...origin.position)) <= maxDistance + 1e-8);
    }
    finish(); assertRestored(camera, controls, origin);
    advance(30000); assertRestored(camera, controls, origin);
  });
}

test("nearby next/previous selections return to the first close origin without walking turns or stale entry", context => {
  const { camera, controls, finish, advance } = harness(context);
  controls.goTo("01");
  const first = artwork("01", 8), next = artwork("01", 12);
  closeView(camera, first);
  const origin = controls.captureView();
  controls.focusArtwork(first, { origin }); finish();
  controls.focusArtwork(next, { origin }); finish();
  const last = camera.position.clone();
  controls.restoreView(origin);
  assert.equal(controls.state().motionKind, "framing");
  assert(camera.position.distanceTo(last) < 1e-10);
  while (controls.state().moving) {
    advance(8);
    assert(camera.quaternion.angleTo(new THREE.Quaternion(...origin.quaternion)) < .7, "no walking U-turn");
    assert(canStand(camera.position.x,camera.position.z));
  }
  finish(); assertRestored(camera, controls, origin);
  controls.focusArtwork(first, { origin: controls.captureView() }); finish();
  controls.focusArtwork(next); advance(120);
  controls.focusArtwork(first); finish();
  controls.restoreView(origin); finish();
  assertRestored(camera, controls, origin);
});

test("closing after cross-room projects still restores the first close origin", context => {
  const { camera, controls, finish } = harness(context);
  controls.goTo("01");
  const first = artwork("01"); closeView(camera, first);
  const origin = controls.captureView();
  controls.focusArtwork(first, { origin }); finish();
  controls.focusArtwork(artwork("02",20), { origin }); finish();
  controls.focusArtwork(artwork("03",12), { origin }); finish();
  controls.restoreView(origin); finish();
  assertRestored(camera, controls, origin);
});

test("an already framed painting opens without an artificial travel delay", context => {
  const { camera, controls, finish } = harness(context);
  controls.goTo("01");
  const item = artwork("01"), view = artworkView(item, camera.aspect);
  camera.position.fromArray(view.position); camera.lookAt(...view.target);
  camera.fov = view.fov;
  const origin = controls.captureView();
  controls.focusArtwork(item, { origin });
  assert.equal(controls.state().moving, false);
  controls.restoreView(origin); finish(); assertRestored(camera, controls, origin);
});

test("an off-centre canvas click starts at the current gaze and gently centres the painting", context => {
  const { camera, controls, advance, finish } = harness(context);
  controls.goTo("01");
  const item = artwork("01"); closeView(camera,item);
  camera.lookAt(item.target[0]+item.normal[2]*.1,item.target[1]+.05,item.target[2]-item.normal[0]*.1);
  const origin = controls.captureView();
  controls.focusArtwork(item,{origin}); advance(0);
  assertRestored(camera,controls,origin);
  assert.equal(controls.state().motionKind,"framing");
  while (controls.state().moving) {
    advance(8);
    const toward=new THREE.Vector3(...item.target).sub(camera.position).normalize();
    assert(camera.getWorldDirection(new THREE.Vector3()).dot(toward)>.9,"no turn away from the visible canvas");
  }
  controls.restoreView(origin); finish(); assertRestored(camera,controls,origin);
});

test("pausing a local approach does not add paused time to its cancellation path", context => {
  const { camera, controls, advance, finish } = harness(context);
  controls.goTo("01");
  const item=artwork("01"); closeView(camera,item);
  const origin=controls.captureView(); controls.focusArtwork(item,{origin}); advance(100);
  controls.setSuspended(true,{pauseMotion:true});
  const paused=camera.position.clone(); advance(10000);
  assert(camera.position.distanceTo(paused)<1e-10);
  controls.restoreView(origin);
  assert.equal(controls.state().motionKind,"framing-return");
  assert(camera.position.distanceTo(paused)<1e-10);
  controls.setSuspended(false); finish(); assertRestored(camera,controls,origin);
});

test("resizing during a local approach returns from the actual new pose rather than replaying stale entry", context => {
  const { camera, controls, advance, finish } = harness(context);
  controls.goTo("01");
  const item=artwork("01"); closeView(camera,item);
  const origin=controls.captureView(); controls.focusArtwork(item,{origin}); advance(100);
  camera.aspect=390/844; controls.reframeArtwork(); finish();
  const resized=camera.position.clone(); controls.restoreView(origin);
  assert(camera.position.distanceTo(resized)<1e-10);
  finish(); assertRestored(camera,controls,origin);
});

test("reopening during a local return establishes a new origin and discards the previous completion", context => {
  const { camera, controls, advance, finish } = harness(context);
  controls.goTo("01");
  const item=artwork("01"); closeView(camera,item);
  const first=controls.captureView(); controls.focusArtwork(item,{origin:first}); finish();
  controls.restoreView(first); advance(120);
  const second=controls.captureView(); controls.focusArtwork(item,{origin:second}); finish();
  controls.restoreView(second); finish(); assertRestored(camera,controls,second);
  advance(30000); assertRestored(camera,controls,second);
});

test("instant artwork placement cancels active travel and applies the last selection without animation", context => {
  const { camera, controls, advance } = harness(context);
  controls.focusArtwork(artwork("02",20)); advance(180);
  const last=artwork("03",12), expected=artworkView(last,camera.aspect);
  controls.focusArtwork(last,{animated:false});
  assert.equal(controls.state().moving,false);
  assert.equal(controls.state().motionKind,null);
  assert.equal(controls.state().selectedArtwork,last.id);
  assert.equal(controls.state().room,"03");
  assert(camera.position.distanceTo(new THREE.Vector3(...expected.position))<1e-10);
  assert.equal(camera.fov,expected.fov);
  const facing=new THREE.Vector3(...last.target).sub(camera.position).normalize();
  assert(camera.getWorldDirection(new THREE.Vector3()).dot(facing)>1-1e-10);
  const placed=controls.captureView();advance(30000);assertRestored(camera,controls,placed);
});

test("instant placement fits the selected painting after repeated choices and viewport changes", context => {
  const { camera, controls, advance } = harness(context);
  for(const aspect of [1920/1080,1366/768,1024/768,390/844,844/390]) {
    camera.aspect=aspect;
    for(const room of ["01","02","03"]) {
      const last=artwork(room), expected=artworkView(last,aspect);
      controls.focusArtwork(last,{animated:false});
      assert.equal(controls.state().moving,false);
      assert(camera.position.distanceTo(new THREE.Vector3(...expected.position))<1e-10);
      assert.equal(camera.fov,expected.fov);
      assert.equal(controls.state().room,room);
      advance(16);
      assert(camera.position.distanceTo(new THREE.Vector3(...expected.position))<1e-10);
    }
  }
});
