/* 순서 기억 — 시드 고정 순서, 보여주기→따라 누르기, 틀리면 끝, 라운드 수 봉인(링크에 s·l·t), 같은 순서 복원, 많이 간 쪽 승, 혼자놀기 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const seq = w => JSON.parse(w.__ev('JSON.stringify(state.seq)'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
/* 보여주기를 건너뛰고 현재 라운드를 정확히 따라 누른다 */
const playRound = w => { w.__ev('beginInput()'); const s = seq(w), n = w.__ev('state.round') + 1; for (let i = 0; i < n; i++) w.__ev(`tap(${s[i]})`); };

(async () => {
  /* 첫 진입: 패드 4개, 덮개, 순서 60개 */
  const w = load('simon', '').window;
  const st = w.__ev('state');
  assert.equal(w.document.querySelectorAll('#pads .pad').length, 4);
  assert.equal(el(w, 'cover').classList.contains('hidden'), false);
  assert.equal(st.seq.length, 60); assert.equal(st.level, 0);

  /* 같은 시드 → 같은 순서, 다른 시드 → 다른 순서. 값은 0..3, 같은 패드 3연속 없음 */
  st.seed = 12345; w.__ev('buildSeq()'); const a = seq(w);
  const w2 = load('simon', '').window; w2.__ev('state.seed=12345; buildSeq()');
  assert.deepEqual(seq(w2), a, '같은 시드는 같은 순서');
  w2.__ev('state.seed=54321; buildSeq()');
  assert.notDeepEqual(seq(w2), a, '다른 시드는 다른 순서');
  w2.close();
  assert.ok(a.every(p => p >= 0 && p < 4));
  for (let i = 2; i < a.length; i++) assert.ok(!(a[i] === a[i - 1] && a[i] === a[i - 2]), '3연속 없음');

  /* 시작 전·보여주는 중에는 눌러도 반응 없음 */
  w.__ev('tap(0)'); assert.equal(st.pos, 0);
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.equal(st.phase, 'show'); assert.deepEqual(seq(w), a);
  w.__ev(`tap(${a[0]})`); assert.equal(st.pos, 0, '보여주는 중에는 입력 안 됨');
  assert.equal(el(w, 'round').textContent, '1');

  /* 1라운드 보여주기: 400ms 뒤 첫 불빛(한 박자 615ms 의 60% = 369ms), 쉬고 입력 단계로 */
  assert.equal(w.__ev('onMs(0,1)'), 369); assert.equal(w.__ev('gapMs(0,1)'), 246);
  await tick(500);
  assert.equal(w.document.querySelector('#pads .pad.lit').dataset.p, String(a[0]), '첫 패드가 켜짐');
  await tick(640);
  assert.equal(st.phase, 'input'); assert.equal(w.document.querySelectorAll('#pads .pad.lit').length, 0);
  assert.equal(el(w, 'board').classList.contains('input'), true);

  /* 1라운드 따라 누르기 → 라운드 1 완료, 잠깐 쉬고 2라운드 보여주기 */
  w.__ev(`tap(${a[0]})`);
  assert.equal(st.round, 1); assert.equal(st.phase, 'pause'); assert.ok(st.inputMs > 0, '따라 누른 시간 누적: ' + st.inputMs);
  assert.equal(el(w, 'round').textContent, '1');
  /* 2라운드: 보여주기 건너뛰고 2개 정확히 (시계 스텁은 부를 때마다 16ms 가므로 도전자 쪽은 몇 번 더 불러 일부러 느리게) */
  w.__ev('beginInput()'); w.__ev(`tap(${a[0]})`);
  w.__ev('performance.now();performance.now();performance.now()');
  w.__ev(`tap(${a[1]})`);
  assert.equal(st.round, 2); assert.equal(st.phase, 'pause');
  /* 3라운드: 하나 맞추고 틀리면 끝 → 기록 = 2라운드 봉인 */
  w.__ev('beginInput()'); assert.equal(st.phase, 'input');
  w.__ev(`tap(${a[0]})`); assert.equal(st.pos, 1);
  const wrong = (a[1] + 1) % 4;
  w.__ev(`tap(${wrong})`);
  assert.equal(st.done, true); assert.equal(st.running, false); assert.equal(st.round, 2);
  assert.equal(el(w, 'round').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  w.__ev(`tap(${a[2]})`); assert.equal(st.pos, 1, '끝난 뒤에는 입력 안 됨');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.t, st.inputMs);
  assert.equal(st.ms, 2, '기록 = 끝낸 라운드');
  assert.equal(p.x, (2 + p.k * 7) % 1000003, '봉인값 = 라운드');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);

  /* 받는 쪽: 같은 시드로 같은 순서. 3라운드까지 가고 틀림 → 받는 쪽 승 */
  const g = load('simon', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(seq(g), a);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  playRound(g); playRound(g); playRound(g);
  assert.equal(gs.round, 3);
  g.__ev('beginInput()'); g.__ev(`tap(${(a[0] + 2) % 4})`);
  assert.equal(gs.done, true); assert.equal(gs.ms, 3);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 외웠어/);
  assert.match(el(g, 'subVerdict').textContent, /3라운드 vs 2라운드 — 내가 1라운드 더 갔어/);
  assert.match(el(g, 'tA').textContent, /3라운드/); assert.match(el(g, 'tB').textContent, /2라운드/);
  assert.match(el(g, 'dA').textContent, /따라 누른 시간/);
  g.close();

  /* 동점: 라운드가 같으면 따라 누른 시간이 짧은 쪽이 이긴다 */
  const g2 = load('simon', new URL(link).hash).window;
  const g2s = g2.__ev('state');
  g2.__ev('startPlay()'); playRound(g2); playRound(g2);
  g2.__ev('beginInput()'); g2.__ev(`tap(${(a[0] + 1) % 4})`);
  assert.equal(g2s.ms, 2); assert.ok(g2s.inputMs < st.inputMs, '받는 쪽이 덜 걸림: ' + g2s.inputMs + ' vs ' + st.inputMs);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /내가 더 외웠어/);
  assert.match(el(g2, 'subVerdict').textContent, /더 빨리 따라 누른 쪽이 이겨/);
  g2.close();

  /* 60초 상한: 진행 중이면 그때까지의 라운드로 봉인 */
  const c = load('simon', '').window; const cs = c.__ev('state');
  c.__ev('startPlay()'); playRound(c);
  c.__ev('finishPlay("cap")');
  assert.equal(cs.done, true); assert.equal(cs.ms, 1); assert.match(el(c, 'cdSub').textContent, /60초/);
  c.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 고정 시드, 둘이하기 UI 숨김 */
  const s = load('simon', '?solo=1').window;
  const sd = s.document, ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('simon', 1));
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  assert.match(el(s, 'soloDesc').textContent, /클리어 4라운드/); assert.match(el(s, 'soloDesc').textContent, /★★★ 7라운드/);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 7), 3); assert.equal(s.Solo.starsFor(L, 6), 2); assert.equal(s.Solo.starsFor(L, 4), 1); assert.equal(s.Solo.starsFor(L, 3), 0);
  /* 레벨이 높을수록 불빛이 빠르다, 라운드마다 빨라지되 250ms 밑으로는 안 내려감 */
  assert.ok(s.__ev('onMs(5,1)') < s.__ev('onMs(1,1)')); assert.ok(s.__ev('onMs(1,5)') < s.__ev('onMs(1,1)')); assert.equal(s.__ev('onMs(5,40)'), 250);
  const seedLv1 = ss.seed;

  /* 클리어: 7라운드(★★★) 뒤 틀림 → 결과 카드·저장·Lv2 해제·도전장 링크. 봉인 카드는 없음 */
  s.__ev('startPlay()');
  for (let i = 0; i < 7; i++) playRound(s);
  assert.equal(ss.round, 7); assert.equal(ss.done, false, '★★★ 뒤에도 계속 갈 수 있음');
  s.__ev('beginInput()'); s.__ev(`tap(${(seq(s)[0] + 1) % 4})`);
  assert.equal(ss.done, true);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /7라운드/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/simon/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.simon['1'].stars, 3); assert.equal(saved.simon['1'].best, 7);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 새 시드, 결과 카드 사라짐. best+2 라운드에 닿으면 자동으로 끝 */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  s.__ev('startPlay()');
  for (let i = 0; i < 11; i++) playRound(s);
  assert.equal(ss.done, true); assert.equal(ss.round, 11);
  assert.equal(el(s, 'soloResult').querySelector('.stars').textContent, '★★★');
  /* 실패: 3라운드에서 틀림 → 별 0 */
  el(s, 'soloNext').click(); assert.equal(ss.level, 3);
  s.__ev('startPlay()'); playRound(s); playRound(s);
  s.__ev('beginInput()'); s.__ev(`tap(${(seq(s)[0] + 1) % 4})`);
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.equal(sd.querySelectorAll('.solo-lv')[3].classList.contains('locked'), true, 'Lv4 는 아직 잠김');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판, 링크에 l 이 실리고 받는 쪽도 같은 레벨 */
  const d = load('simon', '?s=' + seedLv1 + '&l=1').window;
  const ds = d.__ev('state');
  assert.equal(d.Solo.active, false); assert.equal(el(d, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1);
  d.__ev('startPlay()'); playRound(d); d.__ev('beginInput()'); d.__ev(`tap(${(seq(d)[0] + 1) % 4})`);
  const dp = pay(d); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('simon', new URL(d.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(seq(guest), seq(d));
  guest.close(); d.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('순서 기억 검사 통과 — 시드 순서·보여주기·틀리면 끝·라운드 봉인(s·l·t)·같은 순서 복원·많이 간 쪽 승·시간 동점 처리·60초 상한·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
