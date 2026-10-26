import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const truthFile = '.bgzflow/current-truth.json';
const digest = data => createHash('sha256').update(data).digest('hex');
const contained = (root, file) => { const relative = path.relative(root, file); return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep); };
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

async function readManifest(root, file) {
  const resolved = await fs.realpath(file);
  if (!contained(root, resolved)) throw Error('Truth manifest escapes project.');
  const handle = await fs.open(resolved, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw Error('Truth manifest is not an ordinary file.');
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    const destination = await fs.stat(file, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || destination.dev !== after.dev || destination.ino !== after.ino || await fs.realpath(file) !== resolved) throw Error('Truth manifest changed while being read.');
    return bytes;
  } finally { await handle.close(); }
}

async function fileIdentity(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw Error('Project-relative evidence path required.');
  const file = path.resolve(root, relative);
  if (!contained(root, file)) throw Error('Evidence path escapes project.');
  const resolved = await fs.realpath(file);
  if (!contained(root, resolved)) throw Error('Evidence link escapes project.');
  const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw Error('Evidence is not an ordinary file.');
    const hash = createHash('sha256');
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    const after = await handle.stat({ bigint: true });
    const destination = await fs.stat(file, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || destination.dev !== after.dev || destination.ino !== after.ino || await fs.realpath(file) !== resolved) throw Error('Evidence changed while being read.');
    return { sha256: hash.digest('hex'), resolvedPath: resolved };
  } finally { await handle.close(); }
}

/** Capture dependency identities, not semantic proof that a written claim is true. Never writes. */
export async function captureFileTruth({ projectRoot, sources }) {
  const root = await fs.realpath(projectRoot);
  if (!Array.isArray(sources) || !sources.length) throw Error('Explicit evidence sources required.');
  const captured = [];
  for (const source of sources) captured.push({ ...source, kind: 'file', ...await fileIdentity(root, source.path) });
  const manifest = { schema: 1, projectRoot: root, sources: captured };
  validate(manifest);
  return manifest;
}

function validate(manifest) {
  if (manifest?.schema !== 1 || typeof manifest.projectRoot !== 'string' || !path.isAbsolute(manifest.projectRoot) || !Array.isArray(manifest.sources) || !manifest.sources.length) throw Error('Invalid current-truth manifest.');
  const ids = new Set();
  for (const source of manifest.sources) {
    if (typeof source?.id !== 'string' || !source.id || ids.has(source.id)) throw Error('Distinct evidence source identities required.');
    ids.add(source.id);
    if (source.kind === 'file') {
      if (typeof source.path !== 'string' || !source.path || path.isAbsolute(source.path) || !/^[a-f0-9]{64}$/.test(source.sha256 ?? '') || typeof source.resolvedPath !== 'string' || !path.isAbsolute(source.resolvedPath)) throw Error('Invalid file evidence identity.');
    } else if (source.kind === 'observation') {
      if (typeof source.resource !== 'string' || !source.resource || typeof source.identity !== 'string' || !source.identity || !Object.hasOwn(source, 'expected')) throw Error('Live observation requires resource, stable identity and expected state.');
    } else throw Error('Unknown evidence source kind.');
  }
}

/** Local read-back. Optional manifestPath is relative to the ORIGINAL project; never writes. */
export async function checkCurrentTruth({ projectRoot, expectedManifestSha256, observe, manifestPath } = {}) {
  const report = { status: 'unavailable', scope: 'declared-evidence-dependencies', freshness: 'checked-at-boundary', checkedAt: new Date().toISOString(), sources: [], semanticClaimsVerified: false };
  try {
    const root = await fs.realpath(projectRoot);
    const selected = manifestPath === undefined ? truthFile : manifestPath;
    if (typeof selected !== 'string' || !selected || path.isAbsolute(selected) || path.win32.isAbsolute(selected) || /^[a-z]:/i.test(selected)) throw Error('Project-relative truth manifest path required.');
    const file = path.resolve(root, selected);
    if (!contained(root, file)) throw Error('Truth manifest escapes project.');
    let bytes;
    try {
      bytes = await readManifest(root, file);
    } catch (error) {
      if (error.code === 'ENOENT') return { ...report, status: expectedManifestSha256 || manifestPath !== undefined ? 'changed' : 'not-configured', reason: expectedManifestSha256 || manifestPath !== undefined ? 'Recorded truth manifest is missing.' : 'No evidence dependencies have been registered.' };
      throw error;
    }
    report.manifestSha256 = digest(bytes);
    if (expectedManifestSha256 && expectedManifestSha256 !== report.manifestSha256) return { ...report, status: 'changed', reason: 'Evidence contract changed; reconcile the correction before continuing this saved plan.' };
    const manifest = JSON.parse(bytes.toString('utf8'));
    validate(manifest);
    if (await fs.realpath(manifest.projectRoot) !== root) return { ...report, status: 'wrong-project', reason: 'This evidence record belongs to a different project copy.' };
    const claims = new Map();
    for (const source of manifest.sources) {
      let result;
      try {
        if (source.kind === 'file') {
          const actual = await fileIdentity(root, source.path);
          result = { id: source.id, status: actual.sha256 === source.sha256 && actual.resolvedPath === source.resolvedPath ? 'unchanged' : 'changed' };
        } else if (!observe) result = { id: source.id, status: 'unavailable', reason: 'The host has no live observer for this source; a saved report cannot substitute.' };
        else {
          const actual = await observe({ projectRoot: root, source: structuredClone(source) });
          result = { id: source.id, status: actual?.status !== 'observed' ? 'unavailable' : actual.identity === source.identity && canonical(actual.value) === canonical(source.expected) ? 'unchanged' : 'changed' };
        }
      } catch (error) { result = { id: source.id, status: error.code === 'ENOENT' ? 'missing' : 'unavailable' }; }
      if (source.subject && typeof source.claim === 'string') {
        if (claims.has(source.subject) && claims.get(source.subject) !== source.claim) result = { id: source.id, status: 'conflict', reason: 'Active sources disagree; no automatic last-write-wins selection.' };
        claims.set(source.subject, source.claim);
      }
      report.sources.push(result);
    }
    // A manifest correction during the read cannot silently change the plan's evidence contract.
    if (digest(await readManifest(root, file)) !== report.manifestSha256) return { ...report, status: 'changed', reason: 'Evidence contract changed during read-back.' };
    report.status = report.sources.every(source => source.status === 'unchanged') ? 'checked' : 'needs-refresh';
    return report;
  } catch { return { ...report, reason: 'Evidence could not be validated; do not treat a saved claim as current.' }; }
}

export function truthGuidance(report) {
  if (report.status === 'not-configured') return '';
  const changed = report.sources.filter(source => source.status !== 'unchanged').map(source => `${source.id}: ${source.status}`).join(', ');
  return `Current truth: ${report.status}; scope: declared evidence dependencies only. ${changed || report.reason || 'Registered evidence identities matched current read-back.'} ${report.status === 'checked' ? 'Matching source bytes do not prove semantic claims or the whole product outcome.' : 'Refresh the affected source and reconcile the plan before dependent action or a success claim; continue unrelated work.'}`;
}
