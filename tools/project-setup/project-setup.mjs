#!/usr/bin/env node
// Finds a project's build, test and lint commands from the files in its folder and saves them in
// <project>/.bgzflow/project.json. It asks nothing, never runs a project command and never touches CLAUDE.md or AGENTS.md.
//   node tools/project-setup/project-setup.mjs [<project-dir>] [--json] [--dry]
// Without a folder it uses the current project (nearest folder with .bgzflow or .git). Re-running refreshes the detected
// commands and keeps everything under "manual"; a manual command wins when the file is read (readProjectCommands).
// It also saves a "system" (repos, worktrees, services, declared deployments; see tools/map/discover.mjs) for `bgz map`, keeping
// system.owner, system.integration_branch, system.skip (folders the scan leaves out) and system.manual across runs. A folder with a
// system but no commands is still saved.
// Exit codes: 0 saved, dry run or nothing found; 1 the existing project.json is unreadable or cannot be written; 2 bad usage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProjectDir } from '../../hooks/lib/project.mjs';
import { discover, isSystemFound } from '../map/discover.mjs';

export const SCHEMA_VERSION = 1;
const KINDS = ['build', 'test', 'lint'];
const MAX_READ = 2 * 1024 * 1024;
const MAX_SCAN_FILE = 1024 * 1024; // a Makefile or requirements file bigger than this is not searched for commands
const MAX_SCAN_LINE = 10000; // a line longer than this is skipped, so one huge line cannot hang a pattern
const REL_FILE = '.bgzflow/project.json';
const USAGE = 'usage: project-setup [<project-dir>] [--json] [--dry]';

export const projectFile = (dir) => path.join(dir, '.bgzflow', 'project.json');

const isFile = (dir, name) => {
  try { return fs.statSync(path.join(dir, name)).isFile(); } catch { return false; }
};
const isDir = (p) => {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
};

// The text of a small file, or null when it is missing, a folder, unreadable or very large.
function read(dir, name, limit = MAX_READ) {
  try {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (!st.isFile() || st.size > limit) return null;
    return fs.readFileSync(full, 'utf8').replace(/^﻿/, '');
  } catch {
    return null;
  }
}

// The first of these names that exists with exactly this spelling (the file system may ignore case).
function exactName(dir, names) {
  try {
    const present = new Set(fs.readdirSync(dir));
    return names.find((n) => present.has(n) && isFile(dir, n));
  } catch {
    return undefined;
  }
}

// JSON that may carry comments and trailing commas (deno.jsonc); null when it does not parse.
function parseJsonc(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') { out += n ?? ''; i += 1; } else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      i -= 1;
    } else if (c === '/' && n === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 1;
    } else out += c;
  }
  for (const candidate of [out, out.replace(/,(\s*[}\]])/g, '$1')]) {
    try { return JSON.parse(candidate); } catch { /* try the next form */ }
  }
  return null;
}

