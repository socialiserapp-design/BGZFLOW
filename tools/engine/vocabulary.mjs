import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');
const text = value => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Shared vocabulary needs non-empty wording, terms, meanings and source references.');
  return value.trim();
};
const payload = value => ({ schema: value.schema, domain: value.domain, entries: value.entries });

/** The primary model supplies interpretations; this code binds their meaning and version without classifying a request. */
export function createVocabulary({ domain = 'universal', entries = [] } = {}) {
  domain = text(domain);
  if (!Array.isArray(entries)) throw new Error('Vocabulary entries must be an array.');
  const identities = new Set();
  const normalized = entries.map(entry => {
    const term = text(entry.term);
    const scope = text(entry.scope ?? domain);
    const id = digest(JSON.stringify([scope.normalize('NFKC').toLowerCase(), term.normalize('NFKC').toLowerCase()]));
    if (identities.has(id)) throw new Error('A shared term has multiple definitions in the same scope; reconcile its meaning.');
    identities.add(id);
    const wording = typeof entry.userWording === 'string' ? [entry.userWording] : entry.userWording;
    if (!Array.isArray(wording) || !wording.length) throw new Error('A shared term must retain the user wording it interprets.');
    return { id, term, scope, userWording: [...new Set(wording.map(text))], meaning: text(entry.meaning), sourceRef: text(entry.sourceRef) };
  });
  const vocabulary = { schema: 1, domain, entries: normalized };
  return { ...vocabulary, sha256: digest(JSON.stringify(payload(vocabulary))) };
}

export function validateVocabulary(vocabulary) {
  if (!vocabulary || vocabulary.schema !== 1) throw new Error('Saved shared vocabulary changed.');
  const normalized = createVocabulary(vocabulary);
  if (vocabulary.sha256 !== normalized.sha256 || normalized.entries.some((entry, index) => vocabulary.entries[index].id !== entry.id)) throw new Error('Saved shared vocabulary changed.');
  return true;
}
