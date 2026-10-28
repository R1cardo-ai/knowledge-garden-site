import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/archive/page.tsx','utf8').replaceAll('\r\n','\n');
const begin=source.indexOf('    let savedTheme: string | null = null;');
const end=source.indexOf('\n  }, []);',begin);
const effect=ts.transpile(source.slice(begin,end));
for(const [saved,desktop,expected] of [['light',true,'light'],['dark',true,'dark'],[null,true,'dark'],[null,false,'light']]) {
 const data=new Map(saved?[['theme',saved]]:[]); const root={};
 vm.runInNewContext(effect,{window:{localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},matchMedia:()=>({matches:desktop})},themeStorageKey:'theme',themeDefaultMigrationKey:'migration',setDarkTheme:()=>{},document:{documentElement:{dataset:root}}});
 assert.equal(root.theme,expected); if(saved) {assert.equal(data.get('theme'),saved);assert.equal(data.has('migration'),false);}
}
const root={};
vm.runInNewContext(effect,{window:{localStorage:{getItem(){throw new Error('denied')},setItem(){throw new Error('denied')}},matchMedia:()=>({matches:true})},themeStorageKey:'theme',themeDefaultMigrationKey:'migration',setDarkTheme:()=>{},document:{documentElement:{dataset:root}}});
assert.equal(root.theme,'light');
console.log('Theme migration preserves explicit light/dark preferences; only new desktop profiles adopt dark; denied reads do not crash.');
