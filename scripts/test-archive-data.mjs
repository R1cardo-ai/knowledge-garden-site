import assert from 'node:assert/strict';
import {normalizeEntries, compareRecent, selectFeaturedAward, proofImageUrl} from '../lib/archive-data.js';
for (const value of [{}, [null], [4], [[]]]) assert.throws(() => normalizeEntries(value, '2026.10.28'));
assert.deepEqual(normalizeEntries([], '2026.10.28'), []);
const entries = normalizeEntries({entries:[{id:'a',title:'<img onerror=alert(1)>',date:'2026-10-25',type:'award',proof:'javascript:alert(1)'},{id:'b',date:'2026.10.26',updatedAt:1},{id:'c',date:'2026.10.20',updatedAt:9999999999999}]}, '2026.10.28');
assert.equal(entries[0].date,'2026.10.25');
assert.equal(entries[0].proof,'');
assert.equal(entries[0].title,'<img onerror=alert(1)>');
assert.deepEqual([...entries].sort(compareRecent).map(e=>e.id), ['c','a','b']);
console.log('Shared archive data: invalid structures rejected, empty preserved, legacy envelope normalized, links sanitized and recent order verified.');

const legacy=[{title:'old'}, {id:'same',title:'one'}, {id:'same',title:'two'}, {id:'',title:'empty'}];
const normalized=normalizeEntries(legacy,'2026.10.28');
assert.deepEqual(normalized.map(e=>e.id), normalizeEntries(legacy,'2026.10.28').map(e=>e.id));
assert.equal(new Set(normalized.map(e=>e.id)).size,legacy.length);
assert.deepEqual(normalizeEntries(normalized,'2026.10.28').map(e=>e.id),normalized.map(e=>e.id));

const rich={id:'extended',title:'旧字段',tags:['a','b','c','d','e'],custom:{outline:['保留']},notes:'原笔记'};
const retained=normalizeEntries([rich],'2026.10.28')[0];
assert.deepEqual(retained.tags,rich.tags);
assert.deepEqual(retained.custom,rich.custom);
assert.deepEqual(normalizeEntries([retained],'2026.10.28')[0],retained);

const awards=[{id:'old',type:'award',date:'2026.10.01',updatedAt:9999999999999},{id:'new',type:'award',date:'2026.10.28',updatedAt:1},{id:'knowledge',type:'knowledge',date:'2026.10.29'}];
assert.equal(selectFeaturedAward(awards).id,'new');
assert.equal(awards[0].id,'old');
assert.equal(selectFeaturedAward([]),undefined);
assert.equal(selectFeaturedAward(awards.filter(e=>e.id==='old')).id,'old');
assert.equal(selectFeaturedAward(awards.filter(e=>e.type==='knowledge')),undefined);
assert.equal(proofImageUrl('https://example.com/a.JPG?version=2#preview'),'https://example.com/a.JPG?version=2#preview');
assert.equal(proofImageUrl('https://example.com/project'),'');
assert.equal(proofImageUrl('https://example.com/doc.pdf?file=a.png'),'');
assert.equal(proofImageUrl('javascript:alert(1)'),'');
assert.equal(proofImageUrl('data:image/png;base64,abc'),'');
console.log('Featured awards: selection follows filtered record dates, no mutation, empty/knowledge-only states and safe direct image detection passed.');
// Manual selection must survive edits without changing snapshot contents or sort order.
{
  const {selectFeaturedEntry} = await import('../lib/archive-data.js');
  const rows = [
    {id:'older', date:'2026.01.01', updatedAt:1, title:'Old'},
    {id:'recent', date:'2026.10.29', updatedAt:10, title:'New'},
  ];
  const before = JSON.stringify(rows);
  assert.equal(selectFeaturedEntry(rows, 'older').id, 'older');
  assert.equal(selectFeaturedEntry(rows, 'missing').id, 'recent');
  assert.equal(selectFeaturedEntry(rows).id, 'recent');
  assert.equal(selectFeaturedEntry([], 'older'), undefined);
  assert.equal(selectFeaturedEntry([{...rows[0],title:'Renamed'},rows[1]], 'older').title, 'Renamed');
  assert.equal(selectFeaturedEntry(rows.slice(1), 'older').id, 'recent');
  assert.equal(JSON.stringify(rows), before);
  console.log('Homepage featured selection: stable ID, rename, deletion/missing fallback, automatic/empty states and no mutation passed.');
}
