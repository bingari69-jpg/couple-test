(function(){
 'use strict';const $=id=>document.getElementById(id);
 async function copy(){const o=window.psyShareData();try{await navigator.clipboard.writeText(o.url);$('shareStatus').textContent='복사했어! 카톡에 붙여넣어줘.';}catch(e){$('shareStatus').textContent='아래 링크를 복사해서 카톡에 보내줘.';$('manualCopy').hidden=false;$('shareUrl').value=o.url;$('shareUrl').focus();$('shareUrl').select();}}
 $('copyPsy').onclick=copy;$('sharePsy').onclick=async()=>{const b=$('sharePsy');b.disabled=true;$('shareStatus').textContent='카카오톡을 여는 중…';try{if(window.kakaoShare){const opened=await window.kakaoShare(window.psyShareData(),copy);if(opened)$('shareStatus').textContent='카카오톡 창에서 보낼 대상을 선택해줘.';}else await copy();}catch(e){await copy();}finally{b.disabled=false;}};
})();
