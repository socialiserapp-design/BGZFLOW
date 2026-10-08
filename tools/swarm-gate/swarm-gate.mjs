#!/usr/bin/env node
// Exact checks are local. Optional bounded judgments use a configured CLI; never read credentials.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeAtomic } from '../bg-swarm/lib.mjs';
import { discoverResources,saveProven } from '../swarm-resources/lib.mjs';
import { findProjectDir, walkUp } from '../../hooks/lib/project.mjs';
import { readStdin, parseInput } from '../../hooks/lib/io.mjs';
import { redactSecrets } from '../../hooks/lib/secrets.mjs';
import {admitEvidence,evidenceFile} from './admission.mjs';
import {judgeEvent,stopPrefilter,reportedUsage} from './judgment.mjs';
import {qualifiedSetting,tierSetting,selectTierRoute,refreshModelMaps,refreshMapping,launchQualification,collectQualification} from '../swarm-resources/model-map.mjs';
import {resolveSwarmDir} from '../bg-swarm/lib.mjs';
import { resolveHeavyDir } from '../bg-heavy/dir.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ACTIVE = new Set(['starting', 'queued', 'running', 'uncertain', 'stalled']);
const KINDS = new Set(['build', 'fix', 'diagnose', 'check', 'research', 'mechanical']);
const SHA = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i;
export const PRESETS = {
  Small: { jobs: 8, workerHours: 4, reserve: { jobs: 3, workerHours: 1.5 } },
  Medium: { jobs: 20, workerHours: 12, reserve: { jobs: 5, workerHours: 4 } },
  Large: { jobs: 48, workerHours: 32, reserve: { jobs: 8, workerHours: 8 } },
};
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = v => typeof v === 'string' ? v : '';
const validId = s => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(s);
const digest = s => createHash('sha256').update(s).digest('hex');
const clock = () => new Date().toISOString();
const safe = s => redactSecrets(str(s)).replace(/\b(?:sk-|xai-|ghp_|github_pat_)[A-Za-z0-9_-]+/g, '[redacted]').replace(/((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]');
const allow = () => ({ allowed: true });
const block = (rule, reason, next, extra = {}) => ({ allowed: false, rule, reason: safe(reason), next: safe(next), ...extra });

function heavyHeld(env = process.env) {
  const directory = resolveHeavyDir(env);
  try {
    return fs.readdirSync(directory).some((name) => /^slot-\d+\.json$/.test(name));
  } catch {
    return false;
  }
}

export function resourcePreflight(command, cwd, env = process.env, dependencies = {}) {
  const line = str(command);
  const heavy = /\bbg-heavy\b|\bnpm\s+test\b|scripts[/\\]test-all\.mjs|\b(?:eas\s+build|gradlew\b)/i.test(line);
  const nativeBuild = /\beas\s+build\b|\bgradlew\b|\bxcodebuild\b/i.test(line);
  const archive = /\bcodex\b[^\n;&|]*\barchive\b/i.test(line);
  if (heavy) {
    const output = path.resolve(env.BGZFLOW_OUTPUT_PATH || cwd || process.cwd());
    const stats = (dependencies.statfs || fs.statfsSync)(output);
    const freeBytes = dependencies.freeBytes ?? stats.bavail * stats.bsize;
    if (freeBytes < 10 * 1024 ** 3) {
      return block('disk', 'The heavy launch output volume has less than 10 GB free.', 'Free or move at least 10 GB, then retry this same launch.');
    }
    const held = dependencies.heavyHeld ? dependencies.heavyHeld() : heavyHeld(env);
    if (held && !env.BG_HEAVY) {
      return block('heavy', 'The one local heavy slot is already held.', 'Wait for the current bg-heavy owner to finish, then retry this launch.');
    }
  }
  if (nativeBuild) {
    const plan = str(env.EXPO_PLAN || 'starter').toLowerCase();
    const slots = Number(env.BGZFLOW_BUILD_SLOTS || (plan === 'starter' ? 1 : 0));
    const active = Number(env.BGZFLOW_BUILDS_ACTIVE || 0);
    const queued = Number(env.BGZFLOW_BUILDS_QUEUED || 0);
    if (Number.isInteger(slots) && slots > 0 && active + queued >= slots) {
      return block('build-slot', `The provider build slot is occupied (${active} active, ${queued} queued, ${slots} allowed).`, 'Wait for the recorded provider build to finish, then retry this native build.');
    }
  }
  if (archive) {
    const match = /(?:--count(?:=|\s+)|\barchive\s+)(\d+)/i.exec(line);
    const count = Number(match?.[1] || 0);
    if (count > 20) {
      return block('archive', `Codex app bulk archive requested ${count} threads; the safe limit is 20.`, 'Close Codex, back up state_5.sqlite, and use the offline cleanup route.');
    }
  }
  return allow();
}
function read(file, max = 1_048_576, encoding = 'utf8') {
  const credential = p => /(?:^|[/\\])(?:auth\.json|\.env(?:\..*)?)$|[/\\]credentials[/\\]/i.test(p);
  if (credential(file) || credential(fs.realpathSync(file))) throw new Error('credential path refused');
  if (fs.statSync(file).size > max) throw new Error('input exceeds bounded gate size');
  return fs.readFileSync(file, encoding);
}
function json(file) { return JSON.parse(read(file)); }
function optional(file) { try { return json(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
function folder(project) { return path.join(project, '.bgzflow', 'swarms'); }
export function resolveSwarmProject(input = {}, env = process.env) {
  const lead = findProjectDir(input, env), worker = walkUp(input.workerCwd || input.tool_input?.workdir || input.tool_input?.cwd);
  const common = root => {
    if (!root) return null;
    const marker = path.join(walkUp(root), '.git');
    try {
      if (!fs.statSync(marker).isFile()) return null;
      const gitdir = /^gitdir:\s*(.+)/m.exec(read(marker, 4096))?.[1];
      if (!gitdir) return null;
      const admin = path.resolve(path.dirname(marker), gitdir.trim());
      const shared = path.resolve(admin, read(path.join(admin, 'commondir'), 4096).trim());
      return path.basename(shared) === '.git' ? path.dirname(shared) : null;
    } catch { return null; }
  };
  return [lead, common(lead), worker, common(worker)].find(p => p && fs.existsSync(folder(p))) || lead;
}
function ledgerFile(project, swarm) { if (!validId(swarm)) throw new Error('invalid swarm ID'); return path.join(folder(project), swarm+'.json'); }
function ledgers(project) {
  let files; try { files = fs.readdirSync(folder(project)); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  return files.filter(f => f.endsWith('.json')).map(f => {
    const file = path.join(folder(project), f), state = json(file);
    if (!object(state) || state.schemaVersion !== 1 || !validId(state.swarm) || !Array.isArray(state.dispatches)) throw new Error('swarm ledger malformed');
    return { file, state };
  }).filter(s => s.state.active);
}
function priorReviews(project,releaseId){
  let files;try{files=fs.readdirSync(folder(project));}catch(e){if(e.code==='ENOENT')return [];throw e;}
  return files.filter(f=>f.endsWith('.json')).flatMap(f=>{const s=json(path.join(folder(project),f));return (s.releaseId||s.swarm)===releaseId?[...(s.reviewHistory||[]),...(s.dispatches||[]).filter(j=>j.kind==='check'&&j.stage==='review').map(j=>j.id),...(s.reviewCompleted?[s.reviewCompleted.evidence]:[])]:[];});
}
function choose(project, id) {
  const found = ledgers(project).filter(x => !id || x.state.swarm === id);
  if (found.length > 1) throw new Error('select the exact swarm ID; multiple active swarms');
  return found[0] || null;
}
function transaction(project, action) {
  fs.mkdirSync(folder(project), { recursive: true });
  const lock = path.join(folder(project), '.lock');
  try { fs.mkdirSync(lock); } catch (e) { if (e.code === 'EEXIST') return block('busy', 'Another gate mutation owns the ledger.', 'Retry this same gate operation after the current mutation returns.'); throw e; }
  try { return action(); } finally { fs.rmdirSync(lock); }
}
function persist(entry) { entry.state.updatedAt = clock(); writeAtomic(entry.file, entry.state); }
function human(value) { return !!str(value.authorisedBy).trim() && !!str(value.reason).trim() && !!str(value.chatRef).trim(); }
function validateLimit(value) {
  if (!object(value) || !Number.isInteger(value.jobs) || value.jobs < 1 || !Number.isFinite(value.workerHours) || value.workerHours <= 0 ||
      (value.providerPercent !== undefined && (!Number.isFinite(value.providerPercent) || value.providerPercent <= 0 || value.providerPercent > 100))) throw new Error('limit needs positive job count and worker-hours; optional readable allowance percentage is 1–100');
  return { jobs: value.jobs, workerHours: value.workerHours, ...(value.providerPercent !== undefined ? { providerPercent: value.providerPercent } : {}) };
}
function policyFor(project, config, env) {
  return config.policy || optional(path.join(project, '.bgzflow', 'swarm-policy.json')) ||
    optional(env.BGZFLOW_SWARM_POLICY || path.join(os.homedir(), '.bgzflow', 'swarm-policy.json')) || json(path.join(ROOT, 'templates', 'swarm-policy.json'));
}
function normalOwns(owns, cwd) {
  if (!Array.isArray(owns) || owns.some(p => !str(p).trim())) throw new Error('OWNS must be an array of paths');
  return [...new Set(owns.map(p => {
    const root = path.resolve(cwd), full = path.resolve(root, p);
    let relative = path.relative(root, full);
    if (!relative || relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) throw new Error('owned path escapes the worktree or owns its entire root');
    // Existing symlink parents cannot redirect a worker into another tree.
    let parent = full;
    while (!fs.existsSync(parent) && parent !== path.dirname(parent)) parent = path.dirname(parent);
    const canonicalRoot = fs.realpathSync(root), canonicalParent = fs.realpathSync(parent);
    const boundary = path.relative(canonicalRoot, canonicalParent);
    if (boundary === '..' || boundary.startsWith('..'+path.sep) || path.isAbsolute(boundary)) throw new Error('owned path follows a symlink outside the worktree');
    relative = path.relative(canonicalRoot, path.resolve(canonicalParent, path.relative(parent, full))).replace(/\\/g, '/').replace(/\/$/, '');
    return process.platform === 'win32' ? relative.toLowerCase() : relative;
  }))].sort();
}
const overlaps = (a,b) => a === b || a.startsWith(b+'/') || b.startsWith(a+'/');

export function startSwarm(project, swarm, config, env = process.env) {
  return transaction(project, () => {
    const file = ledgerFile(project, swarm), existing = optional(file);
    if (existing?.active) return existing; // Reconciliation never overwrites an in-flight ledger.
    if (existing) throw new Error('swarm ID already used; retain its completed ledger and choose a new ID');
    if (!object(config) || !SHA.test(config.wave0Sha) || !object(config.pieces) || !Object.keys(config.pieces).length) throw new Error('start needs wave-0 SHA and every piece with owned paths');
    if (!Array.isArray(config.resources) || !config.resources.length || config.resources.some(id => !validId(id))) throw new Error('approve a nonempty resource set');
    const preset = typeof config.limit === 'string' ? PRESETS[config.limit] : null;
    if (typeof config.limit === 'string' && !preset) throw new Error('unknown usage preset');
    const limit = validateLimit(preset || config.limit), reserve = config.reserve || preset?.reserve || { jobs: 3, workerHours: 1.5 };
    if (!Number.isInteger(reserve.jobs) || reserve.jobs < 0 || !Number.isFinite(reserve.workerHours) || reserve.workerHours < 0 || reserve.jobs >= limit.jobs || reserve.workerHours >= limit.workerHours) throw new Error('reserve must fit inside the approved limit');
    const policy = policyFor(project, config, env);
    if (!object(policy.providers) && (!Array.isArray(policy.models) || !policy.models.length || !object(policy.efforts) || !Array.isArray(policy.efforts.default) || !policy.efforts.default.length)) throw new Error('policy needs provider tier mappings or an explicit legacy model/effort policy');
    const pieces = {};
    for (const [id, piece] of Object.entries(config.pieces)) {
      if (!validId(id) || !object(piece)) throw new Error('invalid piece identity');
      pieces[id] = { owns: normalOwns(piece.owns, project), status: 'pending',goal:safe(piece.goal||id) };
    }
    const releaseId=config.releaseId||swarm;if(!validId(releaseId))throw new Error('release ID must be stable and valid');
    const state = { schemaVersion: 1, swarm, active: true, createdAt: clock(), project,
      releaseId,reviewHistory:[...new Set(priorReviews(project,releaseId))],uiChanging:config.uiChanging===true,designOwner:safe(config.designOwner||'founder'),candidateIsRepair:false,
      approvedResources: [...new Set(config.resources)], limit, reserve, policy, wave0Sha: config.wave0Sha,
      pieces, dispatches: [], failures: {}, candidateSha: null, results: {}, findings: {}, fixWaves: 0,
      overrides: [], blocked: {}, notices: {}, waveOpen: false, releasePatterns: config.releasePatterns || [], suitePatterns: config.suitePatterns || [],
      acceptanceScript:config.acceptanceScript||[],judgments:[],warnings:[],modelMap:structuredClone(config.modelMap||{providers:policy.providers||{}}) };
    writeAtomic(file, state);
    writeAtomic(path.join(project, '.bgzflow', 'swarm-defaults.json'), { resources: state.approvedResources, limit, reserve });
    return state;
  });
}

// Tokenization is inspection only: never evaluate shell text. Compound launches are rejected.
export function tokens(command) { return str(command).match(/(?:"(?:[^"\\]|\\.)*"|'[^']*'|[^\s"'])+/g)?.map(s => s.replace(/^(["'])(.*)\1$/s, '$2').replace(/\\"/g, '"')) || []; }
function segments(command) {
  const result = []; let start = 0, quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (c === '`' || (c === '\\' && command[i+1] === quote)) { i++; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (';&|\n'.includes(c)) { if (command.slice(start,i).trim()) result.push(command.slice(start,i).trim()); start = i+1; }
  }
  if (command.slice(start).trim()) result.push(command.slice(start).trim());
  return result;
}
const executable = t => path.basename(str(t)).replace(/\.(?:exe|cmd|ps1)$/i, '').toLowerCase();
function invocation(segment) {
  let t = tokens(segment);
  if (t[0] === '&') t = t.slice(1);
  if (t[0] === 'env') t = t.slice(1);
  while (/^[A-Z_][A-Z0-9_]*=/i.test(t[0] || '')) t = t.slice(1);
  return t;
}
function gateOnly(command) {
  const parts = segments(command); if (parts.length !== 1) return false;
  const t = invocation(parts[0]), first = executable(t[0]), i = first === 'node' ? 1 : 0;
  return executable(t[i]).replace(/\.mjs$/, '') === 'swarm-gate' && /^(?:start|record|dispatch|check-[\w-]+|status|presets|refresh-models)$/.test(t[i+1] || '');
}
function option(t, name) { const i = t.findIndex(s => s === name || s.startsWith(name+'=')); const value = i < 0 ? null : t[i].startsWith(name+'=') ? t[i].slice(name.length+1) : t[i+1]; return typeof value === 'string' ? value.replace(/^(["'])(.*)\1$/s,'$2') : value; }
function configOption(t, name) { const re = new RegExp('^'+name+'=["\x27]?(.*?)["\x27]?$'); return t.map(s => re.exec(s)).find(Boolean)?.[1] || null; }
function readBrief(file, cwd) {
  if (!str(file).trim()) return { error: 'Dispatch needs --prompt-file (native workers: SWARM-BRIEF: path in their prompt).' };
  let body; try { body = read(path.resolve(cwd, file), 65_536); } catch { return { error: 'Brief is missing, unreadable, too large or a credential path.' }; }
  const header = {};
  const lines = body.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) break;
    const m = /^([A-Z_]+):\s*(.*)$/.exec(line); if (!m || header[m[1]] !== undefined) return { error: 'Brief must start with a unique SWARM, PIECE, KIND and OWNS header.' };
    header[m[1]] = m[2];
  }
  if (!validId(header.SWARM) || !validId(header.PIECE) || !KINDS.has(header.KIND) || header.OWNS === undefined) return { error: 'Brief needs SWARM, PIECE, KIND and OWNS.' };
  let owns; try { owns = JSON.parse(header.OWNS); } catch { return { error: 'OWNS must be a JSON array of owned files.' }; }
  const missing = ['bg-efficiency', 'test-driven-development', 'systematic-debugging', 'verification-before-completion'].filter(s => !new RegExp('\\b'+s+'\\b', 'i').test(body));
  if (missing.length || !/\bfast checks only\b/i.test(body) || !/\bproof handback\b/i.test(body)) return { error: 'Brief needs the quality skills, fast checks only and proof handback.' };
  return { swarm: header.SWARM, piece: header.PIECE, kind: header.KIND, owns, body,
    readOnly: header.READ_ONLY === 'true', unsplit: header.UNSPLIT === 'true', targetKind: header.TARGET_KIND,crossFamily:header.CROSS_FAMILY==='true',qualification:header.QUALIFICATION==='true',
    stage: header.CHECK || 'review',releaseId:header.RELEASE_ID,reviewTarget:header.REVIEW_TARGET||'candidate', hours: header.HOURS ? Number(header.HOURS) : null, file: path.resolve(cwd, file) };
}
function workerResource(command, t, input) {
  return nativeResource(input.toolName) || identifiableResource(command) || input.resource || option(t,'--resource') || 'codex-local';
}
function nativeResource(name) {
  if (['Agent','Task'].includes(name)) return 'claude-local';
  if (/^mcp__codex_apps__/i.test(name || '')) return null;
  return /(?:codex|claudex).*(?:task|exec)$|(?:task|exec).*(?:codex|claudex)/i.test(name || '') ? 'codex-local' : null;
}
function identifiableResource(command) {
  for (const part of segments(command)) {
    const t=invocation(part), exe=executable(t[0]);
    if (exe==='codex') return t[1]==='cloud' && t[2]==='exec' ? 'codex-cloud' : 'codex-local';
    if (exe==='cx' && t[1]==='task') return 'codex-local';
    if (['grok','kimi','claude'].includes(exe)) return exe+'-local';
    if (exe.replace(/\.mjs$/,'')==='bg-swarm' || (exe==='node' && executable(t[1]).replace(/\.mjs$/,'')==='bg-swarm')) {
      const host=option(t,'--host'); if(host && host!=='custom') return host+'-local';
    }
  }
  return null;
}
function corrected(command, model, effort, readOnly,setting={}) {
  let result = command;
  const modelFlag = setting.modelFlag||(/(?:^|\s)-m(?:\s|=)/.test(command) && !command.includes('--model') ? '-m' : '--model');
  const effortFlag = setting.effortFlag|| (command.includes('--reasoning-effort') ? '--reasoning-effort' : '--effort');
  for (const [flag, value, config] of [[modelFlag, model, 'model'], [effortFlag, effort, 'model_reasoning_effort']]) {
    const re = new RegExp(flag+'(?:=|\\s+)(?:"[^"]*"|\x27[^\x27]*\x27|[^\\s;]+)');
    if (re.test(result)) result = result.replace(re, flag+' '+value);
    else {
      const c = new RegExp(config+'=["\x27]?[^"\x27\\s;]+["\x27]?');
      if (c.test(result)) result = result.replace(c, config+'="'+value+'"');
      else result += config === 'model_reasoning_effort' && /\bcodex(?:\.exe)?\s+(?:exec|cloud\s+exec)\b/i.test(command) ? ' -c model_reasoning_effort="'+value+'"' : ' '+flag+' '+value;
    }
  }
  if(effort==='none')result=result.replace(/\s+--(?:reasoning-)?effort(?:=|\s+)(?:"[^"]*"|'[^']*'|[^\s;]+)/g,'');
  if(setting.thinking){result=result.replace(/\s+--no-thinking\b|\s+--thinking(?:=|\s+)(?:true|false)\b|\s+--thinking\b/g,'');result+=' --thinking';}
  if (readOnly) {
    result = result.replace(/\s+--(?:write|yolo|dangerously-skip-permissions|dangerously-bypass-approvals-and-sandbox|full-auto)\b/g, '')
      .replace(/\s+--(?:always-approve|no-plan)\b/g,'')
      .replace(/\s+--permission-mode(?:=|\s+)(?:"[^"]*"|'[^']*'|[^\s;]+)/g,'')
      .replace(/\s+(?:--sandbox|-s)(?:=|\s+)(?:"[^"]*"|'[^']*'|[^\s;]+)/g, '')
      .replace(/\s+-c\s+sandbox_mode=(?:"[^"]*"|'[^']*'|[^\s;]+)/g, '');
    if (/\bcodex(?:\.exe)?\s+exec\b/i.test(result)) result += ' --sandbox read-only';
    else if (/\b(?:grok|claude)(?:\.exe)?\s/i.test(result)) result += ' --permission-mode plan';
    else if (/\bkimi(?:\.exe)?\s/i.test(result)) result += ' --plan';
  }
  return safe(result);
}
export function failureCause(error) {
  if(/model[- ]not[- ]found|unknown model|deprecated|missing (?:key|credential|dependency|executable)|ENOENT|not installed|authentication|login|permission denied|access denied|unauthori[sz]ed|\b40[13]\b/i.test(error))return 'environment';
  if(/flaky|infrastructure|timing|test timeout|port.*(?:busy|in use)|resource contention/i.test(error))return 'flaky';
  if(/unclear|ambiguous|specification|acceptance contract|contract mismatch|requirement.*missing/i.test(error))return 'spec';
  return /assert|logic|bug|wrong|mismatch|exception|TypeError|ReferenceError/i.test(error)?'logic':'unknown';
}
const sameGoal=(a,b)=>str(a).trim()&&str(a).toLowerCase().replace(/\W+/g,' ').trim()===str(b).toLowerCase().replace(/\W+/g,' ').trim();
export const diagnosisRoute=(routes,preference,failedFamily)=>selectTierRoute(routes,preference,'heavy-read',{differentFamily:failedFamily});
function mappingFor(state,id){const card=(state.modelUpdates||state.modelMap)?.providers?.[id]||state.policy.providers?.[id],mapping=card?.mapping||card?.tiers;if(!mapping)return null;const failed=state.modelRefreshNeeded?.[id]?.model;if(!failed)return mapping;
  return Object.fromEntries(Object.entries(mapping).map(([tier,s])=>[tier,[s,card.previous?.mapping?.[tier],...(state.policy.providers?.[id]?.fallbacks?.[tier]||[])].find(s=>s&&s.model!==failed&&(!card.listing?.models?.length||card.listing.models.some(m=>m.id===s.model)))||null]));
}
export function refreshModels(project,swarm,{env=process.env,runner,launchRunner,now=Date.now()}={}) {
  const pending=[];
  const prepared=transaction(project,()=>{
    const entry=choose(project,swarm);if(!entry)return block('swarm','No active swarm matches this refresh.','Start and approve the swarm before qualification.');
    const s=entry.state;if(s.policy.modelUpdates?.enabled!==true)return {allowed:true,disabled:true,warning:'Automatic model updating is off; retain approved qualified tier mappings.'};
    const dir=resolveSwarmDir(env),resources=discoverResources({cwd:project,env,swarm:s.swarm,ids:s.approvedResources}).resources;
    const discoveryPolicy=structuredClone(s.policy);for(const [id,failed]of Object.entries(s.modelRefreshNeeded||{})){discoveryPolicy.providers[id]||={};discoveryPolicy.providers[id].lastError=failed.error;}
    const map=refreshModelMaps(resources,discoveryPolicy,{dir,runner,now});s.modelUpdates=map;s.qualifications||={};
    for(const r of resources){const card=map.providers[r.id];if(!card)continue;
      // Qualify each distinct setting once: light and heavy-read can have different flags.
      const proposed=card.proposal||card.mapping||{},seen=new Set();
      for(const setting of [...Object.values(proposed),...(card.qualification||[]).map(q=>q.setting)].filter(Boolean)){
        const signature=JSON.stringify(setting);if(seen.has(signature)||qualifiedSetting(setting,r.settingProofs))continue;seen.add(signature);
        const id='qual-'+digest(JSON.stringify({swarm:s.swarm,resource:r.id,account:r.account,environment:r.environment,setting})).slice(0,24);
        if(s.qualifications[id])continue;
        const used=usage(s),within=used.jobs+1+s.reserve.jobs<=s.limit.jobs&&used.workerHours+0.03+s.reserve.workerHours<=s.limit.workerHours;
        if(!within||!r.installed||!r.observationValid||r.authenticated!==true){s.warnings.push({at:clock(),message:r.id+': qualification held for current-account observation or remaining non-reserve budget.'});continue;}
        const route=s.policy.providers?.[r.id]||{},command=route.qualificationCommand||(r.kind==='local'&&['codex','claude','grok','kimi'].includes(r.cli)?[process.execPath,path.join(ROOT,'tools/swarm-resources/qualify-provider.mjs'),'--host',r.cli,'--id',id]:null);
        if(!command){s.warnings.push({at:clock(),message:r.id+': configure a supported qualificationCommand before using the new model.'});continue;}
        const piece='qualification-'+id.slice(5),promptFile=path.join(project,'.bgzflow','qualifications',id+'.md');
        const request={id,resource:r.id,swarm:s.swarm,piece,setting,account:r.account,environment:r.environment,status:'starting'};
        s.qualifications[id]=request;s.pieces[piece]={owns:[],goal:'One small exact-flags qualification',status:'deferred',reason:'Route qualification is not a product piece.'};
        s.dispatches.push({id,piece,kind:'mechanical',qualification:true,resource:r.id,model:setting.model,effort:setting.effort,thinking:setting.thinking,owns:[],readOnly:true,unsplit:true,promptFile,reservedHours:0.03,startedAt:clock(),status:'starting',account:r.account,environment:r.environment,requestHash:null});
        pending.push({request,route:{...route,qualificationCommand:command}});
      }
    }
    s.warnings=s.warnings.slice(-25);persist(entry);return {allowed:true,qualifications:pending.map(p=>p.request),warnings:map.warnings};
  });
  if(!prepared.allowed)return prepared;
  for(const {request,route}of pending){const result=launchQualification(project,request,route,{approved:true,withinLimit:true,...(launchRunner?{runner:launchRunner}:{})});
    transaction(project,()=>{const entry=choose(project,swarm),s=entry.state,j=s.dispatches.find(j=>j.id===request.id);if(ACTIVE.has(j.status))j.status=result.status==='held'?'uncertain':result.status;s.qualifications[request.id].status=j.status;persist(entry);});
    if(result.result){recordState(project,'qualification',{...result.result,id:request.id},swarm,{env});}
  }
  return prepared;
}
function judgment(state,event,runner){
  const feature=event.event==='failure'?'classification':event.event;
  if(state.policy.jev?.enforcement?.[feature]===false)return {decision:'pass',called:false};
  if(event.event==='dispatch'){const e=state.policy.jev?.enforcement||{};event={...event,checkBrief:event.checkBrief!==false&&e.brief!==false,failed:e.retries===false?[]:event.failed,running:e.duplicate===false?[]:event.running,classify:e.classification!==false};}
  const r=judgeEvent(state.project,state.policy.jev,event,{...(runner?{runner}: {})});
  if(r.called&&!r.cached){state.judgments||=[];state.judgments.push({event:event.event,at:clock(),usage:r.usage||null,model:r.model||null,ms:r.ms,decision:r.decision});}
  if(r.warning||r.decision==='warn'){state.warnings||=[];state.warnings.push({at:clock(),message:r.warning||r.reasons.join('; ')});state.warnings=state.warnings.slice(-25);}return r;
}
function retryGate(failed,piece,kind){
  if(failed?.needsHuman)return block('human-failure','The attempt failed after root-cause diagnosis.','Report the failure and recommendation to the human and preserve completed work.');
  if(failed?.count>=2&&!failed.remediated&&(!failed.rootCause||failed.rootCause.used)){
    if(['environment','flaky','spec'].includes(failed.cause))return block(failed.cause,'Two failures are caused by '+failed.cause+'; changing the model cannot resolve this.','The AI lead must repair the environment/access, flaky infrastructure or contract and record remediation evidence.');
    return block('diagnose','This logical step has failed twice.','Dispatch one read-only KIND diagnose job for '+piece+' with TARGET_KIND '+kind+'.');
  }return allow();
}
function integration(state, sha) {
  if (!state.candidateSha || (sha && sha !== state.candidateSha) || Object.values(state.pieces).some(p => !['returned', 'deferred'].includes(p.status)) || state.dispatches.some(j => ACTIVE.has(j.status) && j.kind !== 'check')) return block('integration', 'Every piece must be returned or explicitly deferred and one integration SHA recorded.', 'Collect all build results, integrate once and record the candidate SHA.');
  return allow();
}
function stageGate(state, stage, sha) {
  const complete = integration(state, sha); if (!complete.allowed) return complete;
  if (!['suite','journey','rehearsal','review'].includes(stage)) return block('check', 'Unknown check stage.', 'Select suite, journey, rehearsal or review.');
  if (stage === 'suite') return allow();
  if(stage==='rehearsal')return state.fullSuite?.status==='passed'||state.results.suite?.status==='passed'?allow():block('suite','Freeze and run the full suite before the first real-platform rehearsal.','Run and record the full suite once on the combined candidate.');
  if(stage==='review')return reviewGate(state);
  const previous = stage === 'journey' ? 'suite' : 'journey';
  if (state.results[previous]?.sha !== state.candidateSha || state.results[previous]?.status !== 'passed') return block(previous, 'Checks run in order: integration, full suite, journey, review.', 'Run and record the '+previous+' on '+state.candidateSha+'.');
  // Review requires suite as well, even if a later suite failure invalidates an old journey.
  if (stage === 'review' && state.results.suite?.status !== 'passed') return block('suite', 'The current full suite has not passed.', 'Run and record the suite on '+state.candidateSha+'.');
  return allow();
}
function reviewGate(state,{claimedId,target,releaseId,record=false}={}){
  if(releaseId&&releaseId!==state.releaseId)return block('review-limit','The brief changes the recorded release ID.','Use the existing stable release ID '+state.releaseId+'.');
  if(target==='repair'||state.candidateIsRepair||state.fixWaves>0)return block('review-repair','A repair is proved by rerunning the rehearsal, never another independent review.','Run the golden journeys and rollback on this repaired SHA and record the rehearsal.');
  if((state.reviewHistory||[]).length||state.reviewCompleted||(!record&&state.dispatches.some(j=>j.kind==='check'&&j.stage==='review'&&j.id!==claimedId)))return block('review-limit','This release already has its one independent review.','Resolve reproduced blocker-class findings with the same owner and rerun the rehearsal; put other findings after-launch.');
  const r=state.results.rehearsal;
  if(r?.sha!==state.candidateSha||r.status!=='passed'||r.rollbackProven!==true)return block('rehearsal','Real-platform golden journeys and one rollback must pass before the single review.','Rehearse this exact candidate on the target platform and record its golden journeys and rollback evidence.');
  return allow();
}
function usage(state) {
  return { jobs: state.dispatches.length, workerHours: state.dispatches.reduce((sum, j) => sum + (ACTIVE.has(j.status) ? Math.max(j.reservedHours, (Date.now()-Date.parse(j.startedAt))/3_600_000) : j.workerHours ?? j.reservedHours), 0) };
}
function allowance(resources) {
  return Object.fromEntries(resources.map(r => {
    const a = r.allowance, available = a?.available === true && Number.isFinite(a.usedPercent) && a.usedPercent >= 0 && a.usedPercent <= 100 && str(a.source) && Number.isFinite(Date.parse(a.at)) && Date.now()-Date.parse(a.at) <= 300_000 && Date.parse(a.at) <= Date.now();
    return [r.id, available ? { available: true, usedPercent: a.usedPercent, source: a.source, at: a.at } : { available: false, reason: 'provider allowance unavailable; job count and worker-hours remain enforced' }];
  }));
}
function dispatchCheck(entry, input, env) {
  const state = entry.state, command = str(input.command), t = tokens(command), cwd = input.cwd || state.project;
  const file = input.promptFile || option(t, '--prompt-file') || /^\s*SWARM-BRIEF:\s*(.+)$/m.exec(str(input.prompt))?.[1];
  const b = readBrief(file, cwd);
  if (b.error) return block('brief', b.error, 'Write the required brief header, quality skills, fast-check rule and proof handback, then retry this dispatch.');
  const preflight = resourcePreflight(command, cwd, env, input.preflightDependencies);
  if (!preflight.allowed) return preflight;
  if (b.swarm !== state.swarm || !state.pieces[b.piece]) return block('brief', 'Brief swarm or piece does not match the ledger.', 'Use the recorded swarm and piece in the brief.');
  const fullSuite = /\bfull[- ]suite\b|\bnpm test\b|scripts[/\\]test-all\.mjs/i.test(b.body);
  if (b.kind === 'check' || fullSuite) {
    if(b.kind==='check'&&b.stage==='review'){const review=reviewGate(state,{claimedId:input.claimedId,target:b.reviewTarget,releaseId:b.releaseId});if(!review.allowed)return review;}
    const gate = b.kind==='check'&&b.stage==='review'?integration(state,state.candidateSha):stageGate(state, fullSuite ? 'suite' : b.stage, state.candidateSha); if (!gate.allowed) return gate;
    if (fullSuite && b.kind !== 'check') return block('check', 'A full suite must use KIND check and CHECK suite.', 'Dispatch this suite as a read-only check on the integrated SHA.');
  }
  const model = option(t, '--model') || option(t, '-m') || configOption(t, 'model') || input.model;
  let effort = option(t, '--effort') || option(t, '--reasoning-effort') || configOption(t, 'model_reasoning_effort') || input.effort;
  const otherJobs = state.dispatches.filter(j => j.id !== input.claimedId);
  const goal=state.pieces[b.piece].goal,resource=workerResource(command,t,input);
  let key=input.logicalKey||b.piece+':'+b.kind;
  const identical=Object.keys(state.failures).find(k=>k.endsWith(':'+b.kind)&&sameGoal(state.pieces[k.split(':')[0]]?.goal,goal));if(identical)key=identical;
  let failed=state.failures[key];
  if(!input.claimedId&&b.kind!=='diagnose'){const gate=retryGate(failed,key.split(':')[0],b.kind);if(!gate.allowed)return gate;}
  const target=b.kind==='diagnose'?state.failures[b.piece+':'+b.targetKind]:failed;
  if(failed?.rootCause&&!failed.rootCause.used&&!b.body.includes(failed.rootCause.note))return block('root-cause','The repair brief must include the recorded Cause and Evidence note.','Include the root-cause note in this same worker brief.');
  const tier=b.kind==='mechanical'?'light':b.kind==='diagnose'||b.kind==='research'?'heavy-read':failed?.rootCause?'heavy-write':'standard';
  const qualification=b.qualification&&Object.values(state.qualifications||{}).find(q=>q.piece===b.piece&&q.resource===resource);
  if(b.qualification&&(!qualification||!ACTIVE.has(qualification.status)||!b.readOnly||!b.unsplit||b.owns.length||b.kind!=='mechanical'))return block('qualification','Only the registered small read-only qualification can bootstrap new flags.','Use the gate-created qualification job and brief.');
  const pinned=input.claimedId&&state.dispatches.find(j=>j.id===input.claimedId)?.mappingSetting;
  const mapping=pinned?{[tier]:pinned}:mappingFor(state,resource),required=qualification?.setting||mapping?.[tier],tiered=object(state.policy.providers);
  if(tiered&&!required)return block('policy','This provider has no approved mapping for '+tier+'.','Discover, propose and qualify this provider at '+tier+' before dispatch.');
  if(tiered&&required.effort==='none'&&!effort)effort='none';
  const permitted=tiered?[required.effort]:state.policy.efforts[b.kind]||state.policy.efforts.default;
  const models=tiered?[required.model]:state.policy.models,modelOk=str(model).trim()&&model!=='(default)'&&(models.includes('*')||models.includes(model));
  const legacyRead=(state.policy.efforts?.research||[]).filter(e=>!state.policy.efforts.default.includes(e));
  const singleRead=required?.readOnly||required?.selfSplit||legacyRead.includes(effort);
  const ultraOk=!singleRead||((qualification||['research','diagnose'].includes(b.kind))&&b.readOnly&&b.unsplit&&!otherJobs.some(j=>j.piece===b.piece&&j.kind===b.kind&&j.resource===resource));
  const permission = option(t,'--permission-mode'), sandbox = option(t,'--sandbox') || option(t,'-s') || configOption(t,'sandbox_mode');
  const writeConflict = b.readOnly && (t.some(v => /^--(?:write|yolo|always-approve|no-plan|dangerously-skip-permissions|dangerously-bypass-approvals-and-sandbox|full-auto)(?:=true)?$/i.test(v)) || /^(?:acceptEdits|auto|dontAsk|bypassPermissions)$/i.test(permission || '') || /^(?:workspace-write|danger-full-access)$/i.test(sandbox || ''));
  const thinking=t.some(v=>v==='--thinking'||v==='--thinking=true')&&!t.includes('--no-thinking')&&!t.includes('--thinking=false')&&!/^false$/i.test(option(t,'--thinking')||'');
  if (!modelOk || !Array.isArray(permitted) || !permitted.includes(effort) || !ultraOk || writeConflict || (tiered&&!tierSetting(qualification?{[tier]:required}:mapping,tier,{model,effort,thinking}).allowed)) {
    let chosenModel = models.find(m => m !== '*') || model;
    if (!chosenModel) {
      let route; try { route = discoverResources({ env, cwd: state.project, swarm: state.swarm, ids: [workerResource(command, t, input)] }).resources[0]; } catch { /* Invalid qualification is not proof. */ }
      chosenModel = route?.available && (route.model || route.proofs[0]?.model);
      if (!chosenModel) return block('resource', 'No proven configured model can correct this launch.', 'Qualify an explicit model for this resource before dispatch.');
    }
    const chosenEffort = required?.effort||(permitted||state.policy.efforts.default).find(e=>!legacyRead.includes(e))||state.policy.efforts.default[0];
    const correctedCommand = command ? corrected(command, chosenModel, chosenEffort, b.readOnly,required||{}) : JSON.stringify({ ...input, model: chosenModel, effort: chosenEffort });
    return block('policy', 'The '+tier+' tier requires its exact approved model/settings; strongest read settings require one unsplit read-only investigation.', 'Run the corrected dispatch command.', { correctedCommand });
  }
  if ((input.resource && input.resource !== resource) || (option(t,'--resource') && option(t,'--resource') !== resource)) return block('resource', 'Resource metadata disagrees with the identifiable provider launch.', 'Use the approved qualified resource for this actual provider command.');
  if (!state.approvedResources.includes(resource)) return block('resource', 'Resource is outside the approved set.', 'Use an approved proven resource.');
  const effectiveEnv = { ...env };
  const assignment = /(?:^|[\s;])(?:\$env:)?(CODEX_HOME|CODEX_CLOUD_HOME|CODEX_CLOUD_ENV_ID|CLAUDE_CONFIG_DIR|KIMI_SHARE_DIR)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s;]+))/g;
  for (const m of command.matchAll(assignment)) effectiveEnv[m[1]] = m[2] ?? m[3] ?? m[4];
  let resources;
  try { resources = discoverResources({ env: effectiveEnv, cwd: state.project, swarm: state.swarm, ids: tiered?state.approvedResources:[resource] }).resources; }
  catch { return block('resource', 'Resource proof or current observation is missing, malformed or unreadable.', 'Reconcile the nonsecret resource observation and passed qualification before dispatch.'); }
  const route = resources.find(r => r.id === resource);
  const healthy=id=>state.routeUnavailable?.[id]?.available!==false;
  const currentRoute=route?.installed&&route.observationValid&&route.authenticated===true&&!!route.dispatch&&healthy(resource);
  if (qualification&&(!currentRoute||route.account!==qualification.account||route.environment!==qualification.environment))return block('resource','Qualification scope no longer matches the current account/environment.','Refresh the nonsecret observation and reconcile this same qualification operation.');
  if (!qualification&&(!(tiered?currentRoute:route?.available) || (tiered&&!qualifiedSetting(required,route.settingProofs||route.proofs)))) {
    const alternatives=resources.map(r=>({...r,available:!!r.installed&&r.observationValid&&r.authenticated===true&&!!r.dispatch&&healthy(r.id),mapping:mappingFor(state,r.id),family:state.policy.providers?.[r.id]?.family||r.cli}));
    const fallback=selectTierRoute(alternatives,state.policy.preference||state.approvedResources,tier,{differentFamily:input.differentFamily});
    return block('resource', 'Resource lacks a current-account proof for these exact '+tier+' settings.', fallback?'Cancel and confirm the old job dead, preserve its work, then use '+fallback.id+' at the same '+tier+' tier.':'Refresh the supported observation and qualify these exact flags before dispatch.',{fallback:fallback?{id:fallback.id,tier,setting:fallback.setting}:null});
  }
  if(qualification)return {allowed:true,job:{qualification:true}};
  if (b.kind === 'fix' && !state.waveOpen) return block('fix-wave', 'No fix wave is open; a third wave needs recorded human authority.', state.fixWaves >= 2 ? 'Send the human the open finding list and a recommendation for a third wave.' : 'Record one fix-wave for the complete repair batch before dispatch.');
  if (b.kind === 'diagnose') {
    const target = state.failures[b.piece+':'+b.targetKind];
    if(tiered&&['environment','flaky','spec'].includes(target?.cause)&&!target.remediated)return block(target.cause,'This cause needs environment/access, infrastructure or contract remediation; it does not escalate the model.','The AI lead must record remediation evidence for this logical step.');
    const existing=otherJobs.filter(j=>j.piece===b.piece&&j.kind==='diagnose'&&j.targetKind===b.targetKind),family=state.policy.providers?.[resource]?.family||route.cli;
    const crossAllowed=b.crossFamily&&state.policy.escalation?.crossFamilyDiagnosis===true&&family!==target?.family&&existing.length===1&&!existing[0].crossFamily&&ACTIVE.has(existing[0].status);
    if (!b.readOnly || b.owns.length || !KINDS.has(b.targetKind) || !target || target.count < 2 || (b.crossFamily?!crossAllowed:existing.length>0)) return block('diagnose', 'Only one primary read-only diagnosis and one configured proven different-family diagnosis are allowed.', 'Use the blocked TARGET_KIND, READ_ONLY true, OWNS []; a cross-family job also needs CROSS_FAMILY true and a proven approved different family.');
  }
  let owns; try { owns = normalOwns(b.owns, cwd); } catch (e) { return block('ownership', e.message, 'Use only relative paths owned by this piece.'); }
  if (['diagnose','check'].includes(b.kind) && (!b.readOnly || owns.length)) return block('ownership', 'Diagnosis and checks must be read-only with OWNS [].', 'Remove write ownership and mark READ_ONLY true.');
  if (!b.readOnly && !owns.length) return block('ownership', 'A writer must declare owned files.', 'Declare the files this piece owns.');
  if (owns.some(p => !state.pieces[b.piece].owns.some(declared => p === declared || p.startsWith(declared+'/')))) return block('ownership', 'The brief claims a path assigned to another piece.', 'Use the piece ownership recorded at wave zero.');
  for (const worker of otherJobs.filter(j => ACTIVE.has(j.status))) {
    if (worker.owns.some(p => owns.some(q => overlaps(p,q)))) return block('ownership', 'Another running worker owns this file or its parent folder.', 'Collect or fence the recorded owner '+worker.id+' before dispatching this piece.');
  }
  if(!input.claimedId&&!b.crossFamily&&otherJobs.some(j=>ACTIVE.has(j.status)&&j.kind===b.kind&&sameGoal(j.goal,goal)))return block('duplicate','A running worker already owns this logical goal.','Collect that exact job instead of launching duplicate work.');
  const semantic=judgment(state,{event:'dispatch',eventId:input.jobId||input.requestId||digest(command),evidence:{goal,brief:b.body},checkBrief:['build','fix'].includes(b.kind),
    failed:Object.entries(state.failures).filter(([k,f])=>f.count&&!f.remediated&&k.endsWith(':'+b.kind)).map(([step,f])=>({step,goal:state.pieces[step.split(':')[0]]?.goal,error:f.error||''})),
    running:b.crossFamily?[]:otherJobs.filter(j=>ACTIVE.has(j.status)).map(j=>({id:j.id,goal:j.goal}))},input.judgeRunner);
  for(const [id,match]of Object.entries(semantic.matches||{}))if(match.level==='block'&&id.startsWith('retry_')){
    const candidates=Object.entries(state.failures).filter(([k,f])=>f.count&&!f.remediated&&k.endsWith(':'+b.kind));const prior=candidates[Number(id.slice(6))];if(prior){key=prior[0];failed=prior[1];const gate=retryGate(failed,key.split(':')[0],b.kind);if(!gate.allowed)return gate;if(input.logicalKey!==key)return dispatchCheck(entry,{...input,logicalKey:key},env);}
  }
  if(Object.entries(semantic.matches||{}).some(([id,m])=>m.level==='block'&&id.startsWith('duplicate_')))return block('duplicate','Jev identified the same work as a running job.','Collect or reconcile that exact job; do not duplicate it.');
  if(semantic.matches?.done_when?.level==='block')return block('brief-quality','Jev found missing concrete done-when checks.','Rewrite this brief with observable checks and their expected outcomes.');
  if(semantic.matches?.planned_piece?.level==='block')return block('brief-quality','Jev found that the brief does not match the planned piece.','Rewrite the brief to match this recorded piece goal: '+goal+'.');
  if(target&&target.count>=2&&target.cause==='unknown'&&semantic.failureClass)target.cause=semantic.failureClass;
  const hours = Number(input.workerHours ?? option(t, '--worker-hours') ?? b.hours ?? 1);
  if (!Number.isFinite(hours) || hours <= 0) return block('usage', 'Dispatch needs positive reserved worker-hours.', 'Declare this job worker-hours inside the approved limit.');
  const used = usage({ ...state, dispatches: otherJobs }), reservedKind = ['fix','check','diagnose'].includes(b.kind), extraJobs = reservedKind ? 0 : state.reserve.jobs, extraHours = reservedKind ? 0 : state.reserve.workerHours;
  const readable = allowance(resources)[resource];
  if (used.jobs+1+extraJobs > state.limit.jobs || used.workerHours+hours+extraHours > state.limit.workerHours || (readable?.available && state.limit.providerPercent !== undefined && readable.usedPercent >= state.limit.providerPercent)) {
    return block('usage', 'The approved usage limit or check/fix reserve would be exceeded; running jobs may finish.', 'Send the human one message with completed work and a recommendation on raising the limit.', { humanAction: 'raise-limit' });
  }
  return { allowed: true, job: { piece: b.piece, kind: b.kind, resource, model, effort, owns, promptFile: b.file, briefHash: digest(b.body), cwd,
    readOnly: b.readOnly,crossFamily:b.crossFamily, targetKind: b.targetKind || null, stage: b.kind === 'check' ? b.stage : null,releaseId:state.releaseId,reviewTarget:b.reviewTarget,goal,logicalKey:key,rootCauseHash:failed?.rootCause?.noteHash||null,tier,escalated:!!target&&target.count>=2,mappingSetting:required||null,baseSha:currentSha(cwd)||state.wave0Sha,
    commandHash: digest(command || JSON.stringify({ model, effort, file: b.file })), reservedHours: hours,
    account: route.account, environment: route.environment, startedAt: clock(), status: 'running' } };
}
export function checkDispatch(project, input, { reserve = false, env = process.env } = {}) {
  if (!ledgers(project).length) return allow();
  const execute = () => {
    const t = tokens(input.command), b = readBrief(input.promptFile || option(t, '--prompt-file') || /^\s*SWARM-BRIEF:\s*(.+)$/m.exec(str(input.prompt))?.[1], input.cwd || project);
    if (!b.swarm && !input.swarm && ledgers(project).length > 1) return block('brief', 'Multiple active swarms require an exact SWARM header.', 'Supply the active swarm and piece in this brief.');
    const entry = choose(project, b.swarm || input.swarm);
    if (!entry) return block('brief', 'No active ledger matches the brief.', 'Use the active swarm ID.');
    const id = input.jobId || input.requestId;
    if (reserve && !str(id).trim()) return block('identity', 'Dispatch reservation needs a durable job or tool-call ID.', 'Give this launch a job ID before dispatch.');
    const requestHash = digest(JSON.stringify({ command: input.command, model: input.model, effort: input.effort, promptFile: input.promptFile, resource: input.resource, cwd: input.cwd }));
    const previous = id && entry.state.dispatches.find(j => j.id === id || j.requestId === id);
    if (previous) {
      if(previous.qualification&&previous.requestHash===null&&ACTIVE.has(previous.status)){
        const checked=dispatchCheck(entry,{...input,claimedId:previous.id},env);
        if(checked.allowed&&reserve){previous.requestHash=requestHash;previous.transportClaimed=true;persist(entry);}return checked.allowed?allow():checked;
      }
      if (previous.requestHash !== requestHash || !ACTIVE.has(previous.status) || input.launch) return block('identity', 'This reservation already belongs to another or terminal launch.', 'Reconcile the recorded job; give any new attempt a new durable dispatch ID.');
      const checked = dispatchCheck(entry, { ...input, claimedId: previous.id }, env);
      return checked.allowed ? allow() : checked;
    }
    const result = dispatchCheck(entry, input, env), key = b.piece && b.kind ? b.piece+':'+b.kind : 'dispatch';
    if (!result.allowed) { entry.state.blocked[key] = { rule: result.rule, reason: result.reason, next: result.next }; persist(entry); }
    else {
      delete entry.state.blocked[key];
      if (reserve) {
        entry.state.dispatches.push({ id, requestId: input.requestId || null, requestHash, transportClaimed: !!input.requestId, ...result.job });
        const failure = entry.state.failures[result.job.logicalKey||result.job.piece+':'+result.job.kind]; if (failure?.rootCause) failure.rootCause.used = true;
      }
      persist(entry);
    }
    return result.allowed ? allow() : result;
  };
  return transaction(project, execute);
}
export function classifyFailure(error, status) {
  if (status === 'cancelled' || /\bcancelled\b|\bcanceled\b|\bcancellation\b/i.test(error)) return 'cancellation';
  if (/quota|rate.limit|\b429\b|RESOURCE_EXHAUSTED/i.test(error)) return 'quota-or-rate';
  if (/ECONNRESET|ENETUNREACH|EAI_AGAIN|ETIMEDOUT|network|DNS|connection refused/i.test(error)) return 'network';
  if (/provider outage|service unavailable|\b50[234]\b/i.test(error)) return 'provider-outage';
  return 'counted';
}
export function releaseCheck(state, sha) {
  const overridden = state.overrides.some(o => o.type === 'release' && o.sha === sha && human(o));
  if (overridden) return allow();
  if (!SHA.test(sha || '') || sha !== state.candidateSha || !integration(state, sha).allowed ||
      state.results.rehearsal?.sha!==sha||state.results.rehearsal?.status!=='passed'||state.results.rehearsal?.rollbackProven!==true||
      Object.values(state.findings).some(f => f.blocking && f.status === 'open')) return block('release', 'The exact candidate lacks passing real-platform golden journeys and rollback, or has an open reproduced blocker-class finding.', 'Rehearse this exact SHA, prove rollback and close wrong-money, data-loss, security/privacy, missing-rollback or unapproved-stop-path findings.');
  if(state.uiChanging){const d=state.designCheck;if(d?.sha!==sha||!human(d)||d.authorisedBy!==state.designOwner)return block('design-check','This UI-changing release needs the founder final design check on a phone or capable device.','Send the verified TestFlight, internal-track or preview build to the founder and record their design-match result.');if(d.status!=='matched')return block('design-match','The founder reported that this build does not match the approved design.','Repair the mismatch, rerun the rehearsal and obtain the founder design check on that exact build.');}
  return allow();
}
function journeyCoverage(state,sha,runner){
  const exact=releaseCheck(state,sha);if(!exact.allowed)return exact;
  if(state.overrides.some(o=>o.type==='release'&&o.sha===sha&&human(o)))return exact;
  if(!state.policy.jev?.enabled||state.policy.jev.enforcement?.journey===false)return exact;
  const script=state.acceptanceScript||[],steps=state.results.rehearsal?.steps||[];
  if(script.length&&script.every(s=>steps.includes(s)))return exact;
  if(!script.length||!steps.length){state.warnings||=[];state.warnings.push({at:clock(),message:'Journey semantic evidence missing; code-only release checks retained.'});return exact;}
  const r=judgment(state,{event:'journey',eventId:sha+':'+digest(JSON.stringify(steps)),evidence:{acceptanceScript:script,journeySteps:steps}},runner);
  state.journeyBlockedSha=r.decision==='block'?sha:null;
  return r.decision==='block'?block('journey-coverage','Jev found missing acceptance-script coverage.','The AI lead must add and execute the missing journey steps on this exact SHA.'):exact;
}
export function checkStage(project, stage, sha, swarm,options={}) {
  if (!ledgers(project).length) return allow();
  return transaction(project, () => {
    const entry = choose(project, swarm); if (!entry) return block('swarm', 'The selector does not match an active project swarm.', 'Use the exact active swarm ID shown by swarm-gate status.');
    const result = stage === 'release' ? journeyCoverage(entry.state, sha,options.judgeRunner) : stageGate(entry.state, stage, sha);
    const key = 'check:'+stage;
    if (result.allowed) delete entry.state.blocked[key];
    else entry.state.blocked[key] = { rule: result.rule, reason: result.reason, next: result.next };
    persist(entry); return result;
  });
}
export function recordState(project, type, value, swarm,options={}) {
  return transaction(project, () => {
    const entry = choose(project, swarm); if (!entry) throw new Error('no active swarm');
    const s = entry.state; if (!object(value)) throw new Error('record must be an object');
    if(type==='qualification'){
      const request=s.qualifications?.[value.id],j=s.dispatches.find(j=>j.id===value.id);if(!request||!j?.qualification)throw new Error('unknown qualification operation');
      const resources=discoverResources({cwd:project,env:options.env||process.env,swarm:s.swarm,ids:[request.resource]}).resources,r=resources[0];
      if(!r?.observationValid||r.account!==request.account||r.environment!==request.environment)throw new Error('qualification scope changed; retain the result without granting proof');
      const job=value.jobRecordFile?json(path.resolve(project,value.jobRecordFile)):value;
      if(!['completed','failed','cancelled','uncertain'].includes(job.status)||!str(job.evidence))throw new Error('qualification collection needs actual terminal job output');
      const proof=collectQualification(request,{...job,id:value.id});
      j.status=job.status;j.exitCode=job.exitCode;j.evidence=safe(job.evidence);j.returnRef=safe(job.returnRef);j.endedAt=clock();j.workerHours=Math.max(0.03,(Date.parse(j.endedAt)-Date.parse(j.startedAt))/3_600_000);request.status=proof.result;
      if(proof.result!=='passed'){persist(entry);return block('qualification','The job did not prove these exact effective flags.','Preserve this failed or uncertain operation; propose a proven same-tier fallback.');}
      saveProven(proof,[{...r,model:null,effort:null}],{dir:resolveSwarmDir(options.env||process.env)});
      const card=s.modelUpdates.providers[request.resource],next=refreshMapping(card,card.listing,{proofs:[...(card.proofs||[]),proof],autoAdopt:s.policy.autoAdoptNewFlagship===true,user:s.policy.providers[request.resource]});
      if(s.policy.autoAdoptNewFlagship&&card.proposal?.standard?.model===next.mapping.standard?.model)next.autoAdopted=true;
      s.modelUpdates.providers[request.resource]={...card,...next};writeAtomic(path.join(resolveSwarmDir(options.env||process.env),'swarm-model-map.json'),s.modelUpdates);
    } else if (type === 'job') {
      const j = s.dispatches.find(j => j.id === value.id || j.requestId === value.id); if (!j) throw new Error('unknown dispatch ID');
      if (value.nativeId) { if (s.dispatches.some(other => other !== j && other.id === value.nativeId)) throw new Error('native job ID already recorded'); j.id = value.nativeId; }
      if (!['starting','queued','running','uncertain','stalled','completed','failed','cancelled'].includes(value.status)) throw new Error('unknown job status');
      if (!ACTIVE.has(j.status) && j.status !== value.status) throw new Error('terminal job status is immutable; reconcile its durable identity');
      const terminal = !ACTIVE.has(value.status), firstTerminal = ACTIVE.has(j.status) && terminal;
      if (terminal && (!str(value.evidence) || (value.status === 'completed' && !str(value.returnRef)))) throw new Error('terminal handback needs evidence and completed return reference');
      j.status = value.status;
      if(terminal&&value.usage)j.providerUsage=reportedUsage(value.usage);
      if (terminal) { j.endedAt ||= clock(); j.workerHours = Math.max(Number.isFinite(value.workerHours) && value.workerHours >= 0 ? value.workerHours : j.reservedHours, (Date.parse(j.endedAt)-Date.parse(j.startedAt))/3_600_000); j.evidence = safe(value.evidence); j.returnRef = safe(value.returnRef || ''); }
      if (firstTerminal && ['failed','cancelled'].includes(value.status)) {
        j.failureClass = classifyFailure(str(value.error), value.status);
        if(object(s.policy.providers)&&['quota-or-rate','network','provider-outage'].includes(j.failureClass)){s.routeUnavailable||={};s.routeUnavailable[j.resource]={available:false,reason:safe(value.error),at:clock()};}
        if (j.failureClass === 'counted') {
          const key = j.logicalKey||j.piece+':'+j.kind, f = s.failures[key] ||= { count: 0, rootCause: null };
          f.count++;f.error=safe(value.error);f.cause=failureCause(str(value.error));f.family=s.policy.providers?.[j.resource]?.family||j.resource;f.remediated=false;if (f.rootCause?.used) f.needsHuman = true;
          if(f.count===2&&f.cause==='unknown'){const r=judgment(s,{event:'failure',eventId:key+':2',failed:[{step:key,goal:s.pieces[j.piece]?.goal,error:f.error}],evidence:{}},options.judgeRunner);if(r.failureClass)f.cause=r.failureClass;}
          if(/model[- ]not[- ]found|unknown model|deprecated/i.test(str(value.error))){s.modelRefreshNeeded||={};s.modelRefreshNeeded[j.resource]={model:j.model,error:safe(value.error),at:clock()};}
        }
      }
    } else if (type === 'piece') {
      const p = s.pieces[value.piece]; if (!p) throw new Error('unknown piece');
      if (s.dispatches.some(j => j.piece === value.piece && ACTIVE.has(j.status))) throw new Error('piece has an active writer; collect or fence it first');
      if (!['returned','deferred'].includes(value.status) || (value.status === 'deferred' && !str(value.reason).trim()) || (value.status === 'returned' && (!str(value.returnRef) || !str(value.evidence)))) throw new Error('piece handback needs return proof; deferral needs a reason');
      if(value.status==='returned'){
        const job=s.dispatches.find(j=>j.id===value.jobId)||[...s.dispatches].reverse().find(j=>j.piece===value.piece&&j.status==='completed'&&['build','fix','mechanical','research'].includes(j.kind));
        if(job&&job.piece!==value.piece)throw new Error('piece handback belongs to a different dispatched piece');
        const logical=job?.logicalKey||value.piece+':'+(job?.kind||'build'),failure=s.failures[logical];
        if(!(p.status==='returned'&&p.returnRef===value.returnRef)&&failure?.count>=2&&!(job?.rootCauseHash&&job.rootCauseHash===failure.rootCause?.noteHash&&!failure.needsHuman)){
          const denied=retryGate(failure,logical.split(':')[0],job?.kind||'build');if(!denied.allowed){s.blocked['admission:'+value.piece]={rule:denied.rule,reason:denied.reason,next:denied.next};persist(entry);return denied;}
        }
        let handback,result;
        try{handback=JSON.parse(evidenceFile(project,value.handbackFile||value.evidence));result=admitEvidence(project,handback,{baseSha:job?.baseSha||s.wave0Sha,sha:value.returnRef});}catch{result={allowed:false,reason:'Returned piece needs a readable structured handback and real fast-check output.'};}
        if(result.allowed&&handback.jobId&&job&&handback.jobId!==job.id)result={allowed:false,reason:'Handback belongs to a different worker job.'};
        if(result.allowed){const semantic=judgment(s,{event:'admission',eventId:value.piece+':'+value.returnRef,evidence:{goal:p.goal,files:result.files,testNames:result.testNames,diffSummary:result.diffSummary,fastOutput:result.fastOutput,handbackClaim:JSON.stringify(handback.checks.map(c=>({counts:c.counts,exitCode:c.exitCode})))}},options.judgeRunner);if(semantic.decision==='block')result={allowed:false,reason:'Jev found tests unrelated to the goal or a handback claim/output mismatch: '+semantic.reasons.join('; ')};else result.judgment={decision:semantic.decision,warning:semantic.warning||null};}
        if(!result.allowed){const key=job?.logicalKey||value.piece+':'+(job?.kind||'build'),f=s.failures[key]||={count:0,rootCause:null};const pickup=digest(JSON.stringify({piece:value.piece,sha:value.returnRef,handback:handback||value.evidence}));f.admissionPickups||=[];if(!f.admissionPickups.includes(pickup)){f.admissionPickups.push(pickup);f.count++;f.cause='logic';f.error=result.reason;if(f.rootCause?.used)f.needsHuman=true;}p.status='pending';const denied=block('admission',result.reason,'Return this proof to the same worker job '+(job?.id||value.jobId||'recorded owner')+' for repair; after two failures use the diagnosis ladder.');s.blocked['admission:'+value.piece]={rule:denied.rule,reason:denied.reason,next:denied.next};persist(entry);return denied;}
        delete result.fastOutput;p.admission=result;delete s.blocked['admission:'+value.piece];
      }
      Object.assign(p, { status: value.status, returnRef: safe(value.returnRef), evidence: safe(value.evidence), reason: safe(value.reason) });
    } else if (type === 'candidate') {
      if (!SHA.test(value.sha) || Object.values(s.pieces).some(p => !['returned','deferred'].includes(p.status)) || s.dispatches.some(j => ACTIVE.has(j.status))) throw new Error('integrate only after all pieces return or are explicitly deferred and all jobs finish');
      if (s.candidateSha !== value.sha) { s.candidateSha = value.sha; s.results = {}; delete s.releaseIntent; }
      s.candidateIsRepair=value.repair===true||s.fixWaves>0||!!s.reviewCompleted;
      s.waveOpen = false;
    } else if(type==='rehearsal'){
      const gate=stageGate(s,'rehearsal',value.sha);if(!gate.allowed)return gate;
      if(!['passed','failed'].includes(value.goldenJourneys)||!Number.isInteger(value.exitCode)||!str(value.evidence)||typeof value.rollbackProven!=='boolean'||(value.rollbackProven&&!str(value.rollbackEvidence)))throw new Error('rehearsal needs actual golden-journey exit/output and rollback evidence');
      const passed=value.goldenJourneys==='passed'&&value.exitCode===0&&value.rollbackProven;
      s.results.rehearsal={sha:value.sha,status:passed?'passed':'failed',goldenJourneys:value.goldenJourneys,rollbackProven:value.rollbackProven,rollbackEvidence:safe(value.rollbackEvidence),evidence:safe(value.evidence),exitCode:value.exitCode,steps:Array.isArray(value.steps)?value.steps.map(safe):[],platform:safe(value.platform),at:clock()};
      delete s.journeyBlockedSha;delete s.blocked['check:release'];
    } else if(type==='design-check'){
      if(!s.uiChanging||value.sha!==s.candidateSha||!['matched','mismatch'].includes(value.status)||!human(value)||value.authorisedBy!==s.designOwner||!['phone','capable-device'].includes(value.device))throw new Error('design result needs this exact UI candidate, the founder chat authority and phone or capable-device evidence');
      s.designCheck={sha:value.sha,status:value.status,authorisedBy:safe(value.authorisedBy),reason:safe(value.reason),chatRef:safe(value.chatRef),device:value.device,evidence:safe(value.evidence),at:clock()};
    } else if (type === 'result') {
      const gate = value.stage==='review'?(!integration(s,value.sha).allowed?integration(s,value.sha):reviewGate(s,{record:true,target:value.target,releaseId:value.releaseId})):stageGate(s, value.stage, value.sha); if (!gate.allowed) return gate;
      if (!['passed','failed'].includes(value.status) || !str(value.evidence) || !Number.isInteger(value.exitCode) || (value.status === 'passed' && value.exitCode !== 0)) throw new Error('check result needs status, evidence and its actual exit code');
      s.results[value.stage] = { sha: value.sha, status: value.status, evidence: safe(value.evidence), exitCode: value.exitCode, at: clock(), jobId: safe(value.jobId), reviewer: safe(value.reviewer),steps:Array.isArray(value.steps)?value.steps.map(safe):[] };
      if (value.stage === 'suite') { s.fullSuite={...s.results.suite};delete s.results.journey;delete s.results.rehearsal; }
      if (value.stage === 'journey') {delete s.results.rehearsal;delete s.journeyBlockedSha;delete s.blocked['check:release'];}
      if(value.stage==='review')s.reviewCompleted={releaseId:s.releaseId,sha:value.sha,evidence:safe(value.evidence),verdict:safe(value.verdict),at:clock()};
    } else if (type === 'finding') {
      if (!validId(value.id) || !['open','closed'].includes(value.status)) throw new Error('finding needs stable ID and disposition');
      if (value.status === 'closed' && (!str(value.evidence) || value.sha !== s.candidateSha)) throw new Error('close a finding with exact-candidate repair evidence');
      const prior=s.findings[value.id],waves=[...new Set([...(prior?.waves||[]),...(value.status==='open'&&s.fixWaves?[s.fixWaves]:[])])],piece=value.piece||prior?.piece;
      const category=value.category||prior?.category||'unknown',reproduction=safe(value.reproduction||prior?.reproduction),blocking=['wrong-money','data-loss','security','privacy','security/privacy','missing-rollback','unapproved-stop-path'].includes(category)&&!!reproduction.trim();
      s.findings[value.id] = { id: value.id, status: value.status, category,reproduction,blocking,disposition:blocking?'blocker':'after-launch', detail: safe(value.detail || prior?.detail), evidence: safe(value.evidence), sha: value.sha || null,piece:piece||null,waves };
      if(value.status==='open'&&!blocking&&['wrong-money','data-loss','security','privacy','missing-rollback','unapproved-stop-path'].includes(category)){s.warnings||=[];s.warnings.push({at:clock(),message:'Finding '+value.id+' needs reproduction; lead must investigate the claim.'});}
      if(piece&&s.pieces[piece]&&s.findings[value.id].blocking&&value.status==='open'&&waves.length>=2){const f=s.failures[piece+':fix']||={count:0,rootCause:null};f.count=Math.max(f.count,2);f.cause=failureCause(s.findings[value.id].detail);f.error=s.findings[value.id].detail;f.finding=value.id;}
    } else if (type === 'fix-wave') {
      if (s.fixWaves >= 2 && !human(value)) {
        const denied = block('fix-wave', 'Two fix waves are already recorded.', 'Send the human the open finding list and a recommendation for a third wave.', { humanAction: 'third-wave' });
        s.blocked['fix-wave'] = { rule: denied.rule, reason: denied.reason, next: denied.next }; persist(entry); return denied;
      }
      delete s.blocked['fix-wave'];
      if (s.dispatches.some(j => ACTIVE.has(j.status))) throw new Error('collect the current batch before opening the next fix wave');
      s.fixWaves++; s.waveOpen = true; s.candidateSha = null; s.results = {};
      for (const id of value.pieces || Object.keys(s.pieces)) { if (!s.pieces[id]) throw new Error('unknown fix piece'); s.pieces[id].status = 'pending'; }
      if (s.fixWaves > 2) s.overrides.push({ type: 'fix-wave', wave: s.fixWaves, authorisedBy: safe(value.authorisedBy), reason: safe(value.reason), chatRef: safe(value.chatRef), at: clock() });
    } else if (type === 'root-cause') {
      const key = value.piece+':'+value.kind, f = s.failures[key];
      if (!f || f.count < 2 || f.rootCause || !s.dispatches.some(j => j.piece === value.piece && j.kind === 'diagnose' && j.targetKind === value.kind && j.status === 'completed')) throw new Error('root cause requires the one completed read-only diagnosis');
      const note = value.noteFile ? read(path.resolve(project, value.noteFile), 65_536) : str(value.note);
      if (!/(?:^|\n)(?:#+\s*)?Cause\s*:?\s*\n?\S[\s\S]*(?:\n)(?:#+\s*)?Evidence\s*:?\s*\n?\S/i.test(note)) throw new Error('root-cause note needs nonempty Cause and Evidence sections');
      f.rootCause = { note: safe(note), noteHash: digest(note), used: false, at: clock() };
    } else if(type==='remediation'){
      const f=s.failures[value.piece+':'+value.kind];if(!f||!['environment','flaky','spec'].includes(f.cause)||!str(value.evidence)||!str(value.reason))throw new Error('remediation needs an environment/access, flaky or contract cause and actual repair evidence');f.remediated=true;f.remediation={evidence:safe(value.evidence),reason:safe(value.reason),at:clock()};
    } else if(type==='model-map'){
      if(!object(value.providers))throw new Error('model update needs provider mappings and qualification proofs');s.modelUpdates=structuredClone(value);
    } else if(type==='route'){
      if(!s.approvedResources.includes(value.resource)||typeof value.available!=='boolean'||!str(value.evidence)||!str(value.reason))throw new Error('route availability needs an approved route and actual provider-status evidence');s.routeUnavailable||={};s.routeUnavailable[value.resource]={available:value.available,evidence:safe(value.evidence),reason:safe(value.reason),at:clock()};
    } else if (type === 'limit') {
      if (!human(value)) throw new Error('raising the usage limit needs the human word in chat, who, why and chat reference');
      const limit = validateLimit(value); if (limit.jobs < s.limit.jobs || limit.workerHours < s.limit.workerHours) throw new Error('limit update cannot discard approved capacity or in-flight work');
      s.limit = limit; s.overrides.push({ type: 'limit', ...limit, authorisedBy: safe(value.authorisedBy), reason: safe(value.reason), chatRef: safe(value.chatRef), at: clock() });
      writeAtomic(path.join(project, '.bgzflow', 'swarm-defaults.json'), { resources: s.approvedResources, limit: s.limit, reserve: s.reserve });
    } else if (type === 'override') {
      if (!human(value) || !SHA.test(value.sha) || value.sha !== s.candidateSha) throw new Error('emergency release override needs exact candidate, human chat authorisation, who and why');
      s.overrides.push({ type: 'release', sha: value.sha, authorisedBy: safe(value.authorisedBy), reason: safe(value.reason), chatRef: safe(value.chatRef), at: clock() });
      delete s.journeyBlockedSha;
    } else if (type === 'release-intent') {
      if (!SHA.test(value.sha) || value.sha !== s.candidateSha || !str(value.command) || !str(value.artifact) || !SHA256(value.hash)) throw new Error('release intent needs exact candidate, exact command, artifact and SHA-256');
      const actual = digest(read(path.resolve(project, value.artifact), 1_073_741_824, null));
      if (actual !== value.hash) throw new Error('release artifact hash mismatch');
      s.releaseIntent = { sha: value.sha, commandHash: digest(value.command), artifact: value.artifact, hash: actual };
    } else if (type === 'notice') {
      if (!['limit','third-wave'].includes(value.type) || !str(value.chatRef)) throw new Error('notice needs type and sent-chat reference');
      s.notices[value.type] = { chatRef: safe(value.chatRef), at: clock() };
    } else if (type === 'finish') {
      if (s.dispatches.some(j => ACTIVE.has(j.status))) throw new Error('collect or explicitly cancel remaining jobs before finishing');
      s.active = false;
    } else throw new Error('unknown record type');
    persist(entry); return { allowed: true, swarm: s.swarm, type, fixWaves: s.fixWaves };
  });
}
function SHA256(s) { return /^[a-f0-9]{64}$/i.test(s || ''); }
export function status(project, swarm, env = process.env) {
  const entry = choose(project, swarm); if (!entry) return { active: false };
  let resources = [], warning;
  try { resources = discoverResources({ env, cwd: project, swarm: entry.state.swarm, ids: entry.state.approvedResources }).resources; } catch { warning = 'Resource observation unavailable.'; }
  const s = entry.state,escalatedJobs=s.dispatches.filter(j=>j.escalated),modelMap=s.modelUpdates||s.modelMap;
  return { ...s, used: usage(s),escalated:{jobs:escalatedJobs.length,workerHours:usage({...s,dispatches:escalatedJobs}).workerHours,reportedUsage:escalatedJobs.filter(j=>j.providerUsage).map(j=>({id:j.id,usage:j.providerUsage}))},modelMapping:Object.fromEntries(Object.entries(modelMap?.providers||{}).map(([id,p])=>[id,{ageDays:Number.isFinite(Date.parse(p.verifiedOn))?(Date.now()-Date.parse(p.verifiedOn))/86400000:null,cliVersion:p.cliVersion||null,proposal:p.proposal||null,autoAdopted:p.autoAdopted===true}])), allowance: allowance(resources), releaseOpen: releaseCheck(s, s.candidateSha).allowed&&s.journeyBlockedSha!==s.candidateSha, ...(warning ? { warning } : {}) };
}
function releaseArguments(t, exe) {
  // Consume option values before looking for a verb; a path named "publish" is not a verb.
  const values = new Set(('--config --profile --loglevel --prefix --dir --cwd --workdir --env --channel --repo --app --access-token --token --context --kube-context --target --namespace --kubeconfig --host --org --team --scope --project --registry --cache --userconfig --globalconfig --output --file --filename -c -C -e -a -R -n -f').split(' '));
  const specific = { gh: '--hostname --discussion-category', wrangler: '--name --account-id', fly: '--config --region', flyctl: '--config --region', kubectl: '--cluster --user --request-timeout', helm: '--kube-apiserver --kube-token', vercel: '--local-config --global-config' };
  for (const name of (specific[exe] || '').split(' ')) if (name) values.add(name);
  const positional = [];
  for (let i = 1; i < t.length; i++) {
    const arg = t[i];
    if (arg === '--') { positional.push(...t.slice(i + 1)); break; }
    if (!arg.startsWith('-')) { positional.push(arg.toLowerCase()); continue; }
    if (/[=:]/.test(arg)) continue;
    if (values.has(arg)) { i++; continue; }
    if (/^--dry[-_]run$/i.test(arg) && /^(?:true|false|none|client|server)$/i.test(t[i + 1] || '')) i++;
  }
  return positional;
}
export function isRelease(command, patterns = []) {
  return segments(str(command)).some(part => {
    const t = invocation(part), exe = executable(t[0]), args = releaseArguments(t, exe), action = args[0];
    if (['echo','printf','write-output','write-host'].includes(exe)) return false;
    if (patterns.some(p => new RegExp(p,'i').test(part))) return true;
    // A Boolean false, a negation or a conflicting flag never grants a simulation exemption.
    // Recognise only simulation modes supported by the documented production commands.
    const modes = [];
    for (let i=1;i<t.length;i++) {
      const token=t[i].replace(/^(["'])(.*)\1$/s,'$2');
      if (/^--no-dry[-_]run$/i.test(token)) modes.push('false');
      else if (/^--dry[-_]run(?:=|:)?/i.test(token) && /^--dry[-_]run(?:$|[=:])/i.test(token)) {
        const inline=/^[^=:]+[=:](.*)$/.exec(token)?.[1];
        const next=t[i+1]?.replace(/^(["'])(.*)\1$/s,'$2');
        modes.push((inline === undefined ? /^(?:true|false|none|client|server)$/i.test(next || '') ? next : 'true' : inline.replace(/^(["'])(.*)\1$/s,'$2')).toLowerCase());
      } else if (exe==='fastlane' && /^dry_run:/i.test(token)) modes.push(token.slice(8).toLowerCase());
    }
    const simulations=['npm','pnpm','supabase','wrangler','kubectl','helm'];
    if (simulations.includes(exe) && modes.length && modes.every(m => m==='true' || (['kubectl','helm'].includes(exe) && ['client','server'].includes(m)))) return false;
    const prod = v => /^(?:production|prod)$/i.test(v || '');
    return (['eas','asc'].includes(exe) && ['submit','submission'].includes(action)) ||
      (exe === 'fastlane' && ['deliver','pilot'].includes(action)) ||
      (['npm','pnpm','yarn'].includes(exe) && action === 'publish') ||
      (exe === 'yarn' && action === 'npm' && args[1] === 'publish') ||
      (exe === 'gh' && action === 'release' && args[1] === 'create') ||
      (exe === 'vercel' && (t.includes('--prod') || option(t,'--target') === 'production')) ||
      (exe === 'wrangler' && action === 'deploy' && prod(option(t,'--env'))) ||
      (exe === 'eas' && action === 'update' && prod(option(t,'--channel'))) ||
      (['fly','flyctl'].includes(exe) && action === 'deploy' && prod(option(t,'--app') || option(t,'-a'))) ||
      (exe === 'supabase' && action === 'db' && args[1] === 'push' && !t.includes('--local')) ||
      (['kubectl','helm'].includes(exe) && (prod(option(t,'--context')) || prod(option(t,'--kube-context'))));
  });
}
function isSuite(command, patterns = []) { return /\b(?:npm|pnpm)\s+test\s*(?:$|[;&|])|scripts[/\\]test-all\.mjs\b|\bnode\s+--test\s*(?:$|[;&|])|\bpytest\s*(?:$|[;&|])/i.test(command) || patterns.some(p => new RegExp(p, 'i').test(command)); }
function workerLaunch(command, name) {
  if (nativeResource(name)) return true;
  return /\bcx\s+task\b|\bbg-swarm(?:\.mjs)?["']?\s+launch\b|\bcodex\b[^;\n]*\b(?:cloud\s+exec|exec)\b|\b(?:grok|kimi|claude)(?:\.exe)?\s+(?!.*(?:--version|--help|auth\s+status|login\s+status|plugin\b))[^;\n]*(?:--prompt|--print|\s-p\s|--cloud)/i.test(command);
}
function currentSha(cwd) {
  try{
    const root=walkUp(cwd),marker=path.join(root,'.git');let admin=marker;
    if(fs.statSync(marker).isFile()){const m=/^gitdir:\s*(.+)/m.exec(read(marker,4096));if(!m)return null;admin=path.resolve(root,m[1].trim());}
    let common=admin;try{common=path.resolve(admin,read(path.join(admin,'commondir'),4096).trim());}catch(e){if(e.code!=='ENOENT')throw e;}
    let head=read(path.join(admin,'HEAD'),4096).trim();
    for(let i=0;i<4;i++){
      if(SHA.test(head))return head;
      const ref=/^ref:\s*(refs\/[A-Za-z0-9._/-]+)$/.exec(head)?.[1];if(!ref||ref.split('/').includes('..'))return null;
      let found=false;for(const base of [admin,common])try{head=read(path.join(base,ref),4096).trim();found=true;break;}catch(e){if(e.code!=='ENOENT')throw e;}
      if(!found){const packed=read(path.join(common,'packed-refs'));return packed.split(/\r?\n/).map(l=>l.split(' ')).find(([sha,name])=>name===ref&&SHA.test(sha))?.[0]||null;}
    }return null;
  }catch{return null;}
}
function denyHook(result) { return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: safe(result.reason)+' Next: '+safe(result.next)+(result.correctedCommand ? ' Corrected: '+safe(result.correctedCommand) : '') } }; }
function executionCwd(input, project, action) {
  const metadata = input.tool_input || {};
  let cwd = path.resolve(metadata.workdir || metadata.cwd || input.cwd || project);
  for (const part of segments(str(metadata.command || metadata.cmd))) {
    const t = invocation(part), exe = executable(t[0]);
    if (['cd','chdir','set-location','pushd'].includes(exe)) {
      const target = t.slice(1).filter(v => !/^-(?:LiteralPath|Path)$/i.test(v) && !/^\/d$/i.test(v));
      if (target.length !== 1 || /[$`*?]/.test(target[0])) return null;
      cwd = path.resolve(cwd,target[0]);
    } else if (!action || action(part)) {
      const directory = option(t,'--cwd') || option(t,'--workdir') || option(t,'-C');
      if (directory) { if (/[$`*?]/.test(directory)) return null; cwd = path.resolve(cwd,directory); }
      if (action) return cwd; // Bind the directory at this action, before any later shell changes.
    }
  }
  return cwd;
}
export function hook(input, env = process.env,options={}) {
  const project = resolveSwarmProject(input, env), command = str(input.tool_input?.command || input.tool_input?.cmd), name = str(input.tool_name);
  let active, release = false;
  // Resource guards apply to every shell command, swarm or not (low disk, provider build slot, bulk archive).
  // The one-heavy-run queue stays a dispatch rule: a plain command may wait in bg-heavy.
  if (input.hook_event_name === 'PreToolUse' && command) {
    try {
      const guard = resourcePreflight(command, input.cwd, env, { ...options.preflightDependencies, heavyHeld: () => false });
      if (!guard.allowed) return denyHook(guard);
    } catch { /* A guard that cannot measure fails open; the swarm checks below still run. */ }
  }
  try {
    active = ledgers(project); if (!active.length) return {};
    if(input.hook_event_name==='Stop'){
      if(input.stop_hook_active)return {};
      const message=str(input.last_assistant_message);let warning;
      for(const entry of active){const state=entry.state;if(!state.policy.jev?.enabled||state.policy.jev.enforcement?.stop===false||!stopPrefilter(message,input,state.policy.jev.maxMessageChars||2000))continue;
        const r=judgment(state,{event:'stop',eventId:input.session_id||digest(message),evidence:{message}},options.judgeRunner);persist(entry);
        if(r.decision==='block')return {decision:'block',reason:'Swarm gate: the message asks the human for agent-owned acceptance/testing or a routine technical decision. Rewrite it once; '+r.reasons.join('; ')};
        if(r.warning||r.decision==='warn')warning=r.warning||'Jev message warning to the AI lead: '+r.reasons.join('; ');
      }return warning?{warning}:{};
    }
    const patterns = active.flatMap(e => e.state.releasePatterns);
    release = isRelease(command, patterns);
    const worker = workerLaunch(command, name);
    if (input.hook_event_name === 'PostToolUse' || input.hook_event_name === 'PostToolUseFailure') {
      if (!input.tool_use_id) return {};
      const entry = active.find(e => e.state.dispatches.some(j => j.requestId === input.tool_use_id)); if (!entry) return {};
      let response = input.tool_response;
      if (Array.isArray(response?.content)) { const body = response.content.find(c => c.type === 'text')?.text; try { response = JSON.parse(body); } catch { response = {}; } }
      const failed = input.hook_event_name === 'PostToolUseFailure' || response?.isError === true;
      const value = { id: input.tool_use_id, status: failed ? 'failed' : 'running', nativeId: response?.id || response?.job_id || response?.task_id };
      if (failed) Object.assign(value, { evidence: 'tool-call:'+input.tool_use_id, error: str(input.error || response?.error), workerHours: 0 });
      recordState(project, 'job', value, entry.state.swarm); return {};
    }
    if (input.hook_event_name !== 'PreToolUse') return {};
    if (gateOnly(command)) return {};
    if (release) {
      if (segments(command).filter(p => isRelease(p,patterns)).length > 1) return denyHook(block('release', 'Use one release command per tool call.', 'Run this release alone with an explicit execution directory.'));
      const cwd = executionCwd(input,project,p => isRelease(p,patterns));
      if (!cwd) return denyHook(block('release', 'The release source directory is ambiguous.', 'Run this release alone with an explicit execution directory.'));
      for (const entry of active) {
        const intent = entry.state.releaseIntent;
        let sha = currentSha(cwd);
        if (intent && intent.commandHash === digest(command)) {
          if (digest(read(path.resolve(project, intent.artifact), 1_073_741_824, null)) !== intent.hash) return denyHook(block('release', 'Release artifact changed after binding.', 'Rebuild and bind the exact accepted artifact.'));
          sha = intent.sha;
        } else if (/--prebuilt\b|--ipa\b|--aab\b|--apk\b|--path\b|\beas\s+submit\b|\basc\s+submit\b|\bfastlane\s+(?:deliver|pilot)\b/i.test(command)) return denyHook(block('release', 'Store/prebuilt release needs a candidate-bound artifact hash and exact command.', 'Record release-intent for the accepted SHA, artifact hash and this command.'));
        const result = journeyCoverage(entry.state, sha,options.judgeRunner);persist(entry);if (!result.allowed) return denyHook(result);
      }
      return {};
    }
    if (isSuite(command, active.flatMap(e => e.state.suitePatterns))) {
      for (const entry of active) { const gate = stageGate(entry.state, 'suite', currentSha(executionCwd(input,project) || project) || entry.state.candidateSha); if (!gate.allowed) return denyHook(gate); }
    }
    if (!worker) return {};
    if (/[;&|]\s*(?:[^;&|]*\b(?:cx\s+task|bg-swarm|codex|grok|kimi|claude)\b)/i.test(command)) return denyHook(block('dispatch', 'Use one worker launch per tool call.', 'Split these launches into individually gated tool calls.'));
    const toolInput = input.tool_input || {};
    // Cloud/native CLIs without --prompt-file transport the same brief through a prior CLI reservation.
    const pending = active.flatMap(e => e.state.dispatches.map(j => ({ entry: e, job: j }))).find(({job:j}) => j.commandHash === digest(command) && !j.transportClaimed && !j.requestId && ACTIVE.has(j.status));
    if (pending) {
      const result = transaction(project, () => {
        const entry = choose(project, pending.entry.state.swarm), j = entry.state.dispatches.find(j => j.id === pending.job.id);
        if (j.transportClaimed || digest(read(j.promptFile, 65_536)) !== j.briefHash) return block('identity', 'The reserved launch or brief changed.', 'Reconcile the exact original reservation before launch.');
        const checked = dispatchCheck(entry, { command, cwd: j.cwd, promptFile: j.promptFile, model: j.model, effort: j.effort, resource: j.resource, workerHours: j.reservedHours, claimedId: j.id }, env);
        if (!checked.allowed) return checked;
        j.transportClaimed = true; j.requestId = input.tool_use_id || 'claim-'+digest(command).slice(0,24); persist(entry); return allow();
      });
      return result.allowed ? {} : denyHook(result);
    }
    const cwd = executionCwd(input,project);
    if (!cwd) return denyHook(block('dispatch', 'The worker directory is ambiguous.', 'Run one worker with an explicit execution directory.'));
    const result = checkDispatch(project, { command, cwd, toolName: name,
      promptFile: toolInput.prompt_file || toolInput.promptFile, prompt: toolInput.prompt, resource: toolInput.resource,
      model: toolInput.model, effort: toolInput.effort, workerHours: toolInput.worker_hours,
      requestId: input.tool_use_id || 'call-'+digest(JSON.stringify(toolInput)).slice(0,24) }, { reserve: !/\bbg-swarm(?:\.mjs)?["']?\s+launch\b/i.test(command), env });
    return result.allowed ? {} : denyHook(result);
  } catch {
    if ((release || isRelease(command)) && fs.existsSync(folder(project))) return { ...denyHook(block('release', 'Active swarm readiness cannot be established.', 'Repair the ledger and verify the exact candidate before releasing.')), warning: 'swarm-gate warning: release readiness unavailable; failed closed.' };
    return { warning: 'swarm-gate warning: internal error; this non-release operation was left open.' };
  }
}

const USAGE = 'swarm-gate start --swarm ID --config FILE | dispatch/check-dispatch --command COMMAND [--resource ID --worker-hours N --job-id ID] | record TYPE --file FILE | check-suite/check-journey/check-review/check-release --sha SHA | status | presets | hook';
function flags(argv) {
  const args = {}, rest = []; for (let i=0; i<argv.length; i++) {
    if (argv[i].startsWith('--')) { const key = argv[i].slice(2); if (['help','json'].includes(key)) args[key] = true; else { if (argv[i+1] === undefined) throw new Error('option needs a value'); args[key] = argv[++i]; } }
    else rest.push(argv[i]);
  } return { args, rest };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let result, command;
  try {
    const parsed = flags(process.argv.slice(2)), a = parsed.args; command = parsed.rest[0];
    const project = a['project-dir'] ? path.resolve(a['project-dir']) : resolveSwarmProject();
    if (a.help) result = { usage: USAGE };
    else if (command === 'presets') result = PRESETS;
    else if (command === 'start') result = startSwarm(project, a.swarm, json(a.config));
    else if (['dispatch','check-dispatch'].includes(command)) result = checkDispatch(project, { command: a.command, swarm: a.swarm, cwd: a.cwd || project, resource: a.resource, workerHours: a['worker-hours'], jobId: a['job-id'], model: a.model, effort: a.effort, promptFile: a['prompt-file'] }, { reserve: command === 'dispatch' });
    else if (command === 'record') result = recordState(project, parsed.rest[1], json(a.file), a.swarm);
    else if (command === 'refresh-models') result = refreshModels(project,a.swarm);
    else if (command === 'status') result = status(project, a.swarm);
    else if (command?.startsWith('check-')) result = checkStage(project, command.slice(6), a.sha, a.swarm);
    else if (command === 'hook') {
      const body = await readStdin(200); process.stdin.destroy();
      result = hook(parseInput(body));
      if (result.warning) { console.error(result.warning); delete result.warning; }
      if (Object.keys(result).length) console.log(JSON.stringify(result));
      result = null;
    } else throw new Error(USAGE);
    if (result) { console.log(JSON.stringify(result)); if (result.allowed === false) process.exitCode = 2; }
  } catch (e) {
    if (command === 'hook' || command?.startsWith('check-')) { console.error('swarm-gate warning: internal error; non-release check failed open.');
      if (command === 'check-release') { console.log(JSON.stringify(block('release', 'Readiness unavailable.', 'Repair the active ledger before release.'))); process.exitCode = 2; }
    } else { console.error('swarm-gate: '+safe(e.message)); process.exitCode = 2; }
  }
}
