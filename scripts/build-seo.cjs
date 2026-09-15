// 검색 노출 보강: 홈 목록(assets/home-catalog.js)을 기준으로
//  1) 홈 #catalogList 안에 JS 없이도 보이는 정적 링크 카드를 넣고(홈 JS가 그리면 교체됨)
//  2) 각 게임 페이지에 빠진 description·canonical·OG 메타와 브랜드 붙은 제목을 채우고
//  3) sitemap.xml 에 빠진 공개 페이지를 추가한다.
// 이미 있는 메타는 건드리지 않는다. `node scripts/build-seo.cjs` 로 쓰고, `--check` 는 바뀔 파일만 알려준다.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'),BASE='https://noljago.co.kr/';
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// 홈 목록 밖에서 링크로 공개되는 페이지(심리 시리즈 등). sitemap 에만 넣는다.
const EXTRA_PUBLIC=['t/next-scene/','t/lucky/','t/repair/','t/living/','t/tarot/','t/fortune/'];

function homeItems(){
  const window={addEventListener(){},dispatchEvent(){}};
  vm.runInNewContext(read('assets/home-catalog.js'),{window,CustomEvent:function(){},Map,Set});
  return window.HOME_ITEMS;
}

function staticCatalog(items){
  // 홈 놀기 목록에 보이는 게임만 — 심리테스트·편지(playHide)는 각자 메뉴에서 안내한다
  const cards=items.filter(it=>!it.playHide).map(it=>'<a class="catalog-card" href="'+esc(it.path)+'"><div class="catalog-content"><h3>'+esc(it.title.split(' — ')[0])+'</h3><p>'+esc(it.summary||it.desc)+'</p></div></a>');
  return '<!-- static-catalog:start (scripts/build-seo.cjs) -->'+cards.join('')+'<!-- static-catalog:end -->';
}

function withHome(html,items){
  const block=staticCatalog(items),re=/<!-- static-catalog:start[\s\S]*?<!-- static-catalog:end -->/;
  if(re.test(html))return html.replace(re,block);
  return html.replace('<div class="catalog-grid" id="catalogList"></div>','<div class="catalog-grid" id="catalogList">'+block+'</div>');
}

function withPageMeta(html,it){
  const slug=it.path.replace(/^t\//,'').replace(/\/$/,''),url=BASE+it.path,desc=it.desc||it.summary,add=[];
  const has=re=>re.test(html);
  html=html.replace(/<title>([^<]*)<\/title>/,(m,t)=>t.includes('같이놀자')?m:'<title>'+esc(it.title)+' · 같이놀자</title>');
  if(!has(/<meta\s+name="description"/))add.push('<meta name="description" content="'+esc(desc)+'">');
  if(!has(/rel="canonical"/))add.push('<link rel="canonical" href="'+url+'">');
  if(!has(/property="og:type"/))add.push('<meta property="og:type" content="website">');
  if(!has(/property="og:title"/))add.push('<meta property="og:title" content="'+esc(it.title)+'">');
  if(!has(/property="og:description"/))add.push('<meta property="og:description" content="'+esc(desc)+'">');
  if(!has(/property="og:url"/))add.push('<meta property="og:url" content="'+url+'">');
  if(!has(/property="og:image"/)&&fs.existsSync(path.join(ROOT,'assets/share-cards',slug+'.png'))){
    add.push('<meta property="og:image" content="'+BASE+'assets/share-cards/'+slug+'.png?v=20260916-seo">','<meta property="og:image:width" content="800">','<meta property="og:image:height" content="480">','<meta name="twitter:card" content="summary_large_image">');
  }
  return add.length?html.replace(/<\/title>/,'</title>'+add.join('')):html;
}

function withSitemap(xml,paths){
  const missing=paths.filter(p=>!xml.includes('<loc>'+BASE+p+'</loc>'));
  if(!missing.length)return xml;
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
  const rows=missing.map(p=>'  <url><loc>'+BASE+p+'</loc><lastmod>'+today+'</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n').join('');
  return xml.replace('</urlset>',rows+'</urlset>');
}

function build({write}){
  const items=homeItems(),changes=[];
  const put=(file,next)=>{if(read(file)!==next){changes.push(file);if(write)fs.writeFileSync(path.join(ROOT,file),next);}};
  put('index.html',withHome(read('index.html'),items));
  items.forEach(it=>{const file=it.path+'index.html';if(fs.existsSync(path.join(ROOT,file)))put(file,withPageMeta(read(file),it));});
  put('sitemap.xml',withSitemap(read('sitemap.xml'),items.map(it=>it.path).concat(EXTRA_PUBLIC)));
  return {items,changes};
}

module.exports={build};
if(require.main===module){
  const check=process.argv.includes('--check'),{changes}=build({write:!check});
  console.log((check?'Would change: ':'Updated: ')+(changes.join(', ')||'nothing'));
  if(check&&changes.length)process.exitCode=1;
}
