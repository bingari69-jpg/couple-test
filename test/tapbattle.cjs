const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../t/tapbattle/rules.js');
const {createDB}=require('./tapbattle-db.cjs');
(async()=>{
 const {db,rpc}=await createDB();
 try{
  await db.exec(fs.readFileSync('supabase/migrations/20260914_tapbattle_rooms.sql','utf8'));
  for(const seed of [0,1,45,308,996]){
   const phases=R.phases(seed),events=[];
   assert.equal(phases[0].start,0);assert.equal(phases.at(-1).end,20000);
   phases.forEach((p,i)=>{assert.equal(p.green,i%2===0);events.push(p.start,p.end-1);});
   const sql=await db.query('select public.tapbattle_score($1,$2) as score',[seed,events]);
   assert.deepEqual(sql.rows[0].score,R.score(seed,events));
  }
  const call=(actor,action,extra={})=>rpc(actor,'tapbattle_room',{p_action:action,...extra});
  await assert.rejects(()=>call(9,'create',{p_name:'나',p_request:crypto.randomUUID()}),/TB_AUTH/);
  await assert.rejects(()=>call(0,'create',{p_name:' ',p_request:crypto.randomUUID()}),/TB_NAME/);
  const request=crypto.randomUUID();let room=await call(0,'create',{p_name:'나',p_request:request});
  assert.equal((await call(0,'create',{p_name:'나',p_request:request})).code,room.code);
  const code=room.code,common={p_code:code,p_round:1};
  assert.equal((await call(1,'get',common)).me,0);
  await assert.rejects(()=>call(1,'ready',common),/TB_MEMBER/);
  room=await call(1,'join',{...common,p_name:'친구'});assert.equal(room.me,2);
  await assert.rejects(()=>call(2,'join',{...common,p_name:'세번째'}),/TB_FULL/);
  await assert.rejects(()=>call(2,'get',common),/TB_FULL/);
  room=await call(0,'ready',common);assert.equal(room.status,'waiting');
  room=await call(0,'unready',common);assert.equal(room.readyHost,false);
  await call(0,'ready',common);room=await call(1,'ready',common);assert.equal(room.status,'playing');assert(room.startAt>room.serverNow+3500);
  await assert.rejects(()=>call(0,'sync',{...common,p_events:[0]}),/TB_EVENTS/);
  await db.query("update public.tapbattle_rooms set start_at=clock_timestamp()-interval '3 seconds' where code=$1",[code]);
  const events=[0,100,1500,1550,2200];room=await call(0,'sync',{...common,p_events:events});
  assert.deepEqual(room.host,R.score(room.seed,events));assert.deepEqual(room.events,events);
  const guest=await call(1,'get',common);assert.deepEqual(guest.events,[]);assert.deepEqual(guest.host,room.host);
  assert.deepEqual((await call(0,'sync',{...common,p_events:events})).host,room.host);
  assert.deepEqual((await call(0,'sync',{...common,p_events:events.slice(0,2)})).events,events);
  for(const invalid of [[0,101,1500,1550,2200],[...events,2201],[...events,19000],[...events,null]])await assert.rejects(()=>call(0,'sync',{...common,p_events:invalid}),/TB_EVENTS/);
  const duplicates=await Promise.all([call(1,'sync',{...common,p_events:[100]}),call(1,'sync',{...common,p_events:[100]})]);
  assert(duplicates.every(x=>x.guest.good===1));
  await db.query("update public.tapbattle_rooms set start_at=clock_timestamp()-interval '22 seconds' where code=$1",[code]);
  room=await call(0,'sync',{...common,p_events:[...events,19500]});assert.equal(room.events.at(-1),19500);
  await assert.rejects(()=>call(1,'sync',{...common,p_events:[100,4000]}),/TB_EVENTS/);
  await db.query("update public.tapbattle_rooms set start_at=clock_timestamp()-interval '24 seconds' where code=$1",[code]);
  room=await call(0,'sync',{...common,p_events:[...events,19500,19600]});assert.equal(room.status,'finished');assert.equal(room.events.at(-1),19500);
  room=await call(0,'rematch',common);assert.equal(room.status,'finished');
  room=await call(1,'rematch',common);assert.equal(room.round,2);assert.equal(room.status,'waiting');assert.equal(room.readyHost,false);assert.deepEqual(room.events,[]);
  await assert.rejects(()=>call(0,'sync',{...common,p_events:[]}),/TB_ROUND/);
  await call(0,'ready',{...common,p_round:2});await call(1,'ready',{...common,p_round:2});
  room=await call(1,'resign',{...common,p_round:2});assert.equal(room.status,'finished');assert.equal(room.forfeited,2);
  await db.transaction(async tx=>{await tx.exec('set local role authenticated');await assert.rejects(()=>tx.exec('select * from public.tapbattle_rooms'),/permission denied/);});
  await db.transaction(async tx=>{await tx.exec('set local role anon');await assert.rejects(()=>tx.exec("select public.tapbattle_room('get')"),/permission denied/);});
  await db.query("update public.tapbattle_rooms set expires_at=now()-interval '1 second' where code=$1",[code]);
  await assert.rejects(()=>call(0,'get',common),/TB_EXPIRED/);
  console.log('PASS tapbattle: JS/SQL scoring parity, server permissions, readiness, countdown, event validation, retry/concurrent idempotency, private events, delivery grace, expiry, resignation and mutual rematch.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
