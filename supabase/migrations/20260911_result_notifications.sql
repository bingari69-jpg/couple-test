-- 같이놀자 게임·테스트 완료 알림
-- 초대 링크를 받은 사람이 결과까지 도달하면 보낸 사람에게 한 번만 알린다.

create extension if not exists pgcrypto;

create table if not exists public.game_challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'expired')),
  result_url text,
  result_summary text,
  completed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  completed_at timestamptz,
  notification_sent_at timestamptz,
  check (code ~ '^[A-Z0-9]{12,24}$'),
  check (char_length(game_slug) between 1 and 40),
  check (result_url is null or char_length(result_url) <= 7000),
  check (result_summary is null or char_length(result_summary) <= 120)
);

create index if not exists game_challenges_sender_idx
  on public.game_challenges (sender_user_id, created_at desc);
create index if not exists game_challenges_expires_idx
  on public.game_challenges (expires_at);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(endpoint) between 20 and 2000),
  check (char_length(p256dh) between 20 and 300),
  check (char_length(auth) between 8 and 100),
  check (user_agent is null or char_length(user_agent) <= 300)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.game_challenges enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on public.game_challenges from anon, authenticated;
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.game_challenges to authenticated;

drop policy if exists "내가 보낸 완료 알림 읽기" on public.game_challenges;
create policy "내가 보낸 완료 알림 읽기"
on public.game_challenges for select to authenticated
using (sender_user_id = (select auth.uid()));

-- 클라이언트가 보낸 코드는 공유 전에 즉시 URL에 붙일 수 있게 허용한다.
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
    'ten', 'react', 'num25', 'mole', 'ufo', 'tap', 'stroop', 'arrow', 'stop',
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

-- 완료 코드를 가진 익명 사용자만 첫 결과를 확정한다.
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

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(p_endpoint) not between 20 and 2000 then raise exception 'INVALID_ENDPOINT'; end if;
  if char_length(p_p256dh) not between 20 and 300 then raise exception 'INVALID_P256DH'; end if;
  if char_length(p_auth) not between 8 and 100 then raise exception 'INVALID_AUTH'; end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = now();
  return true;
end;
$$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = (select auth.uid());
  return found;
end;
$$;

revoke all on function public.create_game_challenge(text, text) from public, anon;
revoke all on function public.complete_game_challenge(text, text, text) from public, anon;
revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.create_game_challenge(text, text) to authenticated;
grant execute on function public.complete_game_challenge(text, text, text) to authenticated;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_challenges'
  ) then
    alter publication supabase_realtime add table public.game_challenges;
  end if;
end $$;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('game_challenges', 'push_subscriptions')
order by table_name;
