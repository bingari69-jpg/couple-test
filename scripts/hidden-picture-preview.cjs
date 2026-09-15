// Local static preview. Only public files are served; no production writes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
function serve(port=4196){
 const root=path.resolve(__dirname,'..'),mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
 const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('path');if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const rel=path.relative(root,file).replaceAll('\\','/');if(!/^(t\/hidden-picture\/|assets\/)/.test(rel)||rel.split('/').some(p=>p.startsWith('.'))||!mime[path.extname(file)])throw Error('path');res.setHeader('Content-Type',mime[path.extname(file)]);res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);}catch(_){res.writeHead(404);res.end('Not found');}});
 return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve({url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(done=>server.close(done))})));
}
module.exports={serve};
if(require.main===module)serve().then(s=>console.log(s.url+'/t/hidden-picture/'));
