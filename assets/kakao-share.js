/* 같이해봐 — 카카오톡 공유 공통 모듈
   사용: <script src="../../assets/kakao-share.js"></script>
   호출: kakaoShare({title, desc, url, img, btn}, fallbackFn) */
(function(){
  const KEY = "8983fdb327539fa37eea7e842e46f011";
  const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
  let loading = null;

  function init(){ try{ if(window.Kakao && !Kakao.isInitialized()) Kakao.init(KEY); }catch(e){} }
  function ready(){ return !!(window.Kakao && Kakao.isInitialized && Kakao.isInitialized()); }
  function load(){
    if(ready()) return Promise.resolve(true);
    if(window.Kakao){ init(); return Promise.resolve(ready()); }
    if(loading) return loading;
    loading = new Promise(res=>{
      const s=document.createElement("script");
      s.src=SDK; s.crossOrigin="anonymous";
      s.onload=()=>{ init(); res(ready()); };
      s.onerror=()=>res(false);
      document.head.appendChild(s);
    });
    return loading;
  }

  window.kakaoShare = function(o, fallback){
    load().then(ok=>{
      if(!ok){ fallback && fallback(); return; }
      try{
        Kakao.Share.sendDefault({
          objectType:"feed",
          content:{
            title:o.title, description:o.desc,
            imageUrl:o.img, imageWidth:800, imageHeight:800,
            link:{ mobileWebUrl:o.url, webUrl:o.url }
          },
          buttons:[{ title:o.btn||"열어보기", link:{ mobileWebUrl:o.url, webUrl:o.url } }]
        });
      }catch(e){ fallback && fallback(); }
    });
  };
  window.kakaoReady = ready;
  load();   // 미리 로드
})();
