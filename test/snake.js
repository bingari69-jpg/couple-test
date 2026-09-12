/* 스네이크 20초 — 시드 고정 먹이 순서, 가운데 출발(길이 3, 오른쪽), 180° 회전 금지, 벽·몸 충돌로 끝, 먹이 수 봉인(링크에 s·l·a), 같은 먹이 복원, 많이 먹은 쪽 승, 혼자놀기 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const foods = w => JSON.parse(w.__ev('JSON.stringify(state.foods)'));
const snake = w => JSON.parse(w.__ev('JSON.stringify(state.snake)'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
/* 먹이 쪽으로 한 칸: 큰 축 먼저, 180° 와 벽·몸은 피한다 */
const DXY = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const toward = w => {
  const body = snake(w), [hx, hy] = body[0], f = w.__ev('state.food'), fx = f % 12, fy = Math.floor(f / 12), dir = w.__ev('state.dir');
  const dx = fx - hx, dy = fy - hy;
  const h = dx > 0 ? 'R' : dx < 0 ? 'L' : null, v = dy > 0 ? 'D' : dy < 0 ? 'U' : null;
  const pref = (Math.abs(dx) >= Math.abs(dy) ? [h, v] : [v, h]).concat(['U', 'D', 'L', 'R']).filter(Boolean);
  const safe = x => { const nx = hx + DXY[x][0], ny = hy + DXY[x][1]; if (nx < 0 || ny < 0 || nx >= 12 || ny >= 12) return false; return !body.slice(0, -1).some(s => s[0] === nx && s[1] === ny); };
  const d = pref.find(x => x !== OPP[dir] && safe(x)) || pref.find(x => x !== OPP[dir]);
  w.__ev(`setDir("${d}")`); w.__ev('step()');
};
/* 먹이가 없는 직선으로 벽까지 달려 부딪힌다 */
const crash = w => {
  const [hx, hy] = snake(w)[0], f = w.__ev('state.food'), fx = f % 12, fy = Math.floor(f / 12), dir = w.__ev('state.dir');
  const clear = { U: fx !== hx || fy > hy, D: fx !== hx || fy < hy, L: fy !== hy || fx > hx, R: fy !== hy || fx < hx };
  const d = ['U', 'D', 'L', 'R'].find(x => x !== OPP[dir] && clear[x]);
  w.__ev(`setDir("${d}")`); let guard = 0; while (!w.__ev('state.done') && guard++ < 20) w.__ev('step()');
  assert.equal(w.__ev('state.done'), true, '벽에 부딪혀 끝');
};
/* 먹이 하나를 먹을 때까지 */
const eatOne = w => { const n = w.__ev('state.eaten'); let guard = 0; while (w.__ev('state.eaten') === n && !w.__ev('state.done') && guard++ < 60) toward(w); assert.equal(w.__ev('state.eaten'), n + 1, '먹이를 먹음'); };

