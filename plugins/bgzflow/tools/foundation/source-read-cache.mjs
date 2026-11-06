import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isLinked, writablePath, writeOwnedFile } from '../../hooks/lib/owned-path.mjs';

const namePattern = /^[0-9TZ]+-[a-f0-9-]{36}\.json$/;
const maximumBytes = 16 * 1024 * 1024;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const identity = stat => `${stat.dev}:${stat.ino}`;
const stamp = stat => `${identity(stat)}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
const regular = stat => stat.isFile() && !isLinked(stat) && stat.nlink === 1n;
const statFile = file => fs.lstatSync(file, { bigint: true });

/** A disposable copy of source JSON, never a decision or completion record.
 * Every reused entry is checked against its original file identity, size and
 * nanosecond change times. Both directory ancestry and all source stamps are
 * checked again before a caller may use the batch. A changed/unsafe batch must
 * fall back to a fresh source read. No age-based validity or persistent lock.
 */
export function createSourceReadCache(directory, { enabled = false } = {}) {
  if (!enabled) return { read: (_file, load) => load(), finish: () => ({ reused: 0 }) };
  writablePath(directory, { directory: true });
  const initialDirectory = statFile(directory);
  const cacheFile = path.join(path.dirname(directory), 'source-read-cache.json');
  let previous = new Map();
  try {
    writablePath(cacheFile);
    const before = statFile(cacheFile);
    if (!regular(before) || before.size > BigInt(maximumBytes)) throw Error('Unsafe cache.');
    const value = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    writablePath(cacheFile);
    if (stamp(statFile(cacheFile)) !== stamp(before)) throw Error('Cache changed during read.');
    const payload = { schema: value.schema, directory: value.directory, records: value.records };
    if (value.schema !== 1 || value.directory !== directory || !Array.isArray(value.records)
      || value.records.length > 2048 || value.digest !== digest(payload)
      || value.records.some(row => !row || !namePattern.test(row.name) || typeof row.stamp !== 'string'
        || !Object.hasOwn(row, 'value'))) throw Error('Invalid cache.');
    previous = new Map(value.records.map(row => [row.name, row]));
  } catch { /* Originals remain authoritative when a cache is absent or invalid. */ }
  const observed = new Map();
  let reused = 0, dirty = previous.size === 0;
  return {
    read(file, load, { maxBytes = Infinity, onReuse = () => {} } = {}) {
      const name = path.basename(file);
      if (path.dirname(file) !== directory || !namePattern.test(name)) throw Error('Outside source directory.');
      const before = statFile(file), signature = stamp(before);
      if (!regular(before) || Number(before.size) > maxBytes) throw Error('Unsafe or oversized source.');
      const cached = previous.get(name);
      let value;
      if (cached?.stamp === signature) {
        value = cached.value;
        onReuse(Number(before.size));
        reused++;
      } else {
        // The existing loader retains its full path, open-file and read checks.
        value = load();
        if (stamp(statFile(file)) !== signature) throw Error('Source changed during read.');
        dirty = true;
      }
      observed.set(name, { name, stamp: signature, value });
      return value;
    },
    finish() {
      writablePath(directory, { directory: true });
      if (stamp(statFile(directory)) !== stamp(initialDirectory)) throw Error('Source directory changed during read.');
      for (const row of observed.values()) {
        const current = statFile(path.join(directory, row.name));
        if (!regular(current) || stamp(current) !== row.stamp) throw Error('Source changed during batch.');
      }
      // Check ancestry again after the per-file walk; cached contents are not
      // accepted from a directory which has become a link or been replaced.
      writablePath(directory, { directory: true });
      if (identity(statFile(directory)) !== identity(initialDirectory)) throw Error('Source directory was replaced.');
      if (observed.size && (dirty || observed.size !== previous.size)) {
        const payload = { schema: 1, directory, records: [...observed.values()] };
        const bytes = JSON.stringify({ ...payload, digest: digest(payload) });
        if (Buffer.byteLength(bytes) <= maximumBytes) {
          try { writeOwnedFile(cacheFile, bytes); } catch { /* Cache failure never changes source results. */ }
        }
      }
      return { reused };
    },
  };
}
