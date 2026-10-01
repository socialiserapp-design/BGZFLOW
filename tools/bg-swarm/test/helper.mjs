import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '../../..');
export const tool = path.join(repoRoot, 'tools', 'bg-swarm', 'bg-swarm.mjs');
export const fixtures = path.join(here, 'fixtures');

export function makeHome(prefix = 'swarm-') {
  const root = path.join(repoRoot, '.tmp');
  fs.mkdirSync(root, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, prefix));
  const swarm = path.join(dir, 'swarm');
  const heavy = path.join(dir, 'heavy');
  fs.mkdirSync(swarm, { recursive: true });
  fs.mkdirSync(heavy, { recursive: true });
  const env = { ...process.env, BG_SWARM_DIR: swarm, BG_HEAVY_DIR: heavy };
  return {
    dir,
    swarm,
    heavy,
    env,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export function run(args, env, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tool, ...args], { env });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timeout after ${timeoutMs}ms\nSTDOUT:\n${out}\nSTDERR:\n${err}`));
    }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('exit', (code) => { clearTimeout(timer); resolve({ code, out, err }); });
  });
}

export function alive(pid) {
  try {
    process.kill(pid, 0);
    if (process.platform === 'linux') {
      try { const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); if (stat.slice(stat.lastIndexOf(')') + 2, stat.lastIndexOf(')') + 3) === 'Z') return false; }
      catch { return false; }
    }
    return true;
  } catch (err) { return err.code === 'EPERM'; }
}

export function waitFor(pred, timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const value = await pred();
        if (value) return resolve(value);
      } catch (err) {
        return reject(err);
      }
      if (Date.now() - started > timeoutMs) return reject(new Error('wait timed out'));
      setTimeout(tick, 200);
    };
    tick();
  });
}

export function recordPath(home, project, name) {
  return path.join(home.swarm, project, `${name}.json`);
}
