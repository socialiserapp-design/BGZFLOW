import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { alive, resolveSwarmDir } from '../bg-swarm/lib.mjs';
import { localPath, overlayDir, readRoutes, readTables } from '../swarm-resources/config.mjs';

const ACTIVE = new Set(['running', 'queued', 'starting', 'stalled']);
const time = (value) => typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
const normalized = (value) => value.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' ? value : '';
const setting = (value) => text(value).trim() && value !== '(default)' ? value : null;
const STATE_FILES = new Set(['swarm-resources-approved.json', 'swarm-proven-routes.json', 'swarm-current-identities.json']);
const normalGoal = value => text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function taskIdentity(rec, project, workspace, summary) {
  const request = object(rec.request) ? rec.request : {};
  const task = object(rec.task) ? rec.task : object(request.task) ? request.task : {};
  const promptGoal = /^\s*(?:#+\s*)?GOAL\b[ \t]*:?[ \t]*(.+)$/im.exec(text(request.prompt || rec.prompt))?.[1] || '';
  const goal = normalGoal(rec.slug || request.slug || task.slug || rec.goal || request.goal || task.goal || rec.taskId || request.taskId || task.id || promptGoal);
  const owned = rec.ownedFiles || request.ownedFiles || task.ownedFiles || rec.ownedPaths || request.ownedPaths || [];
  const base = normalized(workspace);
  const ownedFiles = [...new Set((Array.isArray(owned) ? owned : []).filter(p => text(p).trim()).map(p => {
    const s = normalized(p).replace(/^\.\//, ''); return s.startsWith(base+'/') ? s.slice(base.length+1) : s;
  }))].sort();
  const weak = !goal && !ownedFiles.length;
  return { key: weak ? JSON.stringify([normalized(project), normalized(workspace), normalGoal(summary)]) : JSON.stringify([normalized(project), goal, ownedFiles]), goal, ownedFiles, weak };
}
function resultLine(rec) {
  const output = text(rec.result?.rawOutput || rec.rawOutput || rec.rendered || (typeof rec.result === 'string' ? rec.result : ''));
  return output.split(/\r?\n/).map(s => s.trim()).find(Boolean)?.slice(0,120) || '';
}

function projectOf(workspace, projects, fallback) {
  if (!workspace) return fallback || 'unknown';
  const root = normalized(workspace);
  const match = projects.filter((p) => root === p.root || root.startsWith(p.root + '/')).sort((a, b) => b.root.length - a.root.length)[0];
  return match?.name || workspace.replace(/\\/g, '/').replace(/\/$/, '').split('/').pop() || fallback || 'unknown';
}

function records(dir, gaps, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (err) { gaps.push(`job directory unreadable: ${dir} (${err.code || 'unknown error'})`); return []; }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < 4) files.push(...records(file, gaps, depth + 1));
      else gaps.push(`job scan depth exceeded: ${file}`);
    } else if (entry.isFile() && entry.name.endsWith('.json') && !STATE_FILES.has(entry.name)) files.push(file);
  }
  return files;
}

