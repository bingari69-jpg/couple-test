-- 스네이크 20초 → 40초 (2026-09-16)
-- 홈 목록의 제목·설명은 game_catalog 행이 있으면 그 값이 먼저 쓰인다.
-- 코드만 바꾸면 홈에 옛 이름("스네이크 20초")이 그대로 보이므로 서버 행도 함께 고친다.
update public.game_catalog
   set title = '스네이크 40초',
       summary = '40초, 같은 지렁이, 누가 더 많이 먹나'
 where slug = 'snake';
