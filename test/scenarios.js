/* 기록 대결 골든 테스트 — 시나리오 정의
   각 게임 페이지를 jsdom 으로 띄우고, 화면·링크·전적을 한 덩어리로 찍는다.
   찍힌 값은 test/golden.json 과 바이트 비교한다.

   새 기록 대결 게임을 만들면 GAMES 와 REC 에 한 줄씩 추가하면 된다. */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");

/* 기록 대결 게임 목록 — 새 게임을 만들면 여기에 추가 */
const GAMES = ["ten", "react", "num25", "mole", "tap"];

/* 게임별로 "기록"을 어디에 담는지. 앱 코드는 건드리지 않는다.
     fields   : 봉인 직전 state 에 넣을 값
     theirRaw : 상대가 낸 기록 (응답 시나리오용) */
const REC = {
  ten:   { fields: { ms: 9840 },                              theirRaw: 10250 },
  react: { fields: { ms: 231 },                               theirRaw: 268 },
  tap:   { fields: { ms: 88 },                                theirRaw: 74 },
  num25: { fields: { ms: 21340, pen: 2, seed: 12345 },        theirRaw: 19870 },
  mole:  { fields: { ms: 24, stat: [18, 3, 1], seed: 12345 }, theirRaw: 19 },
};

/* 외부 리소스를 타지 않도록 로컬 asset 을 인라인으로 바꿔 넣는다 */
function prepHtml(game) {
  let html = fs.readFileSync(path.join(ROOT, "t", game, "index.html"), "utf8");
  html = html.replace(/<link rel="stylesheet"[^>]*>/g, "");
  html = html.replace(/<script src="(\.\.\/\.\.\/assets\/[^"]+)"><\/script>/g, (m, rel) => {
    /* 파일 머리말 주석에 </script> 가 들어 있어 그대로 넣으면 태그가 끊긴다 */
    const js = fs.readFileSync(path.join(ROOT, "t", game, rel), "utf8").replace(/<\/script/g, "<\\/script");
    return "<script>\n" + js + "\n</script>";
  });
  return html;
}

/* 결정론 스텁 — 같은 입력이면 항상 같은 스냅샷이 나오게 */
const STUB = `
(function(){
  var s = 0x2F6E2B1 >>> 0;
  Math.random = function(){
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  var t = 0;
  window.performance = window.performance || {};
  window.performance.now = function(){ t += 16; return t; };
  window.requestAnimationFrame = function(){ return 0; };
  window.cancelAnimationFrame = function(){};
  window.scrollTo = function(){};
  Element.prototype.scrollIntoView = function(){};
})();
`;

/* 페이지 스크립트의 최상위 const(state, subj, …)는 window 에 안 붙는다.
   같은 전역 렉시컬 환경을 공유하는 classic script 를 하나 더 넣어 꺼낸다.
   엔진으로 옮겨간 함수는 Duel.* 로 찾는다. */
const PROBE = `
window.__ev = function(code){ return eval(code); };
window.__fn = function(name){
  try { var f = eval(name); if (typeof f === "function") return f; } catch(e){}
  return window.Duel && window.Duel[name];
};
window.__url = function(){
  try { if (typeof madeUrl === "string") return madeUrl; } catch(e){}
  return window.Duel && window.Duel.url();
};
`;

const PAGE_ERRORS = [];
function load(game, hash) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => PAGE_ERRORS.push(game + ": " + e.message));
  let html = prepHtml(game);
  html = html.replace("<head>", "<head>\n<script>" + STUB + "</script>");
  html = html.replace("</body>", "<script>" + PROBE + "</script>\n</body>");
  return new JSDOM(html, {
    url: "https://bingari69-jpg.github.io/couple-test/t/" + game + "/" + (hash || ""),
    runScripts: "dangerously",
    pretendToBeVisual: false,
    virtualConsole: vc,
  });
}

