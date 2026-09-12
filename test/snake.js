/* 스네이크 20초 — 시드 고정 지렁이 자리(12×16), 가운데 출발(길이 3, 오른쪽), 180° 회전 금지, 벽·몸 충돌은 끝이 아니라 부딪힘+재출발,
   먹을수록 빨라짐, 20초 끝에 먹은 수 봉인(링크에 s·l·c=[부딪힘,최장]), 같은 지렁이 복원, 많이 먹은 쪽 승, 덜 부딪힌 쪽 동점 처리, 혼자놀기 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const COLS = 12, ROWS = 16;
const snake = w => JSON.parse(w.__ev('JSON.stringify(state.snake)'));
const food = w => JSON.parse(w.__ev('JSON.stringify(state.food)'));
const foodLog = w => JSON.parse(w.__ev('JSON.stringify(state.foodLog)'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
const DXY = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
/* 지렁이 쪽으로 한 칸: 큰 축 먼저, 180° 와 벽·몸은 피한다 */
const toward = w => {
  const body = snake(w), [hx, hy] = body[0], [fx, fy] = food(w), dir = w.__ev('state.dir');
  const dx = fx - hx, dy = fy - hy;
  const h = dx > 0 ? 'R' : dx < 0 ? 'L' : null, v = dy > 0 ? 'D' : dy < 0 ? 'U' : null;
  const pref = (Math.abs(dx) >= Math.abs(dy) ? [h, v] : [v, h]).concat(['U', 'D', 'L', 'R']).filter(Boolean);
  const safe = x => { const nx = hx + DXY[x][0], ny = hy + DXY[x][1]; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return false; return !body.slice(0, -1).some(s => s[0] === nx && s[1] === ny); };
  const d = pref.find(x => x !== OPP[dir] && safe(x)) || pref.find(x => x !== OPP[dir]);
  w.__ev(`setDir("${d}")`); w.__ev('step()');
};
/* 지렁이 하나를 먹을 때까지 */
const eatOne = w => { const n = w.__ev('state.eaten'); let guard = 0; while (w.__ev('state.eaten') === n && !w.__ev('state.done') && guard++ < 80) toward(w); assert.equal(w.__ev('state.eaten'), n + 1, '지렁이를 먹음'); };
/* 지렁이가 없는 직선으로 벽까지 달려 부딪힌다 (부딪힘 1번 늘고 계속 진행) */
const crash = w => {
  const [hx, hy] = snake(w)[0], [fx, fy] = food(w), dir = w.__ev('state.dir'), c = w.__ev('state.crash');
  const clear = { U: fx !== hx || fy > hy, D: fx !== hx || fy < hy, L: fy !== hy || fx > hx, R: fy !== hy || fx < hx };
  const d = ['U', 'D', 'L', 'R'].find(x => x !== OPP[dir] && clear[x]);
  w.__ev(`setDir("${d}")`); let guard = 0; while (w.__ev('state.crash') === c && !w.__ev('state.done') && guard++ < 20) w.__ev('step()');
  assert.equal(w.__ev('state.crash'), c + 1, '벽에 부딪힘');
};
/* 검사에서는 step() 으로만 움직인다 — 진짜 타이머 사슬은 끊는다 */
const start = w => w.__ev('startPlay(); clearTimeout(state.tickTimer)');
const timeUp = w => { w.__ev('state.t0 = performance.now() - 20000'); w.__ev('step()'); assert.equal(w.__ev('state.done'), true); };

