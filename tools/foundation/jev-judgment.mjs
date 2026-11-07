import { TypeSafeClient, Image } from '@typesafe-ai/sdk';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sanitizeRecord } from '../../hooks/lib/secrets.mjs';
import {budgetedJev} from './jev-budget.mjs';

// One credential/transport path for the selector and on-demand judgments.
// No background work, record ledger, tool execution or provider switching.
export function createJevClientGetter({ apiKey, env = process.env, home = os.homedir(), timeoutMs = 4000, client } = {}) {
  let sdk = client;
  return () => {
    if (sdk) return sdk;
    let key = apiKey || env.TYPESAFE_API_KEY;
    if (!key) {
      try {
        const file = env.FAST_JEV_KEY_FILE || path.join(home, '.typesafe_key');
        if (fs.statSync(file).size <= 16384) key = fs.readFileSync(file, 'utf8').trim();
      } catch { /* Missing credentials return the task to the main agent. */ }
    }
    if (!key) throw new Error('jev-unavailable');
    sdk = new TypeSafeClient({ apiKey: key, logLevel: 'off', timeout: timeoutMs, retry: { maxRetries: 0 } });
    return sdk;
  };
}

export function sanitizeRoutingData(value) {
  function redact(input) {
    if (Array.isArray(input)) return input.map(redact);
    if (input && typeof input === 'object') return Object.fromEntries(Object.entries(input).map(([key, val]) => [key, /password|secret|credential|authorization|api[_-]?key|token$|cookie|private[_-]?key|^auth$/i.test(key) ? '[redacted]' : redact(val)]));
    return input;
  }
  return sanitizeRecord(redact(value));
}

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finiteJson = (value, depth = 0) => {
  if (depth > 64) throw new Error('invalid-jev-input');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object') throw new Error('invalid-jev-input');
  for (const item of Object.values(value)) finiteJson(item, depth + 1);
};

export function prepareJevRequest(input, { experimentalImages = false } = {}) {
  finiteJson(input);
  if (!object(input) || !Object.hasOwn(input, 'state') || input.state === null || !object(input.questions) || !Object.keys(input.questions).length) throw new Error('invalid-jev-input');
  if (Object.keys(input).some(key => !['state', 'questions', 'model', 'assets'].includes(key))) throw new Error('invalid-jev-input');
  if (input.model !== undefined && (typeof input.model !== 'string' || !/^jev-[a-zA-Z0-9.-]+$/.test(input.model))) throw new Error('invalid-jev-model');
  if (typeof input.state !== 'string' && typeof input.state !== 'object') throw new Error('invalid-jev-input');
  const { state, questions } = sanitizeRoutingData({ state: input.state, questions: input.questions });
  for (const question of Object.values(questions)) {
    if (!object(question) || !['noul', 'choice', 'score', 'box'].includes(question.type)) throw new Error('invalid-jev-question');
    if (Object.keys(question).some(key => !['type', 'instructions', 'criteria'].includes(key))) throw new Error('invalid-jev-question');
    if (question.type === 'choice' && (!object(question.criteria) || Object.keys(question.criteria).length < 1 || Object.keys(question.criteria).length > 255)) throw new Error('invalid-jev-choice');
    if (question.type === 'score' && (!Array.isArray(question.criteria) || question.criteria.length < 2 || question.criteria.length > 10)) throw new Error('invalid-jev-score');
    if (question.type === 'noul' && !question.instructions && !question.criteria?.true && !question.criteria?.false) throw new Error('invalid-jev-noul');
    if (question.type === 'box' && (!experimentalImages || question.criteria !== undefined || !question.instructions)) throw new Error('experimental-images-required');
  }
  const request = { model: input.model || 'jev-latest', state, questions };
  if (input.assets !== undefined) {
    if (!experimentalImages || !object(input.assets)) throw new Error('experimental-images-required');
    request.assets = Object.fromEntries(Object.entries(input.assets).map(([name, asset]) => {
      if (!object(asset) || Object.keys(asset).some(key => key !== 'base64') || typeof asset.base64 !== 'string') throw new Error('invalid-jev-image');
      return [name, Image.fromBase64(asset.base64)];
    }));
  }
  if (Object.values(questions).some(q => q.type === 'box') && !Object.keys(request.assets || {}).length) throw new Error('jev-image-required');
  return request;
}

