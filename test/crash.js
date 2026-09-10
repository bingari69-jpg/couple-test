const assert=require('node:assert/strict');
const {load,el,b64e,PAGE_ERRORS}=require('./dom');

const opened=[];
const open=hash=>{const d=load('crash',hash);opened.push(d.window);return d.window;};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

(async()=>{
  const maker=open();
  assert.equal(el(maker,'v-intro').classList.contains('hidden'),false);
  assert.equal(el(maker,'startBtn').textContent,'내 선택 시작하기');
  el(maker,'startBtn').click();
  const makerAnswers=[];
  for(let i=0;i<8;i++){
    assert.equal(el(maker,'opts').children.length,2);
    const choice=i%2;makerAnswers.push(choice);el(maker,'opts').children[choice].click();
  }
  assert.equal(el(maker,'v-mine').classList.contains('hidden'),false);
  assert.equal(el(maker,'makeLink'),null);
  assert.match(el(maker,'tellCount').textContent,/\/4$/);
  assert.match(el(maker,'ruleCount').textContent,/\/4$/);
  el(maker,'myNameIn').value='서준';
  let inviteMessage;
  maker.kakaoShare=o=>{inviteMessage=o;return Promise.resolve(true);};
  el(maker,'kakaoBtn').click();
  assert.equal(inviteMessage.btn,'나도 선택하기');
  assert.match(inviteMessage.desc,/8개/);
  const inviteHash=new URL(inviteMessage.url).hash;
  const invitePayload=JSON.parse(Buffer.from(inviteHash.slice(3),'base64url').toString());
  assert.equal(invitePayload.v,2);assert.equal(invitePayload.n,'서준');assert.deepEqual(invitePayload.a,makerAnswers);

  const guest=open(inviteHash);
  assert.equal(el(guest,'v-invited').classList.contains('hidden'),false);
  assert.match(el(guest,'invTitle').textContent,/서준님의선택이 봉인됐어요/);
  el(guest,'guestNameIn').value='하린';el(guest,'startInvited').click();
  for(let i=0;i<8;i++)el(guest,'opts').children[makerAnswers[i]===0?1:0].click();
  assert.equal(el(guest,'cmpScore').textContent,'0/8');
  assert.match(el(guest,'cmpLabel').textContent,/토론부터/);
  assert.equal(guest.document.querySelectorAll('.drow').length,8);
  assert.equal(guest.document.querySelectorAll('.drow .who span').length,16);
  assert.ok(!guest.document.querySelector('.drow .who').textContent.includes('1번'));
  assert.match(el(guest,'kakaoRes').textContent,/서준에게 돌려보내기/);
  Object.defineProperty(guest.navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true});
  guest.document.querySelector('.ask-why').click();await tick();
  let resultMessage;guest.kakaoShare=o=>{resultMessage=o;return Promise.resolve(true);};el(guest,'kakaoRes').click();
  assert.match(resultMessage.desc,/8개의 극한 선택/);
  const resultHash=new URL(resultMessage.url).hash;
  const resultPayload=JSON.parse(Buffer.from(resultHash.slice(3),'base64url').toString());
  assert.equal(resultPayload.v,2);assert.equal(resultPayload.n2,'하린');assert.equal(resultPayload.a2.length,8);
  const result=open(resultHash);assert.equal(el(result,'v-compare').classList.contains('hidden'),false);assert.equal(el(result,'kakaoRes').classList.contains('hidden'),true);assert.equal(el(result,'shareResult').classList.contains('hidden'),true);

  const mixedHash='#r='+b64e(JSON.stringify({v:2,n:'열글자까지긴이름',n2:'친구',a:[0,0,0,0,0,0,0,0],a2:[0,1,0,1,0,1,0,1]}));
  const mixed=open(mixedHash);assert.equal(el(mixed,'cmpScore').textContent,'4/8');assert.match(mixed.document.querySelector('.same-list summary').textContent,/같은 선택 4개/);assert.equal(mixed.document.querySelectorAll('.same-choice').length,4);

  const oldHash='#i='+b64e(JSON.stringify({v:1,n:'예전친구',a:[0,1,0,1,0,1,0,1,0,1]}));
  const old=open(oldHash);assert.equal(el(old,'v-invited').classList.contains('hidden'),false);el(old,'startInvited').click();for(let i=0;i<8;i++)el(old,'opts').children[0].click();assert.match(el(old,'cmpScore').textContent,/\/8$/);
  const bad=open('#i='+b64e(JSON.stringify({v:2,n:'오류',a:[0,1]})));assert.equal(el(bad,'v-intro').classList.contains('hidden'),false);
  const badValue=open('#i='+b64e(JSON.stringify({v:2,n:'오류',a:[0,1,0,1,0,1,0,2]})));assert.equal(el(badValue,'v-intro').classList.contains('hidden'),false);

  opened.forEach(w=>w.close());
  assert.deepEqual(PAGE_ERRORS,[]);
  console.log('추락 선택 게임 검사 통과 — 8개 선택, 즉시 초대, 이름 입력, 실제 답 비교, 대화 문장, 결과 회신, 옛 링크 호환');
})().catch(e=>{opened.forEach(w=>w.close());console.error(e);process.exitCode=1;});
