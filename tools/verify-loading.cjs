const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  "C:/Users/buche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const url = process.env.PORTFOLIO_URL || "http://127.0.0.1:4191/";
const out = path.resolve("output/browser-checks/loading");
fs.mkdirSync(out, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: "chrome" }) });
  const report = [];
  try {
    for (const [name, viewport, reducedMotion] of [
      ["desktop", { width: 1366, height: 768 }, "no-preference"],
      ["mobile", { width: 390, height: 844 }, "reduce"],
    ]) {
      const context = await browser.newContext({ viewport, reducedMotion });
      const page = await context.newPage(), errors = [], requests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => requests.push(request.url()));
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route("**/black_hole.optimized.glb.gz", async route => { await gate; await route.continue(); });
      await page.goto(url);
      await page.locator(".box-loader .boxes").waitFor();
      assert.equal(await page.locator(".box-loader .box").count(), 4);
      assert.equal(await page.locator(".box-loader .face").count(), 16);
      assert.equal(await page.locator(".brand, .featured-caption, .loading-footer, .progress-line").count(), 0);
      assert.equal(await page.locator(".map-model canvas").count(), 0, "hidden minimap must not initialize during startup");
      assert(!/%/.test(await page.locator(".loading-screen").innerText()), "no fictional estimate");
      if (reducedMotion === "reduce")
        assert.equal(await page.locator(".box-1").evaluate(el => getComputedStyle(el).animationName), "none");
      await page.screenshot({ path: path.join(out, `${name}-loader.png`) });
      release();
      await page.waitForFunction(() => window.__TRIAD__, null, { timeout: 120000 });
      await page.locator(".loading-screen").waitFor({ state: "detached" });
      await page.locator(".map-model canvas").waitFor();
      const state = await page.evaluate(() => window.__TRIAD__.state());
      assert.equal(state.artworkCount, 49);
      assert(!requests.some(url => /\/black_hole\.glb(?:\?|$)/.test(url)));
      assert(!requests.some(url => /\/(?:wood-(?:normal|roughness)|stone-normal)\.jpg/.test(url)));
      assert.equal(await page.locator(".brand, .featured-caption").count(), 0);
      const bounds = await page.getByRole("group", { name: "공간과 프로젝트 보기" }).boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, "toolbar fits");
      await page.screenshot({ path: path.join(out, `${name}-gallery.png`) });
      await page.getByRole("button", { name: "전체 프로젝트", exact: true }).click();
      await page.locator(".artwork-index-row").first().waitFor();
      const projects = await page.locator(".artwork-index-row").count();
      assert.equal(projects, 95);
      await page.getByRole("button", { name: "닫기", exact: true }).click();
      await page.getByRole("button", { name: "전체 공간", exact: true }).click();
      await page.waitForFunction(() => window.__TRIAD__.state().overview);
      await page.getByRole("button", { name: "공간으로 돌아가기", exact: true }).click();
      await page.waitForFunction(() => !window.__TRIAD__.state().overview);
      assert.deepEqual(errors, []);
      report.push({ name, loadingTimings: state.loadingTimings, projects, errors });
      console.log("PASS", name, JSON.stringify(report.at(-1)));
      await context.close();
    }
    const page = await browser.newPage();
    await page.route("**/black_hole.optimized.glb.gz", route => route.fulfill({ status: 503, body: "unavailable" }));
    await page.goto(url);
    await page.getByRole("alert").waitFor({ timeout: 30000 });
    assert(await page.getByRole("button", { name: "다시 불러오기" }).isVisible());
    assert.equal(await page.locator(".box-loader").count(), 0, "failure must not keep animating forever");
    report.push({ name: "failure", retryVisible: true });
    console.log("PASS failure state shows a retry action");
  } finally {
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
