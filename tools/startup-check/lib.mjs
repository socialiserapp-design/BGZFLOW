// startup-check core: measure a project's compulsory start-up chain and check its checkpoint.
//
// The chain starts at AGENTS.md and CLAUDE.md in the project folder and follows every file they mark
// as required reading:
//   1. Claude-style imports:            @path/to/file.md
//   2. links and `paths` under a heading such as "Required reading", "Required start-up reads",
//      "Start-up reads", "Read first", "Compulsory reading" (until the next heading of the same or higher level)
//   3. a line that begins "Required reading:", "Must read:" or "Read first:" (links and `paths` on that line)
// A pointer that does not resolve, or a compulsory file over the big-read cap, fails the check.
//
// Ported from the company start-up validator: the @import extraction and the word count (any run of
// non-blank characters). Manifest pinning, cutover leads and company paths were left out.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../../hooks/lib/config.mjs';
import { findAllUrlCredentials } from '../../hooks/lib/secrets.mjs';
import { lintAvSafe } from './av-safe.mjs';

export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT_FILES = ['AGENTS.md', 'CLAUDE.md'];
const MAX_DEPTH = 6;
const MAX_FILES = 60;
const PLUGIN_PREFIXES = /^(?:skills|templates|docs|overlay-template)[\\/]/i;
const TEXT_LIKE = /\.(?:md|markdown|txt|json|jsonl|ya?ml|toml|csv|log|mjs|js|ts|py|sh)$/i;

export const wordCount = (text) => (String(text).match(/\S+/g) || []).length;

// ---------------------------------------------------------------------------------------------
// Pointer extraction
// ---------------------------------------------------------------------------------------------

