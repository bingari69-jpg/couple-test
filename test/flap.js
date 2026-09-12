/* 탭 비행 — 시드 고정 문 순서(틈 크기·높이), 16ms 고정 걸음, 중력·날개짓, 부딪히면 끝나지 않고 되살아남(무적·시간 계속), 20초 뒤 통과 수 봉인(링크에 s·l·c), 같은 코스 복원, 많이 통과한 쪽 승, 덜 부딪힌 쪽 동점 처리, 혼자놀기 레벨·별·프리셋 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const W = 360, H = 486, BX = 90, BR = 14, GATE_W = 52;
const gates = w => JSON.parse(w.__ev('JSON.stringify(state.gates.map(g=>[g.x,g.top,g.gap]))'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
/* 자동 조종 한 걸음: 다음 문 틈의 가운데보다 아래로 처지면 날개짓 */
const auto = w => {
  const st = w.__ev('state');
  const g = st.gates.find(g => g.x - st.worldX + GATE_W >= BX - BR);
  const target = g ? g.top + g.gap / 2 : H * 0.45;
  if (st.y > target + 4 && st.vy > 0) w.__ev('flapNow()');
  w.__ev('step(1)');
};
const autoRun = w => { let guard = 0; while (!w.__ev('state.done') && guard++ < 1400) auto(w); assert.equal(w.__ev('state.done'), true, '20초 끝'); };

