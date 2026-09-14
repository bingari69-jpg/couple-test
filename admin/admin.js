(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const VIEW_TITLES = { dashboard:'운영 현황', games:'콘텐츠 관리', menus:'홈 꾸미기', design:'홈 꾸미기', inquiries:'문의함', ads:'광고·홍보', versions:'게시·설정' };
  // 2026-09-13 사용자 결정: 메뉴 4축 둘이놀기 | 혼자놀기 | 편지 | 심리
  const DEFAULT_MENU = [
    { id:'play', label:'둘이놀기', href:'#all', enabled:true },
    { id:'solo', label:'혼자놀기', href:'?tab=solo#all', enabled:true },
    { id:'letter', label:'편지', href:'t/letter/', enabled:true },
    { id:'psychology', label:'심리', href:'t/psychology/', enabled:true }
  ];
  // 예전 기본 메뉴(홈·편지·놀이·심리테스트)를 그대로 저장해 둔 설정은 새 4축으로 옮긴다. 직접 바꾼 메뉴는 건드리지 않는다.
  const LEGACY_MENU_IDS = ['home','letter','play','psychology'];
  function migrateMenu(menu) {
    if (!Array.isArray(menu)) return clone(DEFAULT_MENU);
    const ids = menu.map(item => item && item.id).join(',');
    const legacyLabels = { home:'홈', letter:'편지', play:'놀이', psychology:'심리테스트' };
    const untouched = ids === LEGACY_MENU_IDS.join(',') && menu.every(item => item.label === legacyLabels[item.id]);
    return untouched ? clone(DEFAULT_MENU) : menu;
  }
  let config = null;
  const PLACEMENT_LABEL = { result_bottom:'게임 결과 아래', recommendation_top:'다른 게임 추천 위', home_catalog:'홈 게임 목록 중간', challenge_open:'도전장 받은 화면 (시작 버튼 아래)', letter_compose:'편지 쓰기 화면 맨 아래', letter_bottom:'편지 읽기 화면 맨 아래' };
  const placementsOf = ad => Array.isArray(ad.placements) && ad.placements.length ? ad.placements : [ad.placement || 'result_bottom'];
  let serverState = null;
  let dirty = false;
  let editingIndex = -1;
  let statsDays = 7, statsRequest = 0, statsData = null, previewTimer, autosaveTimer, writing = false, autosavePaused = false;
  const LOCAL_DRAFT = 'gatchi_admin_work_v2';
  let savedFingerprint = '', pendingPublish = null, inquiryOffset = 0;
  const fingerprint = value => JSON.stringify(value);
  const localSnapshot = () => {try{return JSON.parse(localStorage.getItem(LOCAL_DRAFT)||'null');}catch(_){return null;}};


  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function guideFor(slug) {
    const guide = window.GATCHI_GUIDES && window.GATCHI_GUIDES[slug];
    return guide ? { rule:guide.rule||'', steps:clone(guide.steps||[]), tip:guide.tip||'', practice:guide.practice||'' } : { rule:'', steps:['','',''], tip:'', practice:'' };
  }
  function currentPractice(value, slug) {
    if (value === 'tap') return slug === 'ufo' ? 'ufo' : slug === 'num25' ? 'numbers' : slug === 'tap' ? 'rapid' : 'mole';
    if (value === 'choice') return slug === 'rps' ? 'rps' : slug === 'stroop' ? 'color' : slug === 'arrow' ? 'arrow' : slug === 'nonsense' ? 'nonsense' : '';
    if (value === 'stop' && slug === 'ten') return 'timing';
    return value || '';
  }
  function localGames() {
    return (window.HOME_ITEMS || []).map((item, index) => {
      const slug=item.path.replace(/^t\//, '').replace(/\/$/, '');
      return ({
      slug: slug,
      path: item.path,
      title: item.title,
      summary: item.summary || item.desc || '',
      category: item.kind === '심리' ? '심리테스트' : item.kind === '편지형' ? '편지' : '게임',
      relationships: item.relationships || [item.rel || '친구'],
      visibility: 'listed',
      featured: index < 6,
      sortOrder: index + 1,
      adsMode: ['letter', 'tarot'].includes(item.path.replace(/^t\//, '').replace(/\/$/, '')) ? 'off' : 'inherit',
      thumbnailUrl: '',
      guide: guideFor(slug)
    });});
  }
  function defaults() {
    return {
      schemaVersion: 1,
      site: {
        name: '같이놀자', headingFont: 'jua', bodyFont: 'pretendard', fontScale: '1',
        primaryColor: '#f66b59', secondaryColor: '#8972bb', backgroundColor: '#fffbf5', homeHeroImage: '',
        menu: clone(DEFAULT_MENU)
      },
      games: localGames(),
      ads: {
        enabled: false,
        slots: [{ id:'result-bottom', name:'기본 배너', placement:'result_bottom', placements:['result_bottom'], enabled:false, type:'own', imageUrl:'', linkUrl:'', alt:'같이놀자 추천', excludedGames:['letter','tarot'], networkClient:'', networkSlot:'' }]
      }
    };
  }
  function normalize(input) {
    const base = defaults();
    const next = input && typeof input === 'object' ? clone(input) : {};
    next.schemaVersion = 1;
    next.site = Object.assign(base.site, next.site || {});
    next.site.menu = migrateMenu(next.site.menu);
    next.games = Array.isArray(next.games) && next.games.length ? next.games : base.games;
    next.games = next.games.map((game, index) => {
      const normalized=Object.assign({
      slug:'game-' + (index + 1), path:'', title:'새 게임', summary:'', category:'게임', relationships:['친구'],
      visibility:'hidden', featured:false, sortOrder:index + 1, adsMode:'inherit', thumbnailUrl:''
      }, game);
      normalized.guide=Object.assign(guideFor(normalized.slug),normalized.guide||{});
      normalized.guide.steps=Array.isArray(normalized.guide.steps)?normalized.guide.steps.slice(0,3):['','',''];
      normalized.guide.practice=currentPractice(normalized.guide.practice,normalized.slug);
      while(normalized.guide.steps.length<3)normalized.guide.steps.push('');
      return normalized;
    });
    // 코드에만 추가되고 저장된 설정에는 아직 없는 게임(예: 새로 만든 짝 맞추기)을 목록 끝에 붙인다.
    // 홈(home-catalog.js의 appendUnknownLocal)과 같은 규칙이라, 관리센터 게임 목록과 통계 제목에서 슬러그만 보이는 일을 막는다.
    // 서버가 '숨김'으로 둔 게임은 next.games에 이미 있으므로 여기서 되살아나지 않는다.
    const known = new Set(next.games.map(game => game.slug));
    let order = next.games.reduce((max, game) => Math.max(max, Number(game.sortOrder) || 0), 0);
    base.games.forEach(game => {
      if (known.has(game.slug)) return;
      order += 1;
      next.games.push(Object.assign(game, { featured: false, sortOrder: order }));
    });
    next.ads = Object.assign(base.ads, next.ads || {});
    next.ads.slots = Array.isArray(next.ads.slots) ? next.ads.slots : base.ads.slots;
    // 옛 설정의 노출 위치 하나(placement)를 여러 위치(placements)로 옮긴다. placement 는 첫 값으로 남겨 옛 스크립트도 읽게 한다.
    next.ads.slots = next.ads.slots.map(ad => { const placements = placementsOf(ad).filter(p => PLACEMENT_LABEL[p]); return Object.assign({}, ad, { placements: placements.length ? placements : ['result_bottom'], placement: (placements[0] || 'result_bottom') }); });
    next.letter=Object.assign({papers:{}},next.letter||{});
    return next;
  }
  function setDirty(value) {
    dirty = value;
    const unpublished = config && (!serverState.published || fingerprint(config)!==fingerprint(normalize(serverState.published)));
    $('saveState').textContent = value ? '미저장 변경 있음' : unpublished ? '초안 저장됨 · 미게시' : '게시 완료';
    $('saveState').classList.toggle('dirty', !!(value || unpublished));
    if($('operationStatus'))$('operationStatus').textContent = (serverState && Number.isSafeInteger(serverState.revision) ? '' : '서버 개선 SQL 적용이 필요합니다. ') + (unpublished ? '이용자에게 아직 보이지 않는 변경이 있어요.' : '게시한 설정과 일치합니다.');
  }
  function changed() {
    setDirty(fingerprint(config)!==savedFingerprint);renderPreview();
    try{localStorage.setItem(LOCAL_DRAFT,JSON.stringify({config,revision:serverState.revision,at:Date.now()}));$('localSaveStatus').textContent='이 기기에 자동 보관됨';}catch(_){$('localSaveStatus').textContent='이 기기에 보관하지 못했습니다. 초안을 내려받아 주세요.';}
    clearTimeout(autosaveTimer);
    if(!autosavePaused&&Number.isSafeInteger(serverState.revision))autosaveTimer=setTimeout(()=>saveDraft(true),1800);
  }
  function validConfig(show=true) {
    const supported=new Map(localGames().map(g=>[g.slug,g.path]));
    const invalid=config.games.find(g=>!g.title.trim()||(g.visibility==='listed'&&(!supported.has(g.slug)||g.path!==supported.get(g.slug))));
    if(invalid){if(show)notice('제목과 연결 주소를 확인해 주세요. 공개할 콘텐츠는 앱에 구현된 주소여야 합니다.',true);return false;}
    if(config.site.campaign?.enabled&&(!config.site.campaign.from||!config.site.campaign.to||config.site.campaign.to<config.site.campaign.from)){if(show)notice('계절 안내의 시작일과 종료일을 확인해 주세요.',true);return false;}
    if(!$('designForm').checkValidity()||(!$('gameEditor').hidden&&!$('gameEditor').checkValidity())){if(show)notice('입력 항목의 길이와 주소 형식을 확인해 주세요.',true);return false;}
    return true;
  }

  function notice(message, error) {
    const el = $('notice'); el.hidden = false; el.textContent = message; el.classList.toggle('error', !!error);
    clearTimeout(notice.timer); notice.timer = setTimeout(() => { el.hidden = true; }, 4200);
  }
  function buttonBusy(button, busy, label) {
    if (!button) return;
    if (button.tagName !== 'BUTTON') {
      button.setAttribute('aria-busy', String(!!busy));
      button.style.opacity = busy ? '.55' : '';
      button.style.pointerEvents = busy ? 'none' : '';
      return;
    }
    if (busy) { button.dataset.label = button.textContent; button.textContent = label || '처리 중…'; button.disabled = true; }
    else { button.textContent = button.dataset.label || button.textContent; button.disabled = false; }
  }
  function showLogin(message) {
    $('loginView').hidden = false; $('adminApp').hidden = true;
    if (message) $('loginStatus').textContent = message;
  }
  function showApp() { $('loginView').hidden = true; $('adminApp').hidden = false; }

  async function loadState() {
    serverState = await AdminAPI.getState();
    config = normalize(serverState.draft || serverState.published);
    editingIndex=-1;$('gameEditor').hidden=true;
    $('adminName').textContent = serverState.admin && serverState.admin.name || '운영자';
    $('adminRole').textContent = serverState.admin && serverState.admin.role || 'owner';
    autosavePaused=false;showApp();renderAll();savedFingerprint=fingerprint(config);setDirty(false);loadStats(statsDays);
    try{localStorage.setItem('gatchi_analytics_optout','1');}catch(_){}
    $('excludeTraffic').checked=true;$('recoverDraft').hidden=!localSnapshot();
  }
  async function login(event) {
    event.preventDefault();
    const button = event.submitter || $('loginForm').querySelector('button');
    buttonBusy(button, true, '로그인 중…'); $('loginStatus').textContent = '';
    try { await AdminAPI.signIn($('email').value, $('password').value); await loadState(); }
    catch (error) { $('loginStatus').textContent = AdminAPI.messageFrom(error); }
    finally { buttonBusy(button, false); }
  }
  async function logout() { if(writing)return notice('저장이 끝난 뒤 로그아웃해 주세요.');clearTimeout(autosaveTimer);await AdminAPI.signOut(); config = null; showLogin(); }

  function switchView(name) {
    document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === name));
    document.querySelectorAll('#adminNav [data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    $('viewTitle').textContent = VIEW_TITLES[name] || '관리센터';
    if (name === 'dashboard') loadStats(statsDays);
    if (name === 'inquiries') loadInquiries();
    if (name === 'design') renderPreview();
    window.scrollTo(0, 0);
  }
  function gameLabel(slug) {
    const found = config && config.games.find(game => game.slug === slug);
    return found ? found.title : ({home:'메인 화면',psychology:'심리 메뉴',letter:'편지 보내기'})[slug] || slug;
  }
  function renderAll() {
    renderGames(); renderMenus(); renderDesign(); renderAds(); renderVersions(); renderLetters(); renderPreview();
  }

  function renderGames() {
    const query = ($('gameSearch').value || '').trim().toLowerCase();
    const list = $('gameList'); list.replaceChildren();
    config.games.slice().sort((a,b) => a.sortOrder - b.sortOrder).forEach(game => {
      const index = config.games.indexOf(game);
      if($('contentFilter').value && game.category!==$('contentFilter').value)return;
      if($('visibilityFilter').value && game.visibility!==$('visibilityFilter').value)return;
      if (query && !(game.title + ' ' + game.slug + ' ' + game.summary).toLowerCase().includes(query)) return;
      const row = document.createElement('article'); row.className = 'game-row';
      const order = document.createElement('div'); order.className = 'game-order';
      [['↑',-1],['↓',1]].forEach(([label, direction]) => { const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>moveGame(index,direction);order.append(b); });
      const main = document.createElement('div'); main.className = 'game-row-main'; main.innerHTML = '<strong></strong><small></small>'; main.querySelector('strong').textContent = (game.featured?'★ ':'')+game.title; main.querySelector('small').textContent = game.summary || game.path;
      const status = document.createElement('span'); status.className = 'status-pill ' + game.visibility; status.textContent = ({listed:'공개',hidden:'숨김',maintenance:'점검'})[game.visibility] || '공개';
      const edit = document.createElement('button'); edit.className='edit-game';edit.type='button';edit.textContent='수정';edit.onclick=()=>openGame(index);
      row.append(order,main,status,edit); list.append(row);
    });
  }
  function moveGame(index, direction) {
    const ordered = config.games.slice().sort((a,b)=>a.sortOrder-b.sortOrder);
    const position = ordered.indexOf(config.games[index]); const swap = ordered[position + direction];
    if (!swap) return;
    const currentOrder = config.games[index].sortOrder; config.games[index].sortOrder = swap.sortOrder; swap.sortOrder = currentOrder;
    changed(); renderGames();
  }
  function openGame(index) {
    editingIndex = index; const game = config.games[index];
    $('gameEditor').hidden=false; $('gameEditorTitle').textContent=game.title;
    $('gameSlug').value=game.slug;$('gameTitle').value=game.title;$('gameSummary').value=game.summary||'';$('gameCategory').value=game.category||'게임';$('gameVisibility').value=game.visibility||'listed';$('gamePath').value=game.path||'';$('gameRelationships').value=(game.relationships||[]).join(', ');$('gameThumbnail').value=game.thumbnailUrl||'';$('gameFeatured').checked=!!game.featured;$('gameAdsMode').value=game.adsMode||'inherit';
    const guide=Object.assign(guideFor(game.slug),game.guide||{});const steps=guide.steps||[];$('gameRule').value=guide.rule||'';$('gameStep1').value=steps[0]||'';$('gameStep2').value=steps[1]||'';$('gameStep3').value=steps[2]||'';$('gameTip').value=guide.tip||'';$('gamePractice').value=guide.practice||'';
  }
  function saveGame(event) {
    if(event)event.preventDefault(); if (editingIndex < 0) return;
    const game = config.games[editingIndex];
    game.title=$('gameTitle').value.trim();game.summary=$('gameSummary').value.trim();game.category=$('gameCategory').value;game.visibility=$('gameVisibility').value;game.path=$('gamePath').value.trim();game.relationships=$('gameRelationships').value.split(',').map(v=>v.trim()).filter(Boolean);game.thumbnailUrl=$('gameThumbnail').value.trim();game.featured=$('gameFeatured').checked;game.adsMode=$('gameAdsMode').value;
    game.guide={rule:$('gameRule').value.trim(),steps:[$('gameStep1').value.trim(),$('gameStep2').value.trim(),$('gameStep3').value.trim()],tip:$('gameTip').value.trim(),practice:$('gamePractice').value};
    changed(); renderGames(); if(event&&event.type==='submit'){if(!game.title)return notice('제목을 입력해 주세요.',true);$('gameEditor').hidden=true;editingIndex=-1;notice('편집 내용이 초안에 반영됐습니다.');}
  }
  function addGame() {notice('새 게임은 개발 후 목록에 자동 등록됩니다. 여기서는 등록된 콘텐츠의 공개·숨김·설명을 관리합니다.');}
  function removeGame() {
    if(editingIndex<0)return;
    config.games[editingIndex].visibility='hidden';$('gameEditor').hidden=true;editingIndex=-1;changed();renderGames();notice('숨김으로 변경했습니다. 게시 후 목록에서 제외되며 기존 링크는 유지됩니다.');
  }
  async function uploadGameImage() {
    const file=$('gameImageFile').files[0]; if(!file)return;
    const slug=$('gameSlug').value;
    const label=$('gameImageFile').closest('.upload'); buttonBusy(label,true,'올리는 중…');
    try{const url=await AdminAPI.uploadImage(file,slug||'game');const game=config.games.find(g=>g.slug===slug);if(game){game.thumbnailUrl=url;if(editingIndex>=0&&config.games[editingIndex].slug===slug)$('gameThumbnail').value=url;changed();}notice('이미지가 등록됐습니다.');}
    catch(error){notice(AdminAPI.messageFrom(error),true);}finally{buttonBusy(label,false);}
  }

  function renderMenus() {
    const list=$('menuEditor');list.replaceChildren();
    config.site.menu.forEach((menu,index)=>{
      const row=document.createElement('div');row.className='menu-row';
      const move=document.createElement('div');move.className='menu-move';
      [['↑',-1],['↓',1]].forEach(([label,direction])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{const target=index+direction;if(target<0||target>=config.site.menu.length)return;[config.site.menu[index],config.site.menu[target]]=[config.site.menu[target],config.site.menu[index]];changed();renderMenus();};move.append(b);});
      const label=document.createElement('input');label.value=menu.label;label.placeholder='메뉴 이름';label.oninput=e=>{menu.label=e.target.value;changed();};
      const href=document.createElement('input');href.value=menu.href;href.placeholder='연결 주소';href.oninput=e=>{menu.href=e.target.value;changed();};
      const enabled=document.createElement('label');enabled.className='check';enabled.innerHTML='<input type="checkbox"> 표시';enabled.querySelector('input').checked=menu.enabled!==false;enabled.querySelector('input').onchange=e=>{menu.enabled=e.target.checked;changed();};
      const remove=document.createElement('button');remove.className='menu-remove';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','메뉴 삭제');remove.onclick=()=>{config.site.menu.splice(index,1);changed();renderMenus();};
      row.append(move,label,href,enabled,remove);list.append(row);
    });
  }
  function addMenu(){config.site.menu.push({id:'menu-'+Date.now(),label:'새 메뉴',href:'./',enabled:true});changed();renderMenus();}

  function renderDesign() {
    const site=config.site;const campaign=site.campaign||{enabled:true,from:'2026-09-01',to:'2026-09-27',title:'이번 추석,\n고마운 마음을\n편지로 전해봐.',body:'평소 못다 한 감사를 한가위 편지지에 담아보세요.',button:'추석 감사편지 만들기'};$('campaignEnabled').checked=campaign.enabled!==false;['From','To','Title','Body','Button'].forEach(k=>$('campaign'+k).value=campaign[k.toLowerCase()]||'');$('siteName').value=site.name;$('catalogOrder').value=site.catalogOrder||'popular';$('headingFont').value=site.headingFont;$('bodyFont').value=site.bodyFont;$('fontScale').value=String(site.fontScale);$('primaryColor').value=site.primaryColor;$('secondaryColor').value=site.secondaryColor;$('backgroundColor').value=site.backgroundColor;$('homeHeroImage').value=site.homeHeroImage||'';
  }
  function readDesign(){const site=config.site;site.campaign={enabled:$('campaignEnabled').checked};['From','To','Title','Body','Button'].forEach(k=>site.campaign[k.toLowerCase()]=$('campaign'+k).value.trim());site.catalogOrder=$('catalogOrder').value;site.name=$('siteName').value.trim()||'같이놀자';site.headingFont=$('headingFont').value;site.bodyFont=$('bodyFont').value;site.fontScale=$('fontScale').value;site.primaryColor=$('primaryColor').value;site.secondaryColor=$('secondaryColor').value;site.backgroundColor=$('backgroundColor').value;site.homeHeroImage=$('homeHeroImage').value.trim();changed();}
  async function uploadHomeHeroImage(){
    const file=$('homeHeroImageFile').files[0];if(!file)return;const label=$('homeHeroImageFile').closest('.upload');buttonBusy(label,true,'올리는 중…');
    try{config.site.homeHeroImage=await AdminAPI.uploadImage(file,'home-hero');$('homeHeroImage').value=config.site.homeHeroImage;changed();notice('편지 메인 이미지가 등록됐습니다. 미리보기에서 확인해 주세요.');}
    catch(error){notice(AdminAPI.messageFrom(error),true);}finally{buttonBusy(label,false);$('homeHeroImageFile').value='';}
  }
  function resetHomeHeroImage(){config.site.homeHeroImage='';$('homeHeroImage').value='';changed();notice('기존 메인 꽃 편지 봉투 이미지로 되돌렸습니다.');}
  function fontValue(name){return name==='jua'?'Gatchi, sans-serif':name==='gaegu'?'Gaegu, cursive':name==='system'?'Arial, sans-serif':'Pretendard, Arial, sans-serif';}
  function renderPreview(mode) {
    const phone=$('designPreview');if(!phone||!config)return;
    mode=mode||(document.querySelector('.preview-switch .active')||{}).dataset?.preview||'home';
    clearTimeout(previewTimer);
    if(!document.querySelector('[data-panel="design"]').classList.contains('active'))return;
    previewTimer=setTimeout(()=>{
      try{localStorage.setItem('gatchi_admin_preview',JSON.stringify(config));}catch(_){return notice('미리보기를 준비하지 못했습니다.',true);}
      const frame=document.createElement('iframe');frame.title='실제 이용자 화면 미리보기';frame.src='../'+({home:'',game:'t/ten/',tarot:'t/tarot/',letter:'t/letter/'})[mode]+'?admin_preview=1';phone.replaceChildren(frame);
    },600);
  }
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function renderAds(){const list=$('adList');list.replaceChildren();$('adsEnabled').checked=!!config.ads.enabled;config.ads.slots.forEach((ad,index)=>{
    const card=document.createElement('article');card.className='ad-card';card.innerHTML='<div class="ad-card-head"><h3></h3><button class="remove-ad" type="button">삭제</button></div><div class="field-grid"><label>자리 이름<input data-field="name"></label></div><div><span class="field-title">노출 위치 <small>(여러 개 선택 가능)</small></span><div class="placement-picks">'+Object.keys(PLACEMENT_LABEL).map(key=>'<label class="check"><input type="checkbox" value="'+key+'"> '+PLACEMENT_LABEL[key]+'</label>').join('')+'</div></div><div class="field-grid"><label>광고 종류<select data-field="type"><option value="own">자체 배너</option><option value="adsense">AdSense</option></select></label><label class="check"><input data-field="enabled" type="checkbox"> 이 자리 사용</label></div><div class="own-fields"><label>배너 이미지 주소<div class="upload-row"><input data-field="imageUrl" type="url" placeholder="https://..."><label class="button upload">이미지 올리기<input class="ad-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label></div></label><label>클릭할 주소<input data-field="linkUrl" type="url" placeholder="https://..."></label><label>배너 설명<input data-field="alt" maxlength="80"></label></div><div class="adsense-fields"><div class="field-grid"><label>광고 클라이언트<input data-field="networkClient" placeholder="ca-pub-..."></label><label>광고 슬롯<input data-field="networkSlot" placeholder="숫자"></label></div></div><label>광고 제외 게임<textarea data-field="excludedGames" rows="2" placeholder="letter, tarot"></textarea></label>';
    // 제목에는 자리 이름과 실제 노출 위치를 같이 보여준다. 이름은 메모용이라 위치를 바꿔도 안 바뀌어 헷갈렸다.
    const head=()=>{card.querySelector('h3').textContent=(ad.name||'광고 자리')+' · '+(placementsOf(ad).map(p=>PLACEMENT_LABEL[p]||p).join(', ')||'위치 미정');};head();
    card.querySelectorAll('.placement-picks input').forEach(box=>{box.checked=placementsOf(ad).includes(box.value);box.onchange=()=>{ad.placements=[...card.querySelectorAll('.placement-picks input:checked')].map(i=>i.value);ad.placement=ad.placements[0]||'';head();changed();};});card.querySelector('.remove-ad').onclick=()=>{config.ads.slots.splice(index,1);changed();renderAds();};
    ['name','type','imageUrl','linkUrl','alt','networkClient','networkSlot'].forEach(field=>{const el=card.querySelector('[data-field="'+field+'"]');el.value=ad[field]||'';el.oninput=()=>{ad[field]=el.value;if(field==='name')head();changed();if(field==='type')toggleAdFields(card,el.value);};});
    const enabled=card.querySelector('[data-field="enabled"]');enabled.checked=!!ad.enabled;enabled.onchange=()=>{ad.enabled=enabled.checked;changed();};
    const excluded=card.querySelector('[data-field="excludedGames"]');excluded.value=(ad.excludedGames||[]).join(', ');excluded.oninput=()=>{ad.excludedGames=excluded.value.split(',').map(v=>v.trim()).filter(Boolean);changed();};
    card.querySelector('.ad-file').onchange=async event=>{const label=event.target.closest('.upload');buttonBusy(label,true,'올리는 중…');try{ad.imageUrl=await AdminAPI.uploadImage(event.target.files[0],'ads');card.querySelector('[data-field="imageUrl"]').value=ad.imageUrl;changed();notice('배너 이미지가 등록됐습니다.');}catch(error){notice(AdminAPI.messageFrom(error),true);}finally{buttonBusy(label,false);}};
    toggleAdFields(card,ad.type);list.append(card);
  });}
  function toggleAdFields(card,type){card.querySelector('.own-fields').hidden=type==='adsense';card.querySelector('.adsense-fields').hidden=type!=='adsense';}
  function addAd(){config.ads.slots.push({id:'ad-'+Date.now(),name:'새 광고 자리',placement:'result_bottom',placements:['result_bottom'],enabled:false,type:'own',imageUrl:'',linkUrl:'',alt:'광고',excludedGames:[],networkClient:'',networkSlot:''});changed();renderAds();}

  function renderVersions(){const list=$('versionList');list.replaceChildren();const versions=serverState&&serverState.versions||[];if(!versions.length){list.innerHTML='<p class="empty">아직 게시한 버전이 없습니다.</p>';return;}versions.forEach(version=>{const row=document.createElement('div');row.className='version-row';const no=document.createElement('div');no.className='version-number';no.textContent='v'+version.version;const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=version.note||'게시 메모 없음';const small=document.createElement('small');small.textContent=new Date(version.published_at).toLocaleString('ko-KR');info.append(strong,small);const restore=document.createElement('button');restore.className='restore-btn';restore.type='button';restore.textContent='복원';restore.onclick=()=>restoreVersion(version.version);row.append(no,info,restore);list.append(row);});}
  async function restoreVersion(version){
    if(writing)return notice('저장이 끝난 뒤 다시 시도해 주세요.');
    if(!confirm(version+'번 화면 설정을 새 버전으로 게시합니다. 현재 초안은 덮어씁니다. 게임 코드와 통계는 복원되지 않습니다. 계속할까요?'))return;
    clearTimeout(autosaveTimer);writing=true;
    try{await AdminAPI.write('restore',serverState.revision,null,null,version);localStorage.removeItem(LOCAL_DRAFT);await loadState();notice('설정을 복원하여 게시했습니다.');}catch(error){notice(AdminAPI.messageFrom(error),true);}finally{writing=false;}
  }
  function dateRange(days){const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);const start=new Date(today+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-days+1);return [start.toISOString().slice(0,10),today];}
  async function loadStats(days,custom=false){
    statsDays=days;const request=++statsRequest;
    if(!custom){const range=dateRange(days);$('statsFrom').value=range[0];$('statsTo').value=range[1];}
    const from=$('statsFrom').value,to=$('statsTo').value;
    if(!from||!to||to<from||(Date.parse(to)-Date.parse(from))/86400000>89){$('statsStatus').textContent='기간은 1~90일로 선택해 주세요.';return;}
    $('statsStatus').textContent='통계를 불러오는 중…';
    try{
      let stats;
      try{stats=await AdminAPI.getStatsRange(from,to,$('statsBasis').value==='legacy');}
      catch(e){if(e.code!=='PGRST202')throw e;stats=await AdminAPI.getStats(days);stats.fallback=true;stats.legacy=true;}
      if(request!==statsRequest)return;
      statsData=stats;renderStats(stats);
      $('statsPeriod').textContent=stats.fallback?'최근 '+days+'×24시간 · 이전 집계':from+' ~ '+to+' · 한국 시간';
      $('statsStatus').textContent=(stats.fallback?'날짜별 통계를 쓰려면 서버 개선 SQL을 적용해 주세요. 현재는 이전 집계입니다. ':'')+'마지막 갱신 '+new Date().toLocaleTimeString('ko-KR')+(stats.legacy?' · 기존 기록에는 테스트 접속·자동 추정이 포함됩니다.':' · 개선된 수집 기준. 오늘 수치는 아직 집계 중입니다.');
    }catch(error){if(request!==statsRequest)return;$('statsStatus').textContent='통계를 불러오지 못했습니다. '+(statsData?'아래는 마지막으로 불러온 값입니다. ':'')+AdminAPI.messageFrom(error);if(!statsData){$('metricGrid').textContent='연결 후 수치를 표시합니다.';$('statsEmpty').hidden=true;}}
  }
  function metricValues(stats){const t=stats.totals||{};return [stats.visitors||0,(t.game_started||0)+(t.solo_started||0),(t.game_completed||0)+(t.solo_cleared||0)+(t.solo_failed||0),(t.invite_shared||0)+(t.result_shared||0),t.invite_opened||0,t.responded||0];}
  function renderStats(stats){
    const values=metricValues(stats),previous=stats.previous?metricValues(stats.previous):null;
    const grid=$('metricGrid');grid.replaceChildren();
    ['방문 브라우저','시작 기록','종료 기록','공유 시도','초대 링크 방문','친구 결과 도달'].forEach((label,i)=>{
      const card=document.createElement('div');card.className='metric';const name=document.createElement('span');name.textContent=label;const value=document.createElement('strong');value.textContent=values[i].toLocaleString();card.append(name,value);
      if(previous){const diff=document.createElement('small');const n=values[i]-previous[i];diff.textContent='직전 기간 대비 '+(n>0?'+':'')+n.toLocaleString();card.append(diff);}grid.append(card);
    });
    const body=$('statsBody');body.replaceChildren();const sort=$('statsSort').value;
    (stats.games||[]).slice().sort((a,b)=>(b[sort]||0)-(a[sort]||0)).forEach(row=>{
      const tr=document.createElement('tr');[gameLabel(row.slug),row.visits,row.starts,row.completes,row.shares,row.responses,stats.legacy?'이전 기준':'이벤트 수'].forEach(value=>{const td=document.createElement('td');td.textContent=value??0;tr.append(td);});body.append(tr);
    });$('statsEmpty').hidden=body.children.length>0;
    const chart=$('dailyChart');chart.replaceChildren();if(stats.from&&stats.to){
      const map=new Map((stats.daily||[]).map(d=>[d.day,d]));const max=Math.max(1,...(stats.daily||[]).map(d=>Number(d.visitors)));let day=new Date(stats.from+'T00:00:00Z');
      while(day.toISOString().slice(0,10)<=stats.to){const key=day.toISOString().slice(0,10),n=Number(map.get(key)?.visitors||0),col=document.createElement('div');col.className='daily-column';col.title=key+' 방문 브라우저 '+n;const bar=document.createElement('i');bar.style.height=(n/max*85+2)+'px';const count=document.createElement('b');count.textContent=n;const label=document.createElement('small');label.textContent=key.slice(5);col.append(count,bar,label);chart.append(col);day.setUTCDate(day.getUTCDate()+1);}
    }
  }
  function preview(){if(!validConfig())return;try{localStorage.setItem('gatchi_admin_preview',JSON.stringify(config));}catch(_){return notice('미리보기를 준비하지 못했습니다.',true);}window.open('../?admin_preview=1&v='+Date.now(),'_blank','noopener');}
  async function saveDraft(automatic=false){
    if(writing||!dirty||!validConfig(!automatic))return;
    clearTimeout(autosaveTimer);writing=true;const snapshot=clone(config),button=$('saveDraftBtn');buttonBusy(button,true,'저장 중…');
    try{serverState=await AdminAPI.write('draft',serverState.revision,snapshot,serverState.draft_note);savedFingerprint=fingerprint(snapshot);setDirty(fingerprint(config)!==savedFingerprint);if(!dirty){localStorage.removeItem(LOCAL_DRAFT);$('localSaveStatus').textContent='서버에 초안 저장됨 · 미게시';}if(!automatic)notice('초안을 저장했습니다. 이용자 화면에는 아직 반영되지 않았습니다.');}
    catch(error){autosavePaused=true;notice(AdminAPI.messageFrom(error),true);$('localSaveStatus').textContent='서버 저장 실패 · 내 초안을 내려받아 보관할 수 있습니다.';}
    finally{writing=false;buttonBusy(button,false);if(dirty&&!autosavePaused)autosaveTimer=setTimeout(()=>saveDraft(true),1800);}
  }
  function diffSummary(){
    const before=normalize(serverState.published),items=[];
    config.games.forEach(g=>{const old=before.games.find(x=>x.slug===g.slug);if(fingerprint(old)!==fingerprint(g)){const fields=[];if(old?.visibility!==g.visibility)fields.push(({listed:'공개',hidden:'숨김',maintenance:'점검'})[g.visibility]);if(old?.sortOrder!==g.sortOrder)fields.push('순서');if(old?.featured!==g.featured)fields.push('추천');items.push(g.title+' · '+(fields.join(', ')||'내용 수정'));}});
    if(fingerprint(before.site)!==fingerprint(config.site))items.push('홈 메뉴·디자인 설정 변경');
    if(fingerprint(before.letter)!==fingerprint(config.letter))items.push('편지지·글꼴·스티커 설정 변경');
    if(fingerprint(before.ads)!==fingerprint(config.ads))items.push('광고 설정 변경');
    if(!serverState.published)items.unshift('첫 설정 게시');return items;
  }
  function preparePublish(){if(writing)return notice('초안 저장이 끝난 뒤 게시해 주세요.');if(!validConfig())return;clearTimeout(autosaveTimer);pendingPublish=clone(config);const list=$('publishChanges');list.replaceChildren();const items=diffSummary();(items.length?items:['현재 게시본과 변경 사항이 없습니다.']).forEach(x=>{const li=document.createElement('li');li.textContent=x;list.append(li);});$('publishNote').value='';$('publishError').textContent='';$('publishDialog').showModal();}
  async function publishConfirmed(event){
    event.preventDefault();if(writing||!pendingPublish)return;writing=true;clearTimeout(autosaveTimer);const button=$('confirmPublish');buttonBusy(button,true,'게시 중…');
    try{serverState=await AdminAPI.write('publish',serverState.revision,pendingPublish,$('publishNote').value.trim());config=normalize(serverState.published);savedFingerprint=fingerprint(config);localStorage.removeItem(LOCAL_DRAFT);$('publishDialog').close();setDirty(false);renderAll();notice('새 설정을 게시했습니다.');}
    catch(error){notice(AdminAPI.messageFrom(error),true);$('publishError').textContent=AdminAPI.messageFrom(error);}finally{writing=false;buttonBusy(button,false);}
  }
  function downloadDraft(){const url=URL.createObjectURL(new Blob([JSON.stringify({config,revision:serverState.revision},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='같이놀자-관리초안.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function loadInquiries(){
    const request=++loadInquiries.request;$('inquiryStatus').textContent='불러오는 중…';
    try{const rows=await AdminAPI.getInquiries($('inquiryFilter').value,inquiryOffset);if(request!==loadInquiries.request)return;$('inquiryList').replaceChildren();$('inquiryStatus').textContent=rows.length?'상태 변경은 문의함에 바로 저장됩니다. 이메일은 발송하지 않습니다.':'이 조건에 해당하는 문의가 없습니다.';$('inquiryPrev').disabled=inquiryOffset===0;$('inquiryNext').disabled=rows.length<20;
      rows.forEach(row=>{const card=document.createElement('details');card.className='inquiry-card';const summary=document.createElement('summary');summary.textContent=({new:'신규',reviewing:'확인 중',replied:'답변 완료',closed:'종료'})[row.status]+' · '+(row.kind==='partnership'?'제휴':row.category||'문의')+' · '+new Date(row.created_at).toLocaleDateString('ko-KR');const info=document.createElement('p');info.textContent=[row.name,row.company,row.email,row.phone].filter(Boolean).join(' · ');const message=document.createElement('p');message.className='inquiry-message';message.textContent=row.message;const label=document.createElement('label');label.textContent='처리 상태';const select=document.createElement('select');Object.entries({new:'신규',reviewing:'확인 중',replied:'답변 완료',closed:'종료'}).forEach(([value,text])=>select.add(new Option(text,value)));select.value=row.status;select.onchange=async()=>{const old=row.status;select.disabled=true;try{const result=await AdminAPI.updateInquiry(row.id,select.value);if(!result?.length)throw new Error('문의 상태를 저장하지 못했습니다.');await loadInquiries();}catch(e){select.value=old;notice(AdminAPI.messageFrom(e),true);}finally{select.disabled=false;}};label.append(select);card.append(summary,info,message,label);$('inquiryList').append(card);});
    }catch(e){if(request!==loadInquiries.request)return;$('inquiryStatus').textContent='문의 조회 실패 · '+AdminAPI.messageFrom(e);}
  }
  loadInquiries.request=0;
  function renderLetters(){
    config.letter=config.letter||{};const prefs=config.letter;
    const list=$('letterPapers');list.replaceChildren();
    const papers=window.LETTER_TEMPLATES||[];prefs.papers=prefs.papers||{};
    papers.slice().sort((a,b)=>(prefs.papers[a.id]?.order??papers.indexOf(a))-(prefs.papers[b.id]?.order??papers.indexOf(b))).forEach((p,index,ordered)=>{
      const row=document.createElement('article');row.className='paper-setting';const art=document.createElement('div');art.className='paper-thumb';window.LetterDesign.paint(art,p);art.setAttribute('aria-hidden','true');const name=document.createElement('strong');name.textContent=p.name||p.title||p.id;const controls=document.createElement('div');
      [['표시','enabled',true],['추천','featured',false]].forEach(([text,key,fallback])=>{const label=document.createElement('label');label.className='check';const input=document.createElement('input');input.type='checkbox';input.checked=prefs.papers[p.id]?.[key]??fallback;input.onchange=()=>{if(key==='enabled'&&!input.checked&&papers.filter(x=>prefs.papers[x.id]?.enabled!==false).length<=1){input.checked=true;return notice('편지지는 한 가지 이상 표시해 주세요.',true);}prefs.papers[p.id]={...prefs.papers[p.id],[key]:input.checked};changed();};label.append(input,document.createTextNode(text));controls.append(label);});
      [['↑',-1],['↓',1]].forEach(([text,d])=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',name.textContent+' 순서 '+text);b.disabled=!ordered[index+d];b.onclick=()=>{const next=ordered.slice();[next[index],next[index+d]]=[next[index+d],next[index]];next.forEach((x,i)=>{prefs.papers[x.id]={...prefs.papers[x.id],order:i};});changed();renderLetters();};controls.append(b);});row.append(art,name,controls);list.append(row);
    });
    [['letterFonts','fonts',Object.entries(window.LetterDesign.fonts).map(([id,f])=>({id,name:f.name}))],['letterStickers','stickers',window.LetterDesign.stickers]].forEach(([target,key,options])=>{const parent=$(target);parent.replaceChildren();options.forEach(o=>{const label=document.createElement('label');label.className='check';const box=document.createElement('input');box.type='checkbox';box.checked=!Array.isArray(prefs[key])||prefs[key].includes(o.id);box.onchange=()=>{const selected=[...parent.querySelectorAll('input:checked')].map(x=>x.value);if(!selected.length){box.checked=true;return notice('한 가지 이상 남겨 주세요.',true);}prefs[key]=selected;changed();};box.value=o.id;label.append(box,document.createTextNode(o.name));parent.append(label);});});
  }

  function bind(){
    $('loginForm').addEventListener('submit',login);$('logoutBtn').onclick=logout;
    $('adminNav').onclick=e=>{const button=e.target.closest('[data-view]');if(button)switchView(button.dataset.view);};
    $('gameSearch').oninput=renderGames;$('contentFilter').onchange=$('visibilityFilter').onchange=renderGames;$('gameEditor').oninput=saveGame;$('addGameBtn').onclick=addGame;$('gameEditor').onsubmit=saveGame;$('closeGameEditor').onclick=()=>{$('gameEditor').hidden=true;editingIndex=-1;};$('removeGameBtn').onclick=removeGame;$('gameImageFile').onchange=uploadGameImage;
    $('addMenuBtn').onclick=addMenu;$('designForm').oninput=readDesign;$('homeHeroImageFile').onchange=uploadHomeHeroImage;$('resetHomeHeroImage').onclick=resetHomeHeroImage;$('adsEnabled').onchange=e=>{config.ads.enabled=e.target.checked;changed();};$('addAdBtn').onclick=addAd;
    document.querySelector('.preview-switch').onclick=e=>{const button=e.target.closest('[data-preview]');if(!button)return;document.querySelectorAll('.preview-switch button').forEach(b=>b.classList.toggle('active',b===button));renderPreview(button.dataset.preview);};
    $('periodTabs').onclick=e=>{const button=e.target.closest('[data-days]');if(!button)return;document.querySelectorAll('#periodTabs button').forEach(b=>b.classList.toggle('active',b===button));loadStats(Number(button.dataset.days));};
    $('previewBtn').onclick=preview;$('saveDraftBtn').onclick=()=>saveDraft(false);$('publishBtn').onclick=preparePublish;$('closePublishDialog').onclick=$('cancelPublish').onclick=()=>$('publishDialog').close();$('publishForm').onsubmit=publishConfirmed;
    $('statsApply').onclick=()=>loadStats(statsDays,true);$('statsBasis').onchange=()=>loadStats(statsDays,true);$('statsSort').onchange=()=>{if(statsData)renderStats(statsData);};
    $('inquiryFilter').onchange=()=>{inquiryOffset=0;loadInquiries();};$('inquiryRefresh').onclick=()=>loadInquiries();$('inquiryNext').onclick=()=>{inquiryOffset+=20;loadInquiries();};$('inquiryPrev').onclick=()=>{inquiryOffset=Math.max(0,inquiryOffset-20);loadInquiries();};
    $('downloadDraft').onclick=downloadDraft;$('reloadState').onclick=()=>{if(!dirty||confirm('저장하지 않은 변경은 내려받아 보관해 주세요. 최신 서버 설정을 불러올까요?')){clearTimeout(autosaveTimer);if(writing)return notice('저장이 끝난 뒤 다시 시도해 주세요.');loadState().catch(e=>notice(AdminAPI.messageFrom(e),true));}};
    $('recoverDraft').onclick=()=>{const saved=localSnapshot();if(!saved?.config)return;clearTimeout(autosaveTimer);autosavePaused=true;config=normalize(saved.config);if(saved.revision!==serverState.revision)notice('다른 기기의 변경이 있을 수 있어 자동 저장을 멈췄습니다. 내용을 내려받아 비교해 주세요.',true);serverState.revision=saved.revision;renderAll();changed();};
    $('excludeTraffic').onchange=e=>{try{localStorage.setItem('gatchi_analytics_optout',e.target.checked?'1':'0');notice('이 브라우저의 새 방문부터 '+(e.target.checked?'통계에서 제외합니다.':'통계에 포함합니다.'));}catch(_){notice('브라우저 설정을 저장하지 못했습니다.',true);}};
    $('mobileLogout').onclick=logout;
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  }
  bind();
  if(AdminAPI.hasSession())loadState().catch(error=>showLogin(AdminAPI.messageFrom(error)));else showLogin();
})();
