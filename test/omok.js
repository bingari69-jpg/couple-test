const assert=require('node:assert/strict');
const R=require('../t/omok/rules');
const {load,PAGE_ERRORS}=require('./dom');
const cell=(r,c)=>r*15+c;
for(const [dr,dc,r,c] of [[0,1,0,0],[1,0,0,14],[1,1,0,0],[1,-1,0,14]]){
 const board=Array(225).fill(0);for(let n=0;n<5;n++)board[cell(r+dr*n,c+dc*n)]=1;
 assert.equal(R.winningLine(board,cell(r+dr*2,c+dc*2)).length,5,'all directions and edges');
 board[cell(r+dr*2,c+dc*2)]=2;assert.equal(R.winningLine(board,cell(r,c)).length,0,'opponent breaks line');
}
const wrapped=Array(225).fill(0);[13,14,15,16,17].forEach(i=>wrapped[i]=1);assert.equal(R.winningLine(wrapped,15).length,0,'rows never wrap');
const s=R.create();assert.equal(R.play(s,112),true);assert.equal(s.turn,2);assert.equal(R.play(s,112),false);assert.equal(R.play(s,225),false);assert.equal(R.play(s,-1),false);assert.equal(R.play(s,1.5),false);assert.equal(s.moves.length,1);R.play(s,113);R.undo(s,2);assert.equal(s.turn,1);assert.equal(s.moves.length,0);
const won=R.create();[0,30,1,31,2,32,3,33,4].forEach(i=>assert(R.play(won,i)));assert.equal(won.winner,1);assert.equal(R.play(won,6),false);R.undo(won);assert.equal(won.winner,0);assert.equal(won.turn,1);assert(R.play(won,4));
const over=R.create();[0,1,2,4,5].forEach(i=>over.board[i]=1);R.play(over,3);assert.equal(over.line.length,6,'six wins in freestyle');
const draw=R.create();draw.board=Array.from({length:225},(_,i)=>(Math.floor(i/15)+2*(i%15))%4<2?1:2);for(let i=0;i<225;i++)assert.equal(R.winningLine(draw.board,i).length,0);const final=draw.board[224];draw.board[224]=0;draw.turn=final;draw.moves=Array.from({length:224},(_,i)=>({index:i,color:draw.board[i]}));R.play(draw,224);assert.equal(draw.draw,true);assert.equal(draw.winner,0);assert.equal(R.chooseMove(draw.board,1),-1);
for(const level of ['easy','steady']){
 assert.equal(R.chooseMove(Array(225).fill(0),1,level),112);
 for(const [dr,dc,r,c] of [[0,1,0,0],[1,0,0,14],[1,1,0,0],[1,-1,0,14]]){
  const b=Array(225).fill(0);for(let n=0;n<4;n++)b[cell(r+dr*n,c+dc*n)]=2;
  const expected=cell(r+dr*4,c+dc*4),before=b.slice();assert.equal(R.chooseMove(b,2,level),expected,'takes a win');assert.equal(R.chooseMove(b,1,level),expected,'blocks immediate win');assert.deepEqual(b,before,'AI leaves board unchanged');
 }
 const gap=Array(225).fill(0);[0,1,3,4].forEach(i=>gap[i]=1);assert.equal(R.chooseMove(gap,2,level),2,'blocks a broken four');
 const both=Array(225).fill(0);[0,1,2,3].forEach(i=>both[i]=1);[30,31,32,33].forEach(i=>both[i]=2);assert.equal(R.chooseMove(both,2,level),34,'win before defending');
}
// Play a complete computer-v-computer match; every move must stay legal.
let match=R.create();const begin=Date.now();while(!match.winner&&!match.draw){const i=R.chooseMove(match.board,match.turn,'steady');assert(i>=0&&!match.board[i]);assert(R.play(match,i));}assert(match.moves.length<=225);console.log('AI match:',match.moves.length,'moves,',Date.now()-begin,'ms');
const w=load('omok','?mode=local').window,d=w.document,el=id=>d.getElementById(id);
el('start').click();assert.equal(d.querySelectorAll('.last').length,0,'empty board has no last-move rings');assert.equal(d.querySelectorAll('.om-point').length,225);d.querySelector('[data-index="112"]').click();assert.equal(d.querySelector('[data-index="112"]').dataset.stone,'0','selection is not placement');assert.equal(el('place').disabled,false);el('place').click();assert.equal(d.querySelector('[data-index="112"]').dataset.stone,'1');assert.equal(el('place').disabled,true);d.querySelector('[data-index="112"]').click();assert.equal(el('place').disabled,true,'occupied point');
el('undo').click();assert.equal(d.querySelector('[data-index="112"]').dataset.stone,'0');assert.equal(el('undo').disabled,true);
function play(i){d.querySelector('[data-index="'+i+'"]').click();el('place').click();}
[0,30,1,31,2,32,3,33,4].forEach(play);assert.equal(el('result').hidden,false);assert.equal(d.querySelectorAll('.winning').length,5);assert.equal(el('placement').hidden,true);el('undo').click();assert.equal(el('result').hidden,true);assert.equal(el('placement').hidden,false);play(4);el('replay').click();assert.equal(d.querySelectorAll('[data-stone="1"]').length,0);assert.equal(el('moveCount').textContent,'0수');assert.equal(d.querySelectorAll('.last').length,0,'replay clears all last-move rings');w.close();
assert.deepEqual(PAGE_ERRORS,[]);console.log('Omok tests passed: freestyle win/draw, legal moves, undo, tactical AI, selection/confirmation, game end and replay.');
