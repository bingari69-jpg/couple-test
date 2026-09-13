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
 await db.exec(fs.readFileSync('supabase/migrations/20260914_tapbattle_rooms.sql','utf8'));
 async function rpc(user,fn,p){
  if(fn!=='tapbattle_room')throw Error('Unknown RPC');
  return db.transaction(async tx=>{
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[user]||'']);
   await tx.exec('set local role authenticated');
   const result=await tx.query('select public.tapbattle_room($1,$2,$3,$4,$5,$6) as data',[p.p_action,p.p_code??null,p.p_name??null,p.p_request??null,p.p_round??null,p.p_events??null]);
   return result.rows[0].data;
  });
 }
 return {db,rpc,ids};
}
module.exports={createDB};
