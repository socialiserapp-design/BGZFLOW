import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { parse } from '../../vendor/yaml.mjs';
import { parse as parseToml } from '../../vendor/toml.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const inside = (root, file) => { const rel = path.relative(root, file); return !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel); };
const ignored = /^(?:node_modules|\.git|dist|backups|archive|archived|skills-overlay|skills-staging)$|\.retired-|^forged-/i;

/** Read a skill only within its admitted root; nested symlinks cannot escape it. */
function scan(root, origin, entries, watch) {
  watch(root);
  let realRoot;
  try { realRoot = fs.realpathSync.native(root); } catch { return; }
  const visited = new Set();
  function walk(dir, depth) {
    if (depth > 8) return;
    watch(dir);
    let real;
    try { real = fs.realpathSync.native(dir); } catch { return; }
    if (!inside(realRoot, real) || visited.has(real)) return;
    visited.add(real);
    const file = path.join(real, 'SKILL.md');
    watch(file);
    try {
      const canonical = fs.realpathSync.native(file);
      if (!inside(realRoot, canonical) || fs.statSync(canonical).size > 1024 * 1024) return;
      const body = fs.readFileSync(canonical, 'utf8');
      const match = /^(?:\uFEFF)?---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/.exec(body);
      if (!match) return;
      const meta = parse(match[1], { maxAliasCount: 20 });
      if (typeof meta?.name !== 'string' || typeof meta?.description !== 'string' || !meta.description.trim()) return;
      entries.push({ id: `skill-${digest(canonical).slice(0, 24)}`, name: meta.name.trim(), description: meta.description.trim(), path: canonical, origin, version: digest(body), manualOnly: meta['disable-model-invocation'] === true, requiredTools: meta['allowed-tools'] || meta['required-tools'] || [], permissions: meta.permissions || [] });
      return;
    } catch { /* A directory without a skill may contain skill directories. */ }
    let children;
    try { children = fs.readdirSync(real, { withFileTypes: true }); } catch { return; }
    for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
      if ((child.isDirectory() || child.isSymbolicLink()) && !ignored.test(child.name) && !child.name.startsWith('.')) walk(path.join(real, child.name), depth + 1);
    }
  }
  walk(realRoot, 0);
}

function codexProjectDirectories(cwd, markers, watch) {
  const directories = [];
  for (let directory = path.resolve(cwd);; directory = path.dirname(directory)) {
    directories.push(directory);
    for (const marker of markers) {
      const file = path.join(directory, marker);
      watch(file);
      try {
        if (marker === '.git' && fs.statSync(file).isDirectory()) {
          const head = path.join(file, 'HEAD'); watch(head); fs.statSync(head);
        } else fs.statSync(file);
        return directories.reverse();
      } catch { /* Keep looking for the nearest valid project marker. */ }
    }
    if (path.dirname(directory) === directory) break;
  }
  return [path.resolve(cwd)];
}

function pluginSettings(home, host, projectRoot, watch) {
  const filename = host === '.codex' ? 'config.toml' : 'settings.json';
  const read = file => {
    watch(file);
    try {
      const text = fs.readFileSync(file, 'utf8');
      return host === '.codex' ? parseToml(text) : JSON.parse(text);
    } catch { return {}; }
  };
  const userFile = path.join(home, host, filename), userSettings = read(userFile);
  const files = [userFile];
  if (projectRoot) {
    const configuredMarkers = userSettings.project_root_markers;
    const markers = Array.isArray(configuredMarkers) && configuredMarkers.every(m => typeof m === 'string') ? configuredMarkers : ['.git'];
    const directories = host === '.codex' ? codexProjectDirectories(projectRoot, markers, watch) : [projectRoot];
    files.push(...directories.map(directory => path.join(directory, host, filename)));
    if (host === '.claude') files.push(path.join(projectRoot, host, 'settings.local.json'));
  }
  const enabled = new Map();
  for (const file of new Set(files)) {
    try {
      const settings = file === userFile ? userSettings : read(file);
      for (const [name, value] of Object.entries(host === '.codex' ? settings.plugins || {} : settings.enabledPlugins || {})) {
        const state = host === '.codex' ? value?.enabled : value;
        if (typeof state === 'boolean') enabled.set(name, state);
      }
    } catch { /* An unreadable layer cannot erase another layer's explicit settings. */ }
  }
  return enabled;
}

function inProjectScope(record, projectRoot) {
  if (!['project', 'local'].includes(record.scope)) return true;
  if (typeof record.projectPath !== 'string' || !projectRoot) return false;
  const canonical = file => { try { return fs.realpathSync.native(file); } catch { return path.resolve(file); } };
  return inside(canonical(record.projectPath), canonical(projectRoot));
}

