import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  countUnregistered,
  formatStatus,
  parsePs,
  parseTasklist,
  workerState,
} from '../lib.mjs';
import { alive, fixtures, makeHome, recordPath, run, waitFor } from './helper.mjs';

describe('swarm status', { concurrency: false }, () => {
  test('tasklist rows count grok, codex and claude and skip registered pids', () => {
    const csv = [
      '"grok.exe","10","Console","1","1,024 K"',
      '"codex.exe","11","Console","1","1 K"',
      '"claude.exe","12","Console","1","1 K"',
      '"node.exe","13","Console","1","1 K"',
      '"grok.exe","14","Console","1","1 K"',
    ].join('\r\n');
    const rows = parseTasklist(csv);
    assert.deepEqual(countUnregistered(rows, new Set([10])), { grok: 1, codex: 1, claude: 1 });
  });

  test('ps rows count the command name and ignore lookalikes', () => {
    const text = [
      '  10 /usr/bin/grok --cwd /path/to/project',
      '  11 codex exec --json',
      '  12 /usr/bin/claude',
      '  13 /usr/bin/grok-helper --flag',
      '  14 node fixture.mjs',
    ].join('\n');
    assert.deepEqual(countUnregistered(parsePs(text), new Set([11])), { grok: 1, codex: 0, claude: 1 });
  });

  test('a live worker with no recent output is stalled, and a dead one is exited', () => {
    const now = 1_000_000_000_000;
    const base = {
      state: 'running',
      exitCode: null,
      started: now - 60 * 60 * 1000,
      lastGrowthAt: now - 31 * 60 * 1000,
      lastBytes: 4,
    };
    assert.equal(workerState(base, { now, stallMinutes: 30, isAlive: true, bytes: 4 }), 'stalled');
    assert.equal(workerState(base, { now, stallMinutes: 60, isAlive: true, bytes: 4 }), 'running');
    assert.equal(workerState({ ...base, state: 'starting' }, { now, stallMinutes: 60, isAlive: true, bytes: 0 }), 'starting');
    assert.equal(workerState({ ...base, exitCode: 0 }, { now, stallMinutes: 30, isAlive: false, bytes: 4 }), 'exited 0');
    assert.equal(workerState({ ...base, exitCode: 3 }, { now, stallMinutes: 30, isAlive: false, bytes: 4 }), 'exited 3');
    assert.equal(workerState(base, { now, stallMinutes: 30, isAlive: false, bytes: 4 }), 'exited ?');
    assert.equal(workerState({ ...base, state: 'failed-to-start' }, { now, stallMinutes: 30, isAlive: false, bytes: 0 }), 'failed-to-start');
    assert.equal(workerState({ ...base, state: 'stopped' }, { now, stallMinutes: 30, isAlive: false, bytes: 4 }), 'stopped');
  });

  test('text status fits an 80-column terminal', () => {
    const text = formatStatus({
      cpu: { busyPercent: 12.3, logical: 16 },
      heavy: {
        slots: [{ file: 'slot-1.json', stale: false, started: Date.now(), pid: 99, label: 'L'.repeat(200) }],
        waiting: [{ pid: 100, label: 'wait' }],
      },
      workers: [{
        project: 'p'.repeat(80),
        name: 'worker',
        host: 'custom',
        state: 'failed-to-start',
        pid: 123456,
        ageMinutes: 10000,
        quietMinutes: 10000,
      }],
      unregistered: { grok: 2, codex: 0, claude: 1 },
    });
    assert.match(text, /cpu 12\.3% busy, 16 logical/);
    assert.match(text, /unreg grok 2, codex 0, claude 1/);
    for (const line of text.split('\n')) assert.ok(line.length <= 80, `${line.length}: ${line}`);
  });

  test('status json shows cpu, the heavy queue, and the registered worker', async () => {
    const home = makeHome();
    const sleeper = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    try {
      await waitFor(() => sleeper.pid && alive(sleeper.pid));
      fs.writeFileSync(path.join(home.heavy, 'slot-1.json'), JSON.stringify({
        pid: sleeper.pid, token: 'held', slot: 1, started: Date.now(), label: 'build', cwd: '/path/to/project', command: 'npm test',
      }));
      const folder = path.join(home.swarm, 'my-app');
      fs.mkdirSync(folder, { recursive: true });
      const outFile = path.join(folder, 'review.out');
      fs.writeFileSync(outFile, 'hi\n');
      fs.writeFileSync(path.join(folder, 'review.json'), JSON.stringify({
        project: 'my-app',
        name: 'review',
        host: 'custom',
        pid: sleeper.pid,
        state: 'running',
        exitCode: null,
        started: Date.now() - 120000,
        lastGrowthAt: Date.now(),
        lastBytes: 3,
        outFile,
        errFile: path.join(folder, 'review.err'),
      }));
      fs.mkdirSync(path.join(home.swarm, 'other-app'), { recursive: true });
      fs.writeFileSync(path.join(home.swarm, 'other-app', 'skip.json'), JSON.stringify({
        project: 'other-app', name: 'skip', host: 'custom', pid: sleeper.pid, state: 'running',
        started: Date.now(), lastGrowthAt: Date.now(), lastBytes: 0, outFile, errFile: outFile,
      }));
      const result = await run(['status', '--project', 'my-app', '--json'], home.env);
      assert.equal(result.code, 0, result.err);
      const data = JSON.parse(result.out);
      assert.equal(typeof data.cpu.busyPercent, 'number');
      assert.ok(data.cpu.busyPercent >= 0 && data.cpu.busyPercent <= 100);
      assert.ok(data.cpu.logical >= 1);
      assert.equal(data.heavy.slots[0].label, 'build');
      assert.equal(data.workers.length, 1);
      assert.equal(data.workers[0].name, 'review');
      assert.equal(data.workers[0].state, 'running');
      assert.equal(Number.isInteger(data.unregistered.grok), true);
      const text = await run(['status', '--project', 'my-app'], home.env);
      assert.equal(text.code, 0);
      for (const line of text.out.split('\n')) assert.ok(line.length <= 80);
      assert.match(text.out, /my-app\/review/);
      assert.doesNotMatch(text.out, /other-app/);
    } finally {
      try { sleeper.kill(); } catch { /* already dead */ }
      home.cleanup();
    }
  });

  test('status marks a quiet live worker stalled from its record', async () => {
    const home = makeHome();
    const sleeper = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    try {
      await waitFor(() => sleeper.pid && alive(sleeper.pid));
      const folder = path.join(home.swarm, 'my-app');
      fs.mkdirSync(folder, { recursive: true });
      const outFile = path.join(folder, 'quiet.out');
      fs.writeFileSync(outFile, '');
      fs.writeFileSync(recordPath(home, 'my-app', 'quiet'), JSON.stringify({
        project: 'my-app',
        name: 'quiet',
        host: 'custom',
        pid: sleeper.pid,
        state: 'running',
        exitCode: null,
        started: Date.now() - (40 * 60 * 1000),
        lastGrowthAt: Date.now() - (31 * 60 * 1000),
        lastBytes: 0,
        outFile,
        errFile: path.join(folder, 'quiet.err'),
      }));
      const stalled = await run(['status', '--json', '--stall-minutes', '30'], home.env);
      assert.equal(JSON.parse(stalled.out).workers[0].state, 'stalled');
      const fresh = await run(['status', '--json', '--stall-minutes', '60'], home.env);
      assert.equal(JSON.parse(fresh.out).workers[0].state, 'running');
    } finally {
      try { sleeper.kill(); } catch { /* already dead */ }
      home.cleanup();
    }
  });
});

