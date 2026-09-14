const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
async function createDB(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon;
 insert into auth.users values ${ids.map(id=>`('${id}')`).join(',')};`);
 await db.exec(fs.readFileSync('supabase/migrations/20260914_alkkagi_rooms.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/20260915_alkkagi_staggered.sql','utf8'));
 const args={create_alkkagi_room:['p_name','p_request'],get_alkkagi_room:['p_code'],join_alkkagi_room:['p_code','p_name'],play_alkkagi_shot:['p_code','p_stone','p_angle','p_power','p_version'],resign_alkkagi_room:['p_code','p_version'],rematch_alkkagi_room:['p_code','p_round']};
 // One SQL transaction per authenticated request, as PostgREST provides in production.
 async function rpc(user,fn,params){
  if(!args[fn])throw Error('Unknown RPC');
  return db.transaction(async tx=>{
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[user]||'']);
   await tx.exec('set local role authenticated');
   const values=args[fn].map(k=>params[k]);
   const result=await tx.query(`select public.${fn}(${values.map((_,i)=>'$'+(i+1)).join(',')}) as data`,values);
   return result.rows[0].data;
  });
 }
 return {db,rpc,ids};
}
module.exports={createDB};
