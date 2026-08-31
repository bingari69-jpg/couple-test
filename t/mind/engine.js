/* 나의 심리 너의 심리 · 공통 엔진
   페이지는 window.TEST 만 정의하면 됨. (data.js 참고)
   버튼 id 규칙(kakaoBtn/copyBtn/kakaoRes/sendResult)은 analytics.js 가 자동 감지 */
(function(){
  const T = window.TEST;
  const N = T.questions.length;
  const ROOT = "https://bingari69-jpg.github.io/couple-test/";
  const DEPLOY_BASE = ROOT + T.path;
  const isSandbox = () => !(/^https?:$/.test(location.protocol) && location.origin && location.origin!=="null");
  const baseUrl   = () => isSandbox() ? DEPLOY_BASE : location.origin + location.pathname;

  /* ---------- 유틸 ---------- */
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.add("hidden"));$(id).classList.remove("hidden");window.scrollTo(0,0);}
  let tt;function toast(m){const e=$("toast");e.textContent=m;e.style.opacity="1";e.style.transform="translate(-50%,0)";clearTimeout(tt);tt=setTimeout(()=>{e.style.opacity="0";e.style.transform="translate(-50%,20px)";},2400);}
  async function copy(url,ok){let d=false;try{await navigator.clipboard.writeText(url);d=true;}catch(e){const ta=document.createElement("textarea");ta.value=url;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{d=document.execCommand("copy");}catch(e2){}ta.remove();}toast(d?ok:"링크를 길게 눌러 복사해 주세요");}
  function lockAll(a){const k=Math.floor(Math.random()*0xFFFF);return {k,x:a.map((v,i)=>((v+1)*7919+k+i*131)%65521)};}
  function unlockOne(k,x,i){for(let a=0;a<2;a++){if(((a+1)*7919+k+i*131)%65521===x)return a;}return null;}
  function b64e(s){const b=new TextEncoder().encode(s);let x="";b.forEach(c=>x+=String.fromCharCode(c));return btoa(x).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
  function b64d(s){s=s.replace(/-/g,"+").replace(/_/g,"/");s+="=".repeat((4-s.length%4)%4);const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new TextDecoder().decode(u);}
  function readHash(){let m=location.hash.match(/^#([ir])=(.+)$/);if(!m)m=location.search.match(/^\?([ir])=([^&]+)/);if(!m)return null;try{return {type:m[1],p:JSON.parse(b64d(decodeURIComponent(m[2])))};}catch(e){return null;}}
  function share(o,fb){ if(window.kakaoShare) kakaoShare(o,fb); else fb(); }

  /* ---------- 판정 ---------- */
  function typeOf(ans){
    let key="";
    for(const ax of Object.keys(T.axes)){
      const idx=T.questions.map((q,i)=>q.ax===ax?i:-1).filter(i=>i>=0);
      const lefts=idx.filter(i=>ans[i]===0).length;
      key += lefts*2>idx.length ? "L" : "R";
    }
    return {key, ...T.types[key]};
  }
  function axisResult(ans,ax){
    const idx=T.questions.map((q,i)=>q.ax===ax?i:-1).filter(i=>i>=0);
    const lefts=idx.filter(i=>ans[i]===0).length;
    return lefts*2>idx.length ? "left" : "right";
  }
  const comboOf=(a,b)=>T.combos[a+"|"+b]||T.combos[b+"|"+a]||"";
  const scoreLine=p=>{for(const [min,t] of T.scoreLines){if(p>=min)return t;}return "";};

  /* ---------- 화면 뼈대 ---------- */
  document.body.innerHTML = `
  <div class="wrap">
  <section class="screen" id="s-intro">
    <span class="series">🎭 ${esc(T.series)}</span>
    <h1 id="introHead"></h1>
    <p class="lead">${esc(T.intro)}</p>
    <div class="meta"><span class="pill hot">${N}문항 · 1분</span><span class="pill">${esc(T.rel)}</span><span class="pill">둘이 하기</span></div>
    <div class="card hidden" id="lockedCard"><div class="lockrow"><span class="e">🔒</span><span><b id="lockName"></b>의 답은 네가 다 고른 뒤에 공개돼.</span></div></div>
    <label class="q" for="nameIn">내 이름 <span style="font-weight:500;color:#B3AFBD">(선택)</span></label>
    <input type="text" id="nameIn" placeholder="비워도 돼요" maxlength="12">
    <button class="btn btn-main" id="startBtn">내 답 먼저 고르기</button>
    <p class="hint">내 답은 상대가 고르기 전까지 공개되지 않아요</p>
    <a class="homelink" href="../../../">다른 놀이 보기 →</a>
  </section>

  <section class="screen hidden" id="s-q">
    <div class="prog"><i id="prog"></i></div>
    <div class="qnum" id="qnum"></div>
    <div class="qtext" id="qtext"></div>
    <div class="opts" id="opts"></div>
    <div class="qnav"><button class="btn btn-ghost" id="backBtn">← 이전</button></div>
  </section>

  <section class="screen hidden" id="s-link">
    <span class="series">🎭 ${esc(T.series)}</span>
    <h1>내 답은 숨겨뒀어.<br><b>네 답이랑 맞는지</b> 보자.</h1>
    <p class="lead">상대가 같은 ${N}문항에 답하면, 둘의 유형과 조합이 나와.</p>
    <button class="btn btn-kakao" id="kakaoBtn">💬 카톡으로 보내기</button>
    <button class="btn btn-ghost" id="copyBtn">링크만 복사</button>
    <div class="linkbox hidden" id="linkbox"></div>
    <p class="hint hidden" id="sandboxNote">지금은 미리보기 창이라 링크가 열리지 않습니다. 배포 후 확인해 주세요.</p>
    <button class="btn btn-ghost" id="editBtn">답 다시 고르기</button>
  </section>

  <section class="screen hidden" id="s-result">
    <span class="series">🎭 ${esc(T.series)}</span>
    <div class="score"><div class="big"><span id="pct">0</span><small>%</small></div><div class="lab" id="pctLab"></div><div class="sub" id="pctSub"></div></div>
    <div class="types">
      <div class="type me"><div class="who" id="whoA"></div><div class="emo" id="emoA"></div><div class="name" id="nameA"></div><div class="tag" id="tagA"></div></div>
      <div class="type you"><div class="who" id="whoB"></div><div class="emo" id="emoB"></div><div class="name" id="nameB"></div><div class="tag" id="tagB"></div></div>
    </div>
    <div class="combo"><div class="h">둘이 만나면</div><div id="combo"></div></div>
    <div id="specials"></div>
    <div class="typedesc me"><div class="h" id="descHA"></div><div id="descA"></div></div>
    <div class="typedesc you"><div class="h" id="descHB"></div><div id="descB"></div></div>
    <div class="axes" id="axes"></div>
    <div class="qlist"><h3>문항별로 보면</h3><div id="qlist"></div></div>
    <div class="notyet hidden" id="notYet">⚠️ <b>상대는 아직 결과를 몰라요.</b> 결과 링크를 보내야 상대도 둘의 유형을 볼 수 있어요.</div>
    <div id="respActions" class="hidden">
      <button class="btn btn-kakao" id="kakaoRes">💬 카톡으로 결과 보내기</button>
      <button class="btn btn-ghost" id="sendResult">링크만 복사</button>
      <div class="linkbox hidden" id="resLinkbox"></div>
    </div>
    <button class="btn btn-sub" id="restart">나도 처음부터 해보기</button>
    <div class="next"><h3>다음은 이거 어때요?</h3><div id="nextList"></div></div>
    <a class="btn btn-sub" href="../../../" style="display:block;text-align:center;text-decoration:none">다른 놀이 보기</a>
    <p class="disclaimer">재미로 보는 콘텐츠입니다. 전문적인 심리 검사나 관계 진단이 아닙니다.</p>
  </section>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  /* ---------- 상태 ---------- */
  const state={name:"",ans:[],qi:0,incoming:null};
  let madeUrl="";
  const titleParts=T.title.split(" ");
  $("introHead").innerHTML = titleParts.length>1
    ? `${esc(titleParts.slice(0,-1).join(" "))}<br><b>${esc(titleParts.slice(-1)[0])}</b>`
    : `<b>${esc(T.title)}</b>`;

  /* ---------- 문항 ---------- */
  try{state.name=localStorage.getItem("gh_name")||"";$("nameIn").value=state.name;}catch(e){}
  $("nameIn").oninput=e=>{state.name=e.target.value.trim();try{localStorage.setItem("gh_name",state.name);}catch(x){}};
  $("startBtn").onclick=()=>{state.qi=0;renderQ();show("s-q");};
  function renderQ(){
    const q=T.questions[state.qi];
    $("prog").style.width=(state.qi/N*100)+"%";
    $("qnum").textContent=`${state.qi+1} / ${N}`;
    $("qtext").textContent=q.t;
    const box=$("opts");box.innerHTML="";
    q.o.forEach((o,i)=>{const b=document.createElement("button");b.className="opt"+(state.ans[state.qi]===i?" picked":"");b.type="button";
      b.innerHTML=`<span class="k">${i+1}</span><span>${esc(o)}</span>`;
      b.onclick=()=>{b.classList.add("picked");state.ans[state.qi]=i;setTimeout(()=>{state.qi++;if(state.qi>=N)finish();else renderQ();},180);};
      box.appendChild(b);});
    $("backBtn").style.visibility=state.qi===0?"hidden":"visible";
  }
  $("backBtn").onclick=()=>{if(state.qi>0){state.qi--;renderQ();}};
  function finish(){
    if(state.incoming){
      const p=state.incoming;const a=T.questions.map((q,i)=>unlockOne(p.k,p.x[i],i));
      renderResult({aName:p.n,a,bName:state.name,b:state.ans.slice(),viewer:"b"});return;
    }
    const {k,x}=lockAll(state.ans);
    madeUrl=baseUrl()+"#i="+b64e(JSON.stringify({v:1,n:state.name,k,x}));
    $("linkbox").textContent=madeUrl;$("sandboxNote").classList.toggle("hidden",!isSandbox());
    $("kakaoBtn").onclick=()=>share({url:madeUrl,btn:"나도 답하기",img:T.og.sq,
      title:(state.name?`${state.name}의 `:"")+`${T.title} — 너는?`,desc:T.hook},()=>copy(madeUrl,"카톡 공유를 못 열어 링크를 복사했어요"));
    $("copyBtn").onclick=()=>copy(madeUrl,"복사됐어요. 카톡에 붙여넣으세요");
    $("editBtn").onclick=()=>{state.qi=0;renderQ();show("s-q");};
    show("s-link");
  }

  /* ---------- 초대 ---------- */
  function openInvite(p){
    state.incoming=p;
    $("introHead").innerHTML=`<b>${esc(p.n||"상대")}</b>은(는) 답했어.<br>너는?`;
    $("lockName").textContent=p.n||"상대";$("lockedCard").classList.remove("hidden");
    $("startBtn").textContent="내 답 고르기";
    show("s-intro");
  }

  /* ---------- 결과 ---------- */
  function renderResult(R){
    const ta=typeOf(R.a),tb=typeOf(R.b);
    const same=R.a.filter((v,i)=>v===R.b[i]).length,pct=Math.round(same/N*100);
    const me=R.viewer==="b"?{n:R.bName,t:tb,ans:R.b}:{n:R.aName,t:ta,ans:R.a};
    const you=R.viewer==="b"?{n:R.aName,t:ta,ans:R.a}:{n:R.bName,t:tb,ans:R.b};
    const meL = me.n ? me.n+" (나)" : "나", youL = you.n || "상대";
    $("pct").textContent=pct;$("pctLab").textContent=pct>=70?"통했다!":(pct>=40?"반반":"완전 반대!");$("pctSub").textContent=scoreLine(pct);
    $("whoA").textContent=meL;$("emoA").textContent=me.t.emoji;$("nameA").textContent=me.t.name;$("tagA").textContent=me.t.tag;
    $("whoB").textContent=youL;$("emoB").textContent=you.t.emoji;$("nameB").textContent=you.t.name;$("tagB").textContent=you.t.tag;
    $("combo").innerHTML=`<b>${esc(me.t.name)} + ${esc(you.t.name)}</b> — ${esc(comboOf(me.t.name,you.t.name))}`;
    $("descHA").textContent=`${meL} · ${me.t.name}`;$("descA").textContent=me.t.desc;
    $("descHB").textContent=`${youL} · ${you.t.name}`;$("descB").textContent=you.t.desc;
    // 특별 문항 (a=도전자, b=응답자 기준으로 정의됨)
    const sp=(T.special||[]).filter(s=>R.a[s.q]===s.a&&R.b[s.q]===s.b);
    $("specials").innerHTML=sp.map(s=>`<div class="special"><div class="h">${esc(T.questions[s.q].t)}</div>${esc(s.text)}</div>`).join("");
    // 축
    $("axes").innerHTML=Object.keys(T.axes).map(ax=>{const A=T.axes[ax],ra=axisResult(me.ans,ax),rb=axisResult(you.ans,ax),eq=ra===rb;
      return `<div class="axis ${eq?'same':'diff'}"><div class="h">${esc(A.name)} · ${eq?"같음":"다름"}</div>${esc(eq?A.same[ra]:A.diff)}</div>`;}).join("");
    // 문항
    $("qlist").innerHTML=T.questions.map((q,i)=>{const eq=me.ans[i]===you.ans[i];
      return `<div class="qrow ${eq?'same':'diff'}"><div class="t">${esc(q.t)}</div><div class="ans"><span class="a">${esc(q.o[me.ans[i]])}</span><span class="lbl">${eq?"통했다!":"완전 반대!"}</span><span class="b">${esc(q.o[you.ans[i]])}</span></div></div>`;}).join("");
    ["respActions","notYet","resLinkbox"].forEach(id=>$(id).classList.add("hidden"));
    if(R.viewer==="b"){
      $("respActions").classList.remove("hidden");$("notYet").classList.remove("hidden");
      const rurl=baseUrl()+"#r="+b64e(JSON.stringify({v:1,an:R.aName,a:R.a,bn:R.bName,b:R.b}));
      $("sendResult").onclick=()=>copy(rurl,"결과 링크를 복사했어요. 상대에게 보내세요");
      $("kakaoRes").onclick=()=>share({url:rurl,btn:"결과 보기",img:T.og.sq,
        title:`${R.aName||"먼저 답한 사람"} ${ta.name} + ${R.bName||"나"} ${tb.name} — ${pct}%`,desc:comboOf(ta.name,tb.name).slice(0,60)+"…"},()=>copy(rurl,"카톡 공유를 못 열어 링크를 복사했어요"));
    }
    $("restart").onclick=()=>{location.hash="";location.reload();};
    $("nextList").innerHTML=(T.next||[]).map(n=>`<a href="${n.path}">${esc(n.title)}<small>${esc(n.desc)}</small></a>`).join("");
    show("s-result");
  }

  /* ---------- 진입 ---------- */
  const h=readHash();
  if(h&&h.type==="i"&&h.p&&Array.isArray(h.p.x)&&h.p.x.length===N){openInvite(h.p);}
  else if(h&&h.type==="r"&&h.p&&Array.isArray(h.p.a)&&Array.isArray(h.p.b)){renderResult({aName:h.p.an,a:h.p.a,bName:h.p.bn,b:h.p.b,viewer:"a"});}
  else show("s-intro");
})();
