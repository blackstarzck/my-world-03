import fs from "node:fs/promises";
import assert from "node:assert/strict";
import * as THREE from "three";
import { makeRoom } from "../src/world/architecture.js";
import { buildExhibits } from "../src/world/exhibits.js";
import { canStand } from "../src/world/layout.js";
import { artworkView } from "../src/world/artwork-view.js";
import { clearSegment } from "../src/world/camera-route.js";
import { artworkApproach, returnMotion } from "../src/world/artwork-approach.js";
import { reverseFramingMotion, sampleCameraMotion } from "../src/world/camera-motion.js";

const out = new URL("../output/browser-checks/close-camera/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const previousDocument = globalThis.document, load = THREE.TextureLoader.prototype.loadAsync;
let collection;
try {
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillText() {} }) }) };
  THREE.TextureLoader.prototype.loadAsync = async () => new THREE.Texture();
  const scene = new THREE.Scene(), groups = { lobby: new THREE.Group() };
  scene.add(groups.lobby);
  for (const id of ["01", "02", "03"]) { groups[id] = makeRoom(id); scene.add(groups[id]); }
  const material = new THREE.MeshStandardMaterial();
  collection = (await buildExhibits(groups, new Proxy({}, { get: () => material }), material, new THREE.LoadingManager())).collection;
} finally {
  THREE.TextureLoader.prototype.loadAsync = load;
  if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
}

const report = { passed: false, artworks: collection.length, approaches: 0, local: 0,
  blockedDirect: 0, reversals: 0, samples: 0, maxAngularSpeed: 0, maxLocalDuration: 0,
  maxDesktopFrontalDuration: 0, adjacentReturns: 0, curvedReturns: 0, failures: [], fallback: [], viewports: [] };
