// Offline tests for tools/jev/improve.mjs: candidates (>= 3 jobs, >= 0.1 margin), the draft checks, the swap with a backup,
// the 5-job watch with automatic restore, and the skill-changes.jsonl trail. Jev is a loopback mock or an injected stub;
// BGZFLOW_HOME is a scratch folder under <repo>/.tmp/; skill files live in scratch folders, never in the real skills/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, fake, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { MARGIN, MATCH_CONFIDENCE, MAX_SKILL_CHARS, MIN_JOBS, WATCH_JOBS, asksSpec, changesPath, draftPrompt, findCandidates, historyDir, improve, isInstalled, isoWeek, matchSkill, readChanges, skillsTarget, swapIn, textHash, validateDraft, watchResults, workflowKey, writeWeeklySummary } from '../improve.mjs';
import { listSkills, overlayDir } from '../skills.mjs';

const BGZ = path.join(ROOT, 'tools', 'bgz.mjs');
const dirs = [];
const mocks = [];
const scratch = () => {
  const d = makeProject('jevimp');
  dirs.push(d);
  return d;
};
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});
const homeEnv = (d, extra = {}) => ({ BGZFLOW_HOME: path.join(d, '.home'), FAST_JEV_KEY_FILE: path.join(d, 'no-such-key-file'), ...extra });

// ---------------------------------------------------------------------------------------------- fixtures
let seq = 0;
const stamp = (n) => new Date(Date.UTC(2026, 9, 1, 0, 0, n)).toISOString();
const row = (o = {}) => {
  seq += 1;
  return { id: `r${seq}`, t: stamp(seq), role: 'builder', worker: 'codex', value: 0.6, jobType: 'fix-bug', skills: ['skill-a'], steps: ['read the failing test', 'patch', 'run the tests'], ...o };
};
const many = (n, o) => Array.from({ length: n }, () => row(o));
const chore = (n, value, o = {}) => many(n, { value, jobType: 'chore', skills: ['skill-b'], ...o });

