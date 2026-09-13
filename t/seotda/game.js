(function () {
  'use strict';
  const R = window.Seotda, $ = id => document.getElementById(id);
  let state = R.create(), helpTrigger = null;
  const names = ['','솔','매화','벚꽃','등꽃','난초','모란','싸리','억새','국화','단풍'];
  const flower = (x,y,color,size=1) => '<g transform="translate('+x+' '+y+') scale('+size+')" fill="'+color+'"><circle cy="-6" r="6"/><circle cx="6" cy="-1" r="6"/><circle cx="4" cy="6" r="6"/><circle cx="-4" cy="6" r="6"/><circle cx="-6" cy="-1" r="6"/><circle r="3" fill="#e1b862"/></g>';
  const leaf = (x,y,color,rotation=0) => '<path transform="translate('+x+' '+y+') rotate('+rotation+')" d="M0 0 Q-18-18 0-31 Q18-18 0 0Z" fill="'+color+'"/>';
  function artwork(c) {
    const m = c.month, v = c.id % 2;
    let art = '';
    if (m === 1) art = '<circle cx="66" cy="42" r="16" fill="#df7052"/><path d="M24 120Q48 77 27 38M35 81L66 70" fill="none" stroke="#584436" stroke-width="7"/>' + [ [25,42],[43,67],[65,72],[23,91] ].map(([x,y]) => '<path d="M'+(x-19)+' '+y+'Q'+x+' '+(y-31)+' '+(x+19)+' '+y+'Z" fill="#355e47" stroke="#264c3b" stroke-width="2"/>').join('');
    if (m === 2) art = '<path d="M15 120Q27 75 75 30M38 74L17 43" fill="none" stroke="#594331" stroke-width="5"/>' + flower(27,47,'#bd493d',.85) + flower(62,52,'#ce5d50',1) + flower(42,82,'#e3a59a',.8) + '<ellipse cx="59" cy="94" rx="12" ry="7" fill="#797b4c"/><circle cx="69" cy="89" r="6" fill="#797b4c"/><path d="M75 88L83 91L75 93M49 95L33 101L43 89" fill="#9d743c"/><circle cx="70" cy="88" r="1.5" fill="#282b20"/>';
    if (m === 3) art = '<path d="M7 50Q40 53 83 25M51 45L73 70" stroke="#684837" stroke-width="4" fill="none"/>' + flower(25,51,'#f0b5ae') + flower(49,42,'#dd948e',.9) + flower(69,63,'#f0b5ae',.8) + '<path d="M8 100Q45 76 82 100V127H8Z" fill="#bc4940"/><path d="M11 103Q45 83 79 103" fill="none" stroke="#edd5b1" stroke-width="4"/><path d="M28 98V125M47 94V125M65 99V125" stroke="#e6b698" stroke-width="2"/>';
    if (m === 4) art = '<path d="M8 38Q46 23 82 38M17 31L13 88M40 30L43 81M67 33L65 100" fill="none" stroke="#49634a" stroke-width="3"/>' + [ [15,49],[40,46],[66,57] ].map(([x,y]) => [0,1,2,3,4].map(i => '<ellipse cx="'+(x+(i%2)*3)+'" cy="'+(y+i*8)+'" rx="'+(9-i)+'" ry="6" fill="'+(i%2?'#9e8baf':'#776487')+'"/>').join('')).join('');
    if (m === 5) art = '<path d="M24 124Q11 90 17 60Q32 84 31 124M40 124Q34 90 45 53Q53 93 46 124M58 124Q61 94 75 74Q74 111 65 124" fill="#50674b"/>' + flower(28,67,'#7671a1',.9) + flower(57,87,'#8a7da8') + '<path d="M9 117Q36 103 82 114" fill="none" stroke="#99744d" stroke-width="6"/>';
    if (m === 6) art = leaf(31,108,'#466747',-35) + leaf(62,105,'#698151',30) + flower(30,65,'#ba5549',1.5) + flower(61,88,'#d78278',1.2) + '<path d="M67 38Q46 25 56 49Q39 60 66 54Q88 66 79 48Q89 26 67 38" fill="#dbb860"/><path d="M67 38V55" stroke="#72533c" stroke-width="2"/>';
    if (m === 7) art = '<path d="M12 124Q34 71 26 37M42 124Q65 80 74 40" fill="none" stroke="#657545" stroke-width="3"/>' + [ [24,56],[35,82],[62,67],[68,46],[51,96] ].map(([x,y]) => flower(x,y,'#c7909a',.6)).join('') + '<ellipse cx="38" cy="111" rx="24" ry="13" fill="#765c47"/><path d="M57 104L73 111L68 120H46M20 116V128M45 116V129" fill="#765c47" stroke="#765c47" stroke-width="3"/><circle cx="61" cy="110" r="1.5" fill="#fff2dd"/>';
    if (m === 8) art = '<circle cx="58" cy="47" r="22" fill="#d98857"/><path d="M7 109Q40 43 83 107V132H7Z" fill="#3e4e47"/><path d="M5 125Q47 82 85 128" fill="#69745b"/>' + [14,24,64,76].map(x => '<path d="M'+x+' 128L'+(x-5)+' 81M'+(x-5)+' 82L'+(x-12)+' 77M'+(x-5)+' 85L'+x+' 76" stroke="#b6b091" stroke-width="1.4" fill="none"/>').join('');
    if (m === 9) art = leaf(32,114,'#526a47',-27) + leaf(61,96,'#718250',40) + flower(30,62,'#dbac53',1.4) + flower(63,51,'#e9c982',1) + '<path d="M41 95H80L74 113H48Z" fill="#aa4c3b"/><ellipse cx="61" cy="95" rx="19" ry="4" fill="#ebce9d"/><path d="M52 116H70" stroke="#aa4c3b" stroke-width="3"/>';
    if (m === 10) art = '<path d="M14 103L55 36M38 66L80 52" stroke="#66503b" stroke-width="4" fill="none"/>' + [ [25,49],[55,44],[72,62] ].map(([x,y]) => '<path transform="translate('+x+' '+y+')" d="M0 13L-6 3L-15 0L-8-5L-9-13L-1-8L3-19L8-7L16-8L12 0L17 5L6 7Z" fill="#bb5f42"/>').join('') + '<ellipse cx="40" cy="104" rx="19" ry="10" fill="#b48a52"/><path d="M52 104L62 83L70 86L62 111H49M27 108L24 128M46 110L51 128" fill="#b48a52" stroke="#b48a52" stroke-width="3"/><path d="M63 84L61 73L57 72M66 84L73 74L79 74" stroke="#705a3b" stroke-width="2" fill="none"/>';
    if (v && [1,2,4,5,6,7,9,10].includes(m)) art += '<path d="M16 46L30 41L47 93L33 91L29 104Z" fill="'+([6,9,10].includes(m)?'#535f80':'#b7493e')+'" opacity=".94"/><path d="M23 50L34 82" stroke="#f8e8c9" stroke-width="1"/>';
    return art;
  }
  function card(c) {
    return '<svg class="hwatu" viewBox="0 0 90 142" aria-hidden="true"><rect x="1" y="3" width="88" height="139" rx="7" fill="#162e26" opacity=".38"/><rect x="1" y="1" width="88" height="138" rx="7" fill="#ffedce" stroke="#dec6a4" stroke-width="1.5"/><rect x="6" y="6" width="78" height="127" rx="3" fill="#fbf3df" stroke="#dfc8a6" stroke-width=".8"/>'+artwork(c)+'<rect x="7" y="7" width="25" height="24" rx="3" fill="#fcf4e2"/><text x="19.5" y="25" text-anchor="middle" fill="#513b2b" font-family="serif" font-weight="bold" font-size="21">'+c.month+'</text><rect x="6" y="121" width="78" height="12" fill="#314d3e"/><text x="45" y="130" text-anchor="middle" fill="#f5e3c3" font-family="sans-serif" font-size="8" letter-spacing="4">'+names[c.month]+'</text>'+(c.bright?'<rect x="60" y="8" width="22" height="24" rx="3" fill="#b54c3c"/><text x="71" y="25" text-anchor="middle" fill="#fff4d7" font-family="serif" font-size="17">光</text>':'')+'</svg>';
  }
  const label = c => c.month + '월 ' + names[c.month] + (c.bright ? ' 광' : '');
  const back = () => '<div class="card-back" role="img" aria-label="아직 공개하지 않은 패"><span aria-hidden="true">三</span></div>';
  const shown = c => '<div role="img" aria-label="'+label(c)+'">'+card(c)+'</div>';
  const signed = n => (n > 0 ? '+' : '') + n;
  function playerRank() { return R.rank(R.pair(state.hands[0],state.discards[0])); }
  function copyBlock(title, text, pill) {
    return '<div class="action-copy">'+(pill?'<span class="hand-pill">'+pill+'</span>':'')+'<h2 id="actionTitle" tabindex="-1">'+title+'</h2><p>'+text+'</p></div>';
  }
  function resultReason(s) {
    const a = playerRank().name, b = R.rank(R.pair(s.hands[1],s.discards[1])).name;
    if (s.result.reason === 'player-fold') return '이번 판은 다이. 내가 건 '+s.bets[0]+'칩을 잃었어요.';
    if (s.result.reason === 'bot-fold') return '곰 사장이 다이! 상대가 건 '+s.bets[1]+'칩을 얻었어요.';
    if (s.result.winner === -1) return '내 '+a+' · 상대 '+b+'. 같은 순위라 건 칩을 돌려받았어요.';
    return '내 '+a+' · 상대 '+b+'.<br><b>'+(s.result.winner === 0 ? a : b)+'</b>가 더 센 패예요.';
  }
  function resultActions() {
    const s = state, finished = R.over(s), delta = s.result.delta;
    const winner = finished ? Math.sign(s.banks[0]-s.banks[1]) : s.result.winner === -1 ? 0 : s.result.winner === 0 ? 1 : -1;
    const title = finished ? winner > 0 ? '이번 한판, 내가 이겼다!' : winner < 0 ? '이번엔 곰 사장의 승리' : '끝까지 팽팽한 무승부!' : s.result.winner === 0 ? '좋아, 이번 판은 내 것!' : s.result.winner === 1 ? '다음 판을 노려볼까?' : '같은 패의 힘, 무승부!';
    return '<div class="result-box '+(winner>0?'win':winner<0?'loss':'')+'"><span class="result-kicker">'+(finished?'한판 끝 · '+s.round+'라운드 진행':s.round+'라운드 결과')+'</span><h2 id="actionTitle" tabindex="-1">'+title+'</h2><div class="result-delta '+(delta<0?'negative':'')+'">'+signed(delta)+'칩</div><p>'+resultReason(s)+'</p>'+(finished?'<div class="final-score">최종 칩 &nbsp; <b>나 '+s.banks[0]+'</b> : 곰 사장 '+s.banks[1]+'<br>처음보다 '+signed(s.banks[0]-R.START)+'칩</div>':'')+'<details class="revealed-discards"><summary>서로 버린 패도 보기 ⌄</summary><div class="discarded-cards"><div role="img" aria-label="내가 버린 '+label(s.hands[0][s.discards[0]])+'">'+card(s.hands[0][s.discards[0]])+'<span>나</span></div><div role="img" aria-label="곰 사장이 버린 '+label(s.hands[1][s.discards[1]])+'">'+card(s.hands[1][s.discards[1]])+'<span>곰 사장</span></div></div></details><button class="primary" id="'+(finished?'replay':'nextRound')+'">'+(finished?'100칩으로 다시 한판':'다음 라운드 · '+(s.round+1)+' / '+R.ROUNDS)+' <span aria-hidden="true">→</span></button></div>';
  }
  function actionMarkup() {
    const s = state;
    if (s.phase === 'discard') {
      const selected = s.discards[0] >= 0, rank = selected ? playerRank() : null;
      return copyBlock(selected ? rank.name+'를 남길까요?' : '버릴 한 장을 골라주세요',selected ? rank.detail : '패를 누르면 남길 두 장의 족보가 보여요.',selected?'한 장 버리고, 두 장으로 승부':'1 · 패 고르기')+'<button class="primary" id="confirmDiscard" '+(selected?'':'disabled')+'>'+(selected?label(s.hands[0][s.discards[0]])+' 버리고 확정':'위에서 버릴 패를 눌러주세요')+'</button>';
    }
    if (s.phase === 'bet') {
      const left = s.cap - s.bets[0], all = s.cap === s.startBanks[0];
      let buttons = '';
      for (const increment of [10,20]) if (increment < left) buttons += '<button data-bet="'+(s.bets[0]+increment)+'">'+increment+'칩 더<small>내가 건 칩 총 '+(s.bets[0]+increment)+'</small></button>';
      if (left > 0) buttons += '<button class="all-in" data-bet="'+s.cap+'">'+(all?'올인':'최대')+' · '+left+'칩<small>'+(all?'남은 칩 모두 걸기':'상대가 낼 수 있는 만큼')+'</small></button>';
      return copyBlock('얼마나 자신 있어요?',playerRank().detail,'내 패 · '+playerRank().name)+(buttons?'<div class="bet-grid">'+buttons+'</div>':'')+'<button class="primary bet-primary" data-bet="'+s.bets[0]+'">'+(left > 0?'체크 · 더 걸지 않고 승부':'패 열고 승부하기')+'</button><button class="fold-button" id="fold">다이 · '+s.bets[0]+'칩 내고 포기</button><p class="bet-note">곰 사장이 더 올리면 콜 또는 다이로 결정해요.</p>';
    }
    if (s.phase === 'response') {
      const cost = s.bets[1]-s.bets[0];
      return copyBlock('곰 사장이 판돈을 올렸어요','나는 '+s.bets[0]+'칩, 상대는 '+s.bets[1]+'칩을 걸었어요.<br>'+cost+'칩을 더 내면 두 장을 열고 승부해요.','내 패 · '+playerRank().name)+'<button class="primary" id="call">콜 · '+cost+'칩 더 내고 승부</button><button class="fold-button" id="responseFold">다이 · 지금까지 건 '+s.bets[0]+'칩 포기</button>';
    }
    return resultActions();
  }
  function render() {
    const s = state, lobby = s.phase === 'lobby';
    $('lobby').hidden = !lobby; $('game').hidden = lobby;
    if (lobby) return;
    const result = s.phase === 'result';
    $('roundProgress').innerHTML = '<b>'+s.round+'</b> / '+R.ROUNDS+' 라운드<div class="round-dots" aria-hidden="true">'+Array.from({length:R.ROUNDS},(_,i)=>'<i class="'+(i+1 === s.round?'current':i+1 < s.round?'done':'')+'"></i>').join('')+'</div>';
    $('botBank').textContent = s.banks[1]; $('playerBank').textContent = s.banks[0];
    $('botLine').textContent = result ? '곰 사장 · '+R.rank(R.pair(s.hands[1],s.discards[1])).name : s.botLine;
    $('botCards').innerHTML = result ? R.pair(s.hands[1],s.discards[1]).map(shown).join('') : Array.from({length:s.phase === 'discard'?3:2},back).join('');
    $('botCards').setAttribute('aria-label',result?'컴퓨터의 패 · '+R.rank(R.pair(s.hands[1],s.discards[1])).name:'컴퓨터의 패 · 아직 비공개');
    $('potLabel').textContent = result ? s.result.winner === -1 ? '서로 나눠 가진 판돈' : s.result.winner === 0 ? '내가 가져온 판돈' : '곰 사장이 가져간 판돈' : '모인 판돈';
    $('pot').textContent = result ? s.result.pot : s.pot;
    $('betTotals').textContent = '나 '+s.bets[0]+' · 곰 사장 '+s.bets[1];
    $('handLabel').textContent = s.phase === 'discard' ? '내 패 · 버릴 한 장을 톡!' : '내 패 · '+playerRank().name;
    $('playerCards').innerHTML = s.phase === 'discard' ? s.hands[0].map((c,i)=>'<button data-discard="'+i+'" class="'+(s.discards[0] === i?'selected':'')+'" aria-pressed="'+(s.discards[0] === i)+'" aria-label="'+label(c)+' 버리기">'+card(c)+(s.discards[0] === i?'<span class="discard-tag" aria-hidden="true">버릴 패</span>':'')+'</button>').join('') : R.pair(s.hands[0],s.discards[0]).map(shown).join('');
    $('discardNote').textContent = s.discards[0] < 0 ? '세 장 중 한 장을 골라주세요' : (s.phase === 'discard'?'버릴 패 · ':'버린 패 · ')+label(s.hands[0][s.discards[0]]);
    $('actions').innerHTML = actionMarkup();
    $('history').hidden = !s.history.length; $('historyCount').textContent = s.history.length+'판';
    $('historyList').innerHTML = s.history.map(h=>'<li><span>'+h.round+'판</span><div>'+h.player+' <span aria-hidden="true">:</span> '+h.bot+'<small>'+(h.reason === 'bot-fold'?'곰 사장 다이':h.reason === 'player-fold'?'내가 다이':h.winner === -1?'무승부':'패 공개 승부')+'</small></div><b>'+signed(h.delta)+'칩</b></li>').join('');
  }
  function update(next, selection) {
    if (next === state) return;
    state = next; render();
    if (selection !== undefined) $('playerCards').querySelector('[data-discard="'+selection+'"]').focus({preventScroll:true});
    else if (state.phase === 'discard') { $('handLabel').tabIndex = -1; $('handLabel').focus({preventScroll:true}); $('game').scrollIntoView({block:'start'}); }
    else { $('actionTitle').focus({preventScroll:true}); $('actions').scrollIntoView({block:'nearest'}); }
  }
  $('start').addEventListener('click',()=>update(R.next(state)));
  $('game').addEventListener('click',event=>{
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.discard !== undefined) { const index = Number(button.dataset.discard); update(R.discard(state,index),index); }
    else if (button.dataset.bet !== undefined) update(R.bet(state,Number(button.dataset.bet)));
    else if (button.id === 'confirmDiscard') update(R.confirm(state));
    else if (button.id === 'fold') update(R.fold(state));
    else if (button.id === 'call') update(R.respond(state,'call'));
    else if (button.id === 'responseFold') update(R.respond(state,'fold'));
    else if (button.id === 'nextRound') update(R.next(state));
    else if (button.id === 'replay' && state.phase === 'result' && R.over(state)) update(R.next(R.create()));
  });
  function openHelp(event, ranks) {
    helpTrigger = event.currentTarget;
    $('helpDialog').showModal();
    if (ranks) { $('rankHeading').scrollIntoView({block:'center'}); $('rankHeading').focus({preventScroll:true}); }
    else { $('helpDialog').scrollTop = 0; $('helpClose').focus({preventScroll:true}); }
  }
  $('helpOpen').addEventListener('click',e=>openHelp(e,false));
  $('ranksOpen').addEventListener('click',e=>openHelp(e,true));
  $('tableRanks').addEventListener('click',e=>openHelp(e,true));
  $('helpClose').addEventListener('click',()=>$('helpDialog').close());
  $('helpDialog').addEventListener('close',()=>{if(helpTrigger)helpTrigger.focus({preventScroll:true});});
  $('heroCards').innerHTML = [R.deck()[0],R.deck()[3],R.deck()[14]].map(card).join('');
  render();
})();
