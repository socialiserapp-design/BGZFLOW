import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const base = process.env.BGZFLOW_ROOT_TEST_CANDIDATE;
const load = relative => import(base ? pathToFileURL(path.join(base, relative)).href : new URL('../../../' + relative, import.meta.url));
const { captureEvent, readContinuity } = await load('tools/foundation/continuity.mjs');
const { handleFoundationEvent } = await load('hooks/foundation.mjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-project-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project'), nested = path.join(project, 'mockups', 'web');
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(project, 'DECISIONS.md'), 'Keep customer decisions intact across folder changes.');
  return { root, project, nested, options: { home:root, nativeProjectRoot: project, storageRoot: path.join(root, 'store'), route: false, recall: false }, input: { cwd: project, session_id: 'same-host-chat' } };
}

test('native hooks retain decisions and reconcile a tool across an ordinary cd', async t => {
  const { project, nested, options, input } = fixture(t);
  await handleFoundationEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Keep offline access. Do not publish yet.' }, options);
  await handleFoundationEvent({ ...input, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'operation-one', tool_input: {} }, options);
  const changed = { ...input, cwd: nested };
  await handleFoundationEvent({ ...changed, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_use_id: 'operation-one', tool_response: { exit_code: 0 } }, options);
  const state = readContinuity(changed, options);
  assert.equal(state.messages[0]?.message, 'Keep offline access. Do not publish yet.');
  assert.equal(state.pendingTools.length, 0);
  assert.equal(state.tools.length, 2);
  assert.equal(state.tools.at(-1).projectRoot, fs.realpathSync.native(project));
  assert.equal(state.tools.at(-1).workingDirectory, fs.realpathSync.native(nested));
  const resumed = await handleFoundationEvent({ ...changed, hook_event_name: 'SessionStart', source: 'resume' }, options);
  assert.match(resumed.hookSpecificOutput.additionalContext, /Keep customer decisions intact/);
  assert.match(resumed.hookSpecificOutput.additionalContext, /Do not publish yet/);
});

test('workspace identity takes precedence over a changing command directory', t => {
  const { input, options, project, nested } = fixture(t);
  delete options.nativeProjectRoot;
  captureEvent({ ...input, workspace_root: project, hook_event_name: 'UserPromptSubmit', prompt: 'The same workspace decision.' }, options);
  const state = readContinuity({ ...input, cwd: nested, workspace_root: project }, options);
  assert.equal(state.messages[0]?.message, 'The same workspace decision.');
});

test('nested repositories, outside worktrees and sibling projects do not inherit the launch history', t => {
  const { root, project, nested, options, input } = fixture(t);
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Private launch-project instruction.' }, options);
  for (const [name, repo, marker] of [['nested', nested, 'directory'], ['worktree', path.join(root, 'worktree'), 'file'], ['sibling', path.join(root, 'sibling'), null]]) {
    fs.mkdirSync(repo, { recursive: true });
    if (marker === 'directory') fs.mkdirSync(path.join(repo, '.git'));
    if (marker === 'file') fs.writeFileSync(path.join(repo, '.git'), 'gitdir: ../main/.git/worktrees/example');
    const sub = path.join(repo, 'src'); fs.mkdirSync(sub);
    const own = captureEvent({ ...input, cwd: repo, hook_event_name: 'UserPromptSubmit', prompt: `Private ${name} decision.` }, options);
    assert.equal(own.event.projectRoot, fs.realpathSync.native(repo));
    assert.equal(readContinuity({ ...input, cwd: repo }, options).messages.length, 1);
    if (marker) assert.equal(readContinuity({ ...input, cwd: sub }, options).messages[0]?.message, `Private ${name} decision.`);
    assert.equal(readContinuity(input, options).messages[0]?.message, 'Private launch-project instruction.');
  }
  assert.equal(readContinuity(input, options).messages.length, 1);
});

test('explicit embedding scope is preserved and an invalid native hint falls back locally', t => {
  const { root, project, nested, options, input } = fixture(t);
  const explicit = captureEvent({ ...input, cwd: nested, hook_event_name: 'SessionStart' }, { ...options, projectRoot: project });
  assert.equal(explicit.event.projectRoot, fs.realpathSync.native(project));
  const fallback = captureEvent({ ...input, cwd: nested, hook_event_name: 'SessionStart' }, { ...options, nativeProjectRoot: path.join(root, 'absent') });
  assert.equal(fallback.event.projectRoot, fs.realpathSync.native(nested));
});

test('a linked repository marker cannot import the parent project history', t => {
  const { root, nested, options, input } = fixture(t);
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Private parent decision.' }, options);
  const metadata = path.join(root, 'git-metadata'); fs.mkdirSync(metadata);
  fs.symlinkSync(metadata, path.join(nested, '.git'), process.platform === 'win32' ? 'junction' : 'dir');
  const captured = captureEvent({ ...input, cwd: nested, hook_event_name: 'SessionStart' }, options);
  assert.equal(captured.event.projectRoot, fs.realpathSync.native(nested));
  assert.equal(readContinuity({ ...input, cwd: nested }, options).messages.length, 0);
});

test('the actual hook entry uses the native launch root without changing command cwd', t => {
  const { nested, project, input, options } = fixture(t);
  captureEvent({ ...input, hook_event_name: 'UserPromptSubmit', prompt: 'Recover the launch-root decision.' }, { ...options, projectRoot: project });
  const file = base ? path.join(base, 'hooks/foundation.mjs') : new URL('../../../hooks/foundation.mjs', import.meta.url);
  const result = spawnSync(process.execPath, [file instanceof URL ? fileURLToPath(file) : file], { cwd: nested, encoding: 'utf8', input: JSON.stringify({ ...input, cwd: nested, hook_event_name: 'SessionStart', source: 'resume' }), env: { ...process.env, CLAUDE_PROJECT_DIR: project, BGZFLOW_CONTINUITY_HOME: options.storageRoot, BGZFLOW_CONTEXT_HOME:options.home } });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.match(output.hookSpecificOutput?.additionalContext || '', /Recover the launch-root decision/);
  assert.match(output.hookSpecificOutput.additionalContext, /Keep customer decisions intact/);
});
