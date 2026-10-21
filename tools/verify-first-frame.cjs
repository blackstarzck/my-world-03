const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  "C:/Users/buche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), sharp = require("sharp");
const url = process.env.PORTFOLIO_URL || "http://127.0.0.1:4191/";
const out = path.resolve("output/browser-checks/first-frame");
fs.mkdirSync(out, { recursive: true });

async function capture(variant) {
  // Separate processes ensure the optimized timing cannot use shaders cached
  // by the reference run. Reference routes reconstruct the previous pipeline.
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" }) });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(() => {
      window.__THREE_DEVTOOLS__ = new EventTarget(); window.__qaObjects = new Set();
      window.__THREE_DEVTOOLS__.addEventListener("observe", event => window.__qaObjects.add(event.detail));
      let loading = false;
      new MutationObserver(() => {
        if (document.querySelector(".loading-screen")) loading = true;
        else if (loading && !window.__firstGalleryPaint) {
          loading = false;
          requestAnimationFrame(() => { window.__firstGalleryPaint = performance.now(); });
        }
      }).observe(document, { childList: true, subtree: true });
    });
    // Stabilize only the AO noise generator, preserving independent UUIDs.
    let deterministicNoise = false;
    await page.route("**/*GTAOPass*", async route => {
      const response = await route.fetch(); let body = await response.text();
      body = body.replace(/new SimplexNoise\(\)/g, () => {
        deterministicNoise = true;
        return "new SimplexNoise((() => { let seed = 1234567; return { random() { seed = (Math.imul(seed,1664525)+1013904223)|0; return (seed>>>0)/4294967296; } }; })())";
      });
      await route.fulfill({ response, body });
    });
    if (variant === "reference") {
      await page.route("**/src/world/scene.js*", async route => {
        const response = await route.fetch(); let body = await response.text();
        assert(body.includes("configureGalleryLightLoops(scene);"));
        assert(body.includes("await warmFirstFrame(renderer, () => composer.render());"));
        body = body.replace("configureGalleryLightLoops(scene);", "")
          .replace("await warmFirstFrame(renderer, () => composer.render());", `
            const { warmGalleryShaders } = await import('/src/world/shader-warmup.js');
            renderer.setRenderTarget(beauty.target);
            await warmGalleryShaders(renderer, scene, camera);
            renderer.setRenderTarget(null);
          `);
        await route.fulfill({ response, body });
      });
      await page.route("**/src/world/gallery-environment.js*", async route => {
        const response = await route.fetch(), source = await response.text();
        const imports = source.match(/import \* as THREE from [^;]+;/)[0];
        await route.fulfill({ response, body: `${imports}
          import { RoomEnvironment } from '/node_modules/three/examples/jsm/environments/RoomEnvironment.js';
          export async function loadGalleryEnvironment() {
            const renderer = [...window.__qaObjects].find(object => object.isWebGLRenderer);
            const room = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
            const target = generator.fromScene(room,.035);
            room.dispose(); generator.dispose(); return target.texture;
          }
        ` });
      });
    }
    await page.goto(url);
    await page.waitForFunction(() => window.__TRIAD__ && window.__firstGalleryPaint, null, { timeout: 120000 });
    assert(deterministicNoise, "AO noise must be fixed for meaningful pixel comparisons");
    const startup = await page.evaluate(() => ({ paintMs: window.__firstGalleryPaint, state: window.__TRIAD__.state() }));
    assert.equal(startup.state.quality, "high"); assert.equal(startup.state.aoEnabled, true);
    await page.evaluate(() => window.__TRIAD__.setSuspended(true));
    await page.locator(".map-model canvas").waitFor();
    const cases = [];
    for (const room of ["lobby", "01", "02", "03"]) for (const lighting of ["day", "evening"]) {
      await page.evaluate(({ room, lighting }) => {
        window.__TRIAD__.goTo(room); window.__TRIAD__.setLighting(lighting);
      }, { room, lighting });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const name = `${room}-${lighting}`;
      await page.screenshot({ path: path.join(out, `${variant}-${name}.png`) });
      cases.push({ name, state: await page.evaluate(() => window.__TRIAD__.state()) });
    }
    let environment;
    if (variant === "optimized") {
      environment = await page.evaluate(async () => {
        const THREE = await import("/node_modules/.vite/deps/three.js");
        const { RoomEnvironment } = await import("/node_modules/three/examples/jsm/environments/RoomEnvironment.js");
        const renderer = [...window.__qaObjects].find(object => object.isWebGLRenderer);
        const scene = [...window.__qaObjects].find(object => object.isScene && object.getObjectByName("Black Hole"));
        const room = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
        const original = generator.fromScene(room, .035);
        const pixels = new Uint16Array(original.width * original.height * 4);
        renderer.readRenderTargetPixels(original, 0, 0, original.width, original.height, pixels);
        const baked = scene.environment.image.data;
        let different = 0;
        for (let i = 0; i < pixels.length; i++) if (pixels[i] !== baked[i]) different++;
        original.dispose(); room.dispose(); generator.dispose();
        return { halfFloatValues: pixels.length, different };
      });
      assert.equal(environment.different, 0, "baked environment must equal freshly generated half-float texels");
    }
    await page.evaluate(() => {
      window.__TRIAD__.goTo("01"); window.__TRIAD__.setLighting("day"); window.__TRIAD__.setSuspended(false);
    });
    const runtime = await page.evaluate(() => new Promise(resolve => {
      let previous, samples = [];
      function sample(now) {
        if (previous) samples.push(now - previous); previous = now;
        if (samples.length < 150) requestAnimationFrame(sample);
        else resolve({ fps: 1000 / (samples.reduce((a,b) => a+b,0) / samples.length), state: window.__TRIAD__.state() });
      }
      requestAnimationFrame(sample);
    }));
    assert.equal(runtime.state.quality, "high");
    assert.deepEqual(errors, []);
    const result = { variant, startup, cases, runtime, environment, errors };
    fs.writeFileSync(path.join(out, `${variant}.json`), JSON.stringify(result, null, 2));
    console.log("PASS", variant, JSON.stringify({ paintMs: startup.paintMs, stages: startup.state.loadingTimings, fps: runtime.fps, environment }));
    return result;
  } finally { await browser.close(); }
}

