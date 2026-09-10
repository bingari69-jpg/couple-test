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

  const guidePage=read('guide/index.html');
  ['threeTitle','guideSearch','guideFilters','guideList','receivedTitle','faqTitle'].forEach(id=>assert(guidePage.includes(`id="${id}"`),'전체 사용법 #'+id+' 누락'));
  assert(read('index.html').includes('href="guide/">사용법</a>'),'홈 사용법 링크 누락');

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

  const admin=read('admin/index.html');
  ['gameRule','gameStep1','gameStep2','gameStep3','gameTip','gamePractice'].forEach(id=>assert(admin.includes(`id="${id}"`),'관리자 사용법 필드 #'+id+' 누락'));
  assert(admin.includes('href="guide/">? 관리자 사용법</a>'),'관리자 도움말 링크 누락');
  ['admin/guide/index.html','admin/guide/guide.css'].forEach(file=>assert(fs.existsSync(path.join(ROOT,file)),file+' 누락'));
  console.log('사용법 검사 통과 — 전체 안내·게임별 3단계·초대 설명·연습·관리자 편집 확인');
})().catch(error=>{console.error(error.stack||error);process.exit(1);});
