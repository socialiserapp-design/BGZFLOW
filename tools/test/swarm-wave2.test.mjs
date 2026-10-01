import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { discoverResources } from '../swarm-resources/lib.mjs';
import { collectStatus } from '../swarm-status/lib.mjs';

// The 29 new wave-2 cases, ported to real generic files rather than private source-evaluation mocks.
const made = [], now = Date.parse('2026-01-01T12:00:00Z');
const scope = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wave2-')); made.push(root);
  const home = path.join(root, 'home'), overlay = path.join(root, 'overlay'), dir = path.join(root, 'state'), bin = path.join(root, 'bin');
  for (const d of [home, overlay, dir, bin, path.join(home, 'tree-a'), path.join(home, 'tree-b')]) fs.mkdirSync(d, { recursive: true });
  for (const cli of ['codex', 'grok', 'kimi', 'claude']) fs.writeFileSync(path.join(bin, cli), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
  const env = { PATH: bin, BG_SWARM_DIR: dir, CODEX_HOME: path.join(home, '.codex'), CODEX_CLOUD_HOME: path.join(home, '.codex-cloud'), CODEX_CLOUD_ENV_ID: 'env-a' };
  for (const h of [env.CODEX_HOME, env.CODEX_CLOUD_HOME, path.join(home, '.grok'), path.join(home, '.kimi'), path.join(home, '.claude')]) fs.mkdirSync(h);
  fs.writeFileSync(path.join(overlay, 'PROJECTS.md'), `| Project | Path |\n|---|---|\n| project-a | ${home} |\n`);
  const identities = ['codex-local', 'codex-cloud', 'grok-local', 'grok-cloud', 'kimi-local', 'claude-local', 'claude-cloud'].map(id => ({ id, account: id.startsWith('codex') ? 'codex:account-a' : id.startsWith('grok') ? 'grok:user-a:team-a' : id.startsWith('kimi') ? 'kimi:user-a' : 'claude:person-a:org-a', environment: scope(id === 'codex-cloud' ? env.CODEX_CLOUD_HOME : id === 'codex-local' ? env.CODEX_HOME : path.join(home, '.'+id.split('-')[0]))+(id === 'codex-cloud' ? '#env-a' : ''), authenticated: true, at: new Date(now).toISOString(), source: 'nonsecret provider login observation' }));
  fs.writeFileSync(
    path.join(overlay, 'ROUTES.md'),
    '| Resource | Kind | CLI | Home | Dispatch |\n|---|---|---|---|---|\n'
      + identities.map((identity) => {
        const provider = identity.id.split('-')[0];
        const providerHome = path.join(home, `.${provider}`);
        return `| ${identity.id} | ${identity.id.endsWith('cloud') ? 'cloud' : 'local'} | ${provider} | ${providerHome} | supported route |`;
      }).join('\n'),
  );
  const f = { root, home, overlay, dir, env, platform: 'linux', now, identities, isAlive: () => true };
  identity(f); return f;
}
after(() => made.forEach(d => fs.rmSync(d, { recursive: true, force: true })));
function identity(f) { fs.writeFileSync(path.join(f.dir, 'swarm-current-identities.json'), JSON.stringify({ identities: f.identities })); }
function proof(f, id = 'codex-local', extra = {}) { const i = f.identities.find(x => x.id === id); return { ...i, at: '2026-01-01T11:00:00Z', jobId: 'qualified', model: 'fixture-model', effort: 'max', access: 'verified owned scope', returnRef: id.endsWith('cloud') ? 'a'.repeat(40) : 'local-return', evidence: 'proof.json', result: 'passed', ...extra }; }
function resource(f, id = 'codex-local', proofs = [proof(f, id)]) { fs.writeFileSync(path.join(f.dir, 'swarm-proven-routes.json'), JSON.stringify({ routes: proofs })); return discoverResources({ ...f, cwd: f.home }).resources.find(x => x.id === id); }
function job(f, id, extra = {}) { const value = { id, status: 'running', cwd: path.join(f.home, 'tree-a'), project: 'project-a', pid: 1, createdAt: '2026-01-01T11:00:00Z', model: 'fixture-model', effort: 'max', summary: 'same description', ...extra }; const file = path.join(f.dir, id+'-'+fs.readdirSync(f.dir).length+'.json'); fs.writeFileSync(file, JSON.stringify(value)); return file; }
const duplicate = j => j.flags.some(s => /DUPLICATE/.test(s));
function pair(f, a, b, want) { job(f, 'a', a); job(f, 'b', b); assert.equal(collectStatus(f).jobs.every(j => duplicate(j) === want), true); }

