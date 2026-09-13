const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/omok');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);let file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const base='http://127.0.0.1:'+server.address().port,context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 await context.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('data:')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const go=async url=>{await page.goto(base+url);await page.evaluate(()=>document.fonts.ready);};
 const click=async id=>page.locator('#'+id).click();
 const stone=async i=>page.locator(`[data-index="${i}"]`).getAttribute('data-stone');
 const overflow=async label=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);
 const play=async i=>{await page.locator(`[data-index="${i}"]`).tap();await click('place');};
 for(const width of [320,390,768,1024]){
  await page.setViewportSize({width,height:900});await go('/t/omok/?mode=local');await overflow('lobby '+width);await page.screenshot({path:path.join(out,'lobby-'+width+'.png'),fullPage:true});
  await click('start');assert.equal(await page.locator('[role="gridcell"]').count(),225);await overflow('board '+width);await play(112);await page.locator('[data-index="113"]').tap();assert.equal(await stone(113),'0','touch only selects');await page.screenshot({path:path.join(out,'board-'+width+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await go('/t/omok/?mode=local');await click('start');
 await page.locator('[data-index="112"]').tap();await page.locator('[data-nudge="right"]').tap();assert.match(await page.locator('#selectedPoint').innerText(),/I8/);await click('place');assert.equal(await stone(113),'1');await click('undo');assert.equal(await stone(113),'0');
 await page.locator('[data-index="112"]').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('[data-index="111"]').evaluate(el=>el===document.activeElement),true);await click('place');assert.equal(await stone(111),'1');
 await click('helpOpen');assert(await page.locator('#helpDialog').isVisible());await page.screenshot({path:path.join(out,'guide-390.png'),fullPage:true});await page.keyboard.press('Escape');assert(await page.locator('#helpOpen').evaluate(el=>el===document.activeElement));assert.equal(await stone(111),'1');
 await click('settings');assert(await page.locator('#newDialog').isVisible());await click('keepPlaying');assert.equal(await stone(111),'1');await click('settings');await click('newGame');assert(await page.locator('#lobby').isVisible());await click('start');
 for(const i of [0,30,1,31,2,32,3,33,4])await play(i);
 assert(await page.locator('#result').isVisible());assert.equal(await page.locator('.winning').count(),5);await page.screenshot({path:path.join(out,'win-390.png'),fullPage:true});await click('undo');assert(await page.locator('#result').isHidden());assert.equal(await stone(4),'0');await play(4);await click('replay');assert.equal(await page.locator('#moveCount').innerText(),'0수');
 await go('/t/omok/');await click('start');await play(112);await page.waitForFunction(()=>document.querySelector('#moveCount').textContent==='2수');assert.equal(await page.locator('[data-stone="2"]').count(),1);await click('undo');assert.equal(await page.locator('#moveCount').innerText(),'0수');
 // Cancel a scheduled computer response before it can place a stale move.
 await page.locator('[data-index="112"]').tap();await page.evaluate(()=>{document.querySelector('#place').click();document.querySelector('#undo').click();});await page.waitForTimeout(500);assert.equal(await page.locator('#moveCount').innerText(),'0수');
 await click('settings');await page.locator('[data-color="2"]').tap();await click('start');await page.waitForFunction(()=>document.querySelector('#moveCount').textContent==='1수');assert.equal(await stone(112),'1');assert(await page.locator('#undo').isDisabled());await play(113);await page.waitForFunction(()=>document.querySelector('#moveCount').textContent==='3수');await click('undo');assert.equal(await page.locator('#moveCount').innerText(),'1수');
 await page.reload();assert(await page.locator('#lobby').isVisible());
 await go('/?tab=solo#all');const solo=page.locator('#catalogList a[href="t/omok/?solo=1"]');await solo.waitFor();assert.match(await solo.innerText(),/컴퓨터와 · 자유 한판/);await solo.click();assert.equal(await page.locator('[data-mode="ai"]').getAttribute('aria-pressed'),'true');
 await go('/?home=play#all');const local=page.locator('#catalogList a[href="t/omok/?mode=online"]');await local.waitFor();assert.match(await local.innerText(),/카톡으로 초대/);await local.click();assert.equal(await page.locator('[data-mode="online"]').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);console.log('Omok browser QA passed: 320/390/768/1024px, touch confirmation, keyboard, help/focus, win/undo/replay, both AI colors, timer cancellation and both home entrances.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
