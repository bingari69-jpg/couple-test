/* Exercise real page handlers and common share adapter; only the Kakao SDK boundary is simulated. */
const assert=require('node:assert/strict');const {load,el,PAGE_ERRORS}=require('./dom');const opened=[];
const tick=()=>new Promise(r=>setImmediate(r));
function open(slug,hash){const w=load(slug,hash).window;opened.push(w);w.matchMedia=()=>({matches:true});return w;}
async function check(w){
 let message,done,copied;w.Kakao={isInitialized:()=>true,Share:{sendDefault:m=>{message=m;return new Promise(r=>{done=r;});}}};
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async s=>{copied=s;}},configurable:true});
 const expected=w.psyShareData();el(w,'sharePsy').click();await tick();
 assert.equal(message.objectType,'text','image-free invitations must use a text template');assert.equal(message.content,undefined);assert.equal(message.link.webUrl,expected.url);assert.equal(message.link.mobileWebUrl,expected.url);assert.equal(message.buttonTitle,expected.btn);assert.equal(el(w,'sharePsy').disabled,true,'wait for SDK dispatch before re-enabling');
 done();await tick();assert.equal(el(w,'sharePsy').disabled,false);
 w.Kakao.Share.sendDefault=()=>Promise.reject(Error('unavailable'));el(w,'sharePsy').click();await tick();await tick();assert.equal(copied,expected.url);assert.equal(el(w,'sharePsy').disabled,false);assert.ok(el(w,'shareStatus').textContent.includes('복사'));
 w.navigator.clipboard.writeText=async()=>{throw Error('denied');};el(w,'sharePsy').click();await tick();await tick();assert.equal(el(w,'manualCopy').hidden,false);assert.equal(el(w,'shareUrl').value,expected.url);
}
(async()=>{
 const a=open('tarot');el(a,'begin').click();a.document.querySelector('[data-pick="0"]').click();el(a,"confirmPick").click();await check(a);
 const invite=a.psyShareData().url.split('#')[1],b=open('tarot','#'+invite);el(b,'join').click();b.document.querySelector('[data-pick="1"]').click();el(b,"confirmPick").click();for(let i=0;i<3;i++)b.document.querySelector("[data-reveal=\""+i+"\"]").click();await check(b);
 const c=open('personality');el(c,'begin').click();for(let i=0;i<6;i++){el(c,'answers').children[1].click();el(c,'nextQuestion').click();}await check(c);
 const d=open('fortune');d.document.querySelector('[data-draw="0"]').click();await check(d);
 opened.forEach(w=>w.close());assert.deepEqual(PAGE_ERRORS,[]);console.log('실제 공유 버튼 검사 통과: 타로 봉인/결과·마음동물·운세 → 텍스트 SDK 메시지, 대기 상태, 오류 시 정확한 링크 복사');
})().catch(e=>{opened.forEach(w=>w.close());console.error(e);process.exitCode=1;});
