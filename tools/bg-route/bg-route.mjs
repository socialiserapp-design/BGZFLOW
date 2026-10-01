#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendOwned } from '../../hooks/lib/owned-path.mjs';

const args = process.argv.slice(2);
const command = args.shift();

function flag(name) {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? null : args[index + 1];
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

const file = path.resolve(flag('file') || '.bgzflow/route-receipts.jsonl');

try {
  if (command === 'record') {
    const job = flag('job');
    const provider = flag('provider');
    const account = flag('account');
    const environment = flag('environment') || 'local';
    if (!job || !provider || !account) {
      throw new Error('record needs --job --provider --account [--environment]');
    }
    const row = {
      schema: 1,
      job,
      provider,
      accountProof: hash(`${provider}\0${account}`),
      environment,
      recordedAt: new Date().toISOString(),
    };
    appendOwned(file, `${JSON.stringify(row)}\n`);
    console.log(JSON.stringify(row));
  } else if (command === 'verify') {
    const job = flag('job');
    const provider = flag('provider');
    const account = flag('account');
    if (!job || !provider || !account) throw new Error('verify needs --job --provider --account');
    const rows = fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
      : [];
    const receipt = rows.reverse().find((row) => row.job === job);
    const ok = Boolean(
      receipt
      && receipt.provider === provider
      && receipt.accountProof === hash(`${provider}\0${account}`),
    );
    console.log(JSON.stringify({ ok, job, receipt: receipt || null }));
    if (!ok) process.exitCode = 4;
  } else {
    throw new Error('usage: bg-route record|verify ...');
  }
} catch (error) {
  console.error(`bg-route: ${error.message}`);
  process.exitCode = 2;
}
