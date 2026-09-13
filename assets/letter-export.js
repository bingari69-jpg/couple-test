(function () {
  'use strict';
  const D=window.LetterDesign;
  const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('그림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));image.src=src;});
  // Render text directly, rather than sending private letter HTML to a screenshot service.
  async function prepare(p,t) {
    const width=750,pad=76,bodyWidth=width-pad*2;
    const size=Math.max(16,Math.min(26,p.size||20))*1.6,lineHeight=size*1.9;
    const family=D.fontCSS(p.font),font=`${size}px ${family}`;
    if(document.fonts) {
      await Promise.all([document.fonts.load(font),document.fonts.load('24px "Letter Sans"')]);
      if(!document.fonts.check(font))throw new Error('글꼴을 준비 중이에요. 잠시 후 다시 저장해 주세요.');
    }
    const measure=document.createElement('canvas').getContext('2d');
    if(!measure)throw new Error('이 브라우저에서는 이미지 저장을 지원하지 않아요. 본문 복사를 이용해 주세요.');
    measure.font=font;
    const lines=[];
    String(p.w||'').replace(/\r\n?/g,'\n').split('\n').forEach(paragraph=>{
      let line='';
      for(const character of D.segments(paragraph.replace(/\t/g,'    '))){
        if(line&&measure.measureText(line+character).width>bodyWidth){lines.push(line);line='';}
        line+=character;
      }
      lines.push(line);
    });
    const perPage=Math.max(8,Math.floor(1060/lineHeight)),count=Math.max(1,Math.ceil(lines.length/perPage));
    const art=t.legacy?[await loadImage('../../assets/art/stationery-atlas.png')]:await Promise.all(['top','bottom'].map(edge=>loadImage(D.uri(D.art(t,edge)))));
    const stickers=await Promise.all((p.st||[]).filter(id=>D.sticker(id)).slice(0,3).map(id=>loadImage(D.stickerURL(id))));
    async function page(index) {
      index=Math.max(0,Math.min(count-1,index));
      const part=lines.slice(index*perPage,(index+1)*perPage),last=index===count-1;
      const top=210,after=last?220:120,height=Math.max(920,Math.ceil(top+part.length*lineHeight+after+140));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const c=canvas.getContext('2d');c.fillStyle=t.paper||'#fffaf2';c.fillRect(0,0,width,height);
      if(t.legacy){const img=art[0];c.drawImage(img,(t.x/50)*(img.width/3),(t.y/100)*(img.height/2),img.width/3,img.height/2,0,0,width,height);}
      else {
        if(t.style==='다이어리'){c.strokeStyle='#adb9a526';c.lineWidth=1;for(let x=0;x<width;x+=30){c.beginPath();c.moveTo(x,0);c.lineTo(x,height);c.stroke();}for(let y=0;y<height;y+=30){c.beginPath();c.moveTo(0,y);c.lineTo(width,y);c.stroke();}}
        c.drawImage(art[0],0,0,width,200);c.drawImage(art[1],0,height-200,width,200);
      }
      c.fillStyle=p.color||t.ink||'#393637';c.font=`28px ${family}`;c.textBaseline='top';
      c.fillText(p.n?'To. '+p.n:'너에게',pad,top-62,bodyWidth);
      c.font=font;part.forEach((line,i)=>c.fillText(line,pad,top+i*lineHeight));
      let y=top+part.length*lineHeight+28;c.textAlign='right';c.font=`26px ${family}`;
      if(last){if(p.f)c.fillText('From. '+p.f,width-pad,y,bodyWidth);y+=48;c.font='19px "Letter Sans", sans-serif';c.fillStyle='#727a70';const label=p.k===0?(p.num||100)+'일':p.k===1?(p.num||1)+'주년':p.k===2?'결혼기념일':p.k===3?'생일':'';c.fillText([p.d,label].filter(Boolean).join(' · '),width-pad,y,bodyWidth);y+=42;stickers.forEach((img,i)=>c.drawImage(img,width-pad-(stickers.length-i)*70,y,58,58));}
      else{c.fillStyle='#727a70';c.font='19px "Letter Sans", sans-serif';c.fillText('다음 장에 마음이 이어져요',width-pad,y);}
      c.textAlign='center';c.fillStyle='#6e776b';c.font='15px "Letter Sans", sans-serif';c.fillText(count>1?`${index+1} / ${count} · 같이놀자`:'같이놀자 · 마음 한 장',width/2,height-35);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('이미지를 만들지 못했어요. 다시 시도해 주세요.');return blob;
    }
    return {count,page};
  }
  window.LetterExport={prepare};
})();
