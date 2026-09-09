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
 let index=0,answers=[],type=0,shared=false;
 const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id);window.scrollTo(0,0);};
 function question(){show('quiz');$('qnumber').textContent=(index+1)+' / 6';$('qtitle').textContent=questions[index][0];$('answers').replaceChildren();questions[index][1].forEach((text,i)=>{const b=document.createElement('button');b.className='answer-option';b.textContent=text;b.setAttribute('aria-pressed',String(answers[index]===i));b.onclick=()=>{answers[index]=i;question();$('answers').children[i].focus({preventScroll:true});};$('answers').append(b);});$('nextQuestion').disabled=answers[index]===undefined;$('nextQuestion').textContent=index===5?'내 마음 동물 만나기 →':'다음 →';$('prevQuestion').textContent=index?'← 이전':'← 처음으로';}
 function reveal(t,fromShare){type=t;shared=fromShare;const r=types[t];$('animalIcon').textContent=r.icon;$('animalName').textContent=r.title;$('animalTag').textContent=r.tag;$('animalDesc').textContent=r.desc;$('animalStrength').textContent=r.strength;$('animalTip').textContent=r.tip;$('animalTalk').textContent=r.talk;$('sharedNote').hidden=!shared;$('again').textContent=shared?'나도 내 마음 동물 찾기 →':'다시 해보기';show('outcome');}
 $('begin').onclick=()=>{index=0;answers=[];question();};$('nextQuestion').onclick=()=>{if(answers[index]===undefined)return;if(index<5){index++;question();}else{const scores=[0,0,0];answers.forEach(a=>scores[a]++);const highest=Math.max(...scores);const t=answers.find(a=>scores[a]===highest);history.replaceState(null,'',location.pathname+'#r=1-'+t);reveal(t,false);if(window.track)track('responded');}};
 $('prevQuestion').onclick=()=>{if(index){index--;question();}else show('intro');};$('again').onclick=()=>{history.replaceState(null,'',location.pathname);answers=[];index=0;question();};
 function entry(){if(!location.hash){show('intro');return;}const m=location.hash.match(/^#r=1-([012])$/);if(m)reveal(Number(m[1]),true);else show('invalid');}window.addEventListener('hashchange',entry);entry();
 window.psyShareData=()=>({title:'내 마음 동물은 '+types[type].title+' '+types[type].icon,desc:'너는 어떤 마음 동물일까? 여섯 가지 선택으로 알아봐.',url:location.origin+location.pathname+'#r=1-'+type,btn:'결과 보고 나도 하기',textOnly:true});
})();
