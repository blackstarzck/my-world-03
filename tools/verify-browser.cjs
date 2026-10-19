const {
  chromium,
} = require("C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const browser = await chromium.connectOverCDP(process.argv[2]);
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) => p.url().includes(":4183"));
  assert(page, "Verification page exists");
  const errors = [],
    results = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const out = path.resolve("output/browser-checks");
  const state = () => page.evaluate(() => window.__TRIAD__.state());
  const check = (name, passed, details) => {
    results.push({ name, passed, details });
    console.log(`${passed ? "PASS" : "FAIL"} ${name}`, details || "");
    assert(passed, name);
  };
  const move = async (key, duration) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    await page.keyboard.up(key);
  };
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__TRIAD__), {
    timeout: 60000,
  });
  await page.locator(".loading-screen").waitFor({ state: "detached" });
  await page.waitForTimeout(1400);
  check(
    "Initial lobby with one world canvas and one miniature canvas",
    (await state()).room === "lobby" &&
      (await page.locator(".world canvas").count()) === 1 &&
      (await page.locator(".map-model canvas").count()) === 1,
  );
  await page.screenshot({ path: path.join(out, "01-lobby.png") });
  for (const [id, title, shot] of [
    ["01", "01 고전의 깊이", "02-classic.png"],
    ["02", "02 빛의 여백", "03-concrete.png"],
    ["03", "03 형태의 기억", "04-objects.png"],
  ]) {
    await page.getByRole("button", { name: title, exact: true }).click();
    await page.waitForFunction(
      (id) => window.__TRIAD__.state().room === id,
      id,
    );
    await page.waitForTimeout(650);
    check(`Gallery ${id} navigation`, (await state()).room === id);
    await page.screenshot({ path: path.join(out, shot) });
  }
  await page.getByRole("button", { name: "02 빛의 여백", exact: true }).click();
  await page.waitForTimeout(350);
  await page.mouse.click(350, 525);
  await page.getByRole("dialog", { name: "Roses", exact: true }).waitFor();
  check(
    "Painting click opens matching artwork and source",
    (await page
      .getByRole("heading", { name: "Roses", exact: true })
      .count()) === 1 &&
      (
        await page
          .getByRole("link", { name: "소장처 · 원본 정보" })
          .getAttribute("href")
      ).includes("metmuseum.org"),
  );
  await page.screenshot({ path: path.join(out, "09-artwork.png") });
  await page.keyboard.press("Escape");
  const before = await state();
  await move("w", 1000);
  const after = await state();
  const normalDistance = Math.hypot(
    ...[0, 2].map((i) => after.position[i] - before.position[i]),
  );
  check(
    "Faster normal walking advances at least 3.5m in one second",
    normalDistance > 3.5 && normalDistance < 5.8,
    { metres: normalDistance },
  );
  await page.getByRole("button", { name: "02 빛의 여백", exact: true }).click();
  await page.waitForTimeout(350);
  const sprintBefore = await state();
  await page.keyboard.down("Shift");
  await move("w", 1000);
  await page.keyboard.up("Shift");
  const sprintAfter = await state();
  const sprintDistance = Math.hypot(
    ...[0, 2].map((i) => sprintAfter.position[i] - sprintBefore.position[i]),
  );
  check(
    "Shift remains noticeably faster than normal walking",
    sprintDistance > normalDistance * 1.3 && sprintDistance > 6,
    { metres: sprintDistance },
  );
  await page.keyboard.down("Shift");
  await move("w", 3000);
  await page.keyboard.up("Shift");
  const rearPosition = await page.evaluate(async () => {
    const { toRoom } = await import("/src/world/layout.js");
    const s = window.__TRIAD__.state();
    return toRoom("02", s.position[0], s.position[2]);
  });
  check(
    "Sprinting stops at the rear wall instead of crossing it",
    rearPosition.v > 23.4 && rearPosition.v < 23.8,
    rearPosition,
  );
  await page.getByRole("button", { name: "02 빛의 여백", exact: true }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "전시 소개", exact: true }).click();
  const paused = await state();
  await move("w", 400);
  check(
    "A dialog pauses walking",
    JSON.stringify(paused.position) ===
      JSON.stringify((await state()).position),
  );
  await page.keyboard.press("Escape");
  check("Escape closes dialog", (await page.getByRole("dialog").count()) === 0);
  await page
    .getByRole("button", { name: "저녁 조명으로 변경", exact: true })
    .click();
  check(
    "Evening lighting toggle",
    (await page
      .getByRole("button", { name: "낮 조명으로 변경", exact: true })
      .count()) === 1,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, "05-evening.png") });
  await page
    .getByRole("button", { name: "낮 조명으로 변경", exact: true })
    .click();
  await page.getByRole("button", { name: "전체 공간", exact: true }).click();
  await page.waitForTimeout(700);
  check(
    "Overview opens with roofs hidden",
    (await state()).overview && !(await state()).roofVisible,
  );
  await page.screenshot({ path: path.join(out, "06-overview.png") });
  await page
    .getByRole("button", { name: "자유 관람 시작", exact: true })
    .click();
  await page.waitForTimeout(500);
  const walking = await state();
  check(
    "Walking from overview restores the lobby and roofs",
    walking.room === "lobby" && walking.roofVisible && !walking.overview,
  );
  check("Mouse look locks on explicit start", walking.locked);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  // Headless Escape does not release pointer lock on every browser build.
  await page.evaluate(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  });
  await page
    .getByRole("button", { name: "중앙 로비로 이동", exact: true })
    .click();
  await page.waitForTimeout(350);
  check("Minimap navigation", (await state()).room === "lobby");
  const timing = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [];
        let previous = performance.now(),
          start = previous;
        function next(now) {
          samples.push(now - previous);
          previous = now;
          if (now - start > 1800) {
            samples.sort((a, b) => a - b);
            resolve({
              fps: Math.round(
                1000 / (samples.reduce((a, b) => a + b, 0) / samples.length),
              ),
              p95: Math.round(samples[Math.floor(samples.length * 0.95)]),
            });
          } else requestAnimationFrame(next);
        }
        requestAnimationFrame(next);
      }),
  );
  results.push({ name: "Observed browser frame timing", ...timing });
  console.log("TIMING", timing);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__TRIAD__), {
    timeout: 60000,
  });
  await page.locator(".loading-screen").waitFor({ state: "detached" });
  await page.waitForTimeout(600);
  check("Mobile uses lighter quality", (await state()).quality === "balanced");
  const width = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  check(
    "Mobile has no horizontal overflow",
    width.document === width.viewport,
    width,
  );
  await page.screenshot({ path: path.join(out, "07-mobile-lobby.png") });
  await page
    .getByRole("button", { name: "03 형태의 기억", exact: true })
    .click();
  await page.waitForTimeout(400);
  const mobileBefore = await state();
  const button = await page
    .getByRole("button", { name: "앞으로 이동", exact: true })
    .boundingBox();
  await page.mouse.move(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(550);
  await page.mouse.up();
  const mobileAfter = await state();
  check(
    "Mobile direction control moves the visitor",
    Math.hypot(
      ...[0, 2].map((i) => mobileAfter.position[i] - mobileBefore.position[i]),
    ) > 0.5,
  );
  await page.screenshot({ path: path.join(out, "08-mobile-gallery.png") });
  await page.getByRole("button", { name: "전체 공간", exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, "10-mobile-overview.png") });
  check("Mobile overview navigation", (await state()).overview);
  check("No browser errors", errors.length === 0, errors);
  fs.writeFileSync(
    path.join(out, "verification.json"),
    JSON.stringify(
      { url: page.url(), testedAt: new Date().toISOString(), results, errors },
      null,
      2,
    ),
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__TRIAD__), {
    timeout: 60000,
  });
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
