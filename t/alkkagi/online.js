(function(){
 'use strict';
 const messages={ALKKAGI_INVALID_SHOT:'내 돌을 고르고 방향과 힘을 다시 확인해주세요.',ALKKAGI_NOT_FOUND:'초대방을 찾지 못했어요. 초대 링크를 다시 확인해주세요.',ALKKAGI_EXPIRED:'초대방의 24시간이 지났어요. 새 방에서 다시 만나요.',ALKKAGI_FULL:'이미 두 사람이 겨루고 있어요. 참가했던 브라우저에서 열어주세요.',ALKKAGI_NOT_MEMBER:'이 방의 참가자만 돌을 튕길 수 있어요.',ALKKAGI_STALE:'상대의 새 소식이 도착했어요. 판을 확인하고 다시 골라주세요.',ALKKAGI_NOT_TURN:'아직 상대 차례예요.',ALKKAGI_OCCUPIED:'이미 돌이 놓인 자리예요. 다른 곳을 골라주세요.',ALKKAGI_NOT_PLAYING:'아직 시작 전이거나 끝난 판이에요.',ALKKAGI_INVALID_NAME:'이름을 1~12자로 적어주세요.',ALKKAGI_RATE_LIMIT:'방을 많이 만들었어요. 잠시 후 다시 만들어주세요.',ALKKAGI_AUTH_REQUIRED:'접속을 확인하지 못했어요. 다시 연결해주세요.',ALKKAGI_NOT_FINISHED:'이번 판이 끝나면 한판 더 둘 수 있어요.'};
 function errorText(e){const msg=String(e&&e.message||e||'');const key=Object.keys(messages).find(k=>msg.includes(k));return key?messages[key]:/PGRST202|Could not find the function|does not exist/.test(msg)?'친구전 서버 연결을 준비 중이에요. 컴퓨터와 또는 한 화면에서 먼저 즐겨주세요.':'연결이 잠시 끊겼어요. 서버에 저장된 판으로 다시 이어져요. 다시 연결해주세요.';}
 async function rpc(fn,args){
  let timer;const abort=new AbortController();
  try{return await Promise.race([(async()=>{
   const client=await window.GroupRoomService.ensureSession();
   const {data,error}=await client.rpc(fn,args).abortSignal(abort.signal);
   if(error)throw error;if(!data)throw Error('Empty response');return data;
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Connection timeout'));},12000);})]);}
  finally{clearTimeout(timer);}
 }
 function attach(hooks){
  const $=id=>document.getElementById(id);let snapshot=null,code='',request='',active=false,working=false,fresh=false,poll=null,reading=false,generation=0,notice='',terminal=false,sharing=false;
  const invite=new URLSearchParams(location.hash.slice(1)).get('room');
  const validCode=value=>/^[a-f0-9]{32}$/i.test(value||'');
  function accept(s){
   if(!s||!validCode(s.code)||!Array.isArray(s.board)||s.board.length!==10||s.board.some((p,i)=>p.id!==i||![1,2].includes(p.color)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||typeof p.alive!=='boolean')||!Number.isInteger(s.shots)||!Number.isInteger(s.version)||![0,1,2].includes(s.me))throw Error('Invalid room response');
   if(code&&code!==s.code.toUpperCase())return;
   if(snapshot&&s.version<snapshot.version)return;
   snapshot=s;code=s.code.toUpperCase();fresh=true;terminal=false;
   hooks.apply({stones:s.board,shots:s.shots,turn:s.turn,winner:s.winner,draw:s.status==='finished'&&!s.winner,last:s.last,reason:s.reason},s.me);
  }
  function show(){const entering=!active;active=true;$('lobby').hidden=true;$('game').hidden=false;document.body.classList.add('playing');history.replaceState(null,'',location.pathname+'?mode=online#room='+code);hooks.render();schedule();if(entering)window.scrollTo({top:0,behavior:'auto'});}
  function schedule(){clearTimeout(poll);if(active&&!terminal&&!document.hidden)poll=setTimeout(refresh,fresh?1500:4000);}
  async function refresh(){
   if(!active||reading||working){schedule();return;}reading=true;const ticket=generation;
   try{const s=await rpc('get_alkkagi_room',{p_code:code});if(ticket!==generation)return;accept(s);notice='';}
   catch(e){if(ticket!==generation)return;fresh=false;notice=errorText(e);terminal=/ALKKAGI_EXPIRED|ALKKAGI_NOT_FOUND/.test(String(e.message));}
   finally{if(ticket===generation){reading=false;hooks.render();schedule();}}
  }
  async function action(fn,args){
   if(working)return;working=true;notice='';hooks.render();$('start').disabled=true;const ticket=generation;
   try{const s=await rpc(fn,args);if(ticket!==generation)return;accept(s);show();}
   catch(e){if(ticket!==generation)return;fresh=false;notice=errorText(e);terminal=/ALKKAGI_EXPIRED|ALKKAGI_NOT_FOUND/.test(String(e.message));}
   finally{if(ticket===generation){working=false;$('start').disabled=false;hooks.render();if(active&&!terminal)refresh();}}
  }
  async function start(){if(working)return;const nickname=$('nickname').value.trim();if(!nickname||[...nickname].length>12){notice=messages.ALKKAGI_INVALID_NAME;hooks.render();$('nickname').focus();return;}
   if(code){await action('join_alkkagi_room',{p_code:code,p_name:nickname});return;}
   // Kept for retries until the user explicitly leaves this attempt.
   if(!request)request=crypto.randomUUID();await action('create_alkkagi_room',{p_name:nickname,p_request:request});
  }
  async function open(value){if(!validCode(value)){notice='초대 링크가 올바르지 않아요. 친구에게 링크를 다시 받아주세요.';hooks.render();return;}
   code=value.toUpperCase();working=true;notice='초대방을 확인하고 있어요…';hooks.render();$('start').disabled=true;const ticket=generation;
   try{const s=await rpc('get_alkkagi_room',{p_code:code});if(ticket!==generation)return;accept(s);notice='';if(s.me)show();else if(s.status!=='waiting')notice=messages.ALKKAGI_FULL;}
   catch(e){if(ticket!==generation)return;notice=errorText(e);}
   finally{if(ticket===generation){working=false;$('start').disabled=false;hooks.render();}}
  }
  function leave(){const hadRoom=!!(code||request||active);generation++;clearTimeout(poll);active=false;working=false;reading=false;fresh=false;snapshot=null;code='';request='';notice='';terminal=false;$('start').disabled=false;if(hadRoom)history.replaceState(null,'',location.pathname+'?mode=online');}
  function canPlay(){return active&&fresh&&!working&&!terminal&&snapshot&&snapshot.me>0&&snapshot.status==='playing'&&snapshot.me===snapshot.turn;}
  function render(){
   const online=hooks.mode()==='online';$('onlineOptions').hidden=!online;$('roomPanel').hidden=!online||!active;$('onlineMessage').textContent=online?notice:'';
   $('start').textContent=online?(working?'방을 연결하고 있어요…':code?'초대받은 방 들어가기 →':'친구 초대방 만들기 →'):'알까기 한판 시작하기 →';
   $('newInvite').hidden=!code;
   $('onlineIntro').textContent=snapshot&&!snapshot.me?snapshot.hostName+' 님이 알까기 한판에 초대했어요.':'이름만 적으면 준비 끝. 카톡으로 친구 한 명을 초대해요.';
   $('undo').hidden=online;$('resign').hidden=!online||!snapshot||snapshot.status!=='playing';$('resign').disabled=working||!fresh;
   $('sessionNote').textContent=online?'같은 브라우저에서 다시 열면 이어서 둘 수 있어요. 방은 만든 뒤 24시간 동안 유지돼요.':'이 판은 현재 화면에서만 이어져요. 새로고침하면 처음부터 시작해요.';
   if(!online){$('replay').disabled=false;$('replay').textContent='같은 설정으로 한판 더 →';}if(!online||!active||!snapshot)return;
   const s=snapshot,myVote=s.me===1?s.rematchHost:s.rematchGuest;
   $('modeLabel').textContent='카톡으로 만난 우리 · '+s.round+'번째 판';
   $('blackName').textContent=s.hostName+(s.me===1?' (나)':'');$('whiteName').textContent=(s.guestName||'기다리는 친구')+(s.me===2?' (나)':'');
   $('blackSeat').classList.toggle('active',s.status==='playing'&&s.turn===1);$('whiteSeat').classList.toggle('active',s.status==='playing'&&s.turn===2);
   $('roomTitle').textContent=s.status==='waiting'?'친구가 오면 한판 시작!':'멀리 있어도, 같은 알까기판';
   $('roomNote').textContent=s.status==='waiting'?'내가 흑돌 다섯 개, 친구가 백돌 다섯 개예요. 아래 버튼으로 초대해주세요.':'친구가 튕긴 돌의 움직임이 잠시 뒤 보여요. 내 차례에 돌 하나를 튕겨봐요.';
   $('connectionMessage').textContent=notice||(working?'서버에서 확인하고 있어요…':fresh?'연결됐어요 · 각자 휴대폰에서 번갈아':'다시 연결하고 있어요…');
   $('reconnect').hidden=fresh&&!notice;$('reconnect').disabled=working||reading;
   $('turnStatus').textContent=!fresh?'연결을 확인할 때까지 잠시 기다려주세요.':working?'확인하고 있어요…':s.status==='waiting'?'초대 링크를 보내고 친구를 기다려요.':s.status==='finished'?(s.reason==='draw'?'무승부! 팽팽한 한판이었어요.':(s.winner===s.me?'내가 이겼어요!':'친구가 이겼어요!')):s.turn===s.me?'내 차례예요. 어느 돌을 튕길까요?':'친구 차례예요. 다음 한 방을 생각해봐요.';
   $('placement').hidden=s.status!=='playing';$('result').hidden=s.status!=='finished';
   if(s.status==='finished'){$('resultTitle').textContent=s.reason==='draw'?'팽팽했던 한판!':s.winner===s.me?'이번 한판은 내 승리!':'좋은 한판이었어!';$('resultNote').textContent=s.reason==='resign'?(s.winner===s.me?'친구가 이번 판을 양보했어요.':'이번 판은 친구에게 양보했어요.'):'다음에는 어떤 한 방을 보여줄까요?';if(s.rematchHost||s.rematchGuest)$('resultNote').textContent+=myVote?' 친구도 한판 더를 누르면 시작해요.':' 친구가 한판 더를 기다려요.';$('replay').textContent=myVote?'친구의 응답을 기다려요':'친구와 한판 더 →';$('replay').disabled=working||myVote||!fresh;}
   $('inviteActions').hidden=s.status!=='waiting';
  }
  async function share(copyOnly){
   if(!code||sharing)return;
   const url=location.origin+location.pathname+'?mode=online#room='+code;
   if(!/^https:\/\/(www\.)?noljago\.co\.kr$/.test(location.origin)){notice='지금은 컴퓨터 안의 미리보기예요. 카톡 초대는 앱과 서버를 배포한 뒤 사용할 수 있어요.';hooks.render();return;}
   sharing=true;const copy=async()=>{try{await navigator.clipboard.writeText(url);notice='초대 링크를 복사했어요. 친구에게 보내주세요.';}catch(_){$('inviteURL').hidden=false;$('inviteURL').value=url;$('inviteURL').focus();$('inviteURL').select();notice='아래 링크를 길게 눌러 복사해주세요.';}hooks.render();};
   try{if(copyOnly)await copy();else await window.kakaoShare({title:'알까기 한판 할래?',desc:'내가 흑돌, 네가 백돌. 톡! 네 돌을 지킬 수 있을까?',url,btn:'알까기방 들어가기',textOnly:true},copy);}
   catch(_){await copy();}finally{sharing=false;}
  }
  $('newInvite').addEventListener('click',()=>{leave();hooks.render();});
  $('inviteKakao').addEventListener('click',()=>share(false));$('inviteCopy').addEventListener('click',()=>share(true));$('reconnect').addEventListener('click',refresh);
  $('resign').addEventListener('click',()=>$('resignDialog').showModal());$('resignCancel').addEventListener('click',()=>$('resignDialog').close());$('resignConfirm').addEventListener('click',()=>{$('resignDialog').close();if(snapshot)action('resign_alkkagi_room',{p_code:code,p_version:snapshot.version});});
  document.addEventListener('visibilitychange',()=>{if(!active)return;if(document.hidden){clearTimeout(poll);fresh=false;}else refresh();hooks.render();});
  window.addEventListener('offline',()=>{if(active){fresh=false;notice='인터넷 연결이 끊겼어요. 다시 연결되면 이어서 둘 수 있어요.';hooks.render();}});
  window.addEventListener('online',()=>{if(active)refresh();});window.addEventListener('pagehide',()=>{clearTimeout(poll);fresh=false;});
  window.addEventListener('hashchange',()=>{const next=new URLSearchParams(location.hash.slice(1)).get('room');if(next&&next.toUpperCase()!==code){generation++;clearTimeout(poll);snapshot=null;code='';active=false;working=false;reading=false;fresh=false;hooks.setMode('online');$('game').hidden=true;$('lobby').hidden=false;document.body.classList.remove('playing');open(next);}});window.addEventListener('pageshow',()=>{if(active)refresh();});
  return {render,start,leave,canPlay,init(){if(invite!==null){hooks.setMode('online');open(invite);}},shoot(id,angle,power){if(canPlay())action('play_alkkagi_shot',{p_code:code,p_stone:id,p_angle:angle,p_power:power,p_version:snapshot.version});},rematch(){if(snapshot&&!working)action('rematch_alkkagi_room',{p_code:code,p_round:snapshot.round});}};
 }
 window.AlkkagiOnline={attach,errorText};
})();
