import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { resourcePreflight } from '../../tools/swarm-gate/swarm-gate.mjs';
import { resolveHeavyDir } from '../../tools/bg-heavy/dir.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const cli = (tool) => path.join(repo, 'tools', tool, `${tool}.mjs`);
const run = (tool, args, options = {}) => spawnSync(process.execPath,
  [cli(tool), ...args], { encoding: 'utf8', timeout: 10000, ...options });
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-v03-repair-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const recordArgs = ['record', '--job', 'J', '--provider', 'codex', '--account', 'A'];
const postArgs = ['post', '--project', 'p', '--from', 'worker', '--to', 'lead', '--body', 'choose'];
const queuedJob = (extra = {}) => ({ id: 'J', state: 'queued', queuedAt: '2020-01-01T00:00:00Z',
  mutationSafe: true, ...extra });

for (const kind of ['hardlink', 'symlink']) {
  test(`R01 receipt ${kind} refuses before append and preserves user notes`, (t) => {
    const root = fixture(t), notes = path.join(root, 'notes.txt'), file = path.join(root, 'receipts.jsonl');
    fs.writeFileSync(notes, 'KEEP USER NOTES\n');
    let nodeArgs = [];
    if (kind === 'hardlink') fs.linkSync(notes, file);
    else {
      try { fs.symlinkSync(notes, file, 'file'); }
      catch (error) {
        if (process.platform !== 'win32' || error.code !== 'EPERM') throw error;
        // Real shared bytes, with the link stat injected when Windows denies symlink creation.
        fs.linkSync(notes, file);
        const preload = path.join(root, 'symlink-stat.mjs');
        fs.writeFileSync(preload, `import fs from 'node:fs';import path from 'node:path';
          const original=fs.lstatSync;fs.lstatSync=(p,...a)=>{const s=original(p,...a);
          if(path.resolve(p)===${JSON.stringify(file)})s.isSymbolicLink=()=>true;return s;};`);
        nodeArgs = ['--import', pathToFileURL(preload).href];
        t.diagnostic('Windows symlink-stat fixture over a real hardlink; no skip');
      }
    }
    const result = spawnSync(process.execPath, [...nodeArgs, cli('bg-route'), ...recordArgs, '--file', file], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, result.stdout);
    assert.equal(fs.readFileSync(notes, 'utf8'), 'KEEP USER NOTES\n');
  });
}

for (const tool of ['bg-route', 'bg-governor', 'bg-mail']) {
  test(`R01 ${tool} refuses a junctioned storage parent without touching its target`, (t) => {
    const root = fixture(t), external = path.join(root, 'external'), link = path.join(root, 'linked');
    fs.mkdirSync(external);
    fs.writeFileSync(path.join(external, 'queued.json'), '[]\n');
    fs.symlinkSync(external, link, process.platform === 'win32' ? 'junction' : 'dir');
    const options = { env: { ...process.env, BG_MAIL_DIR: link } };
    const args = tool === 'bg-route' ? [...recordArgs, '--file', path.join(link, 'receipts.jsonl')]
      : tool === 'bg-governor' ? ['queued', '--apply', '--file', path.join(link, 'queued.json')] : postArgs;
    const before = fs.readdirSync(external);
    const result = run(tool, args, options);
    assert.notEqual(result.status, 0, result.stdout);
    assert.deepEqual(fs.readdirSync(external), before);
    assert.equal(fs.readFileSync(path.join(external, 'queued.json'), 'utf8'), '[]\n');
  });
}

test('R01 governor refuses a hardlinked queue before any write', (t) => {
  const root = fixture(t), notes = path.join(root, 'notes.json'), file = path.join(root, 'queue.json');
  const bytes = JSON.stringify([queuedJob()]);
  fs.writeFileSync(notes, bytes); fs.linkSync(notes, file);
  const result = run('bg-governor', ['queued', '--apply', '--file', file]);
  assert.notEqual(result.status, 0, result.stdout);
  assert.equal(fs.readFileSync(notes, 'utf8'), bytes);
});

test('R01 mailbox refuses a hardlinked message before reply or lock creation', (t) => {
  const root = fixture(t), env = { ...process.env, BG_MAIL_DIR: root };
  const post = run('bg-mail', postArgs, { env });
  assert.equal(post.status, 0, post.stderr);
  const id = JSON.parse(post.stdout).id, file = path.join(root, 'p', `${id}.json`), notes = path.join(root, 'notes.json');
  fs.renameSync(file, notes); fs.linkSync(notes, file);
  const bytes = fs.readFileSync(notes);
  const result = run('bg-mail', ['reply', '--project', 'p', '--id', id, '--from', 'lead', '--body', 'go'], { env });
  assert.notEqual(result.status, 0, result.stdout);
  assert.deepEqual(fs.readFileSync(notes), bytes);
  assert.equal(fs.lstatSync(file).nlink, 2);
  assert.equal(fs.existsSync(`${file}.reply.lock`), false);
});

