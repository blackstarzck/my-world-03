import * as THREE from "three";
import { loadCompressedAsset } from "./compressed-asset.js";

export function parseGalleryEnvironment(buffer) {
  const header = new DataView(buffer);
  if (buffer.byteLength < 12 || header.getUint32(0, true) !== 0x564e4554)
    throw new Error("Invalid gallery environment");
  const width = header.getUint32(4, true), height = header.getUint32(8, true);
  if (!width || !height || buffer.byteLength !== 12 + width * height * 8)
    throw new Error("Incomplete gallery environment");
  const texture = new THREE.DataTexture(new Uint16Array(buffer, 12), width, height,
    THREE.RGBAFormat, THREE.HalfFloatType);
  texture.name = "Baked RoomEnvironment (.035)";
  texture.mapping = THREE.CubeUVReflectionMapping;
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export async function loadGalleryEnvironment(manager) {
  return parseGalleryEnvironment(await loadCompressedAsset("/assets/gallery-environment.bin.gz", manager));
}
