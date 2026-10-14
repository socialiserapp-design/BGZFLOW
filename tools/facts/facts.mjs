#!/usr/bin/env node
// Project facts: short, durable notes a lead keeps per project and hands to workers inside briefs.
// Advice only: nothing ever blocks on a fact. Stored in <project>/.bgzflow/facts.json.
//   bgz facts for (--files <a,b,...> | --brief <file>) [--dir <project>] [--json]   facts whose paths match, plus project-wide facts
//   bgz facts add --text "<fact>" [--paths <glob,...>] [--source <ref>] [--dir <project>]
//   bgz facts accept --handback <file> [--source <ref>] [--dir <project>]            add the "Proposed facts" lines of a handback
//   bgz facts list [--dir <project>] [--json]
// A proposed-facts line is `- <glob,...> :: <fact>`, or `- <fact>` for a fact about the whole project.
// Exit codes: 0 ok (including no matches), 2 bad usage or an unreadable file (one line on stderr says why).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProjectDir } from '../../hooks/lib/project.mjs';

export class FactsError extends Error {}

export const SCHEMA_VERSION = 1;
const IGNORE_CASE = process.platform === 'win32' || process.platform === 'darwin';
const SHOWN_FILE = '.bgzflow/facts.json';

export const factsPath = (projectDir) => path.join(projectDir, '.bgzflow', 'facts.json');

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const last = (list) => (list && list.length ? list[list.length - 1] : undefined);
const unique = (list) => [...new Set(list)];

// ---- paths and globs -------------------------------------------------------------------------------------------

// Forward slashes only, no leading "./", no doubled slashes.
export function normalizePath(p) {
  let s = String(p ?? '').trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  while (s.startsWith('./')) s = s.slice(2);
  return s;
}

// A glob that ends in a slash names the folder.
export function normalizeGlob(glob) {
  const g = normalizePath(glob);
  return g.length > 1 && g.endsWith('/') ? g.slice(0, -1) : g;
}

