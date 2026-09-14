const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; create table public.app_admins(user_id uuid primary key); create function public.is_app_admin() returns boolean language sql stable as $$ select false $$; create function public.gen_random_uuid() returns uuid language sql volatile as $$ select md5(random()::text || clock_timestamp()::text)::uuid $$; create function public.digest(bytea,text) returns bytea language sql immutable as $$ select convert_to(md5(convert_from($1,'UTF8')),'UTF8') $$;");
  const migration=fs.readFileSync('supabase/migrations/20260914_site_inquiries.sql','utf8').replace(/create extension if not exists pgcrypto;/i,'');await db.exec(migration);
  const submit=(kind,category,email,message,reply=false,extra={})=>db.query('select public.submit_site_inquiry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) id',[kind,category,extra.name||'',extra.company||'',extra.role||'',extra.phone||'',email,message,reply,extra.source||'',crypto.randomUUID(),extra.website||'']);
  const first=await submit('feedback','오류가 있어요','hello@example.com','편지를 열 때 화면이 멈추는 현상을 확인해 주세요.',true);assert.equal(first.rows.length,1);
  const duplicate=await submit('feedback','오류가 있어요','hello@example.com','편지를 열 때 화면이 멈추는 현상을 확인해 주세요.',true);assert.equal(duplicate.rows[0].id,first.rows[0].id,'같은 문의 반복 저장 방지');
  await assert.rejects(()=>submit('feedback','오류가 있어요','','답변이 꼭 필요한 문의입니다.',true),/EMAIL_REQUIRED/);
  await assert.rejects(()=>submit('feedback','오류가 있어요','a@b.com','정상처럼 보이는 스팸 문의입니다.',false,{website:'spam.example'}),/INVALID_REQUEST/);
  await submit('partnership','콘텐츠·캠페인','partner@example.com','친구와 함께하는 브랜드 캠페인을 제안하고 싶습니다.',true,{name:'김담당',company:'같이회사'});
  assert.equal((await db.query('select count(*)::int count from public.site_inquiries')).rows[0].count,2);
  await db.exec('set role anon');await assert.rejects(()=>db.query('select * from public.site_inquiries'),/permission denied/);await db.exec('reset role');
  console.log('문의 SQL 검사 통과 — 의견·제휴 접수, 중복 방지, 입력 검증, 허니팟, 공개 원문 차단');
 }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
