import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hook, resourcePreflight } from '../swarm-gate.mjs';

const enoughDisk = () => ({ bavail: 20, bsize: 1024 ** 3, blocks: 40 });

test('dispatch refuses a heavy local launch below 10 GB', () => {
  const result = resourcePreflight('bg-heavy -- npm test', '/output', {}, {
    statfs: () => ({ bavail: 9, bsize: 1024 ** 3, blocks: 40 }),
    heavyHeld: () => false,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.rule, 'disk');
  assert.match(result.next, /10 GB/);
});

test('dispatch refuses a heavy local launch while bg-heavy is held', () => {
  const result = resourcePreflight('npm test', '/output', {}, {
    statfs: enoughDisk,
    heavyHeld: () => true,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.rule, 'heavy');
  assert.match(result.next, /Wait/);
});

test('dispatch refuses a native build when the Expo Starter slot is occupied', () => {
  const env = { EXPO_PLAN: 'starter', BGZFLOW_BUILDS_ACTIVE: '1' };
  const result = resourcePreflight('eas build --platform android', '/output', env, {
    statfs: enoughDisk,
    heavyHeld: () => false,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.rule, 'build-slot');
  assert.match(result.next, /Wait/);
});

test('dispatch refuses a Codex app archive over 20 threads', () => {
  const result = resourcePreflight('codex app archive --count 21', '/output');
  assert.equal(result.allowed, false);
  assert.equal(result.rule, 'archive');
  assert.match(result.next, /state_5\.sqlite/);
  assert.equal(resourcePreflight('codex app archive --count 20', '/output').allowed, true);
});

// Plain shell commands outside any swarm: the hook applies the same guards.
const noSwarm = { BGZFLOW_PROJECT: process.cwd() + '/.no-such-project' };
const plain = (command, dependencies, env = noSwarm) => hook(
  { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd: '/output' },
  env,
  { preflightDependencies: dependencies },
);
const denied = (result) => result.hookSpecificOutput?.permissionDecision === 'deny';

test('hook denies a plain heavy command below 10 GB with no swarm running', () => {
  const result = plain('npm test', { statfs: () => ({ bavail: 9, bsize: 1024 ** 3, blocks: 40 }) });
  assert.ok(denied(result));
  assert.match(result.hookSpecificOutput.permissionDecisionReason, /10 GB/);
});

test('hook denies a plain eas build while the Expo Starter slot is occupied', () => {
  const env = { ...noSwarm, EXPO_PLAN: 'starter', BGZFLOW_BUILDS_ACTIVE: '1' };
  assert.ok(denied(plain('eas build --platform ios', { statfs: enoughDisk }, env)));
});

test('hook denies a plain Codex archive of 21 and allows 20', () => {
  assert.ok(denied(plain('codex app archive --count 21', {})));
  assert.ok(!denied(plain('codex app archive --count 20', {})));
});

test('hook lets a plain heavy command queue in bg-heavy when disk is fine', () => {
  const result = plain('bg-heavy -- npm test', { statfs: enoughDisk, heavyHeld: () => true });
  assert.ok(!denied(result));
});

test('hook fails open when free space cannot be measured', () => {
  const result = plain('npm test', { statfs: () => { throw new Error('unsupported'); } });
  assert.ok(!denied(result));
});
