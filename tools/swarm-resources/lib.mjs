import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveSwarmDir, writeAtomic } from '../bg-swarm/lib.mjs';
import { overlayDir, readRoutes } from './config.mjs';

const APPROVAL = 'swarm-resources-approved.json';
const PROVEN = 'swarm-proven-routes.json';
const IDENTITIES = 'swarm-current-identities.json';
const CLIS = ['codex', 'claude', 'grok', 'kimi'];
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const dated = (v, now) => text(v) && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) && Date.parse(v) <= now;

function validProof(p, now) {
  return object(p) && text(p.id) && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(p.id) && dated(p.at, now) && p.result === 'passed' &&
    ['jobId', 'account', 'environment', 'model', 'effort', 'access', 'returnRef', 'evidence'].every((key) => text(p[key])) &&
    ![p.model, p.effort].includes('(default)');
}

function matchesProof(p, resource, reuse = false) {
  return (!resource.model || p.model === resource.model) && (!resource.effort || p.effort === resource.effort) &&
    (!reuse || (text(resource.account) && text(resource.environment))) &&
    (!resource.account || p.account === resource.account) && (!resource.environment || p.environment.replace(/\\/g, '/') === resource.environment) &&
    (resource.kind !== 'cloud' || /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(p.returnRef));
}

// Only nonsecret provider-status observations, never auth.json, tokens or credential stores.
// Hosts without a supported identity status export stay unknown. The hook does no network work.
export function saveIdentities(input, { dir = resolveSwarmDir(), now = Date.now() } = {}) {
  if (!object(input) || !Array.isArray(input.identities) || !input.identities.every(i => object(i) && text(i.id) &&
      text(i.account) && text(i.environment) && dated(i.at, now) && text(i.source) && typeof i.authenticated === 'boolean')) {
    throw new Error('identity observation needs nonsecret account/environment, authentication, source and date');
  }
  const identities = input.identities.map(i => ({ id: i.id, account: i.account, environment: i.environment,
    authenticated: i.authenticated, at: i.at, source: i.source, ...(object(i.allowance) ? { allowance: {
      available: i.allowance.available === true, usedPercent: i.allowance.usedPercent, at: i.allowance.at, source: i.allowance.source,
    } } : {}) }));
  writeAtomic(path.join(dir, IDENTITIES), { identities });
  return identities;
}

function observations(dir) {
  try { const data = JSON.parse(fs.readFileSync(path.join(dir, IDENTITIES), 'utf8')); return Array.isArray(data?.identities) ? data.identities : []; }
  catch (e) { if (e.code === 'ENOENT') return []; throw new Error('nonsecret identity observations malformed'); }
}

function currentScope(r, identities, env, now) {
  const found = identities.filter(i => object(i) && i.id === r.id);
  const i = found.length === 1 ? found[0] : null;
  const fresh = i && dated(i.at, now) && now - Date.parse(i.at) <= 300_000 && text(i.source);
  const account = fresh && text(i.account) ? i.account.trim() : null;
  let environment = fresh && text(i.environment) ? i.environment.trim().replace(/\\/g, '/') : null;
  const scope = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
  let expected = null;
  if (r.id === 'codex-local' && env.CODEX_HOME) expected = scope(env.CODEX_HOME);
  if (r.id === 'codex-cloud') {
    const base = env.CODEX_CLOUD_HOME || r.home;
    if (base) expected = scope(base) + (text(env.CODEX_CLOUD_ENV_ID) ? '#'+env.CODEX_CLOUD_ENV_ID.trim() : '');
  }
  if (r.id === 'kimi-local' && env.KIMI_SHARE_DIR) expected = scope(env.KIMI_SHARE_DIR);
  if (r.id.startsWith('claude-') && env.CLAUDE_CONFIG_DIR) expected = scope(env.CLAUDE_CONFIG_DIR);
  const scopeMismatch = (!!expected && environment !== expected) || (!!r.account && r.account !== account) || (!!r.environment && r.environment !== environment);
  return { ...r, configuredAccount: r.account, configuredEnvironment: r.environment, account,
    environment: scopeMismatch ? expected : environment, authenticated: fresh && typeof i.authenticated === 'boolean' ? i.authenticated : null,
    observationValid: !!fresh && !scopeMismatch && !!account && !!environment,
    scopeMismatch, observationAt: fresh ? i.at : null, allowance: fresh && object(i.allowance) ? i.allowance : { available: false } };
}

