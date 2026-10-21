import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Preserve the supplied mesh/texture buffers while migrating its retired
// specular-glossiness materials to glTF 2.0 metallic-roughness materials.
// Usage: node tools/prepare-black-hole.mjs <original black_hole.glb>
const source = process.argv[2];
if (!source) throw new Error("Supply the original black_hole.glb path.");
const input = await readFile(source);
if (input.readUInt32LE(0) !== 0x46546c67 || input.readUInt32LE(4) !== 2)
  throw new Error("Expected a glTF 2.0 binary file.");
const jsonLength = input.readUInt32LE(12);
const document = JSON.parse(input.toString("utf8", 20, 20 + jsonLength));
const legacy = "KHR_materials_pbrSpecularGlossiness";

for (const material of document.materials) {
  const specular = material.extensions?.[legacy];
  if (!specular) continue;
  material.pbrMetallicRoughness = {
    baseColorFactor: specular.diffuseFactor ?? [1, 1, 1, 1],
    ...(specular.diffuseTexture
      ? { baseColorTexture: specular.diffuseTexture }
      : {}),
    metallicFactor: 0,
    roughnessFactor: 1 - (specular.glossinessFactor ?? 1),
  };
  material.extras = { ...material.extras, sourceSpecularGlossiness: specular };
  delete material.extensions[legacy];
  // A safe black fallback until the authored optical channels are restored.
  if (material.name === "black_hole_center") {
    material.extensions.KHR_materials_unlit = {};
    material.alphaMode = "OPAQUE";
    material.pbrMetallicRoughness.baseColorFactor = [0, 0, 0, 1];
  }
}

// Omit the separate demonstration planet from the black-hole exhibit.
const planets = new Set(
  document.nodes.flatMap((node, index) =>
    node.name === "Planet" ? [index] : [],
  ),
);
for (const node of document.nodes)
  if (node.children)
    node.children = node.children.filter((index) => !planets.has(index));
for (const key of ["extensionsUsed", "extensionsRequired"])
  if (document[key])
    document[key] = document[key].filter((extension) => extension !== legacy);
document.extensionsUsed = [
  ...new Set([...document.extensionsUsed, "KHR_materials_unlit"]),
];
document.asset.extras.modifications =
  "Metallic-roughness fallback with original specular-glossiness metadata retained; separate demonstration planet omitted. Authored refraction and bump channels are restored at runtime from black-hole-reference.json. Black-hole meshes and embedded textures preserved.";

const json = Buffer.from(JSON.stringify(document));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(padded);
const remainingChunks = input.subarray(20 + jsonLength);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + padded.length + remainingChunks.length, 8);
header.writeUInt32LE(padded.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const output = resolve("public/assets/black_hole.glb");
await writeFile(output, Buffer.concat([header, padded, remainingChunks]));
console.log(`Prepared ${output}`);
