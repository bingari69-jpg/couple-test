const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const {load,el,PAGE_ERRORS}=require('./dom');
const opened=[],open=(s,h)=>{const w=load(s,h).window;opened.push(w);return w;},enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const hash=w=>new URL(w.psyShareData().url).hash;
const choose=(w,v)=>{el(w,'seriesOptions').children[v].click();el(w,'seriesNext').click();};
const finish=(w,values)=>values.forEach(v=>choose(w,v));
const ctx={};vm.createContext(ctx);for(const file of ['mind-series-data','tarot-deck','tarot-engine','mind-series-engine'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/'+file+'.js'),'utf8').replaceAll('window.','globalThis.'),ctx);
const E=ctx.MindSeriesEngine,D=ctx.MindSeriesData;
(async()=>{
 assert.equal(Object.keys(D.series).length,5);assert.equal(D.series['know-me'].episodes.length,6);assert.equal(D.series.living.episodes.length,7);
 const base={v:1,s:'know-me',e:'travel',id:'1234567890abcdef',seed:1,p:{n:'나',a:[0,1,2,3,0,1],g:[0,1,2]}};
 assert.ok(E.invite(base));
 for(const edit of [c=>c.p.a.pop(),c=>c.p.g.push(1),c=>c.p.a[0]=4,c=>c.e='bogus',c=>c.s='__proto__',c=>c.seed=-1,c=>c.p.n='가'.repeat(13)]){const c=structuredClone(base);edit(c);assert.equal(E.invite(c),false);}
 // Every answer ordering still represents all four traits; ties are explicitly mixed.
 for(const ep of D.series['know-me'].episodes)for(const q of ep.questions)assert.equal(new Set(q.traits).size,4);
 const ep=D.series['know-me'].episodes[0],tied=ep.questions.map((q,i)=>q.traits.indexOf(i%2));assert.equal(E.profile(tied,ep).title,'장면 따라 달라지는 마음동물');
 for(const ep of D.series['know-me'].episodes){
  const maker=open('know-me');maker.document.querySelector('[data-episode="'+ep.id+'"]').click();el(maker,'seriesName').value='먼저';el(maker,'beginSeries').click();assert.equal(el(maker,'seriesNext').disabled,true);
  choose(maker,0);[...maker.document.querySelectorAll('#seriesApp button')].find(b=>b.textContent==='← 이전').click();assert.equal(el(maker,'seriesOptions').children[0].getAttribute('aria-pressed'),'true');el(maker,'seriesNext').click();finish(maker,[1,2,3,0,1,0,1,2]);
  const invite=hash(maker);assert.ok(invite.startsWith('#c='));assert.match(maker.document.body.textContent,/내 이야기는 골랐어/);
  const guest=open('know-me',invite);assert.ok(el(guest,'joinSeries'));assert.equal(guest.document.querySelector('.result-animal'),null);el(guest,'seriesName').value='답한';el(guest,'joinSeries').click();
  finish(guest,[3,2,1,0,3,2,0,2]);assert.equal(guest.document.querySelector('.result-animal'),null);choose(guest,0);
  assert.match(el(guest,'seriesComparison').textContent,/같은 답을 고른 장면 0 \/ 6/);assert.match(el(guest,'seriesComparison').textContent,/먼저님이 답한님을 맞힌 예상 1 \/ 3/);assert.match(el(guest,'seriesComparison').textContent,/답한님이 먼저님을 맞힌 예상 3 \/ 3/);
  const response=hash(guest),back=open('know-me',response);assert.equal(el(back,'seriesComparison').textContent,el(guest,'seriesComparison').textContent);
  // Actual originator round trip and refreshing the original invite retain the guest's commitment.
  maker.history.replaceState(null,'',response);maker.dispatchEvent(new maker.HashChangeEvent('hashchange'));assert.ok(el(maker,'seriesComparison'));
  guest.history.replaceState(null,'',invite);guest.dispatchEvent(new guest.HashChangeEvent('hashchange'));assert.equal(hash(guest),response);
 }
 const repair=open('repair');el(repair,'beginSeries').click();finish(repair,[0,1,0,0,0,1]);const partner=open('repair',hash(repair));el(partner,'joinSeries').click();finish(partner,[1,0,1,1,1,2]);assert.match(partner.document.body.textContent,/기다림이 끝나는 시간/);assert.ok(el(partner,'seriesMessage'));el(partner,'seriesMessage').value='잠깐 쉬고 여덟 시에 다시 이야기하자.';
 Object.defineProperty(partner.navigator,'clipboard',{value:{writeText:async text=>{assert.equal(text,'잠깐 쉬고 여덟 시에 다시 이야기하자.');}}});[...partner.document.querySelectorAll('button')].find(b=>b.textContent==='이 문장 복사하기').click();
 for(const ep of D.series.living.episodes){
  const a=open('living');a.document.querySelector('[data-episode="'+ep.id+'"]').click();el(a,'beginSeries').click();const serious=ep.id==='serious';finish(a,serious?[4,4,4,0,3]:[0,0,0,0,0,0,2,0]);
  const b=open('living',hash(a));el(b,'joinSeries').click();finish(b,serious?[0,1,2,1,0]:[1,1,1,1,1,1,2,1]);assert.match(b.document.body.textContent,/우리 집 규칙, 아직은 각자의 제안/);if(serious)assert.match(b.document.body.textContent,/둘 다 답한 0장면/);else assert.ok(b.document.querySelector('.important-scene'));
 }
 const agree=structuredClone(base);agree.s='living';agree.e='weekend';agree.p={n:'나',a:[0,0,0,0,0,0],g:[],important:0,rule:1};const ar={c:agree,b:{...agree.p,n:'너'},votes:[null,null]};assert.ok(E.result(ar));assert.match(open('living','#r='+enc(ar)).document.body.textContent,/둘 다 동의한 우리 집 규칙/);
 // Cards are stable across 22 × 22 choices, and every topic offers three concrete actions.
 for(const ep of D.series['next-scene'].episodes){for(let a=0;a<22;a++)for(let b=0;b<22;b++){const c={...base,s:'next-scene',e:ep.id,p:{n:'나',a:[a],g:[]}};const r={c,b:{n:'너',a:[b],g:[]},votes:[null,null]};assert.ok(E.result(r));const t=E.tarot(r);assert.equal(t.actions.length,3);assert.equal(new Set(t.actions).size,3);assert.ok(t.cards.us!==t.cards.a&&t.cards.us!==t.cards.b);}}
 const a=open('next-scene');el(a,'beginSeries').click();choose(a,3);const b=open('next-scene',hash(a));el(b,'joinSeries').click();choose(b,8);assert.equal(b.document.querySelectorAll('.series-tarot-face').length,3);assert.match(b.document.body.textContent,/아직 둘의 선택이 모이지 않았어/);
 b.document.querySelectorAll('.series-option')[1].click();const response=hash(b);a.history.replaceState(null,'',response);a.dispatchEvent(new a.HashChangeEvent('hashchange'));a.document.querySelectorAll('.series-option')[1].click();assert.match(a.document.body.textContent,/같은 제안을 골랐어/);
 const final=hash(a);b.history.replaceState(null,'',final);b.dispatchEvent(new b.HashChangeEvent('hashchange'));assert.match(b.document.body.textContent,/같은 제안을 골랐어/);el(b,'saveTarot').click();assert.equal(JSON.parse(b.localStorage.getItem('mind-series:tarots')).length,1);
 // A changed partner reply with the same id must not inherit another pair's local action votes.
 const changed=JSON.parse(Buffer.from(final.slice(3),'base64url'));changed.b.a=[9];changed.votes=[null,null];b.history.replaceState(null,'','#r='+enc(changed));b.dispatchEvent(new b.HashChangeEvent('hashchange'));assert.match(b.document.body.textContent,/아직 둘의 선택이 모이지 않았어/);
 const f=open('lucky');f.document.querySelector('.lucky-back').click();const card=hash(f),day=JSON.parse(Buffer.from(card.slice(3),'base64url')).d;f.dispatchEvent(new f.HashChangeEvent('hashchange'));assert.equal(hash(f),card);
 const receiver=open('lucky',card);assert.equal(receiver.localStorage.getItem('mind-series:fortune:'+day),null);el(receiver,'drawMyFortune').click();receiver.document.querySelector('.lucky-back').click();assert.match(receiver.document.body.textContent,/가 만나면/);assert.equal(JSON.parse(receiver.localStorage.getItem('mind-series:fortune-history')).length,1);
 const old={v:1,s:'lucky',d:'2000-01-01',i:0};receiver.history.replaceState(null,'','#r='+enc(old));receiver.dispatchEvent(new receiver.HashChangeEvent('hashchange'));assert.equal(JSON.parse(receiver.localStorage.getItem('mind-series:fortune-history')).length,1);
 // No recent category repeated, and one daily card remains stable across redraw attempts.
 const fresh=open('lucky'),oldCards=[{v:1,s:'lucky',d:'2000-01-01',i:0},{v:1,s:'lucky',d:'2000-01-02',i:1},{v:1,s:'lucky',d:'2000-01-03',i:2}];fresh.localStorage.setItem('mind-series:fortune-history',JSON.stringify(oldCards));fresh.document.querySelector('.lucky-back').click();const drawn=JSON.parse(Buffer.from(hash(fresh).slice(3),'base64url'));assert.ok(D.fortunes[drawn.i][5]>=3);
 for(const slug of Object.keys(D.series)){for(const bad of ['#c=abc','#r='+enc({v:1,s:slug}),'#r='+enc({v:1,s:'lucky',d:'2026-02-30',i:0})])assert.match(open(slug,bad).document.body.textContent,/링크를 읽을 수 없어/);}
 const attack=structuredClone(ar);attack.c.p.n='<img>';const safe=open('living','#r='+enc(attack));assert.equal(safe.document.querySelector('#seriesApp img'),null);
 const blocked=open('know-me');blocked.Storage.prototype.setItem=function(){throw Error('blocked');};el(blocked,'beginSeries').click();finish(blocked,[0,1,2,3,0,1,0,1,2]);assert.ok(hash(blocked).startsWith('#c='));
 Object.defineProperty(blocked.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}}});el(blocked,'seriesCopy').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(el(blocked,'seriesShareUrl').hidden,false);
 // Published old slugs are migrated once; retired MBTI/seat cannot come back via admin settings.
 const events=[],catalog={window:{addEventListener(){},dispatchEvent(e){events.push(e);}},CustomEvent:function(type){this.type=type;}};vm.createContext(catalog);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/home-catalog.js'),'utf8'),catalog);
 vm.runInContext(`applyPublishedCatalog({games:[{slug:'personality',title:'OLD',path:'t/personality/',visibility:'listed'},{slug:'mbti',visibility:'listed'},{slug:'seat',visibility:'listed'},{slug:'fortune',visibility:'hidden'}]})`,catalog);
 const paths=catalog.window.HOME_ITEMS.map(x=>x.path);assert.ok(paths.includes('t/know-me/'));assert.ok(!paths.includes('t/lucky/'));assert.ok(!paths.includes('t/mbti/')&&!paths.includes('t/seat/'));assert.equal(paths.filter(x=>x==='t/know-me/').length,1);assert.equal(catalog.window.HOME_ITEMS.find(x=>x.path==='t/know-me/').title,'너, 나 얼마나 알아?');
 vm.runInContext(`applyPublishedCatalog({games:[{slug:'personality',visibility:'listed'},{slug:'know-me',visibility:'listed',title:'새 관리 제목'}]})`,catalog);assert.equal(catalog.window.HOME_ITEMS.filter(x=>x.path==='t/know-me/').length,1);assert.equal(catalog.window.HOME_ITEMS.find(x=>x.path==='t/know-me/').title,'새 관리 제목');
 await new Promise(resolve=>setImmediate(resolve));opened.forEach(w=>w.close());assert.deepEqual(PAGE_ERRORS,[]);console.log('Five series passed: all episodes, mutual predictions, return links, repair needs, living priorities/skip/rules, 1452 tarot combinations and mutual votes, daily history, blocked storage, malformed links and old-catalog migration.');
})().catch(e=>{opened.forEach(w=>w.close());console.error(e);process.exitCode=1;});