const OLD = '---\nname: skill-target\ndescription: Fix a bug in small steps.\n---\n\n# Fix a bug\n\n1. Read the failing test.\n2. Make the smallest change that fixes it.\n3. Run the tests again.\n';
const NEW = `${OLD}4. Write down what you changed and why in the report.\n`;
const NOW = new Date('2026-10-09T09:00:00Z');
const LATER = new Date('2026-10-20T09:00:00Z');
const writeRows = (d, rows) => {
  fs.mkdirSync(path.join(d, '.home'), { recursive: true });
  fs.writeFileSync(path.join(d, '.home', 'performance.jsonl'), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
};
const appendRows = (d, rows) => fs.appendFileSync(path.join(d, '.home', 'performance.jsonl'), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
const lastLines = (d) => readChanges(homeEnv(d));

// The default story: skill-a's workflow scored 0.9 three times, other builder jobs 0.6 and 0.5.
const storyRows = () => [...many(3, { value: 0.9 }), ...chore(3, 0.6), ...many(2, { value: 0.5, jobType: 'misc', skills: ['skill-target'] })];

// A whole improve() run with every outside thing injected: skill list, matcher, drafter, unasked check, cards and bench.
function scenario({ rows = storyRows(), skillText = OLD, deps = {}, opts = {} } = {}) {
  const d = scratch();
  const env = homeEnv(d);
  const file = write(d, 'skills/skill-target/SKILL.md', skillText);
  writeRows(d, rows);
  const calls = { unasked: [], bench: [], draft: [] };
  const base = {
    skills: () => [{ name: 'skill-target', description: 'Fix bugs', file, source: 'folder' }],
    match: async () => ({ ok: true, skill: 'skill-target', confidence: 0.9, file }),
    drafter: { name: 'fake-writer', run: (prompt) => { calls.draft.push(prompt); return { ok: true, text: NEW }; } },
    unasked: async (a) => { calls.unasked.push(a); return { ok: true, untraceable: false }; },
    cards: () => [{ id: 'c1', brief: 'a job', checks: ['it works'] }],
    runner: { name: 'fake-runner', run: () => ({ ok: true, text: 'out' }) },
    bench: async (a) => { calls.bench.push(a); return { ok: true, pass: true, why: 'no worse on checks (1 vs 1), better on grade (0.9 vs 0.8)', cost_usd: 0.0123 }; },
  };
  const all = { ...base, ...deps };
  return { d, env, file, calls, deps: all, run: (more = {}) => improve({ env, repo: d, asks: 'The owner asked for a reminder button.', deps: all, now: NOW, ...opts, ...more }) };
}

// Only the System32 / bin folder on PATH, so `where claude` / `where codex` find nothing during the call.
async function withoutModelClis(fn) {
  const saved = process.env.PATH;
  process.env.PATH = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32') : '/usr/bin:/bin';
  try {
    return await fn();
  } finally {
    process.env.PATH = saved;
  }
}

// ---------------------------------------------------------------------------------------------- constants
describe('improve constants are the numbers in the brief', () => {
  it('3 jobs, 0.1 margin, 5 watched jobs, 4,000 characters, 0.5 match confidence', () => {
    assert.equal(MIN_JOBS, 3);
    assert.equal(MARGIN, 0.1);
    assert.equal(WATCH_JOBS, 5);
    assert.equal(MAX_SKILL_CHARS, 4000);
    assert.equal(MATCH_CONFIDENCE, 0.5);
  });
});

// ---------------------------------------------------------------------------------------------- 1. candidates
describe('findCandidates(): a workflow needs >= 3 jobs and a >= 0.1 margin over the role average', () => {
  it('3 jobs that beat the other jobs of the role by 0.3 are a candidate, with the numbers', () => {
    const win = many(3, { value: 0.9 });
    const c = findCandidates([...win, ...chore(3, 0.6)]);
    assert.equal(c.length, 1);
    assert.equal(c[0].jobs, 3);
    assert.equal(c[0].average, 0.9);
    assert.equal(c[0].baseline, 0.6);
    assert.equal(c[0].gain, 0.3);
    assert.deepEqual(c[0].workers, ['codex']);
    assert.equal(c[0].key, workflowKey(win[0]));
    assert.equal(c[0].key, 'builder|fix-bug|skill-a');
  });

  it('a single lucky run never qualifies, however high it scored', () => {
    assert.deepEqual(findCandidates([...many(1, { value: 1 }), ...chore(5, 0.2)]), []);
  });

  it('two jobs do not qualify either (the minimum is 3)', () => {
    assert.deepEqual(findCandidates([...many(2, { value: 1 }), ...chore(5, 0.2)]), []);
  });

  it('a margin of 0.09 is not enough, 0.15 is', () => {
    assert.deepEqual(findCandidates([...many(3, { value: 0.69 }), ...chore(3, 0.6)]), []);
    assert.equal(findCandidates([...many(3, { value: 0.75 }), ...chore(3, 0.6)]).length, 1);
  });

  it('a margin of exactly 0.1 qualifies ("at least 0.1")', () => {
    const c = findCandidates([...many(3, { value: 0.5 }), ...chore(3, 0.4)]);
    assert.equal(c.length, 1);
    assert.equal(c[0].gain, 0.1);
  });

  it('the baseline is the other jobs of the same role only; other roles are ignored', () => {
    const win = many(3, { value: 0.7 });
    const checkers = many(5, { role: 'checker', value: 0.1, jobType: 'review', skills: ['skill-z'] });
    assert.deepEqual(findCandidates([...win, ...checkers]), [], 'no builder baseline at all means nothing to compare with');
    const c = findCandidates([...win, ...checkers, ...chore(3, 0.5)]);
    assert.equal(c.length, 1);
    assert.equal(c[0].baseline, 0.5, 'the checker rows did not drag the builder baseline down');
  });

  it('uses the combined score once an outcome exists: a high judged value with a poor outcome does not win', () => {
    const win = many(3, { value: 0.9, combined: 0.5 });
    assert.deepEqual(findCandidates([...win, ...chore(3, 0.55)]), []);
    const good = many(3, { value: 0.5, combined: 0.95 });
    assert.equal(findCandidates([...good, ...chore(3, 0.55)]).length, 1);
  });

  it('jobs with different skill sets are different workflows and are not pooled', () => {
    const rows = [...many(2, { value: 0.9 }), ...many(2, { value: 0.9, skills: ['skill-a', 'skill-c'] }), ...chore(3, 0.5)];
    assert.deepEqual(findCandidates(rows), []);
    assert.notEqual(workflowKey(rows[0]), workflowKey(rows[2]));
  });

  it('rows with no job type, skills or steps never form a workflow', () => {
    const bare = [row({ value: 0.95, jobType: null }), row({ value: 0.95, skills: [] }), row({ value: 0.95, steps: [] }), row({ value: 0.95, jobType: null })];
    assert.deepEqual(findCandidates([...bare, ...chore(3, 0.5)]), []);
  });

  it('a workflow that already has a promote or reject line is not proposed again', () => {
    const rows = [...many(3, { value: 0.9 }), ...chore(3, 0.6)];
    const key = workflowKey(rows[0]);
    assert.equal(findCandidates(rows, []).length, 1);
    assert.deepEqual(findCandidates(rows, [{ action: 'reject', workflow: key }]), []);
    assert.deepEqual(findCandidates(rows, [{ action: 'promote', workflow: key }]), []);
  });

  it('the biggest gain comes first', () => {
    const a = many(3, { value: 0.9 });
    const b = many(3, { value: 0.8, jobType: 'ship', skills: ['skill-c'] });
    const out = findCandidates([...a, ...b, ...chore(3, 0.5)]);
    assert.equal(out.length, 2);
    assert.equal(out[0].key, workflowKey(a[0]));
    assert.ok(out[0].gain >= out[1].gain);
  });
});

// ---------------------------------------------------------------------------------------------- 3. validateDraft
describe('validateDraft(): size, format, name and new stop-word lines', () => {
  const ok = (text, oldText = OLD) => validateDraft({ text, name: 'skill-target', oldText });

  it('accepts a small, well-formed draft that only adds a plain step', () => {
    assert.equal(ok(NEW), null);
  });

  it('rejects an empty or tiny draft', () => {
    assert.match(ok(''), /empty/);
    assert.match(ok('---\nname: skill-target\n---\n'), /empty/);
  });

  it('rejects a draft over 4,000 characters, and accepts exactly 4,000', () => {
    const pad = (n) => `${OLD}${'x'.repeat(n - OLD.length - 1)}\n`;
    assert.equal(pad(MAX_SKILL_CHARS).length, MAX_SKILL_CHARS);
    assert.equal(ok(pad(MAX_SKILL_CHARS)), null);
    const tooLong = pad(MAX_SKILL_CHARS + 1);
    assert.equal(tooLong.length, MAX_SKILL_CHARS + 1);
    assert.match(ok(tooLong), /4001 chars \(limit 4000\)/);
  });

  it('rejects the wrong format: no frontmatter, wrong name, a code fence', () => {
    assert.match(ok('# skill-target\n\nJust prose, no frontmatter block at the top of this file, long enough to pass the size check.\n'), /no frontmatter/);
    assert.match(ok(NEW.replace('name: skill-target', 'name: other-skill')), /changed the skill name/);
    assert.ok(ok(`\`\`\`markdown\n${NEW}\`\`\`\n`), 'a fenced draft is refused (by the format check)');
  });

  it('the skill name is matched literally, so a dot is not a wildcard', () => {
    const dotted = validateDraft({ text: NEW.replace('name: skill-target', 'name: axb'), name: 'a.b', oldText: '' });
    assert.match(dotted, /changed the skill name/);
  });

  it('refuses a draft that adds a "never / must not / blocked / refuse" line to a skill that had none', () => {
    for (const line of ['5. Never skip the tests.', '5. The worker must not edit lockfiles.', '5. Releases are blocked until the owner agrees.', '5. Refuse any change outside the brief.']) {
      assert.match(ok(`${NEW}${line}\n`), /stop word/, line);
    }
  });

  it('keeps a stop-word line the old skill already had', () => {
    const old = `${OLD}4. Never print a secret.\n`;
    assert.equal(ok(`${old}5. Report the result in plain English.\n`, old), null);
  });

  it('when the old skill already had stop lines, adding MORE of them than it had is refused', () => {
    const old = `${OLD}4. Never print a secret.\n`;
    const grown = `${OLD}4. Never print a secret or a token.\n5. Never edit the lockfile.\n`;
    assert.match(ok(grown, old), /more stop-word lines than the old skill/);
  });

  it('a reworded stop line is tolerated when the count does not grow (the unasked check is the second layer)', () => {
    const old = `${OLD}4. Never print a secret.\n`;
    assert.equal(ok(`${OLD}4. Never print a secret or a token.\n`, old), null);
  });
});

describe('draftPrompt(): what the drafting model is told', () => {
  const cand = { jobType: 'fix-bug', average: 0.9, baseline: 0.6, rows: [{ steps: ['read the test', 'fix', `run ${fake.ghToken()}`], value: 0.9 }] };

  it('asks for a skill under 4,000 characters with no new rule, gate, cap or refusal', () => {
    const p = draftPrompt({ cand, name: 'skill-target', oldText: OLD });
    assert.match(p, /Under 4000 characters/);
    assert.match(p, /Do not add any new rule, ban, gate, cap, expiry or refusal/);
    assert.match(p, /name: skill-target/);
    assert.ok(p.includes(OLD), 'the current skill text is included so the model updates it');
    assert.match(p, /0\.9 against 0\.6/);
  });

  it('for a new skill it asks for a new file and has no "current skill" section', () => {
    const p = draftPrompt({ cand, name: 'bg-fix-bug-workflow', oldText: '' });
    assert.match(p, /Write a new skill named "bg-fix-bug-workflow"/);
    assert.doesNotMatch(p, /current skill/);
  });

  it('masks a secret that was in the worker steps', () => {
    const p = draftPrompt({ cand, name: 'skill-target', oldText: '' });
    assert.doesNotMatch(p, /ghp_a{10}/);
  });
});

// ---------------------------------------------------------------------------------------------- 2. matchSkill
describe('matchSkill(): Jev picks which skill the workflow belongs to', () => {
  const cand = { jobType: 'fix-bug', role: 'builder', skills: ['skill-a'], rows: [{ steps: ['read', 'patch'] }] };
  const skills = [{ name: 'skill-target', description: 'Fix bugs', file: '/x/skill-target/SKILL.md' }, { name: 'skill-two', description: 'Other', file: '/x/skill-two/SKILL.md' }];
  const stub = (choice, confidence) => async () => ({ ok: true, answers: { skill: { choice, confidence } } });

  it('returns the picked skill and its file when Jev is confident', async () => {
    const r = await matchSkill({ cand, skills, ask: stub('skill-two', 0.8), env: {} });
    assert.deepEqual(r, { ok: true, skill: 'skill-two', confidence: 0.8, file: '/x/skill-two/SKILL.md' });
  });

  it('"new" and a low-confidence match both mean a new skill', async () => {
    assert.equal((await matchSkill({ cand, skills, ask: stub('new', 0.95), env: {} })).skill, 'new');
    const weak = await matchSkill({ cand, skills, ask: stub('skill-two', 0.49), env: {} });
    assert.equal(weak.skill, 'new');
    assert.equal(weak.file, null);
    assert.equal((await matchSkill({ cand, skills, ask: stub('skill-two', 0.5), env: {} })).skill, 'skill-two', '0.5 is trusted');
  });

  it('an unavailable Jev is reported, not guessed', async () => {
    const r = await matchSkill({ cand, skills, ask: async () => ({ ok: false, err: 'timeout' }), env: {} });
    assert.deepEqual(r, { ok: false, err: 'timeout' });
  });

  it('through the mock: options are every skill plus "new", capped at 255 choices, and steps are masked', async () => {
    const d = scratch();
    const m = await startMockJev(() => ({ skill: { choice: 'skill-0007', confidence: 0.9 } }));
    mocks.push(m);
    const many300 = Array.from({ length: 300 }, (_, i) => ({ name: `skill-${String(i).padStart(4, '0')}`, description: `skill ${i}`, file: `/x/${i}.md` }));
    const leaky = { ...cand, rows: [{ steps: [`deploy with ${fake.ghToken()}`] }] };
    const r = await matchSkill({ cand: leaky, skills: many300, env: { ...homeEnv(d), ...m.env } });
    assert.equal(r.ok, true);
    assert.equal(r.skill, 'skill-0007');
    assert.equal(m.calls.length, 1);
    const options = Object.keys(m.calls[0].body.questions.skill.criteria);
    assert.equal(options.length, 255);
    assert.ok(options.includes('new'));
    assert.doesNotMatch(JSON.stringify(m.calls[0].body.state), /ghp_b{10}/);
  });
});

// ---------------------------------------------------------------------------------------------- 6. swapIn
describe('swapIn(): the old text is backed up to skill-history before the new text goes live', () => {
  it('copies the old file to skill-history/<skill>/<date>.md, then writes the new text with one trailing newline', () => {
    const d = scratch();
    const env = homeEnv(d);
    const file = write(d, 'skills/skill-target/SKILL.md', OLD);
    const { backup, promotedCopy, hash, created } = swapIn({ file, text: `${NEW}\n\n\n`, skill: 'skill-target', env, now: new Date('2026-10-09T10:00:00Z') });
    assert.equal(created, false);
    assert.equal(fs.readFileSync(promotedCopy, 'utf8'), `${NEW.trimEnd()}\n`, 'the promoted text is kept in skill-history too');
    assert.equal(hash, textHash(`${NEW.trimEnd()}\n`));
    assert.equal(backup, path.join(historyDir('skill-target', env), '2026-10-09.md'));
    assert.equal(path.dirname(backup), path.join(d, '.home', 'skill-history', 'skill-target'));
    assert.equal(fs.readFileSync(backup, 'utf8'), OLD);
    assert.equal(fs.readFileSync(file, 'utf8'), `${NEW.trimEnd()}\n`);
  });

  it('a second swap on the same day gets its own backup (-2, -3), so no backup is overwritten', () => {
    const d = scratch();
    const env = homeEnv(d);
    const file = write(d, 'skills/skill-target/SKILL.md', 'v1\n');
    const now = new Date('2026-10-09T10:00:00Z');
    const b1 = swapIn({ file, text: 'v2', skill: 'skill-target', env, now }).backup;
    const b2 = swapIn({ file, text: 'v3', skill: 'skill-target', env, now }).backup;
    const b3 = swapIn({ file, text: 'v4', skill: 'skill-target', env, now }).backup;
    assert.deepEqual([path.basename(b1), path.basename(b2), path.basename(b3)], ['2026-10-09.md', '2026-10-09-2.md', '2026-10-09-3.md']);
    assert.deepEqual([b1, b2, b3].map((b) => fs.readFileSync(b, 'utf8')), ['v1\n', 'v2\n', 'v3\n']);
    assert.equal(fs.readFileSync(file, 'utf8'), 'v4\n');
  });

  it('a brand-new skill has nothing to back up: no backup path, folders are created', () => {
    const d = scratch();
    const env = homeEnv(d);
    const file = path.join(d, 'skills', 'fresh', 'SKILL.md');
    const s = swapIn({ file, text: NEW, skill: 'fresh', env });
    assert.equal(s.backup, null);
    assert.equal(s.created, true);
    assert.equal(fs.readFileSync(file, 'utf8'), `${NEW.trimEnd()}\n`);
    assert.deepEqual(fs.readdirSync(historyDir('fresh', env)).map((n) => n.replace(/^\d{4}-\d{2}-\d{2}/, 'DAY')), ['DAY-promoted.md'], 'only the promoted copy, no backup');
  });
});

// ---------------------------------------------------------------------------------------------- 7. watch
describe('watchResults(): the next 5 jobs decide; a lower average restores the backup by itself', () => {
  function promoted({ created = false, oldAverage = 0.7 } = {}) {
    const d = scratch();
    const env = homeEnv(d);
    const file = write(d, 'skills/skill-target/SKILL.md', OLD);
    const now = new Date('2026-10-09T09:00:00Z');
    const swap = created ? null : swapIn({ file, text: NEW, skill: 'skill-target', env, now });
    if (created) fs.writeFileSync(file, NEW);
    const backup = swap ? swap.backup : null;
    const p = { t: now.toISOString(), action: 'promote', id: 'p1', skill: 'skill-target', file, backup, created, hash: swap ? swap.hash : textHash(NEW), oldAverage };
    return { d, env, file, backup, p };
  }
  const after5 = (vals, skill = 'skill-target') => vals.map((value, i) => row({ t: `2026-10-10T00:00:0${i}.000Z`, value, skills: [skill] }));

  it('fewer than 5 jobs since the promotion: still watching, nothing touched', () => {
    const { env, file, p } = promoted();
    const out = watchResults({ changes: [p], rows: after5([0.1, 0.1, 0.1, 0.1]), env, now: LATER });
    assert.deepEqual(out, [{ id: 'p1', skill: 'skill-target', state: 'watching', jobs: 4 }]);
    assert.equal(fs.readFileSync(file, 'utf8'), `${NEW.trimEnd()}\n`);
    assert.equal(fs.existsSync(changesPath(env)), false, 'no line is written while watching');
  });

  it('5 jobs averaging lower than the old average: the backup is restored and a rollback line says why', () => {
    const { d, env, file, p } = promoted({ oldAverage: 0.7 });
    const out = watchResults({ changes: [p], rows: after5([0.5, 0.6, 0.5, 0.6, 0.5]), env, now: LATER });
    assert.equal(out.length, 1);
    assert.equal(out[0].state, 'rolled-back');
    assert.match(out[0].reason, /next 5 jobs averaged 0\.54, below the old 0\.7/);
    assert.equal(fs.readFileSync(file, 'utf8'), OLD, 'the old text is live again');
    const lines = lastLines(d);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].action, 'rollback');
    assert.equal(lines[0].promotionId, 'p1');
    assert.equal(lines[0].skill, 'skill-target');
    assert.equal(lines[0].restored, true);
    assert.equal(lines[0].t, LATER.toISOString());
    assert.match(lines[0].reason, /below the old 0\.7/);
  });

  it('5 jobs averaging the same or higher: confirmed, the new text stays', () => {
    const { d, env, file, p } = promoted({ oldAverage: 0.5 });
    const out = watchResults({ changes: [p], rows: after5([0.5, 0.5, 0.5, 0.5, 0.5]), env, now: LATER });
    assert.equal(out[0].state, 'confirmed', 'equal is not lower');
    assert.equal(fs.readFileSync(file, 'utf8'), `${NEW.trimEnd()}\n`);
    const lines = lastLines(d);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].action, 'confirm');
    assert.equal(lines[0].promotionId, 'p1');
  });

  it('only the first 5 jobs after the promotion count; earlier jobs and jobs that did not use the skill are ignored', () => {
    const { env, file, p } = promoted({ oldAverage: 0.7 });
    const before = row({ t: '2026-10-01T00:00:00.000Z', value: 0, skills: ['skill-target'] });
    const elsewhere = many(5, { t: '2026-10-10T01:00:00.000Z', value: 0, skills: ['skill-other'] });
    const first5 = after5([0.9, 0.9, 0.9, 0.9, 0.9]);
    const later = many(5, { t: '2026-10-12T00:00:00.000Z', value: 0, skills: ['skill-target'] });
    const out = watchResults({ changes: [p], rows: [before, ...elsewhere, ...later, ...first5], env, now: LATER });
    assert.equal(out[0].state, 'confirmed');
    assert.equal(fs.readFileSync(file, 'utf8'), `${NEW.trimEnd()}\n`);
  });

  it('judges by the combined score when an outcome exists', () => {
    const { env, p } = promoted({ oldAverage: 0.7 });
    const rows = after5([0.95, 0.95, 0.95, 0.95, 0.95]).map((r) => ({ ...r, combined: 0.4 }));
    assert.equal(watchResults({ changes: [p], rows, env, now: LATER })[0].state, 'rolled-back');
  });

  it('a settled promotion (confirm or rollback line) is not judged a second time', () => {
    const { env, p } = promoted({ oldAverage: 0.7 });
    const rows = after5([0.1, 0.1, 0.1, 0.1, 0.1]);
    assert.equal(watchResults({ changes: [p], rows, env, now: LATER })[0].state, 'rolled-back');
    assert.deepEqual(watchResults({ changes: readChanges(env).concat([p]), rows, env, now: LATER }), []);
  });

  it('a skill that was created by the promotion is moved aside to .rolled-back (there is no backup to restore)', () => {
    const { d, env, file, p } = promoted({ created: true, oldAverage: 0.7 });
    const out = watchResults({ changes: [p], rows: after5([0.1, 0.1, 0.1, 0.1, 0.1]), env, now: LATER });
    assert.equal(out[0].state, 'rolled-back');
    assert.equal(fs.existsSync(file), false);
    assert.equal(fs.readFileSync(`${file}.rolled-back`, 'utf8'), NEW);
    assert.equal(lastLines(d)[0].restored, true);
  });
});

