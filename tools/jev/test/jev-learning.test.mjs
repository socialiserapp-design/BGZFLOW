// Offline tests for the learning loop (levels 9 and 10): grade by real outcomes, better workflows become skills,
// every failure becomes a test, and the fixed bench. No model is called: Jev, the drafter and the runner are fakes
// passed in through the same seams the real code uses.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { combine, outcomeFor, runOutcomesSync, commitSignals, PENALTY, WEIGHTS } from '../outcomes.mjs';
import { MAX_SKILL_CHARS, changesPath, findCandidates, improve, validateDraft, watchResults } from '../improve.mjs';
import { MAX_CARDS, addCard, compare, listCards, removeCard, scoreOutput, seedFromGrades, verdict } from '../bench.mjs';
import { draftOne, noteNeedsTest, notesFile, pending, queueFile, regressionList, runRegressSync } from '../regress.mjs';
import { league, performancePath } from '../grade.mjs';
// Built at runtime so the source holds no token-shaped string (leak check).
const GH = ['gh', 'p_'].join('');

const dirs = [];
const tmp = (prefix = 'learn') => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `bgz-${prefix}-`));
  dirs.push(d);
  return d;
};
after(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});
const homeEnv = () => ({ ...process.env, BGZFLOW_HOME: tmp('home') });
const git = (cwd, ...args) => {
  const r = spawnSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=noreply@example.invalid', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const writeRows = (env, rows) => fs.writeFileSync(performancePath(env), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const readRows = (env) => fs.readFileSync(performancePath(env), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const iso = (daysAgo, now = Date.now()) => new Date(now - daysAgo * 86400000).toISOString();

describe('level 9 grade by real outcomes (no model calls)', () => {
  it('a reverted commit costs the revert penalty, and league uses the combined score', () => {
    const env = homeEnv();
    const repo = tmp('repo');
    git(repo, 'init', '-q', '-b', 'main');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'one');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'first');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'two');
    git(repo, 'commit', '-q', '-am', 'bad change');
    const bad = git(repo, 'rev-parse', 'HEAD');
    git(repo, 'revert', '--no-edit', 'HEAD');
    const t = iso(2);
    assert.equal(commitSignals(repo, [bad], t).reverted, true);
    writeRows(env, [
      { id: 'job-bad-1', t, role: 'builder', worker: 'w1', value: 0.9, repo, commits: [bad] },
      { id: 'job-ok-001', t, role: 'builder', worker: 'w2', value: 0.8 },
    ]);
    const r = runOutcomesSync({ env });
    assert.equal(r.checked, 2);
    assert.equal(r.bad.length, 1);
    assert.equal(r.bad[0].id, 'job-bad-1');
    const rows = readRows(env);
    const badRow = rows.find((x) => x.id === 'job-bad-1');
    assert.equal(badRow.outcome.reverted, true);
    assert.equal(badRow.outcome.score, 1 - PENALTY.reverted);
    assert.equal(badRow.combined, Math.round((WEIGHTS.grade * 0.9 + WEIGHTS.outcome * (1 - PENALTY.reverted)) * 100) / 100);
    // a young job with no bad signal stays pending and is not rewritten
    assert.equal(rows.find((x) => x.id === 'job-ok-001').outcome, undefined);
    // the failure is queued for a regression check in the project that made it
    assert.equal(pending(repo).length, 1);
    // league ranks by the combined score once an outcome exists: w2 (0.8) now beats w1 (0.9 raised to combined 0.74)
    const ranked = league(rows);
    assert.equal(ranked[0].worker, 'w2');
    // a second run adds nothing new
    assert.equal(runOutcomesSync({ env }).bad.length, 0);
  });

  it('a review finding or a lesson naming the job lowers the outcome', () => {
    const env = homeEnv();
    const repo = tmp('repo2');
    fs.mkdirSync(path.join(repo, '.bgzflow', 'reviews'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.bgzflow', 'reviews', 'r.md'), '# Review\n- job-flag-77 BLOCKER: money is wrong\n');
    fs.writeFileSync(path.join(repo, '.bgzflow', 'lessons.jsonl'), JSON.stringify({ what: 'job-lesson-88 lost data', evidence: 'x' }) + '\n');
    const row = (id) => ({ id, t: iso(1), role: 'builder', worker: 'w', value: 0.7, repo });
    const f = outcomeFor(row('job-flag-77'), { env });
    assert.equal(f.flagged, true);
    assert.equal(f.score, 1 - PENALTY.flagged);
    const l = outcomeFor(row('job-lesson-88'), { env });
    assert.equal(l.lesson, true);
    assert.equal(l.score, 1 - PENALTY.lesson);
    assert.equal(outcomeFor(row('job-clean-99'), { env }).pending, true);
    assert.equal(combine(0.5, { score: 1 }), Math.round((WEIGHTS.grade * 0.5 + WEIGHTS.outcome) * 100) / 100);
  });

  it('--dry writes nothing and a clean old job settles as final', () => {
    const env = homeEnv();
    writeRows(env, [{ id: 'job-old-0001', t: iso(10), role: 'builder', worker: 'w', value: 0.8 }]);
    const before = fs.readFileSync(performancePath(env), 'utf8');
    const dry = runOutcomesSync({ env, dry: true });
    assert.equal(dry.updated, 1);
    assert.equal(fs.readFileSync(performancePath(env), 'utf8'), before);
    runOutcomesSync({ env });
    const row = readRows(env)[0];
    assert.equal(row.outcome.final, true);
    assert.equal(row.outcome.score, 1);
  });
});

