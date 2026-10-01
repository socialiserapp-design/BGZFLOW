import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { startSwarm, recordState, hook, status } from '../swarm-gate.mjs';

test('J1 whole local journey: start, blocked/allowed dispatch, collect, integrate, suite, journey, review and release', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-journey-'));
  try {
    const git = (...args) => { const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
    git('init', '--quiet'); fs.writeFileSync(path.join(root, 'source.txt'), 'fixture\n');
    fs.writeFileSync(path.join(root,'source.test.mjs'),"import {test} from 'node:test';import fs from 'node:fs';import assert from 'node:assert/strict';test('source remains intact',()=>assert.equal(fs.readFileSync('source.txt','utf8'),'fixture\\n'));\n");git('add', 'source.txt','source.test.mjs');
    git('-c', 'user.name=BGZFLOW', '-c', 'user.email=bgzflow@users.noreply.github.com', 'commit', '-qm', 'fixture');
    const sha = git('rev-parse', 'HEAD'), dir = path.join(root, 'registry'), overlay = path.join(root, 'overlay'), bin = path.join(root, 'bin');
    for (const d of [dir, overlay, bin]) fs.mkdirSync(d);
    fs.writeFileSync(path.join(bin, 'codex'), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
    const environment = root.replace(/\\/g, '/').toLowerCase();
    const env = { ...process.env, BGZFLOW_PROJECT: root, BG_SWARM_DIR: dir, BGZFLOW_OVERLAY: overlay, CODEX_HOME: root, PATH: bin+path.delimiter+process.env.PATH };
    fs.writeFileSync(path.join(overlay, 'ROUTES.md'), `| Resource | Kind | CLI | Home | Dispatch | Model | Effort |\n|---|---|---|---|---|---|---|\n| codex-local | local | codex | ${root} | companion task | fixture-model | max |\n`);
    const i = { id: 'codex-local', account: 'codex:fixture', environment, authenticated: true, at: new Date().toISOString(), source: 'safe status fixture' };
    fs.writeFileSync(path.join(dir, 'swarm-current-identities.json'), JSON.stringify({ identities: [i] }));
    fs.writeFileSync(path.join(dir, 'swarm-proven-routes.json'), JSON.stringify({ routes: [{ ...i, jobId: 'qualification', model: 'fixture-model', effort: 'max', access: 'owned scratch and required services', returnRef: sha, evidence: 'qualification.json', result: 'passed' }] }));
    startSwarm(root, 'journey', { resources: ['codex-local'], limit: 'Small', wave0Sha: sha, policy: { models: ['fixture-model'], efforts: { default: ['max'] } }, pieces: { code: { owns: ['source.txt'] } } }, env);
    const brief = path.join(root, 'brief.md');
    fs.writeFileSync(brief, 'SWARM: journey\nPIECE: code\nKIND: build\nOWNS: ["source.txt"]\n\nRead bg-efficiency, test-driven-development, systematic-debugging, verification-before-completion.\nFast checks only.\nProof handback: exact SHA and exit codes.\n');
    const event = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'launch-1', cwd: root, tool_input: { command: `cx task --background --write --model wrong --effort max --prompt-file "${brief}"` } };
    assert.equal(hook(event, env).hookSpecificOutput.permissionDecision, 'deny'); assert.equal(status(root, undefined, env).used.jobs, 0);
    event.tool_input.command = event.tool_input.command.replace('--model wrong', '--model fixture-model'); assert.deepEqual(hook(event, env), {});
    assert.deepEqual(hook({ ...event, hook_event_name: 'PostToolUse', tool_response: { id: 'returned-job', status: 'running' } }, env), {});
    const production = { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: root, tool_input: { command: 'vercel --prod' } };
    assert.equal(hook(production, env).hookSpecificOutput.permissionDecision, 'deny');
    recordState(root, 'job', { id: 'returned-job', status: 'completed', workerHours: 0.1, returnRef: sha, evidence: 'worker-result.json' });
    const checkEnv={...process.env};delete checkEnv.NODE_TEST_CONTEXT;
    const fast=spawnSync(process.execPath,['--test','--test-reporter=tap','source.test.mjs'],{cwd:root,env:checkEnv,encoding:'utf8'});assert.equal(fast.status,0,fast.stderr);fs.writeFileSync(path.join(root,'fast.log'),fast.stdout);
    fs.writeFileSync(path.join(root,'worker-result.json'),JSON.stringify({jobId:'returned-job',source:{baseSha:sha,sha},checks:[{argv:['node','--test','source.test.mjs'],exitCode:0,stdoutFile:'fast.log',counts:{tests:1,pass:1,fail:0,skip:0}}]}));
    const admitted=recordState(root, 'piece', { piece: 'code', status: 'returned', returnRef: sha, evidence: 'worker-result.json',handbackFile:'worker-result.json',jobId:'returned-job' });assert.equal(admitted.allowed,true,JSON.stringify(admitted));
    recordState(root, 'candidate', { sha });
    assert.equal(hook(production, env).hookSpecificOutput.permissionDecision, 'deny');
    for (const stage of ['suite', 'journey']) recordState(root, 'result', { stage, sha, status: 'passed', exitCode: 0, evidence: stage+'.log', reviewer: stage === 'review' ? 'independent-checker' : '' });
    recordState(root,'rehearsal',{sha,goldenJourneys:'passed',rollbackProven:true,rollbackEvidence:'rollback.log',evidence:'rehearsal.log',exitCode:0});
    assert.deepEqual(hook(production, env), {}); assert.equal(status(root, undefined, env).releaseOpen, true);
    assert.equal(status(root, undefined, env).used.jobs, 1);
    recordState(root, 'finish', {}); assert.deepEqual(hook({ ...event, tool_input: { command: 'cx task --model anything' } }, env), {});
    assert.equal(git('rev-parse', 'HEAD'), sha);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
