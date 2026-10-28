import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {readReleaseData,releaseHref} from './release-data.mjs';
const html=readFileSync('public/ui-kit/templates/showcase.html','utf8');
assert.ok(html.includes(`href="${releaseHref(readReleaseData().logs[0])}" data-release-href="latest"`));
assert.ok(html.includes('aria-label="主导航"'));
assert.ok(html.includes('aria-label="全站索引"'));
for(const pathname of ['showcase','showcase.html']) {
  const source=readFileSync('public/ui-kit/assets/kit-nav.js','utf8').replace(/^import[^\n]+\n/,'');
  const link=href=>({href,getAttribute:()=>href});
  const links=[link('reading.html#updates'),link('/archive?view=award'),link('reading.html?variant=site#updates'),link('https://example.com/ui-kit/templates/reading.html')];
  const context={URL,URLSearchParams,Set,localStorage:{getItem:()=>null},location:{href:`https://example.test/ui-kit/templates/${pathname}?variant=coldstore&accent=ice&theme=dark`},window:{addEventListener(){}},document:{querySelector:()=>null,querySelectorAll:selector=>selector==='a[href]'?links:[],createElement:()=>({setAttribute(){}})},normalizeEntries:()=>[],formatDisplayDate:()=>'',compareRecent:()=>0};
  vm.runInNewContext(source,context);
  const first=new URL(links[0].href);
  assert.equal(first.searchParams.get('variant'),'coldstore');
  assert.equal(first.searchParams.get('accent'),'ice');
  assert.equal(first.searchParams.get('theme'),'dark');
  assert.equal(first.hash,'#updates');
  assert.equal(links[1].href,'/archive?view=award');
  assert.equal(new URL(links[2].href).searchParams.get('variant'),'site');
  assert.equal(links[3].href,'https://example.com/ui-kit/templates/reading.html');
}
console.log('Showcase checks passed: generated latest release target, navigation, clean/HTML routes, appearance carryover, explicit overrides, fragments, archive and external link isolation.');
// Pointer motion must reach the current art and return to neutral on leave or reduced motion.
const priorMatchMedia=Object.getOwnPropertyDescriptor(globalThis,'matchMedia');
try {
  const values=new Map();
  const events=new Map();
  let preferenceChanged;
  const motion={matches:true,addEventListener:(_type,callback)=>preferenceChanged=callback};
  globalThis.matchMedia=()=>motion;
  const {wireParallax}=await import(`data:text/javascript;base64,${Buffer.from(readFileSync('public/ui-kit/assets/fx.js','utf8')).toString('base64')}`);
  const hero={style:{setProperty:(key,value)=>values.set(key,value)},addEventListener:(key,callback)=>events.set(key,callback),getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500})};
  wireParallax(hero);
  events.get('pointermove')({clientX:750,clientY:125});
  assert.equal(values.get('--mx'),'0.250');
  assert.equal(values.get('--my'),'-0.250');
  events.get('pointerleave')();
  assert.equal(values.get('--mx'),'0');
  assert.equal(values.get('--my'),'0');
  motion.matches=false;
  preferenceChanged();
  events.get('pointermove')({clientX:1000,clientY:500});
  assert.equal(values.get('--mx'),'0');
  assert.equal(values.get('--my'),'0');
  const reducedEvents=new Map();
  wireParallax({...hero,addEventListener:(key,callback)=>reducedEvents.set(key,callback)});
  assert.equal(reducedEvents.size,0);
  console.log('Homepage motion checks passed: pointer response, leave reset, preference change and initially reduced motion.');
} finally {
  if(priorMatchMedia)Object.defineProperty(globalThis,'matchMedia',priorMatchMedia);
  else delete globalThis.matchMedia;
}
