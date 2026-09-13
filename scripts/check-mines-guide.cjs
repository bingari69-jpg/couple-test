/* Actual help loader, mobile dialog, tutorial clicks and the guide-directory entry. */
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/mines-guide');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const base='http://127.0.0.1:'+server.address().port,context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 await context.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('data:')?r.continue():r.abort());
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/t/mines/');await p.locator('.guide-help-button').waitFor();assert.equal(await p.locator('#gameGuideDialog').count(),0,'ordinary visits do not auto-open');
 await p.locator('.guide-help-button').click();await p.locator('.mines-example-cell').first().waitFor();
 assert.equal(await p.evaluate(()=>state.running),false);
 for(const width of [320,390,768]){
  await p.setViewportSize({width,height:844});await p.locator('.mines-lesson').scrollIntoViewIfNeeded();
  assert.ok(await p.locator('#gameGuideDialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'no horizontal overflow '+width);
  await p.screenshot({path:path.join(out,'lesson-'+width+'.png')});
 }
 await p.setViewportSize({width:390,height:844});const cells=p.locator('.mines-example-cell'),next=p.locator('.mines-next');
 await next.tap();await cells.nth(0).tap();assert.ok((await p.locator('.mines-lesson .practice-status').textContent()).includes('이번에는'));
 for(const i of [13,14,15])await cells.nth(i).tap();await next.tap();await cells.nth(22).tap();await next.tap();
 for(const i of [12,16,23])await cells.nth(i).tap();await next.tap();
 assert.equal(await cells.filter({hasText:'🚩'}).count(),4);assert.equal(await cells.filter({hasText:'✓'}).count(),3);
 await p.locator('.mines-lesson-heading').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'solved-example.png')});
 assert.equal(await p.evaluate(()=>state.running),false);assert.equal(await p.locator('#score').textContent(),'0');
 await p.locator('.guide-sheet-close').click();assert.equal(await p.locator('#gameGuideDialog').isVisible(),false);
 await p.goto(base+'/guide/');await p.locator('#guideSearch').fill('지뢰찾기');await p.locator('.guide-card summary').click();
 await p.getByRole('link',{name:'그림으로 차근차근 배우기 →'}).click();await p.locator('#gameGuideDialog[open]').waitFor();assert.equal(await cells.count(),36);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#gameGuideDialog').isVisible(),false);assert.deepEqual(errors,[]);
 console.log('Mines help browser QA passed: 320/390/768px, actual loader, direct/help-directory entry, 4 flags and 3 safe cells, retries, close/Escape, no game start or score changes.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
