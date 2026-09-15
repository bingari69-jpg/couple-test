/* 검색 노출 검사
   홈 목록이 JS로만 그려지면 검색 로봇에게 게임 링크가 하나도 안 보인다. scripts/build-seo.cjs 결과가
   최신인지(홈 정적 목록·게임 페이지 메타·sitemap), 공개 홈에 관리자 링크가 없는지 확인한다. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {build}=require('../scripts/build-seo.cjs');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

const {items,changes}=build({write:false});
assert.deepEqual(changes,[],'scripts/build-seo.cjs 를 다시 실행해야 함: '+changes.join(', '));

const home=read('index.html');
const staticBlock=home.match(/<!-- static-catalog:start[\s\S]*?<!-- static-catalog:end -->/);
assert.ok(staticBlock,'홈 정적 목록 누락');
items.filter(it=>!it.playHide).forEach(it=>assert.ok(staticBlock[0].includes('href="'+it.path+'"'),'홈 정적 목록에 '+it.path+' 누락'));
/* 심리테스트·편지는 놀기 목록이 아니라 각자 메뉴에서만 */
const hidden=items.filter(it=>it.playHide);
const mind=hidden.filter(it=>it.playHide==='mind');
assert.ok(mind.length>=4,'심리테스트 표시');
assert.ok(hidden.some(it=>it.playHide==='letter'),'편지 표시');
hidden.forEach(it=>assert.ok(!staticBlock[0].includes('href="'+it.path+'"'),it.path+' 는 놀기 목록에서 빠져야 함'));
mind.forEach(it=>assert.ok(read('assets/psychology-hub.js').includes(it.path.replace('t/','../')),it.path+' 는 심리 메뉴에 있어야 함'));
assert.ok(home.includes('href="t/letter/"'),'편지는 홈 편지 화면에서 바로 갈 수 있어야 함');
assert.ok(!/href="(\.\/)?admin\/"/.test(home),'공개 홈에 관리자 링크가 있으면 안 됨');

const sitemap=read('sitemap.xml');
items.forEach(it=>{
  const html=read(it.path+'index.html');
  assert.match(html,/<meta\s+name="description"\s+content="[^"]{10,}"/,it.path+' description 누락');
  assert.match(html,/rel="canonical"/,it.path+' canonical 누락');
  assert.match(html,/property="og:image"/,it.path+' og:image 누락');
  assert.match(html,/<title>[^<]*같이놀자[^<]*<\/title>/,it.path+' 제목에 서비스 이름 누락');
  assert.ok(sitemap.includes('<loc>https://noljago.co.kr/'+it.path+'</loc>'),it.path+' sitemap 누락');
});
console.log('검색 노출 검사 통과 — 홈 정적 목록 '+(items.length-hidden.length)+'개(심리·편지 '+hidden.length+'종 제외), 페이지 메타·sitemap 최신, 관리자 링크 비노출');
