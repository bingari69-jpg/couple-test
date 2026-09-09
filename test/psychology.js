const assert=require('node:assert/strict');
const {load,el,PAGE_ERRORS}=require('./dom');
const opened=[];
function open(slug,hash){const w=load(slug,hash).window;opened.push(w);return w;}
function complete(w,type){el(w,'begin').click();for(let i=0;i<6;i++){assert.equal(el(w,'answers').children.length,3);el(w,'answers').children[type].click();el(w,'nextQuestion').click();}}
(async()=>{
 const hub=open('psychology');assert.equal(el(hub,'tests').children.length,6);
 for(const [cat,count] of [['성격',3],['관계',2],['운세',1],['전체',6]]){hub.document.querySelector('[data-category="'+cat+'"]').click();assert.equal(el(hub,'tests').children.length,count);}
 for(const [i,title] of ['포근한 곰','반짝이는 여우','느긋한 고양이'].entries()){
  const w=open('personality');el(w,'makerName').value='나';complete(w,i);
  assert.equal(el(w,'sealed').hidden,false);assert.equal(el(w,'outcome').hidden,true);assert.equal(el(w,'animals').children.length,0);
  const data=w.psyShareData();assert.ok(data.url.includes('#c='));assert.ok(!data.title.includes(title));const hash=data.url.slice(data.url.indexOf('#'));
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(el(w,'sealed').hidden,false);
  const r=open('personality',hash);assert.equal(el(r,'invitation').hidden,false);assert.equal(el(r,'animals').children.length,0);el(r,'guestName').value='너';el(r,'join').click();
  for(let q=0;q<6;q++){el(r,'answers').children[(i+1)%3].click();if(q<5)assert.equal(el(r,'animals').children.length,0);el(r,'nextQuestion').click();}
  assert.equal(el(r,'outcome').hidden,false);assert.equal(el(r,'animals').children.length,2);assert.ok(el(r,'animals').textContent.includes(title));assert.equal(el(r,'togetherCount').textContent,'같은 답을 고른 질문 0 / 6');
  const result=r.psyShareData();assert.ok(result.url.includes('#r='));const back=open('personality',result.url.slice(result.url.indexOf('#')));assert.equal(el(back,'animals').textContent,el(r,'animals').textContent);
  r.history.replaceState(null,'',hash);r.dispatchEvent(new r.HashChangeEvent('hashchange'));assert.equal(el(r,'outcome').hidden,false);
  el(r,'again').click();assert.equal(el(r,'intro').hidden,false);assert.equal(el(r,'animals').children.length,0);
  const bad=JSON.parse(Buffer.from(hash.slice(3),'base64url').toString());bad.a=[0];assert.equal(el(open('personality','#c='+Buffer.from(JSON.stringify(bad)).toString('base64url')),'invalid').hidden,false);
 }
 const oldResult=open('personality','#r=1-2');assert.equal(el(oldResult,'legacy').hidden,false);el(oldResult,'legacyBegin').click();assert.equal(el(oldResult,'intro').hidden,false);
 const edit=open('personality');el(edit,'begin').click();assert.ok(el(edit,'nextQuestion').disabled);el(edit,'answers').children[0].click();el(edit,'answers').children[2].click();assert.equal(edit.document.querySelectorAll('#answers [aria-pressed=true]').length,1);el(edit,'nextQuestion').click();el(edit,'prevQuestion').click();assert.equal(el(edit,'answers').children[2].getAttribute('aria-pressed'),'true');
 const f=open('fortune');assert.equal(el(f,'intro').hidden,false);f.document.querySelector('[data-draw]').click();assert.equal(el(f,'outcome').hidden,false);const title=el(f,'fortuneTitle').textContent;const storage=f.localStorage.getItem('gatchi-fortune-v1');f.dispatchEvent(new f.HashChangeEvent('hashchange'));assert.equal(el(f,'fortuneTitle').textContent,title);assert.equal(el(f,'intro').hidden,true);
 const data=f.psyShareData();const r=open('fortune',data.url.slice(data.url.indexOf('#')));assert.equal(el(r,'fortuneTitle').textContent,title);assert.equal(el(r,'sharedNote').hidden,false);assert.equal(r.localStorage.getItem('gatchi-fortune-v1'),null);el(r,'drawMine').click();assert.equal(el(r,'intro').hidden,false);
 const old=JSON.parse(storage);old.d='2000-01-01';f.localStorage.setItem('gatchi-fortune-v1',JSON.stringify(old));f.dispatchEvent(new f.HashChangeEvent('hashchange'));assert.equal(el(f,'intro').hidden,false);
 for(const [slug,hash] of [['personality','#r=1-99'],['personality','#r=<img>'],['fortune','#r=1-2026-02-30-0'],['fortune','#r=1-2026-09-10-8']])assert.equal(el(open(slug,hash),'invalid').hidden,false);
 r.document.querySelector('[data-draw]').click();Object.defineProperty(r.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}}});el(r,'copyPsy').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(el(r,'manualCopy').hidden,false);assert.ok(el(r,'shareUrl').value.includes('#r=1-'));
 opened.forEach(w=>w.close());assert.deepEqual(PAGE_ERRORS,[]);console.log('심리 메뉴·필터, 성격 3결과·답 수정·공유, 운세 일일 보관·날짜 만료·공유 분리·잘못된 링크 검사 통과');
})().catch(e=>{opened.forEach(w=>w.close());console.error(e);process.exitCode=1;});
