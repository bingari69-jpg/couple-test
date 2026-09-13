(function(){
 'use strict';
 const $=id=>document.getElementById(id),R=window.TapBattleRules;
 const validCode=c=>/^[a-f0-9]{32}$/i.test(c||'');
 const invite=new URLSearchParams(location.hash.slice(1)).get('room');
 let code=validCode(invite)?invite.toUpperCase():'',s=null,events=[],ack=[],request=crypto.randomUUID();
 let queue=Promise.resolve(),actionBusy=false,poll=null,inFlight=false,lastSeen=-Infinity,clockBase=null,bestRTT=Infinity,roundAnchor=null,roundKey='',closed=false;
 let notice='',failed=false,terminal=false,sound=false,audio=null,signal='',lastBeep='',feedbackTimer=null,sharing=false,discardPending=false;
 const messages={TB_AUTH:'접속을 확인하지 못했어요. 다시 연결해주세요.',TB_NAME:'이름을 1~12자로 적어주세요.',TB_NOT_FOUND:'초대방을 찾지 못했어요. 초대 링크를 다시 확인해주세요.',TB_EXPIRED:'방의 24시간이 지났어요. 새 초대방에서 만나요.',TB_FULL:'이미 두 사람이 들어온 방이에요. 참가했던 브라우저에서 열어주세요.',TB_MEMBER:'초대방에 먼저 들어가주세요.',TB_ROUND:'새로운 판이 도착했어요. 잠시만 기다려주세요.',TB_STATE:'친구의 새 소식을 확인하고 있어요.',TB_LIMIT:'방을 많이 만들었어요. 잠시 후 다시 만들어주세요.',TB_EVENTS:'전송이 늦어진 터치를 정리했어요. 저장된 점수부터 이어가요.'};
 function errorText(e){const msg=String(e.message||e);const k=Object.keys(messages).find(k=>msg.includes(k));return k?messages[k]:/PGRST202|does not exist|Could not find the function/.test(msg)?'친구전 서버를 준비 중이에요. 서버 설정이 적용되면 초대방을 만들 수 있어요.':'연결이 잠시 끊겼어요. 입력을 멈추고 다시 연결하고 있어요.';}
 const cacheKey=()=>`tapbattle:${code}:${s?s.round:0}`;
 function save(){try{sessionStorage.setItem(cacheKey(),JSON.stringify(events));}catch(_){}}
 function serverNow(){const c=roundAnchor||clockBase;return c?c.time+performance.now()-c.perf:Date.now();}
 function elapsed(){return s&&s.startAt!==null?serverNow()-s.startAt:-Infinity;}
 function fresh(){return !failed&&!document.hidden&&navigator.onLine!==false&&performance.now()-lastSeen<2600;}
 function accept(next,before,after){
  if(!next||!validCode(next.code)||![0,1,2].includes(next.me)||!['waiting','playing','finished'].includes(next.status)||!Number.isInteger(next.round)||!Array.isArray(next.events)||!Number.isFinite(next.serverNow)||!Number.isInteger(next.seed))throw Error('Invalid room');
  if(code&&code!==next.code)return;
  if(s&&next.version<s.version)return;
  const entering=next.me&&(!s||!s.me),stageChanged=s&&s.status!==next.status;
  const rtt=after-before,key=next.code+':'+next.round;
  if(rtt<bestRTT||!clockBase){bestRTT=rtt;clockBase={time:next.serverNow+rtt/2,perf:after};}
  if(roundKey!==key){roundKey=key;roundAnchor=null;events=[];ack=[];signal='';lastBeep='';discardPending=false;
   try{const saved=JSON.parse(sessionStorage.getItem(`tapbattle:${next.code}:${next.round}`)||'[]');if(Array.isArray(saved)&&saved.length<=572&&saved.every(Number.isInteger))events=saved;}catch(_){}
  }
  if(next.status==='playing'&&!roundAnchor)roundAnchor={...clockBase};
  s=next;code=s.code;ack=s.events.slice();
  if(discardPending||events.length<ack.length||ack.some((t,i)=>events[i]!==t)){events=ack.slice();discardPending=false;}
  if(s.status==='finished')events=ack.slice();
  lastSeen=after;failed=false;terminal=false;save();
  if(s.me){$('lobby').hidden=true;$('room').hidden=false;history.replaceState(null,'',location.pathname+'?mode=online#room='+code);}
  else{$('intro').textContent=s.hostName+' 님이 톡톡 배틀에 초대했어요!';$('create').textContent='초대받은 방 들어가기 →';}
  render();
  if(entering||(stageChanged&&next.status!=='waiting'))window.scrollTo({top:0,behavior:'auto'});
 }
 function send(action,extra={}){
  const run=async()=>{
   const before=performance.now(),abort=new AbortController();let timer;
   const args={p_action:action,p_code:code||null,p_name:null,p_request:null,p_round:s?s.round:null,p_events:null,...extra};
   try{
    const result=await Promise.race([(async()=>{const client=await window.GroupRoomService.ensureSession();return await client.rpc('tapbattle_room',args).abortSignal(abort.signal);})(),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Timeout'));},4500);})]);
    if(result.error)throw Error(result.error.message);if(closed)return;
    accept(result.data,before,performance.now());
   }finally{clearTimeout(timer);}
  };
  const next=queue.then(run);queue=next.catch(()=>{});return next;
 }
 function onError(e){notice=errorText(e);failed=true;terminal=/TB_EXPIRED|TB_NOT_FOUND|TB_FULL|PGRST202|does not exist/.test(String(e.message));if(/TB_EVENTS/.test(String(e.message)))discardPending=true;render();}
 async function action(kind,extra){if(actionBusy)return;actionBusy=true;notice='';render();
  try{await send(kind,extra);}catch(e){onError(e);}finally{actionBusy=false;render();schedule(100);}
 }
 function schedule(delay){clearTimeout(poll);if(!closed&&!terminal&&code&&!document.hidden)poll=setTimeout(refresh,delay??(s&&s.status==='playing'?650:1100));}
 async function refresh(){if(inFlight||actionBusy){schedule();return;}inFlight=true;
  try{
   if(s&&s.me&&s.status==='playing'&&!discardPending){
    // Drop only unacknowledged taps too old to deliver; keep the server's history intact.
    const cutoff=elapsed()-4400;const pending=events.slice(ack.length).filter(t=>t>=cutoff);
    if(pending.length!==events.length-ack.length){events=ack.concat(pending);save();}
    await send('sync',{p_events:events.slice()});
   }else await send('get');
   if(!discardPending)notice='';
  }catch(e){onError(e);}finally{inFlight=false;render();schedule();}
 }
 function summary(){const me=s.me===1?s.host:s.guest,other=s.me===1?s.guest:s.host;return {me:s.status==='playing'?R.score(s.seed,events):me,other};}
 function render(){
  $('notice').textContent=notice;$('reconnect').hidden=!failed||terminal;$('reconnect').disabled=actionBusy||inFlight;
  $('create').disabled=actionBusy||!!(invite!==null&&!validCode(invite))||terminal;
  $('newRoom').hidden=!code&&!terminal;
  if(!s||!s.me)return;
  const mine=s.me===1,myReady=mine?s.readyHost:s.readyGuest,theirReady=mine?s.readyGuest:s.readyHost;
  $('myName').textContent=(mine?s.hostName:s.guestName)+' (나)';$('friendName').textContent=(mine?s.guestName:s.hostName)||'기다리는 친구';
  $('roundLabel').textContent='카톡으로 만난 우리 · '+s.round+'번째 대결';
  $('myReady').textContent=s.status==='waiting'?(myReady?'준비 완료 ✓':'준비 전'):'내 기록';
  $('friendReady').textContent=!s.guestName?'아직 도착 전':s.status==='waiting'?(theirReady?'준비 완료 ✓':'준비하는 중'):'친구 기록';
  $('waiting').hidden=s.status!=='waiting';$('arena').hidden=s.status!=='playing';$('result').hidden=s.status!=='finished';
  $('inviteActions').hidden=!!s.guestName;$('ready').disabled=actionBusy||!fresh()||!s.guestName;
  $('ready').textContent=myReady?'준비 완료 ✓ · 누르면 취소':'나는 준비 완료! →';
  $('waitTitle').textContent=!s.guestName?'친구가 오면 준비 끝!':myReady?'친구도 준비하면 시작!':'우리, 같이 시작해볼까?';
  $('waitNote').textContent=!s.guestName?'카톡으로 초대 링크를 보내주세요.':myReady?'화면을 켜고 기다려주세요. 곧 신호가 나와요.':'둘 다 준비 완료를 누르면 3, 2, 1!';
  $('resign').hidden=s.status!=='playing';$('resign').disabled=actionBusy||!fresh();
  document.body.classList.add('playing');
  if(s.status==='finished'){
   const {me,other}=summary(),winner=s.forfeited?3-s.forfeited:s.host.score>s.guest.score?1:s.host.score<s.guest.score?2:0,win=winner===s.me;
   $('resultSymbol').textContent=!winner?'＝':win?'✦':'♡';
   $('resultTitle').textContent=!winner?'점수까지 똑같아!':win?'이번 판은 내 승리!':'이번엔 친구가 이겼어!';
   $('resultNote').textContent=s.forfeited?(win?'친구가 이번 판을 양보했어요.':'이번 판은 친구에게 양보했어요.'):!winner?'팽팽한 무승부! 한 번 더 겨뤄볼까?':Math.abs(me.score-other.score)+'점 차이! 다음 판엔 또 모르는 거야.';
   const stats=$('resultStats');stats.replaceChildren();
   for(const row of [['나','우리의 기록','친구'],[me.good,'초록에 성공',other.good],[me.bad,'멈추기 실수',other.bad],[me.best,'최고 연속 성공',other.best]]){
    const div=document.createElement('div');div.className='stat-row';row.forEach((v,i)=>{const el=document.createElement(i===1?'span':'b');el.textContent=v;div.append(el);});stats.append(div);
   }
   const voted=mine?s.rematchHost:s.rematchGuest,otherVote=mine?s.rematchGuest:s.rematchHost;
   $('rematch').disabled=actionBusy||voted||!fresh();$('rematch').textContent=voted?'친구의 응답을 기다려요':'친구와 한 판 더 →';
   $('rematchNote').textContent=voted?'친구도 한 판 더를 누르면 준비방으로 돌아가요.':otherVote?'친구가 재대결을 기다리고 있어요!':'둘 다 원하면, 같은 방에서 다시!';
  }
  frameUI();
 }
 function beep(kind){if(!sound||!audio)return;try{const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=kind==='miss'?150:kind==='go'?660:kind==='stop'?300:480;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.07);o.start();o.stop(audio.currentTime+.08);}catch(_){}
 }
 function setSignal(state,title,mark,note){if(signal===state+title)return;signal=state+title;$('pad').dataset.state=state;$('signalText').textContent=title;$('signalMark').textContent=mark;$('signalNote').textContent=note;$('pad').setAttribute('aria-label',title+'. '+note);if(state==='go'||state==='stop')beep(state);}
 function frameUI(){if(!s||!s.me)return;const {me,other}=summary();$('myScore').textContent=me.score;$('friendScore').textContent=other.score;
  if(s.status!=='playing')return;
  const e=elapsed(),remain=Math.max(0,R.DURATION-e),connected=fresh();
  $('time').textContent=(Math.min(20000,remain)/1000).toFixed(1);$('timeBar').style.transform=`scaleX(${Math.max(0,Math.min(1,remain/20000))})`;
  $('combo').textContent='연속 성공 '+(function(){let n=0;for(let i=events.length-1;i>=0&&R.greenAt(s.seed,events[i]);i--)n++;return n;})();
  $('mistakes').textContent='멈추기 실수 '+me.bad;
  const gap=me.score-other.score;$('leadText').textContent=!connected?'연결을 확인하는 동안 잠깐 손 떼요.':e<0?'같은 신호, 같은 20초!':gap===0?'지금은 동점! 끝까지 집중해요.':gap>0?gap+'점 앞서고 있어요! 방심은 금물.':Math.abs(gap)+'점 차이! 아직 뒤집을 수 있어요.';
  $('pad').disabled=!connected||e<0||e>=R.DURATION;
  if(e<0){const count=Math.ceil(-e/1000);setSignal('countdown',count>3?'준비!':String(count),'✦','초록이 되면 눌러요');$('roundState').textContent='둘 다 준비 완료';if(lastBeep!==String(count)){lastBeep=String(count);beep('count');}}
  else if(e>=R.DURATION){setSignal('done','끝!','✓','두 사람의 기록을 모으고 있어요');$('roundState').textContent='결과 확인 중 · 잠시만요';}
  else if(!connected){setSignal('pause','잠깐만!','…','다시 연결하고 있어요 · 시간은 계속 흘러가요');$('roundState').textContent='연결 확인 중';}
  else{const green=R.greenAt(s.seed,e);setSignal(green?'go':'stop',green?'톡톡!':'멈춰!',green?'✦':'Ⅱ',green?'누를 때마다 +1점':'지금 누르면 −3점');$('roundState').textContent=e>=15000?'마지막 5초, 집중!':'초록엔 톡톡 · 빨강엔 손 떼';}
 }
 function tick(){if(closed)return;frameUI();requestAnimationFrame(tick);}
 function tap(){if(!s||!s.me||s.status!=='playing'||!fresh())return;
  if($('helpDialog').open||$('resignDialog').open)return;
  const t=Math.floor(elapsed());if(t<0||t>=R.DURATION||events.length>=572||(events.length&&t-events[events.length-1]<R.MIN_GAP))return;
  events.push(t);save();const good=R.greenAt(s.seed,t);$('pad').classList.remove('hit','miss');$('feedback').classList.remove('show');void $('feedback').offsetWidth;$('pad').classList.add(good?'hit':'miss');$('feedback').textContent=good?'+1':'−3';$('feedback').classList.add('show');
  clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{$('pad').classList.remove('hit','miss');$('feedback').classList.remove('show');},160);if(!good)beep('miss');frameUI();
 }
 $('pad').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();tap();});
 $('pad').addEventListener('click',e=>{if(e.detail===0)tap();});
 document.addEventListener('keydown',e=>{if(!['Space','Enter'].includes(e.code)||!s||s.status!=='playing'||e.target.matches('input,textarea')||$('helpDialog').open||$('resignDialog').open)return;if(e.code==='Enter'&&e.target!==$('pad'))return;if(e.code==='Space'&&e.target.closest('button')&&e.target!==$('pad'))return;e.preventDefault();if(!e.repeat)tap();});
 $('enterForm').addEventListener('submit',e=>{e.preventDefault();const name=$('nickname').value.trim();if(!name||[...name].length>12){notice=messages.TB_NAME;render();return;}action(code?'join':'create',{p_name:name,p_request:request});});
 $('ready').addEventListener('click',()=>{if(s)action((s.me===1?s.readyHost:s.readyGuest)?'unready':'ready');});
 $('rematch').addEventListener('click',()=>action('rematch'));
 $('reconnect').addEventListener('click',()=>{failed=false;refresh();});
 $('helpOpen').addEventListener('click',()=>$('helpDialog').showModal());$('helpClose').addEventListener('click',()=>$('helpDialog').close());
 $('resign').addEventListener('click',()=>$('resignDialog').showModal());$('resignCancel').addEventListener('click',()=>$('resignDialog').close());$('resignConfirm').addEventListener('click',()=>{$('resignDialog').close();action('resign');});
 $('sound').addEventListener('click',()=>{sound=!sound;if(sound){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch(_){sound=false;}}$('sound').setAttribute('aria-pressed',String(sound));$('sound').textContent=sound?'소리 켜짐':'소리 꺼짐';if(sound)beep('go');});
 async function share(copyOnly){if(sharing||!code)return;
  if(!/^https:\/\/(www\.)?noljago\.co\.kr$/.test(location.origin)){notice='컴퓨터 안의 미리보기예요. 실제 카톡 초대는 서버 적용과 배포 후 사용할 수 있어요.';render();return;}
  sharing=true;const url=location.origin+location.pathname+'?mode=online#room='+code;
  const copy=async()=>{try{await navigator.clipboard.writeText(url);notice='초대 링크를 복사했어요. 친구에게 보내주세요.';}catch(_){$('inviteURL').hidden=false;$('inviteURL').value=url;$('inviteURL').focus();$('inviteURL').select();notice='초대 링크를 길게 눌러 복사해주세요.';}render();};
  try{if(copyOnly)await copy();else await window.kakaoShare({title:'톡톡 배틀, 나보다 잘 멈출 수 있어?',desc:'초록엔 톡톡! 빨강엔 멈춰! 우리 20초만 겨뤄보자.',url,btn:'같이 톡톡 하기',textOnly:true},copy);}catch(_){await copy();}finally{sharing=false;}
 }
 $('inviteKakao').addEventListener('click',()=>share(false));$('inviteCopy').addEventListener('click',()=>share(true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(poll);lastSeen=-Infinity;}else if(code)refresh();});
 window.addEventListener('offline',()=>{failed=true;notice='인터넷 연결이 끊겼어요. 다시 연결되면 남은 시간부터 이어져요.';render();});window.addEventListener('online',()=>{if(code)refresh();});
 window.addEventListener('pagehide',()=>{closed=true;clearTimeout(poll);save();});window.addEventListener('pageshow',e=>{if(e.persisted){closed=false;lastSeen=-Infinity;tick();refresh();}});
 window.addEventListener('hashchange',()=>{const next=new URLSearchParams(location.hash.slice(1)).get('room');if(next&&next.toUpperCase()!==code)location.reload();});
 if(invite!==null&&!validCode(invite)){notice='초대 링크가 올바르지 않아요. 친구에게 링크를 다시 받아주세요.';terminal=true;}
 if(code){$('create').textContent='초대받은 방 들어가기 →';refresh();}
 if(new URLSearchParams(location.search).get('guide')==='1')$('helpDialog').showModal();
 render();tick();
})();
