/* 가위바위보(t/rps) 골든 시나리오
   기록 대결과 화면 구조가 달라 따로 둔다. test/scenarios.js 가 불러 쓴다.

   손: 0 가위 · 1 바위 · 2 보   (바위>가위, 가위>보, 보>바위) */
const { load, el, txt, htm, cls, hid, grabKakao, b64e } = require("./dom");

const G = "rps";

/* 도전장 만들기 화면 */
function snapMake(w) {
  return {
    makeLead: txt(w, "makeLead"),
    tieNote: htm(w, "tieNote"),
    tieNoteHidden: hid(w, "tieNote"),
    tieHist: htm(w, "tieHist"),
    nameIn: el(w, "nameIn").value,
    betBoxHidden: hid(w, "betBox"),
    betPressed: w.__ev(`[...document.querySelectorAll(".bet-chip")].filter(function(b){return b.getAttribute("aria-pressed")==="true";}).map(function(b){return b.dataset.bet;})`),
    betCustom: el(w, "betCustom").value,
    stateBet: w.__ev("state.bet"),
    stateRv: w.__ev("state.rv"),
    histLen: w.__ev("state.hist.length"),
    _screen: { make: hid(w, "s-make"), open: hid(w, "s-open"), result: hid(w, "s-result") },
  };
}
/* 도전장 열기 화면 */
function snapOpen(w) {
  return {
    openName: txt(w, "openName"),
    openMsg: txt(w, "openMsg"),
    openRounds: htm(w, "openRounds"),
    betOpen: txt(w, "betOpen"),
    betOpenHidden: hid(w, "betOpen"),
    betBoxHidden: hid(w, "betBox"),
    stateBet: w.__ev("state.bet"),
    _screen: { make: hid(w, "s-make"), open: hid(w, "s-open"), result: hid(w, "s-result") },
  };
}
/* 결과 화면 */
function snapResult(w) {
  const o = {};
  ["resTag", "handA", "nameA", "handB", "nameB", "verdict", "subVerdict",
   "betResult", "titleBadge", "lieBox"].forEach(id => { o[id] = htm(w, id); });
  o._cls = { sideA: cls(w, "sideA"), sideB: cls(w, "sideB"), verdict: cls(w, "verdict") };
  o._hidden = {};
  ["betResult", "titleBadge", "lieBox", "notYet",
   "tieActions", "doneActions", "viewActions", "resLinkbox"].forEach(id => { o._hidden[id] = hid(w, id); });
  o._screen = { make: hid(w, "s-make"), open: hid(w, "s-open"), result: hid(w, "s-result") };
  return o;
}

/* 도전장을 하나 만든다. bet 은 칩을 실제로 눌러서 고른다. */
function makeChallenge(w, { name, hand, msg, bet, custom }) {
  if (bet === "__custom__") {
    w.__ev(`document.querySelector('[data-bet="__custom__"]').click();
            document.getElementById("betCustom").value=${JSON.stringify(custom)};
            document.getElementById("betCustom").dispatchEvent(new window.Event("input"));`);
  } else if (bet) {
    w.__ev(`document.querySelector('[data-bet=${JSON.stringify(bet)}]').click();`);
  }
  w.__ev(`Math.random=function(){return 0.5;};
          document.getElementById("nameIn").value=${JSON.stringify(name)};
          document.getElementById("nameIn").dispatchEvent(new window.Event("input"));
          state.id="abc123";
          [...document.getElementById("makeHands").children][${hand}].click();
          [...document.getElementById("msgChips").children][${msg || 0}].click();
          document.getElementById("makeBtn").click();`);
  return w.__ev("madeUrl");
}

/* 도전장을 열고 손을 골라 결과까지 간다. 카운트다운은 타이머라 바로 앞질러 부른다. */
function respondWith(w, { name, hand }) {
  w.__ev(`Math.random=function(){return 0.5;};
          document.getElementById("myNameIn").value=${JSON.stringify(name)};
          state.id="zzz999";
          (function(){
            var p=state.incoming, theirHand=unlockHand(p.k,p.x);
            var round=[p.n, theirHand, ${hand}, p.m, p.i||"", state.id];
            renderResult({ hist:[...(p.h||[]), round], rv:p.rv||0,
              cName:p.n, rName:${JSON.stringify(name)}, cId:p.i||"", rId:state.id,
              cHand:theirHand, rHand:${hand}, cMsg:p.m||0, viewer:"responder" });
          })();`);
}