describe('level 10 better workflows become skills', () => {
  const row = (n, value, extra = {}) => ({ id: `r${n}`, t: iso(20 - n), role: 'builder', worker: 'w', value, jobType: 'ui', skills: ['bg-x'], steps: ['read', 'build', 'test'], ...extra });
  const better = [row(1, 0.9), row(2, 0.9), row(3, 0.9)];
  const others = [{ id: 'o1', t: iso(15), role: 'builder', worker: 'w', value: 0.6 }, { id: 'o2', t: iso(14), role: 'builder', worker: 'w', value: 0.6 }];

  it('a workflow qualifies only with 3 or more jobs and a 0.1 margin over the role average', () => {
    assert.equal(findCandidates([...better, ...others]).length, 1);
    assert.equal(findCandidates([...better.slice(0, 2), ...others]).length, 0, 'two jobs is luck, not a pattern');
    assert.equal(findCandidates([...better.map((r) => ({ ...r, value: 0.65 })), ...others]).length, 0, 'under the margin');
    assert.equal(findCandidates([...better.map((r) => ({ ...r, value: 0.9, combined: 0.62 })), ...others]).length, 0, 'the combined score wins once an outcome exists');
    const key = findCandidates([...better, ...others])[0].key;
    assert.equal(findCandidates([...better, ...others], [{ workflow: key }]).length, 0, 'already promoted');
  });

  it('draft checks: size, name, fence, and no new stop-word rule', () => {
    const old = '---\nname: bg-x\ndescription: x\n---\nBuild it. Test it. Report it plainly in short lines for the reader.\n';
    const ok = `${old}Also read the brief first.\n`;
    assert.equal(validateDraft({ text: ok, name: 'bg-x', oldText: old }), null);
    assert.match(validateDraft({ text: ok + 'x'.repeat(MAX_SKILL_CHARS), name: 'bg-x', oldText: old }), /limit 4000/);
    assert.match(validateDraft({ text: ok.replace('name: bg-x', 'name: bg-y'), name: 'bg-x', oldText: old }), /skill name/);
    assert.match(validateDraft({ text: '```\n' + ok, name: 'bg-x', oldText: old }), /frontmatter|fence/);
    assert.match(validateDraft({ text: `${ok}Customers are refused after 3 tries.\n`, name: 'bg-x', oldText: old }), /stop word/);
  });

  function setup() {
    const env = homeEnv();
    writeRows(env, [...better, ...others]);
    const skillFile = path.join(tmp('skill'), 'SKILL.md');
    const oldText = '---\nname: bg-x\ndescription: Build the UI.\n---\nBuild it. Test it. Report it plainly in short lines for the reader.\n';
    fs.writeFileSync(skillFile, oldText);
    const newText = `${oldText}Read the brief and the design notes before you start.\n`;
    const deps = {
      skills: () => [{ name: 'bg-x', description: 'Build the UI.', file: skillFile }],
      match: async () => ({ ok: true, skill: 'bg-x', confidence: 0.9, file: skillFile }),
      drafter: { name: 'fake-drafter', run: () => ({ ok: true, text: newText }) },
      unasked: async () => ({ ok: true, untraceable: false }),
      cards: () => [{ id: 'c1' }],
      runner: { name: 'fake-runner', run: () => ({ ok: true, text: 'x' }) },
      bench: async () => ({ ok: true, pass: true, why: 'better on grade', cost_usd: 0.02 }),
    };
    return { env, skillFile, oldText, newText, deps };
  }

  it('promotes: backs up the old skill, switches the new one on, logs it, and does not repeat', async () => {
    const { env, skillFile, oldText, newText, deps } = setup();
    const out = await improve({ env, repo: tmp('repo3'), asks: 'The owner asked for better UI work.', deps });
    assert.equal(out.promoted.length, 1);
    assert.equal(fs.readFileSync(skillFile, 'utf8'), newText);
    assert.equal(fs.readFileSync(out.promoted[0].backup, 'utf8'), oldText);
    assert.match(out.promoted[0].backup, /skill-history[\\/]bg-x[\\/]\d{4}-\d{2}-\d{2}\.md$/);
    const changes = fs.readFileSync(changesPath(env), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(changes.at(-1).action, 'promote');
    const again = await improve({ env, repo: tmp('repo3'), asks: 'x', deps });
    assert.equal(again.promoted.length, 0);
  });

  it('rejects, and leaves the skill alone, when the draft adds a rule nobody asked for, or the bench says no', async () => {
    const a = setup();
    const outA = await improve({ env: a.env, repo: tmp('repo4'), asks: 'x', deps: { ...a.deps, unasked: async () => ({ ok: true, untraceable: true, kind: 'new rule', quote: 'refuse customers' }) } });
    assert.equal(outA.rejected.length, 1);
    assert.match(outA.rejected[0].why, /nobody asked for/);
    assert.equal(fs.readFileSync(a.skillFile, 'utf8'), a.oldText);
    const b = setup();
    const outB = await improve({ env: b.env, repo: tmp('repo5'), asks: 'x', deps: { ...b.deps, bench: async () => ({ ok: true, pass: false, why: 'new is worse on checks', cost_usd: 0.02 }) } });
    assert.equal(outB.rejected.length, 1);
    assert.equal(fs.readFileSync(b.skillFile, 'utf8'), b.oldText);
  });

  it('defers instead of promoting when there is no second model, no asks text, or no bench cards', async () => {
    const a = setup();
    assert.match((await improve({ env: a.env, repo: tmp('r6'), asks: 'x', deps: { ...a.deps, drafter: null } })).deferred[0].why, /second model/);
    const b = setup();
    assert.match((await improve({ env: b.env, repo: tmp('r7'), deps: b.deps })).deferred[0].why, /asks text/);
    const c = setup();
    assert.match((await improve({ env: c.env, repo: tmp('r8'), asks: 'x', deps: { ...c.deps, cards: () => [] } })).deferred[0].why, /bench cards/);
    assert.equal(fs.readFileSync(c.skillFile, 'utf8'), c.oldText);
  });

  it('--dry promotes nothing and writes no ledger', async () => {
    const { env, skillFile, oldText, deps } = setup();
    const out = await improve({ env, repo: tmp('r9'), asks: 'x', dry: true, deps });
    assert.equal(out.promoted[0].would, true);
    assert.equal(fs.readFileSync(skillFile, 'utf8'), oldText);
    assert.equal(fs.existsSync(changesPath(env)), false);
  });

  it('watch: after 5 jobs a worse average restores the backup automatically; a better one confirms', async () => {
    const { env, skillFile, oldText, newText, deps } = setup();
    await improve({ env, repo: tmp('r10'), asks: 'x', deps });
    const promoteT = JSON.parse(fs.readFileSync(changesPath(env), 'utf8').trim().split('\n').at(-1)).t;
    const after = (value, n) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, t: new Date(Date.parse(promoteT) + (i + 1) * 1000).toISOString(), role: 'builder', worker: 'w', value, skills: ['bg-x'] }));
    const changes = () => fs.readFileSync(changesPath(env), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(watchResults({ changes: changes(), rows: after(0.1, 3), env })[0].state, 'watching');
    assert.equal(fs.readFileSync(skillFile, 'utf8'), newText);
    const r = watchResults({ changes: changes(), rows: after(0.1, 5), env });
    assert.equal(r[0].state, 'rolled-back');
    assert.equal(fs.readFileSync(skillFile, 'utf8'), oldText);
    assert.equal(changes().at(-1).action, 'rollback');
    assert.match(changes().at(-1).reason, /below the old/);
    // a second watch pass has nothing left to settle
    assert.equal(watchResults({ changes: changes(), rows: after(0.1, 5), env }).length, 0);
  });
});

