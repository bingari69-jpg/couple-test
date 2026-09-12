/* 2048 한판 — 시드 고정 타일 순서(자리·값), 밀기·합치기 규칙(한 번에 한 번만 합침·안 바뀌면 새 타일 없음), 30초 끝·막히면 끝, 점수 봉인(링크에 s·l·m), 같은 판 복원, 높은 점수 승·최고 타일 동점 처리, 혼자놀기 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const board = w => JSON.parse(w.__ev('JSON.stringify(state.board)'));
const setBoard = (w, b) => { w.__ev('state.board=' + JSON.stringify(b) + '; state.mx=Math.max.apply(null,state.board); render()'); };
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const count = b => b.filter(v => v).length;
/* 시간을 다 쓴 것으로 만들고 시계를 한 번 돌린다 */
const timeUp = w => { w.__ev('state.t0 = performance.now() - state.limit'); w.__ev('clockTick()'); };

(async () => {
  /* 첫 진입: 16칸, 타일 두 장, 덮개, 30.0초 */
  const w = load('2048', '').window;
  const st = w.__ev('state'), d = w.document;
  assert.equal(d.querySelectorAll('#grid .tile').length, 16);
  assert.equal(count(board(w)), 2); assert.ok(board(w).every(v => v === 0 || v === 2 || v === 4));
  assert.equal(el(w, 'cover').classList.contains('hidden'), false); assert.equal(st.level, 0);
  assert.equal(el(w, 'clock').textContent, '30'); assert.equal(el(w, 'score').textContent, '0');

  /* 같은 시드 → 같은 첫 판, 같은 순서로 밀면 같은 판. 다른 시드 → 다른 판 */
  st.seed = 12345; w.__ev('buildBoard()'); const a = board(w);
  const w2 = load('2048', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(board(w2), a, '같은 시드는 같은 첫 판');
  w.__ev('startPlay()'); w2.__ev('startPlay()');
  assert.deepEqual(board(w), a, '진행용 판은 미리보기와 같다');
  const SEQ = ['L', 'U', 'R', 'D', 'L', 'U', 'L', 'D'];
  for (const dir of SEQ) { const r1 = w.__ev(`move("${dir}")`), r2 = w2.__ev(`move("${dir}")`); assert.equal(r1, r2); }
  assert.deepEqual(board(w2), board(w), '같은 순서로 밀면 같은 판'); assert.equal(w2.__ev('state.score'), st.score);
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(board(w2), a, '다른 시드는 다른 판');
  w2.close();

  /* 시작 전에는 밀리지 않는다 */
  const w3 = load('2048', '').window;
  assert.equal(w3.__ev('move("L")'), false); assert.equal(w3.__ev('state.moves'), 0);

  /* 밀기·합치기: 한 번에 한 번만 합쳐지고, 점수 = 합쳐진 값, 새 타일 한 장이 빈 칸에 */
  w3.__ev('startPlay()'); const s3 = w3.__ev('state');
  setBoard(w3, [2, 2, 0, 0, 4, 2, 2, 0, 2, 2, 2, 2, 8, 0, 0, 8]);
  assert.equal(w3.__ev('move("L")'), true);
  let b = board(w3);
  assert.deepEqual(b.slice(0, 3), [4, 0, 0]);
  assert.deepEqual(b.slice(4, 7), [4, 4, 0], '4 2 2 → 4 4 (4는 두 번 안 합쳐짐)');
  assert.deepEqual(b.slice(8, 12), [4, 4, 0, 0], '2 2 2 2 → 4 4');
  assert.deepEqual(b.slice(12, 14), [16, 0]);
  assert.equal(s3.score, 4 + 4 + 8 + 16); assert.equal(s3.moves, 1); assert.equal(s3.mx, 16);
  assert.equal(count(b), 6 + 1, '새 타일 한 장'); assert.equal(el(w3, 'score').textContent, '32'); assert.equal(el(w3, 'maxTile').textContent, '16');
  assert.equal(d.querySelectorAll('#grid .tile').length, 16);
  /* 안 바뀌는 방향은 새 타일도 없고 횟수도 안 는다 */
  setBoard(w3, [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(w3.__ev('move("U")'), false); assert.deepEqual(board(w3), [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); assert.equal(s3.moves, 1);
  assert.equal(w3.__ev('move("L")'), false);
  /* 위·아래·오른쪽 방향 */
  setBoard(w3, [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  w3.__ev('move("D")'); b = board(w3); assert.equal(b[12], 4);
  setBoard(w3, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2]);
  w3.__ev('move("R")'); assert.equal(board(w3)[15], 4);
  setBoard(w3, [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0]);
  w3.__ev('move("U")'); assert.equal(board(w3)[3], 4);

  /* 막히면 끝: 마지막 빈 칸이 새 타일(2든 4든)로 채워지고 나면 더 밀 곳이 없어 그 자리에서 봉인 */
  setBoard(w3, [2, 4, 2, 4, 4, 2, 4, 2, 16, 4, 2, 4, 8, 16, 8, 0]);
  assert.equal(w3.__ev('canMove()'), true);
  const scoreStuck = s3.score;
  assert.equal(w3.__ev('move("R")'), true);
  assert.equal(w3.__ev('canMove()'), false); assert.equal(s3.done, true); assert.equal(s3.running, false);
  assert.match(el(w3, 'cdSub').textContent, /더 밀 곳 없음/); assert.equal(s3.ms, scoreStuck, '막히면 그때까지 점수로 봉인');
  assert.match(w3.Duel.url(), /#c=/);
  w3.close();

  /* 30초 끝: 그때까지 점수로 봉인. 링크에 시드·레벨·최고 타일, 봉인값 = 점수 */
  const scoreA = st.score, mxA = st.mx;
  assert.ok(scoreA > 0, '몇 번 밀었으면 점수가 있다: ' + scoreA);
  timeUp(w);
  assert.equal(st.done, true); assert.equal(st.running, false); assert.equal(st.ms, scoreA);
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'clock').textContent, '0'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  assert.equal(w.__ev('move("L")'), false, '끝난 뒤에는 안 밀림');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.m, mxA);
  assert.equal(p.x, (scoreA + p.k * 7) % 1000003, '봉인값 = 점수');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);

  /* 받는 쪽: 같은 시드로 같은 첫 판. 같은 순서로 밀면 같은 판. 더 높은 점수로 끝내면 받는 쪽 승 */
  const g = load('2048', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(board(g), a);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  for (const dir of SEQ) g.__ev(`move("${dir}")`);
  assert.deepEqual(board(g), board(w), '받는 쪽도 같은 순서면 같은 판');
  assert.equal(gs.score, scoreA);
  setBoard(g, [64, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); g.__ev('move("L")');   // +128 → 앞선다
  assert.equal(gs.score, scoreA + 128); assert.equal(gs.mx, 128);
  timeUp(g);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 높아/);
  assert.match(el(g, 'subVerdict').textContent, new RegExp(`${scoreA + 128}점 vs ${scoreA}점 — 내가 128점 앞섰어`));
  assert.match(el(g, 'tA').textContent, /점/); assert.match(el(g, 'dA').textContent, /최고 타일 128/);
  assert.match(el(g, 'dB').textContent, new RegExp('최고 타일 ' + mxA));
  g.close();

  /* 동점: 점수가 같으면 더 큰 타일을 만든 쪽이 이긴다 */
  const g2 = load('2048', new URL(link).hash).window; const g2s = g2.__ev('state');
  g2.__ev('startPlay()');
  for (const dir of SEQ) g2.__ev(`move("${dir}")`);
  assert.equal(g2s.score, scoreA);
  g2.__ev('state.mx=' + (mxA * 2));           // 점수 같고 최고 타일만 큼
  timeUp(g2);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /내가 더 높아/);
  assert.match(el(g2, 'subVerdict').textContent, /더 큰 타일을 만든 쪽이 이겨/);
  g2.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 고정 시드, 40초, 목표 128, 둘이하기 UI 숨김 */
  const s = load('2048', '?solo=1').window;
  const sd = s.document, ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('2048', 1)); assert.equal(ss.limit, 40000);
  assert.equal(el(s, 'clock').textContent, '40');
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  assert.match(el(s, 'soloDesc').textContent, /클리어 128 타일/); assert.match(el(s, 'soloDesc').textContent, /★★★ 256 타일/);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 256), 3); assert.equal(s.Solo.starsFor(L, 128), 1); assert.equal(s.Solo.starsFor(L, 64), 0); assert.equal(s.Solo.starsFor(L, null), 0);
  const seedLv1 = ss.seed;

  /* 클리어: 128을 만들면 "여기서 끝내기" 버튼, 256 을 만들고 시간이 끝나면 최고 타일 256 으로 ★★★, 저장, Lv2 해제. 봉인 카드 없음 */
  s.__ev('startPlay()');
  assert.equal(el(s, 'bigBtn').disabled, true);
  setBoard(s, [64, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); s.__ev('move("L")');
  assert.equal(ss.mx, 128); assert.equal(el(s, 'bigBtn').disabled, false); assert.match(el(s, 'bigBtn').textContent, /여기서 끝내기/);
  assert.equal(ss.done, false, '목표를 넘어도 계속할 수 있다');
  setBoard(s, [128, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); s.__ev('move("L")');
  assert.equal(ss.mx, 256);
  timeUp(s);
  assert.equal(ss.done, true);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /256 타일/); assert.match(res.querySelector('.rec').textContent, /점수/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/2048/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved['2048']['1'].stars, 3); assert.equal(saved['2048']['1'].best, 256);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 60초·목표 256, 새 시드. 목표 못 채우고 시간 끝 → 최고 타일이 기록되지만 별 0 */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  assert.equal(ss.limit, 60000); assert.equal(el(s, 'clock').textContent, '60');
  s.__ev('startPlay()');
  setBoard(s, [32, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); s.__ev('move("L")');
  timeUp(s);
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, /64 타일/, '시간이 끝나도 최고 타일이 기록');
  assert.equal(JSON.parse(s.localStorage.getItem('gatchi_solo_v1'))['2048']['2'].best, 64);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  /* "여기서 끝내기": 목표를 채운 뒤 버튼으로 끝내면 그 자리의 최고 타일로 기록 */
  el(s, 'soloRetry').click(); s.__ev('startPlay()');
  setBoard(s, [128, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); s.__ev('move("L")');
  el(s, 'bigBtn').click();
  assert.equal(ss.done, true); assert.equal(el(s, 'soloResult').querySelector('.stars').textContent, '★☆☆');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판(30초), 링크에 l 이 실리고 받는 쪽도 같은 판 */
  const du = load('2048', '?s=' + seedLv1 + '&l=1').window;
  const ds = du.__ev('state');
  assert.equal(du.Solo.active, false); assert.equal(el(du, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.equal(el(du, 'clock').textContent, '30');
  const first = board(du);
  du.__ev('startPlay()'); du.__ev('move("L")'); du.__ev('move("U")'); timeUp(du);
  const dp = pay(du); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('2048', new URL(du.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(board(guest), first);
  guest.close(); du.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('2048 한판 검사 통과 — 시드 타일 순서·밀기/합치기 규칙·안 바뀌면 그대로·30초 봉인(s·l·m)·같은 판 복원·높은 점수 승·최고 타일 동점 처리·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
