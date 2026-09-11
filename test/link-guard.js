/* 잘린 링크 안내 — 공통 link-guard.js 검사
   #c=/#i=/#r= 표시는 있는데 내용이 풀리지 않으면 안내가 떠야 하고,
   정상 링크·빈 주소·자체 안내가 있는 게임에서는 뜨면 안 된다. */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, b64e, PAGE_ERRORS } = require('./dom');

const guard = fs.readFileSync(path.join(__dirname, '../assets/link-guard.js'), 'utf8');
const open = (game, hash) => { const w = load(game, hash).window; w.eval(guard); return w; };
const banner = w => w.document.getElementById('gatchi-link-guard');

const good = b64e(JSON.stringify({ v: 1, n: '서준', a: [0, 1, 0] }));
const cut = good.slice(0, Math.floor(good.length / 2)); // 복사하다 반쯤 끊긴 링크

/* 1) 잘린 초대·결과·도전 링크: 다섯 게임 모두 안내가 뜬다 */
for (const [game, prefix] of [['delivery', 'i'], ['mbti', 'i'], ['seat', 'r'], ['exam', 'c'], ['crash', 'i'], ['ten', 'c']]) {
  const w = open(game, '#' + prefix + '=' + cut);
  const box = banner(w);
  assert.ok(box, game + ': 잘린 링크 안내가 떠야 함');
  assert.match(box.textContent, /링크가 잘렸어요/);
  assert.match(box.textContent, /카카오톡에서 받은 카드를 다시/);
  box.querySelector('button').click();
  assert.equal(banner(w), null, game + ': 닫기 버튼으로 사라져야 함');
}

/* 2) 정상적으로 풀리는 링크와 빈 주소에는 뜨지 않는다 */
assert.equal(banner(open('delivery', '#i=' + good)), null, '정상 링크에는 안내 없음');
assert.equal(banner(open('delivery', '')), null, '빈 주소에는 안내 없음');
assert.equal(banner(open('delivery', '#all')), null, '표시 없는 해시에는 안내 없음');

/* 3) URI 인코딩된 정상 링크(기억·싸움 게임 방식)도 정상으로 본다 */
assert.equal(banner(open('delivery', '#i=' + encodeURIComponent(good))), null);
assert.equal(open('delivery', '#i=' + encodeURIComponent(good)).GatchiLinkGuard.isBroken(), false);

/* 4) 자체 안내 화면이 있는 게임은 건너뛴다 */
assert.equal(banner(open('tarot', '#c=' + cut)), null, '타로는 자체 안내를 쓴다');

/* 5) 추락 게임의 옛 토스트 문구는 사라져야 한다(중복 안내 방지) */
assert.ok(!fs.readFileSync(path.join(__dirname, '../t/crash/index.html'), 'utf8').includes('링크를 읽지 못했어요'));

/* 6) analytics.js가 모든 게임에 공통으로 주입한다 */
assert.ok(fs.readFileSync(path.join(__dirname, '../assets/analytics.js'), 'utf8').includes('link-guard.js?v='));

assert.deepEqual(PAGE_ERRORS, []);
console.log('잘린 링크 안내 검사 통과 — 6개 게임 안내·닫기, 정상/빈/인코딩 링크 제외, 타로 건너뜀, 추락 토스트 제거, 공통 주입');