// `*` and `?` stay inside one folder level, `**` crosses folders, and a trailing `/**` also matches the folder itself.
export function globToRegExp(glob, { ignoreCase = IGNORE_CASE } = {}) {
  const g = normalizeGlob(glob).replace(/^\/+/, '');
  let re = '';
  let i = 0;
  while (i < g.length) {
    const c = g[i];
    if (c === '*') {
      let j = i;
      while (g[j] === '*') j += 1;
      if (j - i === 1) re += '[^/]*';
      else if ((i === 0 || g[i - 1] === '/') && g[j] === '/') {
        re += '(?:.*/)?';
        j += 1;
      } else re += '.*';
      i = j;
    } else if (c === '/' && g.slice(i) === '/**') {
      re += '(?:/.*)?';
      break;
    } else {
      re += c === '?' ? '[^/]' : c.replace(/[.+^${}()|[\]\\/]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${re}$`, ignoreCase ? 'i' : '');
}

// True when the glob matches the file, or a folder the file sits in (so "src/auth" covers src/auth/login.ts).
// A glob with no slash is also tried against each name on the way, so "*.sql" finds db/old/1.sql.
export function matchesGlob(glob, file, { ignoreCase = IGNORE_CASE } = {}) {
  const g = normalizeGlob(glob);
  const f = normalizePath(file).replace(/^\/+|\/+$/g, '');
  if (!g || !f) return false;
  const re = globToRegExp(g, { ignoreCase });
  const byName = !g.includes('/');
  const parts = f.split('/');
  for (let n = parts.length; n > 0; n -= 1) {
    if (re.test(parts.slice(0, n).join('/'))) return true;
    if (byName && re.test(parts[n - 1])) return true;
  }
  return false;
}

// Facts with no paths are about the whole project and always apply.
export function factsForFiles(facts, files, { ignoreCase = IGNORE_CASE } = {}) {
  const list = files.map(normalizePath).filter(Boolean);
  return facts.filter((fact) => !fact.paths.length || fact.paths.some((g) => list.some((f) => matchesGlob(g, f, { ignoreCase }))));
}

// ---- file paths inside a brief ---------------------------------------------------------------------------------

const TOKEN_SPLIT = /[\s"'`<>()[\]{},;|]+/;
const HAS_EXTENSION = /\.[A-Za-z][A-Za-z0-9]{0,9}$/;
const NOT_PATHS = new Set(['e.g', 'i.e', 'and/or', 'yes/no', 'y/n', 'n/a', 'w/o']);

function pathFromToken(raw) {
  let t = raw;
  const bold = /^\*\*(.+)\*\*$/.exec(t);
  if (bold && !bold[1].startsWith('/') && !bold[1].endsWith('/')) t = bold[1];
  t = t.replace(/[.,:;!?]+$/, '').replace(/#.*$/, '').replace(/(?::\d+){1,2}(?:-\d+)?$/, '');
  if (!t || t.startsWith('-') || !/[A-Za-z]/.test(t)) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(t) || /^[A-Za-z]{2,}:(?![\\/])/.test(t)) return null; // URLs, node:fs, mailto:
  if (/^[^\s/@]+@[^\s/@]+\.[A-Za-z]{2,}$/.test(t)) return null; // email addresses
  if (NOT_PATHS.has(t.toLowerCase())) return null;
  if (!/[\\/]/.test(t) && !HAS_EXTENSION.test(t)) return null;
  return normalizePath(t).replace(/\/+$/, '') || null;
}

// Path-like tokens of a brief, in order, once each: anything with a slash or a file extension, backticked or not.
// A trailing :line or :line-line, a #anchor and closing punctuation are dropped; URLs and version numbers are not paths.
export function pathsFromBrief(text) {
  const found = [];
  for (const raw of String(text ?? '').split(TOKEN_SPLIT)) {
    const p = raw ? pathFromToken(raw) : null;
    if (p) found.push(p);
  }
  return unique(found);
}

// ---- proposed facts in a handback ------------------------------------------------------------------------------

const splitList = (s) => unique(String(s).split(',').map((x) => normalizePath(x.trim().replace(/^`+|`+$/g, ''))).filter(Boolean));

function parseFactLine(body) {
  const b = body.trim();
  if (/^(none|nothing|n\/a)\.?$/i.test(b)) return null;
  const m = /^(.*?)\s*::\s+(.+)$/.exec(b);
  if (m) {
    const paths = splitList(m[1]);
    if (paths.every((p) => !/\s/.test(p))) {
      const text = clean(m[2]);
      return text ? { text, paths } : null;
    }
  }
  const text = clean(b);
  return text ? { text, paths: [] } : null;
}

// Reads the bullets under a "Proposed facts" heading or label. The section ends at the next heading or at the first
// line that is not a bullet. "- none" is ignored.
export function parseProposedFacts(text) {
  const out = [];
  let inSection = false;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    if (/^\s*(?:#{1,6}\s*)?[*_]{0,2}\s*proposed facts\b/i.test(line)) {
      inSection = true;
      continue;
    }
    if (!inSection || !line.trim()) continue;
    const bullet = /^\s*[-*+]\s+(.*\S)\s*$/.exec(line);
    if (!bullet) {
      inSection = false;
      continue;
    }
    const fact = parseFactLine(bullet[1]);
    if (fact) out.push(fact);
  }
  return out;
}

// ---- the facts file --------------------------------------------------------------------------------------------

function readError(err) {
  return new FactsError(`cannot read ${SHOWN_FILE} (${err.code || err.message})`);
}

// A missing file means no facts. A damaged one is an error and is never overwritten.
export function readFacts(projectDir) {
  let text;
  try {
    text = fs.readFileSync(factsPath(projectDir), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { schema_version: SCHEMA_VERSION, facts: [] };
    throw readError(err);
  }
  let data;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch (err) {
    throw new FactsError(`${SHOWN_FILE} is not valid JSON (${err.message}); fix or restore it, this tool will not overwrite it`);
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.facts)) throw new FactsError(`${SHOWN_FILE} has no "facts" list; fix or restore it, this tool will not overwrite it`);
  if (data.schema_version !== undefined && data.schema_version !== SCHEMA_VERSION) throw new FactsError(`${SHOWN_FILE} has schema_version ${data.schema_version}; this tool reads version ${SCHEMA_VERSION}`);
  const facts = data.facts.map((f, i) => {
    if (!f || typeof f !== 'object' || typeof f.text !== 'string' || !f.text.trim()) throw new FactsError(`${SHOWN_FILE}: fact ${i + 1} has no text; fix or restore it, this tool will not overwrite it`);
    const paths = Array.isArray(f.paths) ? f.paths.filter((p) => typeof p === 'string').map(normalizePath).filter(Boolean) : [];
    return { id: typeof f.id === 'string' ? f.id : '', text: clean(f.text), paths, source: typeof f.source === 'string' ? f.source : '', added_at: typeof f.added_at === 'string' ? f.added_at : '' };
  });
  return { schema_version: SCHEMA_VERSION, facts };
}

// Written whole through a temporary file so a reader never sees half a file. The lead is the one writer.
export function writeFacts(projectDir, data) {
  const file = factsPath(projectDir);
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, `${JSON.stringify({ schema_version: SCHEMA_VERSION, facts: data.facts }, null, 2)}\n`);
    fs.renameSync(tmp, file);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw new FactsError(`cannot write ${SHOWN_FILE} (${err.code || err.message})`);
  }
}

const pathsKey = (paths) => [...paths].sort().join('\n');

function nextId(facts) {
  const top = facts.reduce((m, f) => Math.max(m, Number(/^F(\d+)$/.exec(f.id)?.[1] ?? 0)), 0);
  return `F${String(top + 1).padStart(3, '0')}`;
}

// Adds each item unless the same text and paths are already there. One read and one write for the whole batch.
export function addFacts(projectDir, items) {
  const data = readFacts(projectDir);
  const added = [];
  const existing = [];
  for (const item of items) {
    const text = clean(item.text);
    if (!text) throw new FactsError('a fact needs some text');
    const paths = Array.isArray(item.paths) ? splitList(item.paths.join(',')) : splitList(item.paths ?? '');
    const same = data.facts.find((f) => f.text === text && pathsKey(f.paths) === pathsKey(paths));
    if (same) {
      existing.push(same);
      continue;
    }
    const fact = { id: nextId(data.facts), text, paths, source: clean(item.source), added_at: new Date().toISOString() };
    data.facts.push(fact);
    added.push(fact);
  }
  if (added.length) writeFacts(projectDir, data);
  return { added, existing };
}

export const addFact = (projectDir, item) => addFacts(projectDir, [item]);

// ---- command line ----------------------------------------------------------------------------------------------

const USAGE = `usage:
  bgz facts for (--files <a,b,...> | --brief <file>) [--dir <project>] [--json]
  bgz facts add --text "<fact>" [--paths <glob,...>] [--source <ref>] [--dir <project>] [--json]
  bgz facts accept --handback <file> [--source <ref>] [--dir <project>] [--json]
  bgz facts list [--dir <project>] [--json]
Facts live in <project>/.bgzflow/facts.json. They are advice for briefs; nothing ever blocks on them.
A fact with no paths is about the whole project. Paths are globs: * ? ** (slashes and backslashes are the same).
A handback proposes facts under "Proposed facts" with lines like: - <glob,...> :: <fact>   or   - <fact>
A --brief file that looks like a secret (.env, .env.*, *.pem, *.key, id_rsa*, anything under .ssh) is refused, never read.
exit codes: 0 ok (including no matches), 2 bad usage, a refused secret file or an unreadable file`;

const VALUE_FLAGS = new Set(['files', 'brief', 'dir', 'text', 'paths', 'source', 'handback']);
const BOOL_FLAGS = new Set(['json', 'help']);

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h') flags.help = true;
    else if (!a.startsWith('--') || a === '--') positional.push(a);
    else {
      const eq = a.indexOf('=');
      const name = eq < 0 ? a.slice(2) : a.slice(2, eq);
      if (BOOL_FLAGS.has(name)) flags[name] = true;
      else if (!VALUE_FLAGS.has(name)) throw new FactsError(`unknown option --${name} (bgz facts --help)`);
      else if (eq >= 0) (flags[name] ||= []).push(a.slice(eq + 1));
      else if (i + 1 >= argv.length) throw new FactsError(`--${name} needs a value`);
      else (flags[name] ||= []).push(argv[(i += 1)]);
    }
  }
  return { positional, flags };
}

