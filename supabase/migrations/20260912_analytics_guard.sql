-- 이용 통계 보호 (2026-09-12)
-- 1) track_app_event: 익명 호출이 무제한이라 통계를 마구 채울 수 있었다. 1분에 전체 3,000건을 넘으면 조용히 버린다.
--    (사용자 식별자가 없어 전역 상한만 둔다. 실제 방문량은 분당 수십 건 수준이라 정상 이용에는 영향이 없다.)
-- 2) analytics_events: 90일이 지난 행을 지우는 함수와 pg_cron 예약. 관리자 통계는 최대 30일만 본다.

create or replace function public.track_app_event(
  p_event text,
  p_game text default 'home',
  p_entry text default 'direct',
  p_method text default null,
  p_session_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
begin
  if p_event not in (
    'page_view', 'game_started', 'game_completed', 'link_made', 'invite_opened',
    'responded', 'invite_shared', 'result_opened', 'result_shared', 'replay',
    'letter_opened', 'ad_viewed', 'ad_clicked', 'broken_link'
  ) then return false; end if;

  select count(*) into v_recent
  from public.analytics_events
  where created_at > now() - interval '1 minute';
  if v_recent >= 3000 then return false; end if;

  insert into public.analytics_events (event_name, game_slug, entry_type, share_method, session_id)
  values (
    p_event,
    left(regexp_replace(coalesce(p_game, 'home'), '[^a-zA-Z0-9/_-]', '', 'g'), 50),
    left(coalesce(p_entry, 'direct'), 20),
    nullif(left(coalesce(p_method, ''), 20), ''),
    nullif(left(coalesce(p_session_id, ''), 40), '')
  );
  return true;
end;
$$;

create or replace function public.purge_old_analytics_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.analytics_events where created_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_old_analytics_events() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge_old_analytics_events';
    perform cron.schedule('purge_old_analytics_events', '30 4 * * *', 'select public.purge_old_analytics_events()');
  else
    raise notice 'pg_cron 확장이 없어 통계 자동 삭제를 예약하지 않았습니다.';
  end if;
end
$$;

select 'analytics_guard_ready' as status;