function loadProofs(dir, now) {
  let saved;
  try { saved = JSON.parse(fs.readFileSync(path.join(dir, PROVEN), 'utf8')); }
  catch (err) { if (err.code === 'ENOENT') return []; throw new Error('route proof state unreadable or malformed'); }
  if (!object(saved) || !Array.isArray(saved.routes) || !saved.routes.every((p) => validProof(p, now))) {
    throw new Error('route proof state malformed; no qualification used');
  }
  return saved.routes;
}

export function saveProven(proof, resources, { dir = resolveSwarmDir(), now = Date.now() } = {}) {
  const resource = resources.find((r) => r.id === proof?.id);
  if (!validProof(proof, now) || !resource || !matchesProof(proof, resource)) {
    throw new Error('invalid qualification proof: need a dated passed job, matching scope/effective settings, access, return and evidence');
  }
  const routes = loadProofs(dir, now).filter((p) => !(p.id === proof.id && p.account === proof.account && p.environment === proof.environment && p.model===proof.model && p.effort===proof.effort));
  // Save only the proof contract, never extra fields or credentials from a supplied record.
  const saved = Object.fromEntries(['id', 'at', 'jobId', 'account', 'environment', 'model', 'effort', 'access', 'returnRef', 'evidence', 'result'].map((key) => [key, proof[key]]));
  if(object(proof.observed))saved.observed={model:proof.observed.model,effort:proof.observed.effort,thinking:proof.observed.thinking===true};
  routes.push(saved);
  writeAtomic(path.join(dir, PROVEN), { routes });
  return saved;
}

function isDirectory(dir) {
  try { return !!dir && fs.statSync(dir).isDirectory(); } catch { return false; }
}

