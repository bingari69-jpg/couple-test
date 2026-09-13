const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve}=require('./tapbattle-preview.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const fixture=await serve(0);let browser;try{
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const contexts=await Promise.all([0,1,2].map(()=>browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}))),pages=await Promise.all(contexts.map(c=>c.newPage())),[host,guest,third]=pages,errors=[];
 for(const c of contexts)await c.route('**/*',r=>r.request().url().startsWith(fixture.url)||r.request().url().startsWith('data:')?r.continue():r.abort());
 for(const p of pages)p.on('pageerror',e=>errors.push(e.message));
 const url=fixture.url+'/t/tapbattle/',out=path.resolve('output/tapbattle');fs.mkdirSync(out,{recursive:true});
 for(const width of [320,390,768,1024]){await host.setViewportSize({width,height:900});await host.goto(url);await host.evaluate(()=>document.fonts.ready);assert(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await host.screenshot({path:path.join(out,'lobby-'+width+'.png'),fullPage:true});}
 await host.setViewportSize({width:390,height:844});await host.goto(url+'?player=0');await host.locator('#nickname').fill('침착한 나');await host.locator('#create').click();await host.locator('#room').waitFor();const hash=new URL(host.url()).hash,code=hash.split('=')[1];
 assert(await host.locator('#ready').isDisabled());await host.screenshot({path:path.join(out,'invite-390.png'),fullPage:true});
 await guest.goto(url+'?player=1'+hash);await guest.waitForFunction(()=>document.getElementById('intro').textContent.includes('침착한 나'));await guest.locator('#nickname').fill('빠른 친구');await guest.locator('#create').click();await guest.locator('#room').waitFor();
 await host.waitForFunction(()=>document.getElementById('friendName').textContent==='빠른 친구');
 await third.goto(url+'?player=2'+hash);await third.waitForFunction(()=>document.getElementById('notice').textContent.includes('이미 두 사람'));
 await host.locator('#ready').click();await host.waitForFunction(()=>document.getElementById('myReady').textContent.includes('완료'));assert(await host.locator('#arena').isHidden());
 await guest.locator('#ready').click();await host.locator('#arena').waitFor();await host.screenshot({path:path.join(out,'countdown-390.png'),fullPage:true});assert(await host.locator('#pad').isDisabled());
 await host.waitForFunction(()=>document.getElementById('pad').dataset.state==='go'&&!document.getElementById('pad').disabled);
 // Real pointer input, two contacts and keyboard. Local feedback must precede roundtrip.
 await host.locator('#pad').tap();assert.equal(await host.locator('#myScore').innerText(),'1');
 await host.waitForTimeout(55);await host.keyboard.press('Space');assert.equal(await host.locator('#myScore').innerText(),'2');
 await guest.waitForFunction(()=>document.getElementById('friendScore').textContent==='2');
 await host.screenshot({path:path.join(out,'go-390.png'),fullPage:true});
 await host.waitForFunction(()=>document.getElementById('pad').dataset.state==='stop');await host.locator('#pad').tap();assert.equal(await host.locator('#myScore').innerText(),'-1');await host.screenshot({path:path.join(out,'stop-390.png'),fullPage:true});
 await guest.waitForFunction(()=>document.getElementById('friendScore').textContent==='-1');
 await host.reload();await host.locator('#arena').waitFor();assert.equal(await host.locator('#myScore').innerText(),'-1');
 await contexts[0].setOffline(true);await host.waitForFunction(()=>document.getElementById('pad').dataset.state==='pause');assert(await host.locator('#pad').isDisabled());await contexts[0].setOffline(false);await host.waitForFunction(()=>!document.getElementById('pad').disabled);
 await Promise.all(pages.slice(0,2).map(p=>p.locator('#result').waitFor({timeout:30000})));
 assert.equal(await host.locator('#myScore').innerText(),'-1');assert.equal(await guest.locator('#friendScore').innerText(),'-1');assert.match(await guest.locator('#resultTitle').innerText(),/내 승리/);
 assert(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await host.screenshot({path:path.join(out,'result-390.png'),fullPage:true});
 await host.locator('#rematch').click();await host.waitForFunction(()=>document.getElementById('rematch').disabled);assert(await host.locator('#result').isVisible());
 await guest.locator('#rematch').click();await host.locator('#waiting').waitFor();assert.equal(await host.locator('#myScore').innerText(),'0');assert.match(await host.locator('#roundLabel').innerText(),/2번째/);
 await host.locator('#ready').click();await guest.locator('#ready').click();await host.locator('#arena').waitFor();await guest.locator('#resign').click();await guest.locator('#resignConfirm').click();await host.locator('#result').waitFor();assert.match(await host.locator('#resultTitle').innerText(),/내 승리/);
 await third.goto(url+'?guide=1');assert(await third.locator('#helpDialog').isVisible());await third.screenshot({path:path.join(out,'guide-390.png'),fullPage:true});
 await third.goto(fixture.url+'/?home=play#all');await third.locator('a[href="t/tapbattle/?mode=online"]').waitFor();await third.locator('[data-mode="solo"]').click();assert.equal(await third.locator('a[href^="t/tapbattle/"]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS tapbattle browser: responsive layouts, two-player invite, ready countdown, actual taps/keyboard, penalty, score sync, reload, offline recovery, natural finish, mutual rematch, resignation, help, home. Room '+code);
 }finally{if(browser)await browser.close();await fixture.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
