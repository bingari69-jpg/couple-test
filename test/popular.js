/* 인기 순위 — 서버가 매일 계산한 1~5위를 홈 목록 맨 앞에 순서대로 세우고 "인기 N위"를 붙인다.
   순위가 없으면(기록이 기준에 못 미치면) 평소 순서 그대로여야 한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
const errors = [];

/* 홈을 띄우되 game_catalog 응답만 우리가 준다 */
function loadHome(catalogRows) {
  const file = path.join(root, 'index.html'), base = root;
  const html = fs.readFileSync(file, 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (all, src) => {
    if (/^https?:/.test(src) || src.includes('analytics')) return '';
    return '<script>' + fs.readFileSync(path.resolve(base, src.split('?')[0]), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>';
  });
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(html, {
    url: 'https://noljago.co.kr/', runScripts: 'dangerously', virtualConsole: vc,
    beforeParse(w) {
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: true });
      w.fetch = (url) => {
        const hit = String(url).includes('game_catalog') ? catalogRows : [];
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(hit) });
      };
    }
  });
  return dom.window;
}

const cards = w => [...w.document.getElementById('catalogList').children];
const titles = w => cards(w).map(a => a.querySelector('h3').textContent);
const ranks = w => cards(w).map(a => { const r = a.querySelector('.catalog-rank'); return r ? r.textContent : null; });
const tick = () => new Promise(r => setTimeout(r, 30));

/* 서버 목록 한 벌. popular_rank 만 갈아 끼우며 쓴다 */
const rowsFor = rankBySlug => ['ten', 'tap', 'num25', 'pairs', 'mole', 'rps', 'nonsense', 'crash'].map((slug, i) => ({
  slug, path: 't/' + slug + '/', title: slug, content_type: 'game', category: '대결',
  relationships: ['친구'], sort_order: i + 1, summary: slug + ' 설명',
  popular_rank: rankBySlug[slug] || null
}));

(async () => {
  /* 순위가 없으면 서버가 준 sort_order 그대로 */
  const plain = loadHome(rowsFor({}));
  await tick();
  const plainOrder = titles(plain);
  assert.deepEqual(plainOrder.slice(0, 4), ['ten', 'tap', 'num25', 'pairs'], '순위가 없으면 평소 순서');
  assert.deepEqual(ranks(plain).filter(Boolean), [], '순위 표시도 없다');
  plain.close();

  /* 1~5위가 앞으로, 순위대로. 나머지는 원래 순서를 지킨다 */
  const ranked = loadHome(rowsFor({ mole: 1, pairs: 2, nonsense: 3, ten: 4, rps: 5 }));
  await tick();
  const order = titles(ranked);
  assert.deepEqual(order.slice(0, 5), ['mole', 'pairs', 'nonsense', 'ten', 'rps'], '1~5위가 순서대로 맨 앞');
  assert.deepEqual(order.slice(5, 8), ['tap', 'num25', 'crash'], '나머지는 원래 순서 그대로');
  assert.deepEqual(ranks(ranked).slice(0, 5), ['인기 1위', '인기 2위', '인기 3위', '인기 4위', '인기 5위']);
  assert.deepEqual(ranks(ranked).slice(5).filter(Boolean), [], '6위부터는 표시 없음');

  /* 혼자놀기 탭에서는 붙이지 않는다 — 인기 순위는 둘이놀기 기준이다 */
  const soloTab = [...ranked.document.querySelectorAll('button,a')].find(b => /혼자놀기/.test(b.textContent) && b.tagName === 'BUTTON');
  assert.ok(soloTab, '혼자놀기 탭 버튼');
  if (soloTab) { soloTab.click(); await tick(); assert.deepEqual(ranks(ranked).filter(Boolean), [], '혼자놀기 탭에는 순위 없음'); }
  ranked.close();

  const manual=loadHome(rowsFor({mole:1,ten:2}));await tick();
  const managed={site:{catalogOrder:'manual'},games:[{slug:'ten',title:'열 초',sortOrder:1,featured:false},{slug:'mole',title:'두더지',sortOrder:2,featured:true}]};
  manual.APP_PUBLISHED_CONFIG=managed;manual.dispatchEvent(new manual.CustomEvent('app-config-ready',{detail:managed}));await tick();
  assert.deepEqual(titles(manual).slice(0,2),['두더지','열 초'],'관리자 지정 모드에서 추천 우선 후 지정 순서');
  managed.games[1].featured=false;manual.dispatchEvent(new manual.CustomEvent('app-config-ready',{detail:managed}));await tick();
  assert.deepEqual(titles(manual).slice(0,2),['열 초','두더지'],'추천 해제 시 인기 순위보다 지정 순서 우선');manual.close();

  /* 잘못된 값은 무시한다 */
  const bad = loadHome(rowsFor({ mole: 0, pairs: 9, ten: -1 }));
  await tick();
  assert.deepEqual(ranks(bad).filter(Boolean), [], '1~5 밖의 값은 순위로 보지 않는다');
  bad.close();

  assert.deepEqual(errors, [], '페이지 오류: ' + errors.join(' / '));
  console.log('인기 순위 검사 통과 — 1~5위 맨 앞 정렬·"인기 N위" 표시·나머지 순서 유지·혼자놀기 제외·잘못된 값 무시');
})().catch(e => { console.error(e); process.exit(1); });
