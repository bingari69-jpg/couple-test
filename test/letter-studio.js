/* Draft safety and decorated-letter round trips, without network or real sharing. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),file=path.join(root,'t/letter/index.html'),KEY='gatchi_letter_draft_v1';
const html=fs.readFileSync(file,'utf8').replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(path.resolve(path.dirname(file),src.split('?')[0]),'utf8').replace(/<\/script/g,'<\\/script')+'</script>');
const errors=[];
function load({seed,suffix='',blocked=false}={}){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://noljago.co.kr/t/letter/'+suffix,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:true});if(seed)w.localStorage.setItem(KEY,seed);if(blocked){w.Storage.prototype.setItem=()=>{throw new Error('quota');};w.Storage.prototype.removeItem=()=>{throw new Error('denied');};}}});
 const w=dom.window,$=id=>w.document.getElementById(id);
 return {dom,w,$,input(id,value){$(id).value=value;$(id).dispatchEvent(new w.Event('input'));},saved:()=>w.localStorage.getItem(KEY),close:()=>w.close()};
}
const hash=p=>'#l='+Buffer.from(JSON.stringify(p)).toString('base64url');
const a=load();a.$('quickWrite').click();a.input('recipient','지민');a.input('sender','민수');a.input('letterBody','안녕 💌\n내 마음을 전해.');
a.$('fontChoice').value='pen';a.$('fontChoice').dispatchEvent(new a.w.Event('change'));
a.$('stickerOptions').querySelector('[aria-label="고양이"]').click();a.$('stickerOptions').querySelector('[aria-label="꽃"]').click();a.$('sealOptions').querySelector('[aria-label="클로버 봉인"]').click();
a.$('colorOptions').children[2].click();
let saved=a.saved();assert.equal(JSON.parse(saved).draft.font,'pen');assert.equal(JSON.parse(saved).draft.inline.length,2);
// Cursor insertion and selection replacement, rather than always appending emoji.
const body=a.$('letterBody');body.setSelectionRange(0,2);body.dispatchEvent(new a.w.Event('select'));a.$('emojiOptions').children[0].click();assert.ok(body.value.startsWith('♡ 💌'));
a.input('letterBody','안녕 💌\n내 마음을 전해.');a.$('stickerOptions').querySelector('[aria-label="고양이"]').click();a.$('stickerOptions').querySelector('[aria-label="꽃"]').click();saved=a.saved();
a.$('packLetter').click();const p=JSON.parse(Buffer.from(a.$('shareLink').value.split('#l=')[1],'base64url'));assert.equal(p.v,6);assert.deepEqual(p.st,[]);assert.deepEqual(p.inl.map(x=>x[1]),['cat','flower']);assert.equal(p.seal,'clover');assert.equal(p.color,'#754954');
assert.ok(fs.existsSync(path.join(root,'assets/share-cards/letter-'+p.tpl+'.png')));
a.close();
// Refresh only offers restoration; it doesn't expose the body on the library screen.
const restored=load({seed:saved});assert.equal(restored.$('savedDraftBanner').hidden,false);assert.equal(restored.$('letterBody').value,'');restored.$('resumeDraft').click();assert.equal(restored.$('letterBody').value,p.w);assert.equal(restored.$('fontChoice').value,'pen');assert.equal(restored.$('composePaper').querySelectorAll('.inline-letter-sticker img').length,2);
// Changing paper preserves the whole text, including an over-limit draft.
restored.input('letterBody','가'.repeat(451));restored.$('changePaper').click();restored.$('templateGrid').querySelector('[data-template="cat-note"]').click();restored.$('useTemplate').click();assert.equal(restored.$('letterBody').value.length,451);assert.equal(restored.$('packLetter').disabled,true);restored.close();
// Incoming letters must never overwrite a user's existing draft, even on reply.
const incoming=load({seed:saved,suffix:hash({...p,v:5,st:['cat','flower'],n:'받는이',f:'보낸이',w:'받은 편지'})});assert.equal(incoming.saved(),saved);assert.equal(incoming.$('readBody').textContent,'받은 편지');assert.equal(incoming.$('readPaper').querySelectorAll('.paper-stickers img').length,2);
incoming.$('quickReplies').children[0].click();assert.equal(incoming.$('draftDialog').hasAttribute('open'),true);assert.equal(incoming.saved(),saved);incoming.$('dialogCancel').click();assert.equal(incoming.saved(),saved);
incoming.$('quickReplies').children[0].click();incoming.$('dialogDiscard').click();assert.equal(incoming.$('recipient').value,'보낸이');assert.equal(incoming.$('sender').value,'받는이');assert.ok(incoming.$('letterBody').value.includes('고마워'));incoming.close();
const resumeFromReader=load({seed:saved,suffix:hash({...p,w:'받은 편지'})});resumeFromReader.$('replyLetter').click();resumeFromReader.$('dialogResume').click();assert.equal(resumeFromReader.$('letterBody').value,p.w);assert.equal(resumeFromReader.w.location.hash,'');resumeFromReader.close();
// Explicit delete with a cancel path, and no unexpected resurrection on reload.
const del=load({seed:saved});del.$('deleteDraft').click();del.$('dialogCancel').click();assert.equal(del.saved(),saved);del.$('deleteDraft').click();del.$('dialogDiscard').click();assert.equal(del.saved(),null);assert.equal(del.$('savedDraftBanner').hidden,true);del.close();
const quota=load({blocked:true});quota.$('quickWrite').click();quota.input('letterBody','이 글은 지워지면 안 돼');assert.equal(quota.$('letterBody').value,'이 글은 지워지면 안 돼');assert.equal(quota.$('saveStatus').dataset.error,'true');quota.$('packLetter').click();assert.equal(quota.$('send').hidden,false);quota.close();
for(const seed of ['{broken',JSON.stringify({version:99,draft:{body:'미래 형식'}}),JSON.stringify({version:1,draft:{body:42}})]){const x=load({seed});assert.equal(x.$('library').hidden,false);assert.equal(x.$('savedDraftBanner').hidden,true);x.close();}
const unsafe=load({suffix:hash({v:5,w:'<img src=x onerror=alert(1)>',n:'<script>',font:'__proto__',tpl:'../../bad',st:['cat','bogus','<svg onload=alert(1)>'],color:'red;position:fixed',seal:'../bad'})});assert.equal(unsafe.$('readBody').children.length,0);assert.equal(unsafe.$('readPaper').querySelectorAll('.paper-stickers img').length,1);assert.equal(unsafe.$('readPaper').style.getPropertyValue('--letter-font').includes('Letter Sans'),true);unsafe.close();
const inlineSafe=load({suffix:hash({v:6,w:'A\ufffcB\ufffc',inl:[[1,'cat'],[1,'bear'],[3,'../../remote'],[-1,'heart'],[0,'flower']],st:[]})});assert.equal(inlineSafe.$('readBody').querySelectorAll('.inline-letter-sticker').length,1);assert.equal(inlineSafe.$('readBody').querySelector('img').getAttribute('alt'),'고양이 스티커');assert.equal(inlineSafe.w.LetterInline.clean('\ufffc'.repeat(30),Array.from({length:30},(_,i)=>[i,'cat'])).length,24);assert.equal(inlineSafe.w.LetterInline.plain('A\ufffcB',[[1,'cat']]),'A[고양이]B');inlineSafe.close();
// 조합을 끝내지 않는 안드로이드 키보드: 예전에는 "한글 입력을 마친 뒤" 안내만 반복되고 영영 못 넣었다.
const ime=load();ime.$('quickWrite').click();
const imeEditor=ime.$('letterEditor');
imeEditor.textContent='안녕하세';imeEditor.dispatchEvent(new ime.w.Event('input',{bubbles:true}));
imeEditor.dispatchEvent(new ime.w.CompositionEvent('compositionstart',{bubbles:true}));   // 끝내지 않는다
ime.$('stickerOptions').children[0].click();
assert.equal(imeEditor.querySelectorAll('.inline-letter-sticker').length,1,'조합 중에도 스티커가 들어간다');
assert.equal(ime.$('letterBody').value.startsWith('안녕하세'),true,'치던 글자는 살아 있다');
ime.$('emojiOptions').children[0].click();
assert.equal(ime.$('letterBody').value.includes('♡'),true,'이모지도 막히지 않는다');
ime.close();
// 꾸미기 창은 연달아 넣는 동안 열려 있고, 다시 글을 쓰기 시작하면 닫힌다(창이 글자를 가리지 않게).
const dock=load();dock.$('quickWrite').click();
dock.$('stickerButton').click();
assert.equal(dock.$('stickerPanel').hidden,false,'스티커 창이 열린다');
dock.$('stickerOptions').children[0].click();
dock.$('stickerOptions').children[1].click();
assert.equal(dock.$('stickerPanel').hidden,false,'연달아 넣는 동안에는 열려 있다');
assert.equal(dock.$('letterEditor').querySelectorAll('.inline-letter-sticker').length,2);
dock.$('letterEditor').dispatchEvent(new dock.w.Event('pointerup',{bubbles:true}));
assert.equal(dock.$('stickerPanel').hidden,true,'본문을 누르면 닫힌다');
dock.$('emojiButton').click();
assert.equal(dock.$('emojiPanel').hidden,false);
dock.$('letterEditor').dispatchEvent(new dock.w.InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:'ㄱ'}));
assert.equal(dock.$('emojiPanel').hidden,true,'글자를 치기 시작해도 닫힌다');
dock.close();
assert.deepEqual(errors,[]);
console.log('편지 스튜디오 검사 통과 — 초안 복원·삭제·수신 보호·저장 실패, 커서 이모지, 꾸미기 왕복, 조합 중 스티커/이모지, 쓰기 시작하면 꾸미기 창 닫힘, 안전한 링크');
