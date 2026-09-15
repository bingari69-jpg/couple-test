// 타임 점프: 다섯 시대가 넘어지지 않고 깰 수 있는 판인지 경로를 찾는다.
// 입력 한 칸 = 6걸음(96ms) 동안 누르는 버튼. R 오른쪽 · r 오른쪽+점프 · . 가만히 · L 왼쪽 · l 왼쪽+점프 · j 점프
// 빔 탐색으로 가장 멀리 간 상태들을 남기며(칸·높이·발판·적 상태별로 하나씩) 우체통에 닿는 입력 줄을 찾는다.
// `node scripts/timejump-routes.cjs` → test/timejump-routes.json 에 경로와 시간을 쓴다. `ONLY=3` 으로 한 판만.
const fs = require('fs'), path = require('path');
const TJ = require('../t/timejump/engine.js');
const K = 6, BEAM = Number(process.env.BEAM || 500);
const ACTIONS = { R: { r: 1 }, r: { r: 1, j: 1 }, '.': {}, L: { l: 1 }, l: { l: 1, j: 1 }, j: { j: 1 } };
const KEYS = Object.keys(ACTIONS);

function run(L, s, code) {
  const inp = ACTIONS[code];
  for (let i = 0; i < K && !s.done; i++) { TJ.step(L, s, inp); if (s.deaths) return false; }
  return true;
}

function search(n) {
  const L = TJ.level(n), maxBlocks = Math.ceil(L.limitMs / TJ.STEP / K);
  let beam = [{ s: TJ.create(n), route: '' }], far = 0;
  for (let b = 0; b < maxBlocks; b++) {
    const next = new Map();
    for (const node of beam) for (const code of KEYS) {
      const s = TJ.clone(node.s);
      if (!run(L, s, code)) continue;
      const route = node.route + code;
      if (s.done) return { n, era: L.era, route, timeMs: s.timeMs };
      const key = [Math.round(s.x / 5), Math.round(s.y / 5), s.ground ? 1 : 0, s.ride, s.vy < 0 ? 1 : 0, s.coyote > 0 ? 1 : 0, s.alive.join(''), s.crumb.map(v => v === 0 ? 0 : 1).join('')].join('|');
      const old = next.get(key);
      if (!old || s.x > old.s.x) next.set(key, { s, route });
    }
    beam = [...next.values()].sort((a, b) => b.s.x - a.s.x).slice(0, BEAM);
    if (!beam.length) break;
    far = Math.max(far, beam[0].s.x);
  }
  return { n, era: L.era, route: null, farthestCol: Math.floor(far / TJ.T), cols: L.cols };
}

function replay(n, route) {
  const L = TJ.level(n), s = TJ.create(n);
  for (const code of route) { for (let i = 0; i < K && !s.done; i++) TJ.step(L, s, ACTIONS[code]); if (s.done) break; }
  return s;
}

module.exports = { search, replay, ACTIONS, K };
if (require.main === module) {
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : [1, 2, 3, 4, 5];
  const file = path.join(__dirname, '../test/timejump-routes.json');
  const saved = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  let ok = true;
  for (const n of only) {
    const t0 = Date.now(), r = search(n);
    if (r.route) { saved[n] = { era: r.era, timeMs: r.timeMs, route: r.route }; console.log(`Lv${n} ${r.era}: ${(r.timeMs / 1000).toFixed(2)}초 (${((Date.now() - t0) / 1000).toFixed(1)}s 탐색)`); }
    else { ok = false; console.log(`Lv${n} ${r.era}: 경로 없음 — 가장 멀리 ${r.farthestCol}/${r.cols}칸`); }
  }
  fs.writeFileSync(file, JSON.stringify(saved, null, 1) + '\n');
  if (!ok) process.exitCode = 1;
}
