import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import * as THREE from "three";
import { warmGalleryShaders, warmFirstFrame } from "../src/world/shader-warmup.js";
import { loadCompressedAsset } from "../src/world/compressed-asset.js";
import { parseGalleryEnvironment } from "../src/world/gallery-environment.js";
import { configureGalleryLightLoops, galleryLightFragment } from "../src/world/gallery-light-loops.js";

test("shader warmup excludes hidden optical sources and retains actual gallery lighting and originals", async () => {
  const scene = new THREE.Scene(), hidden = new THREE.Group();
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material), source = new THREE.Mesh(geometry, material);
  const camera = new THREE.PerspectiveCamera();
  mesh.receiveShadow = true; hidden.visible = false; hidden.add(source);
  scene.add(mesh, hidden, new THREE.SpotLight());
  let compiled = false;
  await warmGalleryShaders({ async compileAsync(group, actualCamera, targetScene) {
    assert.equal(actualCamera, camera); assert.equal(targetScene, scene);
    assert.equal(group.children.length, 1);
    assert.notEqual(group.children[0], mesh);
    assert.equal(group.children[0].material, material);
    assert.equal(group.children[0].geometry, geometry);
    assert.equal(group.children[0].receiveShadow, true);
    compiled = true;
  } }, scene, camera);
  assert(compiled); assert.equal(mesh.parent, scene); assert.equal(source.parent, hidden);
  geometry.dispose(); material.dispose();
});

function glb(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const length = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.toString("utf8", 20, 20 + length)), binary: bytes.subarray(28 + length) };
}

test("prepared black hole preserves authored materials, textures and every embedded image within the existing geometry error limit", () => {
  const source = readFileSync(new URL("../public/assets/black_hole.glb", import.meta.url));
  const compressed = readFileSync(new URL("../public/assets/black_hole.optimized.glb.gz", import.meta.url));
  const original = glb(source), prepared = glb(gunzipSync(compressed));
  const metadata = prepared.json.asset.extras.triadPrepared;
  assert.equal(metadata.sourceSha256, createHash("sha256").update(source).digest("hex"));
  assert(compressed.length < source.length * .55);
  for (const key of ["materials", "textures", "nodes", "scenes"])
    assert.deepEqual(prepared.json[key], original.json[key], key);
  for (const [i, image] of original.json.images.entries()) {
    const a = original.json.bufferViews[image.bufferView];
    const b = prepared.json.bufferViews[prepared.json.images[i].bufferView];
    assert.deepEqual(prepared.binary.subarray(b.byteOffset, b.byteOffset + b.byteLength),
      original.binary.subarray(a.byteOffset, a.byteOffset + a.byteLength), `image ${i}`);
  }
  for (const mesh of prepared.json.meshes) for (const primitive of mesh.primitives) {
    assert(primitive.extras.simplificationError <= .00005);
    assert(prepared.json.accessors[primitive.indices].count <= primitive.extras.sourceIndexCount);
  }
});

for (const native of [true, false]) test(`compressed loader handles gzip and server-decoded bytes (native: ${native})`, async context => {
  if (!native) context.mock.method(globalThis, "DecompressionStream", undefined);
  const { gzipSync } = await import("node:zlib");
  const original = new TextEncoder().encode("glTF test payload");
  const events = [], manager = {
    itemStart: () => events.push("start"), itemEnd: () => events.push("end"), itemError: () => events.push("error"),
  };
  for (const bytes of [gzipSync(original), original]) {
    context.mock.method(globalThis, "fetch", async () => new Response(bytes));
    assert.deepEqual(new Uint8Array(await loadCompressedAsset("/model.gz", manager)), original);
  }
  assert.deepEqual(events, ["start", "end", "start", "end"]);
});

test("failed compressed asset reports the error and closes the manager item", async context => {
  context.mock.method(globalThis, "fetch", async () => new Response("missing", { status: 404 }));
  const events = [], manager = {
    itemStart: () => events.push("start"), itemError: () => events.push("error"), itemEnd: () => events.push("end"),
  };
  await assert.rejects(loadCompressedAsset("/missing.gz", manager), /404/);
  assert.deepEqual(events, ["start", "error", "end"]);
});

