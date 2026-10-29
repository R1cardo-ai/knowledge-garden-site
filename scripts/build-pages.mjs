import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const basePath = process.env.GITHUB_PAGES_BASE_PATH || '';
if (basePath && !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('Invalid project base path');
const stagingRoot = path.join(root, basePath ? '.github-pages-build' : '.pages-build');
mkdirSync(stagingRoot, { recursive: true });
const stage = mkdtempSync(path.join(stagingRoot, 'source-'));
function copy(source, destination) {
  if (statSync(source).isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) copy(path.join(source, name), path.join(destination, name));
  } else {
    writeFileSync(destination, readFileSync(source));
  }
}
for (const name of ['app', 'components', 'hooks', 'lib', 'public', 'package.json', 'tsconfig.json']) {
  copy(path.join(root, name), path.join(stage, name));
}
// Transform authored URLs before compilation; framework route manifests remain untouched.
if (basePath) {
  function prefixSources(directory) {
    for (const name of readdirSync(directory)) {
      const file = path.join(directory, name);
      if (statSync(file).isDirectory()) { prefixSources(file); continue; }
      if (!/\.(?:tsx?|js|html|css)$/.test(name)) continue;
      const source = readFileSync(file, 'utf8');
      const next = source
        .replace(/(["'`])\/(archive|ui-kit|_next|fonts|favicon\.svg|knowledge-garden-logo\.svg|terrain-contours\.jpg)(?=[/?"'`#])/g, `$1${basePath}/$2`)
        .replace(/href=(["'])\/\1/g, `href=$1${basePath}/$1`)
        .replaceAll('https://local.invalid/archive', `https://local.invalid${basePath}/archive`);
      if (next !== source) writeFileSync(file, next);
    }
  }
  for (const name of ['app','components','hooks','lib','public']) prefixSources(path.join(stage,name));
}
symlinkSync(path.join(root, 'node_modules'), path.join(stage, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
writeFileSync(path.join(stage, 'next.config.ts'), `export default { output: 'export' };\n`);
writeFileSync(path.join(stage, 'vite.config.ts'), `import { defineConfig } from 'vite';
import vinext from 'vinext';
import tailwindcss from '@tailwindcss/postcss';
export default defineConfig({css:{postcss:{plugins:[tailwindcss()]}},plugins:[vinext()]});\n`);
const built = spawnSync(process.execPath, [path.join(root, 'node_modules/vinext/dist/cli.js'), 'build'], { cwd: stage, stdio: 'inherit' });
if (built.error) throw built.error;
if (built.status !== 0) process.exit(built.status ?? 1);
const client = path.join(stage, 'dist/client');
for (const file of ['archive.html', 'ui-kit.html']) {
  if (!existsSync(path.join(client, file))) throw new Error(`Static export missing ${file}`);
}
const version = readFileSync(path.join(root, 'app/archive/page.tsx'), 'utf8').match(/const currentVersion = '(.*?)'/)[1];
if (!readFileSync(path.join(client, 'ui-kit/templates/showcase.html'), 'utf8').includes(version)) throw new Error('Homepage version missing from export');
// This unused background has no recorded redistribution permission.
for (const name of ['anime-girl-bg.png', 'terrain-contours.jpg']) {
  const unusedBackground = path.join(client, name);
  if (existsSync(unusedBackground)) rmSync(unusedBackground);
}
const output = path.join(stagingRoot, 'site');
if (path.dirname(path.resolve(output)) !== stagingRoot) throw new Error('Unsafe output path');
if (existsSync(output)) rmSync(output, { recursive: true });
copy(client, output);
// /ui-kit also contains static assets: serve the index after directory redirects.
mkdirSync(path.join(output, 'ui-kit'), { recursive: true });
copy(path.join(client, 'ui-kit.html'), path.join(output, 'ui-kit/index.html'));
if (basePath) {
  function prefixAssets(directory) {
    for (const name of readdirSync(directory)) {
      const file = path.join(directory, name);
      if (statSync(file).isDirectory()) { prefixAssets(file); continue; }
      if (!/\.(?:js|html|css|json|rsc)$/.test(name)) continue;
      const source = readFileSync(file, 'utf8');
      writeFileSync(file, source.replace(/(?<!knowledge-garden-site)\/_next\//g, `${basePath}/_next/`));
    }
  }
  prefixAssets(output);
}
// The server-side home redirect is intentionally skipped by static export.
writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Knowledge Garden</title><meta http-equiv="refresh" content="0;url=${basePath}/ui-kit/templates/showcase.html?variant=standard"><a href="${basePath}/ui-kit/templates/showcase.html?variant=standard">进入知识花园</a></html>\n`);
writeFileSync(path.join(output, '.nojekyll'), '');
writeFileSync(path.join(output, '_redirects'), '/ /ui-kit/templates/showcase.html?variant=standard 302\n/knowledge-garden-site / 301\n/knowledge-garden-site/* /:splat 301\n');
writeFileSync(path.join(output, '404.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>404 · 知识花园</title><h1>404</h1><p>未找到页面。</p><a href="${basePath}/">返回首页</a></html>\n`);
console.log(`Cloudflare Pages static export ready: ${version}, .pages-build/site`);
