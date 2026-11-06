import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captureEvent } from '../continuity.mjs';
import { readProjectRecall, renderProjectRecall } from '../project-recall.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-project-recall-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const projectRoot = path.join(root, 'project'); fs.mkdirSync(projectRoot);
  const otherProject = path.join(root, 'other'); fs.mkdirSync(otherProject);
  const transcriptRoot = path.join(root, 'transcripts'); fs.mkdirSync(transcriptRoot);
  // Use a native transcript filename: arbitrary text paths intentionally pass
  // through credential redaction, including random-looking parent directories.
  const transcript = path.join(transcriptRoot, 'transcript.jsonl'); fs.writeFileSync(transcript, 'original host data');
  let tick = 0;
  const options = { storageRoot: path.join(root, 'store'), transcriptRoots: [transcriptRoot], now: () => new Date(Date.UTC(2026, 10, 4, 12, 0, tick++)).toISOString() };
  const record = (input, project = projectRoot) => captureEvent({ cwd: project, session_id: 'provider-a', ...input }, options);
  const recall = (extra = {}, config = {}) => readProjectRecall({ projectRoot, sessionId: 'provider-b', query: 'calendar', ...extra }, { ...options, ...config });
  return { root, projectRoot, otherProject, transcript, options, record, recall };
}

test('new provider session recalls original messages, nearby correction, assignment and unresolved operation with sources', t => {
  const f = fixture(t);
  const original = f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Build a calendar using red headers.', transcript_path: f.transcript, source_message_id: 'human-1' });
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Correction: use blue, not red.' });
  f.record({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'job-one', tool_input: { description: 'Calendar view', prompt: 'Implement calendar without altering offline access.', subagent_type: 'builder' } });
  f.record({ hook_event_name: 'PreToolUse', tool_name: 'publish', tool_use_id: 'operation-one' });
  f.record({ session_id: 'provider-b', hook_event_name: 'UserPromptSubmit', prompt: 'CURRENT SESSION MUST NOT BE REPLAYED' });
  const result = f.recall();
  assert.ok(result.records.some(r => r.text?.includes('use blue')));
  assert.ok(result.records.some(r => r.kind === 'historical-assignment' && r.text.includes('offline access')));
  assert.ok(result.records.some(r => r.kind === 'unresolved-recorded-request' && r.toolId === 'operation-one'));
  assert.equal(result.records.find(r => r.eventFile === original.file).transcript, f.transcript);
  assert.equal(result.records.find(r => r.eventFile === original.file).sourceMessageId, 'human-1');
  assert.ok(!JSON.stringify(result).includes('CURRENT SESSION'));
  const rendered = renderProjectRecall(result);
  assert.match(rendered, /Current user instructions take precedence/);
  assert.match(rendered, /No matching result in searched history/);
  assert.match(rendered, /Original event:/);
});

test('exact canonical project excludes other projects and unknown project history stays explicit', t => {
  const f = fixture(t);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar project secret from elsewhere.' }, f.otherProject);
  assert.ok(!JSON.stringify(f.recall()).includes('secret from elsewhere'));
  assert.match(renderProjectRecall(f.recall()), /missing|No earlier|No matching/i);
  assert.equal(f.recall({ projectRoot: path.join(f.root, 'missing') }).status, 'unavailable');
});

test('unrelated recent messages do not replace a relevant earlier decision and short correction', t => {
  const f = fixture(t);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'The calendar must preserve offline access.' });
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'And keep blue headings.' });
  for (let n = 0; n < 20; n++) f.record({ hook_event_name: 'UserPromptSubmit', prompt: `Unrelated lunch item ${n}.` });
  const result = f.recall();
  assert.ok(result.records.some(r => r.text?.includes('offline access')));
  assert.ok(result.records.some(r => r.text?.includes('blue headings')));
  assert.ok(!result.records.some(r => r.text?.includes('lunch item 19')));
});

test('returns close only the matching session request and never become product verification', t => {
  const f = fixture(t);
  f.record({ hook_event_name: 'PreToolUse', tool_name: 'calendar-save', tool_use_id: 'same-id' });
  f.record({ hook_event_name: 'PostToolUse', tool_name: 'calendar-save', tool_use_id: 'same-id', tool_response: { operation_id: 'op-1', exit_code: 0, stdout: 'DO NOT COPY RAW TOOL TEXT' } });
  f.record({ session_id: 'provider-c', hook_event_name: 'PreToolUse', tool_name: 'calendar-save', tool_use_id: 'same-id' });
  const result = f.recall();
  const pending = result.records.filter(r => r.kind === 'unresolved-recorded-request');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].sessionId, 'provider-c');
  assert.ok(result.records.some(r => r.references?.operation_id === 'op-1' && r.verification.includes('no product effect verified')));
  assert.ok(!JSON.stringify(result).includes('DO NOT COPY RAW TOOL TEXT'));
});

