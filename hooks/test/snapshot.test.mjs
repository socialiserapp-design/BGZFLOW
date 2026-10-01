// H5 state snapshot: what is copied, what git already protects, where state lives, the 20-snapshot cap,
// and the hook itself. Unit tests inject git's answer so they do not depend on the machine; a few tests use real git.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { ROOT, TEST_TIMEOUT_MS, cleanEnv, fake, makeProject, readLog, removeDir, runHook, write } from './helpers.mjs';
import { KEEP_SNAPSHOTS, MAX_FILE_BYTES, filesNotSafeInGit, stampOf, takeSnapshot } from '../lib/snapshot.mjs';

const made = [];
const project = (prefix = 'sn') => {
  const dir = makeProject(prefix);
  made.push(dir);
  return dir;
};
after(() => made.forEach(removeDir));

const noGit = () => {
  throw new Error('not a git repository'); // every file counts as "not in git"
};
const cleanGit = () => ''; // every file is committed and unchanged
const at = (iso) => new Date(iso);
const NOW = at('2026-09-29T21:05:07.123Z');
const snapRoot = (dir) => path.join(dir, '.bgzflow', 'snapshots');
const snapshotNames = (dir) => {
  try {
    return fs.readdirSync(snapRoot(dir)).filter((n) => /^\d{8}T\d{6}Z(?:-\d+)?$/.test(n)).sort();
  } catch {
    return [];
  }
};
function listFiles(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(abs, base));
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out.sort();
}
const hookEnv = { GIT_CEILING_DIRECTORIES: path.join(ROOT, '.tmp') }; // git must not look at this plugin's own repository

describe('H5: what is copied', () => {
  test('a project without a CHECKPOINT file has no state: nothing is written', () => {
    const dir = project();
    write(dir, 'notes.md', 'hello\n');
    assert.equal(takeSnapshot({ projectDir: dir, runGit: noGit }).status, 'no-state');
    assert.equal(fs.existsSync(snapRoot(dir)), false);
  });

  test('a root checkpoint is copied with the other state files, into a UTC timestamp folder', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'state\n');
    write(dir, 'ARCHIVE.md', 'history\n');
    write(dir, 'DECISIONS.md', 'D1\n');
    write(dir, 'OWNERS.md', 'lead\n');
    write(dir, 'HANDOFF-1.md', 'handoff\n');
    write(dir, 'random.md', 'not state\n');
    write(dir, 'src/code.js', 'not state\n');
    write(dir, '.bgzflow/rounds.json', '{"packages":{}}\n');
    const r = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    assert.equal(r.status, 'snapshot');
    assert.equal(r.name, '20260929T210507Z');
    assert.equal(r.copied, 6);
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['.bgzflow/rounds.json', 'ARCHIVE.md', 'CHECKPOINT.md', 'DECISIONS.md', 'HANDOFF-1.md', 'OWNERS.md']);
    assert.equal(fs.readFileSync(path.join(snapRoot(dir), r.name, 'CHECKPOINT.md'), 'utf8'), 'state\n');
  });

  test('the file names that count as state are matched case-insensitively', () => {
    const dir = project();
    write(dir, 'project-checkpoint.MD', 'a\n');
    write(dir, 'archive-2026.md', 'b\n');
    write(dir, 'CHECKPOINT.txt', 'not markdown\n');
    const r = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['archive-2026.md', 'project-checkpoint.MD']);
  });

  test('a second run with nothing changed writes nothing; a change copies only the changed file', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'v1\n');
    write(dir, 'ARCHIVE.md', 'old\n');
    assert.equal(takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit }).status, 'snapshot');
    assert.equal(takeSnapshot({ projectDir: dir, now: at('2026-09-29T21:06:00Z'), runGit: noGit }).status, 'unchanged');
    assert.equal(snapshotNames(dir).length, 1);
    write(dir, 'CHECKPOINT.md', 'v2\n');
    const r = takeSnapshot({ projectDir: dir, now: at('2026-09-29T21:07:00Z'), runGit: noGit });
    assert.equal(r.status, 'snapshot');
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['CHECKPOINT.md']);
  });

  test('a file over 1 MB is not copied; one of exactly 1 MB is', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'x'.repeat(MAX_FILE_BYTES));
    write(dir, 'ARCHIVE.md', 'x'.repeat(MAX_FILE_BYTES + 1));
    const r = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['CHECKPOINT.md']);
  });

  test('two snapshots in the same second get different folders', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'v1\n');
    const first = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    write(dir, 'CHECKPOINT.md', 'v2\n');
    const second = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    assert.equal(first.name, stampOf(NOW));
    assert.equal(second.name, `${stampOf(NOW)}-2`);
    assert.equal(snapshotNames(dir).length, 2);
  });

  test('a corrupt manifest means everything counts as changed, and the run still works', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'v1\n');
    write(dir, '.bgzflow/snapshots/manifest.json', '{ not json');
    const r = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    assert.equal(r.status, 'snapshot');
    assert.ok(JSON.parse(fs.readFileSync(path.join(snapRoot(dir), 'manifest.json'), 'utf8')).files['CHECKPOINT.md']);
  });
});

