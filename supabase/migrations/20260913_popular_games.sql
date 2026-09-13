-- 인기 순위 (2026-09-13)
-- 최근 7일 실행 수로 상위 5개를 뽑아 game_catalog.popular_rank 에 1~5 를 적는다.
-- 홈은 이 값을 읽어 순위대로 앞에 세우고 "인기 1위" 를 붙인다.
--
-- 왜 7일인가: 하루치는 한두 명으로 뒤집힌다. 일주일이면 웬만해선 안 바뀌고, 바뀌면 진짜 바뀐 것이다.
-- 왜 최소 기준을 두는가: 3번 한 게임과 2번 한 게임을 두고 "인기 1위" 라고 하면 거짓말이 된다.
--   기준(MIN_PLAYS)을 못 넘으면 그날은 아무 순위도 적지 않아 홈이 평소 순서 그대로 나온다.
--   아직 배포 전이라 기록이 거의 없으므로, 당분간은 순위가 비어 있는 게 정상이다.

alter table public.game_catalog add column if not exists popular_rank smallint;

comment on column public.game_catalog.popular_rank is
  '최근 7일 실행 수 상위 1~5. refresh_popular_games() 가 매일 새로 적는다. 나머지는 null.';

create or replace function public.refresh_popular_games()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  MIN_PLAYS constant integer := 20;   -- 이 횟수를 못 넘으면 순위로 부르지 않는다
  TOP_N     constant integer := 5;
  v_count integer;
begin
  with plays as (
    select game_slug, count(*)::integer as n
    from public.analytics_events
    where created_at > now() - interval '7 days'
      and event_name in ('game_started', 'solo_started')
      and game_slug is not null
    group by game_slug
    having count(*) >= MIN_PLAYS
  ),
  ranked as (
    select g.slug, row_number() over (order by p.n desc, g.sort_order asc, g.slug asc) as rank
    from plays p
    join public.game_catalog g on g.slug = p.game_slug
    where g.is_enabled
  )
  update public.game_catalog c
  set popular_rank = r.rank
  from ranked r
  where c.slug = r.slug and r.rank <= TOP_N
    and c.popular_rank is distinct from r.rank;

  get diagnostics v_count = row_count;

  -- 순위에서 내려온 게임은 표시를 지운다
  update public.game_catalog c
  set popular_rank = null
  where c.popular_rank is not null
    and c.slug not in (
      select g.slug
      from public.analytics_events e
      join public.game_catalog g on g.slug = e.game_slug
      where e.created_at > now() - interval '7 days'
        and e.event_name in ('game_started', 'solo_started')
        and g.is_enabled
      group by g.slug, g.sort_order
      having count(*) >= MIN_PLAYS
      order by count(*) desc, g.sort_order asc, g.slug asc
      limit TOP_N
    );

  return v_count;
end;
$$;

revoke all on function public.refresh_popular_games() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('refresh_popular_games') where exists (
      select 1 from cron.job where jobname = 'refresh_popular_games'
    );
    perform cron.schedule('refresh_popular_games', '20 4 * * *', 'select public.refresh_popular_games()');
  end if;
end $$;
