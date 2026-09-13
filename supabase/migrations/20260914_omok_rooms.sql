-- 15x15 freestyle omok. All writes are serialized by a room row lock.
-- Additive migration: existing games/tables/permissions are not changed.
begin;
create table if not exists public.omok_rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 host_id uuid not null references auth.users(id) on delete cascade,
 guest_id uuid references auth.users(id) on delete cascade,
 host_name text not null check(char_length(btrim(host_name)) between 1 and 12),
 guest_name text check(guest_name is null or char_length(btrim(guest_name)) between 1 and 12),
 create_request uuid not null,
 status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 board integer[] not null default array_fill(0,array[225]) check(array_length(board,1)=225),
 moves integer[] not null default '{}',
 turn integer not null default 1 check(turn in (1,2)),
 winner integer not null default 0 check(winner in (0,1,2)),
 winning_line integer[] not null default '{}',
 finish_reason text check(finish_reason in ('five','draw','resign')),
 round integer not null default 1,
 version integer not null default 0,
 rematch_host boolean not null default false,
 rematch_guest boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours'),
 unique(host_id,create_request),
 check(guest_id is null or guest_id<>host_id)
);
create index if not exists omok_rooms_host_created on public.omok_rooms(host_id,created_at);
alter table public.omok_rooms enable row level security;
revoke all on public.omok_rooms from public,anon,authenticated;

create or replace function public.omok_room_view(r public.omok_rooms)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'code',r.code,'hostName',r.host_name,'guestName',r.guest_name,
 'status',r.status,'board',to_jsonb(r.board),'moves',to_jsonb(r.moves),'turn',r.turn,'winner',r.winner,
 'line',to_jsonb(r.winning_line),'reason',r.finish_reason,'round',r.round,'version',r.version,
 'rematchHost',r.rematch_host,'rematchGuest',r.rematch_guest,'expiresAt',r.expires_at,
 'me',case when auth.uid()=r.host_id then 1 when auth.uid()=r.guest_id then 2 else 0 end);
$$;
revoke all on function public.omok_room_view(public.omok_rooms) from public,anon,authenticated;

