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
 w.AdminAPI={hasSession:()=>true,messageFrom:e=>e.message,isConflict:e=>!!(e&&e.conflict),getState:async()=>clone(state),write:async(action,revision,config)=>{
   if(revision!==state.revision){const e=Error('다른 기기 변경');e.conflict=true;throw e;}if(slow)await new Promise(r=>release=r);
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
  /* 광고 전체 끄고 바로 게시 — 한 번 눌러 게시까지 끝나고, 공개 중 상태가 '꺼짐'으로 바뀐다 */
  d.querySelector('[data-view="ads"]').click();
  d.getElementById('adsEnabled').checked=true;d.getElementById('adsEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));
  d.getElementById('adsOffNow').click();await pause();await pause();
  assert.equal(writes.at(-1).action,'publish');assert.equal(writes.at(-1).config.ads.enabled,false,'광고 끄기 버튼이 광고 꺼진 설정을 게시해야 함');
  assert.equal(state.published.ads.enabled,false);
  assert.match(d.getElementById('adsPublishedState').textContent,/광고 꺼짐/,'지금 공개 중인 광고 상태를 보여줘야 함');
  /* 전체 광고만 켜고 자리를 안 켜면 광고가 안 나온다 — 상태 줄이 그 이유를 말해 줘야 한다 */
  d.getElementById('addAdBtn').click();
  d.getElementById('adsEnabled').checked=true;d.getElementById('adsEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));
  d.getElementById('publishBtn').click();d.getElementById('publishForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await pause();await pause();
  assert.match(d.getElementById('adsPublishedState').textContent,/이 자리 광고 켜기/,'자리가 꺼져 있으면 그 이유를 말해 줘야 함');
  assert.match(d.querySelector('.ad-card h3').textContent,/[꺼짐]/,'꺼진 자리는 제목에 표시');
  /* 자리를 켜면 "보이는 중" 으로 바뀐다 */
  const slotSwitch=d.querySelector('.ad-card [data-field="enabled"]');
  slotSwitch.checked=true;slotSwitch.dispatchEvent(new w.Event('change',{bubbles:true}));
  d.getElementById('publishBtn').click();d.getElementById('publishForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await pause();await pause();
  assert.match(d.getElementById('adsPublishedState').textContent,/보이는 중 · 자리 1개/,'자리를 켜면 보이는 중');
  /* 다른 기기에서 먼저 저장해 revision 이 어긋나도, 내 변경을 잃지 않고 한 번 다시 게시한다 */
  state.revision++;
  d.getElementById('adsEnabled').checked=true;d.getElementById('adsEnabled').dispatchEvent(new w.Event('change',{bubbles:true}));
  const before=writes.length;
  d.getElementById('publishBtn').click();d.getElementById('publishForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await pause();await pause();
  assert.equal(writes.length,before+1,'충돌 뒤 자동으로 한 번 더 게시해야 함');
  assert.equal(writes.at(-1).config.ads.enabled,true,'다시 시도할 때 내 변경이 그대로 실려야 함');
  assert.match(d.getElementById('adsPublishedState').textContent,/광고 보이는 중|자리/);
  d.querySelector('[data-view="design"]').click();await new Promise(r=>setTimeout(r,700));assert.match(d.querySelector('#designPreview iframe').src,/admin_preview=1/);
  console.log('관리 운영 UI 통과 — 편집 누락 방지, 초안/게시 상태, 저장 도중 수정, 숨김 유지, 실패 통계 보존, 문의 안전 출력, 실제 미리보기, 광고 끄고 바로 게시·게시본 확인·충돌 자동 재시도');
 }finally{w.close();}
 /* 공개(listed)로 둘 수 있는 주소는 "홈 카드 목록"이 아니라 "t/ 아래에 실제로 있는 페이지"다.
    2026-09-13 에 네 항목을 홈 카드 목록에서 뺀 뒤, 저장된 설정이 그 항목들을 공개로 갖고 있어서
    validConfig 가 매번 막았고 초안 저장과 게시가 통째로 멈춰 있었다. */
 {
  const dom=new JSDOM(read('admin/index.html'),{url:'https://noljago.co.kr/admin/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document;w.scrollTo=()=>{};w.confirm=()=>true;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.HOME_ITEMS=[{path:'t/ten/',title:'10초',kind:'대결',relationships:['친구']}];w.GATCHI_GUIDES={};
  w.eval(read('assets/letter-templates.js'));w.eval(read('assets/letter-design.js'));w.eval(read('admin/app-pages.js'));
  assert.ok(w.APP_PAGES.includes('t/tarot/'),'만들어진 페이지 목록에 t/tarot/ 이 있어야 함');
  assert.ok(w.APP_PAGES.includes('t/mind/fight/'),'한 겹 더 들어간 페이지도 찾아야 함');
  /* 홈 카드 목록에는 없지만 실제로 있는 페이지를 공개로 저장해 둔 상태 */
  const saved={schemaVersion:1,games:[{slug:'tarot',path:'t/tarot/',title:'나와 너의 타로',visibility:'listed',sortOrder:9,category:'심리테스트'}]};
  let state={revision:3,admin:{name:'운영자',role:'owner'},draft:clone(saved),published:clone(saved),versions:[]},writes=[];
  w.AdminAPI={hasSession:()=>true,messageFrom:e=>e.message,isConflict:e=>!!(e&&e.conflict),getState:async()=>clone(state),
   write:async(action,revision,config)=>{if(revision!==state.revision){const e=Error('충돌');e.conflict=true;throw e;}writes.push({action,config:clone(config)});state.revision++;state.draft=clone(config);if(action==='publish')state.published=clone(config);return clone(state);},
   getStatsRange:async()=>({visitors:0,totals:{},games:[]}),getInquiries:async()=>[]};
  try{
   w.eval(read('admin/admin.js'));await pause();
   d.querySelector('[data-view="games"]').click();
   const card=[...d.querySelectorAll('#gameList .game-row')].find(row=>row.textContent.includes('타로'));
   assert.ok(card,'저장된 타로 항목이 목록에 보여야 함');card.querySelector('.edit-game').click();
   const summary=d.getElementById('gameSummary');summary.value='타로 설명';summary.dispatchEvent(new w.Event('input',{bubbles:true}));
   d.getElementById('saveDraftBtn').click();await pause();
   assert.equal(writes.length,1,'홈 카드 목록에 없어도 실제 페이지면 저장이 막히면 안 됨');
   assert.ok(!d.getElementById('notice').textContent.includes('앱에 없는'),'경고가 뜨면 안 됨');
   /* 진짜 없는 주소로 바꾸면 막되, 어느 항목인지 이름과 주소를 알려 준다 */
   const pathBox=d.getElementById('gamePath');pathBox.value='t/nowhere/';pathBox.dispatchEvent(new w.Event('input',{bubbles:true}));
   d.getElementById('saveDraftBtn').click();await pause();
   assert.equal(writes.length,1,'없는 주소는 저장을 막아야 함');
   assert.ok(/나와 너의 타로/.test(d.getElementById('notice').textContent)&&d.getElementById('notice').textContent.includes('t/nowhere/'),'문제 항목의 이름과 주소를 알려 줘야 함');
   /* 콘텐츠 관리: 위에서 아래로 1번부터 번호가 붙고, 번호를 고쳐 넣으면 그 자리로 옮겨진다 */
   pathBox.value='t/tarot/';pathBox.dispatchEvent(new w.Event('input',{bubbles:true}));
   d.getElementById('closeGameEditor').click();
   const nos=()=>[...d.querySelectorAll('#gameList .game-no')].map(i=>i.value);
   const titles=()=>[...d.querySelectorAll('#gameList .game-row-main strong')].map(e=>e.textContent.replace('★ ',''));
   assert.deepEqual(nos(),['1','2'],'위에서 아래로 1번부터');
   const before=titles();
   const second=[...d.querySelectorAll('#gameList .game-no')][1];
   second.value='1';second.dispatchEvent(new w.Event('change',{bubbles:true}));
   assert.deepEqual(titles(),[before[1],before[0]],'2번을 1로 고치면 맨 위로 올라와야 함');
   assert.deepEqual(nos(),['1','2'],'옮긴 뒤에도 번호는 1부터 다시 매긴다');
   d.getElementById('saveDraftBtn').click();await pause();
   assert.deepEqual(writes.at(-1).config.games.slice().sort((a,b)=>a.sortOrder-b.sortOrder).map(g=>g.title),[before[1],before[0]],'저장에도 새 순서가 실려야 함');
   assert.deepEqual(writes.at(-1).config.games.map(g=>g.sortOrder).sort((a,b)=>a-b),[1,2],'번호는 1부터 빈틈없이');
   const first=[...d.querySelectorAll('#gameList .game-no')][0];
   first.value='99';first.dispatchEvent(new w.Event('change',{bubbles:true}));
   assert.deepEqual(titles(),[before[0],before[1]],'목록 수보다 큰 번호는 맨 아래로');
   /* 어디에 보이는지 배지 — 관리 목록에만 있고 홈에는 없는 콘텐츠를 가려낸다 */
   const pills=[...d.querySelectorAll('#gameList .where-pill')].map(e=>e.textContent);
   assert.ok(pills.includes('둘이놀기'),'놀기 목록에 있는 콘텐츠는 둘이놀기');
   assert.ok(pills.includes('링크로만'),'홈 카드에 없는 콘텐츠는 링크로만');
   /* 분류 탭: 둘이놀기·링크로만으로 나눠 보고, 번호는 그 분류 안에서 1번부터 */
   const tab=name=>[...d.querySelectorAll('#contentTabs .content-tab')].find(b=>b.textContent.startsWith(name));
   assert.ok(tab('전체').textContent.endsWith('2'),'탭에 개수가 붙어야 함');
   tab('링크로만').click();
   assert.equal(d.querySelectorAll('#gameList .game-row').length,1,'링크로만 탭');
   assert.deepEqual(nos(),['1'],'분류 안에서는 1번부터');
   assert.deepEqual(titles(),['나와 너의 타로']);
   tab('둘이놀기').click();
   assert.deepEqual(titles(),['10초'],'둘이놀기 탭에는 놀기 목록 콘텐츠만');
   tab('전체').click();
   console.log('콘텐츠 순서 검사 통과 — 1번부터 번호 표시, 번호를 고치면 그 자리로 이동·재번호, 분류 탭(둘이놀기·혼자놀기·편지·심리·링크로만)과 노출 위치 배지');
   console.log('관리 저장 검사 통과 — 홈 카드 목록에 없어도 실제 페이지면 저장·게시 가능, 없는 주소는 이름과 함께 막음');
  }finally{w.close();}
 }
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
