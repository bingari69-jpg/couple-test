(function(){
  const paths={home:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',letter:'M3 5h18v14H3z M3 5l9 7 9-7',play:'M7 7h10c3 0 5 10 3 12-2 2-5-3-5-3H9s-3 5-5 3C2 17 4 7 7 7z M8 10v5 M5.5 12.5h5 M16 11h.1 M18 14h.1',back:'m14 5-7 7 7 7',menu:'M4 6h16 M4 12h16 M4 18h16',arrow:'M4 12h16 m-6-6 6 6-6 6',close:'m6 6 12 12 M18 6 6 18'};
  document.querySelectorAll('[data-icon]').forEach(el=>{const p=paths[el.dataset.icon];if(p)el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+p+'"/></svg>';});
})();