(async () => {
  /* 첫 진입: 12×12 칸, 뱀 3칸(가운데, 머리가 오른쪽), 먹이 하나, 덮개 */
  const w = load('snake', '').window;
  const st = w.__ev('state'), d = w.document;
  assert.equal(d.querySelectorAll('#grid .cell').length, 144);
  assert.deepEqual(snake(w), [[6, 6], [5, 6], [4, 6]]); assert.equal(st.dir, 'R');
  assert.equal(d.querySelectorAll('#grid .cell.h').length, 1); assert.equal(d.querySelectorAll('#grid .cell.s').length, 2);
  assert.equal(d.querySelectorAll('#grid .cell.f').length, 1);
  assert.equal(el(w, 'cover').classList.contains('hidden'), false); assert.equal(st.level, 0);
  assert.equal(st.foods.length, 400);

  /* 같은 시드 → 같은 먹이 순서, 다른 시드 → 다른 순서. 첫 먹이는 뱀이 없는 칸 */
  st.seed = 12345; w.__ev('buildBoard()'); const a = foods(w), f0 = st.food;
  const w2 = load('snake', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(foods(w2), a, '같은 시드는 같은 먹이 순서'); assert.equal(w2.__ev('state.food'), f0);
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(foods(w2), a, '다른 시드는 다른 순서');
  w2.close();
  assert.ok(a.every(i => i >= 0 && i < 144));
  assert.ok(!snake(w).some(s => s[1] * 12 + s[0] === f0), '먹이는 빈 칸');

  /* 시작 전에는 방향도 걸음도 안 바뀐다 */
  assert.equal(w.__ev('setDir("U")'), false); w.__ev('step()'); assert.deepEqual(snake(w)[0], [6, 6]);

  /* 시작: 한 칸씩 오른쪽으로. 180° 회전(L)은 무시, 위(U)는 됨 */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(foods(w), a);
  w.__ev('step()'); assert.deepEqual(snake(w), [[7, 6], [6, 6], [5, 6]]);
  assert.equal(w.__ev('setDir("L")'), false, '180° 회전 금지'); assert.equal(st.pending, 'R');
  w.__ev('step()'); assert.deepEqual(snake(w)[0], [8, 6]);
  assert.equal(w.__ev('setDir("U")'), true);
  assert.equal(w.__ev('setDir("D")'), true, '아직 안 움직였으면 위→아래로 바꿔도 됨(마지막으로 움직인 방향은 오른쪽)');
  assert.equal(w.__ev('setDir("L")'), false, '한 칸 안에서 위·아래 거쳐도 180° 는 안 됨');
  w.__ev('setDir("U")'); w.__ev('step()'); assert.deepEqual(snake(w)[0], [8, 5]); assert.equal(st.dir, 'U');
  assert.equal(w.__ev('setDir("D")'), false, '위로 가는 중엔 아래 금지');

  /* 먹이 두 개 먹기: 길이가 늘고 다음 먹이는 목록의 다음 빈 칸 */
  eatOne(w); assert.equal(snake(w).length, 4); assert.equal(el(w, 'score').textContent, '1'); assert.equal(el(w, 'len').textContent, '4');
  const idxAfter = st.foodIdx;
  assert.ok(!snake(w).some(s => s[1] * 12 + s[0] === st.food), '새 먹이도 빈 칸');
  assert.equal(st.food, a.slice(0, idxAfter).reverse()[0], '먹이 = 목록의 다음 칸');
  eatOne(w); assert.equal(st.eaten, 2); assert.equal(snake(w).length, 5);

  /* 벽 충돌: 위로 계속 가면 끝. 기록 = 먹은 2개, 산 시간 < 20초, 봉인 */
  crash(w); let guard = 0;
  assert.equal(st.running, false);
  assert.equal(st.ms, 2, '기록 = 먹은 수'); assert.ok(st.alive > 0 && st.alive < 20000, '산 시간: ' + st.alive);
  assert.equal(d.querySelectorAll('#grid .cell.x').length, 1, '부딪힌 칸 표시');
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  const before = snake(w); w.__ev('step()'); assert.deepEqual(snake(w), before, '끝난 뒤에는 안 움직임');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.a, st.alive);
  assert.equal(p.x, (2 + p.k * 7) % 1000003, '봉인값 = 먹은 수');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);

  /* 몸 충돌: 작은 원을 그리면 자기 몸에 부딪힌다 */
  const b = load('snake', '').window; const bs = b.__ev('state');
  b.__ev('startPlay()');
  eatOne(b); eatOne(b);                              // 길이 5
  const path = ['U', 'L', 'D', 'R'];                 // 2×2 로 돌면 머리가 몸을 만난다
  guard = 0;
  while (!bs.done && guard++ < 12) { const dd = path[guard % 4]; b.__ev(`setDir("${dd}")`); b.__ev('step()'); }
  assert.equal(bs.done, true, '몸에 부딪혀 끝'); assert.equal(bs.ms, 2); assert.ok(bs.alive < 20000);
  b.close();

  /* 시간 끝: 20초가 지나면 그때까지 먹은 수로 봉인, 산 시간 = 20000 */
  const t = load('snake', '').window; const ts = t.__ev('state');
  t.__ev('startPlay()'); t.__ev('state.t0 = performance.now() - 20000'); t.__ev('step()');
  assert.equal(ts.done, true); assert.equal(ts.alive, 20000); assert.match(el(t, 'cdSub').textContent, /기록 봉인/);
  t.close();

  /* 받는 쪽: 같은 시드로 같은 먹이. 3개 먹고 벽에 부딪힘 → 받는 쪽 승 */
  const g = load('snake', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(foods(g), a); assert.equal(gs.food, f0);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  eatOne(g); eatOne(g); eatOne(g);
  crash(g); assert.equal(gs.ms, 3);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 먹었어/);
  assert.match(el(g, 'subVerdict').textContent, /3개 vs 2개 — 내가 1개 더 먹었어/);
  assert.match(el(g, 'tA').textContent, /3개/); assert.match(el(g, 'tB').textContent, /2개/);
  assert.match(el(g, 'dA').textContent, /초 만에 부딪힘/);
  g.close();

  /* 동점: 먹은 수가 같으면 더 오래 산 쪽이 이긴다 (같은 2개, 받는 쪽이 더 오래) */
  const g2 = load('snake', new URL(link).hash).window; const g2s = g2.__ev('state');
  g2.__ev('startPlay()'); eatOne(g2); eatOne(g2);
  g2.__ev('performance.now();performance.now();performance.now();performance.now();performance.now();performance.now()');
  crash(g2); assert.equal(g2s.ms, 2); assert.ok(g2s.alive > st.alive, '받는 쪽이 더 오래 삶: ' + g2s.alive + ' vs ' + st.alive);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /내가 더 먹었어/);
  assert.match(el(g2, 'subVerdict').textContent, /더 오래 산 쪽이 이겨/);
  g2.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 고정 시드, 한 칸 0.17초, 둘이하기 UI 숨김 */
  const s = load('snake', '?solo=1').window;
  const sd = s.document, ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('snake', 1));
  assert.equal(s.__ev('tickMs(1)'), 170); assert.equal(s.__ev('tickMs(5)'), 105); assert.equal(s.__ev('tickMs(0)'), 160);
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  assert.match(el(s, 'soloDesc').textContent, /클리어 5개/); assert.match(el(s, 'soloDesc').textContent, /★★★ 9개/);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 9), 3); assert.equal(s.Solo.starsFor(L, 7), 2); assert.equal(s.Solo.starsFor(L, 5), 1); assert.equal(s.Solo.starsFor(L, 4), 0);
  const seedLv1 = ss.seed;

  /* 클리어: 9개 먹고 벽에 부딪힘 → 부딪혀도 먹은 수로 ★★★, 저장, Lv2 해제, 도전장 링크. 봉인 카드는 없음 */
  s.__ev('startPlay()');
  for (let i = 0; i < 9; i++) eatOne(s);
  assert.equal(ss.done, false);
  crash(s);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /9개/); assert.match(res.querySelector('.rec').textContent, /부딪힘/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/snake/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.snake['1'].stars, 3); assert.equal(saved.snake['1'].best, 9);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 새 시드, 결과 카드 사라짐. 시간 끝(2개) → 별 0 */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  assert.equal(el(s, 'speed').textContent, '한 칸 0.15초');
  s.__ev('startPlay()'); eatOne(s); eatOne(s);
  s.__ev('state.t0 = performance.now() - 20000'); s.__ev('step()');
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, /2개/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판, 링크에 l 이 실리고 받는 쪽도 같은 레벨·먹이 */
  const du = load('snake', '?s=' + seedLv1 + '&l=1').window;
  const ds = du.__ev('state');
  assert.equal(du.Solo.active, false); assert.equal(el(du, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.equal(el(du, 'speed').textContent, '한 칸 0.17초');
  du.__ev('startPlay()'); eatOne(du); crash(du);
  const dp = pay(du); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('snake', new URL(du.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(foods(guest), foods(du));
  guest.close(); du.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('스네이크 20초 검사 통과 — 시드 먹이·출발 자리·180° 금지·먹기·벽/몸 충돌·시간 끝·먹이 수 봉인(s·l·a)·같은 먹이 복원·많이 먹은 쪽 승·산 시간 동점 처리·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
