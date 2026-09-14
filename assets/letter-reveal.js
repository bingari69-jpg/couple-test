(function () {
  'use strict';
  // Keep the complete layout in place as each Korean syllable, emoji, or sticker appears.
  window.revealLetter = function (element, skipButton) {
    const original = Array.from(element.childNodes, node => node.cloneNode(true));
    const text = element.textContent;
    let timer, finished = false;
    function finish(moveFocus = false) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      element.replaceChildren(...original.map(node => node.cloneNode(true)));
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
    const segment = value => typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('ko', {granularity: 'grapheme'}).segment(value)].map(x => x.segment)
      : Array.from(value);
    const accessible = document.createElement('span');
    accessible.className = 'letter-accessible-text';
    accessible.append(...original.map(node => node.cloneNode(true)));
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    const glyphs = [];
    function copy(node, parent) {
      if (node.nodeType === 3) {
        segment(node.data).forEach(character => {
          const span = document.createElement('span');
          span.className = 'letter-glyph';
          span.textContent = character;
          parent.append(span);
          glyphs.push({element: span, character});
        });
        return;
      }
      if (node.nodeType !== 1) return;
      const clone = node.cloneNode(false);
      if (node.matches('[data-letter-sticker]')) {
        clone.append(...Array.from(node.childNodes, child => child.cloneNode(true)));
        clone.classList.add('letter-glyph');
        parent.append(clone);
        glyphs.push({element: clone, character: '\ufffc'});
        return;
      }
      parent.append(clone);
      node.childNodes.forEach(child => copy(child, clone));
    }
    original.forEach(node => copy(node, visual));
    element.replaceChildren(accessible, visual);
    skipButton.hidden = false;
    skipButton.onclick = () => finish(true);
    let index = 0;
    function next() {
      if (finished) return;
      glyphs[index].element.classList.add('is-visible');
      const character = glyphs[index++].character;
      if (index === glyphs.length) { finish(); return; }
      const delay = /[\r\n]/.test(character) ? 280 : /[.!?。！？]/.test(character) ? 170 : /[,，]/.test(character) ? 100 : 45;
      timer = setTimeout(next, delay);
    }
    timer = setTimeout(next, 180);
    return {finish};
  };
})();
