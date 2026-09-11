/* 같이놀자 — 잘린 링크 안내 (공통)
   주소에 #c= / #i= / #r= 표시는 있는데 뒤의 내용이 풀리지 않으면(복사하다 끊김, 앱이 잘라냄)
   게임이 조용히 첫 화면으로 떨어진다. 그때 위쪽에 "링크가 잘렸어요" 안내를 띄운다.
   각 게임의 코드는 건드리지 않고, 같은 주소를 여기서 한 번 더 풀어 보기만 한다.
   자체 안내 화면이 있는 게임(타로·편지·마음동물·취향·운세)은 제외한다. */
(function(){
  "use strict";
  if(typeof document==="undefined") return;

  const SKIP=["tarot","letter","personality","ranking","fortune","psychology","group-room"];
  const slug=(location.pathname.match(/\/t\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)\/?$/i)||[])[1]||"";
  if(!slug || SKIP.some(s=>slug===s || slug.startsWith(s+"/"))) return;

  function decode(raw){
    let s=raw;
    try{ s=decodeURIComponent(s); }catch(e){}
    s=s.replace(/-/g,"+").replace(/_/g,"/");
    s+="=".repeat((4-s.length%4)%4);
    const b=atob(s), u=new Uint8Array(b.length);
    for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i);
    const parsed=JSON.parse(new TextDecoder().decode(u));
    if(!parsed || typeof parsed!=="object") throw new Error("not an object");
    return parsed;
  }

  function isBroken(){
    const m=location.hash.match(/^#([cir])=(.+)$/);
    if(!m) return false;
    try{ decode(m[2]); return false; }catch(e){ return true; }
  }

  function render(){
    if(document.getElementById("gatchi-link-guard")) return;
    const box=document.createElement("div");
    box.id="gatchi-link-guard"; box.setAttribute("role","alert");
    box.innerHTML=
      '<style>'+
      '#gatchi-link-guard{position:sticky;top:0;z-index:70;margin:0 0 12px;background:#fff3dc;border:1px solid #efdbb7;border-radius:0 0 18px 18px;padding:14px 46px 14px 18px;color:#5a4634;font-size:14px;line-height:1.55;box-shadow:0 4px 14px #816d4a14}'+
      '#gatchi-link-guard b{display:block;font-size:15px;color:#a05a2c;margin-bottom:3px}'+
      '#gatchi-link-guard button{position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;background:transparent;font-size:20px;color:#a48a79;cursor:pointer;border-radius:50%}'+
      '#gatchi-link-guard button:focus-visible{outline:3px solid #f6cd78}'+
      '</style>'+
      '<b>링크가 잘렸어요</b>'+
      '친구가 보낸 내용을 읽지 못했어요. 카카오톡에서 받은 카드를 다시 눌러 주세요. 주소를 직접 복사했다면 끝까지 복사됐는지 확인해 주세요.'+
      '<button type="button" aria-label="안내 닫기">×</button>';
    box.querySelector("button").onclick=()=>box.remove();
    document.body.prepend(box);
    try{ if(window.track) window.track("broken_link",{game:slug}); }catch(e){}
  }

  function run(){ if(isBroken()) render(); }
  if(document.body) run(); else document.addEventListener("DOMContentLoaded",run,{once:true});
  window.addEventListener("hashchange",()=>{ const old=document.getElementById("gatchi-link-guard"); if(old) old.remove(); run(); });

  window.GatchiLinkGuard={ isBroken, decode };
})();
