#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { writablePath, writeOwnedFile, withOwnedLock } from '../../hooks/lib/owned-path.mjs';
import { readOwnedProcesses, processIdentity } from './processes.mjs';

export function diskResult(target, minGb, statfs = fs.statfsSync) {
  const stats = statfs(target);
  const freeBytes = stats.bavail * stats.bsize;
  const totalBytes = stats.blocks * stats.bsize;
  const minBytes = minGb * 1024 ** 3;
  return { ok: freeBytes >= minBytes, path: target, freeBytes, totalBytes, minBytes };
}

export function buildSlots(plan, configured) {
  const normalized = plan.toLowerCase();
  const slots = configured === null ? (normalized === 'starter' ? 1 : null) : Number(configured);
  if (!Number.isInteger(slots) || slots < 1) {
    throw new Error('unknown plan: pass --slots from the account plan');
  }
  return {
    plan: normalized,
    slots,
    source: configured === null ? 'Expo Starter default' : 'explicit',
  };
}

export function archiveResult(count) {
  if (!Number.isInteger(count) || count < 0) throw new Error('archive-check needs --count N');
  const ok = count <= 20;
  return {
    ok,
    count,
    limit: 20,
    next: ok
      ? 'archive through the app'
      : 'close Codex, back up state_5.sqlite, and use an offline supported cleanup',
  };
}

export function parseProcesses(text, platform = process.platform) {
  const names = platform === 'win32'
    ? new Set(['emulator.exe', 'qemu-system-x86_64.exe', 'gradle.exe', 'java.exe'])
    : new Set(['emulator', 'qemu-system-x86_64', 'gradle']);
  const processes = [];
  for (const line of String(text).split(/\r?\n/)) {
    const match = platform === 'win32'
      ? line.match(/^"([^"]+)","(\d+)"/)
      : line.trim().match(/^(\d+)\s+(\S+)/);
    if (!match) continue;
    const name = platform === 'win32'
      ? match[1].toLowerCase()
      : path.basename(match[2]).toLowerCase();
    const pid = Number(platform === 'win32' ? match[2] : match[1]);
    if (names.has(name)) processes.push({ pid, name });
  }
  return processes;
}

function flag(args, name) {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? null : args[index + 1];
}

function print(value) {
  console.log(JSON.stringify(value));
}

function processListing() {
  const windows = process.platform === 'win32';
  return spawnSync(
    windows ? 'tasklist' : 'ps',
    windows ? ['/fo', 'csv', '/nh'] : ['-eo', 'pid=,comm='],
    { encoding: 'utf8' },
  ).stdout || '';
}

