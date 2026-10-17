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
import { league, readGrades } from './grade.mjs';
import { dropSecretDiffs, readEvidenceArg } from './secret-paths.mjs';

// ---------- Level 3: confidence axes (Simeon Kontogeorges rule: below 0.5 a human, 0.9 or above may act, between confirm) ----------
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

export const DECISION_ESCALATION_ASK_AT = 0.65;
export const DECISION_ESCALATION = {
  weights: {
    user_product_impact: 0.35,
    money_data_irreversibility: 0.3,
    spec_ambiguity: 0.2,
    not_routine_engineering: 0.15,
  },
  questions: {
    user_product_impact: score(
      'How much does this mid-build decision change user-visible product behaviour, UX flow, or domain outcome in a way the owner would care about?',
      [
        'purely internal implementation detail invisible to the user',
        'minor styling or internal helper choice with no behaviour change',
        'small UX or workflow detail with an obvious standard default',
        'noticeable change to user flow, feature behaviour, or domain rules where two reasonable owners might disagree',
        'major product direction, core user journey, keep-vs-remove feature, or business rule change',
      ],
    ),
    money_data_irreversibility: score(
      'How much does this decision affect pricing, credits, real money, external publishing, legal/compliance commitments, or hard-to-reverse data changes?',
      [
        'no impact on money, credits, external systems, or persistent data',
        'local reversible state only',
        'touches configuration or schema in an easily reversible way',
        'affects quotas, limits, external API behaviour, or customer data model',
        'directly affects billing, pricing, credit caps, live publishing, legal terms, or irreversible data',
      ],
    ),
    spec_ambiguity: score(
      'How silent, ambiguous, or contradictory is the existing specification (DECISIONS.md, active-goal.json, BRIEF.md) on this exact choice?',
      [
        'already explicitly answered in the spec or DECISIONS.md',
        'clearly implied by the existing spec and keep/forbid lists',
        'partially covered, with a safe obvious default',
        'genuinely unspecified with two plausible interpretations',
        'directly conflicting requirements or a high-stakes gap the spec never addressed',
      ],
    ),
    not_routine_engineering: score(
      'Is this a true owner/product decision rather than a routine technical/engineering choice the AI should make itself?',
      [
        '100% routine engineering (library, file path, component plumbing, test wiring)',
        'mostly technical with a clear best practice',
        'mixed technical and UX trade-off with a safe default',
        'primarily a product, policy, or user-experience trade-off',
        'pure founder/owner preference or business policy decision that an AI must never silently invent',
      ],
    ),
  },
};

