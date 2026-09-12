(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const service = window.GroupRoomService;
  const PROD_URL = "https://bingari69-jpg.github.io/couple-test/t/group-room/";
  let selectedStake = "커피 한 잔";
  let code = "";
  let snapshot = null;
  let stopSubscription = null;
  let refreshTimer = null;
  let busy = false;

  const errorMessages = {
    AUTH_REQUIRED: "참가자 연결에 실패했어요. 잠시 뒤 다시 눌러주세요.",
    ROOM_NOT_FOUND: "이 단체방을 찾을 수 없어요.",
    ROOM_ACCESS_DENIED: "닉네임을 적고 방에 먼저 들어가주세요.",
    ROOM_ALREADY_STARTED: "이미 시작한 방이에요.",
    ROOM_EXPIRED: "이 방의 이용 시간이 끝났어요.",
    ROOM_FULL: "정원이 모두 찼어요.",
    NICKNAME_ALREADY_USED: "이미 사용 중인 닉네임이에요.",
    NEED_MORE_PLAYERS: "두 명 이상 들어와야 시작할 수 있어요.",
    MEMBERS_NOT_READY: "아직 준비하지 않은 친구가 있어요.",
    ANSWER_ALREADY_SUBMITTED: "이미 봉인을 찍었어요.",
    WAITING_FOR_ANSWERS: "아직 봉인을 찍지 않은 친구가 있어요."
  };

  function message(error) {
    const text = error && (error.message || String(error));
    const key = Object.keys(errorMessages).find(name => text && text.includes(name));
    return key ? errorMessages[key] : "연결이 잠시 불안정해요. 다시 시도해주세요.";
  }

  /* 결과 공개 연출: 이름들이 룰렛처럼 돌다가 당첨자에서 멈춘다. 실제 텍스트는 이미 #resultName에 있다. */
  let rouletteDone = false;
  function roulette(names, finalName) {
    if (rouletteDone || names.length < 2) return;
    rouletteDone = true;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const view = $("resultView"), spin = document.getElementById("resultSpin");
    if (!view || !spin) return;
    view.classList.add("spinning");
    let i = 0, step = 70;
    const tick = () => {
      spin.textContent = names[i++ % names.length] + " …";
      step += 18;
      if (step < 260) setTimeout(tick, step);
      else { spin.textContent = finalName + " !"; setTimeout(() => view.classList.remove("spinning"), 350); }
    };
    tick();
  }

  function show(id) {
    ["createView", "joinView", "roomView"].forEach(view => { $(view).hidden = view !== id; });
    window.scrollTo(0, 0);
  }

  function setBusy(value, button) {
    busy = value;
    if (button) button.disabled = value;
  }

  function savedNickname() {
    try { return localStorage.getItem("group-room-nick:" + code) || ""; } catch (_) { return ""; }
  }

  function saveNickname(nickname) {
    try { localStorage.setItem("group-room-nick:" + code, nickname); } catch (_) {}
  }

  function roomUrl() {
    const base = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
      ? PROD_URL
      : location.origin + location.pathname;
    return base + "#room=" + encodeURIComponent(code);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      $("roomMessage").textContent = "초대 링크를 복사했어요.";
    } catch (_) {
      // 모바일에서 window.prompt는 잘리거나 막히므로, 길게 눌러 복사할 수 있는 칸을 화면에 보여준다.
      $("roomMessage").textContent = "복사가 막혔어요. 아래 링크를 길게 눌러 복사해주세요.";
      let box = document.getElementById("roomLinkBox");
      if (!box) {
        box = document.createElement("input");
        box.id = "roomLinkBox"; box.readOnly = true; box.setAttribute("aria-label", "초대 링크");
        box.style.cssText = "display:block;width:100%;margin-top:8px;padding:10px 12px;border:1px solid #eee2d7;border-radius:12px;font-size:13px;background:#fffdf9;color:#5a4634";
        $("roomMessage").insertAdjacentElement("afterend", box);
      }
      box.value = text; box.focus(); box.select();
    }
  }

  function share(result) {
    const room = snapshot && snapshot.room;
    const title = result && room && room.result
      ? `☕ 오늘의 당첨자는 ${room.result.loser_nickname}!`
      : "☕ 단체방 커피 내기 — 네 자리 비워뒀어";
    const desc = result && room && room.result
      ? `${room.result.stake_text} 내기 결과가 열렸어.`
      : `${room ? room.stake_text : selectedStake} 걸고, 각자 들어와 봉인을 찍어줘.`;
    const url = roomUrl();
    const fallback = () => copyText(url);
    if (window.kakaoShare) {
      window.kakaoShare({
        title,
        desc,
        url,
        img: "https://bingari69-jpg.github.io/couple-test/assets/share-cards/ladder.png?v=20260910-unified",
        imageWidth: 800,
        imageHeight: 480,
        btn: result ? "결과 보기" : "단체방 들어가기"
      }, fallback);
    } else fallback();
  }

  function renderMembers(data) {
    const room = data.room;
    const myNickname = savedNickname();
    $("memberCount").textContent = `${data.members.length}/${room.max_players}명`;
    $("members").replaceChildren(...data.members.map(member => {
      const row = document.createElement("div");
      row.className = "member";
      const icon = document.createElement("span");
      icon.className = "member-icon";
      icon.textContent = member.role === "host" ? "🐥" : "🐣";
      const name = document.createElement("span");
      name.className = "member-name";
      name.textContent = member.nickname;
      if (member.nickname === myNickname) {
        const mine = document.createElement("small");
        mine.textContent = "나";
        name.appendChild(mine);
      }
      const state = document.createElement("span");
      state.className = "member-state";
      if (room.status === "lobby") {
        state.textContent = member.is_ready ? "준비 완료" : "기다리는 중";
        if (member.is_ready) state.classList.add("ready");
      } else {
        state.textContent = member.has_submitted ? "봉인 완료" : "봉인 전";
        if (member.has_submitted) state.classList.add("done");
      }
      row.append(icon, name, state);
      return row;
    }));
  }

  function render(data) {
    snapshot = data;
    const room = data.room;
    const myNickname = savedNickname();
    const me = data.members.find(member => member.nickname === myNickname);
    const allReady = data.members.length >= 2 && data.members.every(member => member.is_ready);
    const allSubmitted = data.members.length >= 2 && data.members.every(member => member.has_submitted);

    show("roomView");
    $("roomCode").textContent = room.code;
    $("roomLead").textContent = `내기: ${room.stake_text}`;
    renderMembers(data);
    $("lobbyActions").hidden = room.status !== "lobby";
    $("playingActions").hidden = room.status !== "playing";
    $("resultView").hidden = room.status !== "finished";
    $("shareActions").hidden = room.status === "finished";

    if (room.status === "lobby") {
      $("roomStatusBadge").textContent = "친구 입장 중";
      $("roomTitle").innerHTML = "친구들을<br><em>기다리는 중.</em>";
      $("readyRoom").hidden = room.is_host;
      $("startRoom").hidden = !room.is_host;
      $("readyRoom").textContent = me && me.is_ready ? "준비 취소" : "나 준비됐어";
      $("startRoom").disabled = !allReady;
      $("lobbyHint").textContent = data.members.length < 2
        ? "초대 링크를 단체톡에 보내고 한 명 이상 기다려주세요."
        : allReady ? "모두 준비됐어요. 방장이 시작하면 돼요." : "모든 친구가 준비를 눌러야 시작할 수 있어요.";
    } else if (room.status === "playing") {
      $("roomStatusBadge").textContent = "봉인 진행 중";
      $("roomTitle").innerHTML = "아직 아무도<br><em>결과를 몰라.</em>";
      $("submitSeal").hidden = Boolean(me && me.has_submitted);
      const tenMode = room.score_mode === "lowest_wins";
      $("tenBox").hidden = !tenMode || Boolean(me && me.has_submitted);
      $("playingTitle").textContent = tenMode ? "10초라고 생각될 때 멈춰!" : "내 자리의 봉인을 찍어줘";
      $("playingLead").textContent = tenMode ? "3초까지만 보여줘. 오차가 가장 큰 사람이 당첨이에요." : "모두 찍을 때까지 결과는 아무도 볼 수 없어요.";
      if (tenMode && !(me && me.has_submitted)) $("submitSeal").disabled = ten.err === null;
      $("finishRoom").hidden = !(room.is_host && allSubmitted);
      $("playingHint").textContent = allSubmitted
        ? room.is_host ? "모든 봉인이 모였어요. 이제 결과를 열어주세요." : "모든 봉인이 모였어요. 방장이 결과를 여는 중이에요."
        : me && me.has_submitted ? "내 봉인은 완료됐어요. 친구들을 기다리는 중이에요." : "버튼을 누르면 내 자리의 봉인이 완료돼요.";
    } else if (room.status === "finished") {
      $("roomStatusBadge").textContent = "결과 공개";
      $("roomTitle").innerHTML = "단체방 결과가<br><em>열렸어!</em>";
      $("resultName").textContent = room.result.loser_nickname + " 당첨 😂";
      roulette(data.members.map(member => member.nickname), room.result.loser_nickname);
      $("resultStake").textContent = room.result.stake_text + " 담당";
      const scores = (data.answers || []).filter(a => a && typeof a.score === "number");
      $("resultScores").hidden = !(room.score_mode === "lowest_wins" && scores.length);
      if (!$("resultScores").hidden) {
        $("resultScores").replaceChildren(...scores.sort((a, b) => b.score - a.score).map(a => {
          const li = document.createElement("li"); li.textContent = a.nickname + " · 오차 " + (a.score / 1000).toFixed(2) + "초"; return li;
        }));
      }
      $("playAgain").hidden = !room.is_host;
    } else {
      $("roomStatusBadge").textContent = "종료된 방";
      $("roomTitle").innerHTML = "이 단체방은<br><em>종료됐어요.</em>";
      $("lobbyActions").hidden = true;
      $("playingActions").hidden = true;
    }
  }

  async function refresh() {
    if (!code || busy) return;
    try { render(await service.getRoom(code)); } catch (_) {}
  }

  async function watchRoom() {
    if (stopSubscription) stopSubscription();
    if (snapshot && snapshot.room) {
      stopSubscription = await service.subscribe(snapshot.room.id, refresh);
    }
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 5000);
  }

  async function enter(data, nickname) {
    snapshot = data;
    code = data.room.code;
    saveNickname(nickname);
    history.replaceState(null, "", "#room=" + encodeURIComponent(code));
    render(data);
    await watchRoom();
  }

  let selectedMode = "random";
  $("modeChips").addEventListener("click", event => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    selectedMode = button.dataset.mode;
    $("modeChips").querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  });

  /* 10초 맞추기 모드: 봉인 대신 타이머를 멈춘 오차(ms)를 점수로 낸다. 오차가 큰 사람이 당첨(lowest_wins → 최고 점수가 당첨). */
  const ten = { running: false, t0: 0, raf: 0, err: null };
  function tenReset() { ten.running = false; ten.err = null; cancelAnimationFrame(ten.raf); $("tenClock").textContent = "0.00"; $("tenBtn").textContent = "시작"; $("tenBtn").disabled = false; }
  $("tenBtn").onclick = () => {
    if (!ten.running) {
      ten.running = true; ten.t0 = performance.now(); $("tenBtn").textContent = "멈춤!";
      const tick = () => { const el = performance.now() - ten.t0; $("tenClock").textContent = el < 3000 ? (el / 1000).toFixed(2) : "· · ·"; if (ten.running) ten.raf = requestAnimationFrame(tick); };
      ten.raf = requestAnimationFrame(tick);
      return;
    }
    ten.running = false; cancelAnimationFrame(ten.raf);
    const ms = Math.round(performance.now() - ten.t0); ten.err = Math.abs(ms - 10000);
    $("tenClock").textContent = (ms / 1000).toFixed(2); $("tenBtn").textContent = "오차 " + (ten.err / 1000).toFixed(2) + "초 · 봉인 준비됨"; $("tenBtn").disabled = true;
    $("submitSeal").disabled = false;
  };

  $("stakeChips").addEventListener("click", event => {
    const button = event.target.closest("button[data-stake]");
    if (!button) return;
    selectedStake = button.dataset.stake;
    $("stakeChips").querySelectorAll("button").forEach(item => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    $("customStake").hidden = selectedStake !== "custom";
    if (selectedStake === "custom") $("customStake").focus();
  });

  $("createRoom").onclick = async () => {
    if (busy) return;
    const nickname = $("hostNickname").value.trim();
    const stake = selectedStake === "custom" ? $("customStake").value.trim() : selectedStake;
    if (!nickname) { $("createStatus").textContent = "내 닉네임을 적어주세요."; return; }
    if (!stake) { $("createStatus").textContent = "이번에 걸 것을 적어주세요."; return; }
    setBusy(true, $("createRoom"));
    $("createStatus").textContent = "단체방을 만드는 중이에요…";
    try {
      const data = await service.createRoom({
        gameSlug: "ladder",
        stakeText: stake,
        nickname,
        maxPlayers: Number($("maxPlayers").value),
        scoreMode: selectedMode
      });
      window.track && window.track("group_room_created", { game: "ladder", max_players: Number($("maxPlayers").value) });
      await enter(data, nickname);
    } catch (error) {
      $("createStatus").textContent = message(error);
    } finally { setBusy(false, $("createRoom")); }
  };

  $("joinRoom").onclick = async () => {
    if (busy) return;
    const nickname = $("joinNickname").value.trim();
    if (!nickname) { $("joinStatus").textContent = "닉네임을 적어주세요."; return; }
    setBusy(true, $("joinRoom"));
    $("joinStatus").textContent = "단체방에 들어가는 중이에요…";
    try {
      const data = await service.joinRoom(code, nickname);
      window.track && window.track("group_room_joined", { game: "ladder" });
      await enter(data, nickname);
    } catch (error) {
      $("joinStatus").textContent = message(error);
    } finally { setBusy(false, $("joinRoom")); }
  };

  $("readyRoom").onclick = async () => {
    if (!snapshot || busy) return;
    const me = snapshot.members.find(member => member.nickname === savedNickname());
    setBusy(true, $("readyRoom"));
    try { render(await service.setReady(snapshot.room.id, !(me && me.is_ready))); }
    catch (error) { $("roomMessage").textContent = message(error); }
    finally { setBusy(false, $("readyRoom")); }
  };

  $("startRoom").onclick = async () => {
    if (!snapshot || busy) return;
    setBusy(true, $("startRoom"));
    try { render(await service.startRoom(snapshot.room.id)); }
    catch (error) { $("roomMessage").textContent = message(error); }
    finally { setBusy(false, $("startRoom")); }
  };

  $("submitSeal").onclick = async () => {
    if (!snapshot || busy) return;
    setBusy(true, $("submitSeal"));
    try {
      const tenMode = snapshot.room.score_mode === "lowest_wins";
      if (tenMode && ten.err === null) { $("roomMessage").textContent = "먼저 10초 타이머를 멈춰주세요."; setBusy(false, $("submitSeal")); return; }
      render(await service.submitAnswer(snapshot.room.id, tenMode ? ten.err : null, tenMode ? { ten_ms_error: ten.err } : { sealed: true }));
      window.track && window.track("group_answer_submitted", { game: "ladder" });
    } catch (error) { $("roomMessage").textContent = message(error); }
    finally { setBusy(false, $("submitSeal")); }
  };

  /* 같은 조건(내기·정원·방식)으로 새 방을 만들고 링크만 다시 보낸다. 참가자 명단은 서버가 방 단위로 관리해 자동으로 옮기지 못한다. */
  $("playAgain").onclick = async () => {
    if (!snapshot || busy) return;
    setBusy(true, $("playAgain"));
    try {
      const room = snapshot.room;
      const data = await service.createRoom({ gameSlug: room.game_slug || "ladder", stakeText: room.stake_text, nickname: savedNickname() || "방장", maxPlayers: room.max_players, scoreMode: room.score_mode });
      tenReset();
      await enter(data, savedNickname() || "방장");
      $("roomMessage").textContent = "새 방을 만들었어요. 초대 링크를 친구들에게 다시 보내주세요.";
    } catch (error) { $("roomMessage").textContent = message(error); }
    finally { setBusy(false, $("playAgain")); }
  };

  $("finishRoom").onclick = async () => {
    if (!snapshot || busy) return;
    setBusy(true, $("finishRoom"));
    try {
      render(await service.finishRoom(snapshot.room.id));
      window.track && window.track("group_result_opened", { game: "ladder" });
    } catch (error) { $("roomMessage").textContent = message(error); }
    finally { setBusy(false, $("finishRoom")); }
  };

  $("shareRoom").onclick = () => share(false);
  $("shareResult").onclick = () => share(true);
  $("copyRoom").onclick = () => copyText(roomUrl());

  async function boot() {
    const match = location.hash.match(/^#room=([A-Z0-9]{8})$/i);
    if (!match) { show("createView"); return; }
    code = match[1].toUpperCase();
    $("joinCode").textContent = code;
    try {
      const data = await service.getRoom(code);
      render(data);
      await watchRoom();
    } catch (error) {
      show("joinView");
      if (!String(error && error.message).includes("ROOM_ACCESS_DENIED")) {
        $("joinStatus").textContent = message(error);
      }
    }
  }

  window.addEventListener("beforeunload", () => {
    if (stopSubscription) stopSubscription();
    clearInterval(refreshTimer);
  });
  boot();
})();
