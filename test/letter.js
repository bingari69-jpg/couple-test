/* Letter flow and compatibility checks. No real sharing or remote resource requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');
const errors=[];
function load(relative='t/letter/index.html',suffix='',random=0.25,userAgent=''){
 const file=path.join(root,relative),base=path.dirname(file);
 let html=fs.readFileSync(file,'utf8').replace(/<script src="([^"]+)"><\/script>/g,(all,src)=>{
   if(src.includes('analytics'))return '';
   return '<script>'+fs.readFileSync(path.resolve(base,src.split('?')[0]),'utf8').replace(/<\/script/g,'<\\/script')+'</script>';
 });
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 return new JSDOM(html,{url:'https://bingari69-jpg.github.io/couple-test/'+relative.replace(/index.html$/,'')+suffix,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.Math.random=()=>random;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:true});w.navigator.clipboard={writeText:async s=>{w.copied=s;}};if(userAgent)Object.defineProperty(w.navigator,'userAgent',{value:userAgent,configurable:true});}});
}
const hash=p=>'#l='+Buffer.from(JSON.stringify(p)).toString('base64url');
const tick=()=>new Promise(r=>setTimeout(r,10));
async function main(){
 const d=load(),w=d.window,$=id=>w.document.getElementById(id);
 assert.equal($('templateGrid').children.length,6);
 assert.equal($('library').hidden,false);
 const press=(container,text)=>[...$(container).querySelectorAll('button')].find(x=>x.textContent===text).click();
 press('occasionFilters','생일');assert.equal($('templateGrid').children.length,3);
 press('seasonFilters','가을');assert.equal($('empty').hidden,false);assert.equal($('viewTemplate').disabled,true);
 $('resetFilters').click();assert.equal($('templateGrid').children.length,6);
 $('viewTemplate').click();assert.equal($('detail').hidden,false);$('envelopeTab').click();assert.equal($('envelopePreview').hidden,false);
 $('sampleEnvelope').click();await tick();assert.equal($('paperPreview').hidden,false);
 $('useTemplate').click();assert.equal($('compose').hidden,false);assert.equal($('letterBody').value,'');
 $('packLetter').click();assert.equal($('compose').hidden,false);
 const body='소중한 글 ♥\n\n<script>alert(1)</script> & 친구에게';
 const input=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));};
 input('letterBody','가'.repeat(429));assert.equal($('letterMeter').classList.contains('near-limit'),false);
 input('letterBody','가'.repeat(430));assert.equal($('letterMeter').classList.contains('near-limit'),true);assert.ok($('letterRemaining').textContent.includes('20자'));
 input('letterBody','가'.repeat(450));assert.equal($('packLetter').disabled,false);assert.equal($('letterCount').textContent,'450/450');
 $('packLetter').click();assert.equal($('send').hidden,false);
 const full=JSON.parse(Buffer.from($('shareLink').value.split('#l=')[1],'base64url'));
 const fullReader=load('t/letter/index.html',hash(full));assert.equal(fullReader.window.document.getElementById('readBody').textContent,'가'.repeat(450));fullReader.window.close();
 $('editLetter').click();input('letterBody','가'.repeat(451));assert.equal($('packLetter').disabled,true);assert.equal($('draftPreview').disabled,true);assert.equal($('letterBody').value.length,451);assert.ok($('letterRemaining').textContent.includes('1자 줄여'));
 $('changePaper').click();$('viewTemplate').click();$('useTemplate').click();assert.equal($('letterBody').value.length,451);assert.equal($('packLetter').disabled,true);
 input('letterBody','가'.repeat(448)+'♥');assert.equal($('packLetter').disabled,false);
 input('letterBody','가'.repeat(448)+'💌');assert.equal($('letterCount').textContent,'450/450');
 input('letterBody','가 나\n다');assert.equal($('letterCount').textContent,'5/450');
 input('recipient','지민');input('sender','민수');input('letterBody',body);
 $('changePaper').click();$('templateGrid').children[5].click();$('viewTemplate').click();$('useTemplate').click();assert.equal($('letterBody').value,body);assert.equal($('recipient').value,'지민');
 $('fontChoice').value='serif';$('fontChoice').dispatchEvent(new w.Event('change'));$('sizeChoice').value='23';$('sizeChoice').dispatchEvent(new w.Event('input'));
 $('packLetter').click();assert.equal($('send').hidden,false);const url=$('shareLink').value;const p=JSON.parse(Buffer.from(url.split('#l=')[1],'base64url'));
 assert.equal(p.w,body);assert.equal(p.tpl,'winter');assert.equal(p.font,'serif');assert.equal(p.size,23);assert.equal(p.n,'지민');
 $('copyLetter').click();await tick();assert.equal(w.copied,url);
 Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36',configurable:true});let nativeShared,sent;w.navigator.share=async data=>{nativeShared=data;};w.kakaoShare=async options=>{sent=options;return true;};$('kakaoSend').click();await tick();assert.equal(nativeShared,undefined);assert.equal(sent.url,url);assert.equal(sent.textOnly,false);
 w.kakaoShare=async(options,fallback)=>{await fallback();return false;};$('kakaoSend').click();await tick();assert.deepEqual(Object.keys(nativeShared),['url']);assert.equal(nativeShared.url,url);nativeShared=undefined;
 Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',configurable:true});let windowsShareCount=0;w.navigator.share=async()=>{windowsShareCount++;};
 let done;
 w.kakaoShare=(options)=>{sent=options;return new Promise(resolve=>{done=resolve;});};
 $('kakaoSend').click();await tick();assert.equal(windowsShareCount,0);assert.equal(sent.url,url);assert.equal(sent.textOnly,false);assert.equal($('kakaoSend').disabled,true);assert.equal($('kakaoSendText').disabled,true);
 done(true);await tick();assert.equal($('kakaoSend').disabled,false);
 const leaveAfterShare=new w.Event('beforeunload',{cancelable:true});w.dispatchEvent(leaveAfterShare);assert.equal(leaveAfterShare.defaultPrevented,false);
 $('kakaoSendText').click();await tick();assert.equal(sent.textOnly,true);assert.equal(sent.url,url);done(true);await tick();assert.equal($('kakaoSendText').disabled,false);
 $('packedEnvelope').click();assert.equal($('reader').hidden,false);$('readerEnvelope').click();await tick();assert.equal($('readBody').textContent,body);assert.equal($('readBody').children.length,0);assert.equal($('openedLetter').hidden,false);
 $('returnPreview').click();assert.equal($('send').hidden,false);$('editLetter').click();assert.equal($('letterBody').value,body);
 $('helpButton').click();$('suggestions').firstElementChild.click();assert.ok($('letterBody').value.startsWith(body+'\n\n'));
 const r=load('t/letter/index.html',hash(p));assert.equal(r.window.document.getElementById('reader').hidden,false);assert.equal(r.window.document.getElementById('readBody').textContent,body);assert.equal(r.window.document.querySelectorAll('script[src*="kakao"],script[src*="analytics"]').length,0);r.window.close();
 const kr=load('t/letter/index.html',hash({...p,n:'지민',f:'민수'}),0.25,'Mozilla/5.0 (Linux; Android 14; wv) KAKAOTALK/10.8.3 (INAPP)'),outside=kr.window.document.getElementById('replyLetter').getAttribute('href');assert.match(outside,/^intent:\/\/bingari69-jpg.github.io\/couple-test\/t\/letter\/\?reply=1/);assert.match(outside,/#Intent;scheme=https;package=com\.android\.chrome;/);assert.match(outside,/S\.browser_fallback_url=/);assert.equal(kr.window.document.getElementById('reader').hidden,false);const replyQuery='?'+outside.split('?')[1].split('#Intent;')[0],reply=load('t/letter/index.html',replyQuery);reply.window.document.getElementById('viewTemplate').click();reply.window.document.getElementById('useTemplate').click();assert.equal(reply.window.document.getElementById('recipient').value,'민수');assert.equal(reply.window.document.getElementById('sender').value,'지민');reply.window.close();kr.window.close();
 const old=load('t/letter/index.html',hash({v:3,k:0,n:'옛친구',rel:0,num:100,i:[0,0,0,0],t:1,s:3}));assert.equal(old.window.document.getElementById('reader').hidden,false);assert.ok(old.window.document.getElementById('readBody').textContent.includes('100일'));old.window.close();
 const oldText=load('t/letter/index.html',hash({v:3,k:3,n:'친구',w:'예전 편지 그대로',f:'나'}));assert.equal(oldText.window.document.getElementById('readBody').textContent,'예전 편지 그대로');oldText.window.close();
 for(const bad of ['#l=%%%','#l='+Buffer.from('{bad').toString('base64url'),hash({v:4,w:{bad:true}}),hash({v:99,w:'future'})]){const e=load('t/letter/index.html',bad);assert.equal(e.window.document.getElementById('error').hidden,false);e.window.close();}
 const home=load('index.html'),hd=home.window.document;
 const homeCss=fs.readFileSync(path.join(root,'assets/social-ui.css'),'utf8');
 assert.match(homeCss,/\.hero-art\{height:auto\}/);
 assert.match(hd.querySelector('link[href*="social-ui.css"]').getAttribute('href'),/\?v=2026/); /* 버전 일치는 test/asset-versions.js 가 검사 */
 assert.equal(fs.readFileSync(path.join(root,'t/letter/index.html'),'utf8').includes('help-guide.js'),false);
 assert.equal(hd.getElementById('catalogList').children.length,28);assert.equal(hd.getElementById('all').hidden,false);assert.equal(hd.getElementById('allButton'),null);
 const catalogCards=[...hd.querySelectorAll('#catalogList > a')];
 assert.deepEqual(catalogCards.slice(0,12).map(a=>a.getAttribute('href')),['t/mole/','t/rps/','t/nonsense/','t/num25/','t/pairs/','t/ufo/','t/stop/','t/ten/','t/tap/','t/react/','t/delivery/','t/stroop/']);
 assert.equal(new Set(catalogCards.map(a=>a.getAttribute('href'))).size,28);
 assert.deepEqual(['t/tarot/','t/personality/','t/fortune/','t/group-room/'].filter(h=>catalogCards.some(a=>a.getAttribute('href')===h)).length,4,'타로·마음동물·운세·단체방이 홈 목록에 있어야 함');
 for(const a of catalogCards){assert.ok(fs.existsSync(path.join(root,a.getAttribute('href'),'index.html')));assert.ok(a.querySelector('.catalog-mascot'));assert.ok(a.querySelector('h3').textContent);assert.ok(a.querySelector('.catalog-tags').children.length);assert.equal(a.querySelector('.catalog-start').textContent,'시작하기 →');}
 for(const rel of ['연인','부부','친구','가족','전체']){
   [...hd.getElementById('catalogFilters').children].find(b=>b.textContent===rel).click();
   const shown=[...hd.querySelectorAll('#catalogList > a')];assert.ok(shown.length>0);
   if(rel==='전체')assert.equal(shown.length,28);else assert.ok(shown.every(a=>[...a.querySelectorAll('.catalog-tags span')].some(t=>t.textContent===rel)));
   assert.equal(hd.getElementById('all').hidden,false);
 }
 home.window.close();
 for(const [query,random,expected] of [['',0.49,'letter'],['',0.5,'play'],['?home=letter',0.9,'letter'],['?home=play',0.1,'play'],['?home=unknown',0.9,'play']]){
   const h=load('index.html',query,random),doc=h.window.document,playing=expected==='play';
   assert.equal(doc.body.dataset.home,expected);assert.equal(doc.getElementById('letterHome').hidden,playing);assert.equal(doc.getElementById('gameLetter').hidden,!playing);assert.equal(doc.getElementById('playHero').hidden,!playing);assert.equal(doc.getElementById('rpsStart').getAttribute('href'),'t/rps/');assert.equal(doc.getElementById('catalogList').children.length,28);h.window.close();
 }
 assert.deepEqual(errors,[]);w.close();console.log('편지·홈 검사 통과 — 450자 한도·초과 보존·링크 복원, 무작위 메인 2종, 필터, 작성 유지, 공유, 옛 링크, 전체 놀이');
}
main().catch(e=>{console.error(e);process.exit(1);});
