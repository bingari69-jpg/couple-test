-- Alkkagi: server-authoritative fixed-step stone physics. All writes are serialized by a room row lock.
-- Additive migration: existing games/tables/permissions are not changed.
begin;
create table if not exists public.alkkagi_rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 host_id uuid not null references auth.users(id) on delete cascade,
 guest_id uuid references auth.users(id) on delete cascade,
 host_name text not null check(char_length(btrim(host_name)) between 1 and 12),
 guest_name text check(guest_name is null or char_length(btrim(guest_name)) between 1 and 12),
 create_request uuid not null,
 status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 board jsonb not null default '[{"id":0,"color":1,"x":0.18,"y":0.76,"alive":true},{"id":1,"color":1,"x":0.34,"y":0.76,"alive":true},{"id":2,"color":1,"x":0.5,"y":0.76,"alive":true},{"id":3,"color":1,"x":0.66,"y":0.76,"alive":true},{"id":4,"color":1,"x":0.82,"y":0.76,"alive":true},{"id":5,"color":2,"x":0.18,"y":0.24,"alive":true},{"id":6,"color":2,"x":0.34,"y":0.24,"alive":true},{"id":7,"color":2,"x":0.5,"y":0.24,"alive":true},{"id":8,"color":2,"x":0.66,"y":0.24,"alive":true},{"id":9,"color":2,"x":0.82,"y":0.24,"alive":true}]'::jsonb check(jsonb_array_length(board)=10),
 shots integer not null default 0,
 last_shot jsonb,
 turn integer not null default 1 check(turn in (1,2)),
 winner integer not null default 0 check(winner in (0,1,2)),
 finish_reason text check(finish_reason in ('cleared','limit','draw','resign')),
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
create index if not exists alkkagi_rooms_host_created on public.alkkagi_rooms(host_id,created_at);
alter table public.alkkagi_rooms enable row level security;
revoke all on public.alkkagi_rooms from public,anon,authenticated;

create or replace function public.alkkagi_room_view(r public.alkkagi_rooms)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'code',r.code,'hostName',r.host_name,'guestName',r.guest_name,
 'status',r.status,'board',to_jsonb(r.board),'shots',r.shots,'last',r.last_shot,'turn',r.turn,'winner',r.winner,
 'reason',r.finish_reason,'round',r.round,'version',r.version,
 'rematchHost',r.rematch_host,'rematchGuest',r.rematch_guest,'expiresAt',r.expires_at,
 'me',case when auth.uid()=r.host_id then 1 when auth.uid()=r.guest_id then 2 else 0 end);
$$;
revoke all on function public.alkkagi_room_view(public.alkkagi_rooms) from public,anon,authenticated;

