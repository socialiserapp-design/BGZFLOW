// Shared heavy-queue folder and reader. bg-swarm imports this so both tools see one queue.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const STALE_MS = 4 * 60 * 60 * 1000;

export function defaultSlotCount(cpus) {
  const count = Number(cpus);
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.max(1, Math.floor(count / 16));
}

export function resolveHeavyDir(env = process.env, homedir = os.homedir(), platform = process.platform) {
  if (env.BG_HEAVY_DIR) return env.BG_HEAVY_DIR;
  const home = typeof homedir === 'function' ? homedir() : homedir;
  const base = env.LOCALAPPDATA || (platform === 'win32' ? path.join(home, 'AppData', 'Local') : path.join(home, '.cache'));
  return path.join(base, 'bgzflow', 'heavy');
}

export function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function readHeavyQueue(dir, now = Date.now()) {
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { dir, slots: [], waiting: [] };
  }
  const slots = [];
  const waiting = [];
  for (const name of names.sort()) {
    if (/^slot-\d+\.json$/.test(name)) {
      const rec = readJson(path.join(dir, name));
      if (!rec) continue;
      const isAlive = alive(rec.pid);
      const old = Number.isFinite(rec.started) && now - rec.started > STALE_MS;
      slots.push({
        file: name,
        slot: rec.slot,
        pid: rec.pid,
        label: rec.label || '',
        cwd: rec.cwd || '',
        command: rec.command || '',
        started: rec.started,
        stale: !isAlive || old,
        alive: isAlive,
      });
    } else if (/^wait-.*\.json$/.test(name)) {
      const rec = readJson(path.join(dir, name));
      if (!rec || !alive(rec.pid)) continue;
      waiting.push({
        pid: rec.pid,
        label: rec.label || '',
        command: rec.command || '',
        since: rec.since || rec.started || null,
      });
    }
  }
  return { dir, slots, waiting };
}
