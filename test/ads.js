/* 자체 광고 배너 — 관리자 미리보기 설정으로 홈 목록 중간·게임 결과 아래·추천 영역 위 세 자리에 붙는지,
   링크가 새 탭·sponsored 로 열리는지, 홈 목록이 다시 그려져도 광고가 남는지 확인한다.
   (실제 장애: app-config 가 app-config-ready 를 쏜 뒤에 리스너를 달아 홈 목록 광고가 지워진 채 남았다) */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
const errors = [];
const LINK = 'https://www.instagram.com/p/DcS0B2hBcS6/';

function config(games) {
  const ad = (id, placement) => ({ id, name: '제닉스 리브체어', placement, enabled: true, type: 'own', imageUrl: '/assets/ads/xenics-livechair.png', linkUrl: LINK, alt: '제닉스 리브체어 라벤더 특가', excludedGames: ['letter', 'tarot'], networkClient: '', networkSlot: '' });
  return {
    schemaVersion: 1,
    site: { name: '같이놀자', headingFont: 'jua', bodyFont: 'pretendard', fontScale: '1', primaryColor: '#f66b59', secondaryColor: '#8972bb', backgroundColor: '#fffbf5', menu: [{ id: 'home', label: '홈', href: './', enabled: true }] },
    games,
    ads: { enabled: true, slots: [ad('ad-home', 'home_catalog'), ad('ad-result', 'result_bottom'), ad('ad-reco', 'recommendation_top')] }
  };
}
function load(relative, suffix, cfg) {
  const file = path.join(root, relative), base = path.dirname(file);
  const inline = p => '<script>' + fs.readFileSync(p, 'utf8').replace(/<\/script/g, '<\\/script') + '</script>';
  const html = fs.readFileSync(file, 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (all, src) => {
    if (/^https?:/.test(src)) return '';
    /* 게임 페이지는 analytics.js 가 app-config.js 를 동적으로 읽는다. 여기서는 analytics 대신 app-config 를 바로 넣는다. */
    if (src.includes('analytics')) return relative === 'index.html' ? '' : inline(path.join(root, 'assets/app-config.js'));
    return inline(path.resolve(base, src.split('?')[0]));
  }).replace(/<link rel="stylesheet"[^>]*>/g, '');
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(relative + ': ' + e.message));
  const payload = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return new JSDOM(html.replace('<head>', `<head><script>localStorage.setItem('gatchi_admin_preview',${JSON.stringify(payload)});window.fetch=()=>Promise.reject(new Error('offline'));</script>`), {
    url: 'https://noljago.co.kr/' + relative.replace(/index\.html$/, '') + suffix, runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) { w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} }); }
  });
}
const tick = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* 홈: 로컬 목록으로 게임 설정을 만든 뒤 미리보기로 연다 */
  const probe = load('index.html', '', config([]));
  await tick(50);
  const games = (probe.window.HOME_ITEMS || []).map((it, i) => ({ slug: it.path.replace(/^t\//, '').replace(/\/$/, ''), path: it.path, title: it.title, summary: '', category: '게임', relationships: ['친구'], visibility: 'listed', featured: false, sortOrder: i + 1, adsMode: 'inherit', thumbnailUrl: '' }));
  assert.ok(games.length >= 28, '홈 게임 목록 ' + games.length);
  probe.window.close();

  const home = load('index.html', '?admin_preview=1', config(games));
  await tick(100);
  const list = home.window.document.getElementById('catalogList');
  const ads = [...list.querySelectorAll('.managed-ad')];
  assert.equal(ads.length, 1, '홈 목록 중간 광고는 하나');
  assert.equal([...list.children].indexOf(ads[0]), 3, '세 번째 카드 다음에 놓여야 함');
  const a = ads[0].querySelector('a'); const img = ads[0].querySelector('img');
  assert.equal(a.href, LINK); assert.equal(a.target, '_blank'); assert.match(a.rel, /noopener/); assert.match(a.rel, /sponsored/);
  assert.equal(img.getAttribute('src'), '/assets/ads/xenics-livechair.png'); assert.equal(img.alt, '제닉스 리브체어 라벤더 특가');
  assert.ok(fs.existsSync(path.join(root, 'assets/ads/xenics-livechair.png')), '배너 이미지 파일');
  /* 목록이 다시 그려져도 광고가 남는다 */
  home.window.dispatchEvent(new home.window.CustomEvent('home-catalog-updated'));
  await tick(20);
  assert.equal(list.querySelectorAll('.managed-ad').length, 1, '다시 그린 뒤에도 광고 하나');
  home.window.close();

  /* 게임 결과 화면: 결과 아래 + 추천 영역 위 */
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden.json'), 'utf8'));
  const hash = new URL(golden.pairs.result_url).hash;
  const game = load('t/pairs/index.html', '?admin_preview=1' + hash, config(games));
  await tick(100);
  const d = game.window.document;
  assert.equal(d.getElementById('s-result').classList.contains('hidden'), false, '결과 화면');
  const placed = [...d.querySelectorAll('.managed-ad')].map(el => el.dataset.placement).sort();
  assert.deepEqual(placed, ['recommendation_top', 'result_bottom']);
  const reco = d.querySelector('.managed-ad[data-placement="recommendation_top"]');
  assert.ok(reco.nextElementSibling && reco.nextElementSibling.classList.contains('next'), '추천 영역 바로 위');
  assert.equal(d.querySelector('.managed-ad[data-placement="result_bottom"] a').href, LINK);
  game.window.close();

  /* 광고 제외 게임(letter·tarot)에는 붙지 않는다 */
  const tarot = load('t/tarot/index.html', '?admin_preview=1', config(games));
  await tick(100);
  assert.equal(tarot.window.document.querySelectorAll('.managed-ad').length, 0, '타로에는 광고 없음');
  tarot.window.close();

  assert.deepEqual(errors, [], '페이지 스크립트 예외');
  console.log('광고 배너 검사 통과 — 홈 목록 중간(재렌더 유지)·결과 아래·추천 위, 새 탭 sponsored 링크, 제외 게임');
})().catch(e => { console.error(e); process.exit(1); });
