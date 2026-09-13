-- 완료 알림: 결과 주소가 그 도전장의 게임 주소인지 확인 (2026-09-13)
-- 지금까지 complete_game_challenge 는 주소의 모양(길이 7,000자 이하, '/' 로 시작)만 봤고
-- 그 주소가 도전장에 적힌 게임의 주소인지는 보지 않았다. 완료 코드를 알게 된 사람이
-- 엉뚱한 페이지(다른 게임, 편지)를 그 도전의 결과로 먼저 등록할 수 있었다.
-- 도전장은 한 번만 완료되므로, 한 번 잘못 채워지면 진짜 결과가 들어갈 자리가 없어진다.
--
-- 허용하는 주소: /t/<게임>/ 뿐. 쿼리·해시는 그대로 둔다.
--   · 'mind/fight' 처럼 슬래시가 들어간 게임 이름도 그대로 쓴다.
--   · 도메인 이전 전 기기가 보내는 /couple-test/ 접두어는 떼고 비교한다.
--   · 끝의 index.html 과 마지막 '/' 생략도 같은 주소로 본다.

create or replace function public.complete_game_challenge(
  p_code text,
  p_result_url text,
  p_result_summary text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(p_code));
  v_url text := btrim(p_result_url);
  v_summary text := nullif(left(btrim(coalesce(p_result_summary, '')), 120), '');
  v_path text;
  v_want text;
  v_row public.game_challenges%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not (v_code ~ '^[A-Z0-9]{12,24}$') then raise exception 'INVALID_CHALLENGE_CODE'; end if;
  if char_length(v_url) > 7000 or v_url !~ '^/[^/]' then raise exception 'INVALID_RESULT_URL'; end if;

  select c.* into v_row
  from public.game_challenges c
  where c.code = v_code
  for update;

  if not found then raise exception 'CHALLENGE_NOT_FOUND'; end if;
  if v_row.expires_at <= now() then
    update public.game_challenges set status = 'expired' where id = v_row.id and status = 'pending';
    raise exception 'CHALLENGE_EXPIRED';
  end if;

  -- 주소에서 경로만 떼어 도전장의 게임과 맞춰 본다.
  v_path := split_part(split_part(v_url, '#', 1), '?', 1);
  if v_path like '/couple-test/%' then
    v_path := substring(v_path from char_length('/couple-test') + 1);
  end if;
  if v_path like '%/index.html' then
    v_path := left(v_path, char_length(v_path) - char_length('index.html'));
  end if;
  v_path := rtrim(v_path, '/');
  v_want := '/t/' || v_row.game_slug;
  if v_path <> v_want then raise exception 'RESULT_URL_MISMATCH'; end if;

  if v_row.status = 'pending' then
    update public.game_challenges
    set status = 'completed',
        result_url = v_url,
        result_summary = v_summary,
        completed_by_user_id = v_user_id,
        completed_at = now()
    where id = v_row.id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'code', v_row.code,
    'status', v_row.status,
    'completed_at', v_row.completed_at
  );
end;
$$;
