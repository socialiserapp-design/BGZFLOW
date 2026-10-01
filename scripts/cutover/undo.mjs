import fs from 'node:fs';
import path from 'node:path';
import { backup, readManifest, writeManifest, verifyBackup, equal, sha256, guard, writeOwned, inside, cacheVersion, cacheVersionInUse, volatileInventory } from './cutover-lib.mjs';
import { shallow, targetFor } from './owned-changes.mjs';

const apply = process.argv.includes('--apply');
if (!apply && !process.argv.includes('--dry-run')) throw new Error('Explicit mode required');
const m = readManifest();
if (m.phase === 'applying') throw new Error('In-flight or uncertain update: reconcile the recorded operation first');
if (m.schemaVersion !== 3 || !Array.isArray(m.changes)) throw new Error('UNDO requires an APPLY ownership manifest');
verifyBackup(m);
const retainedCacheVersions = new Set(m.undoRetainedCacheVersions || []);
function retainVersion(file) {
  const version = cacheVersion(file);
  if (!version) return false;
  if (retainedCacheVersions.has(version) || cacheVersionInUse(version)) {
    retainedCacheVersions.add(version); return true;
  }
  return false;
}
// Preflight all affected paths. A foreign sibling is allowed; a changed owned file is refused.
for (const c of m.changes) {
  targetFor(m, c.path); guard(c.path);
  const retained = retainVersion(c.path), wanted = m.phase === 'restored' && !retained ? c.before : c.after;
  if (!equal(shallow(c.path), wanted)
    && !(m.phase === 'restored' && !c.before.exists && shallow(c.path).type === 'directory')) {
    throw new Error('Owned target changed; refusing UNDO: ' + c.path);
  }
}
const retainedDirectories = [];
if (apply && m.phase !== 'restored') {
  m.volatileAtUndoStart = volatileInventory(m);
  // Keep only owned cache bytes until UNDO completes. If a host marks a version
  // after its first removal, replace our own removals and retain the complete version.
  const cacheBytes = new Map(), undoneCacheFiles = new Map();
  for (const c of m.changes) {
    if (c.after.type !== 'file' || !cacheVersion(c.path) || retainVersion(c.path)) continue;
    guard(c.path);
    if (!equal(shallow(c.path), c.after)) throw new Error('Owned cache changed during UNDO: ' + c.path);
    const bytes = fs.readFileSync(c.path);
    if (bytes.length !== c.after.bytes || sha256(bytes) !== c.after.sha256) throw new Error('Owned cache changed while saving UNDO bytes: ' + c.path);
    cacheBytes.set(c.path, bytes);
  }
  function preserveNewlyMarkedVersions() {
    for (const [file, c] of undoneCacheFiles) {
      if (!retainVersion(file)) continue;
      const current = shallow(file);
      if (!equal(current, c.after)) {
        if (!equal(current, c.before)) throw new Error('Owned cache changed after removal: ' + file);
        targetFor(m, file); guard(file); writeOwned(file, cacheBytes.get(file));
        if (!equal(shallow(file), c.after)) throw new Error('Active cache preservation failed: ' + file);
      }
      undoneCacheFiles.delete(file);
    }
  }
  for (const c of [...m.changes].sort((a, b) => b.path.length - a.path.length)) {
    if (c.after.type === 'directory') continue;
    if (retainVersion(c.path)) continue;
    if (!equal(shallow(c.path), c.after)) throw new Error('Owned target changed during UNDO: ' + c.path);
    if (retainVersion(c.path)) continue; // A host marker can appear after preflight.
    if (c.before.exists) {
      const t = targetFor(m, c.path), source = path.join(t.backup, path.relative(t.path, c.path));
      inside(backup, source); guard(source); const bytes = fs.readFileSync(source);
      if (!retainVersion(c.path)) {
        writeOwned(c.path, bytes);
        if (cacheBytes.has(c.path)) undoneCacheFiles.set(c.path, c);
      }
    } else if (fs.existsSync(c.path)) {
      guard(c.path);
      if (!retainVersion(c.path)) {
        fs.unlinkSync(c.path);
        if (cacheBytes.has(c.path)) undoneCacheFiles.set(c.path, c);
      }
    }
    preserveNewlyMarkedVersions();
  }
  for (const c of m.changes.filter(c => c.after.type === 'directory').sort((a, b) => b.path.length - a.path.length)) {
    preserveNewlyMarkedVersions();
    if (retainVersion(c.path)) { retainedDirectories.push(c.path); continue; }
    if (!c.before.exists && fs.existsSync(c.path)) {
      guard(c.path);
      if (fs.readdirSync(c.path).length === 0) {
        try { fs.rmdirSync(c.path); }
        catch (e) {
          if (e.code !== 'ENOTEMPTY' || !retainVersion(c.path)) throw e;
          retainedDirectories.push(c.path);
        }
      }
      else retainedDirectories.push(c.path);
    }
  }
  preserveNewlyMarkedVersions();
  for (const c of m.changes.filter(c => c.after.type !== 'directory')) {
    const wanted = retainVersion(c.path) ? c.after : c.before;
    if (!equal(shallow(c.path), wanted)) throw new Error('Restoration proof failed: ' + c.path);
  }
  m.undoRetainedCacheVersions = [...retainedCacheVersions].sort();
  m.phase = 'restored'; m.restoredAt = new Date().toISOString(); writeManifest(m);
}
const result = { ok: true, mode: apply ? 'apply' : 'dry-run', phase: m.phase,
  verifiedTargets: m.targets.length, manifestPaths: m.changes.length,
  foreignPreserved: m.foreign.length, retainedDirectories, retainedCacheVersions: [...retainedCacheVersions].sort(),
  guard: 'Host volatile entries untouched; active cache versions retained; only journalled paths restored' };
writeOwned(path.join(backup, apply ? 'undo-restored.json' : 'undo-dry-run.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
