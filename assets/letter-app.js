(function(){
 'use strict';
 const $=id=>document.getElementById(id),templates=window.LETTER_TEMPLATES;
 const params=new URLSearchParams(location.search),initialHash=location.hash;
 const MAX_LETTER=450,WARN_AT=430;
 const occasionMap={birthday:'생일',anniversary:'기념일',plain:'그냥',thanks:'고마워'};
 const fonts={sans:"'Malgun Gothic',system-ui,sans-serif",serif:"'Batang','Noto Serif KR',serif",hand:"'Gatchi Hand','Malgun Gothic',sans-serif"};
 const replyMode=params.get('reply')==='1',queryText=key=>(params.get(key)||'').slice(0,24);
 const draft={template:templates.some(t=>t.id===params.get('template'))?params.get('template'):'spring',to:replyMode?queryText('to'):'',from:replyMode?queryText('from'):'',body:'',font:'hand',size:22,occasion:'plain',number:100};
 let view='library',occasion=occasionMap[params.get('occasion')]||'전체',season='',returnFromPreview='compose',preview=false,incoming=null,changingPaper=false,toastTimer,animationTimer,madeUrl='',sdkPromise;
 let activeReveal;
 function stopReveal(){if(activeReveal){activeReveal.finish();activeReveal=null;}}
 function startReveal(body,button){stopReveal();activeReveal=window.revealLetter($(body),$(button));}
 const titles={library:'편지지 고르기',detail:'편지지 미리보기',compose:'마음 쓰기',send:'편지 보내기',reader:'도착한 편지',error:'편지 확인'};
 const template=id=>templates.find(t=>t.id===(id||draft.template))||templates[0];
 function paint(el,t){el.style.setProperty('--px',t.x+'%');el.style.setProperty('--py',t.y+'%');el.style.setProperty('--tint',t.color);}
 function typography(el,p){el.style.setProperty('--letter-font',fonts[p.font]||fonts.sans);el.style.setProperty('--letter-size',(p.size||19)+'px');}
 function toast(msg){clearTimeout(toastTimer);$('toast').textContent=msg;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2800);}
 function show(next,{historyMode='push',focus=true}={}){
   clearTimeout(animationTimer);stopReveal();view=next;
   Object.keys(titles).forEach(id=>$(id).hidden=id!==next);
   $('pageTitle').textContent=titles[next];document.title=titles[next]+' — 같이놀자';
   $('steps').hidden=['reader','error'].includes(next);$('bottomNav').hidden=['reader','send','error'].includes(next);
   const step=next==='compose'?1:next==='send'?2:0;
   [...$('steps').children].forEach((li,i)=>{if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
   if(historyMode!=='none')history[historyMode==='replace'?'replaceState':'pushState']({letterScreen:next},'',location.href);
   window.scrollTo(0,0);if(focus){const h=$(next).querySelector('.screen-heading');if(h)h.focus({preventScroll:true});}
 }
 function go(next,options){
   if(next==='library')renderLibrary();if(next==='detail')renderDetail();if(next==='compose')renderCompose();if(next==='send')renderSend();
   show(next,options);
 }
 function renderFilters(){
   $('occasionFilters').replaceChildren();['전체','생일','기념일','고마워','그냥'].forEach(x=>{const b=document.createElement('button');b.className='chip';b.textContent=x;b.setAttribute('aria-pressed',String(occasion===x));b.onclick=()=>{occasion=x;renderLibrary();};$('occasionFilters').append(b);});
   $('seasonFilters').replaceChildren();['봄','여름','가을','겨울'].forEach(x=>{const b=document.createElement('button');b.className='chip';b.textContent=x;b.setAttribute('aria-pressed',String(season===x));b.onclick=()=>{season=season===x?'':x;renderLibrary();};$('seasonFilters').append(b);});
 }
 function renderLibrary(){
   renderFilters();const visible=templates.filter(t=>(occasion==='전체'||t.occasions.includes(occasion))&&(!season||t.season===season));
   if(visible.length&&!visible.some(t=>t.id===draft.template))draft.template=visible[0].id;
   $('templateCount').textContent=visible.length+'가지';$('empty').hidden=!!visible.length;$('viewTemplate').disabled=!visible.length;
   $('templateGrid').replaceChildren();
   visible.forEach(t=>{
     const b=document.createElement('button');b.className='template-card';paint(b,t);b.setAttribute('aria-pressed',String(t.id===draft.template));b.setAttribute('aria-label',t.name+' · '+t.tag);
     const art=document.createElement('div');art.className='paper-art';paint(art,t);art.setAttribute('aria-hidden','true');
     const caption=document.createElement('div');caption.className='template-caption';const name=document.createElement('strong');name.textContent=t.name;const tag=document.createElement('small');tag.textContent=t.tag;caption.append(name,tag);b.append(art,caption);
     b.onclick=()=>{draft.template=t.id;madeUrl='';[...$('templateGrid').children].forEach(el=>el.setAttribute('aria-pressed',String(el===b)));};$('templateGrid').append(b);
   });
 }
 function setPreviewTab(envelope){clearTimeout(animationTimer);stopReveal();$('paperPreview').hidden=envelope;$('envelopePreview').hidden=!envelope;$('paperTab').setAttribute('aria-pressed',String(!envelope));$('envelopeTab').setAttribute('aria-pressed',String(envelope));$('sampleEnvelope').classList.remove('opening');}
 function renderDetail(){const t=template();$('detailTitle').textContent=t.name;$('detailLine').textContent=t.line;$('detailTags').replaceChildren();t.tag.split(' · ').forEach(x=>{const s=document.createElement('span');s.className='tag';s.textContent=x;$('detailTags').append(s);});paint($('samplePaper'),t);paint($('sampleEnvelope'),t);setPreviewTab(false);}
 function animateEnvelope(el,done){if(el.classList.contains('opening'))return;el.classList.add('opening');const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;animationTimer=setTimeout(()=>{el.classList.remove('opening');done();},reduce?0:600);}
 $('viewTemplate').onclick=()=>go('detail');$('otherTemplate').onclick=()=>go('library');$('paperTab').onclick=()=>setPreviewTab(false);$('envelopeTab').onclick=()=>setPreviewTab(true);
 function openSamplePaper(){setPreviewTab(false);startReveal('sampleBody','skipSample');$('samplePaper').scrollIntoView({block:'start'});}
 $('sampleEnvelope').onclick=()=>animateEnvelope($('sampleEnvelope'),openSamplePaper);
 $('openSample').onclick=()=>{setPreviewTab(true);$('envelopePreview').scrollIntoView({block:'center'});animateEnvelope($('sampleEnvelope'),openSamplePaper);};
 $('resetFilters').onclick=()=>{occasion='전체';season='';renderLibrary();};
 $('useTemplate').onclick=()=>{if(!changingPaper&&!draft.body){draft.occasion=occasion==='생일'?'bday':occasion==='기념일'?'day':occasion==='고마워'?'thanks':'plain';}changingPaper=false;go('compose');};
 function renderCount(){
   const count=draft.body.length,over=count>MAX_LETTER;
   $('letterCount').textContent=count+'/'+MAX_LETTER;
   $('letterRemaining').textContent=over?(count-MAX_LETTER)+'자 줄여주세요':count===MAX_LETTER?'450자를 모두 썼어요.':(MAX_LETTER-count)+'자 더 쓸 수 있어요.';
   $('letterMeter').classList.toggle('near-limit',count>=WARN_AT);
   $('letterMeter').classList.toggle('over-limit',over);
   $('letterBody').setAttribute('aria-invalid',String(over));
   $('packLetter').disabled=over;$('draftPreview').disabled=over;
   const message=over?'편지는 최대 450자까지 보낼 수 있어요. '+(count-MAX_LETTER)+'자를 줄여주세요.':count===MAX_LETTER?'최대 450자에 도달했어요. 봉투에 담아 보낼 수 있어요.':count>=WARN_AT?'한도까지 '+(MAX_LETTER-count)+'자 남았어요.':'';
   if($('letterLimitStatus').textContent!==message)$('letterLimitStatus').textContent=message;
 }
 function syncDraft(){draft.to=$('recipient').value.slice(0,24);draft.from=$('sender').value.slice(0,24);draft.body=$('letterBody').value;renderCount();madeUrl='';}
 ['recipient','sender','letterBody'].forEach(id=>$(id).addEventListener('input',syncDraft));
 function renderCompose(){paint($('composePaper'),template());typography($('composePaper'),draft);$('recipient').value=draft.to;$('sender').value=draft.from;$('letterBody').value=draft.body;renderCount();$('fontChoice').value=draft.font;$('sizeChoice').value=draft.size;$('sizeValue').textContent=draft.size;$('occasionChoice').value=draft.occasion;$('anniversaryNumber').value=draft.number;renderOccasion();}
 function renderOccasion(){const numbered=['day','year','wed'].includes(draft.occasion);$('numberLabel').hidden=!numbered;$('numberText').textContent=draft.occasion==='day'?'일수':'주년';renderSuggestions();}
 $('occasionChoice').onchange=e=>{draft.occasion=e.target.value;draft.number=draft.occasion==='day'?100:1;$('anniversaryNumber').value=draft.number;renderOccasion();madeUrl='';};
 $('anniversaryNumber').onchange=e=>{draft.number=Math.max(1,Math.min(9999,parseInt(e.target.value,10)||1));e.target.value=draft.number;madeUrl='';};
 function toggle(button,panel){$(panel).hidden=!$(panel).hidden;$(button).setAttribute('aria-expanded',String(!$(panel).hidden));}
 $('changePaper').onclick=()=>{syncDraft();changingPaper=true;occasion='전체';season='';go('library');};
 $('fontButton').onclick=()=>toggle('fontButton','fontPanel');$('sizeButton').onclick=()=>toggle('sizeButton','sizePanel');$('helpButton').onclick=()=>toggle('helpButton','helpPanel');
 $('fontChoice').onchange=e=>{draft.font=e.target.value;typography($('composePaper'),draft);madeUrl='';};$('sizeChoice').oninput=e=>{draft.size=Number(e.target.value);$('sizeValue').textContent=draft.size;typography($('composePaper'),draft);madeUrl='';};
 function renderSuggestions(){
   const generic=['별일은 없고, 그냥 네 생각이 났어.','말로는 쑥스러워서 이렇게 써.','오늘 꼭 고맙다고 말하고 싶었어.'];
   const lines=draft.occasion==='bday'?['생일 축하해. 오늘은 온전히 네 날이야.','네가 태어나줘서, 내 곁에 있어줘서 고마워.','오늘 하루는 좋은 일로 가득했으면 좋겠어.']:['day','year','wed'].includes(draft.occasion)?['함께한 날들이 어느새 이렇게 쌓였네.','너와 보낸 평범한 날들이 내겐 특별해.','앞으로도 우리, 좋은 기억 많이 만들자.']:generic;
   $('suggestions').replaceChildren();lines.forEach(s=>{const b=document.createElement('button');b.textContent=s;b.onclick=()=>{const add=(draft.body?'\n\n':'')+s;if(draft.body.length+add.length>MAX_LETTER){toast('이 문장을 더하면 450자를 넘어요. 글을 조금 줄여주세요.');return;}draft.body+=add;$('letterBody').value=draft.body;syncDraft();toast('쓴 글 뒤에 문장을 더했어요.');$('letterBody').focus();};$('suggestions').append(b);});
 }
 function validDraft(){syncDraft();if(draft.body.length>MAX_LETTER){toast('450자까지 보낼 수 있어요. '+(draft.body.length-MAX_LETTER)+'자를 줄여주세요.');$('letterBody').focus();return false;}if(!draft.body.trim()){toast('편지 내용을 먼저 써주세요.');$('letterBody').focus();return false;}return true;}
 function dateText(){const d=new Date();return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;}
 function payload(){return {v:4,w:draft.body,n:draft.to.trim(),f:draft.from.trim(),d:dateText(),tpl:draft.template,font:draft.font,size:draft.size,k:({day:0,year:1,wed:2,bday:3,plain:4,thanks:4})[draft.occasion],num:draft.number,rel:0};}
 function encode(p){const bytes=new TextEncoder().encode(JSON.stringify(p));let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function decode(hash){
   if(!/^#l=/.test(hash)||hash.length>24000)throw new Error('invalid link');let s=hash.slice(3).replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);const binary=atob(s);const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
   if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('invalid payload');
   if(p.w!=null){if(typeof p.w!=='string'||p.w.length>4000)throw new Error('invalid text');}
   else if(!Array.isArray(p.i)||p.i.length>32||p.i.some(x=>!Number.isInteger(x)||x<0))throw new Error('invalid legacy');
   ['n','f','d','m'].forEach(k=>{if(p[k]!=null&&typeof p[k]!=='string')throw new Error('invalid field');});
   if(p.v!=null&&(!Number.isInteger(p.v)||p.v<1||p.v>4))throw new Error('unsupported version');
   return p;
 }
 function urlFor(p){const local=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='file:';const base=local?'https://bingari69-jpg.github.io/couple-test/t/letter/':location.origin+location.pathname;return base+'#l='+encode(p);}
 function replyUrl(p){const local=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.protocol==='file:',base=local?'https://bingari69-jpg.github.io/couple-test/t/letter/':location.origin+location.pathname,u=new URL(base);u.searchParams.set('reply','1');u.searchParams.set('template',template(p&&p.tpl).id);if(p&&p.f)u.searchParams.set('to',p.f.slice(0,24));if(p&&p.n)u.searchParams.set('from',p.n.slice(0,24));return u.href;}
 function externalUrl(target){const ua=navigator.userAgent||'';if(/Android/i.test(ua)){const u=new URL(target);return 'intent://'+u.host+u.pathname+u.search+'#Intent;scheme='+u.protocol.slice(0,-1)+';package=com.android.chrome;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url='+encodeURIComponent(target)+';end';}return 'kakaotalk://web/openExternal?url='+encodeURIComponent(target);}
 function beginReplyHere(p){draft.to=p&&p.f||'';draft.from=p&&p.n||'';draft.body='';draft.template=template(p&&p.tpl).id;incoming=null;preview=false;history.replaceState(null,'',location.pathname);go('library',{historyMode:'replace'});}
 function beginReply(e){const letter=incoming;if(!letter){e.preventDefault();return;}if(/KAKAOTALK/i.test(navigator.userAgent||''))return;e.preventDefault();beginReplyHere(letter);}
 function renderSend(){paint($('packedEnvelope'),template());$('packedName').textContent=draft.to?draft.to+'에게':'너에게';madeUrl=urlFor(payload());$('shareLink').value=madeUrl;$('shareLink').hidden=true;}
 $('packLetter').onclick=()=>{if(validDraft())go('send');};$('editLetter').onclick=()=>go('compose');
 function read(p,isPreview){
   stopReveal();incoming=p;preview=isPreview;$('returnPreview').hidden=!isPreview;$('replyLetter').hidden=isPreview;
   $('replyLetter').href=/KAKAOTALK/i.test(navigator.userAgent||'')?externalUrl(replyUrl(p)):'./';
   const t=template(p.tpl);paint($('readPaper'),t);paint($('readerEnvelope'),t);typography($('readPaper'),{font:fonts[p.font]?p.font:'sans',size:Number.isFinite(p.size)?Math.max(16,Math.min(26,p.size)):19});
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
 function loadShare(){if(window.kakaoShare)return Promise.resolve();if(sdkPromise)return sdkPromise;sdkPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='../../assets/kakao-share.js?v=20260910-mobile-letter-link';s.onload=resolve;s.onerror=()=>{sdkPromise=null;s.remove();reject(new Error('share unavailable'));};document.head.append(s);});return sdkPromise;}
 async function nativeShare(url){if(typeof navigator.share!=='function')return false;try{await navigator.share({title:'너에게 편지가 도착했어요',text:'봉투를 눌러 마음을 읽어보세요.',url});return true;}catch(e){return !!(e&&e.name==='AbortError');}}
 async function shareFallback(url){if(!await nativeShare(url))await copyLink();}
 async function sendLetter(textOnly=false){
   const buttons=[$('kakaoSend'),$('kakaoSendText')];buttons.forEach(b=>b.disabled=true);
   try{const url=madeUrl||urlFor(payload());await loadShare();await window.kakaoShare({url,textOnly,btn:'편지 열어보기',img:'https://bingari69-jpg.github.io/couple-test/og/og-letter-sq.png',title:'너에게 편지가 도착했어요',desc:'봉투를 눌러 마음을 읽어보세요.'},()=>shareFallback(url));}
   catch(e){await copyLink();}finally{buttons.forEach(b=>b.disabled=false);}
 }
 $('kakaoSend').onclick=()=>sendLetter();
 $('kakaoSendText').onclick=()=>sendLetter(true);
 function back(){if(view==='library'){if(changingPaper){changingPaper=false;go('compose');}else location.href='../../';}else if(view==='detail')go('library');else if(view==='compose')go('detail');else if(view==='send')go('compose');else if(view==='reader'&&preview)go(returnFromPreview);else location.href='../../';}
 $('back').onclick=back;$('letterNav').onclick=e=>{e.preventDefault();if(view==='compose')syncDraft();go('library');};
 window.addEventListener('popstate',e=>{const next=e.state&&e.state.letterScreen;if(next&&titles[next])go(next,{historyMode:'none'});else go('library',{historyMode:'replace'});});
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#l='))openIncoming(location.hash);});
 function openIncoming(hash){try{read(decode(hash),false);show('reader',{historyMode:'replace',focus:false});}catch(e){show('error',{historyMode:'replace',focus:false});}}
 if(initialHash.startsWith('#l='))openIncoming(initialHash);else{renderLibrary();if(params.get('view')==='preview')go('detail',{historyMode:'replace',focus:false});else go('library',{historyMode:'replace',focus:false});}
})();
