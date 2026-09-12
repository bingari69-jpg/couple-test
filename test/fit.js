/* 끼워넣기 — 시드 고정 조각 순서(8×8, 3개씩), 놓기·회전·줄 지움 점수, 더 놓을 곳 없으면 끝, 60초 끝,
   점수 봉인(링크에 s·l·c), 같은 조각 복원, 높은 쪽 승, 줄 수 동점 처리, 혼자놀기 레벨·별·프리셋 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const tray = w => JSON.parse(w.__ev('JSON.stringify(state.tray)'));
const grid = w => JSON.parse(w.__ev('JSON.stringify(state.g)'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const cells = m => m.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0);
/* 트레이의 조각 하나를 맞는 첫 자리에 놓는다. 못 놓으면 false */
const placeAny = w => {
  const t = tray(w);
  for (let i = 0; i < 3; i++) { if (!t[i]) continue; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (w.__ev(`fits(state.tray[${i}].m,${r},${c})`)) return w.__ev(`placeAt(${i},${r},${c})`); }
  return false;
};
/* 판을 직접 채운다: rows/cols 에 든 줄을 채우되 (0,0) 은 비운다 */
const fillExcept = (w, fillRows, fillCols) => {
  w.__ev(`(()=>{ for(let r=0;r<8;r++)for(let c=0;c<8;c++) state.g[r][c]=null;
    for(const r of ${JSON.stringify(fillRows)}) for(let c=0;c<8;c++) state.g[r][c]='#111';
    for(const c of ${JSON.stringify(fillCols)}) for(let r=0;r<8;r++) state.g[r][c]='#111';
    state.g[0][0]=null; })()`);
};
/* 바둑판 무늬로 채우고 (0,0) 만 비운다: 꽉 찬 줄이 없고 2×2 는 어디에도 못 들어간다 */
const checker = w => w.__ev(`(()=>{ for(let r=0;r<8;r++)for(let c=0;c<8;c++) state.g[r][c]=(r+c)%2?null:'#111'; state.g[0][0]=null; })()`);
const setTray = (w, ms) => w.__ev(`state.tray=${JSON.stringify(ms)}.map(m=>m?{m,c:'#abc'}:null)`);
const ONE = [[1]], SQ = [[1, 1], [1, 1]];

