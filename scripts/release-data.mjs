import ts from 'typescript';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Parse literals only: the canonical page is never evaluated as executable code.
export function readReleaseData(source = readFileSync('app/archive/page.tsx', 'utf8')) {
  const tree = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values = new Map();
  function literal(node) {
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
      assert.ok(ts.isPropertyAssignment(property), 'Release fields must be literal properties');
      return [property.name.text, literal(property.initializer)];
    }));
    throw new Error('Release data must contain only string, array and object literals');
  }
  for (const statement of tree.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (['currentVersion', 'updateLogs'].includes(declaration.name.getText(tree))) values.set(declaration.name.getText(tree), literal(declaration.initializer));
    }
  }
  const version = values.get('currentVersion');
  const logs = values.get('updateLogs');
  assert.ok(Array.isArray(logs) && logs.length > 0, 'Missing release history');
  assert.equal(version, logs[0].version, 'Current version must match newest log');
  const seen = new Set();
  for (const log of logs) {
    assert.match(log.version, /^v\d+\.\d+\.\d+$/);
    assert.match(log.date, /^\d{4}\.\d{2}\.\d{2}$/);
    assert.ok(log.title && Array.isArray(log.items) && log.items.length && log.items.every(item => typeof item === 'string' && item));
    assert.ok(!seen.has(log.version), `Duplicate release ${log.version}`);
    seen.add(log.version);
  }
  return { version, logs };
}

export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
export const releaseAnchor = log => `release-${log.version.replaceAll('.', '-')}`;
export const releaseHref = log => `reading.html#${releaseAnchor(log)}`;
export const releaseCount = log => String(log.items.length).padStart(2, '0');

export function releaseBlock(name, data) {
  const { logs } = data;
  const row = log => `<li><a class="ef-record" href="${releaseHref(log)}"><span class="ef-tag">${escapeHtml(log.version)}</span><time class="ef-field">${escapeHtml(log.date)}</time><span class="name ef-read">${escapeHtml(log.title)}</span><span class="ef-field">${releaseCount(log)} 项调整</span></a></li>`;
  if (name === 'ticker' || name === 'ticker-copy') return logs.slice(0, 7).map(log => `<li><a href="${releaseHref(log)}"${name === 'ticker-copy' ? ' tabindex="-1"' : ''}><b>${escapeHtml(log.version)}</b>${escapeHtml(log.title)}</a></li>`).join('\n');
  if (name === 'index') return logs.slice(0, 3).map(row).join('\n');
  if (name === 'sample') return logs.slice(0, 2).map(row).join('\n');
  if (name === 'recent') return logs.slice(0, 4).map(row).join('\n');
  if (name === 'history') return logs.map((log, index) => `<details class="release-history-item" id="${releaseAnchor(log)}"${index === 0 ? ' open' : ''}><summary><span class="ef-field">${escapeHtml(log.version)} / ${escapeHtml(log.date)}</span><strong>${escapeHtml(log.title)}</strong>${index === 0 ? '<span class="ef-marker">最新</span>' : ''}</summary><ul>${log.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details>`).join('\n');
  if (name === 'console') return logs.slice(0, 2).map(log => `<li><div><div>${escapeHtml(log.title)} <span class="ef-state">已更新</span></div><div class="meta"><span>${escapeHtml(log.version)}</span><span>${releaseCount(log)} 项调整</span><span>${escapeHtml(log.date)}</span></div></div><div class="acts"><a class="ef-btn small" href="${releaseHref(log)}">阅读更新</a></div></li>`).join('\n');
  throw new Error(`Unknown generated release block: ${name}`);
}

export function syncReleaseTemplate(html, data) {
  const latest = data.logs[0];
  return html.replace(/href="[^"]*"(?=\s+data-release-href="latest")/g, `href="${releaseHref(latest)}"`).replace(/(<!-- release:([\w-]+) -->)[\s\S]*?(<!-- \/release -->)/g, (_, start, name, end) => `${start}\n${releaseBlock(name, data)}\n${end}`)
    .replace(/(data-release="([\w-]+)"[^>]*>)[^<]*/g, (_, start, key) => {
      const fields = {version:data.version, date:latest.date, title:latest.title, summary:latest.items.join('；'), number:data.version.split('.').at(-1), count:`${releaseCount(latest)} 项调整`, total:`${data.logs.length} 条`, 'item-number':releaseCount(latest)};
      assert.ok(key in fields, `Unknown release field ${key}`);
      return start + escapeHtml(fields[key]);
    });
}
