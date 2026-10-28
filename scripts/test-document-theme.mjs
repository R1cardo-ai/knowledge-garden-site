import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const observed=[];
let update;
let unsubscribed=false;
let callback;
const root={dataset:{theme:'light'}};
const context={exports:{},document:{documentElement:root},MutationObserver:class {constructor(notify){callback=notify;}observe(target,options){observed.push({target,options});}disconnect(){unsubscribed=true;}},require(name){assert.equal(name,'react');return {useSyncExternalStore(subscribe,snapshot,server){assert.equal(server(),'light');update=snapshot;const cleanup=subscribe(()=>{});context.cleanup=cleanup;return snapshot();}};}};
vm.runInNewContext(ts.transpile(readFileSync('hooks/use-document-theme.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}),context);
assert.equal(context.exports.useDocumentTheme(),'light');
assert.equal(observed[0].target,root);
assert.deepEqual(Array.from(observed[0].options.attributeFilter),['data-theme']);
root.dataset.theme='dark';callback();assert.equal(update(),'dark');
root.dataset.theme='light';callback();assert.equal(update(),'light');
context.cleanup();assert.equal(unsubscribed,true);
const ui=readFileSync('app/ui-kit/ui-kit-client.tsx','utf8');
const effect=ui.slice(ui.indexOf('    let saved: string | null = null;'),ui.indexOf('\n  }, []);',ui.indexOf('    let saved: string | null = null;')));
for (const saved of ['dark','light','denied']) {
 const dataset={};
 vm.runInNewContext(ts.transpile(effect),{window:{localStorage:{getItem(){if(saved==='denied')throw new Error('denied');return saved;}}},document:{documentElement:{dataset}}});
 assert.equal(dataset.theme,saved==='dark'?'dark':'light');
}
console.log('Document theme: attribute subscription, live snapshots, SSR fallback, observer cleanup and denied storage initialization passed.');
