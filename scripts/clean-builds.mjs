import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const staging = ['.pages-build', '.github-pages-build'];
let removed = 0;
let freed = 0;

function sizeOf(directory) {
  let total = 0;
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    const stat = statSync(file);
    total += stat.isDirectory() ? sizeOf(file) : stat.size;
  }
  return total;
}

for (const name of staging) {
  const directory = path.join(root, name);
  if (!existsSync(directory)) continue;
  const entries = readdirSync(directory)
    .filter((entry) => entry.startsWith('source-'))
    .map((entry) => ({ entry, time: statSync(path.join(directory, entry)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  for (const { entry } of entries.slice(1)) {
    const target = path.join(directory, entry);
    if (path.dirname(path.resolve(target)) !== path.resolve(directory)) throw new Error(`Unsafe path ${target}`);
    freed += sizeOf(target);
    rmSync(target, { recursive: true, force: true });
    removed += 1;
  }
}

console.log(`Removed ${removed} stale staging directories; freed ${(freed / 1024 / 1024).toFixed(1)} MB. Keep the newest per host.`);
