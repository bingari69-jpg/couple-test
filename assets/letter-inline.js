/* Plain text + verified sticker positions. No saved or received HTML is trusted. */
(function(){
 'use strict';const D=window.LetterDesign,MARK='\ufffc',MAX_STICKERS=24;
 function clean(text,items){const seen=new Set();return (Array.isArray(items)?items:[]).filter(x=>Array.isArray(x)&&Number.isInteger(x[0])&&x[0]>=0&&text[x[0]]===MARK&&D.sticker(x[1])&&!seen.has(x[0])&&seen.add(x[0])).slice(0,MAX_STICKERS).sort((a,b)=>a[0]-b[0]).map(x=>[x[0],x[1]]);}
 function tokens(text,items){const map=new Map(clean(text,items)),out=[];let pos=0;for(const part of D.segments(text)){out.push(map.has(pos)?{sticker:map.get(pos),text:MARK}:{text:part});pos+=part.length;}return out;}
 function stickerNode(id,editable){const s=document.createElement('span');s.className='inline-letter-sticker';s.dataset.letterSticker=id;if(editable)s.contentEditable='false';const img=document.createElement('img');img.src=D.stickerURL(id);img.alt=D.sticker(id).name+' 스티커';img.draggable=false;s.append(img);return s;}
 function render(el,text,items,editable=false){const valid=clean(text,items);el.replaceChildren();let from=0;for(const [at,id] of valid){if(at>from)el.append(document.createTextNode(text.slice(from,at)));el.append(stickerNode(id,editable));from=at+1;}if(from<text.length)el.append(document.createTextNode(text.slice(from)));if(!el.childNodes.length)el.append(document.createTextNode(''));}
 function plain(text,items){return tokens(text,items).map(x=>x.sticker?'['+D.sticker(x.sticker).name+']':x.text).join('');}
 // Browser editing can introduce DIV/P/BR nodes on Enter. Normalize them to ordinary line breaks.
 function read(el){if(el.childNodes.length===1&&el.firstChild.nodeName==='BR')return {text:'',inline:[]};let text='',inline=[];const walk=parent=>{Array.from(parent.childNodes).forEach((n,i)=>{
  if(n.nodeType===3){text+=n.data;return;}if(n.nodeType!==1)return;
  if(n.dataset.letterSticker&&D.sticker(n.dataset.letterSticker)){inline.push([text.length,n.dataset.letterSticker]);text+=MARK;return;}
  if(n.tagName==='BR'){if(parent!==el&&parent.childNodes.length===1)return;text+='\n';return;}
  if(['SCRIPT','STYLE','IMG'].includes(n.tagName))return;
  const block=['DIV','P','LI'].includes(n.tagName);if(block&&i>0)text+='\n';walk(n);
 });};walk(el);return {text,inline:clean(text,inline)};}
 function create(el,mirror,onChange,onLimit){
  let saved=null,composing=false,last='',lastInline=[],updating=false;
  const inside=n=>n&&(n===el||el.contains(n));
  function outside(range){const n=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement,atom=n?.closest?.('[data-letter-sticker]');if(range.collapsed&&atom&&el.contains(atom)){range.setStartAfter(atom);range.collapse(true);}return range;}
  function remember(){const sel=window.getSelection();if(sel&&sel.rangeCount&&inside(sel.anchorNode)&&inside(sel.focusNode))saved=outside(sel.getRangeAt(0).cloneRange());}
  document.addEventListener('selectionchange',remember);
  function restore(){const target=saved;el.focus({preventScroll:true});const sel=window.getSelection();if(target&&inside(target.startContainer)&&inside(target.endContainer)){sel.removeAllRanges();sel.addRange(outside(target));}else{const r=document.createRange();r.selectNodeContents(el);r.collapse(false);sel.removeAllRanges();sel.addRange(r);saved=r;}return sel.getRangeAt(0);}
  function changed(){if(updating)return;const value=read(el);last=value.text;lastInline=value.inline;el.dataset.empty=String(!last);mirror.value=last;onChange(last,lastInline);remember();}
  function set(text,inline){el.dataset.empty=String(!text);if(text===last&&JSON.stringify(clean(text,inline))===JSON.stringify(lastInline))return;last=text;lastInline=clean(text,inline);render(el,text,lastInline,true);mirror.value=text;saved=null;}
  function select(start,end=start){
   const points=[];let at=0;const walk=n=>{if(n.nodeType===3){for(let i=0;i<=n.data.length;i++)points[at+i]=[n,i];at+=n.data.length;}else if(n.nodeType===1&&n.dataset.letterSticker){const i=Array.prototype.indexOf.call(n.parentNode.childNodes,n);points[at]=[n.parentNode,i];at++;points[at]=[n.parentNode,i+1];}else{for(const child of n.childNodes)walk(child);}};walk(el);
   const fallback=[el,el.childNodes.length],a=points[start]||fallback,b=points[end]||fallback,r=document.createRange();r.setStart(...a);r.setEnd(...b);saved=r;
  }
  /* 조합 중이면 우리가 끝낸다. 예전에는 안내만 띄우고 돌려보냈는데, 버튼을 눌러도
     compositionend 를 보내지 않는 안드로이드 키보드가 있어서 그런 기기에서는 안내만 반복되고
     스티커·이모지를 영영 넣을 수 없었다. blur 하면 IME 가 조합 중인 글자를 확정한다.
     바로 뒤 restore() 가 다시 포커스를 주고 저장해 둔 커서 자리로 돌아간다. */
  function endComposition(){if(!composing)return;try{el.blur();}catch(_){}composing=false;changed();}
  function insert(text,id,enforceLimit=true){
   endComposition();
   const range=restore(),before=read(el),selected=read(range.cloneContents());
   if(id&&before.inline.length-selected.inline.length>=MAX_STICKERS){onLimit('글 사이 스티커는 24개까지 넣을 수 있어요.');return false;}
   const n=D.segments(before.text).length-D.segments(selected.text).length+D.segments(id?MARK:text).length;
   if(n>450&&enforceLimit){onLimit('편지는 스티커와 이모지를 포함해 450자까지 넣을 수 있어요.');return false;}
   let ok=false;try{if(document.execCommand)ok=document.execCommand(id?'insertHTML':'insertText',false,id?stickerNode(id,true).outerHTML:text);}catch{}
   if(!ok){range.deleteContents();const added=id?stickerNode(id,true):document.createTextNode(text);range.insertNode(added);range.setStartAfter(added);range.collapse(true);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);}
   const sel=window.getSelection();if(sel?.rangeCount){const caret=outside(sel.getRangeAt(0).cloneRange());sel.removeAllRanges();sel.addRange(caret);}changed();return true;
  }
  el.addEventListener('input',()=>{if(!composing)changed();});
  el.addEventListener('compositionstart',()=>{composing=true;});el.addEventListener('compositionend',()=>{composing=false;changed();});
  el.addEventListener('blur',remember);el.addEventListener('keyup',remember);el.addEventListener('pointerup',remember);
  el.addEventListener('paste',e=>{e.preventDefault();const text=(e.clipboardData?.getData('text/plain')||'').replace(/\r\n?/g,'\n');if(text.length>16000){onLimit('붙여넣을 글이 너무 길어요. 조금 나눠서 붙여넣어 주세요.');return;}insert(text,undefined,false);});
  for(const type of ['copy','cut'])el.addEventListener(type,e=>{const sel=window.getSelection();if(!e.clipboardData||!sel?.rangeCount||!inside(sel.anchorNode)||!inside(sel.focusNode))return;const part=read(sel.getRangeAt(0).cloneContents());e.clipboardData.setData('text/plain',plain(part.text,part.inline));e.preventDefault();if(type==='cut'){if(document.execCommand)document.execCommand('delete');else sel.getRangeAt(0).deleteContents();changed();}});
  el.addEventListener('drop',e=>{e.preventDefault();});
  el.addEventListener('beforeinput',e=>{if(e.inputType?.startsWith('format'))e.preventDefault();});
  // Plain-text integrations and restored drafts can still use the original textarea model.
  mirror.addEventListener('input',()=>{if(updating)return;lastInline=clean(mirror.value,lastInline);set(mirror.value,lastInline);});
  mirror.addEventListener('select',()=>select(mirror.selectionStart,mirror.selectionEnd));
  function clear(){const value=read(el),map=new Map(value.inline);let next='';for(let i=0;i<value.text.length;i++)if(!map.has(i))next+=value.text[i];const range=document.createRange();range.selectNodeContents(el);saved=range;insert(next,undefined,false);}
  return {set,read:()=>read(el),remember,focus:restore,select,insertText:text=>insert(text),insertSticker:id=>insert('',id),clear};
 }
 window.LetterInline={MARK,MAX_STICKERS,clean,tokens,plain,render,read,create};
})();
