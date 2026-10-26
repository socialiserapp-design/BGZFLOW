/** Explicit, durable agent scopes; design adapted from ruvnet/ruflo.
 * Upstream pin and MIT permission: see THIRD_PARTY_NOTICES.md.
 * The storage tree must be owned by the caller: concurrent hostile filesystem
 * replacement is outside Node's portable path API guarantees. No links are followed.
 */
import * as fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const stores = new WeakMap();
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
function name(value, label) {
  if (typeof value !== 'string' || !value.length) fail('INVALID_ARGUMENT', `${label} must be a nonempty string`);
  return value;
}
function json(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || seen.has(value)) fail('INVALID_VALUE', 'Value must be finite JSON data');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    fail('INVALID_VALUE', 'Value must be plain JSON data');
  seen.add(value);
  if (Object.getOwnPropertySymbols(value).length) fail('INVALID_VALUE', 'Symbol keys are not JSON data');
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !('value' in descriptor)) fail('INVALID_VALUE', 'Value must be plain JSON data');
    json(descriptor.value, seen);
  }
  if (Array.isArray(value) && (Object.keys(value).length !== value.length
    || Object.keys(value).some((key, index) => key !== String(index))))
    fail('INVALID_VALUE', 'Arrays must have no holes or extra properties');
  seen.delete(value);
}

// Inspect every ancestor, including ancestors above storageRoot. Windows junctions
// are reported as symbolic links by lstat. Never recursively mkdir through a link.
function directory(dir, create = false) {
  const root = path.parse(dir).root;
  let current = root;
  for (const part of path.relative(root, dir).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (error.code !== 'ENOENT' || !create) throw error;
      try { fs.mkdirSync(current); } catch (mkdirError) { if (mkdirError.code !== 'EEXIST') throw mkdirError; }
      stat = fs.lstatSync(current);
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('UNSAFE_PATH', 'Storage directory must be an ordinary directory');
  }
}
function ordinaryFile(file) {
  let stat;
  try { stat = fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) fail('UNSAFE_PATH', 'Storage file must be an ordinary unlinked file');
  return true;
}
function read(state) {
  if (state.closed) fail('STORE_CLOSED', 'Store is closed');
  directory(state.dir);
  if (!ordinaryFile(state.file)) return { version: 1, identity: state.identity, records: [], transfers: [] };
  const fd = fs.openSync(state.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  let body;
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1) fail('UNSAFE_PATH', 'Storage file must be ordinary');
    body = JSON.parse(fs.readFileSync(fd, 'utf8'));
  } finally { fs.closeSync(fd); }
  if (body.version !== 1 || JSON.stringify(body.identity) !== JSON.stringify(state.identity)
    || !Array.isArray(body.records) || !Array.isArray(body.transfers)) fail('INVALID_STORE', 'Stored scope identity or format does not match');
  const keys = new Set();
  for (const record of body.records) {
    if (!record || typeof record.key !== 'string' || keys.has(record.key) || !Number.isSafeInteger(record.revision) || record.revision < 1)
      fail('INVALID_STORE', 'Invalid stored record');
    json(record.value); keys.add(record.key);
  }
  return body;
}
function save(state, body) {
  directory(state.dir);
  ordinaryFile(state.file);
  const temporary = path.join(state.dir, `.context-${randomUUID()}.tmp`);
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(body)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  // Rename commits both the record and its transfer receipt as one operation.
  directory(state.dir);
  ordinaryFile(state.file);
  fs.renameSync(temporary, state.file);
  // Windows does not support fsync of a directory. File fsync + atomic rename
  // guarantees ordinary close/reopen persistence, not power-loss durability there.
  if (process.platform !== 'win32') {
    const dirFd = fs.openSync(state.dir, 'r');
    try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
  }
}

/** All methods are synchronous. Values are detached JSON snapshots.
 * put(key, value) explicitly replaces that key; get(key) returns record or null;
 * list() returns only this scope's records. transferTo requires another factory
 * store and a caller-stable transferId; conflicting retries throw CONFLICT.
 * A record is {key, value, revision, provenance}; new puts reset provenance.
 * One writer owns a scope at a time (no cross-process writer locking).
 * SHA-256 directories retain and check the exact identities in their ledger;
 * identity collisions fail closed instead of merging records.
 */
export function createScopedContextStore({ storageRoot, projectId, agentId } = {}) {
  if (typeof storageRoot !== 'string' || !path.isAbsolute(storageRoot)) fail('INVALID_ARGUMENT', 'storageRoot must be an absolute path');
  const identity = { projectId: name(projectId, 'projectId'), agentId: name(agentId, 'agentId') };
  const root = path.resolve(storageRoot);
  const dir = path.join(root, 'scoped-context-v1', digest(identity));
  directory(dir, true);
  const state = { identity, root, dir, file: path.join(dir, 'context.json'), closed: false };
  read(state);
  const store = Object.freeze({
    identity: Object.freeze({ ...identity }),
    put(key, value) {
      name(key, 'key'); json(value);
      const body = read(state);
      const index = body.records.findIndex((record) => record.key === key);
      const revision = index < 0 ? 1 : body.records[index].revision + 1;
      if (!Number.isSafeInteger(revision)) fail('INVALID_STORE', 'Record revision exhausted');
      const record = { key, value: copy(value), revision, provenance: null };
      if (index < 0) body.records.push(record); else body.records[index] = record;
      save(state, body); return copy(record);
    },
    get(key) { name(key, 'key'); return copy(read(state).records.find((record) => record.key === key) ?? null); },
    list() { return copy(read(state).records); },
    transferTo(target, { key, targetKey = key, transferId } = {}) {
      name(key, 'key'); name(targetKey, 'targetKey'); name(transferId, 'transferId');
      const targetState = stores.get(target);
      if (!targetState) fail('INVALID_ARGUMENT', 'Target must be an explicitly configured scoped store');
      const source = read(state).records.find((record) => record.key === key);
      if (!source) fail('NOT_FOUND', 'Source record does not exist');
      const body = read(targetState);
      const request = { source: identity, sourceKey: key, sourceRevision: source.revision,
        sourceDigest: digest(source), destination: targetState.identity, targetKey };
      const prior = body.transfers.find((transfer) => transfer.transferId === transferId);
      const existing = body.records.find((record) => record.key === targetKey);
      if (prior) {
        if (JSON.stringify(prior.request) !== JSON.stringify(request) || !existing || digest(existing) !== prior.recordDigest)
          fail('CONFLICT', 'Transfer identity or destination conflicts with an earlier transfer');
        return { transferId, record: copy(existing), replayed: true };
      }
      if (existing) fail('CONFLICT', 'Transfer destination already contains a record');
      const record = { key: targetKey, value: copy(source.value), revision: 1,
        provenance: { transferId, ...request, previous: copy(source.provenance) } };
      body.records.push(record);
      body.transfers.push({ transferId, request, recordDigest: digest(record) });
      save(targetState, body);
      return { transferId, record: copy(record), replayed: false };
    },
    close() { state.closed = true; },
  });
  stores.set(store, state);
  return store;
}
