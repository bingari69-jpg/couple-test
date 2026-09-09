(function () {
  'use strict';
  // v2 invitations contain one selected option per question, rather than a ranking.
  const PACKS = [
    {name:'소소한 일상',icon:'🌿',questions:[
      ['아무 약속 없는 휴일,\n가장 하고 싶은 건?', [['🛌','늦잠 자기'],['🍜','맛집 가기'],['🌳','산책하기']]],
      ['지친 하루 끝,\n가장 기분 좋아지는 건?', [['🛁','따뜻한 샤워'],['🍰','맛있는 간식'],['📞','좋아하는 사람과 수다']]],
      ['갑자기 하루가 생겼어!\n가장 하고 싶은 건?', [['🚆','즉흥 여행'],['🧹','집 정리'],['🛍️','쇼핑']]]]},
    {name:'우리 데이트',icon:'💌',questions:[
      ['함께 보내는 주말,\n가장 하고 싶은 데이트는?', [['🍽️','맛집 탐방'],['🎡','놀이공원'],['🏠','집에서 뒹굴뒹굴']]],
      ['작은 선물을 받는다면,\n가장 설레는 선물은?', [['✉️','손편지'],['💐','꽃 한 다발'],['🎁','눈여겨본 물건']]],
      ['같이 여행을 간다면,\n가장 중요한 건?', [['🍱','맛있는 음식'],['🛏️','편안한 숙소'],['📸','멋진 사진']]]]},
    {name:'먹는 즐거움',icon:'🍡',questions:[
      ['오늘의 야식 후보!\n가장 먹고 싶은 건?', [['🍗','치킨'],['🍕','피자'],['🌶️','떡볶이']]],
      ['배불러도 디저트는 별개!\n가장 좋아하는 디저트는?', [['🍦','아이스크림'],['🍰','케이크'],['🍩','도넛']]],
      ['새로운 식당을 고를 때,\n가장 중요하게 보는 건?', [['😋','음식 맛'],['💰','합리적인 가격'],['🕯️','좋은 분위기']]]]},
  ];
  const $=id=>document.getElementById(id);
  let pack=0,round=0,mode='make',orders=[[],[],[]],challenge=null,result=null,shareUrl='',toastTimer;
  const track=(event,data)=>{if(window.track)window.track(event,data);};
  const name=(value,fallback)=>Array.from(String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,12).join('')||fallback;
  const encode=value=>btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const singleChoice=a=>Array.isArray(a)&&a.length===1&&Number.isInteger(a[0])&&a[0]>=0&&a[0]<3;
  const validOrders=a=>Array.isArray(a)&&a.length===3&&a.every(singleChoice);
  const validChallenge=c=>c&&c.v===2&&Number.isInteger(c.p)&&c.p>=0&&c.p<PACKS.length&&typeof c.n==='string'&&Array.from(c.n).length<=12&&validOrders(c.a);
  const validResult=r=>r&&validChallenge(r.c)&&typeof r.n==='string'&&Array.from(r.n).length<=12&&validOrders(r.g);
  function decode(value){
    if(!value||value.length>2048||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('link');
    return JSON.parse(decodeURIComponent(escape(atob(value.replace(/-/g,'+').replace(/_/g,'/')))));
  }
  function url(kind,value){return location.origin+location.pathname+'#'+kind+'='+encode(value);}
  function show(id){
    document.querySelectorAll('.screen').forEach(el=>{el.hidden=el.id!==id;});
    $('manualCopy').hidden=true;
    window.scrollTo({top:0,behavior:'instant'});
  }
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
  function renderPacks(){
    $('packs').replaceChildren();PACKS.forEach((p,i)=>{const b=document.createElement('button');b.className='pack';b.setAttribute('aria-pressed',String(i===pack));const icon=document.createElement('span');icon.textContent=p.icon;icon.setAttribute('aria-hidden','true');b.append(icon,document.createTextNode(p.name));b.onclick=()=>{pack=i;renderPacks();$('packs').children[i].focus();};$('packs').append(b);});
  }
  function renderChoices(focusIndex){
    const answers=orders[round];$('choices').replaceChildren();
    PACKS[pack].questions[round][1].forEach(([emoji,label],i)=>{
      const b=document.createElement('button'),rank=answers.indexOf(i)+1;b.className='choice';b.dataset.option=i;b.dataset.rank=rank;
      b.setAttribute('aria-pressed',String(rank>0));b.setAttribute('aria-label',label+(rank?' · 선택됨':''));
      const badge=document.createElement('span');badge.className='rank';badge.textContent=rank?'✓':'○';badge.setAttribute('aria-hidden','true');
      const art=document.createElement('span');art.className='emoji';art.textContent=emoji;art.setAttribute('aria-hidden','true');
      const text=document.createElement('span');text.className='option-label';text.textContent=label;b.append(badge,art,text);
      b.onclick=()=>{orders[round]=[i];renderChoices(i);};$('choices').append(b);
    });
    $('selection').textContent=answers.length?'골랐어! 다른 보기를 누르면 바꿀 수 있어.':'세 가지 중 하나만 골라줘.';
    $('next').disabled=answers.length!==1;
    if(focusIndex!==undefined)$('choices').children[focusIndex].focus({preventScroll:true});
  }
  function renderRound(){
    $('modeLabel').textContent=mode==='make'?'내 취향 정하는 중':challenge.n+'님의 취향 맞히는 중';
    $('progressText').textContent=(round+1)+' / 3';$('progressBar').style.width=((round+1)/3*100)+'%';
    $('questionTag').textContent=PACKS[pack].icon+' '+PACKS[pack].name;
    $('question').textContent=PACKS[pack].questions[round][0];
    $('instruction').textContent=mode==='make'?'네가 가장 좋아하는 것 하나만 골라줘.':challenge.n+'님이 가장 좋아할 것 하나만 골라줘.';
    $('next').textContent=round===2?(mode==='make'?'이 선택으로 도전장 만들기 →':'정답 열어보기 →'):'다음 취향 →';
    $('previous').textContent=round===0?'← 처음으로':'← 이전 취향';show('play');renderChoices();$('question').focus({preventScroll:true});
  }
  function startGuess(){mode='guess';pack=challenge.p;round=0;orders=[[],[],[]];renderRound();}
  function makeChallenge(){
    challenge={v:2,p:pack,n:name($('makerName').value,'친구'),a:orders.map(a=>a.slice())};
    shareUrl=url('c',challenge);$('shareSummary').textContent=challenge.n+'님의 '+PACKS[pack].name+' · 3문제';
    show('share');track('link_made');
  }
  function renderResult(){
    const c=result.c;pack=c.p;
    const hits=c.a.reduce((sum,a,q)=>sum+a.filter((v,i)=>v===result.g[q][i]).length,0);
    $('resultTitle').textContent=hits===3?'내 취향, 다 알고 있었네!':hits>=2?'우리, 제법 통했는데?':'아직 알아갈 취향이 많아!';
    $('resultNames').textContent=result.n+'님이 예상한 '+c.n+'님의 취향';
    $('score').replaceChildren(document.createTextNode(String(hits)));const total=document.createElement('small');total.textContent=' / 3';$('score').append(total);
    $('scoreNote').textContent=hits===3?'세 문제 모두 맞혔어!':'세 문제 중 '+hits+'문제 정답!';$('comparisons').replaceChildren();
    PACKS[c.p].questions.forEach(([question,options],q)=>{
      const article=document.createElement('article');article.className='comparison';const title=document.createElement('h2');title.textContent=question;article.append(title);
      const head=document.createElement('div');head.className='compare-head';[c.n+'님의 선택',result.n+'님의 예상'].forEach(s=>{const el=document.createElement('span');el.textContent=s;head.append(el);});article.append(head);
      const actual=c.a[q][0],guess=result.g[q][0],row=document.createElement('div');row.className='compare-row'+(actual===guess?' match':'');[actual,guess].forEach(v=>{const span=document.createElement('span');span.textContent=options[v].join(' ');row.append(span);});article.append(row);
      const note=document.createElement('p');note.className='compare-insight';
      note.textContent=actual===guess?'✓ 정확히 맞혔어!':'이건 의외지? 가장 좋아하는 건 '+options[actual][1]+'!';
      article.append(note);$('comparisons').append(article);
    });shareUrl=url('r',result);show('result');$('resultTitle').focus({preventScroll:true});
  }
  function finish(){
    result={c:challenge,n:name($('guestName').value,'도전자'),g:orders.map(a=>a.slice())};
    try{sessionStorage.setItem('ranking:'+location.hash,JSON.stringify(result));}catch(e){}
    renderResult();track('responded');
  }
  async function copy(kind){
    try{if(!navigator.clipboard)throw Error('clipboard');await navigator.clipboard.writeText(shareUrl);toast('링크를 복사했어. 카톡에 붙여넣어줘!');track(kind+'_shared',{method:'copy'});}
    catch(e){$('manualCopy').hidden=false;$('shareUrl').value=shareUrl;$('shareUrl').focus();$('shareUrl').select();$('manualCopy').scrollIntoView({block:'center'});}
  }
  async function share(kind){
    const button=kind==='invite'?$('sendInvite'):$('sendResult');button.disabled=true;
    const options={title:kind==='invite'?challenge.n+'님의 취향 맞혀봐':result.n+'님이 내 취향을 맞혀봤어!',desc:kind==='invite'?PACKS[challenge.p].name+' 세 문제. 보기 세 개 중 내가 가장 좋아하는 것 하나를 맞혀봐!':'내 선택과 친구의 예상을 나란히 확인해봐.',url:shareUrl,btn:kind==='invite'?'취향 맞히기':'결과 보기',textOnly:false};
    try{if(window.kakaoShare){const ok=await window.kakaoShare(options,()=>copy(kind));if(ok)track(kind+'_shared',{method:'kakao'});}else await copy(kind);}
    catch(e){await copy(kind);}finally{button.disabled=false;}
  }
  function fresh(){history.replaceState(null,'',location.pathname);challenge=result=null;orders=[[],[],[]];round=0;mode='make';shareUrl='';renderPacks();show('intro');}
  function route(){
    if(!location.hash){renderPacks();show('intro');return;}
    try{
      const match=location.hash.match(/^#([cr])=([A-Za-z0-9_-]+)$/);if(!match)throw Error('link');const payload=decode(match[2]);
      if(match[1]==='r'){if(!validResult(payload))throw Error('result');result=payload;renderResult();return;}
      if(!validChallenge(payload))throw Error('challenge');challenge=payload;pack=challenge.p;
      try{const saved=JSON.parse(sessionStorage.getItem('ranking:'+location.hash)||'null');if(validResult(saved)&&JSON.stringify(saved.c)===JSON.stringify(challenge)){result=saved;renderResult();return;}}catch(e){}
      $('hostName').textContent=challenge.n;$('invitePack').textContent=PACKS[pack].icon+' '+PACKS[pack].name+' · 3문제 · 정답은 마지막에 공개';show('invite');
    }catch(e){show('invalid');}
  }
  $('start').onclick=()=>{mode='make';round=0;orders=[[],[],[]];renderRound();};$('guessStart').onclick=startGuess;
  $('next').onclick=()=>{if(orders[round].length!==1)return;if(round<2){round++;renderRound();}else if(mode==='make')makeChallenge();else finish();};
  $('previous').onclick=()=>{if(round>0){round--;renderRound();}else show(mode==='make'?'intro':'invite');};
  $('edit').onclick=()=>{mode='make';round=0;orders=challenge.a.map(a=>a.slice());shareUrl='';renderRound();};
  $('sendInvite').onclick=()=>share('invite');$('sendResult').onclick=()=>share('result');$('copyInvite').onclick=()=>copy('invite');$('copyResult').onclick=()=>copy('result');
  $('newGame').onclick=()=>{track('replay');$('makerName').value=result.n==='도전자'?'':result.n;fresh();};$('invalidNew').onclick=fresh;
  $('closeCopy').onclick=()=>{$('manualCopy').hidden=true;};window.addEventListener('hashchange',route);route();
})();
