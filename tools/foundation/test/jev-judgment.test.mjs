import test from 'node:test';
import assert from 'node:assert/strict';
import { createJevJudgment, prepareJevRequest, runJevJudgmentCli } from '../jev-judgment.mjs';

const input = {
  model: 'jev-1.14.0',
  state: { message: 'The export crashes.' },
  questions: {
    blocked: { type: 'noul', instructions: 'Is the export blocked?' },
    area: { type: 'choice', instructions: 'Which area failed?', criteria: { export: 'Export', login: 'Login' } },
    impact: { type: 'score', instructions: 'Observed impact?', criteria: ['No failure', 'Workaround available', 'Operation unavailable'] }
  }
};
const response = {
  model: 'jev-1.14.0',
  usage: { input_tokens: 123, output_tokens: 0 },
  answers: {
    blocked: { type: 'noul', noul: 0.98 },
    area: { type: 'choice', choice: 'export', confidence: 0.9, probabilities: { export: 0.95, login: 0.05 } },
    impact: { type: 'score', score: 1.6, confidence: 0.8, probabilities: { 0: 0.1, 1: 0.2, 2: 0.7 }, legend: { 0: 'No failure', 1: 'Workaround available', 2: 'Operation unavailable' } }
  }
};

test('mixed questions use one call and retain full distributions, fractional scores, model and usage', async () => {
  let calls = 0, received, settings;
  const judge = createJevJudgment({ client: { systemOne: async (value, options) => { calls++; received = value; settings = options; return response; } } });
  const result = await judge(input);
  assert.equal(calls, 1); assert.equal(result.status, 'answered');
  assert.deepEqual(result.answers, response.answers); assert.deepEqual(result.usage, response.usage);
  assert.equal(result.model, response.model); assert.equal(result.requestedModel, input.model);
  assert.equal(received.questions.impact.criteria.length, 3); assert.equal(settings.retry.maxRetries, 0);
  assert.equal(Object.hasOwn(result.answers.blocked, 'confidence'), false);
});

test('local preview makes no call and does not print source text or credentials', async () => {
  let calls = 0; const lines = [];
  const code = await runJevJudgmentCli(['--stdin'], { input: JSON.stringify(input), write: x => lines.push(x), options: { client: { systemOne: () => { calls++; } } } });
  assert.equal(code, 0); assert.equal(calls, 0); assert.equal(JSON.parse(lines[0]).network, false);
  assert.ok(!lines.join('').includes('The export crashes'));
});

test('the shared sender masks known secret fields without dropping expected output metadata', async () => {
  let received;
  const judge = createJevJudgment({ client: { systemOne: async value => { received = value; return response; } } });
  const result = await judge({ ...input, state: { ...input.state, api_key: 'synthetic-credential-value', nested: { password: 'synthetic-password-value' } } });
  assert.equal(result.status, 'answered'); assert.equal(received.state.api_key, '[redacted]');
  assert.equal(received.state.nested.password, '[redacted]'); assert.equal(result.usage.input_tokens, 123);
});

test('bad candidates, rubrics and generated execution fields cannot reach the service', async () => {
  let calls = 0;
  const judge = createJevJudgment({ client: { systemOne: async () => { calls++; return response; } } });
  for (const value of [
    { ...input, command: 'echo must-not-run' },
    { ...input, questions: { q: { type: 'score', criteria: ['one'] } } },
    { ...input, questions: { q: { type: 'choice', criteria: {} } } },
    { ...input, state: { number: Infinity } },
    { ...input, model: 'another-provider' }
  ]) {
    const result = await judge(value); assert.equal(result.status, 'fallback'); assert.equal(result.answers, null);
  }
  assert.equal(calls, 0);
});

test('unknown selected IDs and missing or out-of-range answers do not become successful decisions', async () => {
  for (const mutate of [r => { r.answers.area.choice = 'invented'; }, r => { delete r.answers.blocked; }, r => { r.answers.impact.score = 8; }, r => { r.answers.area.probabilities.export = NaN; }]) {
    const bad = structuredClone(response); mutate(bad);
    const result = await createJevJudgment({ client: { systemOne: async () => bad } })(input);
    assert.equal(result.status, 'fallback'); assert.equal(result.answers, null);
  }
});