function pluginRoots(home, host, watch, projectRoot) {
  const base = path.join(home, host, 'plugins');
  const registryPath = path.join(base, 'installed_plugins.json');
  watch(registryPath);
  const enabled = pluginSettings(home, host, projectRoot, watch);
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    return Object.entries(registry.plugins || {}).filter(([name]) => enabled.get(name) !== false).flatMap(([name, records]) => (Array.isArray(records) ? records : [records]).filter((r) => typeof r?.installPath === 'string' && r.enabled !== false && inProjectScope(r, projectRoot) && (host !== '.claude' || enabled.get(name) === true || r.enabled === true)).map((r) => ({ path: path.join(r.installPath, 'skills'), origin: `${host}:${name}` })));
  } catch { /* Hosts without a registry expose versioned cache trees instead. */ }
  const result = [];
  const cacheRoot = path.join(base, 'cache');
  function add(directory, skills) {
    const parts = path.relative(cacheRoot, directory).split(path.sep);
    const name = parts.length === 2 ? `${parts[1]}@${parts[0]}` : null;
    if (name && enabled.get(name) === false) return;
    // Claude installation and activation are separate. A cache alone is not an
    // enabled plugin. Codex also has host-managed entries absent from config;
    // preserve their cached methods unless explicitly disabled, without claiming
    // their tools are enabled. Explicit library roots remain independent of both.
    if (host === '.claude' && (!name || enabled.get(name) !== true)) return;
    result.push({ path: skills, origin: `${host}:${name || path.basename(directory)}` });
  }
  function walk(dir, depth) {
    if (depth > 5) return;
    watch(dir);
    let dirs;
    try { dirs = fs.readdirSync(dir, { withFileTypes: true }).filter((x) => x.isDirectory()); } catch { return; }
    const versions = dirs.filter((x) => /^v?\d+\.\d+(?:\.\d+)?(?:[-+].*)?$/.test(x.name));
    if (versions.length) {
      const latest = versions.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))[0];
      add(dir, path.join(dir, latest.name, 'skills'));
      return;
    }
    if (dirs.some((x) => x.name === 'skills')) { add(dir, path.join(dir, 'skills')); return; }
    for (const d of dirs) if (!ignored.test(d.name) && !d.name.startsWith('.')) walk(path.join(dir, d.name), depth + 1);
  }
  walk(cacheRoot, 0);
  return result;
}

/** Catalogue metadata stays local; no model call or state file is created. Explicit roots replace discovery. */
function stamp(file) {
  try { const info = fs.statSync(file); return [fs.realpathSync.native(file), info.mtimeMs, info.size, info.isDirectory()]; } catch { return null; }
}

export function discoverCatalog({ roots, home = os.homedir(), projectRoot, pluginRoot, cacheFile } = {}) {
  const cacheKey = digest(JSON.stringify({ schema: 6, roots, home, projectRoot, pluginRoot }));
  if (cacheFile) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached.key === cacheKey && Array.isArray(cached.entries) && Array.isArray(cached.watched) && cached.watched.every(([file, before]) => JSON.stringify(stamp(file)) === JSON.stringify(before))) return cached.entries;
    } catch { /* A stale, absent or interrupted cache is rebuilt. */ }
  }
  const watched = new Map();
  const watch = (file) => { if (!watched.has(file)) watched.set(file, stamp(file)); };
  const sources = roots ? roots.map((r) => typeof r === 'string' ? { path: r, origin: 'configured' } : r) : [
    ...(projectRoot ? ['.agents', '.claude', '.codex', '.cursor'].map((host) => ({ path: path.join(projectRoot, host, 'skills'), origin: 'project' })) : []),
    ...(pluginRoot ? [{ path: path.join(pluginRoot, 'skills'), origin: 'bgzflow' }] : []),
    ...['.agents', '.codex', '.claude', '.gemini', '.grok', '.cursor', '.gemini/config', '.config/opencode'].map((host) => ({ path: path.join(home, host, 'skills'), origin: host })),
    ...pluginRoots(home, '.codex', watch, projectRoot), ...pluginRoots(home, '.claude', watch, projectRoot),
    { path: path.join(home, '.gemini', 'config', 'plugins'), origin: '.gemini' },
    { path: path.join(home, '.grok', 'installed-plugins'), origin: '.grok' },
  ];
  const entries = [];
  for (const source of sources) if (source?.path) scan(source.path, source.origin || 'configured', entries, watch);
  const currentPackPresent = entries.some((e) => e.origin === 'bgzflow');
  // Real-file identity deduplicates junctions; distinct same-name user skills remain distinct.
  // Preserve the current pack's identity if generic host discovery finds its
  // exact path again. Otherwise shadow filtering would discard our own skills.
  const canonicalEntries = new Map();
  for (const entry of entries) {
    if (!canonicalEntries.has(entry.path) || entry.origin === 'bgzflow') canonicalEntries.set(entry.path, entry);
  }
  const seenContent = new Set();
  const result = [...canonicalEntries.values()].filter((entry) => {
    const normalizedPath = entry.path.replace(/\\/g, '/');
    const sameOwner = /^(?:\.claude|\.codex):bgzflow(?:@[^/]*)?$/i.test(entry.origin)
      || /\/(?:plugins\/(?:cache\/[^/]+\/)?|installed-plugins\/)bgzflow(?:\/|$)/i.test(normalizedPath);
    // An old pack can contain retired names absent from the current pack. Exclude the
    // entire same-owner installation, not just duplicate names. Independent user or
    // third-party skills remain eligible regardless of their name.
    if (currentPackPresent && entry.origin !== 'bgzflow' && sameOwner) return false;
    const key = `${entry.name}\0${entry.version}`;
    if (seenContent.has(key)) return false;
    seenContent.add(key); return true;
  }).sort((a, b) => a.id.localeCompare(b.id));
  if (cacheFile) {
    const tmp = `${cacheFile}.${process.pid}.${Date.now()}.tmp`;
    try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(tmp, JSON.stringify({ key: cacheKey, entries: result, watched: [...watched] })); fs.renameSync(tmp, cacheFile); }
    catch { try { fs.unlinkSync(tmp); } catch { /* Cache failure never blocks routing. */ } }
  }
  return result;
}

export function readSkill(entry) {
  const canonical = fs.realpathSync.native(entry.path);
  if (canonical !== entry.path) throw new Error('Skill path changed since selection');
  if (fs.statSync(canonical).size > 1024 * 1024) throw new Error('Skill exceeds catalogue size limit');
  const body = fs.readFileSync(canonical, 'utf8');
  if (digest(body) !== entry.version) throw new Error('Skill changed since selection; refresh the catalogue');
  return { id: entry.id, name: entry.name, path: entry.path, body };
}
