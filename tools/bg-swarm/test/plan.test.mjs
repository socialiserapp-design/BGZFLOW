import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildPlan, resolveSwarmDir } from '../lib.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('swarm launch plans', () => {
  test('Kimi uses its own model and thinking controls and never invents an effort flag',()=>{const p=buildPlan({host:'kimi',cwd:'/project',promptFile:'brief.md',model:'fixture',effort:'none',thinking:true,readOnly:true});assert.ok(p.args.includes('--thinking'));assert.ok(p.args.includes('--print'));assert.equal(p.args[p.args.indexOf('--model')+1],'fixture');assert.equal(p.args.includes('--effort'),false);});
  test('read-only Grok work uses plan permissions without automatic write approval', () => {
    const plan=buildPlan({host:'grok',promptFile:'brief.md',cwd:'/project',readOnly:true});
    assert.equal(plan.args.includes('--always-approve'),false);
    assert.equal(plan.args[plan.args.indexOf('--permission-mode')+1],'plan');
  });
  test('codex effort uses the supported configuration argument and check plans are read-only', () => {
    const plan = buildPlan({ host: 'codex', promptFile: 'brief.md', cwd: '/project', model: 'test-model', effort: 'max', readOnly: true });
    assert.deepEqual(plan.args, ['exec', '--json', '-C', '/project', '--model', 'test-model', '-c', 'model_reasoning_effort="max"', '--sandbox', 'read-only', '-']);
  });
  test('registry directory follows the override, the Windows local app dir, or the XDG state dir', () => {
    assert.equal(resolveSwarmDir({ BG_SWARM_DIR: 'swarm-dir' }, 'home-dir', 'linux'), 'swarm-dir');
    assert.equal(
      resolveSwarmDir({ LOCALAPPDATA: 'local-app' }, 'home-dir', 'win32'),
      path.join('local-app', 'bgzflow', 'swarm'),
    );
    assert.equal(
      resolveSwarmDir({}, 'home-dir', 'win32'),
      path.join('home-dir', 'AppData', 'Local', 'bgzflow', 'swarm'),
    );
    assert.equal(
      resolveSwarmDir({ XDG_STATE_HOME: 'state-dir' }, 'home-dir', 'linux'),
      path.join('state-dir', 'bgzflow', 'swarm'),
    );
    assert.equal(
      resolveSwarmDir({}, 'home-dir', 'darwin'),
      path.join('home-dir', '.local', 'state', 'bgzflow', 'swarm'),
    );
  });

  test('grok is launched from a prompt file and a session id, never an inline prompt', () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';
    const plan = buildPlan({
      host: 'grok',
      promptFile: '/path/to/prompt.txt',
      cwd: '/path/to/project',
      sessionId,
      model: 'test-model',
      effort: 'low',
      maxTurns: 3,
      extra: ['--disable-web-search'],
    });
    assert.equal(plan.cmd, 'grok');
    assert.equal(plan.stdin, false);
    assert.equal(plan.shell, false);
    assert.deepEqual(plan.args, [
      '--prompt-file', '/path/to/prompt.txt',
      '--cwd', '/path/to/project',
      '--output-format', 'streaming-json',
      '--session-id', sessionId,
      '--model', 'test-model',
      '--reasoning-effort', 'low',
      '--max-turns', '3',
      '--always-approve',
      '--disable-web-search',
    ]);
    assert.equal(plan.args.includes('Reply with the single word OK.'), false);
  });

  test('grok receives a generated UUID when no session id is given', () => {
    const plan = buildPlan({
      host: 'grok',
      promptFile: '/path/to/prompt.txt',
      cwd: '/path/to/project',
    });
    assert.match(plan.sessionId, UUID);
    assert.ok(plan.args.includes(plan.sessionId));
  });

  test('codex exec reads the prompt on stdin and uses -C for the directory', () => {
    const plan = buildPlan({
      host: 'codex',
      promptFile: '/path/to/prompt.txt',
      cwd: '/path/to/project',
      model: 'test-model',
    });
    assert.equal(plan.cmd, 'codex');
    assert.equal(plan.stdin, true);
    assert.equal(plan.shell, false);
    assert.deepEqual(plan.args, ['exec', '--json', '-C', '/path/to/project', '--model', 'test-model', '-']);
  });

  test('claude print mode reads the prompt on stdin in the project directory', () => {
    const plan = buildPlan({
      host: 'claude',
      promptFile: '/path/to/prompt.txt',
      cwd: '/path/to/project',
      model: 'test-model',
      effort: 'low',
    });
    assert.equal(plan.cmd, 'claude');
    assert.equal(plan.stdin, true);
    assert.equal(plan.cwd, '/path/to/project');
    assert.equal(plan.shell, false);
    assert.deepEqual(plan.args, [
      '-p', '--output-format', 'stream-json', '--verbose', '--model', 'test-model', '--effort', 'low',
    ]);
  });

  test('a custom host is the command plus the extra arguments', () => {
    const plan = buildPlan({
      host: 'custom',
      command: 'node',
      promptFile: '/path/to/prompt.txt',
      cwd: '/path/to/project',
      extra: ['fixture.mjs', 'a&b'],
    });
    assert.equal(plan.cmd, 'node');
    assert.deepEqual(plan.args, ['fixture.mjs', 'a&b']);
    assert.equal(plan.stdin, false);
    assert.equal(plan.shell, false);
  });

  test('hosts do not receive flags this machine does not have', () => {
    assert.throws(
      () => buildPlan({ host: 'codex', promptFile: 'p', cwd: '/path/to/project', effort: 'invalid effort' }),
      /effort/,
    );
    assert.throws(
      () => buildPlan({ host: 'claude', promptFile: 'p', cwd: '/path/to/project', maxTurns: 2 }),
      /max-turns/,
    );
    assert.throws(
      () => buildPlan({ host: 'custom', command: 'node', promptFile: 'p', cwd: '/path/to/project', model: 'x' }),
      /custom/,
    );
  });
});
