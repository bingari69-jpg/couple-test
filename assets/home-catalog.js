const ITEMS = [
  { path:"t/ranking/", rel:"친구", kind:"예측",
    title:"내 취향 맞혀봐",
    desc:"보기 세 개 중 내 최애 하나를 골라 카톡으로 보내면 친구가 맞혀요." },
  { path:"t/marriage/",  rel:"부부",  kind:"비교형",
    title:"결혼 전에 맞춰봐야 할 것들",
    desc:"돈, 가족, 집안일, 아이. 결혼 전에 확인해야 할 20가지를 각자 답하고 갈린 지점만 봅니다." },
  { path:"t/letter/",    rel:"연인",  kind:"편지형",
    title:"기념일 편지 만들기",
    desc:"생일·100일·결혼기념일. 몇 가지만 고르면 편지가 완성되고, 직접 쓸 수도 있습니다." },
  { path:"t/crash/",     rel:"친구",  kind:"딜레마형",
    title:"20분 후 추락합니다",
    desc:"정답 없는 8개의 극한 선택. 내가 먼저 답하고 상대와 어디서 갈리는지 확인합니다." },
  { path:"t/rps/",       rel:"친구",  kind:"대결",
    title:"가위바위보 도전장",
    desc:"내가 먼저 낸다. 네가 고르기 전까진 안 보여준다. 거짓말도 가능." },
  { path:"t/nonsense/",  rel:"친구",  kind:"대결",
    title:"넌센스 대결 — 이걸 맞힌다고?",
    desc:"100문제 중 무작위 5개. 내가 받은 문제와 보기 그대로 친구와 점수 대결." },
  { path:"t/delivery/",  rel:"친구",  kind:"예측",
    title:"배달 텔레파시",
    desc:"내가 뭐 시킬지 맞혀봐. 못 맞히면 네가 사. 찍을 때마다 정답 공개." },
  { path:"t/ten/",       rel:"친구",  kind:"대결",
    title:"10초 맞추기",
    desc:"안 보고 10초 세다가 멈추기. 둘 다 같은 조건으로 딱 한 번." },
  { path:"t/seat/",      rel:"친구",  kind:"심리",
    title:"늦게 온 당신, 어디에 앉나요",
    desc:"웃음소리 쪽? 창가 끝? 하나 고르면 성향이 나오고, 상대 것도 나란히." },
  { path:"t/mbti/",      rel:"친구",  kind:"예측",
    title:"내 MBTI 몇 글자나 맞힐래?",
    desc:"4문항으로 나온 내 네 글자. 너는 나를 몇 글자나 알까. 진짜 MBTI랑도 비교." },
  { path:"t/react/",     rel:"친구",  kind:"대결",
    title:"반응속도 대결",
    desc:"초록으로 바뀌는 순간 눌러. 3번 평균으로 승부." },
  { path:"t/mind/fight/", rel:"연인",  kind:"심리",
    title:"싸우면 어떻게 끝날까",
    desc:"나의 심리 너의 심리 · 우리 싸우면 누가 먼저 연락하는지 답해놨어." },
  { path:"t/memory/",    rel:"연인",  kind:"기억",
    title:"우리의 기억 — 같은 걸 기억하고 있을까",
    desc:"첫 키스, 첫 데이트, 처음 준 선물. 한 문제씩. 나는 답했어, 너는?" },
  { path:"t/ladder/",    rel:"친구",  kind:"내기",
    title:"사다리타기 — 오늘 커피는 누가 쏠까",
    desc:"이름 넣고 링크 하나면 끝. 단체톡에 던져봐. 결과는 이미 봉인됐어." },
  { path:"t/groups/",    rel:"친구",  kind:"내기",
    title:"골프 조편성 — 이번엔 누구랑 한 조?",
    desc:"이름 넣고 뽑기 한 번. 총무 눈치 볼 일 없이 기계가 정해드림." },
  { path:"t/num25/",     rel:"친구",  kind:"대결",
    title:"1에서 25까지 — 누가 더 빨라?",
    desc:"같은 판, 같은 숫자. 순서대로 최대한 빨리. 네 기록은 봉인됐어." },
  { path:"t/mole/",      rel:"친구",  kind:"대결",
    title:"두더지 잡기 — 20초, 같은 두더지, 누가 더 잡나",
    desc:"황금은 +3, 폭탄은 −3. 네 기록은 봉인됐어." },
  { path:"t/ufo/",       rel:"친구",  kind:"대결",
    title:"UFO 요격 — 미사일 40발, 20초",
    desc:"황금 모선 +3, 아군 드론 쏘면 −3. 명중률까지 봉인." },
  { path:"t/tap/",       rel:"친구",  kind:"대결",
    title:"10초 연타 — 몇 번 누를 수 있어?",
    desc:"두 손가락도 돼. 10초 안에 최대한 많이. 네 기록은 봉인됐어." },
  { path:"t/stroop/",    rel:"친구",  kind:"대결",
    title:"색깔 함정 — 글자 말고 색깔을 답해",
    desc:"20초. 알고도 틀린다. 네 기록은 봉인됐어." },
  { path:"t/arrow/",     rel:"친구",  kind:"대결",
    title:"화살표 함정 — 가끔은 반대로",
    desc:"빨간 테두리면 반대로 밀기. 20초, 네 기록은 봉인됐어." },
  { path:"t/stop/",      rel:"친구",  kind:"대결",
    title:"딱 멈춰 — 한가운데서 멈출 수 있어?",
    desc:"5번 멈춰서 오차 합. 적은 쪽이 이겨." },
  { path:"t/exam/",      rel:"가족",  kind:"공부",
    title:"시험지 보내기 — 카톡으로 단어 시험",
    desc:"단어 붙여넣으면 시험지 완성. 자동 채점, 틀린 것만 다시." },
  { path:"t/tarot/",     rel:"연인",  kind:"심리",
    title:"나와 너의 타로 — 세 장의 카드",
    desc:"각자 카드 한 장을 고르면 나·너·우리 카드가 차례로 열려요." },
  { path:"t/personality/", rel:"친구", kind:"심리",
    title:"나와 너의 마음동물",
    desc:"여섯 질문에 답하면 나와 친구의 마음동물이 나와요. 둘 다 답해야 열려요." },
  { path:"t/fortune/",   rel:"친구",  kind:"심리",
    title:"오늘의 운세 카드",
    desc:"오늘 마음이 가는 카드 한 장을 골라 메시지를 받고 친구에게 공유해요." },
  { path:"t/group-room/", rel:"친구", kind:"단체",
    title:"단체방 커피 내기",
    desc:"모두 같은 방에 들어와 준비하면 커피 살 사람을 공평하게 정해요." }
];

