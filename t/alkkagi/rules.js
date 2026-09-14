(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AlkkagiRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const RADIUS=.035,DT=1/120,DRAG=.985,STEPS=720;
 const round=n=>Math.round(n*1e6)/1e6;
 const FORMATION=[[.22,.64],[.46,.64],[.70,.64],[.34,.82],[.62,.82]];
 function create(starter=1){return {stones:Array.from({length:10},(_,id)=>{const [x,y]=FORMATION[id%5];return {id,color:id<5?1:2,x:round(id<5?x:1-x),y:round(id<5?y:1-y),alive:true};}),turn:starter===2?2:1,shots:0,winner:0,draw:false};}
 // One full low-high-low cycle. The shot samples the clock again on release.
 function gaugePower(elapsed){const phase=((Math.max(0,elapsed)%2600)/1300);return Math.round(10+90*(phase<=1?phase:2-phase));}
 function counts(stones){return [stones.filter(s=>s.alive&&s.color===1).length,stones.filter(s=>s.alive&&s.color===2).length];}
 function shoot(state,id,angle,power,record=true){
  if(state.winner||state.draw||!Number.isInteger(id)||!Number.isInteger(angle)||angle<0||angle>359||!Number.isInteger(power)||power<10||power>100)return null;
  const chosen=state.stones.find(s=>s.id===id);if(!chosen||!chosen.alive||chosen.color!==state.turn)return null;
  const stones=state.stones.map(s=>({...s,vx:0,vy:0})),p=stones[id],speed=.35+power*.0225,rad=angle*Math.PI/180,frames=[];
  p.vx=Math.cos(rad)*speed;p.vy=Math.sin(rad)*speed;
  const frame=()=>stones.map(({vx,vy,...s})=>({...s}));if(record)frames.push(frame());
  for(let step=0;step<STEPS;step++){
   for(const s of stones)if(s.alive){s.x+=s.vx*DT;s.y+=s.vy*DT;if(s.x<0||s.x>1||s.y<0||s.y>1){s.alive=false;s.vx=s.vy=0;}}
   for(let i=0;i<10;i++)for(let j=i+1;j<10;j++){
    const a=stones[i],b=stones[j];if(!a.alive||!b.alive)continue;let dx=b.x-a.x,dy=b.y-a.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist>=RADIUS*2)continue;
    if(dist<.000001){dx=1;dy=0;dist=1;}
    const nx=dx/dist,ny=dy/dist,overlap=Math.max(0,(RADIUS*2-dist)/2+.000001);a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
    const relative=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(relative>0){const impulse=relative*.97;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}
   }
   let moving=false;for(const s of stones)if(s.alive){if(s.x<0||s.x>1||s.y<0||s.y>1){s.alive=false;s.vx=s.vy=0;continue;}s.vx*=DRAG;s.vy*=DRAG;if(Math.abs(s.vx)<.005)s.vx=0;if(Math.abs(s.vy)<.005)s.vy=0;if(s.vx||s.vy)moving=true;}
   if(record&&(step%4===3||!moving))frames.push(frame());if(!moving)break;
  }
  const final=stones.map(({vx,vy,...s})=>({...s,x:round(s.x),y:round(s.y)})),[black,white]=counts(final),shots=state.shots+1;
  const finished=black===0||white===0||shots>=120,winner=finished?(black===white?0:black>white?1:2):0;
  return {state:{stones:final,shots,turn:finished?state.turn:3-state.turn,winner,draw:finished&&!winner},frames};
 }
 function aim(from,to){return (Math.round(Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI)+360)%360;}
 function choose(state){
  let best=null;const before=counts(state.stones),me=state.turn,own=state.stones.filter(s=>s.alive&&s.color===me),targets=state.stones.filter(s=>s.alive&&s.color!==me);
  for(const s of own)for(const target of targets)for(const power of [40,65,85,100]){
   const angle=aim(s,target),result=shoot(state,s.id,angle,power,false),after=counts(result.state.stones);
   const attack=before[2-me]-after[2-me],loss=before[me-1]-after[me-1];
   let score=attack*120-loss*135+(result.state.winner===me?10000:result.state.winner? -10000:0);
   for(const p of result.state.stones)if(p.alive)score+=(p.color===me?1:-1)*Math.min(p.x,1-p.x,p.y,1-p.y)*5;
   if(!best||score>best.score)best={id:s.id,angle,power,score};
  }
  return best;
 }
 return {RADIUS,create,counts,shoot,aim,choose,gaugePower};
});
