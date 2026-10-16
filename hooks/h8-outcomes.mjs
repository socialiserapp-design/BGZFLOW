// H8: SessionStart, at most once a day. The outcomes job (git reverts, review flags, lessons; no model calls) can take
// minutes, so this hook never runs it inline: it starts `bgz jev outcomes --background` detached and returns at once.
// The job writes the day stamp (<BGZFLOW_HOME>/outcomes.stamp) only after it succeeds, and leaves a one-line
// notice in <BGZFLOW_HOME>/outcomes-notice.txt when a job had a bad outcome; the next session start shows it once.
// Silent otherwise. Fails open; BGZFLOW_JEV_GATES=off turns it off.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contextOutput } from './lib/io.mjs';
import { bgzHome, gatesOff } from '../tools/jev/jev.mjs';

export const STAMP_FILE = 'outcomes.stamp';
export const NOTICE_FILE = 'outcomes-notice.txt';
export const SPAWN_FILE = 'outcomes-spawn.json';
// A job started less than this long ago is still running (or crashed); do not start another one.
export const SPAWN_GUARD_MS = 15 * 60 * 1000;

const watchdog = setTimeout(() => process.exit(0), 900);
watchdog.unref();
process.stdout.on('error', () => process.exit(0));

function takeNotice(home) {
  const file = path.join(home, NOTICE_FILE);
  try {
    const text = fs.readFileSync(file, 'utf8').trim();
    fs.rmSync(file, { force: true });
    return text.split(/\r?\n/)[0].slice(0, 400);
  } catch {
    return '';
  }
}

function startJob(home, env) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (fs.readFileSync(path.join(home, STAMP_FILE), 'utf8').trim() === today) return;
  } catch {
    // no stamp yet: run today
  }
  const guard = path.join(home, SPAWN_FILE);
  try {
    const at = Number(JSON.parse(fs.readFileSync(guard, 'utf8')).at);
    if (Number.isFinite(at) && Date.now() - at < SPAWN_GUARD_MS) return;
  } catch {
    // no guard: start
  }
  const bgz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'bgz.mjs');
  if (!fs.existsSync(bgz)) return;
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(guard, JSON.stringify({ at: Date.now(), day: today }), 'utf8');
  const child = spawn(process.execPath, [bgz, 'jev', 'outcomes', '--background'], { detached: true, stdio: 'ignore', env, cwd: home }); // No windowsHide (av-safe rule).
  child.on('error', () => {});
  child.unref();
}

let output = '';
try {
  if (!gatesOff()) {
    const home = bgzHome();
    const notice = takeNotice(home);
    if (notice) output = JSON.stringify(contextOutput('SessionStart', notice));
    startJob(home, process.env);
  }
} catch {
  // never block a session start
}
if (output) process.stdout.write(output, () => process.exit(0));
else process.exit(0);
