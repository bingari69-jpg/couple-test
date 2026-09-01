/* npm test — 지금 코드로 찍은 스냅샷을 test/golden.json 과 바이트 비교.
   여기서는 절대 golden.json 을 건드리지 않는다. 갱신은 npm run test:update. */
const fs = require("fs");
const { GAMES, snapshot, GOLDEN } = require("./scenarios");

if (!fs.existsSync(GOLDEN)) {
  console.error("golden.json 이 없다. 먼저 `npm run test:update` 로 만들어라.");
  process.exit(1);
}
const want = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));

let got;
try {
  got = snapshot();
} catch (e) {
  console.error("스냅샷을 만들다 실패했다:\n" + (e && e.stack || e));
  process.exit(1);
}

const diffs = [];
function walk(a, b, p) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  const obj = a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b);
  if (obj) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + "." + k);
    return;
  }
  diffs.push({ path: p, want: a, got: b });
}
for (const g of GAMES) walk(want[g], got[g], g);

/* 페이지 자바스크립트 오류는 스냅샷이 같더라도 실패로 본다 */
const broken = GAMES.filter(g => got[g] && got[g].__pageErrors);

for (const d of diffs) {
  console.log("✗ " + d.path);
  console.log("   golden : " + JSON.stringify(d.want));
  console.log("   지금   : " + JSON.stringify(d.got));
}
for (const g of broken) console.log("✗ " + g + " 페이지 오류: " + got[g].__pageErrors.join(" / "));

if (!diffs.length && !broken.length) {
  console.log(`골든 비교 통과 — 게임 ${GAMES.length}개, 차이 없음`);
  process.exit(0);
}
console.log(`\n골든과 다른 곳 ${diffs.length}곳${broken.length ? `, 페이지 오류 ${broken.length}개` : ""}.`);
console.log("의도한 변경이면  npm run test:update  로 스냅샷을 갱신하고 갱신 내용을 커밋에 남길 것.");
process.exit(1);
