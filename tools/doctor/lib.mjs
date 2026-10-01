// doctor: read-only health reports. Nothing here edits a setting, deletes a file or sends anything anywhere.
//
//   urls     credential-shaped URLs in git remotes and in text files (never prints the secret itself)
//   plugins  what every session pays for: the skill, agent, command and MCP descriptions of the enabled
//            plugins and desktop extensions, with an optional "was it used lately" count
//
// Environment rule: a report may name an environment variable but never carries its value, and a name that
// could hold a secret is not named at all. Paths under the home folder are shown as ~/...
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findAllUrlCredentials } from '../../hooks/lib/secrets.mjs';

export const CHARS_PER_TOKEN = 4;
export const TOKENS_PER_MCP_SERVER = 150; // nominal: tool names and server notes are only known once a server connects
export const SKILL_OVERHEAD_CHARS = 8;

export function tildify(p, home = os.homedir()) {
  if (typeof p !== 'string') return p;
  const norm = p.split(path.sep).join('/');
  const h = home.split(path.sep).join('/');
  if (norm === h) return '~';
  if (norm.startsWith(h + '/')) return '~' + norm.slice(h.length);
  return norm;
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch {
    return undefined;
  }
}

function readHead(file, bytes = 8192) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(bytes);
    const n = fs.readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n).toString('utf8');
  } catch {
    return '';
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // nothing to close
      }
    }
  }
}

function dirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.isSymbolicLink()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

function files(dir, re) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && re.test(e.name)).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------------------------
// urls

const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.env', '.sh', '.mjs', '.cjs', '.js', '.ts', '.py']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '.tmp', '.bgzflow', '.notes-map', '__pycache__', '.codegraph', 'snapshots']);
const MAX_TEXT_BYTES = 512 * 1024;
const MAX_TEXT_FILES = 5000;

function isTextConfig(name) {
  return TEXT_EXTENSIONS.has(path.extname(name).toLowerCase()) || /^\.env(?:\.|$)/i.test(name);
}

// A value from a git config line: quotes and backslash escapes are resolved, and an unquoted # or ; starts a comment.
function configValue(text) {
  let out = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length) {
      const next = text[++i];
      out += next === 'n' ? '\n' : next === 't' ? '\t' : next === 'b' ? '\b' : next;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (!quoted && (c === '#' || c === ';')) {
      break;
    } else {
      out += c;
    }
  }
  return out.trim();
}

