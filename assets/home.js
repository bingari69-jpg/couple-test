(function(){
const $=id=>document.getElementById(id);
// 첫 방문은 두 홈 중 하나를 무작위로 고르고, 그 뒤로는 같은 홈을 기억해 보여준다.
// ?home=letter / ?home=play 로 직접 지정할 수도 있다(지정한 값도 기억한다).
const HOME_KEY='gatchi-home-v1';
const requestedHome=new URLSearchParams(location.search).get('home');
let rememberedHome='';try{rememberedHome=localStorage.getItem(HOME_KEY)||'';}catch(e){}
const home=['letter','play'].includes(requestedHome)?requestedHome:(['letter','play'].includes(rememberedHome)?rememberedHome:(Math.random()<0.5?'letter':'play'));
try{localStorage.setItem(HOME_KEY,home);}catch(e){}
const playing=home==='play';
document.body.dataset.home=home;
$('letterHome').hidden=playing;$('letterChallenge').hidden=playing;
$('playHero').hidden=!playing;$('gameLetter').hidden=!playing;
$('play').classList.toggle('game-hero',playing);
$(playing?'playHomeLink':'letterHomeLink').setAttribute('aria-current','page');
document.title=playing?'같이놀자 — 가위바위보로 한판 할래?':'같이놀자 — 너에게 보내고 싶은 게 있어';
$('menuButton').onclick=()=>{const open=$('menu').hidden;$('menu').hidden=!open;$('menuButton').setAttribute('aria-expanded',String(open));};
$('menuAll').onclick=()=>{$('menu').hidden=true;$('menuButton').setAttribute('aria-expanded','false');};
let relationship='전체';
function render(){
 $('catalogFilters').replaceChildren();
 ['전체','연인','부부','친구','가족'].forEach(r=>{const b=document.createElement('button');b.className='chip';b.textContent=r;b.setAttribute('aria-pressed',String(r===relationship));b.onclick=()=>{relationship=r;render();[...$('catalogFilters').children].find(el=>el.textContent===r).focus({preventScroll:true});};$('catalogFilters').append(b);});
 $('catalogList').replaceChildren();
 const visible=HOME_ITEMS.filter(it=>relationship==='전체'||it.relationships.includes(relationship));
 $('catalogCount').textContent=(relationship==='전체'?'전체':relationship+'와 함께')+' · '+visible.length+'가지';
 visible.forEach(it=>{
   const a=document.createElement('a');a.className='catalog-card';a.href=it.path;a.style.setProperty('--card-color',it.color);a.setAttribute('aria-label',it.title+' 시작하기');
   const art=document.createElement('div');art.className='catalog-art';art.setAttribute('aria-hidden','true');
   const mascot=document.createElement('div');mascot.className='catalog-mascot '+it.art;
   mascot.style.setProperty('--sprite-x',(it.index%3)*50+'%');mascot.style.setProperty('--sprite-y',Math.floor(it.index/3)*20+'%');art.append(mascot);
   if(it.thumbnailUrl){art.style.backgroundImage='url("'+String(it.thumbnailUrl).replace(/["\\]/g,'')+'")';art.style.backgroundSize='cover';art.style.backgroundPosition='center';mascot.hidden=true;}
   const content=document.createElement('div');content.className='catalog-content';
   const title=document.createElement('h3');title.textContent=it.title.split(' — ')[0];
   const description=document.createElement('p');description.textContent=it.summary;
   const tags=document.createElement('div');tags.className='catalog-tags';
   it.relationships.forEach(rel=>{const tag=document.createElement('span');tag.textContent=rel;tag.dataset.relationship=rel;tags.append(tag);});
   const start=document.createElement('span');start.className='catalog-start';start.textContent='시작하기 →';
   content.append(title,description,tags,start);a.append(art,content);$('catalogList').append(a);
 });
 // 목록을 다 그렸다고 알린다. app-config.js 가 이 신호로 홈 목록 광고를 다시 붙인다.
 window.dispatchEvent(new CustomEvent('home-catalog-rendered'));
}
render();
window.addEventListener('home-catalog-updated',render);
if(/^#(?:i|r)=/.test(location.hash))location.replace('t/marriage/'+location.hash);
})();
