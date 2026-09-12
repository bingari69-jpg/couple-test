const assert=require('node:assert/strict');const {load,el,PAGE_ERRORS}=require('./dom');
const games=['rps','ten','react','num25','pairs','mole','ufo','tap','stroop','arrow','stop'];
const choose=(w,b)=>w.document.querySelector('[data-bet="'+b+'"]').click();
for(const game of games){const w=load(game).window;try{
 assert.ok(el(w,'betBox'));assert.equal(el(w,'betBox').closest('details'),null);
 for(const value of ['내 자동차','내 전 재산','내 인생','지구 소유권']){choose(w,value);assert.equal(w.Bet.get(),value);assert.ok(el(w,'betReaction').textContent.length>8);const p=w.Bet.put({},w.Bet.get());assert.equal(w.Bet.read(p),value);assert.ok(w.Bet.openLine(value).includes('허세'));assert.ok(w.Bet.resultLine(value,'민수',false,false).includes('마음으로만'));w.Bet.set(value);assert.equal(w.document.querySelector('[data-bet="'+value+'"]').getAttribute('aria-pressed'),'true');}
 choose(w,'');assert.equal(w.Bet.get(),'');assert.equal(w.Bet.put({},w.Bet.get()).b,undefined);
 choose(w,'업어주기');assert.ok(el(w,'betSummary').textContent.includes('업어주기'));choose(w,'업어주기');assert.equal(w.Bet.get(),'');
 choose(w,'__custom__');el(w,'betCustom').value='<img src=x>';el(w,'betCustom').dispatchEvent(new w.Event('input'));assert.equal(el(w,'betSummary').querySelector('img'),null);assert.equal(w.Bet.gaParams(w.Bet.get()).bet_kind,'custom');choose(w,'');
 if(game!=='rps'){w.__ev('Duel.finish(1000)');const old=el(w,'linkbox').textContent;choose(w,'내 인생');const url=el(w,'linkbox').textContent;assert.notEqual(url,old);assert.equal(JSON.parse(Buffer.from(url.split('#c=')[1],'base64url')).b,'내 인생');const guest=load(game,url.slice(url.indexOf('#'))).window;try{assert.ok(el(guest,'betOpen').textContent.includes('허세'));assert.ok(el(guest,'betBox').classList.contains('hidden'));}finally{guest.close();}}
 else{el(w,'makeHands').children[0].click();choose(w,'내 인생');el(w,'makeBtn').click();const payload=JSON.parse(Buffer.from(w.__ev('madeUrl').split('#c=')[1],'base64url'));assert.equal(payload.b,'내 인생');choose(w,'내 자동차');assert.ok(el(w,'sharePanel').classList.contains('hidden'));}
 }finally{w.close();}}
assert.deepEqual(PAGE_ERRORS,[]);console.log('Bet v2: all 10 games, bluff copy, clear/custom/replay state, current invitation links, receiver display and safe text passed.');
