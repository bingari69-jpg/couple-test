const assert=require('node:assert/strict');
const {load,PAGE_ERRORS}=require('./dom');
const {createDB}=require('./tapbattle-db.cjs');
const until=async check=>{for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out');};
(async()=>{
 const {db,rpc}=await createDB(),w=load('tapbattle').window,$=id=>w.document.getElementById(id);let calls=0,shares=[],copied='';
 try{
  w.GroupRoomService.ensureSession=async()=>({rpc(fn,args){calls++;return {abortSignal:async()=>{try{return {data:await rpc(0,fn,args),error:null};}catch(e){return {data:null,error:{message:e.message}};}}};}});
  w.kakaoShare=async value=>shares.push(value);
  Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=value;}}});
  $('nickname').value='친구';$('enterForm').dispatchEvent(new w.Event('submit',{cancelable:true}));$('enterForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await until(()=>!$('room').hidden&&!$('create').disabled);assert.equal(calls,1);assert.equal(shares.length,0);assert.equal($('ready').disabled,true);
  $('inviteKakao').click();await until(()=>shares.length===1);
  assert.match(shares[0].url,/^https:\/\/noljago\.co\.kr\/t\/tapbattle\/\?mode=online#room=[A-F0-9]{32}$/);assert.equal(shares[0].textOnly,true);
  await new Promise(r=>setTimeout(r,0));$('inviteCopy').click();await until(()=>copied.length);assert.equal(copied,shares[0].url);
  await new Promise(r=>setTimeout(r,0));w.navigator.clipboard.writeText=async()=>{throw Error('denied');};$('inviteCopy').click();await until(()=>!$('inviteURL').hidden);assert.equal($('inviteURL').value,copied);
  assert.deepEqual(PAGE_ERRORS,[]);console.log('PASS tapbattle invitation: explicit sharing only, stable private room link, duplicate-create lock, readiness guard and clipboard fallback.');
 }finally{w.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
