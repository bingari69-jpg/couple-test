/* 점수/입력 회귀: 실제 타이머 → 초대 → 응답 → 결과 재열기, 옛 링크,
   한글 마지막 글자의 조합 및 브라우저별 compositionend/input 순서. */
const assert = require('node:assert/strict');
const { load, el, b64e, PAGE_ERRORS } = require('./dom');
const tick = ms => new Promise(resolve => setTimeout(resolve, ms));
const windows = [];
function page(game, hash='') { const w=load(game,hash).window; windows.push(w); return w; }
function stopAt(w,ms) {
  let now=0; w.performance.now=()=>now;
  el(w,'bigBtn').click(); now=ms; el(w,'bigBtn').click();
}
function input(w,value,composing=false) {
  const box=el(w,'typeIn'); box.value=value;
  box.dispatchEvent(new w.InputEvent('input',{bubbles:true,isComposing:composing,inputType:composing?'insertCompositionText':'insertText'}));
}
function composition(w,type) { el(w,'typeIn').dispatchEvent(new w.CompositionEvent(type,{bubbles:true})); }
function typing(w,target='가나다') {
  w.__ev('startPlay(); clearTimers()');
  w.__ev('state').target=target;
  return w.__ev('state');
}
(async()=>{
  // No score-size heuristic: old elapsed times also include values below 5 seconds.
  const old=page('ten');
  for(const ms of [0,20,4900,5000,9900,10000,15000,25000]) {
    assert.equal(old.__ev(`errOf(${ms})`),Math.abs(ms-10000));
    assert.equal(old.__ev(`errOf(${Math.abs(ms-10000)},[${ms}])`),Math.abs(ms-10000));
  }
  assert.equal(old.__ev('errOf(16000,[20,4900,10920])'),16000,'old three-attempt format uses all measured errors');
  const legacyRound=['old',4900,'new',100,'a','b',[],[9900]];
  old.Duel.renderResult({hist:[legacyRound],round:legacyRound,viewer:'b'});
  assert.match(el(old,'verdict').className,/win/);
  assert.match(el(old,'tB').textContent,/4\.90/);

  const maker=page('ten'); maker.__ev('state.id="maker";state.name="보낸이"'); stopAt(maker,20);
  const guest=page('ten',new URL(maker.Duel.url()).hash); guest.__ev('state.id="guest";state.name="받는이"'); stopAt(guest,9900);
  await tick(700);
  assert.match(el(guest,'verdict').className,/win/,'9.90 seconds beats an immediate stop');
  assert.match(el(guest,'tB').textContent,/오차 9\.98/);
  assert.match(el(guest,'subVerdict').textContent,/9\.88/);
  const reply=page('ten',new URL(guest.__gatchiResultUrl).hash);
  assert.match(el(reply,'verdict').className,/lose/,'sender reopening result sees the same winner');
  assert.match(el(reply,'tA').textContent,/오차 9\.98/);
  el(guest,'again').click();
  assert.match(el(guest,'tallyText').textContent,/1승 0패/,'rematch tally uses measured times');
  assert.match(el(guest,'tallyText').textContent,/오차 9\.98/);
  const rounds=[legacyRound,['old',10000,'new',0,'a','b',[],[10000]],['old',4900,'new',5100,'a','b',[],[4900]]];
  assert.deepEqual(JSON.parse(JSON.stringify(old.Duel.tallyOf(rounds,'b','new'))),{w:1,l:0,t:2});
  const historical=page('ten','#r='+b64e(JSON.stringify({v:1,h:[['a',20,'b',9900,'a','b']]})));
  assert.match(el(historical,'verdict').className,/lose/,'old early-stop result is not interpreted as a tiny error');

  const w=page('typing'); let st=typing(w);
  composition(w,'compositionstart');
  const enter=new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true});
  el(w,'typeIn').dispatchEvent(enter); assert.equal(enter.defaultPrevented,false,'IME commit key is not blocked');
  for(const value of ['가나ㄷ','가나다']) {
    input(w,value,true); assert.equal(st.idx,0); assert.equal(st.errors,0);
    assert.equal(el(w,'typeIn').value,value,'IME input stays intact until committed');
  }
  composition(w,'compositionend'); input(w,'가나다');
  await tick(10);
  assert.equal(st.idx,1); assert.equal(st.correct,3); assert.equal(st.errors,0);

  // compositionend without a final input still finishes the sentence once.
  st=typing(w,'가나닭'); composition(w,'compositionstart');
  for(const value of ['가나ㄷ','가나다','가나달','가나닭']) { input(w,value,true); assert.equal(st.idx,0); }
  composition(w,'compositionend'); await tick(10);
  assert.equal(st.idx,1); assert.equal(st.correct,3); assert.equal(st.errors,0);
  input(w,'가나닭'); // A late final input must not spill into the next sentence.
  assert.equal(st.idx,1); assert.equal(st.typed,''); assert.equal(el(w,'typeIn').value,'');

  // Some keyboards omit composition events; partial trailing syllables still wait.
  st=typing(w,'가나닭');
  for(const value of ['가나ㄷ','가나다','가나달']) { input(w,value); assert.equal(st.idx,0); }
  input(w,'가나닭'); assert.equal(st.idx,1); assert.equal(st.errors,0);
  st=typing(w); input(w,'가나ㄷ',true); assert.equal(st.idx,0);
  input(w,'가나다'); assert.equal(st.idx,1);

  // Every actual sentence must tolerate the initial consonant of its last syllable.
  for(const sentence of w.__ev('SENT')) {
    st=typing(w,sentence); composition(w,'compositionstart');
    const syllable=sentence.charCodeAt(sentence.length-1)-0xAC00;
    assert.ok(syllable>=0 && syllable<=11171);
    const initial='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[Math.floor(syllable/588)];
    input(w,sentence.slice(0,-1)+initial,true); assert.equal(st.idx,0); assert.equal(st.errors,0);
    input(w,sentence,true); assert.equal(st.idx,0);
    composition(w,'compositionend'); input(w,sentence);
    assert.equal(st.idx,1); assert.equal(st.correct,sentence.length); assert.equal(st.errors,0);
  }

  // Confirmed mistakes count once; finishing during composition cannot score twice.
  st=typing(w,'가나닭'); composition(w,'compositionstart'); input(w,'가나달',true);
  composition(w,'compositionend'); await tick(10);
  assert.equal(st.idx,1); assert.equal(st.correct,2); assert.equal(st.errors,1);
  st=typing(w); composition(w,'compositionstart'); input(w,'가나ㄷ',true);
  w.__ev('finishPlay()'); const score=st.correct, errors=st.errors;
  composition(w,'compositionend'); await tick(10); input(w,'가나다');
  assert.equal(st.correct,score); assert.equal(st.errors,errors); assert.equal(st.idx,0);
  assert.deepEqual(PAGE_ERRORS,[]);
  console.log('점수/입력 회귀 검사 통과 — 10초 경계값·옛/새 링크·응답/재열기/전적·한글 조합/겹받침/확정/중복 이벤트');
})().catch(error=>{ console.error(error); process.exitCode=1; }).finally(()=>windows.forEach(w=>w.close()));