// ---------------------------------------------------------------------------------------------- the whole pass
describe('improve(): the full pass with the outside world stubbed', () => {
  it('promotes: backs up the old text, writes the new one, logs one promote line with the proof', async () => {
    const s = scenario();
    const out = await s.run();
    assert.equal(out.ok, true);
    assert.equal(out.candidates, 1);
    assert.equal(out.promoted.length, 1);
    assert.equal(out.rejected.length, 0);
    assert.equal(fs.readFileSync(s.file, 'utf8'), `${NEW.trimEnd()}\n`, 'the new text is live straight away');
    const p = out.promoted[0];
    assert.equal(p.skill, 'skill-target');
    assert.ok(p.backup.startsWith(path.join(s.d, '.home', 'skill-history', 'skill-target')));
    assert.equal(fs.readFileSync(p.backup, 'utf8'), OLD);
    const lines = lastLines(s.d);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].action, 'promote');
    assert.equal(lines[0].skill, 'skill-target');
    assert.equal(lines[0].file, s.file);
    assert.equal(lines[0].backup, p.backup);
    assert.equal(lines[0].created, false);
    assert.equal(lines[0].oldAverage, 0.5, 'the average of the jobs that used this skill before the change');
    assert.equal(lines[0].bench_cost_usd, 0.0123);
    assert.equal(lines[0].drafter, 'fake-writer');
    assert.equal(lines[0].workflow, 'builder|fix-bug|skill-a');
    assert.ok(lines[0].id && lines[0].t === NOW.toISOString());
  });

  it('the drafter is asked for the update and only the NEW lines go to the unasked check', async () => {
    const s = scenario();
    await s.run();
    assert.equal(s.calls.draft.length, 1);
    assert.ok(s.calls.draft[0].includes(OLD), 'the draft prompt carries the current skill');
    assert.equal(s.calls.unasked.length, 1);
    assert.equal(s.calls.unasked[0].change, '4. Write down what you changed and why in the report.');
    assert.equal(s.calls.unasked[0].asks, 'The owner asked for a reminder button.');
    assert.equal(s.calls.unasked[0].file, 'skill-target/SKILL.md');
    assert.equal(s.calls.bench.length, 1);
    assert.equal(s.calls.bench[0].oldVariant.skillText, OLD, 'the bench compares the old text ...');
    assert.equal(s.calls.bench[0].newVariant.skillText, NEW.trim(), '... with the new text, on the same cards');
  });

  it('--dry judges everything but writes nothing: no swap, no backup, no skill-changes line', async () => {
    const s = scenario();
    const out = await s.run({ dry: true });
    assert.equal(out.dry, true);
    assert.equal(out.promoted.length, 1);
    assert.equal(out.promoted[0].would, true);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
    assert.equal(fs.existsSync(changesPath(s.env)), false);
    assert.equal(fs.existsSync(path.join(s.d, '.home', 'skill-history')), false);
    assert.equal(fs.existsSync(path.join(s.d, '.bgzflow', 'lessons-notes.md')), false);
  });

  it('a draft over 4,000 characters is rejected and logged; the live skill is untouched', async () => {
    const huge = `${OLD}${'x'.repeat(4100)}\n`;
    const s = scenario({ deps: { drafter: { name: 'fake-writer', run: () => ({ ok: true, text: huge }) } } });
    const out = await s.run();
    assert.equal(out.promoted.length, 0);
    assert.equal(out.rejected.length, 1);
    assert.match(out.rejected[0].why, /chars \(limit 4000\)/);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
    assert.equal(s.calls.unasked.length + s.calls.bench.length, 0, 'a malformed draft never reaches Jev or the bench');
    const lines = lastLines(s.d);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].action, 'reject');
    assert.equal(lines[0].workflow, 'builder|fix-bug|skill-a');
  });

  it('a draft in the wrong format (no frontmatter) is rejected', async () => {
    const s = scenario({ deps: { drafter: { name: 'fake-writer', run: () => ({ ok: true, text: `# just prose\n\n${'a plain sentence. '.repeat(10)}` }) } } });
    const out = await s.run();
    assert.match(out.rejected[0].why, /no frontmatter/);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
  });

  it('a draft that wraps itself in a code fence is cleaned before it is checked', async () => {
    const s = scenario({ deps: { drafter: { name: 'fake-writer', run: () => ({ ok: true, text: `\`\`\`markdown\n${NEW}\`\`\`` }) } } });
    const out = await s.run();
    assert.equal(out.promoted.length, 1);
    assert.equal(fs.readFileSync(s.file, 'utf8'), `${NEW.trimEnd()}\n`);
  });

  it('code refuses a newly added "never" line before Jev is even asked', async () => {
    const s = scenario({ deps: { drafter: { name: 'fake-writer', run: () => ({ ok: true, text: `${NEW}5. Never merge without the owner.\n` }) } } });
    const out = await s.run();
    assert.equal(out.rejected.length, 1);
    assert.match(out.rejected[0].why, /stop word/);
    assert.equal(s.calls.unasked.length, 0);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
  });

  it('the unasked check blocks a draft that adds a new rule nobody asked for', async () => {
    const s = scenario({ deps: { unasked: async (a) => { s.calls.unasked.push(a); return { ok: true, untraceable: true, kind: 'new rule', quote: '4. Write down what you changed' }; } } });
    const out = await s.run();
    assert.equal(out.promoted.length, 0);
    assert.equal(out.rejected.length, 1);
    assert.equal(out.rejected[0].why, 'adds a new rule nobody asked for: 4. Write down what you changed');
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
    assert.equal(s.calls.bench.length, 0, 'the bench is not run for a draft that failed the unasked check');
    assert.equal(lastLines(s.d)[0].action, 'reject');
  });

  it('the real unasked check, through a mock Jev, rejects a draft that adds a gate (and sends only the added line)', async () => {
    const m = await startMockJev(() => ({ customer_stop: 0.1, new_rule: 0.95, traceable: 0.05 }));
    mocks.push(m);
    const gate = '4. Hold every release behind a sign-off step.';
    const s = scenario({ deps: { unasked: undefined, drafter: { name: 'fake-writer', run: () => ({ ok: true, text: `${OLD}${gate}\n` }) } } });
    delete s.deps.unasked;
    s.env.TYPESAFE_API_KEY = m.env.TYPESAFE_API_KEY;
    s.env.BGZFLOW_JEV_URL = m.env.BGZFLOW_JEV_URL;
    const out = await s.run();
    assert.equal(out.rejected.length, 1);
    assert.match(out.rejected[0].why, /^adds a new rule nobody asked for: /);
    assert.equal(m.calls.length, 1);
    assert.equal(m.calls[0].body.state.change, gate, 'only the new line is judged');
    assert.match(m.calls[0].body.state.asks, /reminder button/);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
  });

  it('a bench that is not better rejects the draft and keeps the old skill', async () => {
    const s = scenario({ deps: { bench: async () => ({ ok: true, pass: false, why: 'new is not better on Jev grade (0.8 vs 0.8)', cost_usd: 0.02 }) } });
    const out = await s.run();
    assert.equal(out.promoted.length, 0);
    assert.match(out.rejected[0].why, /^bench: new is not better/);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
    const lines = lastLines(s.d);
    assert.equal(lines[0].action, 'reject');
    assert.equal(lines[0].bench_cost_usd, 0.02);
    assert.equal(fs.existsSync(path.join(s.d, '.home', 'skill-history')), false, 'no backup for a swap that did not happen');
  });

  it('no bench cards means deferred (not promoted, not rejected, nothing logged)', async () => {
    const s = scenario({ deps: { cards: () => [] } });
    const out = await s.run();
    assert.equal(out.promoted.length, 0);
    assert.equal(out.rejected.length, 0);
    assert.equal(out.deferred.length, 1);
    assert.match(out.deferred[0].why, /no bench cards/);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
    assert.equal(fs.existsSync(changesPath(s.env)), false);
  });

  it('no asks text means deferred: an empty list would make everything look untraceable', async () => {
    const s = scenario();
    const out = await s.run({ asks: '' });
    assert.equal(out.deferred.length, 1);
    assert.match(out.deferred[0].why, /no asks text/);
    assert.equal(s.calls.unasked.length, 0);
  });

  it('Jev down for the match or the unasked check defers instead of promoting blind', async () => {
    const a = await scenario({ deps: { match: async () => ({ ok: false, err: 'timeout' }) } }).run();
    assert.match(a.deferred[0].why, /Jev match unavailable \(timeout\)/);
    const s = scenario({ deps: { unasked: async () => ({ ok: false, err: 'no_key' }) } });
    const b = await s.run();
    assert.match(b.deferred[0].why, /unasked check unavailable \(no_key\)/);
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
  });

  it('no second model to draft the text defers; a failed drafter is a logged rejection', async () => {
    const none = await scenario({ deps: { drafter: null } }).run();
    assert.match(none.deferred[0].why, /no second model/);
    const s = scenario({ deps: { drafter: { name: 'fake-writer', run: () => ({ ok: false, err: 'exit 1' }) } } });
    const failed = await s.run();
    assert.equal(failed.rejected[0].why, 'drafter failed: exit 1');
  });

  it('a candidate whose generated new-skill name already exists is deferred, not overwritten', async () => {
    // jobType "improve-test-exists" generates bg-improve-test-exists-workflow, which this test creates under skills/ then removes.
    const skillDir = path.join(ROOT, 'skills', 'bg-improve-test-exists-workflow');
    const existed = fs.existsSync(skillDir);
    assert.equal(existed, false, 'test precondition: the folder is not part of the repo');
    fs.mkdirSync(skillDir, { recursive: true });
    try {
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'keep me\n');
      const rows = [...many(3, { value: 0.9, jobType: 'improve-test-exists' }), ...chore(3, 0.5)];
      const s = scenario({ rows, deps: { match: async () => ({ ok: true, skill: 'new', confidence: 0.2, file: null }) } });
      const out = await s.run({ dry: true });
      assert.match(out.deferred[0].why, /already exists/);
      assert.equal(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'), 'keep me\n');
    } finally {
      removeDir(skillDir);
    }
  });

  it('a new skill (match says "new") is previewed under --dry without touching the repo skills folder', async () => {
    const rows = [...many(3, { value: 0.9, jobType: 'improve-test-fresh' }), ...chore(3, 0.5)];
    const gen = path.join(ROOT, 'skills', 'bg-improve-test-fresh-workflow');
    assert.equal(fs.existsSync(gen), false);
    const s = scenario({ rows, deps: { match: async () => ({ ok: true, skill: 'new', confidence: 0.2, file: null }), drafter: { name: 'fake-writer', run: () => ({ ok: true, text: NEW.replace('skill-target', 'bg-improve-test-fresh-workflow') }) } } });
    const out = await s.run({ dry: true });
    assert.equal(out.promoted.length, 1);
    assert.equal(out.promoted[0].skill, 'bg-improve-test-fresh-workflow');
    assert.equal(fs.existsSync(gen), false, 'dry never creates the skill');
  });

  it('the watch runs first: a promotion whose next 5 jobs scored lower is rolled back automatically, with a line', async () => {
    const s = scenario();
    const first = await s.run();
    assert.equal(first.promoted.length, 1);
    assert.equal(fs.readFileSync(s.file, 'utf8'), `${NEW.trimEnd()}\n`);
    // 5 later jobs that used the skill scored far below the 0.5 it had before.
    // (role "checker" so these low rows do not also lower the builder baseline and make another workflow a candidate)
    appendRows(s.d, Array.from({ length: 5 }, (_, i) => row({ t: `2026-10-12T00:00:0${i}.000Z`, value: 0.2, role: 'checker', jobType: 'misc', skills: ['skill-target'] })));
    const second = await s.run({ now: LATER });
    assert.equal(second.watched.length, 1);
    assert.equal(second.watched[0].state, 'rolled-back');
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD, 'the backup is live again without anyone asking');
    assert.equal(second.candidates, 0, 'the rolled-back workflow is not proposed again');
    const lines = lastLines(s.d);
    assert.deepEqual(lines.map((l) => l.action), ['promote', 'rollback']);
    assert.equal(lines[1].promotionId, lines[0].id);
    assert.match(lines[1].reason, /below the old 0\.5/);
  });

  it('--dry does not run the watch either (no restore, no line)', async () => {
    const s = scenario();
    await s.run();
    appendRows(s.d, Array.from({ length: 5 }, (_, i) => row({ t: `2026-10-12T00:00:0${i}.000Z`, value: 0.2, role: 'checker', jobType: 'misc', skills: ['skill-target'] })));
    const before = fs.readFileSync(changesPath(s.env), 'utf8');
    const out = await s.run({ now: LATER, dry: true });
    assert.deepEqual(out.watched, []);
    assert.equal(fs.readFileSync(s.file, 'utf8'), `${NEW.trimEnd()}\n`);
    assert.equal(fs.readFileSync(changesPath(s.env), 'utf8'), before);
  });

  it('one weekly summary line per ISO week goes to .bgzflow/lessons-notes.md', async () => {
    const s = scenario();
    const out = await s.run();
    assert.equal(out.summary_written, true);
    const notes = fs.readFileSync(path.join(s.d, '.bgzflow', 'lessons-notes.md'), 'utf8');
    assert.equal(notes, '- skills 2026-W41: 1 promoted, 0 rejected, 0 rolled back, 0 confirmed\n');
    assert.equal(writeWeeklySummary({ repo: s.d, changes: readChanges(s.env), now: NOW }), false, 'the same week is not written twice');
  });
});

