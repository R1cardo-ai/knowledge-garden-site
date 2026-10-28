import assert from 'node:assert/strict';
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
const base=process.argv[2] ?? 'http://127.0.0.1:5201';
const version=readFileSync('app/archive/page.tsx','utf8').match(/const currentVersion = '(.*?)'/)[1];
const results=[];
async function check(path, expected, match) {
 const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(15000)});
 const body=await response.text();
 assert.equal(response.status,expected,`${path}: status ${response.status}`);
 if(match) assert.ok(body.includes(match),`${path}: expected content absent`);
 results.push({path,status:response.status,url:response.url,type:response.headers.get('content-type')});
 return body;
}
await check('/',200,'Knowledge');
const home=await check('/ui-kit/templates/showcase.html?variant=standard',200,version);
assert.ok(home.includes('data-recent="knowledge"'));
await check('/ui-kit/assets/archive-data.js',200,'relatedReferences');
await check('/ui-kit/assets/kit-nav.js',200,'refreshArchive');
await check('/ui-kit/assets/endfield.css',200,'.ef-ticker .track { animation:ef-pass');
for (const path of ['/archive','/archive?view=knowledge&category=%E6%9C%AC%E5%9C%B0&entry=missing','/ui-kit']) {
 const html=await check(path,200,'<html');
 assert.ok(!html.includes('/knowledge-garden-site/_next/'),`${path}: stale exported paths`);
 const assets=[...html.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css)(?:\?[^"<>]*)?)"/g)].map(m=>m[1]).filter(p=>p.startsWith('/'));
 assert.ok(assets.length,`${path}: no runtime assets found`);
 for (const asset of new Set(assets)) {
  const body=await check(asset.replaceAll('&amp;','&'),200);
  assert.ok(!body.startsWith('<!DOCTYPE'),`${asset}: HTML returned instead of runtime asset`);
 }
}
await check('/not-a-real-route-validation',404,'404');
mkdirSync('.local-validation',{recursive:true});
writeFileSync('.local-validation/production-http-results.json',JSON.stringify({version,base,checkedAt:new Date().toISOString(),results},null,2));
console.log(`Production HTTP checks passed: ${version}, ${results.length} requests. Browser interactions not covered.`);
