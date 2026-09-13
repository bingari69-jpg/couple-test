(function(){
 'use strict';
 const $=id=>document.getElementById(id),templates=window.LETTER_TEMPLATES,D=window.LetterDesign;
 const params=new URLSearchParams(location.search),initialHash=location.hash;
 const MAX_LETTER=450,WARN_AT=430;
 const occasionMap={birthday:'생일',anniversary:'기념일',plain:'그냥',thanks:'고마워',sorry:'미안해',cheer:'응원'};
 const fonts=Object.fromEntries(Object.keys(D.fonts).map(id=>[id,D.fontCSS(id)]));
 const replyMode=params.get('reply')==='1',queryText=key=>(params.get(key)||'').slice(0,24);
 const draft={template:templates.some(t=>t.id===params.get('template'))?params.get('template'):'little-heart',to:replyMode?queryText('to'):'',from:replyMode?queryText('from'):'',body:'',font:'sans',size:20,occasion:'plain',number:100,stickers:[],seal:'heart',color:''};
 let view='library',occasion=occasionMap[params.get('occasion')]||'전체',season='',returnFromPreview='compose',preview=false,incoming=null,changingPaper=false,toastTimer,animationTimer,madeUrl='',sdkPromise;
 let activeReveal;
 function stopReveal(){if(activeReveal){activeReveal.finish();activeReveal=null;}}
 function startReveal(body,button){stopReveal();$(button).hidden=true;$(body).setAttribute('tabindex','-1');$(body).focus({preventScroll:true});}
 const titles={library:'편지지 고르기',detail:'편지지 미리보기',compose:'마음 쓰기',send:'편지 보내기',reader:'도착한 편지',error:'편지 확인'};
 const template=id=>templates.find(t=>t.id===(id||draft.template))||templates[0];
 function paint(el,t){D.paint(el,t);}
 function typography(el,p){el.style.setProperty('--letter-font',fonts[p.font]||fonts.sans);el.style.setProperty('--letter-size',(p.size||20)+'px');el.style.setProperty('--text-color',COLORS.includes(p.color)?p.color:'var(--paper-ink)');}
 const COLORS=['','#383c38','#754954','#365d79','#4b6244'],STORAGE_KEY='gatchi_letter_draft_v1',FAVORITES_KEY='gatchi_letter_favorites_v1';
 let ownDraft=false,savedDraft=null,pendingNew=null,onlyFavorites=false,favorites=[],selection={start:0,end:0},exportSession,exportIndex=0,exportBlob,exportURL='',exportBusy=false;
 const meaningful=p=>p&&!!(p.body||p.to||p.from);
 function cleanDraft(p){
   if(!p||typeof p!=='object'||typeof p.body!=='string'||p.body.length>16000)return null;
   const t=template(typeof p.template==='string'?p.template:'little-heart');
   return {template:t.id,to:typeof p.to==='string'?p.to.slice(0,24):'',from:typeof p.from==='string'?p.from.slice(0,24):'',body:p.body,font:Object.hasOwn(fonts,p.font)?p.font:t.font,size:Number.isFinite(p.size)?Math.max(16,Math.min(26,p.size)):t.size,occasion:['plain','bday','day','year','wed','thanks','sorry','cheer'].includes(p.occasion)?p.occasion:'plain',number:Number.isInteger(p.number)?Math.max(1,Math.min(9999,p.number)):100,stickers:Array.isArray(p.stickers)?[...new Set(p.stickers.filter(id=>D.sticker(id)))].slice(0,3):[],seal:D.sticker(p.seal)?p.seal:'heart',color:COLORS.includes(p.color)?p.color:'',updated:Number.isFinite(p.updated)?p.updated:0};
 }
 try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY));if(stored&&stored.version===1)savedDraft=cleanDraft(stored.draft);}catch(_){}
 try{const stored=JSON.parse(localStorage.getItem(FAVORITES_KEY));if(Array.isArray(stored))favorites=stored.filter(id=>templates.some(t=>t.id===id));}catch(_){}
 function saveDraft(){
   madeUrl='';if(!ownDraft)return;
   try{draft.updated=Date.now();if(meaningful(draft)){localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,draft}));savedDraft={...draft,stickers:[...draft.stickers]};}else{localStorage.removeItem(STORAGE_KEY);savedDraft=null;}$('saveStatus').textContent='이 기기에 저장됐어요 · 공유 기기에서는 초안을 지워 주세요';$('saveStatus').dataset.error='false';}
   catch(_){$('saveStatus').textContent='자동 저장을 못 했어요. 화면을 닫기 전에 본문을 복사해 주세요.';$('saveStatus').dataset.error='true';}
 }
 function renderSaved(){const has=meaningful(savedDraft);$('savedDraftBanner').hidden=!has;if(has)$('savedDraftSummary').textContent=(savedDraft.to?savedDraft.to+'에게 쓰던 편지':'쓰던 편지')+' · '+D.segments(savedDraft.body).length+'자 · 이 기기에 저장';}
 function openDialog(id){const el=$(id);if(el.open)return;if(el.showModal)el.showModal();else el.setAttribute('open','');}
 function closeDialog(id){if($(id).close)$(id).close();else $(id).removeAttribute('open');}
 function resumeDraft(){if(!savedDraft)return;Object.assign(draft,cleanDraft(savedDraft));ownDraft=true;pendingNew=null;closeDialog('draftDialog');changingPaper=false;if(location.hash.startsWith('#l=')){incoming=null;preview=false;history.replaceState(null,'',location.pathname);}go('compose');}
 function requestNew(action,deleteOnly=false){
   if(meaningful(savedDraft)){pendingNew=action;$('draftDialogTitle').textContent=deleteOnly?'저장한 초안을 지울까요?':'쓰던 편지가 있어요';$('draftDialogCopy').textContent=deleteOnly?'이 기기에 저장한 초안이 지워져요. 이미 보낸 편지 링크는 그대로 열려요.':'쓰던 편지를 이어 쓰거나, 지우고 새 마음을 적을 수 있어요.';$('dialogDiscard').textContent=deleteOnly?'초안 지우기':'지우고 새 편지 쓰기';openDialog('draftDialog');}else action();
 }
 function startWriting(){
   if(ownDraft){changingPaper=false;go('compose');return;}
   requestNew(()=>{ownDraft=true;draft.occasion=({생일:'bday',기념일:'day',고마워:'thanks',미안해:'sorry',응원:'cheer'})[occasion]||'plain';changingPaper=false;go('compose');});
 }
 $('resumeDraft').onclick=resumeDraft;$('dialogResume').onclick=resumeDraft;$('dialogCancel').onclick=()=>{pendingNew=null;closeDialog('draftDialog');};
 $('dialogDiscard').onclick=()=>{try{localStorage.removeItem(STORAGE_KEY);}catch(_){toast('초안을 지우지 못했어요. 브라우저 저장 설정을 확인해 주세요.');return;}savedDraft=null;ownDraft=false;const action=pendingNew;pendingNew=null;closeDialog('draftDialog');if(action)action();};
 $('deleteDraft').onclick=()=>requestNew(()=>{Object.assign(draft,{body:'',to:'',from:'',stickers:[],seal:'heart',color:''});ownDraft=false;renderSaved();toast('이 기기의 초안을 지웠어요.');},true);
 $('quickWrite').onclick=startWriting;
 function selectTemplate(t){draft.template=t.id;draft.font=t.font;draft.size=t.size;draft.color='';saveDraft();}
 function renderFavorite(){const yes=favorites.includes(draft.template);$('favoriteTemplate').setAttribute('aria-pressed',String(yes));$('favoriteTemplate').textContent=yes?'♥ 찜한 편지지':'♡ 이 편지지 찜하기';}
 $('favoriteTemplate').onclick=()=>{favorites=favorites.includes(draft.template)?favorites.filter(id=>id!==draft.template):[...favorites,draft.template];try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites));}catch(_){toast('찜 목록은 이번 방문 동안만 유지돼요.');}renderFavorite();};
 $('favoritesOnly').onclick=()=>{onlyFavorites=!onlyFavorites;season='';renderLibrary();};
 function seal(el,id){const target=el.querySelector('.heart-seal');if(!target)return;const img=document.createElement('img');img.src=D.stickerURL(id);img.alt='';target.replaceChildren(img);}
 function renderTools(){
   $('fontOptions').replaceChildren();Object.entries(D.fonts).forEach(([id,f])=>{const b=document.createElement('button');b.className='font-option';b.setAttribute('aria-pressed',String(draft.font===id));b.style.fontFamily=fonts[id];const name=document.createElement('small');name.textContent=f.name;const sample=document.createElement('span');sample.textContent='오늘도 네 생각이 났어.';b.append(name,sample);b.onclick=()=>{$('fontChoice').value=id;$('fontChoice').dispatchEvent(new Event('change'));};$('fontOptions').append(b);});
   $('colorOptions').replaceChildren();COLORS.forEach((c,i)=>{const b=document.createElement('button');b.className='color-option';b.style.setProperty('--swatch',c||template().ink);b.setAttribute('aria-label',['편지지 추천 색','먹색','말린 장미','짙은 파랑','숲색'][i]);b.setAttribute('aria-pressed',String(draft.color===c));b.onclick=()=>{draft.color=c;typography($('composePaper'),draft);saveDraft();renderTools();};$('colorOptions').append(b);});
   $('stickerOptions').replaceChildren();D.stickers.forEach(s=>{const b=document.createElement('button');b.className='sticker-option';b.setAttribute('aria-label',s.name);b.setAttribute('aria-pressed',String(draft.stickers.includes(s.id)));const img=document.createElement('img');img.src=D.stickerURL(s.id);img.alt='';b.append(img);b.onclick=()=>{if(draft.stickers.includes(s.id))draft.stickers=draft.stickers.filter(id=>id!==s.id);else if(draft.stickers.length<3)draft.stickers.push(s.id);else{toast('스티커는 3개까지 붙일 수 있어요. 붙인 스티커를 눌러 떼어 보세요.');return;}D.decorate($('composePaper'),draft.stickers);saveDraft();renderTools();};$('stickerOptions').append(b);});
   $('sealOptions').replaceChildren();['heart','flower','cat','bear','stamp','clover'].forEach(id=>{const b=document.createElement('button');b.setAttribute('aria-label',D.sticker(id).name+' 봉인');b.setAttribute('aria-pressed',String(draft.seal===id));const img=document.createElement('img');img.src=D.stickerURL(id);img.alt='';b.append(img);b.onclick=()=>{draft.seal=id;saveDraft();renderTools();};$('sealOptions').append(b);});
 }
 const EMOJI=['♡','♥','💌','💕','🥰','😊','🥹','😘','🫶','🤍','💛','💜','✨','🌷','🌸','🍀','🌙','⭐','☀️','🌈','🎂','🎉','🎁','🎈','👏','💪','☕','🐱','🐻','🐰'];
 function rememberSelection(){const el=$('letterBody');selection={start:el.selectionStart,end:el.selectionEnd};}
 ['select','keyup','click','blur','input'].forEach(event=>$('letterBody').addEventListener(event,rememberSelection));
 EMOJI.forEach(emoji=>{const b=document.createElement('button');b.textContent=emoji;b.setAttribute('aria-label',emoji+' 넣기');b.onclick=()=>{const el=$('letterBody');const start=Math.min(selection.start,el.value.length),end=Math.min(selection.end,el.value.length);const text=el.value.slice(0,start)+emoji+el.value.slice(end);if(D.segments(text).length>MAX_LETTER){toast('이모지를 넣으려면 글을 조금 줄여 주세요.');return;}el.value=text;el.focus();el.setSelectionRange(start+emoji.length,start+emoji.length);rememberSelection();syncDraft();};$('emojiOptions').append(b);});
 $('clearStickers').onclick=()=>{draft.stickers=[];D.decorate($('composePaper'),[]);saveDraft();renderTools();};
 function toast(msg){clearTimeout(toastTimer);$('toast').textContent=msg;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2800);}
 function show(next,{historyMode='push',focus=true}={}){
   clearTimeout(animationTimer);stopReveal();view=next;
   Object.keys(titles).forEach(id=>$(id).hidden=id!==next);
   $('pageTitle').textContent=titles[next];document.title=titles[next]+' — 같이놀자';
   $('steps').hidden=['reader','error'].includes(next);$('bottomNav').hidden=['compose','reader','send','error'].includes(next);
   const step=next==='compose'?1:next==='send'?2:0;
   [...$('steps').children].forEach((li,i)=>{if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
   if(historyMode!=='none')history[historyMode==='replace'?'replaceState':'pushState']({letterScreen:next},'',location.href);
   window.scrollTo(0,0);if(next==='compose')resizeBody();if(focus){const h=$(next).querySelector('.screen-heading');if(h)h.focus({preventScroll:true});}
 }
 function go(next,options){
   if(next==='library')renderLibrary();if(next==='detail')renderDetail();if(next==='compose')renderCompose();if(next==='send')renderSend();
   show(next,options);
 }
 function renderFilters(){
   $('occasionFilters').replaceChildren();['전체','그냥','생일','기념일','고마워','미안해','응원'].forEach(x=>{const b=document.createElement('button');b.className='chip';b.textContent=x;b.setAttribute('aria-pressed',String(occasion===x));b.onclick=()=>{occasion=x;renderLibrary();};$('occasionFilters').append(b);});
   $('seasonFilters').replaceChildren();['전체','심플','다이어리','캐릭터','로맨틱','축하','수채화'].forEach(x=>{const b=document.createElement('button');b.className='chip';b.textContent=x;b.setAttribute('aria-pressed',String(x==='전체'?!season:season===x));b.onclick=()=>{season=x==='전체'?'':x;renderLibrary();};$('seasonFilters').append(b);});
 }
 function renderLibrary(){
   renderSaved();renderFilters();$('occasionSummary').textContent=occasion==='전체'?'선택':occasion;$('favoritesOnly').setAttribute('aria-pressed',String(onlyFavorites));const visible=templates.filter(t=>(!season||t.style===season)&&(!onlyFavorites||favorites.includes(t.id)));
   $('templateCount').textContent=visible.length+'가지';$('empty').hidden=!!visible.length;$('viewTemplate').disabled=!visible.some(t=>t.id===draft.template);
   $('templateGrid').replaceChildren();
   visible.forEach(t=>{
     const b=document.createElement('button');b.className='template-card';paint(b,t);b.setAttribute('aria-pressed',String(t.id===draft.template));b.setAttribute('aria-label',t.name+' · '+t.tag);
     const art=document.createElement('div');art.className='paper-art';paint(art,t);typography(art,t);art.setAttribute('aria-hidden','true');const copy=document.createElement('div');copy.className='mini-copy';const to=document.createElement('small');to.textContent='TO. YOU';copy.append(to,document.createTextNode(t.style==='축하'?'네가 있어서,\n오늘이 더 특별해.':t.style==='캐릭터'?'밥은 잘 먹었어?\n그냥, 네 생각이 나서.':'별일은 없고,\n그냥 네 생각이 났어.'));art.append(copy);
     const caption=document.createElement('div');caption.className='template-caption';const name=document.createElement('strong');name.textContent=t.name;const tag=document.createElement('small');tag.textContent=t.tag;caption.append(name,tag);b.append(art,caption);
     b.onclick=()=>{selectTemplate(t);go('detail');};$('templateGrid').append(b);
   });
 }
 function setPreviewTab(envelope){clearTimeout(animationTimer);stopReveal();$('paperPreview').hidden=envelope;$('envelopePreview').hidden=!envelope;$('paperTab').setAttribute('aria-pressed',String(!envelope));$('envelopeTab').setAttribute('aria-pressed',String(envelope));$('sampleEnvelope').classList.remove('opening');}
 function renderDetail(){const t=template();$('detailTitle').textContent=t.name;$('detailLine').textContent=t.line;$('detailTags').replaceChildren();t.tag.split(' · ').forEach(x=>{const s=document.createElement('span');s.className='tag';s.textContent=x;$('detailTags').append(s);});paint($('samplePaper'),t);typography($('samplePaper'),{font:t.font,size:t.size});paint($('sampleEnvelope'),t);seal($('sampleEnvelope'),draft.seal);renderFavorite();setPreviewTab(false);}
 function animateEnvelope(el,done){if(el.classList.contains('opening'))return;el.classList.add('opening');const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;animationTimer=setTimeout(()=>{el.classList.remove('opening');done();},reduce?0:600);}
 $('viewTemplate').onclick=()=>go('detail');$('otherTemplate').onclick=()=>go('library');$('paperTab').onclick=()=>setPreviewTab(false);$('envelopeTab').onclick=()=>setPreviewTab(true);
 function openSamplePaper(){setPreviewTab(false);startReveal('sampleBody','skipSample');$('samplePaper').scrollIntoView({block:'start'});}
 $('sampleEnvelope').onclick=()=>animateEnvelope($('sampleEnvelope'),openSamplePaper);
 $('openSample').onclick=()=>{setPreviewTab(true);$('envelopePreview').scrollIntoView({block:'center'});animateEnvelope($('sampleEnvelope'),openSamplePaper);};
 $('resetFilters').onclick=()=>{occasion='전체';season='';onlyFavorites=false;renderLibrary();};
 $('useTemplate').onclick=startWriting;
 function renderCount(){
   const count=D.segments(draft.body).length,over=count>MAX_LETTER;
   $('letterCount').textContent=count+'/'+MAX_LETTER;
   $('letterRemaining').textContent=over?(count-MAX_LETTER)+'자 줄여주세요':count===MAX_LETTER?'450자를 모두 썼어요.':(MAX_LETTER-count)+'자 더 쓸 수 있어요.';
   $('letterMeter').classList.toggle('near-limit',count>=WARN_AT);
   $('letterMeter').classList.toggle('over-limit',over);
   $('letterBody').setAttribute('aria-invalid',String(over));
   $('packLetter').disabled=over;$('draftPreview').disabled=over;
   const message=over?'편지는 최대 450자까지 보낼 수 있어요. '+(count-MAX_LETTER)+'자를 줄여주세요.':count===MAX_LETTER?'최대 450자에 도달했어요. 봉투에 담아 보낼 수 있어요.':count>=WARN_AT?'한도까지 '+(MAX_LETTER-count)+'자 남았어요.':'';
   if($('letterLimitStatus').textContent!==message)$('letterLimitStatus').textContent=message;
 }
 function resizeBody(){if(view!=='compose')return;const el=$('letterBody');el.style.height='auto';el.style.height=Math.max(290,el.scrollHeight)+'px';}
 function syncDraft(){draft.to=$('recipient').value.slice(0,24);draft.from=$('sender').value.slice(0,24);draft.body=$('letterBody').value;renderCount();resizeBody();saveDraft();}
 ['recipient','sender','letterBody'].forEach(id=>$(id).addEventListener('input',syncDraft));
 function renderCompose(){paint($('composePaper'),template());typography($('composePaper'),draft);D.decorate($('composePaper'),draft.stickers);$('recipient').value=draft.to;$('sender').value=draft.from;$('letterBody').value=draft.body;selection={start:draft.body.length,end:draft.body.length};renderCount();$('fontChoice').value=draft.font;$('sizeChoice').value=draft.size;$('sizeValue').textContent=draft.size;$('occasionChoice').value=draft.occasion;$('anniversaryNumber').value=draft.number;renderOccasion();renderTools();saveDraft();}
 function renderOccasion(){const numbered=['day','year','wed'].includes(draft.occasion);$('numberLabel').hidden=!numbered;$('numberText').textContent=draft.occasion==='day'?'일수':'주년';renderSuggestions();}
 $('occasionChoice').onchange=e=>{draft.occasion=e.target.value;draft.number=draft.occasion==='day'?100:1;$('anniversaryNumber').value=draft.number;renderOccasion();saveDraft();};
 $('anniversaryNumber').onchange=e=>{draft.number=Math.max(1,Math.min(9999,parseInt(e.target.value,10)||1));e.target.value=draft.number;saveDraft();};
 function toggle(button,panel){$(panel).hidden=!$(panel).hidden;$(button).setAttribute('aria-expanded',String(!$(panel).hidden));}
 $('changePaper').onclick=()=>{syncDraft();changingPaper=true;occasion='전체';season='';onlyFavorites=false;go('library');};
 $('fontButton').onclick=()=>toggle('fontButton','fontPanel');$('sizeButton').onclick=()=>toggle('sizeButton','sizePanel');$('helpButton').onclick=()=>toggle('helpButton','helpPanel');
 $('stickerButton').onclick=()=>toggle('stickerButton','stickerPanel');$('emojiButton').onclick=()=>toggle('emojiButton','emojiPanel');
 $('fontChoice').onchange=e=>{draft.font=e.target.value;typography($('composePaper'),draft);resizeBody();if(document.fonts)document.fonts.ready.then(resizeBody);saveDraft();renderTools();};$('sizeChoice').oninput=e=>{draft.size=Number(e.target.value);$('sizeValue').textContent=draft.size;typography($('composePaper'),draft);resizeBody();saveDraft();};
 function renderSuggestions(){
   const generic=['별일은 없고, 그냥 네 생각이 났어.','말로는 쑥스러워서 이렇게 써.','오늘 꼭 고맙다고 말하고 싶었어.'];
   $('memoryQuestion').textContent=({bday:'지난 1년, 상대와 가장 많이 웃었던 날은 언제였나요?',thanks:'상대가 해 준 작은 일 중 아직 기억나는 것은?',sorry:'그때의 내 말 대신, 지금이라면 어떤 말을 건네고 싶나요?',cheer:'요즘 상대가 애쓰는 일과, 응원해 주고 싶은 점은?',day:'처음 만난 날, 가장 선명하게 떠오르는 장면은?',year:'함께한 시간 중 다시 돌아가 보고 싶은 하루는?',wed:'평범한 하루 속에서 고마움을 느낀 순간은?'})[draft.occasion]||'오늘 무엇을 하다가 상대가 떠올랐나요?';
   const lines=draft.occasion==='bday'?['생일 축하해. 오늘은 온전히 네 날이야.','네가 태어나줘서, 내 곁에 있어줘서 고마워.','오늘 하루는 좋은 일로 가득했으면 좋겠어.']:['day','year','wed'].includes(draft.occasion)?['함께한 날들이 어느새 이렇게 쌓였네.','너와 보낸 평범한 날들이 내겐 특별해.','앞으로도 우리, 좋은 기억 많이 만들자.']:generic;
   const themed=({thanks:['그때는 미처 말 못 했는데, 정말 고마웠어.','네가 해 준 작은 일들이 오래 마음에 남아.'],sorry:['그날 내 말이 계속 마음에 걸렸어.','네 마음을 조금 더 잘 듣고 싶어.'],cheer:['요즘 네가 얼마나 애쓰는지 알아.','오늘은 내가 네 편이라는 말부터 하고 싶었어.']})[draft.occasion]||lines;
   $('suggestions').replaceChildren();themed.forEach(s=>{const b=document.createElement('button');b.textContent=s;b.onclick=()=>{const add=(draft.body?'\n\n':'')+s;if(D.segments(draft.body+add).length>MAX_LETTER){toast('이 문장을 더하면 450자를 넘어요. 글을 조금 줄여주세요.');return;}draft.body+=add;$('letterBody').value=draft.body;syncDraft();toast('쓴 글 뒤에 문장을 더했어요.');$('letterBody').focus();$('letterBody').setSelectionRange(draft.body.length,draft.body.length);rememberSelection();};$('suggestions').append(b);});
 }
 function validDraft(){syncDraft();const count=D.segments(draft.body).length;if(count>MAX_LETTER){toast('450자까지 보낼 수 있어요. '+(count-MAX_LETTER)+'자를 줄여주세요.');$('letterBody').focus();return false;}if(!draft.body.trim()){toast('편지 내용을 먼저 써주세요.');$('letterBody').focus();return false;}if(draft.body.length>16000||encode(payload()).length+3>24000){toast('공유 링크에 담기에는 이모지 조합이 너무 길어요. 조금 줄여 주세요.');return false;}return true;}
 function dateText(){const d=new Date();return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;}
 function payload(){return {v:5,w:draft.body,n:draft.to.trim(),f:draft.from.trim(),d:dateText(),tpl:draft.template,font:draft.font,size:draft.size,k:({day:0,year:1,wed:2,bday:3,plain:4,thanks:4,sorry:4,cheer:4})[draft.occasion],num:draft.number,rel:0,st:draft.stickers,seal:draft.seal,color:draft.color};}
 function encode(p){const bytes=new TextEncoder().encode(JSON.stringify(p));let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function decode(hash){
   if(!/^#l=/.test(hash)||hash.length>24000)throw new Error('invalid link');let s=hash.slice(3).replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);const binary=atob(s);const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
   if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('invalid payload');
   if(p.w!=null){if(typeof p.w!=='string'||p.w.length>16000)throw new Error('invalid text');}
   else if(!Array.isArray(p.i)||p.i.length>32||p.i.some(x=>!Number.isInteger(x)||x<0))throw new Error('invalid legacy');
   ['n','f','d','m'].forEach(k=>{if(p[k]!=null&&typeof p[k]!=='string')throw new Error('invalid field');});
   if(p.v!=null&&(!Number.isInteger(p.v)||p.v<1||p.v>5))throw new Error('unsupported version');
   p.n=(p.n||'').slice(0,24);p.f=(p.f||'').slice(0,24);p.d=(p.d||'').slice(0,64);p.font=Object.hasOwn(fonts,p.font)?p.font:'sans';p.size=Number.isFinite(p.size)?Math.max(16,Math.min(26,p.size)):20;
   p.tpl=templates.some(t=>t.id===p.tpl)?p.tpl:'spring';p.st=Array.isArray(p.st)?[...new Set(p.st.filter(id=>D.sticker(id)))].slice(0,3):[];p.seal=D.sticker(p.seal)?p.seal:'heart';p.color=COLORS.includes(p.color)?p.color:'';p.num=Number.isInteger(p.num)?Math.max(1,Math.min(9999,p.num)):(p.k===0?100:1);
   return p;
 }
 function urlFor(p){const local=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='file:';const base=local?'https://noljago.co.kr/t/letter/':location.origin+location.pathname;return base+'#l='+encode(p);}
 function replyUrl(p){const local=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='file:',base=local?'https://noljago.co.kr/t/letter/':location.origin+location.pathname,u=new URL(base);u.searchParams.set('reply','1');u.searchParams.set('template',template(p&&p.tpl).id);if(p&&p.f)u.searchParams.set('to',p.f.slice(0,24));if(p&&p.n)u.searchParams.set('from',p.n.slice(0,24));return u.href;}
 function externalUrl(target){const ua=navigator.userAgent||'';if(/Android/i.test(ua)){const u=new URL(target);return 'intent://'+u.host+u.pathname+u.search+'#Intent;scheme='+u.protocol.slice(0,-1)+';package=com.android.chrome;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url='+encodeURIComponent(target)+';end';}return 'kakaotalk://web/openExternal?url='+encodeURIComponent(target);}
 function beginReplyHere(p,body=''){requestNew(()=>{const t=template(p&&p.tpl);Object.assign(draft,{to:p&&p.f||'',from:p&&p.n||'',body,template:t.id,font:t.font,size:t.size,stickers:[],seal:'heart',color:'',occasion:'plain'});ownDraft=true;incoming=null;preview=false;history.replaceState(null,'',location.pathname);go('compose',{historyMode:'replace'});});}
 function beginReply(e){const letter=incoming;if(!letter){e.preventDefault();return;}if(/KAKAOTALK/i.test(navigator.userAgent||''))return;e.preventDefault();beginReplyHere(letter);}
 function renderSend(){paint($('packedEnvelope'),template());seal($('packedEnvelope'),draft.seal);$('packedName').textContent=draft.to?draft.to+'에게':'너에게';madeUrl=urlFor(payload());$('shareLink').value=madeUrl;$('shareLink').hidden=true;}
 $('packLetter').onclick=()=>{if(validDraft())go('send');};$('editLetter').onclick=()=>go('compose');
 function read(p,isPreview){
   stopReveal();incoming=p;preview=isPreview;$('returnPreview').hidden=!isPreview;$('replyLetter').hidden=isPreview;
   $('replyLetter').href=/KAKAOTALK/i.test(navigator.userAgent||'')?externalUrl(replyUrl(p)):'./';
   const t=template(p.tpl);paint($('readPaper'),t);paint($('readerEnvelope'),t);seal($('readerEnvelope'),p.seal||'heart');typography($('readPaper'),{font:Object.hasOwn(fonts,p.font)?p.font:'sans',size:Number.isFinite(p.size)?Math.max(16,Math.min(26,p.size)):19,color:p.color});D.decorate($('readPaper'),p.st||[]);$('quickReplies').hidden=isPreview;
   $('readerTitle').textContent=p.n?p.n+'에게, 편지가 도착했어요.':'편지가 도착했어요.';$('readerLead').textContent=p.f?p.f+'님이 전하고 싶은 마음이 있어요.':'당신에게 전하고 싶은 마음이 있어요.';
   $('readTo').textContent=p.n?'To. '+p.n:'너에게';$('readFrom').textContent=p.f?'From. '+p.f:'';const occasionLabel=p.k===0?(p.num||100)+'일':p.k===1?(p.num||1)+'주년':p.k===2?'결혼기념일':p.k===3?'생일':'';$('readDate').textContent=[p.d,occasionLabel].filter(Boolean).join(' · ');$('readerEnvelopeName').textContent=p.n||'너에게';
   $('readBody').textContent=p.w!=null?p.w:window.LegacyLetter.linesOf(p).join('\n');$('readerEnvelopeStage').hidden=false;$('openedLetter').hidden=true;$('readerEnvelope').classList.remove('opening');
 }
 function previewDraft(){if(!validDraft())return;returnFromPreview=view;read(payload(),true);show('reader');}
 $('draftPreview').onclick=previewDraft;$('packedEnvelope').onclick=()=>{returnFromPreview='send';read(payload(),true);show('reader');};
 $('readerEnvelope').onclick=()=>animateEnvelope($('readerEnvelope'),()=>{$('readerEnvelopeStage').hidden=true;$('openedLetter').hidden=false;startReveal('readBody','skipRead');$('readPaper').scrollIntoView({block:'start'});});
 $('returnPreview').onclick=()=>go(returnFromPreview);
 $('replyLetter').onclick=beginReply;
 async function copyLink(){
   if(!madeUrl)madeUrl=urlFor(payload());let success=false;try{await navigator.clipboard.writeText(madeUrl);success=true;}catch(e){$('shareLink').hidden=false;$('shareLink').value=madeUrl;$('shareLink').focus();$('shareLink').select();try{success=document.execCommand('copy');}catch(err){}}
   toast(success?'링크를 복사했어요. 카톡에 붙여넣어주세요.':'아래 링크를 길게 눌러 복사해주세요.');
 }
 $('copyLetter').onclick=copyLink;
 // Third-party sharing code is loaded only after an explicit share action. No analytics on letters.
 function loadShare(){if(window.kakaoShare)return Promise.resolve();if(sdkPromise)return sdkPromise;sdkPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='../../assets/kakao-share.js?v=20260913-letter';s.onload=resolve;s.onerror=()=>{sdkPromise=null;s.remove();reject(new Error('share unavailable'));};document.head.append(s);});return sdkPromise;}
 function canUseMobileShare(){const ua=navigator.userAgent||'';return /Android|iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);}
 async function nativeShare(url){if(!canUseMobileShare()||typeof navigator.share!=='function')return false;try{await navigator.share({url});return true;}catch(e){return !!(e&&e.name==='AbortError');}}
 async function shareFallback(url){if(!await nativeShare(url))await copyLink();}
 async function sendLetter(textOnly=false){
   const buttons=[$('kakaoSend'),$('kakaoSendText')];buttons.forEach(b=>b.disabled=true);
   try{const url=madeUrl||urlFor(payload());await loadShare();await window.kakaoShare({url,textOnly,btn:'편지 열어보기',img:'https://noljago.co.kr/assets/share-cards/letter-'+template().id+'.png?v=20260913-studio',title:'너에게 편지가 도착했어요',desc:template().name+'에 담은 마음. 봉투를 눌러 읽어보세요.'},()=>shareFallback(url));}
   catch(e){await copyLink();}finally{buttons.forEach(b=>b.disabled=false);}
 }
 $('kakaoSend').onclick=()=>sendLetter();
 $('kakaoSendText').onclick=()=>sendLetter(true);
 $('quickReplies').querySelectorAll('[data-reply]').forEach(b=>{b.onclick=()=>{
   if(!incoming||preview)return;
   if(/KAKAOTALK/i.test(navigator.userAgent||'')){const u=new URL(replyUrl(incoming));u.searchParams.set('quick',String([...$('quickReplies').children].indexOf(b)));location.href=externalUrl(u.href);return;}
   beginReplyHere(incoming,b.dataset.reply);
 };});
 $('copyLetterText').onclick=async()=>{const text=$('readBody').textContent;try{await navigator.clipboard.writeText(text);toast('편지 본문을 복사했어요.');}catch(_){const range=document.createRange();range.selectNodeContents($('readBody'));const selected=window.getSelection();selected.removeAllRanges();selected.addRange(range);toast('편지 본문을 선택했어요. 길게 눌러 복사해 주세요.');}};
 async function renderExportPage(index){
   if(exportBusy)return;exportBusy=true;
   ['previousExport','nextExport','shareImage'].forEach(id=>$(id).disabled=true);$('downloadImage').hidden=true;
   try{const blob=await exportSession.page(index);if(exportURL)URL.revokeObjectURL(exportURL);exportIndex=index;exportBlob=blob;exportURL=URL.createObjectURL(blob);$('exportPreview').src=exportURL;$('downloadImage').href=exportURL;$('downloadImage').download=exportSession.count>1?'마음한장-'+(index+1)+'.png':'마음한장.png';$('downloadImage').hidden=false;$('exportPages').hidden=exportSession.count===1;$('exportPageNumber').textContent=(index+1)+' / '+exportSession.count;$('shareImage').hidden=!(typeof File==='function'&&navigator.canShare&&navigator.canShare({files:[new File([blob],'마음한장.png',{type:'image/png'})]}));}
   finally{exportBusy=false;$('previousExport').disabled=index===0;$('nextExport').disabled=index===exportSession.count-1;$('shareImage').disabled=false;}
 }
 async function exportLetter(p){
   if(exportBusy)return;
   const buttons=[$('saveLetterImage'),$('saveSentImage')];buttons.forEach(b=>b.disabled=true);$('exportStatus').textContent='글꼴과 그림을 담아 이미지를 준비하고 있어요.';
   try{exportSession=await window.LetterExport.prepare({...p,w:p.w!=null?p.w:window.LegacyLetter.linesOf(p).join('\n')},template(p.tpl));await renderExportPage(0);openDialog('exportDialog');$('exportStatus').textContent=exportSession.count>1?'편지 전체를 '+exportSession.count+'장에 나누어 담았어요.':'';}
   catch(e){toast(e.message||'이미지 저장을 준비하지 못했어요. 다시 시도해 주세요.');$('exportStatus').textContent='이미지를 준비하지 못했어요. 본문 복사도 이용할 수 있어요.';}
   finally{buttons.forEach(b=>b.disabled=false);}
 }
 $('saveLetterImage').onclick=()=>{if(incoming)exportLetter(incoming);};$('saveSentImage').onclick=()=>exportLetter(payload());
 $('previousExport').onclick=()=>renderExportPage(exportIndex-1).catch(()=>toast('이전 장을 준비하지 못했어요. 다시 눌러 주세요.'));
 $('nextExport').onclick=()=>renderExportPage(exportIndex+1).catch(()=>toast('다음 장을 준비하지 못했어요. 다시 눌러 주세요.'));
 $('closeExport').onclick=()=>closeDialog('exportDialog');
 $('exportDialog').addEventListener('close',()=>{if(exportURL){URL.revokeObjectURL(exportURL);exportURL='';}$('exportPreview').removeAttribute('src');exportBlob=null;});
 $('shareImage').onclick=async()=>{if(!exportBlob)return;try{await navigator.share({files:[new File([exportBlob],$('downloadImage').download,{type:'image/png'})]});}catch(e){if(e.name!=='AbortError')toast('이미지 다운로드 또는 길게 눌러 저장을 이용해 주세요.');}};
 window.addEventListener('pagehide',()=>{if(ownDraft)saveDraft();});
 window.addEventListener('resize',resizeBody);
 if(document.fonts)document.fonts.ready.then(resizeBody);
 window.addEventListener('beforeunload',e=>{if(ownDraft&&meaningful(draft)&&$('saveStatus').dataset.error==='true'){e.preventDefault();e.returnValue='';}});
 // A received link never restores or overwrites a sender's local draft.
 if(replyMode){const t=template();draft.font=t.font;draft.size=t.size;const q=params.get('quick');if(['0','1','2'].includes(q))draft.body=$('quickReplies').children[Number(q)].dataset.reply;}
 function back(){if(view==='library'){if(changingPaper){changingPaper=false;go('compose');}else location.href='../../';}else if(view==='detail')go('library');else if(view==='compose')go('detail');else if(view==='send')go('compose');else if(view==='reader'&&preview)go(returnFromPreview);else location.href='../../';}
 $('back').onclick=back;$('letterNav').onclick=e=>{e.preventDefault();if(view==='compose')syncDraft();go('library');};
 window.addEventListener('popstate',e=>{const next=e.state&&e.state.letterScreen;if(next&&titles[next])go(next,{historyMode:'none'});else go('library',{historyMode:'replace'});});
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#l='))openIncoming(location.hash);});
 function openIncoming(hash){try{read(decode(hash),false);show('reader',{historyMode:'replace',focus:false});}catch(e){show('error',{historyMode:'replace',focus:false});}}
 if(initialHash.startsWith('#l='))openIncoming(initialHash);else{renderLibrary();if(params.get('view')==='preview')go('detail',{historyMode:'replace',focus:false});else go('library',{historyMode:'replace',focus:false});}
})();