(async () => {
  /* 첫 진입: 빈 8×8 판, 조각 3개, 덮개, 레벨 0 */
  const w = load('fit', '').window;
  const st = w.__ev('state'), d = w.document;
  assert.equal(grid(w).length, 8); assert.ok(grid(w).every(r => r.length === 8 && r.every(v => v === null)));
  assert.equal(tray(w).length, 3); assert.ok(tray(w).every(p => p && p.m.length));
  assert.equal(el(w, 'cover').classList.contains('hidden'), false); assert.equal(st.level, 0);
  assert.equal(el(w, 'clock').textContent, '60.0'); assert.equal(el(w, 'score').textContent, '0');
  assert.equal(d.querySelector('#board canvas').id, 'cv');

  /* 같은 시드 → 같은 조각, 다른 시드 → 다른 조각. 새로 채운 3개도 같은 순서 */
  st.seed = 12345; w.__ev('buildBoard()'); const a = tray(w);
  const w2 = load('fit', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(tray(w2), a, '같은 시드는 같은 조각');
  w2.__ev('refill()'); w.__ev('refill()'); assert.deepEqual(tray(w2), tray(w), '다음 3개도 같다');
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(tray(w2), a, '다른 시드는 다른 조각');
  w2.close();
  w.__ev('buildBoard()'); assert.deepEqual(tray(w), a);

  /* 레벨이 높을수록 큰 조각이 더 자주 나온다 (같은 난수열, 300개 평균) */
  const avg = lv => w.__ev(`(()=>{const r=mulberry32(7);let s=0;for(let i=0;i<300;i++)s+=cellsOf(SHAPES[pickIdx(r,${lv})].m);return s/300})()`);
  assert.ok(avg(5) > avg(2) && avg(2) > avg(0), '레벨별 평균 칸 수: ' + [avg(0), avg(2), avg(5)].join(' < '));

  /* 시작 전에는 놓이지도 돌지도 않는다 */
  assert.equal(w.__ev('placeAt(0,0,0)'), false); assert.equal(w.__ev('rotateTray(0)'), false);
  assert.equal(st.pieces, 0); assert.deepEqual(tray(w), a);

  /* 시작: 첫 조각을 (0,0) 에 놓으면 칸 수만큼 점수, 트레이 자리가 비고 판에 색이 찍힌다 */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(tray(w), a);
  const p0 = a[0], n0 = cells(p0.m);
  assert.equal(w.__ev('placeAt(0,0,0)'), true);
  assert.equal(st.score, n0); assert.equal(st.pieces, 1); assert.equal(tray(w)[0], null);
  assert.equal(el(w, 'score').textContent, String(n0)); assert.equal(el(w, 'pieces').textContent, '1');
  let painted = 0; grid(w).forEach(r => r.forEach(v => { if (v) painted++; })); assert.equal(painted, n0);
  assert.equal(w.__ev('placeAt(0,0,0)'), false, '빈 트레이 자리는 못 놓음');
  assert.equal(w.__ev('placeAt(1,0,0)'), false, '이미 찬 칸에는 못 놓음');
  assert.equal(w.__ev('placeAt(1,7,7)'), cells(a[1].m) === 1, '판 밖으로 나가면 못 놓음');

  /* 회전: 2×3 → 3×2 (열을 뒤집어 세운다), 1×1 은 그대로 */
  setTray(w, [[[1, 1, 1], [0, 1, 0]], ONE, SQ]);
  w.__ev('rotateTray(0)'); assert.deepEqual(tray(w)[0].m, [[0, 1], [1, 1], [0, 1]]);
  w.__ev('rotateTray(1)'); assert.deepEqual(tray(w)[1].m, ONE);

  /* 줄 지움: 0행이 한 칸 빼고 찼을 때 1×1 을 놓으면 1 + 8 = 9점, 줄 1, 그 줄은 비워진다 */
  fillExcept(w, [0], []); setTray(w, [ONE, SQ, SQ]);
  const s1 = st.score;
  assert.equal(w.__ev('placeAt(0,0,0)'), true);
  assert.equal(st.score, s1 + 9); assert.equal(st.lines, 1); assert.equal(el(w, 'lines').textContent, '1');
  assert.ok(grid(w)[0].every(v => v === null), '지운 줄은 빈다');
  assert.equal(st.flash.length, 1);

  /* 여러 줄 보너스: 0행·0열이 (0,0) 만 남았을 때 1×1 → 1 + 16 + 10 = 27점, 줄 +2 */
  fillExcept(w, [0], [0]); setTray(w, [ONE, SQ, SQ]);
  const s2 = st.score;
  assert.equal(w.__ev('placeAt(0,0,0)'), true);
  assert.equal(st.score, s2 + 27); assert.equal(st.lines, 3);
  assert.ok(grid(w).every(r => r.every(v => v === null)), '가로·세로 다 비움');

  /* 다 쓰면 새 조각 3개가 시드 순서대로 온다 */
  w.__ev('state.g=Array.from({length:8},()=>Array(8).fill(null))'); setTray(w, [ONE, null, null]);
  const seedRnd = w.__ev('(()=>{const r=mulberry32(12345);const out=[];for(let i=0;i<9;i++)out.push(pickIdx(r,0));return JSON.stringify(out)})()');
  w.__ev('placeAt(0,3,3)');
  assert.ok(tray(w).every(p => p), '새 조각 3개');
  const idx6 = JSON.parse(seedRnd).slice(6, 9);
  w.__ev('state.seed=12345; buildBoard(); refill(); refill()');   // 시드에서 7~9번째 = 세 번째 트레이
  assert.deepEqual(tray(w).map(p => p.m), idx6.map(i => JSON.parse(w.__ev(`JSON.stringify(SHAPES[${i}].m)`))), '세 번째 트레이도 시드 순서');

  /* 더 놓을 곳이 없으면 끝: 바둑판 무늬에 트레이가 1×1·2×2·2×2 → 1×1 을 (0,0) 에 놓으면 남은 2×2 가 안 들어가 끝 */
  w.__ev('startPlay()'); w.__ev('state.score=100; state.lines=5');
  checker(w); setTray(w, [ONE, SQ, SQ]);
  assert.equal(st.done, false);
  assert.equal(w.__ev('placeAt(0,0,0)'), true);
  assert.equal(st.done, true); assert.equal(st.running, false);
  assert.match(el(w, 'cdSub').textContent, /더 놓을 곳이 없어요/);
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  /* 봉인값 = 점수(100 + 놓은 칸 1). 줄은 안 지워졌다 */
  assert.equal(st.ms, 101); assert.equal(st.lines, 5);
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.c, 5);
  assert.equal(p.x, (st.ms + p.k * 7) % 1000003, '봉인값 = 점수');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);
  assert.equal(w.__ev('placeAt(1,0,0)'), false, '끝난 뒤에는 안 놓임');

  /* 시간 끝: 60초가 지나면 그때까지 점수로 봉인 */
  const t = load('fit', '').window; const ts = t.__ev('state');
  t.__ev('startPlay()'); placeAny(t);
  t.__ev('state.t0 = performance.now() - 60000'); t.__ev('clockTick()');
  assert.equal(ts.done, true); assert.equal(ts.ms, ts.score); assert.ok(ts.ms > 0);
  assert.equal(el(t, 'clock').textContent, '0.0'); assert.match(el(t, 'cdSub').textContent, /^기록 봉인$/);
  t.close();

  /* 받는 쪽: 같은 시드로 같은 조각. 조각 하나만 놓고 시간 끝 → 점수가 낮아 짐 */
  const g = load('fit', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(tray(g), a);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()'); assert.deepEqual(tray(g), a);
  placeAny(g); const gScore = gs.score; assert.ok(gScore > 0 && gScore < st.ms);
  g.__ev('state.t0 = performance.now() - 60000'); g.__ev('clockTick()');
  assert.equal(gs.ms, gScore);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /상대가 더 채웠어/);
  assert.match(el(g, 'subVerdict').textContent, new RegExp(gScore + '점 vs ' + st.ms + '점 — 상대가 ' + (st.ms - gScore) + '점 더 냈어'));
  assert.match(el(g, 'tA').textContent, new RegExp('^' + gScore + '점')); assert.match(el(g, 'tB').textContent, new RegExp('^' + st.ms + '점'));
  assert.match(el(g, 'dB').textContent, /줄 5개 지움/);
  g.close();

  /* 동점: 점수가 같으면 줄을 더 많이 지운 쪽이 이긴다 (같은 점수, 받는 쪽은 줄 없이) */
  const g2 = load('fit', new URL(link).hash).window; const g2s = g2.__ev('state');
  g2.__ev('startPlay()'); g2.__ev(`state.score=${st.ms}; state.lines=0`);
  g2.__ev('state.t0 = performance.now() - 60000'); g2.__ev('clockTick()');
  assert.equal(g2s.ms, st.ms);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /상대가 더 채웠어/);
  assert.match(el(g2, 'subVerdict').textContent, /줄을 더 많이 지운 쪽이 이겨/);
  g2.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 고정 시드, 둘이하기 UI 숨김 */
  const s = load('fit', '?solo=1').window;
  const sd = s.document, ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('fit', 1));
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  assert.match(el(s, 'soloDesc').textContent, /클리어 60점/); assert.match(el(s, 'soloDesc').textContent, /★★★ 96점/);
  assert.match(el(s, 'rule').textContent, /Lv1/);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 96), 3); assert.equal(s.Solo.starsFor(L, 80), 2); assert.equal(s.Solo.starsFor(L, 60), 1); assert.equal(s.Solo.starsFor(L, 59), 0);
  const seedLv1 = ss.seed;

  /* 클리어: 줄을 여러 번 지워 96점 이상 → ★★★, 저장, Lv2 해제, 도전장 링크. 봉인 카드는 없음 */
  s.__ev('startPlay()');
  while (ss.score < 96) { fillExcept(s, [0], []); setTray(s, [ONE, SQ, SQ]); s.__ev('placeAt(0,0,0)'); }
  assert.equal(ss.done, false);
  s.__ev('state.t0 = performance.now() - 60000'); s.__ev('clockTick()');
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, new RegExp(ss.score + '점'));
  assert.match(res.querySelector('.rec').textContent, /줄 \d+개/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/fit/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.fit['1'].stars, 3); assert.equal(saved.fit['1'].best, ss.score);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 새 시드, 결과 카드 사라짐. 막혀서 끝(점수 낮음) → 별 0 */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(s, 'soloResult'), null);
  assert.equal(el(s, 'clock').textContent, '60.0');
  s.__ev('startPlay()');
  checker(s); setTray(s, [ONE, SQ, SQ]); s.__ev('placeAt(0,0,0)');
  assert.equal(ss.done, true);
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, /막혀서 끝/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판, 링크에 l 이 실리고 받는 쪽도 같은 레벨·조각 */
  const du = load('fit', '?s=' + seedLv1 + '&l=1').window;
  const ds = du.__ev('state');
  assert.equal(du.Solo.active, false); assert.equal(el(du, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.match(el(du, 'rule').textContent, /Lv1/);
  assert.equal(el(du, 'nameIn').classList.contains('hidden'), false, '둘이하기 UI 그대로');
  du.__ev('startPlay()'); placeAny(du);
  du.__ev('state.t0 = performance.now() - 60000'); du.__ev('clockTick()');
  const dp = pay(du); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('fit', new URL(du.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1);
  du.__ev('buildBoard()'); assert.deepEqual(tray(guest), tray(du));
  guest.close(); du.close();

  /* 보통 둘이하기(프리셋 없음)의 링크 l 은 0 */
  const plain = load('fit', '').window;
  plain.__ev('startPlay()'); plain.__ev('state.t0 = performance.now() - 60000'); plain.__ev('clockTick()');
  assert.equal(pay(plain).l, 0); plain.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('끼워넣기 검사 통과 — 시드 조각·레벨별 조각 크기·놓기·회전·줄 지움 점수·여러 줄 보너스·새 조각·막힘 끝·시간 끝·점수 봉인(s·l·c)·같은 조각 복원·높은 쪽 승·줄 수 동점 처리·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
