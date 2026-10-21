const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/buche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const baseUrl = process.env.PORTFOLIO_URL || "http://127.0.0.1:4185",
  localOrigin = new URL(baseUrl).origin,
  out = path.resolve("output/browser-checks/live-experience-only");
fs.mkdirSync(out, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "C:/Users/buche/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
    args: process.env.CPU_WEBGL ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [],
  });
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      reducedMotion: "reduce",
    }),
    errors = [],
    checks = [],
    blockedWrites = [];
  let failure;
  const check = (name, details) => {
    checks.push({ name, details });
    console.log("PASS " + name + " " + JSON.stringify(details || ""));
  };
  const shot = (name) => page.screenshot({ path: path.join(out, name) });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const request = route.request();
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method()) &&
      new URL(request.url()).origin !== localOrigin
    ) {
      blockedWrites.push({
        method: request.method(),
        origin: new URL(request.url()).origin,
      });
      return route.abort();
    }
    return route.continue();
  });

  async function openIndex(query = "", view = "projects") {
    if (!(await page.locator(".artwork-index").isVisible())) {
      const detail = page.locator(".project-detail-page");
      await (
        (await detail.isVisible())
          ? detail.getByRole("button", { name: "전체 프로젝트", exact: true })
          : page.getByRole("button", { name: "전체 프로젝트", exact: true })
      ).click();
    }
    await page
      .getByRole("button", {
        name: view === "projects" ? "프로젝트별" : "그룹별",
        exact: true,
      })
      .click();
    await page.getByRole("searchbox", { name: "프로젝트 검색" }).fill(query);
  }
  async function choose(query, view = "projects") {
    await openIndex(query, view);
    await page.locator(".artwork-index-row").first().click();
    await page.locator(".project-detail-page").waitFor({ timeout: 60000 });
    await page.waitForFunction(() => !window.__TRIAD__.state().moving, null, {
      timeout: 60000,
    });
  }
  async function showExperience() {
    await page
      .locator(".project-detail-tabs")
      .getByRole("button", {
        name: "프로젝트 체험", exact: true,
      })
      .click();
    await page.locator(".experience-shell").waitFor({ state: "visible" });
  }
  async function closeDetail() {
    await page
      .getByRole("button", {
        name: "프로젝트 닫기",
        exact: true,
      })
      .click();
    await page.locator(".project-detail-page").waitFor({ state: "detached" });
  }
  async function assertFlatFullPage() {
    const geometry = await page
      .locator(".project-detail-page")
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          transform: getComputedStyle(element).transform,
          backgroundInert: document.querySelector(".exhibition-stage").inert,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
    assert.equal(geometry.x, 0);
    assert.equal(geometry.y, 0);
    assert.equal(geometry.width, geometry.viewportWidth);
    assert.equal(geometry.height, geometry.viewportHeight);
    assert.equal(geometry.transform, "none");
    assert.equal(geometry.backgroundInert, true);
    assert.equal(geometry.overflow, false);
    return geometry;
  }
  function assertPlainInterface(text) {
    for (const phrase of [
      "작품에 대하여",
      "관람 포인트",
      "연작에서 프로젝트 선택",
      "액자에 맞춤",
      "전체 작품",
      "자료 전시",
      "관람용",
      "화면·자료",
      "자료 보기",
    ])
      assert(
        !text.includes(phrase),
        `Old interface wording remains: ${phrase}`,
      );
  }

  try {
    await page.goto(baseUrl);
    await page.waitForFunction(() => window.__TRIAD__, null, {
      timeout: 90000,
    });
    await page
      .locator(".loading-screen")
      .waitFor({ state: "detached", timeout: 90000 });
    const collection = await page.evaluate(() =>
      window.__TRIAD__.getArtworks().map((artwork) => ({
        id: artwork.id,
        room: artwork.room,
        title: artwork.title,
        target: artwork.target,
        normal: artwork.normal,
        projects: artwork.projects.map((project) => ({
          id: project.id,
          name: project.name,
          sourceEntryId: project.sourceEntryId,
          mode: project.mode,
        })),
      })),
    );
    assert.equal(collection.length, 49);
    assert.equal(
      new Set(
        collection.flatMap((artwork) =>
          artwork.projects.map((project) => project.sourceEntryId),
        ),
      ).size,
      95,
    );
    check("49 physical positions preserve all 95 project and case entries");
    assertPlainInterface(await page.locator(".topbar").innerText());
    await shot("01-lobby.png");
    if (!process.env.SKIP_ROOM_SHOTS) {
      for (const id of ["01", "02", "03"]) {
        await page.locator(`button[data-room="${id}"]`).click();
        assert.equal(
          await page.evaluate(() => window.__TRIAD__.state().room),
          id,
        );
        await shot(`room-${id}.png`);
      }
    }
    await openIndex();
    assert.equal(await page.locator(".artwork-index-row").count(), 95);
    await page.getByRole("button", { name: "그룹별", exact: true }).click();
    assert.equal(await page.locator(".artwork-index-row").count(), 49);
    await page.getByRole("button", { name: "프로젝트별", exact: true }).click();
    check("Project and group indexes expose 95 entries and 49 positions");
    await shot("02-index.png");

    await page.getByRole("searchbox").fill("react-practice1");
    assert.equal(await page.locator(".artwork-index-row").count(), 1);
    await page.locator(".artwork-index-row").click();
    await page.locator(".project-detail-page").waitFor();
    assert.equal(
      await page.locator("#project-detail-title").innerText(),
      "react-practice1",
    );
    assert(
      (
        await page.locator(".project-related-picker select").inputValue()
      ).endsWith("react-practice1"),
    );
    assert.equal(await page.locator("iframe").count(), 0);
    check(
      "Search opens the exact nested React project and starts with its overview",
    );
    check(
      "Detail uses a flat full viewport layer with inert gallery background",
      await assertFlatFullPage(),
    );

    for (const name of ["react-todos", "Planit", "CONNECT BEE"]) {
      await choose(name);
      assert.equal(await page.locator(".project-detail-tabs").count(), 0);
      assert.equal(await page.locator(".experience-shell").count(), 0);
      assert.equal(await page.locator("iframe").count(), 0);
      assert(await page.locator(".project-painting-view").isVisible());
      assertPlainInterface(await page.locator(".project-detail-page").innerText());
    }
    await choose("Planit");
    await page.waitForFunction(() => document.querySelector(".project-painting-stage img")?.naturalWidth === 1484);
    await shot("03-planit-without-tabs.png");
    check("Projects without an approved web app show only painting and description, without tabs");

    await choose("On the Book");
    assert.equal(await page.locator(".web-app iframe").count(), 0);
    await showExperience();
    assert.equal(await page.locator(".web-app iframe").count(), 1);
    const frame = page.frameLocator(".web-app iframe");
    const alice = frame
      .getByRole("link", {
        name: "이상한 나라의 앨리스 — 작품 상세",
        exact: true,
      })
      .first();
    await alice.waitFor({ timeout: 60000 });
    await alice.click();
    const remote = await (
      await page.locator(".web-app iframe").elementHandle()
    ).contentFrame();
    await remote.waitForURL((url) => url.searchParams.get("book") === "alice", {
      timeout: 30000,
    });
    await frame.getByText("이 책의 여정", { exact: true }).waitFor();
    await page.getByRole("button", { name: "크게 보기", exact: true }).click();
    const viewport = await page
      .locator(".web-app iframe")
      .evaluate((element) => {
        window.__qaIframe = element;
        return {
          width: element.clientWidth,
          height: element.clientHeight,
          transform: getComputedStyle(element.closest(".experience-surface"))
            .transform,
        };
      });
    assert(viewport.width > 1400, JSON.stringify(viewport));
    assert(viewport.height > 650, JSON.stringify(viewport));
    assert.equal(viewport.transform, "none");
    check(
      "Live On the Book loads its real book detail in a wide flat iframe",
      viewport,
    );
    await page.getByRole("button", { name: "그림 보기", exact: true }).click();
    assert.equal(await page.locator(".web-app iframe").count(), 1);
    assert.equal(await page.locator(".web-app iframe").isVisible(), false);
    await showExperience();
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(
      await page
        .locator(".web-app iframe")
        .evaluate((element) => element === window.__qaIframe),
      true,
    );
    assert(remote.url().includes("book=alice"));
    check(
      "Painting and experience tabs plus viewport resize preserve the same iframe and book URL",
    );
    await frame
      .getByRole("button", { name: "이 장면부터 걷기", exact: true })
      .first()
      .click();
    await frame.locator("canvas").waitFor({ state: "visible", timeout: 60000 });
    const selectedBefore = await page.evaluate(
      () => window.__TRIAD__.state().selectedArtwork,
    );
    await frame.locator("canvas").click({ position: { x: 40, y: 40 } });
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.evaluate(() => window.__TRIAD__.state().selectedArtwork),
      selectedBefore,
    );
    await remote.evaluate(() => document.exitPointerLock?.());
    await shot("06-on-book-live.png");
    check(
      "Embedded book 3D scene accepts keyboard input without navigating the portfolio",
    );
    await page
      .locator(".project-detail-header")
      .getByRole("button", { name: "다음 프로젝트", exact: true })
      .click();
    await page.locator(".web-app iframe").waitFor({ state: "detached" });
    await page
      .locator(".project-detail-page")
      .waitFor({ state: "visible", timeout: 60000 });
    assert.equal(
      await page.evaluate(() => window.__TRIAD__.state().selectedArtwork),
      selectedBefore,
    );
    assert.notEqual(await page.locator('.project-detail-page').getAttribute('data-artwork-id'),selectedBefore);
    check("Changing project immediately replaces content and removes the iframe while keeping the camera still");

    await choose("On the Book");
    await showExperience();
    await page.locator(".web-app iframe").waitFor();
    await closeDetail();
    assert.equal(await page.locator(".web-app iframe").count(), 0);
    check("Closing the project removes its iframe");
    await choose("관리 도구", "groups");
    assert.equal(
      await page.locator("#project-detail-title").innerText(),
      "On the Book · 관리 도구",
    );
    assert.equal(await page.locator(".web-app iframe").count(), 0);
    assert.equal(await page.locator(".project-detail-tabs").count(), 0);
    assertPlainInterface(await page.locator(".project-detail-page").innerText());
    check(
      "Admin preparation stays on the project overview without an operational login iframe",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await choose("Planit");
    await assertFlatFullPage();
    assert.equal(await page.locator(".project-detail-tabs").count(),0);
    await shot("07-mobile-without-tabs.png");
    await choose("On the Book");
    await showExperience();
    await page.getByRole("button", {name:"크게 보기",exact:true}).click();
    await page.waitForFunction(() => document.querySelector(".experience-surface")?.getBoundingClientRect().height > 600);
    const mobileViewport = await page.locator(".experience-surface").boundingBox();
    assert(mobileViewport.width >= 380 && mobileViewport.height > 600, JSON.stringify(mobileViewport));
    assert(await page.getByRole("button", {name:"프로젝트 닫기",exact:true}).isVisible());
    assert.equal(await page.getByRole("button", {name:"자료 보기",exact:true}).count(),0);
    await shot("08-mobile-live.png");
    check("Mobile live experience remains available with an external close and no screen-material tab", mobileViewport);
    await closeDetail();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('button[data-room="03"]').click();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openIndex("neon-fist");
    await page.locator(".artwork-index-row").click();
    await page
      .getByRole("button", { name: "프로젝트 이동 취소", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "프로젝트 이동 취소", exact: true })
      .click({ force: true });
    await page.locator(".project-approach").waitFor({ state: "detached" });
    await page.waitForFunction(() => !window.__TRIAD__.state().moving, null, {
      timeout: 60000,
    });
    assert.equal(await page.locator(".project-detail-page").count(), 0);
    assert.equal(await page.locator("iframe").count(), 0);
    check(
      "Cancelling an animated approach never opens a stale detail or iframe",
    );

    await openIndex("neon-fist");
    await page.evaluate(() => {
      window.__qaApproach = {
        started: performance.now(),
        movingSeen: false,
        arrived: null,
        shown: null,
      };
      const sample = () => {
        const result = window.__qaApproach,
          state = window.__TRIAD__.state();
        if (state.moving) result.movingSeen = true;
        if (result.movingSeen && !state.moving && !result.arrived) {
          result.arrived = performance.now();
          result.camera = state;
        }
        if (document.querySelector(".project-detail-page"))
          result.shown = performance.now();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.locator(".artwork-index-row").click();
    await page.waitForFunction(() => window.__TRIAD__.state().moving);
    assert.equal(await page.locator(".project-detail-page").count(), 0);
    assert.equal(await page.locator("iframe").count(), 0);
    await page.locator(".project-detail-page").waitFor({ timeout: 60000 });
    await page.waitForFunction(() => window.__qaApproach.shown);
    const timing = await page.evaluate(() => window.__qaApproach);
    assert(
      timing.arrived && timing.shown - timing.arrived >= 160,
      JSON.stringify(timing),
    );
    const artwork = collection.find(
      (item) => item.id === timing.camera.selectedArtwork,
    );
    assert(Math.abs(timing.camera.position[1] - artwork.target[1]) < 0.001);
    const offset = timing.camera.position.map(
      (value, index) => value - artwork.target[index],
    );
    const cosine =
      offset.reduce(
        (sum, value, index) => sum + value * artwork.normal[index],
        0,
      ) / Math.hypot(...offset);
    assert(cosine > 0.99999, JSON.stringify({ cosine, offset }));
    assert.equal(await page.locator("iframe").count(), 0);
    await shot("09-animated-arrival.png");
    check(
      "Animated approach reaches the exact frontal pose then holds before detail fade-in",
      {
        holdMs: timing.shown - timing.arrived,
        cosine,
        height: timing.camera.position[1],
      },
    );
    await showExperience();
    assert.equal(await page.locator(".web-app iframe").count(), 1);
    await closeDetail();
    assert.equal(await page.locator("iframe").count(), 0);
    check("Closing immediately removes the iframe and reveals the selected artwork");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await choose("Planit");
    for (const [width, height] of [[1920,1080],[1366,768],[1024,768],[390,844],[844,390]]) {
      await page.setViewportSize({ width, height });
      await page.locator(".project-painting-stage img").waitFor();
      await page.waitForFunction(() => document.querySelector(".project-painting-stage img")?.naturalWidth === 1484);
      await assertFlatFullPage();
      for (const expanded of [false, true]) {
        if (expanded) await page.getByRole("button", { name: "크게 보기", exact: true }).click();
        const geometry = await page.locator(".project-painting-stage img").evaluate(img => {
          const r=img.getBoundingClientRect();
          return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height, fit:getComputedStyle(img).objectFit };
        });
        assert(geometry.width > 100 && geometry.height > 50, JSON.stringify(geometry));
        assert(geometry.x >= 0 && geometry.y >= 0 && geometry.right <= width + 1 && geometry.bottom <= height + 1, JSON.stringify(geometry));
        assert.equal(geometry.fit, "contain");
        assert(await page.getByRole("button", { name: "프로젝트 닫기", exact:true }).isVisible());
        await shot(`painting-${width}x${height}${expanded ? "-expanded" : ""}.png`);
        if (expanded) await page.getByRole("button", { name: "설명과 함께 보기", exact: true }).click();
      }
      check(`Painting and expanded painting stay inside ${width}x${height}`);
    }
    await page.setViewportSize({width:1366,height:768});
    await choose("강사 대시보드");
    const beforeChild = await page.evaluate(() => ({position:window.__TRIAD__.state().position, selected:window.__TRIAD__.state().selectedArtwork, image:document.querySelector(".project-painting-stage img").getAttribute("src")}));
    await showExperience();
    assert.equal(await page.locator(".web-app iframe").count(),1);
    await page.locator(".project-related-picker select").selectOption({label:"학생 대시보드"});
    await page.waitForFunction(() => document.querySelector("#project-detail-title")?.textContent === "학생 대시보드");
    assert.equal(await page.locator(".web-app iframe").count(),0);
    assert(await page.locator(".project-painting-view").isVisible());
    const afterChild = await page.evaluate(() => ({position:window.__TRIAD__.state().position, selected:window.__TRIAD__.state().selectedArtwork, image:document.querySelector(".project-painting-stage img").getAttribute("src")}));
    assert.deepEqual(afterChild,beforeChild);
    check("Changing a child project keeps the same canvas and camera, disposes iframe and restores painting");
    await choose("Planit");
    await page.setViewportSize({width:1366,height:768});
    const imageBefore = await page.locator(".project-painting-stage img").boundingBox();
    await page.locator(".project-case-scroll").evaluate(el => el.scrollTop = 700);
    const imageAfter = await page.locator(".project-painting-stage img").boundingBox();
    assert.deepEqual(imageAfter, imageBefore);
    check("Desktop description scroll leaves painting fixed");
    await page.getByRole("button", {name:"크게 보기",exact:true}).click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".project-detail-page.is-expanded").count(),0);
    assert.equal(await page.locator(".project-detail-page").count(),1);
    check("Escape restores description before closing the project");
    await page.locator(".project-detail-header button").first().focus();
    await page.keyboard.press("Shift+Tab");
    assert(await page.locator(".project-case-footer button").last().evaluate(el => el === document.activeElement));
    await page.keyboard.press("Tab");
    assert(await page.locator(".project-detail-header button").first().evaluate(el => el === document.activeElement));
    check("Keyboard focus remains inside the project dialog");
    await closeDetail();
    assert(await page.evaluate(() => document.activeElement !== document.body && !document.activeElement.closest("[inert]")));
    check("Closing focuses the selected artwork's gallery control");
    assert.deepEqual(errors, []);
    check("No portfolio or embedded app runtime exceptions");
  } catch (error) {
    failure = { message: error.message, stack: error.stack };
    await shot("failure.png").catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(
        {
          passed: !failure,
          checks,
          errors,
          blockedWrites,
          failure,
        },
        null,
        2,
      ),
    );
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
