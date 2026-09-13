-- Tap battle: private two-player rooms. Install once before publishing the page.
-- Clients submit append-only tap times, never a trusted score. No direct table access.
begin;
create table if not exists public.tapbattle_rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 host_id uuid not null references auth.users(id) on delete cascade,
 guest_id uuid references auth.users(id) on delete cascade,
 host_name text not null check(char_length(host_name) between 1 and 12),
 guest_name text check(char_length(guest_name) between 1 and 12),
 request uuid not null,
 status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 ready_host boolean not null default false, ready_guest boolean not null default false,
 rematch_host boolean not null default false, rematch_guest boolean not null default false,
 seed integer not null default floor(random()*997)::int,
 start_at timestamptz,
 host_events integer[] not null default '{}', guest_events integer[] not null default '{}',
 round integer not null default 1, version integer not null default 0,
 forfeited integer not null default 0 check(forfeited in (0,1,2)),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
 unique(host_id,request), check(guest_id is null or guest_id<>host_id)
);
create index if not exists tapbattle_host_created on public.tapbattle_rooms(host_id,created_at);
alter table public.tapbattle_rooms enable row level security;
revoke all on public.tapbattle_rooms from public,anon,authenticated;

create or replace function public.tapbattle_score(p_seed integer,p_events integer[])
returns jsonb language plpgsql immutable set search_path='' as $$
declare x integer:=p_seed; edge integer:=0; starts integer[]:='{}'; greens boolean[]:='{}'; i integer:=0; j integer; t integer; g boolean; good integer:=0; bad integer:=0; combo integer:=0; best integer:=0;
begin
 while edge<20000 loop
  x:=(x*37+17)%997;g:=i%2=0;starts:=array_append(starts,edge);greens:=array_append(greens,g);
  edge:=edge+case when i=0 then 1400 else (case when g then 1000 else 550 end)+x%650 end;i:=i+1;
 end loop;
 foreach t in array p_events loop
  g:=false;
  for j in reverse cardinality(starts)..1 loop if t>=starts[j] then g:=greens[j];exit;end if;end loop;
  if g then good:=good+1;combo:=combo+1;best:=greatest(best,combo);else bad:=bad+1;combo:=0;end if;
 end loop;
 return jsonb_build_object('score',good-3*bad,'good',good,'bad',bad,'best',best);
end;$$;
revoke all on function public.tapbattle_score(integer,integer[]) from public,anon,authenticated;

create or replace function public.tapbattle_view(r public.tapbattle_rooms)
returns jsonb language sql volatile security definer set search_path='' as $$
 select jsonb_build_object('code',r.code,'hostName',r.host_name,'guestName',r.guest_name,
 'me',case when auth.uid()=r.host_id then 1 when auth.uid()=r.guest_id then 2 else 0 end,
 'status',r.status,'round',r.round,'version',r.version,'seed',r.seed,
 'startAt',extract(epoch from r.start_at)*1000,'serverNow',extract(epoch from clock_timestamp())*1000,
 'readyHost',r.ready_host,'readyGuest',r.ready_guest,'rematchHost',r.rematch_host,'rematchGuest',r.rematch_guest,
 'host',public.tapbattle_score(r.seed,r.host_events),'guest',public.tapbattle_score(r.seed,r.guest_events),
 'events',case when auth.uid()=r.host_id then to_jsonb(r.host_events) when auth.uid()=r.guest_id then to_jsonb(r.guest_events) else '[]'::jsonb end,
 'forfeited',r.forfeited);
$$;
revoke all on function public.tapbattle_view(public.tapbattle_rooms) from public,anon,authenticated;

