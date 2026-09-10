const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/result-notify.js'), 'utf8');
const storage = new Map();
const session = { user: { id: 'sender-user' } };
const client = {
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    signInAnonymously: async () => ({ data: { session }, error: null })
  },
  rpc: async () => ({ data: {}, error: null }),
  channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
  from: () => ({
    select(){ return this; }, in(){ return this; }, eq(){ return this; }, order(){ return this; },
    limit: async () => ({ data: [], error: null })
  })
};

const location = new URL('https://bingari69-jpg.github.io/couple-test/t/rps/');
const document = {
  body: null,
  head: { appendChild(){} },
  currentScript: null,
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
  addEventListener(){},
  createElement(){ return { dataset: {}, addEventListener(){}, setAttribute(){}, append(){}, appendChild(){} }; },
  getElementById(){ return null; }
};
const sandbox = {
  URL, URLSearchParams, Uint8Array, Array, Set, Promise, Date, JSON, RegExp, String, Number,
  location, document, navigator: { userAgent: 'test' }, history: { pushState(){}, replaceState(){} },
  crypto: require('node:crypto').webcrypto,
  localStorage: { getItem:k=>storage.get(k)||null, setItem:(k,v)=>storage.set(k,v) },
  sessionStorage: { getItem:k=>storage.get('s:'+k)||null, setItem:(k,v)=>storage.set('s:'+k,v) },
  supabase: { createClient: () => client },
  setInterval(fn){ fn(); return 1; }, clearInterval(){}, setTimeout,
  MutationObserver: function(){ this.observe=()=>{}; }, getComputedStyle:()=>({display:'none',visibility:'hidden'}),
  atob: value => Buffer.from(value, 'base64').toString('binary')
};
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox);

const api = sandbox.ResultNotify._test;
assert.equal(api.gameSlug('https://example.com/couple-test/t/mind/fight/#c=x'), 'mind/fight');
assert.equal(api.gameSlug('https://example.com/couple-test/t/personality/'), 'personality');
assert.equal(api.eligible('rps'), true);
assert.equal(api.eligible('personality'), true);
assert.equal(api.eligible('letter'), false);
assert.equal(api.eligible('ladder'), false);
assert.equal(api.validCode('abcdef123456'), 'ABCDEF123456');
assert.equal(api.validCode('short'), '');
const linked = api.addCode('https://example.com/couple-test/t/rps/#c=sealed', 'ABCDEF123456');
assert.equal(new URL(linked).searchParams.get('ch'), 'ABCDEF123456');
assert.equal(new URL(linked).hash, '#c=sealed');
assert.equal(api.isInviteUrl(linked), true);
assert.equal(api.isInviteUrl('https://example.com/couple-test/t/rps/#r=result'), false);
console.log('완료 알림 검사 통과 — 대상 게임·테스트, 완료 코드, 해시 보존');