function readJson(dir, name) {
  const text = read(dir, name);
  const value = text === null ? null : parseJsonc(text);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

const hit = (command, from) => ({ command, from });
const filled = (v) => typeof v === 'string' && v.trim() !== '';

// ---- one detector per ecosystem; each returns { build?, test?, lint? } of { command, from } ----

function packageManager(dir, pkg) {
  if (isFile(dir, 'pnpm-lock.yaml')) return 'pnpm';
  if (isFile(dir, 'yarn.lock')) return 'yarn';
  if (isFile(dir, 'bun.lockb') || isFile(dir, 'bun.lock')) return 'bun';
  const named = typeof pkg.packageManager === 'string' ? /^(pnpm|yarn|bun|npm)@/.exec(pkg.packageManager) : null;
  return named ? named[1] : 'npm';
}

function detectNode(dir) {
  const pkg = readJson(dir, 'package.json');
  const scripts = pkg && pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : null;
  if (!scripts) return {};
  const pm = packageManager(dir, pkg);
  const out = {};
  for (const kind of KINDS) {
    const body = scripts[kind];
    if (!filled(body)) continue;
    if (kind === 'test' && /no test specified/i.test(body)) continue; // the placeholder npm init writes
    const command = pm === 'bun' ? `bun run ${kind}` : kind === 'test' ? `${pm} test` : `${pm} run ${kind}`;
    out[kind] = hit(command, `package.json scripts.${kind}`);
  }
  return out;
}

function detectDeno(dir) {
  const name = ['deno.json', 'deno.jsonc'].find((n) => isFile(dir, n));
  const tasks = name ? readJson(dir, name)?.tasks : null;
  if (!tasks || typeof tasks !== 'object') return {};
  const out = {};
  for (const kind of KINDS) {
    const task = tasks[kind];
    if (filled(task) || (task && typeof task === 'object' && filled(task.command))) out[kind] = hit(`deno task ${kind}`, `${name} tasks.${kind}`);
  }
  return out;
}

function detectCargo(dir) {
  if (!isFile(dir, 'Cargo.toml')) return {};
  const from = 'Cargo.toml';
  return { build: hit('cargo build', from), test: hit('cargo test', from), lint: hit('cargo clippy', from) };
}

function detectGo(dir) {
  if (!isFile(dir, 'go.mod')) return {};
  const from = 'go.mod';
  return { build: hit('go build ./...', from), test: hit('go test ./...', from), lint: hit('go vet ./...', from) };
}

// A dependency named in pyproject.toml: a quoted requirement ("pytest>=7") or a poetry-style key (pytest = "^7").
const inPyproject = (text, name) => new RegExp(`(["']\\s*${name}\\b)|(^\\s*${name}\\s*=)`, 'm').test(text);
const inRequirements = (lines, name) => lines.some((line) => new RegExp(`^\\s*${name}\\b`, 'i').test(line));

// The lines of a file that patterns may safely run over: none when the file is over 1 MB, and never a line over 10,000 characters.
function scanLines(dir, name) {
  const text = read(dir, name, MAX_SCAN_FILE);
  return text === null ? [] : text.split(/\r\n|\r|\n/).filter((line) => line.length <= MAX_SCAN_LINE);
}

function requirementFiles(dir) {
  const names = [];
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isFile() && /^requirements.*\.txt$/i.test(e.name)) names.push(e.name);
    if (isDir(path.join(dir, 'requirements'))) {
      for (const e of fs.readdirSync(path.join(dir, 'requirements'), { withFileTypes: true })) if (e.isFile() && /\.txt$/i.test(e.name)) names.push(`requirements/${e.name}`);
    }
  } catch { /* an unreadable folder just means no evidence */ }
  return names.sort();
}

