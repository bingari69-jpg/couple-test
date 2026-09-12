/* 블록 쌓기 — 시드 고정 블록 순서(색·등장 위치), 바닥 폭 50%·좌우 번갈아 등장·화면 밖으로 나가면 반대쪽, 겹친 만큼만 남기고 잘림·딱 맞추면 그대로, 빗나가면 탑이 무너지고 시간은 계속, 20초 뒤 최고 층수 봉인(링크에 s·l·f), 같은 블록 복원, 많이 쌓은 쪽 승·무너진 횟수 동점 처리, 혼자놀기 레벨·별 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const seq = w => JSON.parse(w.__ev('JSON.stringify(state.seq)'));
const stack = w => JSON.parse(w.__ev('JSON.stringify(state.stack)'));
const cur = w => JSON.parse(w.__ev('JSON.stringify(state.cur)'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || '') + ' ' + a + ' vs ' + b);
/* 블록을 아래 블록 위에 딱 맞춰 멈춘다 */
const perfect = w => w.__ev('state.cur.x=state.stack[state.stack.length-1].x; drop()');
/* 시간을 다 쓴 것으로 만들고 한 틱 돌린다 */
const timeUp = w => { w.__ev('state.t0 = performance.now() - state.limit'); w.__ev('step(16)'); };

