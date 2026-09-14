(function(){
 'use strict';const R=window.AlkkagiRules,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
 let mode=['online','local'].includes(params.get('mode'))?params.get('mode'):'ai',state=R.create(),view=state.stones,selected=-1,angle=270,power=10,online=null,busy=false,epoch=0,frame=0,bot=null;
 let charging=false,chargeStart=0,chargeFrame=0,localStarter=1,localRound=0;
 const points=[],finished=()=>!!(state.winner||state.draw),canPlay=()=>!$('game').hidden&&!busy&&!finished()&&(mode==='online'?online&&online.canPlay():mode==='local'||state.turn===1);
 for(let i=0;i<10;i++){const b=document.createElement('button');b.className='alk-stone '+(i<5?'black':'white');b.dataset.stone=i;b.type='button';$('board').append(b);points.push(b);}
 function cancelCharge(){charging=false;cancelAnimationFrame(chargeFrame);chargeFrame=0;$('cancelCharge').hidden=true;}
 function stop(){cancelCharge();epoch++;cancelAnimationFrame(frame);clearTimeout(bot);bot=null;busy=false;view=state.stones;}
 function options(){document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(mode===b.dataset.mode)));$('modeNote').textContent=mode==='ai'?'컴퓨터와 겨뤄요. 내 흑돌부터 시작!':mode==='local'?'한 화면에서 번갈아 겨뤄요. 흑돌부터 시작해요.':'카톡으로 초대해서 각자 휴대폰으로 겨뤄요.';$('backLink').textContent=mode==='ai'?'← 다른 혼자놀기':'← 다른 둘이놀기';$('backLink').href=mode==='ai'?'../../?tab=solo#all':'../../?home=play#all';document.querySelectorAll('.om-nav a').forEach((a,i)=>{a.removeAttribute('aria-current');if(i===(mode==='ai'?1:0))a.setAttribute('aria-current','page');});if(online)online.render();}
 function render(){
  if(charging&&!canPlay())cancelCharge();
  const counts=R.counts(view),playable=canPlay()&&!charging;$('blackCount').textContent=counts[0];$('whiteCount').textContent=counts[1];
  points.forEach((b,i)=>{const s=view[i];b.hidden=!s.alive;b.style.left=(s.x*100)+'%';b.style.top=(s.y*100)+'%';b.classList.toggle('selected',selected===i&&playable);b.setAttribute('aria-label',(s.color===1?'흑돌':'백돌')+' '+(i%5+1)+'번'+(s.color===state.turn?' · 내 돌 선택':' · 이쪽으로 겨누기'));b.setAttribute('aria-disabled',String(!playable));});
  $('blackSeat').classList.toggle('active',!finished()&&state.turn===1);$('whiteSeat').classList.toggle('active',!finished()&&state.turn===2);$('blackName').textContent=mode==='local'?'흑돌':'나';$('whiteName').textContent=mode==='local'?'백돌':'컴퓨터';$('modeLabel').textContent=mode==='local'?'한 화면에서 둘이':'컴퓨터와 가볍게 한판';
  $('turnStatus').textContent=finished()?(state.draw?'같이 잘 겨뤘어, 무승부!':(state.winner===1?'흑돌':'백돌')+' 승리!'):mode==='local'?(state.turn===1?'흑돌':'백돌')+' 차례예요.':'내 차례예요. 어느 돌을 튕길까요?';
  $('moveCount').textContent=state.shots+'번';$('selectedPoint').textContent=selected<0?'먼저 내 돌을 골라주세요':(state.turn===1?'흑돌':'백돌')+' '+(selected%5+1)+'번 · 판을 눌러 방향을 정해요';
  paintGauge();
  document.querySelectorAll('[data-angle]').forEach(b=>{b.disabled=!playable||selected<0;b.setAttribute('aria-pressed',String(+b.dataset.angle===angle));});
  $('place').disabled=!canPlay()||selected<0;$('place').textContent=selected<0?'먼저 내 돌을 골라주세요':charging?'지금! 톡 튕기기 →':'이 방향으로 힘 모으기 →';$('aim').hidden=!canPlay()||selected<0;
  $('cancelCharge').hidden=!charging;
  if(selected>=0){const s=view[selected],rad=angle*Math.PI/180,len=.25;const line=$('aimLine');line.setAttribute('x1',s.x*1000);line.setAttribute('y1',s.y*1000);line.setAttribute('x2',(s.x+Math.cos(rad)*len)*1000);line.setAttribute('y2',(s.y+Math.sin(rad)*len)*1000);}
  $('placement').hidden=finished();$('result').hidden=!finished();
  if(finished()){$('resultTitle').textContent=state.draw?'팽팽했던 한판!':mode==='ai'?(state.winner===1?'톡! 내가 지켜냈다!':'이번에는 컴퓨터 승리!'):(state.winner===1?'흑돌':'백돌')+'이 지켜냈어요!';$('resultNote').textContent=state.shots>=120?'120번의 승부! 남은 돌 수로 결과를 정했어요.':state.draw?'마지막 한 방에 서로의 돌이 모두 떨어졌어요.':'상대 돌을 모두 판 밖으로 보냈어요.';}
  if(online)online.render();if(busy){$('turnStatus').textContent='또르르… 돌이 멈추면 다음 차례!';$('place').disabled=true;$('aim').hidden=true;document.querySelectorAll('[data-angle]').forEach(b=>b.disabled=true);$('result').hidden=true;$('placement').hidden=false;}
  if(charging){$('turnStatus').textContent='원하는 힘에서 톡! 방향은 고정돼 있어요.';$('selectedPoint').textContent='방향 고정 · 아래 게이지를 보고 튕겨요';}
  if(mode!=='online'){$('modeLabel').textContent=(mode==='local'?'한 화면에서 둘이':'컴퓨터와 한판')+' · '+localRound+'번째 판';$('sessionNote').textContent='이번 판은 '+(localStarter===1?'흑돌':'백돌')+'부터! 한판 더 하면 먼저 치는 사람이 바뀌어요.';}
  if(mode==='online'&&state.reason==='limit'&&finished()&&!busy)$('resultNote').textContent='120번의 승부! 남은 돌이 많은 쪽이 이겼어요. 한판 더 겨뤄볼까요?';
 }
 function paintGauge(){
  $('powerLabel').textContent=charging?'힘 '+power+' · '+(power<40?'살짝':power<80?'힘 있게':'시원하게'):'방향을 정하고 힘 모으기를 눌러요';
  $('powerFill').style.width=((power-10)/90*100)+'%';$('powerNeedle').style.left=((power-10)/90*100)+'%';
  $('powerMeter').setAttribute('aria-valuenow',String(power));$('powerMeter').setAttribute('aria-valuetext','힘 '+power);
  $('powerMeter').classList.toggle('charging',charging);
 }
 function beginCharge(){if(!canPlay()||selected<0||document.hidden)return;charging=true;chargeStart=performance.now();power=10;render();
  function tick(now){if(!charging)return;if(document.hidden||!canPlay()){cancelCharge();render();return;}power=R.gaugePower(now-chargeStart);paintGauge();chargeFrame=requestAnimationFrame(tick);}chargeFrame=requestAnimationFrame(tick);
 }
 function animate(next,frames){stop();state=next;selected=-1;const ticket=epoch;
  if(!frames.length||window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){view=state.stones;render();scheduleBot();return;}
  busy=true;view=frames[0];render();$('board').scrollIntoView({block:'center',behavior:'instant'});let startTime=null;
  function step(now){if(ticket!==epoch)return;if(startTime===null)startTime=now;const index=Math.floor((now-startTime)/25);if(index>=frames.length){busy=false;view=state.stones;render();scheduleBot();return;}view=frames[index];render();frame=requestAnimationFrame(step);}frame=requestAnimationFrame(step);
 }
 function perform(id,a,p){const result=R.shoot(state,id,a,p);if(result)animate(result.state,result.frames);}
 function scheduleBot(){if(mode!=='ai'||finished()||state.turn!==2||$('game').hidden)return;busy=true;render();$('turnStatus').textContent='컴퓨터가 한 방을 고르고 있어요…';const ticket=epoch;bot=setTimeout(()=>{bot=null;if(ticket!==epoch)return;const shot=R.choose(state);busy=false;if(shot)perform(shot.id,shot.angle,shot.power);else render();},400);}
 function start(replay=false){if(mode==='online'){online.start();return;}stop();localStarter=replay?3-localStarter:1;localRound=replay?localRound+1:1;state=R.create(localStarter);view=state.stones;selected=-1;angle=localStarter===1?270:90;power=10;$('lobby').hidden=true;$('game').hidden=false;document.body.classList.add('playing');render();window.scrollTo({top:0,behavior:'auto'});scheduleBot();}
 function lobby(){stop();online.leave();selected=-1;$('game').hidden=true;$('lobby').hidden=false;document.body.classList.remove('playing');options();}
 $('board').addEventListener('click',e=>{if(!canPlay()||charging)return;const button=e.target.closest('[data-stone]');let target;
  if(button){const s=state.stones[+button.dataset.stone];if(s.color===state.turn){selected=s.id;angle=state.turn===1?270:90;render();return;}target=s;}
  else{const rect=$('board').getBoundingClientRect();target={x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height};const near=state.stones.find(s=>s.alive&&s.color===state.turn&&Math.hypot(s.x-target.x,s.y-target.y)<.065);if(near){selected=near.id;angle=state.turn===1?270:90;render();return;}}
  if(selected>=0){angle=R.aim(state.stones[selected],target);render();}else $('shotNote').textContent='먼저 내 돌을 골라주세요. 그다음 방향을 정할 수 있어요.';
 });
 document.querySelectorAll('[data-angle]').forEach(b=>b.addEventListener('click',()=>{if(canPlay()&&!charging&&selected>=0){angle=+b.dataset.angle;render();}}));
 $('place').addEventListener('click',()=>{if(!canPlay()||selected<0||document.hidden)return;if(!charging){beginCharge();return;}const elapsed=performance.now()-chargeStart;if(elapsed<250)return;power=R.gaugePower(elapsed);cancelCharge();$('shotNote').textContent='방금 힘 '+power+'로 튕겼어요. 다음엔 타이밍을 바꿔봐요.';if(mode==='online')online.shoot(selected,angle,power);else perform(selected,angle,power);});
 $('place').addEventListener('keydown',e=>{if(e.repeat&&(e.code==='Space'||e.code==='Enter'))e.preventDefault();});
 $('cancelCharge').addEventListener('click',()=>{cancelCharge();power=10;render();});
 $('start').addEventListener('click',()=>start());$('replay').addEventListener('click',()=>{if(mode==='online')online.rematch();else start(true);});
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(mode==='online'&&b.dataset.mode!=='online')online.leave();mode=b.dataset.mode;options();}));
 $('helpOpen').addEventListener('click',()=>{cancelCharge();render();$('helpDialog').showModal();});$('helpClose').addEventListener('click',()=>$('helpDialog').close());
 $('settings').addEventListener('click',()=>{cancelCharge();render();if(!state.shots&&mode!=='online'){lobby();return;}$('leaveNote').textContent=mode==='online'?'판은 서버에 남아 있어요. 초대 링크를 같은 브라우저에서 열면 돌아올 수 있어요.':'지금 판을 마치고 새 판을 골라요.';$('newDialog').showModal();});$('keepPlaying').addEventListener('click',()=>$('newDialog').close());$('newGame').addEventListener('click',()=>{$('newDialog').close();lobby();});
 online=window.AlkkagiOnline.attach({mode:()=>mode,setMode(value){mode=value;options();},render,apply(next){const previous=state.shots,visible=!$('game').hidden;let frames=[];if(visible&&next.shots===previous+1&&next.last){const last=next.last,r=R.shoot({stones:last.before,turn:last.turn,shots:previous,winner:0,draw:false},last.stone,last.angle,last.power);if(r)frames=r.frames;}
  if(frames.length){animate(next,frames);}else{const changed=next.shots!==state.shots||next.winner!==state.winner||next.draw!==state.draw||next.turn!==state.turn||next.round!==state.round;if(changed){stop();selected=-1;}state=next;if(!busy)view=next.stones;}
 }});
 window.addEventListener('pagehide',stop);window.addEventListener('pageshow',()=>{if(!$('game').hidden){view=state.stones;render();if(mode==='ai'&&!busy)scheduleBot();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelCharge();render();}});
 window.addEventListener('blur',()=>{if(charging){cancelCharge();render();}});
 $('resign').addEventListener('click',()=>{cancelCharge();render();});
 options();online.init();if(params.get('guide')==='1')$('helpDialog').showModal();
})();
