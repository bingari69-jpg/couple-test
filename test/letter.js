/* Letter flow and compatibility checks. No real sharing or remote resource requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');
const errors=[];
function load(relative='t/letter/index.html',suffix=''){
 const file=path.join(root,relative),base=path.dirname(file);
 let html=fs.readFileSync(file,'utf8').replace(/<script src="([^"]+)"><\/script>/g,(all,src)=>{
   if(src.includes('analytics'))return '';
   return '<script>'+fs.readFileSync(path.resolve(base,src.split('?')[0]),'utf8').replace(/<\/script/g,'<\\/script')+'</script>';
 });
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 return new JSDOM(html,{url:'https://bingari69-jpg.github.io/couple-test/'+relative.replace(/index.html$/,'')+suffix,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:true});w.navigator.clipboard={writeText:async s=>{w.copied=s;}};}});
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
 input('recipient','지민');input('sender','민수');input('letterBody',body);
 $('changePaper').click();$('templateGrid').children[5].click();$('viewTemplate').click();$('useTemplate').click();assert.equal($('letterBody').value,body);assert.equal($('recipient').value,'지민');
 $('fontChoice').value='serif';$('fontChoice').dispatchEvent(new w.Event('change'));$('sizeChoice').value='23';$('sizeChoice').dispatchEvent(new w.Event('input'));
 $('packLetter').click();assert.equal($('send').hidden,false);const url=$('shareLink').value;const p=JSON.parse(Buffer.from(url.split('#l=')[1],'base64url'));
 assert.equal(p.w,body);assert.equal(p.tpl,'winter');assert.equal(p.font,'serif');assert.equal(p.size,23);assert.equal(p.n,'지민');
 $('copyLetter').click();await tick();assert.equal(w.copied,url);
 $('packedEnvelope').click();assert.equal($('reader').hidden,false);$('readerEnvelope').click();await tick();assert.equal($('readBody').textContent,body);assert.equal($('readBody').children.length,0);assert.equal($('openedLetter').hidden,false);
 $('returnPreview').click();assert.equal($('send').hidden,false);$('editLetter').click();assert.equal($('letterBody').value,body);
 $('helpButton').click();$('suggestions').firstElementChild.click();assert.ok($('letterBody').value.startsWith(body+'\n\n'));
 const r=load('t/letter/index.html',hash(p));assert.equal(r.window.document.getElementById('reader').hidden,false);assert.equal(r.window.document.getElementById('readBody').textContent,body);assert.equal(r.window.document.querySelectorAll('script[src*="kakao"],script[src*="analytics"]').length,0);r.window.close();
 const old=load('t/letter/index.html',hash({v:3,k:0,n:'옛친구',rel:0,num:100,i:[0,0,0,0],t:1,s:3}));assert.equal(old.window.document.getElementById('reader').hidden,false);assert.ok(old.window.document.getElementById('readBody').textContent.includes('100일'));old.window.close();
 const oldText=load('t/letter/index.html',hash({v:3,k:3,n:'친구',w:'예전 편지 그대로',f:'나'}));assert.equal(oldText.window.document.getElementById('readBody').textContent,'예전 편지 그대로');oldText.window.close();
 for(const bad of ['#l=%%%','#l='+Buffer.from('{bad').toString('base64url'),hash({v:4,w:{bad:true}}),hash({v:99,w:'future'})]){const e=load('t/letter/index.html',bad);assert.equal(e.window.document.getElementById('error').hidden,false);e.window.close();}
 const home=load('index.html');assert.equal(home.window.document.getElementById('catalogList').children.length,21);home.window.document.getElementById('allButton').click();assert.equal(home.window.document.getElementById('all').hidden,false);home.window.close();
 assert.deepEqual(errors,[]);w.close();console.log('편지 검사 통과 — 필터, 작성 유지, 서체·크기, 공유 링크, 미리보기, 옛 링크, 잘못된 링크, 안전한 본문 표시, 전체 놀이');
}
main().catch(e=>{console.error(e);process.exit(1);});