function sampleSafely(motion, art, label, { gaze = false } = {}) {
  let previous, previousTime;
  const steps = Math.max(2, Math.ceil(motion.duration * 120));
  for (let i = 0; i <= steps; i++) {
    const time = motion.duration * i / steps, pose = sampleCameraMotion(motion, time);
    assert([...pose.position,pose.yaw,pose.pitch,pose.fov].every(Number.isFinite), label);
    assert(canStand(pose.position[0],pose.position[2]), `${label}: collision`);
    if (previous) {
      assert(clearSegment(previous.position,pose.position), `${label}: corner clipping`);
      const yaw = Math.atan2(Math.sin(pose.yaw - previous.yaw),Math.cos(pose.yaw - previous.yaw));
      const speed = Math.hypot(yaw,pose.pitch-previous.pitch)/(time-previousTime || 1);
      report.maxAngularSpeed = Math.max(report.maxAngularSpeed,speed);
      if (gaze || motion.kind === "framing") assert(speed < 2.67, `${label}: excessive turn rate ${speed}`);
    }
    if (gaze) {
      const toward = new THREE.Vector3(...art.target).sub(new THREE.Vector3(...pose.position)).normalize();
      const facing = new THREE.Vector3(Math.sin(pose.yaw)*Math.cos(pose.pitch),Math.sin(pose.pitch),Math.cos(pose.yaw)*Math.cos(pose.pitch));
      assert(toward.dot(facing) > 1-1e-9, `${label}: looks away from painting`);
    }
    previous = pose; previousTime = time; report.samples++;
  }
  return previous;
}
try {
  for (const [width,height] of [[1920,1080],[1366,768],[1024,768],[390,844],[844,390]]) {
    const before = report.approaches;
    for (const art of collection) for (const sideways of [0,-.4,.4]) {
      let position;
      for (const depth of [.28,.4,.65,.85,1,1.2]) {
        const candidate = art.target.map((value,i) => value + art.normal[i]*depth);
        candidate[0] += art.normal[2]*sideways; candidate[2] -= art.normal[0]*sideways; candidate[1] = 1.7;
        if (canStand(candidate[0],candidate[2])) { position=candidate; break; }
      }
      assert(position, `${art.id}: no accessible near position`);
      const from = { position, target:art.target, fov:59 };
      const label = `${width}x${height} ${art.id} offset ${sideways}`;
      const motion = artworkApproach(from, art, width/height), local = motion.kind === "framing";
      const view = artworkView(art,width/height);
      if (!local) {
        assert(!clearSegment(position,view.position), `${label}: safe near approach must use local framing`);
        report.blockedDirect++; report.fallback.push(label);
      }
      const last = sampleSafely(motion,art,label,{gaze:local});
      const arrival = local ? motion.to : view;
      assert(Math.hypot(...last.position.map((v,i)=>v-arrival.position[i])) < 1e-8,label);
      assert(Math.abs(last.fov-arrival.fov)<1e-8,label);
      const camera = new THREE.PerspectiveCamera(last.fov,width/height,.075,250);
      camera.position.fromArray(last.position); camera.lookAt(...art.target); camera.updateMatrixWorld();
      const right = new THREE.Vector3(0,1,0).cross(new THREE.Vector3(...art.normal));
      for (const x of [-1,1]) for (const y of [-1,1]) {
        const corner = new THREE.Vector3(...art.target).addScaledVector(right,x*art.width/2)
          .add(new THREE.Vector3(0,y*art.height/2,0)).project(camera);
        assert(Math.abs(corner.x)<=.801 && Math.abs(corner.y)<=.801,`${label}: cropped artwork`);
      }
      report.approaches++;
      if (!local) continue;
      report.local++; report.maxLocalDuration=Math.max(report.maxLocalDuration,motion.duration);
      if (!sideways && width>=1024) report.maxDesktopFrontalDuration=Math.max(report.maxDesktopFrontalDuration,motion.duration);
      for (const fraction of [0,.2,.5,1]) {
        const at = motion.duration*fraction, cancelled = sampleCameraMotion(motion,at);
        const reverse = reverseFramingMotion(motion,at);
        const first = sampleCameraMotion(reverse,0);
        assert.deepEqual(first.position,cancelled.position,`${label}: cancellation jumps`);
        assert(Math.abs(first.yaw-cancelled.yaw)<1e-8 && Math.abs(first.pitch-cancelled.pitch)<1e-8);
        const restored = sampleSafely(reverse,art,`${label} reverse ${fraction}`,{gaze:true});
        assert(Math.hypot(...restored.position.map((v,i)=>v-position[i]))<1e-8);
        assert(Math.abs(restored.fov-from.fov)<1e-8);
        report.reversals++;
      }
      if (!sideways) {
        const index = collection.indexOf(art);
        for (const delta of [-1,1]) {
          const adjacent = collection[(index+delta+collection.length)%collection.length];
          const adjacentView = artworkView(adjacent,width/height);
          const returning = returnMotion(adjacentView,from);
          const restored = sampleSafely(returning,art,`${label}: return after ${adjacent.id}`);
          assert(Math.hypot(...restored.position.map((v,i)=>v-position[i]))<1e-8);
          assert(Math.abs(restored.fov-from.fov)<1e-8);
          const toward = new THREE.Vector3(...art.target).sub(new THREE.Vector3(...position)).normalize();
          const facing = new THREE.Vector3(Math.sin(restored.yaw)*Math.cos(restored.pitch),Math.sin(restored.pitch),Math.cos(restored.yaw)*Math.cos(restored.pitch));
          assert(toward.dot(facing)>1-1e-9,`${label}: wrong original gaze after adjacent return`);
          report.adjacentReturns++;
          if (returning.kind === "framing" && returning.points.length>2) report.curvedReturns++;
        }
      }
    }
    report.viewports.push({width,height,approaches:report.approaches-before});
    console.log(`PASS ${width}x${height}: ${report.approaches-before} close approaches and partial returns`);
  }
  report.passed=true;
} catch(error) {
  report.failures.push(error.stack); process.exitCode=1;
} finally {
  await fs.writeFile(new URL("geometry.json",out),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report));
}
