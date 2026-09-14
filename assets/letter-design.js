(function () {
  'use strict';
  const fonts = {
    sans: {name:'깔끔한 기본체', family:'Letter Sans', file:'letter-sans.woff2'},
    round: {name:'부드러운 둥근체', family:'Letter Round', file:'letter-round.woff2'},
    serif: {name:'차분한 명조체', family:'Letter Serif', file:'letter-serif.woff2'},
    pen: {name:'정갈한 손글씨', family:'Letter Pen', file:'letter-pen.woff2'},
    hand: {name:'귀여운 손글씨', family:'Letter Hand', file:'gaegu-regular.woff2'},
    title: {name:'통통한 제목체', family:'Letter Title', file:'jua-regular.woff2'}
  };
  const heart = '<path d="M32 53C18 43 7 34 7 22C7 8 26 5 32 18C38 5 57 8 57 22C57 34 46 43 32 53Z" fill="#d85762"/>';
  const star = '<path d="m32 5 8 17 19 3-14 13 3 19-16-9-17 9 4-19L5 25l19-3Z" fill="#f2c65a"/>';
  const flower = '<g fill="#eaa0b5"><ellipse cx="32" cy="18" rx="10" ry="14"/><ellipse cx="32" cy="46" rx="10" ry="14"/><ellipse cx="18" cy="32" rx="14" ry="10"/><ellipse cx="46" cy="32" rx="14" ry="10"/></g><circle cx="32" cy="32" r="10" fill="#f9d876"/>';
  const cat = '<path d="M10 29 9 7l18 12h10L55 7l-1 22c15 35-59 35-44 0Z" fill="#f5dbab" stroke="#644d43" stroke-width="2.5"/><g fill="#644d43"><circle cx="23" cy="33" r="2"/><circle cx="41" cy="33" r="2"/></g><path d="m29 39 3 3 3-3m-3 3v4M8 37l10 2M46 39l10-2" fill="none" stroke="#644d43" stroke-width="2.5" stroke-linecap="round"/>';
  const bear = '<g fill="#be916f" stroke="#644d43" stroke-width="2"><circle cx="14" cy="14" r="10"/><circle cx="50" cy="14" r="10"/><circle cx="32" cy="34" r="25"/></g><ellipse cx="32" cy="42" rx="13" ry="10" fill="#faead1"/><g fill="#493d37"><circle cx="22" cy="31" r="2"/><circle cx="42" cy="31" r="2"/><ellipse cx="32" cy="39" rx="4" ry="3"/></g><path d="M32 41v6" stroke="#493d37" stroke-width="2"/>';
  const ribbon = '<path d="M30 28C-3 1 0 55 30 33l-8 26 11-7 10 7-9-26C64 55 66 1 34 28Z" fill="#d987a5" stroke="#9c486c" stroke-width="2"/><circle cx="32" cy="30" r="5" fill="#f5bacf"/>';
  const stickers = [
    ['heart','하트',heart],['star','별',star],['flower','꽃',flower],['ribbon','리본',ribbon],['cat','고양이',cat],['bear','곰',bear],
    ['bunny','토끼','<g fill="#fff7e9" stroke="#927260" stroke-width="2"><ellipse cx="22" cy="19" rx="7" ry="17"/><ellipse cx="42" cy="19" rx="7" ry="17"/><ellipse cx="32" cy="41" rx="25" ry="20"/></g><path d="M23 38v4m18-4v4m-12 4 3 3 3-3" fill="none" stroke="#927260" stroke-width="3" stroke-linecap="round"/>'],
    ['cloud','구름','<path d="M14 49C-3 49 0 28 15 28c-2-25 31-30 36-4 20-1 20 26 1 26Z" fill="#c5dce9"/><path d="M24 34v3m17-3v3m-13 4q5 6 10 0" fill="none" stroke="#547991" stroke-width="2.5" stroke-linecap="round"/>'],
    ['rainbow','무지개','<path d="M7 52V35a25 25 0 0 1 50 0v17" fill="none" stroke="#de929c" stroke-width="8"/><path d="M15 52V35a17 17 0 0 1 34 0v17" fill="none" stroke="#edce80" stroke-width="8"/><path d="M23 52V35a9 9 0 0 1 18 0v17" fill="none" stroke="#87b5a5" stroke-width="8"/>'],
    ['moon','달','<path d="M44 6C13-3-5 41 26 56c12 6 25 1 31-10C22 58 12 19 44 6Z" fill="#e8c15d"/>'],
    ['sun','해','<g stroke="#e6b756" stroke-width="4" stroke-linecap="round"><path d="M32 3v7m0 44v7M3 32h7m44 0h7M11 11l5 5m32 32 5 5M11 53l5-5m32-32 5-5"/></g><circle cx="32" cy="32" r="17" fill="#f3cc6d"/>'],
    ['letter','편지','<rect x="4" y="12" width="56" height="40" rx="5" fill="#f5dfd3" stroke="#b88571" stroke-width="2"/><path d="m5 14 27 22 27-22" fill="none" stroke="#b88571" stroke-width="2"/><g transform="translate(20 23) scale(.38)">'+heart+'</g>'],
    ['spark','반짝임','<path d="M26 3q0 23 23 23-23 0-23 23Q26 26 3 26 26 26 26 3Zm23 32q0 13 13 13-13 0-13 13 0-13-13-13 13 0 13-13Z" fill="#8f96bf"/>'],
    ['balloon','풍선','<path d="M31 43q14 10 1 18" fill="none" stroke="#877363" stroke-width="2"/><ellipse cx="32" cy="23" rx="20" ry="22" fill="#e4a0b5"/><path d="m32 43-4 5h8Z" fill="#ca7f99"/><path d="M20 14q2-5 7-6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'],
    ['cake','케이크','<rect x="9" y="27" width="46" height="29" rx="5" fill="#f4cbd2"/><path d="M9 35q6 12 12 0 6 12 12 0 6 12 12 0 5 10 10 0V27H9Z" fill="#fff3df"/><path d="M32 27V16" stroke="#85adb9" stroke-width="5"/><path d="M32 2q-11 12 0 12 10 0 0-12Z" fill="#f4bb61"/>'],
    ['coffee','커피','<path d="M45 21h6c17 0 8 25-6 19" fill="none" stroke="#bc947c" stroke-width="5"/><path d="M8 20h37v23c0 16-37 16-37 0Z" fill="#d7ad91"/><path d="M18 11q-6-6 0-10m13 10q-6-6 0-10" fill="none" stroke="#c9b9ad" stroke-width="2" stroke-linecap="round"/>'],
    ['leaf','잎','<path d="M10 54C-1 10 38 14 57 4c9 36-8 56-47 50Z" fill="#9bbb91"/><path d="m9 56 37-38M21 42l1-19m9 9 16 1" fill="none" stroke="#527c62" stroke-width="2"/>'],
    ['clover','클로버','<g fill="#80ab87"><circle cx="22" cy="18" r="14"/><circle cx="43" cy="18" r="14"/><circle cx="22" cy="39" r="14"/><circle cx="43" cy="39" r="14"/></g><path d="M33 29q0 20-13 32" fill="none" stroke="#4b7f58" stroke-width="3"/>'],
    ['cherry','체리','<path d="M16 42q15-6 21-34 0 22 12 34" fill="none" stroke="#779767" stroke-width="3"/><circle cx="16" cy="45" r="13" fill="#c95661"/><circle cx="48" cy="45" r="13" fill="#e47580"/><path d="M36 10q18-11 25 2-17 9-25-2Z" fill="#94b27d"/>'],
    ['smile','스마일','<circle cx="32" cy="32" r="28" fill="#efcf75"/><path d="M21 22v6m22-6v6M19 38q13 17 26 0" fill="none" stroke="#68543c" stroke-width="3" stroke-linecap="round"/>'],
    ['stamp','우표','<path d="M7 6h50v52H7Z" fill="#d6e3e7" stroke="#729aa7" stroke-width="3" stroke-dasharray="4 4"/><rect x="14" y="13" width="36" height="38" fill="#f6faf8"/><g transform="translate(17 16) scale(.48)">'+flower+'</g>'],
    ['planet','행성','<circle cx="32" cy="31" r="20" fill="#b6abd4"/><ellipse cx="32" cy="33" rx="31" ry="9" transform="rotate(-25 32 33)" fill="none" stroke="#8d81b1" stroke-width="4"/>'],
    ['gift','선물','<rect x="8" y="24" width="48" height="35" rx="3" fill="#b9d6c3"/><path d="M6 24h52M32 24v35" stroke="#d987a5" stroke-width="8"/><path d="M32 22C3-1 9 39 32 22 57-1 59 37 32 22Z" fill="none" stroke="#d987a5" stroke-width="5"/>'],
    ['music','음표','<path d="M24 46V12l27-7v34M24 20l27-7" fill="none" stroke="#7b99ad" stroke-width="5"/><ellipse cx="16" cy="48" rx="11" ry="8" fill="#7b99ad"/><ellipse cx="43" cy="41" rx="11" ry="8" fill="#7b99ad"/>']
  ].map(([id,name,art])=>({id,name,art}));
  const svg=(art,w=64,h=64)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${art}</svg>`;
  const uri=text=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);
  const sticker=id=>stickers.find(s=>s.id===id);
  const stickerURL=id=>uri(svg((sticker(id)||stickers[0]).art));
  function art(t,edge) {
    const a=t.accent||'#a65d58',bottom=edge==='bottom';
    const put=(s,x,y,scale=1,rotate=0)=>`<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotate} 32 32)">${s}</g>`;
    let out='';
    if(t.style==='심플') out=bottom?`<path d="M54 112H546" stroke="${a}" stroke-width="1"/>`+put(t.id==='blue-note'?star:heart,276,70,.65):`<path d="M54 74H205m190 0h151" stroke="${a}" stroke-width="1"/>`+put(t.id==='blue-note'?star:heart,280,50,.6);
    if(t.style==='다이어리') out=bottom?`<path d="M440 115q24-25 45 0t45 0" fill="none" stroke="${a}" stroke-width="3"/>`+put(sticker(t.id==='lilac-memo'?'spark':'clover').art,70,64,.7):`<g transform="rotate(-5 300 50)"><path d="M210 22h175l-7 12 9 13-8 12 7 13H210l6-13-8-12 8-13Z" fill="${a}" opacity=".3"/><path d="M230 35h136M230 57h136" stroke="${a}" opacity=".25"/></g>`;
    if(t.style==='캐릭터') out=bottom?put(t.id==='cat-note'?cat:bear,423,30,1.35,-7)+put(heart,92,95,.35,15):put(t.id==='cat-note'?cat:bear,260,10,1.25)+put(star,375,54,.35);
    if(t.style==='로맨틱') out=bottom?put(t.id==='ribbon-note'?ribbon:flower,268,62,.9)+`<path d="M80 114h143m155 0h142" stroke="${a}" opacity=".45"/>`:put(t.id==='ribbon-note'?ribbon:flower,259,12,1.25)+`<path d="M45 94Q300 49 555 94" fill="none" stroke="${a}" stroke-width="1.5" opacity=".5"/>`;
    if(t.style==='축하') {
      out=Array.from({length:16},(_,i)=>`<rect x="${28+i*35}" y="${bottom?78+(i*23)%60:15+(i*17)%60}" width="${i%2?5:9}" height="${i%2?16:5}" rx="2" fill="${[a,'#e9be56','#92b5b4','#dca5ba'][i%4]}" transform="rotate(${i%2?25:-25} ${28+i*35} ${bottom?110:45})"/>`).join('');
      if(!bottom)out+=put(sticker(t.id==='party-pop'?'cake':'gift').art,266,40,1.05);
    }
    if(t.style==='한가위') {
      const moonArt='<circle cx="32" cy="32" r="27" fill="#edc96c"/><circle cx="23" cy="23" r="3" fill="#d8ad4f" opacity=".45"/><circle cx="42" cy="39" r="5" fill="#d8ad4f" opacity=".35"/>';
      const songpyeonArt='<path d="M7 43q25-38 50 0-25 24-50 0Z" fill="#9fbd88" stroke="#66805b" stroke-width="2"/><path d="M17 41q15-19 30 0" fill="none" stroke="#dce8c8" stroke-width="3"/>';
      const persimmonArt='<circle cx="32" cy="36" r="22" fill="#dc8247"/><path d="M32 16q-7-12-16-3 9 8 16 3 7-12 16-3-8 8-16 3Z" fill="#6f895a"/>';
      const roofArt='<path d="M5 31q27-8 54 0L48 15H16Z" fill="#607269"/><path d="M13 32v23m38-23v23M8 55h48" fill="none" stroke="#7b6046" stroke-width="4"/><rect x="25" y="35" width="14" height="20" fill="#e9b85c" opacity=".85"/>';
      const cosmosArt='<path d="M32 30v31M32 43q-11-8-18 1m18 7q10-9 18-1" fill="none" stroke="#6f8b62" stroke-width="2.5"/><g fill="#d990aa"><ellipse cx="32" cy="17" rx="6" ry="14"/><ellipse cx="32" cy="17" rx="6" ry="14" transform="rotate(60 32 17)"/><ellipse cx="32" cy="17" rx="6" ry="14" transform="rotate(120 32 17)"/></g><circle cx="32" cy="17" r="5" fill="#e7c967"/>';
      const cloudLine=`<path d="M35 ${bottom?108:70}q72-42 144 0t144 0 144 0 98 0" fill="none" stroke="${a}" stroke-width="2" opacity=".38"/>`;
      if(t.id==='harvest-moon')out=bottom?cloudLine+put(sticker('leaf').art,455,57,.72,-18):put(moonArt,270,10,1.12)+cloudLine;
      if(t.id==='moon-rabbit')out=bottom?put(songpyeonArt,96,74,.7,-8)+put(songpyeonArt,410,83,.55,8):put(moonArt,250,3,1.35)+put(sticker('bunny').art,276,35,.82);
      if(t.id==='songpyeon')out=bottom?[70,160,250,340,430].map((x,i)=>put(songpyeonArt,x,72,.62,i%2?8:-7)).join(''):put(sticker('leaf').art,70,34,.6,-18)+put(sticker('leaf').art,455,28,.6,18);
      if(t.id==='golden-field')out=bottom?`<path d="M0 132q95-54 190 0t190 0 220 0v28H0Z" fill="#d6b557" opacity=".65"/><path d="M60 145q55-70 110 0m95 0q55-85 110 0m65 0q40-62 80 0" fill="none" stroke="#9c7a2c" stroke-width="3"/>`:put(moonArt,440,8,.88)+`<path d="M38 82h240" stroke="${a}" opacity=".35"/>`;
      if(t.id==='bojagi')out=bottom?`<path d="M0 80h600v80H0Z" fill="#d8b55b" opacity=".22"/><path d="M0 80h200v80H0Zm400 0h200v80H400Z" fill="#b45f62" opacity=".23"/><path d="M200 80h200v80H200Z" fill="#648b79" opacity=".23"/>`:put(sticker('ribbon').art,268,30,1.05)+`<path d="M55 82h490" stroke="${a}" opacity=".35"/>`;
      if(t.id==='tile-lantern')out=bottom?`<path d="M0 127h600" stroke="#607269" stroke-width="10"/><path d="M30 127q30-28 60 0t60 0 60 0 60 0 60 0 60 0 60 0 60 0 60 0" fill="none" stroke="#607269" stroke-width="7"/>`:put(roofArt,254,7,1.25);
      if(t.id==='persimmon-day')out=bottom?put(persimmonArt,80,71,.72)+put(persimmonArt,440,78,.62):`<path d="M0 30q145 75 295 2" fill="none" stroke="#7a654c" stroke-width="4"/>`+put(persimmonArt,90,43,.78)+put(sticker('leaf').art,190,25,.48,32);
      if(t.id==='cosmos-road')out=bottom?[55,135,220,390,475,545].map((x,i)=>put(cosmosArt,x,74,.55+(i%2)*.13,i%2?8:-6)).join(''):put(cosmosArt,65,16,.66,-9)+put(cosmosArt,468,9,.72,9);
      if(t.id==='family-window')out=bottom?`<path d="M0 116h600v44H0Z" fill="#9c6b45" opacity=".25"/><rect x="215" y="70" width="170" height="90" rx="6" fill="#e8bd68" opacity=".58"/><path d="M300 70v90M215 113h170" stroke="#8b6747" stroke-width="5"/>`:put(moonArt,268,11,.95)+put(heart,346,56,.35);
      if(t.id==='cloudy-moon')out=bottom?cloudLine:put(moonArt,258,5,1.18)+`<path d="M140 70q45-48 90 0 46-55 96 0 48-42 96 0" fill="#f7f4e8" stroke="${a}" stroke-width="2" opacity=".92"/>`;
    }
    return svg(out,600,160);
  }
  const fontCSS=id=>`"${(fonts[id]||fonts.sans).family}", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  function paint(el,t) {
    el.dataset.template=t.id;el.dataset.style=t.style;el.dataset.legacy=String(!!t.legacy);
    el.style.setProperty('--tint',t.color);el.style.setProperty('--paper-color',t.paper||'#fffaf2');
    el.style.setProperty('--paper-ink',t.ink||'#3c3432');el.style.setProperty('--paper-accent',t.accent||'#ae655f');
    el.style.setProperty('--px',t.x+'%');el.style.setProperty('--py',t.y+'%');
    if(!t.legacy){el.style.setProperty('--art-top',`url("${uri(art(t,'top'))}")`);el.style.setProperty('--art-bottom',`url("${uri(art(t,'bottom'))}")`);}
  }
  function decorate(el,ids) {
    el.querySelectorAll(':scope > .paper-stickers').forEach(x=>x.remove());
    const row=document.createElement('div');row.className='paper-stickers';row.setAttribute('aria-hidden','true');
    (Array.isArray(ids)?ids:[]).filter(id=>sticker(id)).slice(0,3).forEach(id=>{const img=document.createElement('img');img.src=stickerURL(id);img.alt='';img.width=48;img.height=48;row.append(img);});
    if(row.children.length)el.append(row);
  }
  const segments=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);
  window.LetterDesign={fonts,stickers,sticker,stickerURL,art,uri,fontCSS,paint,decorate,segments};
})();
