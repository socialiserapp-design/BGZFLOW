#!/usr/bin/env node
// Stable entry for the shared inbox. Runs bg-mail from the newest installed BGZFLOW plugin,
// so the command in company rule 11 keeps working after plugin updates. Owner: ops lead.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const bases = [
  path.join(os.homedir(), '.claude', 'plugins', 'cache', 'bgzflow-live', 'bgzflow'),
  path.join(os.homedir(), '.codex', 'plugins', 'cache', 'bgzflow-live', 'bgzflow'),
];
const parts = (v) => v.split(/[.-]/).map((n) => (/^\d+$/.test(n) ? Number(n) : -1));
const newer = (a, b) => {
  const x = parts(a); const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};
const candidates = [];
for (const base of bases) {
  try {
    for (const v of fs.readdirSync(base).filter((v) => /^\d+\.\d+\.\d+/.test(v))) {
      for (const rel of [['tools', 'bgz-mail', 'bgz-mail.mjs'], ['tools', 'bg-mail', 'bg-mail.mjs']]) {
        const f = path.join(base, v, ...rel);
        if (fs.existsSync(f)) { candidates.push({ v, f }); break; }
      }
    }
  } catch {}
}
candidates.sort((a, b) => newer(a.v, b.v)).reverse();
const tool = candidates[0]?.f;
if (!tool) { console.error(`bg-mail: no installed BGZFLOW plugin found under ${bases.join(' or ')}`); process.exit(1); }
const r = spawnSync(process.execPath, [tool, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
