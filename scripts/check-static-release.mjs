import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {readReleaseData} from './release-data.mjs';

const release=readReleaseData();
const reports=[];
for(const [directory,base] of [['.pages-build/site',''],['.github-pages-build/site','/knowledge-garden-site']]) {
  const root=path.resolve(directory);
  const origin='https://static-validation.invalid';
  const resolveAsset=(reference,from)=>{
    if(!reference||reference.startsWith('data:')||reference.startsWith('#'))return null;
    const url=new URL(reference,new URL(from,origin));
    if(url.origin!==origin)return null;
    if(base)assert.ok(url.pathname===base||url.pathname.startsWith(base+'/'),`Escaped project base: ${from} -> ${reference}`);
    const relative=decodeURIComponent(url.pathname.slice(base.length)).replace(/^\//,'');
    const file=path.resolve(root,relative);
    assert.ok(file===root||file.startsWith(root+path.sep),'Asset escaped build');
    return {url,file};
  };
  const checked=new Set();
  function checkDependency(reference,from) {
    const resolved=resolveAsset(reference,from);
    if(!resolved)return;
    const {url,file}=resolved;
    assert.ok(existsSync(file)&&statSync(file).isFile(),`Missing asset: ${from} -> ${url.pathname}`);
    if(checked.has(url.pathname))return;
    checked.add(url.pathname);
    if(file.endsWith('.css')) {
      const css=readFileSync(file,'utf8');
      for(const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g))checkDependency(match[1],url.pathname);
    }
    if(file.endsWith('.js')) {
      const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      function visit(node) {
        if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)) {
          const spec=node.moduleSpecifier.text;
          if(spec.startsWith('.')||spec.startsWith('/'))checkDependency(spec,url.pathname);
        }
        if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0]))checkDependency(node.arguments[0].text,url.pathname);
        ts.forEachChild(node,visit);
      }
      visit(source);
    }
  }
  for(const htmlName of ['index.html','archive.html','ui-kit.html','ui-kit/index.html',...readdirSync(path.join(root,'ui-kit/templates')).filter(name=>name.endsWith('.html')).map(name=>'ui-kit/templates/'+name)]) {
    const html=readFileSync(path.join(root,htmlName),'utf8');
    if(htmlName==='ui-kit/templates/showcase.html')assert.ok(html.includes(release.version),`${htmlName}: version stale`);
    for(const match of html.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css)(?:\?[^"<>]*)?)"/g))checkDependency(match[1].replaceAll('&amp;','&'),base+'/'+htmlName);
  }
  assert.ok([...checked].filter(url=>url.endsWith('.js')).some(url=>readFileSync(resolveAsset(url,base+'/index.html').file,'utf8').includes(release.version)),'Current release absent from compiled client dependencies');
  for(const name of ['anime-girl-bg.png','terrain-contours.jpg','.openai/hosting.json','.env','app/archive/page.tsx'])assert.ok(!existsSync(path.join(root,name)),`Private/unused source included: ${name}`);
  for(const asset of ['fonts/Saira.ttf','fonts/Saira-OFL.txt','ui-kit/fonts/Saira.ttf','ui-kit/fonts/Saira-OFL.txt','ui-kit/assets/contours/contour-a.svg'])assert.ok(existsSync(path.join(root,asset)),`Required asset absent: ${asset}`);
  reports.push({directory,base,version:release.version,dependencies:checked.size,passed:true});
}
const evidenceDirectory=process.argv[2] || '.local-validation';
mkdirSync(evidenceDirectory,{recursive:true});
writeFileSync(path.join(evidenceDirectory,'static-artifacts.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports));
