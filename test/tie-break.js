/* 동점 2차 판정 — 점수가 같을 때 두더지(폭탄), UFO(명중률), 색깔(오답), 화살표(함정 통과)로 승부를 가르고,
   2차 기준까지 같으면 무승부. 10초 맞추기 3회·반응속도 5회 형식도 함께 확인한다. */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

async function duel(game, mine, theirs, mineExtra, theirExtra) {
  const maker = load(game, '').window;
  Object.assign(maker.__ev('state'), { seed: 12345 });
  maker.Duel.finish(mine, mineExtra);
  const hash = new URL(maker.Duel.url()).hash;
  const guest = load(game, hash).window;
  guest.Duel.finish(theirs, theirExtra);
  await tick(700);
  return { verdict: el(guest, 'verdict').textContent, sub: el(guest, 'subVerdict').textContent, cls: el(guest, 'verdict').className };
}

(async () => {
  /* 두더지: 같은 점수, 받는 쪽이 폭탄을 덜 밟음 → 받는 쪽 승 */
  let r = await duel('mole', 20, 20, { stat: [17, 1, 2] }, { stat: [18, 1, 1] });
  assert.match(r.verdict, /내가/); assert.match(r.sub, /폭탄을 덜 밟은/); assert.match(r.sub, /1 vs 2/);
  /* 두더지: 점수도 폭탄도 같음 → 무승부 */
  r = await duel('mole', 20, 20, { stat: [17, 1, 1] }, { stat: [17, 1, 1] });
  assert.match(r.verdict, /똑같아/);
  /* UFO: 같은 점수, 명중률 낮은 받는 쪽 패 */
  r = await duel('ufo', 15, 15, { stat: [12, 1, 0, 20] }, { stat: [12, 1, 0, 30] });
  assert.match(r.verdict, /상대가/); assert.match(r.sub, /명중률/);
  /* 색깔 함정: 같은 정답, 오답 적은 받는 쪽 승 */
  r = await duel('stroop', 25, 25, { stat: [25, 6] }, { stat: [25, 2] });
  assert.match(r.verdict, /내가/); assert.match(r.sub, /오답이 적은/);
  /* 화살표: 같은 정답·오답, 함정 통과 많은 받는 쪽 승 */
  r = await duel('arrow', 30, 30, { stat: [30, 3, 5] }, { stat: [30, 3, 8] });
  assert.match(r.verdict, /내가/); assert.match(r.sub, /함정을 더 많이/);

  /* 10초 맞추기: 세 번 멈춰야 봉인되고, 링크에 세 기록이 실린다 */
  const ten = load('ten', '').window;
  const st = ten.__ev('state');
  for (const ms of [9800, 10150, 9950]) { st.running = true; st.t0 = ten.performance.now() - ms; ten.__ev('stopTimer()'); }
  assert.equal(st.tries.length, 3);
  const link = ten.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  /* 테스트 시계는 호출마다 16ms씩 흐르므로 근사값으로 비교 */
  assert.ok(pay.t.every((v, i) => Math.abs(v - [9800, 10150, 9950][i]) < 40), '세 기록이 링크에 실려야 함: ' + pay.t);
  const guest = load('ten', new URL(link).hash).window;
  guest.Duel.finish(120, { tries: [9960, 10040, 9980] });
  await tick(700);
  assert.match(el(guest, 'verdict').textContent, /내가 더 가까워/);
  assert.match(el(guest, 'dA').textContent, /−0\.04 · \+0\.04 · −0\.02/);
  assert.match(el(guest, 'dB').textContent, /−0\.1\d · \+0\.1\d · −0\.0\d/);
  /* 예전 1회 링크(값이 약 10000)는 여전히 읽힌다 */
  const legacyGuest = load('ten', '').window;
  legacyGuest.Duel.renderResult({ hist: [['옛친구', 9840, '나', 10250, 'a', 'b']], round: ['옛친구', 9840, '나', 10250, 'a', 'b'], viewer: 'b' });
  assert.match(el(legacyGuest, 'dB').textContent, /1회 · 차이 0\.16/);

  /* 반응속도: 시드가 링크에 실리고, 부정출발은 0.5초로 기록되며 5회에 끝난다 */
  const react = load('react', '').window;
  const rs = react.__ev('state');
  const link2 = (() => { react.Duel.finish(231, { tries: [200, 240, 500, 210, 220] }); return react.Duel.url(); })();
  const pay2 = JSON.parse(Buffer.from(new URL(link2).hash.slice(3), 'base64url').toString());
  assert.equal(typeof pay2.s, 'number'); assert.equal(pay2.t.length, 5);
  assert.equal(JSON.stringify(react.__ev('delaysOf(123)')), JSON.stringify(react.__ev('delaysOf(123)')), '같은 시드는 같은 대기 시간');
  const rg = load('react', new URL(link2).hash).window;
  assert.equal(rg.__ev('state.seed'), pay2.s, '받는 쪽도 같은 시드');
  rg.__ev('hit()'); // idle → 첫 판 대기
  rg.__ev('hit()'); // 대기 중 누름 → 부정출발 0.500초 기록
  assert.equal(JSON.stringify(rg.__ev('state.tries')), '[500]');
  assert.match(el(rg, 'msg').textContent, /0\.500초로 기록/);

  assert.deepEqual(PAGE_ERRORS, []);
  console.log('동점 2차 판정 검사 통과 — 두더지·UFO·색깔·화살표 타이브레이크, 10초 3회 합산·옛 링크, 반응속도 시드·부정출발 벌점');
})().catch(e => { console.error(e); process.exit(1); });
