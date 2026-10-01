// H5 state snapshot: keep a second copy of project state that git does not protect.
// Handover folders were not in git, so a lost or overwritten checkpoint had no other copy.
//
// Rule: when a CHECKPOINT*.md exists in the project root or in its handover folder, copy each state
// file of 1 MB or less that changed since the last snapshot AND is not safe in git (untracked,
// ignored, or with uncommitted changes) into <project>/.bgzflow/snapshots/<UTC timestamp>/.
// Keep the newest 20 snapshot folders. Nothing else is ever deleted.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { findAllUrlCredentials } from './secrets.mjs';
import { inside, isLinked, ownedPath } from './owned-path.mjs';

export const MAX_FILE_BYTES = 1024 * 1024;
export const KEEP_SNAPSHOTS = 20;
export const MAX_SNAPSHOT_BYTES = 50 * 1024 * 1024;
const MAX_FILES_PER_FOLDER = 200;
const MAX_DEPTH = 3;
const GIT_TIMEOUT_MS = 4000;
const SKIP_DIRS = new Set(['.git', 'node_modules', '.bgzflow']);
const STATE_FILE = /^(?:.*CHECKPOINT.*|ARCHIVE.*|HANDOFF.*|DECISIONS.*|OWNERS.*)\.md$/i;
const CHECKPOINT_FILE = /^.*CHECKPOINT.*\.md$/i;
const HANDOVER_DIR = /^(?:hand-?overs?|hand-?offs?)$/i;
const SNAPSHOT_DIR = /^\d{8}T\d{6}Z(?:-\d+)?$/;

function entries(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function hasCheckpoint(dir) {
  return entries(dir).some((e) => e.isFile() && CHECKPOINT_FILE.test(e.name));
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// Folders whose state needs a second copy: the project root, a handover folder, or a configured folder.
export function findStateFolders(projectDir, cfg = {}) {
  const folders = [];
  const rootHasCheckpoint = hasCheckpoint(projectDir);
  if (rootHasCheckpoint) folders.push({ dir: projectDir, label: '', mode: 'root' });
  const consider = (dir, label) => {
    if (!isDirectory(dir)) return;
    if (folders.some((f) => path.resolve(f.dir) === path.resolve(dir))) return;
    if (rootHasCheckpoint || hasCheckpoint(dir)) folders.push({ dir, label, mode: 'folder' });
  };
  for (const e of entries(projectDir)) {
    if (e.isDirectory() && HANDOVER_DIR.test(e.name)) consider(path.join(projectDir, e.name), e.name);
  }
  for (const raw of cfg.stateDirs || []) {
    const abs = path.isAbsolute(raw) ? raw : path.resolve(projectDir, raw);
    const rel = path.relative(projectDir, abs);
    const inside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
    const label = inside ? rel.split(path.sep).join('/') : `external-${path.basename(abs).replace(/[^A-Za-z0-9._-]/g, '_')}`;
    consider(abs, label);
  }
  return folders;
}

function walk(dir, depth, out) {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES_PER_FOLDER) return;
  for (const e of entries(dir)) {
    if (out.length >= MAX_FILES_PER_FOLDER) return;
    if (e.isSymbolicLink()) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(abs, depth + 1, out);
    } else if (e.isFile()) {
      out.push(abs);
    }
  }
}

// State files of one folder that are small enough to copy: [{ abs, rel (posix, from the folder), size }].
export function collectCandidates(folder) {
  let files = [];
  if (folder.mode === 'root') {
    for (const e of entries(folder.dir)) {
      if (e.isFile() && STATE_FILE.test(e.name)) files.push(path.join(folder.dir, e.name));
    }
    const rounds = path.join(folder.dir, '.bgzflow', 'rounds.json');
    if (fs.existsSync(rounds)) files.push(rounds);
  } else {
    walk(folder.dir, 0, files);
  }
  const out = [];
  for (const abs of files) {
    try {
      const size = fs.statSync(abs).size;
      if (size <= MAX_FILE_BYTES) out.push({ abs, rel: path.relative(folder.dir, abs).split(path.sep).join('/'), size });
    } catch {
      // vanished between listing and stat
    }
  }
  return out;
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const keyOf = (label, rel) => (label ? `${label}/${rel}` : rel);

function readManifest(snapRoot) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(snapRoot, 'manifest.json'), 'utf8'));
    if (parsed && typeof parsed === 'object' && parsed.files && typeof parsed.files === 'object') return parsed;
  } catch {
    // missing or corrupt: everything counts as changed
  }
  return { version: 1, files: {} };
}

