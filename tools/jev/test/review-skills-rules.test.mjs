// Offline tests for tools/jev/rules.mjs (bands, diff-risk weights, routing), skills.mjs (liberal skill picking) and
// review.mjs (arch and unasked on a git diff). Jev is a loopback mock; BGZFLOW_HOME is a scratch folder; git fixtures live
// under <repo>/.tmp/. Nothing here reaches the real Jev or touches ~/.bgzflow.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { AXES, DEFAULT_ROLES, DIFF_RISK, EFFORT_LEVELS, TIERS, band, compositeScore, rolesFromStatus, route, statusPath } from '../rules.mjs';
import { KEEP_AT, LEVELS, MAX_PER_CALL, STAGE_SKILLS, batches, listSkills, namedInBrief, pickSkills, skillQuestion, skillsSection, writeSection } from '../skills.mjs';
import { ARCH_QUESTIONS, FLAG_AT, TRACEABLE_BELOW, UNASKED_HIT_AT, UNASKED_QUESTIONS, arch, changedUnits, checkUnasked, groupUnits, parseHunks, readAsks, unasked } from '../review.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const dirs = [];
const mocks = [];
const scratch = () => {
  const d = makeProject('jevrsr');
  dirs.push(d);
  return d;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  mocks.push(m);
  return m;
};
// BGZFLOW_HOME is outside any git fixture, so the ledger never shows up as an "untracked file" in a diff.
const homeEnv = (d, m) => ({ ...(m ? m.env : {}), BGZFLOW_HOME: path.join(d, '.home'), FAST_JEV_KEY_FILE: path.join(d, 'no-such-key-file') });
const cli = (args, d, m, extra = {}) => runNode([CLI, ...args], { project: d, env: { ...homeEnv(d, m), ...extra } });
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});

const git = (cwd, args) => {
  const r = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=noreply@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
};
const lines = (n, tag = 'l') => `${Array.from({ length: n }, (_, i) => `${tag}${i + 1}`).join('\n')}\n`;

// A repo with a 30-line a.js, a 5-line b.js, DECISIONS.md, a lockfile and a binary-looking png, all committed.
function makeRepo() {
  const d = scratch();
  const repo = path.join(d, 'repo');
  fs.mkdirSync(repo);
  git(repo, ['init', '-q']);
  write(repo, 'a.js', lines(30));
  write(repo, 'b.js', lines(5, 'b'));
  write(repo, 'DECISIONS.md', '# Owner asks\nBuild a reminder button.\n');
  write(repo, 'package-lock.json', '{}\n');
  fs.writeFileSync(path.join(repo, 'image.png'), Buffer.from([0x89, 0x50, 0, 0, 1]));
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '-m', 'base']);
  return { d, repo };
}
const edit = (repo, file, from, to) => fs.writeFileSync(path.join(repo, file), fs.readFileSync(path.join(repo, file), 'utf8').replace(from, to));

// ---------------------------------------------------------------------------------------------------------- rules.mjs
describe('band(): the confidence axes', () => {
  it('has its two thresholds in code: 0.5 and 0.9', () => {
    assert.deepEqual(AXES, { escalate: 0.5, act: 0.9 });
  });

  it('below 0.5 is lead, 0.5 up to (not including) 0.9 is confirm, 0.9 and above is act', () => {
    assert.equal(band(0), 'lead');
    assert.equal(band(0.49), 'lead');
    assert.equal(band(0.4999999), 'lead');
    assert.equal(band(0.5), 'confirm', '0.5 is the first value that is no longer a lead');
    assert.equal(band(0.75), 'confirm');
    assert.equal(band(0.8999999), 'confirm');
    assert.equal(band(0.9), 'act', '0.9 is the first value that may act');
    assert.equal(band(0.99), 'act');
    assert.equal(band(1), 'act');
  });

  it('a missing or broken confidence is never trusted: it is a lead', () => {
    for (const bad of [NaN, undefined, null, Infinity, -Infinity, 'x']) assert.equal(band(bad), 'lead', String(bad));
  });
});

