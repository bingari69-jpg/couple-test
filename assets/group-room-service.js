/* 같이놀자 — 단체방 브라우저 연결 모듈
   페이지에서 이 파일을 불러온 뒤 GroupRoomService.createRoom/joinRoom 등을 사용한다. */
(function () {
  "use strict";

  const PROJECT_URL = "https://iqwggvijxptehvmdbmub.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_D6Iqs7Xovd1ihHV5BYeQrg_xyvHG04Z";
  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  let clientPromise;

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-supabase-sdk]');
      if (existing) {
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
      const created = await client.auth.signInAnonymously();
      if (created.error) throw created.error;
    }
    return client;
  }

  async function rpc(name, params) {
    const client = await ensureSession();
    const result = await client.rpc(name, params);
    if (result.error) throw result.error;
    return result.data;
  }

  function createRoom(options) {
    const value = options || {};
    return rpc("create_group_room", {
      p_game_slug: value.gameSlug,
      p_stake_text: value.stakeText || "커피 한 잔",
      p_nickname: value.nickname,
      p_max_players: value.maxPlayers || 4,
      p_score_mode: value.scoreMode || "highest_wins"
    });
  }

  function joinRoom(code, nickname) {
    return rpc("join_group_room", { p_code: code, p_nickname: nickname });
  }

  function getRoom(code) {
    return rpc("get_group_room", { p_code: code });
  }

  function setReady(roomId, ready) {
    return rpc("set_group_ready", { p_room_id: roomId, p_ready: !!ready });
  }

  function startRoom(roomId) {
    return rpc("start_group_room", { p_room_id: roomId });
  }

  function submitAnswer(roomId, score, answer) {
    return rpc("submit_group_answer", {
      p_room_id: roomId,
      p_score: score == null ? null : Number(score),
      p_answer: answer || {}
    });
  }

  function finishRoom(roomId) {
    return rpc("finish_group_room", { p_room_id: roomId });
  }

  function cancelRoom(roomId) {
    return rpc("cancel_group_room", { p_room_id: roomId });
  }

  async function subscribe(roomId, onChange) {
    const client = await ensureSession();
    const notify = payload => {
      try { onChange(payload); } catch (_) {}
    };
    const channel = client.channel("group-room:" + roomId)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "group_rooms", filter: "id=eq." + roomId
      }, notify)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "group_members", filter: "room_id=eq." + roomId
      }, notify)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "group_answers", filter: "room_id=eq." + roomId
      }, notify)
      .subscribe();
    return () => client.removeChannel(channel);
  }

  window.GroupRoomService = {
    ensureSession,
    createRoom,
    joinRoom,
    getRoom,
    setReady,
    startRoom,
    submitAnswer,
    finishRoom,
    cancelRoom,
    subscribe
  };
})();
