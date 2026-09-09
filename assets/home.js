(function(){
const $=id=>document.getElementById(id);
$('menuButton').onclick=()=>{const open=$('menu').hidden;$('menu').hidden=!open;$('menuButton').setAttribute('aria-expanded',String(open));};
const openCatalog=()=>{$('all').hidden=false;$('allButton').setAttribute('aria-expanded','true');};
$('allButton').onclick=()=>{const open=$('all').hidden;$('all').hidden=!open;$('allButton').setAttribute('aria-expanded',String(open));if(open)$('all').scrollIntoView({block:'start'});};
$('menuAll').onclick=openCatalog;
let relationship='전체';
function render(){
 $('catalogFilters').replaceChildren();
 ['전체','연인','부부','친구','가족'].forEach(r=>{const b=document.createElement('button');b.className='chip';b.textContent=r;b.setAttribute('aria-pressed',String(r===relationship));b.onclick=()=>{relationship=r;render();};$('catalogFilters').append(b);});
 $('catalogList').replaceChildren();
 HOME_ITEMS.filter(it=>relationship==='전체'||it.rel===relationship).forEach(it=>{const a=document.createElement('a');a.className='catalog-card';a.href=it.path;const s=document.createElement('strong');s.textContent=it.title;const p=document.createElement('p');p.textContent=it.desc;const small=document.createElement('small');small.textContent=it.rel+' · '+it.kind+' →';a.append(s,p,small);$('catalogList').append(a);});
}
render();if(location.hash==='#all')openCatalog();
if(/^#(?:i|r)=/.test(location.hash))location.replace('t/marriage/'+location.hash);
})();
