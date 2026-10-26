#!/usr/bin/env node
import { isCommandEntry } from '../../hooks/lib/command-entry.mjs';
// BGZFLOW Skill Forge & Harmony Guard
// Public BGZFLOW provides mechanical harmony validation, draft validation, and 5-job auto-rollback staging.
// Deep-Source Skill Forging (from books, eBooks, lecture videos, papers, live teardowns, and Clean-Room REA)
// is powered by the Lucian Engine (~/.bgzflow/lucian-engine/forge.mjs).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { refuseSecret } from '../jev/secret-paths.mjs';

function homeDir(env = process.env) {
  return env.BGZFLOW_HOME || path.join(os.homedir(), '.bgzflow');
}
function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function appendJsonl(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(obj)}\n`, 'utf8');
}
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

const toolsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsCli = path.join(toolsRoot, 'lessons', 'lessons.mjs');

const MAX_SKILL_CHARS = 3800;

const FOREIGN_ROUTERS = [
  ['ruf', 'lo'].join(''),
  ['claude-', 'flow'].join(''),
  ['super', 'powers'].join(''),
  ['g', 'sd'].join(''),
  ['impec', 'cable'].join(''),
  ['gpt-', 'taste'].join(''),
  ['ui-ux-', 'pro-max'].join(''),
].join('|');

const FOREIGN_COMMAND_PATTERNS = [
  new RegExp(`\\/(?:${FOREIGN_ROUTERS}):[a-z0-9_-]+`, 'gi'),
  new RegExp(`\\bnpx\\s+(?:${FOREIGN_ROUTERS})[@\\s][^\\r\\n]*`, 'gi'),
];

const CONTRADICTORY_BANS = [
  /\bnever\s+use\s+(?:serif|sans-serif|monospace|dark\s+mode|light\s+mode|glass|blur|gradients?)\b/gi,
  /\balways\s+use\s+(?:dark\s+mode|light\s+mode|inter|roboto|glassmorphism|bento\s+grids?)\b/gi,
  /\bcreate\s+a\s+new\s+(?:task\s+board|kanban|todo\.md|tracker\s+file)\b/gi,
];

function sanitize(text) {
  return String(text || '')
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[redacted-key]')
    .replace(/(?:Bearer|token)\s+[A-Za-z0-9._~+/=-]{16,}/gi, '[redacted-token]');
}

function sha256(s) {
  return createHash('sha256').update(String(s || ''), 'utf8').digest('hex');
}

function resolveLucianForgePath(env = process.env) {
  const home = env.BGZFLOW_HOME || path.join(os.homedir(), '.bgzflow');
  const candidate = path.join(home, 'lucian-engine', 'forge.mjs');
  return fs.existsSync(candidate) ? candidate : null;
}

export function checkHarmony(draftText) {
  const issues = [];
  const text = String(draftText || '');
  if (text.length > MAX_SKILL_CHARS) {
    issues.push({ kind: 'over-budget', detail: `draft is ${text.length} chars (max ${MAX_SKILL_CHARS})` });
  }
  for (const rx of FOREIGN_COMMAND_PATTERNS) {
    rx.lastIndex = 0;
    const m = rx.exec(text);
    if (m) issues.push({ kind: 'foreign-command-router', detail: `contains foreign router/CLI reference: ${m[0]}` });
  }
  for (const rx of CONTRADICTORY_BANS) {
    rx.lastIndex = 0;
    const m = rx.exec(text);
    if (m) issues.push({ kind: 'contradictory-ban-or-board', detail: `contains blanket aesthetic ban or competing board rule: ${m[0]}` });
  }
  if (/\bcopy\s+(?:the\s+)?(?:exact\s+)?(?:source\s+code|hex\s+palette|brand\s+assets)\s+from\b/i.test(text)) {
    issues.push({ kind: 'clean-room-violation', detail: 'instructs copying source code or brand assets instead of clean-room principles' });
  }
  return { ok: issues.length === 0, issues };
}

export function harmonizeDraftBody({ name, description, sourceKind, sourceLabel, steps = [], epistemic = null }) {
  const cleanName = String(name || 'forged-skill')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const desc = sanitize(description || `Apply ${cleanName} principles distilled from ${sourceKind} (${sourceLabel}).`).slice(0, 220);

  const filteredSteps = steps
    .map((s) => sanitize(String(s || '').trim()))
    .filter(Boolean)
    .map((s) => {
      let cleaned = s;
      for (const rx of FOREIGN_COMMAND_PATTERNS) cleaned = cleaned.replace(rx, 'BGZFLOW');
      for (const rx of CONTRADICTORY_BANS) cleaned = cleaned.replace(rx, 'follow the project’s approved identity contract');
      return cleaned;
    })
    .slice(0, 14);

  if (!filteredSteps.length) {
    filteredSteps.push(`Apply the verified mechanisms from ${sourceLabel} directly to the active vertical slice and verify the real-world effect.`);
  }

  const lines = [
    '---',
    `name: ${cleanName}`,
    `description: ${desc}`,
    '---',
    '',
    `# ${cleanName}`,
    '',
    `Distilled from ${sourceKind} source (${sanitize(sourceLabel)}) under the BGZFLOW Clean-Room & Harmony standard.`,
    '',
    '## Actionable workflow',
    '',
    ...filteredSteps.map((s, idx) => `${idx + 1}. ${s}`),
  ];

  if (epistemic && (epistemic.observed?.length || epistemic.inferred?.length || epistemic.unknown?.length)) {
    lines.push('', '## Epistemic grounding (REA Clean-Room ledger)', '');
    if (epistemic.observed?.length) {
      lines.push(`- **Observed (verified):** ${epistemic.observed.slice(0, 5).join('; ')}`);
    }
    if (epistemic.inferred?.length) {
      lines.push(`- **Inferred (working hypothesis):** ${epistemic.inferred.slice(0, 4).join('; ')}`);
    }
    if (epistemic.unknown?.length) {
      lines.push(`- **Unknown (probe before locking decisions):** ${epistemic.unknown.slice(0, 4).join('; ')}`);
    }
  }

  let body = `${lines.join('\n').trimEnd()}\n`;
  if (body.length > MAX_SKILL_CHARS) {
    body = `${body.slice(0, MAX_SKILL_CHARS - 20).trimEnd()}\n`;
  }
  return body;
}

