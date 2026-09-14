const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const file=path.join(__dirname,'../t/letter/index.html');
const html=fs.readFileSync(file,'utf8').replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.resolve(path.dirname(file),src.split('?')[0]),'utf8').replace(/<\/script/g,'<\\/script')+'</script>');
const text='한글\ufffc👩‍❤️‍👨\n다음 줄.\n\n고마워 <b>♥</b>',inline=[[2,'cat']];

function create(reduced){
 let now=0,id=0;const timers=new Map();
 const hash='#l='+Buffer.from(JSON.stringify({v:6,w:text,inl:inline})).toString('base64url');
 const dom=new JSDOM(html,{url:'https://noljago.co.kr/t/letter/'+hash,runScripts:'dangerously',beforeParse(w){
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:reduced});
  w.setTimeout=(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;};w.clearTimeout=id=>timers.delete(id);
 }});
 function advance(ms){const end=now+ms;for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;}
 return {dom,advance};
}

{
 const {dom,advance}=create(false),$=id=>dom.window.document.getElementById(id);
 $('readerEnvelope').click();advance(600);
 assert.equal($('openedLetter').hidden,false);assert.equal($('skipRead').hidden,false);
 assert.equal($('readBody').querySelectorAll('.letter-glyph').length>0,true);
 assert.equal($('readBody').querySelector('.letter-accessible-text').textContent,text.replace('\ufffc',''));
 assert.equal($('readBody').querySelector('.letter-accessible-text img').alt,'고양이 스티커');
 advance(180+45+45);assert.equal($('readBody').querySelector('.inline-letter-sticker.letter-glyph').classList.contains('is-visible'),true);
 $('skipRead').click();assert.equal($('readBody').textContent,text.replace('\ufffc',''));assert.equal($('readBody').querySelectorAll('.letter-glyph').length,0);assert.equal($('readBody').querySelector('img').alt,'고양이 스티커');assert.equal($('skipRead').hidden,true);assert.equal(dom.window.document.activeElement,$('readBody'));
 advance(10000);assert.equal($('readBody').querySelectorAll('img').length,1);dom.window.close();
}

{
 const {dom,advance}=create(true),$=id=>dom.window.document.getElementById(id);
 $('readerEnvelope').click();advance(0);
 assert.equal($('openedLetter').hidden,false);assert.equal($('readBody').querySelectorAll('.letter-glyph').length,0);assert.equal($('readBody').querySelector('img').alt,'고양이 스티커');assert.equal($('skipRead').hidden,true);dom.window.close();
}
console.log('편지 읽기 검사 통과 — 한글·이모지·스티커 순차 표시, 한 번에 보기, 모션 줄이기');
