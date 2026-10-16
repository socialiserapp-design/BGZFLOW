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
  if (message.acted) {
    return { state: 'acted_upon', answer: message.acted.effect, message };
  }
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
    const kindFlag = flag('kind');
    const topicFlag = flag('topic');
    const priorityFlag = flag('priority');
    const waitMinutes = Number(flag('wait-minutes') || 15);
    if (!project || !body) {
      throw new Error('post needs --project --from --to --body [--default TEXT] [--wait-minutes N] [--kind KIND] [--topic SLUG] [--priority urgent|normal]');
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
      kind: kindFlag ? safe(kindFlag, 'kind') : 'question',
      body,
      default: fallback || null,
      waitMinutes,
      createdAt: new Date().toISOString(),
      state: 'open',
      ...(topicFlag ? { topic: safe(topicFlag, 'topic') } : {}),
      ...(priorityFlag ? { priority: safe(priorityFlag, 'priority') } : {}),
    };
    const file = path.join(box(project), `${id}.json`);
    try {
      atomic(file, message);
      // Auto-supersede older open messages from the same sender->recipient on the same topic (or progress/status updates)
      if (topicFlag || message.kind === 'progress' || message.kind === 'status') {
        try {
          const existing = rows(project);
          for (const prev of existing) {
            if (
              prev.id !== id &&
              prev.state === 'open' &&
              prev.from === from &&
              prev.to === to &&
              ((topicFlag && prev.topic === topicFlag) || (!topicFlag && (prev.kind === 'progress' || prev.kind === 'status')))
            ) {
              const prevFile = path.join(box(project), `${prev.id}.json`);
              prev.state = 'superseded';
              prev.supersededBy = id;
              prev.supersededAt = message.createdAt;
              atomic(prevFile, prev);
            }
          }
        } catch {
          // non-fatal
        }
      }
    } catch (error) {
      // Only a folder the worker may not write to is worked around; a link or any other refusal still fails.
      if (whyNotWritable(path.dirname(file)) !== 'permission') throw error;
      spool(message);
      return;
    }
    console.log(JSON.stringify(message));
    return;
  }

  if (command === 'ack') {
    const project = flag('project');
    const id = path.basename(flag('id') || '');
    const from = safe(flag('from'), 'from');
    if (!project || !id) throw new Error('ack needs --project --id --from');
    const file = path.join(box(project), `${id}.json`);
    const lock = `${file}.reply.lock`;
    withOwnedLock(file, () => {
      const message = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (message.to !== from && message.to !== 'all' && message.to !== 'broadcast') {
        throw new Error('only the addressed recipient can ack');
      }
      if (message.state !== 'open' && message.state !== 'acknowledged') throw new Error('message is already closed');
      message.ack = { from, at: new Date().toISOString() };
      message.state = 'acknowledged';
      atomic(file, message);
      console.log(JSON.stringify(message));
    }, lock);
    return;
  }

  if (command === 'ack-all') {
    const project = flag('project');
    const to = safe(flag('to') || flag('from'), 'to');
    if (!project || !to) throw new Error('ack-all needs --project --to <role>');
    const all = rows(project);
    const acked = [];
    for (const msg of all) {
      if (msg.state === 'open' && (msg.to === to || msg.to === 'all' || msg.to === 'broadcast')) {
        const file = path.join(box(project), `${msg.id}.json`);
        try {
          msg.ack = { from: to, at: new Date().toISOString() };
          msg.state = 'acknowledged';
          atomic(file, msg);
          acked.push(msg.id);
        } catch {
          // ignore
        }
      }
    }
    console.log(JSON.stringify({ ok: true, project, to, ackedCount: acked.length, acked }));
    return;
  }

  if (command === 'compact') {
    const project = flag('project');
    if (!project) throw new Error('compact needs --project');
    const archiveHours = Number(flag('archive-hours') ?? 2);
    const now = Date.now();
    const directory = box(project);
    const archiveDir = path.join(directory, 'archive');
    const all = rows(project);
    let superseded = 0;
    let expired = 0;
    let archived = 0;
    const latestOpenByKey = new Map();

    // Newest first to supersede older duplicate status/topic messages
    for (const msg of [...all].reverse()) {
      if (msg.state !== 'open') continue;
      const ageMin = (now - Date.parse(msg.createdAt || '')) / 60_000;
      const ttlMin = Number.isFinite(msg.waitMinutes) && msg.waitMinutes > 0 ? msg.waitMinutes : 60;
      if (ageMin > ttlMin && (msg.default !== null || ageMin > 120)) {
        msg.state = 'expired';
        msg.expiredAt = new Date(now).toISOString();
        atomic(path.join(directory, `${msg.id}.json`), msg);
        expired++;
        continue;
      }
      const key = `${msg.from}->${msg.to}:${msg.topic || msg.kind || 'question'}`;
      if ((msg.topic || msg.kind === 'progress' || msg.kind === 'status') && latestOpenByKey.has(key)) {
        msg.state = 'superseded';
        msg.supersededBy = latestOpenByKey.get(key);
        msg.supersededAt = new Date(now).toISOString();
        atomic(path.join(directory, `${msg.id}.json`), msg);
        superseded++;
      } else {
        latestOpenByKey.set(key, msg.id);
      }
    }

    // Move closed/answered/superseded/expired messages older than archiveHours to archive/
    if (archiveHours >= 0 && fs.existsSync(directory)) {
      fs.mkdirSync(archiveDir, { recursive: true });
      for (const msg of rows(project)) {
        if (msg.state === 'open') continue;
        const ageHours = (now - Date.parse(msg.createdAt || '')) / 3_600_000;
        if (ageHours >= archiveHours) {
          const src = path.join(directory, `${msg.id}.json`);
          const dst = path.join(archiveDir, `${msg.id}.json`);
          try {
            fs.renameSync(src, dst);
            archived++;
          } catch {
            // ignore
          }
        }
      }
    }

    console.log(JSON.stringify({ ok: true, project, superseded, expired, archived }));
    return;
  }

  if (command === 'act') {
    const project = flag('project');
    const id = path.basename(flag('id') || '');
    const from = safe(flag('from'), 'from');
    const effect = flag('effect') || flag('body');
    if (!project || !id || !effect) throw new Error('act needs --project --id --from --effect');
    const file = path.join(box(project), `${id}.json`);
    const lock = `${file}.reply.lock`;
    withOwnedLock(file, () => {
      const message = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (message.to !== from) throw new Error('only the addressed recipient can act');
      message.acted = { from, effect, at: new Date().toISOString() };
      message.state = 'acted_upon';
      atomic(file, message);
      console.log(JSON.stringify(message));
    }, lock);
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
      if (message.state !== 'open' && message.state !== 'acknowledged') throw new Error('message is already closed');
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
      const message = rows(project).find((row) => row.to === to && (row.state === 'open' || row.state === 'acknowledged'));
      if (message) {
        console.log(JSON.stringify(message));
        return;
      }
      await sleep(pollMs);
    }
  }

  if (command === 'get') {
    const project = flag('project');
    const id = flag('id');
    if (!project || !id) throw new Error('get needs --project --id');
    const message = lookup(project, id);
    if (!message) throw new Error('message not found');
    console.log(JSON.stringify(message));
    return;
  }

  if (command === 'list') {
    const project = flag('project');
    const to = flag('to');
    const stateFilter = flag('state');
    const allFlag = args.includes('--all');
    const fullFlag = args.includes('--full') || allFlag;
    const rawLimit = flag('limit');
    const limitFlag = rawLimit !== null ? Number(rawLimit) : (allFlag ? 0 : 10);
    if (!project) throw new Error('list needs --project');
    let filtered = rows(project).filter((row) => (!to || row.to === to) && (!stateFilter || row.state === stateFilter));
    if (limitFlag > 0) filtered = filtered.slice(-limitFlag);
    if (!fullFlag) {
      filtered = filtered.map((row) => {
        const longBody = typeof row.body === 'string' && row.body.length > 240;
        const longReply = typeof row.reply?.body === 'string' && row.reply.body.length > 240;
        if (!longBody && !longReply) return row;
        return {
          ...row,
          ...(longBody ? { body: `${row.body.slice(0, 240)}... [truncated; use bg-mail get --project ${project} --id ${row.id}]` } : {}),
          ...(longReply ? { reply: { ...row.reply, body: `${row.reply.body.slice(0, 240)}... [truncated]` } } : {}),
        };
      });
    }
    console.log(JSON.stringify(filtered));
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

  throw new Error('usage: bg-mail post|ack|ack-all|act|reply|get|wait|watch|list|compact|collect ...');
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
