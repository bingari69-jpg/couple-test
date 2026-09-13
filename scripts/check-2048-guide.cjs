const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/2048-guide');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const base='http://127.0.0.1:'+server.address().port,context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await context.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('data:')?r.continue():r.abort());
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/t/2048/');await p.locator('.guide-help-button').waitFor();assert.equal(await p.locator('#gameGuideDialog').count(),0,'ordinary visits do not auto-open');
 const original=await p.evaluate(()=>JSON.stringify({board:state.board,score:state.score,moves:state.moves,running:state.running}));
 await p.locator('.guide-help-button').tap();const lesson=p.locator('.merge-lesson'),next=lesson.locator('.merge-next'),board=lesson.locator('.merge-board');
 assert.equal(await next.isDisabled(),true);await lesson.locator('[data-dir="R"]').tap();assert.ok((await lesson.locator('.practice-status').textContent()).includes('이번에는'));
 for(const width of [320,390,768]){
  await p.setViewportSize({width,height:844});await lesson.locator('.merge-heading').evaluate(el=>el.scrollIntoView({block:'start'}));
  assert.ok(await p.locator('#gameGuideDialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'dialog has no horizontal overflow '+width);
  await p.screenshot({path:path.join(out,'lesson-'+width+'.png')});
 }
 await p.setViewportSize({width:390,height:844});await board.scrollIntoViewIfNeeded();
 await lesson.locator('[data-dir="L"]').tap();
 assert.equal(await next.isEnabled(),true);assert.equal(await lesson.locator('.merge-score').textContent(),'0');
 await next.tap();
 await p.waitForFunction(()=>document.querySelector('.merge-count').textContent==='2 / 6');
 await board.focus();assert.equal(await board.evaluate(el=>el===document.activeElement),true,'board is focused');await p.keyboard.press('ArrowLeft');assert.equal(await lesson.locator('.merge-score').textContent(),'4',await lesson.locator('.practice-status').textContent());
 await lesson.locator('.merge-heading').evaluate(el=>el.scrollIntoView({block:'start'}));await p.screenshot({path:path.join(out,'two-plus-two.png')});
 await next.tap();await lesson.locator('[data-dir="R"]').tap();assert.equal(await lesson.locator('.merge-score').textContent(),'0');
 await next.tap();await lesson.locator('[data-dir="L"]').tap();assert.equal(await next.isDisabled(),true);
 const vals=()=>lesson.locator('.merge-tile').evaluateAll(els=>els.map(el=>Number(el.dataset.value)));
 assert.deepEqual((await vals()).slice(0,4),[4,4,0,0]);await lesson.locator('[data-dir="L"]').tap();assert.equal(await lesson.locator('.merge-score').textContent(),'12');
 await next.tap();await lesson.locator('[data-dir="U"]').tap();assert.equal(await lesson.locator('.is-new').textContent(),'2');assert.equal(await lesson.locator('.is-merged').textContent(),'4');
 await next.tap();await lesson.locator('[data-dir="D"]').tap();await lesson.locator('.merge-reset').tap();assert.equal(await lesson.locator('.merge-score').textContent(),'0');
 assert.equal(await p.evaluate(()=>JSON.stringify({board:state.board,score:state.score,moves:state.moves,running:state.running})),original,'practice must not affect actual game state');
 await p.keyboard.press('Escape');assert.equal(await p.locator('#gameGuideDialog').isVisible(),false);
 await p.goto(base+'/guide/');await p.locator('#guideSearch').fill('2048');await p.locator('.guide-card summary').click();await p.getByRole('link',{name:'그림으로 차근차근 배우기 →'}).click();
 await p.locator('#gameGuideDialog[open]').waitFor();assert.equal(await p.locator('.merge-tile').count(),16);
 await p.locator('.guide-sheet-close').click();assert.equal(await p.evaluate(()=>state.running),false);
 // Keep raw CDP gestures on their own page instead of mixing two input sessions.
 const swipePage=await context.newPage();swipePage.on('pageerror',e=>errors.push(e.message));
 await swipePage.goto(base+'/t/2048/?guide=1');const swipeBoard=swipePage.locator('.merge-board');await swipeBoard.scrollIntoViewIfNeeded();
 const session=await context.newCDPSession(swipePage),rect=await swipeBoard.boundingBox();
 await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width*.8,y:rect.y+rect.height*.5}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+rect.width*.2,y:rect.y+rect.height*.5}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await swipePage.locator('.merge-next').isEnabled(),true);
 await swipePage.locator('.merge-next').scrollIntoViewIfNeeded();const nextRect=await swipePage.locator('.merge-next').boundingBox();
 await session.send('Input.synthesizeTapGesture',{x:nextRect.x+nextRect.width/2,y:nextRect.y+nextRect.height/2,gestureSourceType:'touch'});
 await swipePage.waitForFunction(()=>document.querySelector('.merge-count').textContent==='2 / 6');
 assert.deepEqual(errors,[]);console.log('2048 guide browser QA passed: 320/390/768px, actual loader and directory entry, touch swipe followed by next step, keyboard, merge rules, reset and unchanged game state.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
