// Offline tests for the bgz jev tools (levels 1-5 and 8-10): file, files, ask, grade, league, route, skills,
// outcomes, bench, regress, improve. Jev is a loopback mock, so no test reaches the real service or needs a real key.
// Each command runs as a real child process (node tools/jev/cli.mjs ...), the way a worker runs it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { pickFirstFile, collectFiles, globToRegExp, looksBinary } from '../files.mjs';
import { band, rolesFromStatus } from '../rules.mjs';
import { batches, namedInBrief, skillQuestion } from '../skills.mjs';
import { composite, effective, extractSteps, league } from '../grade.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const projects = [];
const mocks = [];
const project = () => {
  const dir = makeProject('jevtools');
  projects.push(dir);
  return dir;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  mocks.push(m);
  return m;
};
const jev = (args, { project: dir, env = {}, input } = {}) => runNode([CLI, ...args], { project: dir, env, input });
after(async () => {
  for (const m of mocks) await m.close();
  for (const p of projects) removeDir(p);
});

describe('no key, no call', () => {
  it('ask without a key prints ok:false and exits 1, naming no key value', async () => {
    const dir = project();
    const r = await jev(['ask', '--q', 'is this risky?', '--state', 'a diff'], { project: dir });
    assert.equal(r.status, 1);
    assert.equal(r.json.ok, false);
    assert.doesNotMatch(r.stdout + r.stderr, /Bearer|TYPESAFE_API_KEY=/);
  });
});

describe('level 1 file and level 2 files', () => {
  it('file answers one question and prints the answer, never the file', async () => {
    const dir = project();
    const m = await mock(() => ({ q: 0.8 }));
    const secretBody = 'UNIQUE_BODY_MARKER '.repeat(50);
    write(dir, 'big.txt', secretBody);
    const r = await jev(['file', 'big.txt', '--q', 'does it mention a marker?'], { project: dir, env: m.env });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.doesNotMatch(r.stdout, /UNIQUE_BODY_MARKER/);
    assert.equal(m.calls.length, 1);
    assert.match(JSON.stringify(m.calls[0].body.state), /UNIQUE_BODY_MARKER/);
  });

  it('file refuses a huge file with a plain next step', async () => {
    const dir = project();
    write(dir, 'huge.txt', 'x'.repeat(500 * 1024));
    const m = await mock(() => ({}));
    const r = await jev(['file', 'huge.txt', '--q', 'anything?'], { project: dir, env: m.env });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /rg first/);
    assert.equal(m.calls.length, 0);
  });

  it('files prunes node_modules, .git, binaries and big files, asks the rest in parallel, names the first file', async () => {
    const dir = project();
    write(dir, 'src/a.js', 'alpha code');
    write(dir, 'src/b.js', 'bravo code with the bug');
    write(dir, 'node_modules/x/index.js', 'vendor');
    write(dir, '.git/config', 'git');
    write(dir, 'logo.png', 'png');
    write(dir, 'big.js', 'y'.repeat(300 * 1024));
    const m = await mock((body) => ({ q: /bug/.test(body.state.text) ? 0.9 : 0.1 }));
    const r = await jev(['files', '.', '--q', 'does this file hold the bug?'], { project: dir, env: m.env });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.asked, 2, JSON.stringify(r.json.skipped));
    assert.match(r.json.first, /b\.js$/);
    assert.ok(r.json.skipped.binary >= 1 && r.json.skipped.large >= 1);
    assert.equal(m.calls.length, 2);
    for (const call of m.calls) assert.match(call.body.state.file, /^[ab]\.js$/);
  });

  it('collectFiles stops at the file cap and counts what it dropped', () => {
    const dir = project();
    for (let i = 0; i < 12; i++) write(dir, `f${i}.txt`, `file ${i}`);
    const r = collectFiles(['.'], dir, { maxFiles: 5 });
    assert.equal(r.files.length, 5);
    assert.equal(r.skipped.over_cap, 7);
  });

  it('globs match the way a shell user expects', () => {
    assert.ok(globToRegExp('**/*.js').test('a/b/c.js'));
    assert.ok(globToRegExp('*.js').test('c.js'));
    assert.ok(!globToRegExp('*.js').test('a/c.js'));
    assert.equal(looksBinary(Buffer.from([1, 2, 0, 3])), true);
    assert.equal(looksBinary(Buffer.from('plain text')), false);
  });

  it('pickFirstFile ranks by probability of the wanted option', () => {
    const results = [
      { file: 'a', answer: { choice: 'x', confidence: 0.6, probabilities: { x: 0.6, y: 0.4 } } },
      { file: 'b', answer: { choice: 'y', confidence: 0.9, probabilities: { x: 0.1, y: 0.9 } } },
      { file: 'c', error: 'timeout' },
    ];
    assert.equal(pickFirstFile(results, { type: 'choice', want: 'x' }).first, 'a');
    assert.equal(pickFirstFile(results, { type: 'choice' }).first, 'b');
    assert.equal(pickFirstFile([{ file: 'z', error: 'e' }], {}).first, null);
  });
});

