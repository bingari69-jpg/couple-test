(function(){
 'use strict';
 const D=window.MindSeriesData,E=window.MindSeriesEngine,slug=document.body.dataset.series,S=D.series[slug],app=document.getElementById('seriesApp');
 let storageUnavailable=false;
 const $=id=>document.getElementById(id),get=k=>{try{return JSON.parse(localStorage.getItem('mind-series:'+k)||'null');}catch{return null;}},put=(k,v)=>{try{localStorage.setItem('mind-series:'+k,JSON.stringify(v));return true;}catch{storageUnavailable=true;return false;}};
 const encode=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const event=(n,method)=>{if(window.track)window.track(n,{method:method||slug});};
 const clean=s=>Array.from(String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,12).join('')||'친구';
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn,cls='secondary',id)=>{const b=node('button',cls,text);b.type='button';b.onclick=fn;if(id)b.id=id;return b;};
 const paragraph=t=>node('p','series-copy',t);
 function start(title,kicker){app.replaceChildren();if(kicker)app.append(node('span','eyebrow',kicker));const h=node('h1','series-title',title);h.tabIndex=-1;app.append(h);h.focus({preventScroll:true});window.scrollTo(0,0);return app;}
 function sheet(title,body){const a=node('article','series-sheet');a.append(node('h2','',title));if(body)a.append(paragraph(body));return a;}
 function note(t){app.append(node('p','series-note',t));}
 function go(hash){history.replaceState(null,'',location.pathname+(hash||''));}
 function remember(k,v){if(!put(k,v))note('이 브라우저에서는 기기에 보관할 수 없어. 이어 보려면 링크를 복사해둬.');}
 let c=null,r=null,p=null,step=0,joining=false,episode=S.episodes[0]?.id,role=null,shareObject=null,drawSelection=-1;
 function nameField(){const label=node('label','','내 이름 · 선택, 12자까지');label.htmlFor='seriesName';const input=node('input');input.id='seriesName';input.maxLength=12;input.autocomplete='nickname';input.placeholder='친구가 알아볼 이름';try{input.value=localStorage.getItem('gh_name')||'';}catch{}app.append(label,input);return input;}
 function intro(){
  c=r=p=null;role=null;joining=false;shareObject=null;go('');start(S.hero,S.hint);
  app.append(paragraph(S.desc));const emblem=node('div','series-emblem',S.icon);emblem.setAttribute('aria-hidden','true');app.append(emblem);
  if(slug==='lucky'){fortuneIntro();return;}
  app.append(node('h2','section-heading',slug==='next-scene'?'오늘 나누고 싶은 이야기':'어떤 장면부터 해볼까?'));
  const chooser=node('details','episode-picker'),current=node('summary','',S.episodes.find(e=>e.id===episode).title+' · 바꾸기');chooser.append(current);
  const list=node('div','episode-list');for(const ep of S.episodes){const b=button(ep.title,()=>{episode=ep.id;current.textContent=ep.title+' · 바꾸기';chooser.open=false;for(const x of list.children)x.setAttribute('aria-pressed',String(x===b));},'episode');b.dataset.episode=ep.id;b.setAttribute('aria-pressed',String(ep.id===episode));list.append(b);}chooser.append(list);app.append(chooser);
  const input=nameField();app.append(button(slug==='next-scene'?'내 카드 한 장 고르기 →':'내 이야기부터 고르기 →',()=>{
   const bytes=new Uint32Array(3);crypto.getRandomValues(bytes);c={v:1,s:slug,e:episode,id:Array.from(bytes.slice(0,2),v=>v.toString(16).padStart(8,'0')).join(''),seed:bytes[2],p:null};
   p={n:clean(input.value),a:[],g:[]};try{localStorage.setItem('gh_name',p.n);}catch{}step=0;joining=false;event('game_started',episode);quiz();
  },'primary','beginSeries'));
  note(slug==='know-me'?'먼저 내 답 6개, 그다음 상대의 답 3개를 예상해. 내 결과는 바로 보고, 서로의 예상은 둘 다 답한 뒤 비교해.':slug==='next-scene'?'카드는 대화를 위한 상징 놀이야. 상대의 속마음이나 미래를 사실처럼 알아내는 검사는 아니야.':'정답이나 좋은 성격은 없어. 지금 내 마음에 가까운 것을 골라줘.');
  if(slug==='next-scene')savedTarots();
 }
 function questions(){
  const ep=E.ep(c),qs=ep.questions.map((q,i)=>({...q,kind:'a',index:i,kicker:slug==='living'?'함께 살면 생기는 장면':slug==='repair'?'내 화해 설명서':'내가 고르는 답'}));
  if(slug==='know-me')for(const i of E.guessQuestions)qs.push({...ep.questions[i],kind:'g',index:E.guessQuestions.indexOf(i),kicker:(joining?c.p.n:'상대')+'의 선택을 예상해봐',title:'상대라면? '+ep.questions[i].title});
  if(slug==='living'){
   const indexes=p.a.map((v,i)=>v===4?-1:i).filter(i=>i>=0);
   qs.push({title:'이 중 나에게 가장 중요한 장면 하나는?',options:indexes.length?indexes.map(i=>ep.questions[i].title):['지금은 고르지 않을래'],values:indexes.length?indexes:[-1],kind:'important',kicker:'다른 답 중에서도 더 이야기하고 싶은 것'});
   qs.push({title:'우리 집에 적용하는 데 내가 동의하는 규칙은?',options:[...E.rules[c.e],'아직 정하지 않고 이야기부터 할래'],values:[0,1,2,-1],kind:'rule',kicker:'내 동의만 표시돼. 상대도 같은 규칙을 골라야 둘의 동의야.'});
  }
  return qs;
 }
 function quiz(){
  if(slug==='next-scene'){drawTarot();return;}
  const qs=questions(),q=qs[step];start(q.title,q.kicker);const progress=node('div','series-progress');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','질문 진행');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(qs.length));progress.setAttribute('aria-valuenow',String(step));const bar=node('i');bar.style.width=(step/qs.length*100)+'%';progress.append(bar);app.append(progress,node('p','progress-caption',(step+1)+' / '+qs.length+' · '+E.ep(c).title));
  const options=node('div','series-options');options.setAttribute('role','group');options.setAttribute('aria-label','가까운 답 하나');options.id='seriesOptions';const value=q.kind==='a'||q.kind==='g'?p[q.kind][q.index]:p[q.kind];
  q.options.forEach((text,i)=>{const v=q.values?q.values[i]:i,b=button(text,()=>{if(q.kind==='a'||q.kind==='g')p[q.kind][q.index]=v;else p[q.kind]=v;for(const x of options.children)x.setAttribute('aria-pressed',String(x===b));$('seriesNext').disabled=false;},'series-option');b.setAttribute('aria-pressed',String(value===v));options.append(b);});app.append(options);
  const next=button(step===qs.length-1?(joining?'둘의 선택 함께 열기 →':'내 결과 확인하기 →'):'다음 장면 →',()=>{
   if(q.kind==='a'&&slug==='living'){p.important=undefined;p.rule=undefined;}
   if(step<qs.length-1){step++;quiz();}else finish();
  },'primary','seriesNext');next.disabled=value===undefined;app.append(next,button('← 이전',()=>{if(step){step--;quiz();}else if(joining)invitation();else intro();}));
  if(q.kind==='g')note('상대의 실제 답을 열기 전에 내 예상을 먼저 확정해. 예상과 같은 취향인지는 서로 다른 결과야.');
  if(c.e==='serious')note('편하지 않은 질문은 건너뛰어도 돼. 건너뛴 답은 비교에 포함하지 않아.');
 }
 function finish(){
  if(!E.person(p,c)){invalid();return;}
  if(joining){r={c,b:p,votes:[null,null]};role=1;put('reply:'+c.id,r);put('role:'+c.id,1);go('#r='+encode(r));event('responded',c.e);result();}
  else{c.p=p;put('own:'+c.id,c);put('role:'+c.id,0);go('#c='+encode(c));event('link_made',c.e);sealed();}
 }
 function ownCard(person,label){
  const ep=E.ep(c),box=sheet(label);
  if(slug==='know-me'){const t=E.profile(person.a,ep);box.append(node('div','result-animal',t.icon),node('h2','',t.title),paragraph(t.desc));t.evidence.forEach(i=>box.append(paragraph('“'+ep.questions[i].title+'”에서 ‘'+ep.questions[i].options[person.a[i]]+'’를 골랐어.')));box.append(node('small','','이번 에피소드의 선택을 붙인 별명이야. 정식 MBTI나 고정된 성격 유형은 아니야.'));}
  else if(slug==='repair'){
   [['서운한 지점',0],['겉으로 보이는 내 모습',1],['사실 바라는 반응',2],['대화를 다시 여는 신호',3]].forEach(([title,i])=>{box.append(node('h3','',title),paragraph(ep.questions[i].options[person.a[i]]));});
  }else if(slug==='living'){
   box.append(paragraph(person.important>=0?'내가 가장 중요하게 고른 장면: '+ep.questions[person.important].title:'지금은 민감한 질문을 모두 건너뛰었어.'));
   box.append(paragraph(person.rule>=0?'내가 동의한 규칙: '+E.rules[c.e][person.rule]:'규칙은 아직 정하지 않았어.'));
  }else if(slug==='next-scene')box.append(tarotFace(TarotDraw.layout(c.seed,'a')[person.a[0]],'내가 고른 카드'));
  return box;
 }
 function sealed(){
  r=null;role=0;start('내 이야기는 골랐어.\n이제 네 차례!',E.ep(c).title);app.append(ownCard(c.p,c.p.n+' · 먼저 고른 나'));
  if(slug==='repair')messageEditor(E.ep(c).questions[5].options[c.p.a[5]]);
  note('아래 초대를 보내줘. 친구가 답한 뒤 결과 링크를 답장해주면 나도 둘의 결과를 볼 수 있어.');
  share({title:S.title,desc:inviteCopy(),hash:'#c='+encode(c),btn:slug==='next-scene'?'나도 카드 고르기':'나도 답하기'},false);
  app.append(button('다른 에피소드 해보기',()=>{event('replay',c.e);intro();}));
 }
 function inviteCopy(){return slug==='next-scene'?{date:'우리 다음 데이트 카드 한 장 뽑았어. 너도 골라봐.',rhythm:'요즘 우리 리듬이 궁금해서 한 장 골랐어. 너도 골라봐.',message:'말 못 한 마음을 꺼낼 카드 한 장 골랐어. 너도 골라봐.'}[c.e]:S.invite;}
 function invitation(){
  start(c.p.n+'님이\n네 선택을 기다려.',E.ep(c).title);app.append(paragraph(inviteCopy()));
  note(slug==='know-me'?'너도 네 답 6개와 상대에 대한 예상 3개를 확정한 뒤 두 사람의 답이 열려.':'상대 결과는 네 선택을 마친 뒤 보여줄게. 먼저 지금 네 마음을 골라줘.');
  const input=nameField();app.append(button(slug==='next-scene'?'나도 한 장 고르기 →':'나도 답하고 함께 열기 →',()=>{p={n:clean(input.value),a:[],g:[]};joining=true;step=0;event('game_started','invited');quiz();},'primary','joinSeries'));
 }
 function result(){
  c=r.c;episode=c.e;const cached=get('result:'+c.id);
  // A newer local vote may enrich the same immutable pair, never a different pair with the same ID.
  if(E.result(cached)&&same(cached.c,c)&&same(cached.b,r.b)){r.votes=r.votes.map((v,i)=>v===null?cached.votes[i]:v);}
  start(slug==='next-scene'?'우리의 다음 장면':slug==='repair'?'두 사람의 화해 설명서':slug==='living'?'우리 집의 다음 장면':'네가 아는 나,\n내가 고른 나.',E.ep(c).title);
  if(slug==='next-scene')tarotResult();
  else{
   app.append(ownCard(c.p,c.p.n+' · 먼저 보낸 사람'),ownCard(r.b,r.b.n+' · 답한 사람'));
   if(slug==='know-me')knowResult();if(slug==='repair')repairResult();if(slug==='living')livingResult();
  }
  note('먼저 보낸 친구에게 이 결과 링크를 답장해줘. 링크에는 지금까지의 선택이 담겨 있어. 새 선택을 더했다면 새 링크를 보내줘.');
  share({title:S.title+' · 둘의 결과',desc:slug==='know-me'?'취향이 같은 답과 서로 맞힌 예상을 따로 확인해봐.':'각자 고른 답에서 찾은 우리 이야기. 같이 확인해봐.',hash:'#r='+encode(r),btn:'둘의 결과 보기'},true);
  app.append(button('다른 에피소드로 다시 만나기',()=>{event('replay',c.e);intro();}));
  put('result:'+c.id,r);
 }
 function comparisonRow(i,emphasis){const q=E.ep(c).questions[i],box=sheet((emphasis?'★ ':'')+q.title);box.classList.toggle('important-scene',!!emphasis);box.append(paragraph(c.p.n+' · '+q.options[c.p.a[i]]),paragraph(r.b.n+' · '+q.options[r.b.a[i]]));return box;}
 function knowResult(){
  const x=E.compare(r),box=sheet('같은 취향과 예상 적중은 달라');box.id='seriesComparison';box.append(paragraph('같은 답을 고른 장면 '+x.same.length+' / 6'),paragraph(c.p.n+'님이 '+r.b.n+'님을 맞힌 예상 '+x.guessA+' / 3'),paragraph(r.b.n+'님이 '+c.p.n+'님을 맞힌 예상 '+x.guessB+' / 3'));app.append(box);
  const surprise=E.guessQuestions.find((i,j)=>c.p.g[j]!==r.b.a[i]||r.b.g[j]!==c.p.a[i]);
  if(surprise!==undefined){const j=E.guessQuestions.indexOf(surprise),q=E.ep(c).questions[surprise],b=sheet('예상 밖의 장면 하나');b.append(paragraph(q.title),paragraph(c.p.n+'님의 예상: '+q.options[c.p.g[j]]+' → '+r.b.n+'님의 실제 답: '+q.options[r.b.a[surprise]]),paragraph(r.b.n+'님의 예상: '+q.options[r.b.g[j]]+' → '+c.p.n+'님의 실제 답: '+q.options[c.p.a[surprise]]),paragraph('그 답을 고른 이유도 예상과 같을까? 서로 한 문장씩 말해봐.'));app.append(b);}
  else app.append(sheet('예상을 모두 맞혔어','이 세 장면은 서로 잘 알고 있었네. 이유까지 같았는지 한 장면을 골라 물어봐.'));
  const details=node('details','series-details');details.append(node('summary','','여섯 장면과 세 가지 예상 모두 보기'));
  for(let i=0;i<6;i++){const row=comparisonRow(i);const j=E.guessQuestions.indexOf(i);if(j>=0)row.append(paragraph('서로의 예상 · '+c.p.n+': '+E.ep(c).questions[i].options[c.p.g[j]]+' / '+r.b.n+': '+E.ep(c).questions[i].options[r.b.g[j]]));details.append(row);}app.append(details);
  note('같은 답의 개수는 관계 점수나 궁합이 아니야. 답이 다른 장면은 다음 대화의 소재로 써봐.');
 }
 function repairResult(){
  const q=E.ep(c).questions,box=sheet('마음은 있는데, 시작 버튼이 달랐네');
  for(const [a,b] of [[c.p,r.b],[r.b,c.p]]){
   const match=a.a[4]===b.a[2];box.append(node('h3','',a.n+'님이 다가갈 때'),paragraph('평소 행동: '+q[4].options[a.a[4]]),paragraph(b.n+'님이 바라는 반응: '+q[2].options[b.a[2]]),paragraph(match?'이 부분은 원하는 방식과 닮았어. 지금도 그렇게 해주면 편한지 물어봐.':'좋은 의도로 한 행동과 받고 싶은 반응이 달랐어. 위에서 고른 반응으로 시작해도 될지 물어봐.'));
  }
  if((c.p.a[2]===0&&r.b.a[2]===1)||(c.p.a[2]===1&&r.b.a[2]===0))box.append(paragraph('한 사람은 지금 대화를, 한 사람은 정리할 시간을 골랐어. “조금 쉬고 몇 시에 다시 말할까?”부터 물어봐. 기다림이 끝나는 시간을 같이 정하는 제안이야.'));
  else box.append(paragraph('다시 여는 신호도 각자 골랐어. 두 설명서에서 서로 편한 신호 하나를 먼저 골라 이야기해봐.'));
  app.append(box);choosePerspective(()=>messageEditor(q[5].options[(role===0?c.p:r.b).a[5]]));
 }
 function livingResult(){
  const x=E.compare(r),priority=[...new Set([c.p.important,r.b.important])].filter(i=>i>=0&&x.eligible.includes(i)),box=sheet('다른 답 중, 더 중요한 이야기');
  box.append(paragraph('둘 다 답한 '+x.eligible.length+'장면 중 같은 선택 '+x.same.length+'개. 건너뛴 질문은 비교에서 뺐어.'));
  const weighted=x.different.filter(i=>priority.includes(i));box.append(paragraph(weighted.length?'서로 답이 다르고, 누군가 가장 중요하게 고른 장면 '+weighted.length+'개부터 이야기해봐.':'가장 중요하게 고른 장면에서는 비교할 답이 같거나, 상대가 건너뛰었어. 다른 선택도 아래에서 천천히 볼 수 있어.'));app.append(box);
  [...weighted,...x.different.filter(i=>!weighted.includes(i))].forEach(i=>app.append(comparisonRow(i,priority.includes(i))));
  const rules=E.rules[c.e],agreed=c.p.rule>=0&&c.p.rule===r.b.rule,b=sheet(agreed?'둘 다 동의한 우리 집 규칙':'우리 집 규칙, 아직은 각자의 제안');
  if(agreed)b.append(paragraph(rules[c.p.rule]));else b.append(paragraph(c.p.n+' · '+(c.p.rule<0?'아직 정하지 않았어':rules[c.p.rule])),paragraph(r.b.n+' · '+(r.b.rule<0?'아직 정하지 않았어':rules[r.b.rule])),paragraph('두 사람이 같은 규칙에 동의할 때만 공동 규칙으로 표시해. 지금은 서로의 이유부터 물어봐.'));app.append(b);
  const details=node('details','series-details');details.append(node('summary','','같은 답과 건너뛴 장면도 보기'));E.ep(c).questions.forEach((q,i)=>{if(!x.different.includes(i))details.append(comparisonRow(i,priority.includes(i)));});app.append(details);
 }
 function choosePerspective(fn){
  if(role===0||role===1){fn();return;}
  const box=sheet('어느 쪽이 나인가요?','다른 사람이 공유받은 결과라면 읽기만 해도 괜찮아.');
  [c.p,r.b].forEach((person,i)=>box.append(button(person.n+' · '+(i===0?'먼저 보낸 나':'답한 나'),()=>{role=i;put('role:'+c.id,i);event('result_opened',i===0?'sender_read':'guest_read');box.remove();fn();})));app.append(box);
 }
 function messageEditor(text){
  const box=sheet('내 말투로 바꿔 보내기','아래 문장은 시작점이야. 내 마음에 맞게 고쳐서 보내줘.');const label=node('label','','보낼 문장');label.htmlFor='seriesMessage';const input=node('textarea');input.id='seriesMessage';input.maxLength=450;input.rows=4;input.value=text;const status=node('p','series-status');status.setAttribute('role','status');box.append(label,input,button('이 문장 복사하기',()=>copyText(input.value,status,input,'message_copied')),status);app.append(box);
 }
 async function copyText(text,status,input,method){try{await navigator.clipboard.writeText(text);status.textContent='복사했어. 보내고 싶은 곳에 붙여넣어줘.';if(method==='message_copied')event('result_shared',method);}catch{input.hidden=false;input.value=text;input.focus();input.select();status.textContent='자동 복사가 안 돼서 내용을 선택했어. 길게 눌러 복사해줘.';}}
 function share(o,isResult){
  shareObject={title:o.title,desc:o.desc,url:location.origin+location.pathname+o.hash,btn:o.btn,img:'https://noljago.co.kr/assets/share-cards/'+slug+'.png?v=20260913-series',imageWidth:800,imageHeight:480,textOnly:false};
  window.psyShareData=()=>({...shareObject});
  if(storageUnavailable)note('이 브라우저에서는 기기에 보관할 수 없어. 이어 보려면 지금 결과 링크를 복사해둬.');
  const box=node('div','series-share'),status=node('p','series-status'),manual=node('textarea');status.setAttribute('role','status');status.id='seriesShareStatus';manual.hidden=true;manual.readOnly=true;manual.setAttribute('aria-label','공유 링크');manual.id='seriesShareUrl';
  const copy=()=>copyText(shareObject.url,status,manual,isResult?'copy_result':'copy_invite');
  box.append(button(isResult?'카톡으로 결과 답장하기':'카톡으로 초대 보내기',async()=>{const b=$('seriesKakao');b.disabled=true;try{const ok=window.kakaoShare?await kakaoShare(shareObject,copy):false;if(!window.kakaoShare)await copy();if(ok){status.textContent='카카오톡에서 보낼 대상을 선택해줘.';event(isResult?'result_shared':'invite_shared','kakao');}}catch{await copy();}finally{b.disabled=false;}},'kakao','seriesKakao'),button(isResult?'결과 링크 복사':'초대 링크 복사',async()=>{await copy();event(isResult?'result_shared':'invite_shared','copy');},'secondary','seriesCopy'),status,manual);app.append(box);
 }
 function drawTarot(){
  drawSelection=p.a[0]??-1;start('잠깐, 마음에\n집중해봐.',E.ep(c).title);app.append(paragraph('마음이 가는 카드 한 장을 골라줘. 같은 카드를 골라도 괜찮아.'));
  const fan=node('div','series-fan');fan.id='seriesOptions';for(let i=0;i<22;i++){const b=button('☾',()=>{drawSelection=i;p.a=[i];for(const x of fan.children)x.setAttribute('aria-pressed',String(x===b));$('seriesNext').disabled=false;$('cardSelection').textContent=(i+1)+'번째 카드를 골랐어.';},'series-card-back');b.setAttribute('aria-label',(i+1)+'번째 카드');b.setAttribute('aria-pressed',String(drawSelection===i));b.append(node('small','',String(i+1).padStart(2,'0')));fan.append(b);}app.append(fan);const st=node('p','series-status','옆으로 넘기며 22장을 구경해봐.');st.id='cardSelection';st.setAttribute('role','status');app.append(st);
  const next=button('이 카드로 할게 →',finish,'primary','seriesNext');next.disabled=drawSelection<0;app.append(next,button('← 이전',()=>joining?invitation():intro()));
 }
 function tarotFace(i,label){const card=TAROT_DECK[i],box=node('article','series-tarot-face');box.append(node('span','eyebrow',label),node('div','tarot-symbol',card[2]),node('h2','',card[0]),paragraph(card[3]));const detail=node('details','series-details');detail.append(node('summary','','이 카드 이야기 더 보기'),paragraph(card[4]),paragraph(card[5]));box.append(detail);return box;}
 function tarotResult(){
  const t=E.tarot(r),cards=node('div','series-trio');cards.append(tarotFace(t.cards.a,c.p.n+' · 나'),tarotFace(t.cards.b,r.b.n+' · 너'),tarotFace(t.cards.us,'함께 펼친 장면'));app.append(cards,sheet(t.title,t.body),sheet('세 번째 카드가 더한 한 줄',t.bridge));
  choosePerspective(()=>{
   const box=sheet('이 중 나는 무엇을 해보고 싶어?','각자 직접 고른 제안만 표시돼. 고른 뒤 새 결과 링크를 답장해줘.');
   t.actions.forEach((text,i)=>{const b=button(text,()=>{if(r.votes[role]!==null)return;r.votes[role]=i;put('result:'+c.id,r);go('#r='+encode(r));event('game_completed','action_chosen');result();},'series-option');b.disabled=r.votes[role]!==null;b.setAttribute('aria-pressed',String(r.votes[role]===i));box.append(b);});app.append(box);
  });
  const votes=sheet('둘이 고른 다음 장면');[c.p,r.b].forEach((x,i)=>votes.append(paragraph(x.n+' · '+(r.votes[i]===null?'아직 선택 전':t.actions[r.votes[i]]))));
  if(r.votes.every(v=>v!==null))votes.append(paragraph(r.votes[0]===r.votes[1]?'같은 제안을 골랐어! 언제 해볼지 이야기해봐.':'서로 다른 제안을 골랐네. 하나씩 번갈아 할지 먼저 이야기해봐.'));
  else votes.append(paragraph('아직 둘의 선택이 모이지 않았어. 상대가 고른 최신 결과 링크를 받아 열면 함께 볼 수 있어.'));app.append(votes);
  if(c.e==='message')messageEditor('요즘 네 생각이 났어. 우리 '+t.actions[0].replace(/하기$/,'해볼까?'));
  const st=node('p','series-status');st.setAttribute('role','status');app.append(button('세 장을 나의 타로 보관함에 담기',()=>{const list=readTarots().filter(x=>x.c.id!==c.id);list.unshift(r);const ok=put('tarots',list.slice(0,12));st.textContent=ok?'이 기기의 타로 보관함에 담았어. 시작 화면에서 다시 볼 수 있어.':'기기에 저장할 수 없어. 결과 링크를 복사해서 보관해줘.';},'secondary','saveTarot'),st);
 }
 function readTarots(){const list=get('tarots');return Array.isArray(list)?list.filter(x=>E.result(x)&&x.c.s==='next-scene'):[];}
 function savedTarots(){const list=readTarots();if(!list.length)return;const details=node('details','series-details');details.append(node('summary','','나의 타로 보관함 · '+list.length+'개'));for(const x of list){const a=node('a','saved-card',x.c.p.n+' · '+x.b.n+' / '+E.ep(x.c).title);a.href='#r='+encode(x);details.append(a);}details.append(button('보관함 비우기',()=>{if(window.confirm('이 기기의 타로 보관함을 비울까요?')){put('tarots',[]);details.remove();}}));app.append(details);}
 const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10),shift=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
 function fortuneHistory(){const x=get('fortune-history');return Array.isArray(x)?x.filter(E.fortune).sort((a,b)=>a.d.localeCompare(b.d)).slice(-60):[];}
 let sharedFortune=null,ownFortune=null;
 function fortuneIntro(){
  const current=get('fortune:'+today())||ownFortune;if(E.fortune(current)&&current.d===today()){ownFortune=current;fortuneResult(current,false);return;}
  const weekday=new Date(today()+'T00:00:00Z').getUTCDay();note(weekday===1?'월요일의 한 장. 이번 주를 작게 시작해볼까?':[0,6].includes(weekday)?'주말의 한 장. 여유가 생기면 작은 즐거움을 골라봐.':'오늘의 한 장. 마음에 가는 카드를 골라봐.');
  const fan=node('div','lucky-draw');for(let i=0;i<3;i++){const b=button('✦',drawFortune,'lucky-back');b.setAttribute('aria-label',(i+1)+'번째 행운 카드 뽑기');fan.append(b);}app.append(fan);note('한국 날짜를 기준으로 하루 한 장. 이 기기의 지난 카드와 비슷한 주제는 연달아 나오지 않게 골라줘.');fortuneArchive();
 }
 function drawFortune(){
  const d=today(),already=get('fortune:'+d)||ownFortune;if(E.fortune(already)&&already.d===d){ownFortune=already;fortuneResult(already,false);return;}
  const recent=fortuneHistory().filter(x=>x.d<d).slice(-3),cats=recent.map(x=>D.fortunes[x.i][5]),pool=D.fortunes.map((_,i)=>i).filter(i=>!cats.includes(D.fortunes[i][5]));const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
  ownFortune={v:1,s:'lucky',d,i:pool[Math.floor(bytes[0]/4294967296*pool.length)]};const h=fortuneHistory().filter(x=>x.d!==d);h.push(ownFortune);put('fortune:'+d,ownFortune);put('fortune-history',h.slice(-60));event('game_completed','daily_draw');fortuneResult(ownFortune,false);
 }
 function fortuneResult(o,shared){
  const f=D.fortunes[o.i];start(f[1],o.d.replaceAll('-','.')+(shared?' · 친구가 보낸 카드':' · 나의 행운 한 장'));const card=sheet(f[0]+' '+f[1],f[2]);card.classList.add('lucky-result');card.append(node('h3','','오늘의 행운 아이템'),paragraph(f[3]),node('h3','','해보고 싶다면'),paragraph(f[4]));app.append(card);
  if(shared){sharedFortune=o;note('친구가 보낸 카드는 내 일일 카드와 따로 보관돼. 내 카드를 뽑으면 두 장이 만난 제안을 볼 수 있어.');app.append(button('내 오늘의 카드도 뽑기 →',()=>{go('');intro();},'primary','drawMyFortune'));}
  else{
   ownFortune=o;
   if(sharedFortune){const friend=D.fortunes[sharedFortune.i],key=[friend[5],f[5]].sort().join('-');app.append(sheet('친구의 '+friend[0]+'와 나의 '+f[0]+'가 만나면',D.fortunePairs[key]));if(sharedFortune.d!==o.d)note('친구의 '+sharedFortune.d+' 카드와 내 '+o.d+' 카드를 이어 만든 제안이야.');}
   const reaction=node('div','reaction-row'),st=node('p','series-status');st.setAttribute('role','status');['해봤어','다음에 해볼래'].forEach((text,i)=>{const b=button(text,()=>{put('fortune-reaction:'+o.d,i);for(const x of reaction.children)x.setAttribute('aria-pressed',String(x===b));st.textContent=i===0?'작은 시도를 기록했어.':'좋아. 하고 싶은 날 떠올려도 돼.';event('game_completed',i===0?'fortune_tried':'fortune_later');},'reaction');b.setAttribute('aria-pressed',String(get('fortune-reaction:'+o.d)===i));reaction.append(b);});app.append(reaction,st);
   const h=fortuneHistory(),days=new Set(h.map(x=>x.d));let streak=0;for(let d=today();days.has(d);d=shift(d,-1))streak++;if(streak)note(streak+'일 연속 나만의 한 장을 모았어.');fortuneArchive();
  }
  share({title:'오늘의 행운 한 장 · '+f[1],desc:S.invite,hash:'#r='+encode(o),btn:'나도 한 장 뽑기'},true);
  note('오늘을 가볍게 돌아보는 창작 카드야. 미래나 실제 운을 예측하는 정보는 아니야.');
 }
 function fortuneArchive(){const h=fortuneHistory();if(!h.length)return;const details=node('details','series-details');details.append(node('summary','','내가 모은 행운 카드 · '+h.length+'장'));h.slice().reverse().forEach(o=>{const b=button(o.d+' · '+D.fortunes[o.i][0]+' '+D.fortunes[o.i][1],()=>fortuneResult(o,false),'saved-card');details.append(b);});details.append(button('행운 기록 비우기',()=>{if(window.confirm('모아둔 카드와 반응을 지울까요? 오늘 뽑은 카드는 오늘까지 유지돼요.')){h.forEach(o=>{try{localStorage.removeItem('mind-series:fortune-reaction:'+o.d);if(o.d!==today())localStorage.removeItem('mind-series:fortune:'+o.d);}catch{}});put('fortune-history',[]);details.remove();}}));app.append(details);}
 function invalid(){start('링크를 읽을 수 없어.');app.append(paragraph('링크가 잘렸거나 다른 버전의 내용이야. 보낸 사람에게 다시 받아줘.'),button('새 이야기 시작하기',intro,'primary'));}
 function route(){
  if(!location.hash){intro();return;}
  try{
   const m=location.hash.match(/^#([cr])=([A-Za-z0-9_-]{1,6000})$/);if(!m)throw Error();const o=JSON.parse(decodeURIComponent(escape(atob(m[2].replace(/-/g,'+').replace(/_/g,'/')))));
   if(slug==='lucky'){if(m[1]!=='r'||!E.fortune(o))throw Error();event('result_opened','fortune_shared');fortuneResult(o,true);return;}
   if(m[1]==='c'){
    if(!E.invite(o)||o.s!==slug)throw Error();c=o;episode=c.e;r=null;const reply=get('reply:'+c.id);
    if(E.result(reply)&&same(reply.c,c)){r=reply;role=1;result();return;}
    if(same(get('own:'+c.id),c)){sealed();return;}event('invite_opened',c.e);invitation();
   }else{
    if(!E.result(o)||o.c.s!==slug)throw Error();r=o;c=r.c;const own=get('own:'+c.id),reply=get('reply:'+c.id);role=same(own,c)?0:E.result(reply)&&same(reply.c,c)&&same(reply.b,r.b)?1:null;
    // Cross-device viewers explicitly choose their own perspective before adding a vote or message.
    event('result_opened',role===0?'sender_read':role===1?'guest_read':'shared_read');result();
   }
  }catch{invalid();}
 }
 window.addEventListener('hashchange',route);route();
})();
