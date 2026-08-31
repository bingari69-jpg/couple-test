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

  /* 게임 이름: /couple-test/t/rps/ → rps, 홈 → home */
  const m=location.pathname.match(/\/t\/([^/]+)\/?/);
  const game = m ? m[1] : "home";
  const entry = (function(){
    const h=(location.hash||location.search).slice(1);
    if(/^(c|i)=/.test(h)) return "invite";
    if(/^r=/.test(h))     return "result";
    if(/^l=/.test(h))     return "letter";
    return "direct";
  })();

  window.track=function(ev, params){
    try{ gtag("event", ev, Object.assign({ game, entry }, params||{})); }catch(e){}
  };

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

  /* 초대로 들어온 사람이 결과 화면에 도달 → responded (한 번만) */
  if(entry==="invite"){
    let done=false;
    const check=()=>{
      if(done) return;
      const el=[...document.querySelectorAll('[id*="result"],[id*="compare"],[id="opened"]')]
        .find(x=> !x.classList.contains("hidden") && (x.classList.contains("on") || getComputedStyle(x).display!=="none"));
      if(el){ done=true; track("responded"); obs.disconnect(); }
    };
    const obs=new MutationObserver(check);
    document.addEventListener("DOMContentLoaded", ()=>{ obs.observe(document.body,{attributes:true,subtree:true,attributeFilter:["class","style"]}); check(); });
  }
})();
