// skill-gate: a changed skill goes live only if it passes its eval cases at least as often as the previous
// version and never fires worse than no plugin on a trigger case. These tests use saved result files, so they run
// offline; the --run test drives a stand-in for `claude plugin eval`.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compare, evalArgs, loadResult, materialisePrevious, parseResult, runOutputTokens, stagePlugin } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CLI = path.join(HERE, 'skill-gate.mjs');
const FIX = (f) => path.join(HERE, 'fixtures', f);
const made = [];
const tmp = (p = 'sg-') => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), p));
  made.push(d);
  return d;
};
after(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

const gate = (cand, prev = 'previous.json', extra = {}) =>
  compare({ skill: 'bg-efficiency', candidate: loadResult(FIX(cand)), previous: loadResult(FIX(prev)), ...extra });

const cli = (args, env = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

describe('compare', () => {
  test('passes when the candidate passes more cases and no trigger case is worse than no plugin', () => {
    const r = gate('candidate-better.json');
    assert.equal(r.verdict, 'pass', r.summary);
    assert.equal(r.passRate.candidate, 0.8);
    assert.equal(r.passRate.previous, 0.6);
    assert.match(r.summary, /^PASS bg-efficiency: candidate passed 4\/5 cases \(80%\), previous 3\/5 \(60%\)/);
  });

  test('fails when the candidate pass rate is below the previous version', () => {
    const r = gate('candidate-worse.json');
    assert.equal(r.verdict, 'fail');
    assert.ok(r.reasons.some((x) => /pass rate 40% is below the previous version's 60%/.test(x)), r.summary);
  });

  test('fails when a trigger case scores below no plugin, even with a better pass rate', () => {
    const r = gate('candidate-trigger-regress.json');
    assert.equal(r.passRate.candidate, 0.8);
    assert.equal(r.verdict, 'fail');
    assert.ok(r.reasons.some((x) => x.includes('trigger-eff-quiet') && x.includes('worse than no plugin')), r.summary);
  });

  test('a should-fire trigger case is compared with a no-plugin score of 0', () => {
    const row = gate('candidate-better.json').cases.find((c) => c.name === 'trigger-eff-fires');
    assert.equal(row.none, 0);
    assert.equal(row.trigger, true);
  });

  test('an equal pass rate passes', () => {
    assert.equal(gate('previous.json').verdict, 'pass');
  });

  test('a partial run is inconclusive and fails', () => {
    const r = gate('candidate-partial.json');
    assert.equal(r.verdict, 'fail');
    assert.ok(r.reasons.some((x) => /did not finish \(cost_ceiling\)/.test(x)));
  });

  test('cases missing from the previous run fail the gate instead of being skipped', () => {
    const prev = parseResult({ schemaVersion: 1, cases: [{ name: 'eff-a', aggregates: { score: 1 }, arms: { with: [], without: [] } }] }, 'prev');
    const r = compare({ skill: 's', candidate: loadResult(FIX('candidate-better.json')), previous: prev });
    assert.equal(r.verdict, 'fail');
    assert.ok(r.reasons.some((x) => /missing 4 case/.test(x)));
  });

  test('a usage-limit error in any run blocks the verdict', () => {
    const doc = JSON.parse(fs.readFileSync(FIX('candidate-better.json'), 'utf8'));
    doc.cases[0].arms.with[0].error = 'API Error: usage limit reached, resets 18:00';
    const r = compare({ skill: 's', candidate: parseResult(doc, 'c'), previous: loadResult(FIX('previous.json')) });
    assert.equal(r.verdict, 'fail');
    assert.ok(r.reasons.some((x) => /usage or rate limit/.test(x)));
  });

  test('the no-plugin score falls back to score minus delta when the baseline runs carry no score', () => {
    const doc = { schemaVersion: 1, cases: [{ name: 'trigger-x', aggregates: { score: 1, delta: 0.25 }, arms: { with: [{ error: null }] } }] };
    assert.equal(parseResult(doc).cases.get('trigger-x').without, 0.75);
  });

  test('--none supplies the baseline when given', () => {
    const none = parseResult({ schemaVersion: 1, cases: [{ name: 'trigger-eff-fires', aggregates: { score: 1 }, arms: { with: [] } }] }, 'none');
    const r = gate('candidate-better.json', 'previous.json', { none });
    assert.equal(r.cases.find((c) => c.name === 'trigger-eff-fires').none, 1);
    assert.equal(r.verdict, 'pass');
  });

  test('reports output tokens per case when results include usage, and says so when they do not', () => {
    const r = gate('candidate-better.json');
    assert.equal(r.tokens.candidatePerCase, 700);
    assert.equal(r.tokens.previousPerCase, 1060);
    assert.match(r.summary, /output tokens per case: candidate 700, previous 1,060 \(-34%\)/);
    const bare = parseResult({ schemaVersion: 1, cases: [{ name: 'a', aggregates: { score: 1 }, arms: { with: [{ score: 1 }] } }] });
    const r2 = compare({ skill: 's', candidate: bare, previous: bare });
    assert.equal(r2.tokens.candidatePerCase, null);
    assert.match(r2.summary, /output tokens: not in these results/);
  });

  test('reads several usage shapes and ignores runs without one', () => {
    assert.equal(runOutputTokens({ usage: { output_tokens: 5 } }), 5);
    assert.equal(runOutputTokens({ usage: { outputTokens: 6 } }), 6);
    assert.equal(runOutputTokens({ outputTokens: 7 }), 7);
    assert.equal(runOutputTokens({ score: 1 }), null);
  });

  test('a threshold below 1 counts partly passing cases', () => {
    const r = gate('candidate-better.json', 'previous.json', { threshold: 0.6 });
    assert.equal(r.passRate.candidate, 1);
  });

  test('rejects files that are not eval results', () => {
    assert.throws(() => parseResult({ hello: 1 }, 'x.json'), /not a claude plugin eval result/);
    assert.throws(() => parseResult({ schemaVersion: 2, cases: [] }, 'x.json'), /unsupported schemaVersion 2/);
  });
});

describe('command line', () => {
  test('exit 0 and a JSON report on pass', () => {
    const out = path.join(tmp(), 'gate.json');
    const r = cli(['--skill', 'bg-efficiency', '--candidate', FIX('candidate-better.json'), '--previous', FIX('previous.json'), '--out', out]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^PASS bg-efficiency/);
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(report.verdict, 'pass');
    assert.equal(report.cases.length, 5);
  });

  test('exit 1 on fail, with the reason in plain English', () => {
    const out = path.join(tmp(), 'gate.json');
    const r = cli(['--skill', 'bg-efficiency', '--candidate', FIX('candidate-worse.json'), '--previous', FIX('previous.json'), '--out', out]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL bg-efficiency[\s\S]*blocks: candidate pass rate 40% is below/);
  });

  test('exit 2 on bad usage', () => {
    assert.equal(cli(['--skill', 'x']).status, 2);
    assert.equal(cli(['--bogus']).status, 2);
  });

  test('exit 1 when a result file cannot be read', () => {
    const r = cli(['--skill', 'x', '--candidate', FIX('nope.json'), '--previous', FIX('previous.json'), '--out', path.join(tmp(), 'g.json')]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /cannot read result/);
  });
});

describe('live run support', () => {
  const makePlugin = (dir, { withEvals }) => {
    write(path.join(dir, '.claude-plugin', 'plugin.json'), '{"name":"demo","version":"1.0.0"}\n');
    write(path.join(dir, 'skills', 'bg-x', 'SKILL.md'), '---\nname: bg-x\ndescription: demo\n---\n');
    write(path.join(dir, 'skills', 'bg-y', 'SKILL.md'), '---\nname: bg-y\ndescription: demo\n---\n');
    if (withEvals) {
      write(path.join(dir, 'skills', 'bg-x', 'evals', 'case-a', 'case.yaml'), 'schema_version: "1.1"\nname: case-a\n');
      write(path.join(dir, 'skills', 'bg-x', 'evals', 'results', 'old', 'aggregate-result.json'), '{}');
      write(path.join(dir, 'skills', 'bg-y', 'evals', 'case-b', 'case.yaml'), 'schema_version: "1.1"\nname: case-b\n');
    }
    write(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    return dir;
  };

  test('stagePlugin moves one skill\'s cases to evals/ and leaves none under skills/', () => {
    const src = makePlugin(tmp(), { withEvals: true });
    const dest = path.join(tmp(), 'staged');
    stagePlugin({ sourceRoot: src, casesDir: path.join(src, 'skills', 'bg-x', 'evals'), dest });
    assert.ok(fs.existsSync(path.join(dest, 'evals', 'case-a', 'case.yaml')));
    assert.ok(!fs.existsSync(path.join(dest, 'evals', 'results')), 'old results are not copied');
    assert.ok(!fs.existsSync(path.join(dest, 'skills', 'bg-x', 'evals')));
    assert.ok(!fs.existsSync(path.join(dest, 'skills', 'bg-y', 'evals')));
    assert.ok(!fs.existsSync(path.join(dest, '.git')));
    assert.ok(fs.existsSync(path.join(dest, 'skills', 'bg-x', 'SKILL.md')));
  });

  test('evalArgs puts the target first and the tool list last', () => {
    const a = evalArgs({ target: 'T', jsonFile: 'r.json', outputDir: 'o', runs: 2 });
    assert.deepEqual(a.slice(0, 3), ['plugin', 'eval', 'T']);
    assert.deepEqual(a.slice(-3), ['--allow-tools', 'Write', 'Edit']);
    for (const f of ['--eval-dir', '--json', '--no-publish', '--trust-plugin', '--scaffold', '--runs']) assert.ok(a.includes(f), f);
    assert.ok(!evalArgs({ target: 'T', jsonFile: 'r', outputDir: 'o', scaffold: false }).includes('--scaffold'));
  });

  test('materialisePrevious unpacks a git ref', () => {
    const repo = tmp('sg-git-');
    write(path.join(repo, 'skills', 'bg-x', 'SKILL.md'), 'old body\n');
    const git = (...a) => spawnSync('git', ['-C', repo, '-c', 'user.name=t', '-c', `user.email=${['t', 'example.invalid'].join('@')}`, ...a], { encoding: 'utf8' });
    git('init', '-q');
    git('add', '.');
    assert.equal(git('commit', '-q', '-m', 'old').status, 0);
    write(path.join(repo, 'skills', 'bg-x', 'SKILL.md'), 'new body\n');
    const out = materialisePrevious({ previous: 'HEAD', repoRoot: repo, workDir: tmp() });
    assert.equal(fs.readFileSync(path.join(out, 'skills', 'bg-x', 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n'), 'old body\n');
    assert.throws(() => materialisePrevious({ previous: 'no-such-ref', repoRoot: repo, workDir: tmp() }), /neither a folder nor a git ref/);
  });

  test('--run stages both sides, runs each once and gates on the results', () => {
    const cand = makePlugin(tmp('sg-cand-'), { withEvals: true });
    const prev = makePlugin(tmp('sg-prev-'), { withEvals: false });
    const work = tmp('sg-work-');
    const log = path.join(work, 'calls.log');
    const env = {
      BGZFLOW_CLAUDE_BIN: FIX('fake-claude.mjs'), FAKE_CLAUDE_LOG: log,
      FAKE_CANDIDATE: FIX('candidate-better.json'), FAKE_PREVIOUS: FIX('previous.json'),
    };
    const r = cli(['--run', '--skill', 'bg-x', '--candidate', cand, '--previous', prev, '--work-dir', work, '--runs', '1'], env);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /PASS bg-x/);
    const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(calls.length, 2);
    assert.ok(path.basename(calls[0][2]).startsWith('candidate') && path.basename(calls[1][2]).startsWith('previous'));
    assert.ok(fs.existsSync(path.join(work, 'previous-src')) === false, 'a folder previous is used in place');
    assert.equal(JSON.parse(fs.readFileSync(path.join(work, 'bg-x-gate.json'), 'utf8')).verdict, 'pass');

    const bad = cli(['--run', '--skill', 'bg-x', '--candidate', cand, '--previous', prev, '--work-dir', tmp('sg-work-')],
      { ...env, FAKE_CANDIDATE: FIX('candidate-worse.json') });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /FAIL bg-x/);
  });

  test('--run reports a run that wrote no result', () => {
    const cand = makePlugin(tmp('sg-cand-'), { withEvals: true });
    const work = tmp('sg-work-');
    const r = cli(['--run', '--skill', 'bg-x', '--candidate', cand, '--previous', cand, '--work-dir', work],
      { BGZFLOW_CLAUDE_BIN: FIX('fake-claude.mjs'), FAKE_CLAUDE_LOG: path.join(work, 'l'), FAKE_CANDIDATE: FIX('missing.json'), FAKE_PREVIOUS: FIX('missing.json') });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /wrote no result|ENOENT/);
  });
});

describe('the shipped eval cases', () => {
  const skills = fs.readdirSync(path.join(ROOT, 'skills')).filter((s) => s.startsWith('bg-'));
  const casesOf = (skill) => {
    const dir = path.join(ROOT, 'skills', skill, 'evals');
    return fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((c) => fs.existsSync(path.join(dir, c, 'case.yaml'))).map((c) => ({
        dir: c, text: fs.readFileSync(path.join(dir, c, 'case.yaml'), 'utf8'),
      }))
      : [];
  };

  for (const skill of skills) {
    test(`${skill} has 2-9 behaviour cases and both kinds of trigger case`, () => {
      const cases = casesOf(skill);
      const trig = cases.filter((c) => c.dir.startsWith('trigger-'));
      const behaviour = cases.length - trig.length;
      assert.ok(behaviour >= 2 && behaviour <= 9, `${behaviour} behaviour cases`);
      assert.ok(trig.some((c) => /trigger-should-fire/.test(c.text)), 'a should-fire case');
      assert.ok(trig.some((c) => /trigger-should-not-fire/.test(c.text) && /max: 0/.test(c.text) && /arm: 'both'/.test(c.text)), 'a scored should-not-fire case');
      for (const c of cases) {
        assert.match(c.text, new RegExp(`^name: ${c.dir}$`, 'm'), `${c.dir}: name matches its folder`);
        assert.match(c.text, /^graders:\n {2}- name:/m, `${c.dir}: has graders`);
        assert.ok(c.text.includes(skill), `${c.dir}: checks ${skill}`);
      }
    });
  }

  test('bg-efficiency measures both efficiency and quality', () => {
    const cases = casesOf('bg-efficiency');
    assert.ok(cases.filter((c) => /tags: \[[^\]]*efficiency/.test(c.text)).length >= 5);
    assert.ok(cases.filter((c) => /tags: \[[^\]]*quality/.test(c.text)).length >= 3);
  });

  test('scaffold scripts are POSIX shell next to a case that names them', () => {
    for (const skill of skills) {
      for (const c of casesOf(skill).filter((x) => /scaffold_script/.test(x.text))) {
        const sh = fs.readFileSync(path.join(ROOT, 'skills', skill, 'evals', c.dir, 'scaffold.sh'), 'utf8');
        assert.match(sh, /^#!\/usr\/bin\/env bash\n/);
        assert.match(sh, /^set -eu$/m);
      }
    }
  });
});
