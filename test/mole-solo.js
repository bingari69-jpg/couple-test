/* 두더지 잡기 — 혼자놀기(assets/solo.js) 검사.
   ?solo=1: 레벨 표·Lv1 만 열림·레벨별 두더지 순서(간격·동시 마리수·폭탄 비율)·둘이하기 UI 숨김·별(높을수록)·저장·잠금 해제·실패(목표 미달)
   ?s=&l=: 혼자 판을 둘이하기 첫 판으로 (같은 시드·순서), 링크에 l 이 실리고 받는 쪽도 같은 순서. 레벨 0 은 원래 규칙 그대로 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const sched = w => JSON.parse(w.__ev('JSON.stringify(state.sched)'));
/* 폭탄이 아닌 두더지를 순서대로 want 점이 될 때까지 잡고 20초를 끝낸다. 실제로 얻은 점수를 돌려준다 */
function playFor(w, want) {
  const s = sched(w); let score = 0; const hits = [];
  for (let i = 0; i < s.length && score < want; i++) { if (s[i].k === 2) continue; hits.push(i); score += s[i].k === 1 ? 3 : 1; }
  w.__ev('startPlay()');
  for (const i of hits) w.__ev(`syncMoles(state.sched[${i}].t); tapHole(state.sched[${i}].h)`);
  w.__ev('syncMoles(GAME_MS); finishPlay()');
  return score;
}
/* 동시에 올라와 있는 최대 마리수 */
const maxLive = s => Math.max(...s.map(m => s.filter(o => o.t <= m.t && o.t + o.d > m.t).length));

