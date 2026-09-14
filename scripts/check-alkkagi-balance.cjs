// Controlled simulation, not a human win-rate estimate. Same bot and seeded
// aim/power errors on both sides, each seed played with both starting colors.
const fs=require('node:fs'),R=require('../t/alkkagi/rules.js');
const legacy=starter=>({stones:Array.from({length:10},(_,id)=>({id,color:id<5?1:2,x:+(.18+(id%5)*.16).toFixed(6),y:id<5?.76:.24,alive:true})),turn:starter,shots:0,winner:0,draw:false});
const results=[];
for(const [label,make] of [['previous-line',legacy],['staggered',R.create]]){
 const result={label,games:40,firstWins:0,secondWins:0,draws:0,totalShots:0};
 for(let seed=1;seed<=20;seed++)for(const starter of [1,2]){
  let rand=seed;const random=()=>{rand=(rand*1664525+1013904223)>>>0;return rand/4294967296;};
  let s=make(starter);
  while(!s.winner&&!s.draw){const a=R.choose(s);a.angle=(a.angle+Math.round((random()-.5)*4)+360)%360;a.power=Math.max(10,Math.min(100,a.power+Math.round((random()-.5)*20)));s=R.shoot(s,a.id,a.angle,a.power,false).state;}
  if(s.draw)result.draws++;else if(s.winner===starter)result.firstWins++;else result.secondWins++;result.totalShots+=s.shots;
 }
 result.averageShots=result.totalShots/result.games;results.push(result);
}
fs.mkdirSync('output/alkkagi-v2',{recursive:true});fs.writeFileSync('output/alkkagi-v2/balance.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
