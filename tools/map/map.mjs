#!/usr/bin/env node
// One system map, kept by one owner: repos, worktrees, services, what depends on what, declared deployments, and each task's change by stage.
//   node tools/map/map.mjs [<dir>] [--json] [--brief]
//   node tools/map/map.mjs record <task-id> [--handback <file>] [--what <text> --where <a,b> --effect <text>] [--stage <s>] [--commit <sha>] [--evidence <text>] --as <role>
//   node tools/map/map.mjs live <deployment> --evidence <text> --as <role>
// The inventory is the one `bgz setup` saved in <dir>/.bgzflow/project.json (system.detected; system.manual wins). The view never writes: a live
// rescan only reports drift. A task's change lives in <dir>/.bgzflow/work-graph.json (task.change). The map is advice: a claim git cannot prove is
// flagged, never refused. Exit 0: shown or recorded. Exit 1: the one refusal, --as is not the owner. Exit 2: bad usage or a file that cannot be read.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProjectDir } from '../../hooks/lib/project.mjs';
import { normalizePath } from '../facts/facts.mjs';
import { readTasks } from '../start-now/start-now.mjs';
import { canonical, defaultBranch, discover, isSecretFile, pathKey, runGit, serviceAt } from './discover.mjs';

const USAGE = [
  'usage: map [<dir>] [--json] [--brief]',
  '       map record <task-id> [--handback <file>] [--what <text> --where <a,b> --effect <text>] [--stage <stage>] [--commit <sha>] [--evidence <text>] --as <role>',
  '       map live <deployment> --evidence <text> --as <role>',
  `stages: ${'plan, committed, integrated, deployed, production-verified'}`,
].join('\n');
const STAGES = ['plan', 'committed', 'integrated', 'deployed', 'production-verified'];
const PROJECT_REL = '.bgzflow/project.json';
const GRAPH_REL = '.bgzflow/work-graph.json';
const SCHEMA_VERSION = 1;

class MapError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const arr = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const unique = (list) => [...new Set(list)];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const rank = (stage) => STAGES.indexOf(stage);
const higher = (a, b) => (rank(a) >= rank(b) ? a : b);
const shortSha = (sha) => String(sha).slice(0, 7);

// ---- arguments ----------------------------------------------------------------------------------------------------

const VALUE_FLAGS = { '--handback': 'handback', '--what': 'what', '--where': 'where', '--effect': 'effect', '--stage': 'stage', '--commit': 'commit', '--evidence': 'evidence', '--as': 'as' };
const ALLOWED = {
  view: ['--json', '--brief'],
  record: ['--handback', '--what', '--where', '--effect', '--stage', '--commit', '--evidence', '--as'],
  live: ['--evidence', '--as'],
};

function parseArgs(argv) {
  const opts = { command: 'view', dir: null, task: null, deployment: null, json: false, brief: false, help: false };
  for (const key of Object.values(VALUE_FLAGS)) opts[key] = null;
  const positional = [];
  const given = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json' || arg === '--brief') {
      opts[arg.slice(2)] = true;
      given.push(arg);
    } else if (VALUE_FLAGS[arg]) {
      if (i + 1 >= argv.length) throw new MapError(`${arg} needs a value`);
      opts[VALUE_FLAGS[arg]] = argv[++i];
      given.push(arg);
    } else if (arg.startsWith('-') && arg.length > 1) throw new MapError(`unknown option ${arg}`);
    else positional.push(arg);
  }
  if (positional[0] === 'record' || positional[0] === 'live') opts.command = positional.shift();
  const bad = given.find((flag) => !ALLOWED[opts.command].includes(flag));
  if (bad) throw new MapError(`${bad} is not an option of "map${opts.command === 'view' ? '' : ` ${opts.command}`}" (map --help)`);
  if (opts.command === 'record') {
    if (positional.length !== 1) throw new MapError('record needs one task id: map record <task-id> ... --as <role>');
    opts.task = positional[0];
  } else if (opts.command === 'live') {
    if (positional.length !== 1) throw new MapError('live needs one deployment name: map live <deployment> --evidence <text> --as <role>');
    opts.deployment = positional[0];
  } else {
    if (positional.length > 1) throw new MapError(`unexpected argument "${positional[1]}"`);
    opts.dir = positional[0] ?? null;
  }
  if (opts.stage !== null && !STAGES.includes(opts.stage)) throw new MapError(`unknown stage "${opts.stage}" (${STAGES.join(', ')})`);
  if (opts.commit !== null && !/^[0-9a-f]{4,64}$/i.test(opts.commit)) throw new MapError(`--commit wants a commit id (4 to 64 hex characters), got "${opts.commit}"`);
  if ((opts.where !== null || opts.effect !== null) && !text(opts.what)) throw new MapError('--where and --effect go with --what <text>');
  return opts;
}

