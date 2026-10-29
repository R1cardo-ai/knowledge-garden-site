import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {readReleaseData,releaseHref} from './release-data.mjs';
import {normalizeEntries,formatDisplayDate,compareRecent,selectFeaturedEntry,selectFeaturedAward,proofImageUrl,categoryDistribution,featuredEntryStorageKey} from '../lib/archive-data.js';
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
{
  const source=readFileSync('public/ui-kit/assets/kit-nav.js','utf8').replace(/^import[^\n]+\n/,'');
  const rows=[{id:'first',title:'Manual',date:'2026.01.01',updatedAt:1},{id:'last',title:'Recent',date:'2026.10.29',updatedAt:2}];
  for(const preference of ['first','missing','',null]) {
    const nodes=new Map(['title','meta','summary','link','heading','note'].map(name=>[`[data-feature-${name}]`,{}]));
    const events=new Map();
    const context={URL,URLSearchParams,Set,normalizeEntries,formatDisplayDate,compareRecent,selectFeaturedEntry,featuredEntryStorageKey,
      localStorage:{getItem:key=>{if(key===featuredEntryStorageKey){if(preference===null)throw new Error('Denied preference');return preference;}return JSON.stringify(rows);}},
      location:{href:'https://example.test/ui-kit/templates/showcase.html'},window:{addEventListener:(name,callback)=>events.set(name,callback)},
      document:{querySelector:selector=>nodes.get(selector),querySelectorAll:()=>[],createElement:()=>({setAttribute(){}})}};
    vm.runInNewContext(source,context);
    const expected=preference==='first'?'Manual':'Recent';
    assert.equal(nodes.get('[data-feature-title]').textContent,expected);
    assert.ok(nodes.get('[data-feature-link]').href.includes(preference==='first'?'entry=first':'entry=last'));
    assert.ok(nodes.get('[data-feature-heading]').textContent.includes(preference==='first'?'精选':'最近'));
    events.get('storage')({key:featuredEntryStorageKey});
    assert.equal(nodes.get('[data-feature-title]').textContent,expected);
  }
  console.log('Homepage rendering passed: manual/automatic/missing/denied preference, reading link and cross-tab preference refresh.');
}
// The overview figures and the recent lists must come from the same normalized records.
{
  const source=readFileSync('public/ui-kit/assets/kit-nav.js','utf8').replace(/^import[^\n]+\n/,'');
  const makeNode=tag=>{
    const node={tagName:String(tag).toUpperCase(),children:[],attributes:{},className:'',textContent:'',href:'',innerHTML:'',owner:null,style:{values:new Map(),setProperty(key,value){this.values.set(key,value);}}};
    node.append=(...kids)=>{for(const kid of kids){kid.owner=node;node.children.push(kid);}};
    node.appendChild=node.append;
    node.replaceChildren=(...kids)=>{for(const kid of kids)kid.owner=node;node.children=[...kids];};
    node.setAttribute=(key,value)=>{node.attributes[key]=String(value);};
    node.getAttribute=key=>node.attributes[key]??null;
    node.before=other=>{const parent=node.owner;if(!parent)return;const at=parent.children.indexOf(node);parent.children.splice(Math.max(0,at),0,other);other.owner=parent;};
    node.querySelector=selector=>{
      const name=selector.replace(/^\./,'');
      const stack=[...node.children];
      while(stack.length){const current=stack.shift();if(typeof current.className==='string'&&current.className.split(/\s+/).includes(name))return current;if(current.children)stack.push(...current.children);}
      return null;
    };
    return node;
  };
  const byClass=(node,className)=>node.children.filter(child=>typeof child.className==='string'&&child.className.split(/\s+/).includes(className));
  const rows=[
    {id:'k1',type:'knowledge',title:'最近知识',date:'2026.10.29',updatedAt:9,category:'设计',summary:'摘要一'},
    {id:'k2',type:'knowledge',title:'较早知识',date:'2026.09.01',updatedAt:8,category:'阅读',summary:'摘要二'},
    {id:'k3',type:'knowledge',title:'更早知识',date:'2026.08.01',updatedAt:7,category:'设计',summary:'摘要三'},
    {id:'a1',type:'award',title:'最新成果',date:'2026.10.20',updatedAt:1,category:'竞赛',proof:'https://example.test/proof.png'},
    {id:'a2',type:'award',title:'较早成果',date:'2026.03.01',updatedAt:2,category:'竞赛'},
  ];
  for(const fixture of [rows,[]]){
    const chart=makeNode('ol');
    const lead={knowledge:makeNode('div'),award:makeNode('div')};
    const list={knowledge:makeNode('ol'),award:makeNode('ol')};
    const feature={title:makeNode('h2'),meta:makeNode('p'),summary:makeNode('p'),note:makeNode('p'),heading:makeNode('p'),link:makeNode('a')};
    const context={URL,URLSearchParams,Set,normalizeEntries,formatDisplayDate,compareRecent,selectFeaturedEntry,selectFeaturedAward,proofImageUrl,categoryDistribution,featuredEntryStorageKey,
      localStorage:{getItem:key=>key===featuredEntryStorageKey?null:JSON.stringify(fixture)},
      location:{href:'https://example.test/ui-kit/templates/showcase.html'},window:{addEventListener(){}},
      document:{createElement:makeNode,
        querySelector:selector=>{
          if(selector==='[data-archive-chart]')return chart;
          const leadMatch=selector.match(/^\[data-recent-lead="(\w+)"\]$/);if(leadMatch)return lead[leadMatch[1]];
          const listMatch=selector.match(/^\[data-recent="(\w+)"\]$/);if(listMatch)return list[listMatch[1]];
          const featureMatch=selector.match(/^\[data-feature-(\w+)\]$/);if(featureMatch)return feature[featureMatch[1]];
          return null;
        },
        querySelectorAll:()=>[]}};
    vm.runInNewContext(source,context);
    if(!fixture.length){
      assert.equal(chart.children.length,1);
      assert.equal(chart.children[0].className,'chart-empty');
      assert.equal(lead.knowledge.children.length,1);
      assert.ok(lead.knowledge.children[0].className.includes('is-empty'));
      assert.ok(lead.award.children[0].className.includes('is-empty'));
      assert.equal(list.knowledge.children[0].className,'recent-empty');
      continue;
    }
    const distribution=categoryDistribution(normalizeEntries(fixture,formatDisplayDate(new Date())),'all');
    assert.equal(chart.children.length,distribution.rows.length);
    chart.children.forEach((item,index)=>{
      const link=item.children[0];
      const [name,count,track]=link.children;
      assert.equal(name.textContent,distribution.rows[index].category);
      assert.equal(count.textContent,String(distribution.rows[index].count));
      assert.ok(link.href.includes(`category=${encodeURIComponent(distribution.rows[index].category)}`));
      assert.equal(track.children[0].style.values.get('--ratio'),distribution.rows[index].ratio.toFixed(4));
    });
    assert.equal(byClass(lead.knowledge.children[0],'lead-title')[0].textContent,'最近知识');
    assert.ok(lead.knowledge.children[0].href.includes('entry=k1'));
    assert.equal(byClass(lead.award.children[0],'lead-title')[0].textContent,'最新成果');
    assert.equal(byClass(lead.award.children[0],'lead-proof').length,1);
    assert.equal(byClass(lead.knowledge.children[0],'lead-proof').length,0);
    const knowledgeRows=list.knowledge.children.map(item=>item.children[0]);
    assert.deepEqual(knowledgeRows.map(link=>link.children[0].textContent),['较早知识','更早知识']);
    assert.ok(knowledgeRows.every(link=>!link.href.includes('entry=k1')));
    const awardRows=list.award.children.map(item=>item.children[0]);
    assert.deepEqual(awardRows.map(link=>link.children[0].textContent),['较早成果']);
  }
  console.log('Homepage overview passed: category counts and links match the records, evidence image only on the featured award, recent rows exclude the lead entry and the empty archive keeps a real empty state.');
}
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
