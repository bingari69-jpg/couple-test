/* 같이해봐 — 측정 공통 모듈 (GA4)
   사용: 각 페이지 <head>에  <script src="../../assets/analytics.js"></script>  (홈은 assets/analytics.js)
   게임 파일 수정 없이 아래 이벤트를 자동으로 셉니다.

   page_view      모든 방문 (게임별 자동 구분: 경로 t/xxx/ 에서 추출)
   invite_opened  초대·도전장 링크(#c= #i=)로 들어옴          ← 개봉률의 분자
   result_opened  결과 링크(#r=)로 들어옴
   letter_opened  편지 링크(#l=)로 들어옴
   link_made      초대 링크 생성 (만들기 버튼)
   responded      초대로 들어온 사람이 결과 화면까지 도달       ← 응답률
   invite_shared  초대 링크를 카톡/복사로 보냄 (method 구분)   ← 개봉률의 분모
   result_shared  결과 링크를 보냄
   replay         복수전·재도전·나도 답하기
*/
(function(){
  const ID = "G-E0P7KBM0FD";
  const analyticsScript = document.currentScript;
  const PROJECT_URL = "https://iqwggvijxptehvmdbmub.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_D6Iqs7Xovd1ihHV5BYeQrg_xyvHG04Z";

  /* 게시된 관리자 설정은 모든 페이지에서 같은 런타임으로 적용한다. */
  if(!window.__GATCHI_APP_CONFIG__ && !window.__GATCHI_APP_CONFIG_LOADER__ && analyticsScript && analyticsScript.src){
    window.__GATCHI_APP_CONFIG_LOADER__=true;
    const appConfig=document.createElement("script");
    appConfig.src=new URL("app-config.js?v=20260915-admin-ops",analyticsScript.src).href;
    document.head.appendChild(appConfig);
  }

  /* 처음 온 사람도 바로 시작할 수 있도록 공통 게임 설명을 붙인다. */
  if(!window.__GATCHI_GUIDE_LOADER__ && analyticsScript && analyticsScript.src && !analyticsScript.hasAttribute('data-own-guide')){
    window.__GATCHI_GUIDE_LOADER__=true;
    const guideData=document.createElement("script");
    guideData.src=new URL("guide-data.js?v=20260916-creatures",analyticsScript.src).href;
    guideData.onload=function(){
      const helpGuide=document.createElement("script");
      helpGuide.src=new URL("help-guide.js?v=20260913-2048-guide",analyticsScript.src).href;
      document.head.appendChild(helpGuide);
    };
    document.head.appendChild(guideData);
  }

  /* 잘린 링크 안내: 주소에 #c=/#i=/#r=가 있는데 풀리지 않으면 위쪽에 안내를 띄운다. */
  if(!window.__GATCHI_LINK_GUARD_LOADER__ && analyticsScript && analyticsScript.src && !analyticsScript.hasAttribute('data-own-link-guard')){
    window.__GATCHI_LINK_GUARD_LOADER__=true;
    const linkGuard=document.createElement("script");
    linkGuard.src=new URL("link-guard.js?v=20260912-1",analyticsScript.src).href;
    document.head.appendChild(linkGuard);
  }

  // 공개 도메인만 측정. 관리자·미리보기·개발 접속은 GA와 자체 통계 모두 제외한다.
  function excluded(){
    if(!['noljago.co.kr','www.noljago.co.kr'].includes(location.hostname)||navigator.webdriver||new URLSearchParams(location.search).get('admin_preview')==='1')return true;
    try{return localStorage.getItem('gatchi_analytics_optout')==='1'||!!sessionStorage.getItem('gatchi_admin_session_v2');}catch(_){return false;}
  }
  window.GatchiAnalyticsExcluded=excluded;
  if(excluded()){window.track=function(){};return;}

  /* gtag 로드 */
  const s=document.createElement("script"); s.async=true;
  s.src="https://www.googletagmanager.com/gtag/js?id="+ID; document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag=gtag;
  gtag("js", new Date());
  /* 주소의 #해시·?쿼리에는 답변·이름이 실려 있으므로 GA에는 경로만 보낸다 */
  gtag("config", ID, {
    anonymize_ip: true,
    page_location: location.origin + location.pathname,
    page_path: location.pathname
  });

  /* 게임 이름: /t/rps/ (옛 주소는 /couple-test/t/rps/) → rps, 홈 → home */
  const m=location.pathname.match(/\/t\/(.+?)\/?$/);
  const game = m ? m[1] : "home";
  const entry = (function(){
    const h=(location.hash||location.search).slice(1);
    if(/^(c|i|room)=/.test(h)) return "invite";
    if(/^r=/.test(h))     return "result";
    if(/^l=/.test(h))     return "letter";
    return "direct";
  })();

  function sessionId(){
    try{
      let id=localStorage.getItem("gatchi_analytics_session");
      if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("gatchi_analytics_session",id);}
      return id.slice(0,40);
    }catch(e){return null;}
  }
  function supabaseEvent(ev,params){
    if(typeof fetch!=="function"||excluded())return;
    const allowed=["page_view","game_started","game_completed","link_made","invite_opened","responded","invite_shared","result_opened","result_shared","replay","letter_opened","solo_started","solo_cleared","solo_failed","solo_to_duel"];
    let normalized=ev;
    if(!ev.startsWith("solo_")&&/(?:^|_)start(?:ed)?$/.test(ev))normalized="game_started";
    else if(/(?:^|_)(?:finish|finished|graded)$/.test(ev))normalized="game_completed";
    if(!allowed.includes(normalized))return;
    try{fetch(PROJECT_URL+"/rest/v1/rpc/track_app_event",{
      method:"POST",keepalive:true,headers:{apikey:PUBLISHABLE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({p_event:normalized,p_game:game,p_entry:entry,p_method:"v2:"+String(params&&params.method||"manual").replace(/[^a-z0-9_-]/gi,"").slice(0,17),p_session_id:sessionId()})
    }).catch(()=>{});}catch(e){}
  }

  window.track=function(ev, params){
    if(excluded())return;
    try{gtag("event",ev,Object.assign({game,entry},params||{}));}catch(_){}
    // 링크 생성/공유와 게임 종료는 서로 다른 이벤트다. 종료를 임의로 만들어 내지 않는다.
    supabaseEvent(ev,params||{});
  };

  supabaseEvent("page_view",{});

  if(document.currentScript && document.currentScript.hasAttribute("data-manual-events")) return;

  /* 진입 유형 */
  if(entry==="invite") track("invite_opened");
  else if(entry==="result") track("result_opened");
  else if(entry==="letter") track("letter_opened");

  /* 버튼 클릭 → 이벤트 (id 규칙으로 자동 매핑) */
  function classify(id){
    if(/^makeLink$/.test(id)) return ["link_made"];
    if(/kakao/i.test(id)) return [/res|back|result/i.test(id) ? "result_shared" : "invite_shared", "kakao"];
    if(/^(copyBtn|copyLink|shareBtn)$/.test(id)) return ["invite_shared","copy"];
    if(/^(sendResult|sendBackBtn|shareResult)$/.test(id)) return ["result_shared","copy"];
    if(/^(revenge2?|again2?|mineToo|tieNext|guessBack|retry)$/.test(id)) return ["replay"];
    return null;
  }
  document.addEventListener("click", function(e){
    const b=e.target.closest("button,a"); if(!b||!b.id) return;
    const c=classify(b.id); if(c) track(c[0], c[1]?{method:c[1]}:{});
  }, true);

  /* 시작은 콘텐츠가 명시적으로 보낸 이벤트만 사용한다. 메뉴·난이도 클릭을 시작으로 추정하지 않는다. */

  /* 초대로 들어온 사람이 결과 화면에 도달 → responded (한 번만) */
  if(entry==="invite"){
    let done=false;
    const check=()=>{
      if(done) return;
      const el=[...document.querySelectorAll('#s-result,#s-report,#v-compare,#opened,#resultScreen,[data-result-screen]')]
        .find(x=> !x.hidden && x.getClientRects().length>0 && getComputedStyle(x).visibility!=="hidden");
      if(el){ done=true; track("responded"); obs.disconnect(); }
    };
    const obs=new MutationObserver(check);
    document.addEventListener("DOMContentLoaded", ()=>{ obs.observe(document.body,{attributes:true,subtree:true,attributeFilter:["class","style"]}); check(); });
  }
})();