// { name, kind: 'url' | 'pushurl', value } for each [remote "name"] section of one git config file's text.
export function parseGitConfigRemotes(text) {
  const remotes = [];
  let current = null;
  const key = (line) => {
    const m = /^(url|pushurl)\s*=(.*)$/i.exec(line);
    if (m && current !== null) remotes.push({ name: current, kind: m[1].toLowerCase(), value: configValue(m[2]) });
  };
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const header = /^\[\s*([A-Za-z0-9.-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\](.*)$/.exec(line);
    if (header) {
      current = header[1].toLowerCase() === 'remote' && header[2] !== undefined ? header[2].replace(/\\(.)/g, '$1') : null;
      if (header[3].trim()) key(header[3].trim());
    } else {
      key(line);
    }
  }
  return remotes;
}

// The repository that contains dir, found the way git finds it (walking up, stopping below any folder named in
// GIT_CEILING_DIRECTORIES). A .git file (worktree or submodule) points at the real folder.
function findGitDir(start, env) {
  const ceilings = String(env.GIT_CEILING_DIRECTORIES || '').split(path.delimiter).filter(Boolean).map((p) => path.resolve(p));
  const same = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
  let dir = path.resolve(start);
  for (;;) {
    const dotGit = path.join(dir, '.git');
    let stat;
    try {
      stat = fs.statSync(dotGit);
    } catch {
      stat = undefined;
    }
    if (stat && stat.isDirectory()) return { gitDir: dotGit, commonDir: dotGit };
    if (stat && stat.isFile()) {
      const pointer = /^gitdir:\s*(.+?)\s*$/m.exec(fs.readFileSync(dotGit, 'utf8'));
      if (pointer) {
        const gitDir = path.resolve(dir, pointer[1]);
        let commonDir = gitDir;
        try {
          const shared = fs.readFileSync(path.join(gitDir, 'commondir'), 'utf8').trim();
          if (shared) commonDir = path.resolve(gitDir, shared);
        } catch {
          // an ordinary git directory has no commondir file
        }
        return { gitDir, commonDir };
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir || ceilings.some((c) => same(c, parent))) return undefined;
    dir = parent;
  }
}

// The remotes of the repository at dir, read straight from its config file, which is what `git config --local`
// reads. No process is started, so a busy machine cannot make it time out and report a false "no remotes".
// { remotes, problem? }: problem is set when a repository was found but its config could not be read.
export function readGitRemotes(dir, env = process.env) {
  let repo;
  try {
    repo = findGitDir(dir, env);
  } catch (err) {
    return { remotes: [], problem: `git remotes could not be read (${(err && err.code) || 'error'})` };
  }
  if (!repo) return { remotes: [] };
  const remotes = [];
  let problem;
  // config.worktree exists only when extensions.worktreeConfig is on, so a missing file is normal here.
  for (const file of [path.join(repo.commonDir, 'config'), path.join(repo.gitDir, 'config.worktree')]) {
    try {
      remotes.push(...parseGitConfigRemotes(fs.readFileSync(file, 'utf8')));
    } catch (err) {
      if (!(err && err.code === 'ENOENT')) problem = `git remotes could not be read (${(err && err.code) || 'error'})`;
    }
  }
  return { remotes, ...(problem ? { problem } : {}) };
}

function* walkText(root) {
  const stack = [root];
  let count = 0;
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(full);
      } else if (e.isFile() && isTextConfig(e.name)) {
        if (++count > MAX_TEXT_FILES) return;
        yield full;
      }
    }
  }
}

// Credential-shaped URLs under dir: git remotes first, then text files. A finding never carries the secret.
// { ok, dir, remotes, scanned, skippedLarge, problems, findings: [{ where, line?, kind, host, param? }] }
// problems lists checks that could not run (an unreadable git config); ok reflects the findings only.
export function scanUrls(dir, { extraFiles = [], env = process.env } = {}) {
  const root = path.resolve(dir || process.cwd());
  const findings = [];
  const { remotes, problem } = readGitRemotes(root, env);
  const problems = problem ? [problem] : [];
  for (const r of remotes) {
    for (const f of findAllUrlCredentials(r.value)) {
      findings.push({ where: `git remote ${r.name} (${r.kind})`, kind: f.kind, host: f.host, ...(f.param ? { param: f.param } : {}) });
    }
  }
  let scanned = 0;
  let skippedLarge = 0;
  const targets = [...walkText(root), ...extraFiles.map((f) => path.resolve(f))];
  for (const file of targets) {
    let text;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile()) continue;
      if (stat.size > MAX_TEXT_BYTES) {
        skippedLarge++;
        continue;
      }
      const buf = fs.readFileSync(file);
      if (buf.subarray(0, 4096).includes(0)) continue;
      text = buf.toString('utf8');
    } catch {
      continue;
    }
    scanned++;
    if (!text.includes('://')) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('://')) continue;
      for (const f of findAllUrlCredentials(lines[i])) {
        findings.push({ where: path.relative(root, file).split(path.sep).join('/') || path.basename(file), line: i + 1, kind: f.kind, host: f.host, ...(f.param ? { param: f.param } : {}) });
      }
    }
  }
  return { ok: findings.length === 0, dir: tildify(root), remotes: remotes.length, scanned, skippedLarge, problems, findings };
}

