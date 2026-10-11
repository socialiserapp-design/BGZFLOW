// Offline tests for tools/jev/bench.mjs (the fixed job cards and the old-against-new verdict) and regress.mjs (every
// failure becomes a test). Jev is a loopback mock, BGZFLOW_HOME is a scratch folder, and no real model is ever started:
// every run that could reach a drafter either injects a fake one or sets BGZFLOW_DRAFTER_CMD to a scratch script.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, fake, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { MAX_CARDS, addCard, benchDir, checksFromBrief, compare, listCards, removeCard, runBench, runVariant, scoreOutput, seedFromGrades, verdict } from '../bench.mjs';
import { readGrades, runGrade } from '../grade.mjs';
import { CANDIDATES, childEnv, pickDrafter, pickDrafterDetailed, runner, vendorOf } from '../drafter.mjs';
import { doneFile, draftOne, draftsDir, draftPrompt, isCodeProject, itemId, noteNeedsTest, notesFile, pending, queueFile, regressionList, regressionsSection, runRegress, runRegressSync, writeRegressionSection } from '../regress.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const dirs = [];
const mocks = [];
const scratch = (prefix = 'jbr') => {
  const d = makeProject(prefix);
  dirs.push(d);
  return d;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  mocks.push(m);
  return m;
};
const envFor = (d, m, extra = {}) => ({ ...(m ? m.env : {}), BGZFLOW_HOME: path.join(d, '.home'), FAST_JEV_KEY_FILE: path.join(d, 'no-key-file'), ...extra });
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});

// A judge that likes any output containing the word GOOD: every yes/no 0.9 (else 0.1), every score the top level (else 0).
const judge = (body) => {
  const good = String((body.state && body.state.output) || '').includes('GOOD');
  const out = {};
  for (const [id, q] of Object.entries(body.questions)) out[id] = q.type === 'noul' ? (good ? 0.9 : 0.1) : { score: good ? 3 : 0, confidence: 0.9 };
  return out;
};
const runnerOf = (textFor) => {
  const prompts = [];
  return { prompts, run: (prompt) => { prompts.push(prompt); return { ok: true, text: textFor(prompt) }; } };
};
const card = (n, checks = [{ contains: 'MARK' }]) => ({ id: `card${n}`, title: `card ${n}`, brief: `Do job number ${n}.`, checks, from: 'test', added: '2026-10-01T00:00:00.000Z' });

// ------------------------------------------------------------------------------------------------------------ bench: cards
describe('bench: cards and checks', () => {
  it('the cap is 10 cards; seeding fills only the room left, newest graded job first', () => {
    assert.equal(MAX_CARDS, 10);
    const d = scratch();
    const env = envFor(d);
    for (let i = 0; i < 8; i++) addCard({ brief: `# Existing ${i}\nbody`, checks: ['x'], env });
    const rows = [];
    for (let i = 0; i < 5; i++) {
      const p = write(d, `briefs/b${i}.md`, `# Seed ${i}\n\n## Checks\n1. check number ${i}\n`);
      rows.push({ id: `g${i}`, t: `2026-10-0${i + 1}T00:00:00Z`, briefPath: p });
    }
    const added = seedFromGrades({ env, n: 10, rows });
    assert.equal(added.length, 2, 'only 2 of the 10 slots were free');
    assert.equal(listCards(env).length, 10);
    const titles = listCards(env).map((c) => c.title);
    assert.ok(titles.includes('Seed 4') && titles.includes('Seed 3'), `newest two were taken: ${titles}`);
    assert.deepEqual(seedFromGrades({ env, rows }), [], 'a full set takes nothing more');
  });

  it('seeding skips a brief that is gone, one with no checks, and one already seen', () => {
    const d = scratch();
    const env = envFor(d);
    const withChecks = write(d, 'a.md', '# A\n\n## Checks\n- one\n');
    const noChecks = write(d, 'b.md', '# B\njust prose\n');
    const added = seedFromGrades({
      env,
      rows: [
        { id: '1', t: '2026-10-05', briefPath: path.join(d, 'gone.md') },
        { id: '2', t: '2026-10-04', briefPath: noChecks },
        { id: '3', t: '2026-10-03', briefPath: withChecks },
        { id: '4', t: '2026-10-02', briefPath: withChecks },
        { id: '5', t: '2026-10-01' },
      ],
    });
    assert.equal(added.length, 1);
    assert.equal(listCards(env)[0].title, 'A');
    assert.match(listCards(env)[0].from, /^grade 3$/);
  });

  it('a card id comes from the brief text, so adding the same brief twice keeps one card', () => {
    const d = scratch();
    const env = envFor(d);
    const a = addCard({ brief: '# Same\nbody', checks: ['x'], env });
    const b = addCard({ brief: '# Same\nbody', checks: ['x', 'y'], env });
    assert.equal(a.id, b.id);
    assert.equal(listCards(env).length, 1);
    assert.equal(listCards(env)[0].checks.length, 2, 'the later add replaces the earlier one');
    assert.equal(a.title, 'Same', 'the title is the first non-empty line without its # marks');
    const long = addCard({ brief: 'x'.repeat(30000), checks: ['x'], env });
    assert.equal(long.brief.length, 12000, 'a stored brief is cut to 12,000 characters');
  });

  it('removeCard only ever touches a card file inside the bench folder', () => {
    const d = scratch();
    const env = envFor(d);
    const c = addCard({ brief: '# R\nbody', checks: ['x'], env });
    const outside = write(d, '.home/outside.json', '{}');
    assert.equal(removeCard('../outside', env), false, 'a path-shaped id is reduced to letters and digits');
    assert.ok(fs.existsSync(outside), 'the file outside bench/ is untouched');
    assert.equal(removeCard('nope', env), false);
    assert.equal(removeCard(c.id, env), true);
    assert.deepEqual(listCards(env), []);
  });

  it('listCards skips a damaged or incomplete card and lists the rest by file name', () => {
    const d = scratch();
    const env = envFor(d);
    write(path.join(d, '.home'), 'bench/b-two.json', JSON.stringify(card(2)));
    write(path.join(d, '.home'), 'bench/a-one.json', JSON.stringify(card(1)));
    write(path.join(d, '.home'), 'bench/broken.json', '{not json');
    write(path.join(d, '.home'), 'bench/nochecks.json', JSON.stringify({ id: 'x', brief: 'b' }));
    write(path.join(d, '.home'), 'bench/notes.txt', 'ignored');
    assert.deepEqual(listCards(env).map((c) => c.id), ['card1', 'card2']);
    assert.equal(benchDir(env), path.join(d, '.home', 'bench'));
    assert.deepEqual(listCards(envFor(scratch())), [], 'a missing folder is an empty set');
  });

  it("checksFromBrief reads the brief's own check lines (at most 6, 240 characters, no markdown)", () => {
    const text = [
      '# Job', '1. not a check, wrong heading', '',
      '## Checks', '1. `npm test` passes', '2) **No** new files', '- third', '* fourth', '4. fifth', '5. sixth', '6. seventh is dropped', '',
      '## Other', '- also not a check',
      '### Definition of done', `- ${'z'.repeat(300)}`,
    ].join('\n');
    const checks = checksFromBrief(text);
    assert.equal(checks.length, 6);
    assert.deepEqual(checks.slice(0, 2), ['npm test passes', 'No new files']);
    assert.ok(!checks.some((c) => c.includes('seventh') || c.includes('also not')));
    assert.deepEqual(checksFromBrief('# Plan\n## Done when\n- it works\n'), ['it works']);
    assert.deepEqual(checksFromBrief('no headings at all\n- a bullet'), []);
    assert.equal(checksFromBrief('## Checks\n- ' + 'q'.repeat(300))[0].length, 240);
  });

  it('bench add / list / remove through runBench', async () => {
    const d = scratch();
    const env = envFor(d);
    const brief = write(d, 'brief.md', '# Fix the login\n\nBody.\n\n## Checks\n1. login works\n2. no secrets printed\n');
    const listed = await runBench({ flags: {}, rest: [], env });
    assert.deepEqual(listed.cards, []);
    assert.equal(listed.dir, benchDir(env));
    const a = await runBench({ flags: { brief }, rest: ['add'], env });
    assert.equal(a.ok, true);
    assert.equal(a.checks, 2, 'checks come from the brief when none are passed');
    const b = await runBench({ flags: { brief: write(d, 'two.md', '# Two\nx'), checks: 'first; second ;' }, rest: ['add'], env });
    assert.equal(b.checks, 2, '--checks "a;b" is split on semicolons and trimmed');
    assert.equal((await runBench({ flags: {}, rest: ['list'], env })).cards.length, 2);
    await assert.rejects(runBench({ flags: {}, rest: ['add'], env }), /usage: bgz jev bench add/);
    await assert.rejects(runBench({ flags: { brief: write(d, 'nochecks.md', '# No checks here') }, rest: ['add'], env }), /no checks found/);
    assert.deepEqual(await runBench({ flags: {}, rest: ['remove', 'zzzz'], env }), { ok: false, removed: 'zzzz' });
    assert.equal((await runBench({ flags: {}, rest: ['remove', a.id], env })).ok, true);
    await assert.rejects(runBench({ flags: {}, rest: ['frobnicate'], env }), /usage: bgz jev bench/);
  });

  it('seed with nothing graded says so and adds nothing', async () => {
    const d = scratch();
    const out = await runBench({ flags: {}, rest: ['seed'], env: envFor(d) });
    assert.equal(out.ok, true);
    assert.deepEqual(out.added, []);
    assert.match(out.note, /nothing to seed/);
  });

  it('X2: a grade line gives bench seed a brief it can open (grade logs briefPath, seed reads briefPath)', async () => {
    const d = scratch();
    const m = await mock(judge);
    const env = envFor(d, m);
    const brief = write(d, 'kept/brief.md', '# Kept brief\n\n## Checks\n1. it works\n');
    const out = write(d, 'kept/out.md', 'GOOD report');
    const r = await runGrade({ flags: { brief, role: 'builder', worker: 'codex' }, rest: [out], timeoutMs: 5000, env });
    assert.equal(r.ok, true);
    const added = seedFromGrades({ env, rows: readGrades(env) });
    assert.equal(added.length, 1, 'the graded job brief is still on disk, so a card should be seeded from it');
    assert.equal(path.resolve(readGrades(env)[0].briefPath), path.resolve(brief));
  });
});

