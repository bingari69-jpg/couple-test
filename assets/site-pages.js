(function(){
 'use strict';
 const button=document.getElementById('infoMenuButton'),menu=document.getElementById('infoMenu');
 if(!button||!menu)return;
 function close(){menu.hidden=true;button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{const opening=menu.hidden;menu.hidden=!opening;button.setAttribute('aria-expanded',String(opening));};
 menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
 document.addEventListener('click',event=>{if(!menu.hidden&&!menu.contains(event.target)&&event.target!==button&&!button.contains(event.target))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
})();
