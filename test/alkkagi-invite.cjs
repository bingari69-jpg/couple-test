const assert=require('node:assert/strict');
const {load,PAGE_ERRORS}=require('./dom');
const {createDB}=require('./alkkagi-db.cjs');
const until=async check=>{for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out');};
(async()=>{
 const {db,rpc}=await createDB();const {window:w}=load('alkkagi','?mode=online'),$=id=>w.document.getElementById(id);let shares=[],copied='',calls=[];
 try{
  w.GroupRoomService.ensureSession=async()=>({rpc(fn,args){calls.push(fn);return {abortSignal:async()=>{try{return {data:await rpc(0,fn,args),error:null};}catch(e){return {data:null,error:{message:e.message}};}}};}});
  w.kakaoShare=async value=>{shares.push(value);return true;};
  Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=value;}}});
  $('start').click();assert.match($('onlineMessage').textContent,/이름/);assert.equal(calls.length,0);
  $('nickname').value='우리 친구';$('start').click();$('start').click();await until(()=>!$('game').hidden&&!$('start').disabled);
  assert.equal(calls.filter(n=>n==='create_alkkagi_room').length,1);assert.equal(shares.length,0,'never send automatically');
  $('inviteKakao').click();await until(()=>shares.length===1);
  const invite=shares[0];assert.equal(invite.title,'알까기 한판 할래?');assert.equal(invite.textOnly,true);assert.match(invite.url,/^https:\/\/noljago\.co\.kr\/t\/alkkagi\/\?mode=online#room=[A-F0-9]{32}$/);
  assert(!/token|user|session|p_request/.test(invite.url));
  await new Promise(r=>setTimeout(r,0));$('inviteCopy').click();await until(()=>copied!=='' );assert.equal(copied,invite.url);
  await new Promise(r=>setTimeout(r,0));w.navigator.clipboard.writeText=async()=>{throw Error('Not allowed');};$('inviteCopy').click();await until(()=>!$('inviteURL').hidden);assert.equal($('inviteURL').value,invite.url);
  assert.deepEqual(PAGE_ERRORS,[]);console.log('PASS Kakao invitation: explicit click only, room-only HTTPS link, duplicate-create prevention, clipboard and manual-copy fallback.');
 }finally{w.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
