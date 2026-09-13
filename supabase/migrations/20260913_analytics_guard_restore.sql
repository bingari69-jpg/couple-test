-- 이용 통계 보호 복원 (2026-09-13)
-- 20260913_solo_events.sql 가 솔로 이벤트 4개를 더하려고 track_app_event 본문을 통째로 다시 쓰면서
-- 전날 20260912_analytics_guard.sql 이 넣은 분당 호출 상한과 broken_link 를 같이 지웠다.
-- 여기서 상한을 되살리고, 지금까지 쓰이는 이벤트 이름을 모두 합쳐 한 곳에 둔다.
--   · 상한: 1분에 전체 3,000건을 넘으면 조용히 버린다. (사용자 식별자가 없어 전역 상한만 둔다)
--   · broken_link: assets/link-guard.js 가 쓰는 이름. 현재는 assets/analytics.js 의 클라이언트
--     허용 목록에 없어 서버까지 오지 않지만, 목록을 맞춰 두어 다음에 풀 때 조용히 버려지지 않게 한다.
--   · ad_viewed / ad_clicked: assets/app-config.js 가 RPC 를 직접 부른다.
--   · solo_*: assets/solo.js.

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
    'letter_opened', 'ad_viewed', 'ad_clicked', 'broken_link',
    'solo_started', 'solo_cleared', 'solo_failed', 'solo_to_duel'
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