test('W2-01 GOAL word prefixes do not invent a logical goal', () => { const f = fixture(); pair(f, { summary: 'first', request: { prompt: 'GOALKEEPER notes' } }, { summary: 'second', request: { prompt: 'GOALKEEPER notes' } }, false); });
test('W2-02 recorded GOAL prompts define identity before summary', () => { const f = fixture(); pair(f, { summary: 'first', request: { prompt: 'GOAL: Repair Checkout\nDetails' } }, { summary: 'second', request: { prompt: 'GOAL: repair-checkout\nOther' } }, true); });
test('W2-03 different recorded goals defeat identical truncated summaries', () => { const f = fixture(); pair(f, { request: { prompt: 'GOAL: checkout' } }, { request: { prompt: 'GOAL: billing' } }, false); });
test('W2-04 codex account changes invalidate qualification', () => { const f = fixture(), p = proof(f); f.identities[0].account = 'codex:account-b'; identity(f); const r = resource(f, 'codex-local', [p]); assert.equal(r.proven, false); assert.match(r.status, /account changed/); });
test('W2-05 matching older account proof survives a newer different account proof', () => { const f = fixture(); assert.equal(resource(f, 'codex-local', [proof(f), proof(f, 'codex-local', { at: '2026-01-01T11:59:00Z', account: 'codex:other' })]).proven, true); });
test('W2-06 missing current codex identity cannot reuse a proof', () => { const f = fixture(), p = proof(f); f.identities[0].account = null; identity(f); assert.equal(resource(f, 'codex-local', [p]).proven, false); });
test('W2-07 changed CODEX_HOME invalidates qualification', () => { const f = fixture(); f.env.CODEX_HOME = path.join(f.home, 'other'); const r = resource(f); assert.equal(r.proven, false); assert.match(r.status, /environment changed/); });
test('W2-08 current CODEX_HOME enables only its own scope', () => { const f = fixture(); f.env.CODEX_HOME = path.join(f.home, 'other'); f.identities[0].environment = scope(f.env.CODEX_HOME); identity(f); assert.equal(resource(f).proven, true); });
test('W2-09 account-less legacy proofs remain unproven', () => { const f = fixture(), p = proof(f); delete p.account; assert.throws(() => resource(f, 'codex-local', [p]), /proof/); });
test('W2-10 codex cloud uses its separate account', () => { const f = fixture(), id = 'codex-cloud', p = proof(f, id); f.identities.find(i => i.id === id).account = 'codex:cloud-b'; identity(f); assert.equal(resource(f, id, [p]).proven, false); });
test('W2-11 codex cloud proof binds selected environment', () => { const f = fixture(); f.env.CODEX_CLOUD_ENV_ID = 'env-b'; const r = resource(f, 'codex-cloud'); assert.equal(r.proven, false); assert.match(r.status, /environment changed/); });
test('W2-12 grok local and cloud match current login', () => { const f = fixture(); for (const id of ['grok-local', 'grok-cloud']) { const p = proof(f, id); assert.equal(resource(f, id, [p]).proven, true); f.identities.find(i => i.id === id).account = 'grok:user-b:team-b'; identity(f); assert.equal(resource(f, id, [p]).proven, false); } });
test('W2-13 ambiguous grok logins cannot reuse proof', () => { const f = fixture(), p = proof(f, 'grok-local'); f.identities.push({ ...f.identities.find(i => i.id === 'grok-local'), account: 'grok:other' }); identity(f); assert.equal(resource(f, 'grok-local', [p]).proven, false); });
test('W2-14 kimi qualification follows observed user identity without opening tokens', () => { const f = fixture(), id = 'kimi-local', p = proof(f, id); f.identities.find(i => i.id === id).account = 'kimi:user-b'; identity(f); assert.equal(resource(f, id, [p]).proven, false); });
test('W2-15 Claude local and cloud follow observed account and organization', () => { const f = fixture(); for (const id of ['claude-local', 'claude-cloud']) { const p = proof(f, id); assert.equal(resource(f, id, [p]).proven, true); f.identities.find(i => i.id === id).account = 'claude:person-b:org-b'; identity(f); assert.equal(resource(f, id, [p]).proven, false); } });
test('W2-16 Claude logged-out status defeats matching cached proof', () => { const f = fixture(), p = proof(f, 'claude-local'); f.identities.find(i => i.id === 'claude-local').authenticated = false; identity(f); assert.equal(resource(f, 'claude-local', [p]).proven, false); });
test('W2-17 logical goals overlap despite different summaries and worktrees', () => { const f = fixture(); pair(f, { goal: 'Build Checkout', ownedFiles: ['src/a.mjs'], summary: 'first' }, { goal: ' build-checkout ', ownedFiles: ['src/a.mjs'], summary: 'second', cwd: path.join(f.home, 'tree-b') }, true); });
test('W2-18 same summary does not merge distinct goals', () => { const f = fixture(); pair(f, { goal: 'checkout' }, { goal: 'billing' }, false); });
test('W2-19 same summary does not merge distinct task IDs', () => { const f = fixture(); pair(f, { taskId: 'T1' }, { taskId: 'T2' }, false); });
test('W2-20 different owned files keep parallel pieces separate', () => { const f = fixture(); pair(f, { slug: 'build', ownedFiles: ['src/a.mjs'] }, { slug: 'build', ownedFiles: ['src/b.mjs'] }, false); });
test('W2-21 owned order and worktree prefixes do not hide overlap', () => { const f = fixture(); pair(f, { slug: 'build-checkout', ownedFiles: [path.join(f.home, 'tree-a', 'src/a.mjs'), path.join(f.home, 'tree-a', 'src/b.mjs')] }, { goal: 'Build Checkout', cwd: path.join(f.home, 'tree-b'), ownedFiles: ['src/b.mjs', './src/a.mjs'] }, true); });
test('W2-22 nested request task fields define identity', () => { const f = fixture(); pair(f, { summary: '', request: { project: 'project-a', task: { slug: 'repair-cache', ownedFiles: ['cache.mjs'] } } }, { summary: 'other', request: { project: 'project-a', goal: 'Repair Cache', ownedFiles: ['cache.mjs'] } }, true); });
test('W2-23 identical logical tasks in different projects do not overlap', () => { const f = fixture(); pair(f, { project: 'project-a', slug: 'build' }, { project: 'project-b', slug: 'build' }, false); });
test('W2-24 nonoverlapping retries are not duplicate writers', () => { const f = fixture(); pair(f, { goal: 'checkout', status: 'completed', createdAt: '2026-01-01T10:00:00Z', completedAt: '2026-01-01T10:30:00Z' }, { goal: 'checkout', createdAt: '2026-01-01T11:00:00Z' }, false); });
test('W2-25 summary fallback is visibly weak', () => { const f = fixture(); job(f, 'a'); assert.match(collectStatus(f).jobs[0].flags.join(' '), /weak.*summary fallback/i); });
test('W2-26 completed raw output retains first line and record path', () => { const f = fixture(); const line = 'Finished '+ 'x'.repeat(160), file = job(f, 'a', { status: 'completed', completedAt: '2026-01-01T11:59:00Z', result: { rawOutput: ' '+line+'\nsecond' }, rendered: 'wrong' }); const r = collectStatus(f).resultRefs[0]; assert.equal(r.firstLine, line.slice(0,120)); assert.equal(r.recordPath, file); });
test('W2-27 failed rendered output is shown without rerunning a job', () => { const f = fixture(); job(f, 'a', { status: 'failed', completedAt: '2026-01-01T11:59:00Z', rendered: 'Failure: access denied\r\nrest' }); const r = collectStatus(f); assert.deepEqual(r.failedIds, ['a']); assert.equal(r.resultRefs[0].firstLine, 'Failure: access denied'); });
test('W2-28 plain and missing results retain record references', () => { const f = fixture(); job(f, 'a', { status: 'completed', completedAt: '2026-01-01T11:59:00Z', result: 'First result\nrest' }); job(f, 'b', { status: 'failed', completedAt: '2026-01-01T11:59:00Z' }); const r = collectStatus(f); assert.equal(r.resultRefs.find(x => x.id === 'a').firstLine, 'First result'); assert.equal(r.resultRefs.find(x => x.id === 'b').firstLine, ''); assert.ok(r.resultRefs.every(x => x.recordPath.endsWith('.json'))); });
test('W2-29 mirrored result reference follows the record containing output', () => { const f = fixture(); job(f, 'a', { updatedAt: '2026-01-01T11:00:00Z' }); const file = job(f, 'a', { status: 'completed', completedAt: '2026-01-01T11:59:00Z', updatedAt: '2026-01-01T11:59:00Z', result: { rawOutput: 'Completed once' } }); const r = collectStatus(f); assert.equal(r.jobs.length, 1); assert.equal(r.resultRefs.length, 1); assert.equal(r.resultRefs[0].recordPath, file); });
