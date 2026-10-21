const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const out = path.resolve("output/browser-checks");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  // Three's public devtools observation event lets QA inspect the actual
  // installed exhibit, without adding inspection globals to application code.
  await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__qaObjects = new Set();
    window.__THREE_DEVTOOLS__.addEventListener("observe", (event) =>
      window.__qaObjects.add(event.detail),
    );
  });
  const errors = [];
  const warnings = [];
  const requests = [];
  const checks = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "warning") warnings.push(message.text());
  });
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  page.on("response", (response) => {
    if (response.url().includes("black_hole.glb"))
      requests.push({ url: response.url(), status: response.status() });
  });
  const check = (name, passed, details) => {
    checks.push({ name, passed, details });
    console.log(`${passed ? "PASS" : "FAIL"} ${name}`, details ?? "");
    assert(passed, name);
  };
  try {
    await page.goto(process.argv[2] ?? "http://127.0.0.1:4184/");
    await page.waitForFunction(() => Boolean(window.__TRIAD__), null, {
      timeout: 120000,
    });
    await page.locator(".loading-screen").waitFor({ state: "detached" });
    const model = await page.evaluate(async () => {
      const threeModule = performance.getEntriesByType("resource").find(
        (entry) => /\/\.vite\/deps\/three\.js\?/.test(entry.name),
      );
      const THREE = await import(threeModule.name);
      const scene = [...window.__qaObjects].find(
        (object) => object.isScene && object.getObjectByName("Black Hole"),
      );
      const exhibit = scene.getObjectByName("Black Hole");
      const bounds = new THREE.Box3().setFromObject(exhibit, true);
      const meshes = [];
      exhibit.traverse((object) => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material)
          ? object.material : [object.material]) {
          meshes.push({
            name: object.name,
            material: material.name,
            type: material.type,
            transparent: material.transparent,
            opacity: material.opacity,
            side: material.side,
            emissive: material.emissive?.toArray(),
            intensity: material.emissiveIntensity,
            visible: material.visible,
            blending: material.blending,
            bumpScale: material.bumpScale,
            map: material.map?.image
              ? [material.map.image.width, material.map.image.height] : null,
          });
        }
      });
      return {
        min: bounds.min.toArray(), max: bounds.max.toArray(),
        size: bounds.getSize(new THREE.Vector3()).toArray(), meshes,
      };
    });
    check("GLB served successfully", requests.some((request) => request.status === 200), requests);
    check("All 13 black-hole meshes loaded", model.meshes.length === 13);
    check("Model fits above the existing 3.6m plinth",
      Math.max(...model.size) <= 3.35 && model.min[1] > 0.45 &&
        Math.abs((model.min[1] + model.max[1]) / 2 - 1.75) < 0.001,
      { min: model.min, max: model.max, size: model.size });
    check("Authored ring textures retain alpha blending and front faces",
      model.meshes.filter((mesh) => /^ring2?$/.test(mesh.material)).every(
        (mesh) => mesh.map?.[0] > 0 && mesh.transparent && mesh.side === 0));
    check("Core remains black while the tinted support sheets stay hidden",
      model.meshes.some((mesh) => mesh.material === "black_hole_center" && mesh.visible)
        && ["black_hole_blackoutside", "black_hole_distortion"].every(
          (name) => model.meshes.filter((mesh) => mesh.material === name).every((mesh) => !mesh.visible)));
    check("Light shells do not render their backs over the black center",
      model.meshes.filter((mesh) => /^black_hole_light/.test(mesh.material))
        .every((mesh) => mesh.side === 0));
    const resting = await page.evaluate(() => window.__TRIAD__.state().blackHole);
    check("Distant black hole stays at its resting size", resting.scale === 1 && resting.activation < 0.01);

    // Use the same existing navigation API to inspect the front and back.
    const pose = async (position, target) => {
      await page.evaluate(async ({ position, target }) => {
        const { destinations } = await import("/src/world/layout.js");
        destinations.lobby = { position, target };
        window.__TRIAD__.goTo("lobby");
      }, { position, target });
      await page.waitForTimeout(2800);
    };
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, "black-hole-day-lobby.png") });
    await pose([2.2, 1.75, 2.1], [0, 1.75, 0]);
    const awake = await page.evaluate(() => window.__TRIAD__.state().blackHole);
    check("Approaching enlarges the black hole at a fixed eye-level center",
      awake.activation > 0.9 && awake.scale > 1.7 && awake.height === 1.75 && awake.bloomEnabled,
      awake);
    await page.screenshot({ path: path.join(out, "black-hole-day-close.png") });
    await page.getByRole("button", { name: "저녁 조명으로 변경", exact: true }).click();
    check("Lights-off preset applied", await page.evaluate(
      () => window.__TRIAD__.state().lighting === "evening"));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(out, "black-hole-evening-close.png") });
    const flowing = await page.evaluate(() => window.__TRIAD__.state().blackHole);
    check("Orbital motion and light flow continue while standing still",
      flowing.phase !== awake.phase && flowing.flow !== awake.flow);
    await pose([-2.2, 1.75, -2.1], [0, 1.75, 0]);
    await page.screenshot({ path: path.join(out, "black-hole-evening-back.png") });
    await page.getByRole("button", { name: "낮 조명으로 변경", exact: true }).click();
    check("Lights-on preset restored", await page.evaluate(
      () => window.__TRIAD__.state().lighting === "day"));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, "black-hole-day-back.png") });
    await page.getByRole("button", { name: "전체 공간", exact: true }).click();
    await page.waitForTimeout(800);
    check("Overview disables the close-range glow", await page.evaluate(
      () => !window.__TRIAD__.state().blackHole.bloomEnabled));
    await page.screenshot({ path: path.join(out, "black-hole-overview.png") });
    await pose([3, 1.75, 8], [0, 1.75, 0]);
    await page.waitForTimeout(2200);
    check("Retreat restores a calm resting size", await page.evaluate(
      () => window.__TRIAD__.state().blackHole.scale < 1.02));
    await page.setViewportSize({ width: 390, height: 844 });
    await pose([3, 1.75, 8], [0, 1.75, 0]);
    await page.screenshot({ path: path.join(out, "black-hole-mobile-day.png") });
    await page.getByRole("button", { name: "저녁 조명으로 변경", exact: true }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, "black-hole-mobile-evening.png") });
    check("Mobile uses lighter rendering", await page.evaluate(
      () => window.__TRIAD__.state().quality === "balanced"));
    check("No obsolete material extension warnings", !warnings.some(
      (warning) => /unknown extension|pbrSpecularGlossiness/i.test(warning)), warnings);
    check("No browser or asset loading errors", errors.length === 0, errors);
    fs.writeFileSync(path.join(out, "black-hole-verification.json"), JSON.stringify(
      { checks, model, errors, warnings }, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
