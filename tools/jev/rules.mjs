// Levels 1-5 in code: confidence bands, composite scores with weights kept here, and routing.
//   bgz jev score --preset diff-risk [--state <text|@file> | --diff <ref>]
//   bgz jev score --q "..." --levels "l0|l1|l2" --state <text|@file>        one custom score
//   bgz jev route --job "<text|@file>" [--status <STATUS.md>]
// Jev scores situations; this file holds the weights, the thresholds and every limit. Code still applies the allowance
// and job limits from STATUS after a route.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { askDetailed, choice, questionFromFlags, safeText, score, scoreOf, shape } from './jev.mjs';
import { dropSecretDiffs, readEvidenceArg } from './secret-paths.mjs';

// ---------- Level 3: confidence axes (IndyDevDan rule: below 0.5 a human, 0.9 or above may act, between confirm) ----------
export const AXES = { escalate: 0.5, act: 0.9 };
export function band(confidence) {
  if (!Number.isFinite(confidence) || confidence < AXES.escalate) return 'lead';
  if (confidence >= AXES.act) return 'act';
  return 'confirm';
}
const r2 = (n) => Math.round(n * 100) / 100;

// ---------- Level 4: composite scores, weights in code ----------
// Each dimension is a score question with described situations (lowest first), so the number means something.
export const DIFF_RISK = {
  weights: { money_data: 0.35, security: 0.25, customer_stop: 0.2, scope: 0.1, proof: 0.1 },
  questions: {
    money_data: score('How much could this diff harm money handling, stored data or accounts if it is wrong?', [
      'no code that touches money, stored data or accounts',
      'touches such code in a tiny, well-tested way',
      'changes how money or stored data is read or written, with tests',
      'changes how money or stored data is written, tests thin',
      'changes charging, balances, deletion or migrations with no test',
    ]),
    security: score('How much could this diff weaken security or privacy (secrets, auth, permissions, input from outside)?', [
      'nothing near security or privacy',
      'touches config or input handling in a small safe way',
      'changes permissions, auth or secret handling with checks',
      'weakens a check or moves a secret',
      'opens access, logs or commits a secret, or skips an auth check',
    ]),
    customer_stop: score('Does this diff add something a customer would hit: a block, cap, expiry, gate, hold, refusal or wait?', [
      'nothing customer-facing is added',
      'a message or label changes, no new stop',
      'a new validation that only guards an error the customer did not choose',
      'a new limit or wait for customers',
      'a new refusal, block, cap or expiry for customers',
    ]),
    scope: score('How far does this diff go beyond a plain, minimal change for its apparent purpose?', [
      'minimal and focused',
      'small related extras',
      'a few unrelated edits',
      'a new feature or rule nobody would obviously have asked for',
      'a broad rewrite or many unrelated changes',
    ]),
    proof: score('How much proof is visible in this diff that the change works (tests, checks, safe fallbacks)?', [
      'strong tests that cover the change',
      'some tests for the main path',
      'a check or two, nothing for failures',
      'no tests, but the change is small',
      'no tests and a risky change',
    ]),
  },
};

export const GOAL_CLARITY_READY_AT = 0.88;
export const GOAL_CLARITY = {
  weights: { outcome: 0.35, constraints: 0.25, verification: 0.25, authority: 0.15 },
  questions: {
    outcome: score('How clear is the concrete real-world outcome the user wants when this job is finished (what works, exists, or is decided in reality)?', [
      'no concrete outcome is stated yet',
      'a general topic is named, but the finished end-state is vague',
      'the main outcome is named, with some ambiguity in how it works',
      'the concrete outcome and user journey are clear, with minor edge details open',
      'the exact real-world outcome, user experience, and finish line are unmistakable',
    ]),
    constraints: score('How clear are the material boundaries, existing parts to keep vs rebuild from scratch, and unrequested stops/caps to avoid?', [
      'boundaries and existing-system triage are unknown',
      'some context is present, but keep-vs-rebuild or key constraints are unclear',
      'main constraints are known, with a few open boundary questions',
      'constraints and keep-vs-rebuild triage are clear for almost every touched area',
      'all material constraints, triage modes, and non-goals are explicitly settled',
    ]),
    verification: score('How clear is how the outcome will be verified on a real-world surface or primary source alongside synthetic checks?', [
      'no verification surface or primary source is identified',
      'only synthetic unit tests or code compilation are mentioned',
      'a real surface or primary source is named, but the verification steps are rough',
      'real-world surface checks and synthetic checks are defined for the main slices',
      'exact real-world tool verification (device/browser/API/primary source) and synthetic checks are locked for every slice',
    ]),
    authority: score('How clear are the spending, external action, and long-horizon milestone check-in preferences?', [
      'authority, budget, and check-in preferences are unknown where material',
      'only partial authority or budget context is known',
      'safe defaults cover most work, with one external or budget choice open',
      'authority, budget, and milestone check-in preferences are clear for normal execution',
      'all authority, budget, and opt-in milestone check-in rules are explicitly settled',
    ]),
  },
};

