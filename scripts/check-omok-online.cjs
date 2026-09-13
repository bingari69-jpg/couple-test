const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve}=require('./omok-preview.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const fixture=await serve(0);let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const contexts=await Promise.all([0,1,2].map(()=>browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'})));
  const errors=[];for(const c of contexts)await c.route('**/*',r=>r.request().url().startsWith(fixture.url)||r.request().url().startsWith('data:')?r.continue():r.abort());
  const [host,guest,third]=await Promise.all(contexts.map(c=>c.newPage()));for(const p of [host,guest,third])p.on('pageerror',e=>errors.push(e.message));
  const count=async(p,n)=>p.waitForFunction(n=>document.getElementById('moveCount').textContent===n+'수',n);
  const move=async(p,i)=>{await p.waitForFunction(()=>document.getElementById('turnStatus').textContent.startsWith('내 차례'));await p.locator(`[data-index="${i}"]`).tap();await p.locator('#place').click();};
  await host.goto(fixture.url+'/t/omok/?mode=online&player=0');await host.locator('#nickname').fill('봄날');await host.locator('#start').click();await host.locator('#roomPanel').waitFor();
  const hash=new URL(host.url()).hash;assert.match(hash,/#room=[A-F0-9]{32}/);assert(await host.locator('#placement').isHidden());assert(await host.locator('#undo').isHidden());
  await host.locator('#inviteKakao').click();assert.match(await host.locator('#connectionMessage').innerText(),/미리보기/);
  await guest.goto(fixture.url+'/t/omok/?mode=online&player=1'+hash);await guest.waitForFunction(()=>document.getElementById('onlineIntro').textContent.includes('봄날'));
  await guest.locator('#nickname').fill('반가운 친구');await guest.locator('#start').click();await guest.locator('#roomPanel').waitFor();
  await host.waitForFunction(()=>document.getElementById('whiteName').textContent.includes('반가운 친구'));
  assert(await guest.locator('#place').isDisabled());await guest.locator('[data-index="112"]').tap({force:true});assert(await guest.locator('#place').isDisabled());
  await host.locator('[data-index="112"]').tap();await host.evaluate(()=>{document.getElementById('place').click();document.getElementById('place').click();});await count(host,1);await count(guest,1);
  assert.equal(await guest.locator('[data-index="112"]').getAttribute('data-stone'),'1');await move(guest,113);await count(host,2);
  await host.reload();await host.locator('#roomPanel').waitFor();await count(host,2);assert.match(await host.locator('#blackName').innerText(),/봄날 \(나\)/);
  await third.goto(fixture.url+'/t/omok/?mode=online&player=2'+hash);await third.waitForFunction(()=>document.getElementById('onlineMessage').textContent.includes('이미 두 사람'));
  await third.locator('#nickname').fill('세 번째');await third.locator('#start').click();await third.waitForFunction(()=>document.getElementById('onlineMessage').textContent.includes('이미 두 사람'));assert(await third.locator('#game').isHidden());
  // A disconnected player cannot place a local-only stone.
  await contexts[0].setOffline(true);await host.waitForFunction(()=>document.getElementById('turnStatus').textContent.includes('연결'));await host.locator('[data-index="114"]').tap({force:true});assert(await host.locator('#place').isDisabled());assert.equal(await host.locator('[data-index="114"]').getAttribute('data-stone'),'0');
  await contexts[0].setOffline(false);await host.waitForFunction(()=>document.getElementById('turnStatus').textContent.startsWith('내 차례'));
  await guest.locator('#resign').click();await guest.locator('#resignConfirm').click();await host.locator('#result').waitFor();assert.match(await host.locator('#resultNote').innerText(),/친구가 이번 판을 양보/);
  await host.locator('#replay').click();await host.waitForFunction(()=>document.getElementById('replay').disabled);await count(host,2);assert(await host.locator('#result').isVisible());
  await guest.waitForFunction(()=>!document.getElementById('replay').disabled);await guest.locator('#replay').click();await count(host,0);await count(guest,0);assert(await host.locator('#result').isHidden());assert.equal(await host.locator('.last').count(),0);
  for(const [p,i] of [[host,0],[guest,30],[host,1],[guest,31],[host,2],[guest,32],[host,3],[guest,33],[host,4]])await move(p,i);
  await host.locator('#result').waitFor();await guest.locator('#result').waitFor();assert.equal(await guest.locator('.winning').count(),5);
  const out=path.resolve('output/omok-online');fs.mkdirSync(out,{recursive:true});
  await host.screenshot({path:path.join(out,'host-result-390.png'),fullPage:true});
  await host.locator('#replay').click();await guest.locator('#replay').click();await count(host,0);
  for(const width of [320,390,768,1024]){await host.setViewportSize({width,height:900});assert(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+width);await host.screenshot({path:path.join(out,'board-'+width+'.png'),fullPage:true});}
  // Even if the server committed before a lost response, refresh restores that move once.
  let swallowed=false;await host.route('**/__omok-rpc',async route=>{const data=route.request().postDataJSON();if(!swallowed&&data.fn==='play_omok_move'){swallowed=true;await route.fetch();await route.abort();}else await route.continue();});
  await move(host,112);await count(host,1);await count(guest,1);assert.equal(await guest.locator('[data-stone="1"]').count(),1);
  assert.deepEqual(errors,[]);console.log('PASS online browser: 2 independent players, invitation, turn/duplicate protection, refresh, third-seat denial, offline/recovery, lost response, resignation, mutual rematch, victory and responsive layout.');
 }finally{if(browser)await browser.close();await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
