(function(){
 'use strict';
 const menu=document.getElementById('menu'),menuButton=document.getElementById('menuButton');
 if(menu&&menuButton){menuButton.onclick=()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));};menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}));}
 const items=[
  {href:'../know-me/',icon:'🦦',category:'성격',title:'너, 나 얼마나 알아?',desc:'내 MBTI는 알아도, 이건 모를걸? 내 선택과 네 예상을 비교해봐.',tag:'대표 시리즈 · 6개 에피소드 · 각자 9문항'}
 ];
 const list=document.getElementById('tests');
 function render(category){
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
  const selected=items.filter(it=>category==='전체'||it.category===category);list.replaceChildren();document.getElementById('testCount').textContent=category+' · '+selected.length+'가지';
  for(const it of selected){const a=document.createElement('a');a.href=it.href;a.className='psy-card';const icon=document.createElement('span');icon.className='icon';icon.textContent=it.icon;icon.setAttribute('aria-hidden','true');const body=document.createElement('div');const h=document.createElement('h2');h.textContent=it.title;const p=document.createElement('p');p.textContent=it.desc;const small=document.createElement('small');small.textContent=it.tag+' →';body.append(h,p,small);a.append(icon,body);list.append(a);}
 }
 /* 항목이 하나도 없는 분류는 버튼을 숨긴다. 내려놓은 시리즈가 있으면 빈 탭이 남는다. */
 document.querySelectorAll('[data-category]').forEach(b=>{
  const cat=b.dataset.category;
  b.hidden=cat!=='전체'&&!items.some(it=>it.category===cat);
  b.onclick=()=>render(cat);
 });
 render('전체');
})();
