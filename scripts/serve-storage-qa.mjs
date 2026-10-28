// Isolated fault-injection proxy. Never included in public/ or a production build.
import http from 'node:http';
import {readFileSync} from 'node:fs';
const upstream='http://127.0.0.1:5201';
let scenario='normal', seed=false;
const fixture=JSON.parse(readFileSync('.local-validation/browser-fixture-v1.json','utf8'));
const harness=`<!doctype html><meta charset="utf-8"><title>隔离存储验收</title><h1>隔离存储验收 · 仅 127.0.0.1:5202</h1><p>此地址只包含合成测试数据，不修改原站点。</p><form method="post" action="/__qa/setup"><button name="scenario" value="corrupt">损坏 JSON</button><button name="scenario" value="quota">写入空间不足</button><button name="scenario" value="read">读取被拒绝</button><button name="scenario" value="sidebar">旧折叠侧栏</button><button name="scenario" value="normal">恢复正常合成数据</button></form><h2>实际保存的原始值</h2><pre id="raw"></pre><a href="/archive">打开测试档案</a><script>document.getElementById('raw').textContent=localStorage.getItem('knowledge-garden-entries')??'尚未初始化';</script>`;
http.createServer(async(req,res)=>{
 try {
 if(req.url==='/__qa/setup' && req.method==='POST') {
  let body=''; for await(const chunk of req) body+=chunk;
  const value=new URLSearchParams(body).get('scenario');
  if(!['normal','corrupt','quota','read','sidebar'].includes(value)) {res.writeHead(400);res.end();return;}
  scenario=value; seed=true;res.writeHead(303,{location:'/archive'});res.end();return;
 }
 if(req.url==='/__qa') {res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(harness);return;}
 if(req.method!=='GET') {res.writeHead(405);res.end();return;}
 const path=new URL(req.url,'http://127.0.0.1:5202');
 const response=await fetch(upstream+path.pathname+path.search,{redirect:'manual',signal:AbortSignal.timeout(15000)});
 const headers=Object.fromEntries(response.headers); delete headers['content-length']; delete headers['content-encoding'];
 headers['cache-control']='no-store';
 let bytes=Buffer.from(await response.arrayBuffer());
 if(headers['content-type']?.includes('text/html') && path.pathname==='/archive') {
  let code='';
  if(seed) {const raw=scenario==='corrupt'?'{broken-qa':JSON.stringify(fixture);code+=`localStorage.setItem('knowledge-garden-entries',${JSON.stringify(raw)});localStorage.setItem('knowledge-garden-sidebar-collapsed','${scenario==='sidebar'?'true':'false'}');`;seed=false;}
  if(scenario==='quota') code+=`Storage.prototype.setItem=function(){throw new DOMException('QA quota','QuotaExceededError')};`;
  if(scenario==='read') code+=`Storage.prototype.getItem=function(){throw new DOMException('QA denied','SecurityError')};`;
  if(code) bytes=Buffer.from(bytes.toString().replace('<head>',`<head><script>${code.replaceAll('<','\\u003c')}</script>`));
 }
 res.writeHead(response.status,headers);res.end(bytes);
 } catch(error) {res.writeHead(502);res.end(String(error));}
}).listen(5202,'127.0.0.1',()=>console.log('Isolated storage QA: http://127.0.0.1:5202/__qa'));
