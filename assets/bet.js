/* 같이해봐 — 내기 걸기 (선택) 공통 모듈
   사용: <script src="../../assets/bet.js"></script>   (게임 스크립트보다 먼저)

   기록 대결 다섯 종은 assets/duel-engine.js 를 거쳐 쓰고,
   가위바위보(t/rps)는 엔진을 안 쓰므로 이 파일을 직접 쓴다.
   두 곳이 같은 낱말·같은 문장을 쓰게 하려고 한 파일에 모았다.

   링크에는 b:"점심" 처럼 고른 값을 그대로 싣는다.
   내기를 안 걸었으면 b 필드 자체를 싣지 않아 옛 링크와 바이트가 같다.
   읽을 때는 typeof p.b==="string" && p.b 로만 판단한다.

   ── 쓰는 법 ─────────────────────────────────────────
     Bet.mount($("nameIn"), onChange)   이름 칸 아래에 고르는 자리를 만든다
     Bet.get() / Bet.set("점심")        고른 값
     Bet.put(payload)                   링크 payload 에 b 를 붙인다 (없으면 안 붙임)
     Bet.read(payload)                  링크에서 꺼낸다 ("" 면 내기 없음)
     Bet.titlePrefix(b)                 "🍱 점심 걸고 — "
     Bet.openLine(b)                    "이기면 점심!"
     Bet.resultLine(b, name, isMe, tie) "민수가 점심 산다 😂"
     Bet.gaParams(b)                    GA 파라미터 (직접 입력은 종류만)      */