export function renderUrls(result) {
  const out = [];
  for (const p of result.problems || []) out.push(`WARN ${p}`);
  for (const f of result.findings) {
    const where = f.line ? `${f.where}:${f.line}` : f.where;
    out.push(`FAIL ${where}  ${f.kind}${f.param ? ` in "${f.param}"` : ''} at ${f.host}  [redacted]`);
  }
  out.push(
    result.ok
      ? `PASS no credential-shaped URLs (${result.remotes} git remote${result.remotes === 1 ? '' : 's'}, ${result.scanned} text file${result.scanned === 1 ? '' : 's'} checked${result.skippedLarge ? `, ${result.skippedLarge} over 512 KB skipped` : ''})`
      : `FAIL ${result.findings.length} credential-shaped URL${result.findings.length === 1 ? '' : 's'}. A username alone is fine; a token or password is not. Move it to a credential helper or an environment reference, then rotate the secret.`,
  );
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------------
// plugins

// name and description from a SKILL.md, agent or command file: the block between the first two --- lines.
export function parseFrontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(String(text));
  if (!m) return {};
  const lines = m[1].split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    const block = /^[>|][+-]?$/.test(value);
    if (block) value = '';
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) value += (value ? ' ' : '') + lines[++i].trim();
    out[key] = value.replace(/^(["'])([\s\S]*)\1$/, '$2');
  }
  return out;
}

function entryChars(name, description) {
  return String(name || '').length + String(description || '').length + SKILL_OVERHEAD_CHARS;
}

// What one plugin folder puts into every session. Reads only the first 8 KB of each skill, agent and command file.
export function scanPluginDir(root) {
  const cost = { skills: 0, agents: 0, commands: 0, mcpServers: 0, contextHooks: [], chars: 0 };
  const addEntry = (kind, name, description) => {
    cost[kind]++;
    cost.chars += entryChars(name, description);
  };
  const skillsDir = path.join(root, 'skills');
  const scanSkills = (dir, depth) => {
    if (fs.existsSync(path.join(dir, 'SKILL.md'))) {
      const fm = parseFrontmatter(readHead(path.join(dir, 'SKILL.md')));
      addEntry('skills', fm.name || path.basename(dir), fm.description);
      return;
    }
    if (depth >= 2) return;
    for (const sub of dirs(dir)) scanSkills(path.join(dir, sub), depth + 1);
  };
  for (const sub of dirs(skillsDir)) scanSkills(path.join(skillsDir, sub), 1);
  for (const f of files(path.join(root, 'agents'), /\.md$/i)) {
    const fm = parseFrontmatter(readHead(path.join(root, 'agents', f)));
    addEntry('agents', fm.name || f.replace(/\.md$/i, ''), fm.description);
  }
  const commandsDir = path.join(root, 'commands');
  const scanCommands = (dir, depth) => {
    for (const f of files(dir, /\.md$/i)) {
      const fm = parseFrontmatter(readHead(path.join(dir, f)));
      addEntry('commands', fm.name || f.replace(/\.md$/i, ''), fm.description);
    }
    if (depth < 2) for (const sub of dirs(dir)) scanCommands(path.join(dir, sub), depth + 1);
  };
  scanCommands(commandsDir, 1);
  const servers = new Set();
  const mcp = readJson(path.join(root, '.mcp.json'));
  if (mcp && typeof mcp === 'object') {
    const map = mcp.mcpServers && typeof mcp.mcpServers === 'object' ? mcp.mcpServers : mcp;
    for (const [k, v] of Object.entries(map)) if (v && typeof v === 'object' && !Array.isArray(v)) servers.add(k);
  }
  const manifest = readJson(path.join(root, '.claude-plugin', 'plugin.json'));
  if (manifest && manifest.mcpServers && typeof manifest.mcpServers === 'object' && !Array.isArray(manifest.mcpServers)) {
    for (const k of Object.keys(manifest.mcpServers)) servers.add(k);
  }
  cost.mcpServers = servers.size;
  const hooks = readJson(path.join(root, 'hooks', 'hooks.json'));
  const events = hooks && typeof hooks === 'object' ? (hooks.hooks && typeof hooks.hooks === 'object' ? hooks.hooks : hooks) : {};
  for (const ev of ['SessionStart', 'UserPromptSubmit']) if (events[ev]) cost.contextHooks.push(ev);
  cost.tokens = Math.ceil(cost.chars / CHARS_PER_TOKEN) + cost.mcpServers * TOKENS_PER_MCP_SERVER;
  return cost;
}

export function claudeHome(env = process.env, override) {
  if (override) return path.resolve(override);
  return env.CLAUDE_CONFIG_DIR ? path.resolve(env.CLAUDE_CONFIG_DIR) : path.join(os.homedir(), '.claude');
}

// The desktop app's data folder, which holds "Claude Extensions" and "Claude Extensions Settings".
export function desktopDir(env = process.env, platform = process.platform, override) {
  if (override) return path.resolve(override);
  if (platform === 'win32') return env.APPDATA ? path.join(env.APPDATA, 'Claude') : undefined;
  if (platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'Claude');
}

// Every plugin a Claude Code session could load, with its on/off state.
//   installed plugins: on only when settings.json says true
//   synced plugins (shared from the web app): on unless settings.json says false
export function collectPlugins(home) {
  const settings = readJson(path.join(home, 'settings.json')) || {};
  const switches = settings.enabledPlugins && typeof settings.enabledPlugins === 'object' && !Array.isArray(settings.enabledPlugins) ? settings.enabledPlugins : {};
  const found = new Map();
  const installed = readJson(path.join(home, 'plugins', 'installed_plugins.json'));
  const table = installed && installed.plugins && typeof installed.plugins === 'object' ? installed.plugins : {};
  for (const [key, value] of Object.entries(table)) {
    const list = Array.isArray(value) ? value : [value];
    const entry = list.find((e) => e && typeof e.installPath === 'string');
    if (!entry) continue;
    found.set(key, { key, name: key.split('@')[0], source: 'installed', root: entry.installPath, version: entry.version });
  }
  const syncedRoot = path.join(home, 'plugins', 'synced');
  let duplicates = 0;
  for (const bucket of dirs(syncedRoot)) {
    if (bucket.startsWith('.')) continue;
    for (const name of dirs(path.join(syncedRoot, bucket))) {
      const key = `${name}@synced`;
      if (found.has(key)) {
        duplicates++;
        continue;
      }
      found.set(key, { key, name, source: 'synced', root: path.join(syncedRoot, bucket, name) });
    }
  }
  const list = [];
  for (const p of found.values()) {
    const explicit = switches[p.key];
    const enabled = explicit === true ? true : explicit === false ? false : p.source === 'synced';
    list.push({ ...p, enabled, explicit: typeof explicit === 'boolean' });
  }
  return { plugins: list.sort((a, b) => a.key.localeCompare(b.key)), duplicates, hasSettings: Object.keys(settings).length > 0 };
}

// Desktop extensions: each folder under "Claude Extensions" with a manifest.json; on unless its settings file says isEnabled false.
export function collectExtensions(dir) {
  if (!dir) return [];
  const list = [];
  for (const id of dirs(path.join(dir, 'Claude Extensions'))) {
    const manifest = readJson(path.join(dir, 'Claude Extensions', id, 'manifest.json'));
    if (!manifest || typeof manifest !== 'object') continue;
    const setting = readJson(path.join(dir, 'Claude Extensions Settings', `${id}.json`));
    const enabled = !(setting && setting.isEnabled === false);
    const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
    let chars = 0;
    for (const t of tools) chars += entryChars(t && t.name, t && t.description);
    list.push({
      id,
      name: String(manifest.display_name || manifest.name || id),
      enabled,
      tools: tools.length,
      tokens: Math.ceil(chars / CHARS_PER_TOKEN) + (manifest.server ? TOKENS_PER_MCP_SERVER : 0),
    });
  }
  return list;
}

// Count how often each plugin was used in recent chats. Reads only plugin names, keeps and prints nothing else,
// and stops at maxBytes. { counts: Map<name, n>, files, bytes, truncated }
export function scanUsage(home, { days = 30, maxBytes = 400 * 1024 * 1024, now = Date.now() } = {}) {
  const patterns = [
    /"skill"\s*:\s*"([A-Za-z0-9._-]+):/g,
    /"subagent_type"\s*:\s*"([A-Za-z0-9._-]+):/g,
    /<command-name>\/([A-Za-z0-9._-]+):/g,
    /mcp__plugin_([A-Za-z0-9-]+)_[A-Za-z0-9-]+__/g,
  ];
  const cutoff = now - days * 24 * 3600 * 1000;
  const candidates = [];
  const projects = path.join(home, 'projects');
  const stack = [{ dir: projects, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory() && depth < 3) stack.push({ dir: full, depth: depth + 1 });
      else if (e.isFile() && e.name.endsWith('.jsonl')) {
        try {
          const st = fs.statSync(full);
          if (st.mtimeMs >= cutoff) candidates.push({ full, size: st.size, mtime: st.mtimeMs });
        } catch {
          // skip
        }
      }
    }
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  const counts = new Map();
  let bytes = 0;
  let scannedFiles = 0;
  let truncated = false;
  const CHUNK = 4 * 1024 * 1024;
  const OVERLAP = 256;
  for (const c of candidates) {
    if (bytes + c.size > maxBytes) {
      truncated = true;
      continue;
    }
    let fd;
    try {
      fd = fs.openSync(c.full, 'r');
      const buf = Buffer.alloc(CHUNK);
      let pos = 0;
      let carry = '';
      while (pos < c.size) {
        const n = fs.readSync(fd, buf, 0, CHUNK, pos);
        if (n <= 0) break;
        pos += n;
        // The last OVERLAP characters are read again with the next chunk so a name split across two chunks is
        // still seen. A match is counted once: only when it ends inside the new data.
        const text = carry + buf.subarray(0, n).toString('latin1');
        for (const re of patterns) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(text)) !== null) {
            if (m.index + m[0].length > carry.length) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
          }
        }
        carry = text.slice(-OVERLAP);
      }
      bytes += c.size;
      scannedFiles++;
    } catch {
      // unreadable chat file: skip it
    } finally {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch {
          // nothing to close
        }
      }
    }
  }
  return { counts, files: scannedFiles, bytes, truncated, days };
}

