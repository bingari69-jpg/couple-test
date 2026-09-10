-- 같이놀자 단체방 서버
-- 한 링크에 2~20명이 익명으로 참가하고, 게임 결과로 내기 당사자를 한 번만 확정한다.

create extension if not exists pgcrypto;

create table if not exists public.group_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null references public.game_catalog(slug)
    on update cascade on delete restrict,
  stake_text text not null default '커피 한 잔'
    check (char_length(btrim(stake_text)) between 1 and 40),
  score_mode text not null default 'highest_wins'
    check (score_mode in ('highest_wins', 'lowest_wins', 'random')),
  status text not null default 'lobby'
    check (status in ('lobby', 'playing', 'finished', 'cancelled')),
  max_players smallint not null default 4
    check (max_players between 2 and 20),
  current_round smallint not null default 1
    check (current_round between 1 and 99),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.group_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null
    check (char_length(btrim(nickname)) between 1 and 12),
  role text not null default 'player'
    check (role in ('host', 'player')),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, nickname)
);

create table if not exists public.group_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.group_rooms(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  round_no smallint not null default 1 check (round_no between 1 and 99),
  score numeric,
  answer jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (room_id, member_id, round_no)
);

create index if not exists group_rooms_code_idx
  on public.group_rooms (code);
create index if not exists group_rooms_expires_at_idx
  on public.group_rooms (expires_at);
create index if not exists group_members_room_idx
  on public.group_members (room_id);
create index if not exists group_answers_room_round_idx
  on public.group_answers (room_id, round_no);

alter table public.group_rooms enable row level security;
alter table public.group_members enable row level security;
alter table public.group_answers enable row level security;

revoke all on public.group_rooms from anon, authenticated;
revoke all on public.group_members from anon, authenticated;
revoke all on public.group_answers from anon, authenticated;

grant select on public.group_rooms to authenticated;
grant select on public.group_members to authenticated;
grant select on public.group_answers to authenticated;

-- RLS에서 재귀 없이 방 참가 여부를 확인한다.
create or replace function public.is_group_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members m
    where m.room_id = p_room_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_own_group_member(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members m
    where m.id = p_member_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_own_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_own_group_member(uuid) to authenticated;

drop policy if exists "참가한 단체방 읽기" on public.group_rooms;
create policy "참가한 단체방 읽기"
on public.group_rooms for select to authenticated
using (public.is_group_member(id));

drop policy if exists "같은 방 참가자 읽기" on public.group_members;
create policy "같은 방 참가자 읽기"
on public.group_members for select to authenticated
using (public.is_group_member(room_id));

drop policy if exists "내 답 또는 종료된 답 읽기" on public.group_answers;
create policy "내 답 또는 종료된 답 읽기"
on public.group_answers for select to authenticated
using (
  public.is_own_group_member(member_id)
  or (
    public.is_group_member(room_id)
    and exists (
      select 1
      from public.group_rooms r
      where r.id = group_answers.room_id and r.status = 'finished'
    )
  )
);

-- 방 전체 상태를 한 번에 내려준다. 진행 중에는 다른 사람의 답을 숨긴다.
create or replace function public.get_group_room(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room public.group_rooms%rowtype;
  v_members jsonb;
  v_answers jsonb := '[]'::jsonb;
begin
  select r.* into v_room
  from public.group_rooms r
  where r.code = upper(btrim(p_code));

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if not public.is_group_member(v_room.id) then
    raise exception 'ROOM_ACCESS_DENIED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'nickname', m.nickname,
        'role', m.role,
        'is_ready', m.is_ready,
        'has_submitted', exists (
          select 1 from public.group_answers a
          where a.room_id = v_room.id
            and a.member_id = m.id
            and a.round_no = v_room.current_round
        ),
        'joined_at', m.joined_at
      ) order by m.joined_at
    ),
    '[]'::jsonb
  ) into v_members
  from public.group_members m
  where m.room_id = v_room.id;

  if v_room.status = 'finished' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'member_id', a.member_id,
          'nickname', m.nickname,
          'score', a.score,
          'answer', a.answer,
          'submitted_at', a.submitted_at
        ) order by m.joined_at
      ),
      '[]'::jsonb
    ) into v_answers
    from public.group_answers a
    join public.group_members m on m.id = a.member_id
    where a.room_id = v_room.id
      and a.round_no = v_room.current_round;
  end if;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id,
      'code', v_room.code,
      'game_slug', v_room.game_slug,
      'stake_text', v_room.stake_text,
      'score_mode', v_room.score_mode,
      'status', v_room.status,
      'max_players', v_room.max_players,
      'current_round', v_room.current_round,
      'is_host', v_room.host_user_id = (select auth.uid()),
      'result', case when v_room.status = 'finished' then v_room.result else null end,
      'created_at', v_room.created_at,
      'expires_at', v_room.expires_at
    ),
    'members', v_members,
    'answers', v_answers
  );
