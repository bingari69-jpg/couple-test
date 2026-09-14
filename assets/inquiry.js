(function(){
 'use strict';
 const PROJECT_URL='https://iqwggvijxptehvmdbmub.supabase.co';
 const PUBLISHABLE_KEY='sb_publishable_D6Iqs7Xovd1ihHV5BYeQrg_xyvHG04Z';
 const form=document.getElementById('inquiryForm'),status=document.getElementById('formStatus'),success=document.getElementById('formSuccess');
 if(!form)return;
 function value(name){return String(new FormData(form).get(name)||'').trim();}
 function requestId(){if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});}
 form.addEventListener('submit',async event=>{
  event.preventDefault();const data=new FormData(form),email=form.elements.email,reply=data.get('reply_requested')==='on';email.setCustomValidity(reply&&!value('email')?'답변받을 이메일을 적어주세요.':'');if(!form.reportValidity())return;
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;status.textContent='안전하게 보내는 중이에요…';
  const body={p_kind:form.dataset.kind,p_category:value('category'),p_name:value('name'),p_company:value('company'),p_role:value('role'),p_phone:value('phone'),p_email:value('email'),p_message:value('message'),p_reply_requested:reply,p_source:value('source'),p_request_id:requestId(),p_website:value('website')};
  try{
   const response=await fetch(PROJECT_URL+'/rest/v1/rpc/submit_site_inquiry',{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!response.ok)throw new Error('submit '+response.status);
   form.hidden=true;success.hidden=false;success.setAttribute('tabindex','-1');success.focus({preventScroll:true});
  }catch(_){status.textContent='지금은 보내지 못했어요. 잠시 후 다시 시도해 주세요.';submit.disabled=false;}
 });
})();
