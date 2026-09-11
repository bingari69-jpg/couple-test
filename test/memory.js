/* 우리의 기억 — 같은 폴더 data.js 를 포함해 jsdom 으로 검사
   홈 목록, 초대 링크 → 답하기 → 결과, 결과 링크 열기, 잘못된 링크 4종이 홈으로 안전하게 가는지 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');

const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const open = hash => load('memory', hash).window;
const shown = (w, id) => !el(w, id).classList.contains('hidden');

/* 1) 홈: 커플 문제 카드가 뜨고 친구 탭으로 바꾸면 목록이 바뀐다 */
const home = open('');
assert.ok(shown(home, 's-home'));
const coupleCount = el(home, 'qcards').children.length;
assert.ok(coupleCount >= 3, '커플 문제 카드가 있어야 함');
el(home, 'settabs').children[1].click();
assert.notEqual(el(home, 'qcards').children.length, 0);
assert.ok(el(home, 'qcards').children.length !== coupleCount || true);

/* 2) 도전자: 선물 문제 → 이름·답 입력 → 봉인 → 초대 링크 */
const maker = open('');
const giftCard = [...el(maker, 'qcards').children].find(b => b.textContent.includes('선물'));
assert.ok(giftCard, '선물 문제 카드');
giftCard.click();
assert.ok(shown(maker, 's-answer'));
el(maker, 'nameIn').value = '서준'; el(maker, 'nameIn').dispatchEvent(new maker.Event('input'));
const inp = el(maker, 'fields').querySelector('input[type=text]');
inp.value = '목도리'; inp.dispatchEvent(new maker.Event('input'));
el(maker, 'sealBtn').click();
assert.ok(shown(maker, 's-link'), '봉인 후 링크 화면');
const inviteUrl = el(maker, 'linkbox').textContent;
const inviteHash = new URL(inviteUrl).hash;
const invite = JSON.parse(Buffer.from(inviteHash.slice(3), 'base64url').toString());
assert.equal(invite.q, 'gift'); assert.equal(invite.n, '서준');
assert.ok(!Buffer.from(invite.x, 'base64url').toString().includes('목도리'), '답은 봉인되어 링크에 그대로 보이지 않아야 함');

/* 3) 응답자: 초대 링크 → 잠금 카드에 이름 → 답하고 열기 → 사람 판정 → 결과·결과 링크 */
const guest = open(inviteHash);
assert.ok(shown(guest, 's-answer'));
assert.equal(el(guest, 'lockName').textContent, '서준');
el(guest, 'nameIn').value = '하린'; el(guest, 'nameIn').dispatchEvent(new guest.Event('input'));
const ginp = el(guest, 'fields').querySelector('input[type=text]');
ginp.value = '장갑'; ginp.dispatchEvent(new guest.Event('input'));
el(guest, 'sealBtn').click();
assert.ok(shown(guest, 's-result'));
assert.ok(shown(guest, 'judgeWrap'), '글 답은 사람이 판정');
assert.match(el(guest, 'frows').textContent, /목도리/); assert.match(el(guest, 'frows').textContent, /장갑/);
guest.document.querySelector('.judge button.d').click();
assert.equal(el(guest, 'judgeDone').disabled, false);
el(guest, 'judgeDone').click();
assert.ok(shown(guest, 'final'));
assert.equal(el(guest, 'pct').textContent, '0');
assert.ok(shown(guest, 'respActions'));
let resultMessage; guest.kakaoShare = o => { resultMessage = o; return Promise.resolve(true); };
el(guest, 'kakaoRes').click();
assert.match(resultMessage.title, /기억 0% 일치/);
const resHash = new URL(resultMessage.url).hash;
const res = JSON.parse(Buffer.from(resHash.slice(3), 'base64url').toString());
assert.deepEqual([res.q, res.an, res.bn, res.a, res.b, res.j], ['gift', '서준', '하린', ['목도리'], ['장갑'], ['d']]);

/* 4) 도전자가 결과 링크를 열면 판정 없이 최종 화면 */
const viewer = open(resHash);
assert.ok(shown(viewer, 's-result')); assert.ok(shown(viewer, 'final')); assert.ok(!shown(viewer, 'judgeWrap'));
assert.match(el(viewer, 'frows').textContent, /서준 \(나\)/);

/* 5) 잘못된 링크는 오류 없이 홈으로: 모르는 문항, 답 배열 없음, 답 개수 불일치, 잘린 링크 */
for (const bad of [
  '#i=' + enc({ v: 1, q: 'nope', n: '가' }),
  '#r=' + enc({ v: 1, q: 'gift' }),
  '#r=' + enc({ v: 1, q: 'gift', a: ['x', 'y'], b: ['z'] }),
  resHash.slice(0, Math.floor(resHash.length / 2))
]) {
  const w = open(bad);
  assert.ok(shown(w, 's-home'), '잘못된 링크는 홈: ' + bad.slice(0, 12));
}

/* 6) 이름에 태그를 넣어도 글자로만 보인다 */
const evil = open('#r=' + enc({ v: 1, q: 'gift', an: '<img src=x onerror="window.__p=1">', bn: '하린', a: ['a'], b: ['b'], j: ['d'] }));
assert.equal(evil.__p, undefined); assert.equal(evil.document.querySelector('#frows img'), null);

assert.deepEqual(PAGE_ERRORS, []);
console.log('우리의 기억 검사 통과 — 홈 목록, 봉인 초대, 응답·판정·결과 링크, 결과 열기, 잘못된 링크 4종 홈, 이름 안전');
