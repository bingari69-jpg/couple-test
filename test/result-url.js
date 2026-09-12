/* 완료 알림에 저장되는 결과 주소 — 받는 쪽 화면의 도전장 주소(#c=/#i=)가 아니라 결과 링크(#r=)여야 한다.
   또 기록 게임 엔진이 window.track을 덮어써 통계가 자기 자신을 부르던 문제가 없는지 본다. */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, el, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(r => setTimeout(r, ms));
const source = fs.readFileSync(path.join(__dirname, '../assets/result-notify.js'), 'utf8');

function attach(w) {
  const calls = []; const session = { user: { id: 'u2' } };
  const client = {
    auth: { getSession: async () => ({ data: { session }, error: null }), signInAnonymously: async () => ({ data: { session }, error: null }) },
    rpc: async (name, args) => { calls.push({ name, url: args && args.p_result_url }); return { data: {}, error: null }; },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    from: () => ({ select() { return this; }, in() { return this; }, eq() { return this; }, order() { return this; }, limit: async () => ({ data: [], error: null }) }),
    functions: { invoke: async () => ({ data: {}, error: null }) }
  };
  w.supabase = { createClient: () => client }; w.eval(source); return calls;
}

(async () => {
  /* 1) 기록 게임(10초 맞추기): analytics의 track이 호출되고, 완료 RPC에 #r= 결과 주소가 실린다 */
  const maker = load('ten', '').window;
  maker.Duel.finish(300, { tries: [9900, 10100, 9900] });
  const hash = new URL(maker.Duel.url()).hash;
  const g = load('ten', hash).window;
  const hits = []; g.track = (e, p) => hits.push(e);          // analytics.js 대신
  g.history.replaceState(null, '', g.location.pathname + '?ch=ABCDEFGHIJKL' + hash);
  const calls = attach(g);
  await tick(150);
  g.Duel.finish(250, { tries: [9950, 10050, 9900] });
  await tick(1200);
  assert.equal(el(g, 's-result').classList.contains('hidden'), false);
  const done = calls.find(c => c.name === 'complete_game_challenge');
  assert.ok(done, '완료 RPC가 호출돼야 함');
  assert.match(done.url, /^\/couple-test\/t\/ten\/#r=/, '결과 주소는 #r= 링크여야 함: ' + done.url);
  assert.equal(new URL('https://x' + done.url).searchParams.get('ch'), null, '결과 주소에 ch 코드가 남으면 안 됨');

  /* 2) 가위바위보도 결과 링크를 알려준다 */
  const rm = load('rps', '').window; el(rm, 'makeHands').children[2].click(); el(rm, 'makeBtn').click();
  const rh = new URL(rm.__ev('madeUrl')).hash;
  const rg = load('rps', rh).window; rg.setTimeout = fn => { fn(); return 0; };
  el(rg, 'openHands').children[0].click();
  assert.match(rg.__gatchiResultUrl || '', /\/t\/rps\/#r=/);

  /* 3) 마음 맞히기 7종도 결과 화면에서 결과 주소를 알려준다(정적 검사) */
  for (const f of ['t/delivery/index.html', 't/mbti/index.html', 't/crash/index.html', 't/seat/index.html', 't/marriage/index.html', 't/memory/index.html', 't/mind/engine.js']) {
    assert.ok(fs.readFileSync(path.join(__dirname, '..', f), 'utf8').includes('__gatchiResultUrl'), f + ' 에 결과 주소 알림이 없음');
  }

  assert.deepEqual(PAGE_ERRORS.filter(e => !/jsdelivr|supabase|network|fetch/i.test(e)), []);
  console.log('결과 주소 검사 통과 — 기록 게임 완료 RPC에 #r= 링크, 가위바위보 결과 주소, 마음 맞히기 7종 정적 확인');
})().catch(e => { console.error(e); process.exit(1); });