function writeManifest(snapRoot, manifest) {
  fs.mkdirSync(snapRoot, { recursive: true });
  const tmp = path.join(snapRoot, `manifest.json.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  fs.renameSync(tmp, path.join(snapRoot, 'manifest.json'));
}

function defaultRunGit(dir, args) {
  return execFileSync('git', ['--literal-pathspecs', '-C', dir, ...args], {
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 4 * 1024 * 1024,
  });
}

// Which of `rels` (posix paths from `dir`) are NOT safely in git: untracked, ignored, or with
// uncommitted changes. Any git failure (no repo, no git) counts as "not in git".
export function filesNotSafeInGit(dir, rels, runGit = defaultRunGit) {
  const unsafe = new Set();
  try {
    const spec = rels.length > 50 ? ['.'] : rels;
    const out = runGit(dir, ['status', '--porcelain', '-z', '--ignored', '--untracked-files=all', '--', ...spec]);
    const parts = out.split('\0').filter(Boolean);
    const dirty = new Set();
    for (let i = 0; i < parts.length; i++) {
      const status = parts[i].slice(0, 2);
      dirty.add(parts[i].slice(3));
      if (status[0] === 'R' || status[0] === 'C') i++; // a rename lists the old name next
    }
    // git prints paths relative to the repository root; compare by the trailing path segments.
    for (const rel of rels) {
      for (const d of dirty) {
        if (d === rel || d.endsWith('/' + rel) || rel.endsWith('/' + d)) {
          unsafe.add(rel);
          break;
        }
      }
    }
    // A pathspec of "." lists whole folders; fall back to treating every file as unsafe if anything is dirty.
    if (spec.length === 1 && spec[0] === '.' && dirty.size) for (const rel of rels) unsafe.add(rel);
  } catch {
    for (const rel of rels) unsafe.add(rel);
  }
  return unsafe;
}

export const stampOf = (now) => now.toISOString().replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '');

function removeOwnedSnapshot(snapRoot, target) {
  const root = fs.realpathSync(snapRoot), parent = fs.realpathSync(path.dirname(target));
  if (parent !== root && !inside(root, parent)) return false;
  const stat = fs.lstatSync(target);
  if (isLinked(stat)) { fs.unlinkSync(target); return true; }
  if (!inside(root, fs.realpathSync(target))) return false;
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(target)) removeOwnedSnapshot(snapRoot, path.join(target, child));
    fs.rmdirSync(target);
  } else fs.unlinkSync(target);
  return true;
}

function pruneSnapshots(snapRoot, keep, projectDir) {
  if (!ownedPath(projectDir, '.bgzflow/snapshots', { directory: true })) return [];
  const dirs = entries(snapRoot)
    .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && SNAPSHOT_DIR.test(e.name))
    .map((e) => e.name)
    .sort();
  const removed = [];
  const rootResolved = path.resolve(snapRoot);
  while (dirs.length > keep) {
    const name = dirs.shift();
    const target = path.resolve(snapRoot, name);
    if (!target.startsWith(rootResolved + path.sep) || !SNAPSHOT_DIR.test(path.basename(target))) continue;
    try {
      if (!ownedPath(projectDir, '.bgzflow/snapshots', { directory: true })) break;
      if (removeOwnedSnapshot(snapRoot, target)) removed.push(name);
    } catch {
      // leave it for the next run
    }
  }
  return removed;
}

// Returns { status: 'no-state' | 'unsafe-path' | 'unchanged' | 'safe-in-git' | 'snapshot', ... }.
export function takeSnapshot({ projectDir, cfg = {}, now = new Date(), runGit = defaultRunGit, log = () => {} }) {
  const folders = findStateFolders(projectDir, cfg);
  if (!folders.length) return { status: 'no-state' };
  const snapRoot = ownedPath(projectDir, '.bgzflow/snapshots', { directory: true, create: true });
  if (!snapRoot) { log('warning: snapshot folder is linked or outside the owned project; snapshot refused'); return { status: 'unsafe-path' }; }
  const manifest = readManifest(snapRoot);

  const pending = [];
  for (const folder of folders) {
    const changed = [];
    for (const c of collectCandidates(folder)) {
      let hash;
      try {
        hash = sha256(c.abs);
      } catch {
        continue;
      }
      const key = keyOf(folder.label, c.rel);
      if (manifest.files[key] !== hash) changed.push({ ...c, key, hash });
    }
    if (changed.length) pending.push({ folder, changed });
  }
  if (!pending.length) return { status: 'unchanged' };

  const toCopy = [];
  const settled = [];
  for (const { folder, changed } of pending) {
    const unsafe = filesNotSafeInGit(folder.dir, changed.map((c) => c.rel), runGit);
    for (const c of changed) (unsafe.has(c.rel) ? toCopy : settled).push(c);
  }

  let snapshotName;
  let copied = 0;
  let bytes = 0;
  let truncated = false;
  if (toCopy.length) {
    let name = stampOf(now);
    let dir = path.join(snapRoot, name);
    for (let n = 2; fs.existsSync(dir); n++) {
      name = `${stampOf(now)}-${n}`;
      dir = path.join(snapRoot, name);
    }
    fs.mkdirSync(dir, { recursive: true });
    snapshotName = name;
    for (const c of toCopy) {
      if (bytes + c.size > MAX_SNAPSHOT_BYTES) {
        truncated = true;
        continue;
      }
      const dest = path.join(dir, ...c.key.split('/'));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(c.abs, dest);
      bytes += c.size;
      copied++;
      manifest.files[c.key] = c.hash;
      if (/\.(?:md|txt|json)$/i.test(c.abs)) {
        try {
          const found = findAllUrlCredentials(fs.readFileSync(c.abs, 'utf8'));
          if (found.length) log(`warning: ${c.key} holds a credential-shaped URL (${found[0].kind} at ${found[0].host}); use a credential helper instead`);
        } catch {
          // unreadable as text: skip the scan
        }
      }
    }
  }
  for (const c of settled) manifest.files[c.key] = c.hash;
  writeManifest(snapRoot, manifest);
  const removed = toCopy.length ? pruneSnapshots(snapRoot, KEEP_SNAPSHOTS, projectDir) : [];
  if (!copied) return { status: 'safe-in-git', settled: settled.length };
  return { status: 'snapshot', name: snapshotName, copied, bytes, truncated, removed, settled: settled.length };
}
