import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const tokens = JSON.parse(readFileSync('public/ui-kit/assets/tokens.json', 'utf8'));
const specimen = readFileSync('public/ui-kit/templates/specimen.html', 'utf8');

const unwrap = (value) => (value && typeof value === 'object' && '$value' in value ? value.$value : value);

// Type scale: the specimen must show every published step at its token size.
const type = tokens.size.type;
const expectedSizes = [
  ['H1', type.h1], ['TITLE', type.title], ['H2', type.h2], ['BODY', type.body],
  ['UI', type.ui], ['FIELD', type.field], ['EYEBROW', type.eyebrow],
];
for (const [label, token] of expectedSizes) {
  assert.equal(typeof unwrap(token), 'number', `${label}: token size must be a number`);
  const row = specimen.match(new RegExp(`<b>${label}</b><em>${unwrap(token)} /`));
  assert.ok(row, `${label}: missing specimen row at ${unwrap(token)}px`);
}
assert.match(specimen, /<b>DISPLAY<\/b><em>clamp\(48, 10vw, 176\)/);
assert.match(specimen, /<b>MICRO<\/b><em>10 \/ \.13em/);

// Motion: every bar shown must exist in tokens, and the landmark bars must be marked.
const durations = new Set(Object.values(tokens.motion.duration).map(unwrap).filter((value) => typeof value === 'number'));
const bars = [...specimen.matchAll(/<li( class="is-landmark")?><span>([\w-]+)<\/span><i style="--w:(\d+)"><\/i><b>(\d+)ms<\/b><\/li>/g)];
assert.equal(bars.length, 10, 'motion specimen must list ten durations');
for (const [, , name, width, label] of bars) {
  const value = Number(width);
  assert.ok(durations.has(value), `${name}: ${value}ms is not a tokens duration`);
  assert.equal(String(value), label, `${name}: bar width and label disagree`);
}
const landmarks = bars.filter(([, landmark]) => landmark).map(([, , name]) => name);
assert.deepEqual(landmarks, ['press', 'sheetIn', 'drive']);

// Section jump nav must point at sections that exist.
const jump = [...specimen.matchAll(/<a href="#([\w-]+)">([^<]+)<\/a>/g)].filter((match) => ['tokens', 'type-scale', 'motion-scale', 'media', 'components'].includes(match[1]));
assert.equal(jump.length, 5, 'specimen jump nav must have five anchors');
for (const [, id] of jump) assert.match(specimen, new RegExp(`id="${id}"`), `missing section #${id}`);

// Media rules and reduced motion stay documented and wired.
assert.match(specimen, /id="media"/);
assert.match(specimen, /saturate\(0\.45\) contrast\(0\.94\)/);
assert.match(specimen, /class="media-empty"/);
assert.match(specimen, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.ease-demo i, \.media-swatch \{ transition: none; \}/);

console.log(`Specimen consistency passed: ${expectedSizes.length + 2} type steps, ${bars.length} durations, ${jump.length} section anchors, media and reduced-motion rules.`);
