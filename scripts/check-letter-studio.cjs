/* Browser QA against a private local server; never sends messages or calls production APIs. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output/letter-studio');fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch(_){res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.route('**/*',route=>{const u=route.request().url();if(u.startsWith(base)||u.startsWith('data:')||u.startsWith('blob:'))return route.continue();return route.abort();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/t/letter/');await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('#templateGrid > button').count(),16);
 await page.screenshot({path:path.join(output,'library-mobile.png'),fullPage:true});await page.screenshot({path:path.join(output,'library-first-screen.png')});
 await page.locator('#templateGrid > [data-template="daily-note"]').click();await page.locator('#favoriteTemplate').click();await page.locator('#useTemplate').click();
 const body='오늘도 네 생각이 났어.\n\n함께 걸었던 골목, 별것 아닌 얘기에도 웃던 네 얼굴. 그런 작은 순간들이 내 하루를 다정하게 만들어.\n\n말로는 쑥스러워서 이렇게 남겨. 늘 내 편이 되어 줘서 고마워. 다음 주말에도 우리, 천천히 산책하자. ♡';
 await page.locator('#recipient').fill('지민');await page.locator('#sender').fill('민수');await page.locator('#letterBody').fill(body);
 await page.locator('#stickerButton').click();await page.locator('#stickerOptions [aria-label="고양이"]').click();await page.locator('#stickerOptions [aria-label="클로버"]').click();await page.locator('#sealOptions [aria-label="클로버 봉인"]').click();await page.locator('#stickerButton').click();
 await page.locator('#fontButton').click();await page.getByRole('button',{name:'정갈한 손글씨 오늘도 네 생각이 났어.'}).click();await page.locator('#fontButton').click();
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,'compose-mobile.png'),fullPage:true});
 await page.reload();await page.locator('#resumeDraft').click();assert.equal(await page.locator('#letterBody').inputValue(),body);assert.equal(await page.locator('#composePaper .paper-stickers img').count(),2);
 await page.locator('#packLetter').click();const link=await page.locator('#shareLink').inputValue();const payload=JSON.parse(Buffer.from(link.split('#l=')[1],'base64url'));assert.equal(payload.w,body);assert.equal(payload.seal,'clover');
 const reader=await context.newPage();reader.on('pageerror',e=>errors.push(e.message));await reader.goto(base+'/t/letter/#l='+link.split('#l=')[1]);await reader.locator('#readerEnvelope').click();await reader.locator('#openedLetter').waitFor({state:'visible'});await reader.evaluate(()=>document.fonts.ready);
 assert.equal(await reader.locator('#readBody').textContent(),body);assert.equal(await reader.locator('#skipRead').isVisible(),false);
 await reader.screenshot({path:path.join(output,'reader-mobile.png'),fullPage:true});
 await reader.locator('#saveLetterImage').click();await reader.locator('#exportDialog').waitFor({state:'visible'});await reader.locator('#exportPreview').evaluate(img=>img.decode());
 const image=await reader.locator('#exportPreview').evaluate(async img=>Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer())));fs.writeFileSync(path.join(output,'saved-letter.png'),Buffer.from(image));
 assert.ok(image.length>5000);await reader.locator('#closeExport').click();
 // Every font and design must render and export, with actual browser fonts/canvas.
 const checks=await reader.evaluate(async()=>{const values=[];for(const t of LETTER_TEMPLATES){const p={w:'안녕, 함께한 하루를 기억해. 👩‍❤️‍👨\nありがとう · Hello',n:'너에게',f:'나',d:'2026.09.13',font:t.font,size:t.size,st:['flower'],seal:'heart'};const session=await LetterExport.prepare(p,t);const blob=await session.page(0);values.push([t.id,blob.size]);}for(const f of Object.keys(LetterDesign.fonts)){await document.fonts.load('24px '+LetterDesign.fontCSS(f));if(!document.fonts.check('24px '+LetterDesign.fontCSS(f)))throw new Error('font '+f);}return values;});assert.equal(checks.length,16);assert.ok(checks.every(([,size])=>size>1000));
 // Multi-page export keeps all line breaks, including a very long legacy letter.
 const long={...payload,w:Array.from({length:70},(_,i)=>'기억 '+(i+1)).join('\n')};await reader.goto(base+'/t/letter/#l='+Buffer.from(JSON.stringify(long)).toString('base64url'));await reader.locator('#readerEnvelope').click();await reader.locator('#saveLetterImage').click();await reader.locator('#exportDialog').waitFor({state:'visible'});assert.equal(await reader.locator('#nextExport').isEnabled(),true);await reader.locator('#nextExport').click();await reader.waitForFunction(()=>document.getElementById('exportPageNumber').textContent.startsWith('2 /'));
 await reader.locator('#closeExport').click();
 for(const width of [320,390,768,1100]){await page.setViewportSize({width,height:900});await page.goto(base+'/t/letter/');await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'library overflow at '+width);if(width===1100)await page.screenshot({path:path.join(output,'library-desktop.png'),fullPage:true});await page.locator('#resumeDraft').click();await page.locator('#fontButton').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'editor overflow at '+width);}
 await reader.setViewportSize({width:320,height:844});await reader.goto(base+'/t/letter/#l='+Buffer.from(JSON.stringify({...payload,n:'가'.repeat(24),f:'나'.repeat(24)})).toString('base64url'));await reader.locator('#readerEnvelope').click();assert.ok(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'long recipient overflow');
 assert.deepEqual(errors,[]);console.log('Browser QA passed: 16 themes, 6 fonts, restoration, reader, image export, pagination, 320–1100 px.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