// ---------------------------------------------------------------------------------------------- real drafter command
describe('the drafting model is never the model that did the work', () => {
  function drafterScript(d, draft) {
    write(d, 'draft.txt', draft);
    write(d, 'drafter.mjs', "import fs from 'node:fs';\nconst chunks = [];\nprocess.stdin.on('data', (c) => chunks.push(c));\nprocess.stdin.on('end', () => {\n  fs.writeFileSync(process.argv[2], Buffer.concat(chunks));\n  process.stdout.write(fs.readFileSync(process.argv[3], 'utf8'));\n});\n");
    return `"${process.execPath}" "${path.join(d, 'drafter.mjs')}" "${path.join(d, 'prompt.txt')}" "${path.join(d, 'draft.txt')}"`;
  }
  // The custom drafter is an Anthropic model; the default rows were done by codex (OpenAI).
  const customEnv = (cmd, name, vendor = 'anthropic') => ({ BGZFLOW_DRAFTER_CMD: cmd, BGZFLOW_DRAFTER_NAME: name, BGZFLOW_DRAFTER_VENDOR: vendor });

  it('BGZFLOW_DRAFTER_CMD reads the prompt on stdin and its stdout becomes the draft', async () => {
    const s = scenario({ deps: { drafter: undefined } });
    delete s.deps.drafter;
    const cmd = drafterScript(s.d, NEW);
    Object.assign(s.env, customEnv(cmd, 'writer-x'));
    const out = await withoutModelClis(() => s.run());
    assert.equal(out.promoted.length, 1);
    assert.equal(lastLines(s.d)[0].drafter, 'writer-x');
    const prompt = fs.readFileSync(path.join(s.d, 'prompt.txt'), 'utf8');
    assert.match(prompt, /Update this skill so it also captures the workflow/);
    assert.ok(prompt.includes(OLD));
  });

  it('a drafter from the same vendor as the worker is skipped, and with no other vendor the step is deferred', async () => {
    const rows = [...many(3, { value: 0.9, worker: 'claude-sonnet' }), ...chore(3, 0.6, { worker: 'codex' }), ...many(2, { value: 0.5, jobType: 'misc', skills: ['skill-target'], worker: 'codex' })];
    const s = scenario({ rows });
    delete s.deps.drafter;
    const cmd = drafterScript(s.d, NEW);
    Object.assign(s.env, customEnv(cmd, 'writer-x', 'anthropic'));
    const out = await withoutModelClis(() => s.run());
    assert.equal(out.promoted.length, 0);
    assert.equal(out.deferred.length, 1);
    assert.match(out.deferred[0].why, /no drafter from another vendor: writer-x is anthropic, same as the worker/);
    assert.equal(fs.existsSync(path.join(s.d, 'prompt.txt')), false, 'the same-vendor model was never run');
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
  });

  it('--worker names the model that failed or did the work and its vendor is excluded the same way', async () => {
    const s = scenario();
    delete s.deps.drafter;
    Object.assign(s.env, customEnv(drafterScript(s.d, NEW), 'writer-x', 'anthropic'));
    const out = await withoutModelClis(() => s.run({ worker: 'Opus-5' }));
    assert.match(out.deferred[0].why, /same as the worker/);
  });

  it('a worker whose vendor is unknown defers: no drafter can be shown to be different', async () => {
    const s = scenario();
    delete s.deps.drafter;
    Object.assign(s.env, customEnv(drafterScript(s.d, NEW), 'writer-x', 'anthropic'));
    const out = await withoutModelClis(() => s.run({ worker: 'mystery-model' }));
    assert.equal(out.promoted.length, 0);
    assert.match(out.deferred[0].why, /vendor unknown for worker mystery-model/);
    assert.equal(fs.existsSync(path.join(s.d, 'prompt.txt')), false);
  });
});

