const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const menuLabels=['같이놀자란?','문의사항','제휴문의','사용법'];
const home=read('index.html');menuLabels.forEach(label=>assert.match(home,new RegExp(label)));
for(const removed of ['둘이놀기','혼자놀기','편지 쓰기','심리테스트'])assert.doesNotMatch(home.match(/<nav id="menu"[\s\S]*?<\/nav>/)[0],new RegExp(removed));
for(const file of ['contact/index.html','partnership/index.html','privacy/index.html'])assert.match(read(file),/mailto:bingari69@gmail\.com/,file+' 공식 문의 메일 누락');
for(const file of ['about/index.html','contact/index.html','partnership/index.html']){
 const html=read(file);menuLabels.forEach(label=>assert.match(html,new RegExp(label),file+' 메뉴 누락'));
 assert.match(html,/infoMenuButton/);assert.match(html,/회원가입|제휴/);
}

const contact=read('contact/index.html').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
const menuScript=read('assets/site-pages.js'),inquiryScript=read('assets/inquiry.js');
async function submission(ok=true){
 const dom=new JSDOM(contact,{url:'https://noljago.co.kr/contact/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,$=id=>w.document.getElementById(id);let sent;
 w.fetch=async(url,options)=>{sent={url,options};return {ok,status:ok?200:503};};$('inquiryForm').reportValidity=()=>true;
 w.eval(menuScript);$('infoMenuButton').click();assert.equal($('infoMenu').hidden,false);w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal($('infoMenu').hidden,true);
 $('category').value='오류가 있어요';$('email').value='hello@example.com';$('message').value='편지를 열 때 화면을 확인해 주세요.';
 w.eval(inquiryScript);$('inquiryForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,10));
 const body=JSON.parse(sent.options.body);assert.match(sent.url,/submit_site_inquiry$/);assert.equal(body.p_kind,'feedback');assert.equal(body.p_email,'hello@example.com');assert.equal(body.p_message,'편지를 열 때 화면을 확인해 주세요.');
 if(ok){assert.equal($('inquiryForm').hidden,true);assert.equal($('formSuccess').hidden,false);}else{assert.equal($('inquiryForm').hidden,false);assert.match($('formStatus').textContent,/보내지 못했어요/);}
 dom.window.close();
}
(async()=>{
 await submission(true);await submission(false);
 const sql=read('supabase/migrations/20260914_site_inquiries.sql');assert.match(sql,/enable row level security/i);assert.match(sql,/submit_site_inquiry/);assert.match(sql,/is_app_admin/);assert.match(sql,/revoke all on public\.site_inquiries from public, anon, authenticated/i);
 const privacy=read('privacy/index.html');assert.match(privacy,/의견과 제휴문의/);assert.match(privacy,/관리자만 확인/);
 console.log('소개·문의 메뉴 검사 통과 — 상단 안내 메뉴 4종, 문의 전송·실패, 관리자 전용 저장, 개인정보 안내');
})().catch(error=>{console.error(error);process.exit(1);});
