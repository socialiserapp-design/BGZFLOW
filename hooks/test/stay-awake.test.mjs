import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateUniversalStop, findPeerWake, MAIL_ACK_REL_PATH, PEER_WAKE_REL_PATH } from '../lib/universal-stop.mjs';
import {
  learnSessionIdentity,
  parsePlainBgMailCommand,
  readSessionState,
  sessionFile,
  sessionIdentity,
  updateSessionState,
} from '../lib/session-identity.mjs';
import { hook as swarmGateHook } from '../../tools/swarm-gate/swarm-gate.mjs';

const MINUTE = 60000;
const BG_MAIL = fileURLToPath(new URL('../../tools/bg-mail/bg-mail.mjs', import.meta.url));
let seq = 0;

function makeTempDir(prefix = 'bgz-stay-awake-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Launcher-style wrappers around bg-mail: one passes stdio and env through (like the company launcher),
// one captures bg-mail's output and prints only its own word (so the hook never sees the posted message).
const WRAPPER_DIR = makeTempDir('bgz-mail-wrappers-');
const WRAPPERS = {
  inherit: path.join(WRAPPER_DIR, 'launch-inherit.mjs'),
  captured: path.join(WRAPPER_DIR, 'launch-captured.mjs'),
};
fs.writeFileSync(
  WRAPPERS.inherit,
  `import { spawnSync } from 'node:child_process';\nconst r = spawnSync(process.execPath, [${JSON.stringify(BG_MAIL)}, ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });\nprocess.exit(r.status ?? 1);\n`,
  'utf8',
);
fs.writeFileSync(
  WRAPPERS.captured,
  `import { spawnSync } from 'node:child_process';\nconst r = spawnSync(process.execPath, [${JSON.stringify(BG_MAIL)}, ...process.argv.slice(2)], { encoding: 'utf8', env: process.env });\nconsole.log(r.status === 0 ? 'posted' : 'failed');\nprocess.exit(r.status ?? 1);\n`,
  'utf8',
);

function fixture() {
  const cwd = makeTempDir('bgz-shared-folder-');
  const mailRoot = makeTempDir('bgz-mail-');
  const sessionsDir = makeTempDir('bgz-sessions-');
  fs.mkdirSync(path.join(mailRoot, 'demo-app'), { recursive: true });
  const env = { BG_MAIL_DIR: mailRoot, BGZFLOW_SESSIONS_DIR: sessionsDir };
  const write = (fields) => {
    const createdAt = new Date(Date.now() - (fields.ageMinutes || 0) * MINUTE).toISOString();
    seq += 1;
    const id = `${Date.parse(createdAt)}-${String(seq).padStart(4, '0')}-${fields.from}`;
    const msg = { schema: 'bg-mail/v1', id, project: 'demo-app', kind: 'question', body: 'Please check.', default: null, waitMinutes: 15, state: 'open', createdAt, ...fields };
    delete msg.ageMinutes;
    fs.writeFileSync(path.join(mailRoot, 'demo-app', `${id}.json`), JSON.stringify(msg, null, 2), 'utf8');
    return msg;
  };
  const learn = (sessionId, role, project = 'demo-app') =>
    updateSessionState(sessionId, { project, role, learnedAt: new Date().toISOString(), source: 'bg-mail-post' }, env);
  const stop = (sessionId, extra = {}, extraEnv = {}) =>
    evaluateUniversalStop({ cwd, session_id: sessionId, hook_event_name: 'Stop', ...extra }, { projectDir: cwd, env: { ...env, ...extraEnv } });
  return { cwd, mailRoot, sessionsDir, env, write, learn, stop };
}

// Runs the real bg-mail (directly or through a wrapper) as a chat's shell child would: the chat's own
// CLAUDE_CODE_SESSION_ID in its env (null = none, as in Codex). Returns what the PostToolUse hook would see.
function runMail(fx, sessionId, args, via = 'direct') {
  const env = { ...process.env, BG_MAIL_DIR: fx.mailRoot, BGZFLOW_SESSIONS_DIR: fx.sessionsDir };
  delete env.CLAUDE_CODE_SESSION_ID;
  if (sessionId) env.CLAUDE_CODE_SESSION_ID = sessionId;
  const script = via === 'direct' ? BG_MAIL : WRAPPERS[via];
  const r = spawnSync(process.execPath, [script, ...args], { cwd: fx.cwd, env, encoding: 'utf8' });
  const quoted = args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '')}"` : a)).join(' ');
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', command: `node "${script}" ${quoted}` };
}

const postArgs = (from, to = 'ops', body = 'started', kind = 'info') =>
  ['post', '--project', 'demo-app', '--from', from, '--to', to, '--kind', kind, '--body', body];

const lastJson = (stdout) => JSON.parse(String(stdout).trim().split(/\r?\n/).filter((l) => l.trim().startsWith('{')).pop());

