(function(){
 'use strict';const $=id=>document.getElementById(id),deck=window.TAROT_DECK;
 const topics=['지금 우리 사이','더 가까워지려면?','서로에게 필요한 것'];
 let topic=0,invitation=null,result=null,mode='make',shareHash='',pending=false;
 const encode=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const name=(n,fallback)=>Array.from(String(n||'').replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,12).join('')||fallback;
 const validName=n=>typeof n==='string'&&Array.from(n).length<=12;
 const choice=i=>Number.isInteger(i)&&i>=0&&i<3;
 const validInvite=c=>c&&c.v===1&&typeof c.id==='string'&&/^[a-f0-9]{16}$/.test(c.id)&&choice(c.t)&&choice(c.i)&&validName(c.n)&&Array.isArray(c.d)&&c.d.length===22&&new Set(c.d).size===22&&c.d.every(i=>Number.isInteger(i)&&i>=0&&i<22);
 const validResult=r=>r&&validInvite(r.c)&&validName(r.n)&&choice(r.i);
 const read=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch(e){return null;}};
 const save=(k,v)=>{try{sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}};
 function random(limit){const a=new Uint32Array(1);const ceiling=Math.floor(4294967296/limit)*limit;do{crypto.getRandomValues(a);}while(a[0]>=ceiling);return a[0]%limit;}
 function shuffled(){const a=Array.from({length:22},(_,i)=>i);for(let i=21;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function show(id){document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id);$('shareControls').hidden=!['sealed','outcome'].includes(id);$('manualCopy').hidden=true;$('shareStatus').textContent='';window.scrollTo(0,0);}
 function topicsUI(){document.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.topic)===topic)));}
 document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{topic=Number(b.dataset.topic);topicsUI();});
 function draw(){pending=false;document.querySelectorAll('[data-pick]').forEach(b=>{b.disabled=false;b.classList.remove('turning');});$('drawTopic').textContent=topics[topic];$('drawTitle').textContent=mode==='make'?'내 마음을 담아, 한 장.':'네 마음도 담아, 한 장.';$('drawHint').textContent=mode==='make'?'고른 카드는 봉인돼. 친구도 뽑으면 함께 열려.':'너도 고르면 두 사람의 카드와 조언 카드가 함께 열려.';show('draw');}
 function sealed(){result=null;shareHash='#c='+encode(invitation);$('sealedTopic').textContent=topics[invitation.t];$('sealedName').textContent=invitation.n+'님의 카드';$('sharePsy').textContent='카톡으로 봉인 보내기';$('copyPsy').textContent='봉인 링크 복사';show('sealed');}
 function card(id,role,n){const d=deck[id],article=document.createElement('article');article.className='tarot-reading';const label=document.createElement('p');label.className='reading-role';label.textContent=role;const face=document.createElement('div');face.className='tarot-face';face.setAttribute('role','img');face.setAttribute('aria-label',d[0]+' 카드');const number=document.createElement('span');number.className='arcana-number';number.textContent=d[1];const symbol=document.createElement('span');symbol.className='arcana-symbol';symbol.textContent=d[2];symbol.setAttribute('aria-hidden','true');const title=document.createElement('h2');title.textContent=d[0];face.append(number,symbol,title);const who=document.createElement('h3');who.textContent=n;const key=document.createElement('span');key.className='eyebrow';key.textContent=d[3];const text=document.createElement('p');text.className='reading-copy';text.textContent=d[4];article.append(label,face,who,key,text);return article;}
 function reveal(){
  const c=result.c,a=c.d[c.i],remaining=c.d.filter(id=>id!==a),b=remaining[result.i],together=remaining[3];
  $('readings').replaceChildren(card(a,'첫 번째 · 내가 담은 마음',c.n+'님의 카드'),card(b,'두 번째 · 네가 담은 마음',result.n+'님의 카드'),card(together,'세 번째 · 우리를 위한 조언','함께 읽는 카드'));
  $('resultTopic').textContent=topics[c.t];$('togetherTitle').textContent=['지금 우리에게 건네는 질문','한 걸음 가까워지는 방법','서로에게 건네볼 작은 배려'][c.t];
  $('togetherText').textContent='두 사람의 키워드는 ‘'+deck[a][3]+'’와 ‘'+deck[b][3]+'’. 서로에게 이 말이 어떻게 느껴지는지 물어봐. ‘'+deck[together][3]+'’를 떠올리며 아래 행동을 함께 해보면 어때?';$('mission').textContent=deck[together][5];
  shareHash='#r='+encode(result);$('sharePsy').textContent='카톡으로 둘의 타로 답장하기';$('copyPsy').textContent='둘의 결과 링크 복사';show('outcome');
 }
 function pick(i){if(pending)return;pending=true;document.querySelectorAll('[data-pick]').forEach(b=>b.disabled=true);const picked=document.querySelector('[data-pick="'+i+'"]');picked.classList.add('turning');
  const complete=()=>{if(mode==='make'){invitation.i=i;save('tarot-maker:'+invitation.id,invitation);history.replaceState(null,'',location.pathname+'#c='+encode(invitation));sealed();if(window.track)track('link_made');}else{result={c:invitation,n:name($('guestName').value,'답한 친구'),i};save('tarot-reply:'+invitation.id,result);reveal();history.replaceState(null,'',location.pathname+shareHash);if(window.track)track('responded');}pending=false;};
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)complete();else setTimeout(complete,420);
 }
 $('begin').onclick=()=>{mode='make';const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);invitation={v:1,id:Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(''),t:topic,n:name($('makerName').value,'먼저 보낸 친구'),d:shuffled(),i:0};draw();};
 $('join').onclick=()=>{mode='join';topic=invitation.t;draw();};document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>pick(Number(b.dataset.pick)));
 $('backDraw').onclick=()=>{if(!pending)show(mode==='make'?'intro':'invitation');};
 function fresh(){history.replaceState(null,'',location.pathname);invitation=result=null;shareHash='';mode='make';pending=false;$('readings').replaceChildren();topicsUI();show('intro');}
 $('again').onclick=fresh;
 window.psyShareData=()=>({title:result?'나와 너의 타로 · 우리 카드가 열렸어':invitation.n+'님이 타로 한 장을 봉인했어',desc:result?'두 사람의 카드와 우리를 위한 조언을 같이 읽어봐.':topics[invitation.t]+' · 너도 한 장을 고르면 우리 카드가 함께 열려.',url:location.origin+location.pathname+shareHash,btn:result?'둘의 타로 보기':'나도 한 장 뽑기',textOnly:true});
 function route(){
  if(!location.hash){fresh();return;}
  try{const m=location.hash.match(/^#([cr])=([A-Za-z0-9_-]{1,1800})$/);if(!m)throw Error('link');const o=JSON.parse(decodeURIComponent(escape(atob(m[2].replace(/-/g,'+').replace(/_/g,'/')))));
   if(m[1]==='r'){if(!validResult(o))throw Error('result');result=o;reveal();return;}
   if(!validInvite(o))throw Error('invite');invitation=o;topic=o.t;const r=read('tarot-reply:'+o.id);if(validResult(r)&&JSON.stringify(r.c)===JSON.stringify(o)){result=r;reveal();return;}
   const own=read('tarot-maker:'+o.id);if(validInvite(own)&&JSON.stringify(own)===JSON.stringify(o)){sealed();return;}
   $('inviteName').textContent=o.n;$('inviteTopic').textContent=topics[o.t];show('invitation');
  }catch(e){show('invalid');}
 }
 window.addEventListener('hashchange',route);route();
})();
