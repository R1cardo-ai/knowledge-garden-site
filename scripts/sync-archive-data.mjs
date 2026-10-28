import {copyFileSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import { readReleaseData, syncReleaseTemplate } from './release-data.mjs';
// The browser template consumes this generated ES module; edit lib/archive-data.js.
copyFileSync('lib/archive-data.js','public/ui-kit/assets/archive-data.js');
console.log('Shared archive module synchronized for static templates.');
const data = readReleaseData();
for (const file of readdirSync('public/ui-kit/templates').filter(name => name.endsWith('.html'))) {
  const path = `public/ui-kit/templates/${file}`;
  const html = readFileSync(path, 'utf8');
  const next = syncReleaseTemplate(html, data);
  if (next !== html) writeFileSync(path, next);
}
console.log(`Release templates synchronized: ${data.version}, ${data.logs.length} history records.`);
