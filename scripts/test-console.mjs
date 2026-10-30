import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeEntries,formatDisplayDate} from '../lib/archive-data.js';
import {readReleaseData} from './release-data.mjs';

const html=readFileSync('public/ui-kit/templates/console.html','utf8');
const source=[...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/^\s*import[^\n]+\n/gm,'');
const version=readReleaseData().version;
assert.ok(html.includes(`data-release="version">${version}`));
assert.ok(!html.includes('aria-current="page"'));
assert.ok(html.includes('<h1>档案总览</h1>'));
for(const [saved,expected] of [
  [null,{total:0,knowledge:0,awards:0}],
  [JSON.stringify({version:1,entries:[{id:'a',type:'award'},{id:'b'}]}),{total:2,knowledge:1,awards:1}],
  ['{broken',{total:'—',knowledge:'—',awards:'—'}],
  [JSON.stringify({schemaVersion:99,entries:[]}),{total:'—',knowledge:'—',awards:'—'}],
]) {
  const configs=[];
  const listeners=new Map();
  const detailFields={label:{},count:{},link:{}};
  const detail={classList:{toggle:(_name,selected)=>{detail.selected=selected;}},querySelector:selector=>detailFields[selector==='[data-dial-label]'?'label':selector==='[data-dial-count]'?'count':'link']};
  vm.runInNewContext(source,{
    normalizeEntries,formatDisplayDate,
    localStorage:{getItem:()=>saved},
    document:{querySelector:selector=>selector==='[data-release="version"]'?{textContent:version}:selector==='[data-dial-detail]'?detail:{}},
    window:{addEventListener:(event,callback)=>listeners.set(event,callback)},
    drawDial:(_node,config)=>configs.push(config),wireReadouts(){},wireTheme(){},
  });
  for(const config of configs) {
    assert.equal(config.idle.big,expected.total);
    assert.equal(config.sections[1].big,expected.knowledge);
    assert.equal(config.sections[2].big,expected.awards);
    assert.equal(config.sections[3].big,version.split('.').at(-1));
    assert.equal(config.sections[3].sub,version);
    assert.equal(config.sections[1].href,'/archive?view=knowledge');
    assert.equal(config.sections[2].href,'/archive?view=award');
    assert.ok(!('gauges' in config));
    config.onSelect(config.sections[1]);
    assert.equal(detail.selected,true);
    assert.equal(detailFields.label.textContent,'知识库');
    assert.equal(detailFields.count.textContent,`${expected.knowledge}条`);
    assert.equal(detailFields.link.href,'/archive?view=knowledge');
    config.onSelect(null);
    assert.equal(detail.selected,false);
    assert.equal(detailFields.count.textContent,expected.total==='—'?'—':`${expected.total}条`);
  }
  listeners.get('pageshow')();
  listeners.get('storage')({key:'knowledge-garden-entries'});
  assert.equal(configs.length,3);
  assert.equal(configs.at(-1).idle.big,expected.total);
}
console.log('Console passed: canonical version, real/empty/legacy/invalid/future archive counts, navigation, pageshow and cross-tab refresh.');