test('R02 queued restart merges a concurrent added job and edits to existing fields', (t) => {
  const root = fixture(t), file = path.join(root, 'queue.json'), child = path.join(root, 'other-writer.mjs');
  fs.writeFileSync(child, `import fs from 'node:fs';const file=process.argv[2];
    const jobs=JSON.parse(fs.readFileSync(file,'utf8'));jobs[0].otherWriter='preserve';
    jobs.push({id:'other-job',state:'running'});fs.writeFileSync(file,JSON.stringify(jobs));`);
  fs.writeFileSync(file, JSON.stringify([queuedJob({ restartCommand: [process.execPath, child, file] })]));
  const result = run('bg-governor', ['queued', '--apply', '--file', file]);
  assert.equal(result.status, 0, result.stderr);
  const jobs = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(jobs.map((j) => j.id), ['J', 'other-job']);
  assert.equal(jobs[0].otherWriter, 'preserve');
  assert.equal(jobs[0].state, 'restarted');
  assert.equal(jobs[0].restarts, 1);
});

test('R05 non-zero child exit records failed and returns non-zero', (t) => {
  const root = fixture(t), file = path.join(root, 'queue.json');
  fs.writeFileSync(file, JSON.stringify([queuedJob({ restartCommand: [process.execPath, '-e', 'process.exit(1)'] })]));
  const result = run('bg-governor', ['queued', '--apply', '--file', file]);
  assert.notEqual(result.status, 0, result.stdout);
  const job = JSON.parse(fs.readFileSync(file, 'utf8'))[0];
  assert.equal(job.state, 'failed');
  assert.equal(job.restartExitCode, 1);
  assert.equal(job.restarts, 1);
});

test('R04 dispatch sees a held slot at the Windows LOCALAPPDATA location', (t) => {
  const root = fixture(t), env = { LOCALAPPDATA: root }, directory = resolveHeavyDir(env);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'slot-0.json'), JSON.stringify({ pid: process.pid, started: Date.now() }));
  const result = resourcePreflight('npm test', root, env, {
    statfs: () => ({ bavail: 20, bsize: 1024 ** 3, blocks: 40 }),
  });
  assert.equal(result.allowed, false);
  assert.equal(result.rule, 'heavy');
});

test('R06 reap signals only owned idle identities and stays dry-run by default', async (t) => {
  const root = fixture(t), file = path.join(root, 'owned.json');
  const records = [
    { pid: 101, owner: 'J', launchedBy: 'bgzflow', state: 'idle', identity: 'created-101' },
    { pid: 102, owner: 'J', launchedBy: 'other', state: 'idle', identity: 'created-102' },
    { pid: 103, owner: 'J', launchedBy: 'bgzflow', state: 'running', identity: 'created-103' },
    { pid: 104, owner: 'J', launchedBy: 'bgzflow', state: 'idle', identity: 'old-104' },
  ];
  fs.writeFileSync(file, JSON.stringify(records));
  const signalled = [], listing = '"emulator.exe","101"\n"java.exe","102"\n"java.exe","103"\n"java.exe","104"\n';
  const processMock = { platform: 'win32', argv: [], env: { ...process.env, BGZFLOW_PROCESS_FILE: file },
    cwd: () => root, kill: (pid, signal) => { if (signal !== 0) signalled.push(pid); } };
  const processModule = path.join(repo, 'tools/bg-governor/processes.mjs');
  const helpers = fs.existsSync(processModule) ? await import(pathToFileURL(processModule)) : {};
  const context = vm.createContext({ fs, path, os, ...helpers,
    processIdentity: (pid) => `created-${pid}`,
    process: processMock, console: { log() {}, error() {} }, fileURLToPath: () => '',
    spawnSync: () => ({ status: 0, stdout: listing }),
  });
  const source = fs.readFileSync(cli('bg-governor'), 'utf8')
    .replace(/^#!.*\n/, '').replace(/^import\b[\s\S]*?;\r?\n/gm, '').replace(/\bexport /g, '')
    .replace(/import\.meta\.url/g, JSON.stringify(pathToFileURL(cli('bg-governor')).href));
  vm.runInContext(source, context);
  vm.runInContext(`run(['reap','--file',${JSON.stringify(file)}]);`, context);
  assert.deepEqual(signalled, []);
  vm.runInContext(`run(['reap','--apply','--file',${JSON.stringify(file)}]);`, context);
  assert.deepEqual(signalled, [101]);
});

test('R03 seal and UNDO preserve a foreign backup created during APPLY', async (t) => {
  const root = fixture(t), kit = path.join(root, 'kit'), target = path.join(root, 'backups');
  fs.mkdirSync(kit); fs.mkdirSync(target);
  for (const name of ['cutover-lib.mjs', 'undo.mjs', 'owned-changes.mjs']) fs.copyFileSync(path.join(repo, 'scripts/cutover', name), path.join(kit, name));
  const lib = await import(pathToFileURL(path.join(kit, 'cutover-lib.mjs')));
  fs.writeFileSync(path.join(target, 'old.json'), 'old backup\r\n');
  const m = lib.prepare({ profile: 'test' }, [['backups', target]]);
  // Simulate install-owned writes through the same API APPLY uses, plus a competing writer.
  lib.writeOwned(path.join(target, 'old.json'), 'installed\n', m);
  lib.writeOwned(path.join(target, 'installed.json'), 'new installation\n', m);
  fs.writeFileSync(path.join(target, 'other-lead-backup.json'), 'KEEP OTHER LEAD BACKUP\r\n');
  lib.seal(m, 'applied');
  const result = spawnSync(process.execPath, [path.join(kit, 'undo.mjs'), '--apply'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(target, 'other-lead-backup.json')), true, 'UNDO deleted the foreign backup');
  assert.equal(fs.readFileSync(path.join(target, 'other-lead-backup.json'), 'utf8'), 'KEEP OTHER LEAD BACKUP\r\n');
  assert.equal(fs.readFileSync(path.join(target, 'old.json'), 'utf8'), 'old backup\r\n');
  assert.equal(fs.existsSync(path.join(target, 'installed.json')), false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(kit, 'manifest.json'), 'utf8')).foreign.length, 1);
});

