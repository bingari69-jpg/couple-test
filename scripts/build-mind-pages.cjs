// Build the five static entry pages. Existing /t/mbti, /t/seat, etc. stay readable.
const fs=require('fs'),path=require('path'),vm=require('vm'),root=path.join(__dirname,'..');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'assets/mind-series-data.js'),'utf8'),ctx);
for(const [slug,s] of Object.entries(ctx.MindSeriesData.series)){
 const dir=path.join(root,'t',slug);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${s.title} · 같이놀자</title><meta name="description" content="${s.desc.replace(/\n/g,' ')}">
<meta property="og:title" content="${s.title}"><meta property="og:description" content="${s.invite}"><meta property="og:image" content="https://noljago.co.kr/assets/share-cards/${slug}.png?v=20260913-series"><meta property="og:type" content="website"><meta property="og:image:width" content="800"><meta property="og:image:height" content="480"><meta property="og:url" content="https://noljago.co.kr/t/${slug}/"><link rel="canonical" href="https://noljago.co.kr/t/${slug}/">
<link rel="stylesheet" href="../../assets/mind-series.css?v=20260913-series"><script src="../../assets/analytics.js?v=20260913-series" data-manual-events data-own-guide data-own-link-guard></script><script src="../../assets/kakao-share.js?v=20260913-letter"></script>
</head><body data-series="${slug}"><main class="wrap series-wrap"><header class="series-header"><a class="brand" href="../../">같이놀자<b>♥</b></a><a href="../psychology/">심리 5가지 보기 ↗</a></header>
<section id="seriesApp" aria-label="${s.title}"><h1>${s.title}</h1><p>${s.desc.replace(/\n/g,' ')}</p><noscript>이 이야기를 시작하려면 브라우저에서 자바스크립트를 허용해주세요.</noscript></section>
<footer class="series-footer">재미로 나누는 선택과 이야기 · <a href="../../privacy/">개인정보 안내</a></footer>
<nav class="series-nav" aria-label="주요 메뉴"><a href="../../?home=play#all">둘이놀기</a><a href="../../?tab=solo#all">혼자놀기</a><a href="../letter/">편지</a><a href="../psychology/" aria-current="page">심리</a></nav></main>
<script src="../../assets/mind-series-data.js?v=20260913-series"></script><script src="../../assets/tarot-deck.js?v=20260910-spread2"></script><script src="../../assets/tarot-engine.js?v=20260910-spread2"></script><script src="../../assets/mind-series-engine.js?v=20260913-series"></script><script src="../../assets/mind-series.js?v=20260913-series"></script></body></html>
`);
}
console.log('Built five psychology series pages.');