// The catalogue order and artwork follow the browsing cards on the home screen.
const CARDS = [
 ['mole','atlas',10,'#ffead4',['친구','연인','가족'],'20초 동안 두더지 잡기. 황금은 놓치지 마!'],
 ['rps','classic',0,'#ffe1e5',['친구','연인','가족'],'내가 먼저 낸다. 네 선택 전까지는 비밀!'],
 ['nonsense','atlas',16,'#fff0d3',['친구','연인','가족'],'100문제 중 같은 5문제로 점수와 시간을 겨뤄봐.'],
 ['num25','atlas',9,'#e0eafa',['친구','연인','가족'],'1부터 25까지 순서대로! 같은 판으로 대결.'],
 ['ufo','atlas',11,'#e7e0fa',['친구','연인','가족'],'미사일 40발, 제한 시간 20초. 명중시켜봐!'],
 ['stop','atlas',15,'#fff0c9',['친구','연인','가족'],'한가운데서 딱 멈춰! 오차가 적은 쪽이 승리.'],
 ['ten','classic',1,'#fff0ae',['친구','연인','가족'],'안 보고 10초 세다가 멈추기. 둘 다 딱 한 번!'],
 ['tap','atlas',12,'#ffe0da',['친구','연인','가족'],'10초 동안 몇 번 누를까? 두 손가락도 OK.'],
 ['react','atlas',1,'#dceeff',['친구','연인','가족'],'초록으로 바뀌는 순간 눌러! 누가 더 빠를까?'],
 ['delivery','classic',2,'#d4f5ee',['친구','연인'],'내가 뭐 시킬지 맞혀봐. 못 맞히면 네가 쏴.'],
 ['stroop','atlas',13,'#e4f2d3',['친구','연인','가족'],'글자 말고 색깔을 답해. 알고도 헷갈려!'],
 ['arrow','atlas',14,'#dceffa',['친구','연인','가족'],'빨간 테두리면 반대로! 순간 판단 대결.'],
 ['ranking','ranking',0,'#f9edcc',['친구','연인','가족'],'세 가지 중 내 최애는? 하나씩 골라 친구에게 보내봐.'],
 ['mbti','atlas',0,'#e9dffc',['친구','연인'],'너는 나를 얼마나 알까? 네 글자로 맞혀봐.'],
 ['personality','atlas',4,'#e3f1e6',['친구','연인','가족'],'여섯 질문으로 보는 나와 너의 마음동물.'],
 ['crash','atlas',2,'#e5f2cb',['친구','연인'],'정답 없는 8개의 극한 선택. 우리는 어디서 갈릴까?'],
 ['fortune','atlas',17,'#fff4d6',['친구','연인','가족'],'오늘 마음이 가는 카드 한 장. 하루에 한 번!'],
 ['letter','letter',0,'#ffedcf',['연인','부부','친구','가족'],'특별한 날에도, 그냥 네 생각이 난 날에도.'],
 ['tarot','tarot',0,'#ece4f7',['연인','부부','친구'],'각자 카드 한 장. 나·너·우리 카드를 차례로 열어봐.'],
 ['seat','atlas',3,'#dff0e7',['친구','연인'],'어디에 앉을래? 한 번의 선택으로 보는 성향.'],
 ['marriage','atlas',4,'#fbe1df',['연인','부부'],'돈, 가족, 집안일. 우리의 생각을 나란히.'],
 ['mind/fight','atlas',5,'#ece2f9',['연인','부부'],'싸우고 나면 누가 먼저 연락할까?'],
 ['memory','atlas',6,'#ffe6ee',['연인','부부'],'첫 데이트, 첫 선물. 같은 기억을 떠올릴까?'],
 ['ladder','atlas',7,'#fff0d3',['친구','가족'],'오늘 커피는 누가 쏠까? 이름 넣고 사다리!'],
 ['group-room','atlas',7,'#e6f2ea',['친구','가족'],'다 같이 한 방에 모여서 커피 살 사람 뽑기.'],
 ['groups','atlas',8,'#e3f1d0',['친구','가족'],'이번엔 누구랑 한 조? 뽑기로 정해봐.'],
 ['exam','atlas',16,'#e9e5fa',['친구','가족'],'단어로 시험지 만들기. 채점까지 한 번에.']
];
const LOCAL_HOME_ITEMS=CARDS.map(([slug,art,index,color,relationships,summary])=>({
 ...ITEMS.find(item=>item.path==='t/'+slug+'/'),art,index,color,relationships,summary
}));
window.HOME_ITEMS=LOCAL_HOME_ITEMS;