function findCli(command, env, platform) {
  if (!command) return false;
  const suffixes = platform === 'win32' ? ['', ...(env.PATHEXT || '.EXE;.CMD;.BAT;.COM').toLowerCase().split(';')] : [''];
  const dirs = path.isAbsolute(command) ? [''] : (env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
  return dirs.some((dir) => suffixes.some((suffix) => {
    try {
      const file = path.join(dir, command + suffix);
      if (!fs.statSync(file).isFile()) return false;
      if (platform !== 'win32') fs.accessSync(file, fs.constants.X_OK);
      return true;
    } catch { return false; }
  }));
}

export function loadApproval({ dir = resolveSwarmDir(), workspace, swarm } = {}) {
  let saved;
  try { saved = JSON.parse(fs.readFileSync(path.join(dir, APPROVAL), 'utf8')); }
  catch (err) { if (err.code === 'ENOENT') return null; throw new Error('approval state unreadable or malformed'); }
  if (!object(saved) || !Array.isArray(saved.approved) || !saved.approved.length ||
      saved.approved.some((id) => !text(id) || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) ||
      !text(saved.workspace) || typeof saved.swarm !== 'string' || !dated(saved.at, Date.now())) {
    throw new Error('approval state malformed');
  }
  if (workspace !== undefined && path.resolve(workspace) !== saved.workspace) return null;
  if (swarm !== undefined && swarm !== saved.swarm) return null;
  return saved;
}

export function saveApproval(ids, resources, { dir = resolveSwarmDir(), workspace = process.cwd(), swarm = '', now = new Date() } = {}) {
  if (!Array.isArray(ids)) throw new Error('approval needs a resource selection');
  const approved = [...new Set(ids)];
  if (!approved.length || approved.some((id) => typeof id !== 'string' || !id)) throw new Error('approval needs a nonempty resource selection');
  for (const id of approved) {
    const resource = resources.find((r) => r.id === id);
    if (!resource) throw new Error(`unknown resource: ${id}`);
    if (resource.selectable === false || (!resource.selectable && !resource.available && !resource.installed)) throw new Error(`unavailable resource: ${id}`);
  }
  const saved = { approved, at: now.toISOString(), workspace: path.resolve(workspace), swarm };
  writeAtomic(path.join(dir, APPROVAL), saved);
  return saved;
}

export function discoverResources({ env = process.env, home = os.homedir(), overlay = overlayDir(env, home),
  platform = process.platform, cwd = process.cwd(), swarm = '', dir = resolveSwarmDir(env, home, platform), now = Date.now(), ids } = {}) {
  const routes = readRoutes({ env, home, overlay });
  const selected = ids ? new Set(ids) : null;
  const resources = routes.filter(r => !selected || selected.has(r.id)).map((route) => {
    const installed = route.cli ? findCli(route.cli, env, platform) : null;
    return { ...route, installed, authenticated: null, selectable: true };
  });
  for (const cli of CLIS) {
    if (selected && !selected.has(`${cli}-local`)) continue;
    if (routes.some((r) => r.kind === 'local' && r.cli === cli) || !findCli(cli, env, platform)) continue;
    resources.push({ id: `${cli}-local`, name: `${cli} CLI`, kind: 'local', cli, home: null, jobsDir: null,
      installed: true, authenticated: null, selectable: true, qualified: false, recommended: false, model: null, effort: null,
      account: null, environment: null, cost: 'unknown; verify before dispatch',
      dispatch: 'Use the qualified host route in ROUTES.md, or bg-swarm launch with a prompt file' });
  }
  // Homes are clues, not entitlement. Only an overlay route can make one dispatchable.
  const homes = new Set();
  if (!selected) try {
    for (const entry of fs.readdirSync(home, { withFileTypes: true })) {
      if (entry.isDirectory() && /cloud/i.test(entry.name)) homes.add(path.join(home, entry.name));
    }
  } catch (err) { if (err.code !== 'ENOENT') throw err; }
  for (const [key, value] of selected ? [] : Object.entries(env)) {
    if (/cloud.*home|home.*cloud/i.test(key) && isDirectory(value)) homes.add(path.resolve(value));
  }
  let index = 0;
  for (const cloudHome of [...homes].sort()) {
    if (resources.some((r) => r.home === cloudHome)) continue;
    resources.push({ id: `cloud-home-${++index}`, name: 'Detected cloud home', kind: 'cloud', home: cloudHome,
      installed: null, authenticated: null, selectable: false, qualified: false, recommended: false, cli: null, jobsDir: null, model: null, effort: null,
      account: null, environment: null, cost: 'unknown', dispatch: null });
  }
  if (new Set(resources.map((r) => r.id)).size !== resources.length) throw new Error('duplicate resource ID after discovery');
  const lastApproved = loadApproval({ dir });
  const known = new Set([...routes.map(r => r.id), ...resources.map((r) => r.id), ...CLIS.map((cli) => `${cli}-local`)]);
  if (lastApproved?.approved.some((id) => !known.has(id))) throw new Error('approval contains an unknown resource ID; reconcile the saved selection');
  const approved = lastApproved?.workspace === path.resolve(cwd) && lastApproved.swarm === swarm ? lastApproved : null;
  const previous = new Set(lastApproved?.approved || []);
  const stored = loadProofs(dir, now);
  const identities = observations(dir);
  const warnings = [];
  const provenResources = resources.map((route) => {
    const r = currentScope(route, identities, env, now);
    const proofs = stored.filter((p) => p.id === r.id && matchesProof(p, r, true)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const proven = proofs.length > 0 && r.observationValid && r.installed !== false && r.authenticated !== false && !!r.dispatch &&
      (r.kind !== 'cloud' || !r.home || isDirectory(r.home));
    const stale = proofs.length > 0 && now - Date.parse(proofs[0].at) > 30 * 86400000;
    if (stale) warnings.push(`${r.id}: proof over 30 days old; recheck account/environment/access, age alone does not invalidate it`);
    if (stored.some((p) => p.id === r.id) && !proofs.length) warnings.push(`${r.id}: saved proof does not match current scope/settings; qualify this route`);
    const state = proven ? 'proven' : r.authenticated === true ? 'authenticated' : r.installed === true ? 'installed' : 'unknown';
    const settingProofs=stored.filter(p=>p.id===r.id&&matchesProof(p,{...r,model:null,effort:null},true)&&r.observationValid);
    return { ...r, proofs, settingProofs, proven, stale, state, available: proven,
      status: `${state}; authentication ${r.authenticated === null ? 'unverified' : r.authenticated ? 'confirmed' : 'not confirmed'}; ${proven ? 'dated qualification matches observed account/environment; verify access scope' : !r.account ? 'unproven: current account unknown' : r.scopeMismatch ? 'unproven: environment changed' : stored.some(p => p.id === r.id && p.account !== r.account) && !proofs.length ? 'unproven: account changed' : 'unproven: account/environment/settings mismatch or qualifying job required'}`,
      recommended: proven && (previous.size ? previous.has(r.id) : r.recommended),
    };
  });
  return { workspace: path.resolve(cwd), swarm, approved, lastApproved, resources: provenResources, warnings,
    unknownIds: provenResources.filter((r) => !r.proven).map((r) => r.id),
    staleIds: provenResources.filter((r) => r.stale).map((r) => r.id),
  };
}
