/* 공용 asset 캐시 버전 검사
   같은 파일이 페이지마다 다른 ?v= 로 불리면 캐시가 갈려 옛 모듈과 새 화면이 섞인다(HANDOFF의 실제 장애).
   규칙: (1) HTML/JS에서 부르는 assets/*.js|css 는 반드시 ?v= 가 있어야 하고 (2) 파일마다 버전은 딱 하나여야 한다. */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const htmlFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', '.git', 'tmp', 'output', 'design-previews', 'supabase', 'docs', 'scripts', 'test'].includes(name)) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.html')) htmlFiles.push(full);
  }
})(root);
const jsFiles = fs.readdirSync(path.join(root, 'assets')).filter(f => f.endsWith('.js')).map(f => path.join(root, 'assets', f));

const versions = new Map(); // asset -> Set(versions)
const unversioned = [];
function note(asset, version, where) {
  if (!versions.has(asset)) versions.set(asset, new Map());
  if (!versions.get(asset).has(version)) versions.get(asset).set(version, []);
  versions.get(asset).get(version).push(where);
}
for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:src|href)="(?:\.\.\/)*assets\/([a-z0-9-]+\.(?:js|css))(\?v=([^"]+))?"/g)) {
    if (!m[2]) unversioned.push(rel + ' → ' + m[1]);
    else note(m[1], m[3], rel);
  }
}
for (const file of jsFiles) {
  const rel = path.relative(root, file);
  const js = fs.readFileSync(file, 'utf8');
  for (const m of js.matchAll(/["'](?:[./]*assets\/)?([a-z0-9-]+\.(?:js|css))\?v=([^"'?]+)["']/g)) note(m[1], m[2], rel);
}

assert.deepEqual(unversioned, [], '버전 없는 asset 참조가 있습니다');
const split = [...versions].filter(([, byVersion]) => byVersion.size > 1)
  .map(([asset, byVersion]) => asset + ': ' + [...byVersion].map(([v, where]) => v + ' (' + where.length + ')').join(' / '));
assert.deepEqual(split, [], '같은 asset 이 서로 다른 버전으로 불립니다');
assert.ok(versions.size >= 20, 'asset 참조를 충분히 찾지 못했습니다: ' + versions.size);
console.log('asset 버전 검사 통과 — ' + versions.size + '개 파일 모두 단일 버전, 버전 없는 참조 없음');