// 서버 목록(관리자 게시본·game_catalog)에 아직 등록되지 않은 로컬 게임은 목록 끝에 그대로 붙인다.
// 새 게임을 코드에만 추가했을 때 서버 등록 전이라고 홈에서 사라지는 일을 막는다.
// 서버가 명시적으로 '숨김'으로 둔 게임은 rows에 있으므로 여기서 다시 살아나지 않는다.
function appendUnknownLocal(merged,rows){
  const known=new Set((rows||[]).map(row=>row&&row.slug));
  LOCAL_HOME_ITEMS.forEach(item=>{
    const slug=item.path.replace(/^t\//,'').replace(/\/$/,'');
    if(!known.has(slug))merged.push(item);
  });
}

let publishedCatalogApplied=false;
function applyPublishedCatalog(config){
  if(!config||!Array.isArray(config.games))return false;
  const localBySlug=new Map(LOCAL_HOME_ITEMS.map(item=>[
    item.path.replace(/^t\//,'').replace(/\/$/,''),item
  ]));
  const merged=config.games
    .filter(row=>(row.visibility||'listed')==='listed')
    .sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0))
    .map(row=>{
      const local=localBySlug.get(row.slug);
      if(!local)return null;
      return {
        ...local,
        path:row.path||local.path,
        title:row.title||local.title,
        summary:row.summary||local.summary,
        relationships:Array.isArray(row.relationships)&&row.relationships.length?row.relationships:local.relationships,
        thumbnailUrl:row.thumbnailUrl||''
      };
    }).filter(Boolean);
  if(!merged.length)return false;
  appendUnknownLocal(merged,config.games);
  publishedCatalogApplied=true;
  window.HOME_ITEMS=merged;
  window.dispatchEvent(new CustomEvent('home-catalog-updated'));
  return true;
}
window.addEventListener('app-config-ready',event=>applyPublishedCatalog(event.detail));
if(window.APP_PUBLISHED_CONFIG)applyPublishedCatalog(window.APP_PUBLISHED_CONFIG);

// Supabase가 열리면 제목·설명·순서·공개 여부를 서버 값으로 덮어쓴다.
// 연결에 실패하거나 아직 등록되지 않은 항목은 기존 로컬 목록을 그대로 쓴다.
if(window.SupabaseData){
  window.SupabaseData.getGameCatalog().then(rows=>{
    if(publishedCatalogApplied)return;
    if(!Array.isArray(rows)||!rows.length)return;
    const localBySlug=new Map(LOCAL_HOME_ITEMS.map(item=>[
      item.path.replace(/^t\//,'').replace(/\/$/,''),item
    ]));
    const merged=rows.map(row=>{
      const local=localBySlug.get(row.slug);
      if(!local)return null;
      return {
        ...local,
        path:row.path||local.path,
        title:row.title||local.title,
        summary:row.summary||local.summary,
        relationships:Array.isArray(row.relationships)&&row.relationships.length
          ?row.relationships:local.relationships
      };
    }).filter(Boolean);
    if(!merged.length)return;
    appendUnknownLocal(merged,rows);
    window.HOME_ITEMS=merged;
    window.dispatchEvent(new CustomEvent('home-catalog-updated'));
  }).catch(()=>{});
}
