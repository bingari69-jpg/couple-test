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
// 둘이놀기(기본) / 혼자놀기 탭. ?tab=solo 또는 #solo 로 바로 열 수 있다.
const SOLO=window.SOLO_GAMES||{};
let mode=(new URLSearchParams(location.search).get('tab')==='solo'||location.hash==='#solo')?'solo':'duel';
const slugOf=it=>it.path.replace(/^t\//,'').replace(/\/$/,'');
function soloBadge(slug){
 let all={};try{all=JSON.parse(localStorage.getItem('gatchi_solo_v1')||'{}')||{};}catch(e){}
 const p=all[slug]||{},total=SOLO[slug]||0;let cleared=0,stars=0;
 for(let n=1;n<=total;n++){const r=p[n];if(r&&r.stars>0){cleared++;stars+=r.stars;}}
 return {cleared,stars,total,next:Math.min(total,cleared+1)};
}
function renderModes(){
 const box=$('catalogModes');if(!box)return;box.replaceChildren();
 [['duel','둘이놀기','카톡으로 보내고 같이'],['solo','혼자놀기','레벨 깨고 별 모으기']].forEach(([key,label,sub])=>{
   const b=document.createElement('button');b.type='button';b.className='mode-tab';b.dataset.mode=key;b.setAttribute('aria-pressed',String(mode===key));
   b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent=label;b.querySelector('small').textContent=sub;
   b.onclick=()=>{mode=key;render();};box.append(b);
 });
 $('catalogTitle').textContent=mode==='solo'?'혼자서도 재밌게':'조금 더 놀다 갈래?';
 const lead=document.querySelector('.catalog-lead');if(lead)lead.textContent=mode==='solo'?'레벨을 깨고 별을 모아. 깬 판은 친구에게 도전장으로 보낼 수 있어.':'마음에 드는 놀이를 골라, 카톡으로 보내봐.';
}
function render(){
 renderModes();
 // 혼자놀기는 상대가 없는 놀이라 관계(연인·부부…) 고르기를 숨기고 전체로 본다. 둘이놀기로 돌아오면 고르던 관계가 그대로 살아난다.
 const soloMode=mode==='solo', rel=soloMode?'전체':relationship;
 $('catalogFilters').hidden=soloMode;
 $('catalogFilters').replaceChildren();
 if(!soloMode) ['전체','연인','부부','친구','가족'].forEach(r=>{const b=document.createElement('button');b.className='chip';b.textContent=r;b.setAttribute('aria-pressed',String(r===relationship));b.onclick=()=>{relationship=r;render();[...$('catalogFilters').children].find(el=>el.textContent===r).focus({preventScroll:true});};$('catalogFilters').append(b);});
 $('catalogList').replaceChildren();
 const visible=HOME_ITEMS.filter(it=>(rel==='전체'||it.relationships.includes(rel))&&(!soloMode||SOLO[slugOf(it)]));
 // 받침이 있으면 '과', 없으면 '와' (연인과 · 부부와)
 const withJosa=n=>{const c=n.charCodeAt(n.length-1);return n+((c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28>0)?'과':'와')+' 함께';};
 $('catalogCount').textContent=(soloMode?'혼자놀기':(rel==='전체'?'전체':withJosa(rel)))+' · '+visible.length+'가지';
 visible.forEach(it=>{
   const slug=slugOf(it),solo=soloMode;
   const a=document.createElement('a');a.className='catalog-card'+(solo?' solo':'');a.href=solo?it.path+'?solo=1':it.path;a.style.setProperty('--card-color',it.color);a.setAttribute('aria-label',it.title+' 시작하기');
   const art=document.createElement('div');art.className='catalog-art';art.setAttribute('aria-hidden','true');
   const mascot=document.createElement('div');mascot.className='catalog-mascot '+it.art;
   mascot.style.setProperty('--sprite-x',(it.index%3)*50+'%');mascot.style.setProperty('--sprite-y',Math.floor(it.index/3)*20+'%');art.append(mascot);
   if(it.thumbnailUrl){art.style.backgroundImage='url("'+String(it.thumbnailUrl).replace(/["\\]/g,'')+'")';art.style.backgroundSize='cover';art.style.backgroundPosition='center';mascot.hidden=true;}
   const content=document.createElement('div');content.className='catalog-content';
   const title=document.createElement('h3');title.textContent=it.title.split(' — ')[0];
   const description=document.createElement('p');description.textContent=it.summary;
   const tags=document.createElement('div');tags.className='catalog-tags';
   it.relationships.forEach(rel=>{const tag=document.createElement('span');tag.textContent=rel;tag.dataset.relationship=rel;tags.append(tag);});
   const start=document.createElement('span');start.className='catalog-start';start.textContent=solo?'혼자 하기 →':'시작하기 →';
   if(solo){const s=soloBadge(slug);const badge=document.createElement('span');badge.className='catalog-badge';badge.textContent=s.total===1?(s.cleared?'오늘 완료 ★'.replace('★','★'.repeat(s.stars)):'오늘 한 판'):(s.cleared>=s.total?'모두 클리어 · ★'+s.stars:'Lv'+s.next+' 도전 · ★'+s.stars+'/'+(s.total*3));tags.replaceChildren(badge);}
   content.append(title,description,tags,start);a.append(art,content);$('catalogList').append(a);
 });
 // 목록을 다 그렸다고 알린다. app-config.js 가 이 신호로 홈 목록 광고를 다시 붙인다.
 window.dispatchEvent(new CustomEvent('home-catalog-rendered'));
}
render();
window.addEventListener('home-catalog-updated',render);
if(/^#(?:i|r)=/.test(location.hash))location.replace('t/marriage/'+location.hash);
})();
