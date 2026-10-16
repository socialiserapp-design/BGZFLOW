// Offline tests for `bgz jev plan` (tools/jev/plan.mjs): a plan is split into items and each item goes through the same
// "unasked" judgement as a diff. The judge is a stub (deps.check) for the logic and a loopback mock Jev for the command line;
// nothing here reaches the real Jev. BGZFLOW_HOME is a scratch folder.
import assert from 'node:assert/strict';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, makeProject, removeDir, runNode, startMockJev, write } from '../../../hooks/test/helpers.mjs';
import { MAX_ITEMS, MIN_ITEM_CHARS, PLAN_CONCURRENCY, checkPlan, splitPlan } from '../plan.mjs';
import { UNASKED_QUESTIONS } from '../review.mjs';

const CLI = path.join(ROOT, 'tools', 'jev', 'cli.mjs');
const dirs = [];
const mocks = [];
const scratch = () => {
  const d = makeProject('jevplan');
  dirs.push(d);
  return d;
};
const mock = async (reply, opts) => {
  const m = await startMockJev(reply, opts);
  mocks.push(m);
  return m;
};
const homeEnv = (d, m) => ({ ...(m ? m.env : {}), BGZFLOW_HOME: path.join(d, '.home'), FAST_JEV_KEY_FILE: path.join(d, 'no-such-key-file') });
const cli = (args, d, m, extra = {}) => runNode([CLI, ...args], { project: d, env: { ...homeEnv(d, m), ...extra } });
after(async () => {
  for (const m of mocks) await m.close();
  for (const d of dirs) removeDir(d);
});

// A stub judge with the shape of checkUnasked: items mentioning a marker are untraceable, with that marker's confidence.
const verdicts = { LIMIT: 0.9, RULE: 0.7 };
const judge = (calls = []) => async (args) => {
  calls.push(args);
  const hit = Object.keys(verdicts).find((k) => args.change.includes(k));
  if (!hit) return { ok: true, untraceable: false, kind: 'new rule', hit: 0.1, traceable: 0.9, confidence: 0.1 };
  return { ok: true, untraceable: true, kind: hit === 'LIMIT' ? 'customer-facing stop' : 'new rule', hit: verdicts[hit], traceable: 0.1, confidence: verdicts[hit] };
};

describe('splitPlan: items of a plan', () => {
  it('takes numbered and bulleted lines one by one, with the line each starts on', () => {
    const items = splitPlan(['1. Build the reminder button', '2) Add a settings page for it', '- Write the tests first', '  * Cover the empty state too'].join('\n'));
    assert.deepEqual(items, [
      { line: 1, text: 'Build the reminder button' },
      { line: 2, text: 'Add a settings page for it' },
      { line: 3, text: 'Write the tests first' },
      { line: 4, text: 'Cover the empty state too' },
    ]);
  });

  it('takes a heading with the text under it as one item, and each paragraph as its own', () => {
    const items = splitPlan(['# Reminder feature plan', '', '## Free plan limit', 'Free users can send three reminders a day.', 'After that they wait.', '', 'A plain paragraph that spans', 'two lines of the plan.'].join('\n'));
    assert.deepEqual(items, [
      { line: 1, text: 'Reminder feature plan' },
      { line: 3, text: 'Free plan limit Free users can send three reminders a day. After that they wait.' },
      { line: 7, text: 'A plain paragraph that spans two lines of the plan.' },
    ]);
  });

  it('keeps a wrapped bullet together and ends a bullet at a blank line', () => {
    const items = splitPlan('- Send the reminder\n  at the chosen time\n\nThen close the ticket in the tracker');
    assert.deepEqual(items.map((i) => i.text), ['Send the reminder at the chosen time', 'Then close the ticket in the tracker']);
  });

  it('skips blank lines, very short lines, rules and fenced code, and drops checkboxes', () => {
    const items = splitPlan(['## Steps', '', '---', '- [ ] Draft the copy for the empty state', '- [x] Pick the colours', '- ok', '```js', 'const hidden = "not a plan item";', '```', 'Ship it behind the usual switch'].join('\n'));
    assert.deepEqual(items.map((i) => i.text), ['Draft the copy for the empty state', 'Pick the colours', 'Ship it behind the usual switch']);
    assert.ok(items.every((i) => i.text.length >= MIN_ITEM_CHARS));
  });

  it('reads Windows line endings and an empty plan', () => {
    assert.deepEqual(splitPlan('- First item here\r\n- Second item here\r\n').map((i) => i.text), ['First item here', 'Second item here']);
    assert.deepEqual(splitPlan(''), []);
    assert.deepEqual(splitPlan(undefined), []);
  });
});