function detectPython(dir) {
  const pyproject = read(dir, 'pyproject.toml');
  const setupCfg = read(dir, 'setup.cfg');
  const tox = read(dir, 'tox.ini');
  const reqs = requirementFiles(dir).map((name) => ({ name, lines: scanLines(dir, name) }));
  const listedIn = (tool) => reqs.find((r) => inRequirements(r.lines, tool))?.name;
  const out = {};

  const pytestFrom = isFile(dir, 'pytest.ini') ? 'pytest.ini'
    : pyproject !== null && /^\s*\[tool\.pytest\b/m.test(pyproject) ? 'pyproject.toml [tool.pytest]'
    : setupCfg !== null && /^\s*\[(tool:)?pytest\]/m.test(setupCfg) ? 'setup.cfg [tool:pytest]'
    : tox !== null && (/^\s*\[pytest\]/m.test(tox) || /\bpytest\b/.test(tox)) ? 'tox.ini'
    : pyproject !== null && inPyproject(pyproject, 'pytest') ? 'pyproject.toml dependencies'
    : listedIn('pytest');
  if (pytestFrom) out.test = hit('pytest', pytestFrom);

  const ruffFrom = isFile(dir, 'ruff.toml') ? 'ruff.toml'
    : isFile(dir, '.ruff.toml') ? '.ruff.toml'
    : pyproject !== null && /^\s*\[tool\.ruff\b/m.test(pyproject) ? 'pyproject.toml [tool.ruff]'
    : pyproject !== null && inPyproject(pyproject, 'ruff') ? 'pyproject.toml dependencies'
    : listedIn('ruff');
  const flake8From = isFile(dir, '.flake8') ? '.flake8'
    : setupCfg !== null && /^\s*\[flake8\]/m.test(setupCfg) ? 'setup.cfg [flake8]'
    : tox !== null && /^\s*\[flake8\]/m.test(tox) ? 'tox.ini [flake8]'
    : pyproject !== null && inPyproject(pyproject, 'flake8') ? 'pyproject.toml dependencies'
    : listedIn('flake8');
  if (ruffFrom) out.lint = hit('ruff check .', ruffFrom);
  else if (flake8From) out.lint = hit('flake8', flake8From);

  if (pyproject !== null && /^\s*build-backend\s*=/m.test(pyproject)) out.build = hit('python -m build', 'pyproject.toml [build-system]');
  return out;
}

function detectGradle(dir) {
  const files = ['build.gradle.kts', 'build.gradle', 'settings.gradle.kts', 'settings.gradle'];
  const wrapper = isFile(dir, 'gradlew');
  const marker = files.find((n) => isFile(dir, n)) ?? (wrapper ? 'gradlew' : null);
  if (!marker) return {};
  const run = wrapper ? './gradlew' : 'gradle';
  const out = { build: hit(`${run} build`, marker), test: hit(`${run} test`, marker) };
  const text = ['build.gradle.kts', 'build.gradle', 'app/build.gradle.kts', 'app/build.gradle'].map((n) => read(dir, n) ?? '').join('\n');
  const lintTask = /\bdetekt\b/.test(text) ? 'detekt'
    : /\bktlint\b/i.test(text) ? 'ktlintCheck'
    : /\bspotless\b/.test(text) ? 'spotlessCheck'
    : /\bcheckstyle\b/i.test(text) ? 'checkstyleMain'
    : /com\.android\./.test(text) ? 'lint'
    : null;
  if (lintTask) out.lint = hit(`${run} ${lintTask}`, `${marker} (${lintTask})`);
  return out;
}

function detectMaven(dir) {
  if (!isFile(dir, 'pom.xml')) return {};
  return { build: hit('mvn -q package', 'pom.xml'), test: hit('mvn -q test', 'pom.xml') };
}

function detectMake(dir) {
  const name = exactName(dir, ['GNUmakefile', 'makefile', 'Makefile']);
  if (!name) return {};
  const targets = new Set();
  for (const line of scanLines(dir, name)) {
    const m = /^([A-Za-z0-9_./ -]+?)\s*:(?!=)/.exec(line);
    if (m) for (const t of m[1].split(/\s+/)) targets.add(t);
  }
  const out = {};
  for (const kind of KINDS) if (targets.has(kind)) out[kind] = hit(`make ${kind}`, `${name} target ${kind}`);
  return out;
}

// Order matters: for each kind the first ecosystem that has evidence wins.
const DETECTORS = [detectNode, detectDeno, detectCargo, detectGo, detectPython, detectGradle, detectMaven, detectMake];

export function detect(dir) {
  const commands = { build: null, test: null, lint: null };
  const from = { build: null, test: null, lint: null };
  for (const detector of DETECTORS) {
    const found = detector(dir);
    for (const kind of KINDS) {
      if (commands[kind] === null && found[kind]) {
        commands[kind] = found[kind].command;
        from[kind] = found[kind].from;
      }
    }
  }
  return { commands, from };
}

// Manual entries win over detected ones. A kind with neither is null.
function effectiveCommands(doc) {
  const manual = doc && doc.manual && typeof doc.manual === 'object' ? doc.manual : {};
  const detected = doc && doc.commands && typeof doc.commands === 'object' ? doc.commands : {};
  const out = {};
  for (const kind of KINDS) out[kind] = filled(manual[kind]) ? manual[kind] : filled(detected[kind]) ? detected[kind] : null;
  return out;
}

// For other tools: { build, test, lint } from <dir>/.bgzflow/project.json, manual over detected, null when unknown.
export function readProjectCommands(dir) {
  const text = read(dir, REL_FILE);
  let doc = null;
  try { doc = text === null ? null : JSON.parse(text); } catch { /* a damaged file reads as unknown */ }
  return effectiveCommands(doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : null);
}

export class SetupError extends Error {}

// Detects and (unless dry) saves. Returns what happened; throws SetupError when project.json is unreadable or unwritable.
export function setup(dir, { dry = false, now = new Date() } = {}) {
  const file = projectFile(dir);
  const { commands, from } = detect(dir);
  // The prior file is read first: its system.skip and system.integration_branch steer the scan. A file that cannot be used is reported
  // once the scan has run (and only if something was found), as before.
  let manual = {};
  let prior = {};
  let problem = null;
  const text = read(dir, REL_FILE);
  if (text === null && fs.existsSync(file)) problem = `${REL_FILE} cannot be read; left as it is`;
  else if (text !== null && text.trim() !== '') {
    try { prior = JSON.parse(text); } catch { prior = null; }
    if (!prior || typeof prior !== 'object' || Array.isArray(prior)) {
      problem = `${REL_FILE} is not valid JSON; left as it is (fix or remove it, then run again)`;
      prior = {};
    } else if (prior.manual && typeof prior.manual === 'object' && !Array.isArray(prior.manual)) manual = prior.manual;
  }
  const before = prior.system && typeof prior.system === 'object' && !Array.isArray(prior.system) ? prior.system : {};
  const found = discover(dir, { now, skip: before.skip, integrationBranch: filled(before.integration_branch) ? before.integration_branch : undefined });
  if (!KINDS.some((kind) => commands[kind]) && !isSystemFound(found)) {
    return { file, found: false, written: false, dry, commands, from, manual: {}, effective: readProjectCommands(dir) };
  }
  if (problem) throw new SetupError(problem);
  // The system map keeps what a person set (owner, integration branch, skip folders, confirmed deployments); only "detected" is refreshed.
  const system = {};
  if (filled(before.owner)) system.owner = before.owner;
  if (filled(before.integration_branch)) system.integration_branch = before.integration_branch;
  if (Array.isArray(before.skip) && before.skip.length > 0) system.skip = before.skip;
  system.detected = found;
  system.manual = before.manual && typeof before.manual === 'object' && !Array.isArray(before.manual) ? before.manual : {};
  const record = { schema_version: SCHEMA_VERSION, detected_at: now.toISOString(), commands, from, manual, system };
  if (!dry) {
    const tmp = `${file}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`);
      fs.renameSync(tmp, file);
    } catch (err) {
      try { fs.rmSync(tmp, { force: true }); } catch { /* nothing to clean */ }
      throw new SetupError(`cannot write ${REL_FILE}: ${err.message}`);
    }
  }
  return { file, found: true, written: !dry, dry, ...record, effective: effectiveCommands(record) };
}