function resolveProject(opts, cwd, env) {
  if (opts.command === 'view' && opts.dir !== null) {
    const dir = path.resolve(cwd, opts.dir);
    let ok = false;
    try {
      ok = fs.statSync(dir).isDirectory();
    } catch { /* reported below */ }
    if (!ok) throw new MapError(`project folder not found: ${opts.dir}`);
    return dir;
  }
  return findProjectDir({ cwd }, env) ?? path.resolve(cwd);
}

// ---- files ----------------------------------------------------------------------------------------------------------

// project.json as an object; `problem` says why it could not be used (a missing file is not a problem).
function readProjectFile(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return { doc: null, problem: err.code === 'ENOENT' ? null : `cannot read ${PROJECT_REL} (${err.code || err.message})` };
  }
  if (raw.trim() === '') return { doc: null, problem: null };
  try {
    const value = JSON.parse(raw);
    if (isObject(value)) return { doc: value, problem: null };
  } catch { /* reported below */ }
  return { doc: null, problem: `${PROJECT_REL} is not valid JSON` };
}

// The work graph (an envelope with a tasks array, or the array itself). `tasks` are the live rows of `doc`, so a caller can edit them and write `doc` back.
function loadGraph(file) {
  if (!fs.existsSync(file)) return { file, missing: true, problem: null, doc: null, tasks: [] };
  try {
    readTasks(file);
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { file, missing: false, problem: null, doc, tasks: Array.isArray(doc) ? doc : doc.tasks };
  } catch (err) {
    return { file, missing: false, problem: err.message, doc: null, tasks: [] };
  }
}

function writeAtomic(file, body) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* nothing to clean */ }
    throw new MapError(`cannot write ${path.basename(path.dirname(file))}/${path.basename(file)}: ${err.message}`);
  }
}

const jsonText = (doc) => `${JSON.stringify(doc, null, 2)}\n`;

// ---- handback lines ---------------------------------------------------------------------------------------------------

const CHANGED_LINE = /^\s*(?:[-*+]\s+)?[*_]{0,2}Changed:[*_]{0,2}\s*(.+?)\s*$/i;
const splitList = (value) => String(value ?? '').split(',').map(normalizePath).filter(Boolean);

// "Changed: <what> | where: <a, b> | effect: <text>" lines of a handback.
export function parseHandback(body) {
  const items = [];
  for (const line of String(body).split(/\r?\n/)) {
    const match = CHANGED_LINE.exec(line);
    if (!match) continue;
    const item = { what: '', where: [], effect: '' };
    for (const part of match[1].split('|').map((p) => p.trim()).filter(Boolean)) {
      const labelled = /^(where|effect)\s*:\s*(.*)$/i.exec(part);
      if (labelled && labelled[1].toLowerCase() === 'where') item.where = splitList(labelled[2]);
      else if (labelled) item.effect = labelled[2].trim();
      else if (!item.what) item.what = part;
    }
    if (item.what) items.push(item);
  }
  return items;
}

const changedLine = (item) => `Changed: ${[item.what, arr(item.where).length ? `where: ${item.where.join(', ')}` : '', item.effect ? `effect: ${item.effect}` : ''].filter(Boolean).join(' | ')}`;