const el = (w, id) => w.document.getElementById(id);
const txt = (w, id) => { const e = el(w, id); return e ? e.textContent : "<no #" + id + ">"; };
const htm = (w, id) => { const e = el(w, id); return e ? e.innerHTML : "<no #" + id + ">"; };
const cls = (w, id) => { const e = el(w, id); return e ? e.className : "<no #" + id + ">"; };
const hid = (w, id) => { const e = el(w, id); return e ? e.classList.contains("hidden") : "<no #" + id + ">"; };

function snapResult(w) {
  const o = {};
  ["resTag", "nameA", "tA", "dA", "nameB", "tB", "dB",
   "verdict", "subVerdict", "titleBadge", "tallyBox"].forEach(id => { o[id] = htm(w, id); });
  o._cls = { sideA: cls(w, "sideA"), sideB: cls(w, "sideB"), verdict: cls(w, "verdict") };
  o._hidden = {};
  ["tallyBox", "notYet", "respActions", "viewActions", "resLinkbox"].forEach(id => { o._hidden[id] = hid(w, id); });
  o._screen = { play: hid(w, "s-play"), result: hid(w, "s-result") };
  return o;
}

function snapPlay(w) {
  return {
    playTag: htm(w, "playTag"),
    playHead: htm(w, "playHead"),
    playLead: htm(w, "playLead"),
    lockName: htm(w, "lockName"),
    tallyText: htm(w, "tallyText"),
    _hidden: { lockedCard: hid(w, "lockedCard"), tallyCard: hid(w, "tallyCard") },
    _screen: { play: hid(w, "s-play"), result: hid(w, "s-result") },
  };
}

/* 카톡 공유 버튼이 실제로 넘기는 값을 잡는다 (핸들러가 없으면 null) */
function grabKakao(w, btnId) {
  let got = null;
  w.kakaoShare = o => { got = o; };
  const b = el(w, btnId);
  if (!b) return "<no #" + btnId + ">";
  b.click();
  return got;
}

const setRec = g => Object.entries(REC[g].fields)
  .map(([k, v]) => "state." + k + "=" + JSON.stringify(v) + ";").join("");

