/* 같이놀자 — 혼자놀기 공통 모듈
   사용: 게임 페이지에서 duel-engine.js 다음, 게임 스크립트보다 먼저 solo.js 를 읽는다 (?v= 버전은 다른 공용 스크립트와 같은 규칙)

   게임은 "판(코어)" 하나를 두고 껍데기만 둘이다.
     · 둘이하기(duel-engine.js): 무작위 시드를 링크에 실어 상대와 같은 판, 봉인·전적·카톡.
     · 혼자하기(이 파일): 레벨마다 고정 시드·난이도, 클리어 조건과 별, 진행도 저장, 다음 레벨.
   두 껍데기의 연결점은 혼자 결과 화면의 "이 판으로 도전장 보내기"뿐이다.
   → 같은 페이지를 ?s=시드&l=레벨 로 다시 열면 duel-engine 이 cfg.onPreset 으로 같은 판을 만든다.

   ── 쓰는 법 ─────────────────────────────────────────────
     Solo.init({
       game:'pairs',                       // 저장 키·통계용 슬러그
       levels:[{ n:1, label:'4×4', params:{cols:4,rows:4}, limitMs:120000, goal:120000, best:30000 }, ...],
       lowerWins:true,                     // 기록이 작을수록 좋은가 (시간). 점수형은 false
       fmt:v=>(v/1000).toFixed(2)+'초',    // 기록 표시
       onLevel(level){ ... },              // 레벨을 고를 때: state.seed=level.seed 로 판을 다시 만든다
       describe(level){ return '...'; }    // 레벨 칸 아래 한 줄 (선택)
     });
     ... 게임은 진행 중 Solo.level.limitMs 를 보고 시간이 다 되면 Solo.finish(null) 을 부른다.
     function finishPlay(){ ...; if(Solo.active) Solo.finish(기록값,{flips:…}); else Duel.finish(기록값,…); }
     Duel.start();   // 엔진이 Solo.active 면 Solo.mount() 로 넘긴다

   ── 별 ──────────────────────────────────────────────────
     goal 을 넘기면 클리어(★). best 에 닿으면 ★★★. 그 사이 중간값이 ★★ 경계.
     lowerWins 면 "작을수록", 아니면 "클수록".

   ── 저장 ─────────────────────────────────────────────────
     localStorage 'gatchi_solo_v1' = { pairs:{ "1":{stars:3,best:28400,clears:2,plays:3}, ... }, ... }
     기기별 저장. 서버 저장·기기 간 동기화는 2단계. */
