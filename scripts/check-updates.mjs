import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { readReleaseData, syncReleaseTemplate, releaseAnchor, escapeHtml } from './release-data.mjs';
const data = readReleaseData();
const required = {
  'showcase.html': ['ticker', 'ticker-copy', 'index'],
  'reading.html': ['recent', 'history'],
  'console.html': ['console'],
  'specimen.html': ['sample'],
  'antipatterns.html': ['sample'],
};
for (const [file, blocks] of Object.entries(required)) {
  const html = readFileSync(`public/ui-kit/templates/${file}`, 'utf8');
  for (const name of blocks) assert.equal(html.split(`<!-- release:${name} -->`).length, 2, `${file}: missing or duplicate ${name} block`);
  assert.equal(html, syncReleaseTemplate(html, data), `${file}: release data stale; run node scripts/sync-archive-data.mjs`);
  assert.ok(html.includes(data.version), `${file}: missing current version`);
  assert.ok(!/data-release="([^"]+)"\s+data-release=/.test(html), `${file}: duplicate release binding`);
}
const reading = readFileSync('public/ui-kit/templates/reading.html', 'utf8');
assert.equal((reading.match(/class="release-history-item"/g) || []).length, data.logs.length);
let previous = -1;
for (const log of data.logs) {
  const position = reading.indexOf(`id="${releaseAnchor(log)}"`);
  assert.ok(position > previous, `History missing or out of order: ${log.version}`);
  previous = position;
  for (const item of log.items) assert.ok(reading.includes(`<li>${escapeHtml(item)}</li>`), `${log.version}: missing change`);
}
// An independent fixture verifies quotes, markup escaping and multiple changes.
const fixture = readReleaseData(`const currentVersion = "v2.0.0"; const updateLogs: UpdateLog[] = [{version:"v2.0.0",date:"2026.10.29",title:"A < B & C",items:["first", "second"]}];`);
const rendered = syncReleaseTemplate('<!-- release:history --><!-- /release --><span data-release="count"></span>', fixture);
assert.ok(rendered.includes('A &lt; B &amp; C'));
assert.ok(rendered.includes('<li>first</li><li>second</li>'));
assert.ok(rendered.includes('02 项调整'));
assert.equal(rendered, syncReleaseTemplate(rendered, fixture), 'Sync must be idempotent');
assert.throws(() => readReleaseData('const currentVersion = process.exit(); const updateLogs = [];'));
assert.throws(() => readReleaseData('const currentVersion = "v9.0.0"; const updateLogs = [{version:"v1.0.0",date:"2026.10.28",title:"x",items:["y"]}];'));
console.log(`Release displays consistent: ${data.version}; all ${data.logs.length} historical records, generated lists, dates, counts and escaped content verified.`);
