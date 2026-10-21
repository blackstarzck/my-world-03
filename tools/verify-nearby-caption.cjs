const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/buche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const out = path.resolve('output/browser-checks/nearby-caption');
fs.mkdirSync(out, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROMIUM_PATH || 'C:/Users/buche/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const checks = [], errors = [];
  let failure;
  page.on('pageerror', error => errors.push(error.message));
  const pass = name => { checks.push(name); console.log('PASS ' + name); };
  const focus = id => page.evaluate(id => window.__TRIAD__.focusArtwork(id, { animated: false }), id);
  const caption = name => page.waitForFunction(name =>
    document.querySelector('.featured-caption:not(.room-introduction) h1')?.textContent === name, name, { timeout: 5000 });
  try {
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4185');
    await page.waitForFunction(() => window.__TRIAD__, null, { timeout: 90000 });
    await page.locator('.loading-screen').waitFor({ state: 'detached', timeout: 90000 });
    assert.equal(await page.locator('.featured-caption:not(.room-introduction)').count(), 0);
    assert.equal(await page.locator('.room-introduction').count(), 0);
    pass('Lobby stays clear until a nearby project is detected');
    const artworks = await page.evaluate(() => window.__TRIAD__.getArtworks().map(a => ({ id: a.id, name: a.projectName, target: a.target })));
    const misses = [];
    for (const art of artworks) {
      await focus(art.id);
      try { await caption(art.name); }
      catch { misses.push({ ...art, actual: await page.locator('.featured-caption h1').textContent({ timeout: 500 }).catch(() => null) }); }
    }
    assert.deepEqual(misses, [], 'every canvas must be detected from its frontal viewing position');
    pass('All 49 wall, panel and glass-case canvases automatically expose the correct project');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await focus('P01-01-F');
    await caption(artworks.find(a => a.id === 'P01-01-F').name);
    await page.screenshot({ path: path.join(out, 'restored-envelope-desktop.png') });

    const end = artworks.find(a => a.id === 'A03-END');
    await focus(end.id); await caption(end.name);
    await page.locator('.world canvas').focus();
    await page.keyboard.down('s');
    try {
      await page.waitForFunction(target => Math.hypot(...window.__TRIAD__.state().position.map((v, i) => v - target[i])) > 4, end.target, { timeout: 15000 });
    } finally { await page.keyboard.up('s'); }
    await page.locator('.featured-caption').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.room-introduction').count(), 0);
    pass('Walking away hides the project caption without restoring removed introduction text');
    await page.keyboard.down('w');
    try { await caption(end.name); }
    finally { await page.keyboard.up('w'); }
    assert.equal(await page.locator('.project-detail-page').count(), 0);
    pass('Walking back reveals the project without clicking or opening details');

    await page.locator('.featured-caption button').click();
    await page.locator('.project-detail-page').waitFor();
    assert.equal(await page.locator('.project-detail-page').getAttribute('data-artwork-id'), end.id);
    await page.keyboard.press('Escape');
    await page.locator('.project-detail-page').waitFor({ state: 'detached' });
    await caption(end.name);
    pass('The automatically revealed Open button opens that project and closing preserves its caption');

    const dealer = artworks.find(a => a.name.includes('모두가딜러') && a.name.includes('웹서비스'));
    const wrapping = [];
    for (const [width, height] of [[1920, 1080], [1366, 768], [1096, 630], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await focus(dealer.id); await caption(dealer.name);
      const result = await page.locator('.featured-caption h1').evaluate(el => {
        const style = getComputedStyle(el), text = el.firstChild;
        const start = text.textContent.indexOf('웹서비스');
        const ys = [...'웹서비스'].map((_, i) => {
          const range = document.createRange(); range.setStart(text, start + i); range.setEnd(text, start + i + 1);
          return range.getBoundingClientRect().y;
        });
        return { wordBreak: style.wordBreak, overflowWrap: style.overflowWrap,
          wordOnOneLine: Math.max(...ys) - Math.min(...ys) < 1,
          pageOverflow: document.documentElement.scrollWidth > innerWidth,
          captionWidth: el.clientWidth, title: el.textContent };
      });
      assert.equal(result.wordBreak, 'keep-all');
      assert(result.wordOnOneLine, '웹서비스 must not break inside the word');
      assert.equal(result.pageOverflow, false);
      wrapping.push({ width, height, ...result });
      await page.screenshot({ path: path.join(out, `nearby-${width}x${height}.png`) });
    }
    pass('Korean words stay intact at five desktop, mobile and landscape sizes');
    fs.writeFileSync(path.join(out, 'wrapping.json'), JSON.stringify(wrapping, null, 2));
    await page.evaluate(() => window.__TRIAD__.goTo('overview'));
    await page.locator('.featured-caption').waitFor({ state: 'detached' });
    pass('Overview hides the proximity caption');
    assert.deepEqual(errors, []);
    pass('No browser runtime errors');
  } catch (error) {
    failure = error;
    console.error(error);
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  } finally {
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ checks, errors, failure: failure?.message || null }, null, 2));
    await browser.close();
  }
  if (failure) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
