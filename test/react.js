/* 반응속도 대결 — 다섯 가지 신호(두더지·진동·빛·숫자·좌우), 부정출발 벌점, 좌우 오답, 5회 봉인, 결과 경주·상위 % */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const w = load('react', '').window;
  const st = w.__ev('state');
  const go = (ms) => { w.__ev('clearTimeout(state.timer);clearInterval(state.numTimer)'); st.phase = 'go'; st.t0 = w.performance.now() - ms; };

  /* 시작 → 1번 신호(두더지) 대기 */
  w.__ev('hit()');
  assert.equal(st.phase, 'wait'); assert.equal(st.sig, 'pop');
  assert.ok(el(w, 'clock').className.includes('pop-mode'));
  assert.equal(w.document.querySelectorAll('#signals span').length, 5);
  assert.ok(w.document.querySelectorAll('#signals span')[0].classList.contains('now'));

  /* 대기 중 누름 → 0.500초 */
  w.__ev('hit()');
  assert.equal(JSON.stringify(st.tries), '[500]');
  assert.match(el(w, 'msg').textContent, /0\.500초로 기록/);

  /* 2번 신호(진동): 신호 뒤 230ms에 누름 */
  w.__ev('hit()'); assert.equal(st.sig, 'buzz'); go(230); w.__ev('hit()');
  assert.equal(st.tries.length, 2); assert.ok(Math.abs(st.tries[1] - 230) < 40, '두 번째 기록 ' + st.tries[1]);

  /* 3번 신호(빛) */
  w.__ev('hit()'); assert.equal(st.sig, 'glow'); go(300); w.__ev('hit()'); assert.equal(st.tries.length, 3);

  /* 4번 신호(숫자): 대기 중엔 3이 아닌 숫자가 돌고, 신호가 오면 3 */
  w.__ev('hit()'); assert.equal(st.sig, 'number');
  await tick(400); assert.notEqual(el(w, 'num').textContent, '3');
  go(210); el(w, 'num').textContent = '3'; w.__ev('hit()'); assert.equal(st.tries.length, 4);

  /* 5번 신호(좌우): 화면 아무 데나 누르면 안내만, 반대쪽은 0.500초 */
  w.__ev('hit()'); assert.equal(st.sig, 'side'); assert.equal(el(w, 'pads').hidden, false);
  go(190); w.__ev('hit()');
  assert.equal(st.tries.length, 4, '패드가 아닌 곳은 기록되지 않음'); assert.match(el(w, 'msg').textContent, /켜진 쪽 버튼/);
  const wrong = st.want === 'L' ? 'R' : 'L';
  w.__ev(`hit("${wrong}")`);
  assert.equal(JSON.stringify(st.tries.slice(-1)), '[500]');
  assert.match(el(w, 'msg').textContent, /5번 끝/);

  /* 봉인: 링크에 5개 기록과 시드 */
  w.__ev('hit()');
  assert.equal(st.phase, 'done');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  assert.equal(pay.t.length, 5); assert.equal(typeof pay.s, 'number');

  /* 받는 쪽: 같은 시드, 결과에 경주와 상위 % */
  const g = load('react', new URL(link).hash).window;
  assert.equal(g.__ev('state.seed'), pay.s);
  assert.equal(JSON.stringify(g.__ev('planOf(state.seed)')), JSON.stringify(w.__ev('planOf(state.seed)')), '가짜 동작·켜지는 쪽도 같은 판');
  g.Duel.finish(205, { tries: [180, 220, 200, 210, 215] });
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.equal(el(g, 'race').classList.contains('hidden'), false);
  assert.equal(g.document.querySelectorAll('#race .runner').length, 2);
  assert.match(el(g, 'dA').textContent, /상위 \d+%/);
  assert.match(el(g, 'dA').textContent, /5회 평균/);
  assert.match(el(g, 'verdict').textContent, /내가 더 빨라/);

  assert.deepEqual(PAGE_ERRORS, []);
  console.log('반응속도 검사 통과 — 다섯 신호 순서, 부정출발 0.5초, 숫자·좌우 규칙, 5회 봉인·시드, 결과 경주·상위 %');
})().catch(e => { console.error(e); process.exit(1); });