// ---------------------------------------------------------------------------------------------- fixes for 0.6.0
describe('rollback safety (B8, tasks 6 and 14)', () => {
  const after5 = (vals, skill = 'skill-target') => vals.map((value, i) => row({ t: `2026-10-10T00:00:0${i}.000Z`, value, skills: [skill] }));

  it('before restoring, the live file is copied to skill-history, and the restore leaves no temp file', () => {
    const d = scratch();
    const env = homeEnv(d);
    const file = write(d, 'skills/skill-target/SKILL.md', OLD);
    const swap = swapIn({ file, text: NEW, skill: 'skill-target', env, now: NOW });
    const p = { t: NOW.toISOString(), action: 'promote', id: 'p1', skill: 'skill-target', file, backup: swap.backup, hash: swap.hash, created: false, oldAverage: 0.7 };
    const out = watchResults({ changes: [p], rows: after5([0.1, 0.1, 0.1, 0.1, 0.1]), env, now: LATER });
    assert.equal(out[0].state, 'rolled-back');
    assert.equal(fs.readFileSync(file, 'utf8'), OLD);
    const saved = lastLines(d)[0].saved;
    assert.match(path.basename(saved), /-before-rollback\.md$/);
    assert.equal(fs.readFileSync(saved, 'utf8'), `${NEW.trimEnd()}\n`, 'the text that was live is kept');
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['SKILL.md'], 'no .tmp file is left behind');
  });

  it('a live file edited after the promotion is a conflict: recorded, not restored, and not judged again', () => {
    const d = scratch();
    const env = homeEnv(d);
    const file = write(d, 'skills/skill-target/SKILL.md', OLD);
    const swap = swapIn({ file, text: NEW, skill: 'skill-target', env, now: NOW });
    fs.writeFileSync(file, `${NEW}5. Someone's own later edit.\n`);
    const p = { t: NOW.toISOString(), action: 'promote', id: 'p1', skill: 'skill-target', file, backup: swap.backup, hash: swap.hash, created: false, oldAverage: 0.7 };
    const rows = after5([0.1, 0.1, 0.1, 0.1, 0.1]);
    const out = watchResults({ changes: [p], rows, env, now: LATER });
    assert.equal(out[0].state, 'conflict');
    assert.equal(fs.readFileSync(file, 'utf8'), `${NEW}5. Someone's own later edit.\n`, 'the edited file is left as it is');
    const line = lastLines(d)[0];
    assert.equal(line.action, 'conflict');
    assert.equal(line.restored, false);
    assert.match(line.why, /changed after the promotion/);
    assert.deepEqual(watchResults({ changes: readChanges(env).concat([p]), rows, env, now: LATER }), []);
  });

  it('two promotions of one skill roll back newest first, so both restore cleanly back to the original', () => {
    const d = scratch();
    const env = homeEnv(d);
    const file = write(d, 'skills/skill-target/SKILL.md', OLD);
    const t1 = new Date('2026-10-09T09:00:00Z');
    const t2 = new Date('2026-10-09T09:30:00Z');
    const s1 = swapIn({ file, text: NEW, skill: 'skill-target', env, now: t1 });
    const V3 = `${NEW}5. Version three.\n`;
    const s2 = swapIn({ file, text: V3, skill: 'skill-target', env, now: t2 });
    const p1 = { t: t1.toISOString(), action: 'promote', id: 'p1', skill: 'skill-target', file, backup: s1.backup, hash: s1.hash, created: false, oldAverage: 0.7 };
    const p2 = { t: t2.toISOString(), action: 'promote', id: 'p2', skill: 'skill-target', file, backup: s2.backup, hash: s2.hash, created: false, oldAverage: 0.7 };
    const out = watchResults({ changes: [p1, p2], rows: after5([0.1, 0.1, 0.1, 0.1, 0.1]), env, now: LATER });
    assert.deepEqual(out.map((o) => [o.id, o.state]), [['p2', 'rolled-back'], ['p1', 'rolled-back']]);
    assert.equal(fs.readFileSync(file, 'utf8'), OLD);
  });

  it('one promotion per skill per pass: a second workflow for the same skill waits', async () => {
    const rows = [...storyRows(), ...many(3, { value: 0.95, jobType: 'review', skills: ['skill-c'] })];
    const s = scenario({ rows });
    const out = await s.run();
    assert.equal(out.candidates, 2);
    assert.equal(out.promoted.length, 1);
    assert.equal(out.deferred.length, 1);
    assert.match(out.deferred[0].why, /already promoted in this pass/);
    assert.equal(lastLines(s.d).filter((l) => l.action === 'promote').length, 1);
  });

  it('the promote line stores the hash and the text of the promoted version, and the hash matches the live file', async () => {
    const s = scenario();
    await s.run();
    const p = lastLines(s.d).find((l) => l.action === 'promote');
    assert.equal(p.text, `${NEW.trimEnd()}\n`);
    assert.equal(p.hash, textHash(fs.readFileSync(s.file, 'utf8')));
    assert.equal(fs.readFileSync(p.promotedCopy, 'utf8'), p.text);
  });
});