// The change items a record call brings: the handback's Changed lines, then the --what flags. `strict` is false only while building a refusal message.
function readItems(opts, cwd, strict) {
  const notes = [];
  let items = [];
  if (opts.handback !== null) {
    const file = path.resolve(cwd, opts.handback);
    let body = null;
    if (isSecretFile(file)) {
      if (strict) throw new MapError(`${path.basename(file)} looks like a secret file; not read`);
    } else {
      try {
        body = fs.readFileSync(file, 'utf8');
      } catch (err) {
        if (strict) throw new MapError(`cannot read handback ${opts.handback} (${err.code || err.message})`);
      }
    }
    if (body !== null) {
      items = parseHandback(body);
      if (!items.length) notes.push(`no "Changed:" line in ${opts.handback}; the items stay as they were`);
    }
  }
  if (text(opts.what)) items.push({ what: text(opts.what), where: splitList(opts.where), effect: text(opts.effect) });
  return { items, notes };
}

// ---- the owner ---------------------------------------------------------------------------------------------------------

function ownerOf(graph, system) {
  const envelope = graph.doc && !Array.isArray(graph.doc) ? graph.doc : null;
  return text(envelope?.integration_owner) || text(system?.owner) || 'lead';
}

function ownerRefusal(what, owner, role, lines) {
  const who = role ? `you are ${role}` : 'no role given (--as <role> or BGZFLOW_ROLE)';
  return new MapError(`${what} is for the owner (${owner}); ${who}.\nPut this in your handback and the owner will record it:\n${lines.join('\n')}`, 1);
}

// ---- impact ------------------------------------------------------------------------------------------------------------

