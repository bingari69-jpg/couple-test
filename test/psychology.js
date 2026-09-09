const assert=require('node:assert/strict');
const {load,el,PAGE_ERRORS}=require('./dom');
const opened=[];
function open(slug,hash){const w=load(slug,hash).window;opened.push(w);return w;}
function complete(w,type){el(w,'begin').click();for(let i=0;i<6;i++){assert.equal(el(w,'answers').children.length,3);el(w,'answers').children[type].click();el(w,'nextQuestion').click();}}
(async()=>{
 const hub=open('psychology');assert.equal(el(hub,'tests').children.length,6);
 for(const [cat,count] of [['성격',3],['관계',2],['운세',1],['전체',6]]){hub.document.querySelector('[data-category="'+cat+'"]').click();assert.equal(el(hub,'tests').children.length,count);}
 for(const [i,title] of ['포근한 곰','반짝이는 여우','느긋한 고양이'].entries()){const w=open('personality');complete(w,i);assert.equal(el(w,'animalName').textContent,title);assert.equal(el(w,'outcome').hidden,false);const data=w.psyShareData();const r=open('personality',data.url.slice(data.url.indexOf('#')));assert.equal(el(r,'animalName').textContent,title);assert.equal(el(r,'sharedNote').hidden,false);el(r,'again').click();assert.equal(el(r,'quiz').hidden,false);assert.ok(el(r,'nextQuestion').disabled);}
 const edit=open('personality');el(edit,'begin').click();assert.ok(el(edit,'nextQuestion').disabled);el(edit,'answers').children[0].click();el(edit,'answers').children[2].click();assert.equal(edit.document.querySelectorAll('#answers [aria-pressed=true]').length,1);el(edit,'nextQuestion').click();el(edit,'prevQuestion').click();assert.equal(el(edit,'answers').children[2].getAttribute('aria-pressed'),'true');
 const f=open('fortune');assert.equal(el(f,'intro').hidden,false);f.document.querySelector('[data-draw]').click();assert.equal(el(f,'outcome').hidden,false);const title=el(f,'fortuneTitle').textContent;const storage=f.localStorage.getItem('gatchi-fortune-v1');f.dispatchEvent(new f.HashChangeEvent('hashchange'));assert.equal(el(f,'fortuneTitle').textContent,title);assert.equal(el(f,'intro').hidden,true);
 const data=f.psyShareData();const r=open('fortune',data.url.slice(data.url.indexOf('#')));assert.equal(el(r,'fortuneTitle').textContent,title);assert.equal(el(r,'sharedNote').hidden,false);assert.equal(r.localStorage.getItem('gatchi-fortune-v1'),null);el(r,'drawMine').click();assert.equal(el(r,'intro').hidden,false);
 const old=JSON.parse(storage);old.d='2000-01-01';f.localStorage.setItem('gatchi-fortune-v1',JSON.stringify(old));f.dispatchEvent(new f.HashChangeEvent('hashchange'));assert.equal(el(f,'intro').hidden,false);
 for(const [slug,hash] of [['personality','#r=1-99'],['personality','#r=<img>'],['fortune','#r=1-2026-02-30-0'],['fortune','#r=1-2026-09-10-8']])assert.equal(el(open(slug,hash),'invalid').hidden,false);
 r.document.querySelector('[data-draw]').click();Object.defineProperty(r.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}}});el(r,'copyPsy').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(el(r,'manualCopy').hidden,false);assert.ok(el(r,'shareUrl').value.includes('#r=1-'));
 opened.forEach(w=>w.close());assert.deepEqual(PAGE_ERRORS,[]);console.log('심리 메뉴·필터, 성격 3결과·답 수정·공유, 운세 일일 보관·날짜 만료·공유 분리·잘못된 링크 검사 통과');
})().catch(e=>{opened.forEach(w=>w.close());console.error(e);process.exitCode=1;});
