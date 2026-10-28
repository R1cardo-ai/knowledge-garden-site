import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';

const original = new Map(['window','matchMedia','document','localStorage','location','innerWidth','innerHeight','NodeFilter','requestAnimationFrame','cancelAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const unhandled=[];
const record=reason=>unhandled.push(reason);
process.on('unhandledRejection',record);
try {
  globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
  const { wireTheme, scramble } = await import(`data:text/javascript;base64,${Buffer.from(readFileSync('public/ui-kit/assets/fx.js','utf8')).toString('base64')}`);
  for (const mode of ['success','skipped','cancelled-animation']) {
    const classes=new Set();
    const attributes={};
    let listener;
    let storageListener;
    globalThis.window={addEventListener:(name,callback)=>{if(name === 'storage')storageListener=callback;}};
    let animations=0;
    let saved;
    const button={setAttribute:(key,value)=>attributes[key]=value,addEventListener:(_event,callback)=>listener=callback,getBoundingClientRect:()=>({left:0,top:0,width:44,height:44})};
    const html={dataset:{theme:'light'},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)},animate(){animations++;return {finished:mode==='cancelled-animation'?Promise.reject(new Error('cancelled')):Promise.resolve()};}};
    globalThis.location={search:''};
    globalThis.innerWidth=1280;globalThis.innerHeight=900;
    globalThis.localStorage={getItem:()=>null,setItem:(_key,value)=>saved=value};
    globalThis.document={documentElement:html,startViewTransition(change){change();return {ready:mode==='skipped'?Promise.reject(new Error('skipped')):Promise.resolve(),finished:mode==='skipped'?Promise.reject(new Error('skipped')):Promise.resolve()};}};
    wireTheme({querySelectorAll:()=>[button]});
    assert.equal(attributes['aria-pressed'],'false');
    listener({clientX:0,clientY:0});
    await setImmediate();
    assert.equal(html.dataset.theme,'dark',`${mode}: selected theme retained`);
    assert.equal(saved,'dark');
    assert.equal(attributes['aria-pressed'],'true');
    assert.equal(classes.has('ef-theming'),false,`${mode}: transition class cleaned`);
    assert.equal(animations,mode==='skipped'?0:1);
    storageListener({key:'theme',newValue:'light'});
    assert.equal(html.dataset.theme,'light');
    assert.equal(attributes['aria-pressed'],'false');
    storageListener({key:'unrelated',newValue:'dark'});
    assert.equal(html.dataset.theme,'light');
    storageListener({key:'theme',newValue:'dark'});
    assert.equal(attributes['aria-pressed'],'true');
    storageListener({key:null,newValue:null});
    assert.equal(html.dataset.theme,undefined);

  }
  const frames=[];
  const attributes={};
  const textNodes=[{data:'v1.0.215'}, {data:' │ 条'}];
  globalThis.NodeFilter={SHOW_TEXT:4};
  globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
  globalThis.cancelAnimationFrame=()=>{};
  globalThis.document={createTreeWalker(){let index=-1;return {nextNode(){index++;return index<textNodes.length;},get currentNode(){return textNodes[index];}};}};
  const element={hasAttribute:key=>key in attributes,setAttribute:(key,value)=>attributes[key]=value,removeAttribute:key=>delete attributes[key]};
  scramble(element,360);
  assert.equal(attributes['aria-label'],'v1.0.215 │ 条');
  frames.shift()(performance.now()+1);
  assert.equal(textNodes[1].data,' │ 条');
  frames.shift()(performance.now()+1000);
  assert.equal(textNodes.map(node=>node.data).join(''),'v1.0.215 │ 条');
  assert.equal('aria-label' in attributes,false);
  assert.deepEqual(unhandled,[],'Theme cancellation must not create unhandled rejections');
  console.log('Static theme transitions passed: success, skipped reveal and cancelled animation preserve theme, clear state and handle all rejections.');
} finally {
  process.off('unhandledRejection',record);
  for (const [key,descriptor] of original) {if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}
