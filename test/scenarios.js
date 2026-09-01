/* 기록 대결 골든 테스트 — 시나리오 정의
   각 게임 페이지를 jsdom 으로 띄우고, 화면·링크·전적을 한 덩어리로 찍는다.
   찍힌 값은 test/golden.json 과 바이트 비교한다.

   새 기록 대결 게임을 만들면 GAMES 와 REC 에 한 줄씩 추가하면 된다.
   가위바위보처럼 화면 구조가 다른 게임은 test/rps.js 처럼 따로 둔다. */
const path = require("path");
const { load, el, txt, htm, cls, hid, grabKakao, b64e, PAGE_ERRORS } = require("./dom");

/* 기록 대결 게임 목록 — 새 게임을 만들면 여기에 추가 */
const GAMES = ["ten", "react", "num25", "mole", "tap", "ufo", "stroop", "arrow", "stop"];

/* 게임별로 "기록"을 어디에 담는지. 앱 코드는 건드리지 않는다.
     fields   : 봉인 직전 state 에 넣을 값
     theirRaw : 상대가 낸 기록 (응답 시나리오용) */
const REC = {
  ten:   { fields: { ms: 9840 },                              theirRaw: 10250 },
  react: { fields: { ms: 231 },                               theirRaw: 268 },
  tap:   { fields: { ms: 88 },                                theirRaw: 74 },
  num25: { fields: { ms: 21340, pen: 2, seed: 12345 },        theirRaw: 19870 },
  mole:  { fields: { ms: 24, stat: [18, 3, 1], seed: 12345 }, theirRaw: 19 },
  ufo:   { fields: { ms: 23, stat: [20, 2, 1, 30], seed: 12345 }, theirRaw: 19 },
  stroop:{ fields: { ms: 27, stat: [27, 4], seed: 12345 },     theirRaw: 21 },
  arrow: { fields: { ms: 31, stat: [31, 5, 8], seed: 12345 },  theirRaw: 24 },
  stop:  { fields: { ms: 137, stat: [21, 44, 12, 38, 22], seed: 12345 }, theirRaw: 205 },
};

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

  /* 9. 내기 걸기 (선택) — 걸었을 때만 달라져야 한다 */
  {
    /* 9-1. 낱말·문장 — 여섯 게임이 같은 값이어야 한다 */
    const w = load(game).window;
    out.bet_words = w.__ev(`(function(){
      var out={presets:[],custom:null,tie:null,none:null,ga:{}};
      Bet.PRESETS.forEach(function(p){
        out.presets.push({label:p.label, emoji:Bet.emoji(p.label), tag:Bet.tag(p.label),
          title:Bet.titlePrefix(p.label), open:Bet.openLine(p.label),
          loseThem:Bet.resultLine(p.label,"민수",false,false),
          loseMe:Bet.resultLine(p.label,"지은",true,false),
          loseNoName:Bet.resultLine(p.label,"",false,false)});
      });
      out.custom={emoji:Bet.emoji("노래방"), tag:Bet.tag("노래방"),
        title:Bet.titlePrefix("노래방"), open:Bet.openLine("노래방"),
        loseThem:Bet.resultLine("노래방","민수",false,false),
        loseMe:Bet.resultLine("노래방","지은",true,false)};
      out.tie=Bet.resultLine("점심","민수",false,true);
      out.none={title:Bet.titlePrefix(""), open:Bet.openLine(""),
        line:Bet.resultLine("","민수",false,false)};
      out.ga={on:Bet.gaParams("점심"), custom:Bet.gaParams("노래방"), off:Bet.gaParams("")};
      /* 빈 문자열·미존재·숫자 모두 "내기 없음" 이어야 한다 */
      out.read=[Bet.read({b:"점심"}),Bet.read({b:""}),Bet.read({}),Bet.read({b:0}),Bet.read(null)];
      /* 조사 헬퍼가 엔진 것과 같은지 */
      out.subjMatch=["지은","민수","윤","Amy","나","상대"].every(function(n){ return Bet.subj(n)===subj(n); });
      return out;
    })()`);
    w.close();
  }
  {
    /* 9-2. 내기를 건 도전장 링크 + 카톡 카드 */
    const w = load(game).window;
    w.__ev(`Math.random=function(){return 0.5;};
            document.querySelector('[data-bet="점심"]').click();
            state.name="지은"; state.id="abc123"; state.hist=[];
            ${setRec(game)}
            __fn("makeLink")();`);
    const burl = w.__url();
    out.bet_link = { url: burl, stateBet: w.__ev("state.bet") };
    out.bet_kakao = grabKakao(w, "kakaoBtn");
    /* 칩을 다시 누르면 해제되고 링크가 원래대로 돌아온다 */
    w.__ev(`document.querySelector('[data-bet="점심"]').click(); __fn("makeLink")();`);
    out.bet_off_link = { url: w.__url(), stateBet: w.__ev("state.bet") };
    w.close();

    /* 9-3. 도전장 열기 — 헤드라인 아래 한 줄, 받는 쪽은 못 바꾼다 */
    const o = load(game, burl.slice(burl.indexOf("#"))).window;
    out.bet_open = {
      betOpen: txt(o, "betOpen"),
      betOpenHidden: hid(o, "betOpen"),
      betBoxHidden: hid(o, "betBox"),
      playHead: htm(o, "playHead"),
      stateBet: o.__ev("state.bet"),
    };
    /* 9-4. 결과 — 승패 */
    o.__ev(`Math.random=function(){return 0.5;};
            state.name="민수"; state.id="zzz999";
            ${setRec(game)}
            state.ms=${JSON.stringify(REC[game].theirRaw)};
            __fn("respond")();`);
    out.bet_result = {
      subVerdict: txt(o, "subVerdict"),
      betResult: txt(o, "betResult"),
      betResultHidden: hid(o, "betResult"),
    };
    out.bet_kakao_result = grabKakao(o, "kakaoRes");
    el(o, "sendResult").click();
    const rurl = txt(o, "resLinkbox");
    out.bet_result_url = rurl;
    /* 9-5. 재도전 — 내기 승계, 다시 고를 수 있게 */
    el(o, "again").click();
    out.bet_again = {
      stateBet: o.__ev("state.bet"),
      betBoxHidden: hid(o, "betBox"),
      betOpenHidden: hid(o, "betOpen"),
      pressed: o.__ev(`[...document.querySelectorAll(".bet-chip")].filter(function(b){return b.getAttribute("aria-pressed")==="true";}).map(function(b){return b.dataset.bet;})`),
    };
    o.__ev(`Math.random=function(){return 0.5;}; ${setRec(game)} __fn("makeLink")();`);
    out.bet_again_link = { url: o.__url() };
    o.close();

    /* 9-6. 반대 시점 (결과 링크) — 이긴 쪽이 보는 문구 */
    const v = load(game, rurl.slice(rurl.indexOf("#"))).window;
    out.bet_result_view = { subVerdict: txt(v, "subVerdict"), betResult: txt(v, "betResult") };
    v.close();
  }
  {
    /* 9-7. 무승부 · 이름 없음 · 직접 입력 */
    const w = load(game).window;
    w.__ev(`Math.random=function(){return 0.5;};
            document.querySelector('[data-bet="꿀밤 한 대"]').click();
            state.name=""; state.id="abc123"; state.hist=[];
            ${setRec(game)}
            __fn("makeLink")();`);
    const u = w.__url(); w.close();
    const t = load(game, u.slice(u.indexOf("#"))).window;
    t.__ev(`Math.random=function(){return 0.5;};
            state.name=""; state.id="zzz999";
            ${setRec(game)}
            __fn("respond")();`);          // 같은 기록 → 무승부
    out.bet_tie_noname = { betOpen: txt(t, "betOpen"), verdict: txt(t, "verdict"), betResult: txt(t, "betResult") };
    t.close();

    /* 이름 없이 진 쪽 */
    const w2 = load(game).window;
    w2.__ev(`Math.random=function(){return 0.5;};
             document.querySelector('[data-bet="__custom__"]').click();
             document.getElementById("betCustom").value="노래방";
             document.getElementById("betCustom").dispatchEvent(new window.Event("input"));
             state.name=""; state.id="abc123"; state.hist=[];
             ${setRec(game)}
             __fn("makeLink")();`);
    const u2 = w2.__url();
    out.bet_custom_link = { url: u2, stateBet: w2.__ev("state.bet") };
    w2.close();
    const c = load(game, u2.slice(u2.indexOf("#"))).window;
    c.__ev(`Math.random=function(){return 0.5;};
            state.name=""; state.id="zzz999";
            ${setRec(game)}
            state.ms=${JSON.stringify(REC[game].theirRaw)};
            __fn("respond")();`);
    out.bet_custom = { betOpen: txt(c, "betOpen"), betResult: txt(c, "betResult") };
    c.close();
  }

  /* 10. 옛 형식(플레이어 id 가 없던) 결과 링크도 열리는지 */
  {
    const a = REC[game].fields.ms, b = REC[game].theirRaw;
    const legacy = b64e(JSON.stringify({ v: 1, h: [["지은", a, "민수", b]] }));
    const w = load(game, "#r=" + legacy).window;
    out.legacy_result = snapResult(w);
    w.close();
  }

  return out;
}

/* 전체 스냅샷을 만든다. 페이지에서 자바스크립트 오류가 나면 같이 담는다. */
const RPS = require("./rps");
const ALL = GAMES.concat(["rps"]);

function snapshot() {
  const result = {};
  for (const g of GAMES) {
    PAGE_ERRORS.length = 0;
    result[g] = run(g);
    if (PAGE_ERRORS.length) result[g].__pageErrors = PAGE_ERRORS.slice();
  }
  PAGE_ERRORS.length = 0;
  result.rps = RPS.run();
  if (PAGE_ERRORS.length) result.rps.__pageErrors = PAGE_ERRORS.slice();
  return result;
}

module.exports = { GAMES: ALL, snapshot, GOLDEN: path.join(__dirname, "golden.json") };
