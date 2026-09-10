/* No network or real messages: verify SDK payloads and asynchronous failure handling. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/kakao-share.js'), 'utf8');
async function main() {
  let message, fail = false, copied = 0;
  const sandbox = { URL, Kakao: { isInitialized: () => true, Share: {
    sendDefault: async value => { if (fail) throw new Error('SDK failure'); message = value; }
  } } };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);
  const payload = { v:4, w:'가'.repeat(448)+'💌', n:'친구', f:'나' };
  const url = 'https://bingari69-jpg.github.io/couple-test/t/letter/#l=' + Buffer.from(JSON.stringify(payload)).toString('base64url');
  const input = {url,title:'너에게 편지가 도착했어요',desc:'봉투를 눌러 마음을 읽어보세요.',img:'https://example.com/letter.png',btn:'편지 열어보기'};
  assert.equal(await sandbox.kakaoShare(input), true);
  assert.equal(message.objectType, 'feed');
  assert.equal(message.buttonTitle, input.btn);
  assert.equal(message.buttons, undefined);
  assert.equal(message.content.link.webUrl, undefined);
  assert.equal(message.content.link.mobileWebUrl, url);
  const old = {objectType:'feed',content:message.content,buttons:[{title:input.btn,link:message.content.link}]};
  assert.ok(JSON.stringify(message).length < JSON.stringify(old).length * .6);
  assert.deepEqual(JSON.parse(Buffer.from(message.content.link.mobileWebUrl.split('#l=')[1], 'base64url')), payload);
  assert.equal(await sandbox.kakaoShare({...input,textOnly:true}), true);
  assert.equal(message.objectType, 'text');
  assert.equal(message.content, undefined); // No remote image scraping in the retry path.
  assert.equal(message.link.mobileWebUrl, url);
  assert.equal(message.link.webUrl, undefined);
  assert.ok(message.text.length <= 200);
  assert.ok(!message.text.includes(payload.w));
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/share-cards/catalog.json'),'utf8'));
  for(const slug of Object.keys(catalog)){
    for(const fragment of ['#c=sealed','#r=result']){
      const target='https://bingari69-jpg.github.io/couple-test/t/'+slug+'/'+fragment;
      assert.equal(await sandbox.kakaoShare({url:target,title:'친구의 도전',desc:'함께 해봐',btn:'열어보기'}),true);
      assert.equal(message.objectType,'feed');assert.equal(message.content.imageWidth,800);assert.equal(message.content.imageHeight,480);
      assert.equal(message.content.link.webUrl,slug==='letter'?undefined:target);assert.equal(message.content.link.mobileWebUrl,target);assert.equal(message.buttons,undefined);
      assert.ok(message.content.imageUrl.endsWith(slug.replace('/','-')+'.png?v=20260910-unified'));
      const bytes=fs.readFileSync(path.join(__dirname,'../assets/share-cards/'+slug.replace('/','-')+'.png'));
      assert.equal(bytes.readUInt32BE(16),800);assert.equal(bytes.readUInt32BE(20),480);
    }
  }
  fail = true;
  assert.equal(await sandbox.kakaoShare(input, async () => { await Promise.resolve(); copied++; }), false);
  assert.equal(copied, 1);
  console.log('카카오 공유 검사 통과 — 링크 중복 축소·본문 보존·이미지 없는 재시도·비동기 오류 대체');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
