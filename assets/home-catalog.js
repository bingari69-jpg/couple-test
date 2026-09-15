const ITEMS = [
  { path:"t/tapbattle/", rel:"친구", kind:"반응 대결", onlineDuel:true, thumbnailUrl:"assets/art/tapbattle.svg",
    title:"톡톡 배틀 — 멈출 때가 승부야!", desc:"초록엔 톡톡, 빨강엔 멈춰! 카톡으로 초대해 동시에 겨루는 20초." },
  { path:"t/alkkagi/", rel:"친구", kind:"보드게임", soloFree:true, onlineDuel:true, thumbnailUrl:"assets/art/alkkagi-board.svg", soloSummary:"엇갈린 다섯 알! 방향을 고르고 움직이는 힘 게이지를 멈춰 톡!",
    title:"알까기 배틀 — 톡! 다음은 네 차례", desc:"다섯 알의 작은 승부. 카톡으로 친구를 초대하고 각자 휴대폰에서 겨뤄봐." },
  { path:"t/omok/", rel:"친구", kind:"보드게임", soloFree:true, localDuel:true, thumbnailUrl:"assets/art/omok-board.svg",
    title:"오목 한판 — 다음 한 수는 너야",
    desc:"15×15 자유오목. 컴퓨터와 혼자, 카톡으로 친구를 초대해 다섯 알을 이어봐." },
  { path:"t/hidden-picture/", rel:"친구", kind:"찾기", onlineDuel:true, thumbnailUrl:"t/hidden-picture/forest.png",
    title:"숨은그림찾기 — 30초 안에 몇 개 찾을래?",
    desc:"혼자는 세 장의 그림을 차례로, 친구와는 같은 그림에서 30초 동안 더 많이 찾아봐." },
  { path:"t/ranking/", rel:"친구", kind:"예측",
    title:"내 취향 맞혀봐",
    desc:"보기 세 개 중 내 최애 하나를 골라 카톡으로 보내면 친구가 맞혀요." },
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
    desc:"100문제 중 무작위 7개. 한 문제에 7초, 틀리면 5초 벌칙. 같은 문제로 점수 대결." },
  { path:"t/delivery/",  rel:"친구",  kind:"예측",
    title:"배달 텔레파시",
    desc:"내가 뭐 시킬지 맞혀봐. 못 맞히면 네가 사. 찍을 때마다 정답 공개." },
  { path:"t/ten/",       rel:"친구",  kind:"대결",
    title:"10초 맞추기",
    desc:"안 보고 10초 세다가 멈추기. 둘 다 같은 조건으로 딱 한 번." },
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
  { path:"t/pairs/",     rel:"친구",  kind:"대결",
    title:"짝 맞추기 — 누가 더 빨리 다 맞출까?",
    desc:"같은 판, 같은 카드 배치. 10짝을 다 맞춘 시간으로 승부. 네 기록은 봉인됐어." },
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
    desc:"10번 멈춰서 오차 합. 적은 쪽이 이겨." },
  { path:"t/exam/",      rel:"가족",  kind:"공부",
    title:"시험지 보내기 — 카톡으로 단어 시험",
    desc:"단어 붙여넣으면 시험지 완성. 자동 채점, 틀린 것만 다시." },
  { path:"t/love-note/", rel:"연인",  kind:"심리",
    title:"나는 이렇게 주고, 이렇게 받고 싶어",
    desc:"내가 주는 방식과 상대가 기다리는 방식은 다를 수 있어. 어긋난 자리를 찾아봐." },
  { path:"t/closeness/", rel:"연인",  kind:"심리",
    title:"우리에게 맞는 거리",
    desc:"답이 늦을 때, 말수가 줄 때, 다툰 직후. 그때 필요한 게 서로 달라." },
  { path:"t/mirror/", rel:"친구",  kind:"심리",
    title:"내가 보는 나, 네가 보는 나",
    desc:"나를 고른 말과 상대가 나에게 붙인 말. 겹친 말과 한 사람만 본 말이 갈려." },
  { path:"t/know-me/", rel:"친구", kind:"심리",
    title:"너, 나 얼마나 알아?",
    desc:"내 답 6개와 상대 예상 3개. 여행·단톡방·모임 속 선택을 비교해봐." },
  { path:"t/simon/",      rel:"친구",  kind:"대결",
    title:"순서 기억 — 누가 더 길게 외울까?",
    desc:"불빛이 켜지는 순서를 보고 그대로 따라 눌러. 한 번 틀리면 끝, 몇 라운드까지 가나." },
  { path:"t/snake/",      rel:"친구",  kind:"대결",
    title:"스네이크 20초 — 같은 먹이, 누가 더 많이 먹나",
    desc:"20초 동안 판을 쓸어 방향을 바꾸며 지렁이를 먹어. 둘이 똑같은 자리에 똑같은 먹이." },
  { path:"t/choseong/",   rel:"친구",  kind:"대결",
    title:"초성 퀴즈 — ㄸㅂㅇ 뭔지 알아?",
    desc:"같은 5문제, 60초. 초성만 보고 답을 쳐서 누가 더 많이 맞히나." },
  { path:"t/fit/",        rel:"친구",  kind:"대결",
    title:"끼워넣기 — 같은 조각, 누가 더 채우나?",
    desc:"60초, 같은 순서의 조각을 8×8 판에 끼워 넣고 줄을 지워. 점수로 승부." },
  { path:"t/2048/",       rel:"친구",  kind:"대결",
    title:"2048 한판 — 30초, 누가 더 높은 점수?",
    desc:"같은 타일 순서로 30초. 밀어서 합친 점수로 승부." },
  { path:"t/stack/",      rel:"친구",  kind:"대결",
    title:"블록 쌓기 — 20초, 누가 더 높이 쌓나",
    desc:"미끄러져 오는 블록을 톡 쳐서 멈춰. 어긋난 만큼 잘려." },
  { path:"t/mines/",      rel:"친구",  kind:"대결",
    title:"지뢰찾기 미니 — 60초, 같은 지뢰판, 누가 더 많이 푸나?",
    desc:"60초 동안 작은 지뢰판을 연달아. 밟으면 펑, 그래도 다음 판. 같은 판 순서로 승부." },
  { path:"t/slide15/",    rel:"친구",  kind:"대결",
    title:"15퍼즐 — 60초, 같은 섞임, 누가 더 많이 맞추나?",
    desc:"빈칸으로 숫자를 밀어 1부터 순서대로. 60초 동안 연달아, 두 판 맞추면 4×4로." },
  { path:"t/flap/",       rel:"친구",  kind:"대결",
    title:"탭 비행 — 같은 코스, 문 몇 개 통과할래?",
    desc:"톡톡 눌러 병아리를 띄워. 20초, 같은 문, 부딪혀도 다시 날아." },
  { path:"t/typing/",     rel:"친구",  kind:"대결",
    title:"한글 타자 20초 — 같은 문장, 누가 더 많이 치나?",
    desc:"시드로 정해진 같은 순서의 문장을 따라 쳐. 20초에 몇 글자?" }
];