// A where entry as a project-relative folder or file ("" when it names nothing usable): globs are cut at the first wildcard.
function relativeWhere(entry, projectDir) {
  let s = normalizePath(entry);
  const star = s.search(/[*?[]/);
  if (star !== -1) s = s.slice(0, star);
  if (path.isAbsolute(s)) {
    const rel = normalizePath(path.relative(projectDir, s));
    s = rel.startsWith('..') || path.isAbsolute(rel) ? '' : rel;
  }
  return s.replace(/\/+$/, '');
}

const under = (child, folder) => child === folder || child.startsWith(`${folder}/`);

// Where the paths land: the services they sit in, everything that depends on those (any distance), and the deployments of all of them.
function impactOf(items, services, edges, deployments, projectDir) {
  const placed = services.filter((s) => typeof s.path === 'string');
  const paths = unique(items.flatMap((item) => arr(item.where)).map((w) => relativeWhere(w, projectDir)).filter(Boolean));
  const hit = [];
  for (const rel of paths) {
    const service = serviceAt(placed, rel);
    if (service && !hit.includes(service.name)) hit.push(service.name);
  }
  const dependents = [];
  const queue = [...hit];
  while (queue.length) {
    const name = queue.shift();
    for (const edge of edges) {
      if (edge.to === name && !hit.includes(edge.from) && !dependents.includes(edge.from)) {
        dependents.push(edge.from);
        queue.push(edge.from);
      }
    }
  }
  const touchedPaths = [...paths, ...placed.filter((s) => hit.includes(s.name) || dependents.includes(s.name)).map((s) => s.path).filter((p) => p !== '.')];
  const reached = unique(
    deployments
      .filter((d) => {
        if (d.service) return hit.includes(d.service) || dependents.includes(d.service);
        const folder = d.file ? path.posix.dirname(d.file) : '.';
        return folder !== '.' && touchedPaths.some((p) => under(p, folder));
      })
      .map((d) => d.name),
  );
  return { services: hit, dependents, deployments: reached };
}

// ---- the model ---------------------------------------------------------------------------------------------------------

// Manual entries overlay detected ones of the same name; manual fields win.
function overlay(detected, manual) {
  const list = detected.filter(isObject).map((x) => ({ ...x }));
  for (const entry of arr(manual)) {
    if (!isObject(entry) || !text(entry.name)) continue;
    const at = list.findIndex((x) => x.name === entry.name);
    if (at >= 0) list[at] = { ...list[at], ...entry };
    else list.push({ ...entry });
  }
  return list;
}

// Everything the inventory holds, as comparable keys with a plain label.
function inventoryKeys(inv) {
  const keys = new Map();
  for (const r of arr(inv.repos)) keys.set(`repo|${pathKey(r.path)}`, `repo ${r.path}`);
  for (const w of arr(inv.worktrees)) keys.set(`worktree|${pathKey(w.path)}`, `worktree ${w.branch ? `${w.branch} ` : ''}(${w.path})`);
  for (const s of arr(inv.services)) {
    keys.set(`service|${s.name}|${s.path}`, `service ${s.name} (${s.path})`);
    for (const d of arr(s.deps)) keys.set(`edge|${s.name}|${d}`, `dependency ${s.name} -> ${d}`);
  }
  for (const d of arr(inv.deployments)) keys.set(`deployment|${d.name}|${d.file}`, `deployment ${d.name} (${d.file})`);
  return keys;
}

function driftOf(stored, live) {
  const before = inventoryKeys(stored);
  const now = inventoryKeys(live);
  const added = [...now].filter(([key]) => !before.has(key)).map(([, label]) => label);
  const removed = [...before].filter(([key]) => !now.has(key)).map(([, label]) => label);
  return { drifted: added.length + removed.length > 0, added, removed };
}

function buildModel(projectDir) {
  const notes = [];
  const project = readProjectFile(path.join(projectDir, PROJECT_REL));
  const system = isObject(project.doc?.system) ? project.doc.system : {};
  const stored = isObject(system.detected);
  const live = discover(projectDir);
  const found = stored ? system.detected : live;
  const manual = isObject(system.manual) ? system.manual : {};
  if (project.problem) notes.push(`${project.problem}.`);
  if (!stored) notes.push('No saved inventory: showing a live scan. Run bgz setup to save it.');

  const graph = loadGraph(path.join(projectDir, GRAPH_REL));
  if (graph.missing) notes.push(`No work graph at ${GRAPH_REL}: task owners and stages are not known.`);
  else if (graph.problem) notes.push(`Work graph not used: ${graph.problem}.`);
  const envelope = graph.doc && !Array.isArray(graph.doc) ? graph.doc : null;
  const owner = ownerOf(graph, system);

  const repos = arr(found.repos).filter(isObject);
  const integrationBranch = text(system.integration_branch) || repos[0]?.default_branch || null;
  const services = overlay(arr(found.services), manual.services).map((s) => ({ name: s.name, path: typeof s.path === 'string' ? s.path : null, kind: s.kind ?? null, deps: arr(s.deps).filter((d) => typeof d === 'string') }));
  const edges = services.flatMap((s) => s.deps.map((to) => ({ from: s.name, to })));
  const deployments = overlay(arr(found.deployments), manual.deployments).map((d) => ({
    name: d.name,
    service: d.service ?? null,
    kind: d.kind ?? null,
    file: d.file ?? null,
    live: d.active === true,
    evidence: d.evidence ?? null,
    confirmed_by: d.confirmed_by ?? null,
    confirmed_at: d.confirmed_at ?? null,
  }));

  // Worktrees joined to the tasks that name them as their workspace.
  const known = !graph.missing && !graph.problem;
  const keyed = graph.tasks.filter(isObject).map((t) => ({ id: t.id, owner: text(t.owner), key: text(t.workspace) ? pathKey(path.resolve(projectDir, t.workspace)) : null }));
  const repoKeys = new Set(repos.map((r) => pathKey(r.path)));
  const integrationKey = text(envelope?.integration_workspace) ? pathKey(path.resolve(projectDir, envelope.integration_workspace)) : null;
  const worktrees = arr(found.worktrees).filter(isObject).map((w) => {
    const key = pathKey(w.path);
    const owners = keyed.filter((t) => t.key === key);
    return {
      path: w.path,
      branch: w.branch ?? null,
      head: w.head ?? null,
      tasks: owners.map((t) => t.id),
      owner: unique(owners.map((t) => t.owner).filter(Boolean)).join(', ') || null,
      unowned: known && owners.length === 0 && !w.main && !repoKeys.has(key) && key !== integrationKey,
      label: w.main ? 'main checkout' : key === integrationKey ? 'integration workspace' : repoKeys.has(key) ? 'this checkout' : known ? 'no task owns it' : 'no work graph',
    };
  });

  // Where a commit can be looked up, and which branch counts as integrated there.
  let gitDirs = null;
  const lookups = () => {
    if (gitDirs) return gitDirs;
    const seen = new Set();
    gitDirs = [];
    for (const dir of [...repos.map((r) => r.path), projectDir]) {
      if (seen.has(pathKey(dir))) continue;
      seen.add(pathKey(dir));
      const repo = repos.find((r) => pathKey(r.path) === pathKey(dir));
      gitDirs.push({ dir, branch: text(system.integration_branch) || repo?.default_branch || defaultBranch(dir) });
    }
    return gitDirs;
  };
  const proof = (task, commit) => {
    let stage = task.integration?.state === 'integrated' ? 'integrated' : 'plan';
    if (!commit || stage === 'integrated') return stage;
    for (const { dir, branch } of lookups()) {
      if (runGit(dir, ['cat-file', '-e', `${commit}^{commit}`]) === null) continue;
      stage = 'committed';
      if (branch && [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`].some((ref) => runGit(dir, ['merge-base', '--is-ancestor', commit, ref]) !== null)) return 'integrated';
    }
    return stage;
  };

  const changes = [];
  const tasks = [];
  const stages = Object.fromEntries(STAGES.map((s) => [s, []]));
  for (const task of graph.tasks.filter(isObject)) {
    const change = isObject(task.change) ? task.change : null;
    let shown = 'plan';
    if (change) {
      const recorded = STAGES.includes(change.stage) ? change.stage : 'plan';
      const commit = text(change.commit) || null;
      const proven = proof(task, commit);
      shown = higher(recorded, proven);
      const history = arr(change.history).filter(isObject);
      const flags = [];
      if (rank(recorded) >= rank('committed') && !commit) flags.push(`claimed ${recorded}, no commit recorded`);
      else if (commit && proven === 'plan') flags.push(`claimed ${recorded}, commit ${shortSha(commit)} not found in any repo here`);
      else if (recorded === 'integrated' && proven !== 'integrated') flags.push(`claimed integrated, not in ${integrationBranch ?? 'the integration branch'}`);
      if (rank(recorded) >= rank('deployed') && !history.some((h) => h.stage === recorded && text(h.evidence))) flags.push(`${recorded}: claimed, no evidence`);
      const items = arr(change.items).filter(isObject).map((i) => ({ what: text(i.what), where: arr(i.where).map(String), effect: text(i.effect) }));
      changes.push({ task: task.id, outcome: text(task.outcome) || null, stage: shown, recorded_stage: recorded, git_stage: proven, commit, items, flags, impact: impactOf(items, services, edges, deployments, projectDir) });
    }
    stages[shown].push(task.id);
    tasks.push({ id: task.id, outcome: text(task.outcome) || null, owner: text(task.owner) || null, stage: shown });
  }

  const drift = stored ? driftOf(found, live) : { drifted: false, added: [], removed: [] };
  return {
    project: canonical(projectDir),
    owner,
    integration_branch: integrationBranch,
    stored,
    scanned_at: found.scanned_at ?? null,
    repos,
    worktrees,
    services,
    edges,
    deployments,
    tasks,
    changes,
    stages,
    unowned_worktrees: worktrees.filter((w) => w.unowned),
    drift,
    notes,
  };
}

// ---- reading it --------------------------------------------------------------------------------------------------------

const impactParts = (impact) => [
  impact.services.length && `affects ${impact.services.join(', ')}`,
  impact.dependents.length && `dependents ${impact.dependents.join(', ')}`,
  impact.deployments.length && `deployments ${impact.deployments.join(', ')}`,
].filter(Boolean);

function formatView(model) {
  const lines = [`System map for ${model.project}`, `Owner: ${model.owner}. Integration branch: ${model.integration_branch ?? 'unknown (set system.integration_branch in .bgzflow/project.json)'}. ${model.stored ? `Inventory saved ${String(model.scanned_at ?? '').slice(0, 16).replace('T', ' ')} UTC.` : 'Inventory: live scan, not saved.'}`];
  for (const note of model.notes) lines.push(note);

  lines.push('', `Repos (${model.repos.length})`);
  for (const r of model.repos) lines.push(`  ${r.path} - ${r.branch ?? 'no branch'}${r.head ? ` @ ${r.head}` : ''}${r.origin ? ` - ${r.origin}` : ''}`);
  lines.push('', `Worktrees (${model.worktrees.length})`);
  for (const w of model.worktrees) lines.push(`  ${w.path} - ${w.branch ?? 'detached'} - ${w.tasks.length ? `${w.tasks.join(', ')}${w.owner ? ` (${w.owner})` : ''}` : w.label}`);
  lines.push('', `Services (${model.services.length})`);
  for (const s of model.services) lines.push(`  ${s.name} (${s.kind ?? 'service'}) ${s.path ?? ''}${s.deps.length ? ` - uses ${s.deps.join(', ')}` : ''}`.replace(/ +$/, ''));
  lines.push('', `Deployments (${model.deployments.length})`);
  for (const d of model.deployments) {
    const where = [d.kind, d.service && `service ${d.service}`, d.file ?? 'added by hand'].filter(Boolean).join(', ');
    lines.push(`  ${d.name} - ${where} - ${d.live ? `live (confirmed by ${d.confirmed_by ?? 'the owner'}${d.evidence ? `: ${d.evidence}` : ''})` : 'unconfirmed'}`);
  }

  lines.push('', 'Work by stage');
  if (!model.tasks.length) lines.push('  no tasks in the graph');
  for (const stage of STAGES) {
    const ids = model.stages[stage];
    if (!ids.length) continue;
    lines.push(`  ${stage} (${ids.length})`);
    for (const id of ids) {
      const task = model.tasks.find((t) => t.id === id);
      const change = model.changes.find((c) => c.task === id);
      lines.push(`    ${id}${task.outcome ? ` - ${task.outcome}` : ''}`);
      if (!change) continue;
      for (const item of change.items) lines.push(`      ${item.what}${item.where.length ? ` (${item.where.join(', ')})` : ''}: ${item.effect || 'effect not stated'}`);
      const parts = impactParts(change.impact);
      if (parts.length) lines.push(`      ${parts.join('; ')}`);
      for (const flag of change.flags) lines.push(`      ! ${flag}`);
    }
  }

  if (model.drift.drifted) {
    lines.push('', 'Drift: the saved inventory differs from what is on disk now - rerun bgz setup to refresh it.');
    for (const label of model.drift.added) lines.push(`  new: ${label}`);
    for (const label of model.drift.removed) lines.push(`  gone: ${label}`);
  }
  return lines.join('\n');
}

// Three to five plain lines for a checkpoint, handback or inbox message.
function formatBrief(model) {
  const lines = [];
  lines.push(`System: ${plural(model.services.length, 'service')}, ${plural(model.deployments.length, 'deployment')}, ${plural(model.worktrees.length, 'worktree')} in ${plural(model.repos.length, 'repo')}; owner ${model.owner}; integration branch ${model.integration_branch ?? 'unknown'}${model.stored ? '' : ' (live scan; run bgz setup to save it)'}.`);
  const shown = model.tasks.slice(0, 6).map((t) => `${t.id} ${t.stage}`);
  lines.push(model.tasks.length ? `Work: ${shown.join(', ')}${model.tasks.length > 6 ? `, +${model.tasks.length - 6} more` : ''}.` : 'Work: no tasks in the graph.');
  const open = model.changes.filter((c) => c.stage !== 'production-verified');
  const reach = {
    services: unique(open.flatMap((c) => c.impact.services)),
    dependents: unique(open.flatMap((c) => c.impact.dependents)),
    deployments: unique(open.flatMap((c) => c.impact.deployments)),
  };
  const parts = impactParts(reach);
  lines.push(open.length && parts.length ? `In flight: ${parts.join('; ')}.` : 'Nothing in flight.');
  const check = [...model.changes.flatMap((c) => c.flags.map((f) => `${c.task} ${f}`)), ...model.unowned_worktrees.map((w) => `worktree ${w.branch ?? w.path}: no task owns it`)];
  if (check.length) lines.push(`Check: ${check.join('; ')}.`);
  if (model.drift.drifted) lines.push(`Drift: ${plural(model.drift.added.length, 'new thing')}, ${plural(model.drift.removed.length, 'gone')} since setup - rerun bgz setup.`);
  return lines.join('\n');
}

// ---- record and live ---------------------------------------------------------------------------------------------------

function inboxLine(role, entry) {
  const affects = [...entry.impact.services, ...entry.impact.dependents.map((d) => `${d} (dependent)`), ...entry.impact.deployments.map((d) => `${d} (deployment)`)];
  const whats = entry.items.map((i) => i.what).filter(Boolean).join(', ');
  return `Inbox line: ${role} recorded ${entry.task} as ${entry.recorded_stage}${whats ? `: ${whats}` : ''}${affects.length ? `; affects ${affects.join(', ')}` : ''}${entry.flags.length ? `; check: ${entry.flags.join('; ')}` : ''}`;
}

// Full id of a commit that exists in one of the repos here; the id as given (lower case) when none has it.
function resolveCommit(given, projectDir) {
  const model = buildModel(projectDir);
  const dirs = unique([...model.repos.map((r) => r.path), projectDir]);
  for (const dir of dirs) {
    const full = runGit(dir, ['rev-parse', '--verify', '-q', `${given}^{commit}`]);
    if (full) return full;
  }
  return given.toLowerCase();
}

function recordChange(opts, { projectDir, cwd, env, out }) {
  const graph = loadGraph(path.join(projectDir, GRAPH_REL));
  if (graph.missing) throw new MapError(`no graph file at ${GRAPH_REL} (looked in ${canonical(projectDir)})`);
  if (graph.problem) throw new MapError(graph.problem);
  const task = graph.tasks.find((t) => t.id === opts.task);
  if (!task) throw new MapError(`no task "${opts.task}" in ${GRAPH_REL}`);
  if (![opts.handback, opts.what, opts.stage, opts.commit, opts.evidence].some((v) => text(v))) throw new MapError('nothing to record: give --handback, --what, --stage, --commit or --evidence');

  const project = readProjectFile(path.join(projectDir, PROJECT_REL));
  const owner = ownerOf(graph, project.doc?.system);
  const role = text(opts.as) || text(env.BGZFLOW_ROLE);
  const prior = isObject(task.change) ? task.change : null;
  if (role.toLowerCase() !== owner.toLowerCase()) {
    const { items } = readItems(opts, cwd, false);
    const offer = items.length ? items : arr(prior?.items).filter(isObject);
    const lines = offer.length ? offer.map(changedLine) : ['Changed: <what> | where: <a, b> | effect: <text>'];
    throw ownerRefusal(`record ${opts.task}${opts.stage ? ` as ${opts.stage}` : ''}`, owner, role, lines);
  }

  const { items: given, notes } = readItems(opts, cwd, true);
  const priorStage = STAGES.includes(prior?.stage) ? prior.stage : 'plan';
  const stage = opts.stage ?? (opts.commit && rank(priorStage) < rank('committed') ? 'committed' : priorStage);
  const entry = { stage, at: new Date().toISOString(), by: role, evidence: text(opts.evidence) || null };
  task.change = {
    ...prior,
    stage,
    commit: opts.commit ? resolveCommit(opts.commit, projectDir) : prior?.commit ?? null,
    items: given.length ? given : arr(prior?.items),
    history: [...arr(prior?.history), entry],
  };
  writeAtomic(graph.file, jsonText(graph.doc));

  const result = buildModel(projectDir).changes.find((c) => c.task === opts.task);
  out(`${opts.task} recorded as ${stage}.`);
  for (const note of notes) out(note);
  for (const flag of result.flags) out(`Check: ${flag}`);
  out(inboxLine(role, result));
}

// The detected deployment a name points at: its name, its file, or the one deployment of a service.
function matchDeployment(name, deployments) {
  const byName = deployments.find((d) => d.name === name) ?? deployments.find((d) => d.file === name);
  if (byName) return byName;
  const ofService = deployments.filter((d) => d.service === name);
  if (ofService.length > 1) throw new MapError(`service ${name} has ${ofService.length} deployments (${ofService.map((d) => d.name).join(', ')}); name one`);
  return ofService[0] ?? null;
}

function confirmLive(opts, { projectDir, env, out }) {
  const project = readProjectFile(path.join(projectDir, PROJECT_REL));
  if (project.problem) throw new MapError(`${project.problem}; nothing changed`);
  const system = isObject(project.doc?.system) ? project.doc.system : {};
  const graph = loadGraph(path.join(projectDir, GRAPH_REL));
  const owner = ownerOf(graph, system);
  const role = text(opts.as) || text(env.BGZFLOW_ROLE);
  const evidence = text(opts.evidence);
  if (role.toLowerCase() !== owner.toLowerCase()) throw ownerRefusal(`live ${opts.deployment}`, owner, role, [`Live: ${opts.deployment} | evidence: ${evidence}`]);

  const inventory = isObject(system.detected) ? system.detected : discover(projectDir);
  const detected = matchDeployment(opts.deployment, arr(inventory.deployments).filter(isObject));
  const name = detected ? detected.name : opts.deployment;
  const entry = { name, active: true, evidence, confirmed_by: role, confirmed_at: new Date().toISOString() };

  const doc = project.doc ?? { schema_version: SCHEMA_VERSION };
  doc.system = isObject(doc.system) ? doc.system : {};
  doc.system.manual = isObject(doc.system.manual) ? doc.system.manual : {};
  const list = arr(doc.system.manual.deployments);
  const at = list.findIndex((d) => isObject(d) && d.name === name);
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  doc.system.manual.deployments = list;
  writeAtomic(path.join(projectDir, PROJECT_REL), jsonText(doc));

  if (!detected) out(`Note: ${name} is not in the detected inventory; recorded as given.`);
  out(`${name} confirmed live.`);
  out(`Inbox line: ${role} confirmed ${name} live: ${evidence}`);
}

// ---- entry ---------------------------------------------------------------------------------------------------------------

export function main(argv, { cwd = process.cwd(), env = process.env, out = (s) => process.stdout.write(`${s}\n`), err = (s) => process.stderr.write(`${s}\n`) } = {}) {
  try {
    const opts = parseArgs(argv);
    if (opts.help) {
      out(USAGE);
      return 0;
    }
    if (opts.command === 'live' && !text(opts.evidence)) throw new MapError('live needs --evidence <text>: what shows it is live (a URL answer, a deploy id)');
    const projectDir = resolveProject(opts, cwd, env);
    if (opts.command === 'record') recordChange(opts, { projectDir, cwd, env, out });
    else if (opts.command === 'live') confirmLive(opts, { projectDir, env, out });
    else {
      const model = buildModel(projectDir);
      out(opts.json ? JSON.stringify(model, null, 2) : opts.brief ? formatBrief(model) : formatView(model));
    }
    return 0;
  } catch (e) {
    err(`map: ${e && e.message ? e.message : e}`);
    return e instanceof MapError ? e.code : 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
