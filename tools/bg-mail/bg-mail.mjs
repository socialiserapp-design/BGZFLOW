#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isLinked, writablePath, writeOwnedFile, withOwnedLock } from '../../hooks/lib/owned-path.mjs';

const root = process.env.BG_MAIL_DIR || path.join(
  process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'),
  'bgzflow',
  'mail',
);
const pollMs = Number(process.env.BG_MAIL_POLL_MS) || 200;
const args = process.argv.slice(2);
const command = args.shift();

function flag(name) {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? null : args[index + 1];
}

function safe(value, name) {
  if (!/^[A-Za-z0-9._-]+$/.test(value || '') || value === '.' || value === '..') {
    throw new Error(`${name} must use letters, numbers, dots, underscores or dashes`);
  }
  return value;
}

function box(project) {
  return path.join(root, safe(project, 'project'));
}

function atomic(file, value) {
  writeOwnedFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function rows(project) {
  const directory = box(project);
  try {
    if (!fs.existsSync(directory)) return [];
    writablePath(directory, { directory: true });
    return fs.readdirSync(directory)
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(fs.readFileSync(writablePath(path.join(directory, name)), 'utf8')))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const PERMISSION = new Set(['EACCES', 'EPERM', 'EROFS', 'ERR_ACCESS_DENIED']);
const NAME = /^[A-Za-z0-9._-]+$/;

// Why a folder cannot take a message. 'link': a link in its path, a refusal that is never worked around.
// 'permission': read-only or outside the sandbox, the case the spool is for. null: writable, or not a permission problem.
function whyNotWritable(directory) {
  const absolute = path.resolve(directory);
  const drive = path.parse(absolute).root;
  let current = drive;
  let nearest = drive;
  for (const part of path.relative(drive, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') break;
      return PERMISSION.has(error.code) ? 'permission' : null;
    }
    if (isLinked(stat)) return 'link';
    if (!stat.isDirectory()) return null;
    nearest = current;
  }
  // Try to create and remove a probe in the nearest folder that exists.
  const probe = path.join(nearest, `.bg-mail-probe-${process.pid}-${crypto.randomUUID()}`);
  try {
    fs.writeFileSync(probe, '', { flag: 'wx', mode: 0o600 });
  } catch (error) {
    return PERMISSION.has(error.code) ? 'permission' : null;
  }
  try { fs.unlinkSync(probe); } catch { /* the probe is empty and ignored by every command */ }
  return null;
}

// A worker that cannot write the shared inbox leaves its message here for the lead to collect.
const spoolDirectory = () => path.join(process.cwd(), '.bgzflow', 'mail-spool');

function spool(message) {
  try {
    atomic(path.join(spoolDirectory(), `${message.id}.json`), message);
  } catch {
    throw new Error('the inbox is not writable and the spool folder could not be written either; run from a folder you can write to');
  }
  console.log(JSON.stringify(message));
  console.error(`bg-mail: inbox not writable; message spooled to .bgzflow/mail-spool/${message.id}.json (lead: bg-mail collect --from <that folder>)`);
}

// A message as `post` writes it. Spooled files come from another process, so check them before trusting them.
function validMessage(message, file) {
  const named = (value) => typeof value === 'string' && NAME.test(value) && value !== '.' && value !== '..';
  const good = message && typeof message === 'object' && !Array.isArray(message)
    && message.schema === 1 && named(message.id) && file === `${message.id}.json`
    && named(message.project) && named(message.from) && named(message.to)
    && message.kind === 'question' && typeof message.body === 'string' && message.body !== ''
    && (message.default === null || typeof message.default === 'string')
    && Number.isFinite(message.waitMinutes) && message.waitMinutes >= 0
    && typeof message.createdAt === 'string' && Number.isFinite(Date.parse(message.createdAt))
    && message.state === 'open' && message.reply === undefined;
  return good ? message : null;
}

function spooled(id) {
  if (!NAME.test(id || '')) return undefined;
  try {
    return validMessage(JSON.parse(fs.readFileSync(path.join(spoolDirectory(), `${id}.json`), 'utf8')), `${id}.json`) || undefined;
  } catch {
    return undefined;
  }
}

// The inbox copy wins. The spooled copy answers only when the inbox cannot be read or does not hold the message.
function lookup(project, id) {
  let failure;
  try {
    const found = rows(project).find((row) => row.id === id);
    if (found) return found;
  } catch (error) {
    failure = error;
  }
  const local = spooled(id);
  if (local) return local;
  if (failure) throw failure;
  return undefined;
}

// Copy spooled messages into the inbox. A message already in the inbox is never rewritten, so replies survive repeat runs.
function collect(from, remove) {
  let names;
  try {
    if (!fs.statSync(from).isDirectory()) throw new Error('collect --from must be a folder');
    names = fs.readdirSync(from).filter((name) => name.endsWith('.json')).sort();
  } catch (error) {
    throw new Error(error.code ? 'collect --from folder does not exist or cannot be read' : error.message);
  }
  const result = { imported: [], skipped: [], removed: [], invalid: [], failed: [] };
  for (const name of names) {
    const source = path.join(from, name);
    let message = null;
    try {
      if (fs.lstatSync(source).isFile()) message = validMessage(JSON.parse(fs.readFileSync(source, 'utf8')), name);
    } catch { /* reported below as invalid */ }
    if (!message) {
      result.invalid.push(name);
      continue;
    }
    const target = path.join(box(message.project), `${message.id}.json`);
    try {
      let wrote = false;
      withOwnedLock(target, () => {
        let present = true;
        try { fs.lstatSync(target); } catch (error) { if (error.code === 'ENOENT') present = false; else throw error; }
        if (present) return;
        atomic(target, message);
        wrote = true;
      });
      if (!wrote) {
        result.skipped.push(message.id);
        continue;
      }
      result.imported.push(message.id);
    } catch {
      result.failed.push(message.id);
      continue;
    }
    // Remove only a file this run imported, and only after the inbox copy reads back with the same id.
    if (remove) {
      try {
        if (JSON.parse(fs.readFileSync(writablePath(target), 'utf8')).id === message.id) {
          fs.unlinkSync(source);
          result.removed.push(message.id);
        }
      } catch { /* the spooled file stays where it is */ }
    }
  }
  return result;
}

function answer(message, now = Date.now()) {
  if (message.reply) {
    return { state: 'answered', answer: message.reply.body, message };
  }
  const expired = now - Date.parse(message.createdAt) >= message.waitMinutes * 60_000;
  if (expired) return { state: 'default', answer: message.default, message };
  return null;
}

async function main() {
  if (command === 'post') {
    const project = flag('project');
    const from = safe(flag('from'), 'from');
    const to = safe(flag('to'), 'to');
    const body = flag('body');
    const fallback = flag('default');
    const waitMinutes = Number(flag('wait-minutes') || 15);
    if (!project || !body) {
      throw new Error('post needs --project --from --to --body [--default TEXT] [--wait-minutes N]');
    }
    if (!Number.isFinite(waitMinutes) || waitMinutes < 0) {
      throw new Error('wait-minutes must be zero or greater');
    }
    const id = `${Date.now()}-${crypto.randomUUID()}`;
    const message = {
      schema: 1,
      id,
      project,
      from,
      to,
      kind: 'question',
      body,
      default: fallback || null,
      waitMinutes,
      createdAt: new Date().toISOString(),
      state: 'open',
    };
    const file = path.join(box(project), `${id}.json`);
    try {
      atomic(file, message);
    } catch (error) {
      // Only a folder the worker may not write to is worked around; a link or any other refusal still fails.
      if (whyNotWritable(path.dirname(file)) !== 'permission') throw error;
      spool(message);
      return;
    }
    console.log(JSON.stringify(message));
    return;
  }

  if (command === 'reply') {
    const project = flag('project');
    const id = path.basename(flag('id') || '');
    const from = safe(flag('from'), 'from');
    const body = flag('body');
    if (!project || !id || !body) throw new Error('reply needs --project --id --from --body');
    const file = path.join(box(project), `${id}.json`);
    const lock = `${file}.reply.lock`;
    withOwnedLock(file, () => {
      const message = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (message.to !== from) throw new Error('only the addressed recipient can reply');
      if (message.state !== 'open') throw new Error('message is already closed');
      message.reply = { from, body, at: new Date().toISOString() };
      message.state = 'answered';
      atomic(file, message);
      console.log(JSON.stringify(message));
    }, lock);
    return;
  }

  if (command === 'wait') {
    const project = flag('project');
    const id = flag('id');
    while (true) {
      const message = lookup(project, id);
      if (!message) throw new Error('message not found');
      const result = answer(message);
      if (result) {
        console.log(JSON.stringify(result));
        return;
      }
      await sleep(pollMs);
    }
  }

  if (command === 'watch') {
    const project = flag('project');
    const to = safe(flag('to'), 'to');
    if (!project) throw new Error('watch needs --project --to');
    while (true) {
      const message = rows(project).find((row) => row.to === to && row.state === 'open');
      if (message) {
        console.log(JSON.stringify(message));
        return;
      }
      await sleep(pollMs);
    }
  }

  if (command === 'list') {
    const project = flag('project');
    const to = flag('to');
    if (!project) throw new Error('list needs --project');
    console.log(JSON.stringify(rows(project).filter((row) => !to || row.to === to)));
    return;
  }

  if (command === 'collect') {
    const from = flag('from');
    if (!from) throw new Error('collect needs --from DIR [--remove]');
    const result = collect(from, args.includes('--remove'));
    console.log(JSON.stringify(result));
    if (result.failed.length) process.exitCode = 2;
    return;
  }

  throw new Error('usage: bg-mail post|reply|wait|watch|list|collect ...');
}

// Name the failing check without printing the inbox, working-folder or home paths.
function scrub(message) {
  let clean = String(message);
  for (const [secret, label] of [[root, '<inbox>'], [process.cwd(), '<cwd>'], [os.homedir(), '<home>']]) {
    if (secret.length > 3) clean = clean.split(secret).join(label);
  }
  return clean;
}

main().catch((error) => {
  console.error(`bg-mail: ${scrub(error.message)}`);
  process.exitCode = 2;
});