export function validateDraft(draftFile) {
  let content = '';
  try {
    content = fs.readFileSync(draftFile, 'utf8');
  } catch (e) {
    return { ok: false, status: 1, detail: `cannot read ${draftFile}: ${e.message}` };
  }
  const hasFrontmatter = /^---\r?\nname:\s*\S+[\s\S]*?\r?\ndescription:\s*\S+[\s\S]*?\r?\n---/m.test(content);
  const hasActionableSteps = /^\d+\.\s+\S+/m.test(content);
  const withinBudget = content.length <= MAX_SKILL_CHARS;
  const harmony = checkHarmony(content);
  const ok = hasFrontmatter && hasActionableSteps && withinBudget && harmony.ok;
  return {
    ok,
    status: ok ? 0 : 1,
    detail: {
      ok,
      hasFrontmatter,
      hasActionableSteps,
      withinBudget,
      chars: content.length,
      harmony,
    },
  };
}

export function swapIn({
  skill,
  draftFile,
  sourceKind,
  sourceLabel,
  env = process.env,
  now = new Date(),
} = {}) {
  if (!skill || !draftFile) return { ok: false, err: 'missing skill or draftFile' };
  refuseSecret(draftFile);
  if (!fs.existsSync(draftFile)) return { ok: false, err: 'draft file missing' };

  const draft = fs.readFileSync(draftFile, 'utf8');
  const harmony = checkHarmony(draft);
  if (!harmony.ok) return { ok: false, err: 'harmony check failed', harmony };

  const v = validateDraft(draftFile);
  if (!v.ok) return { ok: false, err: 'draft failed bgz lessons validate', validate: v };

  const home = homeDir(env);
  const ts = now.toISOString().replace(/[:.]/g, '-');
  const overlayDir = path.join(home, 'skills-overlay', skill);
  const liveTarget = path.join(overlayDir, 'SKILL.md');
  const historyDir = path.join(home, 'skill-history');
  fs.mkdirSync(overlayDir, { recursive: true });
  fs.mkdirSync(historyDir, { recursive: true });

  const previous = fs.existsSync(liveTarget) ? fs.readFileSync(liveTarget, 'utf8') : '';
  const backupFile = path.join(historyDir, `${skill}-${ts}.md`);
  fs.writeFileSync(backupFile, previous, 'utf8');
  fs.writeFileSync(liveTarget, draft, 'utf8');

  const logFile = path.join(home, 'skill-changes.jsonl');
  const existing = readJsonl(logFile);
  const baseline = existing.filter((r) => r && r.skill === skill).slice(-1)[0]?.baseline ?? 3.0;
  const record = {
    schema: 1,
    id: `forge-${skill}-${ts}`,
    skill,
    status: 'watching',
    swappedAt: now.toISOString(),
    watchJobs: 5,
    baseline,
    sourceKind: sourceKind || 'forged',
    sourceLabel: sanitize(sourceLabel || ''),
    backupFile,
    liveTarget,
    draftHash: sha256(draft),
    previousHash: sha256(previous),
  };
  appendJsonl(logFile, record);
  return { ok: true, id: record.id, liveTarget, backupFile, harmony };
}

