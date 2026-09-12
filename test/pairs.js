/* 짝 맞추기 — 시드 고정 배치(4×5·10짝), 두 장 뒤집기·짝 판정·불일치 되돌리기, 다 맞추면 자동 봉인(시간·뒤집기 수), 같은 판 복원, 빠른 쪽 승 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

/* jsdom 렐름의 배열은 프로토타입이 달라 deepEqual 이 실패하므로 JSON 으로 건너온다 */
const icons = w => JSON.parse(w.__ev('JSON.stringify(state.cards.map(c=>c.ic))'));
const pairOf = (w, exclude) => {
  const ic = icons(w); const seen = {};
  for (let i = 0; i < ic.length; i++) {
    if (exclude.has(i)) continue;
    if (seen[ic[i]] !== undefined) return [seen[ic[i]], i];
    seen[ic[i]] = i;
  }
  return null;
};
/* 남은 짝을 전부 맞춘다. 마지막 짝에서 finishPlay 가 불린다. */
const clearAll = (w) => { const done = new Set(); let p; while ((p = pairOf(w, done))) { w.__ev(`flip(${p[0]})`); w.__ev(`flip(${p[1]})`); done.add(p[0]); done.add(p[1]); } };

(async () => {
  /* 첫 진입: 4×5 판 20장이 뒤집힌 채, 덮개가 보인다 */
  const w = load('pairs', '').window;
  const st = w.__ev('state');
  assert.equal(w.document.querySelectorAll('#grid .cardbtn').length, 20);
  assert.equal(w.document.querySelectorAll('#grid .cardbtn.up').length, 0);
  assert.equal(el(w, 'cover').classList.contains('hidden'), false);
  assert.equal(el(w, 'count').textContent, '10');

  /* 같은 시드 → 같은 배치, 다른 시드 → 다른 배치 */
  st.seed = 12345; w.__ev('buildBoard()'); const a = icons(w);
  const w2 = load('pairs', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(icons(w2), a, '같은 시드는 같은 카드 배치');
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(icons(w2), a, '다른 시드는 다른 배치');
  w2.close();
  const sorted = a.slice().sort();
  for (let i = 0; i < sorted.length; i += 2) assert.equal(sorted[i], sorted[i + 1], '모든 그림은 정확히 두 장');
  assert.equal(new Set(a).size, 10);

  /* 시작 전에는 뒤집히지 않는다 */
  w.__ev('flip(0)'); assert.equal(st.flips, 0);

  /* 시작: 진행용 배치는 미리보기와 같다 */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(icons(w), a);

  /* 불일치: 두 장이 열렸다가 잠금 뒤 다시 닫힌다 */
  const ic = icons(w);
  const j = ic.findIndex((x, k) => k > 0 && x !== ic[0]);
  w.__ev('flip(0)'); w.__ev(`flip(${j})`);
  assert.equal(st.flips, 2); assert.equal(st.lock, true); assert.equal(st.pairs, 0);
  assert.equal(w.document.querySelectorAll('#grid .cardbtn.up').length, 2);
  w.__ev('flip(2)'); assert.equal(st.flips, 2, '잠금 중에는 더 뒤집히지 않음');
  await tick(650);
  assert.equal(st.lock, false); assert.equal(w.document.querySelectorAll('#grid .cardbtn.up').length, 0);

  /* 일치: 짝이 확정되고 남은 짝이 준다 */
  const done = new Set();
  let p = pairOf(w, done);
  w.__ev(`flip(${p[0]})`); w.__ev(`flip(${p[1]})`);
  assert.equal(st.pairs, 1); assert.equal(st.flips, 4); assert.equal(el(w, 'count').textContent, '9');
  assert.equal(w.document.querySelectorAll('#grid .cardbtn.done').length, 2);
  w.__ev(`flip(${p[0]})`); assert.equal(st.flips, 4, '맞춘 카드는 다시 안 뒤집힘');

  /* 10짝을 다 맞추면 자동으로 봉인된다: 링크에 시드·뒤집기 수, 봉인값 = 걸린 시간
     (jsdom 시계 스텁은 부를 때마다 16ms 가므로, 도전자 쪽은 몇 번 더 불러 일부러 느리게 만든다) */
  w.__ev('performance.now();performance.now();performance.now()');
  clearAll(w);
  assert.equal(st.pairs, 10); assert.equal(st.done, true); assert.equal(st.running, false);
  assert.equal(el(w, 'clock').textContent, '🔒'); assert.equal(el(w, 'count').textContent, '끝');
  const flipsA = st.flips; assert.equal(flipsA, 22);
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  assert.equal(pay.s, 12345); assert.equal(pay.f, flipsA);
  assert.ok(st.ms > 0 && st.ms < 5000, '걸린 시간이 기록됨: ' + st.ms);
  assert.equal(pay.x, (st.ms + pay.k * 7) % 1000003, '봉인값 = 걸린 시간');

  /* 받는 쪽: 같은 시드로 같은 판. 뒤집기 없이 곧장 맞춰 더 빨리(덜 뒤집고) 끝낸다 → 받는 쪽 승 */
  const g = load('pairs', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(icons(g), a);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  clearAll(g);
  assert.equal(gs.done, true); assert.equal(gs.flips, 20);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.ok(gs.ms < st.ms, '받는 쪽이 더 빨라야 함: ' + gs.ms + ' vs ' + st.ms);
  assert.match(el(g, 'verdict').textContent, /내가 더 빨라/);
  assert.match(el(g, 'subVerdict').textContent, /초 빨랐어/);
  assert.match(el(g, 'tA').textContent, /초/); assert.match(el(g, 'dA').textContent, /뒤집기 20번/);
  assert.match(el(g, 'dB').textContent, /뒤집기 22번/);
  g.close(); w.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('짝 맞추기 검사 통과 — 시드 배치(4×5)·짝 판정·불일치 되돌리기·다 맞추면 봉인·같은 판 복원·빠른 쪽 승');
})().catch(e => { console.error(e); process.exit(1); });
