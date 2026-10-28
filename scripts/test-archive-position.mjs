import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=ts.transpile(readFileSync('lib/archive-position.ts','utf8'),{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2017});
const {saveArchivePosition,readArchivePosition,clearArchivePosition}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const data=new Map();const store={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
const original='http://localhost/archive?view=knowledge&format=note&layout=list&q=学习#records';
const position={y:1280,anchor:'stable-record',offset:240};
saveArchivePosition(store,original,position);
assert.deepEqual(readArchivePosition(store,'http://localhost/archive?format=note&view=knowledge&q=学习&entry=stable-record'),position);
assert.equal(readArchivePosition(store,'/archive?view=award'),null);
assert.equal(readArchivePosition(store,'/archive?view=knowledge&format=video&q=学习'),null);
assert.equal(data.size,1);
clearArchivePosition(store,original);assert.equal(data.size,0);
for(const raw of ['{broken','null','{}','{"y":-1,"anchor":"a","offset":0}','{"y":0,"anchor":4,"offset":0}']) {data.set('knowledge-garden-position-v1:/archive',raw);assert.equal(readArchivePosition(store,'/archive'),null);}
const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('quota');},removeItem(){throw new Error('denied');}};
assert.doesNotThrow(()=>saveArchivePosition(denied,original,position));assert.equal(readArchivePosition(denied,original),null);assert.doesNotThrow(()=>clearArchivePosition(denied,original));
console.log('Directory position checks passed: canonical URL keys, filter isolation, stable anchor/offset, clearing, corrupt data and denied session storage.');
