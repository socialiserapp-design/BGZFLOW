// Level 10, agentic Jev: gather evidence (state text, files, one gated command) and ask Jev about it.
//   bgz jev ask --q "..." [--type noul|choice|score] [--options a,b | --levels "l0|l1"]
//               [--state <text|@file>] [--paths a,b] [--cmd "<command>"] [--questions @file.json]
// The command runs through the level 6 Bash gate first. A blocked command is never run; the answer says so.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { judgeBash } from '../../hooks/lib/jev-gates.mjs';
import { askDetailed, choice, csv, maskSecrets, noul, questionFromFlags, safeText, score, shape } from './jev.mjs';
import { band } from './rules.mjs';
import { isSecretPath, readEvidenceArg, secretRefusal } from './secret-paths.mjs';

export const CMD_TIMEOUT_MS = 120000;
export const CMD_OUTPUT_CHARS = 16000;
// The Jev key never reaches the command: it could print or send it, and its output goes to Jev.
export const KEY_ENV_NAMES = ['TYPESAFE_API_KEY', 'FAST_JEV_KEY_FILE'];

export function childEnv(env = process.env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) if (!KEY_ENV_NAMES.includes(k.toUpperCase())) out[k] = v;
  return out;
}

export function runCommand(command, cwd, env = process.env) {
  const r = spawnSync(command, { shell: true, cwd, env: childEnv(env), encoding: 'utf8', timeout: CMD_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 });
  const text = `${r.stdout || ''}${r.stderr ? `\n[stderr]\n${r.stderr}` : ''}`;
  return { exit: r.status ?? (r.error && r.error.code === 'ETIMEDOUT' ? 'timeout' : 1), output: safeText(maskSecrets(text), CMD_OUTPUT_CHARS) };
}

function questionsFromFile(spec) {
  const raw = readEvidenceArg(spec, 40000);
  const parsed = JSON.parse(raw);
  const out = {};
  for (const [id, q] of Object.entries(parsed)) {
    if (!q || typeof q !== 'object' || typeof q.instructions !== 'string') throw new Error(`question "${id}" needs instructions`);
    if (q.type === 'choice') out[id] = choice(q.instructions, Array.isArray(q.criteria) ? Object.fromEntries(q.criteria.map((o) => [o, ''])) : q.criteria);
    else if (q.type === 'score') out[id] = score(q.instructions, q.criteria);
    else out[id] = noul(q.instructions);
  }
  return out;
}

export async function runAsk({ flags, timeoutMs, env }) {
  const questions = flags.questions ? questionsFromFile(flags.questions) : { q: questionFromFlags(flags) };
  const state = {};
  const stateText = readEvidenceArg(flags.state, 30000);
  if (stateText) state.text = safeText(maskSecrets(stateText), 30000);
  const files = [];
  const refused = [];
  for (const p of csv(flags.paths)) {
    if (isSecretPath(p)) {
      refused.push(secretRefusal(p));
      continue;
    }
    try {
      const abs = path.resolve(p);
      if (fs.statSync(abs).size > 200 * 1024) {
        files.push({ path: path.basename(abs), skipped: 'over 200 KB' });
        continue;
      }
      files.push({ path: path.basename(abs), text: safeText(fs.readFileSync(abs, 'utf8'), 20000) });
    } catch {
      files.push({ path: path.basename(p), skipped: 'unreadable' });
    }
  }
  if (files.length) state.files = files;
  let ran = null;
  if (typeof flags.cmd === 'string') {
    const verdict = await judgeBash({ command: flags.cmd, cwd: process.cwd(), env });
    if (verdict.action === 'deny') return { ok: false, err: 'command_blocked', reason: verdict.reason };
    ran = runCommand(flags.cmd, process.cwd(), env || process.env);
    state.command = { run: maskSecrets(flags.cmd), exit_code: ran.exit, output: ran.output };
  }
  if (!Object.keys(state).length) throw new Error(refused.length ? refused.join('\n') : 'give evidence: --state, --paths or --cmd');
  const refusedNote = refused.length ? { refused } : {};
  const r = await askDetailed({ caller: 'jev-ask', state, questions, timeoutMs: timeoutMs < 6000 ? 6000 : timeoutMs, env });
  if (!r.ok) return { ok: false, err: r.err, ...refusedNote, ...(ran ? { command_exit: ran.exit } : {}) };
  const answers = Object.entries(questions).map(([id, q]) => {
    const a = shape(q, r.answers[id], id);
    const conf = a.confidence ?? null;
    return conf === null ? a : { ...a, band: band(conf) };
  });
  return { ok: true, answers, ...refusedNote, ...(ran ? { command_exit: ran.exit } : {}), ms: r.ms, cost_usd: r.cost };
}
