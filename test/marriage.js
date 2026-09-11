/* 결혼 전에 맞춰볼 것들 — 링크 속 이름이 HTML로 실행되지 않는지(XSS), 잘못된 링크가 안전하게 첫 화면으로 가는지 검사 */
const assert = require('node:assert/strict');
const { load, PAGE_ERRORS } = require('./dom');

const open = hash => load('marriage', hash).window;
const enc = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
const $ = (w, s) => w.document.querySelector(s);
const visible = (w, id) => $(w, id).classList.contains('on');

(async () => {
  const w0 = open();
  const N = w0.eval('QUESTIONS.length');
  assert.ok(N >= 10, '문항 목록을 읽어야 한다');
  const ansA = Array.from({ length: N }, (_, i) => i % 2);
  const ansB = Array.from({ length: N }, (_, i) => (i % 3 === 0 ? 1 : 0));

  /* 1) 이름 자리에 스크립트를 넣은 결과 링크 → 글자로만 보여야 한다 */
  const evil = '<img src=x onerror="window.__pwned=1">';
  const w = open('#r=' + enc({ q: 2, a: { n: evil, ans: ansA }, b: { n: '하린', ans: ansB } }));
  assert.ok(visible(w, '#s-result'), '결과 화면이 열려야 한다');
  assert.equal(w.__pwned, undefined, '이름 속 스크립트가 실행되면 안 된다');
  assert.equal(w.document.querySelector('#diffList img'), null, '이름이 태그로 해석되면 안 된다');
  assert.ok($(w, '#diffList').textContent.includes('<img'), '이름은 글자 그대로 보여야 한다');
  assert.ok($(w, '#tagA').textContent.includes('<img'));

  /* 2) 초대 링크의 이름도 글자로만 */
  const wi = open('#i=' + enc({ q: 2, n: evil, ans: ansA }));
  assert.ok(visible(wi, '#s-invited'));
  assert.equal(wi.document.querySelector('#invName img'), null);

  /* 3) 모양이 틀린 결과 링크(답 배열이 아님·범위 밖 값·문항 수 불일치)는 첫 화면 */
  for (const bad of [
    { q: 2, a: { n: '가', ans: 'x' }, b: { n: '나', ans: ansB } },
    { q: 2, a: { n: '가', ans: ansA.map(() => 9) }, b: { n: '나', ans: ansB } },
    { q: 2, a: { n: '가', ans: ansA.slice(1) }, b: { n: '나', ans: ansB } },
    { q: 2, a: null, b: { n: '나', ans: ansB } }
  ]) {
    const wb = open('#r=' + enc(bad));
    assert.ok(visible(wb, '#s-intro'), '잘못된 링크는 첫 화면으로');
  }

  /* 4) 정상 링크는 여전히 정상 */
  const ok = open('#r=' + enc({ q: 2, a: { n: '민수', ans: ansA }, b: { n: '하린', ans: ansB } }));
  assert.ok(visible(ok, '#s-result'));
  assert.equal($(ok, '#tagA').textContent, '민수');
  assert.equal($(ok, '#tagB').textContent, '하린');

  assert.deepEqual(PAGE_ERRORS, []);
  console.log('결혼 테스트 검사 통과 — 이름 XSS 차단, 초대 이름 안전, 잘못된 링크 4종 첫 화면, 정상 링크 유지');
})().catch(e => { console.error(e); process.exit(1); });
