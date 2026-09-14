/* Browser QA for the first-visit home guide. External requests are blocked. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output/home-welcome');fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch(_){res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const size of [{name:'mobile',width:390,height:844},{name:'desktop',width:1100,height:900}]){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
   await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(base+'/');
   const dialog=page.locator('#homeWelcome');await dialog.waitFor({state:'visible'});assert.equal(await dialog.locator('.welcome-flows article').count(),2);assert.equal(await dialog.locator('.welcome-flows li').count(),6);assert.match(await dialog.textContent(),/친구나 연인/);assert.match(await dialog.textContent(),/카카오톡에서는 이렇게/);
   const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,'dialog fits '+size.name);
   await page.screenshot({path:path.join(output,size.name+'.png')});
   await page.locator('#welcomeClose').click();await page.reload();assert.equal(await dialog.isVisible(),false);await page.locator('#welcomeHelp').click();assert.equal(await dialog.isVisible(),true);await page.locator('#welcomeGames').click();assert.equal(await dialog.isVisible(),false);assert.deepEqual(errors,[]);await context.close();
  }
  console.log('Home welcome browser QA passed: first visit, Kakao guide, close/reopen, mobile and desktop fit.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exit(1);});
