import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writablePath, writeOwnedFile } from '../../hooks/lib/owned-path.mjs';

function directory(env) {
  const base = process.platform === 'win32'
    ? env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    : env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return env.BGZFLOW_PROCESS_DIR || path.join(base, 'bgzflow', 'processes');
}

// Creation identity is separate from PID. Missing access or an exited child means
// no proof of ownership, so reaping must refuse that process.
export function processIdentity(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    if (process.platform === 'win32') {
      const result = spawnSync('wmic.exe', ['process', 'where', `ProcessId=${pid}`, 'get', 'CreationDate', '/value'],
        { encoding: 'utf8', timeout: 5000 });
      const identity = /CreationDate=(\d{14}\.\d{6}[+-]\d{3})/.exec(result.stdout || '')?.[1];
      return result.status === 0 ? identity || null : null;
    }
    if (process.platform === 'linux') {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] || null;
    }
  } catch { /* No identity, no ownership proof. */ }
  return null;
}

export function recordOwnedProcess(pid, owner, env = process.env) {
  const identity = processIdentity(pid);
  if (!identity || !owner) return null;
  const record = { pid, owner, identity, launchedBy: 'bgzflow', state: 'running', startedAt: new Date().toISOString() };
  writeOwnedFile(path.join(directory(env), `${pid}.json`), `${JSON.stringify(record)}\n`);
  return record;
}

export function setOwnedProcessState(pid, owner, state, env = process.env) {
  if (!['idle', 'running', 'exited'].includes(state)) throw new Error('Invalid owned process state');
  const file = path.join(directory(env), `${pid}.json`);
  const record = JSON.parse(fs.readFileSync(writablePath(file), 'utf8'));
  if (record.owner !== owner || record.launchedBy !== 'bgzflow'
    || record.identity !== processIdentity(pid)) throw new Error('Process ownership changed');
  record.state = state;
  writeOwnedFile(file, `${JSON.stringify(record)}\n`);
}

export function readOwnedProcesses(env = process.env, file) {
  if (file || env.BGZFLOW_PROCESS_FILE) {
    return JSON.parse(fs.readFileSync(writablePath(file || env.BGZFLOW_PROCESS_FILE), 'utf8'));
  }
  const root = directory(env);
  if (!fs.existsSync(root)) return [];
  writablePath(root, { directory: true });
  return fs.readdirSync(root).filter((name) => /^\d+\.json$/.test(name)).map((name) =>
    JSON.parse(fs.readFileSync(writablePath(path.join(root, name)), 'utf8')));
}