// The full plugin-cost report. Options: home, desktop (folder), usage (bool), usageDays, budget (tokens).
export function pluginReport({ home, desktop, usage = false, usageDays = 30, budget, maxUsageBytes } = {}) {
  const h = claudeHome(process.env, home);
  const { plugins, duplicates, hasSettings } = collectPlugins(h);
  const used = usage ? scanUsage(h, { days: usageDays, ...(maxUsageBytes ? { maxBytes: maxUsageBytes } : {}) }) : undefined;
  const rows = plugins.map((p) => {
    const cost = p.enabled ? scanPluginDir(p.root) : undefined;
    const row = {
      key: p.key,
      source: p.source,
      enabled: p.enabled,
      ...(cost ? { skills: cost.skills, agents: cost.agents, commands: cost.commands, mcpServers: cost.mcpServers, contextHooks: cost.contextHooks, tokens: cost.tokens } : {}),
    };
    if (used) {
      row.uses = used.counts.get(p.name) || 0;
      row.unused = p.enabled && row.uses === 0;
    }
    return row;
  });
  const extensions = collectExtensions(desktopDir(process.env, process.platform, desktop));
  const enabled = rows.filter((r) => r.enabled);
  const pluginTokens = enabled.reduce((s, r) => s + (r.tokens || 0), 0);
  const extTokens = extensions.filter((e) => e.enabled).reduce((s, e) => s + e.tokens, 0);
  const total = pluginTokens + extTokens;
  return {
    home: tildify(h),
    hasSettings,
    counts: {
      installedOrSynced: rows.length,
      enabled: enabled.length,
      disabledOrIdle: rows.length - enabled.length,
      duplicates,
      extensions: extensions.length,
      extensionsEnabled: extensions.filter((e) => e.enabled).length,
    },
    alwaysOnTokens: { plugins: pluginTokens, extensions: extTokens, total },
    budget: budget || undefined,
    overBudget: budget ? total > budget : false,
    usage: used ? { days: used.days, files: used.files, megabytes: Math.round(used.bytes / 1048576), truncated: used.truncated } : undefined,
    plugins: rows,
    extensions,
    note: 'Estimate: about 4 characters per token, from skill, agent and command names and descriptions, plus a nominal amount per MCP server. Only the user settings file is read.',
  };
}