// Claude-style @imports outside code fences, block quotes, indented code and inline code/quotes.
export function claudeImports(text) {
  let fence;
  const imports = [];
  for (let line of text.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (fence || /^(?:\s*>| {4}|\t)/.test(line)) continue;
    // Branch and revision notation such as "main @1a2b3c4" is provenance, not a file read.
    line = line.replace(/(`+).*?\1\s+@[a-f\d]{7,40}\b/gi, ' ');
    line = line.replace(/\bgit\s+worktree\b\**\s+detached\s+@[a-f\d]{7,40}\b/gi, ' ');
    line = line.replace(/\b(?:origin|branch)\s+[\w.-]+\/[\w./-]+\s+@[a-f\d]{7,40}(?=[:\s,;)]|$)/gi, ' ');
    line = line.replace(/(`+).*?\1/g, ' ').replace(/(^|[\s(])(["']).*?\2/g, '$1 ');
    const whole = line.match(/^\s*@([^\s"'`][^\r\n]*?)\s*$/);
    if (whole) imports.push(whole[1]);
    else for (const match of line.matchAll(/(?:^|[\s(])@([^\s"'`<>),;]+)/g)) imports.push(match[1]);
  }
  return [...new Set(imports)];
}

const looksLikePath = (s) => /[\\/]/.test(s) || /^~/.test(s) || /^[A-Za-z]:/.test(s) || /\.[A-Za-z][A-Za-z0-9]{0,7}$/.test(s);

function cleanPointer(raw) {
  let ref = String(raw || '').trim().replace(/^<|>$/g, '');
  if (!ref) return undefined;
  if (/^(?:https?|mailto|ftp|file):/i.test(ref)) return undefined;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(ref)) return undefined;
  ref = ref.replace(/\s+["'].*$/, '').replace(/[#?][^\\/]*$/, '');
  ref = ref.replace(/:\d+(?:-\d+)?$/, '');
  ref = ref.replace(/[.,;!?)]+$/, '');
  if (!ref || ref.startsWith('#')) return undefined;
  if (/[*<>|"]/.test(ref) || /\$\{?\w+\}?/.test(ref)) return undefined; // globs, placeholders, variables
  return looksLikePath(ref) ? ref : undefined;
}

function pointersInText(text) {
  const out = [];
  const add = (raw) => {
    const ref = cleanPointer(raw);
    if (ref && !out.includes(ref)) out.push(ref);
  };
  for (const m of text.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^)\n]+)\)/g)) add(m[1]);
  const withoutLinks = text.replace(/!?\[[^\]\n]*\]\((<[^>]+>|[^)\n]+)\)/g, ' ');
  for (const m of withoutLinks.matchAll(/`([^`\n]+)`/g)) add(m[1]);
  return out;
}

const REQUIRED_HEADING = /\b(?:required|compulsory|mandatory)\b|\bstart-?up\s+reads?\b|\bread\s+first\b|\bmust[-\s]read\b/i;
const REQUIRED_LINE =
  /^\s*(?:[-*+]\s+)?(?:\*\*)?(?:required(?:\s+(?:start-?up\s+)?(?:reading|reads?))?|compulsory\s+(?:reading|reads?)|must\s+read|read\s+first)(?:\*\*)?\s*[:–—-]\s*(.+)$/i;

// Files a document marks as compulsory: [{ ref, via }].
export function requiredPointers(text) {
  const found = [];
  const add = (ref, via) => {
    if (ref && !found.some((f) => f.ref === ref)) found.push({ ref, via });
  };
  for (const imp of claudeImports(text)) {
    const ref = cleanPointer(imp);
    if (ref) add(ref, 'import');
  }
  let fence;
  let regionLevel; // heading level of the open "required reading" section
  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      if (regionLevel !== undefined && level <= regionLevel) regionLevel = undefined;
      if (regionLevel === undefined && REQUIRED_HEADING.test(heading[2])) regionLevel = level;
      continue;
    }
    if (regionLevel !== undefined) for (const ref of pointersInText(line)) add(ref, 'required section');
    const req = line.match(REQUIRED_LINE);
    if (req) for (const ref of pointersInText(req[1])) add(ref, 'required line');
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------------------------

function expandHome(p) {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function overlayDir(env = process.env) {
  return env.BGZFLOW_OVERLAY || path.join(os.homedir(), '.bgzflow', 'overlay');
}

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

// Order: the file holding the pointer, the project folder, the plugin's own folders (skills/, templates/,
// docs/, overlay-template/), the private overlay. A project that is the plugin itself also accepts a bare
// template name (CHECKPOINT.md resolves to templates/CHECKPOINT.md).
export function resolvePointer(ref, { fromDir, projectDir, env = process.env }) {
  const expanded = expandHome(ref);
  if (path.isAbsolute(expanded)) return isFile(expanded) ? path.normalize(expanded) : undefined;
  const tries = [path.resolve(fromDir, expanded), path.resolve(projectDir, expanded)];
  if (PLUGIN_PREFIXES.test(expanded)) tries.push(path.resolve(PLUGIN_ROOT, expanded));
  tries.push(path.resolve(overlayDir(env), expanded));
  if (path.resolve(projectDir) === PLUGIN_ROOT) tries.push(path.resolve(PLUGIN_ROOT, 'templates', expanded));
  return tries.find(isFile);
}

// ---------------------------------------------------------------------------------------------
// Chain
// ---------------------------------------------------------------------------------------------

const keyOf = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
const relTo = (base, p) => {
  const rel = path.relative(base, p);
  return (rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : p).split(path.sep).join('/');
};

export function collectChain(projectDir, cfg, env = process.env) {
  const files = [];
  const failures = [];
  const warnings = [];
  const seen = new Set();
  const roots = ROOT_FILES.map((name) => path.join(projectDir, name)).filter(isFile);
  if (!roots.length) warnings.push({ code: 'no-root', message: `no AGENTS.md or CLAUDE.md in ${projectDir}` });

  const visit = (abs, via, from, depth) => {
    const key = keyOf(abs);
    if (seen.has(key)) return;
    if (files.length >= MAX_FILES) {
      warnings.push({ code: 'chain-truncated', message: `chain stopped at ${MAX_FILES} files` });
      return;
    }
    seen.add(key);
    let buf;
    try {
      buf = fs.readFileSync(abs);
    } catch (err) {
      failures.push({ code: 'unreadable', file: abs, message: `${relTo(projectDir, abs)} cannot be read: ${err.message}` });
      return;
    }
    const binary = buf.subarray(0, 4096).includes(0);
    const text = binary ? '' : buf.toString('utf8');
    const rel = relTo(projectDir, abs);
    const entry = { path: rel, abs, bytes: buf.length, words: binary ? 0 : wordCount(text), via, from };
    files.push(entry);
    if (binary) warnings.push({ code: 'binary', file: rel, message: `${rel} is not text; it is not counted` });
    if (buf.length > cfg.bigReadKb * 1024) {
      failures.push({
        code: 'big-file',
        file: rel,
        message: `${rel} is ${Math.round(buf.length / 1024)} KB, over the ${cfg.bigReadKb} KB cap for a compulsory file; make it a pointer to a map or a line range`,
      });
    }
    for (const found of findAllUrlCredentials(text)) {
      failures.push({
        code: 'secret',
        file: rel,
        message: `${rel} holds a credential-shaped URL (${found.kind} at ${found.host}${found.param ? `, parameter ${found.param}` : ''}); use a credential helper and keep secrets out of URLs`,
      });
    }
    if (binary || depth >= MAX_DEPTH) return;
    for (const pointer of requiredPointers(text)) {
      const target = resolvePointer(pointer.ref, { fromDir: path.dirname(abs), projectDir, env });
      if (!target) {
        failures.push({
          code: 'pointer',
          file: rel,
          message: `${rel} requires ${pointer.ref} (${pointer.via}), which does not resolve to a file`,
        });
        continue;
      }
      if (!TEXT_LIKE.test(target)) warnings.push({ code: 'unusual-type', file: relTo(projectDir, target), message: `${relTo(projectDir, target)} is a compulsory read of an unusual type` });
      visit(target, `${pointer.via} in ${rel}`, rel, depth + 1);
    }
  };
  for (const root of roots) visit(root, 'root', undefined, 0);
  return { files, failures, warnings, words: files.reduce((n, f) => n + f.words, 0) };
}

// ---------------------------------------------------------------------------------------------
// Checkpoint: size cap and roles
// ---------------------------------------------------------------------------------------------

const PLACEHOLDER_CELL = /^(?:|-+|—|–|n\/?a|none|tbd|\?+|<[^>]*>|\{\{.*\}\})$/i;

export function normRole(cell) {
  return String(cell)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_`~]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tableCells(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return undefined;
  const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  return cells;
}

const isSeparatorRow = (cells) => cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '');

// Splits the checkpoint into { owners: Set of roles from the OWNERS block, referenced: [{ role, where }] }.
export function checkpointRoles(text) {
  const lines = text.split(/\r?\n/);
  const owners = new Set();
  const referenced = [];
  let hasOwnersBlock = false;
  let ownersLevel; // level of the open OWNERS heading
  let fence;
  let table; // { headers: string[], roleColumns: number[], inOwners: boolean, row: number }
  const addRef = (value, where) => {
    for (const piece of String(value).split(/[,;+/]|\band\b/i)) {
      const role = normRole(piece);
      if (!PLACEHOLDER_CELL.test(role)) referenced.push({ role, where });
    }
  };
  for (const line of lines) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      if (ownersLevel !== undefined && level <= ownersLevel) ownersLevel = undefined;
      if (ownersLevel === undefined && /^owners?\b/i.test(heading[2].replace(/[*_`]/g, ''))) {
        ownersLevel = level;
        hasOwnersBlock = true;
      }
      table = undefined;
      continue;
    }
    const cells = tableCells(line);
    if (cells) {
      if (!table) {
        const roleColumns = [];
        cells.forEach((c, i) => {
          if (/^(?:owners?|roles?|assignees?)$/i.test(c.replace(/[*_`]/g, '').trim())) roleColumns.push(i);
        });
        table = { headers: cells, roleColumns, inOwners: ownersLevel !== undefined, row: 0 };
        continue;
      }
      if (isSeparatorRow(cells)) continue;
      table.row++;
      if (table.inOwners) {
        const role = normRole(cells[0] || '');
        if (!PLACEHOLDER_CELL.test(role)) owners.add(role);
      } else {
        for (const col of table.roleColumns) if (cells[col] !== undefined) addRef(cells[col], `table column ${table.headers[col]}`);
      }
      continue;
    }
    table = undefined;
    if (ownersLevel !== undefined) {
      const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
      if (item) {
        const head = item[1].replace(/^\*\*(.*?)\*\*/, '$1').split(/\s*(?::|—|–| - )\s*/)[0];
        const role = normRole(head);
        if (!PLACEHOLDER_CELL.test(role)) owners.add(role);
      }
      continue;
    }
    const inline = line.match(/^\s*(?:[-*+]\s+)?\**(?:owner|role)\**\s*[:=]\s*(.+)$/i);
    if (inline) addRef(inline[1], 'owner line');
  }
  return { owners: [...owners], referenced, hasOwnersBlock };
}

export const isKnownRole = (role, owners) =>
  owners.some((o) => o === role || role.startsWith(o + ' ') || o.startsWith(role + ' '));

function checkpointFiles(projectDir) {
  try {
    return fs
      .readdirSync(projectDir, { withFileTypes: true })
      .filter((e) => e.isFile() && /^.*CHECKPOINT.*\.md$/i.test(e.name))
      .map((e) => path.join(projectDir, e.name))
      .sort();
  } catch {
    return [];
  }
}

export function checkCheckpoints(projectDir, cfg) {
  const failures = [];
  const warnings = [];
  const info = [];
  for (const file of checkpointFiles(projectDir)) {
    const name = path.basename(file);
    let text;
    let bytes;
    try {
      const buf = fs.readFileSync(file);
      bytes = buf.length;
      text = buf.toString('utf8');
    } catch {
      continue;
    }
    info.push({ path: name, bytes, words: wordCount(text) });
    if (bytes > cfg.checkpointKb * 1024) {
      failures.push({
        code: 'checkpoint-size',
        file: name,
        message: `${name} is ${(bytes / 1024).toFixed(1)} KB, over its ${cfg.checkpointKb} KB cap; keep one page (CURRENT RULES, owners, state, next action) and move history to ARCHIVE.md`,
      });
    }
    const { owners, referenced, hasOwnersBlock } = checkpointRoles(text);
    const missing = [...new Set(referenced.filter((r) => !isKnownRole(r.role, owners)).map((r) => r.role))];
    if (missing.length) {
      failures.push({
        code: 'unknown-role',
        file: name,
        message: hasOwnersBlock
          ? `${name} names ${missing.map((m) => `"${m}"`).join(', ')}, which ${missing.length === 1 ? 'is' : 'are'} not in its OWNERS block; add the role there or use a defined one`
          : `${name} names ${missing.map((m) => `"${m}"`).join(', ')} but has no OWNERS block`,
      });
    } else if (!hasOwnersBlock) {
      warnings.push({ code: 'no-owners', file: name, message: `${name} has no OWNERS block (one lead, one integration writer)` });
    }
  }
  for (const file of (() => {
    try {
      return fs.readdirSync(projectDir).filter((n) => /^HANDOFF.*\.md$/i.test(n));
    } catch {
      return [];
    }
  })()) {
    const bytes = fs.statSync(path.join(projectDir, file)).size;
    if (bytes > cfg.handoffKb * 1024) {
      warnings.push({ code: 'handoff-size', file, message: `${file} is ${(bytes / 1024).toFixed(1)} KB, over the ${cfg.handoffKb} KB handoff cap` });
    }
  }
  return { failures, warnings, info };
}

// ---------------------------------------------------------------------------------------------
// Whole check
// ---------------------------------------------------------------------------------------------

export function avSafeFailures(dir) {
  return lintAvSafe(dir).findings.map((f) => ({
    code: 'av-safe',
    file: f.file,
    message: `${f.file}${f.line ? `:${f.line}` : ''} [${f.rule}] ${f.why}${f.text ? ` -> ${f.text}` : ''}`,
  }));
}

export function checkStartup(projectDir, { env = process.env, budgetOverride } = {}) {
  const dir = path.resolve(projectDir);
  const cfg = loadConfig(dir, env);
  if (budgetOverride) cfg.startupWords = budgetOverride;
  const chain = collectChain(dir, cfg, env);
  const checkpoints = checkCheckpoints(dir, cfg);
  const failures = [...chain.failures];
  if (chain.words > cfg.startupWords) {
    failures.unshift({
      code: 'words',
      message: `compulsory start-up chain is ${chain.words} words, over the ${cfg.startupWords} word budget (BGZFLOW_STARTUP_WORDS); trim it or turn full reads into pointers`,
    });
  }
  failures.push(...checkpoints.failures);
  // When the project is the plugin itself, its shipped files must also pass the av-safe lint.
  if (dir === PLUGIN_ROOT) failures.push(...avSafeFailures(dir));
  const warnings = [...chain.warnings, ...checkpoints.warnings, ...cfg.warnings.map((message) => ({ code: 'config', message }))];
  return {
    ok: failures.length === 0,
    projectDir: dir,
    budget: cfg.startupWords,
    words: chain.words,
    files: chain.files.map(({ abs, ...rest }) => rest),
    checkpoints: checkpoints.info,
    failures,
    warnings,
  };
}
