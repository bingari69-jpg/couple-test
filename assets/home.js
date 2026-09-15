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
const PLAY_HEROES=[
 {key:'mole',eyebrow:'땅속에서 쏙!',accent:'두더지 잡기',rest:'한판 할래?',lead:'20초 동안 두더지 잡기.\n황금은 놓치지 마!',bubble:'쏙!',button:'두더지 잡으러 가기',href:'t/mole/',label:'고개를 내민 두더지',art:'atlas',sprite:[50,60],color:'#6d9f45'},
 {key:'rps',eyebrow:'심심해? 뎀벼~',accent:'가위바위보로',rest:'한판 할래?',lead:'내가 먼저 낼게.\n카톡으로 보내면, 네가 받아줘!',bubble:'뎀벼!',button:'나 먼저 낼게',href:'t/rps/',label:'머리띠를 두른 장난스러운 토끼',art:'classic',color:'#ff6959'},
 {key:'hidden-picture',eyebrow:'그림 속에 꼭꼭',accent:'숨은그림찾기',rest:'같이 할래?',lead:'혼자는 세 장의 그림을.\n친구와는 30초 대결!',bubble:'찾았다!',button:'숨은 물건 찾기',href:'t/hidden-picture/?mode=online',label:'숲속 숨은그림찾기 장면',art:'hidden-picture',color:'#27967b'}
];
function setPlayHero(){
 if(!playing)return;
 const key='gatchi-play-hero-v1';let index=0;
 try{const saved=Number(localStorage.getItem(key));if(Number.isInteger(saved)&&saved>=0&&saved<PLAY_HEROES.length)index=saved;localStorage.setItem(key,String((index+1)%PLAY_HEROES.length));}catch(e){}
 const hero=PLAY_HEROES[index],play=$('play'),title=$('playTitle'),accent=document.createElement('span');
 accent.className='accent';accent.textContent=hero.accent;title.replaceChildren(accent,document.createElement('br'),document.createTextNode(hero.rest));
 $('playEyebrow').textContent=hero.eyebrow;$('playLead').replaceChildren(...hero.lead.split('\n').flatMap((line,i)=>i?[document.createElement('br'),document.createTextNode(line)]:[document.createTextNode(line)]));
 $('playBubble').textContent=hero.bubble;$('rpsStart').href=hero.href;$('rpsStart').firstChild.textContent=hero.button+' ';
 const character=$('playCharacter');character.className='character hero-'+hero.art;character.setAttribute('aria-label',hero.label);
 if(hero.sprite){character.style.setProperty('--hero-sprite-x',hero.sprite[0]+'%');character.style.setProperty('--hero-sprite-y',hero.sprite[1]+'%');}else{character.style.removeProperty('--hero-sprite-x');character.style.removeProperty('--hero-sprite-y');}
 play.classList.remove(...PLAY_HEROES.map(item=>'hero-'+item.key));play.classList.add('hero-'+hero.key);play.style.setProperty('--hero-accent',hero.color);
 document.title='같이놀자 — '+hero.accent+' '+hero.rest;
}
setPlayHero();
if(!playing)document.title='같이놀자 — 너에게 보내고 싶은 게 있어';
$('menuButton').onclick=()=>{const open=$('menu').hidden;$('menu').hidden=!open;$('menuButton').setAttribute('aria-expanded',String(open));};
$('menu').querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{$('menu').hidden=true;$('menuButton').setAttribute('aria-expanded','false');}));
// 둘이놀기(기본) / 혼자놀기 탭. ?tab=solo 또는 #solo 로 바로 열 수 있다.
const SOLO=window.SOLO_GAMES||{};
let mode=(new URLSearchParams(location.search).get('tab')==='solo'||location.hash==='#solo')?'solo':'duel';
let duelMode='kakao';
const slugOf=it=>it.path.replace(/^t\//,'').replace(/\/$/,'');
function soloBadge(slug){
 let all={};try{all=JSON.parse(localStorage.getItem('gatchi_solo_v1')||'{}')||{};}catch(e){}
 const p=all[slug]||{},total=SOLO[slug]||0;let cleared=0,stars=0;
 for(let n=1;n<=total;n++){const r=p[n];if(r&&r.stars>0){cleared++;stars+=r.stars;}}
 return {cleared,stars,total,next:Math.min(total,cleared+1)};
}
function renderModes(){
 const box=$('catalogModes');if(!box)return;box.replaceChildren();
 [['duel','둘이놀기','카톡으로, 때로는 한 화면에서'],['solo','혼자놀기','레벨 도전부터 컴퓨터 대전까지']].forEach(([key,label,sub])=>{
   const b=document.createElement('button');b.type='button';b.className='mode-tab';b.dataset.mode=key;b.setAttribute('aria-pressed',String(mode===key));
   b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent=label;b.querySelector('small').textContent=sub;
   b.onclick=()=>{mode=key;render();};box.append(b);
 });
 $('catalogTitle').textContent=mode==='solo'?'혼자서도 재밌게':duelMode==='realtime'?'지금 바로 붙을래?':'카톡으로 한판 할래?';
 const lead=document.querySelector('.catalog-lead');if(lead)lead.textContent=mode==='solo'?'레벨을 깨고 별을 모으거나, 컴퓨터와 가볍게 한판 해봐.':duelMode==='realtime'?'둘 다 접속하면 바로 같은 방에서 시작해요.':'내가 먼저 하고 카톡으로 보내면, 친구도 자기 폰에서 이어서 해요.';
}
function renderDuelModes(){
 const box=$('catalogDuelModes');if(!box)return;box.replaceChildren();box.hidden=mode!=='duel';
 if(mode!=='duel')return;
 [['kakao','카톡대전','도전장을 보내고 각자 기록으로 승부'],['realtime','실시간대전','둘 다 접속해 같은 방에서 바로 겨뤄요']].forEach(([key,label,sub])=>{
   const b=document.createElement('button');b.type='button';b.className='duel-mode';b.dataset.duelMode=key;b.setAttribute('aria-pressed',String(duelMode===key));
   b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent=label;b.querySelector('small').textContent=sub;
   b.onclick=()=>{duelMode=key;render();};box.append(b);
 });
}
function render(){
 renderModes();
 renderDuelModes();
 const soloMode=mode==='solo';
 $('catalogList').replaceChildren();
 // 심리테스트·편지는 각자 메뉴에만 둔다(playHide) — 놀기 탭에는 게임만 보여준다
 const visible=HOME_ITEMS.filter(it=>!it.playHide).filter(it=>soloMode?(SOLO[slugOf(it)]||it.soloFree):(duelMode==='realtime'?it.realtimeDuel:true));
 $('catalogCount').textContent=(soloMode?'혼자놀기':duelMode==='realtime'?'실시간대전':'카톡대전')+' · '+visible.length+'가지';
 visible.forEach(it=>{
   const slug=slugOf(it),solo=soloMode;
   const a=document.createElement('a');a.className='catalog-card'+(solo?' solo':'');a.href=solo?it.path+'?solo=1':it.path+((it.localDuel||it.onlineDuel||it.realtimeDuel)?'?mode=online':'');a.style.setProperty('--card-color',it.color);a.setAttribute('aria-label',it.title+' 시작하기');
   const art=document.createElement('div');art.className='catalog-art';art.setAttribute('aria-hidden','true');
   /* 인기 순위는 둘이놀기 기준이라 혼자놀기 탭에서는 붙이지 않는다 */
   if(!solo&&it.popularRank){const rank=document.createElement('span');rank.className='catalog-rank';rank.textContent='인기 '+it.popularRank+'위';art.append(rank);}
   const mascot=document.createElement('div');mascot.className='catalog-mascot '+it.art;
   mascot.style.setProperty('--sprite-x',(it.index%3)*50+'%');mascot.style.setProperty('--sprite-y',Math.floor(it.index/3)*20+'%');art.append(mascot);
   if(it.thumbnailUrl){art.style.backgroundImage='url("'+String(it.thumbnailUrl).replace(/["\\]/g,'')+'")';art.style.backgroundSize='cover';art.style.backgroundPosition='center';mascot.hidden=true;}
   const content=document.createElement('div');content.className='catalog-content';
   const title=document.createElement('h3');title.textContent=it.title.split(' — ')[0];
   const description=document.createElement('p');description.textContent=slug==='omok'?(solo?'컴퓨터와 15×15 오목. 다섯 알을 먼저 이어봐.':'카톡으로 초대해서 각자 휴대폰으로 두는 15×15 오목.'):(solo&&it.soloSummary?it.soloSummary:it.summary);
   const tags=document.createElement('div');tags.className='catalog-tags';
   if(!solo){const tag=document.createElement('span');tag.textContent=duelMode==='realtime'?'실시간대전':'카톡대전';tag.dataset.duelMode=duelMode;tags.append(tag);}
   const start=document.createElement('span');start.className='catalog-start';start.textContent=solo?'혼자 하기 →':'시작하기 →';
   if(solo){const s=soloBadge(slug);const badge=document.createElement('span');badge.className='catalog-badge';badge.textContent=it.soloFree?'컴퓨터와 · 자유 한판':s.total===1?(s.cleared?'오늘 완료 ★'.replace('★','★'.repeat(s.stars)):'오늘 한 판'):(s.cleared>=s.total?'모두 클리어 · ★'+s.stars:'Lv'+s.next+' 도전 · ★'+s.stars+'/'+(s.total*3));tags.replaceChildren(badge);}
   content.append(title,description,tags,start);a.append(art,content);$('catalogList').append(a);
 });
 // 목록을 다 그렸다고 알린다. app-config.js 가 이 신호로 홈 목록 광고를 다시 붙인다.
 window.dispatchEvent(new CustomEvent('home-catalog-rendered'));
}
render();
window.addEventListener('home-catalog-updated',render);
if(/^#(?:i|r)=/.test(location.hash))location.replace('t/marriage/'+location.hash);
})();