// The catalogue order and artwork follow the browsing cards on the home screen.
const CARDS = [
 ['mole','atlas',10,'#ffead4',['친구','연인','가족'],'20초 동안 두더지 잡기. 황금은 놓치지 마!'],
 ['rps','classic',0,'#ffe1e5',['친구','연인','가족'],'내가 먼저 낸다. 네 선택 전까지는 비밀!'],
 ['nonsense','atlas',16,'#fff0d3',['친구','연인','가족'],'한 문제에 7초. 같은 7문제로 점수와 시간을 겨뤄봐.'],
 ['num25','atlas',9,'#e0eafa',['친구','연인','가족'],'1부터 25까지 순서대로! 같은 판으로 대결.'],
 ['pairs','atlas',6,'#e2f5ea',['친구','연인','가족'],'두 장씩 뒤집어 10짝 다 맞추기. 같은 판으로 시간 대결!'],
 ['ufo','atlas',11,'#e7e0fa',['친구','연인','가족'],'미사일 40발, 제한 시간 20초. 명중시켜봐!'],
 ['stop','atlas',15,'#fff0c9',['친구','연인','가족'],'한가운데서 딱 멈춰! 오차가 적은 쪽이 승리.'],
 ['ten','classic',1,'#fff0ae',['친구','연인','가족'],'안 보고 10초 세다가 멈추기. 둘 다 딱 한 번!'],
 ['tap','atlas',12,'#ffe0da',['친구','연인','가족'],'10초 동안 몇 번 누를까? 두 손가락도 OK.'],
 ['delivery','classic',2,'#d4f5ee',['친구','연인'],'내가 뭐 시킬지 맞혀봐. 못 맞히면 네가 쏴.'],
 ['stroop','atlas',13,'#e4f2d3',['친구','연인','가족'],'글자 말고 색깔을 답해. 알고도 헷갈려!'],
 ['arrow','atlas',14,'#dceffa',['친구','연인','가족'],'빨간 테두리면 반대로! 순간 판단 대결.'],
 ['hidden-picture','atlas',5,'#edf1df',['친구','연인','가족'],'숲·서점·옥상 정원. 숨은 물건 8개를 찾아봐. 친구와는 30초 대결!'],
 ['ranking','ranking',0,'#f9edcc',['친구','연인','가족'],'세 가지 중 내 최애는? 하나씩 골라 친구에게 보내봐.'],
 ['love-note','atlas',5,'#ffe3ea',['연인', '부부'],'내가 주는 방식과 상대가 기다리는 방식은 다를 수 있어. 어긋난 자리를 찾아봐.'],
 ['closeness','atlas',4,'#e4eef5',['연인', '부부', '친구'],'답이 늦을 때, 말수가 줄 때, 다툰 직후. 그때 필요한 게 서로 달라.'],
 ['mirror','atlas',6,'#f0ecf7',['친구', '연인', '가족'],'나를 고른 말과 상대가 나에게 붙인 말. 겹친 말과 한 사람만 본 말이 갈려.'],
 ['know-me','atlas',4,'#e3f1e6',['친구','연인','가족'],'내 답 6개와 상대 예상 3개. 여행·단톡방·모임 속 선택을 비교해봐.'],
 ['crash','atlas',2,'#e5f2cb',['친구','연인'],'정답 없는 8개의 극한 선택. 우리는 어디서 갈릴까?'],
 ['letter','letter',0,'#ffedcf',['연인','부부','친구','가족'],'특별한 날에도, 그냥 네 생각이 난 날에도.'],
 ['memory','atlas',6,'#ffe6ee',['연인','부부'],'첫 데이트, 첫 선물. 같은 기억을 떠올릴까?'],
 ['ladder','atlas',7,'#fff0d3',['친구','가족'],'오늘 커피는 누가 쏠까? 이름 넣고 사다리!'],
 ['groups','atlas',8,'#e3f1d0',['친구','가족'],'이번엔 누구랑 한 조? 뽑기로 정해봐.'],
 ['exam','atlas',16,'#e9e5fa',['친구','가족'],'단어로 시험지 만들기. 채점까지 한 번에.'],
 ['simon','atlas',13,'#efe6fb',['친구', '연인', '가족'],'불빛 순서 따라 누르기, 몇 라운드까지?'],
 ['choseong','atlas',16,'#fff0d3',['친구', '연인', '가족'],'초성만 보고 5문제, 60초 대결'],
 ['snake','atlas',1,'#e2f2e6',['친구', '연인', '가족'],'20초, 같은 지렁이, 누가 더 많이 먹나'],
 ['fit','atlas',17,'#e6f0fb',['친구', '연인', '가족'],'같은 조각 60초, 줄 지워 점수 대결'],
 ['2048','atlas',9,'#fff0d3',['친구', '연인', '가족'],'30초 밀어 합치기, 점수로 승부'],
 ['stack','atlas',12,'#ffe3dc',['친구', '연인', '가족'],'톡 쳐서 멈추는 블록 탑, 20초'],
 ['mines','atlas',15,'#fff0cf',['친구', '연인', '가족'],'60초 지뢰판 연달아, 몇 판 푸나'],
 ['tapbattle','atlas',12,'#f4ebdc',['친구','연인','가족'],'초록엔 톡톡, 빨강엔 멈춰! 카톡으로 만나 동시에 겨루는 20초.'],
 ['alkkagi','atlas',9,'#f4ead8',['친구','연인','가족'],'방향을 고르고 타이밍에 맞춰 톡! 카톡으로 초대해 다섯 알을 지켜봐.'],
 ['omok','atlas',9,'#f4ead8',['친구','연인','가족'],'다섯 알을 먼저 이어봐. 컴퓨터와 또는 카톡으로 친구와!'],
 ['slide15','atlas',9,'#e0eafa',['친구', '연인', '가족'],'60초 숫자판 연달아, 몇 판 맞추나'],
 ['flap','atlas',11,'#e9e3f9',['친구', '연인', '가족'],'20초 동안 문 몇 개 통과하나'],
 ['typing','atlas',16,'#ece6f8',['친구', '연인', '가족'],'20초 한글 타자, 몇 글자?']
];
// 혼자놀기(?solo=1)가 있는 게임과 레벨 수. 홈의 '혼자놀기' 탭과 진행도 배지가 쓴다.
window.SOLO_GAMES={pairs:5,num25:5,mole:5,simon:5,snake:5,choseong:5,'2048':5,stack:5,mines:5,slide15:5,flap:5,typing:5,fit:5,'hidden-picture':3};
const LOCAL_HOME_ITEMS=CARDS.map(([slug,art,index,color,relationships,summary])=>({
 ...ITEMS.find(item=>item.path==='t/'+slug+'/'),art,index,color,relationships,summary
}));
window.HOME_ITEMS=LOCAL_HOME_ITEMS;

