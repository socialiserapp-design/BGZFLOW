import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { defaultSlotCount, readHeavyQueue, resolveHeavyDir } from '../dir.mjs';
import { alive, fixtures, makeQueue, repoRoot, run, start, stopChild, waitFor } from './helper.mjs';

const hold = path.join(fixtures, 'hold.mjs');
const priority = path.join(fixtures, 'priority.mjs');
const exitCode = path.join(fixtures, 'exit-code.mjs');
const below = os.constants.priority.PRIORITY_BELOW_NORMAL;
const inherited = os.getPriority(0);

describe('bg-heavy queue', { concurrency: false }, () => {
  test('slot count is one per 16 logical CPUs and at least 1', () => {
    assert.equal(defaultSlotCount(16), 1);
    assert.equal(defaultSlotCount(31), 1);
    assert.equal(defaultSlotCount(32), 2);
    assert.equal(defaultSlotCount(1), 1);
    assert.equal(defaultSlotCount(0), 1);
  });

  test('heavy directory follows BG_HEAVY_DIR, then the local app dir, then the home cache', () => {
    assert.equal(resolveHeavyDir({ BG_HEAVY_DIR: 'queue-dir' }), 'queue-dir');
    assert.equal(
      resolveHeavyDir({ LOCALAPPDATA: 'local-app' }),
      path.join('local-app', 'bgzflow', 'heavy'),
    );
    assert.equal(
      resolveHeavyDir({}, () => 'home-dir', 'linux'),
      path.join('home-dir', '.cache', 'bgzflow', 'heavy'),
    );
    assert.equal(resolveHeavyDir({}, 'home-dir', 'win32'), path.join('home-dir', 'AppData', 'Local', 'bgzflow', 'heavy'));
  });

  test('status on an empty queue says no heavy jobs are running', async () => {
    const q = makeQueue();
    try {
      const result = await run(['status'], q.env);
      assert.equal(result.code, 0);
      assert.match(result.out, /no heavy jobs running/);
    } finally {
      q.cleanup();
    }
  });

  test('a missing command exits 2', async () => {
    const q = makeQueue();
    try {
      const result = await run([], q.env);
      assert.equal(result.code, 2);
      assert.match(result.err, /usage/);
    } finally {
      q.cleanup();
    }
  });

  test('--help and -h print the usage and exit 0 without queueing, even when every slot is busy', async () => {
    const q = makeQueue();
    try {
      fs.writeFileSync(path.join(q.dir, 'slot-1.json'), JSON.stringify({
        pid: process.pid, token: 'held', slot: 1, started: Date.now(), label: 'build', cwd: '/path/to/project', command: 'npm test',
      }));
      for (const args of [['--help'], ['-h'], ['--label', 'x', '--help']]) {
        const result = await run(args, { ...q.env, BG_HEAVY_SLOTS: '1' }, 20000);
        assert.equal(result.code, 0, `${args.join(' ')}: ${result.err}`);
        assert.match(result.out, /usage: bg-heavy/);
        assert.deepEqual(fs.readdirSync(q.dir), ['slot-1.json'], 'no waiter or slot file is left behind');
      }
    } finally {
      q.cleanup();
    }
  });

  test('the default slot count is announced for this machine', async () => {
    const q = makeQueue();
    try {
      const expected = defaultSlotCount(os.availableParallelism());
      const result = await run(['--', process.execPath, exitCode, '0'], q.env);
      assert.equal(result.code, 0);
      assert.match(result.err, new RegExp(`slot-1 of ${expected} taken`));
      assert.match(result.err, /below-normal priority/);
    } finally {
      q.cleanup();
    }
  });

  test('a second job waits until the first releases the only slot', async () => {
    const q = makeQueue();
    const readyA = path.join(q.dir, 'ready-a');
    const readyB = path.join(q.dir, 'ready-b');
    const releaseA = path.join(q.dir, 'release-a');
    const releaseB = path.join(q.dir, 'release-b');
    const a = start(['--slots', '1', '--label', 'A', '--', process.execPath, hold, readyA, releaseA], q.env);
    let b;
    try {
      await waitFor(() => fs.existsSync(readyA));
      b = start(['--slots', '1', '--label', 'B', '--', process.execPath, hold, readyB, releaseB], q.env);
      await waitFor(() => /waiting for a heavy slot/.test(b.output().err) && /\bA\b/.test(b.output().err));
      assert.equal(fs.existsSync(readyB), false);
      const listed = await run(['status'], q.env);
      assert.match(listed.out, /running/);
      assert.match(listed.out, /\bA\b/);
      fs.writeFileSync(releaseA, 'go');
      await waitFor(() => fs.existsSync(`${readyA}.done`) && fs.existsSync(readyB));
      const aEnd = Number(fs.readFileSync(`${readyA}.done`, 'utf8'));
      const bStart = Number(fs.readFileSync(readyB, 'utf8'));
      assert.ok(bStart >= aEnd);
      fs.writeFileSync(releaseB, 'go');
      await waitFor(() => a.child.exitCode !== null && b.child.exitCode !== null);
      assert.equal(a.child.exitCode, 0);
      assert.equal(b.child.exitCode, 0);
      await waitFor(() => fs.readdirSync(q.dir).filter((name) => name.startsWith('slot-') || name.startsWith('wait-')).length === 0);
    } finally {
      try { fs.writeFileSync(releaseA, 'go'); } catch { /* queue dir already removed */ }
      try { fs.writeFileSync(releaseB, 'go'); } catch { /* queue dir already removed */ }
      await stopChild(a.child);
      if (b) await stopChild(b.child);
      q.cleanup();
    }
  });

  test('two slots run two jobs at the same time', async () => {
    const q = makeQueue();
    const readyA = path.join(q.dir, 'ready-a');
    const readyB = path.join(q.dir, 'ready-b');
    const releaseA = path.join(q.dir, 'release-a');
    const releaseB = path.join(q.dir, 'release-b');
    const a = start(['--slots', '2', '--label', 'A', '--', process.execPath, hold, readyA, releaseA], q.env);
    const b = start(['--slots', '2', '--label', 'B', '--', process.execPath, hold, readyB, releaseB], q.env);
    try {
      await waitFor(() => fs.existsSync(readyA) && fs.existsSync(readyB));
      assert.doesNotMatch(a.output().err, /waiting for a heavy slot/);
      assert.doesNotMatch(b.output().err, /waiting for a heavy slot/);
      fs.writeFileSync(releaseA, 'go');
      fs.writeFileSync(releaseB, 'go');
      await waitFor(() => a.child.exitCode !== null && b.child.exitCode !== null);
      assert.equal(a.child.exitCode, 0);
      assert.equal(b.child.exitCode, 0);
    } finally {
      try { fs.writeFileSync(releaseA, 'go'); } catch { /* gone */ }
      try { fs.writeFileSync(releaseB, 'go'); } catch { /* gone */ }
      await stopChild(a.child);
      await stopChild(b.child);
      q.cleanup();
    }
  });

  test('the child inherits below-normal priority', async () => {
    const q = makeQueue();
    try {
      const result = await run(['--', process.execPath, priority], q.env);
      assert.equal(result.code, 0);
      assert.match(result.out, new RegExp(`prio ${below}\\b`));
      assert.match(result.out, /heavy 1\b/);
    } finally {
      q.cleanup();
    }
  });

  test('--priority normal and BG_HEAVY_PRIORITY=normal keep the caller priority', async () => {
    const q = makeQueue();
    try {
      const byFlag = await run(['--priority', 'normal', '--', process.execPath, priority], q.env);
      assert.equal(byFlag.code, 0);
      assert.match(byFlag.out, new RegExp(`prio ${inherited}\\b`));
      const byEnv = await run(
        ['--', process.execPath, priority],
        { ...q.env, BG_HEAVY_PRIORITY: 'normal' },
      );
      assert.equal(byEnv.code, 0);
      assert.match(byEnv.out, new RegExp(`prio ${inherited}\\b`));
    } finally {
      q.cleanup();
    }
  });

  test('the tool exits with the job exit code', async () => {
    const q = makeQueue();
    try {
      const result = await run(['--', process.execPath, exitCode, '3'], q.env);
      assert.equal(result.code, 3);
    } finally {
      q.cleanup();
    }
  });

  test('a slot held by a dead process is taken without waiting', async () => {
    const q = makeQueue();
    try {
      // A pid the tool's own alive() check reports as dead. A just-killed pid can be
      // reused before the queue reads the slot, which would make a live holder.
      const pid = 999999;
      assert.equal(alive(pid), false);
      fs.writeFileSync(path.join(q.dir, 'slot-1.json'), JSON.stringify({
        pid, token: 'dead', started: Date.now(), label: 'dead', cwd: '/path/to/project', command: 'x',
      }));
      const result = await run(['--slots', '1', '--', process.execPath, exitCode, '0'], q.env);
      assert.equal(result.code, 0);
      assert.doesNotMatch(result.err, /waiting for a heavy slot/);
      assert.match(result.err, /slot-1 of 1 taken/);
    } finally {
      q.cleanup();
    }
  });

  test('a slot older than 4 hours is taken even when its pid is alive', async () => {
    const q = makeQueue();
    const sleeper = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    try {
      await waitFor(() => sleeper.pid && alive(sleeper.pid));
      fs.writeFileSync(path.join(q.dir, 'slot-1.json'), JSON.stringify({
        pid: sleeper.pid,
        token: 'old',
        started: Date.now() - (5 * 60 * 60 * 1000),
        label: 'old',
        cwd: '/path/to/project',
        command: 'sleep',
      }));
      const result = await run(['--slots', '1', '--', process.execPath, exitCode, '0'], q.env);
      assert.equal(result.code, 0);
      assert.doesNotMatch(result.err, /waiting for a heavy slot/);
      assert.equal(alive(sleeper.pid), true);
    } finally {
      try { sleeper.kill(); } catch { /* already dead */ }
      q.cleanup();
    }
  });

  test('a fresh unreadable slot is left alone', async () => {
    const q = makeQueue();
    const slot = path.join(q.dir, 'slot-1.json');
    fs.writeFileSync(slot, '{"pid":');
    try {
      const result = await run(['--slots', '1', '--wait-max', '0', '--', process.execPath, exitCode, '0'], q.env);
      assert.equal(result.code, 75);
      assert.match(result.err, /gave up after 0 min/);
      assert.equal(fs.readFileSync(slot, 'utf8'), '{"pid":');
    } finally {
      q.cleanup();
    }
  });

  test('an unreadable slot older than 30 seconds is reclaimed', async () => {
    const q = makeQueue();
    const slot = path.join(q.dir, 'slot-1.json');
    fs.writeFileSync(slot, '{"pid":');
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(slot, old, old);
    try {
      const result = await run(['--slots', '1', '--', process.execPath, exitCode, '0'], q.env);
      assert.equal(result.code, 0);
      assert.doesNotMatch(result.err, /waiting for a heavy slot/);
    } finally {
      q.cleanup();
    }
  });

  test('readHeavyQueue reports live slots and live waiters only', () => {
    const q = makeQueue();
    try {
      fs.writeFileSync(path.join(q.dir, 'slot-1.json'), JSON.stringify({
        pid: process.pid, token: 'held', slot: 1, started: Date.now(), label: 'build', cwd: '/path/to/project', command: 'npm test',
      }));
      fs.writeFileSync(path.join(q.dir, 'wait-live.json'), JSON.stringify({
        pid: process.pid, token: 'live', label: 'tests', command: 'npm test', since: Date.now(),
      }));
      fs.writeFileSync(path.join(q.dir, 'wait-dead.json'), JSON.stringify({
        pid: 2 ** 30, token: 'dead', label: 'gone', command: 'x', since: Date.now(),
      }));
      const queue = readHeavyQueue(q.dir);
      assert.equal(queue.slots.length, 1);
      assert.equal(queue.slots[0].label, 'build');
      assert.equal(queue.slots[0].stale, false);
      assert.deepEqual(queue.waiting.map((row) => row.label), ['tests']);
    } finally {
      q.cleanup();
    }
  });

  test('the shell shim runs status', async () => {
    const q = makeQueue();
    const shim = path.join(repoRoot, 'tools', 'bin', 'bg-heavy');
    const programFiles = process.env.ProgramFiles || '';
    const candidate = path.join(programFiles, 'Git', 'bin', 'sh.exe');
    const sh = fs.existsSync(candidate) ? candidate : 'sh';
    try {
      const result = await new Promise((resolve, reject) => {
        const child = spawn(sh, [shim, 'status'], { env: q.env });
        let out = '';
        let err = '';
        child.stdout.on('data', (d) => { out += d; });
        child.stderr.on('data', (d) => { err += d; });
        child.on('error', (err) => {
          if (err.code === 'ENOENT') resolve({ skip: true });
          else reject(err);
        });
        child.on('exit', (code) => resolve({ code, out, err }));
      });
      if (result.skip) return;
      assert.equal(result.code, 0, result.err);
      assert.match(result.out, /no heavy jobs running/);
    } finally {
      q.cleanup();
    }
  });
});
