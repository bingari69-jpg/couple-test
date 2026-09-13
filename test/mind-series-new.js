/* 새 심리 3종 — 애정 표현·가까움의 거리·서로 보는 말.
   보낸 사람이 답하고 → 초대 링크가 나오고 → 받은 사람이 자기 폰에서 답하고 →
   결과 링크가 나오는 왕복이 실제로 도는지 본다. 한 기기에서 두 사람이 번갈아 답하는
   방식이 아니라, 링크로 오가는 우리 앱 방식이어야 한다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
const errors = [];

function load(slug, hash = '') {
  const file = path.join(root, 't', slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (all, src) => {
    if (/^https?:/.test(src) || src.includes('analytics') || src.includes('kakao')) return '';
    return '<script>' + fs.readFileSync(path.resolve(path.dirname(file), src.split('?')[0]), 'utf8').replace(/<\/script/g, '<\\/script') + '</script>';
  });
  const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(slug + ': ' + e.message));
  const dom = new JSDOM(html, {
    url: 'https://noljago.co.kr/t/' + slug + '/' + hash, runScripts: 'dangerously', virtualConsole: vc,
    beforeParse(w) { w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: true }); }
  });
  return dom.window;
}

const $ = (w, id) => w.document.getElementById(id);
const text = w => w.document.getElementById('seriesApp').textContent;
const options = w => [...w.document.querySelectorAll('.series-option')];
const chips = w => [...w.document.querySelectorAll('.word-chip')];
const next = w => $(w, 'seriesNext');

/* 문항형(애정 표현·가까움의 거리): 보기 번호를 받아 끝까지 답한다 */
function answerAll(w, pick) {
  for (let guard = 0; guard < 30; guard++) {
    const opts = options(w);
    if (!opts.length) break;
    opts[Math.min(pick(guard), opts.length - 1)].click();
    next(w).click();
    if (!options(w).length) break;
  }
}
/* 낱말형(서로 보는 말): 나를 고른 말 → 상대를 고른 말 */
function pickWords(w, mine, theirs) {
  mine.forEach(i => chips(w)[i].click());
  assert.equal(next(w).disabled, false, '최소 개수를 채우면 다음이 열린다');
  next(w).click();
  theirs.forEach(i => chips(w)[i].click());
  next(w).click();
}

