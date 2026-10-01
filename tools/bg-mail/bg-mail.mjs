#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writablePath, writeOwnedFile, withOwnedLock } from '../../hooks/lib/owned-path.mjs';

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
    atomic(path.join(box(project), `${id}.json`), message);
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
      const message = rows(project).find((row) => row.id === id);
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

  throw new Error('usage: bg-mail post|reply|wait|watch|list ...');
}

main().catch((error) => {
  console.error(`bg-mail: ${error.message}`);
  process.exitCode = 2;
});
