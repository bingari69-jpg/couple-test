/* npm run test:update — 골든 스냅샷을 지금 코드 기준으로 다시 찍는다.
   의도한 변경일 때만 실행할 것. npm test 는 이 파일을 부르지 않는다. */
const fs = require("fs");
const { GAMES, snapshot, GOLDEN } = require("./scenarios");

const had = fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, "utf8")) : null;
const got = snapshot();

/* 무엇이 바뀌는지 먼저 보여준다 */
if (had) {
  const changed = [];
  (function walk(a, b, p) {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const obj = a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b);
    if (obj) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + "." + k); return; }
    changed.push(p);
    console.log("· " + p);
    console.log("    전 : " + JSON.stringify(a));
    console.log("    후 : " + JSON.stringify(b));
  })(had, got, "");
  console.log(changed.length ? `\n${changed.length}곳 갱신` : "\n바뀐 곳 없음");
}

const broken = GAMES.filter(g => got[g] && got[g].__pageErrors);
if (broken.length) {
  console.error("\n페이지 오류가 있는 채로는 갱신하지 않는다: " + broken.join(", "));
  broken.forEach(g => console.error("  " + got[g].__pageErrors.join(" / ")));
  process.exit(1);
}

fs.writeFileSync(GOLDEN, JSON.stringify(got, null, 2) + "\n", "utf8");
console.log("→ " + GOLDEN);
