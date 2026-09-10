const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 't/group-room/index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/group-room.js'), 'utf8');

const host = { id: 'm1', nickname: '방장', role: 'host', is_ready: true, has_submitted: false };
const guest = { id: 'm2', nickname: '친구', role: 'player', is_ready: true, has_submitted: false };
const room = status => ({
  id: 'room-1', code: 'AB12CD34', game_slug: 'ladder', stake_text: '커피 한 잔',
  score_mode: 'random', status, max_players: 4, current_round: 1, is_host: true, result: null
});
const snapshot = status => ({ room: room(status), members: [host, guest], answers: [] });

async function tick() {
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
}

(async () => {
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:4173/t/group-room/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  window.scrollTo = () => {};
  window.track = () => {};
  window.prompt = () => '';
  window.GroupRoomService = {
    createRoom: async () => snapshot('lobby'),
    joinRoom: async () => snapshot('lobby'),
    getRoom: async () => snapshot('lobby'),
    setReady: async () => snapshot('lobby'),
    startRoom: async () => snapshot('playing'),
    submitAnswer: async () => {
      const data = snapshot('playing');
      data.members = data.members.map(member => ({ ...member, has_submitted: true }));
      return data;
    },
    finishRoom: async () => {
      const data = snapshot('finished');
      data.room.result = {
        loser_nickname: '친구', stake_text: '커피 한 잔', score_mode: 'random'
      };
      data.members = data.members.map(member => ({ ...member, has_submitted: true }));
      return data;
    },
    subscribe: async () => () => {}
  };
  window.eval(script);

  const document = window.document;
  if (document.getElementById('createView').hidden) throw new Error('새 방 만들기 화면이 열리지 않음');
  document.getElementById('hostNickname').value = '방장';
  document.getElementById('createRoom').click();
  await tick();

  if (document.getElementById('roomView').hidden) throw new Error('방 생성 뒤 로비가 열리지 않음');
  if (document.getElementById('roomCode').textContent !== 'AB12CD34') throw new Error('방 코드 표시 실패');
  if (document.querySelectorAll('.member').length !== 2) throw new Error('참가자 목록 표시 실패');
  if (document.getElementById('startRoom').disabled) throw new Error('전원 준비 후 시작 버튼이 비활성');

  document.getElementById('startRoom').click();
  await tick();
  if (document.getElementById('playingActions').hidden) throw new Error('시작 뒤 봉인 화면이 열리지 않음');

  document.getElementById('submitSeal').click();
  await tick();
  if (document.getElementById('finishRoom').hidden) throw new Error('전원 제출 뒤 결과 버튼이 열리지 않음');

  document.getElementById('finishRoom').click();
  await tick();
  if (document.getElementById('resultView').hidden) throw new Error('결과 화면이 열리지 않음');
  if (!document.getElementById('resultName').textContent.includes('친구')) throw new Error('당첨자 표시 실패');

  dom.window.close();
  console.log('단체방 화면 검사 통과 — 생성, 참가자, 준비, 봉인, 결과 공개');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
