import fs from 'node:fs';
import path from 'node:path';
import { guard, sha256, equal, state, writeManifest, writeOwned, hostVolatile } from './cutover-lib.mjs';

export function shallow(file) {
  guard(file);
  if (!fs.existsSync(file)) return { exists: false };
  const stat = fs.lstatSync(file);
  if (stat.isDirectory()) return { exists: true, type: 'directory' };
  if (!stat.isFile()) throw new Error('Special path refused');
  const bytes = fs.readFileSync(file);
  return { exists: true, type: 'file', bytes: bytes.length, sha256: sha256(bytes) };
}
export function targetFor(m, file) {
  const absolute = path.resolve(file);
  if (hostVolatile(absolute)) throw new Error('Refusing host-owned volatile path: ' + file);
  const target = m.ancestorDirectories?.find(t => t.path === absolute) || m.targets.find(t => {
    const rel = path.relative(t.path, absolute);
    return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
  });
  if (!target) throw new Error('Write is outside the prepared targets: ' + file);
  return target;
}
function baseline(m, file) {
  const t = targetFor(m, file), rel = path.relative(t.path, file).replaceAll('\\', '/');
  const entry = rel ? t.before.entries?.[rel] : t.before;
  if (!entry || entry.exists === false) return { exists: false };
  return entry.type === 'directory' ? { exists: true, type: 'directory' }
    : { exists: true, type: 'file', bytes: entry.bytes, sha256: entry.sha256 };
}
function init(m) { m.schemaVersion = 3; m.changes ||= []; m.foreign ||= []; }
function expected(m, file) {
  init(m);
  return m.changes.find(c => c.path === path.resolve(file))?.after || baseline(m, path.resolve(file));
}
function journal(m, file, after) {
  const absolute = path.resolve(file), before = expected(m, absolute);
  if (!equal(shallow(absolute), before)) throw new Error('Target changed before owned write: ' + absolute);
  const previous = m.changes.find(c => c.path === absolute);
  if (previous) previous.after = after;
  else m.changes.push({ path: absolute, before, after, operation: m.operation || 'script-write' });
  writeManifest(m); // Durable intent before every mutation, including mkdir.
}
function mkdir(m, directory) {
  guard(directory);
  if (fs.existsSync(directory)) {
    if (!fs.lstatSync(directory).isDirectory()) throw new Error('Directory target occupied');
    return;
  }
  mkdir(m, path.dirname(directory));
  journal(m, directory, { exists: true, type: 'directory' });
  fs.mkdirSync(directory);
}
export function journalWrite(m, file, bytes) {
  guard(file);
  if (!equal(shallow(file), expected(m, file))) throw new Error('Target changed before owned write: ' + file);
  mkdir(m, path.dirname(file));
  journal(m, file, { exists: true, type: 'file', bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) });
  writeOwned(file, bytes);
}
export function journalCopy(m, source, destination) {
  if (hostVolatile(source)) return; // Native cache markers belong to their host, never the installer.
  guard(source); guard(destination);
  const stat = fs.lstatSync(source);
  if (stat.isDirectory()) {
    mkdir(m, destination);
    for (const name of fs.readdirSync(source).sort()) journalCopy(m, path.join(source, name), path.join(destination, name));
  } else if (stat.isFile()) {
    if (fs.existsSync(destination)) throw new Error('Copy destination occupied: ' + destination);
    journalWrite(m, destination, fs.readFileSync(source));
  } else throw new Error('Unsupported source');
}
function flatten(root, value) {
  const values = new Map([[path.resolve(root), value.exists ? value.type === 'directory'
    ? { exists: true, type: 'directory' } : value : { exists: false }]]);
  for (const [name, entry] of Object.entries(value.entries || {})) values.set(path.resolve(root, name), { exists: true, ...entry });
  return values;
}
export function sealChanges(m) {
  init(m);
  for (const c of m.changes) {
    targetFor(m, c.path);
    if (!equal(shallow(c.path), c.after)) throw new Error('Owned path changed before seal: ' + c.path);
  }
  const foreign = [];
  for (const t of m.targets) {
    const before = flatten(t.path, t.before), after = flatten(t.path, state(t.path, { ignoreVolatile: m.volatilePolicyVersion === 1 }));
    for (const file of new Set([...before.keys(), ...after.keys()])) {
      if (m.changes.some(c => c.path === file)) continue;
      const old = before.get(file) || { exists: false }, current = after.get(file) || { exists: false };
      if (!equal(old, current)) foreign.push({ path: file, before: old, after: current, disposition: 'foreign-preserve' });
    }
  }
  m.foreign = foreign;
}