create or replace function public.create_alkkagi_room(p_name text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.alkkagi_rooms; u uuid:=auth.uid(); n text:=btrim(p_name);
begin
 if u is null then raise exception 'ALKKAGI_AUTH_REQUIRED'; end if;
 if n is null or char_length(n) not between 1 and 12 or p_request is null then raise exception 'ALKKAGI_INVALID_NAME'; end if;
 -- Same request can be retried after a network timeout without creating another room.
 perform pg_advisory_xact_lock(hashtextextended(u::text,14));
 select * into r from public.alkkagi_rooms where host_id=u and create_request=p_request;
 if found then return public.alkkagi_room_view(r); end if;
 if (select count(*) from public.alkkagi_rooms where host_id=u and created_at>now()-interval '1 hour')>=12 then raise exception 'ALKKAGI_RATE_LIMIT'; end if;
 insert into public.alkkagi_rooms(host_id,host_name,create_request) values(u,n,p_request) returning * into r;
 return public.alkkagi_room_view(r);
end;$$;

create or replace function public.get_alkkagi_room(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.alkkagi_rooms;
begin
 if auth.uid() is null then raise exception 'ALKKAGI_AUTH_REQUIRED'; end if;
 select * into r from public.alkkagi_rooms where code=upper(p_code);
 if not found then raise exception 'ALKKAGI_NOT_FOUND'; end if;
 if r.expires_at<=now() then raise exception 'ALKKAGI_EXPIRED'; end if;
 -- A high-entropy invitation permits a preview, never a move or a third seat.
 return public.alkkagi_room_view(r);
end;$$;

create or replace function public.join_alkkagi_room(p_code text,p_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.alkkagi_rooms; u uuid:=auth.uid(); n text:=btrim(p_name);
begin
 if u is null then raise exception 'ALKKAGI_AUTH_REQUIRED'; end if;
 select * into r from public.alkkagi_rooms where code=upper(p_code) for update;
 if not found then raise exception 'ALKKAGI_NOT_FOUND'; end if;
 if r.expires_at<=now() then raise exception 'ALKKAGI_EXPIRED'; end if;
 if u=r.host_id or u=r.guest_id then return public.alkkagi_room_view(r); end if;
 if r.guest_id is not null or r.status<>'waiting' then raise exception 'ALKKAGI_FULL'; end if;
 if n is null or char_length(n) not between 1 and 12 then raise exception 'ALKKAGI_INVALID_NAME'; end if;
 update public.alkkagi_rooms set guest_id=u,guest_name=n,status='playing',version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.alkkagi_room_view(r);
end;$$;

create or replace function public.play_alkkagi_shot(p_code text,p_stone integer,p_angle integer,p_power integer,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.alkkagi_rooms; u uuid:=auth.uid(); color integer; xs double precision[]; ys double precision[]; vx double precision[]:=array_fill(0::double precision,array[10]); vy double precision[]:=array_fill(0::double precision,array[10]); live boolean[]; i integer;j integer;step integer;dx double precision;dy double precision;dist double precision;nx double precision;ny double precision;overlap double precision;rel double precision;impulse double precision;speed double precision;rad double precision;moving boolean;nb integer:=0;nw integer:=0;outboard jsonb:='[]';before_board jsonb;
begin
 if u is null then raise exception 'ALKKAGI_AUTH_REQUIRED';end if;
 select * into r from public.alkkagi_rooms where code=upper(p_code) for update;
 if not found then raise exception 'ALKKAGI_NOT_FOUND';end if;
 if r.expires_at<=now() then raise exception 'ALKKAGI_EXPIRED';end if;
 color:=case when u=r.host_id then 1 when u=r.guest_id then 2 else 0 end;
 if color=0 then raise exception 'ALKKAGI_NOT_MEMBER';end if;
 if p_version is null or p_version<>r.version then raise exception 'ALKKAGI_STALE';end if;
 if r.status<>'playing' then raise exception 'ALKKAGI_NOT_PLAYING';end if;
 if color<>r.turn then raise exception 'ALKKAGI_NOT_TURN';end if;
 if p_stone is null or p_stone<0 or p_stone>9 or p_angle is null or p_angle<0 or p_angle>359 or p_power is null or p_power<10 or p_power>100 then raise exception 'ALKKAGI_INVALID_SHOT';end if;
 if not (r.board->p_stone->>'alive')::boolean or (r.board->p_stone->>'color')::integer<>color then raise exception 'ALKKAGI_INVALID_SHOT';end if;
 select array_agg((s->>'x')::double precision order by n),array_agg((s->>'y')::double precision order by n),array_agg((s->>'alive')::boolean order by n) into xs,ys,live from jsonb_array_elements(r.board) with ordinality a(s,n);
 before_board:=r.board;speed:=.35+p_power*.0225;rad:=p_angle*pi()/180;vx[p_stone+1]:=cos(rad)*speed;vy[p_stone+1]:=sin(rad)*speed;
 for step in 1..720 loop
  for i in 1..10 loop
   if live[i] then xs[i]:=xs[i]+vx[i]/120;ys[i]:=ys[i]+vy[i]/120;if xs[i]<0 or xs[i]>1 or ys[i]<0 or ys[i]>1 then live[i]:=false;vx[i]:=0;vy[i]:=0;end if;end if;
  end loop;
  for i in 1..9 loop for j in (i+1)..10 loop
   if not live[i] or not live[j] then continue;end if;
   dx:=xs[j]-xs[i];dy:=ys[j]-ys[i];dist:=sqrt(dx*dx+dy*dy);if dist>=.07 then continue;end if;
   if dist<.000001 then dx:=1;dy:=0;dist:=1;end if;
   nx:=dx/dist;ny:=dy/dist;overlap:=greatest(0,(.07-dist)/2+.000001);xs[i]:=xs[i]-nx*overlap;ys[i]:=ys[i]-ny*overlap;xs[j]:=xs[j]+nx*overlap;ys[j]:=ys[j]+ny*overlap;
   rel:=(vx[i]-vx[j])*nx+(vy[i]-vy[j])*ny;if rel>0 then impulse:=rel*.97;vx[i]:=vx[i]-impulse*nx;vy[i]:=vy[i]-impulse*ny;vx[j]:=vx[j]+impulse*nx;vy[j]:=vy[j]+impulse*ny;end if;
  end loop;end loop;
  moving:=false;
  for i in 1..10 loop if live[i] then
   if xs[i]<0 or xs[i]>1 or ys[i]<0 or ys[i]>1 then live[i]:=false;vx[i]:=0;vy[i]:=0;continue;end if;
   vx[i]:=vx[i]*.985;vy[i]:=vy[i]*.985;if abs(vx[i])<.005 then vx[i]:=0;end if;if abs(vy[i])<.005 then vy[i]:=0;end if;if vx[i]<>0 or vy[i]<>0 then moving:=true;end if;
  end if;end loop;
  exit when not moving;
 end loop;
 for i in 1..10 loop
  color:=case when i<=5 then 1 else 2 end;
  outboard:=outboard||jsonb_build_array(jsonb_build_object('id',i-1,'color',color,'x',round(xs[i]::numeric,6),'y',round(ys[i]::numeric,6),'alive',live[i]));
  if live[i] then if color=1 then nb:=nb+1;else nw:=nw+1;end if;end if;
 end loop;
 r.shots:=r.shots+1;
 if nb=0 or nw=0 or r.shots>=120 then r.status:='finished';r.winner:=case when nb=nw then 0 when nb>nw then 1 else 2 end;r.finish_reason:=case when nb=nw then 'draw' when r.shots>=120 then 'limit' else 'cleared' end;else r.turn:=3-r.turn;end if;
 update public.alkkagi_rooms set board=outboard,shots=r.shots,last_shot=jsonb_build_object('before',before_board,'stone',p_stone,'angle',p_angle,'power',p_power,'turn',case when u=r.host_id then 1 else 2 end),turn=r.turn,status=r.status,winner=r.winner,finish_reason=r.finish_reason,version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.alkkagi_room_view(r);
end;$$;

create or replace function public.resign_alkkagi_room(p_code text,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.alkkagi_rooms; u uuid:=auth.uid(); color integer;
begin
 if u is null then raise exception 'ALKKAGI_AUTH_REQUIRED'; end if;
 select * into r from public.alkkagi_rooms where code=upper(p_code) for update;
 if not found then raise exception 'ALKKAGI_NOT_FOUND'; end if;
 if r.expires_at<=now() then raise exception 'ALKKAGI_EXPIRED'; end if;
 color:=case when u=r.host_id then 1 when u=r.guest_id then 2 else 0 end;
 if color=0 then raise exception 'ALKKAGI_NOT_MEMBER';end if;
 if p_version is null or p_version<>r.version then raise exception 'ALKKAGI_STALE';end if;
 if r.status<>'playing' then raise exception 'ALKKAGI_NOT_PLAYING';end if;
 update public.alkkagi_rooms set status='finished',winner=3-color,finish_reason='resign',version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.alkkagi_room_view(r);
end;$$;

create or replace function public.rematch_alkkagi_room(p_code text,p_round integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.alkkagi_rooms; u uuid:=auth.uid(); color integer;
begin
 if u is null then raise exception 'ALKKAGI_AUTH_REQUIRED';end if;
 select * into r from public.alkkagi_rooms where code=upper(p_code) for update;
 if not found then raise exception 'ALKKAGI_NOT_FOUND';end if;
 if r.expires_at<=now() then raise exception 'ALKKAGI_EXPIRED';end if;
 color:=case when u=r.host_id then 1 when u=r.guest_id then 2 else 0 end;
 if color=0 then raise exception 'ALKKAGI_NOT_MEMBER';end if;
 if p_round is null or p_round<>r.round then raise exception 'ALKKAGI_STALE';end if;
 if r.status<>'finished' then raise exception 'ALKKAGI_NOT_FINISHED';end if;
 if color=1 then r.rematch_host:=true;else r.rematch_guest:=true;end if;
 if r.rematch_host and r.rematch_guest then
  r.board:='[{"id":0,"color":1,"x":0.18,"y":0.76,"alive":true},{"id":1,"color":1,"x":0.34,"y":0.76,"alive":true},{"id":2,"color":1,"x":0.5,"y":0.76,"alive":true},{"id":3,"color":1,"x":0.66,"y":0.76,"alive":true},{"id":4,"color":1,"x":0.82,"y":0.76,"alive":true},{"id":5,"color":2,"x":0.18,"y":0.24,"alive":true},{"id":6,"color":2,"x":0.34,"y":0.24,"alive":true},{"id":7,"color":2,"x":0.5,"y":0.24,"alive":true},{"id":8,"color":2,"x":0.66,"y":0.24,"alive":true},{"id":9,"color":2,"x":0.82,"y":0.24,"alive":true}]'::jsonb;r.shots:=0;r.last_shot:=null;r.turn:=1;r.status:='playing';r.winner:=0;r.finish_reason:=null;r.round:=r.round+1;r.rematch_host:=false;r.rematch_guest:=false;
 end if;
 update public.alkkagi_rooms set board=r.board,shots=r.shots,last_shot=r.last_shot,turn=r.turn,status=r.status,winner=r.winner,finish_reason=r.finish_reason,round=r.round,rematch_host=r.rematch_host,rematch_guest=r.rematch_guest,version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.alkkagi_room_view(r);
end;$$;

revoke all on function public.create_alkkagi_room(text,uuid),public.get_alkkagi_room(text),public.join_alkkagi_room(text,text),public.play_alkkagi_shot(text,integer,integer,integer,integer),public.resign_alkkagi_room(text,integer),public.rematch_alkkagi_room(text,integer) from public,anon;
grant execute on function public.create_alkkagi_room(text,uuid),public.get_alkkagi_room(text),public.join_alkkagi_room(text,text),public.play_alkkagi_shot(text,integer,integer,integer,integer),public.resign_alkkagi_room(text,integer),public.rematch_alkkagi_room(text,integer) to authenticated;
commit;
