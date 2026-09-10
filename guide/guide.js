(function(){
  'use strict';
  const GROUPS=['전체','기록 대결','마음 맞히기','편지와 운세','단체 놀이'];
  const $=id=>document.getElementById(id);
  let selected='전체';
  function configured(){
    const published=window.APP_PUBLISHED_CONFIG;
    const games=published&&Array.isArray(published.games)?published.games:[];
    return Object.entries(window.GATCHI_GUIDES||{}).map(([slug,guide],index)=>{
      const managed=games.find(game=>game.slug===slug);
      return {slug,visibility:managed&&managed.visibility||'listed',sortOrder:managed&&managed.sortOrder||index+1,...guide,...managed&&managed.guide||{},title:managed&&managed.title||guide.title,path:managed&&managed.path||('t/'+slug+'/')};
    }).filter(item=>item.visibility!=='hidden').sort((a,b)=>a.sortOrder-b.sortOrder);
  }
  function filters(){
    const box=$('guideFilters');box.replaceChildren();
    GROUPS.forEach(group=>{const button=document.createElement('button');button.type='button';button.textContent=group;button.classList.toggle('active',group===selected);button.onclick=()=>{selected=group;filters();render();};box.append(button);});
  }
  function card(item){
    const details=document.createElement('details');details.className='guide-card';
    const summary=document.createElement('summary');summary.innerHTML='<span class="guide-icon"></span><span><strong></strong><small></small></span><i aria-hidden="true">＋</i>';
    summary.querySelector('.guide-icon').textContent=item.icon||'🐣';summary.querySelector('strong').textContent=item.title;summary.querySelector('small').textContent=item.rule;
    const body=document.createElement('div');body.className='guide-card-body';const rule=document.createElement('p');rule.textContent=item.rule;
    const list=document.createElement('ol');list.className='mini-steps';(item.steps||[]).slice(0,3).forEach((step,index)=>{const li=document.createElement('li');li.innerHTML='<b>'+(index+1)+'</b>';li.append(document.createTextNode(step));list.append(li);});
    const tip=document.createElement('p');tip.className='card-tip';tip.textContent='💡 '+(item.tip||'화면에 나온 순서대로 천천히 해보세요.');
    const link=document.createElement('a');link.className='play-link';link.href='../'+String(item.path).replace(/^\.\//,'');link.textContent=item.visibility==='maintenance'?'지금은 쉬는 중':'이 게임 해보기 →';if(item.visibility==='maintenance'){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
    body.append(rule,list,tip,link);details.append(summary,body);return details;
  }
  function render(){
    const query=$('guideSearch').value.trim().toLowerCase();const items=configured().filter(item=>(selected==='전체'||item.group===selected)&&(!query||(item.title+' '+item.rule+' '+item.group).toLowerCase().includes(query)));
    $('guideList').replaceChildren(...items.map(card));$('guideCount').textContent=items.length+'개의 사용법';if(!items.length){const empty=document.createElement('p');empty.className='no-guide';empty.textContent='찾는 게임이 없어요. 다른 이름으로 찾아보세요.';$('guideList').append(empty);}
  }
  function init(){filters();render();$('guideSearch').oninput=render;}
  window.addEventListener('app-config-ready',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