describe('diff-risk: weights are in code, the server only answers the five questions', () => {
  it('weights are 0.35 / 0.25 / 0.2 / 0.1 / 0.1, sum to 1, and match the five described questions', () => {
    assert.deepEqual(DIFF_RISK.weights, { money_data: 0.35, security: 0.25, customer_stop: 0.2, scope: 0.1, proof: 0.1 });
    assert.equal(Math.round(Object.values(DIFF_RISK.weights).reduce((a, b) => a + b, 0) * 1000) / 1000, 1);
    assert.deepEqual(Object.keys(DIFF_RISK.questions), Object.keys(DIFF_RISK.weights));
    for (const q of Object.values(DIFF_RISK.questions)) {
      assert.equal(q.type, 'score');
      assert.equal(q.criteria.length, 5, 'five described situations, lowest first');
    }
  });

  const run = async (answers) => {
    const d = scratch();
    const m = await mock(() => answers);
    const r = await compositeScore({ preset: DIFF_RISK, text: 'a diff', env: homeEnv(d, m), timeoutMs: 3000, caller: 'test-diff-risk' });
    return { r, m };
  };
  const all = (n, conf = 0.95) => Object.fromEntries(Object.keys(DIFF_RISK.weights).map((k) => [k, { score: n, confidence: conf }]));

  it('all top scores give 1, all bottom scores give 0', async () => {
    assert.equal((await run(all(4))).r.value, 1);
    assert.equal((await run(all(0))).r.value, 0);
  });

  it('applies the code weights to the normalised scores: money 4, customer_stop 2, proof 4, rest 0 -> 0.55', async () => {
    const { r } = await run({ ...all(0), money_data: { score: 4, confidence: 0.95 }, customer_stop: { score: 2, confidence: 0.95 }, proof: { score: 4, confidence: 0.95 } });
    assert.equal(r.ok, true);
    assert.equal(r.value, 0.55);
    assert.deepEqual(r.parts.money_data, { score: 4, of: 4, norm: 1, confidence: 0.95 });
    assert.equal(r.parts.customer_stop.norm, 0.5);
  });

  it('one dimension at the top alone is worth exactly its weight', async () => {
    assert.equal((await run({ ...all(0), money_data: { score: 4, confidence: 0.95 } })).r.value, 0.35);
    assert.equal((await run({ ...all(0), security: { score: 4, confidence: 0.95 } })).r.value, 0.25);
    assert.equal((await run({ ...all(0), scope: { score: 4, confidence: 0.95 } })).r.value, 0.1);
  });

  it('confidence is the lowest of the five and decides the band', async () => {
    const { r } = await run({ ...all(2), scope: { score: 2, confidence: 0.45 } });
    assert.equal(r.confidence, 0.45);
    assert.equal(r.band, 'lead');
    assert.equal((await run(all(2, 0.93))).r.band, 'act');
    assert.equal((await run(all(2, 0.7))).r.band, 'confirm');
  });

  it('sends five score questions and the text, but never the weights', async () => {
    const { m } = await run(all(1));
    assert.equal(m.calls.length, 1);
    assert.deepEqual(Object.keys(m.calls[0].body.questions), Object.keys(DIFF_RISK.weights));
    assert.equal(m.calls[0].body.state.text, 'a diff');
    assert.ok(!/weight/i.test(JSON.stringify(m.calls[0].body)), 'the weights stay in code');
  });

  it('a failed Jev call is { ok:false }, never a score', async () => {
    const d = scratch();
    const m = await mock(() => ({}), { status: 500 });
    const r = await compositeScore({ preset: DIFF_RISK, text: 'x', env: homeEnv(d, m), timeoutMs: 3000, caller: 'test' });
    assert.equal(r.ok, false);
    assert.ok(r.err);
    assert.equal(r.value, undefined);
  });

  it('bgz jev score --preset diff-risk prints the value, the parts and the note; --diff reads git diff', async () => {
    const { d, repo } = makeRepo();
    edit(repo, 'b.js', 'b2', 'b2 DIFF_MARKER');
    const m = await mock(() => all(2));
    const r = await runNode([CLI, 'score', '--preset', 'diff-risk', '--diff', 'HEAD'], { cwd: repo, project: d, env: homeEnv(d, m) });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.preset, 'diff-risk');
    assert.equal(r.json.value, 0.5);
    assert.match(r.json.note, /0 \(safe\) to 1 \(risky\)/);
    assert.match(m.calls[0].body.state.text, /DIFF_MARKER/, 'the git diff is the evidence');
  });

  it('rejects an unknown preset, a missing diff/state, and a bad ref, without any model call', async () => {
    const { d, repo } = makeRepo();
    const m = await mock(() => all(2));
    const a = await cli(['score', '--preset', 'nope', '--state', 'x'], d, m);
    assert.equal(a.status, 2);
    assert.match(a.stderr, /unknown --preset/);
    const b = await cli(['score', '--preset', 'diff-risk'], d, m);
    assert.equal(b.status, 2);
    assert.match(b.stderr, /needs --state/);
    const c = await runNode([CLI, 'score', '--preset', 'diff-risk', '--diff', 'no-such-ref'], { cwd: repo, project: d, env: homeEnv(d, m) });
    assert.equal(c.status, 2);
    assert.match(c.stderr, /git diff no-such-ref failed/);
    assert.equal(m.calls.length, 0);
  });
});

