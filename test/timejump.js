/* 타임 점프 — 다섯 시대가 넘어지지 않고 깰 수 있는지(저장된 최단·사냥 경로 재생), 점프 높이·3단 점프·가시·깃발 되살아남·
   동물 13종(기어·날기·튀기) 밟기 점수·옆에서 닿으면 넘어짐·점수 = 밟기 + 시간 보너스, 무너지는/움직이는 발판,
   둘이하기 시대 고르기와 링크(g·t·d·l)·같은 코스·점수 높은 쪽 승·같으면 빠른 쪽·예전 시간 대결 링크 차단,
   이야기 장면, 혼자놀기 5단계 잠금·별·제한 시간 실패·도전장 프리셋, 두 손가락 동시 입력 */
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
    assert.equal(s.timeMs, r.timeMs, L.era + ' 경로 시간 그대로(물리 결정론)'); assert.equal(TJ.scoreOf(L, s), r.score, L.era + ' 경로 점수 그대로');
    assert.ok(r.hunt && r.hunt.route, L.era + ' 사냥 경로 저장됨');
    const h = replay(n, r.hunt.route);
    assert.equal(h.done, true); assert.equal(h.deaths, 0); assert.equal(h.points, r.hunt.points); assert.equal(TJ.scoreOf(L, h), r.hunt.score);
    assert.ok(h.points >= L.maxPoints * 0.8, L.era + ' 동물 대부분을 밟고도 깰 수 있다 ' + h.points + '/' + L.maxPoints);
    assert.equal(TJ.scoreOf(L, s), s.points + Math.round((L.limitMs - s.timeMs) / 100), '점수 = 밟기 + 남은 0.1초당 1점');
    assert.ok(L.enemies.length >= 5, L.era + ' 동물 5마리 이상');
    assert.ok(new Set(L.enemies.map(e => e.kind)).size >= (n === 4 ? 1 : 2), L.era + ' 움직임 종류 섞기');
    assert.ok(s.timeMs < L.limitMs / 2, L.era + ' 제한 시간 여유');
    assert.ok(L.checks.every(c => c.y < TJ.H && TJ.tileAt(L, Math.floor((c.x + 6) / TJ.T), Math.floor((c.y + TJ.P.h + 1) / TJ.T))), L.era + ' 깃발은 땅 위');
  }
  assert.ok(ROUTES[5].timeMs > ROUTES[1].timeMs, '뒤 시대일수록 코스가 길다');
  assert.deepEqual(Object.values(TJ.SPECIES).map(x => x.pts).filter(p => ![100, 150, 200].includes(p)), [], '점수는 100·150·200');
  {
    /* 날아다니는 동물은 위아래로, 튀어 오르는 동물은 땅에서 솟았다 내려온다 */
    const bat = TJ.level(3).enemies.find(e => e.kind === 'fly'), ys = [0, 30, 60, 90].map(t => TJ.enemyPos(bat, t).y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 20, '박쥐 위아래 ' + ys);
    const cobra = TJ.level(2).enemies.find(e => e.kind === 'hop');
    assert.equal(TJ.enemyPos(cobra, 0).y, cobra.yBase); assert.ok(TJ.enemyPos(cobra, Math.round(cobra.period / 2 / 16)).y < cobra.yBase - cobra.amp * 0.9, '코브라 튀어 오름');
    assert.equal(TJ.scoreOf(TJ.level(1), TJ.create(1)), 0, '못 도착하면 시간 보너스 없음');
  }

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
    /* 3단 점프: 공중에서 두 번 더 뛰고, 네 번째는 안 된다. 땅에 닿으면 다시 채워진다. 화면 위는 천장 */
    const L = TJ.level(1);
    const peak = presses => {
      const s = TJ.create(1); for (let i = 0; i < 10; i++) TJ.step(L, s, {});
      const base = s.y; let top = base, air = [];
      for (let i = 0; i < 160; i++) { const hold = [0, 22, 44, 66].slice(0, presses).some(p => i >= p && i < p + 20); TJ.step(L, s, { j: hold }); top = Math.min(top, s.y); if (i === 70) air.push(s.airJumps); }
      return { h: (base - top) / TJ.T, s, air };
    };
    const one = peak(1), two = peak(2), three = peak(3), four = peak(4);
    assert.ok(two.h > one.h * 1.8, '2단 점프는 두 배 가까이 ' + two.h.toFixed(2));
    assert.ok(three.h > two.h + 1.5, '3단 점프는 더 높이 ' + three.h.toFixed(2));
    assert.equal(four.h, three.h, '네 번째 누름은 무시');
    assert.equal(three.air[0], 0, '공중 점프 두 번 다 씀');
    assert.equal(three.s.ground, true); assert.equal(three.s.airJumps, TJ.AIR_JUMPS, '착지하면 다시 두 번');
    assert.equal(three.h, (11 * TJ.T - TJ.P.h) / TJ.T, '천장(화면 맨 위)에서 멈춤');
    /* 발판 끝에서 걸어 떨어진 뒤 누르면 첫 점프 + 공중 두 번 */
    const e = TJ.create(1); e.x = 20 * TJ.T - 2; e.y = 11 * TJ.T - TJ.P.h; e.ground = true; e.coyote = 6;
    TJ.step(L, e, { r: 1 }); for (let i = 0; i < 3; i++) TJ.step(L, e, { r: 1 });
    TJ.step(L, e, { r: 1, j: 1 }); assert.equal(e.airJumps, TJ.AIR_JUMPS, '늦은 점프는 땅 점프로 친다');
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
    const L = TJ.level(2), e = L.enemies[0], p = TJ.enemyPos(e, 1001);
    const s = TJ.create(2); s.ticks = 1000;
    s.x = p.x + 3; s.y = p.y - TJ.P.h + 1; s.vy = 200;
    TJ.step(L, s, {});
    assert.equal(s.alive[0], 0, '밟은 동물 사라짐'); assert.equal(s.stomps, 1); assert.equal(s.points, TJ.SPECIES[e.species].pts, '전갈 100점'); assert.ok(s.vy < 0, '튀어 오름'); assert.equal(s.deaths, 0);
    assert.equal(s.airJumps, TJ.AIR_JUMPS, '밟으면 공중 점프 다시 채움');
    const side = TJ.create(2); side.ticks = 1000; side.x = p.x - TJ.P.w + 5; side.y = e.yBase + e.h - TJ.P.h; side.ground = true;
    TJ.step(L, side, {}); assert.equal(side.deaths, 1, '옆에서 닿으면 넘어짐'); assert.equal(side.points, 0);
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
  const p = pay(w); assert.equal(p.g, 2); assert.equal(p.l, 3); assert.equal(p.d, 0); assert.equal(p.t, ROUTES[3].timeMs); assert.equal(typeof p.k, 'number'); assert.equal(p.s, undefined, '시드 없음 — 코스는 시대로 정해진다');
  assert.equal(w.unlockNum(p.k, p.x), ROUTES[3].score, '봉인 값 = 점수');
  assert.equal(el(w, 'scoreNow').textContent, '🔒');

  /* 받는 쪽: 같은 시대, 시대 고르기 숨김. 적·발판이 같은 자리라 같은 입력이면 같은 시간 → 무승부 */
  const g = load('timejump', new URL(w.Duel.url()).hash).window;
  assert.equal(g.__ev('state.level'), 3); assert.equal(el(g, 'eraName').textContent, '중세');
  assert.equal(el(g, 'eraPick').classList.contains('hidden'), true); assert.match(el(g, 'playHead').textContent, /중세, 같은 코스/);
  g.__ev('startPlay()'); g.__ev('clearTimeout(state.tickTimer)');
  playRoute(g, ROUTES[3].route);
  assert.equal(g.__ev('state.done'), true);
  await tick(700);
  assert.equal(el(g, 'verdict').textContent, '완전 똑같아?!');
  assert.match(el(g, 'tA').textContent, new RegExp(ROUTES[3].score.toLocaleString('ko-KR') + '점')); assert.match(el(g, 'dA').textContent, /22\.27초 도착/);
  g.Duel.renderResult({ hist: [['상대', 1480, '', 1320, 'aa', 'bb', 30000, 25000]], round: ['상대', 1480, '', 1320, 'aa', 'bb', 30000, 25000], viewer: 'b' });
  assert.equal(el(g, 'verdict').textContent, '상대 점수가 더 높아'); assert.match(el(g, 'subVerdict').textContent, /160점 더 받았어/);
  await tick(30); g.close();   // 초대 진입의 analytics 감시가 닫힌 창에서 돌지 않게

  /* 점수가 같으면 더 빨리 도착한 쪽 */
  w.Duel.renderResult({ hist: [['상대', 1500, '', 1500, 'aa', 'bb', 31000, 29000]], round: ['상대', 1500, '', 1500, 'aa', 'bb', 31000, 29000], viewer: 'b' });
  assert.equal(el(w, 'verdict').textContent, '내 점수가 더 높아!'); assert.match(el(w, 'subVerdict').textContent, /더 빨리 도착한 쪽/);
  w.close();

  /* 예전 시간 대결 링크(g 없음)는 점수와 섞지 않고 새 판으로 연다 */
  {
    const old = { v: 1, n: '민수', i: 'abc123', k: 7, x: 22272 + 49, d: 0, l: 3, h: [] };
    const o = load('timejump', '#c=' + Buffer.from(JSON.stringify(old)).toString('base64url')).window;
    await tick(400);
    assert.equal(o.location.hash, ''); assert.equal(el(o, 'lockedCard').classList.contains('hidden'), true, '봉인 카드 없이 새 판');
    assert.match(el(o, 'toast').textContent, /예전 규칙/); assert.equal(el(o, 'eraPick').classList.contains('hidden'), false);
    o.close();
  }

  /* 이야기: 처음 시작을 누르면 시대 이야기 → 출발하면 카운트다운. 다음부터는 바로 카운트다운 */
  {
    const t = load('timejump', '').window;
    el(t, 'bigBtn').click();
    assert.equal(el(t, 'story').classList.contains('hidden'), false, '이야기 장면');
    assert.equal(el(t, 'storyEra').textContent, '원시시대'); assert.equal(t.document.querySelectorAll('#storyLines .story-line').length, 3);
    assert.match(el(t, 'storyLines').textContent, /뱀/); assert.equal(el(t, 'bigBtn').disabled, false, '이야기 중엔 아직 시작 전');
    el(t, 'storyGo').click();
    assert.equal(el(t, 'story').classList.contains('hidden'), true); assert.equal(el(t, 'bigBtn').disabled, true, '카운트다운 시작');
    assert.deepEqual(JSON.parse(t.localStorage.getItem('gatchi_timejump_story_v1')), [1]);
    t.__ev('resetView()'); el(t, 'bigBtn').click();
    assert.equal(el(t, 'story').classList.contains('hidden'), true, '본 이야기는 건너뜀'); assert.equal(el(t, 'bigBtn').disabled, true);
    t.__ev('resetView()'); t.document.querySelectorAll('#eraList .era-btn')[4].click(); el(t, 'storyAgain').click();
    assert.equal(el(t, 'storyEra').textContent, '미래 우주'); assert.match(el(t, 'storyLines').textContent, /외계 괴물/);
    el(t, 'storySkip').click(); assert.equal(el(t, 'bigBtn').disabled, true, '건너뛰기도 바로 출발');
    t.__ev('clearTimeout(state.cdTimer)'); t.close();
  }

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
  assert.match(el(s, 'soloDesc').textContent, /원시시대 · 제한 90초 · 동물 6마리 · 클리어 우체통 도착 · ★★★ 1,100점/);
  const LV = s.__ev('LEVELS');
  LV.forEach(l => {
    const L = TJ.level(l.n), r = ROUTES[l.n];
    const expect = Math.round((Math.max(0, Math.round((L.limitMs - r.timeMs * 1.4) / 100)) + L.maxPoints * 0.5) / 50) * 50;
    assert.equal(l.best, expect, 'Lv' + l.n + ' ★★★ = 최단 시간 1.4배 도착 + 동물 점수 절반');
    assert.ok(l.best < r.hunt.score, 'Lv' + l.n + ' ★★★ 은 사냥 경로로 닿는다');
    assert.equal(l.limitMs, L.limitMs); assert.equal(l.goal, 0);
  });
  s.__ev('startPlay()'); s.__ev('clearTimeout(state.tickTimer)');
  playRoute(s, ROUTES[1].hunt.route);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /동물 6마리 \+850 · 시간 보너스 \+751 · 넘어짐 0번/);
  assert.equal(el(s, 'scoreNow').textContent, ROUTES[1].hunt.score.toLocaleString('ko-KR')); assert.equal(el(s, 'stompInfo').textContent, '6');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/timejump/?s=' + s.Solo.seedFor('timejump', 1) + '&l=1');
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  assert.equal(JSON.parse(s.localStorage.getItem('gatchi_solo_v1')).timejump['1'].best, ROUTES[1].hunt.score);
  assert.match(el(s, 'cdSub').textContent, /첫 번째 우체통/);
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
  console.log('타임 점프 검사 통과 — 다섯 시대 최단·사냥 경로 클리어·결정론, 3단 점프, 동물 13종 밟기 점수·시간 보너스, 가시·깃발·발판, 시대 고르기·봉인(g·t·d·l)·점수 승부·빠른 쪽 동점·예전 링크 차단, 이야기 장면, 두 손가락·키보드, 혼자놀기 잠금·별·제한 시간·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
