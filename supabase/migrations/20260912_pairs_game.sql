-- 짝 맞추기 게임 추가 (2026-09-12)
-- 1) 홈 목록(game_catalog)에 pairs 행을 등록한다. 이미 있으면 건드리지 않는다.
--    (코드 쪽은 서버에 없는 로컬 게임을 목록 끝에 붙이므로, 이 SQL을 실행하기 전에도 홈에는 보인다.)
-- 2) 완료 알림 create_game_challenge 의 허용 게임 목록에 'pairs' 를 더한다.

insert into public.game_catalog (slug, title, content_type, is_enabled, sort_order, settings, path, summary, category, relationships)
values
  ('pairs', '짝 맞추기', 'game', true, 45, '{}'::jsonb, 't/pairs/',
   '두 장씩 뒤집어 10짝 다 맞추기. 같은 판으로 시간 대결!', '대결', array['친구','연인','가족'])
on conflict (slug) do nothing;

create or replace function public.create_game_challenge(
  p_game_slug text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(p_code));
  v_slug text := lower(btrim(p_game_slug));
  v_row public.game_challenges%rowtype;
  v_allowed constant text[] := array[
    'ten', 'react', 'num25', 'pairs', 'mole', 'ufo', 'tap', 'stroop', 'arrow', 'stop',
    'rps', 'nonsense', 'delivery', 'mbti', 'crash', 'seat', 'marriage',
    'mind/fight', 'memory', 'ranking', 'personality', 'tarot'
  ];
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not (v_code ~ '^[A-Z0-9]{12,24}$') then raise exception 'INVALID_CHALLENGE_CODE'; end if;
  if not (v_slug = any(v_allowed)) then raise exception 'GAME_NOT_SUPPORTED'; end if;

  insert into public.game_challenges (code, sender_user_id, game_slug)
  values (v_code, v_user_id, v_slug)
  returning * into v_row;

  return jsonb_build_object(
    'code', v_row.code,
    'game_slug', v_row.game_slug,
    'status', v_row.status,
    'expires_at', v_row.expires_at
  );
end;
$$;

select slug, sort_order from public.game_catalog where slug = 'pairs';
