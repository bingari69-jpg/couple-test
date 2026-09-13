// Reproducible, non-personal Kakao artwork; no letter body or recipient is exported.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),sandbox={window:{},Intl};
for(const f of ['letter-templates.js','letter-design.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'assets',f),'utf8'),sandbox);
const D=sandbox.window.LetterDesign,templates=sandbox.window.LETTER_TEMPLATES;
const data=(file,mime)=>'data:'+mime+';base64,'+fs.readFileSync(path.join(root,file)).toString('base64');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{const page=await browser.newPage({viewport:{width:800,height:480},deviceScaleFactor:1});
 for(const t of templates){
 const art=t.legacy?`background-image:url('${data('assets/art/stationery-atlas.png','image/png')}');background-size:300% 200%;background-position:${t.x}% ${t.y}%;`:`background-image:url('${D.uri(D.art(t,'top'))}'),url('${D.uri(D.art(t,'bottom'))}');background-size:100% auto;background-position:top,bottom;background-repeat:no-repeat;`;
 await page.setContent(`<style>@font-face{font-family:ui;src:url('${data('assets/fonts/letter-round.woff2','font/woff2')}')}*{box-sizing:border-box}body{margin:0;background:#f8f7f3;color:#364237;font-family:ui,sans-serif}.frame{height:480px;padding:36px 42px;background:linear-gradient(120deg,#faf9f5,${t.color})}.label{font-size:15px;letter-spacing:2px;color:#687b65}h1{font-weight:400;font-size:43px;line-height:1.5;margin:45px 0 12px}p{color:#6f7b69;font-size:19px;line-height:1.8}.paper{position:absolute;right:46px;top:42px;width:226px;height:300px;background-color:${t.paper};${art}transform:rotate(9deg);box-shadow:0 3px 18px #30402812;border:1px solid #ccc5;border-radius:2px}.envelope{position:absolute;right:24px;bottom:80px;width:300px;height:192px;background:${t.color};border:1px solid #576b4330;box-shadow:0 12px 24px #30402815;transform:rotate(-5deg);border-radius:4px;display:grid;place-items:center;isolation:isolate}.envelope:before{content:'';position:absolute;inset:0;background:linear-gradient(32deg,transparent 49.5%,#6b6e4829 50%,transparent 50.5%),linear-gradient(-32deg,transparent 49.5%,#6b6e4829 50%,transparent 50.5%);z-index:-1}.envelope:after{content:'';position:absolute;inset:0 0 42%;clip-path:polygon(0 0,100% 0,50% 100%);background:#ffffff70;z-index:-1}.envelope img{width:56px;height:56px}.stamp{position:absolute;right:20px;bottom:17px;font-size:12px;color:#56634b}footer{position:absolute;bottom:27px;color:#6b7b60;font-size:15px}.text{position:relative;z-index:1;width:430px}</style><div class="frame"><div class="label">같이놀자 · 마음 한 장</div><div class="text"><h1>너에게<br>편지가 도착했어요.</h1><p>${t.name}에 담은 마음.<br>봉투를 눌러 읽어보세요.</p></div><div class="paper"></div><div class="envelope"><img src="${D.stickerURL('heart')}"><span class="stamp">FOR YOU</span></div><footer>A LITTLE LETTER FOR YOU</footer></div>`);
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(root,'assets/share-cards/letter-'+t.id+'.png')});
 }
 console.log('편지 공유 카드 '+templates.length+'종 생성');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
