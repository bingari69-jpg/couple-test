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
  assert(read('index.html').includes('class="admin-link" href="admin/"'), '홈의 관리자 진입 링크 누락');
  /* 저장된 설정에 없는 새 로컬 게임을 관리 목록 끝에 붙이는지 — normalize 만 떼어 내 실행한다 */
  {
    const src = read('admin/admin.js');
    const body = src.slice(src.indexOf('{', src.indexOf('(function')) + 1, src.indexOf('  function setDirty'));
    const fakeWindow = { HOME_ITEMS: [{ path:'t/ten/', title:'10초', kind:'대결', relationships:['친구'] }, { path:'t/pairs/', title:'짝 맞추기', kind:'대결', relationships:['친구'] }], GATCHI_GUIDES: {} };
    const fakeDocument = { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} };
    const { normalize } = new Function('window', 'document', body + ';return {normalize};')(fakeWindow, fakeDocument);
    const merged = normalize({ schemaVersion:1, games:[{ slug:'ten', path:'t/ten/', title:'열 초 도전', visibility:'hidden', sortOrder:3 }] }).games;
    assert.deepStrictEqual(merged.map(g => [g.slug, g.title, g.visibility, g.sortOrder]), [['ten','열 초 도전','hidden',3], ['pairs','짝 맞추기','listed',4]], '코드에만 있는 게임이 목록 끝에 붙어야 함');
    const kept = normalize({ games:[{ slug:'ten', sortOrder:1 }, { slug:'pairs', title:'내가 바꾼 제목', visibility:'hidden', sortOrder:2 }] }).games;
    assert.deepStrictEqual(kept.map(g => [g.slug, g.title, g.visibility]), [['ten','새 게임','hidden'], ['pairs','내가 바꾼 제목','hidden']], '저장된 항목은 그대로 두어야 함');
    /* 광고 자리: 옛 placement 하나 → placements 배열, 모르는 위치는 버리고 비면 결과 아래 */
    const slots = normalize({ games:[{ slug:'ten' }], ads:{ enabled:true, slots:[{ id:'a', placement:'home_catalog' }, { id:'b', placements:['challenge_open','letter_bottom'] }, { id:'c', placement:'nope' }, { id:'d', placements:['letter_compose'] }] } }).ads.slots;
    assert.deepStrictEqual(slots.map(s => [s.id, s.placements, s.placement]), [['a',['home_catalog'],'home_catalog'], ['b',['challenge_open','letter_bottom'],'challenge_open'], ['c',['result_bottom'],'result_bottom'], ['d',['letter_compose'],'letter_compose']], '광고 자리 노출 위치 이전');
  }

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
