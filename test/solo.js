/* 혼자놀기 공통(assets/solo.js) — 짝 맞추기로 검사한다.
   ?solo=1: 레벨 표·둘이하기 UI 숨김·고정 시드·제한 시간·별·저장·잠금 해제·"이 판으로 도전장" 링크
   ?s=&l=: 혼자 판을 둘이하기 첫 판으로 (같은 시드·크기), 링크에 l 이 실리고 받는 쪽도 같은 크기 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));
const icons = w => JSON.parse(w.__ev('JSON.stringify(state.cards.map(c=>c.ic))'));
const clearAll = w => { const ic = icons(w), seen = {}; for (let i = 0; i < ic.length; i++) { if (seen[ic[i]] !== undefined) { w.__ev(`flip(${seen[ic[i]]})`); w.__ev(`flip(${i})`); } else seen[ic[i]] = i; } };

(async () => {
  /* 1. 진입: 레벨 표, Lv1 만 열림, 4×4, 둘이하기 UI 숨김 */
  const w = load('pairs', '?solo=1').window;
  const d = w.document, st = w.__ev('state');
  assert.equal(w.Solo.active, true);
  assert.ok(el(w, 'soloPanel'), '레벨 표');
  const lv = [...d.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(d.querySelectorAll('#grid .cardbtn').length, 16, 'Lv1 은 4×4');
  assert.equal(st.level, 1); assert.equal(st.seed, w.Solo.seedFor('pairs', 1));
  assert.equal(el(w, 'nameIn').classList.contains('hidden'), true); assert.equal(el(w, 'betBox').classList.contains('hidden'), true);
  assert.equal(el(w, 'playTag').textContent, '혼자놀기');
  assert.match(el(w, 'soloHud').textContent, /Lv1/); assert.match(el(w, 'clock').textContent, /^120\.00$/);
  /* 잠긴 레벨은 골라지지 않는다 */
  lv[2].click(); assert.equal(st.level, 1);

  /* 2. 별 계산 */
  const L = w.Solo.levels[0];
  assert.equal(w.Solo.starsFor(L, 25000), 3); assert.equal(w.Solo.starsFor(L, 70000), 2); assert.equal(w.Solo.starsFor(L, 100000), 1); assert.equal(w.Solo.starsFor(L, 130000), 0); assert.equal(w.Solo.starsFor(L, null), 0);

  /* 3. 클리어: 결과 카드·저장·Lv2 해제·도전장 링크. 봉인(afterPlay)은 나오지 않는다 */
  const seedLv1 = st.seed;
  w.__ev('startPlay()'); clearAll(w);
  assert.equal(st.done, true);
  const res = el(w, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /뒤집기 16번/);
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(w, 'soloDuel').getAttribute('href'), '/t/pairs/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(w.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.pairs['1'].stars, 3); assert.equal(saved.pairs['1'].clears, 1); assert.ok(saved.pairs['1'].best > 0);
  assert.equal(d.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  assert.ok(el(w, 'soloNext'), '다음 레벨 버튼');

  /* 4. 다음 레벨: 4×5, 새 시드, 결과 카드 사라짐 */
  el(w, 'soloNext').click();
  assert.equal(st.level, 2); assert.equal(d.querySelectorAll('#grid .cardbtn').length, 20); assert.notEqual(st.seed, seedLv1);
  assert.equal(el(w, 'soloResult'), null);

  /* 5. 실패: 제한 시간 초과 → 별 0, 잠금 유지, 다시 하기 */
  w.__ev('startPlay()');
  w.__ev('failPlay()');
  const fail = el(w, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.equal(JSON.parse(w.localStorage.getItem('gatchi_solo_v1')).pairs['2'].stars, 0);
  assert.equal(d.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  assert.equal(el(w, 'soloNext'), null); assert.ok(el(w, 'soloRetry'));
  /* 진행도 요약 */
  assert.deepEqual(JSON.parse(JSON.stringify(w.Solo.summary('pairs', 5))), { cleared: 1, stars: 3, total: 5, next: 2 });
  w.close();

  /* 6. 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·크기의 둘이하기 첫 판, 링크에 l 이 실린다 */
  const duel = load('pairs', '?s=' + seedLv1 + '&l=1').window;
  const ds = duel.__ev('state');
  assert.equal(duel.Solo.active, false); assert.equal(el(duel, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.equal(duel.document.querySelectorAll('#grid .cardbtn').length, 16);
  assert.equal(el(duel, 'nameIn').classList.contains('hidden'), false, '둘이하기 UI 그대로');
  duel.__ev('startPlay()'); clearAll(duel);
  const link = duel.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  assert.equal(pay.s, seedLv1); assert.equal(pay.l, 1);
  /* 받는 쪽도 4×4 */
  const guest = load('pairs', new URL(link).hash).window;
  assert.equal(guest.document.querySelectorAll('#grid .cardbtn').length, 16); assert.equal(guest.__ev('state.level'), 1);
  assert.deepEqual(icons(guest), icons(duel));
  guest.close(); duel.close();

  /* 7. 보통 둘이하기(프리셋 없음)는 4×5 이고 링크의 l 은 0 */
  const plain = load('pairs', '').window;
  assert.equal(plain.document.querySelectorAll('#grid .cardbtn').length, 20);
  plain.__ev('startPlay()'); clearAll(plain);
  const p2 = JSON.parse(Buffer.from(new URL(plain.Duel.url()).hash.slice(3), 'base64url').toString());
  assert.equal(p2.l, 0); plain.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('혼자놀기 검사 통과 — 레벨 표·잠금·별·저장·실패·다음 레벨·혼자→도전장 프리셋·링크 l·받는 쪽 크기');
})().catch(e => { console.error(e); process.exit(1); });