(async () => {
  /* 첫 진입: 바닥 블록(0.25~0.75) 하나, 첫 블록은 같은 폭으로 왼쪽 화면 밖에서 오른쪽으로, 덮개, 20초 */
  const w = load('stack', '').window;
  const st = w.__ev('state');
  assert.deepEqual(stack(w).map(s => [s.x, s.w]), [[0.25, 0.5]]);
  const c0 = cur(w); assert.equal(c0.w, 0.5); assert.equal(c0.dir, 1); assert.ok(c0.x <= -0.5, '화면 밖에서 출발: ' + c0.x);
  assert.equal(st.seq.length, 200); assert.equal(st.level, 0); assert.equal(st.speed, 0.55);
  assert.equal(el(w, 'cover').classList.contains('hidden'), false);
  assert.equal(el(w, 'clock').textContent, '20'); assert.equal(el(w, 'score').textContent, '0'); assert.equal(el(w, 'width').textContent, '50');

  /* 같은 시드 → 같은 블록 순서·같은 출발 위치, 다른 시드 → 다른 순서 */
  st.seed = 12345; w.__ev('buildBoard()'); const a = seq(w), x0 = cur(w).x, col0 = cur(w).c;
  const w2 = load('stack', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(seq(w2), a, '같은 시드는 같은 블록 순서'); assert.equal(cur(w2).x, x0); assert.equal(cur(w2).c, col0);
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(seq(w2), a, '다른 시드는 다른 순서');
  w2.close();
  assert.ok(a.every(s => s[0] >= 0 && s[0] < 8 && s[1] >= 0 && s[1] <= 0.6));

  /* 시작 전에는 멈추지도 움직이지도 않는다 */
  assert.equal(w.__ev('drop()'), false); w.__ev('step(100)'); assert.equal(cur(w).x, x0);

  /* 시작: 100ms 에 0.055(판 폭 0.55/초). 오른쪽 끝을 지나면 왼쪽 밖에서 다시 */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.deepEqual(seq(w), a); assert.equal(cur(w).x, x0);
  w.__ev('step(100)'); near(cur(w).x, x0 + 0.055, '한 틱 이동');
  w.__ev('state.cur.x=1.01'); w.__ev('step(16)'); near(cur(w).x, -0.5, '화면 밖으로 나가면 반대쪽');

  /* 어긋나게 멈추면 겹친 만큼만 남는다: 0.35 에 멈춤 → 0.35~0.75 (폭 0.4), 잘린 폭 0.1. 다음 블록은 오른쪽에서 폭 0.4, 더 빠르게 */
  w.__ev('state.cur.x=0.35'); assert.equal(w.__ev('drop()'), true);
  let s = stack(w); assert.equal(s.length, 2); near(s[1].x, 0.35); near(s[1].w, 0.4);
  assert.equal(st.floors, 1); assert.equal(st.best, 1); near(st.cut, 0.1);
  assert.equal(el(w, 'score').textContent, '1'); assert.equal(el(w, 'best').textContent, '1'); assert.equal(el(w, 'width').textContent, '40');
  let c = cur(w); assert.equal(c.dir, -1); assert.ok(c.x >= 1, '오른쪽 화면 밖에서 출발: ' + c.x); near(c.w, 0.4); near(st.speed, 0.58);
  assert.equal(c.c, w.__ev('COLORS[state.seq[1][0]]'), '색은 시드 순서');
  w.__ev('state.cur.x=-0.41'); w.__ev('step(16)'); near(cur(w).x, 1, '왼쪽 밖으로 나가면 오른쪽에서 다시');

  /* 거의 딱 맞추면(3px 이내) 잘리지 않는다 */
  w.__ev('state.cur.x=0.35+0.002'); w.__ev('drop()');
  s = stack(w); assert.equal(s.length, 3); near(s[2].x, 0.35); near(s[2].w, 0.4); near(st.cut, 0.1); assert.equal(st.floors, 2);

  /* 또 어긋남: 0.6 에 멈춤 → 0.6~0.75 (폭 0.15) */
  w.__ev('state.cur.x=0.6'); w.__ev('drop()');
  s = stack(w); near(s[3].x, 0.6); near(s[3].w, 0.15); near(st.cut, 0.35); assert.equal(st.floors, 3); assert.equal(st.best, 3);
  assert.equal(el(w, 'width').textContent, '15');

  /* 완전히 빗나가면 탑이 무너지고 바닥부터: 층수 0, 최고 3 은 남고, 무너짐 1, 블록 순서는 이어진다. 판은 안 끝난다 */
  const kBefore = st.k;
  w.__ev('state.cur.x=0'); w.__ev('drop()');
  assert.equal(st.misses, 1); assert.equal(st.floors, 0); assert.equal(st.best, 3); assert.equal(stack(w).length, 1); near(st.cut, 0.5);
  assert.equal(st.k, kBefore + 1); assert.equal(cur(w).c, w.__ev('COLORS[state.seq[' + kBefore + '][0]]'));
  assert.equal(cur(w).w, 0.5); assert.equal(st.speed, 0.55);
  assert.equal(el(w, 'score').textContent, '0'); assert.equal(el(w, 'miss').textContent, '1'); assert.equal(st.running, true); assert.equal(st.done, false);
  perfect(w); assert.equal(st.floors, 1);

  /* 20초 끝: 가장 높이 쌓은 3층으로 봉인. 링크에 시드·레벨·무너진 횟수, 봉인값 = 층수 */
  timeUp(w);
  assert.equal(st.done, true); assert.equal(st.running, false); assert.equal(st.ms, 3);
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'clock').textContent, '0'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨');
  assert.equal(w.__ev('drop()'), false, '끝난 뒤에는 안 멈춤');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.f, 1);
  assert.equal(p.x, (3 + p.k * 7) % 1000003, '봉인값 = 최고 층수');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);

  /* 받는 쪽: 같은 시드로 같은 블록 순서. 4층 쌓고 시간 끝 → 받는 쪽 승 */
  const g = load('stack', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(seq(g), a); assert.equal(cur(g).x, x0);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  for (let i = 0; i < 4; i++) perfect(g);
  assert.equal(gs.best, 4); near(gs.cut, 0);
  timeUp(g);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 쌓았어/);
  assert.match(el(g, 'subVerdict').textContent, /4층 vs 3층 — 내가 1층 더 쌓았어/);
  assert.match(el(g, 'tA').textContent, /4층/); assert.match(el(g, 'tB').textContent, /3층/);
  assert.match(el(g, 'dA').textContent, /한 번도 안 무너짐/); assert.match(el(g, 'dB').textContent, /무너짐 1번/);
  g.close();

  /* 동점: 층수가 같으면 덜 무너진 쪽이 이긴다 (같은 3층, 받는 쪽은 0번) */
  const g2 = load('stack', new URL(link).hash).window; const g2s = g2.__ev('state');
  g2.__ev('startPlay()'); for (let i = 0; i < 3; i++) perfect(g2);
  timeUp(g2); assert.equal(g2s.ms, 3);
  await tick(700);
  assert.match(el(g2, 'verdict').textContent, /내가 더 쌓았어/);
  assert.match(el(g2, 'subVerdict').textContent, /덜 무너진 쪽이 이겨/);
  g2.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 고정 시드, 20초·목표 8층, 레벨마다 속도, 둘이하기 UI 숨김 */
  const so = load('stack', '?solo=1').window;
  const sd = so.document, ss = so.__ev('state');
  assert.equal(so.Solo.active, true); assert.ok(el(so, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, so.Solo.seedFor('stack', 1)); assert.equal(ss.limit, 20000);
  assert.equal(el(so, 'clock').textContent, '20'); assert.equal(ss.speed, 0.5);
  assert.equal(so.__ev('speedOf(5,0)'), 0.7); near(so.__ev('speedOf(0,10)'), 0.85);
  assert.equal(el(so, 'nameIn').classList.contains('hidden'), true); assert.equal(el(so, 'playTag').textContent, '혼자놀기');
  assert.match(el(so, 'soloDesc').textContent, /클리어 8층/); assert.match(el(so, 'soloDesc').textContent, /★★★ 13층/);
  const L = so.Solo.levels[0];
  assert.equal(so.Solo.starsFor(L, 13), 3); assert.equal(so.Solo.starsFor(L, 11), 2); assert.equal(so.Solo.starsFor(L, 8), 1); assert.equal(so.Solo.starsFor(L, 7), 0);
  const seedLv1 = ss.seed;

  /* 클리어: 13층 딱딱 쌓고 시간 끝 → ★★★, 저장, Lv2 해제, 도전장 링크. 봉인 카드 없음 */
  so.__ev('startPlay()');
  for (let i = 0; i < 13; i++) perfect(so);
  assert.equal(ss.best, 13); assert.equal(ss.done, false);
  timeUp(so);
  const res = el(so, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, /13층/); assert.match(res.querySelector('.rec').textContent, /한 번도 안 무너짐/);
  assert.equal(el(so, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(so, 'soloDuel').getAttribute('href'), '/t/stack/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(so.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.stack['1'].stars, 3); assert.equal(saved.stack['1'].best, 13);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 25초·목표 12층, 새 시드, 결과 카드 사라짐. 3층에서 시간 끝 → 별 0 */
  el(so, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.equal(el(so, 'soloResult'), null);
  assert.equal(ss.limit, 25000); assert.equal(el(so, 'clock').textContent, '25'); assert.equal(ss.speed, 0.55);
  so.__ev('startPlay()'); for (let i = 0; i < 3; i++) perfect(so);
  timeUp(so);
  const fail = el(so, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, /3층/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  so.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판(20초), 링크에 l 이 실리고 받는 쪽도 같은 레벨·블록 */
  const du = load('stack', '?s=' + seedLv1 + '&l=1').window;
  const ds = du.__ev('state');
  assert.equal(du.Solo.active, false); assert.equal(el(du, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.equal(ds.speed, 0.5); assert.equal(el(du, 'clock').textContent, '20');
  du.__ev('startPlay()'); perfect(du); timeUp(du);
  const dp = pay(du); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('stack', new URL(du.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(seq(guest), seq(du)); assert.equal(guest.__ev('state.speed'), 0.5);
  guest.close(); du.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('블록 쌓기 검사 통과 — 시드 블록 순서·좌우 번갈아 등장·화면 밖 되돌기·겹친 만큼 남기기·딱 맞추기·무너져도 계속·20초 최고 층수 봉인(s·l·f)·같은 블록 복원·많이 쌓은 쪽 승·무너짐 동점 처리·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
