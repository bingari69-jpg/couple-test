// 타임 점프 화면 확인용: 실제 페이지를 Edge 로 열고, 저장된 최단 경로를 따라가며 시대마다 몇 장면을 캡처한다.
// `node scripts/timejump-preview.cjs` → output/timejump/lv{n}-{k}.png (390px 모바일 전체 화면은 page.png)
const fs = require('fs'), path = require('path');
const runtime = process.env.PLAYWRIGHT_PATH || 'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { chromium } = require(runtime);
const routes = require('../test/timejump-routes.json');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'output/timejump');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.goto('file://' + path.join(root, 't/timejump/index.html').replace(/\\/g, '/'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, 'page.png'), fullPage: true });
    const fractions = (process.env.AT || '0.08,0.45,0.8').split(',').map(Number);
    for (const n of [1, 2, 3, 4, 5]) {
      const route = routes[n].route;
      for (let k = 0; k < fractions.length; k++) {
        await page.evaluate(([n, route, frac]) => {
          state.level = n; startPlay(); clearTimeout(state.tickTimer);
          const A = { R: { r: 1 }, r: { r: 1, j: 1 }, '.': {}, L: { l: 1 }, l: { l: 1, j: 1 }, j: { j: 1 } };
          const stop = Math.floor(route.length * frac);
          for (let i = 0; i < stop; i++) for (let t = 0; t < 6; t++) stepN(1, A[route[i]]);
          render();
        }, [n, route, fractions[k]]);
        await page.locator('#stage').screenshot({ path: path.join(out, `lv${n}-${k}.png`) });
      }
    }
    if (errors.length) { console.error(errors); process.exitCode = 1; }
    console.log('Saved previews to ' + out);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