describe('route(): a role from the STATUS section text', () => {
  const STATUS = [
    '# STATUS',
    '',
    '## 1. Roles',
    '',
    '| Role | Who |',
    '|---|---|',
    '| **Lead** (plans) | claude |',
    '| `Builder` | codex |',
    '| Independent checker | grok |',
    '',
    '## 2. Limits',
    '',
    '| Role | Limit |',
    '| Not A Role | 2 |',
  ].join('\n');

  it('takes the first column of the section 1 table: bold, backticks and (notes) removed, lowercased; other sections ignored', () => {
    const roles = rolesFromStatus(STATUS);
    assert.deepEqual(Object.keys(roles), ['lead', 'builder', 'independent checker']);
    assert.equal(roles.builder, DEFAULT_ROLES.builder, 'a known role keeps its plain description');
    assert.equal(roles.lead, 'a role in STATUS section 1');
  });

  it('falls back to a copy of the default roles when STATUS is missing or names fewer than two roles', () => {
    for (const text of [undefined, '', 'no sections here', '## 1. Roles\n| Role | x |\n|---|---|\n| only | one |\n']) {
      const roles = rolesFromStatus(text);
      assert.deepEqual(roles, DEFAULT_ROLES);
      assert.notEqual(roles, DEFAULT_ROLES, 'a copy, so a caller cannot change the defaults');
    }
  });

  it('statusPath prefers BGZFLOW_STATUS', () => {
    assert.equal(statusPath({ BGZFLOW_STATUS: 'x/STATUS.md' }), 'x/STATUS.md');
    assert.match(statusPath({}), /STATUS\.md$/);
  });

  it('asks a role choice built from those roles, a tier choice and a 3-level effort score, then maps the answers', async () => {
    const d = scratch();
    const roles = rolesFromStatus(STATUS);
    const m = await mock(() => ({ role: { choice: 'builder', confidence: 0.93 }, tier: { choice: 'standard', confidence: 0.97 }, effort: { score: 1, confidence: 0.91 } }));
    const r = await route({ job: 'Add a button to the settings page', roles, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, true);
    assert.equal(r.role, 'builder');
    assert.equal(r.tier, 'standard');
    assert.equal(r.effort, 'medium');
    assert.equal(r.effort_score, 1);
    assert.equal(r.confidence, 0.91, 'the lowest of role, tier and effort');
    assert.equal(r.band, 'act');
    assert.match(r.next, /STATUS section 2/, 'code still applies the allowance and job limits');

    const sent = m.calls[0].body;
    assert.deepEqual(Object.keys(sent.questions), ['role', 'tier', 'effort']);
    assert.deepEqual(Object.keys(sent.questions.role.criteria), ['lead', 'builder', 'independent checker'], 'the role options are the STATUS roles');
    assert.deepEqual(Object.keys(sent.questions.tier.criteria), Object.keys(TIERS));
    assert.equal(sent.questions.effort.criteria.length, EFFORT_LEVELS.length);
    assert.equal(sent.state.job, 'Add a button to the settings page');
  });

  it('maps the effort score to low / medium / high by rounding; an out-of-range or fractional-beyond-scale score is rejected, never turned into an effort', async () => {
    const d = scratch();
    let effort = 0;
    const m = await mock(() => ({ role: { choice: 'builder', confidence: 0.95 }, tier: { choice: 'small', confidence: 0.95 }, effort: { score: effort, confidence: 0.95 } }));
    const seen = [];
    for (const e of [0, 0.49, 0.5, 1.49, 1.5, 2]) {
      effort = e;
      seen.push((await route({ job: 'j', roles: DEFAULT_ROLES, env: homeEnv(d, m), timeoutMs: 3000 })).effort);
    }
    assert.deepEqual(seen, ['low', 'low', 'medium', 'medium', 'high', 'high']);
    for (const bad of [5, -3, 2.4]) {
      effort = bad;
      const r = await route({ job: 'j', roles: DEFAULT_ROLES, env: homeEnv(d, m), timeoutMs: 3000 });
      assert.equal(r.ok, false, `score ${bad}`);
      assert.equal(r.effort, undefined);
    }
  });

  it('a shaky role pick makes the whole route a lead', async () => {
    const d = scratch();
    const m = await mock(() => ({ role: { choice: 'builder', confidence: 0.4 }, tier: { choice: 'strong', confidence: 0.99 }, effort: { score: 2, confidence: 0.99 } }));
    const r = await route({ job: 'j', roles: DEFAULT_ROLES, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.confidence, 0.4);
    assert.equal(r.band, 'lead');
  });

  it('bgz jev route reads --status, sends its roles, and exits 1 with { ok:false } when Jev is down', async () => {
    const d = scratch();
    const status = write(d, 'STATUS.md', STATUS);
    const job = write(d, 'job.md', 'Fix the failing checkout test');
    const m = await mock(() => ({ role: { choice: 'independent checker', confidence: 0.92 }, tier: { choice: 'standard', confidence: 0.92 }, effort: { score: 1, confidence: 0.92 } }));
    const ok = await cli(['route', '--job', `@${job}`, '--status', status], d, m);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.json.role, 'independent checker');
    assert.deepEqual(Object.keys(m.calls[0].body.questions.role.criteria), ['lead', 'builder', 'independent checker']);
    assert.equal(m.calls[0].body.state.job, 'Fix the failing checkout test');

    const down = await mock(() => ({}), { status: 500 });
    const bad = await cli(['route', '--job', 'x', '--status', status], d, down);
    assert.equal(bad.status, 1);
    assert.equal(bad.json.ok, false);
  });

  it('route without --job is a usage error (exit 2) and makes no call', async () => {
    const d = scratch();
    const m = await mock(() => ({}));
    const r = await cli(['route'], d, m);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /usage: bgz jev route/);
    assert.equal(m.calls.length, 0);
  });
});