export async function forgeSkill(options = {}) {
  const lucianPath = resolveLucianForgePath(options.env || process.env);
  if (!lucianPath) {
    return {
      ok: false,
      lucianRequired: true,
      err: 'Deep-Source Skill Forging (from books, eBooks, lecture videos, academic papers, live teardowns, and Clean-Room Reverse Engineering) is powered by Lucian (Coming Soon) — the unified AI workspace and autonomous skill engine. See README.md#beyond-the-plugin-what-lives-in-lucian.',
    };
  }
  const mod = await import(pathToFileURL(lucianPath).href);
  const res = mod.forgeSkill(options);
  if (!res.ok) return res;
  const validation = validateDraft(res.draftFile);
  return {
    ...res,
    valid: validation.ok,
    validation: validation.detail,
  };
}

const USAGE = [
  'usage: bgz skill-forge [options]',
  '  --name <skill-slug>            target skill name (e.g. clean-checkout-flow)',
  '  --focus "<topic>"              narrow extraction focus',
  '  --from-rea <target>            reverse-engineer an app, spec, binary, or content hook via Clean-Room REA (Lucian Engine)',
  '  --rea-mode <auto|software|content>  select software clean-room spec vs 6-step viral content/ad playbook',
  '  --from-book <path>             distill actionable rules from a book/eBook chapter or text (Lucian Engine)',
  '  --from-video <path>            distill walkthrough steps from a lecture/talk transcript (Lucian Engine)',
  '  --from-paper <path>            distill methods from an academic paper or benchmark (Lucian Engine)',
  '  --from-teardown <path>         distill UX/flow anatomy from a teardown report (Lucian Engine)',
  '  --from-source <path>           distill motion springs, CSS tokens, or shader math from source code (Lucian Engine)',
  '  --stage                        immediately validate and stage into ~/.bgzflow/skills-overlay/<name>/SKILL.md with 5-job rollback watch',
  '  --check-harmony <file>         run the BGZFLOW mechanical harmony check on an existing SKILL.md',
].join('\n');

export async function main(argv = process.argv.slice(2), env = process.env) {
  const { flags } = parseArgs(argv);
  if (flags.help || flags.h || argv.length === 0) {
    console.log(USAGE);
    return argv.length === 0 ? 2 : 0;
  }

  if (typeof flags['check-harmony'] === 'string') {
    const file = path.resolve(flags['check-harmony']);
    refuseSecret(file);
    const text = fs.readFileSync(file, 'utf8');
    const harmony = checkHarmony(text);
    const validation = validateDraft(file);
    const ok = harmony.ok && validation.ok;
    console.log(JSON.stringify({ ok, file, harmony, validation }, null, 2));
    return ok ? 0 : 1;
  }

  const res = await forgeSkill({
    name: flags.name,
    focus: flags.focus || '',
    fromRea: flags['from-rea'],
    reaMode: flags['rea-mode'] || 'auto',
    fromBook: flags['from-book'],
    fromVideo: flags['from-video'],
    fromPaper: flags['from-paper'],
    fromTeardown: flags['from-teardown'],
    fromSource: flags['from-source'],
    projectDir: typeof flags.project === 'string' ? flags.project : process.cwd(),
    env,
  });

  if (!res.ok) {
    console.log(JSON.stringify(res, null, 2));
    return 1;
  }

  let staged = null;
  if (flags.stage) {
    staged = swapIn({
      skill: res.skill,
      draftFile: res.draftFile,
      sourceKind: res.sourceKind,
      sourceLabel: res.sourceLabel,
      env,
    });
  }

  console.log(JSON.stringify({ ...res, staged }, null, 2));
  return res.valid && (!staged || staged.ok) ? 0 : 1;
}

if (isCommandEntry(import.meta.url)) {
  main().then((code) => { process.exitCode = code; });
}
