// Offline tests for tools/jev/outcomes.mjs: real outcomes (git reverts, review flags, lessons) adjust a graded job's
// score into a combined score. No model call is ever made. Git fixtures are scratch repos under <repo>/.tmp/.
// One shared git fixture is built lazily (git is slow on Windows); everything else uses plain scratch folders.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { PENALTY, WEIGHTS, WINDOW_DAYS, combine, commitSignals, dailyOutcomes, lessonFlag, outcomeFor, reviewFlag, runOutcomesBackground, runOutcomesSync } from '../outcomes.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const DAY = 86400000;
const dirs = [];
const mocks = [];
const scratch = () => {
  const d = makeProject('jevout');
  dirs.push(d);
  return d;
};
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});

const git = (repo, args) => {
  const r = spawnSync('git', ['-C', repo, '-c', 'user.name=Test', '-c', 'user.email=noreply@example.invalid', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const commit = (repo, file, text, msg) => {
  write(repo, file, text);
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '-m', msg]);
  return git(repo, ['rev-parse', 'HEAD']);
};
// base, `kept` (never touched), `bad` (then reverted), `orphan` (made on a detached head that no branch holds).
let fx;
const shared = () => {
  if (fx) return fx;
  const repo = scratch();
  git(repo, ['init', '-q']);
  commit(repo, 'README.md', 'base\n', 'base');
  const main = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const kept = commit(repo, 'kept.txt', 'kept\n', 'kept feature');
  const bad = commit(repo, 'bad.txt', 'bad\n', 'bad feature');
  git(repo, ['revert', '--no-edit', bad]);
  git(repo, ['checkout', '-q', '--detach']);
  const orphan = commit(repo, 'orphan.txt', 'orphan\n', 'orphan work');
  git(repo, ['checkout', '-q', main]);
  fx = { repo, kept, bad, orphan };
  return fx;
};
const homeOf = (d) => path.join(d, '.home');
const envOf = (d, extra = {}) => ({ BGZFLOW_HOME: homeOf(d), FAST_JEV_KEY_FILE: path.join(d, 'no-key'), ...extra });
const perfFile = (d) => path.join(homeOf(d), 'performance.jsonl');
const seed = (d, rows) => {
  fs.mkdirSync(homeOf(d), { recursive: true });
  fs.writeFileSync(perfFile(d), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
};
const readRows = (d) => fs.readFileSync(perfFile(d), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
const row = (o) => ({ id: 'a1b2c3d4e5', t: ago(1), role: 'builder', worker: 'w', value: 0.8, ...o });

describe('the numbers are in code', () => {
  it('grade 0.6 and outcome 0.4; reverted 0.5, flagged 0.3, lesson 0.2; a 7 day window', () => {
    assert.deepEqual(WEIGHTS, { grade: 0.6, outcome: 0.4 });
    assert.deepEqual(PENALTY, { reverted: 0.5, flagged: 0.3, lesson: 0.2 });
    assert.equal(WINDOW_DAYS, 7);
    assert.equal(combine(0.8, { score: 0.5 }), 0.68);
    assert.equal(combine(0.8, { score: 1 }), 0.88);
    assert.equal(combine(1, { score: 0 }), 0.6);
    assert.equal(combine(0, { score: 1 }), 0.4);
  });

  it('the module makes no model call: it does not use ask/askDetailed or any network API', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools', 'jev', 'outcomes.mjs'), 'utf8');
    assert.doesNotMatch(src, /\bask(Detailed)?\b/);
    assert.doesNotMatch(src, /\bfetch\s*\(|node:https?|\bpostJson\b/);
  });
});

describe('git signals', () => {
  it('a commit reverted inside the 7 day window is reverted; an untouched commit is not', () => {
    const { repo, kept, bad } = shared();
    assert.deepEqual(commitSignals(repo, [bad], ago(1)), { reverted: true, unknown: false });
    assert.deepEqual(commitSignals(repo, [kept], ago(1)), { reverted: false, unknown: false });
  });

  it('a revert that falls outside the job\'s window does not count', () => {
    const { repo, bad } = shared();
    assert.equal(commitSignals(repo, [bad], ago(20)).reverted, false, 'the job is 20 days old; its window ended 13 days ago');
    assert.equal(commitSignals(repo, [bad], ago(6), 3).reverted, false, 'a 3 day window that started 6 days ago ended before the revert');
  });

  it('a commit that no longer exists, or that no branch holds any more, is unknown, never reverted', () => {
    const { repo, orphan } = shared();
    assert.deepEqual(commitSignals(repo, ['deadbeefdeadbeef'], ago(1)), { reverted: false, unknown: true, why: 'commit-gone' });
    assert.deepEqual(commitSignals(repo, [orphan], ago(1)), { reverted: false, unknown: true, why: 'not-on-a-branch' });
  });

  it('a missing repo folder, or a folder that is not a git repo, is unknown and is not created', () => {
    const d = scratch();
    const gone = path.join(d, 'moved-away');
    assert.deepEqual(commitSignals(gone, ['abcdef1234'], ago(1)), { reverted: false, unknown: true, why: 'repo-missing' });
    assert.equal(fs.existsSync(gone), false);
    const plain = commitSignals(d, ['abcdef1234'], ago(1)); // a plain folder (here inside the test tree's repo): git cannot settle it
    assert.equal(plain.unknown, true);
    assert.equal(plain.reverted, false);
  });

  it('a squash-merged branch that was then deleted is unknown, not reverted; a cherry-picked change counts as landed', () => {
    const repo = scratch();
    git(repo, ['init', '-q']);
    commit(repo, 'README.md', 'base\n', 'base');
    const main = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
    git(repo, ['checkout', '-q', '-b', 'feature']);
    const f1 = commit(repo, 'f1.txt', 'one\n', 'feature one');
    const f2 = commit(repo, 'f2.txt', 'two\n', 'feature two');
    git(repo, ['checkout', '-q', main]);
    git(repo, ['merge', '-q', '--squash', 'feature']);
    git(repo, ['commit', '-q', '-m', 'squash feature']);
    git(repo, ['branch', '-q', '-D', 'feature']);
    const squashed = commitSignals(repo, [f1, f2], ago(1));
    assert.equal(squashed.reverted, false);
    assert.equal(squashed.unknown, true);
    git(repo, ['checkout', '-q', '--detach']);
    const picked = commit(repo, 'p.txt', 'picked\n', 'picked work');
    git(repo, ['checkout', '-q', main]);
    git(repo, ['cherry-pick', picked]);
    assert.deepEqual(commitSignals(repo, [picked], ago(1)), { reverted: false, unknown: false }, 'same patch-id on a branch: it landed');
  });

  it('ignores malformed commit ids, and does nothing without a repo or commits', () => {
    const { repo } = shared();
    assert.deepEqual(commitSignals(repo, ['not-a-sha', 'abc', '--all'], ago(1)), { reverted: false, unknown: false });
    assert.deepEqual(commitSignals(undefined, ['abcdef1'], ago(1)), { reverted: false, unknown: false });
    assert.deepEqual(commitSignals(repo, [], ago(1)), { reverted: false, unknown: false });
    assert.deepEqual(commitSignals(repo, undefined, ago(1)), { reverted: false, unknown: false });
  });
});

describe('review flags and lessons', () => {
  it('a review that names the job next to a finding flags it; "no blockers" does not; an unrelated job is untouched', () => {
    const d = scratch();
    const reviews = path.join(d, 'reviews');
    write(reviews, 'release.md', '# Review\n\njob f1a9c3b7d2 has a blocker: wrong money in the refund path\n\n\njob e7d6c5b4a3: no blockers\n\n\njob 0a0a0a0a0a is mentioned but fine\n');
    assert.equal(reviewFlag({ id: 'f1a9c3b7d2' }, [reviews]), true);
    assert.equal(reviewFlag({ id: 'e7d6c5b4a3' }, [reviews]), false);
    assert.equal(reviewFlag({ id: '0a0a0a0a0a' }, [reviews]), false);
    assert.equal(reviewFlag({ id: 'ffffffffff' }, [reviews]), false);
    assert.equal(reviewFlag({ id: 'f1a9c3b7d2' }, [path.join(d, 'no-such-dir')]), false);
    assert.equal(reviewFlag({ id: 'abc' }, [reviews]), false, 'needles under 6 characters are never searched for');
  });

  it('matches by the first 7 characters of a commit, in .md/.json/.txt files only', () => {
    const d = scratch();
    const reviews = path.join(d, 'reviews');
    write(reviews, 'a.json', '{"finding":"data loss in commit 1234567","where":"x"}');
    write(reviews, 'b.js', 'job zzzzzzzzzz failed');
    assert.equal(reviewFlag({ id: 'x', commits: ['1234567890abcdef'] }, [reviews]), true);
    assert.equal(reviewFlag({ id: 'zzzzzzzzzz' }, [reviews]), false);
  });

  it('a lessons entry that quotes the job id (or commit) is a lesson; a missing lessons file is not', () => {
    const repo = scratch();
    write(repo, '.bgzflow/lessons.jsonl', `${JSON.stringify({ what: 'Job c3d4e5f6a7 shipped without a rollback', evidence: 'incident' })}\nnot json\n${JSON.stringify({ what: 'other', evidence: 'saw 9999999 break' })}\n`);
    assert.equal(lessonFlag({ id: 'c3d4e5f6a7' }, [repo]), true);
    assert.equal(lessonFlag({ id: 'x', commits: ['9999999aaaa'] }, [repo]), true, 'evidence text counts too');
    assert.equal(lessonFlag({ id: 'b0b0b0b0b0' }, [repo]), false);
    assert.equal(lessonFlag({ id: 'c3d4e5f6a7' }, [path.join(repo, 'nowhere')]), false);
    assert.equal(lessonFlag({ id: 'c3d4e5f6a7' }, []), false);
  });
});

describe('outcomeFor', () => {
  it('a young job with no bad sign is pending and has no score yet', () => {
    const d = scratch();
    const o = outcomeFor(row({ t: ago(2) }), { env: envOf(d) });
    assert.equal(o.pending, true);
    assert.equal(o.ageDays, 2);
    assert.equal('score' in o, false);
  });

  it('a job past the window with no bad sign settles at 1.0 and is final', () => {
    const d = scratch();
    const now = Date.now();
    const o = outcomeFor(row({ t: ago(8) }), { now, env: envOf(d) });
    assert.deepEqual({ reverted: o.reverted, flagged: o.flagged, lesson: o.lesson, score: o.score, final: o.final }, { reverted: false, flagged: false, lesson: false, score: 1, final: true });
    assert.equal(o.checked, new Date(now).toISOString());
  });

  it('penalties stack, never go below 0, and a bad sign settles a young job without finalising it', () => {
    const d = scratch();
    const { repo, bad } = shared();
    write(repo, '.bgzflow/lessons.jsonl', `${JSON.stringify({ what: 'Job 1234567890 went wrong' })}\n`);
    write(d, 'reviews/r.md', 'job 1234567890 is a blocker\n');
    const all = outcomeFor(row({ id: '1234567890', repo, commits: [bad] }), { reviewDirs: [path.join(d, 'reviews')], env: envOf(d) });
    assert.equal(all.reverted && all.flagged && all.lesson, true);
    assert.equal(all.score, 0);
    assert.equal(all.final, false);
    assert.equal(combine(0.8, all), 0.48);
    assert.equal(outcomeFor(row({ id: 'zzzzzzzzzz', repo, commits: [bad] }), { env: envOf(d) }).score, 0.5);
    assert.equal(outcomeFor(row({ id: '1234567890', repo, commits: [bad] }), { env: envOf(d) }).score, 0.3);
    assert.equal(outcomeFor(row({ id: '1234567890', repo }), { env: envOf(d) }).score, 0.8);
    assert.equal(outcomeFor(row({ id: '1234567890', repo }), { reviewDirs: [path.join(d, 'reviews')], env: envOf(d) }).score, 0.5);
    fs.rmSync(path.join(repo, '.bgzflow'), { recursive: true, force: true });
  });

  it('commits git cannot settle are unknown: no penalty, no score past the window, and other bad signs still count', () => {
    const d = scratch();
    const plain = scratch(); // a plain folder, not a repo
    const gone = ['deadbeefdeadbeef'];
    const old = outcomeFor(row({ id: 'qqqqqqqqqq', repo: plain, commits: gone, t: ago(9) }), { env: envOf(d) });
    assert.equal(old.unknown, true);
    assert.equal(old.reverted, false);
    assert.equal('score' in old, false, 'the plain grade stands');
    assert.equal(old.final, true);
    assert.equal(outcomeFor(row({ id: 'qqqqqqqqqq', repo: plain, commits: gone }), { env: envOf(d) }).pending, true, 'young and unknown stays pending');
    write(d, 'reviews/r.md', 'job 9876543210 is a blocker\n');
    const flagged = outcomeFor(row({ id: '9876543210', repo: plain, commits: gone }), { reviewDirs: [path.join(d, 'reviews')], env: envOf(d) });
    assert.equal(flagged.reverted, false);
    assert.equal(flagged.flagged, true);
    assert.equal(flagged.unknown, true);
    assert.equal(flagged.score, 0.7);
  });
});

describe('bgz jev outcomes', () => {
  it('a reverted commit within 7 days lowers the combined score; clean old jobs settle high; young clean jobs stay pending; league then uses the combined score', async () => {
    const { repo, bad, kept } = shared();
    const d = scratch();
    seed(d, [
      row({ id: 'aaaaaaaaaa', worker: 'reverted-worker', repo, commits: [bad] }),
      row({ id: 'bbbbbbbbbb', worker: 'clean-worker', repo, commits: [kept], t: ago(8) }),
      row({ id: 'cccccccccc', worker: 'young-worker', repo, commits: [kept] }),
      row({ id: 'dddddddddd', worker: 'late-revert-worker', repo, commits: [bad], t: ago(20) }),
    ]);
    const mock = await startMockJev();
    mocks.push(mock);
    const r = await runNode([CLI, 'outcomes'], { project: d, env: envOf(d, mock.env) });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.checked, 4);
    assert.equal(r.json.updated, 3, 'the young clean job is still pending');
    assert.deepEqual(r.json.bad.map((b) => b.id), ['aaaaaaaaaa']);
    assert.equal(r.json.bad[0].outcome.reverted, true);
    assert.equal(mock.calls.length, 0, 'outcomes never calls Jev');
    assert.equal(fs.existsSync(path.join(homeOf(d), 'jev-ledger.jsonl')), false, 'and writes no ledger line');
    fs.rmSync(path.join(repo, '.bgzflow'), { recursive: true, force: true });

    const rows = Object.fromEntries(readRows(d).map((x) => [x.id, x]));
    assert.equal(rows.aaaaaaaaaa.outcome.reverted, true);
    assert.equal(rows.aaaaaaaaaa.outcome.score, 0.5);
    assert.equal(rows.aaaaaaaaaa.outcome.final, false);
    assert.equal(rows.aaaaaaaaaa.combined, 0.68);
    assert.equal(rows.aaaaaaaaaa.value, 0.8, 'the original grade is kept');
    assert.equal(rows.bbbbbbbbbb.combined, 0.88);
    assert.equal(rows.bbbbbbbbbb.outcome.final, true);
    assert.equal('combined' in rows.cccccccccc, false);
    assert.equal('outcome' in rows.cccccccccc, false);
    assert.equal(rows.dddddddddd.outcome.reverted, false, 'a revert 20 days after the job is outside its window');
    assert.equal(rows.dddddddddd.combined, 0.88);
    assert.ok(rows.aaaaaaaaaa.combined < rows.bbbbbbbbbb.combined);

    const league = await runNode([CLI, 'league', '--json'], { project: d, env: envOf(d) });
    const avg = Object.fromEntries(league.json.map((l) => [l.worker, l.average]));
    assert.equal(avg['reverted-worker'], 0.68, 'league averages the combined score, not the raw 0.8');
    assert.equal(avg['clean-worker'], 0.88);
    assert.equal(avg['young-worker'], 0.8, 'no outcome yet, so the plain grade');
  });

  it('a review flag lowers the combined score (via --reviews, the repo reviews folder and the home reviews folder)', async () => {
    const d = scratch();
    const repo = scratch();
    write(d, 'extra-reviews/r1.md', 'job 1111111111 has a blocker: leak\n');
    write(repo, 'reviews/r2.md', 'job 2222222222 finding: wrong total\n');
    write(homeOf(d), 'reviews/r3.md', 'job 3333333333 failed the rollback check\n');
    write(d, 'extra-reviews/r4.md', 'job 4444444444: no blockers\n');
    seed(d, ['1111111111', '2222222222', '3333333333', '4444444444'].map((id) => row({ id, worker: `w${id[0]}`, repo })));
    const r = await runNode([CLI, 'outcomes', '--reviews', path.join(d, 'extra-reviews')], { project: d, env: envOf(d) });
    assert.equal(r.status, 0, r.stderr);
    const rows = Object.fromEntries(readRows(d).map((x) => [x.id, x]));
    for (const id of ['1111111111', '2222222222', '3333333333']) {
      assert.equal(rows[id].outcome.flagged, true, id);
      assert.equal(rows[id].outcome.score, 0.7, id);
      assert.equal(rows[id].combined, 0.76, id);
    }
    assert.equal('outcome' in rows['4444444444'], false, 'clean and young stays pending');
    assert.equal(r.json.bad.length, 3);
  });

  it('a lessons entry lowers the combined score', () => {
    const d = scratch();
    const repo = scratch();
    write(repo, '.bgzflow/lessons.jsonl', `${JSON.stringify({ what: 'Job 5555555555 shipped with no rollback', evidence: 'late' })}\n`);
    seed(d, [row({ id: '5555555555', repo }), row({ id: '6666666666', repo })]);
    const r = runOutcomesSync({ env: envOf(d) });
    assert.equal(r.updated, 1);
    const rows = Object.fromEntries(readRows(d).map((x) => [x.id, x]));
    assert.equal(rows['5555555555'].outcome.lesson, true);
    assert.equal(rows['5555555555'].outcome.score, 0.8);
    assert.equal(rows['5555555555'].combined, 0.8, '0.6 x 0.8 + 0.4 x 0.8');
    assert.equal('outcome' in rows['6666666666'], false);
  });

  it('a lesson on a weaker grade shows in the combined score', () => {
    const d = scratch();
    const repo = scratch();
    write(repo, '.bgzflow/lessons.jsonl', `${JSON.stringify({ what: 'Job 7777777777 shipped with no rollback' })}\n`);
    seed(d, [row({ id: '7777777777', repo, value: 1 })]);
    runOutcomesSync({ env: envOf(d) });
    assert.equal(readRows(d)[0].combined, 0.92, '0.6 x 1 + 0.4 x 0.8: lower than the plain grade of 1');
  });

  it('--dry reports what would change and writes nothing: grades file, regression queue and ledger stay as they were', async () => {
    const { repo, bad } = shared();
    const d = scratch();
    seed(d, [row({ id: 'aaaaaaaaaa', repo, commits: [bad] })]);
    const before = fs.readFileSync(perfFile(d), 'utf8');
    const mock = await startMockJev();
    mocks.push(mock);
    const r = await runNode([CLI, 'outcomes', '--dry'], { project: d, env: envOf(d, mock.env) });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.dry, true);
    assert.equal(r.json.updated, 1);
    assert.equal(r.json.bad.length, 1);
    assert.equal(fs.readFileSync(perfFile(d), 'utf8'), before);
    assert.equal(fs.existsSync(path.join(repo, '.bgzflow', 'regression-queue.jsonl')), false);
    assert.equal(fs.existsSync(`${perfFile(d)}.tmp`), false);
    assert.equal(mock.calls.length, 0);
    assert.equal(fs.existsSync(path.join(homeOf(d), 'jev-ledger.jsonl')), false);
  });

  it('a real run queues each newly bad job once in the repo regression queue, and a second run does not queue it again', () => {
    const { repo, bad } = shared();
    const d = scratch();
    seed(d, [row({ id: 'aaaaaaaaaa', repo, commits: [bad] })]);
    const queueFile = path.join(repo, '.bgzflow', 'regression-queue.jsonl');
    fs.rmSync(queueFile, { force: true });
    const first = runOutcomesSync({ env: envOf(d) });
    assert.equal(first.bad.length, 1);
    const queue = fs.readFileSync(queueFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(queue.length, 1);
    assert.equal(queue[0].source, 'outcomes');
    assert.equal(queue[0].jobId, 'aaaaaaaaaa');
    assert.deepEqual(queue[0].commits, [bad]);
    assert.equal(queue[0].outcome.reverted, true);
    const second = runOutcomesSync({ env: envOf(d) });
    assert.equal(second.bad.length, 0, 'the same bad outcome is not reported again');
    assert.equal(fs.readFileSync(queueFile, 'utf8').split('\n').filter(Boolean).length, 1);
    fs.rmSync(queueFile, { force: true });
  });

  it('settled rows (final outcome), unparseable lines and rows from another repo with --repo are left as written', () => {
    const d = scratch();
    const repoA = scratch();
    const repoB = scratch();
    const settled = row({ id: 'sssssssssss', t: ago(30), outcome: { score: 1, final: true }, combined: 0.99 });
    fs.mkdirSync(homeOf(d), { recursive: true });
    fs.writeFileSync(perfFile(d), `${JSON.stringify(settled)}\nthis is not json\n${JSON.stringify(row({ id: 'aaaaaaaaaa', repo: repoA, t: ago(9) }))}\n${JSON.stringify(row({ id: 'bbbbbbbbbb', repo: repoB, t: ago(9) }))}\n`);
    const r = runOutcomesSync({ env: envOf(d), repoFilter: repoA });
    assert.equal(r.checked, 1, 'only the row of the filtered repo is looked at');
    assert.equal(r.updated, 1);
    const lines = fs.readFileSync(perfFile(d), 'utf8').split('\n');
    assert.equal(lines[0], JSON.stringify(settled));
    assert.equal(lines[1], 'this is not json');
    assert.equal(JSON.parse(lines[2]).combined, 0.88);
    assert.equal('combined' in JSON.parse(lines[3]), false);
  });

  it('with no grades yet it says so and writes nothing', () => {
    const d = scratch();
    const r = runOutcomesSync({ env: envOf(d) });
    assert.deepEqual(r, { ok: true, checked: 0, updated: 0, bad: [], note: 'no grades yet' });
    assert.equal(fs.existsSync(perfFile(d)), false);
  });
});

describe('missing repos and capped runs', () => {
  it('a job whose repo folder is gone is unknown, keeps its plain grade, and its folder is never recreated for the queue', () => {
    const d = scratch();
    const gone = path.join(d, 'deleted-repo');
    write(homeOf(d), 'reviews/r.md', 'job 8888888888 has a blocker: wrong total\n');
    seed(d, [row({ id: '8888888888', repo: gone, commits: ['abcdef1234'] }), row({ id: '9999999999', repo: gone, commits: ['abcdef1234'], t: ago(9) })]);
    const r = runOutcomesSync({ env: envOf(d) });
    assert.equal(r.bad.length, 1, 'the review flag still counts');
    assert.equal(r.bad[0].outcome.reverted, false);
    assert.equal(fs.existsSync(gone), false, 'no folder or regression queue is created for a missing repo');
    const rows = Object.fromEntries(readRows(d).map((x) => [x.id, x]));
    assert.equal(rows['9999999999'].outcome.unknown, true);
    assert.equal(rows['9999999999'].outcome.final, true);
    assert.equal('combined' in rows['9999999999'], false, 'league keeps the plain grade');
    assert.equal(rows['8888888888'].combined, 0.76);
  });

  it('--max-jobs caps one run and a cursor makes the next run start after the last job checked', () => {
    const d = scratch();
    const ids = ['a000000001', 'a000000002', 'a000000003'];
    seed(d, ids.map((id) => row({ id, t: ago(9) })));
    const first = runOutcomesSync({ env: envOf(d), maxJobs: 2 });
    assert.equal(first.checked, 2);
    assert.equal(first.partial, true);
    assert.equal(first.cursor, 'a000000002');
    assert.equal('outcome' in readRows(d)[2], false);
    const second = runOutcomesSync({ env: envOf(d), maxJobs: 2, cursor: first.cursor });
    assert.equal(second.checked, 1, 'settled rows are skipped and the last row is reached');
    assert.equal(second.partial, undefined);
    assert.ok(readRows(d).every((x) => x.outcome && x.outcome.final));
  });

  it('a time budget stops a run between jobs', () => {
    const d = scratch();
    seed(d, ['b000000001', 'b000000002'].map((id) => row({ id, t: ago(9) })));
    let tick = 0;
    const clock = () => (tick += 1000);
    const r = runOutcomesSync({ env: envOf(d), budgetMs: 1500, clock });
    assert.equal(r.checked, 1);
    assert.equal(r.partial, true);
  });

  it('a grade line appended during a run is kept', () => {
    const d = scratch();
    seed(d, [row({ id: 'c000000001', t: ago(9) })]);
    let calls = 0;
    const clock = () => {
      calls += 1;
      if (calls === 2) fs.appendFileSync(perfFile(d), `${JSON.stringify(row({ id: 'c000000002' }))}\n`);
      return 0;
    };
    runOutcomesSync({ env: envOf(d), clock });
    assert.deepEqual(readRows(d).map((x) => x.id), ['c000000001', 'c000000002']);
  });
});

describe('the once-a-day check', () => {
  it('the background run writes the day stamp only when it finishes; a capped run leaves a cursor and no stamp', () => {
    const d = scratch();
    seed(d, ['d000000001', 'd000000002'].map((id) => row({ id, t: ago(9) })));
    const env = envOf(d);
    const now = Date.now();
    const capped = runOutcomesBackground({ env, now, maxJobs: 1 });
    assert.equal(capped.partial, true);
    assert.equal(fs.existsSync(path.join(homeOf(d), 'outcomes.stamp')), false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(homeOf(d), 'outcomes-cursor.json'), 'utf8')), { id: 'd000000001' });
    const done = runOutcomesBackground({ env, now, maxJobs: 1 });
    assert.equal(done.partial, undefined);
    assert.equal(fs.readFileSync(path.join(homeOf(d), 'outcomes.stamp'), 'utf8'), new Date(now).toISOString().slice(0, 10));
    assert.equal(fs.existsSync(path.join(homeOf(d), 'outcomes-cursor.json')), false);
    assert.equal(fs.existsSync(path.join(homeOf(d), 'outcomes.lock')), false, 'the lock is released');
  });

  it('a run that throws writes no stamp, so the next session tries again', () => {
    const d = scratch();
    seed(d, [row({ id: 'e000000009', t: ago(9) })]);
    fs.mkdirSync(path.join(homeOf(d), 'outcomes-last.json'), { recursive: true }); // the result file cannot be written
    assert.throws(() => runOutcomesBackground({ env: envOf(d) }));
    assert.equal(fs.existsSync(path.join(homeOf(d), 'outcomes.stamp')), false);
    assert.equal(fs.existsSync(path.join(homeOf(d), 'outcomes.lock')), false);
  });

  it('a second run while one holds the lock does nothing', () => {
    const d = scratch();
    seed(d, [row({ id: 'e000000001', t: ago(9) })]);
    write(homeOf(d), 'outcomes.lock', JSON.stringify({ pid: 1, at: Date.now() }));
    assert.deepEqual(runOutcomesBackground({ env: envOf(d) }), { ok: true, skipped: 'running' });
    assert.equal('outcome' in readRows(d)[0], false);
  });

  it('runs once per day, reports a newly bad job in one line, and stays quiet otherwise', () => {
    const d = scratch();
    const repo = scratch();
    write(repo, '.bgzflow/lessons.jsonl', `${JSON.stringify({ what: 'Job aaaaaaaaaa shipped wrong' })}\n`);
    seed(d, [row({ id: 'aaaaaaaaaa', repo })]);
    const env = envOf(d);
    const now = Date.now();
    let runs = 0;
    const run = (o) => {
      runs += 1;
      return runOutcomesBackground(o);
    };
    const line = dailyOutcomes({ env, now, run });
    assert.match(line, /^BGZFLOW: 1 graded job got a bad outcome \(reverted, review-flagged or became a lesson\)\. Draft regression checks with: bgz jev regress$/);
    assert.equal(fs.readFileSync(path.join(homeOf(d), 'outcomes.stamp'), 'utf8'), new Date(now).toISOString().slice(0, 10));
    assert.equal(dailyOutcomes({ env, now, run }), '', 'second call on the same day does nothing');
    assert.equal(runs, 1);
    assert.equal(dailyOutcomes({ env, now: now + DAY, run }), '', 'the next day it runs but nothing is newly bad');
    assert.equal(runs, 2);
    assert.equal(readRows(d)[0].combined, 0.8);
  });

  it('a finished background run leaves a one-line notice for the hook and clears the spawn guard', () => {
    const d = scratch();
    const repo = scratch();
    write(repo, '.bgzflow/lessons.jsonl', `${JSON.stringify({ what: 'Job bbbbbbbbbb shipped wrong' })}\n`);
    seed(d, [row({ id: 'bbbbbbbbbb', repo })]);
    write(homeOf(d), 'outcomes-spawn.json', JSON.stringify({ at: Date.now() }));
    runOutcomesBackground({ env: envOf(d), now: Date.now() });
    const notice = fs.readFileSync(path.join(homeOf(d), 'outcomes-notice.txt'), 'utf8');
    assert.match(notice, /^BGZFLOW: 1 graded job got a bad outcome \(reverted, review-flagged or became a lesson\)\. Draft regression checks with: bgz jev regress\n$/);
    assert.equal(fs.existsSync(path.join(homeOf(d), 'outcomes-spawn.json')), false);
  });

  it('with nothing graded it writes the stamp and returns an empty line', () => {
    const d = scratch();
    assert.equal(dailyOutcomes({ env: envOf(d), now: Date.now(), run: runOutcomesBackground }), '');
    assert.ok(fs.existsSync(path.join(homeOf(d), 'outcomes.stamp')));
  });

  it('the session-start hook returns at once and the detached job finishes the work afterwards', async () => {
    const d = scratch();
    const { repo, kept } = shared();
    seed(d, Array.from({ length: 3 }, (_, i) => row({ id: `f${String(i).padStart(9, '0')}`, repo, commits: [kept], t: ago(9) })));
    const env = { ...process.env, ...envOf(d), HOME: d, USERPROFILE: d, CLAUDE_PROJECT_DIR: d };
    delete env.BGZFLOW_JEV_GATES;
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'h8-outcomes.mjs')], { input: '{}', encoding: 'utf8', env, timeout: 20000 });
    const took = Date.now() - t0;
    assert.equal(r.status, 0, r.stderr);
    assert.ok(took < 5000, `the hook took ${took} ms`);
    const stamp = path.join(homeOf(d), 'outcomes.stamp');
    for (let i = 0; i < 360 && !fs.existsSync(stamp); i++) await new Promise((res) => setTimeout(res, 250));
    assert.ok(fs.existsSync(stamp), `the detached job wrote the stamp after it finished; home has: ${fs.readdirSync(homeOf(d)).join(', ')}`);
    assert.ok(readRows(d).every((x) => x.outcome && x.outcome.final && x.combined === 0.88));
  });
});
describe('ledger lines are sanitized when rewritten (B5)', () => {
  it('a performance line written raw by an older version is cleaned when its outcome is recorded', async () => {
    const { repo, kept } = shared();
    const d = scratch();
    const value = 'Zx9QwErTy7UiOp3AsDfGh';
    seed(d, [row({ id: 'eeeeeeeeee', worker: 'clean-worker', repo, commits: [kept], t: ago(8), steps: [['api', '_key=', value].join('')] })]);
    const r = await runNode([CLI, 'outcomes'], { project: d, env: envOf(d) });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.updated, 1);
    const text = fs.readFileSync(path.join(homeOf(d), 'performance.jsonl'), 'utf8');
    assert.ok(!text.includes(value), 'the key value is masked in the rewritten line');
    assert.equal(readRows(d)[0].outcome.final, true, 'the outcome is still recorded');
  });
});