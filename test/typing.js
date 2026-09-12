/* 한글 타자 20초 — 시드 고정 문장 순서, 글자마다 색(ok/bad/cur), 다 치면 다음 문장, 자리 비교 점수·오타, 조합 중 글자 판정 유예, 20초 끝 부분 점수, 글자 수 봉인(링크에 s·l·e), 같은 문장 복원, 많이 친 쪽 승, 오타 적은 쪽 동점 처리, 혼자놀기 레벨·별·프리셋 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));

const order = w => JSON.parse(w.__ev('JSON.stringify(state.order)'));
const pay = w => JSON.parse(Buffer.from(new URL(w.Duel.url()).hash.slice(3), 'base64url').toString());
const classes = w => [...w.document.querySelectorAll('#target span')].map(s => s.className);
/* 실제 input 이벤트로 친다 (IME 처럼 value 를 통째로 바꾼 뒤 input 발생) */
const type = (w, v) => { const i = el(w, 'typeIn'); i.value = v; i.dispatchEvent(new w.Event('input', { bubbles: true })); };
const typeSentence = w => { const t = w.__ev('state.target'); type(w, t); return t; };

(async () => {
  /* 첫 진입: 문장이 글자 span 으로 보이고, 입력칸은 잠겨 있고, 덮개. 문장 은행은 60개 이상, 12~24자 */
  const w = load('typing', '').window;
  const st = w.__ev('state'), d = w.document;
  const SENT = JSON.parse(w.__ev('JSON.stringify(SENT)'));
  assert.ok(SENT.length >= 60, '문장 ' + SENT.length + '개'); assert.ok(SENT.every(s => s.length >= 12 && s.length <= 24), '12~24자');
  assert.equal(new Set(SENT).size, SENT.length, '중복 없음');
  assert.equal(d.querySelectorAll('#target span').length, st.target.length);
  assert.equal(el(w, 'typeIn').disabled, true); assert.equal(st.level, 0);
  assert.equal(el(w, 'cover').classList.contains('hidden'), false);
  assert.equal(st.order.length, SENT.length); assert.equal(SENT[st.order[0]], st.target);

  /* 같은 시드 → 같은 문장 순서, 다른 시드 → 다른 순서. 순서는 은행 전체의 뒤섞기(빠짐·중복 없음) */
  st.seed = 12345; w.__ev('buildBoard()'); const a = order(w);
  const w2 = load('typing', '').window; w2.__ev('state.seed=12345; buildBoard()');
  assert.deepEqual(order(w2), a, '같은 시드는 같은 문장 순서'); assert.equal(w2.__ev('state.target'), st.target);
  w2.__ev('state.seed=54321; buildBoard()');
  assert.notDeepEqual(order(w2), a, '다른 시드는 다른 순서');
  w2.close();
  assert.deepEqual(a.slice().sort((x, y) => x - y), SENT.map((_, i) => i));

  /* 시작 전 입력은 버려진다 */
  w.__ev('applyInput("가나다")'); assert.equal(st.correct, 0); assert.equal(st.typed, '');

  /* 시작: 첫 문장을 그대로 치면 글자 수만큼 점수, 바로 다음 문장(순서의 두 번째) */
  w.__ev('startPlay()');
  assert.equal(st.running, true); assert.equal(el(w, 'typeIn').disabled, false); assert.deepEqual(order(w), a);
  const s1 = typeSentence(w);
  assert.equal(st.correct, s1.length); assert.equal(st.errors, 0); assert.equal(st.idx, 1);
  assert.equal(st.target, SENT[a[1]]); assert.equal(el(w, 'typeIn').value, ''); assert.equal(el(w, 'score').textContent, String(s1.length));
  assert.equal(el(w, 'sentInfo').textContent, '1'); assert.ok(st.strokes > s1.length, '타수는 글자 수보다 많다: ' + st.strokes);

  /* 글자마다 색: 맞음 ok · 틀림 bad · 다음 칸 cur. 조합 중일 수 있는 마지막 글자(낱자·같은 초성)는 bad 가 아니라 cur */
  const s2 = st.target;
  type(w, s2.slice(0, 2) + 'X');
  let cl = classes(w); assert.deepEqual(cl.slice(0, 4), ['ok', 'ok', 'bad', 'cur']); assert.equal(cl[4], '');
  type(w, s2.slice(0, 2) + 'ㅇ');
  cl = classes(w); assert.equal(cl[2], 'cur', '낱자는 조합 중으로 본다');
  const d3 = w.__ev('decompose(' + JSON.stringify(s2[2]) + ')');
  if (d3 && d3.jong !== 0) {
    const noJong = String.fromCharCode(0xAC00 + d3.cho * 588 + d3.jung * 28);
    type(w, s2.slice(0, 2) + noJong); assert.equal(classes(w)[2], 'cur', '받침 없는 같은 글자는 조합 중');
  }
  type(w, s2.slice(0, 2) + 'X' + 'Y');
  cl = classes(w); assert.equal(cl[2], 'bad', '뒤에 글자가 더 있으면 조합 중이 아니다'); assert.equal(cl[3], 'bad');
  type(w, s2.slice(0, 3)); cl = classes(w); assert.deepEqual(cl.slice(0, 4), ['ok', 'ok', 'ok', 'cur']);
  assert.equal(st.correct, s1.length, '문장을 끝내기 전에는 점수가 안 오른다');
  assert.equal(w.__ev('applyInput("가")'), undefined); assert.equal(st.typed, '가');

  /* 문장 길이만큼 쳤는데 틀린 데가 있으면: 자리마다 비교 — 맞은 글자는 점수, 틀린 글자는 오타, 다음 문장 */
  const wrong = s2.slice(0, -1) + (s2.slice(-1) === '가' ? '나' : '가');
  type(w, wrong);
  assert.equal(st.correct, s1.length + s2.length - 1); assert.equal(st.errors, 1); assert.equal(st.idx, 2);
  assert.equal(el(w, 'errInfo').textContent, '1'); assert.equal(st.target, SENT[a[2]]);

  /* NFC 정규화: 자모 분해된 입력(NFD)도 같은 글자로 본다 */
  const s3 = st.target;
  type(w, s3.normalize('NFD'));
  assert.equal(st.idx, 3); assert.equal(st.errors, 1); assert.equal(st.correct, s1.length + s2.length - 1 + s3.length);
  const before = st.correct;

  /* 20초 끝: 치던 문장은 친 데까지 자리 비교로 부분 점수. 봉인, 링크에 시드·레벨·오타 수 */
  const s4 = st.target;
  type(w, s4.slice(0, 5)); assert.equal(st.correct, before);
  w.__ev('finishPlay()');
  assert.equal(st.done, true); assert.equal(st.running, false);
  assert.equal(st.correct, before + 5, '부분 점수'); assert.equal(st.ms, before + 5, '기록 = 맞게 친 글자 수');
  assert.equal(el(w, 'score').textContent, '🔒'); assert.equal(el(w, 'bigBtn').textContent, '봉인됨'); assert.equal(el(w, 'typeIn').disabled, true);
  assert.match(el(w, 'cpmInfo').textContent, /^\d+$/); assert.ok(+el(w, 'cpmInfo').textContent > 0, '타/분 표시');
  type(w, '가나다'); assert.equal(st.typed, s4.slice(0, 5), '끝난 뒤 입력은 무시');
  const link = w.Duel.url(); assert.match(link, /#c=/);
  const p = pay(w);
  assert.equal(p.s, 12345); assert.equal(p.l, 0); assert.equal(p.e, 1);
  assert.equal(p.x, (st.ms + p.k * 7) % 1000003, '봉인값 = 글자 수');
  assert.equal(el(w, 'afterPlay').classList.contains('hidden'), false);
  const hostV = st.ms;

  /* 시계: 20초가 지나면 저절로 끝난다 */
  const t = load('typing', '').window; const ts = t.__ev('state');
  t.__ev('startPlay()'); t.__ev('state.t0 = performance.now() - 20000'); t.__ev('clockTick()');
  assert.equal(ts.done, true); assert.equal(ts.ms, 0); assert.match(el(t, 'cdSub').textContent, /기록 봉인/);
  t.close();

  /* 받는 쪽: 같은 시드로 같은 문장 순서. 다섯 문장을 오타 없이 치고 끝 → 받는 쪽 승 */
  const g = load('typing', new URL(link).hash).window;
  const gs = g.__ev('state');
  assert.equal(gs.seed, 12345); assert.deepEqual(order(g), a); assert.equal(gs.target, SENT[a[0]]);
  assert.equal(el(g, 'lockedCard').classList.contains('hidden'), false);
  g.__ev('startPlay()');
  let sum = 0; for (let i = 0; i < 5; i++) sum += typeSentence(g).length;
  g.__ev('finishPlay()');
  assert.equal(gs.ms, sum); assert.ok(sum > hostV);
  await tick(700);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  assert.match(el(g, 'verdict').textContent, /내가 더 빨라/);
  assert.match(el(g, 'subVerdict').textContent, new RegExp(sum + '자 vs ' + hostV + '자 — 내가 ' + (sum - hostV) + '자 더 쳤어'));
  assert.match(el(g, 'tA').textContent, new RegExp('^' + sum + '자')); assert.match(el(g, 'tB').textContent, new RegExp('^' + hostV + '자'));
  assert.match(el(g, 'dA').textContent, /오타 없음/); assert.match(el(g, 'dB').textContent, /오타 1개/);
  g.close();

  /* 동점: 글자 수가 같으면 오타가 적은 쪽이 이긴다 (결과 화면을 직접 그려 확인) */
  const r = load('typing', '').window;
  r.Duel.renderResult({ hist: [['상대', 30, '', 30, 'aa', 'bb', 3, 1]], round: ['상대', 30, '', 30, 'aa', 'bb', 3, 1], viewer: 'b' });
  assert.match(el(r, 'verdict').textContent, /내가 더 빨라/); assert.match(el(r, 'subVerdict').textContent, /오타가 적은 쪽이 이겨. \(1개 vs 3개\)/);
  r.Duel.renderResult({ hist: [['상대', 30, '', 30, 'aa', 'bb', 0, 1]], round: ['상대', 30, '', 30, 'aa', 'bb', 0, 1], viewer: 'b' });
  assert.match(el(r, 'verdict').textContent, /상대가 더 빨라/);
  r.Duel.renderResult({ hist: [['상대', 30, '', 30, 'aa', 'bb', 1, 1]], round: ['상대', 30, '', 30, 'aa', 'bb', 1, 1], viewer: 'b' });
  assert.match(el(r, 'verdict').textContent, /완전 똑같아/);
  r.close(); w.close();

  /* 혼자놀기: 레벨 표, Lv1 만 열림, 레벨 시드로 고른 문장, 둘이하기 UI 숨김 */
  const s = load('typing', '?solo=1').window;
  const sd = s.document, ss = s.__ev('state');
  assert.equal(s.Solo.active, true); assert.ok(el(s, 'soloPanel'));
  const lv = [...sd.querySelectorAll('.solo-lv')];
  assert.equal(lv.length, 5); assert.ok(lv[0].classList.contains('on')); assert.ok(lv[1].classList.contains('locked'));
  assert.equal(ss.level, 1); assert.equal(ss.seed, s.Solo.seedFor('typing', 1));
  const seedLv1 = ss.seed, orderLv1 = order(s);
  assert.equal(el(s, 'nameIn').classList.contains('hidden'), true); assert.equal(el(s, 'playTag').textContent, '혼자놀기');
  assert.match(el(s, 'soloDesc').textContent, /클리어 12자/); assert.match(el(s, 'soloDesc').textContent, /★★★ 20자/);
  const L = s.Solo.levels[0];
  assert.equal(s.Solo.starsFor(L, 20), 3); assert.equal(s.Solo.starsFor(L, 16), 2); assert.equal(s.Solo.starsFor(L, 12), 1); assert.equal(s.Solo.starsFor(L, 11), 0);
  assert.deepEqual(JSON.parse(JSON.stringify(s.__ev('LEVELS.map(l=>[l.goal,l.best])'))), [[12, 20], [18, 26], [24, 32], [30, 38], [40, 48]]);

  /* 클리어: 두 문장(24자 이상) 치고 끝 → ★★★, 저장, Lv2 해제, 도전장 링크. 봉인 카드는 없음 */
  s.__ev('startPlay()');
  let got = 0; for (let i = 0; i < 2; i++) got += typeSentence(s).length;
  s.__ev('finishPlay()');
  assert.equal(ss.done, true); assert.ok(got >= 24);
  const res = el(s, 'soloResult'); assert.ok(res, '혼자 결과 카드');
  assert.equal(res.querySelector('.stars').textContent, '★★★'); assert.match(res.querySelector('.rec').textContent, new RegExp(got + '자')); assert.match(res.querySelector('.rec').textContent, /오타 0개 · \d+타\/분/);
  assert.equal(el(s, 'afterPlay').classList.contains('hidden'), true, '봉인 카드 없음');
  assert.equal(el(s, 'soloDuel').getAttribute('href'), '/t/typing/?s=' + seedLv1 + '&l=1');
  const saved = JSON.parse(s.localStorage.getItem('gatchi_solo_v1'));
  assert.equal(saved.typing['1'].stars, 3); assert.equal(saved.typing['1'].best, got); assert.equal(saved.typing['1'].clears, 1);
  assert.equal(sd.querySelectorAll('.solo-lv')[1].classList.contains('locked'), false, 'Lv2 해제');

  /* 다음 레벨: 새 시드·다른 문장 순서, 결과 카드 사라짐. 한 글자만 치고 끝 → 별 0 */
  el(s, 'soloNext').click();
  assert.equal(ss.level, 2); assert.notEqual(ss.seed, seedLv1); assert.notDeepEqual(order(s), orderLv1); assert.equal(el(s, 'soloResult'), null);
  assert.equal(el(s, 'typeIn').disabled, true); assert.equal(el(s, 'score').textContent, '0');
  s.__ev('startPlay()'); type(s, ss.target[0]); s.__ev('finishPlay()');
  const fail = el(s, 'soloResult'); assert.equal(fail.querySelector('.stars').textContent, '☆☆☆'); assert.match(fail.querySelector('.verdict').textContent, /아쉽/);
  assert.match(fail.querySelector('.rec').textContent, /기록 1자/);
  assert.equal(sd.querySelectorAll('.solo-lv')[2].classList.contains('locked'), true, 'Lv3 은 아직 잠김');
  s.close();

  /* 혼자 → 둘이: ?s=&l= 로 열면 같은 시드·레벨의 둘이하기 첫 판, 링크에 l 이 실리고 받는 쪽도 같은 문장 순서 */
  const du = load('typing', '?s=' + seedLv1 + '&l=1').window;
  const ds = du.__ev('state');
  assert.equal(du.Solo.active, false); assert.equal(el(du, 'soloPanel'), null);
  assert.equal(ds.seed, seedLv1); assert.equal(ds.level, 1); assert.deepEqual(order(du), orderLv1);
  du.__ev('startPlay()'); typeSentence(du); du.__ev('finishPlay()');
  const dp = pay(du); assert.equal(dp.s, seedLv1); assert.equal(dp.l, 1);
  const guest = load('typing', new URL(du.Duel.url()).hash).window;
  assert.equal(guest.__ev('state.level'), 1); assert.deepEqual(order(guest), orderLv1); assert.equal(guest.__ev('state.target'), SENT[orderLv1[0]]);
  guest.close(); du.close();

  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('한글 타자 20초 검사 통과 — 시드 문장 순서·글자 색·다음 문장·자리 비교 점수/오타·조합 중 유예·NFC·부분 점수·글자 수 봉인(s·l·e)·같은 문장 복원·많이 친 쪽 승·오타 적은 쪽 동점 처리·혼자놀기 레벨·별·프리셋');
})().catch(e => { console.error(e); process.exit(1); });
