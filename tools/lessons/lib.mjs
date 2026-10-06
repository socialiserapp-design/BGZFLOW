import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { appendOwned, writablePath, withOwnedLock } from '../../hooks/lib/owned-path.mjs';
import { hasUrlCredentials } from '../../hooks/lib/secrets.mjs';

// Reject credential-shaped input before persistence; never echo the rejected value.
function text(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
  const decoded = (() => { try { return decodeURIComponent(value); } catch { return value; } })();
  // Share URL credential policy with the hooks; retain non-URL assignment/key guards.
  if (hasUrlCredentials(decoded) || /(?:token|secret|password|passwd|api[_-]?key|authorization|credential|signature|sig)\\?["']?\s*[=:]\s*\S+|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY|\b(?:sk-|(?:sk|rk|pk)_(?:live|test)_|xai-|gh[pousr]_|github_pat_|xox[baprs]-|AKIA|ASIA)[A-Za-z0-9_-]{8,}|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i.test(decoded) ||
      [...decoded.matchAll(/[A-Za-z0-9_+/=]{32,}/g)].some(([part]) => /[A-Z\d_+=]/.test(part))) {
    throw new Error(`Credential-shaped ${name} refused; use a non-secret reference`);
  }
  return value.trim();
}
function key(value) {
  const result = text(value, 'key', 64);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(result)) throw new Error('key must be short kebab-case');
  return result;
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(value)) throw new Error('Invalid id');
  text(value, 'id', 80);
  return value;
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error('date must be a valid ISO UTC timestamp (YYYY-MM-DDTHH:mm:ss.sssZ)');
  }
  return value;
}
function lesson(input) {
  const row = { id: id(input.id), date: date(input.date), project: text(input.project, 'project', 100),
    stage: text(input.stage, 'stage', 64), what: text(input.what, 'what'), key: key(input.key) };
  if (input.evidence !== undefined) row.evidence = text(input.evidence, 'evidence', 1000);
  if (input.severity !== undefined) {
    if (!['normal', 'high'].includes(input.severity)) throw new Error('severity must be normal or high');
    row.severity = input.severity;
  }
  if (row.what.toLowerCase() === 'nothing' && (row.key !== 'no-incident' || row.severity === 'high')) {
    throw new Error('nothing uses key no-incident and normal severity');
  }
  if (row.key === 'no-incident' && row.what.toLowerCase() !== 'nothing') throw new Error('no-incident requires what nothing');
  return row;
}
function reviewRecord(input) {
  const row = { type: 'review', id: id(input.id), date: date(input.date), key: key(input.key), outcome: input.outcome };
  if (!['promoted', 'dismissed'].includes(row.outcome)) throw new Error('outcome must be promoted or dismissed');
  if (input.to !== undefined) row.to = text(input.to, 'to', 1000);
  if (input.reason !== undefined) row.reason = text(input.reason, 'reason');
  if (row.outcome === 'promoted' && !row.to) throw new Error('promoted requires --to');
  if (row.outcome === 'dismissed' && !row.reason) throw new Error('dismissed requires --reason');
  if (!Array.isArray(input.lessons) || !input.lessons.length) throw new Error('review requires lesson IDs');
  row.lessons = input.lessons.map(id);
  return row;
}
function rootsFor(roots) {
  return [...new Set(roots.map(root => fs.realpathSync(text(root, 'root', 4096))))].sort();
}
function fileFor(root) { return path.join(root, '.bgzflow', 'lessons.jsonl'); }
function read(root) {
  const file = fileFor(root);
  // A missing log is empty, but linked storage or corrupt history is an error.
  let bytes;
  try {
    writablePath(file);
    bytes = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' || !fs.existsSync(path.join(root, '.bgzflow'))) return { lessons: [], reviews: [], open: [] };
    throw new Error('Cannot read lessons storage safely');
  }
  const lessons = [], reviews = [], ids = new Set(), closed = new Set();
  for (const [index, line] of bytes.split('\n').entries()) {
    if (!line.trim()) continue;
    try {
      const input = JSON.parse(line);
      const row = input.type === 'review' ? reviewRecord(input) : lesson(input);
      if (input.type && input.type !== 'review' || ids.has(row.id)) throw new Error('invalid history');
      ids.add(row.id);
      if (row.type === 'review') {
        for (const target of row.lessons) {
          if (!lessons.some(l => l.id === target && l.key === row.key)) throw new Error('invalid closure');
          closed.add(target);
        }
        reviews.push(row);
      } else lessons.push(row);
    } catch {
      const error = new Error(`Invalid lessons record at line ${index + 1}; preserve and repair the log`);
      error.lineNumber = index + 1;
      throw error;
    }
  }
  return { lessons, reviews, open: lessons.filter(l => !closed.has(l.id) && l.key !== 'no-incident'), closed: closed.size,
    separator: bytes.length > 0 && !bytes.endsWith('\n') ? '\n' : '' };
}
export function status(roots = [process.cwd()]) {
  const groups = new Map();
  let total = 0, closed = 0, open = 0, reviews = 0;
  for (const root of rootsFor(roots)) {
    const state = read(root);
    total += state.lessons.length; closed += state.closed || 0; open += state.open.length; reviews += state.reviews.length;
    for (const row of state.open) {
      if (!groups.has(row.key)) groups.set(row.key, { key: row.key, count: 0, high: false, lessons: [] });
      const group = groups.get(row.key);
      group.count++; group.high ||= row.severity === 'high';
      group.lessons.push({ ...row, root });
    }
  }
  const sorted = [...groups.values()].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  return { total, open, closed, reviews, due: sorted.filter(g => g.count >= 2 || g.high).length, groups: sorted };
}
export function due(roots) {
  return { groups: status(roots).groups.filter(g => g.count >= 2 || g.high) };
}
export function add(root, input) {
  const row = lesson({ ...input, id: input.id ?? randomUUID(), date: input.date ?? new Date().toISOString() });
  const resolved = rootsFor([root])[0], file = fileFor(resolved);
  return withOwnedLock(file, () => {
    const state = read(resolved);
    const existing = [...state.lessons, ...state.reviews].find(l => l.id === row.id);
    if (existing) throw new Error('id already exists; inspect status before retrying');
    appendOwned(file, (state.separator || '') + JSON.stringify(row) + '\n');
    return row;
  });
}
export function review(roots, input) {
  const draft = reviewRecord({ ...input, id: randomUUID(), date: new Date().toISOString(), lessons: ['pending'] });
  const resolved = rootsFor(roots);
  // Validate every root before appending. A partially interrupted multi-root review can be retried.
  const pending = resolved.map(root => ({ root, ids: read(root).open.filter(l => l.key === draft.key).map(l => l.id) }));
  let closed = 0;
  for (const entry of pending.filter(p => p.ids.length)) {
    const file = fileFor(entry.root);
    withOwnedLock(file, () => {
      const state = read(entry.root);
      const open = new Set(state.open.map(l => l.id));
      const lessons = entry.ids.filter(id => open.has(id));
      if (!lessons.length) return;
      appendOwned(file, (state.separator || '') + JSON.stringify({ ...draft, id: randomUUID(), lessons }) + '\n');
      closed += lessons.length;
    });
  }
  return { key: draft.key, outcome: draft.outcome, closed };
}
