const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth to authenticated;`);
  const base=fs.readFileSync('supabase/migrations/20260911_admin_center.sql','utf8').split('insert into storage.buckets')[0].replace('create extension if not exists pgcrypto;','');
  await db.exec(base);
  const migration=fs.readFileSync('supabase/migrations/20260915_admin_operations.sql','utf8');await db.exec(migration);await db.exec(migration);
  const uid='11111111-1111-4111-8111-111111111111';
  await db.exec(`insert into auth.users values('${uid}');insert into public.app_admins(user_id) values('${uid}');set request.jwt.claim.sub='${uid}';set role authenticated;`);
  const state=async()=>(await db.query('select public.admin_get_app_state_v2() s')).rows[0].s;
  const config={site:{name:'같이놀자',menu:[]},games:[],ads:{slots:[]}};
  const write=async(action,revision,c=config,version=null)=>(await db.query('select public.admin_write_app_config($1,$2,$3,$4,$5) s',[action,revision,c,'test',version])).rows[0].s;
  assert.equal((await state()).revision,0);
  const draft=await write('draft',0);assert.equal(draft.revision,1);assert.equal(draft.published,null);
  await assert.rejects(()=>write('publish',0),/CONFIG_CONFLICT/);
  assert.equal((await state()).revision,1);
  const published=await write('publish',1);assert.equal(published.version,1);assert.equal(published.revision,2);
  await assert.rejects(()=>db.query('select public.admin_publish_app_config($1)',[config]),/permission denied/);
  await write('restore',2,null,1);assert.equal((await state()).revision,3);
  await db.exec('reset role');
  await db.exec(`insert into public.analytics_events(event_name,game_slug,session_id,share_method,created_at) values
   ('page_view','home','a','v2:manual','2026-09-13 14:59:59+00'),
   ('page_view','home','b','v2:manual','2026-09-13 15:00:00+00'),
   ('page_view','home','b','v2:manual','2026-09-14 14:59:59+00'),
   ('page_view','home','c','v2:manual','2026-09-14 15:00:00+00'),
   ('page_view','home','legacy',null,'2026-09-14 00:00:00+00');set role authenticated;`);
  const stats=async(legacy)=>(await db.query("select public.admin_get_app_stats_v2('2026-09-14','2026-09-14',$1) s",[legacy])).rows[0].s;
  const current=await stats(false);assert.equal(current.visitors,1);assert.equal(current.totals.page_view,2);assert.equal(current.previous.visitors,1);assert.equal(current.daily[0].day,'2026-09-14');assert.equal((await stats(true)).visitors,1);
  await assert.rejects(()=>db.query("select public.admin_get_app_stats_v2('2026-01-01','2026-12-31')"),/INVALID_DATE_RANGE/);
  await assert.rejects(()=>db.query("select public.app_stats_period(now(),now(),false)"),/permission denied/);
  await db.exec("reset role;set request.jwt.claim.sub='';set role authenticated");await assert.rejects(state,/ADMIN_REQUIRED/);await assert.rejects(()=>write('draft',3),/ADMIN_REQUIRED/);
  await db.exec('reset role;set role anon');await assert.rejects(state,/permission denied/);
  console.log('관리 운영 SQL 통과 — 재실행, 권한, 오래된 초안 충돌, 구형 쓰기 차단, 한국 날짜 경계, 집계 기준 분리');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
