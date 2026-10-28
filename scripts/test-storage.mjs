import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync('app/archive/page.tsx', 'utf8').replaceAll('\r\n', '\n');
const init = source.slice(source.indexOf('    const fallbackDate = formatDisplayDate(new Date());', source.indexOf('export default function Home')), source.indexOf('    return () => window.clearTimeout(timer);', source.indexOf('    const fallbackDate = formatDisplayDate(new Date());', source.indexOf('export default function Home'))));
const save = source.match(/  useEffect\(\(\) => \{\n    if \(!hydrated \|\| storageBlocked\) return;([\s\S]*?)\n  \}, \[entries, hydrated, storageBlocked, setStorageMessage\]\);/)[1];
for (const raw of ['{broken', '{}', '[null]', '[]', '[{"id":"old","title":"Keep"}]', null]) {
 const result = { raw, writes: 0 };
 const context = { result, formatDisplayDate: () => '2026.10.28', Date, Boolean, Array, JSON, Error, starterEntries: [{id:'starter'}], normalizeEntries: value => Array.isArray(value) ? value : value.entries,
 window: { localStorage: { getItem: () => raw, setItem: () => { result.writes++; } }, setTimeout: fn => { fn(); return 1; } },
 setDisplayDate: () => {}, setEntries: value => result.entries = value, setStorageBlocked: value => result.blocked = value, setStorageMessage: value => result.message = value, setRawBackup: value => result.backup = value, setHydrated: () => {} };
 vm.runInNewContext(ts.transpile(init), context);
 if (['{broken','{}','[null]'].includes(raw)) { assert.equal(result.blocked,true); assert.equal(result.backup,raw); assert.equal(result.writes,0); }
 else { assert.equal(result.blocked,false); assert.deepEqual(JSON.parse(JSON.stringify(result.entries)), raw === null ? [{id:'starter'}] : JSON.parse(raw)); }
}
let message = '';
vm.runInNewContext(save, { window: {localStorage: {setItem(){throw new Error('quota');}}}, entries: [], JSON, setStorageMessage: value => message = value });
assert.ok(message.includes('保存失败'));
assert.ok(source.includes('if (!hydrated || storageBlocked) return;'));
console.log('Isolated storage checks passed: corrupt JSON, invalid shape, valid/empty/first visit, quota failure.');
