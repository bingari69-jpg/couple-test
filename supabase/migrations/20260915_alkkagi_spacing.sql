-- Apply after 20260915_alkkagi_staggered.sql. Existing matches stay intact.
begin;
create or replace function public.alkkagi_initial_board()
returns jsonb language sql immutable set search_path='' as $$
 select '[{"id":0,"color":1,"x":0.18,"y":0.72,"alive":true},{"id":1,"color":1,"x":0.46,"y":0.72,"alive":true},{"id":2,"color":1,"x":0.74,"y":0.72,"alive":true},{"id":3,"color":1,"x":0.32,"y":0.88,"alive":true},{"id":4,"color":1,"x":0.64,"y":0.88,"alive":true},{"id":5,"color":2,"x":0.82,"y":0.28,"alive":true},{"id":6,"color":2,"x":0.54,"y":0.28,"alive":true},{"id":7,"color":2,"x":0.26,"y":0.28,"alive":true},{"id":8,"color":2,"x":0.68,"y":0.12,"alive":true},{"id":9,"color":2,"x":0.36,"y":0.12,"alive":true}]'::jsonb;
$$;
revoke all on function public.alkkagi_initial_board() from public,anon,authenticated;
alter table public.alkkagi_rooms alter column board set default public.alkkagi_initial_board();
commit;
