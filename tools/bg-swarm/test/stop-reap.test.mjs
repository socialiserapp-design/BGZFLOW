import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { alive, fixtures, makeHome, recordPath, run, waitFor } from './helper.mjs';

const DAY = 24 * 60 * 60 * 1000;

describe('swarm stop and reap', { concurrency: false }, () => {
  test('stop kills the worker and a child it started', async () => {
    const home = makeHome();
    const childFile = path.join(home.dir, 'child.pid');
    const prompt = path.join(home.dir, 'prompt.txt');
    fs.writeFileSync(prompt, 'Reply with the single word OK.\n');
    try {
      const launched = await run([
        'launch', '--project', 'my-app', '--name', 'parent', '--host', 'custom',
        '--cwd', home.dir, '--prompt-file', prompt, '--command', process.execPath,
        '--verify-seconds', '30', '--', path.join(fixtures, 'with-child.mjs'), childFile,
      ], home.env);
      assert.equal(launched.code, 0, launched.err);
      const rec = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'parent'), 'utf8'));
      await waitFor(() => fs.existsSync(childFile));
      const childPid = Number(fs.readFileSync(childFile, 'utf8'));
      assert.equal(alive(rec.pid), true);
      assert.equal(alive(childPid), true);
      const stopped = await run(['stop', '--project', 'my-app', '--name', 'parent'], home.env);
      assert.equal(stopped.code, 0, stopped.err);
      await waitFor(() => !alive(rec.pid) && !alive(childPid), 20000);
      const after = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'parent'), 'utf8'));
      assert.equal(after.state, 'stopped');
      const status = JSON.parse((await run(['status', '--json'], home.env)).out);
      assert.equal(status.workers[0].state, 'stopped');
    } finally {
      await run(['stop', '--project', 'my-app', '--name', 'parent'], home.env).catch(() => {});
      home.cleanup();
    }
  });

  test('reap records a dead worker and deletes records older than 7 days only with --prune', async () => {
    const home = makeHome();
    const sleeper = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    try {
      await waitFor(() => sleeper.pid && alive(sleeper.pid));
      // A pid alive() reports as dead. A just-killed pid can be reused before reap runs.
      const deadPid = 999999;
      assert.equal(alive(deadPid), false);

      const write = (name, fields) => {
        const folder = path.join(home.swarm, 'my-app');
        fs.mkdirSync(folder, { recursive: true });
        const outFile = path.join(folder, `${name}.out`);
        fs.writeFileSync(outFile, 'x');
        fs.writeFileSync(path.join(folder, `${name}.json`), JSON.stringify({
          project: 'my-app',
          name,
          host: 'custom',
          state: 'running',
          exitCode: null,
          lastGrowthAt: fields.started,
          lastBytes: 1,
          outFile,
          errFile: path.join(folder, `${name}.err`),
          ...fields,
        }));
      };
      write('recent', { pid: deadPid, started: Date.now() - 1000 });
      write('old', { pid: deadPid, started: Date.now() - (8 * DAY) });
      write('live', { pid: sleeper.pid, started: Date.now() - (8 * DAY) });

      const kept = await run(['reap'], home.env);
      assert.equal(kept.code, 0, kept.err);
      const recent = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'recent'), 'utf8'));
      assert.equal(recent.state, 'exited');
      assert.equal(fs.existsSync(recordPath(home, 'my-app', 'old')), true);
      assert.equal(JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'live'), 'utf8')).state, 'running');

      const pruned = await run(['reap', '--prune'], home.env);
      assert.equal(pruned.code, 0, pruned.err);
      assert.equal(fs.existsSync(recordPath(home, 'my-app', 'old')), false);
      assert.equal(fs.existsSync(path.join(home.swarm, 'my-app', 'old.out')), false);
      assert.equal(fs.existsSync(recordPath(home, 'my-app', 'recent')), true);
      assert.equal(fs.existsSync(recordPath(home, 'my-app', 'live')), true);
      assert.equal(alive(sleeper.pid), true);
    } finally {
      try { sleeper.kill(); } catch { /* already dead */ }
      home.cleanup();
    }
  });
});
