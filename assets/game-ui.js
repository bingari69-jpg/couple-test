/* Shared presentation only: game state, scoring and invitation formats stay in each game. */
(function () {
  'use strict';
  const script = document.currentScript;
  const root = new URL('../', script.src);
  const slug = document.body.dataset.game;
  const games = {
    ten: ['10초 맞추기', 'classic', 1, '#fff0c6', '네 감각을 믿어봐!', '속으로 세면, 딱 10초일까?'],
    delivery: ['배달 텔레파시', 'classic', 2, '#dff3e9', '오늘 뭐 먹을래?', '내 마음속 메뉴를 맞혀봐.'],
    mbti: ['MBTI 맞히기', 'atlas', 0, '#eee4fa', '너는 나를 얼마나 알아?', '네 글자 속에 숨은 나를 찾아봐.'],
    react: ['반응속도 대결', 'atlas', 1, '#e1effb', '누가 더 빠를까?', '초록불이 켜지면 네 차례!'],
    crash: ['20분 후 추락합니다', 'atlas', 2, '#e7efda', '너라면 어떻게 할래?', '같은 상황, 우리는 같은 선택일까?'],
    seat: ['어디에 앉나요', 'atlas', 3, '#e1efe5', '네 자리는 어디야?', '빈자리 하나에 담긴 너의 취향.'],
    marriage: ['결혼 전에 맞춰볼 것들', 'atlas', 4, '#fbe4df', '우리, 이야기해볼까?', '함께할 날들을 하나씩 맞춰봐요.'],
    'mind/fight': ['싸우면 어떻게 끝날까', 'atlas', 5, '#eee3f6', '서로의 마음이 궁금해', '다툰 뒤, 너는 어떤 마음일까?'],
    memory: ['우리의 기억', 'atlas', 6, '#ffe6ee', '그날, 기억나?', '우리의 추억을 하나씩 꺼내보자.'],
    ladder: ['사다리타기', 'atlas', 7, '#fff0d3', '오늘의 운명을 뽑아봐!', '커피 한 잔, 누가 쏘게 될까?'],
    groups: ['골프 조편성', 'atlas', 8, '#e5f0d6', '오늘은 누구랑 한 조?', '두근두근, 이번 조를 만나봐.'],
    num25: ['1에서 25까지', 'atlas', 9, '#e2eafb', '눈도 손도 빠르게!', '1부터 25까지, 놓치지 말고 찾아봐.'],
    pairs: ['짝 맞추기', 'atlas', 6, '#e2f5ea', '기억력 자신 있어?', '같은 그림 10짝, 누가 더 빨리 찾을까?'],
    mole: ['두더지 잡기', 'atlas', 10, '#ffead4', '꼭꼭 숨어라!', '빼꼼 나온 두더지를 잡아봐.'],
    ufo: ['UFO 요격', 'atlas', 11, '#e9e3f9', '지구를 부탁해!', '우주에서 온 도전장, 받아줄래?'],
    tap: ['10초 연타', 'atlas', 12, '#ffe3dc', '손가락 준비됐어?', '10초 동안 신나게 두드려봐!'],
    stroop: ['색깔 함정', 'atlas', 13, '#e7f1d8', '속으면 안 돼!', '글자에 속지 말고 색깔만 봐.'],
    arrow: ['화살표 함정', 'atlas', 14, '#e0f0fa', '이쪽? 아니, 저쪽!', '빨간 테두리라면 반대로!'],
    stop: ['딱 멈춰', 'atlas', 15, '#fff0cf', '지금이야, 딱!', '가운데를 향해 감각을 집중해봐.'],
    exam: ['시험지 보내기', 'atlas', 16, '#ece6f8', '같이 공부할래?', '단어를 담아 작은 시험지를 보내봐.'],
    nonsense: ['넌센스 대결', 'atlas', 16, '#fff0d3', '이걸 맞힌다고?', '100문제 중 같은 5문제로 붙어봐.'],
    'typing': ['한글 타자 20초', 'atlas', 16, '#ece6f8', '20초에 몇 글자?', '나오는 문장을 그대로 따라 쳐.'],
    'flap': ['탭 비행', 'atlas', 11, '#e9e3f9', '문 몇 개 통과했어?', '톡 치면 올라가고 가만두면 떨어져.'],
    'slide15': ['15퍼즐', 'atlas', 9, '#e0eafa', '60초에 몇 판 맞출까', '빈칸 옆 숫자를 톡 치면 밀려.'],
    'mines': ['지뢰찾기 미니', 'atlas', 15, '#fff0cf', '60초에 몇 판 풀까', '밟아도 끝이 아니야, 다음 판!'],
    'stack': ['블록 쌓기', 'atlas', 12, '#ffe3dc', '20초 블록 쌓기', '딱 맞춰 멈추면 안 잘려.'],
    '2048': ['2048 한판', 'atlas', 9, '#fff0d3', '30초 2048 승부', '쓸어 넘겨 같은 숫자를 합쳐봐.'],
    'fit': ['끼워넣기', 'atlas', 17, '#e6f0fb', '같은 조각, 더 채워봐', '조각을 끌어 놓고, 톡 치면 돌아가.'],
    'daily-word': ['오늘의 단어', 'atlas', 0, '#e9e3f9', '오늘 단어, 몇 번 만에?', '초록은 자리까지 맞음, 노랑은 다른 자리에 있음.'],
    'snake': ['스네이크 20초', 'atlas', 1, '#e2f2e6', '병아리 출동!', '판을 쓸어서 방향을 바꿔. 벽에 닿아도 끝은 아니야.'],
    'choseong': ['초성 퀴즈', 'atlas', 16, '#fff0d3', 'ㄸㅂㅇ 뭔지 알아?', '초성만 보고 답을 입력해. 같은 판이면 문제도 같아.'],
    'simon': ['순서 기억', 'atlas', 13, '#efe6fb', '기억력 자신 있어?', '불빛 순서를 보고 그대로 따라 눌러봐.']
  };
  function init() {
    const config = games[slug];
    const wrap = document.querySelector('.wrap');
    if (!config || !wrap || wrap.querySelector('.game-header')) return;
    const [title, art, index, color, eyebrow, copy] = config;
    document.body.classList.add('game-page');
    document.body.style.setProperty('--game-color', color);
    document.body.style.setProperty('--mascot-x', (art === 'classic' ? index : index % 3) * 50 + '%');
    document.body.style.setProperty('--mascot-y', (art === 'classic' ? 50 : Math.floor(index / 3) * 20) + '%');
    function mascot() {
      const el = document.createElement('div');
      el.className = 'game-mascot ' + art;
      el.setAttribute('aria-hidden', 'true');
      return el;
    }
    const header = document.createElement('header');
    header.className = 'game-header';
    header.innerHTML = '<a class="game-back" aria-label="놀이 목록으로 돌아가기" href="' + root.href + '#all">‹</a><span>' + title + '</span><a class="game-brand" href="' + root.href + '">같이놀자<b aria-hidden="true">♥</b></a>';
    wrap.prepend(header);

    // Move existing headings instead of cloning them: all ids and live updates survive.
    const headings = wrap.querySelectorAll('.screen > h1, .intro > h1');
    headings.forEach((heading, i) => {
      if (heading.classList.contains('verdict') || heading.id === 'resHead') return;
      const hero = document.createElement('div');
      hero.className = 'game-hero';
      const previous = heading.previousElementSibling;
      heading.before(hero);
      const text = document.createElement('div');
      text.className = 'game-hero-text';
      hero.append(text);
      if (previous && previous.matches('.tag,.series')) text.append(previous);
      else {
        const tag = document.createElement('span');
        tag.className = 'tag'; tag.textContent = i === 0 ? eyebrow : '같이하는 작은 놀이';
        text.append(tag);
      }
      text.append(heading);
      const note = document.createElement('p');
      note.className = 'game-hero-copy'; note.textContent = i === 0 ? copy : '너의 선택이 더해지면 완성!';
      text.append(note);
      hero.append(mascot());
    });
    const firstHero = wrap.querySelector('.game-hero');
    if (firstHero) {
      const steps = document.createElement('ol');
      steps.className = 'game-steps'; steps.setAttribute('aria-label', '놀이 방법');
      const labels = ['ladder', 'groups', 'exam'].includes(slug)
        ? ['내용 넣기', '링크 보내기', '함께 열기']
        : ['ten', 'react', 'num25', 'pairs', 'typing', 'flap', 'slide15', 'mines', 'stack', '2048', 'fit', 'daily-word', 'snake', 'choseong', 'simon', 'mole', 'ufo', 'tap', 'stroop', 'arrow', 'stop', 'nonsense'].includes(slug)
          ? ['한판 하기', '도전장 보내기', '기록 비교'] : ['내 답 고르기', '링크 보내기', '함께 보기'];
      labels.forEach((label, i) => {
        const li = document.createElement('li');
        li.innerHTML = '<span>' + (i + 1) + '</span>' + label;
        steps.append(li);
      });
      firstHero.after(steps);
    }
    // Optional details stay close at hand without pushing the play area down.
    const name = wrap.querySelector('#s-play > #nameIn');
    if (name) {
      const label = wrap.querySelector('label[for="nameIn"]');
      const bet = wrap.querySelector('#betBox');
      const options = document.createElement('details');
      options.className = 'game-options';
      const summary = document.createElement('summary');
      summary.textContent = '이름 추가하기 (선택)';
      (label || name).before(options);
      options.append(summary);
      const content = document.createElement('div'); content.className = 'game-options-content';
      options.append(content);
      if (label) content.append(label);
      content.append(name);
      if (bet) options.before(bet);
    }
    wrap.querySelectorAll('#s-result, #s-score, #s-report, #v-mine, #v-compare').forEach(screen => {
      const banner = document.createElement('div');
      banner.className = 'game-result-art'; banner.append(mascot());
      screen.prepend(banner);
    });
    const nav = document.createElement('nav');
    nav.className = 'game-nav'; nav.setAttribute('aria-label', '주요 메뉴');
    const icons = ['M3 10 12 3l9 7v11h-6v-7H9v7H3z', 'M3 5h18v14H3z M3 5l9 7 9-7', 'M7 7h10c3 0 5 10 3 12-2 2-5-3-5-3H9s-3 5-5 3C2 17 4 7 7 7z M8 10v5 M5.5 12.5h5 M16 11h.1 M18 14h.1'];
    [['', '홈'], ['t/letter/', '편지 쓰기'], ['#all', '같이 놀기']].forEach(([path, label], i) => {
      const a = document.createElement('a'); a.href = new URL(path, root).href;
      if (i === 2) a.setAttribute('aria-current', 'true');
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + icons[i] + '"/></svg>' + label;
      nav.append(a);
    });
    document.body.append(nav);
    const footer = document.createElement('p'); footer.className = 'game-footer';
    footer.textContent = '별거 아닌 한판이, 같이 웃는 시간이 되도록 ♥';
    const privacy = document.createElement('a'); privacy.className = 'game-privacy'; privacy.href = new URL('privacy/', root).href; privacy.textContent = '개인정보 안내';
    footer.append(document.createElement('br'), privacy);
    wrap.append(footer);

    function applyManagedGame(event) {
      const managed = event && event.detail;
      if (!managed || !Array.isArray(managed.games)) return;
      const item = managed.games.find(game => game.slug === slug);
      if (!item) return;
      if (item.title) {
        const headerTitle = wrap.querySelector('.game-header > span');
        if (headerTitle) headerTitle.textContent = item.title;
        document.title = item.title + ' · ' + ((managed.site && managed.site.name) || '같이놀자');
      }
    }
    window.addEventListener('app-config-ready', applyManagedGame);
    if (window.APP_PUBLISHED_CONFIG) applyManagedGame({ detail: window.APP_PUBLISHED_CONFIG });
  }
  /* 모바일: 조작 영역(판·캔버스·버튼) 위에서 시작한 손가락 움직임이 페이지 스크롤이나
     '당겨서 새로고침'으로 넘어가지 않게 한다. CSS 의 touch-action:none 이 먼저 막고,
     그것만으로는 안 멈추는 iOS 고무줄 스크롤을 여기서 한 번 더 막는다.
     조작 영역 밖(설명·버튼 여백)에서 시작한 스크롤은 그대로 되므로 페이지는 계속 읽을 수 있다. */
  const PLAY_SURFACE = 'canvas,#board,#grid,#arena,#pads,#pad,#sky,#dpad,#clock,.board,.grid,.arena,.pad,.sky,.dpad,.clock,.cardbtn,.cell,.bigbtn,[data-play-surface]';
  function lockTouch() {
    document.documentElement.style.overscrollBehavior = 'none';
    document.addEventListener('touchmove', event => {
      const node = event.target;
      if (!node || !node.closest) return;
      /* 글자를 쓰거나 고르는 칸(초성 퀴즈 답·타자 문장)은 그대로 둔다 */
      if (node.closest('input,textarea,select,[contenteditable]')) return;
      if (node.closest(PLAY_SURFACE)) event.preventDefault();
    }, { passive: false });
  }
  lockTouch();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
