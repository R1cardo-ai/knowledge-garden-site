import assert from 'node:assert/strict';
import {normalizeEntries, compareRecent, compareEssayDate, essayExcerpt, selectFeaturedAward, proofImageUrl, categoryDistribution, monthlyRecordCounts} from '../lib/archive-data.js';
for (const value of [{}, [null], [4], [[]]]) assert.throws(() => normalizeEntries(value, '2026.10.28'));
assert.deepEqual(normalizeEntries([], '2026.10.28'), []);
const entries = normalizeEntries({entries:[{id:'a',title:'<img onerror=alert(1)>',date:'2026-10-25',type:'award',proof:'javascript:alert(1)'},{id:'b',date:'2026.10.26',updatedAt:1},{id:'c',date:'2026.10.20',updatedAt:9999999999999}]}, '2026.10.28');
assert.equal(entries[0].date,'2026.10.25');
assert.equal(entries[0].proof,'');
assert.equal(entries[0].title,'<img onerror=alert(1)>');
assert.deepEqual([...entries].sort(compareRecent).map(e=>e.id), ['c','a','b']);
assert.deepEqual([{id:'older',date:'2026.09.01',updatedAt:999},{id:'newer',date:'2026.10.01',updatedAt:1}].sort(compareEssayDate).map(e=>e.id),['newer','older']);
assert.equal(essayExcerpt({summary:'',notes:'## 想法\n今天读了[一本书](https://example.com)，记住一句话。'}),'想法 今天读了一本书，记住一句话。');
assert.equal(essayExcerpt({summary:'自己写的摘要',notes:'另一段正文'}),'自己写的摘要');
assert.equal(essayExcerpt({summary:'',notes:''}),'');
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
// Overview figures: counts follow the partition, ties keep the archive's own category order.
{
  const rows = [
    {id:'1', type:'knowledge', category:'设计', date:'2026.10.01'},
    {id:'2', type:'knowledge', category:'设计', date:'2026.10.02'},
    {id:'3', type:'knowledge', category:'阅读', date:'2026.09.30'},
    {id:'4', type:'knowledge', category:'   ', date:'2026.09.29'},
    {id:'5', type:'award', category:'竞赛', date:'2026.10.03'},
  ];
  const knowledge = categoryDistribution(rows, 'knowledge');
  assert.deepEqual(knowledge.rows.map(row => [row.category, row.count]), [['设计',2],['未分类',1],['阅读',1]]);
  assert.equal(knowledge.total, 4);
  assert.equal(knowledge.max, 2);
  assert.equal(knowledge.rows[0].ratio, 1);
  assert.equal(knowledge.rows[1].ratio, 0.5);
  const all = categoryDistribution(rows);
  assert.equal(all.total, 5);
  assert.deepEqual(all.rows.map(row => row.category).sort(), ['竞赛','未分类','设计','阅读'].sort());
  assert.equal(categoryDistribution(rows).rows.filter(row => row.category === '竞赛')[0].count, 1);
  assert.deepEqual(categoryDistribution([]), {rows:[], max:0, total:0});
  assert.equal(categoryDistribution(rows.slice(4), 'knowledge').total, 0);
  const before = JSON.stringify(rows);
  categoryDistribution(rows, 'knowledge');
  assert.equal(JSON.stringify(rows), before);
  console.log('Category distribution: partition scope, unknown category, tie order, ratios, empty state and no mutation passed.');
}
// Twelve calendar months: local window, record dates only, invalid and out-of-range apart.
{
  const now = new Date(2026, 9, 29);
  const rows = [
    {date:'2026.10.29'}, {date:'2026.10.01'}, {date:'2026.09.15'}, {date:'2025.11.01'},
    {date:'2025.10.31'}, {date:'2024.03.02'}, {date:'2026.13.01'}, {date:'待补充'}, {date:'2027.01.01'},
  ];
  const result = monthlyRecordCounts(rows, now);
  assert.equal(result.months.length, 12);
  assert.equal(result.months[0].label, '2025.11');
  assert.equal(result.months[11].label, '2026.10');
  assert.equal(result.months[11].count, 2);
  assert.equal(result.months[10].count, 1);
  assert.equal(result.months[0].count, 1);
  assert.equal(result.total, 4);
  assert.equal(result.max, 2);
  assert.equal(result.months[11].ratio, 1);
  assert.equal(result.unverified, 2);
  assert.equal(result.outside, 3);
  assert.equal(result.range, '2025.11 – 2026.10');
  assert.equal(monthlyRecordCounts([], now).total, 0);
  assert.deepEqual(monthlyRecordCounts([], now).months.map(month => month.count), Array(12).fill(0));
  // A January window must cross the year boundary without dropping December.
  const january = monthlyRecordCounts([{date:'2025.12.31'}, {date:'2026.01.01'}], new Date(2026, 0, 15));
  assert.equal(january.months[0].label, '2025.02');
  assert.equal(january.months[11].label, '2026.01');
  assert.equal(january.months[10].count, 1);
  assert.equal(january.months[11].count, 1);
  console.log('Records by date: twelve-month window, year boundary, record-date counting, ratios, invalid/out-of-range notes and empty state passed.');
}
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
