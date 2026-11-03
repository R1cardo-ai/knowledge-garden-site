import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, readReleaseData } from './release-data.mjs';

const siteUrl = 'https://knowledge-garden-site.pages.dev';

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
        .replace(/(["'`])\/(archive|ui-kit|_next|fonts|favicon\.svg|knowledge-garden-logo\.svg|terrain-contours\.jpg|feed\.xml)(?=[/?"'`#])/g, `$1${basePath}/$2`)
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
      // Vite keeps preload dependency lists chunk-relative ("_next/..."). The client
      // preload helper resolves them against the origin with a leading slash, so a
      // project base path has to be part of the chunk-relative value.
      writeFileSync(file, source
        .replace(/(?<!knowledge-garden-site)\/_next\//g, `${basePath}/_next/`)
        .replace(/(["'`])_next\//g, `$1${basePath.slice(1)}/_next/`));
    }
  }
  prefixAssets(output);
}
// The static home is a real document at "/" instead of a meta-refresh to the
// template folder. It is generated from the synced landing template so the
// release version, update ticker and the rest of the site stay in one source.
const landingPath = path.join(output, 'ui-kit/templates/landing.html');
if (!existsSync(landingPath)) throw new Error('Static export missing landing template');
let home = readFileSync(landingPath, 'utf8');
home = home
  .replaceAll('../assets/', `${basePath}/ui-kit/assets/`)
  .replaceAll('../fonts/', `${basePath}/fonts/`);
if (!home.includes(version)) throw new Error('Homepage version missing from landing template');
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '知识花园',
  alternateName: 'Knowledge Garden',
  url: `${siteUrl}/`,
  description: '记录日常观察、个人思考与获奖经历的本地档案。',
  inLanguage: 'zh-CN',
};
home = home.replace(/^<!doctype html>\s*<!--[\s\S]*?-->\s*/, '<!doctype html>\n');
home = home.replace('</head>', `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>\n  </head>`);
writeFileSync(path.join(output, 'index.html'), home);

const { logs } = readReleaseData();
const today = new Date().toISOString().slice(0, 10);
const sitemapPages = [
  ['/', '1.0', 'weekly'],
  ['/archive', '0.9', 'weekly'],
  ['/ui-kit/', '0.6', 'monthly'],
  ['/ui-kit/templates/reading.html', '0.5', 'weekly'],
  ['/ui-kit/templates/console.html', '0.4', 'monthly'],
  ['/ui-kit/templates/specimen.html', '0.4', 'monthly'],
];
writeFileSync(path.join(output, 'sitemap.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapPages.map(([loc, priority, changefreq]) => `  <url><loc>${siteUrl}${loc}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`),
  '</urlset>',
  '',
].join('\n'));
writeFileSync(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
const feedItems = logs.slice(0, 30).map((log) => {
  const link = `${siteUrl}/ui-kit/templates/reading.html#release-${log.version.replaceAll('.', '-')}`;
  const pubDate = new Date(`${log.date.replaceAll('.', '-')}T00:00:00+08:00`).toUTCString();
  return `    <item><title>${escapeHtml(`${log.version} ${log.title}`)}</title><link>${link}</link><guid isPermaLink="false">${escapeHtml(log.version)}</guid><pubDate>${pubDate}</pubDate><description>${escapeHtml(log.items.join('；'))}</description></item>`;
}).join('\n');
writeFileSync(path.join(output, 'feed.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0"><channel>',
  '  <title>知识花园 · 更新日志</title>',
  `  <link>${siteUrl}/ui-kit/templates/reading.html#updates</link>`,
  '  <description>知识花园每次产品更新的简短记录。</description>',
  '  <language>zh-CN</language>',
  `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
  feedItems,
  '</channel></rss>',
  '',
].join('\n'));

writeFileSync(path.join(output, '.nojekyll'), '');
writeFileSync(path.join(output, '_redirects'), '/knowledge-garden-site / 301\n/knowledge-garden-site/* /:splat 301\n');
writeFileSync(path.join(output, '404.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>404 · 知识花园</title><meta name="robots" content="noindex"><h1>404</h1><p>未找到页面。</p><a href="${basePath}/">返回首页</a></html>\n`);
console.log(`Cloudflare Pages static export ready: ${version}, .pages-build/site`);
