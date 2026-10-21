const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  "C:/Users/buche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib");

// Bake Three's unchanged RoomEnvironment and sigma .035 into the exact same
// half-float CubeUV texels. This replaces GPU convolution on each first visit.
async function main() {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" }) });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.PORTFOLIO_URL || "http://127.0.0.1:4191/");
    const result = await page.evaluate(async () => {
      const THREE = await import("/node_modules/.vite/deps/three.js");
      const { RoomEnvironment } = await import("/node_modules/three/examples/jsm/environments/RoomEnvironment.js");
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
      const target = generator.fromScene(room, .035);
      const values = new Uint16Array(target.width * target.height * 4);
      renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, values);
      if (!values.some(value => value !== 0)) throw new Error("Environment readback failed");
      const bytes = new Uint8Array(values.buffer), chunks = [];
      for (let i = 0; i < bytes.length; i += 32768)
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
      const result = { width: target.width, height: target.height, colorSpace: target.texture.colorSpace,
        mapping: target.texture.mapping, type: target.texture.type, pixels: btoa(chunks.join("")) };
      target.dispose(); generator.dispose(); room.dispose(); renderer.dispose();
      return result;
    });
    const header = Buffer.alloc(12);
    header.write("TENV", 0); header.writeUInt32LE(result.width, 4); header.writeUInt32LE(result.height, 8);
    const output = zlib.gzipSync(Buffer.concat([header, Buffer.from(result.pixels, "base64")]), { level: 9 });
    fs.writeFileSync(path.resolve("public/assets/gallery-environment.bin.gz"), output);
    delete result.pixels;
    console.log(JSON.stringify({ ...result, bytes: output.length }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