describe('H5: keep the newest 20 snapshots and delete nothing else', () => {
  test('older snapshot folders go; other files and folders in snapshots/ stay', () => {
    assert.equal(KEEP_SNAPSHOTS, 20);
    const dir = project();
    write(dir, '.bgzflow/snapshots/keep-me.txt', 'mine\n');
    write(dir, '.bgzflow/snapshots/2026-09-29-manual/notes.md', 'mine too\n');
    write(dir, '.bgzflow/snapshots/1999/CHECKPOINT.md', 'a folder whose name is not a snapshot stamp\n');
    for (let i = 0; i < 23; i++) {
      write(dir, 'CHECKPOINT.md', `version ${i}\n`);
      assert.equal(takeSnapshot({ projectDir: dir, now: new Date(Date.UTC(2026, 8, 29, 10, 0, i)), runGit: noGit }).status, 'snapshot');
    }
    const names = snapshotNames(dir);
    assert.equal(names.length, 20);
    assert.equal(names[0], '20260929T100003Z'); // the three oldest were removed
    assert.equal(names[19], '20260929T100022Z');
    assert.equal(fs.readFileSync(path.join(snapRoot(dir), 'keep-me.txt'), 'utf8'), 'mine\n');
    assert.ok(fs.existsSync(path.join(snapRoot(dir), '2026-09-29-manual', 'notes.md')));
    assert.ok(fs.existsSync(path.join(snapRoot(dir), '1999', 'CHECKPOINT.md')));
    assert.ok(fs.existsSync(path.join(snapRoot(dir), 'manifest.json')));
    assert.equal(fs.readFileSync(path.join(dir, 'CHECKPOINT.md'), 'utf8'), 'version 22\n'); // the live file is never touched
  });

  test('pruning reports what it removed', () => {
    const dir = project();
    let last;
    for (let i = 0; i < 21; i++) {
      write(dir, 'CHECKPOINT.md', `v${i}\n`);
      last = takeSnapshot({ projectDir: dir, now: new Date(Date.UTC(2026, 8, 29, 11, 0, i)), runGit: noGit });
    }
    assert.deepEqual(last.removed, ['20260929T110000Z']);
  });
});

