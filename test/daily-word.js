/* 오늘의 단어 — 단어 목록·자모 분해·판정 색·오늘 날짜 시드(링크 없이 같은 단어)·목록 밖 입력 거부·맞히면 봉인(시도·시간)·같은 판 복원·적은 시도 승·실패 7·하루 한 번 잠금·혼자 "오늘 한 판"·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));
const guess = (w, v) => { el(w, 'guessIn').value = v; w.__ev('submitGuess()'); };
const fb = (w, g, a) => JSON.parse(w.__ev(`JSON.stringify(feedback(${JSON.stringify(g)},${JSON.stringify(a)}).map(s=>s.map(c=>c.j+c.s)))`));
/* 정답이 아닌 목록 단어 하나 */
const other = (w, not) => JSON.parse(w.__ev('JSON.stringify(DAILY_WORDS.slice(0,10))')).find(x => x !== not);

(async () => {
  /* 단어 목록: 300개 이상, 전부 두 글자 한글, 중복 없음 */
  const w = load('daily-word', '').window;
  const words = JSON.parse(w.__ev('JSON.stringify(DAILY_WORDS)'));
  assert.ok(words.length >= 300, '단어 ' + words.length);
  assert.equal(new Set(words).size, words.length, '중복 없음');
  words.forEach(x => assert.match(x, /^[가-힣]{2}$/, x));

  /* 자모 분해 */
  assert.deepEqual(JSON.parse(w.__ev("JSON.stringify(decompose('한'))")), ['ㅎ', 'ㅏ', 'ㄴ']);
  assert.deepEqual(JSON.parse(w.__ev("JSON.stringify(decompose('사'))")), ['ㅅ', 'ㅏ']);
  assert.deepEqual(JSON.parse(w.__ev("JSON.stringify(jamoOf('닭볶'))")), [['ㄷ', 'ㅏ', 'ㄺ'], ['ㅂ', 'ㅗ', 'ㄲ']]);
  /* 판정 색: 자리 맞으면 g, 다른 자리에 있으면 y, 없으면 x. 같은 자모는 개수만큼만 노랑 */
  assert.deepEqual(fb(w, '사과', '과자'), [['ㅅx', 'ㅏy'], ['ㄱy', 'ㅘy']]);
  assert.deepEqual(fb(w, '바다', '바람'), [['ㅂg', 'ㅏg'], ['ㄷx', 'ㅏg']]);
  assert.deepEqual(fb(w, '바람', '바람'), [['ㅂg', 'ㅏg'], ['ㄹg', 'ㅏg', 'ㅁg']]);
  assert.deepEqual(fb(w, '아기', '가방'), [['ㅇy', 'ㅏg'], ['ㄱy', 'ㅣx']], 'ㅇ은 종성 자리에 있으니 노랑');
  assert.deepEqual(fb(w, '나나', '나비'), [['ㄴg', 'ㅏg'], ['ㄴx', 'ㅏx']], '남은 ㄴ·ㅏ 가 없으니 두 번째는 회색');
  assert.equal(w.__ev("isWord('사과')"), true); assert.equal(w.__ev("isWord('ㅅㄱ')"), false); assert.equal(w.__ev("isWord('없닭')"), false);

  /* 오늘 날짜(서울) 시드: 링크 없이 열면 오늘 시드, 다른 창도 같은 단어. 단어는 시드로만 정해진다 */
  const st = w.__ev('state');
  const key = w.__ev('dayKey()'); assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
  const today = w.__ev('daySeed()');
  assert.equal(st.seed, today); assert.equal(st.level, 0);
  assert.equal(st.answer, w.__ev(`wordOf(${today})`)); assert.ok(words.includes(st.answer));
  assert.match(el(w, 'dayBadge').textContent, /오늘의 단어/);
  const w2 = load('daily-word', '').window;
  assert.equal(w2.__ev('state.seed'), today); assert.equal(w2.__ev('state.answer'), st.answer, '다른 창도 오늘 같은 단어');
  assert.notEqual(w2.__ev("daySeed('2000-01-01')"), today);
  w2.close();
  /* 시작 전: 덮개, 입력 잠김, 판 6줄·글자 상자 12개, 정답은 판에 없다 */
  assert.equal(el(w, 'cover').classList.contains('hidden'), false); assert.equal(el(w, 'guessIn').disabled, true);
  assert.equal(w.document.querySelectorAll('#rows .row').length, 6); assert.equal(w.document.querySelectorAll('#rows .syl').length, 12);
  assert.equal(el(w, 'board').textContent.includes(st.answer), false, '정답 노출 없음');
  guess(w, st.answer); assert.equal(st.tries, 0, '시작 전엔 안 들어감');

  /* 고정 시드로 한 판: 목록 밖 입력 거부, 틀린 단어 2번 → 색 칠해진 줄 2개, 3번째에 정답 → 기록 3 */
  st.seed = 12345; w.__ev('buildRound()'); const ans = st.answer;
  assert.equal(ans, w.__ev('wordOf(12345)')); assert.match(el(w, 'dayBadge').textContent, /도전 단어/);
  w.__ev('startPlay()'); assert.equal(st.running, true); assert.equal(el(w, 'guessIn').disabled, false);
  guess(w, '없닭'); assert.equal(st.tries, 0); assert.match(el(w, 'reveal').textContent, /목록에 없는/);
  guess(w, '가'); assert.equal(st.tries, 0); assert.match(el(w, 'reveal').textContent, /두 글자/);
  const wrong = words.filter(x => x !== ans).slice(0, 6);
  guess(w, wrong[0]); assert.equal(st.tries, 1); assert.equal(el(w, 'count').textContent, '5/6');
  assert.equal(w.document.querySelectorAll('#rows .row:nth-child(1) .jm.g,#rows .row:nth-child(1) .jm.y,#rows .row:nth-child(1) .jm.x').length, JSON.parse(w.__ev(`JSON.stringify(jamoOf(${JSON.stringify(wrong[0])}))`)).flat().length, '자모마다 색 칸');
  assert.ok(w.document.querySelectorAll('#used span').length > 0, '쓴 자모 표시');
  assert.equal(el(w, 'board').textContent.includes(ans), false, '아직 정답 노출 없음');
  guess(w, wrong[1]); assert.equal(st.tries, 2);
  w.__ev('performance.now();performance.now();performance.now();performance.now()');   // 도전자를 일부러 느리게
  guess(w, ans);
  assert.equal(st.tries, 3); assert.equal(st.done, true); assert.equal(st.running, false);
  assert.match(el(w, 'reveal').textContent, new RegExp('정답! ' + ans));
  assert.equal(w.document.querySelectorAll('#rows .row:nth-child(3) .jm.g').length, JSON.parse(w.__ev(`JSON.stringify(jamoOf(${JSON.stringify(ans)}))`)).flat().length, '정답 줄은 전부 초록');
  assert.equal(el(w, 'clock').textContent, '🔒'); assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  assert.equal(pay.s, 12345); assert.equal(pay.l, 0); assert.ok(pay.e > 0, '걸린 시간 ' + pay.e);
  assert.equal(st.ms, 3); assert.equal(pay.x, (3 + pay.k * 7) % 1000003, '봉인값 = 시도 횟수');
  assert.equal(w.localStorage.getItem('dw_done:' + key), null, '고정 시드 판은 오늘 잠금과 무관');

  /* 받는 쪽: 같은 단어. 첫 시도에 맞혀 이긴다 */
  const g = load('daily-word', new URL(link).hash).window; const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.equal(gs.answer, ans);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  assert.equal(el(g, 'board').textContent.includes(ans), false, '받는 쪽도 정답 노출 없음');
  g.__ev('startPlay()'); guess(g, ans);
  assert.equal(gs.done, true); assert.equal(gs.ms, 1);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 빨리 맞혔다/);
  assert.match(el(g, 'subVerdict').textContent, /1번 vs 3번/);
  assert.match(el(g, 'tA').textContent, /^1번$/); assert.match(el(g, 'tB').textContent, /^3번$/);
  assert.match(el(g, 'titleBadge').textContent, /단어 점쟁이/);
  g.close();

  /* 동점: 같은 3번이면 더 빨리 맞힌 쪽 */
  const g2 = load('daily-word', new URL(link).hash).window; const g2s = g2.__ev('state');
  g2.__ev('startPlay()'); guess(g2, wrong[0]); guess(g2, wrong[1]); guess(g2, ans);
  assert.equal(g2s.ms, 3); assert.ok(g2s.elapsed < pay.e, g2s.elapsed + ' vs ' + pay.e);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /내가 더 빨리/); assert.match(el(g2, 'subVerdict').textContent, /더 빨리 맞힌 쪽/);
  g2.close();

  /* 실패: 6번 다 틀리면 7, 정답 공개, 상대(3번)가 이긴다 */
  const g3 = load('daily-word', new URL(link).hash).window; const g3s = g3.__ev('state');
  g3.__ev('startPlay()'); wrong.forEach(x => guess(g3, x));
  assert.equal(g3s.tries, 6); assert.equal(g3s.ms, 7); assert.match(el(g3, 'reveal').textContent, new RegExp('정답은 ' + ans));
  await tick(700);
  assert.match(el(g3, 'verdict').textContent, /상대가 더 빨리/); assert.match(el(g3, 'tA').textContent, /실패/); assert.match(el(g3, 'subVerdict').textContent, /못 맞혔어/);
  g3.close();

  /* 하루 한 번: 오늘 시드로 끝내면 기기에 저장되고, 다시 열면 시작이 막힌다. 둘이하기 첫 판은 다른 단어로 바꿀 수 있다 */
  const d = load('daily-word', '').window; const dsn = d.__ev('state');
  assert.equal(dsn.seed, today);
  d.__ev('startPlay()'); guess(d, dsn.answer);
  assert.equal(dsn.ms, 1);
  const rec = JSON.parse(d.localStorage.getItem('dw_done:' + key)); assert.equal(rec.tries, 1); assert.ok(rec.ms > 0);
  d.__ev('state.hist=[]; state.seed=daySeed(); buildRound()');   // 오늘 단어를 다시 연 상황
  assert.equal(el(d, 'dayLock').classList.contains('hidden'), false); assert.match(el(d, 'dayLock').textContent, /이미 풀었어/);
  assert.equal(el(d, 'bigBtn').disabled, true); assert.equal(el(d, 'randomBtn').classList.contains('hidden'), false);
  d.__ev('startPlay()'); assert.equal(dsn.running, false, '잠긴 상태에선 시작 안 됨');
  el(d, 'randomBtn').click();
  assert.notEqual(dsn.seed, today); assert.equal(el(d, 'dayLock').classList.contains('hidden'), true); assert.equal(el(d, 'bigBtn').disabled, false);
  d.close();
  /* 다른 기기(새 창)는 오늘 단어를 아직 풀 수 있다 */
  const d2 = load('daily-word', '').window;
  assert.equal(el(d2, 'dayLock').classList.contains('hidden'), true); assert.equal(el(d2, 'bigBtn').disabled, false);
  d2.close(); w.close();

  /* 혼자놀기 "오늘 한 판": 레벨 하나, 오늘 시드, 2번 만에 맞히면 ★★★, 도전장 링크에 오늘 시드, 다시 하기는 잠김 */
  const s = load('daily-word', '?solo=1').window; const ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  assert.equal(s.document.querySelectorAll('.solo-lv').length, 1);
  assert.equal(ss.seed, today); assert.equal(ss.level, 1); assert.equal(ss.answer, s.__ev(`wordOf(${today})`));
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 1), 3); assert.equal(s.Solo.starsFor(L, 3), 3); assert.equal(s.Solo.starsFor(L, 4), 2); assert.equal(s.Solo.starsFor(L, 6), 1); assert.equal(s.Solo.starsFor(L, 7), 0);
  s.__ev('startPlay()'); guess(s, other(s, ss.answer)); guess(s, ss.answer);
  assert.equal(ss.done, true);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /2번/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/daily-word/?s=' + today + '&l=1');
  assert.equal(JSON.parse(s.localStorage.getItem('gatchi_solo_v1'))['daily-word']['1'].stars, 3);
  assert.equal(JSON.parse(s.localStorage.getItem('dw_done:' + key)).tries, 2);
  el(s, 'soloRetry').click();
  assert.equal(el(s, 'dayLock').classList.contains('hidden'), false); assert.equal(el(s, 'bigBtn').disabled, true);
  assert.equal(el(s, 'randomBtn').classList.contains('hidden'), true, '혼자놀기엔 다른 단어 없음');
  s.close();

  /* 혼자 → 둘이: ?s=오늘&l=1 로 열면 같은 단어, 링크에 l=1, 받는 쪽도 같은 단어 */
  const p = load('daily-word', '?s=' + today + '&l=1').window; const ps = p.__ev('state');
  assert.equal(p.Solo.active, false); assert.equal(ps.seed, today); assert.equal(ps.level, 1);
  p.__ev('startPlay()'); guess(p, ps.answer);
  const pl = p.Duel.url(); const pp = JSON.parse(Buffer.from(new URL(pl).hash.slice(3), 'base64url').toString());
  assert.equal(pp.s, today); assert.equal(pp.l, 1);
  const pg = load('daily-word', new URL(pl).hash).window;
  assert.equal(pg.__ev('state.level'), 1); assert.equal(pg.__ev('state.answer'), ps.answer);
  pg.close(); p.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('오늘의 단어 검사 통과 — 목록·자모 분해·판정 색·오늘 시드·입력 검증·봉인·같은 판·적은 시도 승·동점은 빠른 쪽·실패 7·하루 한 번·혼자 오늘 한 판·별');
})().catch(e => { console.error(e); process.exit(1); });