const pad = (v, n) => String(v).padEnd(n);
const num = (v) => String(v).padStart(7);

export function renderPlugins(r, { top = 15 } = {}) {
  const out = [];
  out.push(`Plugin cost report (${r.home})`);
  out.push(`  enabled plugins: ${r.counts.enabled} of ${r.counts.installedOrSynced} found (${r.counts.disabledOrIdle} off or installed but not enabled)`);
  out.push(`  always-on estimate: ~${r.alwaysOnTokens.total.toLocaleString('en-US')} tokens per session (plugins ~${r.alwaysOnTokens.plugins.toLocaleString('en-US')}, desktop extensions ~${r.alwaysOnTokens.extensions.toLocaleString('en-US')})`);
  const enabled = r.plugins.filter((p) => p.enabled).sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
  if (enabled.length) {
    out.push('');
    out.push(`  ${pad('plugin', 44)}${num('tokens')}${num('skills')}${num('agents')}${num('cmds')}${num('mcp')}${r.usage ? num('used') : ''}`);
    for (const p of enabled.slice(0, top)) {
      out.push(`  ${pad(p.key.length > 43 ? p.key.slice(0, 42) + '~' : p.key, 44)}${num(p.tokens || 0)}${num(p.skills || 0)}${num(p.agents || 0)}${num(p.commands || 0)}${num(p.mcpServers || 0)}${r.usage ? num(p.uses) : ''}${p.contextHooks && p.contextHooks.length ? `  hooks:${p.contextHooks.join('+')}` : ''}`);
    }
    if (enabled.length > top) out.push(`  ... ${enabled.length - top} more (use --top ${enabled.length} or --json)`);
  }
  const ext = r.extensions.filter((e) => e.enabled);
  if (ext.length) {
    out.push('');
    out.push(`  desktop extensions enabled: ${ext.length} (~${ext.reduce((s, e) => s + e.tokens, 0).toLocaleString('en-US')} tokens); tool names of these join every Code session`);
    for (const e of ext.sort((a, b) => b.tokens - a.tokens).slice(0, 8)) out.push(`    ${pad(e.name.slice(0, 42), 44)}${num(e.tokens)}${num(e.tools)} tools`);
  }
  if (r.usage) {
    const unused = r.plugins.filter((p) => p.unused);
    out.push('');
    out.push(`  usage: ${r.usage.files} chat file${r.usage.files === 1 ? '' : 's'} from the last ${r.usage.days} days (${r.usage.megabytes} MB)${r.usage.truncated ? ', stopped at the read limit' : ''}`);
    out.push(unused.length ? `  unused in that window (${unused.length}): ${unused.map((p) => p.key).join(', ')}` : '  every enabled plugin was used in that window');
    if (unused.length) out.push('  to switch one off, set "<name>": false in the enabledPlugins block of your user settings file (doctor never edits it)');
  } else {
    out.push('');
    out.push('  add --usage to see which enabled plugins were not used in the last 30 days (reads plugin names from recent chats, nothing else)');
  }
  if (r.counts.duplicates) out.push(`  note: ${r.counts.duplicates} synced plugin${r.counts.duplicates === 1 ? '' : 's'} appear${r.counts.duplicates === 1 ? 's' : ''} in more than one bucket; counted once`);
  if (r.budget) out.push(r.overBudget ? `FAIL always-on estimate is over the ${r.budget.toLocaleString('en-US')}-token budget` : `PASS always-on estimate is within the ${r.budget.toLocaleString('en-US')}-token budget`);
  return out.join('\n');
}
