(function(){
 'use strict';
 const menu=document.getElementById('menu'),menuButton=document.getElementById('menuButton');
 if(menu&&menuButton){menuButton.onclick=()=>{const open=menu.hidden;menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));};menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}));}
 const items=[
  {href:'../love-note/',icon:'💞',category:'관계',title:'나는 이렇게 주고, 이렇게 받고 싶어',desc:'내가 주는 방식과 상대가 기다리는 방식은 다를 수 있어. 어긋난 자리를 찾아봐.',tag:'주는 방식 4 + 받고 싶은 방식 4 · 오늘 할 행동 하나'},
  {href:'../closeness/',icon:'🧭',category:'관계',title:'우리에게 맞는 거리',desc:'답이 늦을 때, 말수가 줄 때, 다툰 직후. 그때 필요한 게 서로 달라.',tag:'8장면 · 유형 이름 없이, 필요한 거리만'},
  {href:'../mirror/',icon:'🪞',category:'성격',title:'내가 보는 나, 네가 보는 나',desc:'나를 고른 말과 상대가 나에게 붙인 말. 겹친 말과 한 사람만 본 말이 갈려.',tag:'낱말 고르기 · 각자 3~6개 · 약 1분'},
  {href:'../know-me/',icon:'🦦',category:'성격',title:'너, 나 얼마나 알아?',desc:'내 MBTI는 알아도, 이건 모를걸? 내 선택과 네 예상을 비교해봐.',tag:'대표 시리즈 · 6개 에피소드 · 각자 9문항'}
 ];
 const list=document.getElementById('tests');
 /* 관리 화면에서 «공개» 로 둔 심리·운세 콘텐츠를 목록에 더한다.
    코드에 적힌 4종은 그대로 두고, 게시본에만 있는 것을 뒤에 붙인다. */
 function mergePublished(){
  const known=new Set(items.map(it=>it.href.replace('../','t/')));
  (window.HOME_ITEMS||[]).forEach(entry=>{
   if(entry.playHide!=='mind'||known.has(entry.path))return;
   known.add(entry.path);
   items.push({href:entry.path.replace(/^t\//,'../'),icon:entry.kind==='운세'?'🔮':'🌱',
    category:entry.kind==='운세'?'운세':'성격',title:entry.title,desc:entry.summary||entry.desc||'',
    tag:(entry.relationships||['친구']).join('·')+' · 함께 해보기'});
  });
 }
 function render(category){
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
  const selected=items.filter(it=>category==='전체'||it.category===category);list.replaceChildren();document.getElementById('testCount').textContent=category+' · '+selected.length+'가지';
  for(const it of selected){const a=document.createElement('a');a.href=it.href;a.className='psy-card';const icon=document.createElement('span');icon.className='icon';icon.textContent=it.icon;icon.setAttribute('aria-hidden','true');const body=document.createElement('div');const h=document.createElement('h2');h.textContent=it.title;const p=document.createElement('p');p.textContent=it.desc;const small=document.createElement('small');small.textContent=it.tag+' →';body.append(h,p,small);a.append(icon,body);list.append(a);}
 }
 /* 항목이 하나도 없는 분류는 버튼을 숨긴다. 내려놓은 시리즈가 있으면 빈 탭이 남는다. */
 let current='전체';
 function syncTabs(){
  document.querySelectorAll('[data-category]').forEach(b=>{
   const cat=b.dataset.category;
   b.hidden=cat!=='전체'&&!items.some(it=>it.category===cat);
   b.onclick=()=>{current=cat;render(cat);};
  });
 }
 function draw(){mergePublished();syncTabs();render(current);}
 draw();
 /* 게시본은 늦게 도착한다 — 도착하면 목록과 분류 버튼을 다시 그린다 */
 ['home-catalog-updated','app-config-ready'].forEach(name=>window.addEventListener(name,draw));
})();
