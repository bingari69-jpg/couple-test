/* 전 게임 연기 검사(smoke)
   27개 게임 페이지를 (1) 빈 주소 (2) 잘린 해시 (3) 모양이 전혀 다른 정상 JSON 해시 로 열어
   페이지 스크립트가 예외를 내지 않는지 본다. 개별 흐름 검사가 없는 게임(시험지·조편성·사다리·MBTI·좌석·배달·싸움 등)의
   최소 안전망이다. */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, PAGE_ERRORS } = require('./dom');

const root = path.join(__dirname, '..');
const games = fs.readdirSync(path.join(root, 't')).filter(d => fs.existsSync(path.join(root, 't', d, 'index.html')))
  .filter(d => d !== 'mind').concat(['mind/fight']).sort();
assert.ok(games.length >= 27, '게임 폴더가 ' + games.length + '개뿐입니다');

const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const hashes = [
  '',
  '#c=abc', '#i=abc', '#r=abc',
  '#c=' + enc({ v: 9, zzz: 1 }), '#i=' + enc({ v: 9, zzz: 1 }), '#r=' + enc({ v: 9, zzz: [1] }),
  '#l=abc', '#room=XYZ'
];

const opened = [];
for (const game of games) {
  for (const hash of hashes) {
    try { opened.push(load(game, hash).window); }
    catch (e) { PAGE_ERRORS.push(game + ' ' + hash + ': loader threw ' + e.message); }
  }
}

setTimeout(() => {
  opened.forEach(w => { try { w.close(); } catch (_) {} });
  assert.deepEqual(PAGE_ERRORS, [], '페이지 스크립트 예외');
  console.log('연기 검사 통과 — 게임 ' + games.length + '개 × 주소 ' + hashes.length + '종, 스크립트 예외 없음');
}, 1500);
