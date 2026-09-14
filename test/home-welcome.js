const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
const script=fs.readFileSync(path.join(root,'assets/home-welcome.js'),'utf8');
function open({seen=false,preview=false}={}){
 const dom=new JSDOM(html,{url:'https://noljago.co.kr/'+(preview?'?admin_preview=1':''),runScripts:'outside-only',pretendToBeVisual:true});
 const {window:w}=dom,dialog=w.document.getElementById('homeWelcome');
 dialog.showModal=function(){this.open=true;this.setAttribute('open','');};dialog.close=function(){this.open=false;this.removeAttribute('open');};
 w.Element.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};
 if(seen)w.localStorage.setItem('gatchi_home_welcome_v1','1');
 w.eval(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,dialog,$:id=>w.document.getElementById(id)};
}
{
 const p=open();assert.equal(p.dialog.open,true,'첫 방문 안내가 자동으로 열려야 함');
 assert.match(p.dialog.textContent,/친구나 연인/);assert.match(p.dialog.textContent,/회원가입과 앱 설치 없이/);assert.match(p.dialog.textContent,/상대방도 회원가입 없이/);assert.match(p.dialog.textContent,/카카오톡에서는 이렇게/);
 assert.equal(p.dialog.querySelectorAll('.welcome-flows article').length,2);assert.equal(p.dialog.querySelectorAll('.welcome-flows li').length,6);
 assert.equal(p.$('welcomeLetter').getAttribute('href'),'t/letter/');p.$('welcomeClose').click();assert.equal(p.dialog.open,false);assert.equal(p.w.localStorage.getItem('gatchi_home_welcome_v1'),'1');
 p.$('welcomeHelp').click();assert.equal(p.dialog.open,true,'푸터에서 다시 열 수 있어야 함');p.$('welcomeGames').click();assert.equal(p.dialog.open,false);assert.equal(p.$('all').dataset.scrolled,'true');p.dom.window.close();
}
{
 const p=open({seen:true});assert.equal(p.dialog.open,false,'본 안내는 다시 자동으로 열리지 않아야 함');p.dom.window.close();
}
{
 const p=open({preview:true});assert.equal(p.dialog.open,false,'관리자 미리보기에서는 자동 안내를 띄우지 않아야 함');p.dom.window.close();
}
console.log('홈 첫 방문 안내 검사 통과 — 편지·게임 3단계, 카카오 설명, 다시 열기, 1회 자동 표시');