(async () => {
  /* 첫 진입: 360×486 캔버스, 문이 미리 몇 개 만들어져 있고, 레벨 0(틈 28~36%), 덮개 */
  const w = load('flap', '').window;
  const st = w.__ev('state'), d = w.document;
  const cv = el(w, 'sky'); assert.equal(cv.width, 360); assert.equal(cv.height, 486);
  assert.ok(st.gates.length >= 4, '문 미리 생성: ' + st.gates.length); assert.equal(st.level, 0);
  assert.equal(el(w, 'gapInfo').textContent, '28~36%');
  assert.equal(el(w, 'cover').classList.contains('hidden'), false);
  assert.equal(st.passed, 0); assert.equal(st.crashes, 0);

  /* 같은 시드 → 같은 문 순서(틈 크기·높이), 다른 시드 → 다른 순서. 틈은 28~36%, 화면 안 */
  st.seed = 12345; w.__ev('buildBoard()'); const a = gates(w);
  const w2 = load('flap', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(gates(w2), a, '같은 시드는 같은 코스');
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(gates(w2), a, '다른 시드는 다른 코스');
  w2.close();
  assert.ok(a.every(g => g[2] >= H * 0.28 - 1 && g[2] <= H * 0.36 + 1), '틈 크기 28~36%');
  assert.ok(a.every(g => g[1] >= H * 0.12 - 1 && g[1] + g[2] <= H * 0.88 + 1), '틈은 화면 안');
  assert.ok(Math.abs(a[1][0] - a[0][0] - W * 0.62) < 1e-6, '문 간격 = 너비의 62%'); assert.equal(a[0][0], W * 1.1);

  /* 시작 전에는 날개짓도 걸음도 안 된다 */
  assert.equal(w.__ev('flapNow()'), false); w.__ev('step(5)'); assert.equal(st.ticks, 0);

  /* 시작: 걸음마다 16ms. 중력으로 떨어지고, 날개짓은 위로 튄다(vy=-430) */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(gates(w), a);
  const y0 = st.y; w.__ev('step(1)'); assert.equal(st.ticks, 1); assert.ok(st.y > y0, '중력으로 떨어짐'); assert.ok(st.vy > 0);
  assert.equal(w.__ev('flapNow()'), true); assert.equal(st.vy, -430);
  w.__ev('step(3)'); assert.equal(st.ticks, 4); assert.ok(st.y < y0 + 5, '날개짓 뒤 올라감');

  /* 부딪힘은 끝이 아니다: 가만두면 바닥에 닿아 부딪힘 1, 병아리는 가운데 높이로, 0.9초 무적, 시간은 계속 */
  let guard = 0; while (st.crashes === 0 && guard++ < 200) w.__ev('step(1)');
  assert.equal(st.crashes, 1); assert.equal(st.running, true); assert.equal(st.done, false);
  assert.ok(Math.abs(st.y - H * 0.45) < 1e-9, '가운데 높이로 되돌림'); assert.equal(st.vy, 0);
  assert.equal(st.invulUntil, st.ticks * 16 + 900); assert.equal(st.flashUntil, st.ticks * 16 + 200);
  assert.equal(el(w, 'crashInfo').textContent, '1');
  const crashTick = st.ticks;
  w.__ev('step(10)'); assert.equal(st.ticks, crashTick + 10, '부딪힌 뒤에도 걸음은 계속');

  /* 그대로 20초까지: 부딪힘만 쌓이고 통과 0. 1250걸음에 끝나 봉인. 링크에 시드·레벨·부딪힘 수 */
  w.__ev('step(2000)');
  assert.equal(st.done, true); assert.equal(st.running, false); assert.equal(st.ticks, 1250);
  assert.equal(st.passed, 0); assert.ok(st.crashes > 10, '계속 떨어져 여러 번 부딪힘: ' + st.crashes);
  assert.equal(st.ms, 0, '기록 = 통과한 문 수');
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  const tBefore = st.ticks; w.__ev('step(3)'); assert.equal(st.ticks, tBefore, '끝난 뒤에는 안 움직임');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.c, st.crashes);
  assert.equal(p.x, (0 + p.k * 7) % 1000003, '봉인값 = 통과한 수');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);
  const hostCrashes = st.crashes;

  /* 천장은 부딪힘이 아니다: 계속 날개짓하면 천장에 붙어 막힐 뿐 */
  const c = load('flap', '').window; const cs = c.__ev('state');
  c.__ev('startPlay()'); c.__ev('flapNow()'); c.__ev('step(1)'); c.__ev('flapNow()'); c.__ev('step(1)');
  for (let i = 0; i < 30; i++) { c.__ev('flapNow()'); c.__ev('step(1)'); }
  assert.equal(cs.y, BR, '천장에 막힘'); assert.equal(cs.crashes, 0); assert.equal(cs.running, true);
  c.close();

  /* 자동 조종으로 20초: 통과가 쌓이고 연속 기록도 쌓인다. 통과 판정 = 문의 오른쪽이 병아리 왼쪽을 지난 순간 */
  const t = load('flap', '').window; const ts = t.__ev('state');
  t.__ev('state.seed=12345; buildBoard()'); t.__ev('startPlay()');
  autoRun(t);
  assert.ok(ts.passed >= 12, '20초 동안 12개 이상 통과: ' + ts.passed); assert.equal(ts.bestStreak >= 1, true);
  assert.equal(el(t, 'score').textContent, '🔒'); assert.equal(el(t, 'streakInfo').textContent, String(ts.bestStreak));
  assert.match(el(t, 'cdSub').textContent, /^기록 봉인$/);
  const passedFull = ts.passed, crashesFull = ts.crashes;
  t.close();

  /* 받는 쪽: 같은 시드로 같은 코스. 자동 조종으로 더 많이 통과 → 받는 쪽 승 */
  const g = load('flap', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(gates(g), a);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()'); autoRun(g);
  assert.equal(gs.ms, passedFull); assert.equal(gs.crashes, crashesFull, '같은 조종이면 같은 결과(결정론)');
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 통과했어/);
  assert.match(el(g, 'subVerdict').textContent, new RegExp(passedFull + '개 vs 0개 — 내가 ' + passedFull + '개 더 통과했어'));
  assert.match(el(g, 'tA').textContent, new RegExp('^' + passedFull + '개')); assert.match(el(g, 'tB').textContent, /^0개/);
  assert.match(el(g, 'dB').textContent, new RegExp('부딪힘 ' + hostCrashes + '번'));
  assert.match(el(g, 'dA').textContent, crashesFull ? /부딪힘 \d+번/ : /한 번도 안 부딪힘/);
  g.close();

  /* 동점: 통과 수가 같으면 덜 부딪힌 쪽이 이긴다 (결과 화면을 직접 그려 확인: 나 5개·2번 vs 상대 5개·6번) */
  const r = load('flap', '').window;
  r.Duel.renderResult({ hist: [['상대', 5, '', 5, 'aa', 'bb', 6, 2]], round: ['상대', 5, '', 5, 'aa', 'bb', 6, 2], viewer: 'b' });
  assert.match(el(r, 'verdict').textContent, /내가 더 통과했어/);
  assert.match(el(r, 'subVerdict').textContent, /덜 부딪힌 쪽이 이겨. \(2번 vs 6번\)/);
  r.Duel.renderResult({ hist: [['상대', 5, '', 5, 'aa', 'bb', 1, 2]], round: ['상대', 5, '', 5, 'aa', 'bb', 1, 2], viewer: 'b' });
  assert.match(el(r, 'verdict').textContent, /상대가 더 통과했어/);
  r.Duel.renderResult({ hist: [['상대', 5, '', 5, 'aa', 'bb', 2, 2]], round: ['상대', 5, '', 5, 'aa', 'bb', 2, 2], viewer: 'b' });
  assert.match(el(r, 'verdict').textContent, /완전 똑같아/);
  r.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 고정 시드, 틈 30~36%, 둘이하기 UI 숨김 */
  const s = load('flap', '?solo=1').window;
  const sd = s.document, ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('flap', 1));
  assert.deepEqual(JSON.parse(JSON.stringify(s.__ev('gapRange(1)'))), [0.30, 0.36]); assert.deepEqual(JSON.parse(JSON.stringify(s.__ev('gapRange(5)'))), [0.20, 0.26]);
  assert.equal(el(s, 'gapInfo').textContent, '30~36%');
  assert.equal(s.__ev('speedMul(1)'), 1); assert.equal(s.__ev('speedMul(5)'), 1.24);
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  assert.match(el(s, 'soloDesc').textContent, /클리어 4개/); assert.match(el(s, 'soloDesc').textContent, /★★★ 8개/);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 8), 3); assert.equal(s.Solo.starsFor(L, 6), 2); assert.equal(s.Solo.starsFor(L, 4), 1); assert.equal(s.Solo.starsFor(L, 3), 0);
  const seedLv1 = ss.seed;

  /* 클리어: 자동 조종 20초 → 8개 이상이면 ★★★, 저장, Lv2 해제, 도전장 링크. 봉인 카드는 없음 */
  s.__ev('startPlay()'); autoRun(s);
  assert.ok(ss.passed >= 8, 'Lv1 자동 조종 8개 이상: ' + ss.passed);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, new RegExp(ss.passed + '개')); assert.match(res.querySelector('.rec').textContent, /부딪힘 \d+번 · 최장 연속 \d+/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/flap/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.flap['1'].stars, 3); assert.equal(saved.flap['1'].best, ss.passed); assert.equal(saved.flap['1'].clears, 1);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 새 시드·틈 27~33%, 결과 카드 사라짐. 가만두면(통과 0) 별 0 — 부딪혀도 판은 20초까지 간다 */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  assert.equal(el(s, 'gapInfo').textContent, '27~33%');
  s.__ev('startPlay()'); s.__ev('step(600)'); assert.equal(ss.done, false); assert.ok(ss.crashes > 3); s.__ev('step(700)');
  assert.equal(ss.done, true); assert.equal(ss.ticks, 1250);
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, /0개/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판, 링크에 l 이 실리고 받는 쪽도 같은 레벨·코스 */
  const du = load('flap', '?s=' + seedLv1 + '&l=1').window;
  const ds = du.__ev('state');
  assert.equal(du.Solo.active, false); assert.equal(el(du, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.equal(el(du, 'gapInfo').textContent, '30~36%');
  const course = gates(du);
  du.__ev('startPlay()'); du.__ev('step(1250)');
  const dp = pay(du); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('flap', new URL(du.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(gates(guest), course); assert.equal(el(guest, 'gapInfo').textContent, '30~36%');
  guest.close(); du.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('탭 비행 검사 통과 — 시드 문 순서·16ms 걸음·중력/날개짓·부딪히면 되살아남(무적·시간 계속)·천장 막힘·20초 뒤 통과 수 봉인(s·l·c)·같은 코스 복원·많이 통과한 쪽 승·덜 부딪힌 쪽 동점 처리·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