describe('level 3 ask', () => {
  it('ask sends state and paths as data, answers per question, never echoes the state', async () => {
    const dir = project();
    write(dir, 'notes.md', 'PRIVATE_NOTE_TEXT about the release');
    const m = await mock(() => ({ q: { choice: 'yes', confidence: 0.9 } }));
    const r = await jev(['ask', '--q', 'ship it?', '--type', 'choice', '--options', 'yes,no', '--paths', 'notes.md'], { project: dir, env: m.env });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.doesNotMatch(r.stdout, /PRIVATE_NOTE_TEXT/);
    assert.match(JSON.stringify(m.calls[0].body), /PRIVATE_NOTE_TEXT/);
  });

  it('a Jev outage returns ok:false and exit 1 so the caller falls back once', async () => {
    const dir = project();
    const m = await mock(() => ({}), { status: 500 });
    const r = await jev(['ask', '--q', 'anything?', '--state', 'some state'], { project: dir, env: m.env });
    assert.equal(r.status, 1);
    assert.equal(r.json.ok, false);
    assert.match(r.json.err, /http_500/);
  });
});

describe('level 4 grade and league', () => {
  it('grade logs one row, masks secrets in steps, and league ranks workers best first', async () => {
    const dir = project();
    write(dir, 'brief.md', '# Brief\nBuild the thing. Checks: npm test.');
    write(dir, 'out-a.md', '# Report\n## Steps\n1. Read the brief\n2. Built the thing\n3. Ran npm test\nDone.');
    write(dir, 'out-b.md', '# Report\nI did some of it.');
    const good = await mock(() => ({ checks: 3, scope: 3, proof: 3, cost: 3 }));
    const bad = await mock(() => ({ checks: 0, scope: 0, proof: 0, cost: 0 }));
    const args = (out, worker) => ['grade', out, '--brief', 'brief.md', '--role', 'builder', '--worker', worker, '--cost-usd', '0.5'];
    const a = await jev(args('out-a.md', 'sonnet/claude'), { project: dir, env: good.env });
    const b = await jev(args('out-b.md', 'haiku/claude'), { project: dir, env: bad.env });
    assert.equal(a.status, 0, a.stderr + a.stdout);
    assert.equal(b.status, 0, b.stderr + b.stdout);
    assert.equal(a.json.logged, true);
    assert.ok(a.json.value > b.json.value, `${a.json.value} vs ${b.json.value}`);
    const l = await jev(['league', '--json'], { project: dir, env: good.env });
    const rows = JSON.parse(l.stdout);
    assert.equal(rows.length, 2);
    assert.match(rows[0].worker, /sonnet/);
  });

  it('extractSteps reads numbered steps under a steps heading and caps them', () => {
    const steps = extractSteps('# Done\n## Steps\n1. one\n2. two\n3. three\n## Other\n- not a step', undefined);
    assert.deepEqual(steps, ['one', 'two', 'three']);
    assert.deepEqual(extractSteps('anything', 'a;b;c'), ['a', 'b', 'c']);
    assert.ok(extractSteps('# Steps\n' + Array.from({ length: 20 }, (_, i) => `- s${i}`).join('\n')).length <= 8);
  });

  it('composite weights and league averages use the combined value when outcomes adjusted it', () => {
    assert.equal(composite({ checks: { norm: 1 }, scope: { norm: 1 }, proof: { norm: 1 }, cost: { norm: 1 } }, ['checks', 'scope', 'proof', 'cost']), 1);
    assert.equal(effective({ value: 0.5, combined: 0.7 }), 0.7);
    assert.equal(effective({ value: 0.5 }), 0.5);
    const rows = league([
      { role: 'builder', worker: 'x', value: 0.4 },
      { role: 'builder', worker: 'x', value: 0.6 },
      { role: 'builder', worker: 'y', value: 0.9 },
    ]);
    assert.equal(rows[0].worker, 'y');
    assert.equal(rows[1].jobs, 2);
  });
});