// "2 services, 1 deployment": what the system scan found, or '' when it found nothing.
function systemSummary(system) {
  const d = system?.detected;
  if (!d) return '';
  const count = (n, word) => (n ? `${n} ${word}${n === 1 ? '' : 's'}` : null);
  return [count(d.repos.length, 'repo'), count(d.worktrees.length, 'worktree'), count(d.services.length, 'service'), count(d.deployments.length, 'deployment')].filter(Boolean).join(', ');
}

function formatResult(r) {
  if (!r.found) return ['project-setup: no build, test or lint commands or system found; nothing written.'];
  const found = systemSummary(r.system);
  const tail = found ? ` - system: ${found}` : '';
  const lines = [r.dry ? `project-setup: dry run, nothing written (would save ${REL_FILE}${tail})` : `project-setup: saved ${REL_FILE}${tail}`];
  lines.push(KINDS.map((kind) => `${kind}: ${r.effective[kind] ?? 'not found'}`).join('; '));
  const kept = KINDS.filter((kind) => filled(r.manual[kind]));
  if (kept.length) lines.push(`manual entries kept: ${kept.join(', ')}`);
  return lines;
}

function parseArgs(argv) {
  const flags = { json: false, dry: false, help: false };
  const folders = [];
  for (const a of argv) {
    if (a === '--json') flags.json = true;
    else if (a === '--dry' || a === '--dry-run') flags.dry = true;
    else if (a === '--help' || a === '-h') flags.help = true;
    else if (a.startsWith('-') && a !== '-') return { error: `unknown option ${a}` };
    else folders.push(a);
  }
  if (folders.length > 1) return { error: 'give one project folder at most' };
  return { flags, folder: folders[0] };
}

export function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    console.error(`project-setup: ${parsed.error}\n${USAGE}`);
    return 2;
  }
  if (parsed.flags.help) {
    console.log(USAGE);
    return 0;
  }
  const dir = parsed.folder ? path.resolve(parsed.folder) : findProjectDir({ cwd: process.cwd() });
  if (!dir || !isDir(dir)) {
    console.error(`project-setup: ${parsed.folder ?? 'the current project'} is not a folder\n${USAGE}`);
    return 2;
  }
  let result;
  try {
    result = setup(dir, { dry: parsed.flags.dry });
  } catch (err) {
    if (!(err instanceof SetupError)) throw err;
    console.error(`project-setup: ${err.message}`);
    return 1;
  }
  if (parsed.flags.json) console.log(JSON.stringify({ project: dir, ...result, file: REL_FILE }, null, 2));
  else console.log(formatResult(result).join('\n'));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`project-setup: ${err.message}`);
    process.exitCode = 1;
  }
}