const toolInput = (fx, sessionId, run, extra = {}) => ({
  hook_event_name: 'PostToolUse',
  session_id: sessionId,
  cwd: fx.cwd,
  tool_name: 'Bash',
  tool_input: { command: run.command },
  tool_response: { stdout: run.stdout, stderr: run.stderr || '', exit_code: run.status },
  ...extra,
});

const postTool = (fx, sessionId, run, extra = {}, extraEnv = {}) =>
  swarmGateHook(toolInput(fx, sessionId, run, extra), { ...fx.env, ...extraEnv });

// Makes writes, renames and mkdirs under the given folders fail with EACCES. The hook libraries use the
// default node:fs object, so this reaches them. Returns a function that restores fs.
function denyWrites(...folders) {
  const norm = (p) => path.resolve(String(p)).toLowerCase();
  const blocked = folders.map(norm);
  const hit = (p) => blocked.some((b) => norm(p) === b || norm(p).startsWith(b + path.sep));
  const orig = { writeFileSync: fs.writeFileSync, renameSync: fs.renameSync, mkdirSync: fs.mkdirSync };
  const eacces = (p) => Object.assign(new Error(`EACCES (test): ${p}`), { code: 'EACCES' });
  fs.writeFileSync = function (p, ...rest) { if (hit(p)) throw eacces(p); return orig.writeFileSync.call(this, p, ...rest); };
  fs.renameSync = function (a, b) { if (hit(a) || hit(b)) throw eacces(b); return orig.renameSync.call(this, a, b); };
  fs.mkdirSync = function (p, ...rest) { if (hit(p)) throw eacces(p); return orig.mkdirSync.call(this, p, ...rest); };
  return () => Object.assign(fs, orig);
}

const isDeny = (r) => r?.hookSpecificOutput?.permissionDecision === 'deny';

