// bg-rounds: the repair-round ledger. Repair loops ran 11 rounds because nothing counted them.
// Rule under test: rounds 1 and 2 are free, round 3 or later exits 2 unless --approved-by "<who, when>" is given
// (and the approval is recorded), and a finding ID keeps its identity across rounds.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { ROOT, TEST_TIMEOUT_MS, cleanEnv, makeProject, removeDir, write } from '../../../hooks/test/helpers.mjs';
import { FREE_ROUNDS, LedgerError, ledgerPath, nextRound, openFindings, readLedger, summarize, updateLedger } from '../lib.mjs';

const CLI = path.join(ROOT, 'tools', 'bg-rounds', 'bg-rounds.mjs');
const made = [];
const project = () => {
  const dir = makeProject('rounds');
  made.push(dir);
  return dir;
};
after(() => made.forEach(removeDir));

const rounds = (dir, ...args) => spawnSync(process.execPath, [CLI, '--project', dir, ...args], { encoding: 'utf8', env: cleanEnv(), timeout: TEST_TIMEOUT_MS });
const ledger = (dir) => JSON.parse(fs.readFileSync(ledgerPath(dir), 'utf8'));

describe('the round cap', () => {
  test('rounds 1 and 2 start freely; round 3 exits 2 and changes nothing', () => {
    const dir = project();
    assert.equal(rounds(dir, 'open', 'wp-a', 'F-1', 'F-2').status, 0);
    const first = rounds(dir, 'next', 'wp-a');
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /^round 1$/m);
    const second = rounds(dir, 'next', 'wp-a');
    assert.equal(second.status, 0);
    assert.match(second.stdout, /^round 2$/m);
    const before = fs.readFileSync(ledgerPath(dir), 'utf8');
    const third = rounds(dir, 'next', 'wp-a');
    assert.equal(third.status, 2);
    assert.match(third.stderr, /refused: repair round 3 of wp-a is past the 2-round cap/);
    assert.match(third.stderr, /F-1, F-2/);
    assert.match(third.stderr, /--approved-by/);
    assert.equal(fs.readFileSync(ledgerPath(dir), 'utf8'), before, 'a refused round must not touch the ledger');
    assert.equal(FREE_ROUNDS, 2);
  });

  test('--approved-by allows round 3 and records who and when; round 4 needs its own approval', () => {
    const dir = project();
    rounds(dir, 'open', 'wp', 'F-1');
    rounds(dir, 'next', 'wp');
    rounds(dir, 'next', 'wp');
    const approved = rounds(dir, 'next', 'wp', '--approved-by', 'Founder, 2026-09-29 22:10');
    assert.equal(approved.status, 0, approved.stderr);
    assert.match(approved.stdout, /^round 3$/m);
    assert.match(approved.stdout, /approved by Founder, 2026-09-29 22:10/);
    const entry = ledger(dir).packages.wp.history.at(-1);
    assert.equal(entry.round, 3);
    assert.equal(entry.approvedBy, 'Founder, 2026-09-29 22:10');
    assert.match(entry.approvedAt, /^\d{4}-\d\d-\d\dT/);
    const fourth = rounds(dir, 'next', 'wp');
    assert.equal(fourth.status, 2, 'an earlier approval must not cover the next round');
    assert.equal(rounds(dir, 'next', 'wp', '--approved-by=Founder, 2026-09-29 23:00').status, 0);
    assert.equal(ledger(dir).packages.wp.round, 4);
  });

  test('a weak approval line is rejected, and a dry run changes nothing', () => {
    const dir = project();
    rounds(dir, 'open', 'wp', 'F-1');
    rounds(dir, 'next', 'wp');
    rounds(dir, 'next', 'wp');
    const weak = rounds(dir, 'next', 'wp', '--approved-by', 'ok');
    assert.equal(weak.status, 1);
    assert.match(weak.stderr, /needs who and when/);
    const before = fs.readFileSync(ledgerPath(dir), 'utf8');
    const dry = rounds(dir, 'next', 'wp', '--dry-run', '--approved-by', 'Founder, today');
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /would start repair round 3/);
    assert.equal(rounds(dir, 'next', 'wp', '--dry-run').status, 2);
    assert.equal(fs.readFileSync(ledgerPath(dir), 'utf8'), before);
  });

  test('with nothing open there is nothing to repair, and the round count stays', () => {
    const dir = project();
    rounds(dir, 'open', 'wp', 'F-1');
    rounds(dir, 'next', 'wp');
    rounds(dir, 'close', 'wp', 'F-1');
    const r = rounds(dir, 'next', 'wp');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /no open findings, no repair round needed \(round 1\)/);
    assert.equal(ledger(dir).packages.wp.round, 1);
  });

  test('packages count their rounds separately', () => {
    const dir = project();
    rounds(dir, 'open', 'one', 'A-1');
    rounds(dir, 'open', 'two', 'B-1');
    rounds(dir, 'next', 'one');
    rounds(dir, 'next', 'one');
    assert.equal(rounds(dir, 'next', 'one').status, 2);
    assert.equal(rounds(dir, 'next', 'two').status, 0);
  });
});