describe('sandbox and dry run (B9, task 7)', () => {
  it('--dry skips the bench: no bench call, no runner, nothing written', async () => {
    const s = scenario();
    const out = await s.run({ dry: true });
    assert.equal(s.calls.bench.length, 0);
    assert.equal(out.promoted.length, 1);
    assert.equal(out.promoted[0].would, true);
    assert.equal(out.promoted[0].bench, 'skipped (dry run)');
    assert.equal(fs.readFileSync(s.file, 'utf8'), OLD);
    assert.equal(fs.existsSync(changesPath(s.env)), false);
  });
});

describe('promotions never write into the installed plugin (task 16)', () => {
  it('isInstalled() knows ~/.claude/bgzflow-plugin, plugin caches, BGZFLOW_INSTALL_DIRS and versioned folders', () => {
    const home = path.join(path.sep, 'h');
    const env = { USERPROFILE: home, BGZFLOW_INSTALL_DIRS: path.join(path.sep, 'opt', 'bgz') };
    assert.equal(isInstalled(path.join(home, '.claude', 'bgzflow-plugin', 'skills', 'a', 'SKILL.md'), env), true);
    assert.equal(isInstalled(path.join(home, '.claude', 'plugins', 'cache', 'x', 'SKILL.md'), env), true);
    assert.equal(isInstalled(path.join(path.sep, 'opt', 'bgz', 'skills', 'a', 'SKILL.md'), env), true);
    assert.equal(isInstalled(path.join(path.sep, 'p', 'bgzflow', '0.6.0', 'skills', 'a', 'SKILL.md'), env), true);
    assert.equal(isInstalled(path.join(path.sep, 'src', 'bgzflow', 'skills', 'a', 'SKILL.md'), env), false);
  });

  it('skillsTarget(): BGZFLOW_SKILLS_DIR wins unless it is itself an install; otherwise the source repo or overlay', () => {
    const d = scratch();
    assert.deepEqual(skillsTarget({ ...homeEnv(d), BGZFLOW_SKILLS_DIR: path.join(d, 'mine') }), { dir: path.join(d, 'mine'), kind: 'configured' });
    const t = skillsTarget({ ...homeEnv(d), USERPROFILE: d, HOME: d, BGZFLOW_SKILLS_DIR: path.join(d, '.claude', 'bgzflow-plugin', 'skills') });
    assert.notEqual(t.kind, 'configured');
    assert.equal(isInstalled(t.dir, { USERPROFILE: d, HOME: d }), false);
  });

  it('a skill that lives in the install is read there, written to the overlay, and the installed file is untouched', async () => {
    const s = scenario();
    Object.assign(s.env, { USERPROFILE: s.d, HOME: s.d });
    const installed = write(s.d, '.claude/bgzflow-plugin/skills/skill-target/SKILL.md', OLD);
    const overlay = path.join(s.d, 'overlay');
    s.deps.match = async () => ({ ok: true, skill: 'skill-target', confidence: 0.9, file: installed });
    s.deps.target = { dir: overlay, kind: 'overlay' };
    const out = await s.run();
    assert.equal(out.promoted.length, 1);
    assert.equal(fs.readFileSync(installed, 'utf8'), OLD, 'the install is never written');
    const written = path.join(overlay, 'skill-target', 'SKILL.md');
    assert.equal(fs.readFileSync(written, 'utf8'), `${NEW.trimEnd()}\n`);
    const p = lastLines(s.d).find((l) => l.action === 'promote');
    assert.equal(p.file, written);
    assert.equal(p.source, installed);
    assert.equal(fs.readFileSync(p.backup, 'utf8'), OLD, 'the old text is still backed up');
  });

  it('swapIn() refuses an installed path outright', () => {
    const d = scratch();
    const env = { ...homeEnv(d), USERPROFILE: d, HOME: d };
    const file = write(d, '.claude/bgzflow-plugin/skills/x/SKILL.md', OLD);
    assert.throws(() => swapIn({ file, text: NEW, skill: 'x', env }), /installed plugin/);
    assert.equal(fs.readFileSync(file, 'utf8'), OLD);
  });

  it('listSkills() lists the overlay first, so a promoted overlay copy wins over the installed one', () => {
    const d = scratch();
    const env = { ...homeEnv(d), USERPROFILE: d, HOME: d };
    write(d, '.home/skills-overlay/zz-overlay-test/SKILL.md', '---\nname: zz-overlay-test\ndescription: overlay copy\n---\n');
    write(d, '.claude/skills/zz-overlay-test/SKILL.md', '---\nname: zz-overlay-test\ndescription: personal copy\n---\n');
    const hit = listSkills({ env }).find((s) => s.name === 'zz-overlay-test');
    assert.equal(hit.description, 'overlay copy');
    assert.equal(hit.file, path.join(overlayDir(env), 'zz-overlay-test', 'SKILL.md'));
  });
});