create or replace function public.tapbattle_room(p_action text,p_code text default null,p_name text default null,p_request uuid default null,p_round integer default null,p_events integer[] default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.tapbattle_rooms; u uuid:=auth.uid(); seat integer; n text:=btrim(p_name); old integer[]; t integer; i integer; elapsed numeric;
begin
 if u is null then raise exception 'TB_AUTH';end if;
 if p_action is null or p_action not in ('create','get','join','ready','unready','sync','rematch','resign') then raise exception 'TB_ACTION';end if;
 if p_action='create' then
  if n is null or char_length(n) not between 1 and 12 or p_request is null then raise exception 'TB_NAME';end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,36));
  select * into r from public.tapbattle_rooms where host_id=u and request=p_request;
  if found then
   if r.expires_at<=clock_timestamp() then raise exception 'TB_EXPIRED';end if;
   return public.tapbattle_view(r);
  end if;
  if (select count(*) from public.tapbattle_rooms where host_id=u and created_at>now()-interval '1 hour')>=12 then raise exception 'TB_LIMIT';end if;
  insert into public.tapbattle_rooms(host_id,host_name,request) values(u,n,p_request) returning * into r;
  return public.tapbattle_view(r);
 end if;
 select * into r from public.tapbattle_rooms where code=upper(p_code) for update;
 if not found then raise exception 'TB_NOT_FOUND';end if;
 if r.expires_at<=clock_timestamp() then raise exception 'TB_EXPIRED';end if;
 seat:=case when u=r.host_id then 1 when u=r.guest_id then 2 else 0 end;
 -- Invitation holders can only preview an unoccupied lobby, not spectate a match.
 if seat=0 and r.guest_id is not null then raise exception 'TB_FULL';end if;
 if p_action='join' and seat=0 then
  if n is null or char_length(n) not between 1 and 12 then raise exception 'TB_NAME';end if;
  r.guest_id:=u;r.guest_name:=n;seat:=2;
 elsif p_action not in ('get','join') then
  if seat=0 then raise exception 'TB_MEMBER';end if;
  if p_round is null or p_round<>r.round then raise exception 'TB_ROUND';end if;
  if p_action in ('ready','unready') then
   if r.status<>'waiting' then raise exception 'TB_STATE';end if;
   if seat=1 then r.ready_host:=p_action='ready';else r.ready_guest:=p_action='ready';end if;
   if r.ready_host and r.ready_guest and r.guest_id is not null then r.status:='playing';r.start_at:=clock_timestamp()+interval '4 seconds';end if;
  elsif p_action='sync' then
   if r.status='playing' then
    elapsed:=extract(epoch from (clock_timestamp()-r.start_at))*1000;
    old:=case when seat=1 then r.host_events else r.guest_events end;
    if p_events is null or coalesce(array_ndims(p_events),1)<>1 or coalesce(array_lower(p_events,1),1)<>1 or cardinality(p_events)>572 then raise exception 'TB_EVENTS';end if;
    -- Prefix retries and stale in-flight batches are harmless. Changed history is rejected.
    for i in 1..least(cardinality(old),cardinality(p_events)) loop
     if p_events[i] is distinct from old[i] then raise exception 'TB_EVENTS';end if;
    end loop;
    if elapsed<=23000 and cardinality(p_events)>cardinality(old) then
     for i in cardinality(old)+1..cardinality(p_events) loop
      t:=p_events[i];
      if t is null or t<0 or t>=20000 or t>elapsed+150 or t<elapsed-5000 or (i>1 and t-p_events[i-1]<35) then raise exception 'TB_EVENTS';end if;
     end loop;
     if seat=1 then r.host_events:=p_events;else r.guest_events:=p_events;end if;
    end if;
   end if;
  elsif p_action='resign' then
   if r.status<>'playing' then raise exception 'TB_STATE';end if;
   if clock_timestamp()<r.start_at+interval '23 seconds' then r.status:='finished';r.forfeited:=seat;end if;
  elsif p_action='rematch' then
   if r.status<>'finished' then raise exception 'TB_STATE';end if;
   if seat=1 then r.rematch_host:=true;else r.rematch_guest:=true;end if;
   if r.rematch_host and r.rematch_guest then
    r.round:=r.round+1;r.seed:=floor(random()*997)::int;r.status:='waiting';r.start_at:=null;
    r.ready_host:=false;r.ready_guest:=false;r.rematch_host:=false;r.rematch_guest:=false;
    r.host_events:='{}';r.guest_events:='{}';r.forfeited:=0;
   end if;
  end if;
 end if;
 -- Three seconds of delivery grace; a missing player cannot hold the result open.
 if r.status='playing' and clock_timestamp()>=r.start_at+interval '23 seconds' then r.status:='finished';end if;
 update public.tapbattle_rooms set guest_id=r.guest_id,guest_name=r.guest_name,status=r.status,
 ready_host=r.ready_host,ready_guest=r.ready_guest,rematch_host=r.rematch_host,rematch_guest=r.rematch_guest,
 seed=r.seed,start_at=r.start_at,host_events=r.host_events,guest_events=r.guest_events,round=r.round,
 forfeited=r.forfeited,version=version+1 where id=r.id returning * into r;
 return public.tapbattle_view(r);
end;$$;
revoke all on function public.tapbattle_room(text,text,text,uuid,integer,integer[]) from public,anon;
grant execute on function public.tapbattle_room(text,text,text,uuid,integer,integer[]) to authenticated;
commit;
