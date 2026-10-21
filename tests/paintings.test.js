import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import sharp from "sharp";
import { portfolioExhibits, posterUrl } from "../src/portfolio.js";
import { buildExhibits } from "../src/world/exhibits.js";
import { makeRoom } from "../src/world/architecture.js";
import { artworkView } from "../src/world/artwork-view.js";
import { canStand, design, destinations, toRoom } from "../src/world/layout.js";
import { clearSegment, planRoute } from "../src/world/camera-route.js";

test("all 49 reviewed paintings have correctly sized web assets independent of portfolio sync", async () => {
  const manifest = JSON.parse(fs.readFileSync(new URL("../output/portfolio-paintings-2026-10-20/manifest.json", import.meta.url)));
  assert.deepEqual(new Set(portfolioExhibits.map(a => a.id)), new Set(manifest.artworks.map(a => a.id)));
  let bytes = 0;
  for (const artwork of portfolioExhibits) {
    const image = artwork.artworkImage;
    assert(image.alt.includes(artwork.shortName) || image.alt.length > 15);
    assert.equal(posterUrl(artwork), image.gallery);
    assert(!posterUrl(artwork).startsWith("data:"));
    for (const tier of ["gallery", "detail"]) {
      const file = new URL("../public" + image[tier], import.meta.url);
      const metadata = await sharp(fs.readFileSync(file)).metadata();
      assert.equal(metadata.width, tier === "gallery" ? 742 : 1484, artwork.id);
      assert.equal(metadata.height, tier === "gallery" ? 530 : 1060, artwork.id);
      if (tier === "gallery") bytes += fs.statSync(file).size;
    }
  }
  assert(bytes < 5 * 1024 * 1024, "initial painting textures stay below 5 MiB");
});

test("actual 49 frameless canvases fit five viewport shapes and retain safe frontal routes", async context => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillText() {} }) }) };
  context.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  context.mock.method(THREE.TextureLoader.prototype, "loadAsync", async () => new THREE.Texture());
  const scene = new THREE.Scene(), groups = { lobby: new THREE.Group() };
  scene.add(groups.lobby);
  for (const id of ["01", "02", "03"]) { groups[id] = makeRoom(id); scene.add(groups[id]); }
  const material = new THREE.MeshStandardMaterial();
  const materials = new Proxy({}, { get: () => material });
  const { collection } = await buildExhibits(groups, materials, material, new THREE.LoadingManager());
  assert.equal(collection.length, 49);
  for (const artwork of collection) {
    assert.equal(artwork.kind, "캔버스");
    const canvas = scene.getObjectByName(`canvas-${artwork.id}`);
    const paintings = canvas.children.filter(o => o.material?.map && !o.material.transparent);
    assert.equal(paintings.length, 1, artwork.id);
    assert.equal(canvas.children.filter(o => o.geometry?.type === "BoxGeometry").length, 1, "only one 3cm side, no frame rails");
    const painting = paintings[0];
    assert.equal(painting.geometry.parameters.width, artwork.width);
    assert.equal(painting.geometry.parameters.height, artwork.height);
    assert(Math.abs(artwork.width / artwork.height - 1.4) < 1e-10);
    assert.equal(canvas.children.find(o => o.geometry?.type === "BoxGeometry").geometry.parameters.depth, .03);
    if (artwork.slotKind === "case") {
      assert.equal(artwork.width, 1.02);
      const item = design.cases.find(c => c.id === artwork.id);
      const local = toRoom("03", artwork.target[0], artwork.target[2]);
      assert(Math.abs(local.t - item.t) < .01);
      assert(Math.abs(local.v - item.v) < .59);
      assert(artwork.target[1] - artwork.height / 2 > 1, "clears pedestal");
      assert(artwork.target[1] + artwork.height / 2 < 2.39, "clears case roof");
    }
    for (const [width, height] of [[1920,1080],[1366,768],[1024,768],[390,844],[844,390]]) {
      const aspect = width / height, view = artworkView(artwork, aspect);
      assert(canStand(view.position[0], view.position[2]), artwork.id);
      const camera = new THREE.PerspectiveCamera(view.fov, aspect, .075, 250);
      camera.position.fromArray(view.position); camera.lookAt(...view.target); camera.updateMatrixWorld();
      const right = new THREE.Vector3(0, 1, 0).cross(new THREE.Vector3(...artwork.normal));
      const corners = [-1,1].flatMap(x => [-1,1].map(y => new THREE.Vector3(...artwork.target)
        .addScaledVector(right, x * artwork.width / 2).add(new THREE.Vector3(0, y * artwork.height / 2, 0)).project(camera)));
      for (const point of corners) {
        assert(Math.abs(point.x) <= .801 && Math.abs(point.y) <= .801, `${artwork.id} ${width}x${height}`);
      }
      assert(Math.abs(corners[0].x - corners[1].x) < 1e-8, "frontal rectangular view");
      if (width === 1920) {
        const route = planRoute(destinations[artwork.room].position, view.position);
        for (let i = 1; i < route.length; i++) assert(clearSegment(route[i-1], route[i]), artwork.id);
      }
    }
  }
});
