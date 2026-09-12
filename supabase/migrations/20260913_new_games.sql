-- 새 게임 등록 (2026-09-13): 홈 목록 행 + 완료 알림 허용 목록
insert into public.game_catalog (slug, title, content_type, is_enabled, sort_order, settings, path, summary, category, relationships)
values
  ('simon', '순서 기억', 'game', true, 50, '{}'::jsonb, 't/simon/', '불빛 순서 따라 누르기, 몇 라운드까지?', '대결', array['친구','연인','가족']),
  ('snake', '스네이크 20초', 'game', true, 51, '{}'::jsonb, 't/snake/', '20초, 같은 지렁이, 누가 더 많이 먹나', '대결', array['친구','연인','가족']),
  ('choseong', '초성 퀴즈', 'game', true, 52, '{}'::jsonb, 't/choseong/', '초성만 보고 5문제, 60초 대결', '대결', array['친구','연인','가족']),
  ('daily-word', '오늘의 단어', 'game', true, 53, '{}'::jsonb, 't/daily-word/', '두 글자 단어, 자모 힌트로 6번 안에', '대결', array['친구','연인','가족']),
  ('fit', '끼워넣기', 'game', true, 54, '{}'::jsonb, 't/fit/', '같은 조각 60초, 줄 지워 점수 대결', '대결', array['친구','연인','가족']),
  ('2048', '2048 한판', 'game', true, 55, '{}'::jsonb, 't/2048/', '30초 밀어 합치기, 점수로 승부', '대결', array['친구','연인','가족']),
  ('stack', '블록 쌓기', 'game', true, 56, '{}'::jsonb, 't/stack/', '톡 쳐서 멈추는 블록 탑, 20초', '대결', array['친구','연인','가족']),
  ('mines', '지뢰찾기 미니', 'game', true, 57, '{}'::jsonb, 't/mines/', '60초 지뢰판 연달아, 몇 판 푸나', '대결', array['친구','연인','가족']),
  ('slide15', '15퍼즐', 'game', true, 58, '{}'::jsonb, 't/slide15/', '60초 숫자판 연달아, 몇 판 맞추나', '대결', array['친구','연인','가족']),
  ('flap', '탭 비행', 'game', true, 59, '{}'::jsonb, 't/flap/', '20초 동안 문 몇 개 통과하나', '대결', array['친구','연인','가족']),
  ('typing', '한글 타자 20초', 'game', true, 60, '{}'::jsonb, 't/typing/', '20초 한글 타자, 몇 글자?', '대결', array['친구','연인','가족'])
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
    'ten', 'react', 'num25', 'pairs', 'simon', 'snake', 'choseong', 'daily-word', 'fit', '2048', 'stack', 'mines', 'slide15', 'flap', 'typing', 'mole', 'ufo', 'tap', 'stroop', 'arrow', 'stop',
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
