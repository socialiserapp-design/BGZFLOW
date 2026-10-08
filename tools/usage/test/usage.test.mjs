import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { classifyUser, collectUsage, formatUsage, percentile, splitOutput } from '../usage.mjs';

const cli = fileURLToPath(new URL('../usage.mjs', import.meta.url));
const root = fileURLToPath(new URL('./fixtures/claude', import.meta.url));
const codex = fileURLToPath(new URL('./fixtures/codex', import.meta.url));
const windowed = { root, codex, since: '2026-10-05T00:00:00Z', until: '2026-10-06T00:00:00Z' };
const row = (r, source, project, model) => r.rows.find((x) => x.source === source && x.project === project && x.model === model);

test('Claude rows: one turn per response, measured thinking, char-length split of the rest', async () => {
  const r = await collectUsage(windowed);
  const a = row(r, 'claude', 'proj-a', 'm-a');
  assert.equal(a.turns, 2, 'split lines and a resumed copy count once; synthetic replies are skipped');
  assert.equal(a.output, 120);
  assert.equal(a.input, 15);
  assert.equal(a.cacheRead, 3000);
  assert.equal(a.cacheWrite, 200);
  assert.equal(a.split.thinking, 40);
  assert.equal(a.split.thinkingEstimated, 0);
  // visible 60 split by characters: text 60 chars vs Bash input 21 chars; the Write response is all tool input.
  assert.equal(a.split.text, Math.round((60 * 60) / 81));
  assert.equal(a.split.toolInput, Math.round(20 + (60 * 21) / 81));
  assert.deepEqual(a.topTools.map((t) => [t.name, t.tokens, t.calls]), [['Write', 20, 1], ['Bash', 16, 1]]);
  assert.deepEqual(a.outputPerTurn, { median: 20, p90: 100 });
  assert.ok(Math.abs(a.cacheReadShare - 3000 / 3215) < 1e-9);
});

test('subagent files count under their project; unrecorded thinking is estimated from characters', async () => {
  const r = await collectUsage(windowed);
  const b = row(r, 'claude', 'proj-a', 'm-b');
  assert.equal(b.turns, 1);
  assert.equal(b.split.thinking, 30);
  assert.equal(b.split.thinkingEstimated, 30);
  assert.equal(b.split.text, 30);
  assert.equal(row(r, 'claude', 'proj-b', 'm-a').output, 10, 'a torn last line is skipped');
});

test('Codex rows use each new token count once, with uncached input and measured reasoning', async () => {
  const r = await collectUsage(windowed);
  const c = row(r, 'codex', 'codex-proj', 'gpt-x');
  assert.equal(c.turns, 2);
  assert.equal(c.output, 30);
  assert.equal(c.input, 40);
  assert.equal(c.cacheRead, 80);
  assert.equal(c.split.thinking, 5);
  assert.equal(c.split.unsplit, 25);
});

test('wakes: typed vs notices vs agent messages; the time window applies', async () => {
  const r = await collectUsage(windowed);
  assert.deepEqual(r.wakes, { typed: 1, notice: 1, agent: 2, other: 1, wokenShare: 0.75 });
  assert.equal(r.total.turns, 6);
  assert.equal(r.total.output, 220);
  assert.equal(r.topTools[0].name, 'Write');
  const all = await collectUsage({ root, codex: null });
  assert.equal(all.wakes.typed, 2);
  assert.equal(all.total.output, 190 + 999);
});

test('classification and helpers', () => {
  assert.equal(classifyUser({ message: { content: [{ type: 'tool_result', content: 'x' }] } }, false), null);
  assert.equal(classifyUser({ isMeta: true, message: { content: 'x' } }, false), null);
  assert.equal(classifyUser({ message: { content: '<scheduled-task>x' } }, false), 'notice');
  assert.equal(classifyUser({ message: { content: '<command-name>/clear</command-name>' } }, false), 'typed');
  assert.equal(percentile([], 90), 0);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90), 9);
  const s = splitOutput({ output: 10, hasThinking: false, thinkingChars: 0, textChars: 0, tools: [] });
  assert.equal(s.text, 10);
});

test('cli prints a short table by default and JSON with --json; bad dates exit 2', () => {
  const args = ['--root', root, '--codex', codex, '--since', windowed.since, '--until', windowed.until];
  const t = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(t.status, 0, t.stderr);
  assert.match(t.stdout, /proj-a/);
  assert.match(t.stdout, /estimate/);
  assert.match(t.stdout, /wakes: typed 1, notices 1, agent messages 2 \(75% not typed\)/);
  assert.ok(t.stdout.split('\n').length < 20);
  const j = spawnSync(process.execPath, [cli, ...args, '--json'], { encoding: 'utf8' });
  assert.equal(JSON.parse(j.stdout).total.turns, 6);
  const bad = spawnSync(process.execPath, [cli, '--root', root, '--since', 'yesterday-ish'], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.equal(typeof formatUsage, 'function');
});
