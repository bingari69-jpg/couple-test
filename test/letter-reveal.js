/* Opening stays brief; the entire letter is immediately readable, including emoji. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const file=path.join(__dirname,'../t/letter/index.html');
const html=fs.readFileSync(file,'utf8').replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.resolve(path.dirname(file),src.split('?')[0]),'utf8').replace(/<\/script/g,'<\\/script')+'</script>');
const text='한글👩‍❤️‍👨\n다음 줄.\n\n고마워 <b>♥</b>';
for(const reduced of [false,true]){
 const timers=[];
 const dom=new JSDOM(html,{url:'https://noljago.co.kr/t/letter/#l='+Buffer.from(JSON.stringify({v:4,w:text})).toString('base64url'),runScripts:'dangerously',beforeParse(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:reduced});w.setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length;};w.clearTimeout=()=>{};}});
 const $=id=>dom.window.document.getElementById(id);
 $('readerEnvelope').click();const opening=timers.find(t=>t.delay===(reduced?0:600));assert.ok(opening);opening.fn();
 assert.equal($('openedLetter').hidden,false);assert.equal($('readBody').textContent,text);assert.equal($('readBody').children.length,0);assert.equal($('skipRead').hidden,true);
 assert.equal(dom.window.document.activeElement,$('readBody'));
 dom.window.close();
}
console.log('편지 읽기 검사 통과 — 개봉 후 전체 본문, 한글·이모지·줄바꿈, 모션 줄이기, 포커스');
