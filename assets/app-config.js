/* 같이놀자 공개 설정 런타임
   관리자에서 게시한 설정만 읽는다. 실패하면 마지막 정상 설정 또는 기존 화면을 유지한다. */
(function () {
  'use strict';
  if (window.__GATCHI_APP_CONFIG__) return;
  window.__GATCHI_APP_CONFIG__ = true;
  const ROOT_URL = new URL('../', document.currentScript && document.currentScript.src || location.href);
  const PROJECT_URL = 'https://iqwggvijxptehvmdbmub.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_D6Iqs7Xovd1ihHV5BYeQrg_xyvHG04Z';
  const CACHE_KEY = 'gatchi_published_config_v1';
  const PREVIEW_KEY = 'gatchi_admin_preview';
  let current = null;

  function getSlug() {
    const match = location.pathname.match(/\/t\/(.+?)\/?$/);
    return match ? match[1].replace(/\/$/, '') : 'home';
  }
  function readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }
  function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function valid(config) {
    return !!(config && typeof config === 'object' && config.site && Array.isArray(config.games) && config.ads);
  }
  async function fetchPublished() {
    if (typeof fetch !== 'function') return null;
    const response = await fetch(PROJECT_URL + '/rest/v1/rpc/get_published_app_config', {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!response.ok) throw new Error('config ' + response.status);
    return response.json();
  }
  function font(name, heading) {
    if (name === 'gaegu') return '"Gatchi Hand", Gaegu, "Malgun Gothic", cursive';
    if (name === 'jua') return '"Gatchi Title", Jua, "Malgun Gothic", sans-serif';
    if (name === 'system') return '"Malgun Gothic", Arial, sans-serif';
    return heading ? '"Gatchi Title", Jua, "Malgun Gothic", sans-serif' : '"Pretendard Variable", Pretendard, "Malgun Gothic", system-ui, sans-serif';
  }
  function safeColor(value, fallback) { return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback; }
  function applyStyle(config) {
    const site = config.site || {};
    const slug = getSlug();
    const preserveTheme = slug === 'tarot';
    const style = document.createElement('style');
    style.id = 'managed-app-style';
    const old = document.getElementById(style.id); if (old) old.remove();
    const primary = safeColor(site.primaryColor, '#f66b59');
    const secondary = safeColor(site.secondaryColor, '#8972bb');
    const background = safeColor(site.backgroundColor, '#fffbf5');
    style.textContent = '@font-face{font-family:"Gatchi Title";src:url("'+ROOT_URL.href+'assets/fonts/jua-regular.woff2") format("woff2");font-display:swap}' +
      '@font-face{font-family:"Gatchi Hand";src:url("'+ROOT_URL.href+'assets/fonts/gaegu-regular.woff2") format("woff2");font-display:swap}' +
      ':root{' +
      '--app-primary:' + primary + ';--app-secondary:' + secondary + ';--app-background:' + background + ';' +
      '--app-heading-font:' + font(site.headingFont, true) + ';--app-body-font:' + font(site.bodyFont, false) + ';' +
      '--app-font-scale:' + Math.max(.9, Math.min(1.12, Number(site.fontScale) || 1)) + ';}' +
      'body{font-family:var(--app-body-font)!important;font-size:calc(16px * var(--app-font-scale));}' +
      'h1,h2,h3,.heading,.section-title,.brand,.game-brand{font-family:var(--app-heading-font)!important;}' +
      (preserveTheme ? '' : 'body{--coral:var(--app-primary);--gold:var(--app-primary);--blue:var(--app-secondary);--bg:var(--app-background);}') +
      '.managed-ad{margin:22px 0;padding:10px;border:1px solid #eadfd4;border-radius:17px;background:#fffdf9;text-align:center;overflow:hidden}' +
      '.managed-ad small{display:block;margin:0 0 6px;color:#a29489;font:10px/1.2 Arial,sans-serif;letter-spacing:.08em}' +
      '.managed-ad a{display:block;color:inherit;text-decoration:none}.managed-ad img{display:block;width:100%;height:auto;max-height:190px;object-fit:cover;border-radius:11px}' +
      '.managed-ad strong{display:block;padding:15px;font-size:15px}.managed-maintenance{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:22px;background:#f7f1e9f2;backdrop-filter:blur(8px)}' +
      '.managed-maintenance>div{width:min(430px,100%);padding:35px 28px;border-radius:25px;background:#fffdf9;border:1px solid #eadfd4;text-align:center;box-shadow:0 20px 60px #4b34231a}' +
      '.managed-maintenance span{font-size:55px}.managed-maintenance h1{font-size:30px;margin:12px 0}.managed-maintenance p{color:#7f7168;line-height:1.75}.managed-maintenance a{display:inline-block;margin-top:13px;padding:12px 19px;border-radius:14px;background:var(--app-primary);color:white;text-decoration:none;font-weight:750}';
    document.head.append(style);
  }
  function setBrandName(name) {
    if (!name) return;
    document.querySelectorAll('.brand,.game-brand,.rps-header .brand').forEach(el => {
      const node = Array.from(el.childNodes).find(child => child.nodeType === 3);
      if (node) node.nodeValue = name;
    });
  }
  const navIcons={home:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',letter:'M3 5h18v14H3z M3 5l9 7 9-7',play:'M7 7h10c3 0 5 10 3 12-2 2-5-3-5-3H9s-3 5-5 3C2 17 4 7 7 7z M8 10v5 M5.5 12.5h5 M16 11h.1 M18 14h.1',psychology:'M12 21C6 17 2 13 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5-4 9-10 13z'};
  function menuUrl(item,root){
    if(item.href==='#all')return root.href+'#all';
    try{const target=new URL(item.href||'./',root);return /^https?:$/.test(target.protocol)?target.href:root.href;}catch(_){return root.href;}
  }
  function currentMenu(id,slug){
    if(id==='home')return slug==='home';
    if(id==='letter')return slug==='letter';
    if(id==='psychology')return ['psychology','personality','fortune','tarot','seat','mbti','mind/fight','marriage','memory','ranking'].includes(slug);
    return id==='play'&&slug!=='home'&&slug!=='letter';
  }
  function rebuildBottomNav(nav,menu,root){
    nav.replaceChildren();
    menu.filter(item=>item.enabled!==false).slice(0,5).forEach(item=>{
      const a=document.createElement('a');a.href=menuUrl(item,root);
      const path=navIcons[item.id];if(path)a.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>';
      a.append(document.createTextNode(item.label));if(currentMenu(item.id,getSlug()))a.setAttribute('aria-current','page');nav.append(a);
    });
  }
  function applyMenu(config) {
    const menu = config.site && config.site.menu;
    const container = document.getElementById('menu');
    if (!Array.isArray(menu)) return;
    const root = ROOT_URL;
    if(container){
      container.replaceChildren();
      menu.filter(item => item.enabled !== false).forEach(item => {
        const a = document.createElement('a');
        a.textContent = item.label;
        a.href=menuUrl(item,root);
        if(item.href==='#all')a.id='menuAll';
        a.addEventListener('click',()=>{container.hidden=true;const button=document.getElementById('menuButton');if(button)button.setAttribute('aria-expanded','false');});
        container.append(a);
      });
    }
    document.querySelectorAll('.bottom-nav,.game-nav,.rps-nav').forEach(nav=>rebuildBottomNav(nav,menu,root));
    document.querySelectorAll('.psy-nav').forEach(nav=>{
      nav.replaceChildren();
      menu.filter(item=>item.enabled!==false).forEach(item=>{const a=document.createElement('a');a.href=menuUrl(item,root);a.textContent=item.label;if(currentMenu(item.id,getSlug()))a.setAttribute('aria-current','page');nav.append(a);});
    });
  }
  function applyGame(config) {
    const slug = getSlug();
    if (slug === 'home') return;
    const game = config.games.find(item => item.slug === slug);
    if (!game) return;
    if (game.title) {
      document.title = game.title + ' · ' + (config.site.name || '같이놀자');
      const pageTitle = document.getElementById('rpsPageTitle'); if (pageTitle) pageTitle.textContent = game.title;
      const sharedHeader = document.querySelector('.game-header > span'); if (sharedHeader) sharedHeader.textContent = game.title;
      const description = document.querySelector('meta[name="description"]'); if (description && game.summary) description.content = game.summary;
    }
    if (game.visibility === 'maintenance') showMaintenance(config.site.name, game.title);
  }
  function showMaintenance(siteName, title) {
    if (document.querySelector('.managed-maintenance')) return;
    const overlay = document.createElement('section'); overlay.className = 'managed-maintenance'; overlay.setAttribute('role','alert');
    const box = document.createElement('div'); const icon=document.createElement('span');icon.textContent='🐣';
    const heading=document.createElement('h1');heading.textContent=(title||'이 놀이')+'는 잠시 쉬는 중이에요';
    const copy=document.createElement('p');copy.textContent='더 재미있게 다듬고 있습니다. 잠시 후 다시 찾아주세요.';
    const link=document.createElement('a');link.href=new URL('../../',location.href).href;link.textContent=(siteName||'같이놀자')+' 홈으로';
    box.append(icon,heading,copy,link);overlay.append(box);document.body.append(overlay);
  }
  function activeAds(config, placement) {
    const ads=config.ads||{};const slug=getSlug();const game=config.games.find(item=>item.slug===slug);
    if(!ads.enabled || (game&&game.adsMode==='off'))return [];
    return (ads.slots||[]).filter(ad=>ad.enabled&&ad.placement===placement&&!(ad.excludedGames||[]).includes(slug));
  }
  function adElement(ad) {
    const wrap=document.createElement('aside');wrap.className='managed-ad';wrap.dataset.adId=ad.id||'';const label=document.createElement('small');label.textContent='광고';wrap.append(label);
    if(ad.type==='adsense'&&/^ca-pub-\d+$/.test(ad.networkClient||'')&&/^\d+$/.test(ad.networkSlot||'')){
      const ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';ins.dataset.adClient=ad.networkClient;ins.dataset.adSlot=ad.networkSlot;ins.dataset.adFormat='auto';ins.dataset.fullWidthResponsive='true';wrap.append(ins);loadAdsense(ad.networkClient,ins);return wrap;
    }
    const a=document.createElement('a');const safeLink=/^https?:\/\//i.test(ad.linkUrl||'')?ad.linkUrl:'#';a.href=safeLink;if(safeLink!=='#'){a.target='_blank';a.rel='noopener sponsored';}
    if(ad.imageUrl){const img=document.createElement('img');img.src=ad.imageUrl;img.alt=ad.alt||'광고';img.loading='lazy';a.append(img);}else{const strong=document.createElement('strong');strong.textContent=ad.alt||ad.name||'같이놀자 추천';a.append(strong);}
    a.addEventListener('click',()=>sendEvent('ad_clicked',ad.id||''));wrap.append(a);sendEvent('ad_viewed',ad.id||'');return wrap;
  }
  function loadAdsense(client,ins){if(!document.querySelector('script[data-managed-adsense]')){const script=document.createElement('script');script.async=true;script.dataset.managedAdsense='true';script.crossOrigin='anonymous';script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(client);document.head.append(script);}setTimeout(()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(_){}},0);}
  function mountHomeAds(config){const list=document.getElementById('catalogList');if(!list)return;list.querySelectorAll('.managed-ad').forEach(el=>el.remove());const ads=activeAds(config,'home_catalog');ads.forEach((ad,index)=>{const el=adElement(ad);el.style.gridColumn='1 / -1';const after=list.children[Math.min(3+index,list.children.length)-1];if(after)after.after(el);else list.append(el);});}
  function mountResultAds(config){document.querySelectorAll('.managed-ad[data-placement="result_bottom"]').forEach(el=>el.remove());const ads=activeAds(config,'result_bottom');if(!ads.length)return;const target=document.querySelector('#s-result,#s-report,#v-compare,#opened,#resultScreen,[data-result-screen]');if(!target)return;ads.forEach(ad=>{const el=adElement(ad);el.dataset.placement='result_bottom';target.append(el);});}
  function mountRecommendationAds(config){document.querySelectorAll('.managed-ad[data-placement="recommendation_top"]').forEach(el=>el.remove());const ads=activeAds(config,'recommendation_top');if(!ads.length)return;const target=document.querySelector('.next,#nextList,.recommendations,[data-recommendations]');if(!target)return;ads.forEach(ad=>{const el=adElement(ad);el.dataset.placement='recommendation_top';target.before(el);});}
  function sendEvent(event,method){if(typeof fetch!=='function')return;try{fetch(PROJECT_URL+'/rest/v1/rpc/track_app_event',{method:'POST',keepalive:true,headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_event:event,p_game:getSlug(),p_entry:'direct',p_method:method||null,p_session_id:null})}).catch(()=>{});}catch(_){}}
  function apply(config) {
    if (!valid(config)) return;
    current = config; window.APP_PUBLISHED_CONFIG = config;
    applyStyle(config); setBrandName(config.site.name); applyMenu(config); applyGame(config); mountHomeAds(config); mountResultAds(config); mountRecommendationAds(config);
    if(getSlug()==='home')document.title=(config.site.name||'같이놀자')+' — 너에게 보내고 싶은 게 있어';
    setTimeout(()=>applyMenu(config),0);
    window.dispatchEvent(new CustomEvent('app-config-ready', { detail: config }));
  }
  // 홈 목록은 home.js 가 다시 그릴 때마다(서버 목록 반영 포함) 비워지므로, 그릴 때마다 광고를 다시 붙인다.
  // 예전에는 apply() 안에서 app-config-ready 를 쏜 뒤에 리스너를 달아, 그 이벤트가 동기로 목록을 다시 그리면 광고가 지워진 채 남았다.
  ['home-catalog-updated','home-catalog-rendered'].forEach(name=>window.addEventListener(name,()=>{ if(current) mountHomeAds(current); }));
  async function start() {
    let preview=null;
    if(new URLSearchParams(location.search).get('admin_preview')==='1')preview=readLocal(PREVIEW_KEY);
    if(valid(preview)){apply(preview);return;}
    const cached=readLocal(CACHE_KEY);if(valid(cached))apply(cached);
    try{const published=await fetchPublished();if(valid(published)){writeLocal(CACHE_KEY,published);apply(published);}}catch(_){}
  }
  function ready(){start();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  window.AppConfigRuntime={get:()=>current,apply,getSlug};
})();