function resolveDir(flags, cwd, env) {
  const given = last(flags.dir);
  if (given === undefined) return findProjectDir({ cwd }, env);
  const dir = path.resolve(cwd, given);
  let ok = false;
  try {
    ok = fs.statSync(dir).isDirectory();
  } catch { /* reported below */ }
  if (!ok) throw new FactsError(`project folder not found: ${given}`);
  return dir;
}

function inProject(file, projectDir) {
  const n = normalizePath(file);
  if (path.isAbsolute(file) || /^[A-Za-z]:\//.test(n)) {
    const rel = path.relative(projectDir, path.resolve(file));
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return normalizePath(rel);
  }
  return n;
}

function readInput(file, what) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new FactsError(`cannot read ${what} ${file} (${err.code || err.message})`);
  }
}

// A brief is plain text a lead wrote. Obvious secret files (.env, .env.*, *.pem, *.key, id_rsa*, anything under .ssh) are never read as one.
export function looksLikeSecretFile(file) {
  const parts = normalizePath(path.resolve(String(file))).toLowerCase().split('/').filter(Boolean);
  const base = parts[parts.length - 1] || '';
  return base === '.env' || base.startsWith('.env.') || base.endsWith('.pem') || base.endsWith('.key') || base.startsWith('id_rsa') || parts.slice(0, -1).includes('.ssh');
}

