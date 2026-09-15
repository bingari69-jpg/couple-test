/* 타임 점프 — 다섯 시대가 넘어지지 않고 깰 수 있는지(저장된 최단 경로 재생), 점프 높이·가시·깃발 되살아남·적 밟기·
   무너지는 발판·움직이는 발판, 둘이하기 시대 고르기와 링크(l·d)·같은 코스·빠른 쪽 승·덜 넘어진 쪽 동점 처리,
   혼자놀기 5단계 잠금·별·제한 시간 실패·도전장 프리셋, 두 손가락 동시 입력 */
const assert = require('node:assert/strict');
const TJ = require('../t/timejump/engine.js');
const { replay, ACTIONS, K } = require('../scripts/timejump-routes.cjs');
const ROUTES = require('./timejump-routes.json');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
/* 페이지에서 경로를 한 칸(6걸음)씩 누른다 */
const playRoute = (w, route) => { for (const code of route) { if (!w.__ev('state.running')) break; for (let i = 0; i < K; i++) w.__ev(`stepN(1,${JSON.stringify(ACTIONS[code])})`); } };

(async () => {
  /* ── 판(코어) ── */
  for (const n of [1, 2, 3, 4, 5]) {
    const L = TJ.level(n), r = ROUTES[n];
    assert.ok(r && r.route, 'Lv' + n + ' 경로 저장됨');
    const s = replay(n, r.route);
    assert.equal(s.done, true, L.era + ' 경로로 우체통 도착'); assert.equal(s.deaths, 0, L.era + ' 넘어짐 없이');
    assert.equal(s.timeMs, r.timeMs, L.era + ' 경로 시간 그대로(물리 결정론)');
    assert.ok(s.timeMs < L.limitMs / 2, L.era + ' 제한 시간 여유');
    assert.ok(L.checks.every(c => c.y < TJ.H && TJ.tileAt(L, Math.floor((c.x + 6) / TJ.T), Math.floor((c.y + TJ.P.h + 1) / TJ.T))), L.era + ' 깃발은 땅 위');
  }
  assert.ok(ROUTES[5].timeMs > ROUTES[1].timeMs, '뒤 시대일수록 코스가 길다');

  {
    /* 가만히 서면 땅(11줄) 위, 점프는 4칸 이상 5칸 미만, 짧게 누르면 낮게 */
    const L = TJ.level(1), s = TJ.create(1);
    for (let i = 0; i < 10; i++) TJ.step(L, s, {});
    assert.equal(s.ground, true); assert.equal(s.y, 11 * TJ.T - TJ.P.h);
    const base = s.y; let top = base;
    TJ.step(L, s, { j: 1 }); for (let i = 0; i < 60; i++) { TJ.step(L, s, { j: 1 }); top = Math.min(top, s.y); }
    assert.ok(base - top > 4 * TJ.T && base - top < 5 * TJ.T, '긴 점프 높이 ' + (base - top));
    for (let i = 0; i < 20; i++) TJ.step(L, s, {});
    let low = s.y; TJ.step(L, s, { j: 1 }); for (let i = 0; i < 3; i++) TJ.step(L, s, { j: 1 }); for (let i = 0; i < 50; i++) { TJ.step(L, s, {}); low = Math.min(low, s.y); }
    assert.ok(base - low < 2.5 * TJ.T, '짧은 점프는 낮게 ' + (base - low));
  }
  {
    /* 가시에 닿으면 넘어짐 → 0.6초 뒤 마지막 깃발에서, 시간은 계속 흐른다 */
    const L = TJ.level(2), s = TJ.create(2);
    let guard = 0; while (!s.deaths && guard++ < 400) TJ.step(L, s, { r: 1 });
    assert.equal(s.deaths, 1, '가시(10칸)에 넘어짐');
    const t = s.ticks; while (s.dead) TJ.step(L, s, {});
    assert.equal(s.ticks - t, 38); assert.equal(s.x, L.checks[0].x); assert.ok(s.invul > 0, '되살아나면 잠깐 무적');
    /* 깃발을 지나면 그 자리에서 되살아난다 */
    const m = TJ.create(2); m.cp = 1; m.x = L.checks[1].x; m.y = 400; TJ.step(L, m, {});
    assert.equal(m.deaths, 1, '구멍 아래로 떨어짐'); while (m.dead) TJ.step(L, m, {});
    assert.equal(m.x, L.checks[1].x); assert.equal(m.y, L.checks[1].y);
  }
  {
    /* 적을 위에서 밟으면 사라지고 튀어 오른다. 옆에서 닿으면 넘어진다 */
    const L = TJ.level(2), e = L.enemies[0];
    const s = TJ.create(2); s.ticks = 1000; const ex = TJ.enemyX(e, 1001);
    s.x = ex + 1; s.y = e.y - TJ.P.h - 2; s.vy = 200;
    TJ.step(L, s, {});
    assert.equal(s.alive[0], 0, '밟은 적 사라짐'); assert.equal(s.stomps, 1); assert.ok(s.vy < 0, '튀어 오름'); assert.equal(s.deaths, 0);
    const side = TJ.create(2); side.ticks = 1000; side.x = TJ.enemyX(e, 1001) - TJ.P.w + 3; side.y = e.y; side.ground = true;
    TJ.step(L, side, {}); assert.equal(side.deaths, 1, '옆에서 닿으면 넘어짐');
  }
  {
    /* 무너지는 발판: 밟으면 흔들리다 떨어지고, 한동안 뒤 돌아온다 */
    const L = TJ.level(4), s = TJ.create(4), k = L.crumbles[3];
    s.x = k.x + 3; s.y = k.y - TJ.P.h - 1; s.vy = 50;
    TJ.step(L, s, {}); assert.equal(s.ground, true); assert.ok(s.crumb[3] > 0, '밟으면 흔들림');
    for (let i = 0; i < 30; i++) TJ.step(L, s, {});
    assert.ok(s.crumb[3] < 0, '떨어짐'); assert.ok(s.deaths === 1 || s.y > k.y, '같이 떨어짐');
    for (let i = 0; i < 200; i++) TJ.step(L, s, {});
    assert.equal(s.crumb[3], 0, '돌아옴');
  }
  {
    /* 움직이는 발판(중세 첫 발판)에 올라서면 같이 옮겨진다 */
    const L = TJ.level(3), m = L.movers[0], s = TJ.create(3);
    const p = TJ.moverPos(m, 0); s.x = p.x + 10; s.y = p.y - TJ.P.h - 1; s.vy = 30;
    for (let i = 0; i < 5 && s.ride !== 0; i++) TJ.step(L, s, {});
    assert.equal(s.ride, 0, '발판 위');
    const x0 = s.x, m0 = TJ.moverPos(m, s.ticks).x; for (let i = 0; i < 40; i++) TJ.step(L, s, {});
    const moved = TJ.moverPos(m, s.ticks).x - m0;
    assert.ok(moved > 20 && Math.abs(s.x - x0 - moved) < 0.01, '발판을 따라 옮겨짐 ' + (s.x - x0) + ' / ' + moved); assert.equal(s.deaths, 0);
  }

  /* ── 둘이하기 ── */
  const w = load('timejump', '').window, d = w.document;
  assert.equal(el(w, 'stage').width, 360); assert.equal(el(w, 'stage').height, 270);
  const eras = [...d.querySelectorAll('#eraList .era-btn')];
  assert.equal(eras.length, 5); assert.equal(eras[0].getAttribute('aria-pressed'), 'true'); assert.equal(el(w, 'eraPick').classList.contains('hidden'), false);
  eras[2].click();
  assert.equal(w.__ev('state.level'), 3); assert.equal(el(w, 'eraName').textContent, '중세');
  assert.equal(d.querySelectorAll('#eraList .era-btn')[2].getAttribute('aria-pressed'), 'true');
  /* 시작 전에는 걸음이 가지 않는다 */
  w.__ev('stepN(10,{r:1})'); assert.equal(w.__ev('state.world.ticks'), 0);
  w.__ev('startPlay()'); w.__ev('clearTimeout(state.tickTimer)');
  playRoute(w, ROUTES[3].route);
  assert.equal(w.__ev('state.done'), true); assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false, '봉인 카드');
  const p = pay(w); assert.equal(p.l, 3); assert.equal(p.d, 0); assert.equal(typeof p.k, 'number'); assert.equal(p.s, undefined, '시드 없음 — 코스는 시대로 정해진다');
  assert.equal(w.unlockNum(p.k, p.x), ROUTES[3].timeMs);

  /* 받는 쪽: 같은 시대, 시대 고르기 숨김. 적·발판이 같은 자리라 같은 입력이면 같은 시간 → 무승부 */
  const g = load('timejump', new URL(w.Duel.url()).hash).window;
  assert.equal(g.__ev('state.level'), 3); assert.equal(el(g, 'eraName').textContent, '중세');
  assert.equal(el(g, 'eraPick').classList.contains('hidden'), true); assert.match(el(g, 'playHead').textContent, /중세, 같은 코스/);
  g.__ev('startPlay()'); g.__ev('clearTimeout(state.tickTimer)');
  playRoute(g, ROUTES[3].route);
  assert.equal(g.__ev('state.done'), true);
  await tick(700);
  assert.equal(el(g, 'verdict').textContent, '완전 똑같아?!');
  assert.match(el(g, 'dA').textContent, /한 번도 안 넘어짐/);
  g.Duel.renderResult({ hist: [['상대', 22000, '', 28400, 'aa', 'bb', 0, 3]], round: ['상대', 22000, '', 28400, 'aa', 'bb', 0, 3], viewer: 'b' });
  assert.equal(el(g, 'verdict').textContent, '상대가 먼저 배달했어'); assert.match(el(g, 'subVerdict').textContent, /6\.40초 빨랐어/); assert.match(el(g, 'dA').textContent, /넘어짐 3번/);
  g.close();

  /* 동점이면 덜 넘어진 쪽 */
  w.Duel.renderResult({ hist: [['상대', 30000, '', 30000, 'aa', 'bb', 2, 1]], round: ['상대', 30000, '', 30000, 'aa', 'bb', 2, 1], viewer: 'b' });
  assert.equal(el(w, 'verdict').textContent, '내가 먼저 배달했어!'); assert.match(el(w, 'subVerdict').textContent, /덜 넘어진 쪽/);
  w.close();

  /* 두 손가락: ▶ 를 누른 채 점프를 눌러도 둘 다 들어가고, 점프만 떼면 달리기는 이어진다 */
  {
    const c = load('timejump', '').window, cd = c.document;
    const btn = k => cd.querySelector(`#pad [data-k="${k}"]`);
    const ptr = (type, target, id) => { const e = new c.Event(type, { bubbles: true, cancelable: true }); e.pointerId = id; e.clientX = 0; e.clientY = 0; target.dispatchEvent(e); };
    ptr('pointerdown', btn('r'), 1); ptr('pointerdown', btn('j'), 2);
    assert.deepEqual({ ...c.__ev('inputNow()') }, { l: false, r: true, j: true });
    assert.equal(btn('r').classList.contains('on'), true); assert.equal(btn('j').classList.contains('on'), true);
    ptr('pointerup', btn('j'), 2);
    assert.deepEqual({ ...c.__ev('inputNow()') }, { l: false, r: true, j: false });
    ptr('pointerup', btn('r'), 1);
    const key = (type, k) => cd.dispatchEvent(new c.KeyboardEvent(type, { key: k, bubbles: true }));
    key('keydown', 'ArrowLeft'); key('keydown', ' ');
    assert.deepEqual({ ...c.__ev('inputNow()') }, { l: true, r: false, j: true });
    key('keyup', 'ArrowLeft'); key('keyup', ' ');
    assert.deepEqual({ ...c.__ev('inputNow()') }, { l: false, r: false, j: false });
    c.close();
  }

  /* ── 혼자놀기 ── */
  const s = load('timejump', '?solo=1').window, sd = s.document;
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.match(lv[0].textContent, /원시/); assert.match(lv[4].textContent, /우주/);
  assert.equal(el(s, 'eraPick').classList.contains('hidden'), true, '혼자놀기에는 시대 고르기 대신 레벨 표');
  assert.match(el(s, 'soloDesc').textContent, /원시시대 · 제한 90초/);
  const LV = s.__ev('LEVELS');
  LV.forEach(l => assert.ok(l.best >= ROUTES[l.n].timeMs * 1.3, 'Lv' + l.n + ' ★★★ 기준은 최단 경로보다 넉넉히'));
  LV.forEach(l => assert.equal(l.limitMs, TJ.level(l.n).limitMs));
  s.__ev('startPlay()'); s.__ev('clearTimeout(state.tickTimer)');
  playRoute(s, ROUTES[1].route);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /넘어짐 0번/);
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/timejump/?s=' + s.Solo.seedFor('timejump', 1) + '&l=1');
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  assert.equal(JSON.parse(s.localStorage.getItem('gatchi_solo_v1')).timejump['1'].best, ROUTES[1].timeMs);
  /* 이집트: 가만히 두면 제한 시간 120초에 실패 */
  el(s, 'soloNext').click();
  assert.equal(s.__ev('state.level'), 2); assert.equal(el(s, 'eraName').textContent, '고대 이집트');
  s.__ev('startPlay()'); s.__ev('clearTimeout(state.tickTimer)');
  s.__ev('stepN(7499,{})'); assert.equal(s.__ev('state.running'), true);
  s.__ev('stepN(1,{})'); assert.equal(s.__ev('state.running'), false);
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.rec').textContent, /시간 안에 못/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  s.close();

  /* 혼자 → 둘이: ?s=&l=4 로 열면 산업시대 둘이하기 첫 판 */
  const du = load('timejump', '?s=' + TJ.LEVELS.length + '&l=4').window;
  assert.equal(du.Solo.active, false); assert.equal(du.__ev('state.level'), 4); assert.equal(el(du, 'eraName').textContent, '산업시대');
  assert.equal(el(du, 'eraPick').classList.contains('hidden'), true);
  du.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('타임 점프 검사 통과 — 다섯 시대 경로 클리어·결정론, 점프 높이·가시·깃발·밟기·무너지는/움직이는 발판, 시대 고르기·봉인(l·d)·같은 코스·빠른 쪽 승·덜 넘어진 쪽 동점, 두 손가락·키보드, 혼자놀기 잠금·별·제한 시간·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
