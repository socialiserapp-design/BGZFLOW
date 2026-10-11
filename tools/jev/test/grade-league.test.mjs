// Offline tests for tools/jev/grade.mjs: `bgz jev grade` writes exactly one performance.jsonl line (weights from code,
// no file content), and `bgz jev league` averages per role and worker, using the combined score once an outcome exists.
// Jev is a loopback mock; BGZFLOW_HOME is a scratch folder, so the real ~/.bgzflow is never read or written.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, fake, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { RUBRIC, WEIGHTS, composite, effective, extractSteps, league, performancePath, readGrades, runGrade } from '../grade.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const dirs = [];
const mocks = [];
const scratch = () => {
  const d = makeProject('jevgrade');
  dirs.push(d);
  return d;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  mocks.push(m);
  return m;
};
const homeEnv = (d, m) => ({ ...(m ? m.env : {}), BGZFLOW_HOME: path.join(d, '.home'), FAST_JEV_KEY_FILE: path.join(d, 'no-such-key-file') });
const rowsOf = (d) => {
  try {
    return fs.readFileSync(path.join(d, '.home', 'performance.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
};
const seed = (d, rows) => {
  fs.mkdirSync(path.join(d, '.home'), { recursive: true });
  fs.writeFileSync(path.join(d, '.home', 'performance.jsonl'), `${rows.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\n')}\n`);
};
const cli = (args, d, m) => runNode([CLI, ...args], { project: d, env: homeEnv(d, m) });
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});

describe('the weights are in code', () => {
  it('checks 0.35, scope 0.25, proof 0.25, cost 0.15, summing to 1, over four 4-level rubric questions', () => {
    assert.deepEqual(WEIGHTS, { checks: 0.35, scope: 0.25, proof: 0.25, cost: 0.15 });
    assert.equal(Math.round(Object.values(WEIGHTS).reduce((a, b) => a + b, 0) * 100) / 100, 1);
    assert.deepEqual(Object.keys(RUBRIC), ['checks', 'scope', 'proof', 'cost']);
    for (const q of Object.values(RUBRIC)) {
      assert.equal(q.type, 'score');
      assert.equal(q.criteria.length, 4);
    }
  });

  it('composite is the weighted mean of the norms, and without cost the other three weights are rescaled', () => {
    const parts = { checks: { norm: 1 }, scope: { norm: 0.67 }, proof: { norm: 0.33 }, cost: { norm: 1 } };
    assert.equal(composite(parts, ['checks', 'scope', 'proof', 'cost']), 0.75);
    assert.equal(composite(parts, ['checks', 'scope', 'proof']), 0.71);
    assert.equal(composite({ checks: { norm: 0 }, scope: { norm: 0 }, proof: { norm: 0 }, cost: { norm: 0 } }, ['checks', 'scope', 'proof', 'cost']), 0);
    assert.equal(composite({ checks: { norm: 1 }, scope: { norm: 0 }, proof: { norm: 0 }, cost: { norm: 0 } }, ['checks', 'scope', 'proof', 'cost']), 0.35);
  });
});

describe('grade writes one performance line', () => {
  it('asks four questions with the brief and output as state, and appends exactly one line with the weights applied', async () => {
    const d = scratch();
    const brief = write(d, 'brief.md', '# Brief\nBUILD_MARKER goal: build the thing.\nChecks: npm test.');
    const out = write(d, 'out.md', '# Report\nOUTPUT_MARKER finished.\n## Steps\n1. Read the brief\n2. Built it\n3. Ran npm test\n');
    const m = await mock(() => ({ checks: 3, scope: 2, proof: 1, cost: 3 }));
    const r = await runGrade({ flags: { brief, role: 'Builder', worker: 'codex/gpt-5', 'cost-usd': '0.5', 'job-type': 'Feature', skills: 'b-skill,a-skill' }, rest: [out], timeoutMs: 3000, env: homeEnv(d, m) });
    assert.equal(r.ok, true);
    assert.equal(r.logged, true);
    assert.equal(r.value, 0.75);
    assert.deepEqual(r.weights, WEIGHTS);
    assert.deepEqual(Object.keys(r.parts), ['checks', 'scope', 'proof', 'cost']);
    assert.equal(r.parts.scope.norm, 0.67);
    assert.equal(r.parts.proof.norm, 0.33);

    assert.equal(m.calls.length, 1);
    const sent = m.calls[0].body;
    assert.deepEqual(Object.keys(sent.questions), ['checks', 'scope', 'proof', 'cost']);
    assert.match(sent.state.brief, /BUILD_MARKER/);
    assert.match(sent.state.output, /OUTPUT_MARKER/);
    assert.equal(sent.state.cost_usd, 0.5);
    assert.equal(sent.state.output_chars, fs.readFileSync(out, 'utf8').length);

    const rows = rowsOf(d);
    assert.equal(rows.length, 1, 'one grade is one line');
    const line = rows[0];
    assert.match(line.id, /^[0-9a-f]{10}$/);
    assert.ok(!Number.isNaN(Date.parse(line.t)));
    assert.equal(line.role, 'builder');
    assert.equal(line.worker, 'codex/gpt-5');
    assert.equal(line.value, 0.75);
    assert.deepEqual(line.parts, { checks: 1, scope: 0.67, proof: 0.33, cost: 1 });
    assert.equal(line.brief, 'brief.md');
    assert.equal(line.output, 'out.md');
    assert.equal(line.cost_usd, 0.5);
    assert.equal(line.jobType, 'feature');
    assert.deepEqual(line.skills, ['a-skill', 'b-skill']);
    assert.deepEqual(line.steps, ['Read the brief', 'Built it', 'Ran npm test']);
    assert.equal('repo' in line, false);
    assert.equal('commits' in line, false);
    assert.ok(!JSON.stringify(line).match(/BUILD_MARKER|OUTPUT_MARKER/), 'no file content on the line');
  });

  it('without --cost-usd the cost question is not asked and the three weights are rescaled', async () => {
    const d = scratch();
    const brief = write(d, 'brief.md', 'brief');
    const out = write(d, 'out.md', 'did the work');
    const m = await mock(() => ({ checks: 3, scope: 2, proof: 1 }));
    const r = await runGrade({ flags: { brief, role: 'checker', worker: 'w' }, rest: [out], timeoutMs: 3000, env: homeEnv(d, m) });
    assert.equal(r.value, 0.71);
    assert.deepEqual(Object.keys(m.calls[0].body.questions), ['checks', 'scope', 'proof']);
    assert.equal('cost_usd' in m.calls[0].body.state, false);
    const line = rowsOf(d)[0];
    assert.equal('cost_usd' in line, false);
    assert.deepEqual(Object.keys(line.parts), ['checks', 'scope', 'proof']);
    assert.equal(line.jobType, null);
    assert.deepEqual(line.skills, []);
  });

  it('records the repo and commits for the later outcome check, and caps the lists', async () => {
    const d = scratch();
    const brief = write(d, 'brief.md', 'brief');
    const out = write(d, 'out.md', 'work');
    const m = await mock(() => ({ checks: 2, scope: 2, proof: 2, cost: 2 }));
    const commits = Array.from({ length: 30 }, (_, i) => `abc${String(i).padStart(4, '0')}`).join(',');
    await runGrade({ flags: { brief, role: 'builder', worker: 'w', repo: d, commits, 'cost-usd': '0.1', skills: Array.from({ length: 50 }, (_, i) => `s${i}`).join(',') }, rest: [out], timeoutMs: 3000, env: homeEnv(d, m) });
    const line = rowsOf(d)[0];
    assert.equal(line.repo, path.resolve(d));
    assert.equal(line.commits.length, 20);
    assert.equal(line.commits[0], 'abc0000');
    assert.equal(line.skills.length, 40);
  });

  it('two grades are two lines and the first line is kept', async () => {
    const d = scratch();
    const brief = write(d, 'brief.md', 'brief');
    const out = write(d, 'out.md', 'work');
    const m = await mock(() => ({ checks: 3, scope: 3, proof: 3, cost: 3 }));
    const flags = { brief, role: 'builder', worker: 'w', 'cost-usd': '0.1' };
    const a = await runGrade({ flags, rest: [out], timeoutMs: 3000, env: homeEnv(d, m) });
    const b = await runGrade({ flags: { ...flags, worker: 'w2' }, rest: [out], timeoutMs: 3000, env: homeEnv(d, m) });
    const rows = rowsOf(d);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, a.id);
    assert.equal(rows[1].id, b.id);
    assert.equal(rows[0].value, 1);
  });

  it('through the CLI: prints the result without the output text and exits 0', async () => {
    const d = scratch();
    write(d, 'brief.md', 'BRIEF_TEXT_MARKER');
    write(d, 'out.md', 'OUT_TEXT_MARKER done');
    const m = await mock(() => ({ checks: 3, scope: 3, proof: 3, cost: 3 }));
    const r = await cli(['grade', 'out.md', '--brief', 'brief.md', '--role', 'builder', '--worker', 'sonnet', '--cost-usd', '0.2'], d, m);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.value, 1);
    assert.equal(r.json.logged, true);
    assert.doesNotMatch(r.stdout + r.stderr, /BRIEF_TEXT_MARKER|OUT_TEXT_MARKER/);
    assert.equal(rowsOf(d).length, 1);
    // the ledger line for the call holds ids and answers, never the brief or output
    const ledger = fs.readFileSync(path.join(d, '.home', 'jev-ledger.jsonl'), 'utf8');
    assert.match(ledger, /"caller":"jev-grade"/);
    assert.ok(!ledger.match(/BRIEF_TEXT_MARKER|OUT_TEXT_MARKER/));
  });

  it('a Jev outage (HTTP error, timeout, no key) returns ok:false, exits 1 and writes no line', async () => {
    const d = scratch();
    write(d, 'brief.md', 'brief');
    write(d, 'out.md', 'work');
    const down = await mock(() => ({}), { status: 500 });
    const a = await cli(['grade', 'out.md', '--brief', 'brief.md', '--role', 'builder', '--worker', 'w'], d, down);
    assert.equal(a.status, 1);
    assert.equal(a.json.ok, false);
    assert.equal(a.json.err, 'http_500');
    const noKey = await cli(['grade', 'out.md', '--brief', 'brief.md', '--role', 'builder', '--worker', 'w'], d);
    assert.equal(noKey.status, 1);
    assert.equal(noKey.json.err, 'nokey');
    assert.equal(fs.existsSync(path.join(d, '.home', 'performance.jsonl')), false);
  });

  it('missing --brief, --role, --worker or the file each fail with a usage message and make no call', async () => {
    const d = scratch();
    write(d, 'brief.md', 'brief');
    write(d, 'out.md', 'work');
    write(d, 'empty.md', '   \n');
    const m = await mock();
    for (const args of [['grade'], ['grade', 'out.md', '--role', 'b', '--worker', 'w'], ['grade', 'out.md', '--brief', 'brief.md', '--worker', 'w'], ['grade', 'out.md', '--brief', 'brief.md', '--role', 'b']]) {
      const r = await cli(args, d, m);
      assert.equal(r.status, 2, args.join(' '));
      assert.match(r.stderr, /usage: bgz jev grade <job-output-file> --brief <brief\.md> --role <role> --worker <model\/tool>/);
    }
    const blank = await cli(['grade', 'empty.md', '--brief', 'brief.md', '--role', 'b', '--worker', 'w'], d, m);
    assert.equal(blank.status, 2);
    assert.match(blank.stderr, /cannot read empty\.md/);
    const gone = await cli(['grade', 'gone.md', '--brief', 'brief.md', '--role', 'b', '--worker', 'w'], d, m);
    assert.equal(gone.status, 2);
    assert.equal(m.calls.length, 0);
    assert.equal(fs.existsSync(path.join(d, '.home', 'performance.jsonl')), false);
  });
});

