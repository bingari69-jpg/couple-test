-- Alkkagi v2: staggered formation and alternating rematch opener.
-- Existing boards stay untouched until both players request a rematch.
begin;
alter table public.alkkagi_rooms add column if not exists starter integer not null default 1 check(starter in (1,2));
create or replace function public.alkkagi_initial_board()
returns jsonb language sql immutable set search_path='' as $$
 select '[{"id":0,"color":1,"x":0.22,"y":0.64,"alive":true},{"id":1,"color":1,"x":0.46,"y":0.64,"alive":true},{"id":2,"color":1,"x":0.7,"y":0.64,"alive":true},{"id":3,"color":1,"x":0.34,"y":0.82,"alive":true},{"id":4,"color":1,"x":0.62,"y":0.82,"alive":true},{"id":5,"color":2,"x":0.78,"y":0.36,"alive":true},{"id":6,"color":2,"x":0.54,"y":0.36,"alive":true},{"id":7,"color":2,"x":0.3,"y":0.36,"alive":true},{"id":8,"color":2,"x":0.66,"y":0.18,"alive":true},{"id":9,"color":2,"x":0.38,"y":0.18,"alive":true}]'::jsonb;
$$;
revoke all on function public.alkkagi_initial_board() from public,anon,authenticated;
alter table public.alkkagi_rooms alter column board set default public.alkkagi_initial_board();
create or replace function public.alkkagi_room_view(r public.alkkagi_rooms)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'code',r.code,'hostName',r.host_name,'guestName',r.guest_name,
 'status',r.status,'board',to_jsonb(r.board),'shots',r.shots,'last',r.last_shot,'turn',r.turn,'winner',r.winner,
 'reason',r.finish_reason,'round',r.round,'version',r.version,'starter',r.starter,
 'rematchHost',r.rematch_host,'rematchGuest',r.rematch_guest,'expiresAt',r.expires_at,
 'me',case when auth.uid()=r.host_id then 1 when auth.uid()=r.guest_id then 2 else 0 end);
$$;
revoke all on function public.alkkagi_room_view(public.alkkagi_rooms) from public,anon,authenticated;

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
  r.board:=public.alkkagi_initial_board();r.shots:=0;r.last_shot:=null;r.starter:=3-r.starter;r.turn:=r.starter;r.status:='playing';r.winner:=0;r.finish_reason:=null;r.round:=r.round+1;r.rematch_host:=false;r.rematch_guest:=false;
 end if;
 update public.alkkagi_rooms set starter=r.starter,board=r.board,shots=r.shots,last_shot=r.last_shot,turn=r.turn,status=r.status,winner=r.winner,finish_reason=r.finish_reason,round=r.round,rematch_host=r.rematch_host,rematch_guest=r.rematch_guest,version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.alkkagi_room_view(r);
end;$$;

revoke all on function public.rematch_alkkagi_room(text,integer) from public,anon;
grant execute on function public.rematch_alkkagi_room(text,integer) to authenticated;
commit;
