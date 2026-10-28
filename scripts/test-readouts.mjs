import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const load=(file,extra={})=>{const context={exports:{},...extra};vm.runInNewContext(ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}),context);return context.exports;};
function environment(reduced=false) {
 const frames=new Map(),timers=new Map();let sequence=0;let delay;
 const window={matchMedia:()=>({matches:reduced}),setTimeout(callback,ms){delay=ms;timers.set(++sequence,callback);return sequence;},clearTimeout:id=>timers.delete(id),requestAnimationFrame(callback){frames.set(++sequence,callback);return sequence;},cancelAnimationFrame:id=>frames.delete(id)};
 const {animateReadout}=load('lib/animate-readout.ts',{window});
 const timer=()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(callback=>callback());};
 const frame=time=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(callback=>callback(time));};
 return {animateReadout,timer,frame,frames,timers,get delay(){return delay;}};
}
const numeric=environment();const el={textContent:'12'};const values=[];
numeric.animateReadout(el,{from:0,to:12,delay:70,onValue:value=>values.push(value)});
assert.equal(el.textContent,'12','Before animation, initial render remains truthful');
numeric.timer();numeric.frame(100);numeric.frame(260);assert.ok(values.at(-1)>0 && values.at(-1)<12);numeric.frame(420);assert.equal(el.textContent,'12');assert.equal(values.at(-1),12);assert.equal(numeric.frames.size,0);
const version=environment();const text={textContent:''};version.animateReadout(text,{to:'1.0.218',scramble:true,delay:1000});assert.equal(version.delay,140);version.timer();version.frame(0);assert.equal(text.textContent[1],'.');assert.equal(text.textContent[3],'.');version.frame(320);assert.equal(text.textContent,'1.0.218');
const cancelled=environment();const kept={textContent:'04'};const stop=cancelled.animateReadout(kept,{to:9});stop();cancelled.timer();cancelled.frame(1000);assert.equal(kept.textContent,'04');assert.equal(cancelled.frames.size,0);
const inFlight=environment();const moving={textContent:'10'};const cancel=inFlight.animateReadout(moving,{to:10});inFlight.timer();inFlight.frame(0);const intermediate=moving.textContent;cancel();inFlight.frame(1000);assert.equal(moving.textContent,intermediate);
const still=environment(true);const direct={textContent:''};still.animateReadout(direct,{to:7});assert.equal(direct.textContent,'07');assert.equal(still.timers.size,0);assert.equal(still.frames.size,0);
const {createArchiveStatus}=load('lib/archive-status.ts');const store=createArchiveStatus();let notifications=0;const unsubscribe=store.subscribe(()=>notifications++);store.report('quota failure');assert.equal(store.getSnapshot(),'quota failure');assert.equal(store.getServerSnapshot(),'');store.report('quota failure');assert.equal(notifications,1);store.report('');assert.equal(notifications,2);unsubscribe();store.report('another failure');assert.equal(notifications,2);assert.equal(createArchiveStatus().getSnapshot(),'');
console.log('Readout/status checks passed: truthful initial text, intermediate/final frames, reduced motion, bounded timing, cancellation, isolated snapshots, deduplication and unsubscribe.');
