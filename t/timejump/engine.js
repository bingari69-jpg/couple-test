/* 타임 점프 — 판(코어)
   화면·조작·도전장은 index.html 에 있고, 여기에는 DOM 없이 도는 스테이지와 물리만 둔다.
   그래서 Node 에서 그대로 불러 "정말 깰 수 있는 판인지" 경로를 찾아 검사할 수 있다
   (scripts/timejump-routes.cjs · test/timejump.js).

   규칙: 병아리가 편지를 들고 다섯 시대를 건넌다. 우체통에 닿으면 클리어, 기록 = 걸린 시간(ms).
   넘어져도(구멍·가시·적) 판이 끝나지 않는다. 마지막 깃발에서 다시 시작하고 시간은 계속 흐른다.
   물리는 16ms 고정 걸음. 적·움직이는 발판의 위치는 걸음 수만으로 정해져 두 사람이 같은 판을 받는다.

   타일: 0 빈칸 · 1 땅 · 2 가시 · 3 벽돌(땅과 똑같이 막히고 그림만 다르다)
   좌표: 한 칸 T=18px, 화면 360×270(20칸×15줄). 줄 0이 맨 위. 땅 윗면은 보통 11줄. */
(function (root) {
  "use strict";
  const T = 18, ROWS = 15, W = 360, H = 270, STEP = 16, DT = STEP / 1000;
  const P = { w: 12, h: 15 };                          // 병아리 몸
  const RUN = 125, ACC_G = 1100, ACC_A = 750, DEC_G = 1500, DEC_A = 500;   // px/s, px/s²
  const GRAV = 1400, JUMP_V = -470, JUMP_CUT = -160, MAX_FALL = 500;       // 점프 높이 약 4.4칸, 멀리 약 4.6칸
  const COYOTE = 6, BUFFER = 8;                        // 발판 끝 늦은 점프 96ms, 미리 누른 점프 128ms
  const STOMP_V = -300, STOMP_HOLD_V = -430;           // 적을 밟고 튀어 오르는 속도 (점프를 누르고 있으면 더 높이)
  const DEAD_TICKS = 38, INVUL_TICKS = 60;             // 넘어진 뒤 0.6초 쉬고, 되살아나면 1초 동안 적에게 무적
  const CRUMBLE_DELAY = 22, CRUMBLE_BACK = 190;        // 무너지는 발판: 밟고 0.35초 뒤 떨어지고 3초 뒤 돌아온다
  const EW = 14, EH = 14, MOVER_H = 8;

  /* ── 다섯 시대 ──
     ground(c0,c1,윗줄) 땅 · block(c,r,w,h) 벽돌 · spikes(c,r,w) 가시 · enemy(c0,c1,속도) 좌우로 걷는 적
     mover(c,r,w,옮길칸x,옮길칸y,주기ms) 움직이는 발판(위에서만 밟힘) · crumble(c,r,w) 무너지는 발판
     check(c) 깃발(되살아나는 자리) · goal(c) 우체통 */
  const LEVELS = [
    { n: 1, era: "원시시대", key: "stone", cols: 112, limitMs: 90000, build(b) {
      b.ground(0, 20, 11); b.block(12, 10);
      b.ground(22, 38, 11); b.block(30, 10); b.block(31, 9, 1, 2); b.block(32, 8, 1, 3);
      b.ground(40, 52, 11); b.block(45, 8, 4, 1);
      b.ground(55, 75, 11); b.check(57); b.block(62, 9, 1, 2); b.block(68, 10);
      b.ground(75, 90, 10);
      b.ground(93, 112, 11); b.goal(106);
    } },
    { n: 2, era: "고대 이집트", key: "egypt", cols: 142, limitMs: 120000, build(b) {
      b.ground(0, 26, 11); b.spikes(10, 10, 2); b.enemy(16, 25, 28);
      b.ground(29, 50, 11); b.block(36, 10, 3, 1); b.block(37, 9); b.enemy(39, 43, 28); b.spikes(45, 10, 3);
      b.ground(52, 70, 11); b.check(54); b.spikes(60, 10, 3); b.enemy(64, 69, 28);
      b.ground(73, 100, 11); b.block(80, 10); b.block(81, 9, 1, 2); b.block(82, 8, 2, 3); b.block(84, 9, 1, 2); b.block(85, 10);
      b.spikes(89, 10, 2); b.enemy(92, 99, 30);
      b.ground(103, 142, 11); b.check(105); b.enemy(108, 114, 30); b.spikes(117, 10, 2); b.enemy(122, 130, 32); b.goal(137);
    } },
    { n: 3, era: "중세", key: "castle", cols: 162, limitMs: 150000, build(b) {
      b.ground(0, 16, 11); b.mover(17, 11, 3, 4, 0, 3200);
      b.ground(24, 40, 11); b.enemy(27, 35, 32); b.block(38, 8, 2, 3);
      b.ground(40, 46, 11); b.check(42); b.mover(46, 11, 3, 0, -5, 4000);
      b.ground(49, 57, 6);
      b.ground(57, 70, 11); b.spikes(62, 10, 2); b.enemy(65, 69, 34); b.mover(71, 10, 2, 5, 0, 2800);
      b.ground(79, 100, 11); b.check(81); b.enemy(85, 91, 34); b.enemy(93, 99, 34); b.mover(101, 11, 3, 4, 0, 3000);
      b.ground(108, 125, 11); b.spikes(114, 10, 3);
      b.ground(128, 162, 11); b.check(130); b.enemy(134, 146, 36); b.block(150, 9, 2, 2); b.goal(157);
    } },
    { n: 4, era: "산업시대", key: "factory", cols: 182, limitMs: 180000, build(b) {
      b.ground(0, 14, 11); b.crumble(14, 11, 8);
      b.ground(22, 40, 11); b.enemy(26, 38, 55);
      b.block(43, 10); b.block(46, 9); b.block(49, 10);
      b.ground(52, 66, 11); b.check(54); b.spikes(58, 10, 2); b.spikes(62, 10, 2); b.mover(67, 11, 2, 5, 0, 2400);
      b.ground(74, 95, 11); b.enemy(77, 84, 55); b.enemy(87, 94, 55);
      b.crumble(96, 9, 3); b.crumble(101, 8, 3);
      b.ground(106, 125, 11); b.check(108); b.spikes(113, 10); b.spikes(117, 10); b.spikes(121, 10);
      b.block(128, 10);
      b.ground(131, 146, 11); b.check(133); b.mover(146, 11, 2, 0, -4, 3200);
      b.ground(148, 158, 7);
      b.ground(158, 182, 11); b.enemy(163, 172, 58); b.goal(177);
    } },
    { n: 5, era: "미래 우주", key: "space", cols: 204, limitMs: 210000, build(b) {
      b.ground(0, 12, 11); b.crumble(12, 11, 6);
      b.ground(18, 30, 11); b.spikes(21, 10, 2); b.enemy(25, 30, 55); b.mover(31, 11, 2, 5, 0, 2200);
      b.ground(38, 48, 11); b.check(40);
      b.block(51, 9); b.block(54, 8); b.block(57, 9);
      b.ground(60, 74, 11); b.spikes(64, 10, 3); b.enemy(68, 73, 60); b.mover(74, 11, 3, 0, -4, 3000);
      b.ground(77, 86, 7); b.check(79); b.crumble(86, 7, 6);
      b.ground(92, 110, 11); b.check(96); b.spikes(100, 10, 2); b.enemy(102, 106, 40); b.spikes(106, 10, 2);
      b.mover(111, 11, 2, 4, 0, 2000); b.block(119, 9);
      b.ground(122, 140, 11); b.check(124); b.enemy(128, 133, 62); b.enemy(135, 140, 62);
      b.crumble(141, 9, 2); b.crumble(145, 8, 2); b.crumble(149, 9, 2);
      b.ground(152, 170, 11); b.spikes(157, 10, 3); b.enemy(162, 170, 65); b.mover(171, 10, 2, 5, 0, 1800);
      b.ground(178, 204, 11); b.goal(198);
    } }
  ];

  /* ── 스테이지 만들기 ── */
  const built = {};
  function level(n) {
    if (built[n]) return built[n];
    const def = LEVELS[n - 1]; if (!def) throw new Error("no level " + n);
    const cols = def.cols, grid = new Uint8Array(cols * ROWS);
    const set = (c, r, v) => { if (c >= 0 && c < cols && r >= 0 && r < ROWS) grid[r * cols + c] = v; };
    const raw = { enemies: [], movers: [], crumbles: [], checks: [2], goal: cols - 4 };
    def.build({
      ground(c0, c1, top) { for (let c = c0; c < c1; c++) for (let r = top; r < ROWS; r++) set(c, r, 1); },
      block(c, r, w = 1, h = 1) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) set(c + i, r + j, 3); },
      spikes(c, r, w = 1) { for (let i = 0; i < w; i++) set(c + i, r, 2); },
      enemy(c0, c1, speed) { raw.enemies.push({ c0, c1, speed }); },
      mover(c, r, w, dc, dr, period) { raw.movers.push({ x0: c * T, y0: r * T, w: w * T, dx: dc * T, dy: dr * T, period }); },
      crumble(c, r, w = 1) { for (let i = 0; i < w; i++) raw.crumbles.push({ x: (c + i) * T, y: r * T }); },
      check(c) { raw.checks.push(c); },
      goal(c) { raw.goal = c; }
    });
    const surface = c => { for (let r = 0; r < ROWS; r++) if (isSolid(grid[r * cols + c])) return r; return ROWS; };
    const L = {
      n, era: def.era, key: def.key, cols, grid, limitMs: def.limitMs, widthPx: cols * T,
      movers: raw.movers, crumbles: raw.crumbles,
      enemies: raw.enemies.map(e => ({ x0: e.c0 * T, span: Math.max(0, (e.c1 - e.c0) * T - EW), y: surface(e.c0) * T - EH, speed: e.speed })),
      checks: raw.checks.map(c => ({ col: c, x: c * T + (T - P.w) / 2, y: surface(c) * T - P.h, trigger: c * T })),
      goal: { x: raw.goal * T + 2, y: (surface(raw.goal) - 2) * T, w: T - 4, h: 2 * T }
    };
    built[n] = L;
    return L;
  }

  function isSolid(v) { return v === 1 || v === 3; }

  /* 걸음 수만으로 위치가 정해진다(상태를 저장하지 않는다) */
  function moverPos(m, tick) {
    const ph = ((tick * STEP) % m.period) / m.period, k = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    return { x: m.x0 + m.dx * k, y: m.y0 + m.dy * k };
  }
  function enemyX(e, tick) {
    if (!e.span) return e.x0;
    const d = (e.speed * tick * DT) % (2 * e.span);
    return e.x0 + (d <= e.span ? d : 2 * e.span - d);
  }

  function create(n) {
    const L = level(n), cp = L.checks[0];
    return {
      level: n, ticks: 0, x: cp.x, y: cp.y, vx: 0, vy: 0, face: 1, ground: false, ride: -1,
      coyote: 0, buffer: 0, prevJ: false, dead: 0, deadX: 0, deadY: 0, invul: 0,
      deaths: 0, stomps: 0, cp: 0, done: false, timeMs: 0,
      alive: L.enemies.map(() => 1), crumb: L.crumbles.map(() => 0)
    };
  }
  function clone(s) { const c = Object.assign({}, s); c.alive = s.alive.slice(); c.crumb = s.crumb.slice(); return c; }

  const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  function tileAt(L, c, r) { if (c < 0 || c >= L.cols || r < 0 || r >= ROWS) return 0; return L.grid[r * L.cols + c]; }

  function die(s) {
    s.deaths++; s.dead = DEAD_TICKS; s.deadX = s.x; s.deadY = s.y; s.vx = 0; s.vy = 0; s.ride = -1;
  }
  function respawn(L, s) {
    const cp = L.checks[s.cp];
    s.x = cp.x; s.y = cp.y; s.vx = 0; s.vy = 0; s.ground = false; s.ride = -1;
    s.coyote = 0; s.buffer = 0; s.invul = INVUL_TICKS;
    for (let i = 0; i < s.crumb.length; i++) s.crumb[i] = 0;
  }

  function collideX(L, s, sign) {
    if (!sign) return;
    const r0 = Math.floor(s.y / T), r1 = Math.floor((s.y + P.h - 0.001) / T);
    const c = sign > 0 ? Math.floor((s.x + P.w - 0.001) / T) : Math.floor(s.x / T);
    for (let r = r0; r <= r1; r++) if (isSolid(tileAt(L, c, r))) { s.x = sign > 0 ? c * T - P.w : (c + 1) * T; s.vx = 0; break; }
    for (let i = 0; i < L.crumbles.length; i++) {
      if (s.crumb[i] < 0) continue; const k = L.crumbles[i];
      if (overlap(s.x, s.y, P.w, P.h, k.x, k.y, T, T)) { s.x = sign > 0 ? k.x - P.w : k.x + T; s.vx = 0; }
    }
  }

  function collideY(L, s, prevTop, prevBottom, tick) {
    const c0 = Math.floor(s.x / T), c1 = Math.floor((s.x + P.w - 0.001) / T);
    if (s.vy >= 0) {
      const r = Math.floor((s.y + P.h - 0.001) / T);
      for (let c = c0; c <= c1; c++) if (isSolid(tileAt(L, c, r))) { s.y = r * T - P.h; s.vy = 0; s.ground = true; break; }
    } else {
      const r = Math.floor(s.y / T);
      for (let c = c0; c <= c1; c++) if (isSolid(tileAt(L, c, r))) { s.y = (r + 1) * T; s.vy = 0; break; }
    }
    for (let i = 0; i < L.crumbles.length; i++) {
      if (s.crumb[i] < 0) continue; const k = L.crumbles[i];
      if (!overlap(s.x, s.y, P.w, P.h, k.x, k.y, T, T)) continue;
      if (s.vy >= 0 && prevBottom <= k.y + 0.5) { s.y = k.y - P.h; s.vy = 0; s.ground = true; if (s.crumb[i] === 0) s.crumb[i] = 1; }
      else if (s.vy < 0 && prevTop >= k.y + T - 0.5) { s.y = k.y + T; s.vy = 0; }
    }
    if (s.vy >= 0) {
      for (let i = 0; i < L.movers.length; i++) {
        const m = L.movers[i], a = moverPos(m, tick - 1), b = moverPos(m, tick);
        if (s.x + P.w <= b.x || s.x >= b.x + m.w) continue;
        if (prevBottom <= Math.max(a.y, b.y) + 1 && s.y + P.h >= b.y) { s.y = b.y - P.h; s.vy = 0; s.ground = true; s.ride = i; break; }
      }
    }
  }

  /* 한 걸음. inp = { l, r, j } 누르고 있는지 */
  function step(L, s, inp) {
    if (s.done) return;
    s.ticks++;
    const t = s.ticks;
    for (let i = 0; i < s.crumb.length; i++) {
      const v = s.crumb[i];
      if (v > 0) s.crumb[i] = v >= CRUMBLE_DELAY ? -CRUMBLE_BACK : v + 1;
      else if (v < 0) s.crumb[i] = v + 1;
    }
    const j = !!(inp && inp.j), pressed = j && !s.prevJ; s.prevJ = j;
    if (s.dead > 0) { s.dead--; if (s.dead === 0) respawn(L, s); return; }
    if (s.invul > 0) s.invul--;
    if (pressed) s.buffer = BUFFER; else if (s.buffer > 0) s.buffer--;

    const dir = (inp && inp.r ? 1 : 0) - (inp && inp.l ? 1 : 0);
    if (dir) s.face = dir;
    const target = dir * RUN, acc = dir ? (s.ground ? ACC_G : ACC_A) : (s.ground ? DEC_G : DEC_A);
    if (s.vx < target) s.vx = Math.min(target, s.vx + acc * DT); else if (s.vx > target) s.vx = Math.max(target, s.vx - acc * DT);

    if (s.buffer > 0 && s.coyote > 0) { s.vy = JUMP_V; s.buffer = 0; s.coyote = 0; s.ground = false; s.ride = -1; }
    if (!j && s.vy < JUMP_CUT) s.vy = JUMP_CUT;           // 일찍 떼면 낮게 뛴다
    s.vy = Math.min(MAX_FALL, s.vy + GRAV * DT);

    const x0 = s.x;
    if (s.ride >= 0) { const m = L.movers[s.ride], a = moverPos(m, t - 1), b = moverPos(m, t); s.x += b.x - a.x; s.y += b.y - a.y; }
    const prevTop = s.y, prevBottom = s.y + P.h;

    s.x += s.vx * DT;
    if (s.x < 0) { s.x = 0; s.vx = 0; }
    if (s.x > L.widthPx - P.w) { s.x = L.widthPx - P.w; s.vx = 0; }
    collideX(L, s, Math.sign(s.x - x0));

    s.y += s.vy * DT;
    s.ground = false; s.ride = -1;
    collideY(L, s, prevTop, prevBottom, t);
    if (s.ground) s.coyote = COYOTE; else if (s.coyote > 0) s.coyote--;

    /* 가시(아래쪽 뾰족한 부분만) · 떨어짐 */
    const hx = s.x + 2, hy = s.y + 3, hw = P.w - 4, hh = P.h - 3;
    const c0 = Math.floor(hx / T), c1 = Math.floor((hx + hw) / T), r0 = Math.floor(hy / T), r1 = Math.floor((hy + hh) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (tileAt(L, c, r) === 2 && overlap(hx, hy, hw, hh, c * T + 3, r * T + 7, T - 6, T - 7)) { die(s); return; }
    }
    if (s.y > H + 10) { die(s); return; }

    /* 적: 위에서 떨어지며 닿으면 밟기, 아니면 넘어짐 */
    for (let i = 0; i < L.enemies.length; i++) {
      if (!s.alive[i]) continue; const e = L.enemies[i], ex = enemyX(e, t);
      if (!overlap(s.x, s.y, P.w, P.h, ex, e.y, EW, EH)) continue;
      if (s.vy > 0 && prevBottom <= e.y + 6) { s.alive[i] = 0; s.stomps++; s.vy = j ? STOMP_HOLD_V : STOMP_V; s.coyote = 0; }
      else if (s.invul === 0) { die(s); return; }
    }

    for (let i = s.cp + 1; i < L.checks.length; i++) if (s.x + P.w / 2 >= L.checks[i].trigger) s.cp = i;
    const g = L.goal;
    if (overlap(s.x, s.y, P.w, P.h, g.x, g.y, g.w, g.h)) { s.done = true; s.timeMs = t * STEP; }
  }

  const api = { isSolid, T, ROWS, W, H, STEP, P, EW, EH, MOVER_H, LEVELS, level, create, clone, step, moverPos, enemyX, tileAt };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TimeJump = api;
})(typeof window !== "undefined" ? window : globalThis);