/* 인기 순위: 서버가 매일 계산한 1~5위(game_catalog.popular_rank)를 목록 맨 앞에 순서대로 세운다.
   나머지 게임의 순서는 건드리지 않는다 — 목록 전체를 인기순으로 정렬하면 어제 셋째였던 게
   오늘 아홉째가 되어 찾던 걸 못 찾고, 기록이 0인 새 게임이 영영 바닥에 깔린다.
   순위가 비어 있으면(기록이 기준에 못 미치면) 평소 순서 그대로 나온다. */
const slugKey=item=>String(item.path||'').replace(/^t\//,'').replace(/\/$/,'');
let popularRank=new Map();
function orderByPopularity(items){
  if(window.APP_PUBLISHED_CONFIG?.site?.catalogOrder==='manual')return items.slice().sort((a,b)=>(Number(!!b.featured)-Number(!!a.featured))||((a.adminOrder??999)-(b.adminOrder??999)));
  if(!popularRank.size)return items.map(it=>it.popularRank?{...it,popularRank:0}:it);
  const ranked=[],rest=[];
  items.forEach(it=>{const r=popularRank.get(slugKey(it));if(r)ranked.push([r,it]);else rest.push(it.popularRank?{...it,popularRank:0}:it);});
  ranked.sort((a,b)=>a[0]-b[0]);
  return ranked.map(([r,it])=>({...it,popularRank:r})).concat(rest);
}
function setPopularRanks(rows){
  const next=new Map();
  (rows||[]).forEach(row=>{const r=Number(row&&row.popular_rank);if(row&&row.slug&&r>=1&&r<=5)next.set(row.slug,r);});
  const same=next.size===popularRank.size&&[...next].every(([k,v])=>popularRank.get(k)===v);
  popularRank=next;
  if(same)return false;
  window.HOME_ITEMS=orderByPopularity(window.HOME_ITEMS||[]);
  window.dispatchEvent(new CustomEvent('home-catalog-updated'));
  return true;
}

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

// Translate older published settings to the new series while preserving visibility and order.
// Retired standalone MBTI/seat entries must not be reintroduced by a cached server catalogue.
const PSY_SERIES_ALIASES={"personality": "know-me"};
function migratePsychologyRows(rows){
 const explicit=new Set(rows.filter(row=>row&&!PSY_SERIES_ALIASES[row.slug]).map(row=>row.slug));
 const seen=new Set();
 return rows.filter(row=>row&&!['mbti','seat'].includes(row.slug)&&!(PSY_SERIES_ALIASES[row.slug]&&explicit.has(PSY_SERIES_ALIASES[row.slug]))).map(row=>{
  const slug=PSY_SERIES_ALIASES[row.slug];if(!slug)return row;
  const local=LOCAL_HOME_ITEMS.find(item=>item.path==='t/'+slug+'/');
  return {...row,slug,path:local.path,title:local.title,summary:local.summary,thumbnailUrl:''};
 }).filter(row=>{if(seen.has(row.slug))return false;seen.add(row.slug);return true;});
}
let publishedCatalogApplied=false;
function applyPublishedCatalog(config){
  if(!config||!Array.isArray(config.games))return false;
  config={...config,games:migratePsychologyRows(config.games)};
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
        thumbnailUrl:row.thumbnailUrl||local.thumbnailUrl||'', featured:!!row.featured,adminOrder:Number(row.sortOrder)||0
      };
    }).filter(Boolean);
  appendUnknownLocal(merged,config.games);
  publishedCatalogApplied=true;
  window.HOME_ITEMS=orderByPopularity(merged);
  window.dispatchEvent(new CustomEvent('home-catalog-updated'));
  return true;
}
window.addEventListener('app-config-ready',event=>applyPublishedCatalog(event.detail));
if(window.APP_PUBLISHED_CONFIG)applyPublishedCatalog(window.APP_PUBLISHED_CONFIG);

// Supabase가 열리면 제목·설명·순서·공개 여부를 서버 값으로 덮어쓴다.
// 연결에 실패하거나 아직 등록되지 않은 항목은 기존 로컬 목록을 그대로 쓴다.
if(window.SupabaseData){
  window.SupabaseData.getGameCatalog().then(rows=>{
    // 순위는 관리자 게시본을 쓰는 경우에도 적용한다(게시본에는 순위가 없다)
    if(Array.isArray(rows))setPopularRanks(rows);
    if(publishedCatalogApplied)return;
    if(!Array.isArray(rows)||!rows.length)return;
    rows=migratePsychologyRows(rows);
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
    window.HOME_ITEMS=orderByPopularity(merged);
    window.dispatchEvent(new CustomEvent('home-catalog-updated'));
  }).catch(()=>{});
}
