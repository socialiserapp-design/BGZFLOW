#!/usr/bin/env node
// Lists the work-graph tasks that can start now: they are planned or ready, and every dependency has met its gate. Read-only: it never writes.
//   node tools/start-now/start-now.mjs [<project-dir>] [--graph <file>] [--json]
// With no folder it looks upward from the current folder for the project (the nearest .bgzflow, else .git folder); a folder you give wins.
// The graph is JSON: an envelope with a `tasks` array, or the array itself. Default file: <project-dir>/.bgzflow/work-graph.json
// (a relative --graph is read from the current folder). Exit 0: the graph was read, even when nothing can start. Exit 2: bad usage or a graph that cannot be read.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProjectDir } from '../../hooks/lib/project.mjs';

const USAGE = 'usage: start-now [<project-dir>] [--graph <file>] [--json]';
const DEFAULT_GRAPH = path.join('.bgzflow', 'work-graph.json');
const STARTABLE = new Set(['planned', 'ready']);

class StartNowError extends Error {}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// A dependency is met when its prerequisite exists and has reached the gate named on the edge.
function gateMet(dep, byId) {
  const prerequisite = dep && typeof dep === 'object' ? byId.get(dep.id) : undefined;
  if (!prerequisite) return false;
  const integrated = prerequisite.integration?.state === 'integrated';
  if (dep.gate === 'integrated') return integrated;
  if (dep.gate === 'accepted-dependency') return prerequisite.dependency_acceptance?.state === 'accepted' || integrated;
  return false;
}

// Picks, in graph order, the tasks that can start now. `waiting` holds the otherwise-free tasks that still wait on a dependency.
export function selectStartNow(tasks) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ready = [];
  const waiting = [];
  for (const task of tasks) {
    if (task.worker_state != null && !STARTABLE.has(task.worker_state)) continue;
    const deps = Array.isArray(task.dependsOn) ? task.dependsOn : [];
    const unmet = deps.filter((dep) => !gateMet(dep, byId)).map((dep) => (dep && typeof dep === 'object' ? String(dep.id) : String(dep)));
    const outcome = text(task.outcome ?? task.title) || null;
    if (unmet.length) waiting.push({ id: task.id, waitingOn: unmet });
    else ready.push({ id: task.id, outcome });
  }
  return { ready, waiting };
}

// Reads the graph file and returns its task rows; throws StartNowError with a one-line reason.
export function readTasks(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new StartNowError(err.code === 'ENOENT' ? `no graph file at ${file}` : `cannot read ${file} (${err.code || err.message})`);
  }
  let graph;
  try {
    graph = JSON.parse(raw);
  } catch (err) {
    throw new StartNowError(`${file} is not valid JSON (${err.message})`);
  }
  const tasks = Array.isArray(graph) ? graph : graph?.tasks;
  if (!Array.isArray(tasks)) throw new StartNowError(`${file} has no tasks array`);
  const seen = new Set();
  tasks.forEach((task, i) => {
    if (!task || typeof task !== 'object' || typeof task.id !== 'string' || !task.id) throw new StartNowError(`task ${i + 1} in ${file} has no id`);
    if (seen.has(task.id)) throw new StartNowError(`task id ${task.id} appears twice in ${file}`);
    seen.add(task.id);
  });
  return tasks;
}

export function formatStartNow({ ready }) {
  if (!ready.length) return 'Nothing to start now.';
  return ready.map((t) => (t.outcome ? `${t.id}  ${t.outcome.replace(/\s+/g, ' ')}` : t.id)).join('\n');
}

function parseArgs(argv) {
  const opts = { json: false, help: false, graph: null, dir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--graph' || a.startsWith('--graph=')) {
      const value = a === '--graph' ? argv[(i += 1)] : a.slice('--graph='.length);
      if (!value) throw new StartNowError(`--graph needs a file (${USAGE})`);
      opts.graph = value;
    } else if (a.startsWith('-')) throw new StartNowError(`unknown option ${a} (${USAGE})`);
    else if (opts.dir === null) opts.dir = a;
    else throw new StartNowError(`only one project folder allowed (${USAGE})`);
  }
  return opts;
}

export function main(argv) {
  try {
    const opts = parseArgs(argv);
    if (opts.help) {
      console.log(USAGE);
      return 0;
    }
    const project = opts.dir !== null ? path.resolve(opts.dir) : findProjectDir({ cwd: process.cwd() }) ?? path.resolve('.');
    const file = opts.graph ? path.resolve(opts.graph) : path.join(project, DEFAULT_GRAPH);
    const tasks = readTasks(file);
    const picked = selectStartNow(tasks);
    console.log(opts.json ? JSON.stringify({ graph: file.split(path.sep).join('/'), total: tasks.length, ready: picked.ready, waiting: picked.waiting }, null, 2) : formatStartNow(picked));
    return 0;
  } catch (err) {
    console.error(`start-now: ${err.message}`);
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
