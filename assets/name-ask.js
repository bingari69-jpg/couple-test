/* 같이놀자 — 이름 물어보기 팝업
   카톡 카드에 "민수님이 도전했어요" / "민수님께서 보내신 편지입니다" 로 들어갈 이름을 받는다.
   이름 칸이 다른 화면에 있거나 접혀 있어 안 보일 때가 있어, 보내는 순간 팝업으로 직접 받는다.

   쓰는 법: NameAsk.ask({title,desc,value,confirm}) → Promise<string|null>  (취소하면 null)
   확인 버튼 클릭 안에서 resolve 하므로, 받은 뒤 바로 카카오 공유를 열어도 사용자 동작으로 인정된다.
   이름은 다른 놀이와 같은 localStorage 'gh_name' 에 저장한다. */
(function () {
  'use strict';
  const KEY = 'gh_name';
  const CSS = `.name-ask-back{position:fixed;inset:0;background:rgba(31,27,22,.45);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999;animation:nameAskIn .18s ease}
@keyframes nameAskIn{from{opacity:0}to{opacity:1}}
.name-ask-sheet{background:#fff;border-radius:22px;padding:22px 20px 18px;width:100%;max-width:340px;box-shadow:0 18px 40px rgba(0,0,0,.28);color:#1F1B16;font-family:inherit;text-align:left}
.name-ask-sheet h3{margin:0 0 6px;font-size:19px;font-weight:900;line-height:1.35}
.name-ask-sheet .desc{margin:0 0 14px;font-size:14px;line-height:1.6;color:#7A6E5E}
.name-ask-sheet input{width:100%;box-sizing:border-box;border:2px solid #F0E4C8;border-radius:14px;padding:13px 15px;font:inherit;font-size:18px;font-weight:700;color:#1F1B16;background:#fff}
.name-ask-sheet input:focus{outline:none;border-color:#2D7DFF}
.name-ask-sheet .warn{margin:8px 2px 0;min-height:18px;font-size:13px;font-weight:700;color:#FF5A5F}
.name-ask-sheet .row{display:flex;gap:8px;margin-top:10px}
.name-ask-sheet button{flex:1;border:none;border-radius:14px;padding:14px;font:inherit;font-size:16px;font-weight:800;cursor:pointer}
.name-ask-sheet .go{background:#FEE500;color:#191600}
.name-ask-sheet .cancel{background:#fff;border:2px solid #F0E4C8;color:#7A6E5E;font-weight:600}`;
  let styled = false;
  const saved = () => { try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; } };
  const remember = v => { try { localStorage.setItem(KEY, v); } catch (_) {} };

  function ask(opts) {
    opts = opts || {};
    return new Promise(resolve => {
      if (!styled) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); styled = true; }
      const back = document.createElement('div');
      back.className = 'name-ask-back';
      back.innerHTML = '<div class="name-ask-sheet" role="dialog" aria-modal="true" aria-labelledby="nameAskTitle">' +
        '<h3 id="nameAskTitle"></h3><p class="desc"></p>' +
        '<input type="text" maxlength="10" autocomplete="nickname" aria-label="내 이름">' +
        '<p class="warn" role="status"></p>' +
        '<div class="row"><button type="button" class="cancel">취소</button><button type="button" class="go"></button></div></div>';
      const sheet = back.firstChild, input = sheet.querySelector('input'), warn = sheet.querySelector('.warn');
      sheet.querySelector('h3').textContent = opts.title || '누가 보냈는지 알려줄까?';
      sheet.querySelector('.desc').textContent = opts.desc || '적어준 이름이 카톡 카드에 그대로 보여요.';
      sheet.querySelector('.go').textContent = opts.confirm || '이 이름으로 보내기';
      input.placeholder = opts.placeholder || '예: 민수';
      input.value = opts.value || saved();
      const close = value => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(value); };
      const submit = () => {
        const v = input.value.trim();
        if (!v) { warn.textContent = '이름을 적어야 보낼 수 있어요.'; input.focus(); return; }
        remember(v); close(v);
      };
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(null); } }
      sheet.querySelector('.go').onclick = submit;
      sheet.querySelector('.cancel').onclick = () => close(null);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      back.addEventListener('click', e => { if (e.target === back) close(null); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(back);
      setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); } }, 30);
    });
  }
  window.NameAsk = { ask, saved, remember, KEY };
})();
