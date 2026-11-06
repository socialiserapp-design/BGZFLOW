import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createSourceReadCache } from '../source-read-cache.mjs';
import { captureEvent, readContinuity } from '../continuity.mjs';
import { readProjectRecall } from '../project-recall.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-source-cache-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'session', 'events');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `20261105T000000000Z-${randomUUID()}.json`);
  fs.writeFileSync(file, JSON.stringify({ decision: 'blue' }));
  const cacheFile = path.join(path.dirname(directory), 'source-read-cache.json');
  let loads = 0;
  const load = () => { loads++; return JSON.parse(fs.readFileSync(file, 'utf8')); };
  const read = () => {
    const cache = createSourceReadCache(directory, { enabled: true });
    const value = cache.read(file, load);
    return { value, ...cache.finish() };
  };
  return { root, directory, file, cacheFile, load, read, loads: () => loads };
}

test('unchanged source records reuse their parsed copy while corrupt copies fall back to originals', t => {
  const f = fixture(t);
  assert.equal(f.read().value.decision, 'blue');
  assert.equal(f.read().reused, 1);
  assert.equal(f.loads(), 1);
  fs.writeFileSync(f.cacheFile, '{broken');
  assert.equal(f.read().value.decision, 'blue');
  assert.equal(f.loads(), 2);
  const cache = JSON.parse(fs.readFileSync(f.cacheFile, 'utf8'));
  cache.records[0].value.decision = 'fake';
  fs.writeFileSync(f.cacheFile, JSON.stringify(cache));
  assert.equal(f.read().value.decision, 'blue');
  assert.equal(f.loads(), 3);
});

test('changed decisions invalidate a warm copy even when length and modification time are restored', t => {
  const f = fixture(t);
  f.read();
  const before = fs.statSync(f.file);
  fs.writeFileSync(f.file, JSON.stringify({ decision: 'gold' }));
  fs.utimesSync(f.file, before.atime, before.mtime);
  assert.equal(fs.statSync(f.file).size, before.size);
  assert.equal(f.read().value.decision, 'gold');
  assert.equal(f.loads(), 2);
});

test('a record changed after a cache hit cannot be accepted as a stable batch', t => {
  const f = fixture(t);
  f.read();
  const cache = createSourceReadCache(f.directory, { enabled: true });
  assert.equal(cache.read(f.file, f.load).decision, 'blue');
  fs.writeFileSync(f.file, JSON.stringify({ decision: 'a new correction' }));
  assert.throws(() => cache.finish(), /changed/);
  assert.equal(f.read().value.decision, 'a new correction');
});

test('cached source reuse refuses hard links and a linked cache never reads or changes its target', t => {
  const f = fixture(t);
  f.read();
  const extraLink = path.join(f.root, 'second-link.json');
  fs.linkSync(f.file, extraLink);
  assert.throws(() => f.read(), /Unsafe/);
  fs.unlinkSync(extraLink);
  fs.unlinkSync(f.cacheFile);
  const outside = path.join(f.root, 'unrelated.json');
  fs.writeFileSync(outside, 'DO NOT CHANGE');
  fs.linkSync(outside, f.cacheFile);
  assert.equal(f.read().value.decision, 'blue');
  assert.equal(fs.readFileSync(outside, 'utf8'), 'DO NOT CHANGE');
});

function nativeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-native-cache-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project'); fs.mkdirSync(project);
  const options = { storageRoot: path.join(root, 'store'), sourceCache: true };
  const input = { cwd: project, session_id: 'native-source' };
  const record = value => captureEvent({ ...input, ...value }, options);
  return { root, project, options, input, record };
}

test('current-session recovery includes appended corrections and completed operations after warming', t => {
  const f = nativeFixture(t);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Use blue headings and keep offline access.' });
  f.record({ hook_event_name: 'PreToolUse', tool_name: 'publish', tool_use_id: 'original-operation' });
  assert.equal(readContinuity(f.input, f.options).pendingTools.length, 1);
  readContinuity(f.input, f.options);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Correction: gold headings. Offline access still stays.' });
  f.record({ hook_event_name: 'PostToolUse', tool_name: 'publish', tool_use_id: 'original-operation', tool_response: { ok: true } });
  const cached = readContinuity(f.input, f.options);
  const fresh = readContinuity(f.input, { ...f.options, sourceCache: false });
  assert.match(cached.messages.at(-1).message, /gold headings/);
  assert.equal(cached.pendingTools.length, 0);
  assert.deepEqual(cached.events, fresh.events);
  assert.deepEqual(cached.selection, fresh.selection);
});

test('project recall reranks warm source records for a new question and observes later corrections', t => {
  const f = nativeFixture(t);
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Calendar must work offline.' });
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Billing uses the existing package.' });
  const recall = (query, extra = {}) => readProjectRecall({ projectRoot: f.project, sessionId: 'another-native-session', query }, { ...f.options, ...extra });
  recall('calendar'); recall('calendar');
  assert.ok(recall('billing').records.some(row => row.text?.includes('existing package')));
  f.record({ hook_event_name: 'UserPromptSubmit', prompt: 'Correction: billing stays in test mode.' });
  assert.ok(recall('billing').records.some(row => row.text?.includes('test mode')));
  assert.deepEqual(recall('billing'), recall('billing', { sourceCache: false }));
});

test('warm source copies honour the same read budgets and omitted-record warnings', t => {
  const f = nativeFixture(t);
  for (const prompt of ['Calendar needs offline access.', 'Keep calendar data private.', 'Calendar uses gold headings.']) {
    f.record({ hook_event_name: 'UserPromptSubmit', prompt });
  }
  readContinuity(f.input, f.options);
  for (const limits of [{ maxEvents: 1 }, { maxReadBytes: 1 }]) {
    const cached = readContinuity(f.input, { ...f.options, ...limits });
    const fresh = readContinuity(f.input, { ...f.options, ...limits, sourceCache: false });
    assert.deepEqual(cached.events, fresh.events);
    assert.equal(cached.partial, fresh.partial);
  }
  const input = { projectRoot: f.project, sessionId: 'another-native-session', query: 'calendar' };
  readProjectRecall(input, f.options);
  for (const limits of [{ maxFiles: 1 }, { maxBytes: 1 }]) {
    assert.deepEqual(readProjectRecall(input, { ...f.options, ...limits }), readProjectRecall(input, { ...f.options, ...limits, sourceCache: false }));
  }
});