(async () => {
  /* 첫 진입: 캔버스 판, 병아리 3칸(가운데, 머리가 오른쪽), 지렁이 하나, 덮개 */
  const w = load('snake', '').window;
  const st = w.__ev('state'), d = w.document;
  assert.ok(el(w, 'cv'), '캔버스 판'); assert.equal(w.__ev('COLS'), 12); assert.equal(w.__ev('ROWS'), 16);
  assert.deepEqual(snake(w), [[6, 8], [5, 8], [4, 8]]); assert.equal(st.dir, 'R');
  assert.ok(Array.isArray(food(w)) && food(w).length === 2, '지렁이 자리');
  assert.equal(el(w, 'cover').classList.contains('hidden'), false); assert.equal(st.level, 0);

  /* 같은 시드 → 같은 지렁이 자리, 다른 시드 → 다른 자리. 첫 자리는 몸 밖 */
  st.seed = 12345; w.__ev('buildBoard()'); const f0 = food(w);
  const w2 = load('snake', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(food(w2), f0, '같은 시드는 같은 자리');
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(food(w2), f0, '다른 시드는 다른 자리');
  w2.close();
  assert.ok(f0[0] >= 0 && f0[0] < COLS && f0[1] >= 0 && f0[1] < ROWS);
  assert.ok(!snake(w).some(s => s[0] === f0[0] && s[1] === f0[1]), '지렁이는 빈 칸');

  /* 시작 전에는 방향도 걸음도 안 바뀐다 */
  assert.equal(w.__ev('setDir("U")'), false); w.__ev('step()'); assert.deepEqual(snake(w)[0], [6, 8]);

  /* 시작: 한 칸씩 오른쪽으로. 180° 회전(L)은 무시, 위(U)는 됨. 출발 속도 0.15초 */
  start(w);
  assert.equal(st.running, true); assert.deepEqual(food(w), f0); assert.equal(w.__ev('tickMs()'), 150);
  w.__ev('step()'); assert.deepEqual(snake(w), [[7, 8], [6, 8], [5, 8]]);
  assert.equal(w.__ev('setDir("L")'), false, '180° 회전 금지'); assert.equal(st.pending, 'R');
  w.__ev('step()'); assert.deepEqual(snake(w)[0], [8, 8]);
  assert.equal(w.__ev('setDir("U")'), true);
  assert.equal(w.__ev('setDir("D")'), true, '아직 안 움직였으면 위→아래로 바꿔도 됨(마지막으로 움직인 방향은 오른쪽)');
  assert.equal(w.__ev('setDir("L")'), false, '한 칸 안에서 위·아래 거쳐도 180° 는 안 됨');
  w.__ev('setDir("U")'); w.__ev('step()'); assert.deepEqual(snake(w)[0], [8, 7]); assert.equal(st.dir, 'U');
  assert.equal(w.__ev('setDir("D")'), false, '위로 가는 중엔 아래 금지');

  /* 지렁이 두 마리: 길이가 늘고, 빨라지고, 다음 자리는 시드 순서의 다음 빈 칸 */
  eatOne(w); assert.equal(snake(w).length, 4); assert.equal(el(w, 'score').textContent, '1'); assert.equal(el(w, 'len').textContent, '4');
  assert.equal(w.__ev('tickMs()'), 146, '한 마리에 4ms 빨라짐');
  assert.ok(!snake(w).some(s => s[0] === food(w)[0] && s[1] === food(w)[1]), '새 지렁이도 빈 칸');
  assert.equal(foodLog(w).length, 2);
  eatOne(w); assert.equal(st.eaten, 2); assert.equal(snake(w).length, 5); assert.equal(st.maxLen, 5);
  assert.equal(w.__ev('state.eaten=30; tickMs()'), 95, '최소 95ms'); w.__ev('state.eaten=2');

  /* 벽 충돌: 끝나지 않는다 — 부딪힘 1, 빨간 번쩍, 가운데서 3칸으로 재출발, 먹은 수·시간 유지 */
  crash(w);
  assert.equal(st.done, false); assert.equal(st.running, true); assert.equal(st.crash, 1);
  assert.deepEqual(snake(w), [[6, 8], [5, 8], [4, 8]]); assert.equal(st.dir, 'R');
  assert.equal(st.eaten, 2); assert.equal(el(w, 'crash').textContent, '1'); assert.equal(el(w, 'len').textContent, '3');
  assert.equal(el(w, 'board').classList.contains('flash'), true, '빨간 번쩍');
  await tick(260); assert.equal(el(w, 'board').classList.contains('flash'), false);
  assert.equal(st.maxLen, 5, '최장 길이는 남는다');
  w.__ev('step()'); assert.deepEqual(snake(w)[0], [7, 8], '계속 진행');

  /* 몸 충돌도 같다: 작은 원을 그리면 머리가 몸을 만난다 */
  eatOne(w); eatOne(w);                              // 길이 5
  const before = st.crash;
  const path = ['U', 'L', 'D', 'R']; let guard = 0;
  while (st.crash === before && guard++ < 12) { w.__ev(`setDir("${path[guard % 4]}")`); w.__ev('step()'); }
  assert.equal(st.crash, before + 1, '몸에 부딪힘'); assert.equal(st.done, false); assert.equal(st.eaten, 4);

  /* 20초 끝: 그때까지 먹은 수로 봉인. 링크에 시드·레벨·[부딪힘, 최장] */
  timeUp(w);
  assert.equal(st.running, false); assert.equal(st.ms, 4, '기록 = 먹은 수');
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  const frozen = snake(w); w.__ev('step()'); assert.deepEqual(snake(w), frozen, '끝난 뒤에는 안 움직임');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.deepEqual(p.c, [2, 5]);
  assert.equal(p.x, (4 + p.k * 7) % 1000003, '봉인값 = 먹은 수');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);

  /* 받는 쪽: 같은 시드로 같은 지렁이(같은 플레이면 같은 자리 순서). 5마리 먹고 시간 끝 → 받는 쪽 승 */
  const g = load('snake', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(food(g), f0);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  start(g);
  eatOne(g); eatOne(g);
  assert.deepEqual(foodLog(g), foodLog(w).slice(0, 3), '같은 플레이는 같은 자리 순서');
  eatOne(g); eatOne(g); eatOne(g);
  timeUp(g); assert.equal(gs.ms, 5);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 먹었어/);
  assert.match(el(g, 'subVerdict').textContent, /5마리 vs 4마리 — 내가 1마리 더 먹었어/);
  assert.match(el(g, 'tA').textContent, /5마리/); assert.match(el(g, 'tB').textContent, /4마리/);
  assert.match(el(g, 'dA').textContent, /부딪힘 0번 · 최장 8칸/); assert.match(el(g, 'dB').textContent, /부딪힘 2번 · 최장 5칸/);
  g.close();

  /* 동점: 먹은 수가 같으면 덜 부딪힌 쪽이 이긴다 (같은 4마리, 받는 쪽은 1번) */
  const g2 = load('snake', new URL(link).hash).window; const g2s = g2.__ev('state');
  start(g2); eatOne(g2); eatOne(g2); crash(g2); eatOne(g2); eatOne(g2);
  timeUp(g2); assert.equal(g2s.ms, 4); assert.equal(g2s.crash, 1);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /내가 더 먹었어/);
  assert.match(el(g2, 'subVerdict').textContent, /덜 부딪힌 쪽이 이겨. \(1번 vs 2번\)/);
  g2.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 고정 시드, 출발 0.17초, 둘이하기 UI 숨김 */
  const s = load('snake', '?solo=1').window;
  const sd = s.document, ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('snake', 1));
  assert.equal(s.__ev('baseTick(1)'), 170); assert.equal(s.__ev('baseTick(5)'), 105); assert.equal(s.__ev('baseTick(0)'), 150);
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  assert.match(el(s, 'soloDesc').textContent, /클리어 5마리/); assert.match(el(s, 'soloDesc').textContent, /★★★ 9마리/);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 9), 3); assert.equal(s.Solo.starsFor(L, 7), 2); assert.equal(s.Solo.starsFor(L, 5), 1); assert.equal(s.Solo.starsFor(L, 4), 0);
  const seedLv1 = ss.seed;

  /* 클리어: 9마리 먹고(중간에 한 번 부딪혀도) 시간 끝 → ★★★, 저장, Lv2 해제, 도전장 링크. 봉인 카드는 없음 */
  start(s);
  for (let i = 0; i < 5; i++) eatOne(s);
  crash(s); assert.equal(ss.done, false, '부딪혀도 안 끝남');
  for (let i = 0; i < 4; i++) eatOne(s);
  timeUp(s);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /9마리/); assert.match(res.querySelector('.rec').textContent, /부딪힘 1번/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/snake/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.snake['1'].stars, 3); assert.equal(saved.snake['1'].best, 9);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 새 시드, 결과 카드 사라짐. 2마리에 시간 끝 → 별 0 */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  assert.equal(el(s, 'speed').textContent, '한 칸 0.15초');
  start(s); eatOne(s); eatOne(s); timeUp(s);
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, /2마리/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판, 링크에 l 이 실리고 받는 쪽도 같은 레벨·지렁이 */
  const du = load('snake', '?s=' + seedLv1 + '&l=1').window;
  const ds = du.__ev('state');
  assert.equal(du.Solo.active, false); assert.equal(el(du, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.equal(el(du, 'speed').textContent, '한 칸 0.17초');
  start(du); eatOne(du); timeUp(du);
  const dp = pay(du); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('snake', new URL(du.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(food(guest), foodLog(du).length ? [foodLog(du)[0] % COLS, Math.floor(foodLog(du)[0] / COLS)] : null);
  guest.close(); du.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('스네이크 20초 검사 통과 — 시드 지렁이(12×16)·출발 자리·180° 금지·먹을수록 빨라짐·벽/몸 충돌은 재출발·20초 끝에 봉인(s·l·c)·같은 자리 복원·많이 먹은 쪽 승·부딪힘 동점 처리·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
