const assert=require('node:assert/strict'),R=require('../t/alkkagi/rules.js');
const {randomUUID}=require('node:crypto'),{createDB}=require('./alkkagi-db.cjs');
const {load,PAGE_ERRORS}=require('./dom');
(async()=>{
 const initial=R.create();assert.deepEqual(R.counts(initial.stones),[5,5]);
 assert.equal(new Set(initial.stones.slice(0,5).map(s=>s.y)).size,2);
 for(let i=0;i<5;i++){assert(Math.abs(initial.stones[i].x+initial.stones[i+5].x-1)<1e-6);assert(Math.abs(initial.stones[i].y+initial.stones[i+5].y-1)<1e-6);}
 assert.deepEqual([0,650,1300,1950,2600].map(R.gaugePower),[10,55,100,55,10]);
 for(const args of [[5,270,60],[0,-1,60],[0,360,60],[0,270,0],[0,270,101],[0,NaN,60],[0,270,65.5]])assert.equal(R.shoot(initial,...args),null);
 const copy=JSON.stringify(initial),first=R.shoot(initial,2,270,85);assert.equal(JSON.stringify(initial),copy);assert(first.frames.length>1);assert.equal(first.state.turn,2);assert(first.state.stones.some((s,i)=>s.x!==initial.stones[i].x||s.y!==initial.stones[i].y));
 const aiStart=Date.now(),ai=R.choose(initial);assert(ai);assert(R.shoot(initial,ai.id,ai.angle,ai.power));console.log('AI choice in',Date.now()-aiStart,'ms');
 const {db,rpc}=await createDB();
 try{
 const request=randomUUID();let s=await rpc(0,'create_alkkagi_room',{p_name:'나',p_request:request}),code=s.code;assert.equal(s.status,'waiting');assert.equal((await rpc(0,'create_alkkagi_room',{p_name:'나',p_request:request})).code,code);
 s=await rpc(1,'join_alkkagi_room',{p_code:code,p_name:'친구'});assert.equal(s.me,2);
 await assert.rejects(rpc(2,'join_alkkagi_room',{p_code:code,p_name:'셋'}),/ALKKAGI_FULL/);
 const shoot=(user,id,angle,power,version=s.version)=>rpc(user,'play_alkkagi_shot',{p_code:code,p_stone:id,p_angle:angle,p_power:power,p_version:version});
 await assert.rejects(shoot(1,5,90,60),/ALKKAGI_NOT_TURN/);await assert.rejects(shoot(0,5,90,60),/ALKKAGI_INVALID_SHOT/);await assert.rejects(shoot(0,0,270,101),/ALKKAGI_INVALID_SHOT/);await assert.rejects(shoot(2,0,270,60),/ALKKAGI_NOT_MEMBER/);
 // Every authoritative SQL result must match the browser simulation, including collisions.
 let local=initial;for(let n=0;n<24&&!local.winner&&!local.draw;n++){
  const pick=n===0?{id:2,angle:270,power:85}:R.choose(local),before=s.version;
  local=R.shoot(local,pick.id,pick.angle,pick.power,false).state;s=await shoot(local.shots%2===1?0:1,pick.id,pick.angle,pick.power,before);
  for(let i=0;i<10;i++){assert.equal(s.board[i].alive,local.stones[i].alive,'same elimination '+n+':'+i);assert(Math.abs(s.board[i].x-local.stones[i].x)<=.000002,'same x '+n+':'+i);assert(Math.abs(s.board[i].y-local.stones[i].y)<=.000002,'same y '+n+':'+i);}
  assert.equal(s.turn,local.turn);assert.equal(s.winner,local.winner);assert.equal(s.shots,local.shots);
  if(n===0)await assert.rejects(shoot(0,pick.id,pick.angle,pick.power,before),/ALKKAGI_STALE/);
 }
 if(s.status!=='finished')s=await rpc(0,'resign_alkkagi_room',{p_code:code,p_version:s.version});
 s=await rpc(0,'rematch_alkkagi_room',{p_code:code,p_round:s.round});assert.equal(s.status,'finished');s=await rpc(1,'rematch_alkkagi_room',{p_code:code,p_round:s.round});assert.equal(s.shots,0);assert.deepEqual(R.counts(s.board),[5,5]);
 assert.equal(s.turn,2);assert.equal(s.starter,2);assert.deepEqual(s.board,initial.stones);
 const preserved=s.board;await db.exec(require('node:fs').readFileSync('supabase/migrations/20260915_alkkagi_staggered.sql','utf8'));assert.deepEqual((await rpc(0,'get_alkkagi_room',{p_code:code})).board,preserved);
  const racing=await Promise.allSettled([shoot(1,5,90,65,s.version),shoot(1,6,90,65,s.version)]);assert.equal(racing.filter(r=>r.status==='fulfilled').length,1);
 const edge=R.create();edge.stones.forEach(p=>p.alive=false);edge.stones[0]={id:0,color:1,x:.9,y:.9,alive:true};edge.stones[5]={id:5,color:2,x:.94,y:.84,alive:true};
 await db.query("update public.alkkagi_rooms set board=$1,shots=0,turn=1,status='playing',winner=0,finish_reason=null where code=$2",[JSON.stringify(edge.stones),code]);s=await rpc(0,'get_alkkagi_room',{p_code:code});s=await shoot(0,0,0,100);assert.equal(s.reason,'draw');assert.equal(s.winner,0);assert.deepEqual(R.counts(s.board),[0,0]);assert(R.shoot(edge,0,0,100,false).state.draw,'both last stones can fall together');
 const limited=R.create();limited.shots=119;limited.stones[9].alive=false;await db.query("update public.alkkagi_rooms set board=$1,shots=119,turn=1,status='playing',winner=0,finish_reason=null where code=$2",[JSON.stringify(limited.stones),code]);s=await rpc(0,'get_alkkagi_room',{p_code:code});s=await shoot(0,2,270,10);assert.equal(s.reason,'limit');assert.equal(s.winner,1);assert.equal(R.shoot(limited,2,270,10,false).state.winner,1);
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.exec('update public.alkkagi_rooms set winner=1');}),/permission denied/);
 await db.query("update public.alkkagi_rooms set expires_at=now()-interval '1 second' where code=$1",[code]);await assert.rejects(rpc(0,'get_alkkagi_room',{p_code:code}),/ALKKAGI_EXPIRED/);
 console.log('PASS Alkkagi SQL: authoritative physics parity, turns, own stones, power validation, duplicate shots, access, rematch, expiry');
 }finally{await db.close();}
 const {window:w}=load('alkkagi','?mode=local'),$=id=>w.document.getElementById(id);w.matchMedia=()=>({matches:true});
 let now=0;w.performance.now=()=>now;Object.defineProperty(w.document,'hidden',{configurable:true,value:false});
 $('start').click();assert.equal(w.document.querySelectorAll('.alk-stone:not([hidden])').length,10);assert($('place').disabled);w.document.querySelector('[data-stone="2"]').click();assert(!$('place').disabled);assert.equal($('moveCount').textContent,'0번');
 $('place').click();assert.equal($('moveCount').textContent,'0번');assert(!$('cancelCharge').hidden);$('place').click();assert.equal($('moveCount').textContent,'0번','accidental double click cannot fire');
 const direction=$('aimLine').getAttribute('x2');w.document.querySelector('[data-angle="180"]').click();assert.equal($('aimLine').getAttribute('x2'),direction,'direction is fixed during charge');
 $('cancelCharge').click();assert.equal($('moveCount').textContent,'0번');assert($('cancelCharge').hidden);
 $('place').click();w.dispatchEvent(new w.Event('blur'));assert($('cancelCharge').hidden);assert.equal($('moveCount').textContent,'0번');
 $('place').click();now=1300;$('place').click();assert.equal($('moveCount').textContent,'1번');assert($('place').disabled);assert.match($('turnStatus').textContent,/백돌/);assert.match($('shotNote').textContent,/힘 100/);
 $('replay').click();assert.match($('sessionNote').textContent,/백돌부터/);assert.match($('turnStatus').textContent,/백돌/);
 w.close();assert.deepEqual(PAGE_ERRORS,[]);
 console.log('PASS Alkkagi rules/UI: legal shots, immutable simulation, computer tactics, selection/confirmation and alternating turns');
})().catch(e=>{console.error(e);process.exitCode=1;});
