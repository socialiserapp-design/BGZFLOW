#!/usr/bin/env node
// `bgz preflight` - worker-start check. Read-only: it reports, it never changes or deletes anything.
// Flags: (1) stray skill folders (no SKILL.md, or the same skill name in two places), (2) instruction overviews that load
// at start and run over 4,000 characters (AGENTS.md / CLAUDE.md in the project and in installed plugin folders, and
// skill descriptions), (3) ANTHROPIC_API_KEY set in the environment (the value is never shown).
// A skill name defined in two different folders is a warning only (warn: true): it is listed but never makes ok false or
// fails --strict. Links (junctions, symlinks) to the same real folder are one skill, not a duplicate.
//   bgz preflight [--dir <project>] [--json] [--strict]     --strict exits 1 when anything is flagged
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIMIT_CHARS = 4000;
const samePath = (a, b) => (process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b));

function frontmatterName(text) {
  const m = /^name:\s*["']?([^\r\n"']+)["']?\s*$/m.exec(String(text).slice(0, 3000));
  return m ? m[1].trim() : '';
}
function frontmatterDescription(text) {
  const head = String(text).slice(0, 12000);
  const d = /^description:\s*(?:[>|][+-]?\s*\r?\n((?:[ \t]+.*\r?\n?)+)|["']?(.*?)["']?\s*$)/m.exec(head);
  return d ? String(d[1] || d[2] || '').replace(/\s+/g, ' ').trim() : '';
}
const chars = (file) => {
  try {
    return fs.readFileSync(file, 'utf8').length;
  } catch {
    return 0;
  }
};

export function preflight({ dir = process.cwd(), env = process.env, home = os.homedir() } = {}) {
  const findings = [];
  const skillRoots = [path.join(home, '.claude', 'skills'), path.join(home, '.codex', 'skills'), path.join(home, '.agents', 'skills'), path.join(dir, '.claude', 'skills'), path.join(dir, '.agents', 'skills')];
  const seen = new Map();
  for (const root of skillRoots) {
    let kids;
    try {
      kids = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const k of kids) {
      if (!k.isDirectory() && !k.isSymbolicLink()) continue;
      if (k.name.startsWith('.')) continue; // .system and similar are managed by the host
      const folder = path.join(root, k.name);
      const file = path.join(folder, 'SKILL.md');
      let text;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        findings.push({ kind: 'stray-skill-folder', path: folder, note: 'no SKILL.md in this folder' });
        continue;
      }
      const name = frontmatterName(text) || k.name;
      let real = folder;
      try {
        real = fs.realpathSync(folder);
      } catch {}
      const prev = seen.get(name);
      if (!prev) seen.set(name, { real, path: folder });
      else if (samePath(prev.real, real) === false) {
        findings.push({ kind: 'duplicate-skill-name', warn: true, path: folder, other: prev.path, note: `skill "${name}" is also defined in ${prev.path}; the host may load either copy` });
      }
      const dlen = frontmatterDescription(text).length;
      if (dlen > LIMIT_CHARS) findings.push({ kind: 'long-overview', path: file, chars: dlen, note: 'skill description loads at start' });
    }
  }
  const overviews = [path.join(dir, 'AGENTS.md'), path.join(dir, 'CLAUDE.md'), path.join(home, '.claude', 'CLAUDE.md'), path.join(home, '.codex', 'AGENTS.md')];
  const plugins = path.join(home, '.claude', 'plugins');
  const stack = [[plugins, 4]];
  while (stack.length) {
    const [d, depth] = stack.pop();
    let kids;
    try {
      kids = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    if (kids.some((k) => k.name === 'plugin.json' || k.name === '.claude-plugin')) {
      for (const f of ['AGENTS.md', 'CLAUDE.md']) overviews.push(path.join(d, f));
      continue;
    }
    if (depth > 0) for (const k of kids) if (k.isDirectory() && !['node_modules', '.git', 'skills'].includes(k.name)) stack.push([path.join(d, k.name), depth - 1]);
  }
  for (const f of overviews) {
    const n = chars(f);
    if (n > LIMIT_CHARS) findings.push({ kind: 'long-overview', path: f, chars: n, note: `over ${LIMIT_CHARS} characters; it loads at the start of every chat` });
  }
  if (typeof env.ANTHROPIC_API_KEY === 'string' && env.ANTHROPIC_API_KEY.trim()) {
    findings.push({ kind: 'anthropic-api-key-set', note: 'ANTHROPIC_API_KEY is set (value not shown). Calls may bill the API instead of the plan; unset it unless that is intended.' });
  }
  return { ok: findings.every((f) => f.warn), findings };
}

const UNSANITIZED_BORROWED_NAMES = new RegExp(
  `\\b(?:${[
    ['impec', 'cable'].join(''),
    ['design-taste-', 'frontend'].join(''),
    ['gpt-', 'taste'].join(''),
    ['ui-ux-', 'pro-max'].join(''),
    ['stitch-', 'design-taste'].join(''),
    ['theme-', 'factory'].join(''),
    ['claude-', 'flow'].join(''),
    ['ruf', 'lo'].join(''),
    ['jesse\\s+', 'vincent'].join(''),
  ].join('|')})\\b`,
  'i'
);

export function checkHarmonyAndSanitization(pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')) {
  const findings = [];
  const skillsDir = path.join(pluginRoot, 'skills');
  const walk = (d) => {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && /\.(?:md|json|mjs)$/i.test(e.name)) {
        const text = fs.readFileSync(full, 'utf8');
        const m = UNSANITIZED_BORROWED_NAMES.exec(text);
        if (m) {
          findings.push({ kind: 'unsanitized-external-credit', path: full, match: m[0], note: 'public BGZFLOW skill files must credit only Simeon Kontogeorges and omit borrowed skill names' });
        }
        if (/\b(?:never use inter|ban inter|always use dark mode|mandatory glassmorphism)\b/i.test(text) && !/\b(?:Dropped|not the rule|never a default|one option)\b/i.test(text)) {
          findings.push({ kind: 'contradictory-global-style-ban', path: full, note: 'turns an optional style family into a global ban' });
        }
      }
    }
  };
  walk(skillsDir);
  return { ok: findings.length === 0, findings };
}

function main(argv) {
  const json = argv.includes('--json');
  const strict = argv.includes('--strict');
  const harmony = argv.includes('--harmony');
  const di = argv.indexOf('--dir');
  const res = preflight({ dir: di !== -1 && argv[di + 1] ? path.resolve(argv[di + 1]) : process.cwd() });
  if (harmony) {
    const h = checkHarmonyAndSanitization();
    res.findings.push(...h.findings);
    res.ok = res.findings.every((f) => f.warn);
    res.harmony = h.ok;
  }
  if (json) console.log(JSON.stringify(res, null, 2));
  else if (!res.findings.length) console.log('bgz preflight: nothing flagged.');
  else {
    console.log(`bgz preflight: ${res.findings.length} thing(s) flagged (read-only; nothing was changed)`);
    for (const f of res.findings) console.log(`  - ${f.warn ? 'warning: ' : ''}${f.kind}${f.path ? `: ${f.path}` : ''}${f.chars ? ` (${f.chars} chars)` : ''}${f.note ? ` - ${f.note}` : ''}`);
  }
  if ((strict && !res.ok) || (harmony && !res.harmony)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
