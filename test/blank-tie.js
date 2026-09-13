/* 둘 다 성과가 없을 때(0점, 또는 게임이 blank 로 정한 값) 2차 판정을 쓰지 않는지.
   2차 판정은 대개 "실수·시간이 적은 쪽"이라, 그냥 두면 시작만 하고 가만히 있은 쪽이 이겼다.
   0점이 아닌 동점에서는 2차 판정이 그대로 살아 있어야 한다. */
const assert = require('node:assert/strict');
const { load, el, PAGE_ERRORS } = require('./dom');

/* 전적 한 줄 = [이름A, 기록A, 이름B, 기록B, idA, idB, 덧붙임A, 덧붙임B] */
const row = (vA, vB, xA, xB) => ["A", vA, "B", vB, "ida", "idb", xA, xB];
const render = (w, r) => w.__ev('Duel.renderResult(' + JSON.stringify({ hist: [r], round: r, viewer: "b" }) + ')');

/* viewer:"b" 이므로 B 가 "나". 아무 성과 없는 쪽이 실수가 적어도 이기지 않아야 한다. */
const CASES = [
  { game: 'mines',      blank: [0, 0, 3, 1], scored: [2, 2, 3, 1], win: /내가 더 풀었어/ },
  { game: 'slide15',    blank: [0, 0, 40, 0], scored: [2, 2, 40, 8], win: /내가 더 맞췄어/ },
  { game: 'flap',       blank: [0, 0, 5, 0], scored: [6, 6, 5, 1], win: /내가 더 통과했어/ },
  { game: 'stack',      blank: [0, 0, 4, 0], scored: [5, 5, 4, 1], win: /내가 더 쌓았어/ },
  { game: 'typing',     blank: [0, 0, 9, 0], scored: [30, 30, 9, 2], win: /내가 더 빨라/ },
  /* 오늘의 단어는 적은 시도가 이기고 실패는 7. 둘 다 실패면 빨리 포기한 쪽이 이기던 자리. */
  { game: 'daily-word', blank: [7, 7, 50000, 3000], scored: [3, 3, 50000, 30000], win: /내가 더 빨리|내가 이겼|맞혔/ }
];

(async () => {
  for (const c of CASES) {
    const w = load(c.game, '').window;

    render(w, row(...c.blank));
    const v = el(w, 'verdict').textContent;
    assert.match(v, /똑같|무승부/, c.game + ': 둘 다 성과 없으면 무승부여야 함 (지금: ' + v + ')');
    assert.equal(el(w, 'subVerdict').textContent.includes('이겨'), false,
      c.game + ': 둘 다 성과 없는데 2차 판정 문구가 나옴');

    /* 같은 2차 판정이 점수가 있는 동점에서는 그대로 작동한다 */
    render(w, row(...c.scored));
    assert.match(el(w, 'verdict').textContent, c.win,
      c.game + ': 성과가 있는 동점에서는 2차 판정이 살아 있어야 함');

    assert.deepEqual(PAGE_ERRORS, [], c.game + ' 페이지 오류: ' + PAGE_ERRORS.join(' / '));
    w.close();
  }
  console.log('성과 없는 동점 검사 통과 — ' + CASES.map(c => c.game).join('·') + ': 둘 다 0점(실패)이면 무승부, 점수 있는 동점은 2차 판정 유지');
})();
