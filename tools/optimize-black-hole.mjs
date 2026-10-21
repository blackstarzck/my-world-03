import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import * as THREE from "three";
import { optimizeBlackHoleGeometry } from "../src/world/black-hole-geometry.js";

// Run the existing, bounded simplifier at asset preparation time. Keep the
// original file, material/texture indices, images, nodes and UV seams intact.
const source = await readFile(new URL("../public/assets/black_hole.glb", import.meta.url));
const jsonLength = source.readUInt32LE(12);
const document = JSON.parse(source.toString("utf8", 20, 20 + jsonLength));
const binary = source.subarray(28 + jsonLength);
const types = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const readAccessor = (index) => {
  const accessor = document.accessors[index], view = document.bufferViews[accessor.bufferView];
  const Type = types[accessor.componentType], size = sizes[accessor.type];
  if (!Type || !size || accessor.sparse || (view.byteStride && view.byteStride !== Type.BYTES_PER_ELEMENT * size))
    throw new Error(`Unsupported source accessor ${index}`);
  const bytes = binary.subarray((view.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
    (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + accessor.count * size * Type.BYTES_PER_ELEMENT);
  return new Type(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
};
const root = new THREE.Group(), entries = [];
for (const mesh of document.meshes) for (const primitive of mesh.primitives) {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(readAccessor(primitive.indices), 1));
  for (const [semantic, index] of Object.entries(primitive.attributes)) {
    const name = { POSITION: "position", NORMAL: "normal", TEXCOORD_0: "uv", TEXCOORD_1: "uv1" }[semantic];
    if (!name) throw new Error(`Unsupported attribute ${semantic}`);
    geometry.setAttribute(name, new THREE.BufferAttribute(readAccessor(index), sizes[document.accessors[index].type]));
  }
  root.add(new THREE.Mesh(geometry));
  entries.push({ primitive, geometry });
}
await optimizeBlackHoleGeometry(root);
const arrays = new Map();
let sourceTriangles = 0, triangles = 0;
for (const { primitive, geometry } of entries) {
  sourceTriangles += document.accessors[primitive.indices].count / 3;
  triangles += geometry.index.count / 3;
  const vertices = [], remap = new Map();
  const indices = new Uint32Array(geometry.index.count);
  for (let i = 0; i < indices.length; i++) {
    const old = geometry.index.array[i];
    if (!remap.has(old)) { remap.set(old, vertices.length); vertices.push(old); }
    indices[i] = remap.get(old);
  }
  arrays.set(primitive.indices, indices);
  for (const index of Object.values(primitive.attributes)) {
    if (arrays.has(index)) throw new Error("Shared source accessors require an explicit shared remap");
    const original = readAccessor(index), size = sizes[document.accessors[index].type];
    const packed = new original.constructor(vertices.length * size);
    vertices.forEach((old, i) => packed.set(original.subarray(old * size, (old + 1) * size), i * size));
    arrays.set(index, packed);
  }
  primitive.extras = { ...primitive.extras,
    sourceIndexCount: geometry.userData.sourceIndexCount ?? geometry.index.count,
    simplificationError: geometry.userData.simplificationError ?? 0 };
}
const originalViews = document.bufferViews;
document.bufferViews = [];
const chunks = [];
let offset = 0;
function append(bytes, target) {
  const padding = (4 - offset % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
  const index = document.bufferViews.length;
  document.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target ? { target } : {}) });
  chunks.push(bytes); offset += bytes.length;
  return index;
}
for (const [index, accessor] of document.accessors.entries()) {
  const array = arrays.get(index);
  if (!array) throw new Error(`Unmapped source accessor ${index}`);
  accessor.bufferView = append(Buffer.from(array.buffer, array.byteOffset, array.byteLength),
    accessor.type === "SCALAR" ? 34963 : 34962);
  delete accessor.byteOffset;
  accessor.count = array.length / sizes[accessor.type];
  if (array instanceof Uint32Array) accessor.componentType = 5125;
  if (accessor.min || accessor.max) {
    const size = sizes[accessor.type], min = Array(size).fill(Infinity), max = Array(size).fill(-Infinity);
    for (let i = 0; i < array.length; i++) {
      min[i % size] = Math.min(min[i % size], array[i]);
      max[i % size] = Math.max(max[i % size], array[i]);
    }
    accessor.min = min; accessor.max = max;
  }
}
for (const image of document.images) {
  const view = originalViews[image.bufferView];
  image.bufferView = append(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
}
document.buffers = [{ byteLength: offset }];
document.asset.extras = { ...document.asset.extras,
  triadPrepared: { version: 1, sourceSha256: createHash("sha256").update(source).digest("hex"),
    sourceTriangles, triangles, maxError: .00005 } };
const json = Buffer.from(JSON.stringify(document));
const jsonChunk = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(jsonChunk);
const binChunk = Buffer.alloc(Math.ceil(offset / 4) * 4); Buffer.concat(chunks).copy(binChunk);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + jsonChunk.length + binChunk.length, 8);
header.writeUInt32LE(jsonChunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(binChunk.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const result = gzipSync(Buffer.concat([header, jsonChunk, binHeader, binChunk]), { level: 9 });
await writeFile(new URL("../public/assets/black_hole.optimized.glb.gz", import.meta.url), result);
root.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
console.log(JSON.stringify({ originalBytes: source.length, optimizedBytes: result.length,
  reduction: `${(100 * (1 - result.length / source.length)).toFixed(1)}%`, sourceTriangles, triangles }, null, 2));