describe('checkPlan: untraceable plan items', () => {
  const PLAN = ['1. Build the reminder button', '2. Add a daily LIMIT so free users stop at three', '3. Add a RULE that nobody ships on Fridays', '4. Write the tests'].join('\n');

  it('lists the items the asks do not cover, strongest first, and leaves the traceable ones out', async () => {
    const d = scratch();
    const calls = [];
    const r = await checkPlan({ plan: PLAN, asks: '# DECISIONS.md\nBuild a reminder button.', file: 'plan.md', env: homeEnv(d), deps: { check: judge(calls) } });
    assert.equal(r.ok, true);
    assert.equal(r.checked, 4);
    assert.deepEqual(r.gaps, []);
    assert.deepEqual(r.untraceable.map((i) => [i.line, i.kind, i.confidence]), [
      [2, 'customer-facing stop', 0.9],
      [3, 'new rule', 0.7],
    ]);
    assert.match(r.untraceable[0].item, /daily LIMIT/);
    assert.equal(r.untraceable[0].traceable, 0.1);
    assert.match(r.note, /lead decides/);
    assert.match(r.note, /never blocks/);
    assert.equal(calls.length, 4);
    assert.ok(calls.every((c) => c.asks.includes('Build a reminder button.')), 'every item is judged against the asks');
    assert.match(calls[1].change, /daily LIMIT/);
    assert.equal(calls[0].file, 'plan.md');
  });

  it('a plan whose items are all traceable has an empty list', async () => {
    const d = scratch();
    const r = await checkPlan({ plan: '- Build the reminder button\n- Write the tests', asks: 'Build a reminder button.', env: homeEnv(d), deps: { check: judge() } });
    assert.equal(r.ok, true);
    assert.equal(r.checked, 2);
    assert.deepEqual(r.untraceable, []);
    assert.deepEqual(r.gaps, []);
  });

  it('a plan with nothing to check is ok and calls nothing', async () => {
    const d = scratch();
    const calls = [];
    const r = await checkPlan({ plan: '\n---\n\n', asks: 'asks', env: homeEnv(d), deps: { check: judge(calls) } });
    assert.equal(r.ok, true);
    assert.equal(r.checked, 0);
    assert.match(r.note, /no plan items/);
    assert.equal(calls.length, 0);
  });

  it('no asks text gives a clear message and no judge call', async () => {
    const d = scratch();
    const calls = [];
    for (const asks of ['', '   ', undefined]) {
      const r = await checkPlan({ plan: PLAN, asks, env: homeEnv(d), deps: { check: judge(calls) } });
      assert.equal(r.ok, false);
      assert.match(r.err, /no asks text/);
      assert.match(r.err, /--asks/);
    }
    assert.equal(calls.length, 0);
  });

  it('a Jev failure on every item is ok:false (the caller carries on without it); on some items it is a gap', async () => {
    const d = scratch();
    const down = await checkPlan({ plan: PLAN, asks: 'asks', env: homeEnv(d), deps: { check: async () => ({ ok: false, err: 'jev unavailable' }) } });
    assert.equal(down.ok, false);
    assert.deepEqual(down.untraceable, []);
    assert.equal(down.gaps.length, 4);
    assert.match(down.err, /jev unavailable/);

    const part = await checkPlan({ plan: PLAN, asks: 'asks', env: homeEnv(d), deps: { check: async (a) => (a.change.includes('tests') ? { ok: false, err: 'timeout' } : judge()(a)) } });
    assert.equal(part.ok, true);
    assert.equal(part.gaps.length, 1);
    assert.equal(part.gaps[0].line, 4);
    assert.equal(part.gaps[0].error, 'timeout');
    assert.equal(part.untraceable.length, 2, 'the items that were checked still count');
  });

  it('a judge that throws is a gap, not a crash', async () => {
    const d = scratch();
    const r = await checkPlan({ plan: PLAN, asks: 'asks', env: homeEnv(d), deps: { check: async () => { throw new Error('boom'); } } });
    assert.equal(r.ok, false);
    assert.equal(r.gaps.length, 4);
    assert.match(r.gaps[0].error, /boom/);
  });

  it('runs a few items at a time, never more than the limit', async () => {
    const d = scratch();
    let live = 0;
    let most = 0;
    const plan = Array.from({ length: 12 }, (_, i) => `- Plan item number ${i + 1} to check`).join('\n');
    const r = await checkPlan({
      plan,
      asks: 'asks',
      env: homeEnv(d),
      deps: {
        check: async (a) => {
          live += 1;
          most = Math.max(most, live);
          await new Promise((resolve) => setTimeout(resolve, 5));
          live -= 1;
          return judge()(a);
        },
      },
    });
    assert.equal(r.checked, 12);
    assert.ok(most > 1 && most <= PLAN_CONCURRENCY, `most in flight: ${most}`);
  });

  it('checks a long plan up to the cap and says how many it left', async () => {
    const d = scratch();
    const calls = [];
    const plan = Array.from({ length: MAX_ITEMS + 5 }, (_, i) => `- Plan item number ${i + 1} to check`).join('\n');
    const r = await checkPlan({ plan, asks: 'asks', env: homeEnv(d), deps: { check: judge(calls) } });
    assert.equal(r.checked, MAX_ITEMS);
    assert.equal(r.skipped, 5);
    assert.equal(calls.length, MAX_ITEMS);
  });
});

