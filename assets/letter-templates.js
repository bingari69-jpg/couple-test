(function(){
  'use strict';
  const modern = [
    {id:'little-heart',name:'작은 마음',style:'심플',line:'많은 말보다, 너에게 남기는 한 문장.',paper:'#fffdfa',color:'#eee8de',accent:'#b44950',font:'sans'},
    {id:'blue-note',name:'파란 여백',style:'심플',line:'담백한 종이 위에 또렷하게 남는 마음.',paper:'#f9fbff',color:'#dde7f5',accent:'#426ba5',font:'round'},
    {id:'daily-note',name:'오늘의 한 페이지',style:'다이어리',line:'평범한 오늘도 너와 나누면 특별하니까.',paper:'#fffdf2',color:'#e8eddb',accent:'#7b9867',font:'pen'},
    {id:'lilac-memo',name:'라일락 메모',style:'다이어리',line:'기억하고 싶은 순간을 살짝 붙여 두어요.',paper:'#fcfaff',color:'#e9e0f2',accent:'#9782b1',font:'hand'},
    {id:'cat-note',name:'고양이가 전해요',style:'캐릭터',line:'쑥스러운 말은 고양이에게 맡겨요.',paper:'#fffdf6',color:'#f6e7c9',accent:'#af8350',font:'hand'},
    {id:'bear-hug',name:'곰의 작은 안부',style:'캐릭터',line:'말없이 꼭 안아 주고 싶은 날.',paper:'#fcfaf5',color:'#e8dfd3',accent:'#956f56',font:'round'},
    {id:'ribbon-note',name:'리본으로 묶은 말',style:'로맨틱',line:'오래 풀어 보고 싶은, 너에게 보내는 마음.',paper:'#fff9fa',color:'#f0d9e2',accent:'#a45475',font:'serif'},
    {id:'bloom-note',name:'한 송이의 고백',style:'로맨틱',line:'네가 있어서 피어난 작은 마음.',paper:'#fffdf9',color:'#f4e4de',accent:'#b87578',font:'serif'},
    {id:'party-pop',name:'오늘은 네 날',style:'축하',line:'세상에서 제일 신나는 축하를 보낼게.',paper:'#fffdf6',color:'#f9eac3',accent:'#d27b56',font:'title'},
    {id:'gift-note',name:'너라는 선물',style:'축하',line:'좋은 일이 생긴 너에게, 박수를 가득.',paper:'#fafffc',color:'#dcece3',accent:'#609983',font:'round'}
  ].map(t=>({...t,tag:t.style+' · 새로운 편지지',ink:'#393637',size:['hand','pen'].includes(t.font)?23:20,occasions:['그냥','생일','기념일','고마워','미안해','응원']}));
  const vintage = [
    {id:'spring',name:'봄날의 꽃편지',tag:'봄 · 따뜻한',season:'봄',occasions:['그냥','고마워'],line:'꽃이 피듯, 마음도 살며시.',color:'#fce6e5',x:0,y:0},
    {id:'birthday',name:'너의 생일에',tag:'생일 · 귀여운',season:'봄',occasions:['생일'],line:'오늘의 주인공에게, 마음을 담아.',color:'#ffe7e9',x:50,y:0},
    {id:'moon',name:'우리의 100일',tag:'기념일 · 로맨틱한',season:'여름',occasions:['기념일'],line:'너와 함께한 날들이 별처럼 빛나.',color:'#e8e4ff',x:100,y:0},
    {id:'sea',name:'바다에서 온 편지',tag:'여름 · 시원한',season:'여름',occasions:['그냥','생일'],line:'파도에 실어 보내는 내 마음.',color:'#dff3f4',x:0,y:100},
    {id:'autumn',name:'책 사이의 마음',tag:'가을 · 차분한',season:'가을',occasions:['그냥','고마워','기념일'],line:'오래 간직하고 싶은 한 페이지.',color:'#f6e8d5',x:50,y:100},
    {id:'winter',name:'눈 내리는 밤',tag:'겨울 · 포근한',season:'겨울',occasions:['그냥','생일','기념일','고마워'],line:'추운 날에도 마음은 따뜻하게.',color:'#e4edf9',x:100,y:100}
  ].map(t=>({...t,style:'수채화',legacy:true,font:'hand',size:22,paper:'#fffaf2',ink:'#443c37',accent:'#ac7163',occasions:['그냥','생일','기념일','고마워','미안해','응원']}));
  window.LETTER_TEMPLATES = [...vintage,...modern];
})();
