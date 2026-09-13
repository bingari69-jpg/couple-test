(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OmokRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SIZE=15,AREA=SIZE*SIZE,DIRS=[[0,1],[1,0],[1,1],[1,-1]];
 const inside=(r,c)=>r>=0&&r<SIZE&&c>=0&&c<SIZE;
 function create(){return {board:Array(AREA).fill(0),turn:1,moves:[],winner:0,draw:false,line:[]};}
 function winningLine(board,index){
  const color=board[index];if(!color)return [];
  const r=Math.floor(index/SIZE),c=index%SIZE;
  for(const [dr,dc] of DIRS){const line=[index];for(const sign of [-1,1]){for(let n=1;inside(r+dr*n*sign,c+dc*n*sign);n++){const j=(r+dr*n*sign)*SIZE+c+dc*n*sign;if(board[j]!==color)break;sign<0?line.unshift(j):line.push(j);}}if(line.length>=5)return line;}
  return [];
 }
 function play(state,index){
  if(!Number.isInteger(index)||index<0||index>=AREA||state.board[index]||state.winner||state.draw)return false;
  const color=state.turn;state.board[index]=color;state.moves.push({index,color});state.line=winningLine(state.board,index);
  if(state.line.length)state.winner=color;else if(state.moves.length===AREA)state.draw=true;else state.turn=3-color;
  return true;
 }
 function undo(state,count=1){let removed=0;while(removed<count&&state.moves.length){const m=state.moves.pop();state.board[m.index]=0;state.turn=m.color;removed++;}if(removed){state.winner=0;state.draw=false;state.line=[];}return removed;}
 function candidates(board){
  const set=new Set();board.forEach((v,i)=>{if(!v)return;const r=Math.floor(i/SIZE),c=i%SIZE;for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){const rr=r+dr,cc=c+dc;if(inside(rr,cc)&&!board[rr*SIZE+cc])set.add(rr*SIZE+cc);}});
  return set.size?[...set]:board.every(v=>!v)?[112]:[];
 }
 function scoreAt(board,index,color){
  if(board[index])return -Infinity;
  board[index]=color;const r=Math.floor(index/SIZE),c=index%SIZE;let score=0;
  for(const [dr,dc] of DIRS){let length=1,open=0;for(const sign of [-1,1]){let n=1;while(inside(r+dr*n*sign,c+dc*n*sign)&&board[(r+dr*n*sign)*SIZE+c+dc*n*sign]===color){length++;n++;}if(inside(r+dr*n*sign,c+dc*n*sign)&&!board[(r+dr*n*sign)*SIZE+c+dc*n*sign])open++;}
   if(length>=5){score+=10000000;continue;}
   if(open)score+=({1:[0,1,4],2:[0,24,90],3:[0,400,2600],4:[0,16000,70000]})[length][open];
   // Also value a five-point window with a gap, not only contiguous stones.
   for(let offset=-4;offset<=0;offset++){let count=0,valid=true;for(let k=0;k<5;k++){const rr=r+dr*(offset+k),cc=c+dc*(offset+k);if(!inside(rr,cc)||board[rr*SIZE+cc]===3-color){valid=false;break;}if(board[rr*SIZE+cc]===color)count++;}if(valid)score+=[0,1,8,75,1800,10000000][count];}
  }
  board[index]=0;return score;
 }
 function ranked(board,color){return candidates(board).map(index=>{const attack=scoreAt(board,index,color),defense=scoreAt(board,index,3-color);return {index,attack,defense,score:attack+defense*1.05+(14-Math.abs(Math.floor(index/SIZE)-7)-Math.abs(index%SIZE-7))*.1};}).sort((a,b)=>b.score-a.score||a.index-b.index);}
 function chooseMove(board,color,level='steady'){
  const options=ranked(board,color);if(!options.length)return -1;
  const wins=options.filter(x=>x.attack>=10000000);if(wins.length)return wins[0].index;
  const blocks=options.filter(x=>x.defense>=10000000);if(blocks.length)return blocks[0].index;
  if(level==='easy')return options[0].index;
  let best=options[0].index,bestScore=-Infinity;
  // Bounded two-ply search; the computer only sees the public board.
  for(const move of options.slice(0,8)){
   board[move.index]=color;const replies=ranked(board,3-color);let worst=0;
   for(const reply of replies.slice(0,6))worst=Math.max(worst,reply.attack*1.1+reply.defense*.12);
   board[move.index]=0;const value=move.score-worst*.85;
   if(value>bestScore){bestScore=value;best=move.index;}
  }
  return best;
 }
 return {SIZE,AREA,create,play,undo,winningLine,chooseMove,scoreAt};
});
