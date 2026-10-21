import * as THREE from "three";
import { gunzipSync } from "three/addons/libs/fflate.module.js";

// Public, standard LogLuv cubemap referenced by the model's saved environment.
// The file contains planar RGBA faces, grouped by mip level (+X through -Z).
export function parseBlackHoleEnvironment(bytes, size = 256) {
  if (bytes[0] === 31 && bytes[1] === 139) bytes = gunzipSync(bytes);
  const levels = [];
  let offset = 0;
  for (let width = size; width >= 1; width /= 2) {
    const faces = [], pixels = width * width;
    for (let face = 0; face < 6; face++) {
      if (offset + 4 * pixels > bytes.length) throw new Error("Incomplete black-hole environment");
      const data = new Uint8Array(pixels * 4);
      for (let i = 0; i < pixels; i++)
        for (let channel = 0; channel < 4; channel++) data[4 * i + channel] = bytes[offset + channel * pixels + i];
      faces.push(new THREE.DataTexture(data, width, width));
      offset += pixels * 4;
    }
    levels.push(faces);
  }
  const cube = new THREE.CubeTexture(levels[0]);
  cube.name = "Sketchfab space specular environment";
  cube.mipmaps = levels.slice(1).map(image => ({ image }));
  cube.generateMipmaps = false;
  cube.minFilter = THREE.LinearMipmapLinearFilter;
  cube.magFilter = THREE.LinearFilter;
  cube.colorSpace = THREE.NoColorSpace;
  cube.needsUpdate = true;
  return cube;
}

export async function loadBlackHoleEnvironment(manager) {
  const url = "/assets/black-hole-space-specular.bin.gz";
  manager.itemStart(url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Black-hole environment: ${response.status}`);
    return parseBlackHoleEnvironment(new Uint8Array(await response.arrayBuffer()));
  } finally { manager.itemEnd(url); }
}
