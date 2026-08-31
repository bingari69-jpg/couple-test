/* 같이해봐 — 명단 붙여넣기 공통 모듈
   사용: <script src="../../assets/roster.js"></script>
   호출: parseRoster(text, {max, maxLen}) → {names, dup, over, skipped}

   단톡 공지나 엑셀에서 복사한 명단을 그대로 받아 이름 배열로 만든다.
     names   : 정리된 이름 (중복 제거, maxLen 절단, max 개까지)
     dup     : 중복이라 제외한 개수
     over    : 상한을 넘어 제외한 개수
     skipped : 명단이 아니라고 보고 통째로 건너뛴 줄 수                    */
(function(){
  const PURE_KO   = /^[가-힣]{2,5}$/;                 // 공백으로 나눌 수 있는 토큰 모양
  const SENTENCE  = /(니다|세요|요|다|함|임|음)$/;     // 이 말끝이 있으면 문장으로 본다
  const LABEL     = /^[^:：]{1,10}[:：]\s*/;           // "참석:" 같은 앞 라벨

  /* 앞 번호("1.", "1)", "①", "-", "•")와 뒤 호칭("님")을 떼고 다듬는다 */
  function clean(s){
    return String(s)
      .replace(/[​-‍﻿]/g,"")      // 보이지 않는 문자
      .trim()
      .replace(/^[\s\-•*·▪◦―—]+/,"")             // 불릿
      .replace(/^[①-⑳]\s*/,"")          // ①②③…
      .replace(/^\d+\s*[.)\]]\s*/,"")             // 1. 1) 1]
      .replace(/^\d+\s+/,"")                      // 1 김철수
      .replace(/\s+/g," ")
      .trim()
      .replace(/\s*님$/,"")                       // 뒤 호칭
      .trim();
  }

  window.parseRoster = function(text, opt){
    opt = opt || {};
    const maxLen = opt.maxLen || 6;
    const max    = opt.max    || Infinity;

    /* 1차: 줄바꿈 · 쉼표 · 슬래시로 나눈다. 여기서 나뉜 것은 사용자가 구분자를 쓴 것이므로 믿는다. */
    const chunks = String(text||"")
      .replace(/\r\n?/g,"\n")
      .split(/[\n,、，/|]+/);

    const picked = [];
    let skipped = 0;

    chunks.forEach(raw=>{
      const line = String(raw).replace(LABEL,"").trim();   // "참석: 김철수" → "김철수"
      if(!line) return;

      /* 공백으로 나눈 뒤 다듬고 빈 것은 버린다 ("1." 같은 번호만 남은 토큰) */
      const tokens = line.split(/\s+/).map(clean).filter(Boolean);
      if(!tokens.length) return;

      /* 토큰이 하나면 구분자로 이미 나뉜 항목 → 그대로 받는다 */
      if(tokens.length === 1){ picked.push(tokens[0]); return; }

      /* 여러 토큰이면 "이름만 늘어놓은 줄"일 때만 나눈다.
         숫자·영문·기호가 섞였거나(6시, 12월, OT) 말끝이 문장이면 줄째로 건너뛴다. */
      const allNames = tokens.every(t => PURE_KO.test(t) && !SENTENCE.test(t));
      if(allNames) tokens.forEach(t=>picked.push(t));
      else skipped++;
    });

    /* 중복 빼고, 길이 자르고, 상한까지 */
    const seen = new Set();
    const names = [];
    let dup = 0;
    picked.forEach(t=>{
      const c = t.slice(0, maxLen);
      if(!c) return;
      if(seen.has(c)){ dup++; return; }
      seen.add(c); names.push(c);
    });

    const over = Math.max(0, names.length - max);
    return { names: names.slice(0, max), dup, over, skipped };
  };

  /* 이 텍스트가 "명단 붙여넣기"로 볼 만한지 (이름 칸에 직접 붙여넣었을 때 판단용) */
  window.looksLikeRoster = function(text){
    if(!/[\n,、，/|]/.test(String(text||""))) return false;
    return window.parseRoster(text).names.length >= 2;
  };

  /* ===== 문제 붙여넣기 =====
     한 줄이 "문제 정답" 형태인 단어장을 그대로 받아 [[문제,[정답들]], ...] 로 만든다.
       apple 사과 / apple, 사과 / apple - 사과 / apple: 사과 / 1. apple 사과
     정답이 여러 개면 "/" 로 나눈다 (apple 사과/능금).
     반환: {rows, over}  over = 상한을 넘어 잘라낸 줄 수                          */

  /* 문제와 정답을 가르는 구분자. 쉼표·탭·콜론·붙임표는 확실한 구분자라 먼저 보고,
     없으면 마지막 공백을 기준으로 나눈다("take off 벗다" 처럼 문제에 공백이 있어도
     정답 쪽이 한 덩어리면 제대로 잘린다). */
  const HARD_SEP = /\s*(?:[,\t]|[:：]|\s[-–—]\s)\s*/;

  window.parseQuiz = function(text, opt){
    opt = opt || {};
    const max = opt.max || 30;
    const rows = [];
    String(text||"").replace(/\r\n?/g,"\n").split("\n").forEach(raw=>{
      let line = String(raw)
        .replace(/[​-‍﻿]/g,"")
        .trim()
        .replace(/^[\s\-•*·▪◦]+/,"")
        .replace(/^[①-⑳]\s*/,"")
        .replace(/^\d+\s*[.)\]]\s*/,"")
        .trim();
      if(!line) return;

      let q="", rest="";
      const m = line.match(HARD_SEP);
      if(m && m.index > 0){
        q    = line.slice(0, m.index).trim();
        rest = line.slice(m.index + m[0].length).trim();
      }else{
        /* 확실한 구분자가 없으면 첫 공백에서 자른다 — 첫 토큰이 문제, 나머지가 정답.
           문제가 두 단어 이상이면 쉼표·콜론·붙임표를 써야 한다 ("take off - 벗다") */
        const i = line.indexOf(" ");
        if(i <= 0) return;                      // 정답이 없는 줄
        q    = line.slice(0, i).trim();
        rest = line.slice(i + 1).trim();
      }
      if(!q || !rest) return;
      const answers = rest.split("/").map(s=>s.trim()).filter(Boolean);
      if(!answers.length) return;
      rows.push([q, answers]);
    });
    const over = Math.max(0, rows.length - max);
    return { rows: rows.slice(0, max), over };
  };

  /* 채점용 정규화 — 앞뒤 공백·대소문자·연속 공백·문장부호를 없앤다 */
  window.normAnswer = function(s){
    return String(s||"")
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:'"“”‘’`~()\[\]{}<>·・…]/g,"")
      .replace(/\s+/g," ")
      .trim();
  };
  /* 입력이 정답들 중 하나와 정확히 같은지 — 부분 일치는 오답 */
  window.isCorrect = function(input, answers){
    const a = window.normAnswer(input);
    if(!a) return false;
    return (answers||[]).some(x=>window.normAnswer(x) === a);
  };
})();