export function collectStatus({ env = process.env, home = os.homedir(), overlay = overlayDir(env, home),
  dir = resolveSwarmDir(env, home), project = '', hours = 3, now = Date.now(), isAlive = alive } = {}) {
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('hours must be a finite number above zero');
  const routes = readRoutes({ env, home, overlay });
  const projects = readTables(path.join(overlay, 'PROJECTS.md')).filter((row) => row.project && row.path).map((row) => ({
    name: row.project, root: localPath(row.path, overlay, home),
  })).filter((row) => row.root).map((row) => ({ ...row, root: normalized(row.root) }));
  // Specific overlay sources precede the generic registry, so nested cloud records retain their route.
  const sources = [...routes.filter((r) => r.jobsDir).sort((a, b) => b.jobsDir.length - a.jobsDir.length)
    .map((resource) => ({ dir: resource.jobsDir, resource })), { dir, resource: null }];
  const byId = new Map();
  const mirrored = new Set();
  const gaps = [];
  const coverage = [];
  const invalidIds = [];
  const seen = new Set();
  for (const source of sources) {
    const available = (() => { try { return fs.statSync(source.dir).isDirectory(); } catch { return false; } })();
    coverage.push({ resource: source.resource?.id || 'bg-swarm', dir: source.dir, available });
    for (const file of records(source.dir, gaps)) {
      let canonical;
      try { canonical = fs.realpathSync(file); }
      catch { gaps.push(`job record unavailable: ${file}`); continue; }
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      let rec;
      try { rec = JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch { gaps.push(`job record unreadable or malformed: ${file}`); invalidIds.push(path.basename(file, '.json')); continue; }
      if (!object(rec) || !text(rec.id || rec.name).trim() || !text(rec.status || rec.state).trim() ||
          ['workspaceRoot', 'cwd'].some((key) => rec[key] !== undefined && typeof rec[key] !== 'string') ||
          (rec.request !== undefined && (!object(rec.request) || (rec.request.cwd !== undefined && typeof rec.request.cwd !== 'string')))) {
        gaps.push(`job record missing or malformed identity, state or workspace: ${file}`); invalidIds.push(path.basename(file, '.json')); continue;
      }
      const workspace = rec.workspaceRoot || rec.request?.cwd || rec.cwd || '';
      const resource = source.resource || routes.find((r) => r.id === rec.resource || (r.kind === 'local' && r.cli === rec.host));
      const local = resource?.kind !== 'cloud';
      let pidState = 'unknown';
      if (local && Number.isInteger(rec.pid) && rec.pid > 0) {
        try { pidState = isAlive(rec.pid) ? 'present' : 'not-observed'; } catch { /* Denied probe stays unknown. */ }
      }
      // PID presence can belong to a later process. Records and age cannot prove job ownership.
      const liveness = 'unknown';
      let status = rec.status || rec.state;
      if (status === 'exited' && Number.isInteger(rec.exitCode)) status = rec.exitCode === 0 ? 'completed' : 'failed';
      const active = ACTIVE.has(status);
      const started = time(rec.startedAt ?? rec.createdAt ?? rec.started);
      const ended = time(rec.completedAt ?? rec.cancelledAt ?? rec.updatedAt ?? rec.endedAt ?? rec.started);
      const recordTime = time(rec.updatedAt ?? rec.completedAt ?? rec.cancelledAt ?? rec.endedAt ?? rec.createdAt ?? rec.started);
      const flags = [];
      const ageMinutes = Number.isFinite(started) ? Math.max(0, Math.round((now - started) / 60_000)) : null;
      if (status === 'queued' && ageMinutes > 5) flags.push('STUCK: queued over 5 minutes; reconcile before retry');
      if (status === 'running' && ageMinutes > 180) flags.push('LONG: running over 3 hours');
      const stale = (status === 'queued' && ageMinutes >= 360) || (status === 'running' && ageMinutes > 180);
      if (stale) flags.push('STALE: age warning only; never proves process death');
      if (active && local && pidState !== 'present') { status = 'uncertain'; flags.push('LIVENESS: local PID not observed or unknown; reconcile identity/effects before retry'); }
      if ((active || pidState === 'present') && local) flags.push(`PID: ${pidState}; job ownership unverified (PID may be reused); correlate process start time and job-owned heartbeat`);
      if (active && !local) flags.push('LIVENESS: remote status unverified');
      const unknownTime = !Number.isFinite(started) || started > now || (!active && (!Number.isFinite(ended) || ended > now));
      if (unknownTime) flags.push('UNKNOWN: missing or malformed timestamps');
      const argument = (flag) => {
        const index = Array.isArray(rec.command) ? rec.command.indexOf(flag) : -1;
        return index >= 0 ? setting(rec.command[index + 1]) : null;
      };
      const model = setting(rec.request?.model ?? rec.model ?? argument('--model'));
      const effort = setting(rec.request?.effort ?? rec.effort ?? argument('--effort'));
      if (active && (!model || !effort)) flags.push('SETTINGS: unverified effective model/effort; inspect the actual job');
      for (const [key, actual] of [['model', model], ['effort', effort]]) {
        if (active && resource?.[key] && actual !== resource[key]) flags.push(`${key.toUpperCase()}: ${actual || 'unknown'}; route expects ${resource[key]}`);
      }
      const summary = text(rec.summary || rec.title).replace(/\s+/g, ' ').slice(0, 90);
      const projectName = text(rec.project || rec.request?.project) || projectOf(workspace, projects, '');
      const identity = taskIdentity(rec, projectName, workspace, summary);
      if (identity.weak) flags.push('IDENTITY: weak summary fallback; logical task not recorded');
      const job = { id: rec.id || rec.name, project: projectName, workspace,
        resource: resource?.id || rec.resource || `${rec.host || 'local'}-local`, status, recordedStatus: rec.status || rec.state,
        liveness, pidState, pid: Number.isInteger(rec.pid) && rec.pid > 0 ? rec.pid : null, ageMinutes, model, effort, summary, owner: text(rec.owner) || null,
        criticalPath: typeof rec.criticalPath === 'boolean' ? rec.criticalPath : null,
        waitingOn: text(rec.waitingOn) || null, exitCode: Number.isInteger(rec.exitCode) ? rec.exitCode : null, flags,
        taskId: text(rec.taskId || rec.task_id) || null, record: file, records: [file],
        result: text(rec.resultPath || rec.result || rec.responsePath) || null,
        resultFirstLine: resultLine(rec), resultRecord: file, logicalTask: identity,
        heartbeatAt: text(rec.heartbeatAt) || null, stale, unknown: active || unknownTime,
        active, startedTime: Number.isFinite(started) ? started : null,
        endedTime: active ? now : Number.isFinite(ended) ? ended : null,
        recordTime: Number.isFinite(recordTime) ? recordTime : 0,
      };
      const previous = byId.get(job.id);
      if (previous) {
        mirrored.add(job.id);
        const chosen = job.recordTime > previous.recordTime || (job.recordTime === previous.recordTime && !job.active && previous.active) ? job : previous;
        chosen.records = [...previous.records, file];
        if (!chosen.resultFirstLine) { const output = chosen === job ? previous : job; chosen.resultFirstLine = output.resultFirstLine; chosen.resultRecord = output.resultRecord; }
        if (previous.recordedStatus !== job.recordedStatus || previous.resource !== job.resource) {
          chosen.flags.push('MIRROR: records disagree; newest shown, reconcile durable provider identity');
        }
        byId.set(job.id, chosen);
      } else byId.set(job.id, job);
    }
  }
  const jobs = [...byId.values()].filter((j) => j.active || j.pidState === 'present' || j.endedTime === null || j.endedTime > now || now - j.endedTime <= hours * 3_600_000);
  const attempts = new Map();
  for (const job of jobs) {
    if (!job.logicalTask.key) continue;
    const key = job.logicalTask.key;
    const previous = attempts.get(key) || [];
    for (const other of previous) {
      const timed = [job.startedTime, job.endedTime, other.startedTime, other.endedTime].every((v) => v !== null);
      const overlap = timed ? Math.max(job.startedTime, other.startedTime) < Math.min(job.endedTime, other.endedTime) : job.active && other.active;
      if (overlap) {
        const detail = timed ? 'overlapping attempts of same task' : 'concurrent records of same task; overlap unverified';
        job.flags.push(`DUPLICATE: ${other.id}; ${detail}; owner must reconcile`);
        other.flags.push(`DUPLICATE: ${job.id}; ${detail}; owner must reconcile`);
      }
    }
    previous.push(job); attempts.set(key, previous);
  }
  const shown = jobs.filter((j) => !project || j.project.toLowerCase().includes(project.toLowerCase()));
  return { hours, jobs: shown, gaps, coverage,
    resultRefs: shown.filter(j => !j.active).map(j => ({ id: j.id, status: j.status, firstLine: j.resultFirstLine, recordPath: j.resultRecord, resultPath: j.result })),
    mirroredIds: shown.filter((j) => mirrored.has(j.id)).map((j) => j.id),
    staleIds: shown.filter((j) => j.stale).map((j) => j.id),
    unknownIds: [...shown.filter((j) => j.unknown).map((j) => j.id), ...invalidIds],
    completedIds: shown.filter((j) => j.status === 'completed').map((j) => j.id),
    failedIds: shown.filter((j) => j.status === 'failed').map((j) => j.id),
    cancelledIds: shown.filter((j) => j.status === 'cancelled').map((j) => j.id),
  };
}