describe('ledgers and prompts are sanitized (B5)', () => {
  const SECRET = 'api_key=Zx9QwErTy7UiOp3AsDfGh';
  const EMAIL = ['jane.doe', 'gmail.com'].join('@');

  it('steps and the current skill text are sanitized again before they reach the drafter', () => {
    const cand = { jobType: 'fix-bug', role: 'builder', average: 0.9, baseline: 0.6, rows: [row({ steps: [`call the API with ${SECRET}`, 'run the tests'] })] };
    const prompt = draftPrompt({ cand, name: 'skill-target', oldText: `${OLD}Mail ops at ${EMAIL}\n` });
    assert.ok(!prompt.includes('Zx9QwErTy7UiOp3AsDfGh'), 'the key value is masked');
    assert.ok(!prompt.includes(EMAIL), 'the email is masked');
  });

  it('a secret in the drafted text never reaches the skill file or skill-changes.jsonl', async () => {
    const s = scenario({ deps: { drafter: { name: 'fake-writer', run: () => ({ ok: true, text: `${NEW}5. Call the API with ${SECRET} when asked.\n` }) } } });
    const out = await s.run();
    assert.equal(out.promoted.length, 1);
    assert.ok(!fs.readFileSync(s.file, 'utf8').includes('Zx9QwErTy7UiOp3AsDfGh'));
    assert.ok(!fs.readFileSync(changesPath(s.env), 'utf8').includes('Zx9QwErTy7UiOp3AsDfGh'));
  });
});