function checkAnswers(response, request) {
  if (!response || typeof response.model !== 'string' || !/^jev-[a-zA-Z0-9.-]+$/.test(response.model) || !object(response.answers)) throw new Error('invalid-jev-answer');
  const probability = value => Number.isFinite(value) && value >= 0 && value <= 1;
  const answers = {};
  for (const [id, question] of Object.entries(request.questions)) {
    const answer = response.answers[id];
    if (!answer || answer.type !== question.type) throw new Error('invalid-jev-answer');
    if (question.type === 'noul' && !probability(answer.noul)) throw new Error('invalid-jev-answer');
    if (question.type === 'choice' && !Object.hasOwn(question.criteria, answer.choice)) throw new Error('invalid-jev-answer');
    if (question.type === 'score' && (!Number.isFinite(answer.score) || answer.score < 0 || answer.score > question.criteria.length - 1)) throw new Error('invalid-jev-answer');
    if (['choice', 'score'].includes(question.type)) {
      const labels = Object.keys(question.criteria);
      if (!probability(answer.confidence) || !object(answer.probabilities) || Object.keys(answer.probabilities).length !== labels.length || labels.some(label => !probability(answer.probabilities[label]))) throw new Error('invalid-jev-answer');
      const total = labels.reduce((sum, label) => sum + answer.probabilities[label], 0);
      // Probabilities are rounded to two decimals; allow their rounding error.
      if (Math.abs(total - 1) > 0.005 * labels.length + 1e-8) throw new Error('invalid-jev-answer');
      if (question.type === 'choice' && answer.probabilities[answer.choice] < Math.max(...Object.values(answer.probabilities))) throw new Error('invalid-jev-answer');
      if (question.type === 'score') {
        const expected = labels.reduce((sum, label) => sum + Number(label) * answer.probabilities[label], 0);
        const rounding = 0.005 * labels.reduce((sum, label) => sum + Number(label), 0) + 0.005 + 1e-8;
        if (Math.abs(answer.score - expected) > rounding) throw new Error('invalid-jev-answer');
      }
    }
    if (question.type === 'box') {
      const b = answer.box;
      if (!object(b) || !['top', 'bottom', 'left', 'right'].every(edge => probability(b[edge])) || b.left > b.right || b.top > b.bottom) throw new Error('invalid-jev-answer');
      if (answer.confidence !== null && !probability(answer.confidence)) throw new Error('invalid-jev-answer');
    }
    // Preserve documented fields, not arbitrary echoed provider data.
    if (question.type === 'noul') answers[id] = { type: 'noul', noul: answer.noul };
    if (question.type === 'choice') answers[id] = { type: 'choice', choice: answer.choice, confidence: answer.confidence, probabilities: { ...answer.probabilities } };
    if (question.type === 'score') answers[id] = { type: 'score', score: answer.score, confidence: answer.confidence, probabilities: { ...answer.probabilities }, legend: Object.fromEntries(question.criteria.map((value, index) => [index, value])) };
    if (question.type === 'box') answers[id] = { type: 'box', box: Object.fromEntries(['top', 'bottom', 'left', 'right'].map(edge => [edge, answer.box[edge]])), confidence: answer.confidence };
  }
  let usage = null;
  if (response.usage != null) {
    usage = {};
    for (const key of ['input_tokens', 'output_tokens']) {
      const value = response.usage[key] ?? null;
      if (value !== null && (!Number.isInteger(value) || value < 0)) throw new Error('invalid-jev-answer');
      usage[key] = value;
    }
  }
  return { answers, usage };
}

function failureReason(error) {
  if (error?.message === 'jev-unavailable') return 'unavailable';
  if (error?.status === 401 || error?.status === 403) return 'authentication';
  if (error?.status === 429) return 'rate-limit';
  if (/abort/i.test(error?.name || '')) return 'cancelled';
  if (/timeout/i.test(error?.name || '')) return 'timeout';
  if (/^invalid-|^experimental-|^jev-image-/.test(error?.message || '')) return 'invalid-input-or-answer';
  return 'service-error';
}

export function createJevJudgment(options = {}) {
  const timeoutMs = options.timeoutMs ?? 8000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('invalid-jev-timeout');
  const getClient = createJevClientGetter({ ...options, timeoutMs });
  return async (input, { signal, experimentalImages = false, longContext = false } = {}) => {
    const start = performance.now();
    try {
      const request = prepareJevRequest(input, { experimentalImages });
      if (signal?.aborted) return { status: 'fallback', reason: 'cancelled', answers: null, durationMs: performance.now() - start };
      const headers = { ...(experimentalImages ? { 'TypeSafe-Danger-Zone-Images': 'true' } : {}), ...(longContext ? { 'TypeSafe-Danger-Zone-Long-Context': 'true' } : {}) };
      const response = await getClient().systemOne(request, { signal, timeout: timeoutMs, retry: { maxRetries: 0 }, headers });
      const checked = checkAnswers(response, request);
      return { status: 'answered', provider: 'typesafe', requestedModel: request.model, model: response.model, ...checked, durationMs: performance.now() - start };
    } catch (error) {
      // Provider bodies may contain supplied data. Never echo them into the agent log.
      return { status: 'fallback', reason: failureReason(error), answers: null, durationMs: performance.now() - start };
    }
  };
}

export async function runJevJudgmentCli(args, { input = '', write = line => console.log(line), options = {} } = {}) {
  if (args.includes('--help')) {
    write('On-demand Jev judgments: judge --stdin [--live] [--experimental-images] [--long-context].\nInput: {taskId?, state, questions, model?, assets?}; live requests require a stable taskId and allow one attempt per task, reusing an identical successful answer; questions use noul, choice, score or experimental box.\nWithout --live, validates locally and prints a summary without sending data. Existing task authority governs live use. This command never executes a selected action.');
    return 0;
  }
  const allowed = new Set(['--stdin', '--live', '--preview', '--experimental-images', '--long-context']);
  if (!args.includes('--stdin') || args.some(arg => !allowed.has(arg)) || (args.includes('--live') && args.includes('--preview'))) { write(JSON.stringify({ status: 'fallback', reason: 'invalid-arguments', answers: null })); return 2; }
  let value,taskId;
  try { ({taskId,...value} = JSON.parse(input)); prepareJevRequest(value, { experimentalImages: args.includes('--experimental-images') }); }
  catch { write(JSON.stringify({ status: 'fallback', reason: 'invalid-input', answers: null })); return 2; }
  if (!args.includes('--live')) {
    write(JSON.stringify({ status: 'preview', network: false, model: value.model || 'jev-latest', questions: Object.entries(value.questions).map(([id, q]) => ({ id, type: q.type })), images: Object.keys(value.assets || {}).length })); return 0;
  }
  const flags={experimentalImages:args.includes('--experimental-images'),longContext:args.includes('--long-context')};
  const result = await budgetedJev({request:value,...flags},{taskId,home:options.home,projectRoot:options.projectRoot,run:input=>createJevJudgment(options)(input.request,flags)});
  write(JSON.stringify(result)); return result.status === 'answered' ? 0 : 1;
}
