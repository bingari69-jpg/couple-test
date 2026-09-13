// Local-only review fixture. Executes the actual migration; never contacts production.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createDB}=require('../test/tapbattle-db.cjs');
async function serve(port=4190){
 const {db,rpc}=await createDB(),root=path.resolve(__dirname,'..');
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname==='/__tapbattle-rpc'&&req.method==='POST'){
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>10000)throw Error('Too large');}
    const {fn,args}=JSON.parse(raw),user=Number(req.headers['x-tapbattle-player']);
    if(!Number.isInteger(user)||user<0||user>2)throw Error('Invalid test player');
    try{const data=await rpc(user,fn,args);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error:null}));}catch(e){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{message:e.message}}));}return;
   }
   let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
   if(file!==root&&!file.startsWith(root+path.sep))throw Error('Invalid path');
   if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
   // Serve only public web assets, never repository configuration or secrets.
   const ext=path.extname(file);const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
   const rel=path.relative(root,file).replaceAll('\\','/');if(!mime[ext]||rel.split('/').some(x=>x.startsWith('.'))||/^(supabase|node_modules|test|scripts|tmp|output)\//.test(rel))throw Error('Not public');
   let body=fs.readFileSync(file);
   if(rel==='t/tapbattle/index.html'){
    body=body.toString().replace('<script src="game.js',`<script>
     const actorParam=new URLSearchParams(location.search).get('player');
     if(actorParam!==null)sessionStorage.setItem('tapbattle-preview-player',actorParam);
     const previewActor=Number(sessionStorage.getItem('tapbattle-preview-player')||0);
     window.GroupRoomService={ensureSession:async()=>({rpc(fn,args){return {abortSignal(signal){return fetch('/__tapbattle-rpc',{method:'POST',headers:{'Content-Type':'application/json','x-tapbattle-player':String(previewActor)},body:JSON.stringify({fn,args}),signal}).then(r=>r.json());}};}})};
    </script><script src="game.js`).replace('<main class="shell">','<main class="shell"><p style="padding:10px;background:#f7e4cc;font-size:12px;text-align:center">로컬 연결 체험 · 실제 카톡 초대 아님 · 화면 '+(url.searchParams.get('player')==='1'?'친구':'나')+'</p>');
   }
   res.setHeader('Content-Type',mime[ext]);res.setHeader('Cache-Control','no-store');res.end(body);
  }catch(_){res.statusCode=404;res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,db,close:async()=>{await new Promise(resolve=>server.close(resolve));await db.close();}};
}
module.exports={serve};
if(require.main===module)serve().then(s=>console.log('Local TapBattle review: '+s.url+'/t/tapbattle/?mode=online&player=0')).catch(e=>{console.error(e);process.exitCode=1;});

