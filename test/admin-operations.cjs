const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8'),clone=x=>JSON.parse(JSON.stringify(x));
const pause=()=>new Promise(r=>setTimeout(r,30));
(async()=>{
 const dom=new JSDOM(read('admin/index.html'),{url:'https://noljago.co.kr/admin/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;w.scrollTo=()=>{};w.confirm=()=>true;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.HOME_ITEMS=[{path:'t/ten/',title:'10초',kind:'대결',relationships:['친구']}];w.GATCHI_GUIDES={};
 w.eval(read('assets/letter-templates.js'));w.eval(read('assets/letter-design.js'));
 let state={revision:0,admin:{name:'운영자',role:'owner'},draft:null,published:null,versions:[]},writes=[],failStats=false,release=null,slow=false;
 w.AdminAPI={hasSession:()=>true,messageFrom:e=>e.message,getState:async()=>clone(state),write:async(action,revision,config)=>{
   if(revision!==state.revision)throw Error('다른 기기 변경');if(slow)await new Promise(r=>release=r);
   writes.push({action,config:clone(config)});state.revision++;state.draft=clone(config);if(action==='publish')state.published=clone(config);return clone(state);
 },getStatsRange:async(from,to)=>{if(failStats)throw Error('연결 실패');return {from,to,visitors:7,totals:{game_started:2,game_completed:3},games:[{slug:'ten',visits:7,starts:2,completes:3,shares:1,responses:0}]};},getInquiries:async()=>[{id:'11111111-1111-4111-8111-111111111111',status:'new',created_at:'2026-09-14',message:'<img src=x onerror=alert(1)>',name:'문의',email:'test@example.com'}]};
 try{
  w.eval(read('admin/admin.js'));await pause();
  assert.equal(d.getElementById('adminApp').hidden,false);assert.equal(w.localStorage.getItem('gatchi_analytics_optout'),'1');
  assert.equal(d.querySelector('.metric strong').textContent,'7');assert(!d.getElementById('statsBody').textContent.includes('150%'));
  d.querySelector('.edit-game').click();const title=d.getElementById('gameTitle');title.value='바뀐 제목';title.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.getElementById('saveDraftBtn').click();await pause();assert.equal(writes[0].config.games[0].title,'바뀐 제목','편집 폼을 닫지 않아도 전역 저장에 포함');assert.match(d.getElementById('saveState').textContent,/미게시/);
  d.getElementById('publishBtn').click();assert.match(d.getElementById('publishChanges').textContent,/바뀐 제목/);
  d.getElementById('publishForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await pause();assert.equal(writes.at(-1).action,'publish');assert.equal(d.getElementById('saveState').textContent,'게시 완료');
  slow=true;title.value='저장 중 편집 1';title.dispatchEvent(new w.Event('input',{bubbles:true}));d.getElementById('saveDraftBtn').click();await pause();title.value='저장 중 편집 2';title.dispatchEvent(new w.Event('input',{bubbles:true}));release();await pause();assert.match(d.getElementById('saveState').textContent,/미저장/,'저장 응답이 늦게 와도 그사이 편집은 미저장');slow=false;
  d.getElementById('removeGameBtn').click();d.getElementById('saveDraftBtn').click();await pause();assert.equal(writes.at(-1).config.games[0].visibility,'hidden');assert.equal(writes.at(-1).config.games.length,1);
  failStats=true;d.getElementById('statsApply').click();await pause();assert.match(d.getElementById('statsStatus').textContent,/마지막/);assert.equal(d.querySelector('.metric strong').textContent,'7','실패 시 0으로 덮어쓰지 않음');
  d.querySelector('[data-view="inquiries"]').click();await pause();assert.equal(d.querySelector('.inquiry-message img'),null);assert.match(d.querySelector('.inquiry-message').textContent,/<img/);
  d.querySelector('[data-view="design"]').click();await new Promise(r=>setTimeout(r,700));assert.match(d.querySelector('#designPreview iframe').src,/admin_preview=1/);
  console.log('관리 운영 UI 통과 — 편집 누락 방지, 초안/게시 상태, 저장 도중 수정, 숨김 유지, 실패 통계 보존, 문의 안전 출력, 실제 미리보기');
 }finally{w.close();}
 // Analytics exclusions must not disable app-config/guide loading.
 for(const [url,optout,blocked] of [['http://localhost:4185/t/ten/',false,true],['https://noljago.co.kr/?admin_preview=1',false,true],['https://noljago.co.kr/t/ten/',true,true],['https://noljago.co.kr/t/ten/',false,false]]){
  const dom=new JSDOM('<script src="https://noljago.co.kr/assets/analytics.js"></script><main><button id="difficulty">난이도</button></main>',{url,runScripts:'outside-only'}),w=dom.window,calls=[];
  if(optout)w.localStorage.setItem('gatchi_analytics_optout','1');w.fetch=(url,opts)=>{calls.push(JSON.parse(opts.body));return Promise.resolve({});};
  w.eval(read('assets/analytics.js'));w.track('link_made');w.document.querySelector('button').click();w.track('solo_started');w.track('ten_finished');
  if(blocked){assert.equal(calls.length,0);assert.equal(w.document.querySelector('script[src*="googletagmanager"]'),null);}else{
   assert.equal(calls.filter(x=>x.p_event==='game_started').length,0);assert.equal(calls.filter(x=>x.p_event==='solo_started').length,1);assert.equal(calls.filter(x=>x.p_event==='game_completed').length,1);assert(calls.every(x=>x.p_method.startsWith('v2:')));
  }w.close();
 }
 console.log('통계 수집 통과 — 개발/미리보기/관리자 제외, 완료 중복 추정 제거, 혼자놀기 구분');
})().catch(e=>{console.error(e);process.exitCode=1;});
