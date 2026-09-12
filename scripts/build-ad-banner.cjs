// 자체 광고 배너 이미지를 만든다 (800×200 PNG). 공유 카드와 같은 Playwright/Edge 경로를 쓴다.
//   node scripts/build-ad-banner.cjs
// 환경변수: PLAYWRIGHT_PATH, BROWSER_PATH (build-share-cards.cjs 와 같음)
const fs=require('fs');
const runtime=process.env.PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(runtime);
const data=(file,type)=>'data:'+type+';base64,'+fs.readFileSync(file).toString('base64');
const BANNERS=[{
  file:'assets/ads/xenics-livechair.png',
  eyebrow:'제닉스 XENICS · 광고',
  title:'리브체어 라벤더, 특가 139,000원',
  copy:'정상가 259,000원 · 라운지 쿠폰 5,000원 더 · 인스타그램에서 보기 →',
  color:'#e9dcf5', accent:'#8a63c9', emoji:'🪑'
}];
(async()=>{
  fs.mkdirSync('assets/ads',{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:800,height:200},deviceScaleFactor:1});
    for(const b of BANNERS){
      await page.setContent(`<style>@font-face{font-family:title;src:url('${data('assets/fonts/jua-regular.woff2','font/woff2')}')}*{box-sizing:border-box}body{margin:0;font-family:'Malgun Gothic',sans-serif;color:#3a2e4a}
        .frame{position:relative;width:800px;height:200px;padding:28px 36px;background:radial-gradient(ellipse at 88% 60%,${b.color},#fffbf5 70%);overflow:hidden}
        .eyebrow{font-size:13px;letter-spacing:.12em;color:${b.accent};font-weight:700}h1{font-family:title;font-weight:400;font-size:40px;margin:8px 0 8px;line-height:1.2}p{margin:0;font-size:17px;color:#6f6280}
        .emoji{position:absolute;right:52px;top:50%;transform:translateY(-50%);font-size:112px;filter:drop-shadow(0 12px 14px #5a3e8a33)}
        .tag{position:absolute;right:36px;top:22px;font-size:12px;color:#8b7f95;border:1px solid #cdbfe0;border-radius:20px;padding:4px 10px;background:#ffffffaa}</style>
        <div class="frame"><div class="eyebrow">${b.eyebrow}</div><h1>${b.title}</h1><p>${b.copy}</p><div class="emoji">${b.emoji}</div><span class="tag">광고</span></div>`);
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:b.file});
      console.log('wrote',b.file);
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
