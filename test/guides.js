const fs=require('fs');
const path=require('path');
const assert=require('assert');
const vm=require('vm');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');

(async function(){
  const context={window:{}};vm.createContext(context);vm.runInContext(read('assets/guide-data.js'),context);
  const guides=context.window.GATCHI_GUIDES;
  assert(Object.keys(guides).length>=27,'전체 게임 사용법이 부족합니다.');
  const catalogSlugs=[...read('assets/home-catalog.js').matchAll(/^ \['([^']+)'/gm)].map(match=>match[1]);
  catalogSlugs.forEach(slug=>assert(guides[slug],slug+' 게임 사용법 누락'));
  Object.entries(guides).forEach(([slug,guide])=>{assert(guide.rule&&guide.rule.length<=140,slug+' 한 줄 규칙 확인');assert.equal(guide.steps.length,3,slug+' 3단계 확인');assert(guide.steps.every(Boolean),slug+' 빈 단계 확인');assert(guide.tip,slug+' 도움말 누락');});
  const expectedPractice={rps:'rps',ten:'timing',react:'reaction',num25:'numbers',mole:'mole',ufo:'ufo',tap:'rapid',stroop:'color',arrow:'arrow',stop:'stop',nonsense:'nonsense'};
  Object.entries(guides).forEach(([slug,guide])=>assert.equal(guide.practice||'',expectedPractice[slug]||'',slug+' 게임과 맞지 않는 연습'));

  const guidePage=read('guide/index.html');
  ['threeTitle','guideSearch','guideFilters','guideList','receivedTitle','faqTitle'].forEach(id=>assert(guidePage.includes(`id="${id}"`),'전체 사용법 #'+id+' 누락'));
  assert(read('index.html').includes('href="guide/">사용법</a>'),'홈 사용법 링크 누락');
  assert(read('index.html').includes('href="guide/">사용법</a>'),'상단 메뉴의 사용법 링크 누락');
  assert(read('index.html').includes('<small class="brand-tagline">카카오톡으로 보내고 같이 놀아요</small>'),'로고 아래 카카오톡 설명 누락');
  assert(!read('index.html').includes('class="kakao-intro"'),'메뉴 아래 중복 설명은 없어야 함');
  assert(!read('assets/help-guide.js').includes('처음이야? 10초면 알 수 있어!'),'홈의 큰 사용법 카드는 제거해야 함');
  assert(!read('t/letter/index.html').includes('help-guide.js'),'편지 화면에는 게임 방법 창이 뜨면 안 됨');

  const runtime=read('assets/help-guide.js').replace(/<\/script/gi,'<\\/script');
  const data=read('assets/guide-data.js').replace(/<\/script/gi,'<\\/script');
  const dom=new JSDOM(`<!doctype html><html><head></head><body><main><header class="topbar"><button id="back">뒤로</button></header><div class="game-steps">순서</div><button id="startBtn">시작</button></main><script>HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false}</script><script>${data}</script><script>${runtime}</script></body></html>`,{url:'https://example.test/couple-test/t/mole/#c=test',runScripts:'dangerously',pretendToBeVisual:true});
  await new Promise(resolve=>setTimeout(resolve,30));
  assert(dom.window.document.querySelector('.guide-help-button'),'게임 방법 버튼 누락');
  assert(dom.window.document.querySelector('.guide-invite-note'),'카톡 초대 설명 누락');
  dom.window.document.querySelector('.guide-help-button').click();
  const dialog=dom.window.document.getElementById('gameGuideDialog');assert(dialog,'게임 방법 창 누락');
  assert.equal(dialog.querySelectorAll('.guide-three li').length,3,'게임 방법은 세 단계여야 함');
  assert(dialog.querySelector('.guide-practice'),'동작 게임 연습 누락');dom.window.close();

  const nonsense=new JSDOM(`<!doctype html><html><head></head><body><main><div class="steps">순서</div><button id="startBtn">시작</button></main><script>HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};localStorage.setItem('gatchi_guide_seen_nonsense','1')</script><script>${data}</script><script>${runtime}</script></body></html>`,{url:'https://example.test/couple-test/t/nonsense/',runScripts:'dangerously',pretendToBeVisual:true});
  await new Promise(resolve=>setTimeout(resolve,30));nonsense.window.document.querySelector('.guide-help-button').click();
  const nonsenseDialog=nonsense.window.document.getElementById('gameGuideDialog');assert(nonsenseDialog.textContent.includes('세상에서 가장 뜨거운 과일은?'),'넌센스와 무관한 색깔 연습이 표시되면 안 됨');assert(nonsenseDialog.textContent.includes('천도복숭아'),'넌센스 보기 누락');nonsense.window.close();

  async function practiceText(slug){const page=new JSDOM(`<!doctype html><html><head></head><body><main><div class="steps">순서</div><button id="startBtn">시작</button></main><script>HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};localStorage.setItem('gatchi_guide_seen_${slug}','1')</script><script>${data}</script><script>${runtime}</script></body></html>`,{url:'https://example.test/couple-test/t/'+slug+'/',runScripts:'dangerously',pretendToBeVisual:true});await new Promise(resolve=>setTimeout(resolve,20));page.window.document.querySelector('.guide-help-button').click();const text=page.window.document.querySelector('.guide-practice').textContent;page.window.close();return text;}
  assert((await practiceText('ten')).includes('3초 맞히기'),'10초 게임에 가운데 멈추기 연습이 나오면 안 됨');
  assert((await practiceText('num25')).includes('1 → 2 → 3'),'숫자 게임에 두더지 연습이 나오면 안 됨');
  assert((await practiceText('ufo')).includes('🛸'),'UFO 게임에는 UFO가 나와야 함');
  assert(!(await practiceText('ufo')).includes('🐹'),'UFO 게임에 두더지가 나오면 안 됨');
  assert((await practiceText('tap')).includes('빠르게 눌러요'),'연타 게임에는 연타 버튼이 필요함');

  const mines=new JSDOM(`<!doctype html><html><body><main><div class="steps"></div><button id="startBtn">시작</button></main><script>HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false}</script><script>${data}</script><script>${runtime}</script></body></html>`,{url:'https://example.test/t/mines/?guide=1',runScripts:'dangerously',pretendToBeVisual:true});
  await new Promise(resolve=>setTimeout(resolve,30));
  const md=mines.window.document,lesson=md.querySelector('.mines-lesson'),cells=()=>[...lesson.querySelectorAll('.mines-example-cell')],next=()=>lesson.querySelector('.mines-next').click();
  assert(md.getElementById('gameGuideDialog').open,'명시적인 그림 설명 링크는 설명창으로 열림');
  assert.equal(cells().length,36);assert.equal(cells()[20].textContent,'3');assert.equal(cells()[27].textContent,'1');
  next();cells()[0].click();assert(lesson.querySelector('.practice-status').textContent.includes('이번에는'));assert.equal(cells()[0].textContent,'','다른 칸을 눌러도 지뢰를 지어내지 않음');
  for(const i of [13,14,15])cells()[i].click();assert.equal(cells().filter(c=>c.textContent==='🚩').length,3);
  cells()[13].click();assert.equal(cells().filter(c=>c.textContent==='🚩').length,3,'반복 클릭으로 중복 집계하지 않음');
  next();cells()[22].click();assert.equal(cells().filter(c=>c.textContent==='🚩').length,4);
  next();for(const i of [12,16,23])cells()[i].click();assert.equal(cells().filter(c=>c.textContent==='✓').length,3);
  next();assert(lesson.textContent.includes('나머지 노란 칸은 아직 몰라요'));next();assert.equal(cells().filter(c=>c.textContent==='🚩'||c.textContent==='✓').length,0,'처음부터 보기 초기화');
  assert.equal(mines.window.localStorage.length,0,'연습은 실제 게임 기록을 저장하지 않음');mines.window.close();

  const merge=new JSDOM(`<!doctype html><html><body><main><button id="startBtn">시작</button></main><script>HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false}</script><script>${data}</script><script>${runtime}</script></body></html>`,{url:'https://example.test/t/2048/?guide=1',runScripts:'dangerously',pretendToBeVisual:true});
  await new Promise(resolve=>setTimeout(resolve,30));
  const ed=merge.window.document,exercise=ed.querySelector('.merge-lesson');
  const values=()=>[...exercise.querySelectorAll('.merge-tile')].map(c=>Number(c.dataset.value));
  const arrow=dir=>exercise.querySelector('[data-dir="'+dir+'"]').click();
  const advance=()=>exercise.querySelector('.merge-next').click();
  const points=()=>Number(exercise.querySelector('.merge-score').textContent);
  assert(ed.getElementById('gameGuideDialog').open);assert.equal(values().length,16);
  advance();assert.equal(exercise.querySelector('.merge-count').textContent,'1 / 6','guided step needs a practice move');
  const before=values();arrow('R');assert.deepEqual(values(),before,'wrong direction gets a hint, not a fake move');
  arrow('L');assert.deepEqual(values().slice(0,4),[2,4,0,0]);assert.equal(points(),0);
  advance();arrow('L');assert.deepEqual(values().slice(0,4),[4,0,0,0]);assert.equal(points(),4);
  arrow('L');assert.equal(points(),4,'completed step cannot add points repeatedly');
  advance();arrow('R');assert.deepEqual(values().slice(0,4),[0,0,2,4]);assert.equal(points(),0);
  advance();arrow('L');assert.deepEqual(values().slice(0,4),[4,4,0,0]);assert.equal(points(),4,'new 4 cannot merge twice in a move');
  assert.equal(exercise.querySelector('.merge-next').getAttribute('aria-disabled'),'true');arrow('L');assert.deepEqual(values().slice(0,4),[8,0,0,0]);assert.equal(points(),12);
  advance();let leakedKeys=0;ed.addEventListener('keydown',()=>leakedKeys++);
  exercise.querySelector('.merge-board').dispatchEvent(new merge.window.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
  assert.equal(leakedKeys,0,'practice arrow keys must not reach the real game document handler');
  assert.equal(values()[0],4);assert.equal(values()[15],2);assert.equal(points(),4);
  assert.equal(exercise.querySelectorAll('.is-new').length,1);assert.equal(exercise.querySelectorAll('.is-merged').length,1);
  advance();assert.equal(points(),0);assert.equal(exercise.querySelector('.merge-count').textContent,'6 / 6');
  let moves=0,seed=741;
  const directionKeys=['L','R','U','D'];
  // Compare the independent teaching logic with the actual game's reducer, with spawning disabled there.
  const gameSource=read('t/2048/index.html'),realContext={N:4,DIRS:{L:1,R:1,U:1,D:1},Solo:{active:false},spawn(){},render(){},canMove(){return true;},finishPlay(){},$:()=>({}),state:{running:true,done:false,score:0,moves:0}};
  vm.createContext(realContext);
  vm.runInContext(gameSource.slice(gameSource.indexOf('function lines(dir)'),gameSource.indexOf('function canMove()')),realContext);
  for(let attempt=0;attempt<150;attempt++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const dir=directionKeys[seed%4],previous=values(),oldScore=points();
    realContext.state.board=previous.slice();realContext.state.score=oldScore;vm.runInContext('move("'+dir+'")',realContext);
    arrow(dir);const changed=realContext.state.board.some((n,i)=>n!==previous[i]);
    if(changed){moves++;const empty=realContext.state.board.map((n,i)=>n? -1:i).filter(i=>i>=0);realContext.state.board[empty[(moves*5)%empty.length]]=moves%10===0?4:2;}
    assert.deepEqual(values(),Array.from(realContext.state.board),'practice must match actual merge in '+dir);
    assert.equal(points(),realContext.state.score,'score equals sum of merged values');
    if(!changed)assert.deepEqual(values(),previous,'blocked direction must not spawn a tile');
  }
  exercise.querySelector('.merge-reset').click();assert.equal(points(),0);assert.equal(values().filter(Boolean).length,4);
  advance();assert.equal(exercise.querySelector('.merge-count').textContent,'1 / 6');assert.equal(points(),0);
  assert.equal(merge.window.localStorage.length,0,'practice does not persist real scores');merge.window.close();

  // The example's four bombs and three safe cells follow from the visible numbers
  // in EVERY possible six-mine board, not just one invented hidden answer.
  const visible={18:1,19:2,20:3,21:3,24:0,25:0,26:0,27:1,28:1,29:1,30:0,31:0,32:0,33:0,34:0,35:0};
  const unknown=Array.from({length:36},(_,i)=>i).filter(i=>!(i in visible));let solutions=0;
  function verify(chosen,start){if(chosen.length===6){const mines=new Set(chosen);for(const [key,n] of Object.entries(visible)){const i=Number(key);let count=0;for(const m of chosen)if(Math.abs(Math.floor(m/6)-Math.floor(i/6))<=1&&Math.abs(m%6-i%6)<=1)count++;if(count!==n)return;}solutions++;for(const i of [13,14,15,22])assert(mines.has(i));for(const i of [12,16,23])assert(!mines.has(i));return;}for(let j=start;j<=unknown.length-(6-chosen.length);j++)verify([...chosen,unknown[j]],j+1);}
  verify([],0);assert(solutions>0,'예시의 숫자와 지뢰 개수를 만족하는 판이 있어야 함');

  const admin=read('admin/index.html');
  ['gameRule','gameStep1','gameStep2','gameStep3','gameTip','gamePractice'].forEach(id=>assert(admin.includes(`id="${id}"`),'관리자 사용법 필드 #'+id+' 누락'));
  assert(admin.includes('href="guide/">? 관리자 사용법</a>'),'관리자 도움말 링크 누락');
  ['admin/guide/index.html','admin/guide/guide.css'].forEach(file=>assert(fs.existsSync(path.join(ROOT,file)),file+' 누락'));
  console.log('사용법 검사 통과 — 전체 안내·게임별 3단계·초대 설명·연습·관리자 편집 확인');
})().catch(error=>{console.error(error.stack||error);process.exit(1);});
