import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const source = readFileSync('app/archive/page.tsx', 'utf8');
const version = source.match(/const currentVersion = '(.*?)'/)[1];
const latest = source.match(/const updateLogs: UpdateLog\[\] = \[\s*\{ version: '(.*?)', date: '(.*?)', title: '(.*?)', items: \['(.*?)'\]/);
assert.equal(version, latest[1]);
for (const file of readdirSync('public/ui-kit/templates').filter(f => f.endsWith('.html'))) {
 const html = readFileSync(`public/ui-kit/templates/${file}`, 'utf8');
 // Motion contains no release display. Other templates must show the current release.
 if (!html.includes('v1.0.')) continue;
 assert.ok(html.includes(version), `${file}: missing current version`);
 assert.ok(html.includes(latest[3]) || !html.includes('ef-record'), `${file}: missing release title`);
 assert.ok(!html.includes('移除弹层背后的背景柔焦'), `${file}: stale latest title`);
}
const home = readFileSync('public/ui-kit/templates/showcase.html', 'utf8');
assert.ok(home.includes(latest[4]));
assert.ok(home.includes(`data-fx>${version.split('.').at(-1)}<`), 'home: stale large release number');
assert.ok(home.includes(latest[2]), 'home: missing current release date');
assert.equal((home.match(new RegExp(version.replaceAll('.', '\\.'), 'g')) || []).length, 4);
console.log(`Release displays consistent: ${version}`);