describe('stay-awake hooks: session identity, per-chat inboxes and peer-wake (BGZFLOW 0.9.8+20261020.3)', () => {
  it('main-thread direct post promotes its own pending claim; latest post wins; unsafe ids stay contained', () => {
    const fx = fixture();
    const first = runMail(fx, 'sess-main', postArgs('lucian-builder'));
    assert.equal(first.status, 0, first.stderr);
    const posted = lastJson(first.stdout);
    let state = readSessionState('sess-main', fx.env);
    assert.ok(state.pendingClaims[posted.id], 'bg-mail post leaves a pending claim');
    assert.equal(state.role, undefined, 'the claim alone sets no identity');

    postTool(fx, 'sess-main', first);
    state = readSessionState('sess-main', fx.env);
    assert.equal(state.project, 'demo-app');
    assert.equal(state.role, 'lucian-builder');
    assert.equal(state.source, 'pending-claim:bg-mail-post');
    assert.ok(Date.parse(state.learnedAt));
    assert.equal(state.pendingClaims[posted.id], undefined, 'a promoted claim is removed');

    const second = runMail(fx, 'sess-main', postArgs('lucian-lead'));
    postTool(fx, 'sess-main', second);
    assert.equal(readSessionState('sess-main', fx.env).role, 'lucian-lead');

    assert.ok(sessionFile('../../evil', fx.env).startsWith(fx.env.BGZFLOW_SESSIONS_DIR));
    assert.equal(learnSessionIdentity({ tool_input: { command: 'node bg-mail.mjs post --project a --from b' } }, fx.env), null);
    assert.equal(learnSessionIdentity(null, fx.env), null);
  });

  it('a launcher-wrapped post (stdio and env passed through) promotes', () => {
    const fx = fixture();
    const run = runMail(fx, 'sess-wrapped', postArgs('ops-lead'), 'inherit');
    assert.equal(run.status, 0, run.stderr);
    assert.equal(parsePlainBgMailCommand(run.command), null, 'the wrapper command is not a plain bg-mail command');
    postTool(fx, 'sess-wrapped', run);
    const state = readSessionState('sess-wrapped', fx.env);
    assert.equal(state.role, 'ops-lead');
    assert.equal(state.source, 'pending-claim:bg-mail-post');
  });

  it('a wrapper that captures bg-mail output does not promote; bg-mail register then does', () => {
    const fx = fixture();
    const run = runMail(fx, 'sess-cap', postArgs('builder'), 'captured');
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout.trim(), 'posted');
    postTool(fx, 'sess-cap', run);
    let state = readSessionState('sess-cap', fx.env);
    assert.equal(state.role, undefined);
    assert.equal(Object.keys(state.pendingClaims).length, 1, 'the hidden post left its claim pending');

    const reg = runMail(fx, 'sess-cap', ['register', '--project', 'demo-app', '--role', 'builder']);
    assert.equal(reg.status, 0, reg.stderr);
    assert.equal(lastJson(reg.stdout).pending, true);
    postTool(fx, 'sess-cap', reg);
    state = readSessionState('sess-cap', fx.env);
    assert.equal(state.role, 'builder');
    assert.equal(state.source, 'pending-claim:bg-mail-register');
  });

  it("a subagent's post (agent_id present) never changes the parent's identity, now or later", () => {
    const fx = fixture();
    const main = runMail(fx, 'sess-parent', postArgs('lead'));
    postTool(fx, 'sess-parent', main);
    assert.equal(readSessionState('sess-parent', fx.env).role, 'lead');

    // Subagents share the parent's CLAUDE_CODE_SESSION_ID, so the post claims into the parent's file.
    const sub = runMail(fx, 'sess-parent', postArgs('helper', 'ops', 'sub result'));
    const subMsg = lastJson(sub.stdout);
    assert.ok(readSessionState('sess-parent', fx.env).pendingClaims[subMsg.id]);
    assert.equal(learnSessionIdentity(toolInput(fx, 'sess-parent', sub, { agent_id: 'agent-abc' }), fx.env), null);
    postTool(fx, 'sess-parent', sub, { agent_id: 'agent-abc' });
    let state = readSessionState('sess-parent', fx.env);
    assert.equal(state.role, 'lead');
    assert.equal(state.pendingClaims[subMsg.id], undefined, "the subagent's claim is dropped");

    // A later main-thread read of that open message does not promote it either.
    const got = runMail(fx, 'sess-parent', ['get', '--project', 'demo-app', '--id', subMsg.id]);
    assert.equal(got.status, 0, got.stderr);
    postTool(fx, 'sess-parent', got);
    state = readSessionState('sess-parent', fx.env);
    assert.equal(state.role, 'lead');
    assert.equal(state.source, 'pending-claim:bg-mail-post');
  });

  it('an old id seen again is not promoted twice, and an expired claim is never promoted', () => {
    const fx = fixture();
    const a = runMail(fx, 'sess-old', postArgs('lead'));
    const idA = lastJson(a.stdout).id;
    postTool(fx, 'sess-old', a);
    const reg = runMail(fx, 'sess-old', ['register', '--project', 'demo-app', '--role', 'reviewer']);
    postTool(fx, 'sess-old', reg);
    assert.equal(readSessionState('sess-old', fx.env).role, 'reviewer');

    const getA = runMail(fx, 'sess-old', ['get', '--project', 'demo-app', '--id', idA]);
    assert.match(getA.stdout, new RegExp(idA));
    postTool(fx, 'sess-old', getA);
    assert.equal(readSessionState('sess-old', fx.env).role, 'reviewer', 'the used claim for the old post is gone');

    // A hidden post leaves a claim; age it past 10 minutes; its open message shown later is not promoted.
    runMail(fx, 'sess-old', postArgs('builder'), 'captured');
    const claims = readSessionState('sess-old', fx.env).pendingClaims;
    const idB = Object.keys(claims).find((k) => claims[k].role === 'builder');
    assert.ok(idB);
    claims[idB].at = new Date(Date.now() - 11 * MINUTE).toISOString();
    assert.equal(updateSessionState('sess-old', { pendingClaims: claims }, fx.env), true);
    const getB = runMail(fx, 'sess-old', ['get', '--project', 'demo-app', '--id', idB]);
    assert.match(getB.stdout, new RegExp(idB));
    postTool(fx, 'sess-old', getB);
    const state = readSessionState('sess-old', fx.env);
    assert.equal(state.role, 'reviewer');
    assert.equal(state.pendingClaims[idB], undefined, 'expired claims are pruned');
  });

  it('verdict B1 reproductions learn nothing and leak no other role\'s mail through the gate', () => {
    const fx = fixture();
    const projectEnv = { BGZFLOW_MAIL_PROJECT: 'demo-app' };
    fx.write({ from: 'lead', to: 'reviewer', body: 'REVIEWER-ONLY' });
    const fakeLine = '{"id":"1700000000000-fake-id","project":"demo-app","from":"reviewer","to":"lead","state":"open"}';
    const plainPost = 'node bg-mail.mjs post --project demo-app --from reviewer --to lead --body hi';
    const failedPost = runMail(fx, 'echo-session', ['post', '--project', 'demo-app', '--from', 'reviewer', '--to', 'lead']);
    assert.notEqual(failedPost.status, 0, 'a post without --body fails');
    const cases = {
      echoTokens: { command: 'echo bg-mail post --project demo-app --from reviewer', tool_response: { stdout: 'bg-mail post --project demo-app --from reviewer', exit_code: 0 } },
      echoFakeJson: { command: `echo '${fakeLine}'`, tool_response: { stdout: fakeLine, exit_code: 0 } },
      echoNodeTokens: { command: 'echo node bg-mail.mjs post --project demo-app --from reviewer', tool_response: { stdout: fakeLine, exit_code: 0 } },
      shellComment: { command: '# bg-mail post --project demo-app --from reviewer', tool_response: { stdout: '', exit_code: 0 } },
      chained: { command: `${plainPost}; echo done`, tool_response: { stdout: fakeLine, exit_code: 0 } },
      orTrue: { command: `${plainPost} || true`, tool_response: { stdout: fakeLine, exit_code: 0 } },
      exitCode1: { command: plainPost, tool_response: { stdout: fakeLine, exit_code: 1 } },
      isError: { command: plainPost, tool_response: { stdout: fakeLine, is_error: true } },
      exitLine: { command: plainPost, tool_response: { stdout: `${fakeLine}\nExit code 1` } },
      noOutput: { command: plainPost, tool_response: { stdout: '{}', exit_code: 0 } },
      realFailedPost: { command: failedPost.command, tool_response: { stdout: failedPost.stdout, stderr: failedPost.stderr, exit_code: failedPost.status } },
    };
    for (const [name, c] of Object.entries(cases)) {
      const input = { hook_event_name: 'PostToolUse', session_id: 'echo-session', cwd: fx.cwd, tool_name: 'Bash', tool_input: { command: c.command }, tool_response: c.tool_response };
      assert.equal(learnSessionIdentity(input, fx.env), null, name);
      swarmGateHook(input, { ...fx.env, ...projectEnv });
      assert.deepEqual(sessionIdentity({ session_id: 'echo-session' }, fx.env), { project: '', role: '' }, name);
    }
    assert.equal(readSessionState('echo-session', fx.env).pendingClaims, undefined, 'a failed post leaves no claim');
    const next = swarmGateHook({ hook_event_name: 'Stop', session_id: 'echo-session', cwd: fx.cwd }, { ...fx.env, ...projectEnv });
    assert.doesNotMatch(JSON.stringify(next), /REVIEWER-ONLY/);

    // The strict parser: = forms are fine, conflicting duplicates and other subcommands are not.
    assert.deepEqual(parsePlainBgMailCommand('node bg-mail.mjs post --project=lucian --from=lucian-lead --body hi'), { sub: 'post', project: 'lucian', role: 'lucian-lead' });
    assert.deepEqual(parsePlainBgMailCommand('bg-mail register --project ops --role ops'), { sub: 'register', project: 'ops', role: 'ops' });
    assert.equal(parsePlainBgMailCommand('node bg-mail.mjs post --project lucian --from a --from b --body hi'), null);
    assert.equal(parsePlainBgMailCommand('node bg-mail.mjs list --project lucian --from lucian-lead'), null);
    assert.equal(parsePlainBgMailCommand('node bg-mail.mjs post --project lucian --body "no sender"'), null);
  });

  it('strict fallback for hosts with no session variable (Codex): one plain successful post or register', () => {
    const fx = fixture();
    const run = runMail(fx, null, postArgs('codex-lead'));
    assert.equal(run.status, 0, run.stderr);
    const learned = learnSessionIdentity(toolInput(fx, 'codex-1', run), fx.env);
    assert.equal(learned?.role, 'codex-lead');
    assert.equal(learned?.source, 'command:post');

    const reg = runMail(fx, null, ['register', '--project', 'demo-app', '--role', 'codex-reviewer']);
    assert.equal(lastJson(reg.stdout).pending, false, 'no session variable: nothing to claim into');
    const viaReg = learnSessionIdentity(toolInput(fx, 'codex-2', reg), fx.env);
    assert.equal(viaReg?.role, 'codex-reviewer');
    assert.equal(viaReg?.source, 'command:register');

    assert.equal(learnSessionIdentity(toolInput(fx, 'codex-3', { ...run, stdout: '{}' }), fx.env), null);
    assert.equal(learnSessionIdentity(toolInput(fx, 'codex-4', run, { agent_id: 'sub-1' }), fx.env), null, 'never inside a subagent');
  });

  it('a message FROM Main does not rename the receiver, and the receiver still gets it once', () => {
    const fx = fixture();
    fx.learn('sess-recv', 'builder');
    const sent = runMail(fx, 'sess-main', postArgs('Main', 'builder', 'Please build slice two.', 'question'));
    const msg = lastJson(sent.stdout);
    const got = runMail(fx, 'sess-recv', ['get', '--project', 'demo-app', '--id', msg.id]);
    postTool(fx, 'sess-recv', got);
    const listed = runMail(fx, 'sess-recv', ['list', '--project', 'demo-app']);
    assert.match(listed.stdout, new RegExp(msg.id));
    postTool(fx, 'sess-recv', listed);
    const state = readSessionState('sess-recv', fx.env);
    assert.equal(state.role, 'builder');
    assert.equal(state.source, 'bg-mail-post');

    const first = fx.stop('sess-recv');
    assert.equal(first.decision, 'block');
    assert.match(first.reason, new RegExp(msg.id));
    assert.notEqual(fx.stop('sess-recv').decision, 'block');
  });

  it('two sessions in one folder (one direct post, one wrapped) each get only their own mail', () => {
    const fx = fixture();
    postTool(fx, 'sess-a', runMail(fx, 'sess-a', postArgs('lead')));
    postTool(fx, 'sess-b', runMail(fx, 'sess-b', postArgs('builder'), 'inherit'));
    assert.equal(readSessionState('sess-a', fx.env).role, 'lead');
    assert.equal(readSessionState('sess-b', fx.env).role, 'builder');
    const toLead = fx.write({ from: 'reviewer', to: 'lead', body: 'For the lead.' });
    const toBuilder = fx.write({ from: 'reviewer', to: 'builder', body: 'For the builder.' });

    const a = fx.stop('sess-a');
    assert.equal(a.decision, 'block');
    assert.match(a.reason, new RegExp(toLead.id));
    assert.doesNotMatch(a.reason, new RegExp(toBuilder.id));
    const b = fx.stop('sess-b');
    assert.equal(b.decision, 'block', "A's Stop did not use up B's mail");
    assert.match(b.reason, new RegExp(toBuilder.id));
    assert.doesNotMatch(b.reason, new RegExp(toLead.id));
    assert.notEqual(fx.stop('sess-a').decision, 'block');
    assert.notEqual(fx.stop('sess-b').decision, 'block');
    assert.ok(!(readSessionState('sess-a', fx.env).deliveredIds || []).includes(toBuilder.id));
    assert.ok(!(readSessionState('sess-b', fx.env).deliveredIds || []).includes(toLead.id));
    assert.equal(fs.existsSync(path.join(fx.cwd, MAIL_ACK_REL_PATH)), false);
  });

  it('fix round 2: a worker that inherited the chat session id never renames the chat; received mail never teaches', () => {
    for (const prior of [true, false]) {
      const fx = fixture();
      const sid = `sess-inherit-${prior}`;
      if (prior) {
        postTool(fx, sid, runMail(fx, sid, postArgs('lead')));
        assert.equal(readSessionState(sid, fx.env).role, 'lead');
      }
      // A worker process started from the chat's shell inherits CLAUDE_CODE_SESSION_ID and posts as builder.
      // Its own host's hooks never fire in this chat, so the claim just sits in the chat's file.
      const worker = runMail(fx, sid, postArgs('builder', 'lead', 'worker result', 'status'));
      assert.equal(worker.status, 0, worker.stderr);
      const wMsg = lastJson(worker.stdout);
      assert.ok(readSessionState(sid, fx.env).pendingClaims[wMsg.id], 'the inherited post claimed into the chat file');
      const expectRole = prior ? 'lead' : undefined;

      // The chat then reads its mail: get, list, and a collect whose output prints the worker's open message.
      const got = runMail(fx, sid, ['get', '--project', 'demo-app', '--id', wMsg.id]);
      assert.equal(got.status, 0, got.stderr);
      assert.match(got.stdout, new RegExp(wMsg.id));
      postTool(fx, sid, got);
      assert.equal(readSessionState(sid, fx.env).role, expectRole, `get (prior=${prior})`);
      const listed = runMail(fx, sid, ['list', '--project', 'demo-app']);
      postTool(fx, sid, listed);
      assert.equal(readSessionState(sid, fx.env).role, expectRole, `list (prior=${prior})`);
      const collected = { status: 0, stdout: `${JSON.stringify(wMsg)}\n`, stderr: '', command: `node "${BG_MAIL}" collect --from spool` };
      postTool(fx, sid, collected);
      assert.equal(readSessionState(sid, fx.env).role, expectRole, `collect (prior=${prior})`);
      // Launching the worker with the post inside its quoted prompt, and the worker's output shown, teaches nothing.
      const launch = { status: 0, stdout: worker.stdout, stderr: '', command: 'codex exec "node bg-mail.mjs post --project demo-app --from builder --to lead --body hi"' };
      assert.equal(learnSessionIdentity(toolInput(fx, sid, launch), fx.env), null, `launch (prior=${prior})`);
      assert.equal(readSessionState(sid, fx.env).role, expectRole);
    }

    // A claim for another role never overwrites a confirmed identity on the claim path, even when this
    // chat's own wrapped command printed it; a deliberate role change is one plain bg-mail command.
    const fx = fixture();
    postTool(fx, 'sess-guard', runMail(fx, 'sess-guard', postArgs('lead')));
    const wrapped = runMail(fx, 'sess-guard', postArgs('builder'), 'inherit');
    postTool(fx, 'sess-guard', wrapped);
    assert.equal(readSessionState('sess-guard', fx.env).role, 'lead');
    const sameRole = runMail(fx, 'sess-guard', postArgs('lead', 'ops', 'again'), 'inherit');
    const confirmedSame = learnSessionIdentity(toolInput(fx, 'sess-guard', sameRole), fx.env);
    assert.equal(confirmedSame?.role, 'lead');
    assert.equal(confirmedSame?.source, 'pending-claim:bg-mail-post', 'a same-role wrapped post still confirms');
    const plain = runMail(fx, 'sess-guard', postArgs('reviewer'));
    postTool(fx, 'sess-guard', plain);
    const state = readSessionState('sess-guard', fx.env);
    assert.equal(state.role, 'reviewer');
    assert.equal(state.source, 'command:post');

    // A register line in the output of a different command (not register) is not enough.
    const fx2 = fixture();
    const reg = runMail(fx2, 'sess-reg', ['register', '--project', 'demo-app', '--role', 'builder'], 'captured');
    const regClaims = readSessionState('sess-reg', fx2.env).pendingClaims;
    const regId = Object.keys(regClaims)[0];
    assert.ok(regId);
    const fakeEcho = { status: 0, stdout: JSON.stringify({ ok: true, command: 'register', project: 'demo-app', role: 'builder', claimId: regId }), stderr: '', command: `node "${BG_MAIL}" list --project demo-app` };
    postTool(fx2, 'sess-reg', fakeEcho);
    assert.equal(readSessionState('sess-reg', fx2.env).role, undefined);
    assert.equal(reg.status, 0);
  });

  it('B2 inbox: a failed session write falls back to the folder, never re-blocks, and fails open', () => {
    // Session folder denied: block once, then allow (also on re-entry); ids saved in the folder fallback.
    let fx = fixture();
    fx.learn('sess-wf', 'reviewer');
    const msg = fx.write({ from: 'lead', to: 'reviewer', body: 'REVIEWER-ONLY' });
    let restore = denyWrites(fx.sessionsDir);
    try {
      const results = [fx.stop('sess-wf'), fx.stop('sess-wf', { stop_hook_active: true }), fx.stop('sess-wf', { stop_hook_active: true })];
      assert.deepEqual(results.map((r) => r.decision), ['block', 'allow', 'allow']);
      assert.match(results[0].reason, new RegExp(msg.id));
      assert.equal(fs.existsSync(path.join(fx.cwd, MAIL_ACK_REL_PATH)), true);
      assert.equal(fx.stop('sess-wf').decision, 'allow');
    } finally {
      restore();
    }

    // The same through the registered swarm-gate hook.
    fx = fixture();
    fx.learn('sess-gate', 'reviewer');
    fx.write({ from: 'lead', to: 'reviewer', body: 'REVIEWER-ONLY' });
    restore = denyWrites(fx.sessionsDir);
    try {
      const results = [false, true, true].map((active) =>
        swarmGateHook({ hook_event_name: 'Stop', session_id: 'sess-gate', cwd: fx.cwd, stop_hook_active: active }, fx.env));
      assert.equal(results[0].decision, 'block');
      assert.notEqual(results[1].decision, 'block');
      assert.notEqual(results[2].decision, 'block');
    } finally {
      restore();
    }

    // Nothing writable: no block at all; once writes work again the mail is delivered once.
    fx = fixture();
    fx.learn('sess-none', 'reviewer');
    const later = fx.write({ from: 'lead', to: 'reviewer', body: 'REVIEWER-ONLY' });
    restore = denyWrites(fx.sessionsDir, fx.cwd);
    try {
      assert.equal(fx.stop('sess-none').decision, 'allow');
      assert.equal(fx.stop('sess-none').decision, 'allow');
      assert.notEqual(swarmGateHook({ hook_event_name: 'Stop', session_id: 'sess-none', cwd: fx.cwd }, fx.env).decision, 'block');
    } finally {
      restore();
    }
    const delivered = fx.stop('sess-none');
    assert.equal(delivered.decision, 'block');
    assert.match(delivered.reason, new RegExp(later.id));
    assert.equal(fx.stop('sess-none').decision, 'allow');
  });

  it('B2 urgent mail: PreToolUse denies once when the notice is saved, and never when it cannot be', () => {
    let fx = fixture();
    fx.learn('sess-urgent', 'reviewer');
    fx.write({ from: 'lead', to: 'reviewer', kind: 'blocker', body: 'Stop the build.' });
    const pre = (f) => swarmGateHook({ hook_event_name: 'PreToolUse', session_id: 'sess-urgent', cwd: f.cwd, tool_name: 'Bash', tool_input: { command: 'git status' } }, f.env);
    let restore = denyWrites(fx.sessionsDir);
    try {
      assert.equal(isDeny(pre(fx)), true);
      assert.equal(isDeny(pre(fx)), false);
      assert.equal(isDeny(pre(fx)), false);
    } finally {
      restore();
    }

    fx = fixture();
    fx.learn('sess-urgent', 'reviewer');
    fx.write({ from: 'lead', to: 'reviewer', kind: 'blocker', body: 'Stop the build.' });
    restore = denyWrites(fx.sessionsDir, fx.cwd);
    try {
      assert.equal(isDeny(pre(fx)), false);
      assert.equal(isDeny(pre(fx)), false);
    } finally {
      restore();
    }
  });

  it('B2 peer-wake: the 30-minute cooldown holds when the session write fails, and no wake when nothing saves', () => {
    let fx = fixture();
    fx.learn('sess-wake', 'lead');
    fx.write({ from: 'lead', to: 'reviewer', kind: 'question', ageMinutes: 30, body: 'Ready?' });
    let restore = denyWrites(fx.sessionsDir);
    try {
      const results = [fx.stop('sess-wake'), fx.stop('sess-wake'), fx.stop('sess-wake', { stop_hook_active: true })];
      assert.deepEqual(results.map((r) => r.decision), ['block', 'allow', 'allow']);
      assert.equal(results[0].code, 'peer-wake-computer-use');
      assert.equal(fs.existsSync(path.join(fx.cwd, PEER_WAKE_REL_PATH)), true);
    } finally {
      restore();
    }

    fx = fixture();
    fx.learn('sess-wake', 'lead');
    fx.write({ from: 'lead', to: 'reviewer', kind: 'question', ageMinutes: 30, body: 'Ready?' });
    restore = denyWrites(fx.sessionsDir, fx.cwd);
    try {
      const results = [fx.stop('sess-wake'), fx.stop('sess-wake'), fx.stop('sess-wake')];
      assert.deepEqual(results.map((r) => r.decision), ['allow', 'allow', 'allow']);
    } finally {
      restore();
    }
  });

  it("B3: distinct session ids never share a file or identity ('a/b' vs 'a?b', long shared prefixes)", () => {
    const fx = fixture();
    fx.write({ from: 'lead', to: 'reviewer', body: 'REVIEWER-ONLY' });
    assert.equal(updateSessionState('a/b', { project: 'demo-app', role: 'reviewer' }, fx.env), true);
    assert.notEqual(sessionFile('a/b', fx.env), sessionFile('a?b', fx.env));
    assert.deepEqual(sessionIdentity({ session_id: 'a?b' }, fx.env), { project: '', role: '' });
    assert.doesNotMatch(JSON.stringify(fx.stop('a?b')), /REVIEWER-ONLY/);

    const long1 = `${'x'.repeat(128)}1`;
    const long2 = `${'x'.repeat(128)}2`;
    assert.notEqual(sessionFile(long1, fx.env), sessionFile(long2, fx.env));
    assert.equal(updateSessionState(long1, { project: 'demo-app', role: 'reviewer' }, fx.env), true);
    assert.equal(sessionIdentity({ session_id: long1 }, fx.env).role, 'reviewer');
    assert.deepEqual(sessionIdentity({ session_id: long2 }, fx.env), { project: '', role: '' });
    assert.doesNotMatch(JSON.stringify(fx.stop(long2)), /REVIEWER-ONLY/);
  });


  it('gives two chats in one shared folder only their own mail, once each', () => {
    const { cwd, write, learn, stop } = fixture();
    learn('sess-lead', 'lead');
    learn('sess-builder', 'builder');
    const toLead = write({ from: 'builder', to: 'lead', body: 'Handback ready for lead.' });
    const toBuilder = write({ from: 'lead', to: 'builder', body: 'Please build slice two.' });

    const lead = stop('sess-lead');
    assert.equal(lead.decision, 'block');
    assert.equal(lead.code, 'unread-bg-mail');
    assert.match(lead.reason, new RegExp(toLead.id));
    assert.doesNotMatch(lead.reason, new RegExp(toBuilder.id));

    const builder = stop('sess-builder');
    assert.equal(builder.decision, 'block');
    assert.match(builder.reason, new RegExp(toBuilder.id));
    assert.doesNotMatch(builder.reason, new RegExp(toLead.id));

    // Once per message per chat; the folder-wide ack file is not used when the session is known.
    assert.notEqual(stop('sess-lead').decision, 'block');
    assert.notEqual(stop('sess-builder').decision, 'block');
    assert.equal(fs.existsSync(path.join(cwd, MAIL_ACK_REL_PATH)), false);
  });

  it('treats an unknown session exactly as before (role file + env project, delivered once)', () => {
    const { cwd, env, write, stop } = fixture();
    fs.mkdirSync(path.join(cwd, '.bgzflow'), { recursive: true });
    fs.writeFileSync(path.join(cwd, '.bgzflow', 'agent-role.txt'), 'claude-lead\n', 'utf8');
    const msg = write({ from: 'claude-reviewer', to: 'claude-lead' });
    const projectEnv = { BGZFLOW_MAIL_PROJECT: 'demo-app' };

    const first = stop('sess-never-posted', {}, projectEnv);
    assert.equal(first.decision, 'block');
    assert.match(first.reason, new RegExp(msg.id));
    assert.notEqual(stop('sess-never-posted', {}, projectEnv).decision, 'block');

    // No session id at all: the per-folder ack file is used, as in 0.9.7.
    const second = write({ from: 'claude-reviewer', to: 'claude-lead', body: 'Second note.' });
    const noSession = evaluateUniversalStop({ cwd }, { projectDir: cwd, env: { ...env, ...projectEnv } });
    assert.equal(noSession.decision, 'block');
    assert.match(noSession.reason, new RegExp(second.id));
    assert.equal(fs.existsSync(path.join(cwd, MAIL_ACK_REL_PATH)), true);
    assert.notEqual(evaluateUniversalStop({ cwd }, { projectDir: cwd, env: { ...env, ...projectEnv } }).decision, 'block');
  });

  it('asks the chat to wake an idle peer with Computer Use once, then stays quiet for 30 minutes', () => {
    const { cwd, env, write, learn, stop } = fixture();
    learn('sess-lead', 'lead');
    const question = write({ from: 'lead', to: 'reviewer', kind: 'question', ageMinutes: 25, body: 'Is the candidate ready?' });

    const viaHook = swarmGateHook({ hook_event_name: 'Stop', session_id: 'sess-lead', cwd }, env);
    assert.equal(viaHook.decision, 'block');
    assert.match(viaHook.reason, /^reviewer has not picked up your question message/);
    assert.match(viaHook.reason, new RegExp(question.id));
    assert.match(viaHook.reason, /project demo-app/);
    assert.match(viaHook.reason, /for 2[56] minutes/);
    assert.match(
      viaHook.reason,
      /Wake it with Computer Use per COORDINATION 8B: open its exact window, check the title matches the project and there is no unsent human draft, send one short message labelled as an agent, confirm it starts working\. Then carry on\.$/,
    );

    const again = stop('sess-lead');
    assert.equal(again.decision, 'allow');
    assert.ok(readSessionState('sess-lead', env).peerWake.reviewer);

    // 31 minutes later the same peer may be woken again.
    const state = readSessionState('sess-lead', env);
    updateSessionState('sess-lead', { peerWake: { reviewer: new Date(Date.now() - 31 * MINUTE).toISOString() } }, env);
    const later = stop('sess-lead');
    assert.equal(later.decision, 'block');
    assert.equal(later.code, 'peer-wake-computer-use');
    assert.equal(later.peerWake.target, 'reviewer');
    assert.ok(state.peerWake.reviewer);
    assert.equal(fs.existsSync(path.join(cwd, '.bgzflow', 'peer-wake-state.json')), false);
  });

  it('does not wake for acked, replied, info, broadcast, too-new, too-old or already-answered messages', () => {
    const cases = {
      acked: (w) => w({ from: 'lead', to: 'reviewer', ageMinutes: 30, state: 'acknowledged', ack: { from: 'reviewer', at: new Date().toISOString() } }),
      replied: (w) => w({ from: 'lead', to: 'reviewer', ageMinutes: 30, state: 'answered', reply: { from: 'reviewer', body: 'yes', at: new Date().toISOString() } }),
      info: (w) => w({ from: 'lead', to: 'reviewer', ageMinutes: 30, kind: 'info' }),
      progress: (w) => w({ from: 'lead', to: 'reviewer', ageMinutes: 30, kind: 'progress' }),
      broadcast: (w) => w({ from: 'lead', to: 'all', ageMinutes: 30 }),
      tooNew: (w) => w({ from: 'lead', to: 'reviewer', ageMinutes: 10 }),
      tooOld: (w) => w({ from: 'lead', to: 'reviewer', ageMinutes: 200 }),
      newerReply: (w) => {
        w({ from: 'lead', to: 'reviewer', ageMinutes: 40 });
        w({ from: 'reviewer', to: 'lead', ageMinutes: 5, state: 'acknowledged', ack: { from: 'lead', at: new Date().toISOString() } });
      },
    };
    for (const [name, make] of Object.entries(cases)) {
      const { write, learn, stop, env, cwd } = fixture();
      learn('sess-lead', 'lead');
      make(write);
      const res = stop('sess-lead');
      assert.equal(res.decision, 'allow', `${name} should not trigger peer-wake: ${res.reason || ''}`);
      assert.equal(findPeerWake({ projectDir: cwd, input: { session_id: 'sess-lead' }, env, record: false }), null, name);
    }
  });

  it('never blocks on a stop-hook re-entry or with BGZFLOW_PEER_WAKE=off, and does not use up the wake', () => {
    const { write, learn, stop } = fixture();
    learn('sess-lead', 'lead');
    write({ from: 'lead', to: 'reviewer', kind: 'handback', ageMinutes: 45 });

    assert.equal(stop('sess-lead', { stop_hook_active: true }).decision, 'allow');
    assert.equal(stop('sess-lead', {}, { BGZFLOW_PEER_WAKE: 'off' }).decision, 'allow');
    assert.equal(stop('sess-lead', {}, { BGZFLOW_UNIVERSAL_STOP: 'off' }).decision, 'allow');
    const normal = stop('sess-lead');
    assert.equal(normal.decision, 'block');
    assert.match(normal.reason, /handback message/);
  });
});