describe('bgz jev plan: command line', () => {
  const PLAN = '1. Build the reminder button\n2. Add a daily LIMIT so free users stop at three\n3. Write the tests\n';
  const reply = (body) => (String(body.state.change).includes('LIMIT') ? { customer_stop: 0.9, new_rule: 0.05, traceable: 0.1 } : {});

  it('prints the untraceable items and reads --asks relative to the project', async () => {
    const d = scratch();
    write(d, 'plan.md', PLAN);
    write(d, 'DECISIONS.md', '# Owner asks\nBuild a reminder button.\n');
    const m = await mock(reply);
    const r = await cli(['plan', '--plan', 'plan.md', '--asks', 'DECISIONS.md'], d, m);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.checked, 3);
    assert.deepEqual(r.json.untraceable.map((i) => [i.line, i.kind]), [[2, 'customer-facing stop']]);
    assert.match(r.json.untraceable[0].item, /daily LIMIT/);
    assert.equal(m.calls.length, 3);
    const body = m.calls.find((c) => c.body.state.change.includes('LIMIT')).body;
    assert.deepEqual(Object.keys(body.questions), Object.keys(UNASKED_QUESTIONS), 'the same three questions as unasked');
    assert.match(body.state.asks, /^# DECISIONS\.md\n# Owner asks\nBuild a reminder button\./);
  });

  it('without --asks it finds DECISIONS.md the way unasked does, or the file BGZFLOW_DECISIONS_FILE names', async () => {
    const d = scratch();
    write(d, 'plan.md', PLAN);
    write(d, 'DECISIONS.md', 'Build a reminder button.\n');
    write(d, path.join('notes', 'owner-calls.md'), 'Build a reminder button and a settings page.\n');
    const m = await mock(reply);
    const found = await cli(['plan', '--plan', 'plan.md'], d, m);
    assert.equal(found.status, 0, found.stderr);
    assert.match(m.calls[m.calls.length - 1].body.state.asks, /^# DECISIONS\.md\n/);
    const named = await cli(['plan', '--plan', 'plan.md'], d, m, { BGZFLOW_DECISIONS_FILE: path.join('notes', 'owner-calls.md') });
    assert.equal(named.status, 0, named.stderr);
    assert.match(m.calls[m.calls.length - 1].body.state.asks, /^# owner-calls\.md\n/);
  });

  it('no asks anywhere exits 1 with a clear message and sends nothing', async () => {
    const d = scratch();
    write(d, 'plan.md', PLAN);
    const m = await mock(reply);
    const r = await cli(['plan', '--plan', 'plan.md'], d, m, { BGZFLOW_DECISIONS_FILE: 'no-such-decisions.md' });
    assert.equal(r.status, 1);
    assert.equal(r.json.ok, false);
    assert.match(r.json.err, /no asks text/);
    assert.equal(m.calls.length, 0);
  });

  it('a Jev outage exits 1 with ok:false, so the caller carries on once without it', async () => {
    const d = scratch();
    write(d, 'plan.md', PLAN);
    write(d, 'DECISIONS.md', 'Build a reminder button.\n');
    const m = await mock(() => ({}), { status: 500 });
    const r = await cli(['plan', '--plan', 'plan.md', '--asks', 'DECISIONS.md'], d, m);
    assert.equal(r.status, 1);
    assert.equal(r.json.ok, false);
    assert.deepEqual(r.json.untraceable, []);
    assert.ok(r.json.gaps.length >= 1);
  });

  it('bad usage exits 2: no --plan, an unreadable plan, or a secret file named as the plan', async () => {
    const d = scratch();
    write(d, 'DECISIONS.md', 'Build a reminder button.\n');
    write(d, '.env', 'PLAN=do the thing\n');
    const m = await mock(reply);
    const none = await cli(['plan', '--asks', 'DECISIONS.md'], d, m);
    assert.equal(none.status, 2);
    assert.match(none.stderr, /--plan <file> is required/);
    const missing = await cli(['plan', '--plan', 'no-such-plan.md', '--asks', 'DECISIONS.md'], d, m);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /cannot read --plan/);
    const secret = await cli(['plan', '--plan', '.env', '--asks', 'DECISIONS.md'], d, m);
    assert.equal(secret.status, 2);
    assert.equal(m.calls.length, 0, 'nothing was sent for any of these');
  });

  it('the usage text names the command and its options', async () => {
    const d = scratch();
    const r = await cli(['--help'], d);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /^ {2}plan --plan <plan file> \[--asks /m);
    assert.match(r.stdout, /never a block/);
  });
});
