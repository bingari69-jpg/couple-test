(function(){
 'use strict';
 const menu=document.getElementById('menu'),menuButton=document.getElementById('menuButton');
 if(menu&&menuButton){menuButton.onclick=()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));};menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}));}
 const items=[
  {href:'../know-me/',icon:'🦦',category:'성격',title:'너, 나 얼마나 알아?',desc:'내 MBTI는 알아도, 이건 모를걸? 내 선택과 네 예상을 비교해봐.',tag:'대표 시리즈 · 6개 에피소드 · 각자 9문항'},
  {href:'../next-scene/',icon:'🌙',category:'운세',title:'우리 사이, 다음 장면',desc:'각자 카드 한 장. 함께 열린 이야기에서 다음에 할 일을 골라봐.',tag:'타로 22장 · 3가지 이야기 · 우리 타로 보관함'},
  {href:'../lucky/',icon:'🍀',category:'운세',title:'오늘의 행운 한 장',desc:'오늘 이 카드 보고 네 생각났어. 네 카드와 만나면 어떤 제안이 생길까?',tag:'하루 한 장 · 10초 · 나만의 카드 기록'},
  {href:'../repair/',icon:'💬',category:'관계',title:'나 서운하면, 이렇게 풀어줘',desc:'내 행동과 내가 바라는 반응은 다를 수 있어. 내 화해 설명서를 보내봐.',tag:'6문항 · 서로의 반응 비교 · 내 말투로 문장 보내기'},
  {href:'../living/',icon:'🏡',category:'관계',title:'우리 같이 살면 생기는 일',desc:'한 명은 이불 속, 한 명은 청소기를 꺼냈다. 너는 어떻게 할래?',tag:'첫 주말부터 바쁜 한 주까지 · 우리 집 규칙'}
 ];
 const list=document.getElementById('tests');
 function render(category){
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
  const selected=items.filter(it=>category==='전체'||it.category===category);list.replaceChildren();document.getElementById('testCount').textContent=category+' · '+selected.length+'가지';
  for(const it of selected){const a=document.createElement('a');a.href=it.href;a.className='psy-card';const icon=document.createElement('span');icon.className='icon';icon.textContent=it.icon;icon.setAttribute('aria-hidden','true');const body=document.createElement('div');const h=document.createElement('h2');h.textContent=it.title;const p=document.createElement('p');p.textContent=it.desc;const small=document.createElement('small');small.textContent=it.tag+' →';body.append(h,p,small);a.append(icon,body);list.append(a);}
 }
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>render(b.dataset.category));render('전체');
})();
