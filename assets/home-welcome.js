(function(){
 'use strict';
 const STORAGE_KEY='gatchi_home_welcome_v1';
 const $=id=>document.getElementById(id);
 function hasSeen(){try{return localStorage.getItem(STORAGE_KEY)==='1';}catch(_){return true;}}
 function markSeen(){try{localStorage.setItem(STORAGE_KEY,'1');}catch(_){}}
 function show(){const dialog=$('homeWelcome');if(!dialog||dialog.open)return;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');document.documentElement.classList.add('home-welcome-open');}
 function close(){const dialog=$('homeWelcome');markSeen();if(!dialog)return;if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');document.documentElement.classList.remove('home-welcome-open');}
 function init(){
  const dialog=$('homeWelcome');if(!dialog)return;
  $('welcomeClose').onclick=close;
  $('welcomeLetter').onclick=markSeen;
  $('welcomeGames').onclick=()=>{close();const catalog=$('all');if(catalog)catalog.scrollIntoView({behavior:'smooth',block:'start'});};
  $('welcomeHelp').onclick=show;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  if(!hasSeen()&&!new URLSearchParams(location.search).has('admin_preview'))show();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
