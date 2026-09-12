-- 혼자놀기 통계 이벤트 (2026-09-13)
-- track_app_event 의 허용 이벤트에 solo_started / solo_cleared / solo_failed / solo_to_duel 을 더한다.
-- 본문은 20260911_admin_center.sql 의 함수와 같고 목록만 늘었다.

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
begin
  if p_event not in (
    'page_view', 'game_started', 'game_completed', 'link_made', 'invite_opened',
    'responded', 'invite_shared', 'result_opened', 'result_shared', 'replay',
    'letter_opened', 'ad_viewed', 'ad_clicked',
    'solo_started', 'solo_cleared', 'solo_failed', 'solo_to_duel'
  ) then return false; end if;
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
