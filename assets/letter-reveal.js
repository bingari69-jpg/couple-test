(function () {
  'use strict';
  // Keep the complete layout in place as each Korean syllable or emoji appears.
  window.revealLetter = function (element, skipButton) {
    const text = element.textContent;
    let timer, finished = false;
    function finish(moveFocus = false) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      element.textContent = text;
      skipButton.hidden = true;
      skipButton.onclick = null;
      if (moveFocus) {
        element.setAttribute('tabindex', '-1');
        element.focus({preventScroll: true});
      }
    }
    if (!text || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return {finish};
    }
    const characters = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ko', {granularity: 'grapheme'}).segment(text)].map(x => x.segment)
      : Array.from(text);
    const accessible = document.createElement('span');
    accessible.className = 'letter-accessible-text';
    accessible.textContent = text;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    const glyphs = characters.map(character => {
      const span = document.createElement('span');
      span.className = 'letter-glyph';
      span.textContent = character;
      visual.append(span);
      return span;
    });
    element.replaceChildren(accessible, visual);
    skipButton.hidden = false;
    skipButton.onclick = () => finish(true);
    let index = 0;
    function next() {
      if (finished) return;
      glyphs[index].classList.add('is-visible');
      const character = characters[index++];
      if (index === glyphs.length) { finish(); return; }
      const delay = /[\r\n]/.test(character) ? 280 : /[.!?。！？]/.test(character) ? 170 : /[,，]/.test(character) ? 100 : 45;
      timer = setTimeout(next, delay);
    }
    timer = setTimeout(next, 180);
    return {finish};
  };
})();
