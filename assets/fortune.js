(function(){
 'use strict';const $=id=>document.getElementById(id);
 const cards=[
 ['🌱','작은 시작의 날','미뤄둔 일의 첫 단추를 채워보면 어때? 오늘은 완벽한 마무리보다 작은 시작에 의미를 두는 카드야.','딱 5분만 해보기','연두색','창가'],
 ['💌','마음을 전하는 날','생각난 사람에게 짧은 안부를 보내봐. 긴 말이 아니어도 네 마음이 담긴 한 문장은 충분해.','먼저 안부 묻기','살구색','따뜻한 차'],
 ['🌙','내 속도로 가는 날','숨을 한 번 고르고 네 리듬을 찾아봐. 잠깐 쉬는 시간도 오늘을 채우는 소중한 한 조각이야.','잠깐 알림 끄기','보라색','조용한 음악'],
 ['✨','새로움을 찾는 날','늘 걷던 길에서 작은 변화를 발견해봐. 낯선 메뉴나 새로운 노래 하나가 오늘의 재미가 될 수 있어.','새로운 노래 듣기','노란색','작은 노트'],
 ['🍀','작은 기쁨을 모으는 날','대단한 일이 없어도 좋아. 맛있었던 한 입, 반가운 인사처럼 오늘 좋았던 순간을 하나 남겨봐.','좋았던 일 하나 적기','초록색','산책길'],
 ['☀️','가볍게 정리하는 날','복잡한 생각은 잠시 종이에 내려놓아봐. 책상 한쪽을 비우듯 마음에도 작은 여백을 만들어보자.','책상 한 칸 정리하기','하늘색','맑은 물'],
 ['🔥','조금 과감해지는 날','망설이던 말이나 제안, 오늘은 먼저 꺼내봐. 생각보다 상대는 기다리고 있었을지도 몰라.','미뤄둔 말 한마디 꺼내기','주황색','뜨거운 커피'],
 ['🌊','흘려보내는 날','붙잡고 있던 걱정 하나를 오늘은 놓아줘도 돼. 물결이 지나가듯 마음도 지나가게 두는 거야.','걱정 하나 적고 접어두기','바다색','파도 소리'],
 ['🍞','든든하게 챙기는 날','오늘은 몸부터 챙겨. 따뜻한 한 끼와 충분한 물이 마음까지 단단하게 해줄 거야.','밥 한 끼 제대로 먹기','갈색','따뜻한 밥'],
 ['🎈','가볍게 웃는 날','괜히 웃음이 나는 순간을 그냥 지나치지 마. 사소한 농담 하나가 오늘의 분위기를 바꿔.','친구에게 웃긴 거 하나 보내기','분홍색','풍선'],
 ['🧭','방향을 확인하는 날','바쁘게 가기 전에 어디로 가는지 한 번만 확인해봐. 오늘은 속도보다 방향이 중요한 날이야.','이번 주 목표 한 줄 적기','남색','지도'],
 ['🌸','고마움을 말하는 날','당연하게 여긴 사람에게 고맙다고 말해봐. 짧은 말이지만 오래 남아.','고맙다고 말하기','벚꽃색','꽃 한 송이'],
 ['📚','한 발 배우는 날','궁금했던 걸 10분만 찾아봐. 오늘 배운 작은 것이 나중에 큰 도움이 될 거야.','궁금한 것 하나 찾아보기','초록색','책갈피'],
 ['🎧','내 취향을 즐기는 날','남 눈치 말고 내가 좋아하는 걸 골라봐. 오늘은 내 취향이 정답이야.','좋아하는 노래 크게 듣기','보라색','헤드폰'],
 ['🤝','같이 하는 날','혼자 끙끙대던 일, 오늘은 누군가와 나눠봐. 같이 하면 절반은 가벼워져.','도움 한 번 요청하기','민트색','두 잔의 차'],
 ['🌤️','괜찮다고 말해주는 날','완벽하지 않아도 괜찮아. 오늘의 나에게 "잘하고 있어"라고 한 번 말해줘.','거울 보고 칭찬 한마디','연노랑','햇살'],
 ['🧹','미뤄둔 걸 끝내는 날','계속 마음 한구석에 있던 작은 일, 오늘 끝내면 저녁이 가벼워져. 딱 하나만 골라.','미룬 일 하나 끝내기','회색','깔끔한 책상'],
 ['🌟','기대해도 되는 날','좋은 일이 생길 것 같은 예감을 믿어봐. 기대하는 마음이 오늘을 조금 더 빛나게 해.','기대되는 일 하나 적기','금색','별 스티커']
 ];
 const HIST='gatchi-fortune-history-v1';
 const readHist=()=>{try{const h=JSON.parse(localStorage.getItem(HIST)||'[]');return Array.isArray(h)?h.filter(validDate):[];}catch(e){return [];}};
 const addHist=d=>{try{const h=readHist();if(!h.includes(d)){h.push(d);h.sort();localStorage.setItem(HIST,JSON.stringify(h.slice(-60)));}}catch(e){}};
 const shiftDay=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
 function renderStreak(today){const box=$('streakBox');if(!box)return;const h=readHist();if(!h.includes(today)){box.hidden=true;return;}let streak=0;for(let d=today;h.includes(d);d=shiftDay(d,-1))streak++;box.replaceChildren();for(let k=6;k>=0;k--){const dot=document.createElement('i');const d=shiftDay(today,-k);if(h.includes(d))dot.className='on';dot.title=d;box.appendChild(dot);}const t=document.createElement('span');t.textContent=streak>=2?streak+'일 연속 뽑았어!':'오늘 첫 카드. 내일도 뽑으면 연속 기록이 시작돼.';box.appendChild(t);box.hidden=false;}
 let sharedIdx=null;
 function renderPair(c){const line=$('pairLine'),link=$('pairLetter');if(!line||!link)return;if(sharedIdx===null||!cards[sharedIdx]){line.hidden=true;link.hidden=true;return;}const f=cards[sharedIdx];line.textContent='친구는 '+f[0]+' '+f[1]+', 너는 '+c[0]+' '+c[1]+'. 오늘은 "'+c[3]+'"부터 해보고, 친구에게 안부 한 줄 어때?';line.hidden=false;link.hidden=false;}
 const day=()=>{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>f.find(x=>x.type===k).value).join('-');};
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 let selected=0,drawnDay=day();
 const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id);window.scrollTo(0,0);};
 function reveal(date,i,shared){selected=i;drawnDay=date;const c=cards[i];$('fortuneDate').textContent=date.replaceAll('-','.');$('fortuneIcon').textContent=c[0];$('fortuneTitle').textContent=c[1];$('fortuneBody').textContent=c[2];$('fortuneAction').textContent=c[3];$('fortuneColor').textContent=c[4];$('fortuneItem').textContent=c[5];$('sharedNote').hidden=!shared;$('drawMine').hidden=!shared;if(shared){sharedIdx=i;const sb=$('streakBox');if(sb)sb.hidden=true;const pl=$('pairLine'),pk=$('pairLetter');if(pl)pl.hidden=true;if(pk)pk.hidden=true;}else{renderStreak(date);renderPair(c);}show('outcome');}
 function own(){history.replaceState(null,'',location.pathname);const today=day();try{const saved=JSON.parse(localStorage.getItem('gatchi-fortune-v1')||'null');if(saved&&saved.d===today&&Number.isInteger(saved.i)&&cards[saved.i]){reveal(today,saved.i,false);return;}}catch(e){}$('today').textContent=today.replaceAll('-','.');show('intro');}
 document.querySelectorAll('[data-draw]').forEach(b=>b.onclick=()=>{const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);const i=Math.floor(bytes[0]/4294967296*cards.length);const d=day();try{localStorage.setItem('gatchi-fortune-v1',JSON.stringify({d,i}));}catch(e){}addHist(d);reveal(d,i,false);if(window.track)track('responded');});
 $('drawMine').onclick=own;
 function entry(){if(!location.hash){own();return;}const m=location.hash.match(/^#r=1-(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);if(m&&validDate(m[1])&&cards[Number(m[2])])reveal(m[1],Number(m[2]),true);else show('invalid');}window.addEventListener('hashchange',entry);entry();
 window.psyShareData=()=>({title:drawnDay+' · '+cards[selected][1]+' '+cards[selected][0],desc:'오늘을 위한 작은 힌트. 너도 운세 카드 한 장 뽑아볼래?',url:location.origin+location.pathname+'#r=1-'+drawnDay+'-'+selected,btn:'오늘의 카드 보기',textOnly:false});
})();
