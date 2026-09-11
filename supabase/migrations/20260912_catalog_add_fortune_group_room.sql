-- 홈 목록 보완 (2026-09-12)
-- 코드의 홈 목록에 타로·마음동물·운세·단체방을 추가했다. 운영 game_catalog에는 tarot, personality만 있고
-- fortune, group-room 행이 없어서 여기서 등록한다. 이미 있으면 건드리지 않는다.
-- (코드 쪽은 서버에 없는 로컬 게임을 목록 끝에 붙이므로, 이 SQL을 실행하기 전에도 홈에는 보인다.)

insert into public.game_catalog (slug, title, content_type, is_enabled, sort_order, settings, path, summary, category, relationships)
values
  ('fortune', '오늘의 운세 카드', 'fortune', true, 260, '{}'::jsonb, 't/fortune/',
   '오늘 마음이 가는 카드 한 장을 골라 메시지를 받고 친구에게 공유해요.', '운세', array['친구','연인','가족']),
  ('group-room', '단체방 커피 내기', 'game', true, 270, '{}'::jsonb, 't/group-room/',
   '모두 같은 방에 들어와 준비하면 커피 살 사람을 공평하게 정해요.', '내기', array['친구','가족'])
on conflict (slug) do nothing;

select slug, sort_order from public.game_catalog where slug in ('fortune', 'group-room');
