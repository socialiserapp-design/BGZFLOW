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
function slug(value, name) {
  const result = text(value, name, 64);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(result)) throw new Error(`${name} must be short kebab-case`);
  return result;
}
const key = value => slug(value, 'key');
// A version or short commit. A full 40-character hash looks like a secret to the screen above, so it is refused.
function release(value) {
  const result = text(value, 'release', 64);
  if (!/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(result)) throw new Error('release must be a version or short commit (letters, digits, . _ + -)');
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
  // Incident fields (optional): the failing system, the underlying cause and the release it shipped in.
  if (input.system !== undefined) row.system = slug(input.system, 'system');
  if (input.cause !== undefined) row.cause = slug(input.cause, 'cause');
  if (input.release !== undefined) row.release = release(input.release);
  if (row.key === 'no-incident' && (row.system || row.cause || row.release)) throw new Error('no-incident cannot carry system, cause or release');
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
// A root is a path: screen each segment, so an ordinary long forward-slash path is not mistaken for a token.
function rootText(root) {
  if (typeof root !== 'string' || !root.trim() || root.length > 4096 || /[\x00-\x1f\x7f]/.test(root)) throw new Error('Invalid root');
  if (hasUrlCredentials(root)) throw new Error('Credential-shaped root refused; use a non-secret reference');
  for (const part of root.split(/[\\/]+/)) if (part.trim()) text(part, 'root', 4096);
  return root.trim();
}
// Write paths (add, review) resolve and read through the owned-path guard.
function rootsFor(roots) {
  return [...new Set(roots.map(root => fs.realpathSync(rootText(root))))].sort();
}
// Read paths (status, due, list, rework) never write, so they need no write permission and no owned-path check.
// Each failure names the check that failed and carries no path or stored value.
function readRoots(roots) {
  return [...new Set(roots.map(root => {
    if (typeof root !== 'string' || !root.trim() || root.length > 4096 || /[\x00-\x1f\x7f]/.test(root)) throw new Error('Invalid root');
    let real, stat;
    try { real = fs.realpathSync(root); } catch (error) {
      throw new Error(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 'Lessons root does not exist' : 'Lessons root cannot be read');
    }
    try { stat = fs.statSync(real); } catch { throw new Error('Lessons root cannot be read'); }
    if (!stat.isDirectory()) throw new Error('Lessons root is not a directory');
    return real;
  }))].sort();
}
function fileFor(root) { return path.join(root, '.bgzflow', 'lessons.jsonl'); }
const empty = () => ({ lessons: [], reviews: [], open: [], closedIds: new Set(), closed: 0, separator: '' });
function parse(bytes) {
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
  return { lessons, reviews, open: lessons.filter(l => !closed.has(l.id) && l.key !== 'no-incident'), closedIds: closed, closed: closed.size,
    separator: bytes.length > 0 && !bytes.endsWith('\n') ? '\n' : '' };
}
// Owned read, used by add and review: refuses linked storage.
function read(root) {
  const file = fileFor(root);
  // A missing log is empty, but linked storage or corrupt history is an error.
  let bytes;
  try {
    writablePath(file);
    bytes = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' || !fs.existsSync(path.join(root, '.bgzflow'))) return empty();
    throw new Error('Cannot read lessons storage safely');
  }
  return parse(bytes);
}
// Plain read, used by status, due, list and rework: reading needs no ownership check.
function readOnly(root) {
  let bytes;
  try { bytes = fs.readFileSync(fileFor(root), 'utf8'); } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return empty();
    throw new Error('Lessons file is unreadable');
  }
  return parse(bytes);
}
export function status(roots = [process.cwd()]) {
  const groups = new Map();
  let total = 0, closed = 0, open = 0, reviews = 0;
  for (const root of readRoots(roots)) {
    const state = readOnly(root);
    total += state.lessons.length; closed += state.closed; open += state.open.length; reviews += state.reviews.length;
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
export function due(roots = [process.cwd()]) {
  return { groups: status(roots).groups.filter(g => g.count >= 2 || g.high) };
}
// Every lesson with its review status: open, closed, or clean (a no-incident record, which never opens).
export function list(roots = [process.cwd()], options = {}) {
  let pattern = null;
  if (options.key !== undefined) {
    if (typeof options.key !== 'string' || !/^[a-z0-9*-]{1,64}$/.test(options.key)) throw new Error('key pattern may use lowercase letters, digits, - and * only');
    pattern = new RegExp('^' + options.key.split('*').join('.*') + '$');
  }
  const rows = [];
  for (const root of readRoots(roots)) {
    const state = readOnly(root);
    for (const row of state.lessons) {
      const rowStatus = row.key === 'no-incident' ? 'clean' : state.closedIds.has(row.id) ? 'closed' : 'open';
      if (options.open && rowStatus !== 'open') continue;
      if (pattern && !pattern.test(row.key)) continue;
      rows.push({ ...row, severity: row.severity ?? 'normal', status: rowStatus });
    }
  }
  rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { lessons: rows };
}
export const NOT_COMPUTED = {
  metrics: ['deploy frequency', 'change failure rate', 'time to restore'],
  reason: 'They need deploy and restore records, which this tool does not have.',
};
function sinceDate(value) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d(?:T[\d:.]+(?:Z|[+-]\d\d:\d\d)?)?$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('since must be an ISO date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)');
  }
  return new Date(value).toISOString();
}
// Repeat fixes: incidents that name the same system and cause more than once.
// An incident missing either field is counted but never grouped, so it cannot be mistaken for a repeat.
export function rework(roots = [process.cwd()], options = {}) {
  const since = sinceDate(options.since);
  const groups = new Map();
  let incidents = 0, classified = 0;
  for (const root of readRoots(roots)) {
    for (const row of readOnly(root).lessons) {
      if (row.key === 'no-incident' || (since && row.date < since)) continue;
      incidents++;
      if (!row.system || !row.cause) continue;
      classified++;
      const name = row.system + '/' + row.cause;
      if (!groups.has(name)) groups.set(name, { system: row.system, cause: row.cause, count: 0, dates: [], releases: new Set() });
      const group = groups.get(name);
      group.count++; group.dates.push(row.date);
      if (row.release) group.releases.add(row.release);
    }
  }
  const sorted = [...groups.values()].map(g => {
    g.dates.sort();
    return { system: g.system, cause: g.cause, count: g.count, repeat: g.count >= 2, first: g.dates[0], last: g.dates[g.dates.length - 1], dates: g.dates, releases: [...g.releases].sort() };
  }).sort((a, b) => b.count - a.count || (a.system + '/' + a.cause < b.system + '/' + b.cause ? -1 : 1));
  const repeatFixes = sorted.filter(g => g.repeat).reduce((sum, g) => sum + g.count - 1, 0);
  return {
    since, incidents, classified, unclassified: incidents - classified,
    causes: sorted.length, repeatCauses: sorted.filter(g => g.repeat).length, repeatFixes,
    // repeatFixes counts the later occurrences of a cause; the share is taken over the incidents that name a system and a cause.
    repeatShare: classified ? Math.round(repeatFixes / classified * 1000) / 1000 : null,
    groups: sorted, notComputed: NOT_COMPUTED,
  };
}
export function add(root, input) {
  const row = lesson({ ...input, id: input.id ?? randomUUID(), date: input.date ?? new Date().toISOString() });
  const resolved = rootsFor([root])[0], file = fileFor(resolved);
  return withOwnedLock(file, () => {
    const state = read(resolved);
    const existing = [...state.lessons, ...state.reviews].find(l => l.id === row.id);
    if (existing) throw new Error('id already exists; inspect status before retrying');
    appendOwned(file, (state.separator || '') + JSON.stringify(row) + '\n');
    queueRegression(resolved, row);
    return row;
  });
}
// A recorded failure queues a regression check (drafted later by `bgz jev regress`). Best-effort; never breaks `add`.
function queueRegression(root, row) {
  if (row.key === 'no-incident') return;
  try {
    const q = path.join(root, '.bgzflow', 'regression-queue.jsonl');
    appendOwned(q, JSON.stringify({ t: row.date, source: 'lessons', id: row.id.slice(0, 10), key: row.key, what: row.what, ...(row.evidence ? { evidence: row.evidence } : {}) }) + '\n');
  } catch { /* the queue is optional */ }
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
