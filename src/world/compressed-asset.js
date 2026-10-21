import { gunzipSync } from "three/addons/libs/fflate.module.js";

export async function loadCompressedAsset(url, manager) {
  manager.itemStart(url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Asset ${url}: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Also accept hosts that already send Content-Encoding: gzip.
    if (bytes[0] !== 31 || bytes[1] !== 139) return bytes.buffer;
    if (typeof DecompressionStream !== "undefined") {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).arrayBuffer();
    }
    return gunzipSync(bytes).buffer;
  } catch (error) {
    manager.itemError(url);
    throw error;
  } finally {
    manager.itemEnd(url);
  }
}
