(function(root){
 'use strict';
 const DURATION=20000,MIN_GAP=35;
 let cachedSeed=null,cachedPhases=null;
 function phases(seed){
  if(seed===cachedSeed)return cachedPhases;
  let x=seed,t=0,i=0;const out=[];
  while(t<DURATION){x=(x*37+17)%997;const green=i%2===0;const span=i===0?1400:(green?1000:550)+x%650;out.push({start:t,end:Math.min(DURATION,t+span),green});t+=span;i++;}
  cachedSeed=seed;cachedPhases=out;return out;
 }
 function greenAt(seed,time){const p=phases(seed).find(p=>time>=p.start&&time<p.end);return !!p&&p.green;}
 function score(seed,events){let good=0,bad=0,combo=0,best=0;for(const t of events){if(greenAt(seed,t)){good++;combo++;best=Math.max(best,combo);}else{bad++;combo=0;}}return {score:good-bad*3,good,bad,best};}
 const api={DURATION,MIN_GAP,phases,greenAt,score};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.TapBattleRules=api;
})(typeof window!=='undefined'?window:globalThis);
