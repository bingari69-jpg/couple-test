-- 같이놀자 공개 의견·제휴 문의함
-- 공개 사용자는 submit_site_inquiry()만 호출할 수 있고, 원문 조회는 관리자만 가능하다.

create extension if not exists pgcrypto;

create table if not exists public.site_inquiries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  kind text not null check (kind in ('feedback', 'partnership')),
  category text not null,
  name text,
  company text,
  role text,
  phone text,
  email text,
  message text not null,
  reply_requested boolean not null default false,
  source text,
  content_hash bytea not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'replied', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_inquiries_created_at_idx on public.site_inquiries (created_at desc);
create index if not exists site_inquiries_status_idx on public.site_inquiries (status, created_at desc);
create index if not exists site_inquiries_content_hash_idx on public.site_inquiries (content_hash, created_at desc);

alter table public.site_inquiries enable row level security;
revoke all on public.site_inquiries from public, anon, authenticated;
grant select, update, delete on public.site_inquiries to authenticated;

drop policy if exists site_inquiries_admin_select on public.site_inquiries;
create policy site_inquiries_admin_select on public.site_inquiries for select to authenticated
using (public.is_app_admin());

drop policy if exists site_inquiries_admin_update on public.site_inquiries;
create policy site_inquiries_admin_update on public.site_inquiries for update to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists site_inquiries_admin_delete on public.site_inquiries;
create policy site_inquiries_admin_delete on public.site_inquiries for delete to authenticated
using (public.is_app_admin());

create or replace function public.submit_site_inquiry(
  p_kind text,
  p_category text,
  p_name text,
  p_company text,
  p_role text,
  p_phone text,
  p_email text,
  p_message text,
  p_reply_requested boolean,
  p_source text,
  p_request_id uuid,
  p_website text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_category text := trim(coalesce(p_category, ''));
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_company text := nullif(trim(coalesce(p_company, '')), '');
  v_role text := nullif(trim(coalesce(p_role, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_message text := trim(coalesce(p_message, ''));
  v_source text := nullif(trim(coalesce(p_source, '')), '');
  v_hash bytea;
begin
  if coalesce(trim(p_website), '') <> '' then raise exception 'INVALID_REQUEST'; end if;
  if v_kind not in ('feedback', 'partnership') or p_request_id is null then raise exception 'INVALID_REQUEST'; end if;
  if char_length(v_category) not between 1 and 80 then raise exception 'INVALID_CATEGORY'; end if;
  if char_length(v_message) < (case when v_kind = 'partnership' then 20 else 10 end) or char_length(v_message) > 4000 then raise exception 'INVALID_MESSAGE'; end if;
  if char_length(coalesce(v_name, '')) > 60 or char_length(coalesce(v_company, '')) > 100 or char_length(coalesce(v_role, '')) > 80 or char_length(coalesce(v_phone, '')) > 30 or char_length(coalesce(v_source, '')) > 80 then raise exception 'INVALID_FIELD'; end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'INVALID_EMAIL'; end if;
  if coalesce(p_reply_requested, false) and v_email is null then raise exception 'EMAIL_REQUIRED'; end if;
  if v_kind = 'partnership' and (v_name is null or v_company is null or v_email is null) then raise exception 'PARTNER_FIELDS_REQUIRED'; end if;

  v_hash := public.digest(convert_to(v_kind || E'\n' || v_category || E'\n' || coalesce(v_email, '') || E'\n' || v_message, 'UTF8'), 'sha256');
  select i.id into v_id from public.site_inquiries i where i.content_hash = v_hash and i.created_at > now() - interval '10 minutes' order by i.created_at desc limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.site_inquiries (request_id, kind, category, name, company, role, phone, email, message, reply_requested, source, content_hash)
  values (p_request_id, v_kind, v_category, v_name, v_company, v_role, v_phone, v_email, v_message, coalesce(p_reply_requested, false), v_source, v_hash)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  select i.id into v_id from public.site_inquiries i where i.request_id = p_request_id;
  return v_id;
end;
$$;

revoke all on function public.submit_site_inquiry(text,text,text,text,text,text,text,text,boolean,text,uuid,text) from public;
grant execute on function public.submit_site_inquiry(text,text,text,text,text,text,text,text,boolean,text,uuid,text) to anon, authenticated;

comment on table public.site_inquiries is '같이놀자 공개 의견 및 제휴 문의. 관리자만 원문을 조회한다.';