describe('H5: what git already protects is not copied', () => {
  test('committed and clean files are settled without a copy; the next edit is copied', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'v1\n');
    const settled = takeSnapshot({ projectDir: dir, now: NOW, runGit: cleanGit });
    assert.equal(settled.status, 'safe-in-git');
    assert.equal(snapshotNames(dir).length, 0);
    assert.equal(takeSnapshot({ projectDir: dir, now: NOW, runGit: cleanGit }).status, 'unchanged'); // remembered
    write(dir, 'CHECKPOINT.md', 'v2\n');
    const edited = takeSnapshot({ projectDir: dir, now: NOW, runGit: () => ' M CHECKPOINT.md\0' });
    assert.equal(edited.status, 'snapshot');
    assert.deepEqual(listFiles(path.join(snapRoot(dir), edited.name)), ['CHECKPOINT.md']);
  });

  test('only the files git does not protect are copied', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'tracked and clean\n');
    write(dir, 'ARCHIVE.md', 'untracked\n');
    const r = takeSnapshot({ projectDir: dir, now: NOW, runGit: () => '?? ARCHIVE.md\0' });
    assert.equal(r.status, 'snapshot');
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['ARCHIVE.md']);
    assert.equal(r.settled, 1);
  });

  test('untracked, ignored, modified and renamed entries all count as not protected', () => {
    const rels = ['a.md', 'b.md', 'c.md', 'new.md', 'clean.md'];
    const status = ['?? a.md', '!! b.md', ' M c.md', 'R  new.md', 'old.md'].join('\0') + '\0';
    assert.deepEqual([...filesNotSafeInGit('x', rels, () => status)].sort(), ['a.md', 'b.md', 'c.md', 'new.md']);
  });

  test('git prints repository-relative paths, so a nested folder is still matched', () => {
    assert.deepEqual([...filesNotSafeInGit('x', ['CHECKPOINT.md'], () => ' M handover/CHECKPOINT.md\0')], ['CHECKPOINT.md']);
  });

  test('git being missing or failing counts as not in git', () => {
    assert.deepEqual([...filesNotSafeInGit('x', ['a.md', 'b.md'], noGit)].sort(), ['a.md', 'b.md']);
  });

  test('with more than 50 files one folder-wide status is used', () => {
    const rels = Array.from({ length: 51 }, (_, i) => `f${i}.md`);
    let asked;
    filesNotSafeInGit('x', rels, (_dir, args) => {
      asked = args;
      return '';
    });
    assert.equal(asked.at(-1), '.');
    assert.equal(filesNotSafeInGit('x', rels, () => ' M f3.md\0').size, 51); // anything dirty: treat all as unprotected
    assert.equal(filesNotSafeInGit('x', rels, cleanGit).size, 0);
  });

  const hasGit = spawnSync('git', ['--version'], { stdio: 'ignore' }).status === 0;
  test('real git: a committed, clean checkpoint is not copied and an edit is', { skip: hasGit ? false : 'git is not installed' }, () => {
    const dir = project('sg');
    const git = (...args) => {
      const r = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.name=BGZFLOW', '-c', 'user.email=bgzflow@users.noreply.github.com', ...args], { cwd: dir, encoding: 'utf8', env: cleanEnv(), timeout: TEST_TIMEOUT_MS });
      assert.equal(r.status, 0, r.stderr);
    };
    git('init');
    write(dir, '.gitignore', '.bgzflow/\n');
    write(dir, 'CHECKPOINT.md', 'v1\n');
    git('add', '-A');
    git('commit', '-m', 'first');
    assert.equal(takeSnapshot({ projectDir: dir, now: NOW }).status, 'safe-in-git');
    write(dir, 'CHECKPOINT.md', 'v2\n');
    const r = takeSnapshot({ projectDir: dir, now: at('2026-09-29T21:08:00Z') });
    assert.equal(r.status, 'snapshot');
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['CHECKPOINT.md']);
    git('commit', '-a', '-m', 'second');
    assert.equal(takeSnapshot({ projectDir: dir, now: at('2026-09-29T21:09:00Z') }).status, 'unchanged');
  });
});

