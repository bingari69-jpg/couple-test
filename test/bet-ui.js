const assert=require('node:assert/strict');const {load,el,PAGE_ERRORS}=require('./dom');
const games=['rps','ten','react','num25','pairs','simon','snake','choseong','daily-word','fit','2048','stack','mines','slide15','flap','typing','mole','ufo','tap','stroop','arrow','stop'];
const choose=(w,b)=>w.document.querySelector('[data-bet="'+b+'"]').click();
for(const game of games){const w=load(game).window;try{
 assert.ok(el(w,'betBox'));assert.equal(el(w,'betBox').closest('details'),null);
 for(const value of ['내 자동차','내 전 재산','내 인생','지구 소유권']){choose(w,value);assert.equal(w.Bet.get(),value);assert.ok(el(w,'betReaction').textContent.length>8);const p=w.Bet.put({},w.Bet.get());assert.equal(w.Bet.read(p),value);assert.ok(w.Bet.openLine(value).includes('허세'));assert.ok(w.Bet.resultLine(value,'민수',false,false).includes('마음으로만'));w.Bet.set(value);assert.equal(w.document.querySelector('[data-bet="'+value+'"]').getAttribute('aria-pressed'),'true');}
 choose(w,'');assert.equal(w.Bet.get(),'');assert.equal(w.Bet.put({},w.Bet.get()).b,undefined);
 choose(w,'업어주기');assert.ok(el(w,'betSummary').textContent.includes('업어주기'));choose(w,'업어주기');assert.equal(w.Bet.get(),'');
 choose(w,'__custom__');el(w,'betCustom').value='<img src=x>';el(w,'betCustom').dispatchEvent(new w.Event('input'));assert.equal(el(w,'betSummary').querySelector('img'),null);assert.equal(w.Bet.gaParams(w.Bet.get()).bet_kind,'custom');choose(w,'');
 if(game!=='rps'){w.__ev('Duel.finish(1000)');const old=el(w,'linkbox').textContent;choose(w,'내 인생');const url=el(w,'linkbox').textContent;assert.notEqual(url,old);assert.equal(JSON.parse(Buffer.from(url.split('#c=')[1],'base64url')).b,'내 인생');const guest=load(game,url.slice(url.indexOf('#'))).window;try{assert.ok(el(guest,'betOpen').textContent.includes('허세'));assert.ok(el(guest,'betBox').classList.contains('hidden'));}finally{guest.close();}}
 else{el(w,'makeHands').children[0].click();choose(w,'내 인생');el(w,'makeBtn').click();const payload=JSON.parse(Buffer.from(w.__ev('madeUrl').split('#c=')[1],'base64url'));assert.equal(payload.b,'내 인생');choose(w,'내 자동차');assert.ok(el(w,'sharePanel').classList.contains('hidden'));}

 /* 보내는 사람 이름: 카톡 버튼 바로 위 칸, 비면 안 보낸다 (2026-09-17) */
 if(game!=='rps'){
   const box=el(w,'shareName');
   assert.ok(box,game+' 보내는 사람 칸');
   assert.equal(box.closest('label').nextElementSibling.id,'kakaoBtn',game+' 칸은 카톡 버튼 바로 위');
   let sent=null;w.kakaoShare=o=>{sent=o;return Promise.resolve(true)};
   w.__ev('Duel.state.name=""');box.value='';
   el(w,'kakaoBtn').click();
   assert.equal(sent,null,game+' 이름이 비면 카톡으로 안 보낸다');
   assert.ok(box.classList.contains('need-name'),game+' 빈 칸을 표시');
   assert.match(el(w,'toast').textContent,/보내는 사람 이름/);
   box.value='민수';box.dispatchEvent(new w.Event('input'));
   assert.equal(w.__ev('Duel.state.name'),'민수',game+' 칸이 이름을 채운다');
   el(w,'kakaoBtn').click();
   assert.ok(sent&&sent.title.includes('민수님이 도전했어요'),game+' 카드 제목에 이름: '+(sent&&sent.title));
 }
 }finally{w.close();}}
assert.deepEqual(PAGE_ERRORS,[]);console.log('Bet v2: all 10 games, bluff copy, clear/custom/replay state, current invitation links, receiver display and safe text passed.');
