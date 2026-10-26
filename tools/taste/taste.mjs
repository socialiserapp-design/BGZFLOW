#!/usr/bin/env node
import { isCommandEntry } from '../../hooks/lib/command-entry.mjs';
// BGZFLOW Mechanical Identity Lock & Anti-Slop Guard
// Public BGZFLOW provides LOCKED_IDENTITY protection for existing projects and deterministic anti-slop linting.
// Cross-Project 10-Build Taste Memory & 8+ Direction Exploration Synthesis is powered by the Lucian Engine (~/.bgzflow/lucian-engine/taste-engine.mjs).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { refuseSecret } from '../jev/secret-paths.mjs';
function parseArgs(argv = []) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { flags[k] = next; i++; }
      else flags[k] = true;
    } else rest.push(a);
  }
  return { flags, rest };
}

export const DESIGN_AXES = [
  'theme',
  'density',
  'typography',
  'navigation',
  'surface',
  'motion',
  'grid',
  'accent',
];

const CLICHE_WORDS = /\b(?:delve|tapestry|unleash|elevate\s+your|seamlessly|game-changer|next-gen\s+synergy|revolutionize\s+the\s+way)\b/i;

function resolveLucianTastePath(env = process.env) {
  const home = env.BGZFLOW_HOME || path.join(os.homedir(), '.bgzflow');
  const candidate = path.join(home, 'lucian-engine', 'taste-engine.mjs');
  return fs.existsSync(candidate) ? candidate : null;
}

export function tasteLockPath(projectDir = process.cwd()) {
  return path.join(path.resolve(projectDir), '.bgzflow', 'taste-lock.json');
}

function getIdentityMarkerFiles(env = process.env) {
  const base = [
    env.BGZFLOW_DECISIONS_FILE || 'DECISIONS.md',
    'FOUNDER.md',
  ];
  try {
    const home = env.BGZFLOW_HOME || path.join(os.homedir(), '.bgzflow');
    const overlayCfg = path.join(home, 'overlay', 'founder-files.json');
    if (fs.existsSync(overlayCfg)) {
      const parsed = JSON.parse(fs.readFileSync(overlayCfg, 'utf8'));
      if (Array.isArray(parsed.files)) {
        for (const f of parsed.files) {
          if (typeof f === 'string' && f.trim() && !base.includes(f.trim())) base.unshift(f.trim());
        }
      }
    }
  } catch {}
  return base;
}

export function detectIdentityMode(projectDir = process.cwd(), env = process.env) {
  const root = path.resolve(projectDir);
  const lockFile = tasteLockPath(root);

  if (fs.existsSync(lockFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (data && data.mode === 'EXPLORE_NEW') {
        return { mode: 'EXPLORE_NEW', source: lockFile, lock: data };
      }
      return { mode: 'LOCKED_IDENTITY', source: lockFile, lock: data };
    } catch {}
  }

  for (const name of getIdentityMarkerFiles(env)) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) {
      return {
        mode: 'LOCKED_IDENTITY',
        source: p,
        reason: `Existing project contract (${name}) detected — visual identity is locked by default; only micro-craft polish within existing tokens is allowed unless explicitly unlocked with 'bgz taste unlock --explore'.`,
      };
    }
  }

  return {
    mode: 'EXPLORE_NEW',
    source: 'greenfield',
    reason: 'No existing brand lock or decisions file found; new design exploration is active.',
  };
}