export function formatFact(f, { meta = false } = {}) {
  const where = f.paths.length ? ` (applies to: ${f.paths.join(', ')})` : '';
  const extra = meta ? [f.added_at && `added ${f.added_at.slice(0, 10)}`, f.source && `source: ${f.source}`].filter(Boolean) : [];
  return `- ${f.text}${where} [${[f.id, ...extra].filter(Boolean).join(', ')}]`;
}

function forFiles(flags, dir, out) {
  if (!flags.files && !flags.brief) throw new FactsError('for needs --files <a,b,...> or --brief <file>');
  const files = (flags.files || []).flatMap((v) => v.split(',')).map((s) => s.trim()).filter(Boolean);
  if (flags.brief) {
    const brief = last(flags.brief);
    if (looksLikeSecretFile(brief)) throw new FactsError(`will not read ${brief} as a brief: it looks like a secret file`);
    files.push(...pathsFromBrief(readInput(brief, 'brief')));
  }
  const shown = unique(files.map((f) => inProject(f, dir)));
  const facts = factsForFiles(readFacts(dir).facts, shown);
  if (flags.json) out(JSON.stringify({ files: shown, facts }, null, 2));
  else if (facts.length) out(['Known facts (advice, not rules):', ...facts.map((f) => formatFact(f))].join('\n'));
  return 0;
}

function report(result, flags, out) {
  if (flags.json) return out(JSON.stringify(result, null, 2));
  for (const f of result.added) out(`Added ${f.id}: ${formatFact(f).slice(2)}`);
  for (const f of result.existing) out(`Already known ${f.id}: ${f.text}`);
  return undefined;
}

function add(flags, dir, out) {
  const text = last(flags.text);
  if (text === undefined || !clean(text)) throw new FactsError('add needs --text "<fact>"');
  report(addFact(dir, { text, paths: flags.paths ? flags.paths.join(',') : '', source: last(flags.source) }), flags, out);
  return 0;
}

function accept(flags, dir, out) {
  const file = last(flags.handback);
  if (file === undefined) throw new FactsError('accept needs --handback <file>');
  const proposed = parseProposedFacts(readInput(file, 'handback'));
  if (!proposed.length) {
    out(flags.json ? JSON.stringify({ added: [], existing: [] }, null, 2) : `No proposed facts found in ${file}.`);
    return 0;
  }
  const source = last(flags.source) ?? `handback ${inProject(file, dir)}`;
  const result = addFacts(dir, proposed.map((p) => ({ ...p, source })));
  report(result, flags, out);
  if (!flags.json) out(`${result.added.length} added, ${result.existing.length} already known.`);
  return 0;
}

function list(flags, dir, out) {
  const data = readFacts(dir);
  if (flags.json) out(JSON.stringify(data, null, 2));
  else if (!data.facts.length) out('No facts recorded.');
  else out([`Facts (${data.facts.length}):`, ...data.facts.map((f) => formatFact(f, { meta: true }))].join('\n'));
  return 0;
}

export function main(argv, { cwd = process.cwd(), env = process.env, out = (s) => process.stdout.write(`${s}\n`), err = (s) => process.stderr.write(`${s}\n`) } = {}) {
  try {
    const { positional, flags } = parseArgs(argv);
    const [command, ...rest] = positional;
    if (flags.help) {
      out(USAGE);
      return 0;
    }
    if (!command) {
      out(USAGE);
      return 2;
    }
    if (rest.length) throw new FactsError(`unexpected argument "${rest[0]}"`);
    const run = { for: forFiles, add, accept, list }[command];
    if (!run) throw new FactsError(`unknown command "${command}" (bgz facts --help)`);
    return run(flags, resolveDir(flags, cwd, env), out);
  } catch (e) {
    err(`facts: ${e && e.message ? e.message : e}`);
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
