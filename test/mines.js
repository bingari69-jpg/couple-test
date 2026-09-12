/* 지뢰찾기 미니 — 시드 고정 판 순서(60초 연달아), 시작 칸 미리 열림(0 칸·홍수 열기), 깃발·코드 열기, 지뢰 밟으면 펑→다음 판(끝나지 않음),
   60초 끝에 푼 판 수 봉인(링크에 s·l·b), 같은 판 복원, 많이 푼 쪽 승·동점은 덜 밟은 쪽, 혼자놀기 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const J = (w, code) => JSON.parse(w.__ev('JSON.stringify(' + code + ')'));
const mines = w => J(w, 'state.mine');
const opens = w => J(w, 'state.open');
const nums = w => J(w, 'state.num');
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const N = w => w.__ev('N');
const neighbors = (n, i) => { const x = i % n, y = Math.floor(i / n), o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < n && ny < n) o.push(ny * n + nx); } return o; };
/* 지뢰 아닌 칸을 전부 열어 이번 판을 푼다(마지막 칸에서 clearBoard 가 불린다) */
const solveBoard = w => { const m = mines(w); for (let i = 0; i < m.length; i++) if (!m[i] && !w.__ev('state.open[' + i + ']')) w.__ev('reveal(' + i + ')'); };
const firstMine = w => mines(w).indexOf(true);

