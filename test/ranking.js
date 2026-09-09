const assert=require('node:assert/strict');
const {load,el,grabKakao,PAGE_ERRORS,b64e}=require('./dom');
const windows=[];
function open(hash){const w=load('ranking',hash).window;windows.push(w);return w;}
function shown(w,id){return !el(w,id).hidden;}
function choose(w,order){order.forEach(i=>el(w,'choices').children[i].click());}
function complete(w,answers){answers.forEach(a=>{choose(w,a);el(w,'next').click();});}
async function run(){
const maker=open();
assert.ok(shown(maker,'intro'));
el(maker,'makerName').value='다람🐿️';el(maker,'packs').children[1].click();el(maker,'start').click();
assert.ok(el(maker,'next').disabled);
assert.equal(el(maker,'choices').children.length,3);
choose(maker,[1]);assert.equal(el(maker,'next').disabled,false);
choose(maker,[2]);assert.equal(maker.document.querySelectorAll('#choices [aria-pressed=true]').length,1);
assert.equal(el(maker,'choices').children[1].getAttribute('aria-pressed'),'false');
const answers=[[0],[1],[2]];
choose(maker,answers[0]);el(maker,'next').click();el(maker,'previous').click();
assert.equal(el(maker,'choices').children[0].getAttribute('aria-pressed'),'true');el(maker,'next').click();
complete(maker,answers.slice(1));assert.ok(shown(maker,'share'));
const invitation=grabKakao(maker,'sendInvite');assert.equal(invitation.textOnly,false);
assert.ok(invitation.url.includes('/couple-test/t/ranking/#c='));assert.ok(invitation.url.length<1500);
const hash=invitation.url.slice(invitation.url.indexOf('#'));
const guest=open(hash);assert.ok(shown(guest,'invite'));assert.equal(el(guest,'hostName').textContent,'다람🐿️');
el(guest,'guestName').value='친한 친구';el(guest,'guessStart').click();
assert.equal(el(guest,'comparisons').textContent,'');
complete(guest,answers);assert.ok(shown(guest,'result'));assert.equal(el(guest,'score').textContent,'3 / 3');
assert.equal(el(guest,'scoreNote').textContent,'세 문제 모두 맞혔어!');
assert.equal(guest.document.querySelectorAll('.compare-row.match').length,3);
const reply=grabKakao(guest,'sendResult');assert.ok(reply.url.includes('#r='));
const result=open(reply.url.slice(reply.url.indexOf('#')));assert.ok(shown(result,'result'));assert.equal(el(result,'score').textContent,'3 / 3');
// Returning to an answered invitation in this tab must not offer another blind guess.
guest.dispatchEvent(new guest.HashChangeEvent('hashchange'));assert.ok(shown(guest,'result'));
el(guest,'newGame').click();assert.ok(shown(guest,'intro'));assert.equal(guest.location.hash,'');assert.equal(el(guest,'makerName').value,'친한 친구');
const wrong=open(hash);el(wrong,'guessStart').click();complete(wrong,[[1],[2],[0]]);
assert.equal(el(wrong,'score').textContent,'0 / 3');assert.equal(wrong.document.querySelectorAll('.comparison').length,3);
assert.ok(el(wrong,'comparisons').textContent.includes('이건 의외지?'));
const partial=open(hash);el(partial,'guessStart').click();complete(partial,[[0],[1],[0]]);assert.equal(el(partial,'score').textContent,'2 / 3');
await Promise.resolve();
el(maker,'edit').click();choose(maker,[2]);el(maker,'next').click();el(maker,'next').click();el(maker,'next').click();
const changed=grabKakao(maker,'sendInvite');assert.notEqual(changed.url,invitation.url);
const decoded=JSON.parse(Buffer.from(hash.slice(3),'base64url').toString());
assert.equal(decoded.v,2);
for(const bad of ['#c=garbage','#wat=x','#c='+b64e(JSON.stringify({...decoded,p:9})), '#c='+b64e(JSON.stringify({...decoded,a:[[0,1],...decoded.a.slice(1)]})), '#c='+b64e(JSON.stringify({...decoded,a:[[3],[0],[1]]})), '#c='+b64e(JSON.stringify({...decoded,v:1})), '#r='+b64e(JSON.stringify({c:decoded,n:'x',g:[]})),'#c='+'a'.repeat(3000)])assert.ok(shown(open(bad),'invalid'));
const injection=open('#c='+b64e(JSON.stringify({...decoded,n:'<img src=x>'})));assert.equal(el(injection,'hostName').textContent,'<img src=x>');assert.equal(el(injection,'hostName').children.length,0);
async function asyncChecks(){
  Object.defineProperty(wrong.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}}});
  el(wrong,'copyResult').click();await new Promise(r=>setImmediate(r));assert.ok(!el(wrong,'manualCopy').hidden);assert.ok(el(wrong,'shareUrl').value.includes('#r='));
  for(let p=0;p<3;p++){const w=open();el(w,'packs').children[p].click();el(w,'start').click();complete(w,answers);assert.ok(shown(w,'share'));}
  windows.forEach(w=>w.close());assert.deepEqual(PAGE_ERRORS,[]);
  console.log('최애 선택 검사 통과: 보기 3개·단일 선택·변경·이전, 초대/결과 왕복, 3점/2점/0점, 잘못된 링크·이름 안전 표시·복사 대안');
}
await asyncChecks();
}
run().catch(e=>{windows.forEach(w=>w.close());console.error(e);process.exitCode=1;});
