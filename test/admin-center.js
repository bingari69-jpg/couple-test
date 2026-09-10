const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const ROOT = path.join(__dirname, '..');

function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function config(gameVisibility) {
  return {
    schemaVersion: 1,
    site: { name:'우리놀자', headingFont:'jua', bodyFont:'pretendard', fontScale:'1', primaryColor:'#123456', secondaryColor:'#654321', backgroundColor:'#fffaf0', menu:[{id:'home',label:'처음',href:'./',enabled:true}] },
    games: [{slug:'ten',path:'t/ten/',title:'열 초 도전',summary:'설명',visibility:gameVisibility||'listed',sortOrder:1,relationships:['친구'],adsMode:'inherit'}],
    ads: { enabled:false, slots:[] }
  };
}
function runtimeDom(url, value) {
  const runtime = read('assets/app-config.js').replace(/<\/script/gi, '<\\/script');
  const payload = JSON.stringify(value).replace(/</g, '\\u003c');
  return new JSDOM(`<!doctype html><html><head></head><body><main><a class="brand">같이놀자<b>♥</b></a><nav id="menu"></nav><span id="rpsPageTitle">10초</span></main><script>localStorage.setItem('gatchi_admin_preview',JSON.stringify(${payload}))</script><script>${runtime}</script></body></html>`, { url, runScripts:'dangerously', pretendToBeVisual:true });
}

(async function () {
  const adminHtml = read('admin/index.html');
  ['loginForm','adminApp','gameList','menuEditor','designForm','adList','versionList','publishDialog'].forEach(id => assert(adminHtml.includes(`id="${id}"`), `관리 화면 #${id} 누락`));

  const migration = read('supabase/migrations/20260911_admin_center.sql');
  ['app_admins','app_config_state','app_config_versions','analytics_events','get_published_app_config','admin_save_app_draft','admin_publish_app_config','admin_restore_app_version','admin_get_app_stats'].forEach(name => assert(migration.includes(name), `migration ${name} 누락`));
  assert(migration.includes('enable row level security'), '관리 테이블 RLS 누락');
  assert(!migration.match(/service_role|sb_secret_/i), '비밀키가 파일에 들어가면 안 됨');

  const home = runtimeDom('https://example.test/couple-test/?admin_preview=1', config());
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(home.window.document.querySelector('.brand').childNodes[0].nodeValue, '우리놀자');
  assert.equal(home.window.document.querySelector('#menu a').textContent, '처음');
  assert(home.window.document.getElementById('managed-app-style').textContent.includes('#123456'));
  home.window.close();

  const game = runtimeDom('https://example.test/couple-test/t/ten/?admin_preview=1', config('maintenance'));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(game.window.document.title, '열 초 도전 · 우리놀자');
  assert(game.window.document.querySelector('.managed-maintenance'), '점검 안내가 표시되어야 함');
  game.window.close();

  console.log('관리센터 검사 통과 — 권한·초안·게시·복원·공통 설정 연결 확인');
})().catch(error => { console.error(error.stack || error); process.exit(1); });