function queued(args) {
  const file = path.resolve(flag(args, 'file') || '.bgzflow/queued-jobs.json');
  const minutes = Number(flag(args, 'minutes') || 5);
  const apply = args.includes('--apply');
  const now = Date.now();
  const read = () => {
    const jobs = JSON.parse(fs.readFileSync(writablePath(file), 'utf8'));
    if (!Array.isArray(jobs) || jobs.some((job) => !job.id) || new Set(jobs.map((job) => job.id)).size !== jobs.length) {
      throw new Error('Queue ledger must contain uniquely identified jobs');
    }
    return jobs;
  };
  const jobs = read();
  const restarted = [];
  const failed = [];
  const update = (id, action) => withOwnedLock(file, () => {
    const current = read(), job = current.find((row) => row.id === id);
    if (!job) return null; // A concurrently removed job must never be resurrected.
    const result = action(job);
    writeOwnedFile(file, `${JSON.stringify(current, null, 2)}\n`);
    return result;
  });
  for (const job of jobs) {
    let alive = false;
    if (job.pid) {
      try {
        process.kill(job.pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (job.state !== 'queued' || alive || now - Date.parse(job.queuedAt) < minutes * 60_000) continue;
    job.detectedStuckAt = new Date(now).toISOString();
    if (!apply) continue;
    const claim = update(job.id, (current) => {
      if (current.state !== 'queued') return null;
      if (now - Date.parse(current.queuedAt) < minutes * 60_000) return null;
      if (current.pid) {
        try { process.kill(current.pid, 0); return null; } catch { /* Recorded process is dead. */ }
      }
      current.detectedStuckAt = job.detectedStuckAt;
      if (current.mutationSafe !== true || !Array.isArray(current.restartCommand)
        || !current.restartCommand.length || (current.restarts || 0) >= 1) return null;
      current.restarts = (current.restarts || 0) + 1;
      current.state = 'restart-pending';
      current.restartOperation = randomUUID();
      return { operation: current.restartOperation, command: [...current.restartCommand], cwd: current.cwd };
    });
    if (claim) {
      const result = spawnSync(claim.command[0], claim.command.slice(1), {
        cwd: claim.cwd || process.cwd(),
        stdio: 'ignore',
        detached: true,
      });
      const state = result.error || result.status !== 0 || result.signal ? 'failed' : 'restarted';
      const merged = update(job.id, (current) => {
        if (current.restartOperation !== claim.operation || current.state !== 'restart-pending') {
          throw new Error('Restart result conflicts with a newer queue state; reconcile its recorded operation');
        }
        Object.assign(current, {
          state, restartPid: result.pid || null, restartExitCode: result.status,
          restartError: result.error?.code || null, restartSignal: result.signal || null,
        });
        return true;
      });
      if (!merged) throw new Error('Restarted job was removed during execution; reconcile its recorded operation');
      if (state === 'failed') failed.push(job.id);
      restarted.push(job.id);
    }
  }
  const latest = apply ? read() : jobs;
  return {
    applied: apply,
    restarted,
    failed,
    jobs: latest
      .filter((job) => job.detectedStuckAt)
      .map((job) => ({ id: job.id, state: job.state, mutationSafe: job.mutationSafe === true })),
  };
}

export function run(argv = process.argv.slice(2)) {
  const args = [...argv];
  const command = args.shift();
  if (command === 'disk') {
    const target = path.resolve(flag(args, 'path') || process.cwd());
    const minGb = Number(flag(args, 'min-gb') || 10);
    const result = diskResult(target, minGb);
    print(result);
    return result.ok ? 0 : 4;
  }
  if (command === 'build-slots') {
    print(buildSlots(flag(args, 'plan') || process.env.EXPO_PLAN || 'starter', flag(args, 'slots')));
    return 0;
  }
  if (command === 'archive-check') {
    const result = archiveResult(Number(flag(args, 'count')));
    print(result);
    return result.ok ? 0 : 4;
  }
  if (command === 'queued') {
    const result = queued(args);
    print(result);
    return result.failed.length ? 4 : 0;
  }
  if (command === 'reap') {
    const owned = readOwnedProcesses(process.env, flag(args, 'file'));
    const processes = parseProcesses(processListing()).filter((candidate) => owned.some((record) =>
      record.pid === candidate.pid && record.launchedBy === 'bgzflow' && record.owner
      && record.state === 'idle' && record.identity
      && record.identity === processIdentity(candidate.pid)));
    const apply = args.includes('--apply');
    if (apply) {
      for (const candidate of processes) {
        try {
          // Revalidate creation identity immediately before the signal (PID reuse).
          const record = owned.find((row) => row.pid === candidate.pid);
          if (record.identity === processIdentity(candidate.pid)) process.kill(candidate.pid, 'SIGTERM');
        } catch {
          // The process may have ended after the inventory.
        }
      }
    }
    print({
      applied: apply,
      processes,
      avdFilesTouched: 0,
      note: 'Only recorded BGZFLOW-owned idle process identities are signalled; default is dry-run.',
    });
    return 0;
  }
  throw new Error('usage: bg-governor disk|build-slots|archive-check|queued|reap');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(`bg-governor: ${error.message}`);
    process.exitCode = 2;
  }
}