describe('H5: where state lives', () => {
  test('a handover folder with a checkpoint is copied under its own name; other folders are not', () => {
    const dir = project();
    write(dir, 'handover/CHECKPOINT.md', 'a\n');
    write(dir, 'handover/notes/deep.md', 'b\n');
    write(dir, 'handover/node_modules/pkg/index.md', 'skipped\n');
    write(dir, 'handover/.git/config.md', 'skipped\n');
    write(dir, 'src/x.md', 'not state\n');
    const r = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['handover/CHECKPOINT.md', 'handover/notes/deep.md']);
  });

  test('a handover folder without any checkpoint (and no root checkpoint) is not state', () => {
    const dir = project();
    write(dir, 'handover/notes.md', 'no checkpoint here\n');
    assert.equal(takeSnapshot({ projectDir: dir, runGit: noGit }).status, 'no-state');
  });

  test('a root checkpoint also protects a handover folder that has none of its own', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'root\n');
    write(dir, 'handoffs/notes.md', 'plain notes\n');
    const r = takeSnapshot({ projectDir: dir, now: NOW, runGit: noGit });
    assert.deepEqual(listFiles(path.join(snapRoot(dir), r.name)), ['CHECKPOINT.md', 'handoffs/notes.md']);
  });

  test('a configured folder inside the project, and one outside it, are both copied', () => {
    const dir = project();
    const outside = project('ext');
    write(dir, 'CHECKPOINT.md', 'root\n');
    write(dir, 'docs/state/log.md', 'inside\n');
    write(outside, 'notes.md', 'outside\n');
    const r = takeSnapshot({ projectDir: dir, cfg: { stateDirs: ['docs/state', outside] }, now: NOW, runGit: noGit });
    const files = listFiles(path.join(snapRoot(dir), r.name));
    assert.ok(files.includes('CHECKPOINT.md'));
    assert.ok(files.includes('docs/state/log.md'));
    assert.ok(files.some((f) => /^external-ext-[^/]+\/notes\.md$/.test(f)), files.join(', '));
  });

  test('no path in a snapshot can leave the snapshot folder', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'root\n');
    const r = takeSnapshot({ projectDir: dir, cfg: { stateDirs: ['../elsewhere', '..'] }, now: NOW, runGit: noGit });
    for (const f of listFiles(path.join(snapRoot(dir), r.name))) assert.ok(!f.includes('..'), f);
  });
});

describe('H5 as a hook (Stop)', () => {
  test('a Stop event snapshots the project, prints an empty object and logs one line', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'state\n');
    const r = runHook('h5-state-snapshot.mjs', { hook_event_name: 'Stop', cwd: dir }, { project: dir, env: hookEnv });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.json, {}); // never blocks the stop
    assert.equal(snapshotNames(dir).length, 1);
    assert.match(readLog(dir), /H5 snapshot \d{8}T\d{6}Z: 1 file\(s\), \d+ bytes/);
  });

  test('a second Stop with nothing changed adds no snapshot and no log line', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'state\n');
    runHook('h5-state-snapshot.mjs', { hook_event_name: 'Stop', cwd: dir }, { project: dir, env: hookEnv });
    const lines = readLog(dir).split('\n').filter(Boolean).length;
    const r = runHook('h5-state-snapshot.mjs', { hook_event_name: 'Stop', cwd: dir }, { project: dir, env: hookEnv });
    assert.equal(r.status, 0);
    assert.equal(snapshotNames(dir).length, 1);
    assert.equal(readLog(dir).split('\n').filter(Boolean).length, lines);
  });

  test('a project with no checkpoint gets an empty object and no snapshot folder', () => {
    const dir = project();
    write(dir, 'notes.md', 'plain\n');
    const r = runHook('h5-state-snapshot.mjs', { hook_event_name: 'Stop', cwd: dir }, { project: dir, env: hookEnv });
    assert.equal(r.status, 0);
    assert.deepEqual(r.json, {});
    assert.equal(fs.existsSync(snapRoot(dir)), false);
  });

  test('a Grok Stop payload (camelCase keys) works', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'state\n');
    const r = runHook('h5-state-snapshot.mjs', { hookEventName: 'stop', hook_event_name: 'Stop', cwd: dir, workspaceRoot: dir }, { project: dir, env: hookEnv });
    assert.equal(r.status, 0);
    assert.equal(snapshotNames(dir).length, 1);
  });

  test('a credential-shaped URL in a copied file is warned about by host, never by value', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', `Clone with ${fake.passwordUrl()}\n`);
    const r = runHook('h5-state-snapshot.mjs', { hook_event_name: 'Stop', cwd: dir }, { project: dir, env: hookEnv });
    assert.equal(r.status, 0);
    const log = readLog(dir);
    assert.match(log, /warning: CHECKPOINT\.md holds a credential-shaped URL \(user:password at example\.invalid\)/);
    assert.ok(!log.includes(fake.password()), 'the password reached hooks.log');
    assert.ok(!r.stdout.includes(fake.password()) && !r.stderr.includes(fake.password()));
  });

  test('broken input on stdin still exits 0 with an empty object', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', 'state\n');
    const r = runHook('h5-state-snapshot.mjs', '{ not json', { project: dir, env: hookEnv });
    assert.equal(r.status, 0);
    assert.deepEqual(r.json, {});
  });
});