export async function compositeScore({ preset, text, env, timeoutMs, caller }) {
  const questions = preset.questions;
  const r = await askDetailed({ caller, state: { text: safeText(text, 24000) }, questions, timeoutMs, env });
  if (!r.ok) return { ok: false, err: r.err };
  let total = 0;
  const parts = {};
  let minConf = 1;
  for (const [id, q] of Object.entries(questions)) {
    const s = scoreOf(r, id, q.criteria);
    parts[id] = { score: r2(s.score), of: q.criteria.length - 1, norm: r2(s.norm), confidence: r2(s.confidence) };
    total += (preset.weights[id] || 0) * s.norm;
    minConf = Math.min(minConf, s.confidence);
  }
  const weightSum = Object.values(preset.weights).reduce((a, b) => a + b, 0) || 1;
  const value = r2(total / weightSum);
  return { ok: true, value, parts, confidence: r2(minConf), band: band(minConf), ms: r.ms, cost_usd: r.cost };
}

export async function runScore({ flags, timeoutMs, env }) {
  let text = readEvidenceArg(flags.state, 40000);
  let droppedSecret = [];
  if (flags.diff && typeof flags.diff === 'string') {
    const g = spawnSync('git', ['diff', flags.diff], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (g.status !== 0) throw new Error(`git diff ${flags.diff} failed`);
    // Secret files in the diff (.env, keys, Secrets/) are dropped whole; the rest is sanitized on the way out.
    ({ text, dropped: droppedSecret } = dropSecretDiffs(g.stdout));
  }
  if (flags.preset) {
    if (flags.preset !== 'diff-risk' && flags.preset !== 'goal-clarity') {
      throw new Error('unknown --preset (diff-risk|goal-clarity)');
    }
    if (!text.trim()) throw new Error(`${flags.preset} needs --state <text|@file>${flags.preset === 'diff-risk' ? ' or --diff <ref>' : ''}`);
    const isGoal = flags.preset === 'goal-clarity';
    const res = await compositeScore({
      preset: isGoal ? GOAL_CLARITY : DIFF_RISK,
      text,
      env,
      timeoutMs: timeoutMs < 8000 ? 8000 : timeoutMs,
      caller: isGoal ? 'jev-score-goal-clarity' : 'jev-score-diff-risk',
    });
    const skippedNote = droppedSecret.length ? { skipped_secret_files: droppedSecret } : {};
    if (!res.ok) return res;
    if (isGoal) {
      const missing_dimensions = Object.entries(res.parts)
        .filter(([, p]) => p.norm < GOAL_CLARITY_READY_AT)
        .sort((a, b) => a[1].norm - b[1].norm)
        .map(([k]) => k);
      const ready_to_execute = res.value >= GOAL_CLARITY_READY_AT && res.confidence >= AXES.escalate;
      return {
        ...res,
        preset: 'goal-clarity',
        ready_at: GOAL_CLARITY_READY_AT,
        ready_to_execute,
        missing_dimensions,
        note: ready_to_execute
          ? 'goal clarity >= 0.88: stop interrogating the user and start executing'
          : `goal clarity < 0.88: ask only about unresolved dimensions (${missing_dimensions.join(', ') || 'confidence'})`,
        ...skippedNote,
      };
    }
    return { ...res, preset: 'diff-risk', note: 'value is 0 (safe) to 1 (risky); a lead, not a verdict', ...skippedNote };
  }
  const q = questionFromFlags({ ...flags, type: 'score' });
  const r = await askDetailed({ caller: 'jev-score', state: { text: safeText(text, 24000) }, questions: { q }, timeoutMs, env });
  if (!r.ok) return { ok: false, err: r.err };
  const out = shape(q, r.answers.q, 'q');
  return { ok: true, ...out, band: band(out.confidence), ms: r.ms, cost_usd: r.cost };
}

// ---------- Level 5: routing ----------
export const DEFAULT_ROLES = {
  'project lead': 'plans, decides and accepts; talks to the owner',
  builder: 'writes code or files from a brief',
  'independent checker': 'checks finished work it did not build',
  'cheap reader': 'reads, sorts or summarises files for others',
  'device tester': 'drives a real phone or device',
  'images and video': 'makes pictures or video',
};
export function statusPath(env = process.env) {
  if (env.BGZFLOW_STATUS && env.BGZFLOW_STATUS.trim()) return env.BGZFLOW_STATUS.trim();
  const overlay = env.BGZFLOW_OVERLAY && env.BGZFLOW_OVERLAY.trim() ? path.resolve(env.BGZFLOW_OVERLAY.trim()) : path.join(os.homedir(), '.bgzflow', 'overlay');
  return path.join(overlay, 'STATUS.md');
}
// Roles are the first column of the table in STATUS section 1. Falls back to the defaults when STATUS is missing.
export function rolesFromStatus(text) {
  const roles = {};
  const m = /##\s*1\.[^\n]*\n([\s\S]*?)(?:\n##\s|$)/.exec(String(text || ''));
  if (m) {
    for (const line of m[1].split('\n')) {
      if (!line.startsWith('|') || /^\|\s*(?:-|Role)/i.test(line)) continue;
      const name = line.split('|')[1].replace(/\(.*?\)/g, '').replace(/[*`]/g, '').trim().toLowerCase();
      if (name) roles[name.slice(0, 60)] = DEFAULT_ROLES[name] || 'a role in STATUS section 1';
    }
  }
  return Object.keys(roles).length >= 2 ? roles : { ...DEFAULT_ROLES };
}
export const TIERS = {
  small: 'a small fast model is enough: sorting, reading, simple edits',
  standard: 'a normal coding model: most builds and checks',
  strong: 'the strongest model: planning, hard debugging, release decisions',
};
export const EFFORT_LEVELS = [
  'low: a mechanical or lookup job with one obvious answer',
  'medium: a normal build or check',
  'high: planning, debugging an unknown cause or a release decision',
];
const EFFORT_NAMES = ['low', 'medium', 'high'];

export async function route({ job, roles, env, timeoutMs }) {
  const questions = {
    role: choice('Which role should do this job?', roles),
    tier: choice('Which model tier does this job need?', TIERS),
    effort: score('How much thinking effort does this job need?', EFFORT_LEVELS),
  };
  const r = await askDetailed({ caller: 'jev-route', state: { job: safeText(job, 8000) }, questions, timeoutMs, env });
  if (!r.ok) return { ok: false, err: r.err };
  const effortScore = scoreOf(r, 'effort', EFFORT_LEVELS);
  const role = r.answers.role;
  const tier = r.answers.tier;
  const confidence = Math.min(role.confidence, tier.confidence, effortScore.confidence);
  return {
    ok: true,
    role: role.choice,
    role_confidence: r2(role.confidence),
    tier: tier.choice,
    effort: EFFORT_NAMES[Math.min(2, Math.max(0, Math.round(effortScore.score)))],
    effort_score: r2(effortScore.score),
    confidence: r2(confidence),
    band: band(confidence),
    next: 'code applies the allowance and job limits from STATUS section 2 before dispatch',
    ms: r.ms,
    cost_usd: r.cost,
  };
}

export async function runRoute({ flags, timeoutMs, env }) {
  const job = readEvidenceArg(flags.job, 12000);
  if (!job.trim()) throw new Error('usage: bgz jev route --job "<text|@file>" [--status <STATUS.md>]');
  let text = '';
  try {
    text = fs.readFileSync(typeof flags.status === 'string' ? flags.status : statusPath(env), 'utf8');
  } catch {
    // no STATUS here: the default roles apply
  }
  return route({ job, roles: rolesFromStatus(text), env, timeoutMs: timeoutMs < 5000 ? 5000 : timeoutMs });
}