export async function lockIdentity({
  dir = process.cwd(),
  project,
  palette = [],
  fonts = [],
  layout = '',
  axes = {},
  env = process.env,
  now = new Date(),
} = {}) {
  const root = path.resolve(dir);
  const lockFile = tasteLockPath(root);
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  const record = {
    schema: 1,
    mode: 'LOCKED_IDENTITY',
    project: project || path.basename(root),
    lockedAt: now.toISOString(),
    palette: Array.isArray(palette) ? palette : String(palette).split(',').map((s) => s.trim()).filter(Boolean),
    fonts: Array.isArray(fonts) ? fonts : String(fonts).split(',').map((s) => s.trim()).filter(Boolean),
    layout: String(layout || 'established'),
    axes: typeof axes === 'object' && axes !== null ? axes : parseAxesString(axes),
  };
  fs.writeFileSync(lockFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  const lucianPath = resolveLucianTastePath(env);
  if (lucianPath) {
    try {
      const mod = await import(pathToFileURL(lucianPath).href);
      mod.appendTasteHistory({
        project: record.project,
        layout: record.layout,
        axes: record.axes,
        palette: record.palette,
        fonts: record.fonts,
      }, env);
    } catch {}
  }
  return { ok: true, mode: 'LOCKED_IDENTITY', file: lockFile, lock: record };
}

export function unlockForExploration({ dir = process.cwd(), reason = '', now = new Date() } = {}) {
  const root = path.resolve(dir);
  const lockFile = tasteLockPath(root);
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  let prev = null;
  if (fs.existsSync(lockFile)) {
    try { prev = JSON.parse(fs.readFileSync(lockFile, 'utf8')); } catch {}
  }
  const record = {
    schema: 1,
    mode: 'EXPLORE_NEW',
    project: (prev && prev.project) || path.basename(root),
    unlockedAt: now.toISOString(),
    reason: String(reason || 'owner requested new design exploration'),
    previousLock: prev,
  };
  fs.writeFileSync(lockFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return { ok: true, mode: 'EXPLORE_NEW', file: lockFile, lock: record };
}

export function parseAxesString(str) {
  if (!str || typeof str !== 'string') return {};
  const out = {};
  for (const part of str.split(',')) {
    const [k, v] = part.split('=').map((s) => s && s.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

export async function verifyExplorationRound({ candidates = [], dir = process.cwd(), env = process.env } = {}) {
  const status = detectIdentityMode(dir, env);
  if (status.mode === 'LOCKED_IDENTITY') {
    return {
      ok: false,
      mode: 'LOCKED_IDENTITY',
      err: `Project identity is LOCKED (${status.source}). Full redesign rounds are blocked to protect existing designs; apply micro-craft polish within the locked tokens or run 'bgz taste unlock --explore' after owner approval.`,
    };
  }
  const lucianPath = resolveLucianTastePath(env);
  if (!lucianPath) {
    return {
      ok: false,
      lucianRequired: true,
      err: 'Cross-Project 10-Build Taste Memory & 8+ Direction Exploration Verification is powered by Lucian (Coming Soon). See README.md#beyond-the-plugin-what-lives-in-lucian.',
    };
  }
  const mod = await import(pathToFileURL(lucianPath).href);
  return mod.verifyExplorationRound({ candidates, status, env });
}

export function checkAntiSlop(file, { dir = process.cwd(), env = process.env } = {}) {
  refuseSecret(file);
  const text = fs.readFileSync(path.resolve(file), 'utf8');
  const findings = [];
  const status = detectIdentityMode(dir, env);

  const clicheMatch = CLICHE_WORDS.exec(text);
  if (clicheMatch) {
    findings.push({ kind: 'ai-cliche-copy', word: clicheMatch[0], note: 'replace generic AI marketing cliché with concrete plain-English product copy' });
  }
  if (/transition\s*:\s*['"]?all\b|\btransition-all\b/i.test(text)) {
    findings.push({ kind: 'transition-all', note: 'name specific animated properties instead of transition: all' });
  }
  if (/overflow\s*:\s*hidden\b[\s\S]{0,120}text-overflow\s*:\s*ellipsis/i.test(text) && /\b(?:price|total|balance|credit|amount)\b/i.test(text)) {
    findings.push({ kind: 'clipped-money-risk', note: 'never clip money or price fields with ellipsis' });
  }
  if (status.mode === 'LOCKED_IDENTITY' && status.lock && Array.isArray(status.lock.palette) && status.lock.palette.length) {
    const allowedHex = new Set(status.lock.palette.map((h) => h.toLowerCase()));
    const foundHex = [...new Set((text.match(/#[0-9a-fA-F]{6}\b/g) || []).map((h) => h.toLowerCase()))];
    const unapproved = foundHex.filter((h) => !allowedHex.has(h) && !['#ffffff', '#000000'].includes(h));
    if (unapproved.length > 0) {
      findings.push({
        kind: 'locked-palette-drift',
        unapprovedHex: unapproved.slice(0, 6),
        lockedPalette: status.lock.palette,
        note: 'file introduces hex colours outside the project’s locked palette',
      });
    }
  }
  return {
    ok: findings.length === 0,
    file: path.resolve(file),
    identityMode: status.mode,
    findings,
  };
}

const USAGE = [
  'usage: bgz taste <command> [options]',
  '  status [--dir <project>] [--json]                 show whether project is in LOCKED_IDENTITY or EXPLORE_NEW mode',
  '  lock --project <name> [--palette "#a,#b"] [--fonts "H,B"] [--layout "<anatomy>"] [--axes "theme=light,..."] [--dir <project>]',
  '  unlock --explore [--reason "<why>"] [--dir <project>]',
  '  verify-round --candidates <file.json> [--dir <project>]  (Lucian Engine)',
  '  anti-slop --file <path> [--dir <project>]',
].join('\n');

export async function main(argv = process.argv.slice(2), env = process.env) {
  const { flags, rest } = parseArgs(argv);
  const sub = rest[0];
  const dir = typeof flags.dir === 'string' ? path.resolve(flags.dir) : process.cwd();

  if (!sub || flags.help || flags.h) {
    console.log(USAGE);
    return sub ? 0 : 2;
  }
  try {
    if (sub === 'status') {
      const res = { ok: true, ...detectIdentityMode(dir, env) };
      console.log(JSON.stringify(res, null, 2));
      return 0;
    }
    if (sub === 'lock') {
      const res = await lockIdentity({
        dir,
        project: typeof flags.project === 'string' ? flags.project : path.basename(dir),
        palette: flags.palette || '',
        fonts: flags.fonts || '',
        layout: flags.layout || '',
        axes: flags.axes || '',
        env,
      });
      console.log(JSON.stringify(res, null, 2));
      return 0;
    }
    if (sub === 'unlock') {
      if (!flags.explore) {
        console.error('bgz taste unlock: pass --explore to confirm unlocking an existing project identity');
        return 2;
      }
      const res = unlockForExploration({ dir, reason: flags.reason || '' });
      console.log(JSON.stringify(res, null, 2));
      return 0;
    }
    if (sub === 'verify-round') {
      if (typeof flags.candidates !== 'string') {
        console.error('bgz taste verify-round: missing --candidates <file.json>');
        return 2;
      }
      refuseSecret(flags.candidates);
      const candidates = JSON.parse(fs.readFileSync(path.resolve(flags.candidates), 'utf8'));
      const res = await verifyExplorationRound({ candidates, dir, env });
      console.log(JSON.stringify(res, null, 2));
      return res.ok ? 0 : 1;
    }
    if (sub === 'anti-slop') {
      const file = flags.file || rest[1];
      if (!file) {
        console.error('bgz taste anti-slop: missing --file <path>');
        return 2;
      }
      const res = checkAntiSlop(file, { dir, env });
      console.log(JSON.stringify(res, null, 2));
      return res.ok ? 0 : 1;
    }
    console.error(`bgz taste: unknown command: ${sub}`);
    return 2;
  } catch (e) {
    console.log(JSON.stringify({ ok: false, err: String(e.message || e) }));
    return 1;
  }
}

if (isCommandEntry(import.meta.url)) {
  main().then((code) => { process.exitCode = code; });
}