export const STE_PLAIN_ENGLISH_PASS_AT = 0.85;
export const STE_PLAIN_ENGLISH = {
  weights: {
    no_internal_jargon: 0.4,
    short_direct_sentences: 0.25,
    active_voice_one_meaning: 0.2,
    actionable_clarity: 0.15,
  },
  questions: {
    no_internal_jargon: score(
      'How free is this user-facing text of internal technical, CLI, hook, or code jargon (such as hook names, CLI flags, schema/RPC/AST terms, or internal file paths)?',
      [
        'heavy internal code, CLI, or hook jargon that a non-technical owner should never have to read',
        'several technical or internal tool terms mixed into the explanation',
        'mostly plain English, but with one or two unexplained technical terms',
        'clear everyday English with only familiar product words',
        '100% plain everyday English with zero internal code, hook, or CLI jargon',
      ],
    ),
    short_direct_sentences: score(
      'Does this text follow BGZFLOW Plain-English sentence length rules (questions/instructions <= 20 words, explanations <= 25 words, one question at a time)?',
      [
        'long, tangled multi-clause sentences over 35 words or multiple questions bundled together',
        'several long sentences that require re-reading',
        'moderately concise, with a few sentences slightly over 25 words',
        'short, direct sentences where every question is under 20 words',
        'crisp BGZFLOW Plain-English sentences (questions <= 20 words, explanations <= 25 words, one clear point per sentence)',
      ],
    ),
    active_voice_one_meaning: score(
      'Does this text use active voice and consistent everyday words (one word per meaning) rather than passive or abstract phrasing?',
      [
        'passive, abstract, or bureaucratic phrasing throughout',
        'mostly passive or vague wording',
        'mixed active and passive voice',
        'active voice with concrete everyday words',
        'strictly active voice and concrete real-world words throughout',
      ],
    ),
    actionable_clarity: score(
      'Can the user immediately understand what happened or pick an option without guessing?',
      [
        'confusing or ambiguous; user has to ask what it means',
        'partially clear, but the trade-off or action is fuzzy',
        'understandable with some effort',
        'clear and easy to answer or confirm',
        'crystal clear on first read, with a recommended option when asking a question',
      ],
    ),
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
    if (
      flags.preset !== 'diff-risk' &&
      flags.preset !== 'goal-clarity' &&
      flags.preset !== 'decision-escalation' &&
      flags.preset !== 'ste-plain-english'
    ) {
      throw new Error('unknown --preset (diff-risk|goal-clarity|decision-escalation|ste-plain-english)');
    }
    if (!text.trim()) throw new Error(`${flags.preset} needs --state <text|@file>${flags.preset === 'diff-risk' ? ' or --diff <ref>' : ''}`);
    const isGoal = flags.preset === 'goal-clarity';
    const isDecision = flags.preset === 'decision-escalation';
    const isSte = flags.preset === 'ste-plain-english';
    const presetObj = isGoal
      ? GOAL_CLARITY
      : isDecision
        ? DECISION_ESCALATION
        : isSte
          ? STE_PLAIN_ENGLISH
          : DIFF_RISK;
    const res = await compositeScore({
      preset: presetObj,
      text,
      env,
      timeoutMs: timeoutMs < 8000 ? 8000 : timeoutMs,
      caller: `jev-score-${flags.preset}`,
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
    if (isDecision) {
      const should_ask_user = res.value >= DECISION_ESCALATION_ASK_AT;
      return {
        ...res,
        preset: 'decision-escalation',
        ask_at: DECISION_ESCALATION_ASK_AT,
        should_ask_user,
        action: should_ask_user ? 'ASK_USER_FOR_CLARIFICATION' : 'DECIDE_AUTONOMOUSLY_AND_CONTINUE',
        note: should_ask_user
          ? `decision-escalation ${res.value} >= ${DECISION_ESCALATION_ASK_AT}: material product/money/UX fork — pause and ask the user with options and a recommendation`
          : `decision-escalation ${res.value} < ${DECISION_ESCALATION_ASK_AT}: routine engineering choice — decide autonomously, record in DECISIONS.md, and keep building`,
        ...skippedNote,
      };
    }
    if (isSte) {
      const passes_ste = res.value >= STE_PLAIN_ENGLISH_PASS_AT;
      const weak_dimensions = Object.entries(res.parts)
        .filter(([, p]) => p.norm < STE_PLAIN_ENGLISH_PASS_AT)
        .map(([k]) => k);
      return {
        ...res,
        preset: 'ste-plain-english',
        pass_at: STE_PLAIN_ENGLISH_PASS_AT,
        passes_ste,
        weak_dimensions,
        note: passes_ste
          ? `ste-plain-english ${res.value} >= ${STE_PLAIN_ENGLISH_PASS_AT}: clear BGZFLOW Plain-English plain English ready for the user`
          : `ste-plain-english ${res.value} < ${STE_PLAIN_ENGLISH_PASS_AT}: rewrite in simpler everyday words (<= 20 words per question, zero internal jargon; weak: ${weak_dimensions.join(', ')})`,
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

// Tier 0 Deterministic Bypass: pure mechanical/CLI tasks that need no LLM reasoning
const DETERMINISTIC_PATTERNS = [
  { tool: 'bgz receipt', re: /^(?:run\s+)?bgz\s+receipt\b/i },
  { tool: 'bgz scan', re: /^(?:run\s+)?bgz\s+scan\b/i },
  { tool: 'bgz preflight', re: /^(?:run\s+)?bgz\s+preflight\b/i },
  { tool: 'bgz taste', re: /^(?:run\s+)?bgz\s+taste\b/i },
  { tool: 'formatter/linter', re: /^(?:run\s+)?(?:npx\s+)?(?:prettier|eslint\s+--fix|biome\s+format)\b/i },
  { tool: 'hash/checksum', re: /^(?:(?:compute|verify|check)\s+)?(?:sha256|checksum|file\s+hash)\b/i },
];

export function isDeterministicJob(jobText) {
  const clean = String(jobText || '').trim();
  if (!clean || clean.length > 240) return null;
  for (const p of DETERMINISTIC_PATTERNS) {
    if (p.re.test(clean)) return p.tool;
  }
  return null;
}

export function leagueStandingsForRole(roleName, env = process.env) {
  const rows = league(readGrades(env));
  const r = String(roleName || '').toLowerCase().trim();
  return rows.filter((x) => x.role === r);
}

export async function route(jobOrOpts, maybeOpts = {}) {
  const opts = typeof jobOrOpts === 'string' ? { ...maybeOpts, job: jobOrOpts } : (jobOrOpts || {});
  const {
    job,
    roles = DEFAULT_ROLES,
    role: explicitRole,
    env = process.env,
    timeoutMs,
    allowDeterministic = true,
  } = opts;

  if (allowDeterministic) {
    const detTool = isDeterministicJob(job);
    if (detTool) {
      return {
        ok: true,
        role: 'deterministic-tool',
        role_confidence: 1,
        tier: 'deterministic',
        deterministic_tool: detTool,
        effort: 'low',
        effort_score: 0,
        confidence: 1,
        band: 'act',
        next: `run deterministic tool (${detTool}) directly; zero model tokens needed`,
        ms: 0,
        cost_usd: 0,
      };
    }
  }
  const questions = {
    role: choice('Which role should do this job?', roles),
    tier: choice('Which model tier does this job need?', TIERS),
    effort: score('How much thinking effort does this job need?', EFFORT_LEVELS),
  };
  const r = await askDetailed({ caller: 'jev-route', state: { job: safeText(job, 8000) }, questions, timeoutMs, env });
  if (!r.ok) {
    if (explicitRole) {
      const standings = leagueStandingsForRole(explicitRole, env);
      if (standings.length) {
        return {
          ok: true,
          role: explicitRole,
          role_confidence: 1,
          tier: 'standard',
          effort: 'medium',
          effort_score: 1,
          confidence: 0.9,
          band: 'act',
          recommended_worker: standings[0].worker,
          role_standings: standings.slice(0, 5),
          next: 'code applies the allowance and job limits from STATUS section 2 before dispatch',
          ms: 0,
          cost_usd: 0,
        };
      }
    }
    return { ok: false, err: r.err };
  }
  const effortScore = scoreOf(r, 'effort', EFFORT_LEVELS);
  const chosenRole = explicitRole || r.answers.role.choice;
  const tier = r.answers.tier;
  const confidence = Math.min(r.answers.role.confidence, tier.confidence, effortScore.confidence);
  const standings = leagueStandingsForRole(chosenRole, env);
  const leagueExtras = standings.length
    ? {
        recommended_worker: standings[0].worker,
        role_standings: standings.slice(0, 5),
      }
    : {};
  return {
    ok: true,
    role: chosenRole,
    role_confidence: r2(r.answers.role.confidence),
    tier: tier.choice,
    effort: EFFORT_NAMES[Math.min(2, Math.max(0, Math.round(effortScore.score)))],
    effort_score: r2(effortScore.score),
    confidence: r2(confidence),
    band: band(confidence),
    ...leagueExtras,
    next: 'code applies the allowance and job limits from STATUS section 2 before dispatch',
    ms: r.ms,
    cost_usd: r.cost,
  };
}

export async function runRoute({ flags, timeoutMs, env }) {
  const job = readEvidenceArg(flags.job, 12000);
  if (!job.trim()) throw new Error('usage: bgz jev route --job "<text|@file>" [--status <STATUS.md>] [--deterministic]');
  let text = '';
  try {
    text = fs.readFileSync(typeof flags.status === 'string' ? flags.status : statusPath(env), 'utf8');
  } catch {
    // no STATUS here: the default roles apply
  }
  return route({
    job,
    roles: rolesFromStatus(text),
    env,
    timeoutMs: timeoutMs < 5000 ? 5000 : timeoutMs,
    allowDeterministic: Boolean(flags.deterministic) || Boolean(isDeterministicJob(job)),
  });
}
