(function(){
 'use strict';const $=id=>document.getElementById(id);
 const cards=[
 ['🌱','작은 시작의 날','미뤄둔 일의 첫 단추를 채워보면 어때? 오늘은 완벽한 마무리보다 작은 시작에 의미를 두는 카드야.','딱 5분만 해보기','연두색','창가'],
 ['💌','마음을 전하는 날','생각난 사람에게 짧은 안부를 보내봐. 긴 말이 아니어도 네 마음이 담긴 한 문장은 충분해.','먼저 안부 묻기','살구색','따뜻한 차'],
 ['🌙','내 속도로 가는 날','숨을 한 번 고르고 네 리듬을 찾아봐. 잠깐 쉬는 시간도 오늘을 채우는 소중한 한 조각이야.','잠깐 알림 끄기','보라색','조용한 음악'],
 ['✨','새로움을 찾는 날','늘 걷던 길에서 작은 변화를 발견해봐. 낯선 메뉴나 새로운 노래 하나가 오늘의 재미가 될 수 있어.','새로운 노래 듣기','노란색','작은 노트'],
 ['🍀','작은 기쁨을 모으는 날','대단한 일이 없어도 좋아. 맛있었던 한 입, 반가운 인사처럼 오늘 좋았던 순간을 하나 남겨봐.','좋았던 일 하나 적기','초록색','산책길'],
 ['☀️','가볍게 정리하는 날','복잡한 생각은 잠시 종이에 내려놓아봐. 책상 한쪽을 비우듯 마음에도 작은 여백을 만들어보자.','책상 한 칸 정리하기','하늘색','맑은 물']
 ];
 const day=()=>{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>f.find(x=>x.type===k).value).join('-');};
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 let selected=0,drawnDay=day();
 const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id);window.scrollTo(0,0);};
 function reveal(date,i,shared){selected=i;drawnDay=date;const c=cards[i];$('fortuneDate').textContent=date.replaceAll('-','.');$('fortuneIcon').textContent=c[0];$('fortuneTitle').textContent=c[1];$('fortuneBody').textContent=c[2];$('fortuneAction').textContent=c[3];$('fortuneColor').textContent=c[4];$('fortuneItem').textContent=c[5];$('sharedNote').hidden=!shared;$('drawMine').hidden=!shared;show('outcome');}
 function own(){history.replaceState(null,'',location.pathname);const today=day();try{const saved=JSON.parse(localStorage.getItem('gatchi-fortune-v1')||'null');if(saved&&saved.d===today&&Number.isInteger(saved.i)&&cards[saved.i]){reveal(today,saved.i,false);return;}}catch(e){}$('today').textContent=today.replaceAll('-','.');show('intro');}
 document.querySelectorAll('[data-draw]').forEach(b=>b.onclick=()=>{const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);const i=Math.floor(bytes[0]/4294967296*cards.length);const d=day();try{localStorage.setItem('gatchi-fortune-v1',JSON.stringify({d,i}));}catch(e){}reveal(d,i,false);if(window.track)track('responded');});
 $('drawMine').onclick=own;
 function entry(){if(!location.hash){own();return;}const m=location.hash.match(/^#r=1-(\d{4}-\d{2}-\d{2})-([0-5])$/);if(m&&validDate(m[1]))reveal(m[1],Number(m[2]),true);else show('invalid');}window.addEventListener('hashchange',entry);entry();
 window.psyShareData=()=>({title:drawnDay+' · '+cards[selected][1]+' '+cards[selected][0],desc:'오늘을 위한 작은 힌트. 너도 운세 카드 한 장 뽑아볼래?',url:location.origin+location.pathname+'#r=1-'+drawnDay+'-'+selected,btn:'오늘의 카드 보기',textOnly:true});
})();