test('tampered identity, traversal transcript reference, malformed record and linked record are rejected safely', t => {
  const f = fixture(t);
  const tampered = f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar TAMPERED IDENTITY' });
  const data = JSON.parse(fs.readFileSync(tampered.file, 'utf8')); data.projectRoot = f.otherProject;
  fs.writeFileSync(tampered.file, JSON.stringify(data));
  const invalid = f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar MALFORMED' }); fs.writeFileSync(invalid.file, '{invalid');
  const linked = f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar LINKED SECRET' });
  const external = path.join(f.root, 'external.json'); fs.copyFileSync(linked.file, external); fs.unlinkSync(linked.file);
  fs.linkSync(external, linked.file);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar valid source.', transcript_path: '../../OUTSIDE_SECRET_PATH' });
  const result = f.recall();
  assert.ok(!JSON.stringify(result).includes('TAMPERED IDENTITY'));
  assert.ok(!JSON.stringify(result).includes('MALFORMED'));
  assert.ok(!JSON.stringify(result).includes('LINKED SECRET'));
  assert.ok(!JSON.stringify(result).includes('OUTSIDE_SECRET_PATH'));
  assert.match(result.gaps.join(' '), /skipped/);
  assert.match(result.gaps.join(' '), /reference was withheld/);
});

test('linked storage never reads an outside event directory', t => {
  const f = fixture(t);
  const external = path.join(f.root, 'elsewhere'); fs.mkdirSync(external);
  const link = path.join(f.root, 'linked'); fs.symlinkSync(external, link, process.platform === 'win32' ? 'junction' : 'dir');
  const result = f.recall({}, { storageRoot: link });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.records.length, 0);
});

test('read and rendered limits remain bounded and explicitly partial', t => {
  const f = fixture(t);
  for (let n = 0; n < 8; n++) f.record({ hook_event_name: 'UserPromptSubmit', prompt: `Calendar request ${n}. ` + 'Detail '.repeat(1000) });
  const result = f.recall({}, { maxFiles: 2, maxBytes: 15000, maxRecords: 1 });
  assert.ok(result.scanned.files <= 2);
  assert.ok(result.scanned.bytes <= 15000);
  assert.ok(result.records.length <= 1);
  assert.equal(result.partial, true);
  for (const maxChars of [256, 1000, 12000]) {
    const rendered = renderProjectRecall(result, { maxChars });
    assert.ok(rendered.length <= maxChars);
    assert.match(rendered, /PARTIAL/);
  }
  assert.match(result.gaps.join(' '), /limit|skipped/i);
});

test('same-time request and result are ordered using recorded sequence', t => {
  const f = fixture(t);
  f.options.now = () => '2026-11-04T12:00:00.000Z';
  f.record({ hook_event_name: 'PreToolUse', tool_name: 'calendar', tool_use_id: 'one' });
  f.record({ hook_event_name: 'PostToolUse', tool_name: 'calendar', tool_use_id: 'one' });
  assert.equal(f.recall().records.filter(r => r.kind === 'unresolved-recorded-request').length, 0);
});

test('unrelated pending operations cannot evict matching user decisions', t => {
  const f = fixture(t);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar must preserve offline access.' });
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Correction: blue headings.' });
  for (let n = 0; n < 40; n++) f.record({ session_id: 'unrelated-work', hook_event_name: 'PreToolUse', tool_name: 'lunch-menu', tool_use_id: `pending-${n}` });
  const result = f.recall({}, { maxRecords: 4 });
  assert.ok(result.records.some(record => record.text?.includes('offline access')));
  assert.ok(result.records.some(record => record.text?.includes('blue headings')));
  assert.ok(!result.records.some(record => record.name === 'lunch-menu'));
  assert.match(result.gaps.join(' '), /Unrelated unresolved/);
});

test('ordinary lifecycle events are skipped without false corruption warnings', t => {
  const f = fixture(t);
  f.record({ hook_event_name: 'SessionStart' });
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar retains its approved colours.' });
  f.record({ hook_event_name: 'Stop' });
  assert.doesNotMatch(f.recall().gaps.join(' '), /Malformed or mismatched/);
});

test('oversized matching message retains a source pointer in a small view', t => {
  const f = fixture(t);
  const record = f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar. ' + 'Original requirement. '.repeat(600) });
  const rendered = renderProjectRecall(f.recall(), { maxChars: 1500 });
  assert.match(rendered, /Deferred historical-user-message/);
  assert.ok(rendered.includes(record.file));
  assert.ok(rendered.length <= 1500);
});

test('Windows case variants share the same canonical project history', { skip: process.platform !== 'win32' }, t => {
  const f = fixture(t);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar keeps offline access.' }, f.projectRoot.toUpperCase());
  const result = f.recall({ projectRoot: f.projectRoot.toLowerCase() });
  assert.ok(result.records.some(record => record.text?.includes('offline access')));
});

test('native rollout filename remains a usable source reference rather than a redacted token', t => {
  const f = fixture(t);
  const transcript = path.join(path.dirname(f.transcript), 'rollout-2026-11-04T20-42-05-01a1a84c-2bca-7db1-94d3-a61a307e8a4b.jsonl');
  fs.writeFileSync(transcript, 'native transcript fixture');
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar preserves offline access.', transcript_path: transcript });
  assert.equal(f.recall().records[0].transcript, transcript);
});
