/* 골든 테스트 공통 — jsdom 으로 게임 한 판을 띄우는 뒷일
   기록 대결(test/scenarios.js)과 가위바위보(test/rps.js)가 같이 쓴다. */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");

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

/* 카톡 공유 버튼이 실제로 넘기는 값을 잡는다 (핸들러가 없으면 null) */
function grabKakao(w, btnId) {
  let got = null;
  w.kakaoShare = o => { got = o; };
  const b = el(w, btnId);
  if (!b) return "<no #" + btnId + ">";
  b.click();
  return got;
}

/* base64url — 옛 형식 링크를 손으로 만들 때 */
const b64e = s => Buffer.from(s, "utf8").toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

module.exports = { ROOT, load, el, txt, htm, cls, hid, grabKakao, b64e, PAGE_ERRORS };
