#!/usr/bin/env node
// Prints the evidence receipt for a handback (path, bytes, lines, sha256, modified time, totals) so no model types it.
//   node tools/receipt/receipt.mjs <file-or-dir> [more paths...] [--json]   (folders are walked; .git and links are skipped)
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['.git']);

function display(full, cwd) {
  const rel = path.relative(cwd, full);
  const shown = rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : full;
  return shown.split(path.sep).join('/');
}

// Streams the file once: sha256 and line count together, never the whole file in memory.
export function measureFile(full) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    let bytes = 0;
    let newlines = 0;
    let last = -1;
    const stream = fs.createReadStream(full);
    stream.on('data', (chunk) => {
      hash.update(chunk);
      bytes += chunk.length;
      for (let i = 0; i < chunk.length; i += 1) if (chunk[i] === 10) newlines += 1;
      last = chunk[chunk.length - 1];
    });
    stream.on('error', reject);
    stream.on('end', () => {
      const lines = bytes === 0 ? 0 : newlines + (last === 10 ? 0 : 1);
      resolve({ bytes, lines, sha256: hash.digest('hex') });
    });
  });
}

function collect(target, out, skipped) {
  const st = fs.lstatSync(target);
  if (st.isSymbolicLink()) {
    skipped.push(target);
  } else if (st.isDirectory()) {
    const entries = fs.readdirSync(target, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
      collect(path.join(target, e.name), out, skipped);
    }
  } else if (st.isFile()) {
    out.push(target);
  }
}

export async function buildReceipt(targets, { cwd = process.cwd() } = {}) {
  const missing = [];
  const files = [];
  const skipped = [];
  for (const t of targets) {
    const full = path.resolve(cwd, t);
    if (!fs.existsSync(full)) missing.push(t);
    else collect(full, files, skipped);
  }
  const seen = new Set();
  const rows = [];
  for (const full of files) {
    if (seen.has(full)) continue;
    seen.add(full);
    const m = await measureFile(full);
    rows.push({ path: display(full, cwd), ...m, modified: fs.statSync(full).mtime.toISOString() });
  }
  const total = rows.reduce((t, r) => ({ files: t.files + 1, bytes: t.bytes + r.bytes, lines: t.lines + r.lines }), { files: 0, bytes: 0, lines: 0 });
  return { generated: new Date().toISOString(), files: rows, total, missing, skippedLinks: skipped.map((s) => display(s, cwd)) };
}

export function formatReceipt(r) {
  const lines = r.files.map((f) => `${f.path}  ${f.bytes} B  ${f.lines} lines  sha256 ${f.sha256}  ${f.modified}`);
  lines.push(`total: ${r.total.files} files, ${r.total.bytes} B, ${r.total.lines} lines (receipt ${r.generated})`);
  if (r.skippedLinks.length) lines.push(`skipped links: ${r.skippedLinks.join(', ')}`);
  if (r.missing.length) lines.push(`MISSING: ${r.missing.join(', ')}`);
  return lines.join('\n');
}

async function main(argv) {
  const json = argv.includes('--json');
  const targets = argv.filter((a) => a !== '--json');
  if (!targets.length || targets.includes('--help') || targets.includes('-h')) {
    console.log('usage: receipt <file-or-dir> [more...] [--json]');
    return targets.length ? 0 : 2;
  }
  const r = await buildReceipt(targets);
  console.log(json ? JSON.stringify(r, null, 2) : formatReceipt(r));
  return r.missing.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (err) => {
    console.error(`receipt: ${err.message}`);
    process.exitCode = 2;
  });
}
