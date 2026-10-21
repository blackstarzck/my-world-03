import fs from "node:fs/promises";
import * as THREE from "three";
import { makeRoom } from "../src/world/architecture.js";
import { buildExhibits } from "../src/world/exhibits.js";
import { artworkView } from "../src/world/artwork-view.js";
import { canStand, destinations } from "../src/world/layout.js";
import { planRoute, clearSegment } from "../src/world/camera-route.js";
import { createCameraMotion, sampleCameraMotion } from "../src/world/camera-motion.js";

const out = new URL("../output/browser-checks/camera-audit/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const documentBefore = globalThis.document, loadBefore = THREE.TextureLoader.prototype.loadAsync;
globalThis.document = { createElement: () => ({ getContext: () => ({ fillText() {} }) }) };
THREE.TextureLoader.prototype.loadAsync = async () => new THREE.Texture();
let collection;
try {
  const groups = { lobby: new THREE.Group() }, scene = new THREE.Scene();
  scene.add(groups.lobby);
  for (const room of ["01","02","03"]) { groups[room] = makeRoom(room); scene.add(groups[room]); }
  const material = new THREE.MeshStandardMaterial();
  collection = (await buildExhibits(groups, new Proxy({}, { get: () => material }), material, new THREE.LoadingManager())).collection;
} finally {
  THREE.TextureLoader.prototype.loadAsync = loadBefore;
  if (documentBefore === undefined) delete globalThis.document; else globalThis.document = documentBefore;
}
const report = { passed: true, samplingRateHz: 30, positions: collection.length, viewports: [], routes: 0,
  uniqueRoutes: 0, motions: 0, samples: 0, maxAngularSpeed: 0, maxLinearSpeed: 0, failures: [] };
const paths = new Map(), motions = new Set();
function validate(from, to, label) {
  report.routes++;
  const key = JSON.stringify([from.position, to.position]);
  let route = paths.get(key);
  if (!route) {
    route = planRoute(from.position, to.position);
    for (let i=1;i<route.length;i++) if (!clearSegment(route[i-1],route[i])) throw Error(`${label}: unsafe route`);
    paths.set(key,route);
  }
  for (const returning of [false,true]) {
    const motionKey = JSON.stringify([key,from.target,to.target,from.fov,to.fov,returning]);
    if (motions.has(motionKey)) continue;
    motions.add(motionKey);
    const motion = createCameraMotion(route,from.target,to.target,from.fov,to.fov,returning);
    if (!Number.isFinite(motion.duration) || motion.duration <= 0) throw Error(`${label}: invalid duration`);
    let prev = sampleCameraMotion(motion,0), previousTime = 0;
    const steps = Math.ceil(motion.duration*30);
    for (let step=1;step<=steps;step++) {
      const time = motion.duration*step/steps, pose = sampleCameraMotion(motion,time), dt = time-previousTime;
      if (![...pose.position,pose.yaw,pose.pitch,pose.fov].every(Number.isFinite)) throw Error(`${label}: non-finite motion`);
      if (!canStand(pose.position[0],pose.position[2])) throw Error(`${label}: collision during motion at ${JSON.stringify(pose.position)} (${time.toFixed(3)}s)`);
      report.maxAngularSpeed = Math.max(report.maxAngularSpeed,Math.hypot(pose.yaw-prev.yaw,pose.pitch-prev.pitch)/dt);
      report.maxLinearSpeed = Math.max(report.maxLinearSpeed,Math.hypot(...pose.position.map((v,i)=>v-prev.position[i]))/dt);
      report.samples++; prev = pose; previousTime = time;
    }
    if (Math.hypot(...prev.position.map((v,i)=>v-to.position[i])) > 1e-8 || Math.abs(prev.fov-to.fov)>1e-8)
      throw Error(`${label}: arrival does not match target`);
    report.motions++;
  }
}
try {
  for (const [width,height] of [[1920,1080],[1366,768],[1024,768],[390,844],[844,390]]) {
    const views = collection.map(art => ({id:art.id,...artworkView(art,width/height)}));
    for (const [index,from] of views.entries()) {
      for (const to of views) validate(from,to,`${width}x${height} ${from.id} -> ${to.id}`);
      if (index % 12 === 11) console.log(`AUDIT ${width}x${height}: ${index+1}/49 origins, ${report.routes} routes`);
    }
    for (const room of ["lobby","01","02","03"]) for (const view of views) {
      const start = {...destinations[room],fov:59};
      validate(start,view,`${room} -> ${view.id}`);
      validate(view,start,`${view.id} -> ${room}`);
    }
    report.viewports.push({width,height,views:views.length});
    console.log(`PASS ${width}x${height}: all 49 x 49 project routes plus entrances, ${report.samples} motion samples`);
  }
} catch(error) {
  report.passed=false; report.failures.push(error.message); process.exitCode=1;
} finally {
  report.uniqueRoutes=paths.size;
  await fs.writeFile(new URL("routes.json",out),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report));
}
