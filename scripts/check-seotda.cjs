const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/seotda');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const base='http://127.0.0.1:'+server.address().port,context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 await context.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('data:')?r.continue():r.abort());
 await context.addInitScript(()=>{Math.random=()=>.95;});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/t/seotda/');await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(out,'lobby-390.png'),fullPage:true});
 await page.locator('#helpOpen').click();assert.ok(await page.locator('#helpDialog').isVisible());
 await page.keyboard.press('Escape');assert.equal(await page.locator('#helpOpen').evaluate(el=>el===document.activeElement),true);
 await page.locator('#start').tap();assert.ok(await page.locator('#confirmDiscard').isDisabled());
 assert.equal(await page.locator('#botCards .hwatu').count(),0,'computer faces are absent from DOM before showdown');
 assert.equal(await page.locator('#botCards .card-back').count(),3);
 for(const width of [320,390,768,1024]) {
  await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width);
  await page.screenshot({path:path.join(out,'discard-'+width+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});
 for(let round=1;round<=5;round++) {
  await page.locator('[data-discard="0"]').tap();assert.equal(await page.locator('[aria-pressed="true"]').count(),1);
  await page.locator('[data-discard="1"]').tap();assert.equal(await page.locator('[data-discard="1"]').getAttribute('aria-pressed'),'true');
  await page.locator('#tableRanks').tap();assert.ok(await page.locator('#rankHeading').isVisible());await page.locator('#helpClose').click();
  assert.equal(await page.locator('[data-discard="1"]').getAttribute('aria-pressed'),'true','help preserves selection');
  await page.locator('#confirmDiscard').tap();assert.equal(await page.locator('#playerCards .hwatu').count(),2);assert.equal(await page.locator('#botCards .card-back').count(),2);
  if(round===1)await page.screenshot({path:path.join(out,'bet-390.png'),fullPage:true});
  await page.locator('.bet-primary').tap();await page.locator('#call').waitFor();
  if(round===1)await page.screenshot({path:path.join(out,'raise-390.png'),fullPage:true});
  await page.locator(round===2?'#responseFold':'#call').tap();
  assert.equal(await page.locator('#botCards .hwatu').count(),2);
  const total=Number(await page.locator('#playerBank').textContent())+Number(await page.locator('#botBank').textContent());assert.equal(total,200);
  assert.equal(await page.locator('#historyList li').count(),round);
  if(round===1)await page.screenshot({path:path.join(out,'result-390.png'),fullPage:true});
  if(round<5)await page.locator('#nextRound').tap();
 }
 await page.locator('#replay').waitFor();await page.screenshot({path:path.join(out,'finished-390.png'),fullPage:true});
 await page.locator('#replay').tap();assert.equal(await page.locator('#playerBank').textContent(),'95');assert.equal(await page.locator('#historyList li').count(),0);
 await page.locator('[data-discard="0"]').tap();await page.locator('#confirmDiscard').tap();
 await page.locator('[data-bet="100"]').tap();assert.equal(await page.locator('#replay').count(),1,'all-in resolves and ends a bankrupt match');
 assert.equal(await page.locator('#playerBank').textContent(),'0');assert.equal(await page.locator('#botBank').textContent(),'200');
 await page.reload();assert.ok(await page.locator('#start').isVisible(),'refresh restarts at the clearly documented lobby');
 assert.deepEqual(errors,[]);console.log('Seotda browser QA passed: 320/390/768/1024px, three-card selection, hidden opponent, help/Escape/focus, raises/call/fold, five rounds, replay and all-in.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
