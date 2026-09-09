const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const page = path.join(__dirname, '../t/letter/index.html');
const html = fs.readFileSync(page, 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  '<script>' + fs.readFileSync(path.resolve(path.dirname(page), src.split('?')[0]), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>');
const body = '한글👩‍❤️‍👨\n다음 줄.\n\n고마워 <b>♥</b>';
const hash = '#l=' + Buffer.from(JSON.stringify({v:4, w:body, n:'친구'})).toString('base64url');
let now = 0, id = 0;
const timers = new Map();
const dom = new JSDOM(html, {url:'https://example.com/t/letter/' + hash, runScripts:'dangerously', beforeParse(w) {
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({matches:false});
  w.setTimeout = (fn, delay) => {timers.set(++id, {fn, at:now + delay}); return id;};
  w.clearTimeout = id => timers.delete(id);
}});
const w = dom.window, $ = id => w.document.getElementById(id);
function advance(ms) {
  const end = now + ms;
  for (;;) {
    const next = [...timers].sort((a,b) => a[1].at - b[1].at)[0];
    if (!next || next[1].at > end) break;
    now = next[1].at; timers.delete(next[0]); next[1].fn();
  }
  now = end;
}
const visible = () => [...$('readBody').querySelectorAll('.is-visible')].map(x => x.textContent).join('');
$('readerEnvelope').click(); advance(600);
assert.equal($('openedLetter').hidden, false);
assert.equal($('skipRead').hidden, false);
assert.equal(visible(), '');
assert.equal($('readBody').querySelector('.letter-accessible-text').textContent, body);
assert.equal($('readBody').querySelector('[aria-hidden]').textContent, body);
advance(180); assert.equal(visible(), '한');
advance(45); assert.equal(visible(), '한글');
advance(45); assert.equal(visible(), '한글👩‍❤️‍👨');
advance(45); assert.equal(visible(), '한글👩‍❤️‍👨\n');
advance(279); assert.equal(visible(), '한글👩‍❤️‍👨\n');
advance(1); assert.equal(visible(), '한글👩‍❤️‍👨\n다');
$('skipRead').click();
assert.equal($('readBody').textContent, body);
assert.equal($('readBody').children.length, 0);
assert.equal($('skipRead').hidden, true);
assert.equal(w.document.activeElement, $('readBody'));
advance(10000); assert.equal($('readBody').textContent, body);

// Navigation during a reveal cancels it, and reopening starts from the beginning.
$('replyLetter').click(); $('viewTemplate').click(); $('openSample').click(); advance(780);
assert.equal($('sampleBody').querySelectorAll('.is-visible').length, 1);
$('envelopeTab').click(); assert.equal($('sampleBody').children.length, 0);
assert.equal($('skipSample').hidden, true);
$('sampleEnvelope').click(); advance(600);
assert.equal($('sampleBody').querySelectorAll('.is-visible').length, 0);
advance(30000); assert.equal($('sampleBody').children.length, 0);
assert.equal($('skipSample').hidden, true);
$('openSample').click(); advance(780); $('useTemplate').click();
assert.equal($('compose').hidden, false);
assert.equal($('sampleBody').children.length, 0);
assert.equal(timers.size, 0);
dom.window.close();
console.log('편지 효과 검사 통과 — 한글·이모지, 줄바꿈 간격, 전체 보기, 자동 완료, 재생 취소·다시 열기');
