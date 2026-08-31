/* 같이해봐 — 명단 붙여넣기 공통 모듈
   사용: <script src="../../assets/roster.js"></script>
   호출: parseRoster(text, {max, maxLen}) → {names, dup, over}

   단톡 공지나 엑셀에서 복사한 명단을 그대로 받아 이름 배열로 만든다.
     names : 정리된 이름 (중복 제거, maxLen 절단, max 개까지)
     dup   : 중복이라 제외한 개수
     over  : 상한을 넘어 제외한 개수                                        */
(function(){
  const SPLIT_SPACE_MAX = 5;   // 한 줄을 공백으로 나눌지 판단하는 토큰 길이 한도

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

  /* 한 줄을 공백으로 더 쪼갤지 판단.
     "김철수 이영희" 는 나누고, "다음주 토요일 모임 안내" 같은 문장은 나누지 않는다.
     → 공백으로 나눈 토큰이 2개 이상이고 전부 5자 이하일 때만 나눈다. */
  function maybeSplitSpaces(line){
    const parts = line.split(/\s+/).filter(Boolean);
    if(parts.length < 2) return [line];
    return parts.every(p => p.length <= SPLIT_SPACE_MAX) ? parts : [line];
  }

  window.parseRoster = function(text, opt){
    opt = opt || {};
    const maxLen = opt.maxLen || 6;
    const max    = opt.max    || Infinity;

    /* 1차: 줄바꿈 · 쉼표 · 슬래시로 나눈다 */
    const rough = String(text||"")
      .replace(/\r\n?/g,"\n")
      .split(/[\n,、，/|]+/);

    /* 2차: 한 줄에 이름이 여러 개 나열된 경우 공백으로 더 나눈다 */
    const tokens = [];
    rough.forEach(line=>{
      const t = line.trim();
      if(!t) return;
      maybeSplitSpaces(t).forEach(x=>tokens.push(x));
    });

    /* 다듬고, 중복 빼고, 길이 자르고, 상한까지 */
    const seen = new Set();
    const names = [];
    let dup = 0;
    tokens.forEach(t=>{
      const c = clean(t).slice(0, maxLen);
      if(!c) return;
      if(seen.has(c)){ dup++; return; }
      seen.add(c); names.push(c);
    });

    const over = Math.max(0, names.length - max);
    return { names: names.slice(0, max), dup, over };
  };

  /* 이 텍스트가 "명단 붙여넣기"로 볼 만한지 (이름 칸에 직접 붙여넣었을 때 판단용) */
  window.looksLikeRoster = function(text){
    if(!/[\n,、，/|]/.test(String(text||""))) return false;
    return window.parseRoster(text).names.length >= 2;
  };
})();
