/* Pure deterministic draw engine. mulberry32 follows the ladder game's seeded RNG. */
(function(root){
 'use strict';
 function rng(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
 function layout(seed,role){const r=rng((seed^({a:0xA341316C,b:0xC8013EA4,us:0xAD90777D}[role]))>>>0),d=Array.from({length:22},(_,i)=>i);for(let i=21;i>0;i--){const j=Math.floor(r()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
 const choice=(n,max=22)=>Number.isInteger(n)&&n>=0&&n<max;
 const name=n=>typeof n==='string'&&Array.from(n).length<=12;
 function valid(c){return !!(c&&choice(c.t,3)&&name(c.n)&&(c.v===2?Number.isInteger(c.s)&&c.s>=0&&c.s<=0xffffffff&&choice(c.a):c.v===1&&typeof c.id==='string'&&/^[a-f0-9]{16}$/.test(c.id)&&choice(c.i,3)&&Array.isArray(c.d)&&c.d.length===22&&new Set(c.d).size===22&&c.d.every(n=>choice(n))));}
 function validResult(r){return !!(r&&valid(r.c)&&name(r.n)&&(r.c.v===2?choice(r.b):choice(r.i,3)));}
 function cards(c,b){if(c.v===1){const a=c.d[c.i],rest=c.d.filter(i=>i!==a);return {a,b:rest[b],us:rest[3]};}const a=layout(c.s,'a')[c.a],other=layout(c.s,'b')[b];return {a,b:other,us:layout(c.s,'us').find(i=>i!==a&&i!==other)};}
 function pattern(a,b,details){if(a===b)return 'same';const x=details[a][2],y=details[b][2];const axis=Math.abs(x[0]-y[0])>=Math.abs(x[1]-y[1])?0:1;const relation=x[axis]===0||y[axis]===0?'neutral':Math.sign(x[axis])===Math.sign(y[axis])?'same':'opposite';return (axis===0?'x':'y')+'_'+relation;}
 const api={layout,valid,validResult,cards,pattern};if(typeof module!=='undefined')module.exports=api;else root.TarotDraw=api;
})(typeof window==='undefined'?globalThis:window);
