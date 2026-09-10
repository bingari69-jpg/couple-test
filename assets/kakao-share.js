/* 같이해봐 — 카카오톡 공유 공통 모듈
   사용: <script src="../../assets/kakao-share.js"></script>
   호출: kakaoShare({title, desc, url, img, btn, textOnly?}, fallbackFn) */
(function(){
  const KEY = "8983fdb327539fa37eea7e842e46f011";
  const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
  const CARD_TITLES = {"ten": "10초 맞추기", "delivery": "배달 텔레파시", "mbti": "MBTI 맞히기", "react": "반응속도 대결", "crash": "20분 후 추락합니다", "seat": "어디에 앉나요", "marriage": "결혼 전에 맞춰볼 것들", "mind/fight": "싸우면 어떻게 끝날까", "memory": "우리의 기억", "ladder": "사다리타기", "groups": "골프 조편성", "num25": "1에서 25까지", "mole": "두더지 잡기", "ufo": "UFO 요격", "tap": "10초 연타", "stroop": "색깔 함정", "arrow": "화살표 함정", "stop": "딱 멈춰", "exam": "시험지 보내기", "rps": "가위바위보", "ranking": "내 취향 맞혀봐", "personality": "나와 너의 마음동물", "fortune": "오늘의 운세 카드", "tarot": "나와 너의 타로", "letter": "너에게 보내는 편지"};
  const CARD_ROOT = "https://bingari69-jpg.github.io/couple-test/assets/share-cards/";
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
    return load().then(async ok=>{
      if(!ok){ if(fallback) await fallback(); return false; }
      try{
        let slug='',isResult=false;
        try{const u=new URL(o.url);const m=u.pathname.match(/\/t\/(.+?)\/?$/);slug=m?m[1]:'';isResult=u.hash.startsWith('#r=');}catch(e){}
        // Letter URLs carry the full message. Keep the long URL only once, in the
        // mobile field Kakao Talk uses on phones, to avoid packet duplication.
        const link = slug==='letter' ? { mobileWebUrl:o.url } : { mobileWebUrl:o.url, webUrl:o.url };
        const cardTitle=CARD_TITLES[slug];
        const message = o.textOnly ? {
          objectType:"text",
          text:[o.title,o.desc].filter(Boolean).join("\n").slice(0,200),
          link,
          buttonTitle:o.btn||"열어보기"
        } : {
          objectType:"feed",
          content:{
            title:cardTitle ? (slug==='letter'?'너에게 편지가 도착했어요':cardTitle+(isResult?' · 결과 도착':' · 초대 도착')) : o.title,
            description:cardTitle ? Array.from([o.title,o.desc].filter(Boolean).join(' · ')).slice(0,100).join('') : o.desc,
            imageUrl:cardTitle ? CARD_ROOT+slug.replace('/','-')+'.png?v=20260910-unified' : o.img,
            imageWidth:800, imageHeight:cardTitle?480:800,
            link
          },
          // The default button inherits content.link; do not duplicate a long letter URL.
          buttonTitle:o.btn||"열어보기"
        };
        await Kakao.Share.sendDefault(message);
        // This reports SDK dispatch, not delivery: remote picker errors are not returned here.
        return true;
      }catch(e){ if(fallback) await fallback(); return false; }
    });
  };
  window.kakaoReady = ready;
  load();   // 미리 로드
})();