describe('stable finding IDs', () => {
  test('an ID keeps its identity: opened once, seen in later rounds, reopened when it comes back', () => {
    const dir = project();
    assert.match(rounds(dir, 'open', 'wp', 'F-1', 'F-2').stdout, /F-1 opened\nF-2 opened/);
    rounds(dir, 'next', 'wp');
    const again = rounds(dir, 'open', 'wp', 'F-1', 'F-3');
    assert.match(again.stdout, /F-1 still open\nF-3 opened/);
    rounds(dir, 'close', 'wp', 'F-1');
    assert.match(rounds(dir, 'open', 'wp', 'F-1').stdout, /F-1 reopened/);
    const f = ledger(dir).packages.wp.findings;
    assert.equal(f['F-1'].openedRound, 0);
    assert.deepEqual(f['F-1'].seenInRounds, [0, 1]);
    assert.equal(f['F-1'].reopened, 1);
    assert.equal(f['F-3'].openedRound, 1);
    assert.equal(Object.keys(f).length, 3, 'no duplicate entries');
  });

  test('a repeated ID in one call is one finding; bad IDs are refused before anything is written', () => {
    const dir = project();
    assert.equal(rounds(dir, 'open', 'wp', 'F-1', 'F-1', 'F-1').status, 0);
    assert.equal(Object.keys(ledger(dir).packages.wp.findings).length, 1);
    const before = fs.readFileSync(ledgerPath(dir), 'utf8');
    for (const bad of ['has space', '../x', '', 'x'.repeat(65)]) {
      const r = rounds(dir, 'open', 'wp', 'F-2', bad);
      assert.equal(r.status, 1, `"${bad}" should be refused`);
      assert.match(r.stderr, /is not valid/);
    }
    const flagLike = rounds(dir, 'open', 'wp', 'F-2', '-lead');
    assert.equal(flagLike.status, 1);
    assert.match(flagLike.stderr, /unknown option -lead/);
    assert.equal(fs.readFileSync(ledgerPath(dir), 'utf8'), before);
  });

  test('closing an unknown ID or an unknown package is an error, not a silent no-op', () => {
    const dir = project();
    rounds(dir, 'open', 'wp', 'F-1');
    const r = rounds(dir, 'close', 'wp', 'F-9');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /unknown finding ID\(s\) in wp: F-9/);
    assert.equal(rounds(dir, 'close', 'nope', 'F-1').status, 1);
    assert.equal(rounds(dir, 'next', 'nope').status, 1);
  });
});

describe('status', () => {
  test('shows each package and finding; --json is machine-readable; an unknown package is an error', () => {
    const dir = project();
    rounds(dir, 'open', 'wp', 'F-1', 'F-2');
    rounds(dir, 'next', 'wp');
    rounds(dir, 'close', 'wp', 'F-2');
    const text = rounds(dir, 'status').stdout;
    assert.match(text, /wp: round 1 of 2 free; 1 open, 1 closed; next repair round 2/);
    assert.match(text, /F-1\s+open\s+opened in round 0; seen in rounds 0,1/);
    assert.match(text, /F-2\s+closed/);
    assert.match(text, /round 1 started \d{4}-/);
    const json = JSON.parse(rounds(dir, 'status', 'wp', '--json').stdout);
    assert.equal(json[0].package, 'wp');
    assert.deepEqual(json[0].open, ['F-1']);
    assert.equal(json[0].nextNeedsApproval, false);
    assert.equal(rounds(dir, 'status', 'ghost').status, 1);
    assert.equal(rounds(project(), 'status').stdout.trim(), 'ledger is empty');
  });

  test('once two rounds are used, status says the next one needs approval', () => {
    const dir = project();
    rounds(dir, 'open', 'wp', 'F-1');
    rounds(dir, 'next', 'wp');
    rounds(dir, 'next', 'wp');
    assert.match(rounds(dir, 'status').stdout, /next repair round 3 \(needs --approved-by\)/);
  });
});