test('R02 a held ledger lock prevents a duplicate restart without changing the ledger', (t) => {
  const root = fixture(t), file = path.join(root, 'queue.json'), marker = path.join(root, 'launched');
  const jobs = JSON.stringify([queuedJob({ restartCommand: [process.execPath, '-e',
    `require('node:fs').writeFileSync(${JSON.stringify(marker)},'duplicate')`] })]);
  fs.writeFileSync(file, jobs); fs.writeFileSync(`${file}.lock`, 'another writer');
  const result = run('bg-governor', ['queued', '--apply', '--file', file]);
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(file, 'utf8'), jobs);
  assert.equal(fs.readFileSync(`${file}.lock`, 'utf8'), 'another writer');
  assert.equal(fs.existsSync(marker), false);
});

test('R03 refuses a file that appeared between prepare and the first owned write', async (t) => {
  const root = fixture(t), kit = path.join(root, 'kit'), home = path.join(root, 'home');
  fs.mkdirSync(kit); fs.mkdirSync(home);
  for (const name of ['cutover-lib.mjs', 'owned-changes.mjs']) fs.copyFileSync(path.join(repo, 'scripts/cutover', name), path.join(kit, name));
  const lib = await import(pathToFileURL(path.join(kit, 'cutover-lib.mjs')));
  const m = lib.prepare({ home }, [['home', home]]), file = path.join(home, 'foreign.json');
  fs.writeFileSync(file, 'KEEP FOREIGN\r\n');
  assert.throws(() => lib.writeOwned(file, 'installation', m), /Target changed/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'KEEP FOREIGN\r\n');
  assert.deepEqual(m.changes, []);
});

test('R03 removes only owned leaves when a foreign file arrives in a created directory after seal', async (t) => {
  const root = fixture(t), kit = path.join(root, 'kit'), home = path.join(root, 'home');
  fs.mkdirSync(kit); fs.mkdirSync(home);
  for (const name of ['cutover-lib.mjs', 'owned-changes.mjs', 'undo.mjs']) fs.copyFileSync(path.join(repo, 'scripts/cutover', name), path.join(kit, name));
  const lib = await import(pathToFileURL(path.join(kit, 'cutover-lib.mjs')));
  const cache = path.join(home, 'plugins/cache/bgzflow'), m = lib.prepare({ home }, [['cache', cache]]);
  lib.writeOwned(path.join(cache, 'installed.json'), 'installation', m);
  lib.seal(m, 'applied');
  const foreign = path.join(cache, 'other-lead-backup.json'); fs.writeFileSync(foreign, 'KEEP AFTER SEAL');
  const result = spawnSync(process.execPath, [path.join(kit, 'undo.mjs'), '--apply'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(cache, 'installed.json')), false);
  assert.equal(fs.readFileSync(foreign, 'utf8'), 'KEEP AFTER SEAL');
});
