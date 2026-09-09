(function(){
 'use strict';const $=id=>document.getElementById(id);
 async function copy(){const o=window.psyShareData();try{await navigator.clipboard.writeText(o.url);$('shareStatus').textContent='복사했어! 카톡에 붙여넣어줘.';}catch(e){$('manualCopy').hidden=false;$('shareUrl').value=o.url;$('shareUrl').focus();$('shareUrl').select();}}
 $('copyPsy').onclick=copy;$('sharePsy').onclick=async()=>{const b=$('sharePsy');b.disabled=true;try{if(window.kakaoShare)await window.kakaoShare(window.psyShareData(),copy);else await copy();}catch(e){await copy();}finally{b.disabled=false;}};
})();
