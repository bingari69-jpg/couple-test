const assert = require('node:assert/strict');
const R = require('../t/seotda/rules');
const cards = R.deck(), plain = m => cards[(m-1)*2+1], bright = m => cards[(m-1)*2];
const hand = (a,b) => [plain(a),plain(b)];
const ranks = [
  [[bright(3),bright(8)],'38광땡'],[[bright(1),bright(3)],'13광땡'],
  ...Array.from({length:10},(_,i)=>[[cards[(9-i)*2],cards[(9-i)*2+1]],i===0?'장땡':(10-i)+'땡']),
  [hand(1,2),'알리'],[hand(1,4),'독사'],[hand(1,9),'구삥'],[hand(1,10),'장삥'],[hand(4,10),'장사'],[hand(4,6),'세륙'],
  [hand(2,7),'갑오 · 9끗'],[hand(2,6),'8끗'],[hand(2,5),'7끗'],[hand(2,4),'6끗'],[hand(2,3),'5끗'],
  [hand(5,9),'4끗'],[hand(5,8),'3끗'],[hand(5,7),'2끗'],[hand(5,6),'1끗'],[hand(2,8),'망통']
];
for(let i=0;i<ranks.length;i++) {
  assert.equal(R.rank(ranks[i][0]).name,ranks[i][1]);
  for(let j=i+1;j<ranks.length;j++) assert.equal(R.compare(ranks[i][0],ranks[j][0]),1,ranks[i][1]+' beats '+ranks[j][1]);
}
assert.equal(R.compare([bright(1),bright(3)],[bright(1),bright(8)]),0,'13 and 18 bright tie');
assert.equal(R.rank(hand(3,8)).name,'1끗','months alone are not bright');
assert.equal(R.rank([bright(3),plain(8)]).name,'1끗');
assert.equal(R.rank(hand(4,9)).name,'3끗','no redeal special rule');
assert.equal(R.rank(hand(3,7)).name,'망통','no counter special rule');
assert.equal(R.compare(hand(2,3),hand(6,9)),0,'equal points tie');
assert.throws(()=>R.rank([cards[0],cards[0]]));
let pairs=0,triples=0,brights=0,doubles=0,specials=0;
for(let a=0;a<20;a++)for(let b=a+1;b<20;b++) {
  const rank=R.rank([cards[a],cards[b]]);pairs++;
  assert.deepEqual(rank,R.rank([cards[b],cards[a]]),'order does not change rank');
  if(rank.score>=99)brights++;else if(rank.score>=81)doubles++;else if(rank.score>=64)specials++;
  for(let c=b+1;c<20;c++) {
    const h=[cards[a],cards[b],cards[c]],discard=R.bestDiscard(h);
    const scores=[[h[0],h[1]],[h[0],h[2]],[h[1],h[2]]].map(p=>R.rank(p).score);
    assert.equal(R.rank(R.pair(h,discard)).score,Math.max(...scores));triples++;
  }
}
assert.deepEqual([pairs,triples,brights,doubles,specials],[190,1140,3,10,24]);
let seed=91234;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const invariant=s=>{
  assert.equal(s.banks[0]+s.banks[1]+(s.pot||0),200,'chips are conserved');
  s.banks.forEach(b=>assert.ok(Number.isInteger(b)&&b>=0,'non-negative whole chips'));
  if(s.hands) assert.equal(new Set(s.hands.flat().map(c=>c.id)).size,6,'six unique cards');
  assert.ok(s.history.length<=5);
};
let outcomes=new Set(),phases=new Set();
for(let game=0;game<2000;game++) {
  let s=R.create();
  do {
    s=R.next(s,random);invariant(s);
    assert.strictEqual(R.confirm(s),s,'must select a discard');
    for(const bad of [-1,3,.5,NaN])assert.strictEqual(R.discard(s,bad),s);
    assert.strictEqual(R.bet(s,10),s,'no betting before discard');
    s=R.discard(s,Math.floor(random()*3));s=R.confirm(s);
    assert.strictEqual(R.discard(s,1),s,'discard is locked once confirmed');
    for(const bad of [-1,s.cap+1,NaN,Infinity,5.5,'10'])assert.strictEqual(R.bet(s,bad),s);
    s=random()<.1?R.fold(s):R.bet(s,Math.floor(random()*(s.cap-s.bets[0]+1))+s.bets[0],random);
    phases.add(s.phase);invariant(s);
    if(s.phase==='response') {
      assert.ok(s.bets[1]>s.bets[0]&&s.bets[1]<=s.cap);
      s=R.respond(s,random()<.3?'fold':'call');
    }
    invariant(s);assert.equal(s.phase,'result');outcomes.add(s.result.reason+':'+s.result.winner);
    assert.strictEqual(R.bet(s,20),s,'repeat clicks cannot pay twice');
    assert.strictEqual(R.respond(s,'call'),s,'repeat calls cannot pay twice');
    assert.strictEqual(R.fold(s),s,'repeat folds cannot settle twice');
    assert.equal(s.history.length,s.round);
  } while(!R.over(s));
  assert.strictEqual(R.next(s,random),s,'cannot continue completed match');
}
assert.deepEqual([...phases].sort(),['response','result']);
for(const result of ['showdown:0','showdown:1','showdown:-1','bot-fold:0','player-fold:1'])assert.ok(outcomes.has(result),result);
// Effective stacks: a player cannot lose more than the smaller starting bank.
for(const banks of [[3,197],[197,3],[1,199],[199,1],[199,1],[100,100]]) {
  let s=R.create();s.banks=banks;s=R.next(s,random);s=R.confirm(R.discard(s,0));
  const old=s;s=R.bet(s,s.cap,()=>.8);
  assert.equal(s.phase,'result');invariant(s);
  assert.ok(Math.abs(s.result.delta)<=Math.min(...banks));
  assert.notEqual(old.phase,s.phase,'transitions return a new state');
}
// Same computer hand and public betting -> same response regardless of private player cards.
let a=R.confirm(R.discard(R.next(R.create(),random),0));
let b=JSON.parse(JSON.stringify(a));
b.hands[0]=[plain(2),plain(5),plain(7)];b.discards[0]=1;
const aBet=R.bet(a,15,()=>.94),bBet=R.bet(b,15,()=>.94);
assert.equal(aBet.phase,'response');assert.equal(bBet.phase,'response');
assert.deepEqual(aBet.bets,bBet.bets);assert.equal(aBet.botLine,bBet.botLine);
assert.deepEqual(R.botAction(hand(2,8),5,5,100,()=>.95),{type:'raise',total:15},'computer can bluff with a weak hand');
assert.deepEqual(R.botAction(hand(2,8),100,5,100,()=>0),{type:'fold'},'weak computer can fold');
console.log('Seotda passed: 190 hands, 1,140 three-card choices, 2,000 matches, ranking/ties, discard locks, betting/folds/all-in, fair computer inputs, chip conservation and no double settlement.');