test('provider failures remain failures, make one attempt and never disclose a response body', async () => {
  let calls = 0;
  const result = await createJevJudgment({ client: { systemOne: async () => { calls++; const error = new Error('private upstream body'); error.status = 429; throw error; } } })(input);
  assert.equal(calls, 1); assert.equal(result.reason, 'rate-limit'); assert.equal(result.answers, null);
  assert.ok(!JSON.stringify(result).includes('private upstream body'));
});

test('impossible distributions or inconsistent expected scores never become answered', async () => {
  for (const mutate of [r => { r.answers.area.probabilities = { export: 0.9, login: 0.9 }; }, r => { r.answers.impact.score = 0.2; }, r => { r.answers.area.choice = 'login'; }]) {
    const bad = structuredClone(response); mutate(bad);
    const result = await createJevJudgment({ client: { systemOne: async () => bad } })(input);
    assert.equal(result.status, 'fallback'); assert.equal(result.answers, null);
  }
});

test('the original rubric defines score meaning and arbitrary provider fields cannot enter the output', async () => {
  const noisy = structuredClone(response);
  noisy.answers.impact.legend = { 0: 'Wrong', 1: 'Unrelated', 2: 'Private provider echo' };
  noisy.answers.area.hidden = 'Private provider echo'; noisy.answers.unrequested = 'Private provider echo';
  noisy.usage.hidden = 'Private provider echo'; noisy.raw = 'Private provider echo';
  const result = await createJevJudgment({ client: { systemOne: async () => noisy } })(input);
  assert.equal(result.status, 'answered'); assert.deepEqual(result.answers.impact.legend, response.answers.impact.legend);
  assert.ok(!JSON.stringify(result).includes('Private provider echo'));
  assert.deepEqual(result.usage, response.usage);
});

test('cancelled and unavailable judgments fall back without fabricated answers', async () => {
  let calls = 0; const controller = new AbortController(); controller.abort();
  const result = await createJevJudgment({ client: { systemOne: async () => { calls++; return response; } } })(input, { signal: controller.signal });
  assert.equal(result.reason, 'cancelled'); assert.equal(calls, 0);
  const unavailable = await createJevJudgment({ env: {}, home: 'Z:/bgzflow-nonexistent-key-fixture' })(input);
  assert.equal(unavailable.reason, 'unavailable'); assert.equal(unavailable.answers, null);
});

test('experimental image requests are explicit, preserve bytes and do not imply an action', async () => {
  // A tiny public fixture tests transport only, not the live API's image dimensions.
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+axtoAAAAASUVORK5CYII=';
  const value = { model: 'jev-1.14.0', state: { photo: '<photo>' }, assets: { '<photo>': { base64 } }, questions: { present: { type: 'noul', instructions: 'Is there a square in <photo>?' }, location: { type: 'box', instructions: 'The square in <photo>' } } };
  assert.throws(() => prepareJevRequest(value), /experimental/);
  let received, settings;
  const judge = createJevJudgment({ client: { systemOne: async (request, options) => { received = request; settings = options; return { model: 'jev-1.14.0', usage: null, answers: { present: { type: 'noul', noul: 0.9 }, location: { type: 'box', box: { top: 0.1, bottom: 0.8, left: 0.2, right: 0.9 }, confidence: null } } }; } } });
  const result = await judge(value, { experimentalImages: true });
  assert.equal(result.status, 'answered'); assert.equal(settings.headers['TypeSafe-Danger-Zone-Images'], 'true');
  assert.equal(Buffer.from(received.assets['<photo>'].data).toString('base64'), base64);
  assert.equal(Object.hasOwn(result, 'action'), false);
});

test('long context does not activate itself and normal requests do not carry image headers', async () => {
  const settings = [];
  const judge = createJevJudgment({ client: { systemOne: async (_, options) => { settings.push(options); return response; } } });
  await judge(input); await judge(input, { longContext: true });
  assert.deepEqual(settings[0].headers, {});
  assert.deepEqual(settings[1].headers, { 'TypeSafe-Danger-Zone-Long-Context': 'true' });
});