(function () {
  "use strict";

  /* label 은 칩에 보이는 말이자 링크에 실리는 값.
     noun/verb 는 결과 문장을 만들 때 쓴다 ("꿀밤 한 대" → "꿀밤 맞는다"). */
  const PRESETS = [
    { label: "커피 한 잔", emoji: "☕", tag: "coffee",   noun: "커피 한 잔",   verb: "산다" },
    { label: "점심",       emoji: "🍱", tag: "lunch",    noun: "점심",         verb: "산다" },
    { label: "아이스크림", emoji: "🍦", tag: "icecream", noun: "아이스크림",   verb: "산다" },
    { label: "꿀밤 한 대", emoji: "🌰", tag: "flick",    noun: "꿀밤",         verb: "맞는다" },
    { label: "소원 하나",  emoji: "⭐", tag: "wish",     noun: "소원",         verb: "들어준다" },
    { label: "100원",      emoji: "💰", tag: "coin",     noun: "100원",        verb: "낸다" },
  ];
  const EXTRAS = [
    {label:'업어주기',emoji:'🙌',tag:'piggyback',noun:'업어주기',verb:'해준다'},
    {label:'내 자동차',emoji:'🚗',tag:'bluff_car',bluff:true,reaction:'차 키까지 걸었어? 가위바위보인데?'},
    {label:'내 전 재산',emoji:'💸',tag:'bluff_fortune',bluff:true,reaction:'통장 말고 자신감만 걸어도 돼!'},
    {label:'내 인생',emoji:'🔥',tag:'bluff_life',bluff:true,reaction:'갑자기 판이 너무 커졌는데?'},
    {label:'지구 소유권',emoji:'🌍',tag:'bluff_earth',bluff:true,reaction:'일단 네 것이었는지부터 확인하자.'}
  ];
  const CUSTOM_EMOJI = "🎯";
  const MAXLEN = 12;

  /* 이름 뒤 주격조사. assets/duel-engine.js 의 subj 와 같은 규칙이어야 한다
     (test/scenarios.js 에서 두 결과가 같은지 확인한다). */
  const JOSA = { "나": "내가", "상대": "상대가" };
  const hasJong = s => {
    const t = String(s);
    const c = t.charCodeAt(t.length - 1);
    return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0;
  };
  const subj = l => JOSA[l] ? JOSA[l] : l + (hasJong(l) ? "이" : "가");

  /* 고른 값이 프리셋이면 그 정보, 아니면 직접 입력으로 본다 */
  function of(b) {
    if (!valid(b)) return null;
    return PRESETS.concat(EXTRAS).find(p => p.label === b) || null;
  }
  const valid = b => typeof b === "string" && !!b;

  const emoji = b => { const p = of(b); return p ? p.emoji : CUSTOM_EMOJI; };
  const tag = b => { const p = of(b); return p ? p.tag : "custom"; };

  /* ── 노출 1. 카톡 도전장 카드 제목 앞머리 ── */
  function titlePrefix(b) {
    return valid(b) ? `${emoji(b)} ${b} 걸고 — ` : "";
  }
  /* ── 노출 2. 도전장 열기 화면 한 줄 ── */
  function openLine(b) {
    return of(b)?.bluff ? `${emoji(b)} ${b} 걸고! · 허세 내기` : valid(b) ? `이기면 ${b}!` : "";
  }
  /* ── 노출 3. 결과 화면 내기 결과 ──
     진 쪽을 기준으로 쓴다. 보는 사람이 진 쪽이면 이름이 있어도 "내가". */
  function resultLine(b, loserName, loserIsMe, tie) {
    if (!valid(b)) return "";
    if (tie) return "무승부 — 내기는 다음 판으로";
    const label = loserIsMe ? "나" : (loserName || "상대");
    const p = of(b);
    if (p?.bluff) return `${subj(label)} 허세 한 수 접는다 😂 · ${b}는 마음으로만!`;
    if (!p) return `내기: ${b} — ${label} 패`;
    return `${subj(label)} ${p.noun} ${p.verb} 😂`;
  }

  /* ── 링크 ── */
  function put(payload, b) {                 // 내기가 없으면 필드를 아예 안 붙인다
    if (valid(b)) payload.b = b;
    return payload;
  }
  function read(p) {                          // 빈 문자열·미존재 모두 "내기 없음"
    return (p && typeof p.b === "string" && p.b) ? p.b : "";
  }

  /* ── GA — 직접 입력은 내용을 보내지 않고 종류만 ── */
  function gaParams(b) {
    return valid(b) ? { bet: 1, bet_kind: tag(b) } : { bet: 0 };
  }

  /* ── 고르는 자리 ──
     밝은 배경(기록 대결)과 어두운 배경(가위바위보) 양쪽에서 읽히게
     페이지가 이미 쓰는 변수를 빌려 쓰고, 없으면 기본값으로 떨어진다. */
  const CSS = `
@font-face{font-family:BetTitle;src:url('https://noljago.co.kr/assets/fonts/jua-regular.woff2') format('woff2');font-display:swap}
.bet{margin:18px 0;padding:17px 14px;border:2px solid #f4cba5;border-radius:23px;background:#fffcf6;color:#49362c;text-align:left}
.bet-q{display:flex;align-items:center;gap:10px;font:25px BetTitle,'Malgun Gothic',sans-serif;margin:0 0 15px}.bet-q small{font:12px 'Malgun Gothic',sans-serif;background:#f3e7d9;border-radius:99px;padding:4px 8px;color:#88694f}
.bet-chips,.bet-bottom{display:flex;flex-wrap:wrap;gap:7px}.bet-chip{flex:1;min-width:0;border:1px solid #bba28b;border-radius:99px;background:#fffcf8;color:#49362c;padding:11px 6px;font:600 13px 'Malgun Gothic',sans-serif;min-height:45px;cursor:pointer;touch-action:manipulation;line-height:1.4;white-space:normal}
.bet-chip[aria-pressed=true]{background:#ffdc78;border:2px solid #b18844;padding:10px 5px;color:#49362c}.bet-chip:focus-visible,.bet summary:focus-visible{outline:3px solid #f57562;outline-offset:3px}
.bet-bluff{margin-top:12px;background:linear-gradient(135deg,#f0e9fb,#faf3f9);border-radius:18px;padding:12px}.bet summary{cursor:pointer;font:22px BetTitle,'Malgun Gothic',sans-serif;list-style:none;color:#51394f;display:flex;justify-content:space-between;align-items:center;min-height:40px}.bet summary::-webkit-details-marker{display:none}.bet summary:after{content:'⌄';font:24px sans-serif}.bet details[open]>summary:after{content:'⌃'}.bet-bluff .bet-chips{display:grid;grid-template-columns:1fr 1fr;margin-top:9px;gap:8px}.bet-bluff .bet-chip[aria-pressed=true]{background:#ffe1d6;border-color:#fb735e;color:#7c3e31}.bet-bluff .bet-chip[aria-pressed=true]:after{content:' ✓';color:#d95641}
.bet-reaction{display:flex;align-items:center;gap:8px;margin-top:12px;min-height:65px}.bet-reaction p{flex:1;border-radius:17px;background:#ffe6dc;padding:12px 10px;margin:0;font:17px/1.45 BetTitle,'Malgun Gothic',sans-serif;word-break:keep-all}.bet-mascot{width:62px;height:77px;flex:none;background-image:url('https://noljago.co.kr/assets/art/game-characters.png');background-size:300% 100%;background-position:0 50%;background-repeat:no-repeat;mix-blend-mode:multiply;clip-path:inset(3%)}.game-page .bet-mascot{background-image:url('https://noljago.co.kr/assets/art/catalog-mascots.png');background-size:300% 600%;background-position:var(--mascot-x) var(--mascot-y)}body[data-game=ten] .bet-mascot{background-image:url('https://noljago.co.kr/assets/art/game-characters.png');background-size:300% 100%;background-position:50% 50%}
.bet-joke{font-size:10px;text-align:center;color:#937a94;margin:9px 0 0;line-height:1.6}.bet-bottom{margin-top:10px}.bet-summary{margin:12px 0 0;padding:12px 10px;background:#fff2cd;border-radius:13px;font-size:13px;line-height:1.6;text-align:center;word-break:keep-all}.bet-more{margin-top:10px}.bet .bet-more summary{font:12px 'Malgun Gothic',sans-serif;min-height:30px;color:#9a806b}.bet-more .bet-chips{margin-top:8px}.bet-more .bet-chip{flex:1 1 40%;font-size:12px}
.bet-input{box-sizing:border-box;width:100%;margin-top:9px;background:#fff;border:1px solid #c9b39b;color:#49362c;border-radius:12px;padding:12px;font:16px 'Malgun Gothic',sans-serif}.bet-input:focus{outline:2px solid #f57562}.bet-custom-label{font-size:12px;color:#8c725a;display:block;margin:10px 0 4px}
.bet-open{display:inline-block;background:#ffdf88;color:#49362c;border-radius:99px;padding:7px 14px;font-size:14px;font-weight:700;margin:0 0 12px}.bet-result{text-align:center;font-size:16px;font-weight:800;margin-top:8px;color:var(--ink,#49362c)}
.bet .hidden,.bet[hidden],.bet.hidden,.bet-open.hidden,.bet-result.hidden{display:none!important}@media(max-width:360px){.bet{padding:14px 10px}.bet-q{font-size:23px}.bet-chip{font-size:11px}.bet-bluff{padding:10px}.bet-reaction p{font-size:15px}}
`;
  let chipsEl=null,inputEl=null,current='',onChange=null,box=null;
  function mount(afterEl,cb){
    onChange=cb||null;if(chipsEl)return api;
    if(!document.getElementById('betStyle')){const st=document.createElement('style');st.id='betStyle';st.textContent=CSS;document.head.appendChild(st);}
    box=document.createElement('section');box.id='betBox';box.className='bet';box.setAttribute('aria-label','이번 판 내기 선택');
    box.innerHTML='<h2 class="bet-q">이번 판, 뭐 걸까? <small>선택</small></h2><div id="betChips" class="bet-chips" role="group" aria-label="가벼운 내기"></div><details class="bet-bluff"><summary>판 키우기 😈</summary><div id="betBluffChips" class="bet-chips" role="group" aria-label="허세 내기"></div><div class="bet-reaction"><span class="bet-mascot" aria-hidden="true"></span><p id="betReaction" role="status" aria-live="polite">어디까지 걸 자신 있어?</p></div><p class="bet-joke">허세 내기 · 진지하게 받아들이면 반칙</p></details><div id="betBottom" class="bet-bottom" role="group" aria-label="내기 해제 또는 직접 입력"></div><label for="betCustom" id="betCustomLabel" class="bet-custom-label hidden">무엇을 걸까? · 12자까지</label><input id="betCustom" class="bet-input hidden" maxlength="12" placeholder="우리만의 내기를 적어줘"><p id="betSummary" class="bet-summary" role="status" aria-live="polite">내기 없이 가볍게 한판!</p><details class="bet-more"><summary>다른 내기도 보기</summary><div id="betMore" class="bet-chips" role="group" aria-label="다른 내기"></div></details>';
    const details=afterEl.closest('details');if(details)details.before(box);else afterEl.after(box);
    chipsEl=box.querySelector('#betChips');inputEl=box.querySelector('#betCustom');
    function button(parent,value,label){const b=document.createElement('button');b.type='button';b.className='bet-chip';b.dataset.bet=value;b.textContent=label;b.setAttribute('aria-pressed','false');b.onclick=()=>pick(value);box.querySelector(parent).append(b);}
    button('#betChips','커피 한 잔','☕ 커피 한 잔');button('#betChips','점심','🍚 밥 한 끼');button('#betChips','업어주기','🙌 업어주기');
    EXTRAS.filter(p=>p.bluff).forEach(p=>button('#betBluffChips',p.label,p.emoji+' '+p.label));
    button('#betBottom','','그냥 하기');button('#betBottom','__custom__','+ 직접 입력');
    PRESETS.filter(p=>!['커피 한 잔','점심'].includes(p.label)).forEach(p=>button('#betMore',p.label,p.emoji+' '+p.label));
    inputEl.oninput=()=>{current=inputEl.value.trim().slice(0,MAXLEN);paint();fire();};paint();return api;
  }
  function custom(on){inputEl.classList.toggle('hidden',!on);box.querySelector('#betCustomLabel').classList.toggle('hidden',!on);}
  function pick(label){
    if(label==='__custom__'){const on=inputEl.classList.contains('hidden');custom(on);current=on?inputEl.value.trim().slice(0,MAXLEN):'';if(on)inputEl.focus();else inputEl.value='';}
    else{custom(false);inputEl.value='';current=current===label?'':label;}
    paint();fire();
  }
  function paint(){
    if(!box)return;const customOn=!inputEl.classList.contains('hidden');
    box.querySelectorAll('[data-bet]').forEach(b=>{const v=b.dataset.bet;b.setAttribute('aria-pressed',String(v==='__custom__'?customOn:!customOn&&v===current));});
    const p=of(current);box.querySelector('#betReaction').textContent=p?.bluff?p.reaction:'어디까지 걸 자신 있어?';
    box.querySelector('#betSummary').textContent=!current?'내기 없이 가볍게 한판!':p?.bluff?`${p.emoji} ${current} 걸었어! · 마음으로만 거는 허세 내기`:current==='커피 한 잔'?'☕ 진 사람이 커피 한 잔 사기':current==='점심'?'🍚 진 사람이 밥 한 끼 사기':current==='업어주기'?'🙌 진 사람이 업어주기':`${emoji(current)} 이번 판 내기: ${current}`;
  }
  function fire() { if (onChange) try { onChange(current); } catch (e) { } }

  function get() { return current; }
  function set(v){
    current=valid(v)?String(v).slice(0,MAXLEN):'';if(!box)return;
    custom(!!current&&!of(current));inputEl.value=!of(current)?current:'';
    if(of(current)?.bluff)box.querySelector('.bet-bluff').open=true;
    if(PRESETS.some(p=>p.label===current)&&!['커피 한 잔','점심'].includes(current))box.querySelector('.bet-more').open=true;
    paint();
  }

  const api = { PRESETS, MAXLEN, mount, get, set, of, valid, emoji, tag, subj,
                titlePrefix, openLine, resultLine, put, read, gaParams };
  window.Bet = api;
})();