describe('neutral owner wording and a configurable decisions file (task 22)', () => {
  it('--asks wins; otherwise BGZFLOW_DECISIONS_FILE; otherwise nothing', () => {
    assert.equal(asksSpec({ asks: 'a.md,b.md' }, { BGZFLOW_DECISIONS_FILE: 'd.md' }), 'a.md,b.md');
    assert.equal(asksSpec({}, { BGZFLOW_DECISIONS_FILE: 'd.md' }), 'd.md');
    assert.equal(asksSpec({}, {}), '');
  });

  it('with no asks the deferral names the decisions file setting, not a person', async () => {
    const s = scenario();
    const out = await improve({ env: s.env, repo: s.d, asks: '', deps: s.deps, now: NOW });
    assert.match(out.deferred[0].why, /BGZFLOW_DECISIONS_FILE/);
    assert.doesNotMatch(out.deferred[0].why, /\b[A-Z]{4,}\.md\b/);
  });
});

// ---------------------------------------------------------------------------------------------- CLI
describe('bgz jev improve (command line)', () => {
  it('--dry on an empty history says so and writes nothing', async () => {
    const d = scratch();
    const r = await runNode([BGZ, 'jev', 'improve', '--dry', '--repo', d], { project: d, env: homeEnv(d) });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.dry, true);
    assert.equal(r.json.candidates, 0);
    assert.deepEqual(r.json.promoted, []);
    assert.equal(fs.existsSync(path.join(d, '.home', 'skill-changes.jsonl')), false);
  });

  it('a workflow that qualifies but has no key for Jev is deferred (the match needs Jev), never promoted blind', async () => {
    const d = scratch();
    writeRows(d, [...many(3, { value: 0.9 }), ...chore(3, 0.6)]);
    const r = await runNode([BGZ, 'jev', 'improve', '--repo', d], { project: d, env: homeEnv(d) });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.candidates, 1);
    assert.deepEqual(r.json.promoted, []);
    assert.equal(r.json.deferred.length, 1);
    assert.match(r.json.deferred[0].why, /Jev match unavailable/);
    assert.equal(fs.existsSync(path.join(d, '.home', 'skill-changes.jsonl')), false);
  });
});

describe('isoWeek()', () => {
  it('names the ISO week, including the year-boundary cases', () => {
    assert.equal(isoWeek(new Date('2026-10-09T10:00:00Z')), '2026-W41');
    assert.equal(isoWeek(new Date('2026-01-01T00:00:00Z')), '2026-W01');
    assert.equal(isoWeek(new Date('2024-12-30T00:00:00Z')), '2025-W01');
    assert.equal(isoWeek(new Date('2021-01-03T00:00:00Z')), '2020-W53');
  });
});