describe('swarm launch', { concurrency: false }, () => {
  function prompt(home) {
    const file = path.join(home.dir, 'prompt.txt');
    fs.writeFileSync(file, 'PROMPT_SENTINEL_NOT_AN_ARG\n');
    return file;
  }

  async function launch(home, name, fixture, extra = [], verify = '30') {
    const args = [
      'launch', '--project', 'my-app', '--name', name, '--host', 'custom',
      '--cwd', home.dir, '--prompt-file', prompt(home), '--command', process.execPath,
      '--verify-seconds', verify, '--', fixture, ...extra,
    ];
    return run(args, home.env);
  }

  test('a streaming worker is running after startup proof', async () => {
    const home = makeHome();
    try {
      const result = await launch(home, 'stream', path.join(fixtures, 'stream.mjs'));
      assert.equal(result.code, 0, result.err);
      const rec = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'stream'), 'utf8'));
      assert.equal(rec.state, 'running');
      assert.equal(rec.host, 'custom');
      assert.ok(alive(rec.pid));
      assert.match(fs.readFileSync(path.join(home.swarm, 'my-app', 'stream.out'), 'utf8'), /hi/);
      const status = await run(['status', '--json'], home.env);
      const worker = JSON.parse(status.out).workers.find((row) => row.name === 'stream');
      assert.equal(worker.state, 'running');
      assert.equal(worker.project, 'my-app');
    } finally {
      await run(['stop', '--project', 'my-app', '--name', 'stream'], home.env).catch(() => {});
      home.cleanup();
    }
  });

  test('a process that exits with no output fails to start', async () => {
    const home = makeHome();
    try {
      const result = await launch(home, 'quote', path.join(fixtures, 'exit-now.mjs'), [], '10');
      assert.equal(result.code, 1);
      assert.match(result.err, /failed-to-start/);
      const rec = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'quote'), 'utf8'));
      assert.equal(rec.state, 'failed-to-start');
    } finally {
      home.cleanup();
    }
  });

  test('a process that prints and exits shows the last 20 lines and fails to start', async () => {
    const home = makeHome();
    try {
      const result = await launch(home, 'noise', path.join(fixtures, 'exit-now.mjs'), ['25'], '10');
      assert.equal(result.code, 1);
      const lines = result.err.split(/\r?\n/);
      assert.ok(lines.includes('line 25'));
      assert.ok(lines.includes('line 6'));
      assert.equal(lines.includes('line 5'), false);
      assert.equal(lines.includes('line 1'), false);
      const rec = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'noise'), 'utf8'));
      assert.equal(rec.state, 'failed-to-start');
    } finally {
      home.cleanup();
    }
  });

  test('a silent worker fails to start and is not left running', async () => {
    const home = makeHome();
    try {
      const result = await launch(home, 'silent', path.join(fixtures, 'silent.mjs'), [], '2');
      assert.equal(result.code, 1);
      const rec = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'silent'), 'utf8'));
      assert.equal(rec.state, 'failed-to-start');
      if (rec.pid) {
        await waitFor(() => !alive(rec.pid), 20000);
      }
    } finally {
      home.cleanup();
    }
  });

  test('the same project and name cannot be launched twice while the worker is alive', async () => {
    const home = makeHome();
    try {
      const first = await launch(home, 'stream', path.join(fixtures, 'stream.mjs'));
      assert.equal(first.code, 0, first.err);
      const pid = JSON.parse(fs.readFileSync(recordPath(home, 'my-app', 'stream'), 'utf8')).pid;
      const second = await launch(home, 'stream', path.join(fixtures, 'stream.mjs'));
      assert.equal(second.code, 1);
      assert.match(second.err, /already running/);
      assert.equal(alive(pid), true);
      const names = JSON.parse((await run(['status', '--json'], home.env)).out).workers.map((row) => row.name);
      assert.deepEqual(names, ['stream']);
    } finally {
      await run(['stop', '--project', 'my-app', '--name', 'stream'], home.env).catch(() => {});
      home.cleanup();
    }
  });

  test('extra arguments are passed as an array, not through a shell', async () => {
    const home = makeHome();
    try {
      const result = await launch(home, 'args', path.join(fixtures, 'print-args.mjs'), ['a&b|c']);
      assert.equal(result.code, 0, result.err);
      const out = fs.readFileSync(path.join(home.swarm, 'my-app', 'args.out'), 'utf8');
      assert.deepEqual(JSON.parse(out), ['a&b|c']);
      assert.equal(out.includes('PROMPT_SENTINEL_NOT_AN_ARG'), false);
    } finally {
      await run(['stop', '--project', 'my-app', '--name', 'args'], home.env).catch(() => {});
      home.cleanup();
    }
  });

  test('launch refuses a missing prompt file or directory before starting a process', async () => {
    const home = makeHome();
    try {
      const missingPrompt = await run([
        'launch', '--project', 'my-app', '--name', 'x', '--host', 'custom',
        '--cwd', home.dir, '--prompt-file', path.join(home.dir, 'missing.txt'),
        '--command', process.execPath, '--', path.join(fixtures, 'stream.mjs'),
      ], home.env);
      assert.equal(missingPrompt.code, 2);
      const missingCwd = await run([
        'launch', '--project', 'my-app', '--name', 'x', '--host', 'custom',
        '--cwd', path.join(home.dir, 'missing-dir'), '--prompt-file', prompt(home),
        '--command', process.execPath, '--', path.join(fixtures, 'stream.mjs'),
      ], home.env);
      assert.equal(missingCwd.code, 2);
      assert.equal(fs.existsSync(recordPath(home, 'my-app', 'x')), false);
    } finally {
      home.cleanup();
    }
  });

  test('invalid codex effort is rejected before any worker starts', async () => {
    const home = makeHome();
    try {
      const result = await run([
        'launch', '--project', 'my-app', '--name', 'x', '--host', 'codex',
        '--cwd', home.dir, '--prompt-file', prompt(home), '--effort', 'invalid effort',
      ], home.env);
      assert.equal(result.code, 2);
      assert.match(result.err, /effort/);
      assert.equal(fs.existsSync(recordPath(home, 'my-app', 'x')), false);
    } finally {
      home.cleanup();
    }
  });

  test('a local fake Codex worker receives the explicit effort configuration and stdin brief', async () => {
    const home = makeHome();
    try {
      const bin = path.join(home.dir, 'bin'); fs.mkdirSync(bin);
      const exe = path.join(bin, process.platform === 'win32' ? 'codex.exe' : 'codex');
      try { fs.linkSync(process.execPath, exe); } catch { fs.copyFileSync(process.execPath, exe); }
      fs.chmodSync(exe, 0o755);
      const intercept = path.join(home.dir, 'fake-codex.mjs');
      fs.writeFileSync(intercept, `import path from 'node:path';
if (path.basename(process.argv[1] || '') === 'exec') {
  let brief = ''; for await (const chunk of process.stdin) brief += chunk;
  console.log(JSON.stringify({argv: process.argv.slice(1), brief}));
  setInterval(() => {}, 1000); await new Promise(() => {});
}
`);
      home.env.PATH = bin+path.delimiter+process.env.PATH;
      home.env.NODE_OPTIONS = '--import="'+pathToFileURL(intercept).href+'"';
      const result = await run(['launch', '--project', 'my-app', '--name', 'effort', '--host', 'codex', '--cwd', home.dir,
        '--prompt-file', prompt(home), '--model', 'fixture-model', '--effort', 'max', '--verify-seconds', '15'], home.env);
      assert.equal(result.code, 0, result.err);
      const output = JSON.parse(fs.readFileSync(path.join(home.swarm, 'my-app', 'effort.out'), 'utf8'));
      assert.equal(path.basename(output.argv[0]), 'exec'); // Node normalizes its script argument in this fake executable.
      assert.deepEqual(output.argv.slice(1), ['--json', '-C', home.dir, '--model', 'fixture-model', '-c', 'model_reasoning_effort="max"', '-']);
      assert.equal(output.brief, 'PROMPT_SENTINEL_NOT_AN_ARG\n');
    } finally {
      await run(['stop', '--project', 'my-app', '--name', 'effort'], home.env).catch(() => {});
      home.cleanup();
    }
  });

  test('--help, -h and help print the usage and exit 0 without touching the registry', async () => {
    const home = makeHome();
    try {
      for (const flag of ['--help', '-h', 'help']) {
        const result = await run([flag], home.env);
        assert.equal(result.code, 0, `${flag}: ${result.err}`);
        assert.match(result.out, /usage: bg-swarm/);
        assert.deepEqual(fs.readdirSync(home.swarm), [], 'the registry stays empty');
      }
    } finally {
      home.cleanup();
    }
  });
});
