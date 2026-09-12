/* 1에서 25까지 — 혼자놀기(assets/solo.js) 검사.
   ?solo=1: 레벨 표·Lv1 만 열림·4×4·둘이하기 UI 숨김·제한 시간·별·저장·잠금 해제·실패
   ?s=&l=: 혼자 판을 둘이하기 첫 판으로 (같은 시드·크기), 링크에 l 이 실리고 받는 쪽도 같은 판 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const cellsOf = w => JSON.parse(w.__ev('JSON.stringify(state.cells)'));
const cellCount = w => w.document.querySelectorAll('#grid .cell').length;
/* 1 부터 끝까지 순서대로 누른다 (wrong 번만큼 먼저 오답을 낸다) */
const solveAll = (w, wrong = 0) => {
  const btns = [...w.document.querySelectorAll('#grid .cell')];
  const by = v => btns.find(b => +b.dataset.v === v);
  for (let i = 0; i < wrong; i++) w.__ev(`tapCell(document.querySelector('#grid .cell[data-v="${btns.length}"]'))`);
  for (let v = 1; v <= btns.length; v++) w.__ev(`tapCell(document.querySelector('#grid .cell[data-v="${v}"]'))`);
  return by;
};

(async () => {
  /* 1. 진입: 레벨 표, Lv1 만 열림, 4×4, 둘이하기 UI 숨김, 시계는 제한 시간 */
  const w = load('num25', '?solo=1').window;
  const d = w.document, st = w.__ev('state');
  assert.equal(w.Solo.active, true);
  assert.ok(el(w, 'soloPanel'), '레벨 표');
  const lv = [...d.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(cellCount(w), 16, 'Lv1 은 4×4');
  assert.equal(el(w, 'grid').style.gridTemplateColumns, 'repeat(4,1fr)');
  assert.equal(st.level, 1); assert.equal(st.seed, w.Solo.seedFor('num25', 1));
  assert.deepEqual([...cellsOf(w)].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1), '1~16 이 한 번씩');
  assert.equal(el(w, 'nameIn').classList.contains('hidden'), true);
  assert.equal(el(w, 'playTag').textContent, '혼자놀기');
  assert.match(el(w, 'soloHud').textContent, /Lv1/); assert.equal(el(w, 'clock').textContent, '60.00');
  lv[2].click(); assert.equal(st.level, 1, '잠긴 레벨은 안 골라진다');

  /* 2. 별 계산 (낮을수록 좋음) */
  const L = w.Solo.levels[0];
  assert.equal(w.Solo.starsFor(L, 12000), 3); assert.equal(w.Solo.starsFor(L, 30000), 2); assert.equal(w.Solo.starsFor(L, 50000), 1); assert.equal(w.Solo.starsFor(L, 60001), 0); assert.equal(w.Solo.starsFor(L, null), 0);
  const L5 = w.Solo.levels[4]; assert.equal(L5.limitMs, 45000); assert.equal(L5.goal, 45000); assert.equal(L5.best, 32000);

  /* 3. 클리어(오답 2번 → 벌점 1초 포함): 결과 카드·저장·Lv2 해제·도전장 링크. 봉인(afterPlay)은 나오지 않는다 */
  const seedLv1 = st.seed;
  w.__ev('startPlay()'); solveAll(w, 2);
  assert.equal(st.done, true); assert.equal(st.pen, 2);
  const res = el(w, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /벌점 2번/);
  const saved = JSON.parse(w.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.num25['1'].stars, 3); assert.equal(saved.num25['1'].clears, 1);
  assert.ok(saved.num25['1'].best >= 1000, '기록에 벌점 0.5초×2 가 더해진다: ' + saved.num25['1'].best);
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(w, 'soloDuel').getAttribute('href'), '/t/num25/?s=' + seedLv1 + '&l=1');
  assert.equal(d.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  assert.ok(el(w, 'soloNext'), '다음 레벨 버튼');

  /* 4. 다음 레벨: 5×5, 새 시드, 결과 카드 사라짐 */
  el(w, 'soloNext').click();
  assert.equal(st.level, 2); assert.equal(cellCount(w), 25); assert.notEqual(st.seed, seedLv1);
  assert.equal(el(w, 'grid').style.gridTemplateColumns, 'repeat(5,1fr)');
  assert.equal(el(w, 'soloResult'), null);

  /* 5. 실패: 제한 시간 초과 → 별 0, 잠금 유지, 다시 하기 */
  w.__ev('startPlay()'); w.__ev('failPlay()');
  const fail = el(w, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.equal(JSON.parse(w.localStorage.getItem('gatchi_solo_v1')).num25['2'].stars, 0);
  assert.equal(d.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  assert.equal(el(w, 'soloNext'), null); assert.ok(el(w, 'soloRetry'));
  assert.deepEqual(JSON.parse(JSON.stringify(w.Solo.summary('num25', 5))), { cleared: 1, stars: 3, total: 5, next: 2 });
  /* 시간 초과는 tick 이 스스로 부른다: rAF 를 잡아 두고 제한을 아주 짧게 한 뒤 한 번 돌린다 (시계 스텁은 부를 때마다 16ms) */
  el(w, 'soloRetry').click(); assert.equal(el(w, 'soloResult'), null);
  w.__ev('window.requestAnimationFrame=function(f){ window.__tick=f; return 1; }');
  w.__ev('Solo.level.limitMs=1; startPlay(); Solo.level.limitMs=60000;');
  assert.equal(st.running, true); assert.equal(el(w, 'soloResult'), null);
  w.__ev('__tick()');
  assert.equal(st.running, false); assert.equal(st.done, true);
  assert.equal(el(w, 'soloResult').querySelector('.stars').textContent, '☆☆☆', 'tick 이 제한 시간을 넘기면 failPlay');
  assert.equal(el(w, 'cd').textContent, '⏰');
  assert.equal(JSON.parse(w.localStorage.getItem('gatchi_solo_v1')).num25['2'].plays, 2);
  w.close();

  /* 6. 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·크기의 둘이하기 첫 판, 링크에 l 이 실린다 */
  const duel = load('num25', '?s=' + seedLv1 + '&l=1').window;
  const ds = duel.__ev('state');
  assert.equal(duel.Solo.active, false); assert.equal(el(duel, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.equal(cellCount(duel), 16);
  assert.equal(el(duel, 'nameIn').classList.contains('hidden'), false, '둘이하기 UI 그대로');
  const lv1Cells = cellsOf(duel);
  duel.__ev('startPlay()'); solveAll(duel);
  assert.equal(el(duel, 'afterPlay').classList.contains('hidden'), false, '둘이하기는 봉인 카드');
  const link = duel.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  assert.equal(pay.s, seedLv1); assert.equal(pay.l, 1); assert.equal(pay.p, 0);
  /* 받는 쪽도 4×4, 같은 배치 */
  const guest = load('num25', new URL(link).hash).window;
  assert.equal(cellCount(guest), 16); assert.equal(guest.__ev('state.level'), 1);
  assert.deepEqual(cellsOf(guest), lv1Cells);
  guest.close(); duel.close();

  /* 7. 보통 둘이하기(프리셋 없음)는 5×5 이고 링크의 l 은 0; 재도전도 5×5 */
  const plain = load('num25', '').window;
  assert.equal(cellCount(plain), 25);
  plain.__ev('startPlay()'); solveAll(plain, 1);
  const p2 = JSON.parse(Buffer.from(new URL(plain.Duel.url()).hash.slice(3), 'base64url').toString());
  assert.equal(p2.l, 0); assert.equal(p2.p, 1); plain.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('1에서 25까지 혼자놀기 검사 통과 — 레벨 표·잠금·별·벌점 포함 기록·저장·실패·다음 레벨·혼자→도전장 프리셋·링크 l·받는 쪽 크기');
})().catch(e => { console.error(e); process.exit(1); });