create or replace function public.create_omok_room(p_name text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.omok_rooms; u uuid:=auth.uid(); n text:=btrim(p_name);
begin
 if u is null then raise exception 'OMOK_AUTH_REQUIRED'; end if;
 if n is null or char_length(n) not between 1 and 12 or p_request is null then raise exception 'OMOK_INVALID_NAME'; end if;
 -- Same request can be retried after a network timeout without creating another room.
 perform pg_advisory_xact_lock(hashtextextended(u::text,14));
 select * into r from public.omok_rooms where host_id=u and create_request=p_request;
 if found then return public.omok_room_view(r); end if;
 if (select count(*) from public.omok_rooms where host_id=u and created_at>now()-interval '1 hour')>=12 then raise exception 'OMOK_RATE_LIMIT'; end if;
 insert into public.omok_rooms(host_id,host_name,create_request) values(u,n,p_request) returning * into r;
 return public.omok_room_view(r);
end;$$;

create or replace function public.get_omok_room(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.omok_rooms;
begin
 if auth.uid() is null then raise exception 'OMOK_AUTH_REQUIRED'; end if;
 select * into r from public.omok_rooms where code=upper(p_code);
 if not found then raise exception 'OMOK_NOT_FOUND'; end if;
 if r.expires_at<=now() then raise exception 'OMOK_EXPIRED'; end if;
 -- A high-entropy invitation permits a preview, never a move or a third seat.
 return public.omok_room_view(r);
end;$$;

create or replace function public.join_omok_room(p_code text,p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.omok_rooms; u uuid:=auth.uid(); n text:=btrim(p_name);
begin
 if u is null then raise exception 'OMOK_AUTH_REQUIRED'; end if;
 select * into r from public.omok_rooms where code=upper(p_code) for update;
 if not found then raise exception 'OMOK_NOT_FOUND'; end if;
 if r.expires_at<=now() then raise exception 'OMOK_EXPIRED'; end if;
 if u=r.host_id or u=r.guest_id then return public.omok_room_view(r); end if;
 if r.guest_id is not null or r.status<>'waiting' then raise exception 'OMOK_FULL'; end if;
 if n is null or char_length(n) not between 1 and 12 then raise exception 'OMOK_INVALID_NAME'; end if;
 update public.omok_rooms set guest_id=u,guest_name=n,status='playing',version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.omok_room_view(r);
end;$$;

create or replace function public.play_omok_move(p_code text,p_index integer,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.omok_rooms; u uuid:=auth.uid(); color integer; rr integer; cc integer; dr integer; dc integer; d integer; s integer; k integer; nr integer; nc integer; j integer; win integer[]; line integer[];
begin
 if u is null then raise exception 'OMOK_AUTH_REQUIRED'; end if;
 select * into r from public.omok_rooms where code=upper(p_code) for update;
 if not found then raise exception 'OMOK_NOT_FOUND'; end if;
 if r.expires_at<=now() then raise exception 'OMOK_EXPIRED'; end if;
 color:=case when u=r.host_id then 1 when u=r.guest_id then 2 else 0 end;
 if color=0 then raise exception 'OMOK_NOT_MEMBER'; end if;
 if p_version is null or p_version<>r.version then raise exception 'OMOK_STALE'; end if;
 if r.status<>'playing' then raise exception 'OMOK_NOT_PLAYING'; end if;
 if color<>r.turn then raise exception 'OMOK_NOT_TURN'; end if;
 if p_index is null or p_index<0 or p_index>=225 then raise exception 'OMOK_INVALID_MOVE'; end if;
 if r.board[p_index+1]<>0 then raise exception 'OMOK_OCCUPIED'; end if;
 r.board[p_index+1]:=color;r.moves:=array_append(r.moves,p_index);rr:=p_index/15;cc:=p_index%15;win:='{}';
 for d in 1..4 loop
  dr:=case when d=1 then 0 else 1 end;dc:=case when d=2 then 0 when d=4 then -1 else 1 end;
  line:=array[p_index];
  foreach s in array array[-1,1] loop
   k:=1;
   loop
    nr:=rr+dr*k*s;nc:=cc+dc*k*s;
    exit when nr<0 or nr>=15 or nc<0 or nc>=15;
    j:=nr*15+nc;exit when r.board[j+1]<>color;
    if s=-1 then line:=array_prepend(j,line);else line:=array_append(line,j);end if;
    k:=k+1;
   end loop;
  end loop;
  if cardinality(line)>=5 then win:=line;exit;end if;
 end loop;
 if cardinality(win)>=5 then r.status:='finished';r.winner:=color;r.finish_reason:='five';
 elsif cardinality(r.moves)=225 then r.status:='finished';r.finish_reason:='draw';
 else r.turn:=3-color;end if;
 update public.omok_rooms set board=r.board,moves=r.moves,turn=r.turn,status=r.status,winner=r.winner,finish_reason=r.finish_reason,winning_line=win,version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.omok_room_view(r);
end;$$;

create or replace function public.resign_omok_room(p_code text,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.omok_rooms; u uuid:=auth.uid(); color integer;
begin
 if u is null then raise exception 'OMOK_AUTH_REQUIRED'; end if;
 select * into r from public.omok_rooms where code=upper(p_code) for update;
 if not found then raise exception 'OMOK_NOT_FOUND'; end if;
 if r.expires_at<=now() then raise exception 'OMOK_EXPIRED'; end if;
 color:=case when u=r.host_id then 1 when u=r.guest_id then 2 else 0 end;
 if color=0 then raise exception 'OMOK_NOT_MEMBER';end if;
 if p_version is null or p_version<>r.version then raise exception 'OMOK_STALE';end if;
 if r.status<>'playing' then raise exception 'OMOK_NOT_PLAYING';end if;
 update public.omok_rooms set status='finished',winner=3-color,finish_reason='resign',version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.omok_room_view(r);
end;$$;

create or replace function public.rematch_omok_room(p_code text,p_round integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.omok_rooms; u uuid:=auth.uid(); color integer;
begin
 if u is null then raise exception 'OMOK_AUTH_REQUIRED';end if;
 select * into r from public.omok_rooms where code=upper(p_code) for update;
 if not found then raise exception 'OMOK_NOT_FOUND';end if;
 if r.expires_at<=now() then raise exception 'OMOK_EXPIRED';end if;
 color:=case when u=r.host_id then 1 when u=r.guest_id then 2 else 0 end;
 if color=0 then raise exception 'OMOK_NOT_MEMBER';end if;
 if p_round is null or p_round<>r.round then raise exception 'OMOK_STALE';end if;
 if r.status<>'finished' then raise exception 'OMOK_NOT_FINISHED';end if;
 if color=1 then r.rematch_host:=true;else r.rematch_guest:=true;end if;
 if r.rematch_host and r.rematch_guest then
  r.board:=array_fill(0,array[225]);r.moves:='{}';r.turn:=1;r.status:='playing';r.winner:=0;r.winning_line:='{}';r.finish_reason:=null;r.round:=r.round+1;r.rematch_host:=false;r.rematch_guest:=false;
 end if;
 update public.omok_rooms set board=r.board,moves=r.moves,turn=r.turn,status=r.status,winner=r.winner,winning_line=r.winning_line,finish_reason=r.finish_reason,round=r.round,rematch_host=r.rematch_host,rematch_guest=r.rematch_guest,version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.omok_room_view(r);
end;$$;

revoke all on function public.create_omok_room(text,uuid),public.get_omok_room(text),public.join_omok_room(text,text),public.play_omok_move(text,integer,integer),public.resign_omok_room(text,integer),public.rematch_omok_room(text,integer) from public,anon;
grant execute on function public.create_omok_room(text,uuid),public.get_omok_room(text),public.join_omok_room(text,text),public.play_omok_move(text,integer,integer),public.resign_omok_room(text,integer),public.rematch_omok_room(text,integer) to authenticated;
commit;