function run(game) {
  const out = {};

  /* 1. 첫 진입 (해시 없음) */
  {
    const w = load(game).window;
    out.entry_fresh = snapPlay(w);
    w.close();
  }

  /* 2. 조사 헬퍼 */
  {
    const w = load(game).window;
    const names = ["지은", "민수", "현우", "다인", "윤", "박선영", "나", "상대", "Amy", ""];
    out.josa = w.__ev(`(${JSON.stringify(names)}).map(n=>{
      var o={n:n, subj:subj(n)};
      try{ o.topic=topic(n); }catch(e){ o.topic="<none>"; }
      try{ o.objp=objp(n); }catch(e){ o.objp="<none>"; }
      try{ o.tail=subjTail(n); }catch(e){ o.tail="<none>"; }
      return o;
    })`);
    out.who = w.__ev(`[["",true],["",false],["지은",true],["지은",false]].map(a=>who(a[0],a[1]))`);
    w.close();
  }

  /* 3. 도전장 링크 (바이트 비교 대상) + 카톡 도전장 카드 */
  let curl;
  {
    const w = load(game).window;
    /* id 와 봉인 키를 고정해 payload 만의 순수 함수로 만든다 */
    w.__ev(`Math.random=function(){return 0.5;};
            state.name="지은"; state.id="abc123"; state.hist=[];
            ${setRec(game)}
            __fn("makeLink")();`);
    curl = w.__url();
    out.link_challenge = { url: curl, linkbox: txt(w, "linkbox") };
    out.kakao_challenge = grabKakao(w, "kakaoBtn");
    /* 전적이 실린 2판째 링크 + 그때의 카톡 카드 */
    w.__ev(`state.hist=[["지은",${REC[game].theirRaw},"민수",${REC[game].fields.ms},"abc123","zzz999"]];
            __fn("makeLink")();`);
    out.link_challenge_hist = { url: w.__url() };
    out.kakao_challenge_hist = grabKakao(w, "kakaoBtn");
    w.close();
  }

  /* 4. 도전장 열기 → 응답 → 결과 + 카톡 결과 카드 */
  {
    const w = load(game, curl.slice(curl.indexOf("#"))).window;
    out.open_challenge = snapPlay(w);
    w.__ev(`Math.random=function(){return 0.5;};
            state.name="민수"; state.id="zzz999";
            ${setRec(game)}
            state.ms=${JSON.stringify(REC[game].theirRaw)};
            __fn("respond")();`);
    out.respond_result = snapResult(w);
    out.respond_hist = w.__ev("JSON.stringify(state.hist)");
    el(w, "sendResult").click();
    out.result_url = txt(w, "resLinkbox");
    out.kakao_result = grabKakao(w, "kakaoRes");
    w.close();
  }

  /* 5. 이름 없이 온 도전장 (조사가 "상대가" 로 나와야 한다) */
  {
    const w0 = load(game).window;
    w0.__ev(`Math.random=function(){return 0.5;};
             state.name=""; state.id="noname"; state.hist=[];
             ${setRec(game)}
             __fn("makeLink")();`);
    const u = w0.__url();
    w0.close();
    const w = load(game, u.slice(u.indexOf("#"))).window;
    out.open_challenge_noname = snapPlay(w);
    w.close();
  }

  /* 6. 결과 링크로 보기 (viewer a) */
  if (out.result_url && out.result_url.indexOf("#") >= 0) {
    const w = load(game, out.result_url.slice(out.result_url.indexOf("#"))).window;
    out.result_view = snapResult(w);
    w.close();
  }

  /* 7. 전적 계산 · 이력 표시 (합성 이력) */
  {
    const w = load(game).window;
    const a = REC[game].fields.ms, b = REC[game].theirRaw;
    const hist = JSON.stringify([
      ["지은", a, "민수", b, "id1", "id2"],
      ["민수", b, "지은", a, "id2", "id1"],
      ["지은", a, "민수", a, "id1", "id2"],
      ["", a, "", b, "", ""],
    ]);
    out.tally = w.__ev(`JSON.stringify(__fn("tallyOf")(${hist},"id1","지은"))`);
    out.tally_byname = w.__ev(`JSON.stringify(__fn("tallyOf")(${hist},"","지은"))`);
    out.histRows = w.__ev(`__fn("histRows")(${hist},"id1","지은")`);
    w.close();
  }

  /* 8. 봉인 · 인코딩 왕복 */
  {
    const w = load(game).window;
    out.b64 = w.__ev(`(function(){
      var s='{"v":1,"n":"지은","i":"abc123","h":[]}';
      var e=b64e(s); return {e:e, back:b64d(e), ok:b64d(e)===s};
    })()`);
    out.lock = w.__ev(`(function(){
      var r=[]; [0,1,25,9840,21340,999999].forEach(function(v){
        Math.random=function(){return 0.5;};
        var o=lockNum(v); r.push({v:v,k:o.k,x:o.x,back:unlockNum(o.k,o.x)});
      }); return r;
    })()`);
    w.close();
  }

  /* 9. 옛 형식(플레이어 id 가 없던) 결과 링크도 열리는지 */
  {
    const a = REC[game].fields.ms, b = REC[game].theirRaw;
    const legacy = Buffer.from(JSON.stringify({ v: 1, h: [["지은", a, "민수", b]] }), "utf8")
      .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const w = load(game, "#r=" + legacy).window;
    out.legacy_result = snapResult(w);
    w.close();
  }

  return out;
}

/* 전체 스냅샷을 만든다. 페이지에서 자바스크립트 오류가 나면 같이 담는다. */
function snapshot() {
  const result = {};
  for (const g of GAMES) {
    PAGE_ERRORS.length = 0;
    result[g] = run(g);
    if (PAGE_ERRORS.length) result[g].__pageErrors = PAGE_ERRORS.slice();
  }
  return result;
}

module.exports = { GAMES, snapshot, GOLDEN: path.join(__dirname, "golden.json") };
