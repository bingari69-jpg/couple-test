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

/* 광고 자리 하나가 여러 노출 위치(placements)를 갖는다. 옛 형식(placement 하나)도 같이 검사한다. */
function config(games, slots) {
  const ad = (id, placements) => ({ id, name: '제닉스 리브체어', placement: placements[0], placements, enabled: true, type: 'own', imageUrl: '/assets/ads/xenics-livechair.png', linkUrl: LINK, alt: '제닉스 리브체어 라벤더 특가', excludedGames: ['letter', 'tarot'], networkClient: '', networkSlot: '' });
  return {
    schemaVersion: 1,
    site: { name: '같이놀자', headingFont: 'jua', bodyFont: 'pretendard', fontScale: '1', primaryColor: '#f66b59', secondaryColor: '#8972bb', backgroundColor: '#fffbf5', menu: [{ id: 'home', label: '홈', href: './', enabled: true }] },
    games,
    ads: { enabled: true, slots: slots || [ad('ad-all', ['home_catalog', 'result_bottom', 'recommendation_top', 'challenge_open', 'letter_bottom', 'letter_compose'])] }
  };
}
const legacySlot = (id, placement) => ({ id, name: '옛 자리', placement, enabled: true, type: 'own', imageUrl: '', linkUrl: LINK, alt: '옛 형식', excludedGames: [], networkClient: '', networkSlot: '' });
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
    beforeParse(w) { w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} }); w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; }
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

  /* 도전장 받은 화면: #c= 링크로 열면 시작 버튼 아래(다른 놀이 보기 링크 위)에 붙고, 새 판 화면에는 없다 */
  const chash = new URL(golden.pairs.link_challenge.url).hash;
  const open = load('t/pairs/index.html', '?admin_preview=1' + chash, config(games));
  await tick(100);
  const od = open.window.document;
  assert.equal(od.getElementById('lockedCard').classList.contains('hidden'), false, '도전장 화면');
  const cad = od.querySelectorAll('.managed-ad[data-placement="challenge_open"]');
  assert.equal(cad.length, 1, '도전장 화면 광고 하나');
  assert.equal(cad[0].parentElement.id, 's-play');
  assert.ok(cad[0].nextElementSibling && cad[0].nextElementSibling.classList.contains('homelink'), '다른 놀이 보기 바로 위');
  assert.equal(od.querySelectorAll('.managed-ad[data-placement="result_bottom"]').length, 1, '결과 자리는 결과 화면 안에 미리 준비됨');
  open.window.close();
  const fresh = load('t/pairs/index.html', '?admin_preview=1', config(games));
  await tick(100);
  assert.equal(fresh.window.document.querySelectorAll('.managed-ad[data-placement="challenge_open"]').length, 0, '새 판 화면에는 도전장 광고 없음');
  fresh.window.close();

  /* 편지 읽기 화면: 편지는 광고 제외 게임이지만 편지 전용 자리(letter_bottom)는 붙는다 */
  const lhash = '#l=' + Buffer.from(JSON.stringify({ w: '보고 싶어', tpl: 'winter', font: 'serif', size: 20, n: '지민', f: '민수' })).toString('base64url');
  const letter = load('t/letter/index.html', '?admin_preview=1' + lhash, config(games));
  await tick(150);
  const ld = letter.window.document;
  const lad = ld.querySelectorAll('.managed-ad[data-placement="letter_bottom"]');
  assert.equal(lad.length, 1, '편지 읽기 자리 광고 하나');
  /* 쓰기 자리 광고는 숨겨진 #compose 안에 미리 붙어 있어 읽기 화면에서는 보이지 않는다 */
  assert.equal(ld.querySelectorAll('.managed-ad').length, 2); assert.equal(ld.getElementById('compose').hidden, true);
  assert.equal(lad[0].parentElement.id, 'reader'); assert.equal(ld.getElementById('reader').lastElementChild, lad[0], '읽기 화면 맨 아래');
  letter.window.close();
  /* 편지 쓰기 화면 맨 아래: 읽기 링크 없이 열면 #compose 안에 붙고(작성 중에만 보임), 읽기 자리는 붙지 않는다 */
  const compose = load('t/letter/index.html', '?admin_preview=1', config(games, [Object.assign(legacySlot('w', 'letter_compose'), { placements: ['letter_compose'] })]));
  await tick(150);
  const cd = compose.window.document;
  const wad = cd.querySelectorAll('.managed-ad');
  assert.equal(wad.length, 1, '쓰기 화면 광고 하나'); assert.equal(wad[0].dataset.placement, 'letter_compose');
  assert.equal(wad[0].parentElement.id, 'compose'); assert.equal(cd.getElementById('compose').lastElementChild, wad[0], '쓰기 화면 맨 아래');
  cd.getElementById('viewTemplate').click(); cd.getElementById('useTemplate').click();
  assert.equal(cd.getElementById('compose').hidden, false, '편지지 고르면 쓰기 화면'); assert.equal(cd.getElementById('reader').querySelectorAll('.managed-ad').length, 0);
  compose.window.close();

  /* 옛 형식(placement 하나)도 그대로 읽힌다 */
  const legacy = load('t/pairs/index.html', '?admin_preview=1' + hash, config(games, [legacySlot('old-1', 'result_bottom')]));
  await tick(100);
  const lg = legacy.window.document.querySelectorAll('.managed-ad');
  assert.equal(lg.length, 1); assert.equal(lg[0].dataset.placement, 'result_bottom'); assert.equal(lg[0].querySelector('strong').textContent, '옛 형식');
  legacy.window.close();

  assert.deepEqual(errors, [], '페이지 스크립트 예외');
  console.log('광고 배너 검사 통과 — 홈 목록 중간(재렌더 유지)·결과 아래·추천 위, 새 탭 sponsored 링크, 제외 게임');
})().catch(e => { console.error(e); process.exit(1); });
