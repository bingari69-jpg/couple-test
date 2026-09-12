/* 완료 알림 카드의 "결과 보기" — 같은 게임 페이지가 열려 있으면 #해시만 바뀌어 아무 일도 안 생기던 문제.
   같은 경로면 강제로 다시 읽고(_openSamePage), 다른 경로면 일반 링크로 둔다. */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, PAGE_ERRORS } = require('./dom');

const source = fs.readFileSync(path.join(__dirname, '../assets/result-notify.js'), 'utf8');
const w = load('ten', '#c=abc').window;   // 도전자가 자기 도전장 페이지를 열어 둔 상황
w.eval(source);
assert.ok(w.ResultNotify && w.ResultNotify._test.announceCompleted, '테스트용 announceCompleted 노출');

const opened = [];
w.ResultNotify._openSamePage = href => opened.push(href);

/* 같은 경로(/t/ten/)의 결과 주소 → 강제로 다시 읽기 */
w.ResultNotify._test.announceCompleted({ code: 'ABCDEFGHIJKL', status: 'completed', game_slug: 'ten', result_url: '/couple-test/t/ten/#r=eyJ2IjoxfQ', result_summary: '상대가 끝냈어요' });
const panel = w.document.getElementById('resultNotifyPanel');
assert.ok(panel && !panel.hidden, '알림 카드가 떠야 함');
const link = panel.querySelector('a.result-notify-primary');
assert.ok(link, '결과 보기 링크');
assert.equal(link.textContent, '결과 보기');
link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
assert.equal(opened.length, 1, '같은 페이지면 다시 읽기 경로를 타야 함');
assert.match(opened[0], /\/t\/ten\/#r=eyJ2IjoxfQ$/);

/* 다른 경로(/t/react/)의 결과 주소 → 가로채지 않고 일반 링크 */
w.ResultNotify._test.announceCompleted({ code: 'ABCDEFGHIJKM', status: 'completed', game_slug: 'react', result_url: '/couple-test/t/react/#r=eyJ2IjoxfQ', result_summary: 'x' });
const link2 = w.document.querySelector('#resultNotifyPanel a.result-notify-primary');
assert.match(link2.href, /\/t\/react\//);
link2.addEventListener('click', e => e.preventDefault()); // jsdom은 실제 이동을 못 하므로 기본 동작만 막는다
link2.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
assert.equal(opened.length, 1, '다른 경로는 강제 다시 읽기를 타지 않음');

/* 다른 출처는 링크 자체를 만들지 않는다 */
w.ResultNotify._test.announceCompleted({ code: 'ABCDEFGHIJKN', status: 'completed', game_slug: 'ten', result_url: 'https://evil.example/x', result_summary: 'x' });
assert.equal(w.document.querySelector('#resultNotifyPanel a'), null);

assert.deepEqual(PAGE_ERRORS.filter(e => !/jsdelivr|supabase|network|fetch/i.test(e)), []);
console.log('결과 보기 열기 검사 통과 — 같은 페이지는 다시 읽기, 다른 페이지는 일반 링크, 다른 출처는 링크 없음');
