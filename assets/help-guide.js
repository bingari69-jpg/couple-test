(function(){
  'use strict';
  if(window.__GATCHI_HELP_GUIDE__)return;window.__GATCHI_HELP_GUIDE__=true;
  const script=document.currentScript;const root=new URL('../',script&&script.src||location.href);
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('assets/help-guide.css?v=20260913-mines-guide',root).href;document.head.append(style);
  const $=(selector,parent=document)=>parent.querySelector(selector);
  const slug=()=>{const m=location.pathname.match(/\/t\/(.+?)\/?$/);return m?m[1].replace(/\/$/,''):'home';};
  const entry=()=>/^(#|\?)(c|i)=/.test(location.hash||location.search)?'invite':'direct';
  function managedGuide(){const key=slug();const local=window.GATCHI_GUIDES&&window.GATCHI_GUIDES[key];const config=window.APP_PUBLISHED_CONFIG;const game=config&&config.games&&config.games.find(item=>item.slug===key);if(!local&&!game)return null;return Object.assign({},local||{},game&&game.guide||{},game&&{title:game.title||local&&local.title});}
  function markSeen(){try{localStorage.setItem('gatchi_guide_seen_'+slug(),'1');}catch(_){}}
  function hasSeen(){try{return localStorage.getItem('gatchi_guide_seen_'+slug())==='1';}catch(_){return true;}}
  function firstAction(){const buttons=[...document.querySelectorAll('main button:not(.guide-help-button):not(.guide-sheet-close),main a.primary,main .btn-main,main .bigbtn')];return buttons.find(el=>!el.closest('header,nav,.topbar')&&!/back|menu|help|close|copy|share|kakao|preview/i.test((el.id||'')+' '+(el.className||'')))||buttons[0];}
  function close(dialog){markSeen();dialog.close();document.documentElement.classList.remove('guide-dialog-open');}
  function practiceBox(type,key){if(key==='mines')return minesPractice();if(!type)return null;if(type==='tap')type=key==='ufo'?'ufo':key==='num25'?'numbers':key==='tap'?'rapid':'mole';if(type==='choice')type=key==='rps'?'rps':key==='stroop'?'color':key==='arrow'?'arrow':key==='nonsense'?'nonsense':'';if(type==='stop'&&key==='ten')type='timing';if(!type)return null;const box=document.createElement('section');box.className='guide-practice';box.innerHTML='<h3>먼저 연습해 볼까요?</h3><p>연습 점수는 기록에 들어가지 않아요.</p><div class="practice-stage"></div><p class="practice-status" role="status"></p>';const stage=$('.practice-stage',box),status=$('.practice-status',box);
    const addChoices=(question,labels,answer,success,fail)=>{stage.classList.add('with-question');const prompt=document.createElement('div');prompt.className='practice-question';prompt.innerHTML=question;const choices=document.createElement('div');choices.className='practice-choice';labels.forEach((label,index)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{choices.querySelectorAll('button').forEach(x=>x.disabled=true);if(index===answer)b.classList.add('correct');status.textContent=index===answer?success:fail;};choices.append(b);});stage.append(prompt,choices);};
    if(type==='reaction'){const b=document.createElement('button');b.className='practice-reaction';b.textContent='기다려요…';stage.append(b);let ready=false,timer=setTimeout(()=>{ready=true;b.classList.add('ready');b.textContent='지금 눌러요!';},900);b.onclick=()=>{if(!ready){clearTimeout(timer);status.textContent='조금 빨랐어요. 다시 기다려요!';timer=setTimeout(()=>{ready=true;b.classList.add('ready');b.textContent='지금 눌러요!';},900);}else{status.textContent='성공! 이렇게 초록색일 때 누르면 돼요.';b.textContent='잘했어요 ✓';b.disabled=true;}};}
    else if(type==='timing'){stage.classList.add('with-question');stage.innerHTML='<div class="practice-question"><strong>3초 맞히기</strong><small>시작하면 숫자는 보이지 않아요.</small></div><button class="practice-wide">연습 시작</button>';const b=$('.practice-wide',stage);let started=0;b.onclick=()=>{if(!started){started=Date.now();b.textContent='3초라고 느낄 때 누르기';status.textContent='속으로 하나, 둘, 셋을 세어보세요.';}else{const elapsed=(Date.now()-started)/1000;b.disabled=true;b.textContent=elapsed.toFixed(2)+'초';status.textContent=Math.abs(elapsed-3)<.5?'성공! 3초에 아주 가까워요.':'좋아요! 실제 게임에서는 10초를 맞혀보세요.';}};}
    else if(type==='stop'){stage.innerHTML='<div class="practice-meter"><i></i></div><button class="practice-target" aria-label="멈추기">✋</button>';const meter=$('.practice-meter',stage),pin=$('i',meter),button=$('.practice-target',stage);button.style.position='absolute';button.style.bottom='5px';button.style.width='45px';button.style.height='34px';button.style.fontSize='17px';let pos=4,dir=1,run=true;const move=()=>{if(!run)return;pos+=dir*1.7;if(pos>96||pos<4)dir*=-1;pin.style.left=pos+'%';requestAnimationFrame(move);};move();button.onclick=()=>{run=false;const gap=Math.abs(pos-50);status.textContent=gap<13?'성공! 가운데에 잘 멈췄어요.':'괜찮아요! 가운데에 가까울 때 눌러보세요.';};}
    else if(type==='numbers'){stage.classList.add('with-question');const prompt=document.createElement('div');prompt.className='practice-question';prompt.innerHTML='<strong>1 → 2 → 3</strong><small>작은 숫자부터 차례로 눌러요.</small>';const choices=document.createElement('div');choices.className='practice-number-grid';let next=1;[2,1,3].forEach(number=>{const b=document.createElement('button');b.textContent=number;b.onclick=()=>{if(number!==next){status.textContent='지금은 '+next+'을 눌러요.';return;}b.disabled=true;b.classList.add('correct');next++;status.textContent=next===4?'성공! 실제 게임에서는 25까지 눌러요.':'좋아요! 이제 '+next+'을 누르세요.';};choices.append(b);});stage.append(prompt,choices);}
    else if(type==='mole'){const b=document.createElement('button');b.className='practice-target';b.textContent='🐹';let count=0;b.onclick=()=>{count++;status.textContent=count<3?'좋아요! '+count+'마리 잡았어요.':'연습 성공! 나타난 두더지를 누르면 돼요.';if(count>=3){b.textContent='✓';b.disabled=true;}else b.style.transform='translate('+(Math.random()*90-45)+'px,'+(Math.random()*28-14)+'px)';};stage.append(b);}
    else if(type==='ufo'){const b=document.createElement('button');b.className='practice-target practice-ufo';b.textContent='🛸';let count=0;b.onclick=()=>{count++;status.textContent=count<3?'명중! UFO를 한 번 더 눌러보세요.':'연습 성공! 아군 드론은 누르면 안 돼요.';if(count>=3){b.textContent='💥';b.disabled=true;}else b.style.transform='translate('+(Math.random()*100-50)+'px,'+(Math.random()*30-15)+'px)';};stage.append(b);}
    else if(type==='rapid'){const b=document.createElement('button');b.className='practice-wide practice-rapid';let count=0;b.textContent='여기를 빠르게 눌러요 · 0번';b.onclick=()=>{count++;b.textContent='여기를 빠르게 눌러요 · '+count+'번';status.textContent=count<7?'계속 빠르게 눌러보세요!':'연습 성공! 실제 게임은 10초 동안 눌러요.';if(count>=7){b.disabled=true;b.classList.add('correct');}};stage.append(b);}
    else if(type==='rps')addChoices('<span class="practice-symbol">✊</span><small>바위를 이기는 패를 골라요.</small>',['가위 ✌️','바위 ✊','보 ✋'],2,'성공! 보는 바위를 이겨요.','정답은 보예요. 보는 바위를 이겨요!');
    else if(type==='color')addChoices('<span class="practice-color-word">파랑</span><small>글자가 아니라 보이는 색을 골라요.</small>',['파랑','빨강'],1,'성공! 글자는 파랑이지만 보이는 색은 빨강이에요.','보이는 글자 색은 빨강이에요!');
    else if(type==='arrow')addChoices('<span class="practice-arrow">→</span><small>빨간 테두리면 반대로 골라요.</small>',['← 왼쪽','오른쪽 →'],0,'성공! 빨간 테두리라 반대인 왼쪽이에요.','빨간 테두리일 때는 반대인 왼쪽이에요!');
    else if(type==='nonsense')addChoices('<strong>세상에서 가장 뜨거운 과일은?</strong><small>보기 중 하나를 골라요.</small>',['사과','천도복숭아'],1,'정답! 천 도(1000℃) 복숭아예요.','정답은 천 도(1000℃) 복숭아예요!');
    else return null;
    return box;
  }
  // Fixed teaching board from the example: no timer, RNG, score, or game state changes.
  function minesPractice(){
    const base=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,1,2,3,3,null,null,0,0,0,1,1,1,0,0,0,0,0,0];
    const bombs=[13,14,15,22],safe=[12,16,23];
    const lessons=[
      {title:'숫자 3은 무슨 뜻일까요?',text:'빨간 3 주변에 폭탄이 3개 있다는 뜻이에요. 위·아래·옆·대각선까지 살펴봐요. 숫자가 적힌 칸 자체는 안전해요.',focus:20,targets:[13,14,15],kind:'look',hint:'3 바로 위의 노란 세 칸을 찾아보세요. 다른 주변 칸은 이미 열려 있어요.'},
      {title:'남은 세 칸이 모두 폭탄이에요',text:'주변 폭탄은 3개인데, 안 열린 칸도 딱 3개예요. 그래서 그 세 칸은 모두 폭탄! 위에서 3번째 줄의 2·3·4번째 칸이에요.',focus:20,targets:[13,14,15],kind:'flag',hint:'테두리가 빛나는 세 칸을 톡 눌러 깃발을 꽂아보세요. 실제 게임에서는 꾹 눌러요.'},
      {title:'숫자 1 옆에도 하나 있어요',text:'아래쪽 파란 1 세 개 중 맨 왼쪽 1을 보세요. 주변에서 안 열린 칸은 오른쪽 위 한 칸뿐! 여기가 폭탄이에요.',focus:27,targets:[22],kind:'flag',hint:'위에서 4번째 줄, 왼쪽에서 5번째 칸을 톡 눌러 깃발을 꽂아보세요.'},
      {title:'이제 안전한 칸을 열어요',text:'초록 2와 오른쪽 빨간 3, 맨 오른쪽 파란 1은 주변 폭탄을 모두 찾았어요. 그러면 그 숫자 옆에 남은 칸은 안전해요.',focus:19,targets:safe,kind:'safe',hint:'초록 테두리 세 칸을 톡 눌러보세요. 3번째 줄의 1·5번째 칸과 4번째 줄의 6번째 칸이에요.'},
      {title:'숫자 → 깃발 → 안전한 칸!',text:'이 예시에서는 폭탄 4칸과 안전한 3칸을 찾았어요. 나머지 노란 칸은 아직 몰라요. 실제 게임에서는 안전한 칸을 열어 나온 새 숫자가 다음 힌트예요.',focus:-1,targets:[],kind:'done',hint:'이 연습의 체크 표시는 안전하다는 뜻이에요. 실제 게임에서는 숫자나 빈칸이 나와요.'}
    ];
    const box=document.createElement('section');box.className='guide-practice mines-lesson';
    box.innerHTML='<h3>그림으로 같이 풀어봐요</h3><p>시간 제한 없는 예시예요. 연습 점수는 기록에 들어가지 않아요.</p><div class="mines-lesson-heading" aria-live="polite"><small class="mines-lesson-count"></small><h4></h4><p class="mines-lesson-copy"></p></div><div class="mines-example-board" role="group" aria-label="지뢰찾기 예시판, 6줄 6칸"></div><p class="mines-legend">노란 칸: 아직 모름 · 🚩: 폭탄 · ✓: 안전</p><p class="mines-lesson-hint"></p><p class="practice-status" role="status"></p><div class="mines-lesson-actions"><button type="button" class="mines-prev">이전</button><button type="button" class="mines-next">다음 설명 →</button></div><details class="mines-extra"><summary>실제 게임에서는 이렇게 눌러요</summary><p>안전한 칸은 톡, 폭탄인 칸은 꾹 눌러요. 깃발을 잘못 꽂았다면 다시 꾹 눌러 빼요. 깃발 모드를 켜면 톡 눌러도 깃발이 생겨요. 칸을 열 때는 깃발 모드를 꺼주세요.</p><p>익숙해지면: 숫자만큼 깃발을 올바른 자리에 꽂은 뒤 그 숫자를 톡 누르면, 주변의 나머지 칸이 한 번에 열려요. 깃발 위치가 틀리면 폭탄이 터질 수 있어요.</p></details>';
    let step=0,chosen=new Set();const board=$('.mines-example-board',box),status=$('.practice-status',box);
    function draw(){
      const lesson=lessons[step];$('.mines-lesson-count',box).textContent=(step+1)+' / '+lessons.length;
      $('h4',box).textContent=lesson.title;$('.mines-lesson-copy',box).textContent=lesson.text;$('.mines-lesson-hint',box).textContent=lesson.hint;
      $('.mines-prev',box).disabled=step===0;$('.mines-next',box).textContent=step===4?'처음부터 보기 ↻':'다음 설명 →';board.replaceChildren();
      base.forEach((value,i)=>{
        const cell=document.createElement('button');cell.type='button';cell.className='mines-example-cell';
        const flagged=(step>=2&&bombs.slice(0,3).includes(i))||(step>=3&&i===22)||(lesson.kind==='flag'&&chosen.has(i));
        const opened=(step===4&&safe.includes(i))||(lesson.kind==='safe'&&chosen.has(i));
        cell.classList.toggle('is-closed',value===null&&!opened);cell.classList.toggle('is-focus',i===lesson.focus);cell.classList.toggle('is-target',lesson.targets.includes(i));cell.classList.toggle('is-safe',opened||lesson.kind==='safe'&&lesson.targets.includes(i));
        cell.dataset.number=value||'';cell.textContent=flagged?'🚩':opened?'✓':value||'';
        cell.setAttribute('aria-label',(Math.floor(i/6)+1)+'번째 줄 '+(i%6+1)+'번째 칸, '+(flagged?'폭탄 깃발':opened?'안전한 칸':value===null?'아직 안 열린 칸':value?'숫자 '+value:'열린 빈칸'));
        cell.onclick=()=>{
          if(lesson.kind==='look'){status.textContent='숫자 칸도, 이미 열린 빈칸도 안전해요. 아직 모르는 곳은 노란 칸이에요.';return;}
          if(lesson.kind==='done'){status.textContent='안전한 칸을 모두 열면 한 판 성공! 이제 설명을 닫고 게임에서 해보세요.';return;}
          if(!lesson.targets.includes(i)){status.textContent='이번에는 테두리가 빛나는 칸을 살펴봐요. 다른 노란 칸은 아직 누르지 않아도 돼요.';return;}
          chosen.add(i);draw();board.children[i].focus({preventScroll:true});
          status.textContent=chosen.size===lesson.targets.length?(lesson.kind==='flag'?'잘했어요! 폭탄 자리에 깃발을 모두 꽂았어요.':'성공! 안전한 세 칸을 모두 찾았어요.'):(lesson.kind==='flag'?'맞아요! 여기에는 폭탄이 있어요. 남은 칸도 찾아봐요.':'맞아요! 여기는 안전한 칸이에요.');
        };board.append(cell);
      });
    }
    $('.mines-prev',box).onclick=()=>{step=Math.max(0,step-1);chosen=new Set();status.textContent='';draw();};
    $('.mines-next',box).onclick=()=>{step=(step+1)%lessons.length;chosen=new Set();status.textContent='';draw();};draw();return box;
  }
  function openGuide(automatic){const guide=managedGuide();if(!guide)return;let dialog=document.getElementById('gameGuideDialog');if(dialog)dialog.remove();dialog=document.createElement('dialog');dialog.id='gameGuideDialog';dialog.className='guide-dialog';const sheet=document.createElement('div');sheet.className='guide-sheet';const head=document.createElement('div');head.className='guide-sheet-head';head.innerHTML='<span class="guide-sheet-icon" aria-hidden="true"></span><div><small>게임 방법</small><h2></h2></div><button class="guide-sheet-close" aria-label="닫기">×</button>';$('.guide-sheet-icon',head).textContent=guide.icon||'🐣';$('h2',head).textContent=guide.title||'같이놀자';const rule=document.createElement('p');rule.className='guide-rule';rule.textContent=guide.rule||'화면에 나온 순서대로 해보세요.';const list=document.createElement('ol');list.className='guide-three';(guide.steps||['먼저 하기','카톡 보내기','같이 보기']).slice(0,3).forEach((step,index)=>{const li=document.createElement('li');li.innerHTML='<b>'+(index+1)+'</b>';li.append(document.createTextNode(step));list.append(li);});const tip=document.createElement('p');tip.className='guide-tip';tip.textContent=guide.tip||'천천히 따라 하면 어렵지 않아요.';const actions=document.createElement('div');actions.className='guide-actions';actions.innerHTML='<button class="guide-close">설명 닫기</button><button class="guide-start">바로 시작하기</button>';sheet.append(head,rule,list,tip);const practice=practiceBox(guide.practice,slug());if(practice)sheet.append(practice);sheet.append(actions);dialog.append(sheet);document.body.append(dialog);$('.guide-sheet-close',dialog).onclick=$('.guide-close',dialog).onclick=()=>close(dialog);$('.guide-start',dialog).onclick=()=>{close(dialog);const action=firstAction();if(action){action.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>action.focus({preventScroll:true}),350);}};dialog.addEventListener('cancel',event=>{event.preventDefault();close(dialog);});dialog.showModal();document.documentElement.classList.add('guide-dialog-open');if(automatic)markSeen();}
  function gameHelp(){const key=slug();if(key==='home'||key==='psychology'||!managedGuide())return;
    /* init 은 DOMContentLoaded 와 app-config-ready(캐시본·게시본) 때 여러 번 불린다. 버튼은 한 번만 만든다.
       설명 내용은 버튼을 누르는 순간 managedGuide() 로 다시 읽으므로 나중에 온 설정도 그대로 반영된다. */
    if(document.querySelector('.guide-help-button'))return;const button=document.createElement('button');button.type='button';button.className='guide-help-button';button.textContent='게임 방법';button.onclick=()=>openGuide(false);const steps=document.querySelector('.game-steps,.rps-steps,.steps');if(steps)steps.after(button);else{const header=document.querySelector('.game-header,.rps-header,.topbar');if(header)header.after(button);else document.querySelector('main').prepend(button);}
    if(entry()==='invite'){const note=document.createElement('div');note.className='guide-invite-note';note.innerHTML='<strong>친구가 같이 하자고 보냈어요!</strong>같은 놀이를 끝내면 두 사람의 결과가 함께 보여요.';button.after(note);}
    if(key==='mines' && new URLSearchParams(location.search).get('guide')==='1')openGuide(false);
    // 첫 방문 자동 설명창은 사용자 요청(2026-09-12)으로 끈다. 게임 화면에 이미 규칙이 있고, 필요하면 '게임 방법' 버튼으로 연다.
  }
  function init(){gameHelp();}
  window.addEventListener('app-config-ready',()=>{if(document.readyState!=='loading')init();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.GatchiHelp={open:openGuide};
})();
