/* 같이놀자 — 게임·테스트 완료 알림
   초대 URL에 ch 코드를 붙이고, 상대가 최종 결과에 도착하면 보낸 사람에게 알린다. */
(function () {
  "use strict";

  const PROJECT_URL = "https://iqwggvijxptehvmdbmub.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_D6Iqs7Xovd1ihHV5BYeQrg_xyvHG04Z";
  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const NOTIFY_FUNCTION = "clever-service";
  const VAPID_PUBLIC_KEY = "BIQyVSuYFPL_OqIK5nQTcrgeQYAKm48iIPCdgF7b33b6u0ep4HOZr3-rRfjpG2a682IFLwnXqh4W-MYDJANc8js";
  const STORAGE_KEY = "gatchi-result-alerts-v1";
  const SEEN_KEY = "gatchi-result-alerts-seen-v1";
  const COMPLETED_KEY = "gatchi-result-alert-completed:";
  const ELIGIBLE = new Set([
    "ten", "react", "num25", "mole", "ufo", "tap", "stroop", "arrow", "stop",
    "rps", "nonsense", "delivery", "mbti", "crash", "seat", "marriage",
    "mind/fight", "memory", "ranking", "personality", "tarot"
  ]);
  const TITLES = {
    ten: "10초 맞추기", react: "반응속도 대결", num25: "1에서 25까지", mole: "두더지 잡기",
    ufo: "UFO 요격", tap: "10초 연타", stroop: "색깔 함정", arrow: "화살표 함정",
    stop: "딱 멈춰", rps: "가위바위보", nonsense: "넌센스 퀴즈", delivery: "배달 텔레파시",
    mbti: "MBTI 맞히기", crash: "20분 후 추락합니다", seat: "어디에 앉나요",
    marriage: "결혼 전에 맞춰볼 것들", "mind/fight": "싸우면 어떻게 끝날까",
    memory: "우리의 기억", ranking: "내 취향 맞혀봐", personality: "나와 너의 마음동물",
    tarot: "나와 너의 타로"
  };

  let clientPromise;
  let prepared;
  let receiverCode = codeFromUrl(location.href);
  let completionStarted = false;
  let realtimeChannel;

  function gameSlug(raw) {
    try {
      const path = new URL(raw || location.href, location.href).pathname;
      const match = path.match(/\/t\/(mind\/fight|[^/]+)\/?$/);
      return match ? match[1] : "";
    } catch (_) { return ""; }
  }

  function validCode(value) {
    const code = String(value || "").toUpperCase();
    return /^[A-Z0-9]{12,24}$/.test(code) ? code : "";
  }

  function codeFromUrl(raw) {
    try { return validCode(new URL(raw, location.href).searchParams.get("ch")); }
    catch (_) { return ""; }
  }

  function isInviteUrl(raw) {
    try { return /^#(?:c|i)=/.test(new URL(raw, location.href).hash); }
    catch (_) { return false; }
  }

  function addCode(raw, code) {
    const url = new URL(raw, location.href);
    url.searchParams.set("ch", code);
    return url.href;
  }

  function randomCode() {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(36).padStart(2, "0")).join("").toUpperCase();
  }

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-supabase-sdk]");
      if (existing) {
        if (window.supabase) return resolve(window.supabase);
        existing.addEventListener("load", () => resolve(window.supabase), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.dataset.supabaseSdk = "true";
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error("SUPABASE_SDK_LOAD_FAILED"));
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (!clientPromise) {
      clientPromise = loadSdk().then(sdk => sdk.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      }));
    }
    return clientPromise;
  }

  async function ensureSession() {
    const client = await getClient();
    const current = await client.auth.getSession();
    if (current.error) throw current.error;
    if (!current.data.session) {
      const signed = await client.auth.signInAnonymously();
      if (signed.error) throw signed.error;
    }
    return client;
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (_) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function pendingItems() {
    const oldest = Date.now() - 8 * 24 * 60 * 60 * 1000;
    return readJson(STORAGE_KEY, []).filter(item => item && validCode(item.code) && item.createdAt > oldest);
  }

  function savePending(item) {
    const items = pendingItems().filter(old => old.code !== item.code);
    items.unshift(item);
    writeJson(STORAGE_KEY, items.slice(0, 30));
  }

  function seenCodes() { return readJson(SEEN_KEY, []); }
  function markSeen(code) {
    const values = [code].concat(seenCodes().filter(value => value !== code));
    writeJson(SEEN_KEY, values.slice(0, 50));
  }

  function beginChallenge(slug) {
    if (!ELIGIBLE.has(slug) || receiverCode) return null;
    if (prepared && prepared.slug === slug) return prepared;

    const code = randomCode();
    const item = { code, slug, createdAt: Date.now() };
    prepared = { code, slug, ready: false };
    prepared.promise = ensureSession()
      .then(client => client.rpc("create_game_challenge", { p_game_slug: slug, p_code: code }))
      .then(result => {
        if (result.error) throw result.error;
        prepared.ready = true;
        savePending(item);
        subscribeForResults();
        return result.data;
      })
      .catch(() => {
        prepared.failed = true;
        return null;
      });
    return prepared;
  }

  function decorateShareUrl(raw, suppliedSlug, isResult) {
    const slug = suppliedSlug || gameSlug(raw);
    if (isResult || !ELIGIBLE.has(slug) || !isInviteUrl(raw) || codeFromUrl(raw)) return raw;
    const challenge = beginChallenge(slug);
    return challenge ? addCode(raw, challenge.code) : raw;
  }

  function installUi() {
    if (document.getElementById("resultNotifyStyle")) return;
    const style = document.createElement("style");
    style.id = "resultNotifyStyle";
    style.textContent =
      ".result-notify{position:fixed;z-index:2147483000;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(calc(100% - 28px),430px);box-sizing:border-box;padding:16px;border-radius:22px;background:#fff;color:#2b2530;box-shadow:0 14px 45px rgba(40,28,50,.24);border:1px solid rgba(91,68,112,.13);font-family:inherit;display:grid;grid-template-columns:1fr auto;gap:10px 12px;align-items:center}.result-notify[hidden]{display:none}.result-notify strong{display:block;font-size:16px;line-height:1.35}.result-notify p{grid-column:1/-1;margin:0;font-size:13px;line-height:1.5;color:#746a79}.result-notify-actions{grid-column:1/-1;display:flex;gap:8px}.result-notify button,.result-notify a{appearance:none;border:0;border-radius:999px;padding:10px 14px;font:700 13px/1 inherit;text-decoration:none;cursor:pointer}.result-notify-primary{background:#6e4a85;color:#fff}.result-notify-secondary{background:#f2edf5;color:#55445e}.result-notify-close{background:transparent!important;color:#897f8e!important;padding:5px!important;font-size:18px!important}";
    document.head.appendChild(style);
    const panel = document.createElement("aside");
    panel.id = "resultNotifyPanel";
    panel.className = "result-notify";
    panel.hidden = true;
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    document.body.appendChild(panel);
  }

  function withBody(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  function showPanel(options) {
    withBody(() => {
      installUi();
      const panel = document.getElementById("resultNotifyPanel");
      panel.innerHTML = "";
      const title = document.createElement("strong");
      title.textContent = options.title;
      const close = document.createElement("button");
      close.className = "result-notify-close";
      close.type = "button";
      close.setAttribute("aria-label", "닫기");
      close.textContent = "×";
      close.onclick = () => { panel.hidden = true; };
      const text = document.createElement("p");
      text.textContent = options.text || "";
      panel.append(title, close, text);
      if (options.actions && options.actions.length) {
        const actions = document.createElement("div");
        actions.className = "result-notify-actions";
        options.actions.forEach((action, index) => {
          const button = document.createElement(action.href ? "a" : "button");
          button.className = index === 0 ? "result-notify-primary" : "result-notify-secondary";
          button.textContent = action.label;
          if (action.href) {
            button.href = action.href;
            // 같은 페이지 안에서 #해시만 바뀌면 브라우저가 다시 읽지 않아 아무 일도 안 생긴다.
            // 게임 페이지 대부분은 진입 때 한 번만 주소를 읽으므로 같은 경로면 강제로 다시 읽는다.
            button.addEventListener("click", event => {
              let target = null;
              try { target = new URL(action.href, location.href); } catch (_) { return; }
              if (target.origin !== location.origin || target.pathname !== location.pathname) return;
              event.preventDefault();
              window.ResultNotify && window.ResultNotify._openSamePage ? window.ResultNotify._openSamePage(target.href) : (location.href = target.href, location.reload());
            });
          }
          else { button.type = "button"; button.onclick = action.onClick; }
          actions.appendChild(button);
        });
        panel.appendChild(actions);
      }
      panel.hidden = false;
    });
  }

  function supportsPush() {
    return !!(window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  }

  function applicationServerKey() {
    const padding = "=".repeat((4 - VAPID_PUBLIC_KEY.length % 4) % 4);
    const raw = atob((VAPID_PUBLIC_KEY + padding).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, value => value.charCodeAt(0));
  }

  function serviceWorkerUrl() {
    return location.pathname.startsWith("/couple-test/") ? "/couple-test/sw.js" : "/sw.js";
  }

  async function enablePush(button) {
    button.disabled = true;
    button.textContent = "연결 중…";
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("PERMISSION_NOT_GRANTED");
      const registration = await navigator.serviceWorker.register(serviceWorkerUrl());
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey()
      });
      const json = subscription.toJSON();
      const client = await ensureSession();
      const result = await client.rpc("register_push_subscription", {
        p_endpoint: json.endpoint,
        p_p256dh: json.keys && json.keys.p256dh,
        p_auth: json.keys && json.keys.auth,
        p_user_agent: navigator.userAgent
      });
      if (result.error) throw result.error;
      button.textContent = "알림 켜짐 ✓";
      setTimeout(() => {
        const panel = document.getElementById("resultNotifyPanel");
        if (panel) panel.hidden = true;
      }, 1400);
    } catch (_) {
      button.disabled = false;
      button.textContent = "알림을 켜지 못했어요";
    }
  }

  function afterShare(raw) {
    const code = codeFromUrl(raw);
    if (!code) return;
    const showConnected = () => {
      const text = supportsPush()
        ? "이 화면이 열려 있으면 바로 표시됩니다. 알림을 켜면 화면을 닫아도 받을 수 있어요."
        : "이 화면을 다시 열면 상대의 완료 결과를 확인할 수 있어요.";
      const actions = supportsPush() && Notification.permission !== "denied" ? [{
        label: Notification.permission === "granted" ? "알림 연결 확인" : "화면을 닫아도 알림 받기",
        onClick: event => enablePush(event.currentTarget)
      }] : [];
      showPanel({ title: "상대가 끝내면 알려드릴게요", text, actions });
    };
    if (prepared && prepared.code === code && !prepared.ready) {
      showPanel({ title: "완료 알림을 연결하고 있어요", text: "카카오톡 공유는 정상적으로 진행됩니다." });
      prepared.promise.then(data => {
        if (data) showConnected();
        else showPanel({ title: "이번에는 완료 알림을 연결하지 못했어요", text: "공유한 게임 링크는 그대로 정상 작동합니다." });
      });
      return;
    }
    showConnected();
  }

  function resultHref(path) {
    try {
      const url = new URL(path, location.origin);
      if (url.origin !== location.origin) return "";
      return url.href;
    } catch (_) { return ""; }
  }

  function announceCompleted(row) {
    if (!row || row.status !== "completed" || seenCodes().includes(row.code)) return;
    markSeen(row.code);
    const title = TITLES[row.game_slug] || "게임·테스트";
    const href = resultHref(row.result_url);
    const actions = href ? [{ label: "결과 보기", href }] : [];
    showPanel({
      title: "🎉 상대가 " + title + "를 끝냈어요!",
      text: row.result_summary || "완료된 결과가 도착했어요.",
      actions
    });
  }

  async function subscribeForResults() {
    try {
      const client = await ensureSession();
      const session = await client.auth.getSession();
      const user = session.data.session && session.data.session.user;
      if (!user) return;
      if (!realtimeChannel) {
        realtimeChannel = client.channel("my-result-alerts:" + user.id)
          .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "game_challenges",
            filter: "sender_user_id=eq." + user.id
          }, payload => announceCompleted(payload.new))
          .subscribe();
      }
      const items = pendingItems();
      if (!items.length) return;
      const result = await client.from("game_challenges")
        .select("code,game_slug,status,result_url,result_summary,completed_at")
        .in("code", items.map(item => item.code))
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1);
      if (!result.error && result.data && result.data[0]) announceCompleted(result.data[0]);
    } catch (_) {}
  }

  // 알림 본문에는 화면의 이름·점수를 긁어 넣지 않는다. 개인 내용이 서버와 푸시 메시지에 남지 않도록
  // 게임 이름만 담은 고정 문구를 보낸다.
  function summaryText() {
    return "상대가 최종 결과까지 완료했어요. 결과 보기를 눌러 확인하세요.";
  }

  // 결과 링크: 보낸 사람이 '결과 보기'로 열 주소. 해시(#r=)에 두 사람의 답이 들어 있으므로
  // 서버에는 보낸 사람만 읽을 수 있게 저장되고 expires_at 뒤 purge_expired_game_challenges()로 지워진다.
  function resultPath() {
    // 게임이 결과 링크(#r=)를 알려주면 그것을 쓴다. 현재 주소는 받는 쪽의 도전장 주소(#c=/#i=)라
    // 보낸 사람이 "결과 보기"로 열면 결과가 아니라 도전장 화면이 떴다.
    const given = window.__gatchiResultUrl;
    if (typeof given === "string" && given) {
      try { const u = new URL(given, location.href); if (u.origin === location.origin) return u.pathname + u.search + u.hash; } catch (_) {}
    }
    return location.pathname + location.search + location.hash;
  }

  async function completeChallenge() {
    if (!receiverCode || completionStarted) return;
    try {
      if (sessionStorage.getItem(COMPLETED_KEY + receiverCode)) return;
    } catch (_) {}
    completionStarted = true;
    await new Promise(resolve => setTimeout(resolve, 80));
    try {
      const client = await ensureSession();
      const result = await client.rpc("complete_game_challenge", {
        p_code: receiverCode,
        p_result_url: resultPath(),
        p_result_summary: summaryText()
      });
      if (result.error) throw result.error;
      try { sessionStorage.setItem(COMPLETED_KEY + receiverCode, "1"); } catch (_) {}
      client.functions.invoke(NOTIFY_FUNCTION, { body: { code: receiverCode } })
        .then(response => { if (response && response.error) console.warn("[결과 알림] 푸시 전송 실패", response.error); })
        .catch(error => console.warn("[결과 알림] 푸시 함수 호출 실패", error));
    } catch (_) {
      completionStarted = false;
    }
  }

  function looksLikeVisibleResult() {
    const nodes = document.querySelectorAll('[id*="result"],[id*="compare"],[id="opened"]');
    for (const node of nodes) {
      if (node.hidden || node.classList.contains("hidden")) continue;
      const style = getComputedStyle(node);
      if (style.display !== "none" && style.visibility !== "hidden") return true;
    }
    return false;
  }

  function watchReceiverResult() {
    if (!receiverCode) return;
    const start = () => {
      const check = () => { if (looksLikeVisibleResult()) completeChallenge(); };
      const observer = new MutationObserver(check);
      observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style", "hidden"] });
      check();
    };
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  function onTracked(event) {
    if (event === "link_made") beginChallenge(gameSlug());
    if (event === "responded") completeChallenge();
  }

  function hookTrack() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const original = window.track;
      if (typeof original === "function" && !original.__resultNotifyWrapped) {
        const wrapped = function (event, params) {
          const value = original.apply(this, arguments);
          onTracked(event);
          return value;
        };
        wrapped.__resultNotifyWrapped = true;
        window.track = wrapped;
        clearInterval(timer);
      } else if (attempts > 600) clearInterval(timer);
    }, 50);
  }

  function hookHistory() {
    ["pushState", "replaceState"].forEach(name => {
      const original = history[name];
      history[name] = function () {
        const value = original.apply(this, arguments);
        if (!receiverCode && isInviteUrl(location.href)) beginChallenge(gameSlug());
        return value;
      };
    });
  }

  window.ResultNotify = {
    decorateShareUrl,
    afterShare,
    complete: completeChallenge,
    enablePush,
    _openSamePage: href => { location.href = href; location.reload(); },
    _test: { gameSlug, validCode, codeFromUrl, isInviteUrl, addCode, eligible: slug => ELIGIBLE.has(slug), announceCompleted }
  };

  hookTrack();
  hookHistory();
  watchReceiverResult();
  ensureSession().then(subscribeForResults).catch(() => {});
  if (!receiverCode && isInviteUrl(location.href)) beginChallenge(gameSlug());
})();
