/* 같이해봐 — 기록 대결 공통 엔진
   사용: <script src="../../assets/duel-engine.js"></script>  (게임 스크립트보다 먼저)

   기록 대결 5종(10초 맞추기·반응속도·1에서 25까지·두더지 잡기·10초 연타)이
   똑같이 갖고 있던 부분을 한곳에 모았다.

     · 도전장 만들기 / 봉인(lockNum) / 링크 인코딩(#c= #r=)
     · 내기 걸기(선택) — assets/bet.js 를 먼저 읽어 둘 것
     · 플레이어 id, 이름 저장(gh_name), 조사 헬퍼(subj·topic·objp)
     · 전적 계산(tallyOf) · 이력 표시(histRows) · 재도전(startNext)
     · 결과 화면 그리기 · 카톡 공유 붙이기 · 진입 분기

   게임 파일에는 "플레이 화면" 로직만 남는다.
   플레이가 끝나면 기록 값을 Duel.finish(값) 으로 넘기면 된다.

   ── 쓰는 법 ─────────────────────────────────────────────
     const state = Duel.setup({ ...설정... });   // state 를 돌려준다
     ... 플레이 화면 코드 ($ · esc · show · toast · copy · track 그대로 쓸 수 있음)
     function finishPlay(){ ...화면 정리...; Duel.finish(기록값); }
     Duel.start();                               // 맨 끝에서 진입 분기

   ── 설정(cfg) ───────────────────────────────────────────
     deployBase   배포 주소 (샌드박스에서 링크를 만들 때 쓴다)
     og           카톡 공유 정사각 이미지 주소
     gameName     "10초 맞추기" — 도전장 카톡 제목에 들어간다
     next         [{path,title,desc}] 결과 화면 아래 "다음은 이거 어때?"
     higherWins   true 면 큰 값이 이긴다 (두더지·연타). 기본 false
     metric(v)    비교용 값으로 바꾼다. 기본 v 그대로 (10초 맞추기는 |v-10000|)
     hasSeed      링크에 시드(s)를 싣는다 (같은 판을 공유하는 게임)
     lockOffset   봉인 전에 더할 값 (점수가 음수가 될 수 있는 두더지용)
     linkExtra()  #c= 에 더 실을 필드. 키 순서가 링크 바이트에 그대로 남는다
     roundExtra(p) 이력 한 줄에 덧붙일 값 [상대분, 내분]
     extraKey/extraDefault  위 덧붙인 값을 결과 화면에서 꺼낼 이름·기본값
     titleFor(v)  결과 칭호
     recordCell(x) 결과 큰 숫자 칸 innerHTML
     detailCell(x) 결과 작은 설명 칸 innerHTML
     histRow(r,isA,i) 이력 한 줄
     verdictText(o)   승패 한 줄
     subVerdictText(o,me,them,meL,themL) 승패 설명 한 줄
     challengeHead(p) 도전장을 받았을 때 제목
     againHead()      재도전할 때 제목
     challengeDesc    도전장 카톡 설명 (첫 판)
     resultTitle(me,them,tail) / resultDesc  결과 카톡
     scrollToShare    봉인 후 공유 영역으로 스크롤할지
     onInit()      진입할 때 (해시 읽기 전) 한 번
     newRound()    새 판을 만들 때 (첫 진입·재도전)
     resetPlay()   재도전할 때 플레이 화면 되돌리기
     onOpenChallenge(p) 도전장을 열었을 때 (같은 판 복원)                 */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  /* ===== 이름 뒤 조사 =====
     "나"는 "내가", "상대"는 받침이 없어 가/는/를 로 확정된다.
     그 밖의 이름은 마지막 글자 받침을 보고 고른다. */
  const JOSA = { "나": ["내가", "나는", "나를"], "상대": ["상대가", "상대는", "상대를"] };
  const hasJong = s => {
    const t = String(s);
    const c = t.charCodeAt(t.length - 1);
    return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0;
  };
  const subj  = l => JOSA[l] ? JOSA[l][0] : l + (hasJong(l) ? "이"   : "가");
  const topic = l => JOSA[l] ? JOSA[l][1] : l + (hasJong(l) ? "은"   : "는");
  const objp  = l => JOSA[l] ? JOSA[l][2] : l + (hasJong(l) ? "을"   : "를");
  /* 이름만 굵게 그리고 조사는 밖에 둘 때 쓰는 조사 조각.
     "나"는 조사와 붙어 "내가" 로 모양이 바뀌어 쪼갤 수 없으므로
     여기에는 이름이나 "상대" 만 넣는다. */
  const subjTail = l => hasJong(l) ? "이" : "가";

  /* ===== 봉인 · 해시 ===== */
  function lockNum(v) { const k = Math.floor(Math.random() * 0xFFFF); return { k, x: (v + k * 7) % 1000003 }; }
  function unlockNum(k, x) { let v = (x - k * 7) % 1000003; if (v < 0) v += 1000003; return v; }
  function b64e(s) { const b = new TextEncoder().encode(s); let x = ""; b.forEach(c => x += String.fromCharCode(c)); return btoa(x).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - s.length % 4) % 4); const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new TextDecoder().decode(u); }
  function readHash() { const m = location.hash.match(/^#([cr])=(.+)$/); if (!m) return null; try { return { type: m[1], p: JSON.parse(b64d(m[2])) }; } catch (e) { return null; } }

  /* ===== 화면 공통 ===== */
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function show(id) { document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden")); $(id).classList.remove("hidden"); window.scrollTo(0, 0); }
  let tt;
  function toast(m) { const e = $("toast"); e.textContent = m; e.style.opacity = "1"; e.style.transform = "translate(-50%,0)"; clearTimeout(tt); tt = setTimeout(() => { e.style.opacity = "0"; e.style.transform = "translate(-50%,20px)"; }, 2400); }
  async function copy(url, ok) { let d = false; try { await navigator.clipboard.writeText(url); d = true; } catch (e) { const ta = document.createElement("textarea"); ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { d = document.execCommand("copy"); } catch (e2) { } ta.remove(); } toast(d ? ok : "링크를 길게 눌러 복사해줘"); }
  const track = (e, p) => { try { window.track && window.track(e, p); } catch (x) { } };

  /* ===== 이름(선택) · 플레이어 식별자 ===== */
  /* 이름은 안 적어도 된다. 링크에는 빈 문자열 그대로 싣고,
     화면에 그릴 때만 보는 사람 기준으로 "나"/"상대" 를 채운다.
     여러 판 전적은 이름 대신 링크에 실린 짧은 무작위 id 로 구분한다.
     (localStorage 에는 이름만 저장한다. 기록·전적은 저장하지 않는다.) */
  const NAME_KEY = "gh_name";
  function loadName() { try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; } }
  function saveName(v) { try { localStorage.setItem(NAME_KEY, v); } catch (e) { } }
  function rid() { return Math.random().toString(36).slice(2, 8); }
  const who = (nm, isMe) => nm || (isMe ? "나" : "상대");

  /* 이력 한 줄에서 내가 a쪽인지 판정. 새 링크는 id로, 옛 링크는 이름으로. */
  function meIsA(r, meId, meName) {
    const ai = r[4], bi = r[5];
    if (meId) { if (ai === meId) return true; if (bi === meId) return false; }
    return r[0] === meName;
  }
  /* 상대 id를 알 때 이력에서 내 id를 되찾는다. 첫 판이면 빈 문자열. */
  function myIdFrom(hist, theirId) {
    for (const r of hist) {
      const ai = r[4], bi = r[5];
      if (ai && bi) { if (ai === theirId) return bi; if (bi === theirId) return ai; }
    }
    return "";
  }

  /* 게임 파일이 그대로 쓰던 이름들 — 전역에 그대로 둔다 */
  Object.assign(window, {
    $, esc, show, toast, copy, track,
    lockNum, unlockNum, b64e, b64d, readHash,
    loadName, saveName, rid, who, subj, topic, objp, subjTail, hasJong,
    meIsA, myIdFrom
  });

  /* ===================================================================== */

  const Duel = {};

  Duel.setup = function (cfg) {
    const metric = cfg.metric || (v => v);
    const better = (a, b) => cfg.higherWins ? a > b : a < b;

    /* hist: [[aName, a기록, bName, b기록, aId, bId, (a덧, b덧)], ...] */
    const state = {
      name: "", id: "", theirId: "", ms: null, bet: "",
      hist: [], incoming: null
    };
    if (cfg.state) Object.assign(state, cfg.state);

    const isSandbox = () => !(/^https?:$/.test(location.protocol) && location.origin && location.origin !== "null");
    const baseUrl = () => isSandbox() ? cfg.deployBase : location.origin + location.pathname;
    window.isSandbox = isSandbox;
    window.baseUrl = baseUrl;

    /* ── 전적 ── */
    function tallyOf(hist, meId, meName) {
      let w = 0, l = 0, t = 0;
      hist.forEach(r => {
        const isA = meIsA(r, meId, meName);
        const mine = metric(isA ? r[1] : r[3]), theirs = metric(isA ? r[3] : r[1]);
        if (better(mine, theirs)) w++; else if (better(theirs, mine)) l++; else t++;
      });
      return { w, l, t };
    }
    function histRows(hist, meId, meName) {
      return hist.map((r, i) => cfg.histRow(r, meIsA(r, meId, meName), i)).join("<br>");
    }
    const tallyLine = t => `${t.w}승 ${t.l}패${t.t ? ` ${t.t}무` : ""}`;

    /* ── 도전장 링크 ──
       키 순서가 링크 바이트에 그대로 남는다. 이미 뿌린 링크와 같은 순서를 지킬 것. */
    let madeUrl = "";
    function makeLink() {
      const { k, x } = lockNum(state.ms + (cfg.lockOffset || 0));
      const pay = { v: 1, n: state.name, i: state.id };
      if (cfg.hasSeed) pay.s = state.seed;
      pay.k = k; pay.x = x;
      if (cfg.linkExtra) Object.assign(pay, cfg.linkExtra(state));
      Bet.put(pay, state.bet);
      pay.h = state.hist;
      madeUrl = baseUrl() + "#c=" + b64e(JSON.stringify(pay));
      $("linkbox").textContent = madeUrl;
      $("sandboxNote").classList.toggle("hidden", !isSandbox());
      track("link_made", Bet.gaParams(state.bet));
      return madeUrl;
    }

    $("copyBtn").onclick = () => copy(madeUrl, "복사됐어. 카톡에 붙여넣어");
    /* 도전장 카톡 버튼 */
    if (cfg.shareChallenge !== false) {
      $("kakaoBtn").onclick = () => kakaoShare({
        url: madeUrl, btn: "도전 받기", img: cfg.og,
        title: `${Bet.titlePrefix(state.bet)}${state.name ? state.name + "의 " : ""}${cfg.gameName} 도전장 🔒`,
        desc: state.hist.length ? `${state.hist.length + 1}판째. 전적이 같이 실려 있어.` : cfg.challengeDesc
      }, () => copy(madeUrl, "카톡 공유를 못 열어 링크를 복사했어"));
    }

    /* ── 도전장 받기 ── */
    function openChallenge(p) {
      state.incoming = p; state.hist = p.h || [];
      state.bet = Bet.read(p);                    // 내기는 도전한 쪽이 정한다
      state.theirId = p.i || ""; state.id = myIdFrom(state.hist, state.theirId) || state.id || rid();
      if (cfg.onOpenChallenge) cfg.onOpenChallenge(p);
      $("playTag").textContent = "도전장 도착";
      $("playHead").innerHTML = cfg.challengeHead(p);
      betOpen(state.bet);
      $("betBox").classList.add("hidden");        // 받는 쪽은 내기를 바꿀 수 없다
      $("lockName").textContent = p.n || "상대";
      $("lockedCard").classList.remove("hidden");
      if (state.hist.length) {
        $("tallyText").innerHTML = `<b>지금까지 ${state.hist.length}판</b><br>${histRows(state.hist, state.id, state.name)}`;
        $("tallyCard").classList.remove("hidden");
      }
      show("s-play");
    }

    /* ── 응답 ── */
    function respond() {
      const p = state.incoming;
      const theirV = unlockNum(p.k, p.x) - (cfg.lockOffset || 0);
      const round = [p.n, theirV, state.name, state.ms, p.i || "", state.id];
      if (cfg.roundExtra) round.push.apply(round, cfg.roundExtra(p, state));
      renderResult({ hist: [...state.hist, round], round, viewer: "b" });
    }

    /* ── 결과 ── */
    function renderResult(R) {
      const [aN, aV, bN, bV, aId, bId] = R.round;
      const isB = R.viewer === "b";
      const meId = isB ? (bId || "") : (aId || "");
      const me = { n: isB ? bN : aN, v: isB ? bV : aV };
      const them = { n: isB ? aN : bN, v: isB ? aV : bV };
      if (cfg.extraKey) {
        const aX = R.round[6], bX = R.round[7];
        me[cfg.extraKey] = (isB ? bX : aX) || cfg.extraDefault;
        them[cfg.extraKey] = (isB ? aX : bX) || cfg.extraDefault;
      }
      const meL = who(me.n, true), themL = who(them.n, false);
      const em = metric(me.v), et = metric(them.v);
      const o = better(em, et) ? "win" : (better(et, em) ? "lose" : "tie");

      $("nameA").textContent = me.n ? me.n + " (나)" : "나";
      $("tA").innerHTML = cfg.recordCell(me);
      $("dA").innerHTML = cfg.detailCell(me, em);
      $("nameB").textContent = themL;
      $("tB").innerHTML = cfg.recordCell(them);
      $("dB").innerHTML = cfg.detailCell(them, et);
      $("sideA").className = "side " + (o === "win" ? "win" : o === "lose" ? "lose" : "");
      $("sideB").className = "side " + (o === "lose" ? "win" : o === "win" ? "lose" : "");
      $("verdict").className = "verdict " + o;
      $("verdict").textContent = cfg.verdictText(o);
      $("subVerdict").textContent = cfg.subVerdictText(o, me, them, meL, themL, em, et);
      /* 내기 결과는 진 쪽 기준. 보는 사람이 졌으면 이름이 있어도 "내가".
         카톡 카드는 상대가 읽으므로 "내가"의 기준을 받는 사람(도전한 쪽)으로 뒤집는다. */
      const betNow = R.bet !== undefined ? R.bet : state.bet;
      const betLoser = o === "win" ? them.n : me.n;
      const betLine = Bet.resultLine(betNow, betLoser, o === "lose", o === "tie");
      const betCard = Bet.resultLine(betNow, betLoser, o === "win", o === "tie");
      $("betResult").textContent = betLine;
      $("betResult").classList.toggle("hidden", !betLine);
      $("titleBadge").textContent = "🏅 " + cfg.titleFor(em);
      $("resTag").textContent = `${R.hist.length}판 결과`;

      if (R.hist.length > 1) {
        const t = tallyOf(R.hist, meId, me.n);
        $("tallyBox").innerHTML = `전적<div class="big"><b>${t.w}승</b> ${t.l}패${t.t ? ` ${t.t}무` : ""}</div><div class="rows">${histRows(R.hist, meId, me.n)}</div>`;
        $("tallyBox").classList.remove("hidden");
      } else $("tallyBox").classList.add("hidden");

      ["respActions", "viewActions", "resLinkbox", "notYet"].forEach(id => $(id).classList.add("hidden"));
      if (isB) {
        $("respActions").classList.remove("hidden"); $("notYet").classList.remove("hidden");
        const rurl = baseUrl() + "#r=" + b64e(JSON.stringify(Bet.put({ v: 1, h: R.hist }, betNow)));
        $("sendResult").onclick = () => { $("resLinkbox").textContent = rurl; copy(rurl, "결과 링크 복사됐어. 상대에게 보내"); };
        {
          const nm = n => n ? n + " " : "";
          const wn = o === "tie" ? null : (o === "win" ? me.n : them.n);
          const tail = o === "tie" ? " — 무승부" : (wn ? ` — ${wn} 승` : "");
          $("kakaoRes").onclick = () => kakaoShare({
            url: rurl, btn: "결과 보기", img: cfg.og,
            title: cfg.resultTitle(me, them, tail, nm),
            desc: betCard || cfg.resultDesc
          }, () => copy(rurl, "카톡 공유를 못 열어 링크를 복사했어"));
        }
        $("again").onclick = () => startNext(R.hist, bN, bId || "");
      } else {
        $("viewActions").classList.remove("hidden");
        $("again2").onclick = () => startNext(R.hist, aN, aId || "");
      }
      $("nextList").innerHTML = cfg.next.map(n => `<a href="${n.path}">${esc(n.title)}<small>${esc(n.desc)}</small></a>`).join("");
      show("s-result");
    }

    /* ── 재도전 ── */
    function startNext(hist, myName, myId) {
      state.hist = hist; state.name = myName; state.id = myId || rid();
      state.ms = null; state.incoming = null;
      if (cfg.newRound) cfg.newRound();
      $("nameIn").value = myName;
      Bet.set(state.bet);                          // 지난 판 내기를 채워 두고 바꿀 수 있게
      $("betBox").classList.remove("hidden");
      betOpen("");
      $("lockedCard").classList.add("hidden");
      $("playTag").textContent = `${hist.length + 1}판째`;
      $("playHead").innerHTML = cfg.againHead();
      $("playLead").textContent = "이 도전장에 지금까지 전적이 같이 실려.";
      const t = tallyOf(hist, state.id, myName);
      $("tallyText").innerHTML = `<b>전적 ${tallyLine(t)}</b><br>${histRows(hist, state.id, myName)}`;
      $("tallyCard").classList.remove("hidden");
      $("afterPlay").classList.add("hidden");
      if (cfg.resetPlay) cfg.resetPlay();
      history.replaceState(null, "", location.pathname);
      show("s-play");
    }

    /* ── 플레이가 끝났을 때 게임이 부르는 곳 ── */
    Duel.finish = function (value, extra) {
      state.ms = value;
      if (extra) Object.assign(state, extra);
      if (state.incoming) { setTimeout(() => respond(), 600); return; }
      makeLink();
      $("afterPlay").classList.remove("hidden");
      if (cfg.scrollToShare) $("afterPlay").scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    /* ── 진입 분기 ── */
    Duel.start = function () {
      state.id = rid();
      state.name = loadName(); $("nameIn").value = state.name;
      if (cfg.onInit) cfg.onInit();
      const h = readHash();
      if (h && h.type === "c" && h.p && typeof h.p.k === "number" && (!cfg.hasSeed || typeof h.p.s === "number")) { openChallenge(h.p); return; }
      if (h && h.type === "r" && h.p && Array.isArray(h.p.h) && h.p.h.length) {
        state.bet = Bet.read(h.p);
        renderResult({ hist: h.p.h, round: h.p.h[h.p.h.length - 1], viewer: "a", bet: state.bet }); return;
      }
      if (cfg.newRound) cfg.newRound();
      show("s-play");
    };

    /* 이름 칸은 여섯 게임이 똑같이 쓴다 */
    $("nameIn").oninput = e => { state.name = e.target.value.trim(); saveName(state.name); };

    /* 내기 자리 — 이름 칸 바로 아래 */
    Bet.mount($("nameIn"), v => { state.bet = v; });
    /* 도전장 열기 화면 한 줄 (헤드라인 아래) */
    const bo = document.createElement("p");
    bo.className = "bet-open hidden"; bo.id = "betOpen";
    $("playHead").parentNode.insertBefore(bo, $("playHead").nextSibling);
    /* 결과 화면 내기 결과 (승자 문구 다음 줄) */
    const br = document.createElement("p");
    br.className = "bet-result hidden"; br.id = "betResult";
    $("subVerdict").parentNode.insertBefore(br, $("subVerdict").nextSibling);
    function betOpen(b) {
      const line = Bet.openLine(b);
      $("betOpen").textContent = line;
      $("betOpen").classList.toggle("hidden", !line);
    }

    /* 게임 쪽에서 필요할 때 쓸 수 있게 열어 둔다 */
    Duel.state = state;
    Duel.tallyOf = tallyOf;
    Duel.histRows = histRows;
    Duel.makeLink = makeLink;
    Duel.respond = respond;
    Duel.renderResult = renderResult;
    Duel.startNext = startNext;
    Duel.url = () => madeUrl;

    return state;
  };

  window.Duel = Duel;
})();
