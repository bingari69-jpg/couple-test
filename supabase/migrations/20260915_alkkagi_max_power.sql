-- Existing matches retain their physics until the next mutual rematch.
begin;
alter table public.alkkagi_rooms add column if not exists physics_version integer not null default 1 check(physics_version in (1,2));
alter table public.alkkagi_rooms alter column physics_version set default 2;
create or replace function public.alkkagi_room_view(r public.alkkagi_rooms)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'code',r.code,'hostName',r.host_name,'guestName',r.guest_name,
 'status',r.status,'board',to_jsonb(r.board),'shots',r.shots,'last',r.last_shot,'turn',r.turn,'winner',r.winner,
 'reason',r.finish_reason,'round',r.round,'version',r.version,'starter',r.starter,'physicsVersion',r.physics_version,
 'rematchHost',r.rematch_host,'rematchGuest',r.rematch_guest,'expiresAt',r.expires_at,
 'me',case when auth.uid()=r.host_id then 1 when auth.uid()=r.guest_id then 2 else 0 end);
$$;
revoke all on function public.alkkagi_room_view(public.alkkagi_rooms) from public,anon,authenticated;


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
 before_board:=r.board;speed:=case when r.physics_version=1 then .35+p_power*.0225 when p_power>=95 then 1.95 else .35+(p_power-10)::double precision/84*.9 end;rad:=p_angle*pi()/180;vx[p_stone+1]:=cos(rad)*speed;vy[p_stone+1]:=sin(rad)*speed;
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
  r.physics_version:=2;r.board:=public.alkkagi_initial_board();r.shots:=0;r.last_shot:=null;r.starter:=3-r.starter;r.turn:=r.starter;r.status:='playing';r.winner:=0;r.finish_reason:=null;r.round:=r.round+1;r.rematch_host:=false;r.rematch_guest:=false;
 end if;
 update public.alkkagi_rooms set physics_version=r.physics_version,starter=r.starter,board=r.board,shots=r.shots,last_shot=r.last_shot,turn=r.turn,status=r.status,winner=r.winner,finish_reason=r.finish_reason,round=r.round,rematch_host=r.rematch_host,rematch_guest=r.rematch_guest,version=version+1,updated_at=now() where id=r.id returning * into r;
 return public.alkkagi_room_view(r);
end;$$;

revoke all on function public.rematch_alkkagi_room(text,integer) from public,anon;
grant execute on function public.rematch_alkkagi_room(text,integer) to authenticated;

revoke all on function public.play_alkkagi_shot(text,integer,integer,integer,integer) from public,anon;
grant execute on function public.play_alkkagi_shot(text,integer,integer,integer,integer) to authenticated;
commit;
