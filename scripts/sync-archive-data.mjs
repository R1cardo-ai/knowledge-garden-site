import {copyFileSync} from 'node:fs';
// The browser template consumes this generated ES module; edit lib/archive-data.js.
copyFileSync('lib/archive-data.js','public/ui-kit/assets/archive-data.js');
console.log('Shared archive module synchronized for static templates.');
