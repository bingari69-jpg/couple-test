/* 배달 텔레파시 — 결과 링크(#r=)를 받은 주인 화면에서 이어갈 길이 있는지.
   예전에는 주인 화면의 버튼 하나가 끝내 hidden 이라 "다른 놀이 보기" 외에 할 게 없었다. */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const shown = (w, id) => !el(w, id).classList.contains('hidden');

(async () => {
  /* 주인(답을 골랐던 사람)이 결과 링크를 연다 */
  const payload = { v: 1, of: "나경", by: "상우", score: 6, miss: [[1, 0], [4, 2]] };
  const w = load('delivery', '#r=' + b64(payload)).window;
  const d = w.document;

  assert.equal(shown(w, 's-result'), true, '결과 화면이 보여야 함');
  assert.equal(el(w, 'scoreNum').textContent, '6');
  assert.equal(shown(w, 'ownerActions'), true, '주인 행동 묶음이 보여야 함');
  assert.equal(shown(w, 'guesserActions'), false, '주인에게 맞힌 사람 버튼은 안 보임');

  /* 이어갈 길 두 개가 실제로 눌릴 수 있어야 한다 */
  const ask = el(w, 'askBack'), again = el(w, 'againBtn');
  assert.equal(ask.classList.contains('hidden'), false, '"네가 답해" 버튼이 보여야 함');
  assert.equal(again.classList.contains('hidden'), false, '"한 판 더" 버튼이 보여야 함');
  assert.equal(typeof w.__ev('$("askBack").onclick'), 'function', '"네가 답해"에 동작이 붙어야 함');
  assert.equal(typeof w.__ev('$("againBtn").onclick'), 'function', '"한 판 더"에 동작이 붙어야 함');

  /* 한 판 더: 답 고르기 화면으로 가고, 주소의 결과 해시는 지워지고, 고른 답은 비워진다 */
  again.click();
  assert.equal(shown(w, 's-answer'), true, '한 판 더 → 답 고르기 화면');
  assert.equal(shown(w, 's-result'), false);
  assert.equal(w.location.hash, '', '결과 해시는 지워져야 함');
  assert.deepEqual(JSON.parse(w.__ev('JSON.stringify(state.ans)')), [], '답은 새로 고른다');
  assert.equal(w.__ev('state.qi'), 0);
  assert.equal(w.__ev('state.prev'), null, '방향이 같은 한 판 더라 이전 점수를 잇지 않는다');

  assert.deepEqual(PAGE_ERRORS, [], '페이지 오류: ' + PAGE_ERRORS.join(' / '));
  w.close();
  console.log('배달 텔레파시 주인 화면 검사 통과 — 결과 받은 쪽에 "네가 답해"·"한 판 더" 두 길, 해시 정리·답 초기화');
})();
