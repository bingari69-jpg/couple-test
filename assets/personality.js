(function(){
 'use strict';const $=id=>document.getElementById(id);
 const questions=[
 ['친구가 갑자기 힘들다고 연락했어.', ['무슨 일인지 충분히 들어줄래.','기분 전환할 재미있는 일을 찾아볼래.','차분히 상황을 정리하고 방법을 생각할래.']],
 ['아무 계획 없는 주말이 생겼어.', ['보고 싶었던 사람과 시간을 보낼래.','처음 가보는 동네를 탐험할래.','익숙하고 편안한 곳에서 충전할래.']],
 ['새로운 모임에 처음 갔을 때 나는?', ['다른 사람이 어색하지 않게 챙겨.','먼저 말을 걸고 흥미로운 이야기를 꺼내.','분위기를 살펴보고 천천히 가까워져.']],
 ['친구가 내게 작은 선물을 줬어.', ['나를 생각해준 마음부터 고마워.','예상 못 한 선물이라 더 신나!','어디에 두고 어떻게 쓸지 떠올려.']],
 ['같이 여행 계획을 세운다면?', ['모두 편하고 즐거울 일정을 챙겨.','꼭 해보고 싶은 새로운 체험을 찾아.','동선과 쉴 시간을 여유 있게 정리해.']],
 ['하루 끝에 가장 뿌듯한 순간은?', ['누군가에게 작은 힘이 됐을 때.','새로운 걸 해보고 재미를 찾았을 때.','내 속도로 할 일을 잘 마쳤을 때.']]
 ];
 const types=[
 {icon:'🐻',title:'포근한 곰',tag:'마음을 먼저 알아보는 다정함',desc:'이번 선택에서는 사람의 마음과 함께하는 시간을 소중히 여기는 모습이 많이 나타났어. 누군가 편하게 이야기할 수 있는 자리를 만들어주는 편이구나.',strength:'작은 표정과 말에 관심을 기울이고, 함께하는 사람의 편안함을 챙겨.',tip:'다른 사람을 챙기는 만큼 “나는 지금 뭘 원하지?”도 한 번 물어봐.',talk:'친구에게 물어봐: 내가 해줘서 고마웠던 작은 일이 있어?'},
 {icon:'🦊',title:'반짝이는 여우',tag:'새로운 장면을 발견하는 호기심',desc:'이번 선택에서는 새로운 경험과 뜻밖의 즐거움에 마음이 움직이는 모습이 많이 나타났어. 평범한 하루에도 재미있는 장면을 찾아내는 편이구나.',strength:'먼저 시도하고 이야기를 꺼내며, 함께하는 시간에 활기를 더해.',tip:'새로운 일을 시작하기 전에 지금 내 에너지도 가볍게 확인해봐.',talk:'친구에게 물어봐: 나랑 꼭 한번 해보고 싶은 일이 뭐야?'},
 {icon:'🐱',title:'느긋한 고양이',tag:'자기 속도를 지키는 차분함',desc:'이번 선택에서는 상황을 살피고 편안한 리듬을 만드는 모습이 많이 나타났어. 서두르기보다 내가 납득할 시간을 갖는 편이구나.',strength:'차분히 생각을 정리하고, 편안하게 오래 이어갈 방법을 찾아.',tip:'생각이 정리되는 중이라면 “조금만 기다려줘”라고 말해도 좋아.',talk:'친구에게 물어봐: 너는 어떻게 쉬어야 가장 잘 충전돼?'}
 ];
 let index=0,answers=[],invite=null,pair=null,mode='make',shareHash='';
 const cleanName=(s,fallback)=>Array.from(String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,12).join('')||fallback;
 const encode=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const validAnswers=a=>Array.isArray(a)&&a.length===6&&a.every(x=>Number.isInteger(x)&&x>=0&&x<3);
 const validName=n=>typeof n==='string'&&Array.from(n).length<=12;
 const validInvite=o=>o&&o.v===2&&typeof o.id==='string'&&/^[a-f0-9]{16}$/.test(o.id)&&validName(o.n)&&validAnswers(o.a);
 const validPair=o=>o&&validInvite(o.c)&&validName(o.n)&&validAnswers(o.a);
 const getType=a=>{const scores=[0,0,0];a.forEach(v=>scores[v]++);const top=Math.max(...scores);return a.find(v=>scores[v]===top);};
 const read=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch(e){return null;}};
 const save=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));}catch(e){}};
 const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id);$('shareControls').hidden=!['sealed','outcome'].includes(id);$('manualCopy').hidden=true;$('shareStatus').textContent='';window.scrollTo(0,0);};
 function question(){show('quiz');$('qnumber').textContent=(index+1)+' / 6';$('qtitle').textContent=questions[index][0];$('answers').replaceChildren();questions[index][1].forEach((text,i)=>{const b=document.createElement('button');b.className='answer-option';b.textContent=text;b.setAttribute('aria-pressed',String(answers[index]===i));b.onclick=()=>{answers[index]=i;question();$('answers').children[i].focus({preventScroll:true});};$('answers').append(b);});$('nextQuestion').disabled=answers[index]===undefined;$('nextQuestion').textContent=index===5?(mode==='make'?'내 마음동물 봉인하기 →':'두 사람의 마음동물 열기 →'):'다음 →';$('prevQuestion').textContent=index?'← 이전':'← 처음으로';}
 function sealed(){pair=null;shareHash='#c='+encode(invite);$('sealedName').textContent=invite.n+'님의 마음동물';$('sharePsy').textContent='카톡으로 봉인 보내기';$('copyPsy').textContent='봉인 링크 복사';$('again').textContent='새 봉인 만들기';show('sealed');}
 function animalCard(n,a){const t=types[getType(a)],card=document.createElement('article');card.className='result-sheet';const label=document.createElement('span');label.className='eyebrow';label.textContent=n;const icon=document.createElement('div');icon.className='animal';icon.textContent=t.icon;icon.setAttribute('aria-hidden','true');const h=document.createElement('h2');h.className='pair-animal-name';h.textContent=t.title;const tag=document.createElement('p');tag.textContent=t.tag;const desc=document.createElement('p');desc.textContent=t.desc;const strength=document.createElement('p');strength.textContent='좋은 점 · '+t.strength;card.append(label,icon,h,tag,desc,strength);return card;}
 function reveal(){
  shareHash='#r='+encode(pair);const a=getType(pair.c.a),b=getType(pair.a);$('animals').replaceChildren(animalCard(pair.c.n+' · 먼저 보낸 마음',pair.c.a),animalCard(pair.n+' · 답한 마음',pair.a));
  const same=pair.c.a.filter((v,i)=>v===pair.a[i]).length;$('togetherCount').textContent='같은 답을 고른 질문 '+same+' / 6';
  const hints={'0-0':'서로를 챙기는 마음이 닮았네. 오늘은 각자 받고 싶은 배려도 하나씩 말해봐.','0-1':'다정함과 호기심이 만났어. 한 사람은 하고 싶은 일을 고르고, 한 사람은 편하게 즐길 방법을 더해봐.','0-2':'따뜻한 배려와 차분한 리듬이 만났어. 이야기를 듣는 시간과 혼자 쉬는 시간을 함께 챙겨봐.','1-1':'새로운 재미를 발견하는 마음이 닮았네. 함께 처음 해보고 싶은 일을 하나씩 골라봐.','1-2':'새로운 경험과 편안한 속도가 만났어. 작은 모험 하나 뒤에 쉬는 시간도 넣어보자.','2-2':'각자의 속도를 소중히 여기는 마음이 닮았네. 말없이 같이 있어도 편한 시간을 만들어봐.'};
  $('pairTip').textContent=hints[[a,b].sort().join('-')];$('sharePsy').textContent='카톡으로 둘의 결과 답장하기';$('copyPsy').textContent='둘의 결과 링크 복사';$('again').textContent='다른 친구와도 봉인하기 →';show('outcome');
 }
 function finish(){
  if(mode==='make'){const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);invite={v:2,id:Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join(''),n:cleanName($('makerName').value,'먼저 보낸 친구'),a:answers.slice()};save('animal-maker:'+invite.id,invite);history.replaceState(null,'',location.pathname+'#c='+encode(invite));sealed();if(window.track)track('link_made');}
  else{pair={c:invite,n:cleanName($('guestName').value,'답한 친구'),a:answers.slice()};save('animal-answer:'+invite.id,pair);reveal();history.replaceState(null,'',location.pathname+shareHash);if(window.track)track('responded');}
 }
 $('begin').onclick=()=>{mode='make';answers=[];index=0;question();};$('join').onclick=()=>{mode='join';answers=[];index=0;question();};
 $('nextQuestion').onclick=()=>{if(answers[index]===undefined)return;if(index<5){index++;question();}else finish();};$('prevQuestion').onclick=()=>{if(index){index--;question();}else show(mode==='make'?'intro':'invitation');};
 function fresh(){history.replaceState(null,'',location.pathname);answers=[];index=0;invite=pair=null;shareHash='';mode='make';$('animals').replaceChildren();show('intro');}
 $('again').onclick=fresh;$('legacyBegin').onclick=fresh;
 function entry(){
  if(!location.hash){fresh();return;}
  // Existing public single-person links remain readable; all new attempts use the paired flow.
  const old=location.hash.match(/^#r=1-([012])$/);if(old){const t=types[Number(old[1])];$('legacyName').textContent=t.icon+' '+t.title;show('legacy');return;}
  try{const m=location.hash.match(/^#([cr])=([A-Za-z0-9_-]{1,1800})$/);if(!m)throw Error('link');const o=JSON.parse(decodeURIComponent(escape(atob(m[2].replace(/-/g,'+').replace(/_/g,'/')))));
   if(m[1]==='r'){if(!validPair(o))throw Error('pair');pair=o;reveal();return;}
   if(!validInvite(o))throw Error('invite');invite=o;
   const answered=read('animal-answer:'+invite.id);if(validPair(answered)&&JSON.stringify(answered.c)===JSON.stringify(invite)){pair=answered;reveal();return;}
   const own=read('animal-maker:'+invite.id);if(validInvite(own)&&JSON.stringify(own)===JSON.stringify(invite)){sealed();return;}
   $('inviteName').textContent=invite.n;show('invitation');
  }catch(e){show('invalid');}
 }
 window.psyShareData=()=>({title:pair?'나와 너의 마음동물 · 둘의 결과가 열렸어!':invite.n+'님이 마음동물을 봉인했어',desc:pair?'두 사람의 동물과 닮은 선택을 같이 확인해봐.':'너도 여섯 문항에 답하면 두 사람의 마음동물이 함께 열려.',url:location.origin+location.pathname+shareHash,btn:pair?'둘의 결과 보기':'나도 답하고 봉인 열기',textOnly:true});
 window.addEventListener('hashchange',entry);entry();
})();