describe('level 10 every failure becomes a test', () => {
  const item = (extra = {}) => ({ source: 'lessons', what: 'discount applied twice', id: 'abc123def', ...extra });

  it('a draft that fails on the bad version and passes on the fix is verified and written to tests/regressions', () => {
    const repo = tmp('reg');
    fs.writeFileSync(path.join(repo, 'package.json'), '{}');
    const drafter = { name: 'fake', run: () => ({ ok: true, text: "import test from 'node:test';\ntest('discount once', () => {});" }) };
    const res = draftOne({ repo, item: item(), drafter, bad: 'BAD', fix: 'FIX', runner: (ref) => ref === 'FIX' });
    assert.equal(res.status, 'verified');
    assert.match(res.file, /^tests\/regressions\/.+\.test\.mjs$/);
    assert.ok(fs.existsSync(path.join(repo, res.file)));
  });

  it('a draft that does not fail on the bad version is not kept: it becomes a needs-test note', () => {
    const repo = tmp('reg2');
    fs.writeFileSync(path.join(repo, 'package.json'), '{}');
    const drafter = { name: 'fake', run: () => ({ ok: true, text: "import test from 'node:test';\ntest('x', () => {});" }) };
    const res = draftOne({ repo, item: item(), drafter, bad: 'BAD', fix: 'FIX', runner: () => true });
    assert.equal(res.status, 'needs-test');
    assert.match(fs.readFileSync(notesFile(repo), 'utf8'), /needs-test .*discount applied twice/);
    assert.equal(fs.existsSync(path.join(repo, 'tests', 'regressions')), false);
  });

  it('no second model, an empty draft, and a non-code project all fall back safely', () => {
    const repo = tmp('reg3');
    assert.equal(draftOne({ repo, item: item(), drafter: null }).status, 'needs-test');
    fs.writeFileSync(path.join(repo, 'package.json'), '{}');
    assert.equal(draftOne({ repo, item: item(), drafter: { name: 'f', run: () => ({ ok: true, text: '' }) } }).status, 'needs-test');
    const docs = tmp('docs');
    const res = draftOne({ repo: docs, item: item(), drafter: { name: 'f', run: () => ({ ok: true, text: '# Check\n- The discount is applied once per order.' }) } });
    assert.match(res.file, /^checks\/.+\.md$/);
  });

  it('runRegressSync drains the queue once and lists what it wrote', () => {
    const repo = tmp('reg4');
    fs.writeFileSync(path.join(repo, 'package.json'), '{}');
    fs.mkdirSync(path.join(repo, '.bgzflow'), { recursive: true });
    fs.writeFileSync(queueFile(repo), JSON.stringify({ source: 'lessons', what: 'bad rounding' }) + '\n');
    const drafter = { name: 'fake', run: () => ({ ok: true, text: "import test from 'node:test';\ntest('rounding', () => {});" }) };
    const first = runRegressSync({ repo, drafter });
    assert.equal(first.drafted, 1);
    assert.equal(runRegressSync({ repo, drafter }).results.length, 0);
    assert.equal(regressionList(repo).length, 1);
  });

  it('noteNeedsTest never writes a secret into the notes', () => {
    const repo = tmp('reg5');
    const key = ['sk', 'live', 'abcdefghijklmnop1234'].join('_');
    noteNeedsTest(repo, { what: `leaked ${key} in a log` }, 'why');
    assert.doesNotMatch(fs.readFileSync(notesFile(repo), 'utf8'), /abcdefghijklmnop1234/);
  });
});