async function main() {
  const reference = await capture("reference"), optimized = await capture("optimized");
  const comparison = [];
  for (const { name } of reference.cases) {
    const a = await sharp(path.join(out, `reference-${name}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(path.join(out, `optimized-${name}.png`)).removeAlpha().raw().toBuffer();
    let sum = 0, count = 0, over3 = 0;
    // Compare the rendered gallery, excluding toolbar, minimap and the
    // temporally accumulated black-hole pixels in the centre of the lobby.
    for (let y = 115; y < 650; y++) for (let x = 0; x < 1000; x++) {
      if (name.startsWith("lobby") && Math.abs(x-683) < 100 && Math.abs(y-384) < 85) continue;
      for (let c = 0; c < 3; c++) {
        const i = (y * a.info.width + x) * 3 + c, difference = Math.abs(a.data[i] - b[i]);
        sum += difference; count++; if (difference > 3) over3++;
      }
    }
    const result = { name, meanChannelDifference: sum / count, channelsOver3: over3 / count };
    console.log("PIXELS", JSON.stringify(result)); comparison.push(result);
    assert(result.meanChannelDifference < .5 && result.channelsOver3 < .02, `${name}: lighting must remain visually equivalent`);
  }
  assert(optimized.startup.paintMs < reference.startup.paintMs * .75, "first full-quality frame must be materially faster");
  assert(optimized.runtime.fps >= reference.runtime.fps * .9, "shorter shader compilation cannot cause a rendering regression");
  fs.writeFileSync(path.join(out, "comparison.json"), JSON.stringify({
    beforeMs: reference.startup.paintMs, afterMs: optimized.startup.paintMs,
    referenceFps: reference.runtime.fps, optimizedFps: optimized.runtime.fps, comparison,
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