// -------------------------------------------------------------------------------------------------------- bench: scoring
describe('bench: scoring one output', () => {
  it('code checks (contains, regex, not) are decided in code, and only sentence checks go to Jev', async () => {
    const d = scratch();
    const m = await mock(judge);
    const env = envFor(d, m);
    const c = card(1, [{ contains: 'ALPHA' }, { regex: 'b+c' }, { not: 'FORBIDDEN' }, { contains: 'MISSING' }, 'a sentence check']);
    const r = await scoreOutput({ card: c, output: 'GOOD ALPHA BBC', env });
    assert.equal(r.judged, true);
    assert.equal(r.checks, 0.8, '4 of 5 pass: three code checks and the sentence check (case-insensitive regex)');
    const q = m.calls[0].body.questions;
    assert.ok(q.c0 && !q.c1, 'one sentence check is sent, and only one');
    assert.match(q.c0.instructions, /a sentence check/);
    assert.ok(q.checks && q.scope && q.proof && !q.cost, 'the grade rubric rides along without the cost question');
  });

  it('a sentence check counts as met from 0.5 up and not below', async () => {
    const d = scratch();
    const m = await mock((body) => ({ c0: 0.5, c1: 0.4999, c2: 0.9, ...Object.fromEntries(Object.keys(body.questions).filter((k) => !/^c\d/.test(k)).map((k) => [k, { score: 2, confidence: 0.9 }])) }));
    const r = await scoreOutput({ card: card(1, ['edge', 'just under', 'clear']), output: 'x', env: envFor(d, m) });
    assert.equal(r.checks, 0.67, '0.5 and 0.9 are met, 0.4999 is not');
    assert.equal(r.grade, 0.67, 'two thirds at the top of three levels');
  });

  it('with Jev unavailable the code checks still count and the result says it was not judged', async () => {
    const d = scratch();
    const r = await scoreOutput({ card: card(1, [{ contains: 'A' }, { regex: 'b+c' }, { not: 'ZZZ' }, 'a sentence']), output: 'A bbc', env: envFor(d) });
    assert.equal(r.judged, false);
    assert.equal(r.grade, null);
    assert.equal(r.cost, 0);
    assert.equal(r.checks, 0.75);
  });

  it('a card with no checks at all does not divide by zero', async () => {
    const d = scratch();
    const r = await scoreOutput({ card: card(1, []), output: 'x', env: envFor(d) });
    assert.equal(r.checks, 0);
  });

  it('runVariant builds the prompt from the skill text and the frozen brief, and counts a failed run', async () => {
    const d = scratch();
    const m = await mock(judge);
    const env = envFor(d, m);
    const cards = [card(1), card(2)];
    const withSkill = runnerOf(() => 'GOOD MARK');
    const a = await runVariant({ label: 'new', skillText: 'SKILL BODY', runner: withSkill, cards, env });
    assert.match(withSkill.prompts[0], /^Follow this skill while doing the job:\n\nSKILL BODY\n\n---\n\nDo this job\. Reply with your report only\.\n\nDo job number 1\./);
    const bare = runnerOf(() => 'plain');
    await runVariant({ label: 'old', runner: bare, cards, env });
    assert.match(bare.prompts[0], /^Do this job\. Reply with your report only\.\n\nDo job number 1\./);
    assert.ok(!bare.prompts[0].includes('Follow this skill'));
    assert.equal(a.runs, 2);
    assert.equal(a.failedRuns, 0);
    assert.equal(a.checks, 1);
    assert.ok(a.cost_usd > 0, `cost is reported, got ${a.cost_usd}`);
    assert.ok(a.est_tokens > 0);
    let n = 0;
    const flaky = { run: () => (++n === 1 ? { ok: false, err: 'exit 1' } : { ok: true, text: 'GOOD MARK' }) };
    const f = await runVariant({ label: 'flaky', runner: flaky, cards, env });
    assert.equal(f.failedRuns, 1);
    assert.equal(f.per[0].ok, false);
    assert.equal(f.checks, 1, 'the average is over the runs that were judged');
  });

  it('X3: a token-shaped word in the job output is masked before it goes to Jev (bench and grade)', async () => {
    const d = scratch();
    const m = await mock(judge);
    const token = fake.ghToken();
    await scoreOutput({ card: card(1), output: `GOOD I pushed using ${token} just now`, env: envFor(d, m) });
    assert.ok(!JSON.stringify(m.calls[0].body).includes(token), 'the token must not leave the machine');
    const email = ['pat.smith', 'mailbox.co.uk'].join('@');
    const out = write(d, 'g/out.md', `GOOD done with ${token} and ${email}`);
    const brief = write(d, 'g/brief.md', `# b\n\n## Checks\n1. ok ${token}\n`);
    const g = await runGrade({ flags: { brief, role: 'builder', worker: 'codex' }, rest: [out], timeoutMs: 5000, env: envFor(d, m) });
    assert.equal(g.ok, true);
    const sent = JSON.stringify(m.calls[m.calls.length - 1].body);
    assert.ok(!sent.includes(token), 'grade masks the token');
    assert.ok(!sent.includes(email), 'grade masks the email');
  });
});