(async () => {
  /* 첫 진입: 6×6·지뢰 5, 시작 칸이 열려 있고(0 칸 → 둘레도 열림), 덮개가 보인다 */
  const w = load('mines', '').window;
  const st = w.__ev('state'), d = w.document;
  assert.equal(N(w), 6); assert.equal(mines(w).filter(Boolean).length, 5); assert.equal(st.bi, 0); assert.equal(st.level, 0);
  assert.equal(el(w, 'cover').classList.contains('hidden'), false);
  assert.equal(el(w, 'mcount').textContent, '5'); assert.equal(el(w, 'bno').textContent, '1');
  assert.equal(nums(w)[st.start], 0, '시작 칸은 0');
  assert.ok(opens(w)[st.start] && st.opened > 1, '시작 칸과 둘레가 미리 열림: ' + st.opened);
  neighbors(6, st.start).forEach(j => assert.equal(opens(w)[j], true, '0 칸 둘레는 다 열림'));
  assert.ok(opens(w).every((o, i) => !o || !mines(w)[i]), '열린 칸에 지뢰 없음');

  /* 같은 시드 → 같은 판, 다른 시드 → 다른 판 */
  st.seed = 12345; w.__ev('buildRun()'); const a = mines(w), s0 = st.start;
  const w2 = load('mines', '').window; w2.__ev('state.seed=12345; buildRun()');
  assert.deepEqual(mines(w2), a, '같은 시드는 같은 지뢰'); assert.equal(w2.__ev('state.start'), s0);
  w2.__ev('state.seed=54321; buildRun()');
  assert.notDeepEqual(mines(w2), a, '다른 시드는 다른 판');
  w2.close();

  /* 시작 전에는 열리지도 깃발도 안 된다 */
  const closed0 = a.findIndex((m, i) => !m && !opens(w)[i]);
  assert.equal(w.__ev('reveal(' + closed0 + ')'), false); assert.equal(w.__ev('flag(' + closed0 + ')'), false);

  /* 시작: 진행용 첫 판은 미리보기와 같다 */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(mines(w), a); assert.equal(st.start, s0);

  /* 깃발: 닫힌 칸에 켜고 끄기, 깃발 칸은 열리지 않음, 열린 칸엔 깃발 불가 */
  const mi = firstMine(w);
  assert.equal(w.__ev('flag(' + mi + ')'), true); assert.equal(st.flags, 1); assert.equal(el(w, 'fcount').textContent, '1');
  assert.equal(w.__ev('reveal(' + mi + ')'), false, '깃발 칸은 열리지 않음'); assert.equal(st.boom, 0);
  assert.equal(w.__ev('flag(' + s0 + ')'), false, '열린 칸엔 깃발 불가');
  assert.equal(w.__ev('flag(' + mi + ')'), true); assert.equal(st.flags, 0);

  /* 코드 열기: 숫자 칸 둘레의 지뢰에 깃발을 다 꽂고 숫자를 다시 누르면 나머지가 열린다 */
  {
    const nm = nums(w), op = opens(w), mn = mines(w);
    const numCell = op.findIndex((o, i) => o && nm[i] > 0 && neighbors(6, i).some(j => !op[j] && !mn[j]));
    assert.ok(numCell >= 0, '열린 숫자 칸');
    const nb = neighbors(6, numCell);
    assert.equal(w.__ev('reveal(' + numCell + ')'), false, '깃발이 안 맞으면 코드 안 됨');
    nb.filter(j => mn[j]).forEach(j => w.__ev('flag(' + j + ')'));
    const before = st.opened;
    assert.equal(w.__ev('reveal(' + numCell + ')'), true);
    assert.ok(st.opened > before, '둘레가 열림');
    nb.forEach(j => { if (!mn[j]) assert.equal(w.__ev('state.open[' + j + ']'), true); });
    nb.filter(j => mn[j]).forEach(j => w.__ev('flag(' + j + ')'));   // 깃발 되돌림
  }

  /* 판 클리어: 지뢰 아닌 칸을 다 열면 푼 판 +1, 잠깐 잠겼다가 다음 판(6×6·6)으로. 시간은 계속 */
  solveBoard(w);
  assert.equal(st.cleared, 1); assert.equal(el(w, 'score').textContent, '1'); assert.equal(st.lock, true);
  assert.equal(w.__ev('reveal(0)'), false, '넘어가는 중엔 입력 무시');
  await tick(400);
  assert.equal(st.bi, 1); assert.equal(st.lock, false); assert.equal(N(w), 6); assert.equal(mines(w).filter(Boolean).length, 6);
  assert.equal(st.running, true, '판은 끝나지 않는다'); assert.equal(el(w, 'bno').textContent, '2');
  const board2 = mines(w);

  /* 지뢰 밟기: 펑 +1, 지뢰가 다 보이고, 0.7초 뒤 다음 판(7×7·8). 판은 끝나지 않는다 */
  const m2 = firstMine(w);
  assert.equal(w.__ev('reveal(' + m2 + ')'), true);
  assert.equal(st.boom, 1); assert.equal(st.boomAt, m2); assert.equal(st.showMines, true); assert.equal(st.flash, '펑!');
  assert.equal(el(w, 'booms').textContent, '1'); assert.equal(st.running, true); assert.equal(st.done, false);
  assert.equal(w.__ev('flag(0)'), false, '펑 직후엔 입력 무시');
  await tick(750);
  assert.equal(st.bi, 2); assert.equal(N(w), 7); assert.equal(mines(w).filter(Boolean).length, 8); assert.equal(st.cleared, 1);
  assert.equal(st.showMines, false); assert.equal(el(w, 'mcount').textContent, '8');

  /* 60초 끝: 다음 입력에서 끝난다. 기록 = 푼 판 1, 봉인. 링크에 s·l·b */
  w.__ev('state.t0 = performance.now() - 60000');
  assert.equal(w.__ev('reveal(' + firstMine(w) + ')'), false, '시간이 끝나면 입력이 아니라 종료');
  assert.equal(st.done, true); assert.equal(st.running, false);
  assert.equal(st.ms, 1, '기록 = 푼 판 수'); assert.equal(st.boom, 1);
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.b, 1);
  assert.equal(p.x, (1 + p.k * 7) % 1000003, '봉인값 = 푼 판 수');

  /* 받는 쪽: 같은 시드로 같은 판 순서. 두 판 풀고(2판째도 같은 판) 시간 끝 → 받는 쪽 승 */
  const g = load('mines', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(mines(g), a); assert.equal(gs.start, s0);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  solveBoard(g); await tick(400);
  assert.deepEqual(mines(g), board2, '2판째도 같은 판');
  solveBoard(g); await tick(400);
  assert.equal(gs.cleared, 2); assert.equal(gs.bi, 2);
  g.__ev('state.t0 = performance.now() - 60000'); g.__ev('endPlay()');
  assert.equal(gs.ms, 2);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 풀었어/);
  assert.match(el(g, 'subVerdict').textContent, /2판 vs 1판 — 내가 1판 더 풀었어/);
  assert.match(el(g, 'tA').textContent, /2판/); assert.match(el(g, 'tB').textContent, /1판/);
  assert.match(el(g, 'dA').textContent, /한 번도 안 밟았어/); assert.match(el(g, 'dB').textContent, /펑 1번/);
  g.close();

  /* 동점: 푼 판이 같으면 덜 밟은 쪽이 이긴다 */
  const t = load('mines', '').window;
  t.__ev('Duel.renderResult({hist:[["A",2,"B",2,"ida","idb",3,1]],round:["A",2,"B",2,"ida","idb",3,1],viewer:"b"})');
  assert.match(el(t, 'verdict').textContent, /내가 더 풀었어/);
  assert.match(el(t, 'subVerdict').textContent, /덜 밟은 쪽이 이겨/);
  t.__ev('Duel.renderResult({hist:[["A",2,"B",2,"ida","idb",1,1]],round:["A",2,"B",2,"ida","idb",1,1],viewer:"b"})');
  assert.match(el(t, 'verdict').textContent, /완전 똑같아/);
  t.close(); w.close();

  /* ===== 혼자놀기 ===== */
  const s = load('mines', '?solo=1').window;
  const ss = s.__ev('state'), sd = s.document;
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('mines', 1));
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true);
  assert.match(el(s, 'soloHud').textContent, /Lv1/); assert.equal(el(s, 'clock').textContent, '60.0');
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 3), 3); assert.equal(s.Solo.starsFor(L, 2), 2); assert.equal(s.Solo.starsFor(L, 1), 1); assert.equal(s.Solo.starsFor(L, 0), 0);
  /* 클리어: 한 판 풀고 60초 끝 → ★ 이상, 저장, Lv2 해제, 도전장 링크 */
  const seedLv1 = ss.seed;
  s.__ev('startPlay()'); solveBoard(s); await tick(400);
  assert.equal(ss.cleared, 1);
  s.__ev('state.t0 = performance.now() - 60000'); s.__ev('endPlay()');
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★☆☆'); assert.match(res.querySelector('.rec').textContent, /기록 1판/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/mines/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.mines['1'].stars, 1); assert.equal(saved.mines['1'].best, 1);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  /* 다음 레벨: 새 시드, 실패(0판) → ☆☆☆ */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  s.__ev('startPlay()'); s.__ev('state.t0 = performance.now() - 60000'); s.__ev('endPlay()');
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true);
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드의 둘이하기 첫 판, 링크에 l, 받는 쪽도 같은 판 */
  const duel = load('mines', '?s=' + seedLv1 + '&l=1').window;
  const ds = duel.__ev('state');
  assert.equal(duel.Solo.active, false); assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1);
  const pm = mines(duel);
  duel.__ev('startPlay()'); duel.__ev('state.t0 = performance.now() - 60000'); duel.__ev('endPlay()');
  const p2 = pay(duel); assert.equal(p2.s, seedLv1); assert.equal(p2.l, 1);
  const guest = load('mines', new URL(duel.Duel.url()).hash).window;
  assert.deepEqual(mines(guest), pm); assert.equal(guest.__ev('state.level'), 1);
  guest.close(); duel.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('지뢰찾기 미니 검사 통과 — 시드 판 순서·시작 칸 홍수 열기·깃발·코드·클리어→다음 판·펑→다음 판·60초 봉인(s·l·b)·같은 판 복원·많이 푼 쪽 승·동점 덜 밟은 쪽·혼자놀기');
})().catch(e => { console.error(e); process.exit(1); });
