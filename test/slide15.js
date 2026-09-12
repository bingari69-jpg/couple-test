/* 15퍼즐 — 시드 고정 섞임 순서(60초 연달아, 3×3 두 판 뒤 4×4), 합법 이동 섞기(풀 수 있음), 같은 줄 여러 칸 밀기, 다른 줄은 무시,
   맞추면 다음 판, 60초 끝에 맞춘 판 수 봉인(링크에 s·l·m), 같은 판 복원, 많이 맞춘 쪽 승·동점은 덜 움직인 쪽, 혼자놀기 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const tiles = w => JSON.parse(w.__ev('JSON.stringify(state.tiles)'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const N = w => w.__ev('N');
/* 풀 수 있는 배치인가: 홀수 판은 전도 수가 짝수, 짝수 판은 (전도 수 + 아래에서 센 빈칸 줄) 이 홀수 */
const solvable = (t, n) => {
  const a = t.filter(v => v); let inv = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++;
  if (n % 2) return inv % 2 === 0;
  const rowFromBottom = n - Math.floor(t.indexOf(0) / n);
  return (inv + rowFromBottom) % 2 === 1;
};
const isPerm = (t, n) => t.length === n * n && [...t].sort((x, y) => x - y).every((v, i) => v === i);
/* 거의 맞춰진 상태로 놓고 마지막 한 수로 푼다(마지막 줄: … 0 N²-1 → 오른쪽 끝을 톡) */
const solveBoard = w => {
  const n = N(w); const t = []; for (let i = 1; i < n * n - 1; i++) t.push(i); t.push(0); t.push(n * n - 1);
  w.__ev('state.tiles=' + JSON.stringify(t) + '; render()');
  assert.equal(w.__ev('tap(' + (n * n - 1) + ')'), true);
};