// -------------------------------------------------------------------------------------------------------- bench: verdict
describe('bench: the verdict', () => {
  const v = (o, n) => verdict(o, n);

  it('goes live only if new is no worse on checks and better on average', () => {
    assert.equal(v({ checks: 0.5, grade: 0.5 }, { checks: 0.5, grade: 0.6 }).pass, true, 'same checks, better grade');
    assert.equal(v({ checks: 0.5, grade: 0.5 }, { checks: 0.6, grade: 0.6 }).pass, true, 'better on both');
    const same = v({ checks: 0.5, grade: 0.5 }, { checks: 0.5, grade: 0.5 });
    assert.equal(same.pass, false, 'equal is not better');
    assert.match(same.why, /not better on Jev grade/);
    const worse = v({ checks: 0.8, grade: 0.4 }, { checks: 0.7, grade: 0.99 });
    assert.equal(worse.pass, false, 'a better grade never buys back worse checks');
    assert.match(worse.why, /worse on checks \(0\.7 vs 0\.8\)/);
    const lower = v({ checks: 0.5, grade: 0.7 }, { checks: 0.9, grade: 0.6 });
    assert.equal(lower.pass, false, 'better checks with a lower grade is not better on average');
  });

  it('refuses to decide when either side could not be scored', () => {
    for (const [o, n] of [[{ checks: null, grade: null }, { checks: 1, grade: 1 }], [{ checks: 1, grade: 1 }, { checks: null, grade: null }]]) {
      const r = v(o, n);
      assert.equal(r.pass, false);
      assert.match(r.why, /could not score/);
    }
  });

  it('every number in the why line is the number that was compared', () => {
    assert.match(v({ checks: 0.25, grade: 0.4 }, { checks: 0.5, grade: 0.75 }).why, /no worse on checks \(0\.5 vs 0\.25\), better on grade \(0\.75 vs 0\.4\)/);
  });
});

