-- 관리센터 개선. Supabase SQL Editor에서 전체를 한 번 실행하세요.
-- 기존 설정·문의·통계는 삭제하지 않습니다. 재실행 가능합니다.
begin;
alter table public.app_config_state add column if not exists revision bigint not null default 0;
create or replace function public.bump_app_config_revision() returns trigger
language plpgsql set search_path = '' as $$
begin new.revision := old.revision + 1; return new; end; $$;
drop trigger if exists app_config_revision on public.app_config_state;
create trigger app_config_revision before update on public.app_config_state
for each row execute function public.bump_app_config_revision();

create or replace function public.admin_get_app_state_v2() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r bigint;
begin
  if not public.is_app_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select revision into r from public.app_config_state where id='main' for share;
  return public.admin_get_app_state() || jsonb_build_object('revision',r);
end; $$;

create or replace function public.admin_write_app_config(
  p_action text, p_expected_revision bigint, p_config jsonb default null,
  p_note text default null, p_version integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r bigint;
begin
  if not public.is_app_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select revision into r from public.app_config_state where id='main' for update;
  if r is null or p_expected_revision is null or r <> p_expected_revision then
    raise exception 'CONFIG_CONFLICT';
  end if;
  if p_action='draft' then perform public.admin_save_app_draft(p_config,p_note);
  elsif p_action='publish' then perform public.admin_publish_app_config(p_config,p_note);
  elsif p_action='restore' then perform public.admin_restore_app_version(p_version,p_note);
  else raise exception 'INVALID_ACTION'; end if;
  return public.admin_get_app_state_v2();
end; $$;
-- 구형 관리 화면의 덮어쓰기도 차단합니다. 쓰기는 위의 충돌 검사 경로만 허용합니다.
revoke execute on function public.admin_save_app_draft(jsonb,text) from public,anon,authenticated;
revoke execute on function public.admin_publish_app_config(jsonb,text) from public,anon,authenticated;
revoke execute on function public.admin_restore_app_version(integer,text) from public,anon,authenticated;
revoke all on function public.admin_get_app_state_v2() from public,anon;
revoke all on function public.admin_write_app_config(text,bigint,jsonb,text,integer) from public,anon;
grant execute on function public.admin_get_app_state_v2() to authenticated;
grant execute on function public.admin_write_app_config(text,bigint,jsonb,text,integer) to authenticated;

-- 내부 집계 함수: v2: 접두어는 개선된 수집 코드의 식별자이며 방문자 인증 수단은 아닙니다.
create or replace function public.app_stats_period(p_from timestamptz,p_to timestamptz,p_legacy boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
with events as materialized (
 select * from public.analytics_events where created_at >= p_from and created_at < p_to
 and (coalesce(share_method,'') like 'v2:%') = (not p_legacy)
), totals as (select event_name,count(*) as n from events group by event_name),
games as (
 select game_slug as slug,
 count(*) filter(where event_name='page_view') as visits,
 count(*) filter(where event_name in ('game_started','solo_started')) as starts,
 count(*) filter(where event_name in ('game_completed','solo_cleared','solo_failed')) as completes,
 count(*) filter(where event_name in ('invite_shared','result_shared')) as shares,
 count(*) filter(where event_name='responded') as responses
 from events group by game_slug
)
select jsonb_build_object(
 'visitors',(select count(distinct session_id) from events where event_name='page_view'),
 'totals',coalesce((select jsonb_object_agg(event_name,n) from totals),'{}'::jsonb),
 'games',coalesce((select jsonb_agg(games order by visits desc,slug) from games),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(d order by d.day) from (
   select (created_at at time zone 'Asia/Seoul')::date as day,
   count(*) filter(where event_name='page_view') as views,
   count(distinct session_id) filter(where event_name='page_view') as visitors
   from events group by 1
 )d),'[]'::jsonb)
); $$;
revoke all on function public.app_stats_period(timestamptz,timestamptz,boolean) from public,anon,authenticated;

create or replace function public.admin_get_app_stats_v2(p_from date,p_to date,p_legacy boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a timestamptz; b timestamptz; prev timestamptz;
begin
 if not public.is_app_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_from is null or p_to is null or p_to < p_from or p_to-p_from > 89 then raise exception 'INVALID_DATE_RANGE'; end if;
 a := p_from::timestamp at time zone 'Asia/Seoul';
 b := (p_to+1)::timestamp at time zone 'Asia/Seoul';
 prev := (p_from-(p_to-p_from+1))::timestamp at time zone 'Asia/Seoul';
 return public.app_stats_period(a,b,p_legacy) || jsonb_build_object(
  'from',p_from,'to',p_to,'timezone','Asia/Seoul','legacy',p_legacy,'generated_at',now(),
  'previous',public.app_stats_period(prev,a,p_legacy),
  'previous_from',(prev at time zone 'Asia/Seoul')::date,'previous_to',p_from-1
 );
end; $$;
revoke all on function public.admin_get_app_stats_v2(date,date,boolean) from public,anon;
grant execute on function public.admin_get_app_stats_v2(date,date,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
