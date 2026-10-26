import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createVocabulary, validateVocabulary } from './vocabulary.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const entries = [
  ['understand-and-plan', 'Understand and plan', 'Understand ordinary intent, investigate consequential unknowns, plan usable outcomes and execute authorised work.'],
  ['research-and-check', 'Research and check', 'Investigate material uncertainty with permitted primary sources, files, records and tools; verify claims and actual effects.'],
  ['continue-and-recover', 'Continue and recover', 'Recover intent and evidence, reconcile interrupted effects and resume without blind repetition.'],
  ['efficiency', 'Efficiency', 'Avoid repeated reading, routing, research and checking while preserving the requested outcome and meaningful verification.'],
];
const productName = product => {
  if (!['bgzflow', 'lucian'].includes(product)) throw new Error('Expected bgzflow or lucian product.');
  return product === 'lucian' ? 'Lucian' : 'BGZFLOW';
};
const hashContext = value => digest(JSON.stringify({ schema: value.schema, product: value.product, requestSha256: value.requestSha256, policy: value.policy, methods: value.methods, ...(value.vocabulary ? { vocabulary: value.vocabulary } : {}) }));

/** Local assets only. No model call, request logging, keyword classifier or ambient project lookup. */
export async function prepareRequest({ text = '', product = 'bgzflow', vocabulary } = {}) {
  if (typeof text !== 'string') throw new Error('Request text must be a string.');
  const label = productName(product);
  const [policyBody, common, efficiency] = await Promise.all([
    fs.readFile(new URL('./method-assets/default-policy.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('./method-assets/methods.md', import.meta.url), 'utf8'),
    fs.readFile(new URL('./method-assets/efficiency.md', import.meta.url), 'utf8'),
  ]);
  const sections = new Map([...common.matchAll(/^## (.+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(match => [match[1], match[2].trim()]));
  const methods = entries.map(([id, title, description]) => {
    const body = id === 'efficiency' ? efficiency.trim() : sections.get(title);
    if (!body) throw new Error(`Missing bundled method: ${id}`);
    return { id, name: `${product === 'lucian' ? 'lucian' : 'bgz'}-${id}`, title: `${label} ${title}`, description, revision: ['understand-and-plan', 'continue-and-recover'].includes(id) ? 2 : 1, sha256: digest(body), body };
  });
  const context = { schema: 1, product, requestSha256: digest(text), policy: { body: policyBody.trim(), sha256: digest(policyBody.trim()) }, methods, ...(vocabulary ? { vocabulary: createVocabulary(vocabulary) } : {}) };
  return { ...context, sha256: hashContext(context) };
}

export function validateMethodContext(context) {
  if (!context || context.schema !== 1 || !['bgzflow', 'lucian'].includes(context.product) || !/^[a-f0-9]{64}$/.test(context.requestSha256 ?? '')) throw new Error('Invalid method context identity.');
  if (context.vocabulary) validateVocabulary(context.vocabulary);
  if (typeof context.policy?.body !== 'string' || digest(context.policy.body) !== context.policy.sha256) throw new Error('Saved default policy bytes changed.');
  // Saved work owns its method snapshot. The installed catalogue may evolve independently.
  if (!Array.isArray(context.methods) || context.methods.length === 0 || new Set(context.methods.map(item => item?.id)).size !== context.methods.length) throw new Error('Invalid saved method inventory.');
  for (const item of context.methods) {
    if (typeof item?.id !== 'string' || !item.id.trim() || typeof item.body !== 'string' || digest(item.body) !== item.sha256 || !Number.isSafeInteger(item.revision) || item.revision < 1) throw new Error('Saved method bytes changed.');
  }
  if (hashContext(context) !== context.sha256) throw new Error('Saved method context changed.');
  return true;
}

/** Metadata and mandatory guidance first; a primary model can read full bodies on demand. */
export function methodGuidance(context) {
  validateMethodContext(context);
  return `${productName(context.product)} default task guidance\n\n${context.policy.body}\n\nAvailable existing methods (read the relevant full body before applying it):\n${context.methods.map(({ id, name, description }) => `- ${id} (${name}): ${description}`).join('\n')}`;
}

export function readMethod(context, id) {
  validateMethodContext(context);
  const item = context.methods.find(method => method.id === id || method.name === id);
  if (!item) throw new Error('Unknown bundled method.');
  return structuredClone(item);
}