end;
$$;

-- 방장이 방을 만들면 자동으로 첫 참가자가 된다.
create or replace function public.create_group_room(
  p_game_slug text,
  p_stake_text text,
  p_nickname text,
  p_max_players integer default 4,
  p_score_mode text default 'highest_wins'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.group_rooms%rowtype;
  v_nickname text := btrim(p_nickname);
  v_stake text := btrim(coalesce(p_stake_text, '커피 한 잔'));
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(v_nickname) not between 1 and 12 then raise exception 'INVALID_NICKNAME'; end if;
  if char_length(v_stake) not between 1 and 40 then raise exception 'INVALID_STAKE'; end if;
  if p_max_players not between 2 and 20 then raise exception 'INVALID_MAX_PLAYERS'; end if;
  if p_score_mode not in ('highest_wins', 'lowest_wins', 'random') then
    raise exception 'INVALID_SCORE_MODE';
  end if;
  if not exists (
    select 1 from public.game_catalog g
    where g.slug = p_game_slug and g.is_enabled = true
  ) then
    raise exception 'GAME_NOT_AVAILABLE';
  end if;

  insert into public.group_rooms (
    host_user_id, game_slug, stake_text, max_players, score_mode
  ) values (
    v_user_id, p_game_slug, v_stake, p_max_players, p_score_mode
  ) returning * into v_room;

  insert into public.group_members (room_id, user_id, nickname, role, is_ready)
  values (v_room.id, v_user_id, v_nickname, 'host', true);

  return public.get_group_room(v_room.code);
end;
$$;

-- 초대 코드를 가진 사람만 정원 안에서 참가한다.
create or replace function public.join_group_room(p_code text, p_nickname text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.group_rooms%rowtype;
  v_nickname text := btrim(p_nickname);
  v_count integer;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(v_nickname) not between 1 and 12 then raise exception 'INVALID_NICKNAME'; end if;

  select r.* into v_room
  from public.group_rooms r
  where r.code = upper(btrim(p_code))
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_ALREADY_STARTED'; end if;
  if v_room.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;

  if exists (
    select 1 from public.group_members m
    where m.room_id = v_room.id and m.user_id = v_user_id
  ) then
    return public.get_group_room(v_room.code);
  end if;

  if exists (
    select 1 from public.group_members m
    where m.room_id = v_room.id and m.nickname = v_nickname
  ) then
    raise exception 'NICKNAME_ALREADY_USED';
  end if;

  select count(*) into v_count
  from public.group_members m where m.room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'ROOM_FULL'; end if;

  insert into public.group_members (room_id, user_id, nickname)
  values (v_room.id, v_user_id, v_nickname);

  return public.get_group_room(v_room.code);
end;
$$;

create or replace function public.set_group_ready(p_room_id uuid, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  select r.code into v_code
  from public.group_rooms r
  where r.id = p_room_id;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;

  update public.group_members m
  set is_ready = p_ready
  where m.room_id = p_room_id
    and m.user_id = (select auth.uid());

  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  return public.get_group_room(v_code);
end;
$$;

-- 방장만 시작할 수 있고 최소 2명, 전원 준비 상태여야 한다.
create or replace function public.start_group_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.group_rooms%rowtype;
  v_total integer;
  v_unready integer;
begin
  select r.* into v_room
  from public.group_rooms r
  where r.id = p_room_id
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.host_user_id <> (select auth.uid()) then raise exception 'HOST_ONLY'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_ALREADY_STARTED'; end if;
  if v_room.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;

  select count(*), count(*) filter (where not m.is_ready)
  into v_total, v_unready
  from public.group_members m
  where m.room_id = p_room_id;

  if v_total < 2 then raise exception 'NEED_MORE_PLAYERS'; end if;
  if v_unready > 0 then raise exception 'MEMBERS_NOT_READY'; end if;

  update public.group_rooms
  set status = 'playing', updated_at = now()
  where id = p_room_id;

  return public.get_group_room(v_room.code);
end;
$$;

-- 각 참가자는 한 라운드에 한 번만 결과를 제출한다.
create or replace function public.submit_group_answer(
  p_room_id uuid,
  p_score numeric,
  p_answer jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.group_rooms%rowtype;
  v_member_id uuid;
begin
  select r.* into v_room
  from public.group_rooms r
  where r.id = p_room_id
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'playing' then raise exception 'ROOM_NOT_PLAYING'; end if;
  if v_room.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if v_room.score_mode <> 'random' and p_score is null then raise exception 'INVALID_SCORE'; end if;
  if p_score is not null and abs(p_score) > 1000000000 then raise exception 'INVALID_SCORE'; end if;
  if octet_length(coalesce(p_answer, '{}'::jsonb)::text) > 10000 then raise exception 'ANSWER_TOO_LARGE'; end if;

  select m.id into v_member_id
  from public.group_members m
  where m.room_id = p_room_id
    and m.user_id = (select auth.uid());
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;

  if exists (
    select 1 from public.group_answers a
    where a.room_id = p_room_id
      and a.member_id = v_member_id
      and a.round_no = v_room.current_round
  ) then
    raise exception 'ANSWER_ALREADY_SUBMITTED';
  end if;

  insert into public.group_answers (room_id, member_id, round_no, score, answer)
  values (p_room_id, v_member_id, v_room.current_round, p_score, coalesce(p_answer, '{}'::jsonb));

  return public.get_group_room(v_room.code);
end;
$$;

-- 전원이 제출하면 방장이 커피 등을 살 한 사람을 한 번만 확정한다.
create or replace function public.finish_group_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.group_rooms%rowtype;
  v_total integer;
  v_submitted integer;
  v_loser public.group_members%rowtype;
  v_scores jsonb;
begin
  select r.* into v_room
  from public.group_rooms r
  where r.id = p_room_id
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.host_user_id <> (select auth.uid()) then raise exception 'HOST_ONLY'; end if;
  if v_room.status <> 'playing' then raise exception 'ROOM_NOT_PLAYING'; end if;

  select count(*) into v_total
  from public.group_members m where m.room_id = p_room_id;
  select count(*) into v_submitted
  from public.group_answers a
  where a.room_id = p_room_id and a.round_no = v_room.current_round;
  if v_submitted <> v_total then raise exception 'WAITING_FOR_ANSWERS'; end if;

  if v_room.score_mode = 'random' then
    select m.* into v_loser
    from public.group_members m
    where m.room_id = p_room_id
    order by random()
    limit 1;
  elsif v_room.score_mode = 'highest_wins' then
    select m.* into v_loser
    from public.group_members m
    join public.group_answers a on a.member_id = m.id
    where a.room_id = p_room_id and a.round_no = v_room.current_round
    order by a.score asc nulls first, random()
    limit 1;
  else
    select m.* into v_loser
    from public.group_members m
    join public.group_answers a on a.member_id = m.id
    where a.room_id = p_room_id and a.round_no = v_room.current_round
    order by a.score desc nulls first, random()
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'member_id', m.id,
        'nickname', m.nickname,
        'score', a.score
      ) order by m.joined_at
    ),
    '[]'::jsonb
  ) into v_scores
  from public.group_members m
  join public.group_answers a on a.member_id = m.id
  where a.room_id = p_room_id and a.round_no = v_room.current_round;

  update public.group_rooms
  set status = 'finished',
      result = jsonb_build_object(
        'loser_member_id', v_loser.id,
        'loser_nickname', v_loser.nickname,
        'stake_text', v_room.stake_text,
        'score_mode', v_room.score_mode,
        'round', v_room.current_round,
        'scores', v_scores,
        'finished_at', now()
      ),
      updated_at = now()
  where id = p_room_id;

  return public.get_group_room(v_room.code);
end;
$$;

create or replace function public.cancel_group_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.group_rooms%rowtype;
begin
  select r.* into v_room
  from public.group_rooms r
  where r.id = p_room_id
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.host_user_id <> (select auth.uid()) then raise exception 'HOST_ONLY'; end if;
  if v_room.status = 'finished' then raise exception 'ROOM_ALREADY_FINISHED'; end if;

  update public.group_rooms
  set status = 'cancelled', updated_at = now()
  where id = p_room_id;

  return public.get_group_room(v_room.code);
end;
$$;

revoke all on function public.get_group_room(text) from public, anon;
revoke all on function public.create_group_room(text, text, text, integer, text) from public, anon;
revoke all on function public.join_group_room(text, text) from public, anon;
revoke all on function public.set_group_ready(uuid, boolean) from public, anon;
revoke all on function public.start_group_room(uuid) from public, anon;
revoke all on function public.submit_group_answer(uuid, numeric, jsonb) from public, anon;
revoke all on function public.finish_group_room(uuid) from public, anon;
revoke all on function public.cancel_group_room(uuid) from public, anon;

grant execute on function public.get_group_room(text) to authenticated;
grant execute on function public.create_group_room(text, text, text, integer, text) to authenticated;
grant execute on function public.join_group_room(text, text) to authenticated;
grant execute on function public.set_group_ready(uuid, boolean) to authenticated;
grant execute on function public.start_group_room(uuid) to authenticated;
grant execute on function public.submit_group_answer(uuid, numeric, jsonb) to authenticated;
grant execute on function public.finish_group_room(uuid) to authenticated;
grant execute on function public.cancel_group_room(uuid) to authenticated;

-- 참가·준비·결과 변화를 새로고침 없이 받을 수 있게 한다.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_rooms'
  ) then
    alter publication supabase_realtime add table public.group_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table public.group_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_answers'
  ) then
    alter publication supabase_realtime add table public.group_answers;
  end if;
end $$;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('group_rooms', 'group_members', 'group_answers')
order by table_name;