// ------------------------------------------------------------------------------------------------------- bench: compare
describe('bench: old against new on the same cards', () => {
  const cards = [card(1), card(2), card(3)];
  const model = (prompt) => (prompt.includes('NEWSKILL') ? 'GOOD MARK' : 'plain');

  it('passes a skill that is better, runs every card for both variants, and prints the cost', async () => {
    const d = scratch();
    const m = await mock(judge);
    const r = runnerOf(model);
    const out = await compare({ oldVariant: { label: 'old', runner: r, skillText: '' }, newVariant: { label: 'new', runner: r, skillText: 'NEWSKILL' }, cards, env: envFor(d, m) });
    assert.equal(out.ok, true);
    assert.equal(out.pass, true, out.why);
    assert.equal(out.cards, 3);
    assert.equal(r.prompts.length, 6, 'old and new each ran all 3 cards');
    for (const c of cards) assert.equal(r.prompts.filter((p) => p.includes(c.brief)).length, 2, `${c.id} ran once per variant`);
    assert.equal(m.calls.length, 6, 'one Jev call per scored output');
    assert.ok(out.cost_usd > 0 && out.est_tokens > 0, 'cost and token estimate are part of the result');
    assert.equal(out.cost_usd, Math.round((out.old.cost_usd + out.new.cost_usd) * 1e4) / 1e4 || out.cost_usd);
    assert.equal(out.old.checks, 0);
    assert.equal(out.new.checks, 1);
  });

  it('rejects a skill that is better at the grade but worse at the checks', async () => {
    const d = scratch();
    const m = await mock(judge);
    // old output has the MARK but reads badly; new reads well (GOOD) but loses the MARK
    const out = await compare({
      oldVariant: { label: 'old', runner: runnerOf(() => 'MARK only'), skillText: '' },
      newVariant: { label: 'new', runner: runnerOf(() => 'GOOD but no marker'), skillText: 'NEWSKILL' },
      cards,
      env: envFor(d, m),
    });
    assert.equal(out.pass, false);
    assert.match(out.why, /worse on checks/);
    assert.ok(out.new.grade > out.old.grade);
  });

  it('rejects an identical skill (not better) and a missing Jev (cannot score)', async () => {
    const d = scratch();
    const m = await mock(judge);
    const same = runnerOf(() => 'GOOD MARK');
    const tie = await compare({ oldVariant: { label: 'o', runner: same }, newVariant: { label: 'n', runner: same }, cards, env: envFor(d, m) });
    assert.equal(tie.pass, false);
    assert.match(tie.why, /not better/);
    const down = await compare({ oldVariant: { label: 'o', runner: same }, newVariant: { label: 'n', runner: same, skillText: 'NEWSKILL' }, cards, env: envFor(d) });
    assert.equal(down.pass, false);
    assert.match(down.why, /could not score/);
  });

  it('rejects when a runner fails every job, and says so in failedRuns', async () => {
    const d = scratch();
    const m = await mock(judge);
    const dead = { run: () => ({ ok: false, err: 'exit 1' }) };
    const out = await compare({ oldVariant: { label: 'o', runner: runnerOf(() => 'GOOD MARK') }, newVariant: { label: 'n', runner: dead }, cards, env: envFor(d, m) });
    assert.equal(out.pass, false);
    assert.equal(out.new.failedRuns, 3);
    assert.equal(out.new.checks, null);
  });

  it('an empty card set is refused with a way forward', async () => {
    const out = await compare({ oldVariant: {}, newVariant: {}, cards: [], env: envFor(scratch()) });
    assert.equal(out.ok, false);
    assert.equal(out.pass, false);
    assert.match(out.err, /bgz jev bench seed/);
  });
});

