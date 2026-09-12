/* 초성 퀴즈 — 문제 은행·초성 분해·시드 고정 5문제·입력 판정(띄어쓰기 무시)·패스·힌트·끝나면 봉인(개수·시간)·같은 판 복원·많이 맞힌 쪽 승·동점은 빠른 쪽·혼자 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));
const pack = w => JSON.parse(w.__ev('JSON.stringify(state.pack.map(q=>q.a))'));
const answer = (w, v) => { el(w, 'ansIn').value = v; w.__ev('submitAnswer()'); };

(async () => {
  /* 문제 은행: 120개 이상, 카테고리별 개수, 중복 없음 */
  const w = load('choseong', '').window;
  const bank = JSON.parse(w.__ev('JSON.stringify(CHOSEONG_BANK)'));
  assert.ok(bank.length >= 120, '은행 ' + bank.length);
  assert.equal(new Set(bank.map(q => q.a)).size, bank.length, '정답 중복 없음');
  const byCat = {}; bank.forEach(q => { byCat[q.c] = (byCat[q.c] || 0) + 1; assert.ok(q.a && q.h && q.c); });
  assert.ok(byCat['음식'] >= 40); assert.ok(byCat['동물'] >= 20); assert.ok(byCat['영화·드라마'] >= 20); assert.ok(byCat['장소'] >= 20); assert.ok(byCat['커플·연인'] >= 20);

  /* 초성 분해: 띄어쓰기는 그대로 */
  assert.equal(w.__ev("choseongOf('떡볶이')"), 'ㄸㅂㅇ');
  assert.equal(w.__ev("choseongOf('첫 데이트')"), 'ㅊ ㄷㅇㅌ');
  assert.equal(w.__ev("choseongOf('사랑의 불시착')"), 'ㅅㄹㅇ ㅂㅅㅊ');
  assert.equal(w.__ev("choseongOf('오징어 게임')"), 'ㅇㅈㅇ ㄱㅇ');
  /* 답 비교: 앞뒤 공백·띄어쓰기 무시, 빈 답은 오답 */
  assert.equal(w.__ev("isRight(' 첫데이트 ','첫 데이트')"), true);
  assert.equal(w.__ev("isRight('떡볶이','떡볶이')"), true);
  assert.equal(w.__ev("isRight('떡볶기','떡볶이')"), false);
  assert.equal(w.__ev("isRight('','떡볶이')"), false);

  /* 첫 진입: 덮개, 5문제, 입력 잠김 */
  const st = w.__ev('state');
  assert.equal(el(w, 'cover').classList.contains('hidden'), false);
  assert.equal(st.pack.length, 5); assert.equal(el(w, 'ansIn').disabled, true);
  assert.equal(el(w, 'clock').textContent, '60.0');

  /* 같은 시드 → 같은 5문제(다른 창에서도), 다른 시드 → 다른 문제. 초성은 정답에서 나온다 */
  st.seed = 12345; w.__ev('buildRound()'); const a = pack(w);
  assert.equal(a.length, 5); assert.equal(new Set(a).size, 5);
  const w2 = load('choseong', '').window; w2.__ev('state.seed=12345; buildRound()');
  assert.deepEqual(pack(w2), a, '같은 시드는 같은 문제');
  w2.__ev('state.seed=54321; buildRound()');
  assert.notDeepEqual(pack(w2), a, '다른 시드는 다른 문제');
  w2.close();
  const q0 = JSON.parse(w.__ev('JSON.stringify(state.pack[0])'));
  assert.equal(q0.cho, w.__ev(`choseongOf(${JSON.stringify(q0.a)})`));

  /* 시작 전엔 답이 안 들어간다 */
  answer(w, a[0]); assert.equal(st.score, 0);

  /* 시작: 문제 화면, 초성 큼직하게, 힌트는 아직 */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(pack(w), a);
  assert.equal(el(w, 'cho').textContent, q0.cho); assert.equal(el(w, 'cat').textContent, q0.c);
  assert.equal(el(w, 'hintBox').classList.contains('on'), false);

  /* 틀리면 그대로(점수 0, 같은 문제), 힌트 버튼은 힌트 수를 올린다 */
  answer(w, '아무말'); assert.equal(st.score, 0); assert.equal(st.index, 0);
  assert.match(el(w, 'reveal').textContent, /땡/);
  w.__ev('showHint()'); assert.equal(st.hints, 1); assert.equal(el(w, 'hints').textContent, '1');
  assert.match(el(w, 'hintBox').textContent, new RegExp(q0.h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  w.__ev('showHint()'); assert.equal(st.hints, 1, '같은 문제에서 힌트는 한 번만');

  /* 1번 정답(띄어쓰기 없이) → 1점, 다음 문제. 2번 패스 → 0점, 다음 문제 */
  answer(w, a[0].replace(/\s+/g, '')); assert.equal(st.score, 1);
  await tick(650); assert.equal(st.index, 1); assert.equal(el(w, 'progress').textContent, '2 / 5');
  w.__ev('pass()'); await tick(650); assert.equal(st.index, 2); assert.equal(st.score, 1);
  /* 3·4번 정답, 5번 패스 → 3/5. 도전자 쪽은 시계를 몇 번 더 불러 일부러 느리게 만든다 */
  answer(w, a[2]); await tick(650); answer(w, a[3]); await tick(650);
  assert.equal(st.score, 3); assert.equal(st.index, 4);
  w.__ev('performance.now();performance.now();performance.now();performance.now()');
  w.__ev('pass()'); await tick(650);
  assert.equal(st.done, true); assert.equal(st.running, false);
  assert.equal(el(w, 'clock').textContent, '🔒'); assert.equal(el(w, 'ansIn').disabled, true);
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);

  /* 링크: 시드·걸린 시간·레벨 0, 봉인값 = 맞힌 개수 */
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  assert.equal(pay.s, 12345); assert.equal(pay.l, 0); assert.ok(pay.e > 0 && pay.e <= 60000, '걸린 시간 ' + pay.e);
  assert.equal(st.ms, 3); assert.equal(pay.x, (3 + pay.k * 7) % 1000003, '봉인값 = 맞힌 개수');

  /* 받는 쪽: 같은 5문제. 5개 다 맞혀 이긴다 */
  const g = load('choseong', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(pack(g), a);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  for (let i = 0; i < 5; i++) { answer(g, a[i]); await tick(650); }
  assert.equal(gs.done, true); assert.equal(gs.score, 5);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 많이 맞혔다/);
  assert.match(el(g, 'subVerdict').textContent, /5개 vs 3개/);
  assert.match(el(g, 'tA').textContent, /^5\/5$/); assert.match(el(g, 'tB').textContent, /^3\/5$/);
  assert.match(el(g, 'dA').textContent, /풀이 .*초/);
  assert.match(el(g, 'titleBadge').textContent, /초성 마스터/);
  g.close();

  /* 동점: 개수가 같으면 더 빨리 끝낸 쪽이 이긴다 (받는 쪽이 같은 3개를 더 빨리) */
  const g2 = load('choseong', new URL(link).hash).window;
  const g2s = g2.__ev('state');
  g2.__ev('startPlay()');
  answer(g2, a[0]); await tick(650); answer(g2, a[1]); await tick(650); answer(g2, a[2]); await tick(650);
  g2.__ev('pass()'); await tick(650); g2.__ev('pass()'); await tick(650);
  assert.equal(g2s.score, 3); assert.ok(g2s.elapsed < pay.e, '받는 쪽이 더 빨라야 함: ' + g2s.elapsed + ' vs ' + pay.e);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /내가 더 많이 맞혔다/);
  assert.match(el(g2, 'subVerdict').textContent, /더 빨리 끝낸 쪽/);
  g2.close();

  /* 시간 초과: 60초가 지나면 그 자리에서 끝나고 점수 그대로 봉인 */
  const t = load('choseong', '').window; const ts = t.__ev('state');
  t.__ev('startPlay()'); t.__ev('finishPlay(true)');
  assert.equal(ts.done, true); assert.equal(ts.ms, 0); assert.equal(ts.elapsed <= 60000, true);
  assert.equal(el(t, 'afterPlay').classList.contains('hidden'), false);
  t.close(); w.close();

  /* 혼자놀기: 레벨 5개, Lv1 은 짧은 말 풀, 5개 다 맞히면 ★★★, Lv2 해제, 도전장 링크에 l */
  const s = load('choseong', '?solo=1').window; const ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...s.document.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('choseong', 1));
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true);
  const p1 = pack(s); assert.equal(p1.length, 5);
  const maxLen1 = Math.max(...p1.map(x => x.replace(/\s+/g, '').length));
  const pool5 = JSON.parse(s.__ev('JSON.stringify(poolOf(5).map(q=>q.a))'));
  const minLen5 = Math.min(...pool5.map(x => x.replace(/\s+/g, '').length));
  assert.ok(maxLen1 <= minLen5, 'Lv1 은 Lv5 보다 짧은 말: ' + maxLen1 + ' vs ' + minLen5);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 5), 3); assert.equal(s.Solo.starsFor(L, 4), 2); assert.equal(s.Solo.starsFor(L, 3), 1); assert.equal(s.Solo.starsFor(L, 2), 0);
  s.__ev('startPlay()');
  for (let i = 0; i < 5; i++) { answer(s, p1[i]); await tick(650); }
  assert.equal(ss.done, true);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /5개/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/choseong/?s=' + L.seed + '&l=1');
  assert.equal(JSON.parse(s.localStorage.getItem('gatchi_solo_v1')).choseong['1'].stars, 3);
  assert.equal(s.document.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  el(s, 'soloNext').click(); assert.equal(ss.level, 2); assert.equal(el(s, 'soloResult'), null);
  /* 실패: 2개만 맞히고 시간 초과 → 별 0 */
  const p2 = pack(s); s.__ev('startPlay()'); answer(s, p2[0]); await tick(650); answer(s, p2[1]); await tick(650);
  s.__ev('finishPlay(true)');
  assert.equal(el(s, 'soloResult').querySelector('.stars').textContent, '☆☆☆');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 풀·시드, 링크에 l=1, 받는 쪽도 같은 문제 */
  const d = load('choseong', '?s=' + L.seed + '&l=1').window; const ds = d.__ev('state');
  assert.equal(d.Solo.active, false); assert.equal(ds.seed, L.seed); assert.equal(ds.level, 1); assert.deepEqual(pack(d), p1);
  d.__ev('startPlay()'); for (let i = 0; i < 5; i++) { answer(d, p1[i]); await tick(650); }
  const dl = d.Duel.url(); const dp = JSON.parse(Buffer.from(new URL(dl).hash.slice(3), 'base64url').toString());
  assert.equal(dp.s, L.seed); assert.equal(dp.l, 1);
  const dg = load('choseong', new URL(dl).hash).window;
  assert.equal(dg.__ev('state.level'), 1); assert.deepEqual(pack(dg), p1);
  dg.close(); d.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('초성 퀴즈 검사 통과 — 은행·초성 분해·시드 5문제·입력 판정·패스·힌트·봉인·같은 판·많이 맞힌 쪽 승·동점은 빠른 쪽·혼자 레벨·별');
})().catch(e => { console.error(e); process.exit(1); });