describe('level 10 fixed bench', () => {
  const card = (n) => ({ id: `c${n}`, brief: `Job ${n}`, checks: ['it has tests', 'it is plain'] });
  // A fake judge: the number of checks that pass and the grade both depend on whether the output says "GOOD".
  const ask = async ({ state, questions }) => {
    const good = /GOOD/.test(state.output);
    const answers = {};
    for (const id of Object.keys(questions)) answers[id] = /^c\d+$/.test(id) ?{ type: 'noul', noul: good ? 1 : 0 } : { type: 'score', score: good ? 3 : 1, confidence: 0.9 };
    return { ok: true, answers, cost: 0.001 };
  };
  const runnerOf = (text) => ({ name: 'fake', run: () => ({ ok: true, text }) });

  it('keeps at most 10 cards, lets ops add and remove them, and masks secrets in a stored brief', () => {
    const env = homeEnv();
    for (let i = 0; i < 3; i++) addCard({ brief: `# Job ${i}\nbody`, checks: ['c'], env });
    assert.equal(listCards(env).length, 3);
    const stored = addCard({ brief: `token ${GH}a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8 here`, env });
    assert.doesNotMatch(JSON.stringify(listCards(env)), /ghp_a1B2c3D4/);
    assert.equal(removeCard(stored.id, env), true);
    assert.equal(removeCard('nope', env), false);
    // seeding never goes past the cap
    const briefs = [];
    for (let i = 0; i < 14; i++) {
      const p = path.join(tmp('brief'), `b${i}.md`);
      fs.writeFileSync(p, `# Job ${i} unique\n## Checks\n- check number ${i} holds\n`);
      briefs.push({ id: `g${i}`, t: iso(i), briefPath: p });
    }
    seedFromGrades({ env, rows: briefs });
    assert.ok(listCards(env).length <= MAX_CARDS);
  });

  it('scores a variant by its checks first, then by the Jev grade', async () => {
    const good = await scoreOutput({ card: card(1), output: 'GOOD work', ask });
    const bad = await scoreOutput({ card: card(1), output: 'meh', ask });
    assert.equal(good.checks, 1);
    assert.equal(bad.checks, 0);
    assert.ok(good.grade > bad.grade);
  });

  it('verdict: new must be no worse on checks and better on grade', () => {
    assert.equal(verdict({ checks: 0.5, grade: 0.4 }, { checks: 0.5, grade: 0.6 }).pass, true);
    assert.match(verdict({ checks: 0.8, grade: 0.4 }, { checks: 0.5, grade: 0.9 }).why, /worse on checks/);
    assert.match(verdict({ checks: 0.5, grade: 0.6 }, { checks: 0.5, grade: 0.6 }).why, /not better/);
    assert.equal(verdict({ checks: null }, { checks: 1, grade: 1 }).pass, false);
  });

  it('compare passes a better skill, rejects a worse one, prints cost, and refuses an empty set', async () => {
    const cards = [card(1), card(2)];
    const win = await compare({ oldVariant: { label: 'old', runner: runnerOf('meh') }, newVariant: { label: 'new', runner: runnerOf('GOOD') }, cards, ask });
    assert.equal(win.pass, true);
    assert.ok(win.cost_usd > 0);
    assert.equal(win.cards, 2);
    const lose = await compare({ oldVariant: { label: 'old', runner: runnerOf('GOOD') }, newVariant: { label: 'new', runner: runnerOf('meh') }, cards, ask });
    assert.equal(lose.pass, false);
    assert.equal((await compare({ oldVariant: {}, newVariant: {}, cards: [], ask })).ok, false);
  });
});
