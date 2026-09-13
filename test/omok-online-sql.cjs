const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createDB}=require('./omok-db.cjs');
(async()=>{
 const {db,rpc}=await createDB();
 try{
 const request=randomUUID();let s=await rpc(0,'create_omok_room',{p_name:'나',p_request:request});const code=s.code;
 assert.equal(s.me,1);assert.equal(s.status,'waiting');assert.equal(s.board.length,225);assert.equal(s.host_id,undefined);
 assert.equal((await rpc(0,'create_omok_room',{p_name:'나',p_request:request})).id,s.id);
 assert.equal((await rpc(0,'join_omok_room',{p_code:code,p_name:'나'})).me,1);
 assert.equal((await rpc(2,'get_omok_room',{p_code:code})).me,0);
 await assert.rejects(rpc(2,'play_omok_move',{p_code:code,p_index:112,p_version:0}),/OMOK_NOT_MEMBER/);
 s=await rpc(1,'join_omok_room',{p_code:code,p_name:'친구'});assert.equal(s.status,'playing');assert.equal(s.me,2);
 await assert.rejects(rpc(2,'join_omok_room',{p_code:code,p_name:'세번째'}),/OMOK_FULL/);
 await assert.rejects(rpc(1,'play_omok_move',{p_code:code,p_index:112,p_version:s.version}),/OMOK_NOT_TURN/);
 await assert.rejects(rpc(0,'play_omok_move',{p_code:code,p_index:225,p_version:s.version}),/OMOK_INVALID_MOVE/);
 const version=s.version;
 const attempts=await Promise.allSettled([rpc(0,'play_omok_move',{p_code:code,p_index:0,p_version:version}),rpc(0,'play_omok_move',{p_code:code,p_index:1,p_version:version})]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 assert.match(attempts.find(x=>x.status==='rejected').reason.message,/OMOK_STALE/);
 s=await rpc(1,'get_omok_room',{p_code:code});assert.equal(s.moves.length,1);
 await assert.rejects(rpc(1,'play_omok_move',{p_code:code,p_index:0,p_version:s.version}),/OMOK_OCCUPIED/);
 for(const index of [15,1,16,2,17,3,18,4])s=await rpc(s.turn-1,'play_omok_move',{p_code:code,p_index:index,p_version:s.version});
 assert.equal(s.winner,1);assert.equal(s.reason,'five');assert.deepEqual(s.line,[0,1,2,3,4]);
 await assert.rejects(rpc(1,'play_omok_move',{p_code:code,p_index:20,p_version:s.version}),/OMOK_NOT_PLAYING/);
 s=await rpc(0,'rematch_omok_room',{p_code:code,p_round:1});assert.equal(s.status,'finished');assert.equal(s.rematchHost,true);
 s=await rpc(0,'rematch_omok_room',{p_code:code,p_round:1});assert.equal(s.round,1);
 s=await rpc(1,'rematch_omok_room',{p_code:code,p_round:1});assert.equal(s.round,2);assert.equal(s.moves.length,0);assert.equal(s.status,'playing');
 await assert.rejects(rpc(0,'rematch_omok_room',{p_code:code,p_round:1}),/OMOK_STALE/);
 s=await rpc(1,'resign_omok_room',{p_code:code,p_version:s.version});assert.equal(s.reason,'resign');assert.equal(s.winner,1);
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.exec('select * from public.omok_rooms');}),/permission denied/);
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query('select public.get_omok_room($1)',[code]);}),/permission denied/);
 await assert.rejects(rpc(-1,'get_omok_room',{p_code:code}),/OMOK_AUTH_REQUIRED/);
  await assert.rejects(rpc(0,'create_omok_room',{p_name:' ',p_request:randomUUID()}),/OMOK_INVALID_NAME/);
 // Exercise the server's four directions, long lines and full-board draw.
 for(const [dr,dc,r,c] of [[0,1,0,0],[1,0,0,14],[1,1,0,0],[1,-1,0,14]]){
  const board=Array(225).fill(0);for(let n=0;n<4;n++)board[(r+dr*n)*15+c+dc*n]=1;
  await db.query("update public.omok_rooms set board=$1,moves='{}',turn=1,status='playing',winner=0,finish_reason=null where code=$2",[board,code]);
  s=await rpc(0,'get_omok_room',{p_code:code});s=await rpc(0,'play_omok_move',{p_code:code,p_index:(r+dr*4)*15+c+dc*4,p_version:s.version});assert.equal(s.winner,1);assert.equal(s.line.length,5);
 }
 const over=Array(225).fill(0);[0,1,2,4,5].forEach(i=>over[i]=1);
 await db.query("update public.omok_rooms set board=$1,moves='{}',turn=1,status='playing',winner=0,finish_reason=null where code=$2",[over,code]);
 s=await rpc(0,'get_omok_room',{p_code:code});s=await rpc(0,'play_omok_move',{p_code:code,p_index:3,p_version:s.version});assert.equal(s.line.length,6);
 const draw=Array.from({length:225},(_,i)=>(Math.floor(i/15)+2*(i%15))%4<2?1:2),final=draw[224];draw[224]=0;
 await db.query("update public.omok_rooms set board=$1,moves=$2,turn=$3,status='playing',winner=0,finish_reason=null where code=$4",[draw,Array.from({length:224},(_,i)=>i),final,code]);
 s=await rpc(final-1,'get_omok_room',{p_code:code});s=await rpc(final-1,'play_omok_move',{p_code:code,p_index:224,p_version:s.version});assert.equal(s.reason,'draw');assert.equal(s.winner,0);
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.exec('update public.omok_rooms set winner=1');}),/permission denied/);
 // Competing guests can never occupy the same second seat.
 const other=await rpc(0,'create_omok_room',{p_name:'나',p_request:randomUUID()});
 const joins=await Promise.allSettled([rpc(1,'join_omok_room',{p_code:other.code,p_name:'하나'}),rpc(2,'join_omok_room',{p_code:other.code,p_name:'둘'})]);
 assert.equal(joins.filter(x=>x.status==='fulfilled').length,1);assert.match(joins.find(x=>x.status==='rejected').reason.message,/OMOK_FULL/);
 for(let i=0;i<10;i++)await rpc(0,'create_omok_room',{p_name:'나',p_request:randomUUID()});
 await assert.rejects(rpc(0,'create_omok_room',{p_name:'나',p_request:randomUUID()}),/OMOK_RATE_LIMIT/);
 await db.query("update public.omok_rooms set expires_at=now()-interval '1 second' where code=$1",[code]);
 await assert.rejects(rpc(0,'get_omok_room',{p_code:code}),/OMOK_EXPIRED/);
 console.log('PASS online SQL: migration, authenticated seats, duplicate requests, turn validation, victory, rematch consent, resignation, grants, expiry');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