// --------------------------------------------------------------------------------------------------------- skills.mjs
describe('skills: the liberal bar', () => {
  const mk = (name, description = 'does a plausible thing') => ({ name, description, source: 'folder', file: '' });
  const nameOf = (q) => /^Skill "([^"]+)"/.exec(q.instructions)[1];
  // reply by skill name: { name: score on the 0..4 scale }; every other skill scores 0
  const byName = (scores) => (body) => Object.fromEntries(Object.entries(body.questions).map(([id, q]) => [id, { score: scores[nameOf(q)] ?? 0, confidence: 0.95 }]));

  it('keeps anything normalised at 0.35 or higher ("could plausibly help" is 0.5) and drops the rest', async () => {
    assert.equal(KEEP_AT, 0.35);
    assert.equal(LEVELS.length, 5);
    const d = scratch();
    const skills = ['edge', 'below', 'plausible', 'clearly', 'remote', 'useless'].map((n) => mk(`sk-${n}`));
    const m = await mock(byName({ 'sk-edge': 1.4, 'sk-below': 1.39, 'sk-plausible': 2, 'sk-clearly': 3, 'sk-remote': 1, 'sk-useless': 0 }));
    const r = await pickSkills({ brief: 'Build a thing.', stage: 'build', skills, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.deepEqual(r.skills.map((s) => s.name), ['sk-clearly', 'sk-plausible', 'sk-edge'], 'best first');
    assert.deepEqual(r.skills.map((s) => s.score), [0.75, 0.5, 0.35]);
    assert.ok(r.skills.every((s) => s.why === 'rated plausible or better'));
    assert.equal(r.considered, 6);
    assert.equal(r.scored, 6);
    assert.deepEqual(r.gaps, []);
  });

  it('one request carries one score question per skill, each with the five levels, plus the brief', async () => {
    const d = scratch();
    const skills = [mk('sk-one', 'First thing'), mk('sk-two', 'Second thing')];
    const m = await mock(byName({}));
    await pickSkills({ brief: 'BRIEF_MARKER do it', stage: 'build', skills, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(m.calls.length, 1);
    const body = m.calls[0].body;
    assert.match(body.state.brief, /BRIEF_MARKER/);
    assert.deepEqual(Object.keys(body.questions), ['s0', 's1']);
    assert.deepEqual(body.questions.s0, skillQuestion(skills[0]));
    assert.deepEqual(body.questions.s0.criteria, LEVELS);
    assert.match(body.questions.s1.instructions, /Skill "sk-two": Second thing/);
  });

  it('always keeps a skill the brief names (whole word, with or without the plugin prefix), even at score 0', async () => {
    const d = scratch();
    const skills = [mk('zeta-tool'), mk('plug:omega-skill'), mk('zeta-tool-extra'), mk('abc'), mk('other-thing')];
    const brief = 'Please use zeta-tool and the omega-skill, and abc too.';
    const named = namedInBrief(brief, skills);
    assert.deepEqual([...named].sort(), ['plug:omega-skill', 'zeta-tool']);
    assert.ok(!named.has('abc'), 'names under 4 characters are too likely to be ordinary words');
    assert.ok(!named.has('zeta-tool-extra'), '"zeta-tool" followed by more of a name is a different name');
    assert.deepEqual([...namedInBrief('only zeta-tool-extra here', skills)], ['zeta-tool-extra']);

    const m = await mock(byName({}));
    const r = await pickSkills({ brief, stage: 'build', skills, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.deepEqual(r.skills.map((s) => s.name).sort(), ['plug:omega-skill', 'zeta-tool']);
    assert.ok(r.skills.every((s) => s.why === 'named in the brief' && s.score === 0));
  });

  it('always keeps the BG skills the stage needs, only when installed, and not those of other stages', async () => {
    const d = scratch();
    const skills = [mk('bgzflow:bg-check-it-before-release'), mk('bg-jev'), mk('bg-efficiency'), mk('bg-build-with-me'), mk('unrelated-skill')];
    const m = await mock(byName({}));
    const check = await pickSkills({ brief: 'Check it.', stage: 'check', skills, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.deepEqual(check.skills.map((s) => s.name).sort(), ['bg-efficiency', 'bg-jev', 'bgzflow:bg-check-it-before-release']);
    assert.ok(check.skills.every((s) => s.why === 'needed for check'));
    assert.deepEqual(STAGE_SKILLS.check.slice().sort(), ['bg-check-it-before-release', 'bg-efficiency', 'bg-jev']);

    const ship = await pickSkills({ brief: 'Ship it.', stage: 'ship', skills: [mk('bg-ship-and-recover'), mk('bg-build-with-me')], env: homeEnv(d, m), timeoutMs: 3000 });
    assert.deepEqual(ship.skills.map((s) => s.name), ['bg-ship-and-recover'], 'a build skill is not forced onto a ship job');
    const none = await pickSkills({ brief: 'Build.', stage: 'build', skills: [mk('unrelated-skill')], env: homeEnv(d, m), timeoutMs: 3000 });
    assert.deepEqual(none.skills, [], 'a stage skill that is not installed is not invented');
  });

  it('a failed batch is a gap, not a clean pass: only forced skills survive, with score null', async () => {
    const d = scratch();
    const m = await mock(() => ({}), { status: 500 });
    const skills = [mk('forced-one'), mk('bg-jev'), mk('plain-skill')];
    const r = await pickSkills({ brief: 'Use forced-one.', stage: 'build', skills, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.scored, 0);
    assert.equal(r.gaps.length, 1);
    assert.deepEqual(r.skills.map((s) => [s.name, s.score]).sort(), [['bg-jev', null], ['forced-one', null]]);
    assert.equal(skillsSection(r.skills).includes('(null)'), false, 'an unknown score is left out, not printed as null');
  });

  it('splits more than 255 skills into several requests, each within the question and size limits', async () => {
    assert.equal(MAX_PER_CALL, 255);
    const skills = Array.from({ length: 600 }, (_, i) => mk(`bulk-skill-${String(i).padStart(3, '0')}`, `Description number ${i} `.padEnd(220, 'x')));
    const groups = batches(skills);
    assert.ok(groups.length >= 3, `600 skills need at least 3 requests, got ${groups.length}`);
    assert.deepEqual(groups.flat().map((s) => s.name), skills.map((s) => s.name), 'every skill exactly once, in order');
    for (const g of groups) {
      assert.ok(g.length <= MAX_PER_CALL, `a batch of ${g.length} is over ${MAX_PER_CALL}`);
      assert.ok(g.reduce((n, s) => n + JSON.stringify(skillQuestion(s)).length + 12, 0) <= 60000, 'a batch stays under the request size budget');
    }

    const d = scratch();
    const m = await mock(byName({ 'bulk-skill-000': 3, 'bulk-skill-599': 4 }));
    const r = await pickSkills({ brief: 'Do the thing.', stage: 'build', skills, env: homeEnv(d, m), timeoutMs: 20000 });
    assert.equal(m.calls.length, groups.length, 'one request per batch');
    assert.equal(m.calls.reduce((n, c) => n + Object.keys(c.body.questions).length, 0), 600);
    for (const c of m.calls) assert.ok(Object.keys(c.body.questions).length <= 255);
    assert.equal(r.considered, 600);
    assert.equal(r.scored, 600);
    assert.deepEqual(r.skills.map((s) => s.name), ['bulk-skill-599', 'bulk-skill-000'], 'a high score found in the last batch is still kept');
  });
});

describe('skills: the "Skills to load" section', () => {
  it('lists each skill with its score; a forced reason follows a colon; a plain keep shows only the score', () => {
    const text = skillsSection([
      { name: 'alpha', score: 0.75, why: 'rated plausible or better' },
      { name: 'bg-jev', score: 0, why: 'needed for build' },
      { name: 'beta', score: null, why: 'named in the brief' },
    ]);
    assert.equal(text.split('\n')[0], '## Skills to load');
    assert.deepEqual(text.split('\n').filter((l) => l.startsWith('- ')), ['- alpha (0.75)', '- bg-jev (0): needed for build', '- beta: named in the brief']);
  });

  it('writeSection appends a missing section, replaces an existing one in place, and leaves the rest of the brief alone', () => {
    const d = scratch();
    const file = write(d, 'brief.md', '# Brief\n\nBuild it.\n\n## Checks\n\nnpm test\n');
    writeSection(file, skillsSection([{ name: 'one', score: 0.5, why: 'rated plausible or better' }]));
    let text = fs.readFileSync(file, 'utf8');
    assert.ok(text.startsWith('# Brief\n\nBuild it.\n\n## Checks\n\nnpm test\n'));
    assert.match(text, /\n## Skills to load\n[\s\S]*- one \(0\.5\)\n$/);

    fs.writeFileSync(file, text.replace('## Skills to load', '## Skills to load').concat('\n## Notes\n\nkeep me\n'));
    writeSection(file, skillsSection([{ name: 'two', score: 0.9, why: 'rated plausible or better' }]));
    text = fs.readFileSync(file, 'utf8');
    assert.equal(text.match(/## Skills to load/g).length, 1, 'replaced, not duplicated');
    assert.ok(text.includes('- two (0.9)'));
    assert.ok(!text.includes('- one (0.5)'));
    assert.ok(text.includes('## Checks\n\nnpm test'));
    assert.ok(text.includes('## Notes\n\nkeep me'), 'the section after it survives');
  });

  it('listSkills reads name + description, skips folders without a description, and the first copy of a name wins', () => {
    const d = scratch();
    const a = path.join(d, 'rootA');
    const b = path.join(d, 'rootB');
    write(a, 'one/SKILL.md', `---\nname: unique-one\ndescription: ${'long '.repeat(80)}\n---\nbody`);
    write(a, 'nodesc/SKILL.md', '---\nname: no-description\n---\nbody');
    write(a, 'dup/SKILL.md', '---\nname: dup-name\ndescription: from A\n---\n');
    write(b, 'dup/SKILL.md', '---\nname: dup-name\ndescription: from B\n---\n');
    write(b, 'folded/SKILL.md', '---\nname: folded-one\ndescription: >\n  first line\n  second line\n---\n');
    const found = Object.fromEntries(listSkills({ extraRoots: [a, b] }).map((s) => [s.name, s]));
    assert.ok(found['unique-one']);
    assert.equal(found['unique-one'].description.length, 220, 'descriptions are cut to 220 characters');
    assert.equal(found['no-description'], undefined);
    assert.equal(found['dup-name'].description, 'from A');
    assert.equal(found['folded-one'].description, 'first line second line');
  });
});

describe('bgz jev skills end to end', () => {
  // The child sees a scratch home, so only the scratch skills (and this pack's own skills folder) are listed.
  const skillsHome = (d, names) => {
    const home = path.join(d, 'home');
    for (const n of names) write(home, `.claude/skills/${n}/SKILL.md`, `---\nname: ${n}\ndescription: the ${n} helper\n---\nbody`);
    return { USERPROFILE: home, HOME: home };
  };
  const reply = (scores) => (body) => Object.fromEntries(Object.entries(body.questions).map(([id, q]) => [id, { score: scores[/^Skill "([^"]+)"/.exec(q.instructions)[1]] ?? 0, confidence: 0.95 }]));

  it('--write puts the section with scores into the brief; without --write the brief is untouched', async () => {
    const d = scratch();
    const extra = skillsHome(d, ['e2e-alpha', 'e2e-beta', 'e2e-gamma']);
    const original = '# Brief\n\nBuild the reminder button. Use e2e-gamma.\n';
    const brief = write(d, 'brief.md', original);
    const m = await mock(reply({ 'e2e-alpha': 3, 'e2e-beta': 0.4 }));

    const dry = await cli(['skills', '--brief', brief], d, m, extra);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(dry.json.ok, true);
    assert.equal(dry.json.wrote, false);
    assert.equal(fs.readFileSync(brief, 'utf8'), original);
    const names = dry.json.skills.map((s) => s.name);
    assert.ok(names.includes('e2e-alpha') && names.includes('e2e-gamma'), `kept: ${names.join(', ')}`);
    assert.ok(!names.includes('e2e-beta'), '0.4 of 4 is 0.1, below the bar');
    assert.equal(dry.json.skills.find((s) => s.name === 'e2e-gamma').why, 'named in the brief');

    const wrote = await cli(['skills', '--brief', brief, '--write'], d, m, extra);
    assert.equal(wrote.json.wrote, true);
    const text = fs.readFileSync(brief, 'utf8');
    assert.ok(text.startsWith(original.trimEnd()));
    assert.match(text, /## Skills to load/);
    assert.match(text, /- e2e-alpha \(0\.75\)/);
    assert.match(text, /- e2e-gamma \(0\): named in the brief/);
    assert.ok(!text.includes('e2e-beta'));
  });

  it('rejects an unknown stage and a missing --brief (exit 2) without a model call', async () => {
    const d = scratch();
    const brief = write(d, 'brief.md', '# Brief');
    const m = await mock(() => ({}));
    const a = await cli(['skills', '--brief', brief, '--stage', 'nonsense'], d, m, skillsHome(d, ['x-skill']));
    assert.equal(a.status, 2);
    assert.match(a.stderr, /unknown --stage nonsense/);
    const b = await cli(['skills'], d, m);
    assert.equal(b.status, 2);
    assert.match(b.stderr, /usage: bgz jev skills/);
    assert.equal(m.calls.length, 0);
  });
});

// --------------------------------------------------------------------------------------------------------- review.mjs
describe('review: parseHunks and groupUnits', () => {
  const DIFF = [
    'diff --git a/x.js b/x.js',
    '--- a/x.js',
    '+++ b/x.js',
    '@@ -1,3 +1,4 @@ function a() {',
    ' ctx1',
    '+added one',
    '-removed',
    '+added two',
    ' ctx2',
    '@@ -10 +11,2 @@',
    '+second hunk A',
    '+second hunk B',
    '@@ -20,2 +30 @@',
    '-gone',
    '+single',
  ].join('\n');

  it('cuts a file diff into hunks with the new-side line range and only the added lines', () => {
    const units = parseHunks('x.js', DIFF);
    assert.equal(units.length, 3);
    assert.deepEqual(units.map((u) => [u.from, u.to]), [[1, 4], [11, 12], [30, 30]], 'a missing length means one line');
    assert.deepEqual(units[0].added, ['added one', 'added two']);
    assert.deepEqual(units[1].added, ['second hunk A', 'second hunk B']);
    assert.ok(units.every((u) => u.file === 'x.js'));
    assert.ok(!units[0].diff.includes('diff --git'), 'the file header is not part of a hunk');
    assert.ok(units[0].diff.includes('-removed'));
  });

  it('a zero-length hunk (pure deletion) still has a one-line range', () => {
    const [u] = parseHunks('x.js', '@@ -5,2 +4,0 @@\n-a\n-b\n');
    assert.deepEqual([u.from, u.to, u.added], [4, 4, []]);
  });

  it('keeps an added line whose text itself starts with "++" (a "++counter;" line)', () => {
    const [u] = parseHunks('x.js', '@@ -1 +1,2 @@\n ctx\n+++counter;\n');
    assert.deepEqual(u.added, ['++counter;']);
  });

  it('groupUnits joins the small hunks of one file into one unit and keeps files apart', () => {
    const a = parseHunks('a.js', DIFF);
    const b = parseHunks('b.js', '@@ -1 +1 @@\n-old\n+new\n');
    const out = groupUnits([...a, ...b]);
    assert.equal(out.length, 2);
    const ga = out.find((u) => u.file === 'a.js');
    assert.deepEqual([ga.from, ga.to, ga.hunks], [1, 30, 3]);
    assert.deepEqual(ga.added, ['added one', 'added two', 'second hunk A', 'second hunk B', 'single']);
    assert.ok(ga.diff.includes('added one') && ga.diff.includes('second hunk B'));
    assert.deepEqual([out.find((u) => u.file === 'b.js').hunks], [1]);
  });

  it('groupUnits splits a large file back into one unit per hunk (over 6000 characters)', () => {
    const hunk = (start) => `@@ -${start} +${start},40 @@\n${Array.from({ length: 40 }, (_, i) => `+${'x'.repeat(80)}${i}`).join('\n')}\n`;
    const units = parseHunks('big.js', `${hunk(1)}${hunk(100)}${hunk(200)}`);
    assert.equal(units.length, 3);
    assert.ok(units.reduce((n, u) => n + u.diff.length, 0) > 6000);
    const out = groupUnits(units);
    assert.equal(out.length, 3);
    assert.deepEqual(out.map((u) => u.from), [1, 100, 200]);
    assert.ok(out.every((u) => u.hunks === 1));
  });
});

describe('review: changedUnits on a git diff', () => {
  it('lists changed text files per hunk, skips lockfiles and binaries, and adds new untracked text files', () => {
    const { repo } = makeRepo();
    edit(repo, 'a.js', 'l3\n', 'l3 CHANGED_A1\n');
    edit(repo, 'a.js', 'l27\n', 'l27 CHANGED_A2\n');
    edit(repo, 'b.js', 'b2\n', 'b2 CHANGED_B\n');
    fs.writeFileSync(path.join(repo, 'package-lock.json'), '{"changed":true}\n');
    fs.writeFileSync(path.join(repo, 'image.png'), Buffer.from([0x89, 0x50, 0, 0, 2, 9]));
    write(repo, 'new-file.js', 'one\ntwo\nthree\n');
    fs.writeFileSync(path.join(repo, 'huge.txt'), 'y'.repeat(200 * 1024 + 10));
    fs.writeFileSync(path.join(repo, 'nul.dat'), Buffer.from([65, 0, 66]));

    const units = changedUnits({ base: 'HEAD', cwd: repo });
    const files = [...new Set(units.map((u) => u.file))].sort();
    assert.deepEqual(files, ['a.js', 'b.js', 'new-file.js']);
    const a = units.filter((u) => u.file === 'a.js');
    assert.equal(a.length, 2, 'two edits far apart are two hunks');
    assert.deepEqual(a.map((u) => [u.from, u.to]), [[1, 6], [24, 30]]);
    assert.deepEqual(a.map((u) => u.added), [['l3 CHANGED_A1'], ['l27 CHANGED_A2']]);
    const fresh = units.find((u) => u.file === 'new-file.js');
    assert.equal(fresh.untracked, true);
    assert.deepEqual([fresh.from, fresh.to], [1, 4]);

    const tracked = changedUnits({ base: 'HEAD', cwd: repo, includeUntracked: false });
    assert.ok(!tracked.some((u) => u.file === 'new-file.js'));
    const only = changedUnits({ base: 'HEAD', files: ['b.js'], cwd: repo });
    assert.deepEqual([...new Set(only.map((u) => u.file))], ['b.js']);
  });

  it('a bad base is an error that names git, never an empty "clean" result', () => {
    const { repo } = makeRepo();
    assert.throws(() => changedUnits({ base: 'no-such-ref', cwd: repo }), /git diff failed/);
  });
});

describe('arch: leads with file, line range and confidence', () => {
  const setup = () => {
    const { d, repo } = makeRepo();
    edit(repo, 'a.js', 'l3\n', 'l3 CHANGED_A1\n');
    edit(repo, 'a.js', 'l27\n', 'l27 CHANGED_A2\n');
    edit(repo, 'b.js', 'b2\n', 'b2 CHANGED_B\n');
    return { d, repo };
  };
  const reply = (body) => {
    if (body.state.file === 'a.js') return { contradiction: 0.8, duplication: 0.6, error_path: 0.59 };
    if (body.state.file === '(whole diff)') return { layering: 0.7 };
    return {};
  };

  it('flags a question at 0.6 or more, with the file, the line range of the unit, a plain label and a rounded confidence', async () => {
    assert.equal(FLAG_AT, 0.6);
    const { d, repo } = setup();
    const m = await mock(reply);
    const r = await arch({ base: 'HEAD', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, true);
    assert.equal(r.checked, 3, 'a.js, b.js and the whole diff');
    assert.deepEqual(r.gaps, []);
    assert.deepEqual(r.leads.map((l) => l.confidence), [0.8, 0.7, 0.6], 'strongest first');
    const [contradiction, layering, duplication] = r.leads;
    assert.deepEqual(contradiction, { file: 'a.js', lines: '1-30', check: 'contradictory or unreachable logic', confidence: 0.8, scope: 'unit' });
    assert.equal(duplication.check, 'duplicated logic');
    assert.equal(duplication.file, 'a.js', '0.6 exactly is flagged');
    assert.equal(layering.scope, 'whole-diff');
    assert.equal(layering.check, 'layering or ownership violation');
    assert.ok(!r.leads.some((l) => l.check === 'broken error path or silent failure'), '0.59 is not flagged');
    assert.match(r.note, /not verdicts/i);
  });

  it('sends each file its own diff, six questions, and one extra whole-diff request when there are two or more files', async () => {
    const { d, repo } = setup();
    const m = await mock(reply);
    await arch({ base: 'HEAD', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(m.calls.length, 3);
    const byFile = Object.fromEntries(m.calls.map((c) => [c.body.state.file, c.body]));
    assert.deepEqual(Object.keys(byFile).sort(), ['(whole diff)', 'a.js', 'b.js']);
    assert.deepEqual(Object.keys(byFile['a.js'].questions), Object.keys(ARCH_QUESTIONS));
    assert.ok(byFile['a.js'].state.diff.includes('CHANGED_A1') && byFile['a.js'].state.diff.includes('CHANGED_A2'));
    assert.ok(!byFile['a.js'].state.diff.includes('CHANGED_B'));
    assert.ok(byFile['(whole diff)'].state.diff.includes('CHANGED_A1') && byFile['(whole diff)'].state.diff.includes('CHANGED_B'));
    assert.equal(byFile['a.js'].state.brief, undefined);

    const one = await mock(reply);
    await arch({ base: 'HEAD', files: ['b.js'], cwd: repo, env: homeEnv(d, one), timeoutMs: 3000 });
    assert.equal(one.calls.length, 1, 'a single file has no separate whole-diff request');
  });

  it('adds a brief_mismatch question and the brief text when a brief is given', async () => {
    const { d, repo } = setup();
    const m = await mock((body) => (body.state.file === 'b.js' ? { brief_mismatch: 0.9 } : {}));
    const r = await arch({ base: 'HEAD', cwd: repo, brief: 'BRIEF_TEXT: only change b.js', env: homeEnv(d, m), timeoutMs: 3000 });
    for (const c of m.calls) {
      assert.ok('brief_mismatch' in c.body.questions);
      assert.match(c.body.state.brief, /BRIEF_TEXT/);
    }
    assert.deepEqual(r.leads.map((l) => [l.file, l.check]), [['b.js', 'mismatch with the brief']]);
  });

  it('a Jev outage is gaps with ok:false, never an empty list that looks like a pass', async () => {
    const { d, repo } = setup();
    const m = await mock(() => ({}), { status: 500 });
    const r = await arch({ base: 'HEAD', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, false);
    assert.deepEqual(r.leads, []);
    assert.equal(r.gaps.length, 3);
    assert.ok(r.gaps.every((g) => g.file && g.lines && g.error));
  });

  it('no changes against the base is an ok result with a note and no model call', async () => {
    const { d, repo } = makeRepo();
    const m = await mock(() => ({}));
    const r = await arch({ base: 'HEAD', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, true);
    assert.match(r.note, /no changed text files/);
    assert.equal(m.calls.length, 0);
  });

  it('bgz jev arch --base HEAD --repo prints the leads; a missing --base or --brief file is a usage error (exit 2)', async () => {
    const { d, repo } = setup();
    const m = await mock(reply);
    const r = await cli(['arch', '--base', 'HEAD', '--repo', repo, '--files', 'a.js,b.js'], d, m);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.leads[0].file, 'a.js');
    const noBase = await cli(['arch', '--repo', repo], d, m);
    assert.equal(noBase.status, 2);
    assert.match(noBase.stderr, /--base <ref> is required/);
    const noBrief = await cli(['arch', '--base', 'HEAD', '--repo', repo, '--brief', path.join(d, 'missing.md')], d, m);
    assert.equal(noBrief.status, 2);
    assert.match(noBrief.stderr, /cannot read --brief/);
  });
});

describe('unasked: only untraceable additions, with quotes', () => {
  const setup = () => {
    const { d, repo } = makeRepo();
    edit(repo, 'a.js', 'l3\n', "l3\nif (user.plan === 'free' && n > 3) throw new Error('limit reached'); // BLOCKFREE\n");
    edit(repo, 'b.js', 'b2\n', 'b2\n// HARMLESS_NOTE for the next reader\n');
    write(repo, 'AGENTS.md', '# Rules\nNever ship on Fridays. NEWRULE\n');
    write(repo, 'tracked-ok.js', 'const HIGHHIT = 1; // asked for in DECISIONS.md\n');
    write(repo, 'low.js', 'const LOWHIT = 1;\n');
    return { d, repo };
  };
  const reply = (body) => {
    const c = body.state.change;
    if (c.includes('BLOCKFREE')) return { customer_stop: 0.9, new_rule: 0.05, traceable: 0.1 };
    if (c.includes('NEWRULE')) return { customer_stop: 0.1, new_rule: 0.8, traceable: 0.2 };
    if (c.includes('HIGHHIT')) return { customer_stop: 0.9, new_rule: 0, traceable: 0.8 };
    if (c.includes('LOWHIT')) return { customer_stop: 0.5, new_rule: 0.5, traceable: 0.1 };
    return {};
  };

  it('lists a hit that the asks do not cover, quoting the added text, and leaves out everything traceable or weak', async () => {
    const { d, repo } = setup();
    const m = await mock(reply);
    const r = await unasked({ base: 'HEAD', asks: '# DECISIONS.md\nBuild a reminder button.', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, true);
    assert.equal(r.checked, 5, 'a.js, b.js, AGENTS.md, tracked-ok.js and low.js');
    assert.deepEqual(r.gaps, []);
    assert.deepEqual(r.untraceable.map((i) => i.file), ['a.js', 'AGENTS.md'], 'only the two untraceable items, strongest first');
    const [stop, rule] = r.untraceable;
    assert.equal(stop.kind, 'customer-facing stop');
    assert.match(stop.quote, /BLOCKFREE/, 'the quote is the added text itself');
    assert.equal(stop.confidence, 0.9);
    assert.match(stop.lines, /^\d+-\d+$/);
    assert.equal(rule.kind, 'new rule');
    assert.match(rule.quote, /Never ship on Fridays/);
    assert.equal(rule.confidence, 0.8);
    const listed = JSON.stringify(r.untraceable);
    for (const left of ['HARMLESS_NOTE', 'HIGHHIT', 'LOWHIT']) assert.ok(!listed.includes(left), `${left} should not be listed`);
  });

  it('sends only the added lines as state.change, with the asks text as state.asks', async () => {
    const { d, repo } = setup();
    const m = await mock(reply);
    await unasked({ base: 'HEAD', asks: 'ASKS_MARKER', cwd: repo, files: ['a.js'], env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(m.calls.length, 1);
    const body = m.calls[0].body;
    assert.deepEqual(Object.keys(body.questions), Object.keys(UNASKED_QUESTIONS));
    assert.equal(body.state.asks, 'ASKS_MARKER');
    assert.match(body.state.change, /BLOCKFREE/);
    assert.ok(!body.state.change.includes('l2\n'), 'context lines are not sent as the change');
  });

  it('the thresholds are exact: hit >= 0.6 and traceable < 0.5 is untraceable, either side of that is not', async () => {
    assert.equal(UNASKED_HIT_AT, 0.6);
    assert.equal(TRACEABLE_BELOW, 0.5);
    const d = scratch();
    const cases = [
      [{ customer_stop: 0.6, new_rule: 0, traceable: 0.49 }, true],
      [{ customer_stop: 0.6, new_rule: 0, traceable: 0.5 }, false],
      [{ customer_stop: 0.59, new_rule: 0.59, traceable: 0 }, false],
      [{ customer_stop: 0.1, new_rule: 0.95, traceable: 0.1 }, true],
    ];
    let i = -1;
    const m = await mock(() => cases[i][0]);
    for (const [, expected] of cases) {
      i += 1;
      const r = await checkUnasked({ change: 'some change', asks: 'some asks', env: homeEnv(d, m), timeoutMs: 3000 });
      assert.equal(r.untraceable, expected, JSON.stringify(cases[i][0]));
    }
    i = 0;
    const r = await checkUnasked({ change: 'a\n\n  b  \nc\nd', asks: 'x', file: 'f.md', env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.confidence, 0.51, 'min(hit, 1 - traceable)');
    assert.equal(r.file, 'f.md');
    assert.equal(r.quote, 'a / b / c', 'the quote is the first three non-empty lines');
  });

  it('without asks it refuses (an empty list would make everything look untraceable) and calls nothing', async () => {
    const { d, repo } = setup();
    const m = await mock(reply);
    const r = await unasked({ base: 'HEAD', asks: '   ', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, false);
    assert.match(r.err, /no asks text/);
    assert.equal(m.calls.length, 0);
  });

  it('a Jev outage is a gap, not "nothing untraceable"', async () => {
    const { d, repo } = setup();
    const m = await mock(() => ({}), { status: 500 });
    const r = await unasked({ base: 'HEAD', asks: 'asks', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, false);
    assert.deepEqual(r.untraceable, []);
    assert.equal(r.gaps.length, 5);
  });

  it('nothing added against the base is ok with a note and no model call', async () => {
    const { d, repo } = makeRepo();
    const m = await mock(reply);
    const r = await unasked({ base: 'HEAD', asks: 'asks', cwd: repo, env: homeEnv(d, m), timeoutMs: 3000 });
    assert.equal(r.ok, true);
    assert.match(r.note, /no added text/);
    assert.equal(m.calls.length, 0);
  });

  it('readAsks joins several files under their names and skips a missing one', () => {
    const d = scratch();
    write(d, 'DECISIONS.md', 'Build a reminder button.');
    write(d, 'brief.md', 'Brief text.');
    const text = readAsks('DECISIONS.md,missing.md,brief.md', d);
    assert.equal(text, '# DECISIONS.md\nBuild a reminder button.\n\n# brief.md\nBrief text.');
    assert.equal(readAsks(undefined, d), '');
  });

  it('bgz jev unasked reads --asks relative to --repo and prints the untraceable list', async () => {
    const { d, repo } = setup();
    const m = await mock(reply);
    const r = await cli(['unasked', '--base', 'HEAD', '--repo', repo, '--asks', 'DECISIONS.md'], d, m);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.json.untraceable.map((i) => i.file), ['a.js', 'AGENTS.md']);
    assert.match(m.calls[0].body.state.asks, /^# DECISIONS\.md\n# Owner asks\nBuild a reminder button\./, 'the file name is a header above the file text');
    const noBase = await cli(['unasked', '--repo', repo, '--asks', 'DECISIONS.md'], d, m);
    assert.equal(noBase.status, 2);
    // No --asks: the repo's DECISIONS.md is the fallback.
    const fallback = await cli(['unasked', '--base', 'HEAD', '--repo', repo], d, m);
    assert.equal(fallback.status, 0, fallback.stderr);
    assert.match(m.calls[m.calls.length - 1].body.state.asks, /^# DECISIONS\.md\n/);
    // BGZFLOW_DECISIONS_FILE names another file (relative to the repo); a missing one leaves no asks, which is { ok:false }.
    write(repo, path.join('notes', 'owner-calls.md'), 'Build a reminder button.\n');
    const named = await cli(['unasked', '--base', 'HEAD', '--repo', repo], d, m, { BGZFLOW_DECISIONS_FILE: path.join('notes', 'owner-calls.md') });
    assert.equal(named.status, 0, named.stderr);
    assert.match(m.calls[m.calls.length - 1].body.state.asks, /^# owner-calls\.md\nBuild a reminder button\./);
    const noAsks = await cli(['unasked', '--base', 'HEAD', '--repo', repo], d, m, { BGZFLOW_DECISIONS_FILE: 'no-such-decisions.md' });
    assert.equal(noAsks.status, 1, 'missing asks is { ok:false }');
    assert.equal(noAsks.json.ok, false);
    assert.match(noAsks.json.err, /BGZFLOW_DECISIONS_FILE/);
  });
});
