(function(){
 'use strict';
 const menu=document.getElementById('menu'),menuButton=document.getElementById('menuButton');
 if(menu&&menuButton){menuButton.onclick=()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));};menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}));}
 const items=[
  {href:'../tarot/',icon:'🌙',category:'운세',title:'나와 너의 타로',desc:'내 카드는 먼저 보고, 네가 고르면 나·너·우리의 이야기가 열려!',tag:'NEW · 둘이 함께 · 타로 22장'},
  {href:'../personality/',icon:'🦊',category:'성격',title:'나와 너의 마음동물',desc:'내 마음을 봉인해 보내면, 친구도 답한 뒤 둘의 동물이 함께 공개!',tag:'둘이 함께 · 각자 6문항'},
  {href:'../fortune/',icon:'🔮',category:'운세',title:'오늘의 운세 카드',desc:'마음이 가는 카드 한 장. 오늘을 위한 작은 힌트.',tag:'NEW · 하루 한 장 · 10초'},
  {href:'../mbti/',icon:'🐱',category:'성격',title:'내 MBTI 맞혀봐',desc:'내 네 글자를 친구는 얼마나 맞힐까? 서로의 예상 비교.',tag:'MBTI 놀이 · 4문항'},
  {href:'../seat/',icon:'🪑',category:'성격',title:'어디에 앉을래?',desc:'늦게 도착한 모임. 빈자리 하나에 담긴 나의 성향.',tag:'상황 선택 · 1문항'},
  {href:'../mind/fight/',icon:'💬',category:'관계',title:'싸우면 어떻게 끝날까',desc:'다가가는 나, 시간이 필요한 너. 갈등 뒤의 마음 알아보기.',tag:'관계 성향 · 10문항'},
  {href:'../marriage/',icon:'🏡',category:'관계',title:'함께 살기 전, 우리',desc:'돈부터 집안일까지. 서로의 생각이 다른 곳을 찾아봐.',tag:'가치관 비교 · 20문항'}
 ];
 const list=document.getElementById('tests');
 function render(category){
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
  const selected=items.filter(it=>category==='전체'||it.category===category);list.replaceChildren();document.getElementById('testCount').textContent=category+' · '+selected.length+'가지';
  for(const it of selected){const a=document.createElement('a');a.href=it.href;a.className='psy-card';const icon=document.createElement('span');icon.className='icon';icon.textContent=it.icon;icon.setAttribute('aria-hidden','true');const body=document.createElement('div');const h=document.createElement('h2');h.textContent=it.title;const p=document.createElement('p');p.textContent=it.desc;const small=document.createElement('small');small.textContent=it.tag+' →';body.append(h,p,small);a.append(icon,body);list.append(a);}
 }
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>render(b.dataset.category));render('전체');
})();