(async () => {
  /* 1. 진입: 레벨 표, Lv1 만 열림, 폭탄 없는 순서, 둘이하기 UI 숨김 */
  const w = load('mole', '?solo=1').window;
  const d = w.document, st = w.__ev('state');
  assert.equal(w.Solo.active, true); assert.ok(el(w, 'soloPanel'), '레벨 표');
  const lv = [...d.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(st.level, 1); assert.equal(st.seed, w.Solo.seedFor('mole', 1));
  assert.equal(d.querySelectorAll('#grid .hole').length, 9);
  assert.equal(el(w, 'nameIn').classList.contains('hidden'), true); assert.equal(el(w, 'playTag').textContent, '혼자놀기');
  assert.match(el(w, 'soloHud').textContent, /Lv1 · 목표 12점/); assert.equal(el(w, 'clock').textContent, '20.0');
  assert.match(el(w, 'soloDesc').textContent, /폭탄 없음/);
  const s1 = sched(w);
  assert.ok(s1.every(m => m.k !== 2), 'Lv1 은 폭탄 없음'); assert.equal(maxLive(s1), 1, 'Lv1 은 한 마리씩');
  assert.ok(s1.length >= 20 && s1.length <= 28, 'Lv1 마리수: ' + s1.length);
  assert.ok(s1.every(m => m.t >= 400 && m.t + m.d <= 20000 && m.h >= 0 && m.h < 9), '전부 20초 안·구멍 안');
  const gaps = s1.slice(1).map((m, i) => m.t - s1[i].t);
  assert.ok(gaps[0] >= 800 && gaps[0] <= 1000, '처음 간격 ~900ms: ' + gaps[0]);
  assert.ok(gaps[gaps.length - 1] >= 620 && gaps[gaps.length - 1] <= 780, '끝 간격 ~700ms: ' + gaps[gaps.length - 1]);
  lv[2].click(); assert.equal(st.level, 1, '잠긴 레벨은 안 골라진다');

  /* 2. 별 계산 (높을수록 좋음) */
  const L = w.Solo.levels[0];
  assert.equal(w.Solo.starsFor(L, 20), 3); assert.equal(w.Solo.starsFor(L, 16), 2); assert.equal(w.Solo.starsFor(L, 12), 1); assert.equal(w.Solo.starsFor(L, 11), 0); assert.equal(w.Solo.starsFor(L, null), 0);
  assert.deepEqual(JSON.parse(JSON.stringify(w.Solo.levels.map(l => [l.goal, l.best, l.limitMs]))), [[12, 20, 20000], [16, 26, 20000], [22, 34, 20000], [28, 42, 20000], [34, 50, 20000]]);

  /* 3. 레벨별 순서 규칙: 시드는 레벨마다 고정, 동시 마리수·폭탄 비율이 규격대로, ★★★ 이 닿을 수 있는 판 */
  const expect = { 1: [1, 0], 2: [1, 0.10], 3: [2, 0.15], 4: [2, 0.20], 5: [3, 0.25] };
  let prevCount = 0;
  for (const n of [1, 2, 3, 4, 5]) {
    const s = JSON.parse(w.__ev(`JSON.stringify(scheduleOf(Solo.seedFor('mole',${n}),${n}))`));
    assert.deepEqual(s, JSON.parse(w.__ev(`JSON.stringify(scheduleOf(Solo.seedFor('mole',${n}),${n}))`)), '같은 시드·레벨이면 같은 순서');
    assert.ok(maxLive(s) <= expect[n][0], `Lv${n} 동시 ${maxLive(s)} ≤ ${expect[n][0]}`);
    assert.ok(s.every((m, i) => i === 0 || m.t >= s[i - 1].t), '등장 시각 오름차순');
    const bombs = s.filter(m => m.k === 2).length / s.length;
    if (expect[n][1] === 0) assert.equal(bombs, 0); else assert.ok(Math.abs(bombs - expect[n][1]) < 0.12, `Lv${n} 폭탄 비율 ${bombs.toFixed(2)} ≈ ${expect[n][1]}`);
    const maxScore = s.reduce((a, m) => a + (m.k === 2 ? 0 : m.k === 1 ? 3 : 1), 0);
    assert.ok(maxScore >= w.Solo.levels[n - 1].best, `Lv${n} ★★★ 가능: max ${maxScore} ≥ best ${w.Solo.levels[n - 1].best}`);
    assert.ok(s.length >= prevCount, `Lv${n} 두더지는 이전 레벨 이상: ${s.length} ≥ ${prevCount}`); prevCount = s.length;
  }
  /* 레벨 0(둘이하기)은 원래 규칙: 동시 2마리·황금 10%·폭탄 15%·노출 0.9→0.45초·35~45마리 */
  const s0 = JSON.parse(w.__ev('JSON.stringify(scheduleOf(12345,0))'));
  assert.deepEqual(s0, JSON.parse(w.__ev('JSON.stringify(scheduleOf(12345))')), 'level 생략 = 레벨 0');
  assert.ok(maxLive(s0) <= 2); assert.ok(s0.length >= 33 && s0.length <= 47, '둘이하기 마리수 35~45: ' + s0.length);
  assert.ok(s0.every(m => m.d === Math.round(900 - 450 * m.t / 20000)), '둘이하기 노출 시간 규칙 그대로');
  assert.ok(s0.some(m => m.k === 2) && s0.some(m => m.k === 1));

  /* 4. 클리어(Lv1 에서 21점 = ★★★): 결과 카드·저장·Lv2 해제·도전장 링크. 봉인(afterPlay)은 나오지 않는다 */
  const seedLv1 = st.seed;
  const got = playFor(w, 21);
  assert.equal(st.done, true); assert.equal(st.score, got); assert.ok(got >= 21);
  const res = el(w, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, new RegExp('기록 ' + got + '점'));
  assert.match(res.querySelector('.rec').textContent, /두더지 \d+ · 황금 \d+ · 폭탄 0/);
  assert.equal(el(w, 'score').textContent, String(got), '혼자는 점수를 바로 보여준다');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(w, 'soloDuel').getAttribute('href'), '/t/mole/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(w.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.mole['1'].stars, 3); assert.equal(saved.mole['1'].clears, 1); assert.equal(saved.mole['1'].best, got);
  assert.equal(d.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');
  assert.ok(el(w, 'soloNext'), '다음 레벨 버튼');

  /* 5. 다음 레벨: 새 시드·폭탄 있는 순서, 결과 카드 사라짐, 화면 초기화 */
  el(w, 'soloNext').click();
  assert.equal(st.level, 2); assert.notEqual(st.seed, seedLv1); assert.equal(st.seed, w.Solo.seedFor('mole', 2));
  assert.ok(sched(w).some(m => m.k === 2), 'Lv2 는 폭탄 있음'); assert.equal(el(w, 'soloResult'), null);
  assert.equal(el(w, 'score').textContent, '0'); assert.equal(el(w, 'clock').textContent, '20.0'); assert.equal(st.done, false);

  /* 6. 실패: 20초 끝났는데 목표(16점) 미달 → Solo.finish(점수) 로 별 0, 잠금 유지, 다시 하기 */
  const low = playFor(w, 5);
  const fail = el(w, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, new RegExp('기록 ' + low + '점'), '실패해도 점수는 보인다(null 아님)');
  assert.equal(JSON.parse(w.localStorage.getItem('gatchi_solo_v1')).mole['2'].stars, 0);
  assert.equal(JSON.parse(w.localStorage.getItem('gatchi_solo_v1')).mole['2'].best, low);
  assert.equal(d.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  assert.equal(el(w, 'soloNext'), null); assert.ok(el(w, 'soloRetry'));
  assert.deepEqual(JSON.parse(JSON.stringify(w.Solo.summary('mole', 5))), { cleared: 1, stars: 3, total: 5, next: 2 });
  el(w, 'soloRetry').click(); assert.equal(el(w, 'soloResult'), null); assert.equal(st.level, 2);
  w.close();

  /* 7. 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·순서의 둘이하기 첫 판, 링크에 l 이 실린다 */
  const duel = load('mole', '?s=' + seedLv1 + '&l=1').window;
  const ds = duel.__ev('state');
  assert.equal(duel.Solo.active, false); assert.equal(el(duel, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.deepEqual(sched(duel), s1, '혼자 Lv1 과 같은 순서');
  assert.equal(el(duel, 'nameIn').classList.contains('hidden'), false, '둘이하기 UI 그대로');
  playFor(duel, 10);
  assert.equal(el(duel, 'afterPlay').classList.contains('hidden'), false, '둘이하기는 봉인 카드'); assert.equal(el(duel, 'score').textContent, '🔒');
  const link = duel.Duel.url(); assert.match(link, /#c=/);
  const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
  assert.equal(pay.s, seedLv1); assert.equal(pay.l, 1); assert.ok(Array.isArray(pay.c));
  /* 받는 쪽도 같은 Lv1 순서 */
  const guest = load('mole', new URL(link).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(sched(guest), s1);
  guest.close(); duel.close();

  /* 8. 보통 둘이하기(프리셋 없음)는 레벨 0 순서이고 링크의 l 은 0 */
  const plain = load('mole', '').window;
  assert.equal(plain.__ev('state.level'), 0);
  assert.deepEqual(sched(plain), JSON.parse(plain.__ev('JSON.stringify(scheduleOf(state.seed))')), '레벨 0 = 원래 규칙');
  playFor(plain, 10);
  const p2 = JSON.parse(Buffer.from(new URL(plain.Duel.url()).hash.slice(3), 'base64url').toString());
  assert.equal(p2.l, 0); plain.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('두더지 잡기 혼자놀기 검사 통과 — 레벨 표·잠금·레벨별 순서(간격·동시·폭탄)·별·저장·목표 미달 실패·다음 레벨·혼자→도전장 프리셋·링크 l·받는 쪽 순서·레벨 0 원래 규칙');
})().catch(e => { console.error(e); process.exit(1); });
