-- 완료 알림 개인정보 보완 (2026-09-12)
-- 1) 기한이 지난 도전 행을 지우는 함수. result_url에는 두 사람의 답이 담긴 결과 링크가 있으므로
--    expires_at(기본 7일) 뒤에는 남겨 두지 않는다.
-- 2) pg_cron이 켜져 있으면 매일 새벽 4시(UTC)에 자동 실행한다. 없으면 함수만 만들고 넘어간다.

create or replace function public.purge_expired_game_challenges()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.game_challenges
  where expires_at <= now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_expired_game_challenges() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge_expired_game_challenges';
    perform cron.schedule('purge_expired_game_challenges', '0 4 * * *', 'select public.purge_expired_game_challenges()');
  else
    raise notice 'pg_cron 확장이 없어 자동 삭제를 예약하지 않았습니다. Dashboard > Database > Extensions에서 pg_cron을 켠 뒤 이 파일을 다시 실행하세요.';
  end if;
end
$$;

select 'result_cleanup_ready' as status;