function run() {
  const out = {};
  const hashOf = u => u.slice(u.indexOf("#"));

  /* 1. 첫 진입 */
  {
    const w = load(G).window;
    out.entry_fresh = snapMake(w);
    w.close();
  }

  /* 2. 내기 낱말이 기록 대결과 같은지 (같은 assets/bet.js 를 쓴다) */
  {
    const w = load(G).window;
    out.bet_words = w.__ev(`({
      lunch:{title:Bet.titlePrefix("점심"), open:Bet.openLine("점심"),
             loseThem:Bet.resultLine("점심","민수",false,false),
             loseMe:Bet.resultLine("점심","지은",true,false),
             tie:Bet.resultLine("점심","",false,true)},
      custom:{title:Bet.titlePrefix("노래방"), line:Bet.resultLine("노래방","민수",false,false)},
      read:[Bet.read({b:"점심"}),Bet.read({b:""}),Bet.read({}),Bet.read({b:0})]
    })`);
    w.close();
  }

  /* 3. 도전장 링크 — 이름 있음 / 없음 / 내기 있음 / 직접 입력 */
  const urls = {};
  [["named", { name: "지은", hand: 0, msg: 1 }],
   ["noname", { name: "", hand: 1, msg: 0 }],
   ["bet", { name: "지은", hand: 0, msg: 0, bet: "점심" }],
   ["betCustom", { name: "지은", hand: 2, msg: 0, bet: "__custom__", custom: "노래방" }],
  ].forEach(([key, opt]) => {
    const w = load(G).window;
    const u = makeChallenge(w, opt);
    urls[key] = u;
    out["link_" + key] = { url: u, linkbox: txt(w, "linkbox") };
    out["kakao_" + key] = grabKakao(w, "kakaoBtn");
    w.close();
  });

  /* 4. 도전장 열기 — 이름 있음 / 없음 / 내기 */
  ["named", "noname", "bet"].forEach(key => {
    const w = load(G, hashOf(urls[key])).window;
    out["open_" + key] = snapOpen(w);
    w.close();
  });

  /* 5. 결과 — 도전자 승 / 응답자 승 / 무승부 (도전자는 가위) */
  {
    /* 5-1. 응답자가 보(2) → 가위가 이김 = 도전자 승 */
    const w = load(G, hashOf(urls.named)).window;
    respondWith(w, { name: "민수", hand: 2 });
    out.result_challenger_wins = snapResult(w);
    out.kakao_result_cwin = grabKakao(w, "kakaoRes");
    el(w, "sendResult").click();
    out.result_url_cwin = txt(w, "resLinkbox");
    w.close();
  }
  {
    /* 5-2. 응답자가 바위(1) → 가위를 이김 = 응답자 승 */
    const w = load(G, hashOf(urls.named)).window;
    respondWith(w, { name: "민수", hand: 1 });
    out.result_responder_wins = snapResult(w);
    el(w, "sendResult").click();
    out.result_url_rwin = txt(w, "resLinkbox");
    /* 복수전 승계 */
    el(w, "revenge").click();
    out.revenge_next = snapMake(w);
    out.revenge_link = { url: makeChallenge(w, { name: "민수", hand: 1, msg: 0 }) };
    w.close();
  }
  {
    /* 5-3. 같은 가위(0) → 무승부, 비긴 판 이어가기 */
    const w = load(G, hashOf(urls.named)).window;
    respondWith(w, { name: "민수", hand: 0 });
    out.result_tie = snapResult(w);
    el(w, "tieNext").click();
    out.tie_next = snapMake(w);
    out.tie_next_link = { url: makeChallenge(w, { name: "민수", hand: 1, msg: 0 }) };
    w.close();
  }

  /* 6. 내기가 걸린 판 — 승/패/무 문구와 카톡 카드 */
  {
    const w = load(G, hashOf(urls.bet)).window;
    respondWith(w, { name: "민수", hand: 2 });          // 도전자 승 = 응답자가 짐
    out.bet_result_lose = { verdict: txt(w, "verdict"), betResult: txt(w, "betResult") };
    out.bet_kakao_result = grabKakao(w, "kakaoRes");
    el(w, "sendResult").click();
    const ru = txt(w, "resLinkbox");
    out.bet_result_url = ru;
    /* 진 쪽이 복수전 → 내기 승계 */
    el(w, "revenge").click();
    out.bet_revenge = { stateBet: w.__ev("state.bet"), betBoxHidden: hid(w, "betBox"),
      pressed: w.__ev(`[...document.querySelectorAll(".bet-chip")].filter(function(b){return b.getAttribute("aria-pressed")==="true";}).map(function(b){return b.dataset.bet;})`) };
    out.bet_revenge_link = { url: makeChallenge(w, { name: "민수", hand: 1, msg: 0 }) };
    w.close();

    /* 반대 시점 (결과 링크) */
    const v = load(G, hashOf(ru)).window;
    out.bet_result_view = { verdict: txt(v, "verdict"), betResult: txt(v, "betResult"), stateBet: v.__ev("state.bet") };
    v.close();
  }
  {
    /* 내기 + 무승부 */
    const w = load(G, hashOf(urls.bet)).window;
    respondWith(w, { name: "민수", hand: 0 });
    out.bet_result_tie = { verdict: txt(w, "verdict"), betResult: txt(w, "betResult") };
    w.close();
    /* 직접 입력 내기 */
    const c = load(G, hashOf(urls.betCustom)).window;
    out.bet_custom_open = { betOpen: txt(c, "betOpen") };
    respondWith(c, { name: "", hand: 0 });              // 보 vs 보 → 무승부가 아니라 도전자 보(2), 응답 가위(0) = 가위 승
    out.bet_custom_result = { verdict: txt(c, "verdict"), betResult: txt(c, "betResult") };
    c.close();
  }

  /* 7. 결과 링크로 보기 (도전자 시점) */
  ["cwin", "rwin"].forEach(k => {
    const u = out["result_url_" + k];
    const w = load(G, hashOf(u)).window;
    out["result_view_" + k] = snapResult(w);
    w.close();
  });

  /* 8. 옛 형식 링크 — 플레이어 id 가 없던 시절 결과 링크 */
  {
    const legacy = b64e(JSON.stringify({ v: 1, h: [["지은", 0, 1, 0]], cn: "지은", rn: "민수", rv: 0 }));
    const w = load(G, "#r=" + legacy).window;
    out.legacy_result = snapResult(w);
    w.close();
  }

  /* 9. 깨진 해시는 그냥 만들기 화면 */
  {
    const a = load(G, "#c=xxx").window, b = load(G, "#r=xxx").window;
    out.broken_hash = { c: hid(a, "s-make"), r: hid(b, "s-make") };
    a.close(); b.close();
  }

  return out;
}

module.exports = { run };
