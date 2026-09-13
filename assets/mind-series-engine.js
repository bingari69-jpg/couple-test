/* Pure rules shared by the UI and protocol tests. Published v1 links are immutable snapshots. */
(function(root){
 'use strict';
 const D=root.MindSeriesData;
 const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<max;
 const name=n=>typeof n==='string'&&Array.from(n).length<=12&&!/[\u0000-\u001f\u007f]/.test(n);
 const ep=c=>D.series[c.s]?.episodes.find(e=>e.id===c.e);
 /* 낱말 고르기 한 벌: 3~6개, 번호 중복 없음, 목록 안의 번호만 */
 function wordPick(list){
  const words=D.mirrorWords||[],range=D.mirrorRange||{min:3,max:6};
  return Array.isArray(list)&&list.length>=range.min&&list.length<=range.max
   &&list.every(x=>int(x,words.length))&&new Set(list).size===list.length;
 }
 function person(p,c){
  const e=ep(c);if(!p||!name(p.n)||!Array.isArray(p.a)||!Array.isArray(p.g))return false;
  if(c.s==='next-scene')return p.a.length===1&&int(p.a[0],22)&&p.g.length===0;
  /* 서로 보는 말: 문항이 아니라 낱말 고르기. a=나를 고른 말, g=상대를 고른 말 */
  if(c.s==='mirror')return wordPick(p.a)&&wordPick(p.g);
  if(!e||p.a.length!==e.questions.length||!p.a.every((x,i)=>int(x,e.questions[i].options.length)))return false;
  if(c.s==='know-me')return p.g.length===3&&p.g.every(x=>int(x,4));
  if(p.g.length)return false;
  if(c.s==='love-note'||c.s==='closeness')return true;
  if(c.s==='living'){
   const answered=p.a.map((v,i)=>v===4?-1:i).filter(i=>i>=0);
   return (answered.length?answered.includes(p.important):p.important===-1)&&Number.isInteger(p.rule)&&p.rule>=-1&&p.rule<3;
  }
  return c.s==='repair';
 }
 function invite(c){return !!(c&&c.v===1&&typeof c.s==='string'&&c.s!=='lucky'&&Object.hasOwn(D.series,c.s)&&ep(c)&&typeof c.id==='string'&&/^[a-f0-9]{16}$/.test(c.id)&&Number.isInteger(c.seed)&&c.seed>=0&&c.seed<=0xffffffff&&person(c.p,c));}
 function result(r){return !!(r&&invite(r.c)&&person(r.b,r.c)&&Array.isArray(r.votes)&&r.votes.length===2&&r.votes.every(v=>v===null||int(v,3))&&(r.c.s==='next-scene'||r.votes.every(v=>v===null)));}
 const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 const fortune=o=>!!(o&&o.v===1&&o.s==='lucky'&&date(o.d)&&int(o.i,D.fortunes.length));
 function profile(a,e){
  const scores=[0,0,0,0];a.forEach((v,i)=>scores[e.questions[i].traits[v]]++);
  const top=Math.max(...scores),winners=scores.map((v,i)=>v===top?i:-1).filter(i=>i>=0);
  const animals=[['🦦','약속 잡히면 출동 수달','사람과 함께할 장면을 먼저 떠올렸어.'],['🦊','낯선 골목 탐험 여우','익숙함 밖의 작은 재미를 골랐어.'],['🐱','충전 시간 지킴이 고양이','내가 편안한 속도를 챙겼어.'],['🐻','작은 계획 챙김 곰','다음 단계를 구체적으로 정했어.']];
  if(winners.length>1)return {icon:'🐾',title:'장면 따라 달라지는 마음동물',desc:winners.map(i=>animals[i][1]).join(' · ')+'의 선택이 함께 나왔어.',evidence:a.map((v,i)=>i).slice(0,2)};
  const w=winners[0],t=animals[w];return {icon:t[0],title:t[1],desc:t[2],evidence:a.map((v,i)=>e.questions[i].traits[v]===w?i:-1).filter(i=>i>=0).slice(0,2)};
 }
 const guessQuestions=[0,2,4];
 function compare(r){const a=r.c.p,b=r.b,e=ep(r.c),eligible=a.a.map((v,i)=>v!==4&&b.a[i]!==4?i:-1).filter(i=>i>=0);return {same:eligible.filter(i=>a.a[i]===b.a[i]),different:eligible.filter(i=>a.a[i]!==b.a[i]),eligible,guessA:guessQuestions.filter((i,j)=>a.g[j]===b.a[i]).length,guessB:guessQuestions.filter((i,j)=>b.g[j]===a.a[i]).length,episode:e};}
 const rules={
  weekend:['집안일은 시작 전에 시간과 담당부터 같이 정하기','손님 초대는 확정하기 전에 서로 물어보기','하루 10분은 화면을 내려놓고 이야기하기'],
  trip:['하루에 각자 원하는 장소 하나씩 넣기','혼자 쉴 시간이 필요하면 먼저 말하기','공용 짐과 예약 담당을 출발 전에 나누기'],
  payday:['공용 예산을 매달 정한 날 함께 확인하기','공용 물건을 사기 전에 금액과 공간 이야기하기','각자 자유롭게 쓸 예산을 따로 두기'],
  holiday:['연휴 일정에 각자 쉴 시간을 넣기','새 약속은 기존 둘의 일정부터 확인하기','마지막 날에는 다음 날 준비 시간을 남기기'],
  visitors:['손님 초대와 숙박은 확정 전 서로 물어보기','준비와 뒷정리 담당을 미리 나누기','피곤하면 쉴 수 있도록 마무리 신호 정하기'],
  busy:['여유가 없는 날에는 상태를 먼저 알려주기','이번 주 꼭 필요한 집안일만 같이 정하기','하루 짧은 안부와 다음 대화 시간 남기기'],
  serious:['민감한 이야기는 준비됐는지 먼저 물어보기','지금 답하지 않아도 되는 시간을 존중하기','큰 공동 결정 전 필요한 정보를 함께 확인하기']
 };
 function tarot(r){
  const cards=root.TarotDraw.cards({v:2,s:r.c.seed,t:0,a:r.c.p.a[0]},r.b.a[0]);
  const key=[cards.a,cards.b].sort((a,b)=>a-b).join('-'),pattern=root.TarotDraw.pattern(cards.a,cards.b,root.TAROT_DETAILS);
  const scenes={
   same:['같은 카드, 다른 이유일 수도','같은 상징에 끌렸어도 같은 마음이라고 단정할 수는 없어. 왜 이 장면이 마음에 드는지 한 문장씩 붙여봐.',['같은 카페에서 서로 다른 메뉴 고르기','같은 사진을 보고 각자 제목 붙이기','같은 노래를 듣고 좋았던 부분 말하기']],
   x_opposite:['출발 버튼과 잠깐 멈춤 사이','바깥으로 향하는 장면과 안으로 쉬어가는 장면이 만났어. 짧은 움직임 뒤에 편한 자리를 붙여보면 어때?',['가까운 골목 산책 뒤 익숙한 카페 가기','서점 한 바퀴 돌고 각자 조용히 읽기','새 간식을 포장해서 집에서 쉬기']],
   x_same:['둘의 방향에 작은 변주','비슷한 방향의 상징이 만났어. 익숙한 방식에 한 사람당 작은 변화 하나씩 더해봐.',['평소 데이트 코스를 반대 순서로 걷기','같이 좋아하는 메뉴에 새 디저트 더하기','단골 장소에서 다음 여행 후보 고르기']],
   x_neutral:['한 걸음, 그리고 기다림','움직이는 장면 옆에 여백이 있어. 서로 편한 출발 시간을 묻는 이야기로 써봐.',['만날 시간만 정하고 목적지는 함께 고르기','먼저 도착한 사람이 쉴 자리 찾아두기','각자 가보고 싶은 가까운 곳 하나씩 보여주기']],
   y_opposite:['계획표에 빈칸 한 칸','정해진 약속과 뜻밖의 변화가 만났어. 하나는 정하고, 하나는 그날 마음대로 골라봐.',['식당만 예약하고 그다음은 즉흥으로','예산만 정하고 서로 작은 선물 고르기','산책 끝나는 시간만 약속하고 걷기']],
   y_same:['우리 리듬에 쉼표 붙이기','닮은 흐름의 상징을 골랐어. 같은 속도를 기대하기 전에 오늘의 여유를 서로 확인해봐.',['오늘 에너지를 한 단어로 말하고 일정 고르기','둘 다 편한 장소에서 길게 머무르기','같이 하고 싶은 일과 쉬고 싶은 시간 나누기']],
   y_neutral:['정한 것과 열어둔 것','단단한 약속 옆에 바꿀 수 있는 여백이 있어. 오늘 꼭 지킬 것 하나만 먼저 정해봐.',['만나는 시간만 지키고 메뉴는 함께 고르기','하고 싶은 것 하나씩 적고 한 가지 선택하기','취소해도 괜찮은 가벼운 약속 하나 만들기']]
  };
  const special={
   '7-9':['모험 한 스푼, 편안함 한 컵','전차의 출발과 은둔자의 여백을 한 장면에 놓아봤어. 멀리 떠나기보다 익숙한 곳에서 작은 새로움을 찾아봐.',['익숙한 카페에서 처음 보는 메뉴 주문하기','늘 걷던 길의 다른 골목으로 돌아오기','집 근처 새 간식을 포장해 쉬면서 먹기']],
   '0-4':['큰 계획 속 작은 즉흥','바보의 시작과 황제의 기준이 만났어. 돌아올 시간만 정하고 그 사이에는 작은 우연을 허용해봐.',['귀가 시간만 정하고 동네 탐험하기','예산 안에서 서로 모르는 간식 사오기','예약한 식사 뒤 즉흥 사진 산책하기']],
   '6-9':['붙어 있는 시간에도 여백','연인의 함께함과 은둔자의 쉼을 동시에 떠올려봐. 같은 공간에서 각자 편하게 있다가 짧게 마음을 나눠도 좋아.',['같은 카페에서 각자 책 읽고 한 구절 나누기','집에서 각자 쉬고 저녁만 함께 준비하기','조용한 길을 걷다 벤치에서 안부 묻기']],
   '16-17':['바뀐 계획에 작은 불빛','탑의 변화와 별의 기대를 이야기 재료로 골랐어. 어긋난 계획을 붙잡기보다 지금 가능한 즐거움 하나를 찾아봐.',['취소된 약속 대신 가까운 디저트 가게 가기','오늘 못 한 일 대신 다음의 작은 기대 적기','불편했던 습관 하나와 바라는 변화 나누기']]
  };
  let scene=special[key]||scenes[pattern];
  if(r.c.e==='rhythm')scene=[scene[0],scene[1],['오늘 같이 있고 싶은 시간과 혼자 쉴 시간 말하기',scene[2][0],'쉬고 싶을 때 쓸 부담 없는 신호 하나 정하기']];
  if(r.c.e==='message')scene=[scene[0],scene[1],['요즘 고마웠던 작은 순간 한 문장 전하기','혼자 짐작했던 마음을 질문으로 바꾸기','다음에 함께하고 싶은 장면 한 가지 제안하기']];
  return {cards,title:scene[0],body:scene[1],actions:scene[2],bridge:root.TAROT_DECK[cards.us][5]};
 }
 root.MindSeriesEngine={int,ep,person,invite,result,date,fortune,profile,compare,guessQuestions,rules,tarot};
})(typeof window==='undefined'?globalThis:window);
