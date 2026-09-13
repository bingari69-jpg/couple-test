const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {ROOT,load,el,PAGE_ERRORS}=require('./dom');

const opened=[];
const open=hash=>{const d=load('nonsense',hash);opened.push(d.window);return d.window;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const input=(w,id,value)=>{const e=el(w,id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));};

(async()=>{
  const maker=open();
  const shareCard=fs.readFileSync(path.join(ROOT,'assets/share-cards/nonsense.png'));
  assert.equal(shareCard.readUInt32BE(16),800);assert.equal(shareCard.readUInt32BE(20),480); /* 2026-09-12 다른 카드와 같은 800×480 으로 축소 */
  const bank=maker.NONSENSE_QUESTIONS;
  assert.equal(bank.length,100);
  assert.equal(new Set(bank.map(q=>q.id)).size,100);
  assert.equal(new Set(bank.map(q=>q.q)).size,100);
  bank.forEach(q=>{assert.ok(['classic','word','twist'].includes(q.category));assert.equal(q.w.length,3);assert.equal(new Set([q.a,...q.w]).size,4);});

  const makerPack=maker.__ev('state.pack.map(q=>({id:q.id,options:q.options,correct:q.correct,category:q.category}))');
  assert.equal(makerPack.length,7);
  assert.equal(makerPack.filter(q=>q.category==='classic').length,3);
  assert.equal(makerPack.filter(q=>q.category==='word').length,3);
  assert.equal(makerPack.filter(q=>q.category==='twist').length,1);

  input(maker,'nameIn','서준');el(maker,'startBtn').click();
  assert.equal(el(maker,'qBar').classList.contains('hidden'),false,'문항 제한 시간 막대가 보인다');
  for(let i=0;i<7;i++){const correct=maker.__ev('state.pack[state.index].correct');el(maker,'answers').children[correct].click();await wait(680);}
  assert.equal(el(maker,'myScore').textContent,'7 / 7');
  assert.equal(maker.__ev('state.penalty'),0,'다 맞히면 벌칙 없음');
  assert.equal(el(maker,'afterPlay').classList.contains('hidden'),false);
  const inviteUrl=maker.Duel.url();assert.ok(inviteUrl.includes('#c='));assert.ok(inviteUrl.length<650);
  let inviteShare;maker.kakaoShare=o=>{inviteShare=o;return Promise.resolve(true);};el(maker,'kakaoBtn').click();assert.equal(inviteShare.btn,'도전 받기');assert.match(inviteShare.desc,/100문제/);assert.match(inviteShare.img,/share-cards\/nonsense\.png/);assert.equal(inviteShare.imageWidth,800);assert.equal(inviteShare.imageHeight,480);

  const inviteHash=new URL(inviteUrl).hash;
  const guest=open(inviteHash);
  const guestPack=guest.__ev('state.pack.map(q=>({id:q.id,options:q.options,correct:q.correct,category:q.category}))');
  assert.equal(JSON.stringify(guestPack),JSON.stringify(makerPack));
  assert.equal(el(guest,'lockedCard').classList.contains('hidden'),false);
  input(guest,'nameIn','하린');el(guest,'startBtn').click();
  for(let i=0;i<7;i++){const wrong=(guest.__ev('state.pack[state.index].correct')+1)%4;el(guest,'answers').children[wrong].click();await wait(980);}
  await wait(950);
  assert.equal(guest.__ev('state.penalty'),7*5000,'오답 7개 = 35초 벌칙');
  assert.equal(el(guest,'s-result').classList.contains('hidden'),false);
  assert.match(el(guest,'tA').textContent,/0\/7/);assert.match(el(guest,'tB').textContent,/7\/7/);
  assert.match(el(guest,'verdict').textContent,/상대가 이겼다/);
  let resultShare;guest.kakaoShare=o=>{resultShare=o;return Promise.resolve(true);};el(guest,'kakaoRes').click();assert.equal(resultShare.btn,'결과 보기');

  const result=open(new URL(resultShare.url).hash);
  assert.equal(el(result,'s-result').classList.contains('hidden'),false);
  assert.equal(el(result,'viewActions').classList.contains('hidden'),false);
  assert.equal(el(result,'respActions').classList.contains('hidden'),true);

  /* 시간 초과: 7초를 넘기면 오답 처리되고 5초가 더해진다 */
  const late=open();
  el(late,'startBtn').click();
  assert.equal(late.__ev('state.index'),0);
  late.__ev('state.qStart = performance.now() - 8000');
  await wait(120);
  assert.equal(late.__ev('state.penalty'),5000,'시간 초과도 5초 벌칙');
  assert.match(el(late,'reveal').textContent,/시간 초과/);
  assert.equal(late.__ev('state.score'),0);
  assert.equal(late.__ev('[...document.getElementById("answers").children].every(b=>b.disabled)'),true,'보기가 잠긴다');

  /* 지난 도전장(q 없음)은 보낸 사람이 푼 5문제 그대로 열린다 */
  const payload=JSON.parse(Buffer.from(inviteHash.slice(3),'base64url').toString());
  assert.equal(payload.q,7,'새 도전장에는 문항 수가 실린다');
  delete payload.q;
  const legacy=open('#c='+Buffer.from(JSON.stringify(payload)).toString('base64url'));
  assert.equal(legacy.__ev('state.size'),5,'q 가 없으면 5문제');
  assert.equal(legacy.__ev('state.pack.length'),5);
  const legacyPack=legacy.__ev('state.pack.map(q=>q.category)');
  assert.equal(legacyPack.filter(c=>c==='classic').length,2);
  assert.equal(legacyPack.filter(c=>c==='word').length,2);
  assert.equal(legacyPack.filter(c=>c==='twist').length,1);
  assert.match(el(legacy,'startBtn').textContent,/^5문제/);

  opened.forEach(w=>w.close());
  assert.deepEqual(PAGE_ERRORS,[]);
  console.log('넌센스 대결 검사 통과 — 100문제, 유형별 무작위 7개, 같은 문제·보기, 문항 7초·오답 5초 벌칙, 지난 5문제 링크 호환, 점수·시간 승부, 결과 회신');
})().catch(e=>{opened.forEach(w=>w.close());console.error(e);process.exitCode=1;});