test("first-frame warmup starts all passes together and restores renderer methods before awaiting compilation", async () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const geometry = new THREE.PlaneGeometry(), material = new THREE.MeshBasicMaterial();
  const override = new THREE.MeshNormalMaterial();
  scene.add(new THREE.Mesh(geometry, material)); scene.overrideMaterial = override;
  const originalTarget = {}, effectTarget = {}, complete = [], calls = [];
  const render = () => assert.fail("warmup cannot draw pixels");
  const clear = () => assert.fail("warmup cannot clear pixels");
  let currentTarget = originalTarget;
  const renderer = { render, clear,
    getRenderTarget: () => currentTarget, setRenderTarget: value => { currentTarget = value; },
    compileAsync(group, actualCamera, actualScene) {
      calls.push({ group, camera: actualCamera, scene: actualScene, target: currentTarget });
      return new Promise(resolve => complete.push(resolve));
    },
  };
  const effect = new THREE.Mesh(geometry, material);
  const pending = warmFirstFrame(renderer, () => {
    renderer.render(scene, camera);
    renderer.setRenderTarget(effectTarget); renderer.clear();
    renderer.render(effect, camera);
  });
  assert.equal(calls.length, 2, "later passes start before the first pass finishes");
  assert.equal(calls[0].group.children[0].material, override, "AO compiles its actual override material");
  assert.equal(calls[0].scene, scene); assert.equal(calls[1].target, effectTarget);
  assert.equal(renderer.render, render); assert.equal(renderer.clear, clear);
  assert.equal(currentTarget, originalTarget);
  complete.forEach(resolve => resolve()); await pending;
  geometry.dispose(); material.dispose(); override.dispose();
});

test("failed first-frame discovery still restores renderer state and settles pending compilations", async () => {
  const render = () => {}, clear = () => {}, target = {};
  let currentTarget = target;
  const renderer = { render, clear, getRenderTarget: () => currentTarget,
    setRenderTarget: value => { currentTarget = value; },
    compileAsync: async () => { throw new Error("compile failed"); },
  };
  await assert.rejects(warmFirstFrame(renderer, () => {
    renderer.render(new THREE.Group(), new THREE.Camera());
    currentTarget = {}; throw new Error("discovery failed");
  }), /discovery failed/);
  assert.equal(renderer.render, render); assert.equal(renderer.clear, clear);
  assert.equal(currentTarget, target);
});

test("baked environment retains half-float CubeUV data without resizing or recomputing reflections", () => {
  const bytes = gunzipSync(readFileSync(new URL("../public/assets/gallery-environment.bin.gz", import.meta.url)));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const texture = parseGalleryEnvironment(buffer);
  assert.equal(texture.image.width, 768); assert.equal(texture.image.height, 1024);
  assert.equal(texture.type, THREE.HalfFloatType);
  assert.equal(texture.mapping, THREE.CubeUVReflectionMapping);
  assert.equal(texture.colorSpace, THREE.LinearSRGBColorSpace);
  assert.equal(texture.flipY, false); assert.equal(texture.generateMipmaps, false);
  assert.equal(Buffer.compare(Buffer.from(texture.image.data.buffer, texture.image.data.byteOffset), bytes.subarray(12)), 0);
  assert.throws(() => parseGalleryEnvironment(new ArrayBuffer(0)), /Invalid/);
  assert.throws(() => parseGalleryEnvironment(buffer.slice(0, 100)), /Incomplete/);
  texture.dispose();
});

test("compact gallery light loops retain all fixtures, prior material hooks and the shadowed-spot fallback", () => {
  const scene = new THREE.Scene(), material = new THREE.MeshStandardMaterial();
  const geometry = new THREE.BoxGeometry(); scene.add(new THREE.Mesh(geometry, material));
  for (let i = 0; i < 16; i++) scene.add(new THREE.SpotLight());
  for (let i = 0; i < 9; i++) scene.add(new THREE.RectAreaLight());
  let existingHook = false;
  material.onBeforeCompile = () => { existingHook = true; };
  configureGalleryLightLoops(scene);
  const compile = material.onBeforeCompile;
  configureGalleryLightLoops(scene); assert.equal(material.onBeforeCompile, compile);
  const shader = { uniforms: {}, fragmentShader: "void main() {\n#include <lights_fragment_begin>\n}" };
  material.onBeforeCompile(shader, {});
  assert(existingHook);
  assert.equal(shader.uniforms.gallerySpotLightCount.value, 16);
  assert.equal(shader.uniforms.galleryAreaLightCount.value, 9);
  assert(galleryLightFragment.includes("NUM_SPOT_LIGHT_SHADOWS == 0 && NUM_SPOT_LIGHT_MAPS == 0"));
  assert(galleryLightFragment.includes("getShadow( spotShadowMap[ i ]"), "mapped or shadowed lights keep constant sampler indexing");
  assert(shader.fragmentShader.includes("RE_Direct_RectArea"));
  geometry.dispose(); material.dispose();
});