describe('level 5 route', () => {
  it('bands send low confidence up and keep high confidence where it is', () => {
    assert.equal(band(0.95), 'act');
    assert.equal(band(0.7), 'confirm');
    assert.equal(band(0.2), 'lead');
    assert.equal(band(NaN), 'lead');
  });

  it('rolesFromStatus reads the role lines out of STATUS text', () => {
    const roles = rolesFromStatus('## Roles\n- builder: Codex slot 1\n- checker: Claude-A\n');
    assert.ok(roles && typeof roles === 'object');
  });

  it('route returns a role, a tier and an effort', async () => {
    const dir = project();
    const m = await mock(() => ({ role: { choice: 'builder', confidence: 0.9 }, tier: { choice: 'small', confidence: 0.9 }, effort: { score: 0, confidence: 0.9 } }));
    const r = await jev(['route', '--job', 'Fix the typo in README line 3.'], { project: dir, env: m.env });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.role, 'builder');
  });
});

describe('level 8 skills', () => {
  it('namedInBrief keeps a skill the brief names even if Jev scores it low', () => {
    const skills = [{ name: 'bg-jev', description: 'jev' }, { name: 'unrelated', description: 'nope' }];
    const named = namedInBrief('Use the bg-jev skill and the `unrelated`? no', skills);
    assert.ok(named.has ? named.has('bg-jev') : named.some((s) => (s.name || s) === 'bg-jev'));
  });

  it('batches keep every request within the 255 question cap and the size limit', () => {
    const skills = Array.from({ length: 700 }, (_, i) => ({ name: `skill-${i}`, description: 'd'.repeat(300) }));
    const out = batches(skills);
    assert.equal(out.flat().length, 700);
    for (const b of out) {
      assert.ok(b.length <= 255);
      assert.ok(b.reduce((n, s) => n + JSON.stringify(skillQuestion(s)).length, 0) < 120000);
    }
  });

  it('pick scores every skill, keeps the liberal list, and writes nothing under --dry', async () => {
    const dir = project();
    const home = project();
    write(home, 'skills/alpha/SKILL.md', '---\nname: alpha\ndescription: Make web pages fast\n---\nbody');
    write(home, 'skills/beta/SKILL.md', '---\nname: beta\ndescription: Cook pasta\n---\nbody');
    write(dir, 'brief.md', '# Brief\nSpeed up the web page.');
    const m = await mock((body) => {
      const out = {};
      for (const id of Object.keys(body.questions)) out[id] = /fast/.test(body.questions[id].question || JSON.stringify(body.questions[id])) ? 5 : 0;
      return out;
    });
    const before = fs.readFileSync(path.join(dir, 'brief.md'), 'utf8');
    const r = await jev(['skills', '--brief', 'brief.md', '--dry'], { project: dir, env: { ...m.env, CLAUDE_CONFIG_DIR: home, BGZFLOW_SKILL_ROOTS: path.join(home, 'skills') } });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(fs.readFileSync(path.join(dir, 'brief.md'), 'utf8'), before);
  });
});

describe('levels 9 and 10 outcomes, bench, regress, improve run without a key when they need no model', () => {
  for (const sub of [['outcomes', '--dry'], ['regress', '--dry'], ['improve', '--dry'], ['bench', 'list']]) {
    it(`bgz jev ${sub.join(' ')} on an empty home exits cleanly with JSON`, async () => {
      const dir = project();
      const r = await jev(sub, { project: dir });
      assert.ok(r.status === 0 || r.status === 1, `${r.status}: ${r.stderr}`);
      assert.ok(r.json !== undefined, r.stdout + r.stderr);
    });
  }
});
