import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function walk(directory) {
  const files = [];
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) {
      if (['node_modules', '.git', '.pages-build', '.github-pages-build', '.local-build', '.local-validation', '.next', '.vinext', 'dist'].includes(name)) continue;
      files.push(...walk(file));
    } else if (/\.(md|html)$/.test(name)) files.push(file);
  }
  return files;
}

function checkMarkdown(file) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    let target = match[1].replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|tel:|#)/.test(target)) continue;
    target = target.split('#')[0];
    if (!target) continue;
    target = decodeURIComponent(target);
    const resolved = target.startsWith('/') ? path.join(root, target) : path.resolve(path.dirname(file), target);
    if (!existsSync(resolved)) failures.push(`${path.relative(root, file)} -> ${match[1]}`);
  }
}

function checkHtml(file) {
  const text = readFileSync(file, 'utf8');
  const directory = path.dirname(file);
  for (const match of text.matchAll(/(?<![-\w])(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(target)) continue;
    if (target.startsWith('/') && !target.startsWith('/ui-kit/templates/')) continue; // site routes handled by the app
    const clean = decodeURIComponent(target.split('#')[0].split('?')[0]);
    if (!clean) continue;
    const resolved = clean.startsWith('/') ? path.join(root, 'public', clean) : path.resolve(directory, clean);
    if (!existsSync(resolved)) failures.push(`${path.relative(root, file)} -> ${target}`);
  }
}

for (const file of ['README.md', 'AGENTS.md']) checkMarkdown(path.join(root, file));
for (const directory of ['docs']) {
  for (const file of walk(path.join(root, directory))) {
    if (file.endsWith('.md')) checkMarkdown(file);
  }
}
for (const file of walk(path.join(root, 'public/ui-kit/templates'))) {
  if (file.endsWith('.html')) checkHtml(file);
}

// Production metadata must be complete on every public template.
const templates = readdirSync(path.join(root, 'public/ui-kit/templates')).filter((name) => name.endsWith('.html'));
for (const name of templates) {
  const text = readFileSync(path.join(root, 'public/ui-kit/templates', name), 'utf8');
  for (const requirement of ['name="description"', 'rel="canonical"', 'property="og:image"', 'name="twitter:card"']) {
    if (!text.includes(requirement)) failures.push(`public/ui-kit/templates/${name} missing ${requirement}`);
  }
}

if (failures.length) {
  console.error(`Broken local links or missing metadata (${failures.length}):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`Links and metadata passed: README, AGENTS, docs and ${templates.length} templates.`);