(async () => {
  /* 첫 진입: 3×3, 8 타일 + 빈칸, 풀 수 있는 순열, 맞춰져 있지 않음, 덮개 */
  const w = load('slide15', '').window;
  const st = w.__ev('state'), d = w.document;
  assert.equal(N(w), 3); assert.equal(st.bi, 0); assert.equal(st.level, 0);
  assert.equal(d.querySelectorAll('#grid .tile').length, 9); assert.equal(d.querySelectorAll('#grid .tile.blank').length, 1);
  assert.ok(isPerm(tiles(w), 3)); assert.ok(solvable(tiles(w), 3), '풀 수 있는 배치'); assert.equal(w.__ev('isSolved()'), false);
  assert.equal(el(w, 'cover').classList.contains('hidden'), false); assert.equal(el(w, 'size').textContent, '3×3');

  /* 같은 시드 → 같은 섞임, 다른 시드 → 다른 섞임 */
  st.seed = 12345; w.__ev('buildRun()'); const a = tiles(w);
  const w2 = load('slide15', '').window; w2.__ev('state.seed=12345; buildRun()');
  assert.deepEqual(tiles(w2), a, '같은 시드는 같은 섞임');
  w2.__ev('state.seed=54321; buildRun()');
  assert.notDeepEqual(tiles(w2), a, '다른 시드는 다른 섞임');
  w2.close();

  /* 시작 전에는 안 밀린다 */
  const b0 = a.indexOf(0), adj0 = b0 % 3 > 0 ? b0 - 1 : b0 + 1;
  assert.equal(w.__ev('tap(' + adj0 + ')'), false); assert.deepEqual(tiles(w), a); assert.equal(st.moves, 0);

  /* 시작: 진행용 첫 판은 미리보기와 같다 */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(tiles(w), a);

  /* 다른 줄·칸 → 무시. 빈칸 자체 → 무시 */
  const b = a.indexOf(0), br = Math.floor(b / 3), bc = b % 3;
  const far = [...Array(9).keys()].find(i => Math.floor(i / 3) !== br && i % 3 !== bc);
  assert.equal(w.__ev('tap(' + far + ')'), false); assert.equal(w.__ev('tap(' + b + ')'), false);
  assert.deepEqual(tiles(w), a); assert.equal(st.moves, 0);

  /* 같은 줄 여러 칸: 빈칸과 같은 줄에서 두 칸 떨어진 타일을 누르면 사이 타일이 한꺼번에 밀린다(움직임 1) */
  {
    const t = [1, 2, 3, 4, 5, 6, 0, 7, 8];            // 빈칸 (2,0), 7·8 이 오른쪽
    w.__ev('state.tiles=' + JSON.stringify(t) + '; render()');
    assert.equal(w.__ev('tap(8)'), true);
    assert.deepEqual(tiles(w), [1, 2, 3, 4, 5, 6, 7, 8, 0], '7·8 이 왼쪽으로 한꺼번에');
    assert.equal(st.moves, 1);
  }
  /* …그 결과가 맞춰진 상태 → 맞춘 판 1, 잠깐 잠금, 다음 판(3×3 두 번째)으로 */
  assert.equal(st.solved, 1); assert.equal(el(w, 'score').textContent, '1'); assert.equal(st.lock, true);
  assert.equal(w.__ev('tap(7)'), false, '넘어가는 중엔 입력 무시');
  await tick(300);
  assert.equal(st.bi, 1); assert.equal(N(w), 3); assert.equal(st.lock, false); assert.ok(solvable(tiles(w), 3)); assert.equal(w.__ev('isSolved()'), false);
  const board2 = tiles(w);
  /* 세로 밀기: 빈칸 위 두 칸을 누르면 둘이 아래로 */
  {
    const t2 = [1, 2, 0, 4, 5, 3, 7, 8, 6];               // 빈칸 (0,2), 3·6 아래
    w.__ev('state.tiles=' + JSON.stringify(t2) + '; render()');
    assert.equal(w.__ev('tap(8)'), true);
    assert.deepEqual(tiles(w), [1, 2, 3, 4, 5, 6, 7, 8, 0]); assert.equal(st.moves, 2); assert.equal(st.solved, 2);
  }
  await tick(300);
  /* 두 판 맞추면 4×4 */
  assert.equal(st.bi, 2); assert.equal(N(w), 4); assert.equal(d.querySelectorAll('#grid .tile').length, 16); assert.equal(el(w, 'size').textContent, '4×4');
  assert.ok(isPerm(tiles(w), 4)); assert.ok(solvable(tiles(w), 4), '4×4 도 풀 수 있는 배치'); assert.equal(w.__ev('isSolved()'), false);
  assert.equal(st.running, true, '판은 끝나지 않는다');

  /* 60초 끝: 다음 입력에서 끝난다. 기록 = 맞춘 판 2, 봉인. 링크에 s·l·m */
  w.__ev('state.t0 = performance.now() - 60000');
  assert.equal(w.__ev('tap(' + (tiles(w).indexOf(0) ^ 1) + ')'), false);
  assert.equal(st.done, true); assert.equal(st.running, false);
  assert.equal(st.ms, 2, '기록 = 맞춘 판 수'); assert.equal(st.moves, 2);
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.m, 2);
  assert.equal(p.x, (2 + p.k * 7) % 1000003, '봉인값 = 맞춘 판 수');

  /* 받는 쪽: 같은 시드로 같은 섞임 순서. 세 판 맞추고 시간 끝 → 받는 쪽 승 */
  const g = load('slide15', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(tiles(g), a);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  solveBoard(g); await tick(300);
  assert.deepEqual(tiles(g), board2, '2판째도 같은 섞임');
  solveBoard(g); await tick(300);
  assert.equal(N(g), 4);
  solveBoard(g); await tick(300);
  assert.equal(gs.solved, 3); assert.equal(gs.bi, 3);
  g.__ev('state.t0 = performance.now() - 60000'); g.__ev('endPlay()');
  assert.equal(gs.ms, 3);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 맞췄어/);
  assert.match(el(g, 'subVerdict').textContent, /3판 vs 2판 — 내가 1판 더 맞췄어/);
  assert.match(el(g, 'tA').textContent, /3판/); assert.match(el(g, 'tB').textContent, /2판/);
  assert.match(el(g, 'dA').textContent, /움직임 3번/); assert.match(el(g, 'dB').textContent, /움직임 2번/);
  g.close();

  /* 동점: 맞춘 판이 같으면 덜 움직인 쪽이 이긴다 */
  const t = load('slide15', '').window;
  t.__ev('Duel.renderResult({hist:[["A",2,"B",2,"ida","idb",40,30]],round:["A",2,"B",2,"ida","idb",40,30],viewer:"b"})');
  assert.match(el(t, 'verdict').textContent, /내가 더 맞췄어/);
  assert.match(el(t, 'subVerdict').textContent, /덜 움직인 쪽이 이겨/);
  t.__ev('Duel.renderResult({hist:[["A",2,"B",2,"ida","idb",30,30]],round:["A",2,"B",2,"ida","idb",30,30],viewer:"b"})');
  assert.match(el(t, 'verdict').textContent, /완전 똑같아/);
  t.close(); w.close();

  /* ===== 혼자놀기 ===== */
  const s = load('slide15', '?solo=1').window;
  const ss = s.__ev('state'), sd = s.document;
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('slide15', 1)); assert.equal(N(s), 3);
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true);
  assert.match(el(s, 'soloHud').textContent, /Lv1/); assert.equal(el(s, 'clock').textContent, '60.0');
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 2), 3); assert.equal(s.Solo.starsFor(L, 1), 1); assert.equal(s.Solo.starsFor(L, 0), 0);
  /* 클리어: 두 판 맞추고 60초 끝 → ★★★, 저장, Lv2 해제, 도전장 링크 */
  const seedLv1 = ss.seed;
  s.__ev('startPlay()'); solveBoard(s); await tick(300); solveBoard(s); await tick(300);
  assert.equal(ss.solved, 2);
  s.__ev('state.t0 = performance.now() - 60000'); s.__ev('endPlay()');
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /기록 2판 · 움직임 2번/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/slide15/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.slide15['1'].stars, 3); assert.equal(saved.slide15['1'].best, 2);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  /* 다음 레벨: 새 시드, 실패(0판) → ☆☆☆ */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  s.__ev('startPlay()'); s.__ev('state.t0 = performance.now() - 60000'); s.__ev('endPlay()');
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true);
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드의 둘이하기 첫 판, 링크에 l, 받는 쪽도 같은 섞임 */
  const duel = load('slide15', '?s=' + seedLv1 + '&l=1').window;
  const ds = duel.__ev('state');
  assert.equal(duel.Solo.active, false); assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1);
  const pt = tiles(duel);
  duel.__ev('startPlay()'); duel.__ev('state.t0 = performance.now() - 60000'); duel.__ev('endPlay()');
  const p2 = pay(duel); assert.equal(p2.s, seedLv1); assert.equal(p2.l, 1);
  const guest = load('slide15', new URL(duel.Duel.url()).hash).window;
  assert.deepEqual(tiles(guest), pt); assert.equal(guest.__ev('state.level'), 1);
  guest.close(); duel.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('15퍼즐 검사 통과 — 시드 섞임 순서·풀 수 있는 배치·같은 줄 여러 칸 밀기·맞추면 다음 판(두 판 뒤 4×4)·60초 봉인(s·l·m)·같은 판 복원·많이 맞춘 쪽 승·동점 덜 움직인 쪽·혼자놀기');
})().catch(e => { console.error(e); process.exit(1); });