describe('steps come from the report with secrets masked', () => {
  it('reads numbered and bulleted lines under a heading that names steps, workflow or approach; stops at another heading', () => {
    const text = '# Done\n## What I did\n- one\n* two\n3) three\n## Notes\n- not a step\n**Approach**\n1. four\n';
    assert.deepEqual(extractSteps(text), ['one', 'two', 'three', 'four']);
    assert.deepEqual(extractSteps('no headings\n- a line'), []);
  });

  it('an explicit --steps list wins, is split on semicolons and capped at 8 steps of 120 characters', () => {
    assert.deepEqual(extractSteps('## Steps\n1. from the report', 'a;b;c'), ['a', 'b', 'c']);
    const many = extractSteps('x', Array.from({ length: 12 }, (_, i) => `s${i}`).join(';'));
    assert.equal(many.length, 8);
    assert.equal(extractSteps('x', 'y'.repeat(300))[0].length, 120);
  });

  it('masks a token-shaped word in a step down to its kind and length', () => {
    const token = fake.ghToken();
    const [step] = extractSteps(`## Steps\n1. pushed with ${token} today`);
    assert.ok(!step.includes(token), step);
    assert.match(step, /<token starting ghp, \d+ chars>/);
  });
});

describe('league averages per role and worker', () => {
  it('groups by role then worker, sorts roles alphabetically and workers best first, rounds to 2 places, and averages cost only over costed rows', () => {
    const rows = league([
      { role: 'reviewer', worker: 'z', value: 0.7 },
      { role: 'builder', worker: 'x', value: 0.4, cost_usd: 0.2 },
      { role: 'builder', worker: 'x', value: 0.6, cost_usd: 0.4 },
      { role: 'builder', worker: 'x', value: 0.5 },
      { role: 'builder', worker: 'y', value: 0.9 },
      { role: 'builder', worker: 'w', value: 0.333 },
    ]);
    assert.deepEqual(rows.map((r) => [r.role, r.worker, r.jobs, r.average]), [
      ['builder', 'y', 1, 0.9],
      ['builder', 'x', 3, 0.5],
      ['builder', 'w', 1, 0.33],
      ['reviewer', 'z', 1, 0.7],
    ]);
    assert.equal(rows[1].avg_cost_usd, 0.3);
    assert.equal('avg_cost_usd' in rows[0], false);
  });

  it('uses the combined score once an outcome exists, even when it is 0', () => {
    assert.equal(effective({ value: 0.9, combined: 0.42 }), 0.42);
    assert.equal(effective({ value: 0.9, combined: 0 }), 0);
    assert.equal(effective({ value: 0.9, combined: null }), 0.9);
    assert.equal(effective({ value: 0.9 }), 0.9);
    const rows = league([
      { role: 'builder', worker: 'x', value: 0.9, combined: 0.4 },
      { role: 'builder', worker: 'x', value: 0.5 },
      { role: 'builder', worker: 'y', value: 0.6, combined: 0.8 },
    ]);
    const x = rows.find((r) => r.worker === 'x');
    assert.equal(x.average, 0.45, 'mean of the combined 0.4 and the plain 0.5, not of 0.9 and 0.5');
    assert.equal(rows[0].worker, 'y', 'y beats x only because of the combined scores');
  });

  it('readGrades skips unreadable lines and rows without a numeric value, role or worker, and --since filters by time', () => {
    const d = scratch();
    seed(d, [
      { t: '2026-10-01T00:00:00.000Z', role: 'builder', worker: 'a', value: 0.5 },
      'this is not json',
      '',
      { t: '2026-10-02T00:00:00.000Z', role: 'builder', worker: 'a', value: '0.5' },
      { t: '2026-10-02T00:00:00.000Z', role: '', worker: 'a', value: 0.5 },
      { t: '2026-10-02T00:00:00.000Z', role: 'builder', value: 0.5 },
      { t: '2026-10-05T00:00:00.000Z', role: 'builder', worker: 'b', value: 0.8 },
    ]);
    const env = homeEnv(d);
    assert.equal(performancePath(env), path.join(d, '.home', 'performance.jsonl'));
    assert.deepEqual(readGrades(env).map((r) => r.worker), ['a', 'b']);
    assert.deepEqual(readGrades(env, '2026-10-03T00:00:00.000Z').map((r) => r.worker), ['b']);
    assert.deepEqual(readGrades({ BGZFLOW_HOME: path.join(d, 'empty-home') }), []);
  });

  it('bgz jev league --json prints the averages; the text form lists best first within each role', async () => {
    const d = scratch();
    seed(d, [
      { t: '2026-10-05T00:00:00.000Z', role: 'builder', worker: 'x', value: 0.4, cost_usd: 0.2 },
      { t: '2026-10-05T00:00:00.000Z', role: 'builder', worker: 'x', value: 0.6, cost_usd: 0.4 },
      { t: '2026-10-05T00:00:00.000Z', role: 'builder', worker: 'y', value: 0.9 },
      { t: '2026-10-05T00:00:00.000Z', role: 'reviewer', worker: 'z', value: 0.7 },
    ]);
    const json = await cli(['league', '--json'], d);
    assert.equal(json.status, 0, json.stderr);
    assert.deepEqual(json.json.map((r) => [r.role, r.worker, r.jobs, r.average]), [['builder', 'y', 1, 0.9], ['builder', 'x', 2, 0.5], ['reviewer', 'z', 1, 0.7]]);
    const text = await cli(['league'], d);
    assert.equal(text.status, 0, text.stderr);
    const lines = text.stdout.split('\n');
    const y = lines.findIndex((l) => /^\s+y\s+0\.90\s+\(1 job\)$/.test(l));
    const x = lines.findIndex((l) => /^\s+x\s+0\.50\s+\(2 jobs, avg \$0\.3\)$/.test(l));
    assert.ok(y > 0 && x > y, text.stdout);
    assert.ok(lines.indexOf('builder') < lines.indexOf('reviewer'));
    assert.match(text.stdout, /Best first within each role\. Few jobs means a weak signal/);
    const since = await cli(['league', '--json', '--since', '2026-10-06T00:00:00.000Z'], d);
    assert.deepEqual(since.json, []);
  });

  it('with no grades yet, league says how to start and exits 0', async () => {
    const d = scratch();
    const r = await cli(['league'], d);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /No grades yet\. Run: bgz jev grade/);
  });
});