(async () => {
  /* ===== 1. 애정 표현 ===== */
  {
    const a = load('love-note');
    $(a, 'beginSeries').click();
    /* 앞 4문항(주는 방식)은 모두 '행동', 뒤 4문항(받고 싶은 방식)은 모두 '말' 쪽으로 고른다 */
    const giveService = [3, 3, 4, 4], wantWords = [0, 0, 0, 0];
    answerAll(a, i => (i < 4 ? giveService[i] : wantWords[i - 4]));
    assert.match(text(a), /내 이야기는 골랐어/, '초대 화면으로 간다');
    assert.match(text(a), /먼저 해두는 행동/, '주는 방식이 행동으로 읽힌다');
    assert.match(text(a), /말로 알아주기/, '받고 싶은 방식이 말로 읽힌다');
    const invite = a.location.hash;
    assert.ok(invite.startsWith('#c='), '초대 링크가 생긴다: ' + invite.slice(0, 6));
    a.close();

    /* 받은 사람이 자기 폰에서 연다 */
    const b = load('love-note', invite);
    assert.match(text(b), /네 선택을 기다려/, '받는 쪽은 초대 화면');
    $(b, 'joinSeries').click();
    answerAll(b, i => (i < 4 ? 0 : 3));   // 주는 건 말로, 받고 싶은 건 행동으로
    const body = text(b);
    assert.match(body, /주는 방식과 받고 싶은 방식/, '결과가 열린다');
    assert.match(body, /같은 곳을 보고 있어/, '서로 맞은 쪽은 맞았다고 말해준다');
    assert.match(body, /오늘 해볼 것 하나씩/, '오늘 할 행동을 준다');
    assert.ok(b.location.hash.startsWith('#r='), '결과 링크가 생긴다');
    b.close();
  }

  /* ===== 2. 가까움의 거리 ===== */
  {
    const a = load('closeness');
    $(a, 'beginSeries').click();
    answerAll(a, () => 0);            // 늘 '바로 확인하고 싶어'
    assert.match(text(a), /불안할 때 내가 바라는 것/, '내 카드가 먼저 나온다');
    assert.match(text(a), /진단하는 검사가 아니야/, '진단이 아니라고 밝힌다');
    const invite = a.location.hash;
    a.close();

    const b = load('closeness', invite);
    $(b, 'joinSeries').click();
    answerAll(b, () => 1);            // 늘 '혼자 가라앉힐 시간'
    const body = text(b);
    assert.match(body, /필요한 게 달라/, '서로 다른 쪽을 골랐음을 알아본다');
    assert.match(body, /기다림의 끝을 정해두는/, '가장 자주 부딪히는 조합에 맞는 제안을 준다');
    assert.match(body, /이번 주에 하나씩/, '행동 제안이 있다');
    assert.ok(b.location.hash.startsWith('#r='));
    b.close();
  }

  /* ===== 3. 서로 보는 말 ===== */
  {
    const a = load('mirror');
    $(a, 'beginSeries').click();
    assert.ok(chips(a).length > 20, '낱말이 충분히 많다: ' + chips(a).length);
    assert.equal(next(a).disabled, true, '3개를 못 채우면 다음이 잠긴다');
    pickWords(a, [0, 1, 2], [4, 5, 6]);       // 나 = 다정/솔직/웃기는, 상대 = 예민/차분/즉흥
    assert.match(text(a), /내가 고른 나/, '내 낱말이 보인다');
    const invite = a.location.hash;
    a.close();

    const b = load('mirror', invite);
    $(b, 'joinSeries').click();
    pickWords(b, [4, 7, 8], [0, 9, 10]);      // 나 = 예민/계획적/든든, 상대 = 다정/수줍음/적극
    const body = text(b);
    assert.match(body, /둘 다 고른 말/, '열린 창');
    assert.match(body, /나만 고른 말/, '숨은 창');
    assert.match(body, /상대만 본 말/, '보이지 않는 창');
    /* 보낸 사람은 '다정한'(0)을 스스로 골랐고 받은 사람도 그를 '다정한'으로 봤다 */
    assert.match(body, /다정한/);
    /* 받은 사람은 '예민한'(4)을 스스로 골랐고 보낸 사람도 그를 '예민한'으로 봤다 */
    assert.match(body, /예민한/);
    assert.ok(b.location.hash.startsWith('#r='));
    b.close();
  }

  /* ===== 잘못된 링크는 막힌다 ===== */
  {
    const bad = load('mirror', '#c=' + Buffer.from(JSON.stringify({
      v: 1, s: 'mirror', e: 'words', id: 'a'.repeat(16), seed: 1,
      p: { n: '나', a: [0, 0, 0], g: [1, 2, 3] }      // a 에 같은 번호가 겹친다
    })).toString('base64url'));
    /* 초대 화면이 아니라 첫 화면으로 떨어져야 한다 */
    assert.equal($(bad, 'joinSeries'), null, '깨진 초대는 받는 화면을 열지 않는다');
    assert.ok(bad.document.getElementById('beginSeries') || /링크를 읽을 수 없어/.test(text(bad)), '첫 화면이나 안내로 떨어진다');
    bad.close();
  }

  assert.deepEqual(errors, [], '페이지 오류: ' + errors.join(' / '));
  console.log('새 심리 3종 검사 통과 — 애정 표현(주는 방식↔받고 싶은 방식·오늘 할 일), 가까움의 거리(진단 아님·부딪히는 조합 제안), 서로 보는 말(열린 창·숨은 창·보이지 않는 창), 링크 왕복과 잘못된 링크 차단');
})().catch(e => { console.error(e); process.exit(1); });