// --------------------------------------------------------------------------------------------- bench run (command line)
describe('bgz jev bench run', () => {
  const failingModel = 'exit 1';

  it('runs at most 10 cards by default; a dead runner never reaches Jev', async () => {
    const d = scratch();
    const m = await mock(judge);
    const env = envFor(d, m, { BGZFLOW_DRAFTER_CMD: failingModel });
    for (let i = 0; i < 12; i++) addCard({ brief: `# Card ${i}\nbody`, checks: ['x'], env });
    assert.equal(listCards(env).length, 12, 'adding is not capped, running is');
    const all = await runBench({ flags: {}, rest: ['run'], env });
    assert.equal(all.ok, true);
    assert.equal(all.cards, 10);
    assert.equal(all.old.runs, 10);
    assert.equal(all.pass, false);
    assert.equal(all.old.failedRuns, 10);
    assert.equal(m.calls.length, 0, 'nothing was scored, so Jev was never called');
  });

  it('prints each run cost; the new skill text is the only difference between the two variants', async () => {
    const d = scratch();
    const m = await mock(judge);
    const fakeModel = write(d, 'fake-model.mjs', "let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',(c)=>{s+=c;});process.stdin.on('end',()=>{process.stdout.write(s.includes('NEWSKILL')?'GOOD report: MARK done':'plain report');});\n");
    const oldFile = write(d, 'old.md', 'old skill text');
    const newFile = write(d, 'new.md', 'NEWSKILL text');
    for (let i = 1; i <= 3; i++) write(path.join(d, '.home'), `bench/c${i}.json`, JSON.stringify(card(i)));
    const r = await runNode([CLI, 'bench', 'run', '--old', oldFile, '--new', newFile, '--max-cards', '2'], {
      project: d,
      env: envFor(d, m, { BGZFLOW_DRAFTER_CMD: `"${process.execPath}" "${fakeModel}"` }),
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.pass, true, r.json.why);
    assert.equal(r.json.cards, 2);
    assert.ok(r.json.cost_usd > 0 && r.json.est_tokens > 0, `cost printed: ${r.stdout}`);
    assert.equal(r.json.old.per, undefined, 'the per-card detail is not printed');
    assert.equal(m.calls.length, 4);
    assert.ok(!r.stdout.includes('test-key-not-real'), 'the key is never printed');
  });
});

// ------------------------------------------------------------------------------------------------------ regress: drafter
describe('regress: the drafter is a different model from the one that failed', () => {
  const custom = (name, vendor) => ({ BGZFLOW_DRAFTER_CMD: 'echo unused', BGZFLOW_DRAFTER_NAME: name, ...(vendor ? { BGZFLOW_DRAFTER_VENDOR: vendor } : {}) });

  it('task 19: worker ids map to vendors', () => {
    for (const id of ['claude', 'claude-opus-4', 'Opus', 'sonnet-4.5', 'haiku', 'fable']) assert.equal(vendorOf(id), 'anthropic', id);
    for (const id of ['codex', 'gpt-5.4', 'GPT-5', 'o3', 'o4-mini', 'openai']) assert.equal(vendorOf(id), 'openai', id);
    for (const id of ['glm-4.6', 'GLM', 'z-code']) assert.equal(vendorOf(id), 'zhipu', id);
    for (const id of ['grok-4', 'xai']) assert.equal(vendorOf(id), 'xai', id);
    for (const id of ['zeta', 'writer-x', 'pro', '']) assert.equal(vendorOf(id), '', id);
  });

  it('a custom drafter is used only when its vendor differs from the worker', () => {
    assert.equal(pickDrafter({ exclude: 'codex', env: custom('zeta', 'anthropic') }).name, 'zeta');
    assert.equal(pickDrafter({ exclude: '', env: custom('zeta') }).name, 'zeta', 'no worker named: nothing to differ from');
    const same = pickDrafterDetailed({ exclude: 'gpt-5', env: custom('zeta', 'openai') });
    assert.ok(same.drafter === null || same.drafter.name !== 'zeta', 'same vendor as the worker is never picked');
    assert.match(same.why || 'picked another', /zeta is openai, same as the worker|picked another/);
    const unknownCustom = pickDrafterDetailed({ exclude: 'codex', env: custom('zeta') });
    assert.ok(unknownCustom.drafter === null || unknownCustom.drafter.name !== 'zeta', 'a custom drafter with no known vendor is not trusted');
  });

  it('an unknown worker vendor defers: nothing can be shown to be different', () => {
    const r = pickDrafterDetailed({ exclude: 'writer-x', env: custom('zeta', 'anthropic') });
    assert.equal(r.drafter, null);
    assert.match(r.why, /vendor unknown for worker writer-x/);
  });

  it('the failing worker vendor is never picked, whatever is installed', () => {
    assert.equal(pickDrafter({ exclude: 'opus gpt-5', env: custom('zeta', 'anthropic') }), null);
    for (const worker of ['claude-opus-4', 'codex gpt-5', 'sonnet', 'o3']) {
      const d = pickDrafter({ exclude: worker, env: {} });
      assert.ok(d === null || d.vendor !== vendorOf(worker.split(' ')[0]), `${worker} got a same-vendor drafter: ${d && d.name}`);
    }
    assert.equal(pickDrafter({ only: 'codex', exclude: 'gpt-5', env: {} }), null, 'asking for the failing vendor by name still gets nothing');
  });

  it('task 7: drafter children run in an empty temp folder, without the Jev key variables', () => {
    const d = makeProject('jevdraft');
    try {
      const probe = write(d, 'probe.mjs', "import fs from 'node:fs';\nprocess.stdout.write(JSON.stringify({ cwd: process.cwd(), files: fs.readdirSync(process.cwd()), key: process.env.TYPESAFE_API_KEY || null, file: process.env.FAST_JEV_KEY_FILE || null, keep: process.env.KEEP_ME || null }));\n");
      const r = runner(process.execPath, [probe], 'probe', 'anthropic', { ...process.env, TYPESAFE_API_KEY: 'fake-key-for-test', FAST_JEV_KEY_FILE: path.join(d, 'k'), KEEP_ME: 'yes' }).run('hi');
      assert.equal(r.ok, true, r.err);
      const seen = JSON.parse(r.text);
      assert.equal(seen.key, null);
      assert.equal(seen.file, null);
      assert.equal(seen.keep, 'yes');
      assert.deepEqual(seen.files, []);
      assert.notEqual(path.resolve(seen.cwd), path.resolve(process.cwd()));
      assert.equal(fs.existsSync(seen.cwd), false, 'the temp folder is removed afterwards');
      assert.equal(childEnv({ TYPESAFE_API_KEY: 'x', typesafe_api_key: 'y', A: '1' }).A, '1');
      assert.deepEqual(Object.keys(childEnv({ TYPESAFE_API_KEY: 'x', typesafe_api_key: 'y', FAST_JEV_KEY_FILE: 'z' })), []);
    } finally {
      removeDir(d);
    }
  });

  it('task 7: the CLI candidates run read-only (codex sandbox, claude plan mode with tools disallowed)', () => {
    const codex = CANDIDATES.find((c) => c.name === 'codex');
    const claude = CANDIDATES.find((c) => c.name === 'claude');
    assert.deepEqual(codex.args.slice(0, 3), ['exec', '--sandbox', 'read-only']);
    assert.ok(claude.args.includes('--permission-mode') && claude.args.includes('plan'));
    assert.match(claude.args[claude.args.indexOf('--disallowedTools') + 1], /Bash.*Edit.*Write/);
  });
});

// -------------------------------------------------------------------------------------------------------- regress: drafts
describe('regress: drafting one check', () => {
  const TEST_TEXT = "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('tax is counted once', () => { assert.equal(1, 1); });";
  const fakeDrafter = (reply, name = 'fake') => {
    const prompts = [];
    return { name, prompts, run: (prompt) => { prompts.push(prompt); return typeof reply === 'function' ? reply(prompt) : { ok: true, text: reply }; } };
  };
  const trackRunner = (results) => {
    const calls = [];
    const fn = (ref, rel, text) => { calls.push({ ref, rel, text }); return results[ref]; };
    fn.calls = calls;
    return fn;
  };
  const codeRepo = () => {
    const d = scratch('jreg');
    write(d, 'package.json', '{"name":"fixture","type":"module"}\n');
    return d;
  };
  const queueOne = (repo, over = {}) => {
    fs.mkdirSync(path.dirname(queueFile(repo)), { recursive: true });
    fs.appendFileSync(queueFile(repo), `${JSON.stringify({ source: 'lesson', what: 'checkout total counted the tax twice', jobId: 'j1', ...over })}\n`);
    return pending(repo).at(-1);
  };
  const notes = (repo) => (fs.existsSync(notesFile(repo)) ? fs.readFileSync(notesFile(repo), 'utf8') : '');

  it('a code project gets tests/regressions/<slug>.test.mjs, verified only if it fails on bad and passes on the fix', () => {
    const repo = codeRepo();
    const item = queueOne(repo);
    const runner = trackRunner({ 'bad-sha': false, 'fix-sha': true });
    const res = draftOne({ repo, item, drafter: fakeDrafter(`\`\`\`js\n${TEST_TEXT}\n\`\`\``), bad: 'bad-sha', fix: 'fix-sha', runner });
    assert.equal(res.status, 'verified');
    assert.deepEqual(runner.calls.map((c) => c.ref), ['bad-sha', 'fix-sha'], 'the bad version is tried first, then the fix');
    assert.ok(runner.calls[0].rel.startsWith(path.join('tests', 'regressions')) && runner.calls[0].rel.endsWith('.test.mjs'));
    assert.equal(runner.calls[0].text, TEST_TEXT, 'code fences are stripped before the test is run');
    assert.match(res.file, /^tests\/regressions\/checkout-total-counted-the-tax-twice-[0-9a-f]{6}\.test\.mjs$/);
    assert.equal(fs.readFileSync(path.join(repo, res.file), 'utf8'), `${TEST_TEXT}\n`);
    assert.equal(res.drafter, 'fake');
    assert.equal(notes(repo), '', 'a verified draft leaves no needs-test note');
  });

  it('a draft that passes on the bad version, or fails on the fix, is not kept: it becomes a needs-test note', () => {
    for (const [bad, fix, label] of [[true, true, 'passes on both'], [false, false, 'fails on both'], [true, false, 'inverted']]) {
      const repo = codeRepo();
      const item = queueOne(repo);
      const res = draftOne({ repo, item, drafter: fakeDrafter(TEST_TEXT), bad: 'b', fix: 'f', runner: trackRunner({ b: bad, f: fix }) });
      assert.equal(res.status, 'needs-test', label);
      assert.equal(res.why, 'draft failed verification');
      assert.ok(!fs.existsSync(path.join(repo, 'tests')), `${label}: nothing is written`);
      assert.match(notes(repo), new RegExp(`- needs-test \\d{4}-\\d\\d-\\d\\d: checkout total counted the tax twice \\(draft did not fail on the bad version and pass on the fix \\(bad=${bad}, fix=${fix}\\)\\)`), label);
    }
  });

  it('when a ref cannot be run the draft is kept but marked unverified; with no refs it stays a plain draft', () => {
    const repo = codeRepo();
    const unverified = draftOne({ repo, item: queueOne(repo, { what: 'one' }), drafter: fakeDrafter(TEST_TEXT), bad: 'b', fix: 'f', runner: trackRunner({ b: null, f: true }) });
    assert.equal(unverified.status, 'draft-unverified');
    assert.ok(fs.existsSync(path.join(repo, unverified.file)));
    assert.match(unverified.file, /^\.bgzflow\/regression-drafts\/one-[0-9a-f]{6}\.test\.mjs$/, 'task 15: an unverified draft waits outside tests/');
    assert.ok(!fs.existsSync(path.join(repo, 'tests')), 'task 15: nothing unverified enters tests/')
    const runner = trackRunner({});
    const plain = draftOne({ repo, item: queueOne(repo, { what: 'two' }), drafter: fakeDrafter(TEST_TEXT), runner });
    assert.equal(plain.status, 'draft');
    assert.match(plain.file, /^\.bgzflow\/regression-drafts\//);
    assert.equal(runner.calls.length, 0, 'no refs, no run');
  });

  it('an unusable draft (prose, too short, or the drafter itself failing) becomes a needs-test note with the reason', () => {
    const repo = codeRepo();
    const prose = draftOne({ repo, item: queueOne(repo, { what: 'a' }), drafter: fakeDrafter('Here is a long explanation of what to test but it is not a test file at all.') });
    assert.deepEqual([prose.status, prose.why], ['needs-test', 'unusable draft']);
    const short = draftOne({ repo, item: queueOne(repo, { what: 'b' }), drafter: fakeDrafter('test(') });
    assert.equal(short.status, 'needs-test');
    const dead = draftOne({ repo, item: queueOne(repo, { what: 'c' }), drafter: fakeDrafter(() => ({ ok: false, err: 'exit 2' })) });
    assert.deepEqual([dead.status, dead.why], ['needs-test', 'exit 2']);
    assert.match(notes(repo), /drafter failed: exit 2/);
    assert.match(notes(repo), /draft was empty or not a test/);
    assert.ok(!fs.existsSync(path.join(repo, 'tests')));
  });

  it('with no second model at all, the item is noted and nothing is drafted', () => {
    const repo = codeRepo();
    const res = draftOne({ repo, item: queueOne(repo), drafter: null });
    assert.deepEqual([res.status, res.why], ['needs-test', 'no drafter']);
    assert.match(notes(repo), /no second model available to draft it/);
  });

  it('a project without package.json gets a plain-English checklist in checks/, never run against a ref', () => {
    const repo = scratch('jreg');
    assert.equal(isCodeProject(repo), false);
    const runner = trackRunner({});
    const item = queueOne(repo, { what: 'The invoice email went out twice' });
    const text = '- [ ] the invoice email is sent once\n- [ ] the log shows one send';
    const res = draftOne({ repo, item, drafter: fakeDrafter(text), bad: 'b', fix: 'f', runner });
    assert.equal(res.status, 'draft');
    assert.match(res.file, /^checks\/the-invoice-email-went-out-twice-[0-9a-f]{6}\.md$/);
    assert.equal(runner.calls.length, 0);
    assert.equal(fs.readFileSync(path.join(repo, res.file), 'utf8'), `${text}\n`);
    for (const f of ['pyproject.toml', 'Cargo.toml', 'go.mod']) {
      const other = scratch('jreg');
      write(other, f, '');
      assert.equal(isCodeProject(other), true, f);
    }
  });

  it('two failures get two files; the file name carries the start of the item id', () => {
    const repo = codeRepo();
    const a = draftOne({ repo, item: queueOne(repo, { what: 'same words', jobId: 'j1' }), drafter: fakeDrafter(TEST_TEXT) });
    const b = draftOne({ repo, item: queueOne(repo, { what: 'same words', jobId: 'j2' }), drafter: fakeDrafter(TEST_TEXT) });
    assert.notEqual(a.file, b.file);
    assert.equal(fs.readdirSync(draftsDir(repo)).length, 2);
  });

  it('the prompt names the failure with secrets masked, and the folder name but not its full path', () => {
    const token = fake.ghToken();
    const repo = codeRepo();
    const p = draftPrompt({ item: { what: `deploy used ${token} in the log`, evidence: `saw ${token}`, commits: ['abc1234'] }, code: true, repo });
    assert.ok(!p.includes(token), 'the token is masked');
    assert.match(p, /<token starting ghp_/);
    assert.match(p, /Commits involved: abc1234/);
    assert.match(p, /node:test and node:assert\/strict/);
    assert.match(p, /FAIL on the bad version of the code and PASS once the failure is fixed/);
    assert.ok(p.includes(path.basename(repo)) && !p.includes(repo), 'only the folder name is given');
    const plain = draftPrompt({ item: { jobId: 'j9' }, code: false, repo });
    assert.match(plain, /markdown checklist/);
    assert.match(plain, /job j9 was reverted, review-flagged or became a lesson/, 'a job with no description still says what happened');
    assert.ok(draftPrompt({ item: { what: 'w'.repeat(5000) }, code: true, repo }).length < 2500, 'a long failure text is cut');
  });

  it('noteNeedsTest writes a dated line, masks a secret and cuts a long description', () => {
    const repo = scratch('jreg');
    const token = fake.ghToken();
    noteNeedsTest(repo, { what: `leaked ${token} in the log` }, 'draft failed');
    noteNeedsTest(repo, { jobId: 'job-77' }, 'no drafter');
    noteNeedsTest(repo, { what: 'w'.repeat(500) }, 'long');
    const lines = notes(repo).trimEnd().split('\n');
    assert.equal(lines.length, 3);
    assert.ok(!lines[0].includes(token), 'the token is masked');
    assert.match(lines[0], /^- needs-test \d{4}-\d\d-\d\d: leaked .* in the log \(draft failed\)$/);
    assert.match(lines[1], /: job-77 \(no drafter\)$/, 'with no description the job id is named');
    assert.equal(lines[2].match(/w+/)[0].length, 160, 'the description is cut to 160 characters');
  });
});

// ----------------------------------------------------------------------------------------------------- regress: the queue
describe('regress: the queue and the brief section', () => {
  const customDrafter = { BGZFLOW_DRAFTER_CMD: 'exit 1', BGZFLOW_DRAFTER_NAME: 'scratch-drafter' };
  const queue = (repo, items) => {
    fs.mkdirSync(path.join(repo, '.bgzflow'), { recursive: true });
    fs.writeFileSync(queueFile(repo), `${items.map((i) => (typeof i === 'string' ? i : JSON.stringify(i))).join('\n')}\n`);
  };

  it('an item id is stable, differs by commits, and an item already done is not pending again', () => {
    const a = { source: 'outcomes', what: 'reverted', jobId: 'j1', commits: ['c1'] };
    assert.equal(itemId(a), itemId({ ...a }));
    assert.notEqual(itemId(a), itemId({ ...a, commits: ['c2'] }));
    assert.equal(itemId({ ...a, id: 'given' }), 'given', 'an explicit id wins');
    const repo = scratch('jreg');
    queue(repo, [a, '{not json', { source: 'lesson', what: 'second' }]);
    const items = pending(repo);
    assert.equal(items.length, 2, 'a damaged line is skipped');
    fs.mkdirSync(path.dirname(doneFile(repo)), { recursive: true });
    fs.writeFileSync(doneFile(repo), `${JSON.stringify({ id: items[0].id, status: 'verified', file: 'tests/regressions/x.test.mjs' })}\n`);
    assert.deepEqual(pending(repo).map((i) => i.what), ['second']);
    assert.deepEqual(pending(scratch('jreg')), [], 'no queue file is an empty queue');
  });

  it('when the failing worker is the only drafter, the queue is still drained into needs-test notes (no model is run)', () => {
    const repo = scratch('jreg');
    queue(repo, [{ source: 'lesson', what: 'one' }, { source: 'lesson', what: 'two' }]);
    const env = { BGZFLOW_DRAFTER_CMD: 'echo unused', BGZFLOW_DRAFTER_NAME: 'zeta' };
    const out = runRegressSync({ repo, worker: 'zeta claude codex', env });
    assert.equal(out.drafted, 0);
    assert.equal(out.needsTest, 2);
    assert.equal(pending(repo).length, 0, 'recorded as done, so they are not retried every run');
    assert.equal(fs.readFileSync(notesFile(repo), 'utf8').trim().split('\n').length, 2);
  });

  it('regressionsSection lists each kept check with its status, or says none yet', () => {
    const repo = scratch('jreg');
    assert.match(regressionsSection(repo), /^## Regression checks\n[\s\S]*- none yet$/);
    fs.mkdirSync(path.dirname(doneFile(repo)), { recursive: true });
    fs.writeFileSync(doneFile(repo), [{ id: 'a', status: 'verified', file: 'tests/regressions/a.test.mjs' }, { id: 'b', status: 'needs-test' }, { id: 'c', status: 'draft', file: 'checks/c.md' }].map((r) => JSON.stringify(r)).join('\n'));
    assert.deepEqual(regressionList(repo).map((r) => r.id), ['a', 'c']);
    const s = regressionsSection(repo);
    assert.match(s, /- tests\/regressions\/a\.test\.mjs \(verified\)/);
    assert.match(s, /- checks\/c\.md \(draft\)/);
    assert.ok(!s.includes('needs-test'), 'a needs-test item has no file to list');
  });

  const briefWithOneCheck = (repo) => {
    fs.mkdirSync(path.dirname(doneFile(repo)), { recursive: true });
    fs.writeFileSync(doneFile(repo), `${JSON.stringify({ id: 'a', status: 'verified', file: 'tests/regressions/a.test.mjs' })}\n`);
    return write(repo, 'brief.md', '# Brief\n\nGoal.\n\n## Checks\n1. it works\n');
  };

  it('the section is added to the next brief and then replaced in place, never duplicated', async () => {
    const repo = scratch('jreg');
    const brief = briefWithOneCheck(repo);
    await runRegress({ flags: { repo, brief }, env: customDrafter });
    const once = fs.readFileSync(brief, 'utf8');
    assert.match(once, /## Checks\n1\. it works\n/, 'the rest of the brief is untouched');
    assert.match(once, /## Regression checks[\s\S]*tests\/regressions\/a\.test\.mjs \(verified\)/);
    await runRegress({ flags: { repo, brief }, env: customDrafter });
    assert.equal((fs.readFileSync(brief, 'utf8').match(/## Regression checks/g) || []).length, 1);
    fs.appendFileSync(doneFile(repo), `${JSON.stringify({ id: 'b', status: 'draft', file: 'checks/b.md' })}\n`);
    writeRegressionSection(brief, regressionsSection(repo));
    const twice = fs.readFileSync(brief, 'utf8');
    assert.equal((twice.match(/## Regression checks/g) || []).length, 1);
    assert.match(twice, /checks\/b\.md \(draft\)/);
    assert.match(twice, /^# Brief\n\nGoal\.\n\n## Checks\n1\. it works\n\n## Regression checks/);
  });

  it('a section that sits before another heading is replaced without touching what follows it', () => {
    const repo = scratch('jreg');
    fs.mkdirSync(path.dirname(doneFile(repo)), { recursive: true });
    fs.writeFileSync(doneFile(repo), `${JSON.stringify({ id: 'a', status: 'verified', file: 'tests/regressions/a.test.mjs' })}\n`);
    const brief = write(repo, 'brief.md', '# B\n\n## Regression checks\n\nold text\n- stale (draft)\n\n## Limits\nkeep this\n');
    writeRegressionSection(brief, regressionsSection(repo));
    const text = fs.readFileSync(brief, 'utf8');
    assert.ok(!text.includes('stale') && !text.includes('old text'));
    assert.match(text, /- tests\/regressions\/a\.test\.mjs \(verified\)\n\n## Limits\nkeep this\n$/);
  });

  it('X4: running the brief update again leaves the file byte for byte the same', async () => {
    const repo = scratch('jreg');
    const brief = briefWithOneCheck(repo);
    await runRegress({ flags: { repo, brief }, env: customDrafter });
    const once = fs.readFileSync(brief, 'utf8');
    await runRegress({ flags: { repo, brief }, env: customDrafter });
    assert.equal(fs.readFileSync(brief, 'utf8'), once, 'a second run changes nothing');
  });

  it('--list reads only: it reports the kept checks and how many are waiting', async () => {
    const repo = scratch('jreg');
    queue(repo, [{ source: 'lesson', what: 'waiting' }]);
    const before = fs.readdirSync(path.join(repo, '.bgzflow')).sort();
    const out = await runRegress({ flags: { repo, list: true }, env: customDrafter });
    assert.deepEqual([out.ok, out.pending, out.checks], [true, 1, []]);
    assert.deepEqual(fs.readdirSync(path.join(repo, '.bgzflow')).sort(), before, '--list wrote nothing');
  });

  it('X5: --dry drafts and writes nothing (the usage line of bgz jev advertises it)', async () => {
    const d = scratch();
    const repo = path.join(d, 'repo');
    write(repo, 'package.json', '{"type":"module"}\n');
    queue(repo, [{ source: 'lesson', what: 'dry run item' }]);
    const reply = write(d, 'reply.txt', "import test from 'node:test';\ntest('x', () => {});\n");
    const drafter = write(d, 'drafter.mjs', `import fs from 'node:fs';process.stdout.write(fs.readFileSync(${JSON.stringify(reply)}, 'utf8'));\n`);
    const env = { BGZFLOW_DRAFTER_CMD: `"${process.execPath}" "${drafter}"`, BGZFLOW_DRAFTER_NAME: 'scratch-drafter' };
    const before = fs.readdirSync(path.join(repo, '.bgzflow')).sort();
    const out = await runRegress({ flags: { repo, dry: true, worker: 'codex' }, env: { ...env, BGZFLOW_DRAFTER_VENDOR: 'anthropic' } });
    assert.deepEqual([out.dry, out.pending, out.items[0].drafter], [true, 1, 'scratch-drafter']);
    assert.ok(!fs.existsSync(path.join(repo, 'tests')), 'no test file written');
    assert.ok(!fs.existsSync(doneFile(repo)), 'the queue was not marked done');
    assert.deepEqual(fs.readdirSync(path.join(repo, '.bgzflow')).sort(), before, 'nothing written under .bgzflow');
  });

  it('task 19: regress uses the real worker (flag or queue item) and defers when the vendor is unknown or the same', async () => {
    const d = scratch();
    const repo = path.join(d, 'repo');
    write(repo, 'package.json', '{"type":"module"}\n');
    const reply = write(d, 'reply.txt', "import test from 'node:test';\ntest('x', () => {});\n");
    const script = write(d, 'drafter.mjs', `import fs from 'node:fs';process.stdout.write(fs.readFileSync(${JSON.stringify(reply)}, 'utf8'));\n`);
    const env = { BGZFLOW_DRAFTER_CMD: `"${process.execPath}" "${script}"`, BGZFLOW_DRAFTER_NAME: 'scratch-drafter', BGZFLOW_DRAFTER_VENDOR: 'openai', PATH: '' };
    queue(repo, [{ source: 'outcomes', what: 'by opus', worker: 'opus-5.5' }, { source: 'outcomes', what: 'by gpt', worker: 'gpt-5.4' }, { source: 'lesson', what: 'by nobody' }, { source: 'lesson', what: 'by a stranger', worker: 'writer-x' }]);
    const out = await runRegress({ flags: { repo }, env });
    const by = Object.fromEntries(out.results.map((r, i) => [['opus', 'gpt', 'nobody', 'stranger'][i], r]));
    assert.equal(by.opus.status, 'draft', 'an openai drafter may draft anthropic work');
    assert.match(by.opus.file, /^\.bgzflow\/regression-drafts\//);
    assert.equal(by.gpt.why, 'deferred', 'the same vendor never drafts its own work');
    assert.equal(by.nobody.why, 'deferred', 'no worker named: defer');
    assert.equal(by.stranger.why, 'deferred', 'unknown vendor: defer');
    assert.match(fs.readFileSync(notesFile(repo), 'utf8'), /deferred: .*same as the worker/);
    const flagged = path.join(d, 'repo2');
    write(flagged, 'package.json', '{}\n');
    queue(flagged, [{ source: 'lesson', what: 'flag wins' }]);
    const viaFlag = await runRegress({ flags: { repo: flagged, worker: 'claude-opus' }, env });
    assert.equal(viaFlag.results[0].status, 'draft', 'the --worker flag names the worker when the item does not');
  });
});

// ------------------------------------------------------------------------------- regress: really failing, really fixed
describe('regress: a draft is verified against real git refs', () => {
  const git = (cwd, args) => {
    const r = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=noreply@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };

  it('fails on the buggy commit and passes on the fix, so it is kept as verified', () => {
    // Under `node --test` the nested `node --test` would inherit NODE_TEST_CONTEXT and report as a child; a user's shell has none.
    const savedContext = process.env.NODE_TEST_CONTEXT;
    delete process.env.NODE_TEST_CONTEXT;
    try {
      verifiedAgainstRealRefs();
    } finally {
      if (savedContext !== undefined) process.env.NODE_TEST_CONTEXT = savedContext;
    }
  });

  function verifiedAgainstRealRefs() {
    const d = scratch('jreg');
    const repo = path.join(d, 'repo');
    fs.mkdirSync(repo);
    git(repo, ['init', '-q']);
    write(repo, 'package.json', '{"name":"fixture","type":"module"}\n');
    write(repo, 'lib.mjs', 'export const add = (a, b) => a - b;\n');
    git(repo, ['add', '-A']);
    git(repo, ['commit', '-q', '-m', 'bad']);
    const bad = git(repo, ['rev-parse', 'HEAD']);
    write(repo, 'lib.mjs', 'export const add = (a, b) => a + b;\n');
    git(repo, ['commit', '-qam', 'fix']);
    const fix = git(repo, ['rev-parse', 'HEAD']);
    fs.mkdirSync(path.join(repo, '.bgzflow'));
    fs.writeFileSync(queueFile(repo), `${JSON.stringify({ source: 'lesson', what: 'add subtracted instead of adding', jobId: 'j1' })}\n`);
    const test = "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from '../../lib.mjs';\ntest('add adds', () => { assert.equal(add(2, 3), 5); });";
    const out = runRegressSync({ repo, drafter: { name: 'fake', run: () => ({ ok: true, text: test }) }, bad, fix });
    assert.equal(out.results[0].status, 'verified', JSON.stringify(out));
    assert.equal(out.drafted, 1);
    assert.ok(fs.existsSync(path.join(repo, out.results[0].file)));
    assert.equal(git(repo, ['worktree', 'list']).split('\n').length, 1, 'the throwaway worktrees were removed');
  }
});
