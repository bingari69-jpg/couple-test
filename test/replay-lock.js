/* 이미 푼 도전장 잠금 — 받는 쪽이 같은 링크를 다시 열어도 다시 플레이할 수 없고 저장된 결과만 본다.
   duel-engine(10초 맞추기)과 가위바위보(자체 구현) 둘 다 검사한다. */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* duel-engine: 도전자가 링크를 만들고 받는 쪽이 한 번 푼다 */
  const maker = load('ten', '').window;
  maker.Duel.finish(9900);
  const link = maker.Duel.url();
  assert.match(link, /#c=/);
  const hash = new URL(link).hash;

  const guest = load('ten', hash).window;
  assert.equal(el(guest, 's-play').classList.contains('hidden'), false, '첫 방문은 플레이 화면');
  guest.Duel.finish(10250);
  await tick(700);
  assert.equal(el(guest, 's-result').classList.contains('hidden'), false, '풀면 결과 화면');
  const stored = Object.keys(guest.localStorage).filter(k => k.startsWith('gh_played:'));
  assert.equal(stored.length, 1, '푼 도전장이 저장돼야 함');

  /* 같은 창에서 같은 링크를 다시 연 상황(새로고침) → 플레이 없이 결과 */
  guest.Duel.start();
  assert.equal(el(guest, 's-result').classList.contains('hidden'), false, '다시 열면 바로 결과');
  assert.equal(el(guest, 's-play').classList.contains('hidden'), true, '플레이 화면은 열리지 않음');
  await tick(400);
  assert.match(el(guest, 'toast').textContent, /이미 푼 도전장/);
  assert.match(el(guest, 'tA').textContent + el(guest, 'tB').textContent, /10\.25|9\.90/);

  /* 다른 링크(다른 봉인값)는 여전히 플레이할 수 있다 */
  const maker2 = load('ten', '').window; maker2.Duel.finish(9500);
  const guest2 = load('ten', new URL(maker2.Duel.url()).hash).window;
  assert.equal(el(guest2, 's-play').classList.contains('hidden'), false);

  /* 가위바위보: 받는 쪽이 한 번 내면, 다시 열어도 패를 다시 고를 수 없다 */
  const rpsMaker = load('rps', '').window;
  el(rpsMaker, 'makeHands').children[2].click(); el(rpsMaker, 'makeBtn').click();
  const rpsLink = rpsMaker.__ev('madeUrl');
  assert.match(rpsLink, /#c=/);
  const rGuest = load('rps', new URL(rpsLink).hash).window;
  rGuest.setTimeout = fn => { fn(); return 0; };
  el(rGuest, 'openHands').children[0].click();
  assert.equal(el(rGuest, 's-result').classList.contains('hidden'), false, '가위바위보 첫 응답은 결과');
  assert.equal(Object.keys(rGuest.localStorage).filter(k => k.startsWith('gh_played:')).length, 1, '가위바위보도 저장');
  const firstVerdict = el(rGuest, 'verdict').textContent;
  /* 같은 창에서 다시 열기(새로고침) → 다른 패를 눌러도 저장된 결과 그대로 */
  rGuest.__ev('openChallenge(state.incoming)');
  assert.equal(el(rGuest, 's-result').classList.contains('hidden'), false, '다시 열면 바로 결과');
  assert.equal(el(rGuest, 'verdict').textContent, firstVerdict, '결과가 바뀌지 않아야 함');
  assert.match(el(rGuest, 'toast').textContent, /이미 낸 도전장/);

  assert.deepEqual(PAGE_ERRORS, []);
  console.log('재플레이 잠금 검사 통과 — 푼 도전장 저장, 다시 열면 결과만, 다른 링크는 플레이 가능, 가위바위보 포함');
})().catch(e => { console.error(e); process.exit(1); });
