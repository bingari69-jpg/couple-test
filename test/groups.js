/* 골프 조편성 — 명단 입력·티오프 시각·조 카드 공개·내 이름 찾기·지난 명단 불러오기 */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');
const shown = (w, id) => !el(w, id).classList.contains('hidden');

const maker = load('groups', '').window;
assert.ok(shown(maker, 's-make'));
assert.ok(!shown(maker, 'loadLast'), '저장된 명단이 없으면 불러오기 버튼 없음');
const names = ['민수', '지은', '현우', '다인', '서준', '하린', '태오', '유나'];
maker.__ev('state').names = names.slice(); maker.__ev('renderMake()');
el(maker, 'teeStart').value = '07:12'; el(maker, 'teeGap').value = '8';
el(maker, 'makeLink').click();
assert.ok(shown(maker, 's-share'));
const link = el(maker, 'linkbox').textContent;
const pay = JSON.parse(Buffer.from(new URL(link).hash.slice(3), 'base64url').toString());
assert.equal(pay.ns.length, 8); assert.equal(pay.tt, '07:12'); assert.equal(pay.tg, 8);
assert.ok(maker.localStorage.getItem('gh_groups_last'), '명단이 저장돼야 함');

/* 받는 쪽: 카드가 닫혀 있고, 이름을 찾으면 그 조가 열리며 티오프 시각이 붙는다 */
const viewer = load('groups', new URL(link).hash).window;
assert.ok(shown(viewer, 's-play'));
const cards = viewer.document.querySelectorAll('.gcard');
assert.equal(cards.length, 2, '8명은 4인조 2개');
assert.equal(viewer.document.querySelectorAll('.gcard.open').length, 0);
el(viewer, 'findName').value = '하린'; el(viewer, 'findName').dispatchEvent(new viewer.Event('input'));
const found = viewer.document.querySelector('.gcard.found');
assert.ok(found, '이름이 있는 카드가 표시돼야 함');
assert.ok(found.classList.contains('open'));
assert.match(found.textContent, /하린/);
assert.match(found.textContent, /⛳ 07:(12|20) 티오프/);
assert.match(el(viewer, 'findNote').textContent, /조예요 · ⛳ 07:(12|20)/);
el(viewer, 'findName').value = '없는사람'; el(viewer, 'findName').dispatchEvent(new viewer.Event('input'));
assert.match(el(viewer, 'findNote').textContent, /명단에 없어요/);
/* 두 번째 조 카드는 첫 조보다 8분 뒤 */
viewer.__ev('flip(0)'); viewer.__ev('flip(1)');
const tees = [...viewer.document.querySelectorAll('.gcard .tee')].map(t => t.textContent);
assert.deepEqual(tees.map(t => t.replace(/[^0-9:]/g, '')), ['07:12', '07:20']);

/* 티오프 없는 링크는 시각이 붙지 않고, 이상한 tt 값은 무시된다 */
const plain = load('groups', '#c=' + Buffer.from(JSON.stringify({ v: 1, ns: names, g: 4, s: 12345 })).toString('base64url')).window;
plain.__ev('flip(0)'); assert.equal(plain.document.querySelector('.gcard .tee'), null);
const weird = load('groups', '#c=' + Buffer.from(JSON.stringify({ v: 1, ns: names, g: 4, s: 12345, tt: '<b>x</b>', tg: 999 })).toString('base64url')).window;
weird.__ev('flip(0)'); assert.equal(weird.document.querySelector('.gcard .tee'), null);

/* 같은 창에서 새로 시작하면 지난 명단 버튼이 보이고, 누르면 채워진다 */
maker.__ev('state').names = ['', '', '', '', '']; maker.__ev('renderMake(); show("s-make")');
maker.__ev('(function(){const last=JSON.parse(localStorage.getItem("gh_groups_last"));document.getElementById("loadLast").textContent="지난 명단 불러오기 ("+last.ns.length+"명)";document.getElementById("loadLast").classList.remove("hidden");document.getElementById("loadLast").onclick=function(){state.names=last.ns.slice();renderMake();};})()');
el(maker, 'loadLast').click();
assert.equal(maker.document.querySelectorAll('#nameRows input').length, 8);
assert.equal(maker.document.querySelector('#nameRows input').value, '민수');

assert.deepEqual(PAGE_ERRORS, []);
console.log('골프 조편성 검사 통과 — 명단·티오프 링크, 카드 닫힘, 내 이름 찾기, 조별 시각, 잘못된 값 무시, 지난 명단');
