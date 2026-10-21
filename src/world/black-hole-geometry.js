import * as THREE from "three";
import { MeshoptSimplifier } from "three/addons/libs/meshopt_simplifier.module.js";

// Keep the supplied textures, normals and UV seams. Only redundant triangles
// are removed; the authorized GLB on disk remains intact.
export async function optimizeBlackHoleGeometry(root) {
  await MeshoptSimplifier.ready;
  const seen = new Set();
  root.traverse((object) => {
    const geometry = object.geometry;
    if (!object.isMesh || !geometry?.index || seen.has(geometry)) return;
    seen.add(geometry);
    if (geometry.index.count < 36000) return;
    const position = geometry.getAttribute("position");
    const attributes = ["normal", "uv", "uv1"].map((name) => geometry.getAttribute(name)).filter(Boolean);
    const stride = attributes.reduce((n, a) => n + a.itemSize, 0);
    const positions = new Float32Array(position.count * 3);
    const packed = new Float32Array(position.count * stride);
    for (let i = 0; i < position.count; i++) {
      positions.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3);
      let k = i * stride;
      for (const attribute of attributes)
        for (let j = 0; j < attribute.itemSize; j++) packed[k++] = attribute.getComponent(i, j);
    }
    const weights = attributes.flatMap((a) => Array(a.itemSize).fill(a.itemSize === 3 ? .05 : .1));
    const [indices, error] = MeshoptSimplifier.simplifyWithAttributes(
      geometry.index.array, positions, 3, packed, stride, weights, null,
      Math.floor(geometry.index.count * .4 / 3) * 3, .00005, ["LockBorder"],
    );
    geometry.userData.sourceIndexCount = geometry.index.count;
    geometry.userData.simplificationError = error;
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.setDrawRange(0, indices.length);
  });
}