(function () {
  "use strict";
  const KEY = "gatchi_solo_v1";
  const query = new URLSearchParams(location.search);
  const active = query.get("solo") === "1";
  const Solo = { active, level: null, levels: [], cfg: null };

  /* ── 저장 ── */
  function loadAll() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) { return {}; } }
  function saveAll(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (_) {} }
  Solo.progress = function (game) { const all = loadAll(); return all[game] || {}; };
  Solo.summary = function (game, levelCount) {   // 홈 배지용: {cleared, stars, next}
    const p = Solo.progress(game); let cleared = 0, stars = 0;
    for (let n = 1; n <= levelCount; n++) { const r = p[n]; if (r && r.stars > 0) { cleared++; stars += r.stars; } }
    return { cleared, stars, total: levelCount, next: Math.min(levelCount, cleared + 1) };
  };

  /* ── 시드: 게임과 레벨 번호로 항상 같은 값 ── */
  function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
  Solo.seedFor = (game, n) => hash("solo:" + game + ":" + n);

  /* ── 별 계산 ── */
  function starsFor(level, value) {
    if (value === null || value === undefined) return 0;
    const lower = Solo.cfg.lowerWins !== false;
    const better = (a, b) => lower ? a <= b : a >= b;
    if (!better(value, level.goal)) return 0;
    if (better(value, level.best)) return 3;
    const mid = (level.goal + level.best) / 2;
    return better(value, mid) ? 2 : 1;
  }
  Solo.starsFor = starsFor;

  const track = (e, p) => { try { if (typeof window.track === "function") window.track(e, p); } catch (_) {} };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const starText = n => "★".repeat(n) + "☆".repeat(3 - n);

  const CSS = `
  .solo-panel{background:#fff;border:3px solid #F0E4C8;border-radius:22px;padding:14px 16px;margin:14px 0 10px}
  .solo-panel .solo-title{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:700;color:#7A6E5E}
  .solo-panel .solo-title b{font-size:15px;color:#1F1B16}
  .solo-levels{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}
  .solo-lv{border:2px solid #F0E4C8;border-radius:14px;background:#FFFDF6;padding:8px 4px;text-align:center;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .solo-lv b{display:block;font-size:16px;font-weight:900}
  .solo-lv small{display:block;font-size:11px;color:#B5A88F;letter-spacing:-.02em;margin-top:2px}
  .solo-lv .st{display:block;font-size:11px;color:#E9B93A;letter-spacing:1px;margin-top:2px}
  .solo-lv.on{border-color:#2D7DFF;background:#EAF2FF}
  .solo-lv.locked{opacity:.45;cursor:default}
  .solo-desc{font-size:13px;color:#7A6E5E;margin-top:10px;line-height:1.5}
  .solo-desc b{color:#1F1B16}
  .solo-result{background:#fff;border:3px solid #FFC94D;border-radius:22px;padding:18px 18px 14px;margin:14px 0;text-align:center}
  .solo-result .verdict{font-size:clamp(24px,7vw,30px);font-weight:900;letter-spacing:-.02em}
  .solo-result .verdict.fail{color:#FF5A5F}
  .solo-result .stars{font-size:34px;color:#E9B93A;letter-spacing:4px;line-height:1.2;margin:4px 0}
  .solo-result .rec{font-size:15px;color:#7A6E5E;line-height:1.6}
  .solo-result .rec b{color:#1F1B16}
  .solo-result .btn{margin-top:10px}
  .solo-result .btn-blue{background:#2D7DFF;color:#fff}
  .solo-result .btn-main{background:#FFC94D;color:#1F1B16}
  .solo-result .btn-sub{background:#fff;color:#7A6E5E;border:2px solid #F0E4C8;font-weight:600}
  .solo-result .btn-duel{background:#FEE500;color:#191600}
  .solo-hud{font-size:13px;color:#7A6E5E;font-weight:600;text-align:center;margin:-4px 0 8px}
  .solo-hud b{color:#2D7DFF}`;

  Solo.init = function (cfg) {
    Solo.cfg = cfg; Solo.levels = cfg.levels || [];
    Solo.levels.forEach(l => { l.seed = Solo.seedFor(cfg.game, l.n); });
    if (!active) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  };

  /* 둘이하기 전용 UI 를 숨기고 레벨 표를 그린다. duel-engine 의 Duel.start 가 부른다. */
  Solo.mount = function () {
    const cfg = Solo.cfg; if (!cfg) return;
    ["lockedCard", "tallyCard", "afterPlay", "betBox"].forEach(id => { const el = $(id); if (el) el.classList.add("hidden"); });
    const nameIn = $("nameIn"); if (nameIn) { nameIn.classList.add("hidden"); const lab = document.querySelector('label[for="nameIn"]'); if (lab) lab.classList.add("hidden"); }
    const tag = $("playTag"); if (tag) tag.textContent = "혼자놀기";
    const home = document.querySelector("#s-play .homelink"); if (home) { home.textContent = "다른 혼자놀기 보기 →"; home.href = home.getAttribute("href").replace(/#.*$/, "") + "?tab=solo#all"; }
    const panel = document.createElement("div"); panel.className = "solo-panel"; panel.id = "soloPanel";
    panel.innerHTML = '<div class="solo-title"><span>레벨을 골라요</span><b id="soloStars"></b></div><div class="solo-levels" id="soloLevels"></div><div class="solo-desc" id="soloDesc"></div>';
    const anchor = document.querySelector("#s-play .hud") || $("bigBtn") || $("s-play");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor); else document.body.appendChild(panel);
    const hud = document.createElement("div"); hud.className = "solo-hud"; hud.id = "soloHud";
    const hudAnchor = document.querySelector("#s-play .hud"); if (hudAnchor) hudAnchor.after(hud);
    const want = parseInt(query.get("lv") || "0", 10);
    const summary = Solo.summary(cfg.game, Solo.levels.length);
    const pick = Solo.levels.find(l => l.n === want && l.n <= summary.next) || Solo.levels.find(l => l.n === summary.next) || Solo.levels[0];
    Solo.select(pick.n);
  };

  Solo.unlocked = function (n) { const s = Solo.summary(Solo.cfg.game, Solo.levels.length); return n <= s.next; };

  Solo.select = function (n) {
    const level = Solo.levels.find(l => l.n === n); if (!level || !Solo.unlocked(n)) return;
    Solo.level = level;
    const old = $("soloResult"); if (old) old.remove();
    if (Solo.cfg.onLevel) Solo.cfg.onLevel(level);
    renderLevels();
    track("solo_started", { level: n });
  };

  function renderLevels() {
    const cfg = Solo.cfg, p = Solo.progress(cfg.game), box = $("soloLevels"); if (!box) return;
    box.innerHTML = ""; box.style.gridTemplateColumns = "repeat(" + Solo.levels.length + ",1fr)";
    Solo.levels.forEach(l => {
      const b = document.createElement("button"); b.type = "button"; b.className = "solo-lv" + (Solo.level === l ? " on" : "") + (Solo.unlocked(l.n) ? "" : " locked");
      const r = p[l.n];
      b.innerHTML = "<b>Lv" + l.n + "</b><small>" + esc(l.label || "") + "</small><span class='st'>" + (Solo.unlocked(l.n) ? starText(r ? r.stars : 0) : "🔒") + "</span>";
      b.onclick = () => { if (Solo.unlocked(l.n) && !(window.Duel && Duel.state && Duel.state.running)) Solo.select(l.n); };
      box.appendChild(b);
    });
    const s = Solo.summary(cfg.game, Solo.levels.length);
    $("soloStars").textContent = "★ " + s.stars + " / " + (Solo.levels.length * 3);
    const l = Solo.level, r = p[l.n];
    const goalText = cfg.fmt ? cfg.fmt(l.goal) : l.goal, bestText = cfg.fmt ? cfg.fmt(l.best) : l.best;
    $("soloDesc").innerHTML = (cfg.describe ? esc(cfg.describe(l)) + " · " : "") + "클리어 <b>" + esc(goalText) + "</b> · ★★★ <b>" + esc(bestText) + "</b>" + (r && r.best !== undefined ? " · 내 최고 <b>" + esc(cfg.fmt ? cfg.fmt(r.best) : r.best) + "</b>" : "");
    const hud = $("soloHud"); if (hud) hud.innerHTML = "Lv" + l.n + " · 목표 <b>" + esc(goalText) + "</b>";
  }

  /* 게임이 끝났을 때. value=null 이면 실패(시간 초과 등) */
  Solo.finish = function (value, extra) {
    const cfg = Solo.cfg, level = Solo.level; if (!cfg || !level) return;
    const stars = starsFor(level, value);
    const all = loadAll(); all[cfg.game] = all[cfg.game] || {};
    const rec = all[cfg.game][level.n] || { stars: 0, plays: 0, clears: 0 };
    rec.plays++;
    const lower = cfg.lowerWins !== false;
    if (value !== null && value !== undefined && (rec.best === undefined || (lower ? value < rec.best : value > rec.best))) rec.best = value;
    if (stars > 0) { rec.clears++; rec.stars = Math.max(rec.stars, stars); }
    all[cfg.game][level.n] = rec; saveAll(all);
    track(stars > 0 ? "solo_cleared" : "solo_failed", { level: level.n, stars });

    const old = $("soloResult"); if (old) old.remove();
    const card = document.createElement("div"); card.className = "solo-result"; card.id = "soloResult";
    const next = Solo.levels.find(l => l.n === level.n + 1);
    const recText = value === null || value === undefined ? "시간 안에 못 끝냈어" : "기록 <b>" + esc(cfg.fmt ? cfg.fmt(value) : value) + "</b>" + (extra && extra.note ? " · " + esc(extra.note) : "");
    card.innerHTML =
      '<div class="verdict ' + (stars ? "" : "fail") + '">' + (stars === 3 ? "완벽해!" : stars ? "클리어!" : "아쉽다!") + "</div>" +
      '<div class="stars">' + starText(stars) + "</div>" +
      '<div class="rec">' + recText + (rec.best !== undefined ? "<br>내 최고 " + esc(cfg.fmt ? cfg.fmt(rec.best) : rec.best) : "") + "</div>" +
      (stars && next ? '<button class="btn btn-blue" type="button" id="soloNext">다음 레벨 Lv' + next.n + " →</button>" : "") +
      '<button class="btn ' + (stars && next ? "btn-sub" : "btn-blue") + '" type="button" id="soloRetry">' + (stars ? "다시 해서 별 더 받기" : "다시 하기") + "</button>" +
      '<a class="btn btn-duel" id="soloDuel" href="' + esc(location.pathname + "?s=" + level.seed + "&l=" + level.n) + '" style="display:block;text-decoration:none">💬 이 판으로 친구에게 도전장 보내기</a>';
    const anchor = $("bigBtn") || $("soloPanel");
    if (anchor) anchor.after(card); else document.body.appendChild(card);
    $("soloRetry").onclick = () => Solo.select(level.n);
    const nb = $("soloNext"); if (nb) nb.onclick = () => Solo.select(next.n);
    $("soloDuel").addEventListener("click", () => track("solo_to_duel", { level: level.n }));
    renderLevels();
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  window.Solo = Solo;
})();
