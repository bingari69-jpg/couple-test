(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const VIEW_TITLES = { dashboard:'운영 현황', games:'게임 관리', menus:'메뉴 관리', design:'디자인', ads:'광고 관리', versions:'게시 이력' };
  const DEFAULT_MENU = [
    { id:'home', label:'홈', href:'./', enabled:true },
    { id:'letter', label:'편지', href:'t/letter/', enabled:true },
    { id:'play', label:'놀이', href:'#all', enabled:true },
    { id:'psychology', label:'심리테스트', href:'t/psychology/', enabled:true }
  ];
  let config = null;
  let serverState = null;
  let dirty = false;
  let editingIndex = -1;
  let statsDays = 7;

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
        primaryColor: '#f66b59', secondaryColor: '#8972bb', backgroundColor: '#fffbf5',
        menu: clone(DEFAULT_MENU)
      },
      games: localGames(),
      ads: {
        enabled: false,
        slots: [{ id:'result-bottom', name:'게임 결과 아래', placement:'result_bottom', enabled:false, type:'own', imageUrl:'', linkUrl:'', alt:'같이놀자 추천', excludedGames:['letter','tarot'], networkClient:'', networkSlot:'' }]
      }
    };
  }
  function normalize(input) {
    const base = defaults();
    const next = input && typeof input === 'object' ? clone(input) : {};
    next.schemaVersion = 1;
    next.site = Object.assign(base.site, next.site || {});
    next.site.menu = Array.isArray(next.site.menu) ? next.site.menu : base.site.menu;
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
    return next;
  }
  function setDirty(value) {
    dirty = value;
    $('saveState').textContent = value ? '미게시 변경 있음' : '게시된 상태';
    $('saveState').classList.toggle('dirty', value);
  }
  function changed() { setDirty(true); renderPreview(); }
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
    $('adminName').textContent = serverState.admin && serverState.admin.name || '운영자';
    $('adminRole').textContent = serverState.admin && serverState.admin.role || 'owner';
    setDirty(false); showApp(); renderAll(); loadStats(statsDays);
  }
  async function login(event) {
    event.preventDefault();
    const button = event.submitter || $('loginForm').querySelector('button');
    buttonBusy(button, true, '로그인 중…'); $('loginStatus').textContent = '';
    try { await AdminAPI.signIn($('email').value, $('password').value); await loadState(); }
    catch (error) { $('loginStatus').textContent = AdminAPI.messageFrom(error); }
    finally { buttonBusy(button, false); }
  }
  async function logout() { await AdminAPI.signOut(); config = null; showLogin(); }

  function switchView(name) {
    document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === name));
    document.querySelectorAll('#adminNav [data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    $('viewTitle').textContent = VIEW_TITLES[name] || '관리센터';
    if (name === 'dashboard') loadStats(statsDays);
    window.scrollTo(0, 0);
  }
  function gameLabel(slug) {
    const found = config && config.games.find(game => game.slug === slug);
    return found ? found.title : slug;
  }
  function renderAll() {
    renderGames(); renderMenus(); renderDesign(); renderAds(); renderVersions(); renderPreview();
  }

  function renderGames() {
    const query = ($('gameSearch').value || '').trim().toLowerCase();
    const list = $('gameList'); list.replaceChildren();
    config.games.slice().sort((a,b) => a.sortOrder - b.sortOrder).forEach(game => {
      const index = config.games.indexOf(game);
      if (query && !(game.title + ' ' + game.slug + ' ' + game.summary).toLowerCase().includes(query)) return;
      const row = document.createElement('article'); row.className = 'game-row';
      const order = document.createElement('div'); order.className = 'game-order';
      [['↑',-1],['↓',1]].forEach(([label, direction]) => { const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>moveGame(index,direction);order.append(b); });
      const main = document.createElement('div'); main.className = 'game-row-main'; main.innerHTML = '<strong></strong><small></small>'; main.querySelector('strong').textContent = game.title; main.querySelector('small').textContent = game.summary || game.path;
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
    event.preventDefault(); if (editingIndex < 0) return;
    const game = config.games[editingIndex];
    game.title=$('gameTitle').value.trim();game.summary=$('gameSummary').value.trim();game.category=$('gameCategory').value;game.visibility=$('gameVisibility').value;game.path=$('gamePath').value.trim();game.relationships=$('gameRelationships').value.split(',').map(v=>v.trim()).filter(Boolean);game.thumbnailUrl=$('gameThumbnail').value.trim();game.featured=$('gameFeatured').checked;game.adsMode=$('gameAdsMode').value;
    game.guide={rule:$('gameRule').value.trim(),steps:[$('gameStep1').value.trim(),$('gameStep2').value.trim(),$('gameStep3').value.trim()],tip:$('gameTip').value.trim(),practice:$('gamePractice').value};
    if (!game.title) return notice('게임 제목을 입력해 주세요.', true);
    changed(); renderGames(); $('gameEditor').hidden=true; editingIndex=-1; notice('게임 수정이 초안에 반영됐습니다.');
  }
  function addGame() {
    const number = config.games.length + 1;
    config.games.push({slug:'new-game-'+number,path:'t/new-game-'+number+'/',title:'새 게임',summary:'게임 설명을 입력하세요.',category:'게임',relationships:['친구'],visibility:'hidden',featured:false,sortOrder:number,adsMode:'inherit',thumbnailUrl:'',guide:guideFor('new-game-'+number)});
    changed(); renderGames(); openGame(config.games.length-1);
  }
  function removeGame() {
    if (editingIndex < 0) return;
    const game = config.games[editingIndex];
    if (!confirm('“'+game.title+'”을 관리 목록에서 삭제할까요? 실제 게임 파일은 삭제되지 않습니다.')) return;
    config.games.splice(editingIndex,1); editingIndex=-1;$('gameEditor').hidden=true;changed();renderGames();
  }
  async function uploadGameImage() {
    const file=$('gameImageFile').files[0]; if(!file)return;
    const label=$('gameImageFile').closest('.upload'); buttonBusy(label,true,'올리는 중…');
    try{$('gameThumbnail').value=await AdminAPI.uploadImage(file,$('gameSlug').value||'game');changed();notice('이미지가 등록됐습니다.');}
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
    const site=config.site;$('siteName').value=site.name;$('headingFont').value=site.headingFont;$('bodyFont').value=site.bodyFont;$('fontScale').value=String(site.fontScale);$('primaryColor').value=site.primaryColor;$('secondaryColor').value=site.secondaryColor;$('backgroundColor').value=site.backgroundColor;
  }
  function readDesign(){const site=config.site;site.name=$('siteName').value.trim()||'같이놀자';site.headingFont=$('headingFont').value;site.bodyFont=$('bodyFont').value;site.fontScale=$('fontScale').value;site.primaryColor=$('primaryColor').value;site.secondaryColor=$('secondaryColor').value;site.backgroundColor=$('backgroundColor').value;changed();}
  function fontValue(name){return name==='jua'?'Gatchi, sans-serif':name==='gaegu'?'Gaegu, cursive':name==='system'?'Arial, sans-serif':'Pretendard, Arial, sans-serif';}
  function renderPreview(mode) {
    const phone=$('designPreview');if(!phone||!config)return;mode=mode||document.querySelector('.preview-switch .active').dataset.preview;
    const site=config.site;phone.style.setProperty('--mock-primary',site.primaryColor);phone.style.setProperty('--mock-bg',site.backgroundColor);phone.style.setProperty('--mock-heading',fontValue(site.headingFont));phone.style.setProperty('--mock-body',fontValue(site.bodyFont));phone.style.fontSize=(16*Number(site.fontScale||1))+'px';
    if(mode==='tarot'){phone.innerHTML='<div class="mock-tarot"><div>✦ '+escapeHtml(site.name)+' ✦</div><h3>나와 너의 마음 타로</h3><div class="mock-tarot-card">☀</div><p>우리의 카드를 한 장 골라봐.</p></div>';return;}
    if(mode==='game'){phone.innerHTML='<div class="mock-brand">'+escapeHtml(site.name)+'<b>♥</b></div><div class="mock-hero"><small>네 감각을 믿어봐!</small><h3>10초를<br>맞혀볼까?</h3><p>속으로 세고, 딱 지금이라고 느낄 때 눌러봐.</p><span class="mock-button">한판 시작하기</span></div><div class="mock-card"><strong>이번 판, 뭐 걸까?</strong><p>커피 한 잔 · 밥 한 끼 · 그냥 하기</p></div>';return;}
    phone.innerHTML='<div class="mock-brand">'+escapeHtml(site.name)+'<b>♥</b></div><div class="mock-hero"><small>마음을 전하고 같이 놀아요</small><h3><span style="color:var(--mock-primary)">너에게</span> 보내고<br>싶은 게 있어.</h3><p>특별한 날에도, 그냥 네 생각이 난 날에도.</p><span class="mock-button">편지 한 장 보내기</span></div><div class="mock-card"><strong>조금 더 놀다 갈래?</strong><p>가위바위보 · 마음동물 · 타로</p></div>';
  }
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function renderAds(){const list=$('adList');list.replaceChildren();$('adsEnabled').checked=!!config.ads.enabled;config.ads.slots.forEach((ad,index)=>{
    const card=document.createElement('article');card.className='ad-card';card.innerHTML='<div class="ad-card-head"><h3></h3><button class="remove-ad" type="button">삭제</button></div><div class="field-grid"><label>자리 이름<input data-field="name"></label><label>노출 위치<select data-field="placement"><option value="result_bottom">게임 결과 아래</option><option value="home_catalog">홈 게임 목록 중간</option><option value="recommendation_top">다른 게임 추천 위</option></select></label></div><div class="field-grid"><label>광고 종류<select data-field="type"><option value="own">자체 배너</option><option value="adsense">AdSense</option></select></label><label class="check"><input data-field="enabled" type="checkbox"> 이 자리 사용</label></div><div class="own-fields"><label>배너 이미지 주소<div class="upload-row"><input data-field="imageUrl" type="url" placeholder="https://..."><label class="button upload">이미지 올리기<input class="ad-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label></div></label><label>클릭할 주소<input data-field="linkUrl" type="url" placeholder="https://..."></label><label>배너 설명<input data-field="alt" maxlength="80"></label></div><div class="adsense-fields"><div class="field-grid"><label>광고 클라이언트<input data-field="networkClient" placeholder="ca-pub-..."></label><label>광고 슬롯<input data-field="networkSlot" placeholder="숫자"></label></div></div><label>광고 제외 게임<textarea data-field="excludedGames" rows="2" placeholder="letter, tarot"></textarea></label>';
    card.querySelector('h3').textContent=ad.name||'광고 자리';card.querySelector('.remove-ad').onclick=()=>{config.ads.slots.splice(index,1);changed();renderAds();};
    ['name','placement','type','imageUrl','linkUrl','alt','networkClient','networkSlot'].forEach(field=>{const el=card.querySelector('[data-field="'+field+'"]');el.value=ad[field]||'';el.oninput=()=>{ad[field]=el.value;if(field==='name')card.querySelector('h3').textContent=el.value||'광고 자리';changed();if(field==='type')toggleAdFields(card,el.value);};});
    const enabled=card.querySelector('[data-field="enabled"]');enabled.checked=!!ad.enabled;enabled.onchange=()=>{ad.enabled=enabled.checked;changed();};
    const excluded=card.querySelector('[data-field="excludedGames"]');excluded.value=(ad.excludedGames||[]).join(', ');excluded.oninput=()=>{ad.excludedGames=excluded.value.split(',').map(v=>v.trim()).filter(Boolean);changed();};
    card.querySelector('.ad-file').onchange=async event=>{const label=event.target.closest('.upload');buttonBusy(label,true,'올리는 중…');try{ad.imageUrl=await AdminAPI.uploadImage(event.target.files[0],'ads');card.querySelector('[data-field="imageUrl"]').value=ad.imageUrl;changed();notice('배너 이미지가 등록됐습니다.');}catch(error){notice(AdminAPI.messageFrom(error),true);}finally{buttonBusy(label,false);}};
    toggleAdFields(card,ad.type);list.append(card);
  });}
  function toggleAdFields(card,type){card.querySelector('.own-fields').hidden=type==='adsense';card.querySelector('.adsense-fields').hidden=type!=='adsense';}
  function addAd(){config.ads.slots.push({id:'ad-'+Date.now(),name:'새 광고 자리',placement:'result_bottom',enabled:false,type:'own',imageUrl:'',linkUrl:'',alt:'광고',excludedGames:[],networkClient:'',networkSlot:''});changed();renderAds();}

  function renderVersions(){const list=$('versionList');list.replaceChildren();const versions=serverState&&serverState.versions||[];if(!versions.length){list.innerHTML='<p class="empty">아직 게시한 버전이 없습니다.</p>';return;}versions.forEach(version=>{const row=document.createElement('div');row.className='version-row';const no=document.createElement('div');no.className='version-number';no.textContent='v'+version.version;const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=version.note||'게시 메모 없음';const small=document.createElement('small');small.textContent=new Date(version.published_at).toLocaleString('ko-KR');info.append(strong,small);const restore=document.createElement('button');restore.className='restore-btn';restore.type='button';restore.textContent='복원';restore.onclick=()=>restoreVersion(version.version);row.append(no,info,restore);list.append(row);});}
  async function restoreVersion(version){if(!confirm(version+'번 설정을 다시 게시할까요?'))return;try{await AdminAPI.restore(version);await loadState();notice(version+'번 설정을 새 버전으로 복원했습니다.');}catch(error){notice(AdminAPI.messageFrom(error),true);}}

  async function loadStats(days){statsDays=days;$('statsPeriod').textContent=days===1?'오늘':'최근 '+days+'일';try{const stats=await AdminAPI.getStats(days);renderStats(stats);}catch(error){renderStats({totals:{},visitors:0,games:[]});notice(AdminAPI.messageFrom(error),true);}}
  function renderStats(stats){const totals=stats.totals||{};const metrics=[['방문자',stats.visitors||0],['게임 시작',totals.game_started||0],['게임 완료',totals.game_completed||0],['카톡·링크 공유',totals.invite_shared||0],['초대 방문',totals.invite_opened||0],['친구 참여 완료',totals.responded||0]];const grid=$('metricGrid');grid.replaceChildren();metrics.forEach(([label,value])=>{const card=document.createElement('div');card.className='metric';card.innerHTML='<span></span><strong></strong>';card.querySelector('span').textContent=label;card.querySelector('strong').textContent=Number(value).toLocaleString();grid.append(card);});const body=$('statsBody');body.replaceChildren();(stats.games||[]).filter(row=>row.slug!=='home').forEach(row=>{const tr=document.createElement('tr');const rate=row.starts?Math.round(row.completes/row.starts*100)+'%':'–';[gameLabel(row.slug),row.visits,row.starts,row.completes,row.shares,row.responses,rate].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});body.append(tr);});$('statsEmpty').hidden=body.children.length>0;}

  function preview(){try{localStorage.setItem('gatchi_admin_preview',JSON.stringify(config));}catch(_){}window.open('../?admin_preview=1&v='+Date.now(),'_blank','noopener');}
  async function saveDraft(){const button=$('saveDraftBtn');buttonBusy(button,true,'저장 중…');try{await AdminAPI.saveDraft(config,serverState&&serverState.draft_note);setDirty(false);notice('초안을 저장했습니다. 이용자 화면에는 아직 반영되지 않았습니다.');}catch(error){notice(AdminAPI.messageFrom(error),true);}finally{buttonBusy(button,false);}}
  async function publishConfirmed(event){event.preventDefault();const button=$('confirmPublish');buttonBusy(button,true,'게시 중…');try{await AdminAPI.publish(config,$('publishNote').value.trim());$('publishDialog').close();await loadState();notice('새 설정을 게시했습니다.');}catch(error){notice(AdminAPI.messageFrom(error),true);}finally{buttonBusy(button,false);}}

  function bind(){
    $('loginForm').addEventListener('submit',login);$('logoutBtn').onclick=logout;
    $('adminNav').onclick=e=>{const button=e.target.closest('[data-view]');if(button)switchView(button.dataset.view);};
    $('gameSearch').oninput=renderGames;$('addGameBtn').onclick=addGame;$('gameEditor').onsubmit=saveGame;$('closeGameEditor').onclick=()=>{$('gameEditor').hidden=true;editingIndex=-1;};$('removeGameBtn').onclick=removeGame;$('gameImageFile').onchange=uploadGameImage;
    $('addMenuBtn').onclick=addMenu;$('designForm').oninput=readDesign;$('adsEnabled').onchange=e=>{config.ads.enabled=e.target.checked;changed();};$('addAdBtn').onclick=addAd;
    document.querySelector('.preview-switch').onclick=e=>{const button=e.target.closest('[data-preview]');if(!button)return;document.querySelectorAll('.preview-switch button').forEach(b=>b.classList.toggle('active',b===button));renderPreview(button.dataset.preview);};
    $('periodTabs').onclick=e=>{const button=e.target.closest('[data-days]');if(!button)return;document.querySelectorAll('#periodTabs button').forEach(b=>b.classList.toggle('active',b===button));loadStats(Number(button.dataset.days));};
    $('previewBtn').onclick=preview;$('saveDraftBtn').onclick=saveDraft;$('publishBtn').onclick=()=>{$('publishNote').value='';$('publishDialog').showModal();};$('closePublishDialog').onclick=$('cancelPublish').onclick=()=>$('publishDialog').close();$('publishForm').onsubmit=publishConfirmed;
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  }
  bind();
  if(AdminAPI.hasSession())loadState().catch(error=>showLogin(AdminAPI.messageFrom(error)));else showLogin();
})();
