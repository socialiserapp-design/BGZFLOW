// Hook input/output plumbing shared by every BGZFLOW hook.
//
// Contract for every hook script:
//   * read one JSON object from stdin (a host may send an empty or broken body: treated as {})
//   * never throw, never exit non-zero: any failure is caught, logged as one line in
//     <project>/.bgzflow/hooks.log and the hook exits 0 (fail open)
//   * print at most one JSON object on stdout
//
// Field names differ per host, so every accessor accepts each spelling:
//   Claude Code / Codex: snake_case (hook_event_name, tool_name, tool_input, transcript_path)
//   Grok:                camelCase  (hookEventName, toolName, toolInput, workspaceRoot)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.mjs';
import { findProjectDir } from './project.mjs';
import { redactSecrets } from './secrets.mjs';
import { ownedPath } from './owned-path.mjs';

const STDIN_TIMEOUT_MS = 1500;
const WATCHDOG_MS = 8000;
const LOG_MAX_BYTES = 200 * 1024;
const LOG_KEEP_BYTES = 100 * 1024;

export function readStdin(timeoutMs = STDIN_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let data = '';
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(data);
    };
    const timer = setTimeout(done, timeoutMs);
    try {
      if (process.stdin.isTTY) return done();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        data += chunk;
        if (data.length > 5_000_000) done();
      });
      process.stdin.on('end', done);
      process.stdin.on('error', done);
    } catch {
      done();
    }
  });
}

export function parseInput(text) {
  if (typeof text !== 'string') return {};
  const trimmed = text.replace(/^﻿/, '').trim();
  if (!trimmed) return {};
  try {
    const value = JSON.parse(trimmed);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

export const eventName = (input) => pick(input, ['hook_event_name', 'hookEventName']);
export const toolName = (input) => pick(input, ['tool_name', 'toolName']);
export const transcriptPath = (input) => pick(input, ['transcript_path', 'transcriptPath']);

export function toolInput(input) {
  const value = pick(input, ['tool_input', 'toolInput']);
  return value && typeof value === 'object' ? value : {};
}

// The file a file-tool touched, from any host's spelling of the argument.
export function toolFilePath(ti) {
  const value = pick(ti, ['file_path', 'filePath', 'path', 'file', 'target_file', 'targetFile', 'notebook_path']);
  return typeof value === 'string' && value ? value : undefined;
}

export function logFile(projectDir) {
  return projectDir ? path.join(projectDir, '.bgzflow', 'hooks.log') : undefined;
}

function oneLine(text) {
  return String(text).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 400);
}

// One line per event, real clock, secrets redacted. Never throws.
export function logLine(projectDir, hook, message) {
  let fd;
  try {
    if (!projectDir || !ownedPath(projectDir, '.bgzflow', { directory: true, create: true })) return;
    const file = ownedPath(projectDir, '.bgzflow/hooks.log');
    if (!file) return;
    fd = fs.openSync(file, fs.constants.O_RDWR | fs.constants.O_APPEND | fs.constants.O_CREAT | (fs.constants.O_NOFOLLOW || 0), 0o600);
    if (!fs.fstatSync(fd).isFile() || fs.fstatSync(fd).nlink > 1 || !ownedPath(projectDir, '.bgzflow/hooks.log')) return;
    const stamp = new Date().toISOString();
    fs.appendFileSync(fd, `${stamp} ${hook} ${redactSecrets(oneLine(message))}\n`, 'utf8');
    const size = fs.fstatSync(fd).size;
    if (size > LOG_MAX_BYTES) {
      const buf = Buffer.alloc(LOG_KEEP_BYTES);
      fs.readSync(fd, buf, 0, buf.length, size - LOG_KEEP_BYTES);
      const tail = buf.toString('utf8');
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, tail.slice(tail.indexOf('\n') + 1));
    }
  } catch {
    // logging must never break a hook
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch { /* logging remains fail-open */ }
  }
}

export function contextOutput(event, text) {
  return { hookSpecificOutput: { hookEventName: event, additionalContext: text } };
}

export function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

// Run one hook. `handler({ input, projectDir, cfg })` returns an object to print, a string to print, or nothing.
// The process leaves as soon as its output is flushed: a host that keeps stdin open must not keep the hook alive.
export async function runHook(name, handler) {
  const watchdog = setTimeout(() => process.exit(0), WATCHDOG_MS);
  watchdog.unref();
  process.stdout.on('error', () => process.exit(0));
  let projectDir;
  let text = '';
  try {
    const input = parseInput(await readStdin());
    projectDir = findProjectDir({
      cwd: pick(input, ['cwd']),
      workspaceRoot: pick(input, ['workspaceRoot', 'workspace_root']),
    });
    const cfg = loadConfig(projectDir);
    for (const warning of cfg.warnings) logLine(projectDir, name, `config: ${warning}`);
    const out = await handler({ input, projectDir, cfg });
    if (out !== undefined && out !== null && out !== '') text = typeof out === 'string' ? out : JSON.stringify(out);
  } catch (err) {
    logLine(projectDir, name, `error (fail open): ${err && err.message ? err.message : err}`);
  }
  process.exitCode = 0;
  if (text) process.stdout.write(text, () => process.exit(0));
  else process.exit(0);
}
