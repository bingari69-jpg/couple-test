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
    return PRESETS.find(p => p.label === b) || null;
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
    return valid(b) ? `이기면 ${b}!` : "";
  }
  /* ── 노출 3. 결과 화면 내기 결과 ──
     진 쪽을 기준으로 쓴다. 보는 사람이 진 쪽이면 이름이 있어도 "내가". */
  function resultLine(b, loserName, loserIsMe, tie) {
    if (!valid(b)) return "";
    if (tie) return "무승부 — 내기는 다음 판으로";
    const label = loserIsMe ? "나" : (loserName || "상대");
    const p = of(b);
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
.bet{margin-top:14px}
.bet-q{font-size:14px;color:var(--sub,#777);font-weight:600;margin-bottom:8px}
.bet-chips{display:flex;flex-wrap:wrap;gap:7px}
.bet-chip{background:var(--card,transparent);border:2px solid var(--line,#4443);
  color:var(--sub,#777);border-radius:999px;padding:8px 13px;font:inherit;font-size:13.5px;
  font-weight:700;cursor:pointer;transition:background .15s,color .15s,border-color .15s;
  -webkit-tap-highlight-color:transparent}
.bet-chip[aria-pressed=true]{background:#FFC94D;border-color:#FFC94D;color:#1F1B16}
.bet-chip:focus-visible{outline:2px solid #FFC94D;outline-offset:2px}
.bet-input{width:100%;margin-top:8px;background:var(--card,transparent);
  border:2px solid var(--line,#4443);color:var(--ink,inherit);border-radius:12px;
  padding:11px 13px;font:inherit;font-size:15px;font-weight:700}
.bet-input::placeholder{color:var(--dim,#999);font-weight:500}
.bet-input:focus{outline:none;border-color:#FFC94D}
.bet-input.hidden{display:none}
/* 도전장 열기 화면 한 줄 · 결과 화면 내기 결과 — 밝은 배경·어두운 배경 모두에서 읽히게 */
.bet-open{display:inline-block;background:#FFC94D;color:#1F1B16;border-radius:999px;
  padding:6px 14px;font-size:14.5px;font-weight:800;margin:0 0 12px}
.bet-result{text-align:center;font-size:16px;font-weight:800;margin-top:8px;color:var(--ink,inherit)}
.bet-open.hidden,.bet-result.hidden,.bet.hidden{display:none}
`;

  let chipsEl = null, inputEl = null, current = "", onChange = null;

  function mount(afterEl, cb) {
    onChange = cb || null;
    if (chipsEl) return api;                       // 한 번만 만든다
    if (!document.getElementById("betStyle")) {
      const st = document.createElement("style");
      st.id = "betStyle"; st.textContent = CSS;
      document.head.appendChild(st);
    }
    const box = document.createElement("div");
    box.className = "bet"; box.id = "betBox";
    box.innerHTML = '<div class="bet-q">내기 걸기 (선택)</div>'
      + '<div class="bet-chips" id="betChips" role="group" aria-label="내기 걸기"></div>'
      + '<input type="text" id="betCustom" class="bet-input hidden" maxlength="' + MAXLEN + '" placeholder="무엇을 걸까? (' + MAXLEN + '자)">';
    afterEl.parentNode.insertBefore(box, afterEl.nextSibling);

    chipsEl = box.querySelector("#betChips");
    inputEl = box.querySelector("#betCustom");

    PRESETS.forEach(p => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "bet-chip";
      b.textContent = p.emoji + " " + p.label;
      b.dataset.bet = p.label;
      b.setAttribute("aria-pressed", "false");
      b.onclick = () => pick(p.label);            // 다시 누르면 해제
      chipsEl.appendChild(b);
    });
    const c = document.createElement("button");
    c.type = "button"; c.className = "bet-chip";
    c.textContent = CUSTOM_EMOJI + " 직접 입력";
    c.dataset.bet = "__custom__";
    c.setAttribute("aria-pressed", "false");
    c.onclick = () => pick("__custom__");
    chipsEl.appendChild(c);

    inputEl.oninput = () => { current = inputEl.value.trim().slice(0, MAXLEN); fire(); };
    return api;
  }

  function pick(label) {
    if (label === "__custom__") {
      const on = inputEl.classList.contains("hidden");
      if (on) { inputEl.classList.remove("hidden"); current = inputEl.value.trim(); inputEl.focus(); }
      else { inputEl.classList.add("hidden"); inputEl.value = ""; current = ""; }
    } else {
      inputEl.classList.add("hidden"); inputEl.value = "";
      current = (current === label) ? "" : label;   // 같은 칩을 다시 누르면 해제
    }
    paint(); fire();
  }
  function paint() {
    if (!chipsEl) return;
    const customOn = !inputEl.classList.contains("hidden");
    [...chipsEl.children].forEach(b => {
      const v = b.dataset.bet;
      b.setAttribute("aria-pressed", v === "__custom__" ? String(customOn) : String(v === current));
    });
  }
  function fire() { if (onChange) try { onChange(current); } catch (e) { } }

  function get() { return current; }
  function set(v) {
    current = valid(v) ? String(v).slice(0, MAXLEN) : "";
    if (!chipsEl) return;
    if (current && !PRESETS.some(p => p.label === current)) {
      inputEl.classList.remove("hidden"); inputEl.value = current;   // 승계된 직접 입력
    } else {
      inputEl.classList.add("hidden"); inputEl.value = "";
    }
    paint();
  }

  const api = { PRESETS, MAXLEN, mount, get, set, of, valid, emoji, tag, subj,
                titlePrefix, openLine, resultLine, put, read, gaParams };
  window.Bet = api;
})();