describe('the ledger file', () => {
  test('times come from the real clock', () => {
    const dir = project();
    const before = Date.now();
    rounds(dir, 'open', 'wp', 'F-1');
    rounds(dir, 'next', 'wp');
    const after = Date.now();
    const entry = ledger(dir).packages.wp.history[0];
    assert.ok(Date.parse(entry.at) >= before - 2000 && Date.parse(entry.at) <= after + 2000);
  });

  test('a damaged ledger is never reset: the command fails and the file is left as it was', () => {
    const dir = project();
    write(dir, '.bgzflow/rounds.json', '{ "packages": ');
    for (const args of [['status'], ['open', 'wp', 'F-1'], ['next', 'wp']]) {
      const r = rounds(dir, ...args);
      assert.equal(r.status, 1, args.join(' '));
      assert.match(r.stderr, /is damaged/);
    }
    assert.equal(fs.readFileSync(ledgerPath(dir), 'utf8'), '{ "packages": ');
    write(dir, '.bgzflow/rounds.json', '[]');
    assert.equal(rounds(dir, 'status').status, 1);
  });

  test('a leftover lock from a dead process does not block, a fresh lock does', () => {
    const dir = project();
    const lock = `${ledgerPath(dir)}.lock`;
    write(dir, '.bgzflow/rounds.json.lock', '');
    const old = new Date(Date.now() - 120000);
    fs.utimesSync(lock, old, old);
    assert.equal(rounds(dir, 'open', 'wp', 'F-1').status, 0);
    assert.equal(fs.existsSync(lock), false, 'the lock is released');
    write(dir, '.bgzflow/rounds.json.lock', '');
    const blocked = rounds(dir, 'open', 'wp', 'F-2');
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /locked by another process/);
    fs.rmSync(lock);
  });

  test('parallel agents do not lose each other\'s updates', async () => {
    const dir = project();
    const ids = Array.from({ length: 4 }, (_, i) => `P-${i + 1}`);
    const codes = await Promise.all(
      ids.map(
        (id) =>
          new Promise((resolve) => {
            const child = spawn(process.execPath, [CLI, '--project', dir, 'open', 'shared', id], { env: cleanEnv(), stdio: 'ignore' });
            child.on('exit', (code) => resolve(code));
          }),
      ),
    );
    assert.deepEqual(codes, ids.map(() => 0));
    assert.deepEqual(Object.keys(ledger(dir).packages.shared.findings).sort(), ids);
    assert.equal(fs.existsSync(`${ledgerPath(dir)}.lock`), false);
  });
});

describe('usage', () => {
  test('bad commands and options exit 1 with a hint; help exits 0', () => {
    const dir = project();
    for (const args of [['open'], ['open', 'wp'], ['close', 'wp'], ['next'], ['next', 'wp', 'extra'], ['frobnicate'], ['--nope'], ['status', '--project']]) {
      const r = rounds(dir, ...args);
      assert.equal(r.status, 1, args.join(' '));
      assert.match(r.stderr, /^bg-rounds: /m);
    }
    const help = spawnSync(process.execPath, [CLI, '--help'], { encoding: 'utf8', env: cleanEnv() });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /bg-rounds next <package>/);
    assert.equal(spawnSync(process.execPath, [CLI], { encoding: 'utf8', env: cleanEnv() }).status, 1);
  });

  test('the project defaults to the nearest folder with .bgzflow, from the current folder', () => {
    const dir = project();
    const deep = path.join(dir, 'a', 'b');
    fs.mkdirSync(deep, { recursive: true });
    const r = spawnSync(process.execPath, [CLI, 'open', 'wp', 'F-1'], { cwd: deep, encoding: 'utf8', env: cleanEnv() });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(ledgerPath(dir)));
  });
});

describe('library', () => {
  test('nextRound, openFindings and summarize agree, and updateLedger can decline to save', () => {
    const dir = project();
    openFindings(dir, 'p', ['X-1']);
    assert.equal(nextRound(dir, 'p').status, 'started');
    assert.equal(nextRound(dir, 'p').round, 2);
    assert.equal(nextRound(dir, 'p').status, 'refused');
    assert.equal(summarize(readLedger(dir), 'p')[0].nextNeedsApproval, true);
    const before = fs.readFileSync(ledgerPath(dir), 'utf8');
    updateLedger(dir, (l) => {
      l.packages.p.round = 99;
      return { save: false };
    });
    assert.equal(fs.readFileSync(ledgerPath(dir), 'utf8'), before);
    assert.throws(() => nextRound(dir, 'p', { approvedBy: 'x' }), LedgerError);
  });
});
