import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '../../..');
export const tool = path.join(repoRoot, 'tools', 'bg-heavy', 'bg-heavy.mjs');
export const fixtures = path.join(here, 'fixtures');

export function makeQueue(prefix = 'heavy-') {
  const root = path.join(repoRoot, '.tmp');
  fs.mkdirSync(root, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, prefix));
  const env = { ...process.env, BG_HEAVY_DIR: dir, BGZFLOW_PROCESS_DIR: path.join(dir, 'processes') };
  return {
    dir,
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

export function start(args, env) {
  const child = spawn(process.execPath, [tool, ...args], { env });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  return { child, output: () => ({ out, err }) };
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

export function stopChild(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode) return resolve();
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* already gone */ }
      resolve();
    }, 8000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    try { child.kill('SIGTERM'); } catch { clearTimeout(timer); resolve(); }
  });
}

export function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (err) { return err.code === 'EPERM'; }
}
