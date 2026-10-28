#!/usr/bin/env node
import { isCommandEntry } from '../../hooks/lib/command-entry.mjs';
// bgz goal — Universal QA/QC Goal & Checklist Contract Manager (BGZFLOW 0.9.4).
// Manages .bgzflow/active-goal.json across any domain (software, research, personal assistant, legal, marketing):
//   bgz goal lock --file <spec.json> [--dir <project>]
//   bgz goal status [--dir <project>]
//   bgz goal set-wait --job-id <id> | --clear [--dir <project>]
//   bgz goal withdraw-item --id <itemId> --reason "<why>" --superseded-by "<sourceRef>" [--dir <project>]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sanitize, sanitizeRecord } from '../../hooks/lib/secrets.mjs';
import { createVocabulary } from '../engine/vocabulary.mjs';
import { fileURLToPath } from 'node:url';
import {
  GOAL_REL_PATH,
  LOOP_STATE_REL_PATH,
  VERIFICATIONS_REL_DIR,
  computeContractSignature,
  computeEscalationSignature,
  evaluateUniversalStop,
  verifySignedReceipt,
} from '../../hooks/lib/universal-stop.mjs';
import {
  DECISION_ESCALATION,
  DECISION_ESCALATION_ASK_AT,
  GOAL_CLARITY,
  GOAL_CLARITY_READY_AT,
  STE_PLAIN_ENGLISH,
  STE_PLAIN_ENGLISH_PASS_AT,
  compositeScore,
} from '../jev/rules.mjs';

export const DOMAIN_QUALITY_STANDARDS = {
  universal: [
    {
      id: 'std-full-outcome',
      requirement: 'The requested result is checked in its intended context against the original goal, with remaining limits stated.',
      sourceRef: 'bgzflow-domain-standard:universal#full-outcome',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-universal-no-truncation',
      requirement: 'Multi-item generations are chunked per-item with response token-ceiling checks (bgz egm drift) so zero outputs are ever cut off mid-sentence.',
      sourceRef: 'bgzflow-domain-standard:universal#no-truncation',
      origin: 'standard_quality_check',
    },
  ],
  ui: [
    {
      id: 'std-ui-visual-integrity',
      requirement: 'Every touched screen renders cleanly with no clipped text, overlapping controls, or broken actions on the target surface.',
      sourceRef: 'bgzflow-domain-standard:ui#visual-integrity',
      origin: 'standard_quality_check',
    },
  ],
  software: [
    {
      id: 'std-sw-oss-build-vs-buy-discovery',
      requirement: 'Every non-trivial capability checks 4-Channel x 4-Angle open-source discovery (bgz eval research + bgz eval architecture) so existing permissive packages/tools are downloaded or forged (bgz skill-forge) instead of reinvented from scratch.',
      sourceRef: 'bgzflow-domain-standard:software#oss-build-vs-buy-discovery',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-sw-real-effect',
      requirement: 'Every built feature executes against the real served runtime and proves its state change or effect read-back.',
      sourceRef: 'bgzflow-domain-standard:software#real-effect',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-sw-single-source-mode-exclusivity',
      requirement: 'Mutually exclusive modes or plans cannot run concurrently; a single canonical state machine governs active execution (bgz egm xray).',
      sourceRef: 'bgzflow-domain-standard:software#single-source-mode-exclusivity',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-sw-revision-epoch-cancellation',
      requirement: 'Any user plan update, config change, or stop signal increments a revision epoch (planRevision) and immediately cancels stale queued or in-flight work.',
      sourceRef: 'bgzflow-domain-standard:software#revision-epoch-cancellation',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-sw-zero-silent-blackholes',
      requirement: 'No active configuration, queue, or fallback can silently do nothing or ship a degraded fallback without an explicit diagnostic alert and completeness gate.',
      sourceRef: 'bgzflow-domain-standard:software#zero-silent-blackholes',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-sw-lineage-trace-and-learner',
      requirement: 'Every automated pipeline execution writes a deterministic lineage trace (inputs -> skills -> model -> script -> output completeness) and wires outcomes back to the learner loop (bgz egm autosetup).',
      sourceRef: 'bgzflow-domain-standard:software#lineage-trace-and-learner',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-sw-bounded-chunk-no-truncation',
      requirement: 'Multi-item generations are chunked per-item with response token-ceiling checks (bgz egm drift) so zero outputs are ever cut off mid-sentence.',
      sourceRef: 'bgzflow-domain-standard:software#bounded-chunk-no-truncation',
      origin: 'standard_quality_check',
    },
  ],
  research: [
    {
      id: 'std-research-primary-sources',
      requirement: 'Every factual claim is backed by a verified primary source or live data check, with zero fabricated citations.',
      sourceRef: 'bgzflow-domain-standard:research#primary-sources',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-research-4x4-saturation',
      requirement: 'Every search covers all 4 channels (code_forges, package_registries, academic_and_specs, community_and_benchmarks) x 4 query angles (exact_domain_terms, problem_symptom_synonyms, adjacent_industry_terms, permissive_license_filters) until saturation (bgz eval research).',
      sourceRef: 'bgzflow-domain-standard:research#4x4-saturation',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-research-build-vs-buy',
      requirement: 'Every custom component is evaluated against permissive open-source candidates (MIT/Apache-2.0/BSD) before writing custom code (bgz eval architecture).',
      sourceRef: 'bgzflow-domain-standard:research#build-vs-buy',
      origin: 'standard_quality_check',
    },
  ],
  legal: [
    {
      id: 'std-legal-verified-authority',
      requirement: 'Every legal or compliance clause is checked against the exact governing text with zero hallucinated references.',
      sourceRef: 'bgzflow-domain-standard:legal#verified-authority',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-legal-procedural-stage-lock',
      requirement: 'Every statutory precondition and procedural stage (pre-action, issued-claim, trial, enforcement) is verified before citing any rule or remedy (bgz eval claims).',
      sourceRef: 'bgzflow-domain-standard:legal#procedural-stage-lock',
      origin: 'standard_quality_check',
    },
    {
      id: 'std-legal-math-crossfoot',
      requirement: 'Every financial schedule, damages table, and date timeline cross-foots with zero discrepancy (bgz eval math).',
      sourceRef: 'bgzflow-domain-standard:legal#math-crossfoot',
      origin: 'standard_quality_check',
    },
  ],
  marketing: [
    {
      id: 'std-marketing-brand-and-links',
      requirement: 'Every campaign asset matches the approved brand voice, visual layout, and working destination links.',
      sourceRef: 'bgzflow-domain-standard:marketing#brand-and-links',
      origin: 'standard_quality_check',
    },
  ],
  personal: [
    {
      id: 'std-personal-complete-outcome',
      requirement: 'The requested everyday task is completed end-to-end and confirmed in plain English without leaving manual technical steps for the user.',
      sourceRef: 'bgzflow-domain-standard:personal#complete-outcome',
      origin: 'standard_quality_check',
    },
  ],
};

export function lockGoalContract(spec, { root = process.cwd() } = {}) {
  if (!spec || typeof spec !== 'object') {
    return { ok: false, reason: 'Goal spec must be a JSON object.' };
  }
  const goalId = String(spec.goalId || spec.id || '').trim();
  const domain = String(spec.domain || 'universal').trim();
  const authorRole = String(spec.authorRole || 'verifier').trim().toLowerCase();
  if (!goalId) {
    return { ok: false, reason: 'Goal contract requires goalId.' };
  }
  if (authorRole === 'builder' || authorRole === 'executor') {
    return {
      ok: false,
      reason: 'Builder/executor cannot author or lock the QA/QC checklist contract; lead or verifier must lock it.',
    };
  }

  const keepList = Array.isArray(spec.keepList) ? spec.keepList : [];
  const forbidList = Array.isArray(spec.forbidList) ? spec.forbidList : [];
  const checklist = Array.isArray(spec.checklist) ? spec.checklist : [];
  if (spec.originalRequest !== undefined && (typeof spec.originalRequest !== 'string' || !spec.originalRequest.trim())) {
    return { ok: false, reason: 'originalRequest must preserve non-empty user input.' };
  }

  if (!checklist.length && !keepList.length && !forbidList.length) {
    return { ok: false, reason: 'Goal contract must define at least one checklist, keepList, or forbidList item.' };
  }

  const itemIds = new Set();
  for (const item of [...keepList, ...forbidList, ...checklist]) {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) {
      return { ok: false, reason: 'Every keepList, forbidList, and checklist item requires a unique id.' };
    }
    if (!item.sourceRef || typeof item.sourceRef !== 'string' || !item.sourceRef.trim()) {
      return {
        ok: false,
        reason: `Item ${item.id} is missing sourceRef (must cite the exact user line, DECISIONS.md line, or approved spec).`,
      };
    }
    if (itemIds.has(item.id.trim())) return { ok: false, reason: `Duplicate outcome requirement id: ${item.id.trim()}.` };
    itemIds.add(item.id.trim());
  }

  let vocabulary;
  try { if (spec.vocabulary) vocabulary = createVocabulary(sanitizeRecord(spec.vocabulary)); }
  catch (error) { return { ok: false, reason: error.message }; }
  const originalRequest = spec.originalRequest !== undefined ? sanitize(spec.originalRequest) : undefined;
  const goalObj = {
    schemaVersion: 1,
    goalId,
    project: spec.project || path.basename(root),
    domain,
    active: spec.active !== false,
    phase: spec.phase || 'execute',
    authorRole,
    boundAgentRole: spec.boundAgentRole || null,
    candidateSha: spec.candidateSha || null,
    maxContinuations: Number.isInteger(spec.maxContinuations) ? spec.maxContinuations : 6,
    maxElapsedMinutes: Number.isFinite(spec.maxElapsedMinutes) ? spec.maxElapsedMinutes : 120,
    waitOnPeerBeforeStop: spec.waitOnPeerBeforeStop === true,
    keepList: keepList.map((k) => ({
      id: k.id.trim(),
      behaviour: String(k.behaviour || k.requirement || '').trim(),
      sourceRef: k.sourceRef.trim(),
    })),
    forbidList: forbidList.map((f) => ({
      id: f.id.trim(),
      pattern: String(f.pattern || '').trim(),
      kind: f.kind || 'rendered_or_symbol',
      scopedFiles: Array.isArray(f.scopedFiles) ? f.scopedFiles : undefined,
      sourceRef: f.sourceRef.trim(),
    })),
    checklist: checklist.map((c) => ({
      id: c.id.trim(),
      requirement: String(c.requirement || '').trim(),
      sourceRef: c.sourceRef.trim(),
      origin: c.origin || 'user_explicit',
      requiresHumanAuthority: c.requiresHumanAuthority === true,
      authorityState: c.requiresHumanAuthority === true ? c.authorityState || 'awaiting_authority' : undefined,
      domainProbe: c.domainProbe || null,
      jevAtomicQuestion: c.jevAtomicQuestion || null,
      visualCheck: c.visualCheck || null,
    })),
    plainEnglishSummary: spec.plainEnglishSummary ? sanitize(spec.plainEnglishSummary) : null,
    ...(originalRequest !== undefined ? { originalRequest, originalRequestSanitized: originalRequest !== spec.originalRequest } : {}),
    ...(vocabulary ? { vocabulary } : {}),
    displayPreference: spec.displayPreference || 'plain_only',
    withdrawnItems: Array.isArray(spec.withdrawnItems) ? spec.withdrawnItems : [],
    lockedAt: new Date().toISOString(),
  };

  goalObj.contractSignature = computeContractSignature(goalObj);

  const targetPath = path.join(root, GOAL_REL_PATH);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.mkdirSync(path.join(root, VERIFICATIONS_REL_DIR), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(goalObj, null, 2) + '\n', 'utf8');

  // Reset loop state for fresh lock
  const loopPath = path.join(root, LOOP_STATE_REL_PATH);
  fs.writeFileSync(
    loopPath,
    JSON.stringify({ goalId, startedAt: new Date().toISOString(), stopContinuations: 0, itemFailures: {} }, null, 2) + '\n',
    'utf8',
  );

  return {
    ok: true,
    goalId,
    domain,
    contractSignature: goalObj.contractSignature,
    counts: {
      keepList: goalObj.keepList.length,
      forbidList: goalObj.forbidList.length,
      checklist: goalObj.checklist.length,
    },
    file: targetPath,
  };
}

export async function checkStePlainEnglish(
  { text = '' },
  { scoreImpl = null, env = process.env } = {},
) {
  const candidate = String(text || '').trim();
  if (!candidate) {
    return { ok: false, reason: 'check-ste requires non-empty --text.' };
  }
  const scoreRes = scoreImpl
    ? await scoreImpl({ text: candidate })
    : await compositeScore({
        preset: STE_PLAIN_ENGLISH,
        text: candidate,
        env,
        timeoutMs: 8000,
        caller: 'goal-check-ste',
      });
  if (!scoreRes || !scoreRes.ok) {
    return { ok: false, reason: `Jev STE Plain-English check failed (${scoreRes?.err || 'unavailable'}).` };
  }
  const passesSte = scoreRes.value >= STE_PLAIN_ENGLISH_PASS_AT;
  const weakDimensions = Object.entries(scoreRes.parts || {})
    .filter(([, p]) => p.norm < STE_PLAIN_ENGLISH_PASS_AT)
    .map(([k]) => k);
  return {
    ok: true,
    steScore: scoreRes.value,
    passAt: STE_PLAIN_ENGLISH_PASS_AT,
    passesSte,
    weakDimensions,
    parts: scoreRes.parts || {},
    action: passesSte ? 'SHOW_TO_USER' : 'REWRITE_IN_STE_PLAIN_ENGLISH',
    note: passesSte
      ? `STE score ${scoreRes.value} >= ${STE_PLAIN_ENGLISH_PASS_AT}: clear everyday English ready for the user.`
      : `STE score ${scoreRes.value} < ${STE_PLAIN_ENGLISH_PASS_AT}: rewrite in BGZFLOW Plain-English plain English (<= 20 words per question, active voice, zero internal code/hook/CLI jargon).`,
  };
}

export async function compileGoalFromPlainEnglish(
  spec = {},
  { root = process.cwd(), env = process.env, scoreImpl = null } = {},
) {
  const prompt = String(spec.prompt || spec.userPrompt || spec.originalRequest || '').trim();
  const plainEnglishSummary = String(spec.plainEnglishSummary || spec.summary || prompt).trim();
  const domain = String(spec.domain || 'universal').trim().toLowerCase();
  const displayPreference =
    String(spec.displayPreference || env.BGZFLOW_SPEC_DISPLAY || 'plain_only').trim().toLowerCase() === 'plain_plus_spec'
      ? 'plain_plus_spec'
      : 'plain_only';

  if (!prompt && (!Array.isArray(spec.checklist) || !spec.checklist.length)) {
    return { ok: false, reason: 'compile requires --prompt "<short user input>" or a spec with checklist items.' };
  }

  // If plainEnglishSummary is provided and scoreImpl/Jev is available, verify STE plain-English quality
  let steCheck = null;
  if (plainEnglishSummary && (scoreImpl || env.TYPESAFE_API_KEY || fs.existsSync(path.join(os.homedir(), '.typesafe_key')))) {
    const sc = await checkStePlainEnglish({ text: plainEnglishSummary }, { scoreImpl, env });
    if (sc.ok) steCheck = sc;
  }

  const goalId = String(spec.goalId || `goal-${Date.now().toString(36)}`).trim();
  const userChecklist = Array.isArray(spec.checklist) && spec.checklist.length > 0
    ? spec.checklist.map((c, idx) => ({
        id: String(c.id || `item-${idx + 1}`).trim(),
        requirement: String(c.requirement || '').trim(),
        sourceRef: String(c.sourceRef || 'user-prompt:explicit').trim(),
        origin: c.origin || 'user_explicit',
        requiresHumanAuthority: c.requiresHumanAuthority === true,
        domainProbe: c.domainProbe || null,
        jevAtomicQuestion: c.jevAtomicQuestion || null,
        visualCheck: c.visualCheck || null,
      }))
    : [
        {
          id: 'item-1-user-outcome',
          requirement: plainEnglishSummary || prompt,
          sourceRef: 'user-prompt:1',
          origin: 'user_explicit',
        },
      ];

  const attachStandards = spec.attachDomainStandards !== false;
  const domainStandards = attachStandards ? DOMAIN_QUALITY_STANDARDS[domain] || DOMAIN_QUALITY_STANDARDS.universal : [];
  const existingIds = new Set(userChecklist.map((c) => c.id));
  const mergedChecklist = [
    ...userChecklist,
    ...domainStandards.filter((s) => !existingIds.has(s.id)),
  ];

  const lockRes = lockGoalContract(
    {
      goalId,
      project: spec.project || path.basename(root),
      domain,
      authorRole: spec.authorRole || 'lead',
      boundAgentRole: spec.boundAgentRole || null,
      candidateSha: spec.candidateSha || null,
      plainEnglishSummary,
      ...(prompt ? { originalRequest: spec.originalRequest ?? String(spec.prompt || spec.userPrompt) } : {}),
      ...(spec.vocabulary ? { vocabulary: spec.vocabulary } : {}),
      displayPreference,
      keepList: Array.isArray(spec.keepList) ? spec.keepList : [],
      forbidList: Array.isArray(spec.forbidList) ? spec.forbidList : [],
      checklist: mergedChecklist,
    },
    { root },
  );

  if (!lockRes.ok) return lockRes;

  const userFacingView = {
    plainEnglishSummary,
    whatWeWillBuild: userChecklist.map((c) => c.requirement),
    whatWeWillKeep: (spec.keepList || []).map((k) => k.behaviour || k.requirement),
    whatWeWillReplace: (spec.forbidList || []).map((f) => f.pattern),
    standardQualityChecksAttached: domainStandards.length,
  };

  return {
    ok: true,
    goalId,
    domain,
    displayPreference,
    steCheck,
    userFacing: userFacingView,
    ...(displayPreference === 'plain_plus_spec'
      ? {
          compiledSpec: JSON.parse(fs.readFileSync(lockRes.file, 'utf8')),
        }
      : {}),
    lockedFile: lockRes.file,
    contractSignature: lockRes.contractSignature,
  };
}

export function withdrawGoalItem({ id, reason, supersededBy }, { root = process.cwd() } = {}) {
  const targetPath = path.join(root, GOAL_REL_PATH);
  if (!fs.existsSync(targetPath)) return { ok: false, reason: 'No active-goal.json found.' };
  if (!id || !reason || !supersededBy) {
    return { ok: false, reason: 'Withdrawing an item requires id, reason, and supersededBy sourceRef.' };
  }
  const goal = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  goal.withdrawnItems = Array.isArray(goal.withdrawnItems) ? goal.withdrawnItems : [];
  goal.withdrawnItems.push({
    id,
    reason,
    supersededBy,
    withdrawnAt: new Date().toISOString(),
  });
  fs.writeFileSync(targetPath, JSON.stringify(goal, null, 2) + '\n', 'utf8');
  return { ok: true, goalId: goal.goalId, withdrawnId: id, supersededBy };
}

export function setGoalWaitState({ jobId, clear = false }, { root = process.cwd() } = {}) {
  const targetPath = path.join(root, GOAL_REL_PATH);
  if (!fs.existsSync(targetPath)) return { ok: false, reason: 'No active-goal.json found.' };
  const goal = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  if (clear) delete goal.waitingOnJobId;
  else goal.waitingOnJobId = String(jobId || '').trim();
  fs.writeFileSync(targetPath, JSON.stringify(goal, null, 2) + '\n', 'utf8');
  return { ok: true, goalId: goal.goalId, waitingOnJobId: goal.waitingOnJobId || null };
}

export async function checkGoalDecisionEscalation(
  { decision, options = [], context = '', clear = false },
  { root = process.cwd(), scoreImpl = null, env = process.env } = {},
) {
  const targetPath = path.join(root, GOAL_REL_PATH);
  if (!fs.existsSync(targetPath)) return { ok: false, reason: 'No active-goal.json found.' };
  const goal = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  if (clear) {
    delete goal.pendingHumanDecision;
    fs.writeFileSync(targetPath, JSON.stringify(goal, null, 2) + '\n', 'utf8');
    return { ok: true, goalId: goal.goalId, cleared: true };
  }
  const question = String(decision || '').trim();
  const opts = Array.isArray(options)
    ? options
    : String(options || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
  if (!question || opts.length < 2) {
    return {
      ok: false,
      reason: 'check-decision requires --decision "<question>" and at least 2 options in --options "Option A (Recommended)|Option B".',
    };
  }

  const stateText = JSON.stringify(
    {
      goalId: goal.goalId,
      domain: goal.domain,
      keepList: goal.keepList,
      forbidList: goal.forbidList,
      checklist: goal.checklist,
      proposedDecisionQuestion: question,
      options: opts,
      additionalContext: context,
    },
    null,
    2,
  );

  const scoreRes = scoreImpl
    ? await scoreImpl({ text: stateText })
    : await compositeScore({
        preset: DECISION_ESCALATION,
        text: stateText,
        env,
        timeoutMs: 8000,
        caller: 'goal-check-decision',
      });

  if (!scoreRes || !scoreRes.ok) {
    return {
      ok: false,
      reason: `Jev decision-escalation check failed (${scoreRes?.err || 'unavailable'}).`,
    };
  }

  const shouldAskUser = scoreRes.value >= DECISION_ESCALATION_ASK_AT;
  if (shouldAskUser) {
    const phd = {
      goalId: goal.goalId,
      question,
      options: opts,
      jevEscalationScore: scoreRes.value,
      parts: scoreRes.parts || {},
      recordedAt: new Date().toISOString(),
    };
    phd.escalationSignature = computeEscalationSignature(phd);
    goal.pendingHumanDecision = phd;
    fs.writeFileSync(targetPath, JSON.stringify(goal, null, 2) + '\n', 'utf8');
    return {
      ok: true,
      goalId: goal.goalId,
      jevEscalationScore: scoreRes.value,
      askAt: DECISION_ESCALATION_ASK_AT,
      shouldAskUser: true,
      action: 'ASK_USER_FOR_CLARIFICATION',
      pendingHumanDecision: phd,
      note: `Jev scored this decision ${scoreRes.value} >= ${DECISION_ESCALATION_ASK_AT}. Stop gate unlocked so you can present this question and options to the user now.`,
    };
  }

  delete goal.pendingHumanDecision;
  fs.writeFileSync(targetPath, JSON.stringify(goal, null, 2) + '\n', 'utf8');
  return {
    ok: true,
    goalId: goal.goalId,
    jevEscalationScore: scoreRes.value,
    askAt: DECISION_ESCALATION_ASK_AT,
    shouldAskUser: false,
    action: 'DECIDE_AUTONOMOUSLY_AND_CONTINUE',
    parts: scoreRes.parts || {},
    note: `Jev scored this decision ${scoreRes.value} < ${DECISION_ESCALATION_ASK_AT} (routine engineering). Do NOT interrupt the user; choose the recommended option autonomously, record it in DECISIONS.md, and continue building.`,
  };
}

export function goalStatus({ root = process.cwd() } = {}) {
  const targetPath = path.join(root, GOAL_REL_PATH);
  if (!fs.existsSync(targetPath)) return { active: false };
  const goal = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const stopEval = evaluateUniversalStop({ cwd: root }, { projectDir: root });
  const withdrawnIds = new Set((goal.withdrawnItems || []).map((w) => w.id));
  const items = [
    ...(goal.keepList || []).map((k) => ({ ...k, kind: 'keep' })),
    ...(goal.forbidList || []).map((f) => ({ ...f, kind: 'forbid' })),
    ...(goal.checklist || []).map((c) => ({ ...c, kind: 'checklist' })),
  ].map((item) => {
    if (withdrawnIds.has(item.id)) return { id: item.id, kind: item.kind, status: 'withdrawn_superseded' };
    if (item.requiresHumanAuthority && item.authorityState === 'awaiting_authority') {
      return { id: item.id, kind: item.kind, status: 'awaiting_authority' };
    }
    const r = verifySignedReceipt(root, item, goal);
    return { id: item.id, kind: item.kind, origin: item.origin || 'user_explicit', status: r.ok ? 'VERIFIED_USED' : 'UNVERIFIED', detail: r.reason || null };
  });
  return {
    active: goal.active !== false,
    goalId: goal.goalId,
    domain: goal.domain,
    candidateSha: goal.candidateSha,
    signatureValid: goal.contractSignature === computeContractSignature(goal),
    stopGateDecision: stopEval.decision,
    stopGateReason: stopEval.reason || null,
    pendingHumanDecision: goal.pendingHumanDecision || null,
    items,
    withdrawnItems: goal.withdrawnItems || [],
  };
}

function parseArgs(argv) {
  const args = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--clear') args.clear = true;
    else if (a.startsWith('--')) {
      args[a.slice(2)] = argv[++i];
    } else rest.push(a);
  }
  return { cmd: rest[0], args };
}

if (isCommandEntry(import.meta.url)) {
  const { cmd, args } = parseArgs(process.argv.slice(2));
  const root = args.dir ? path.resolve(args.dir) : process.cwd();
  let res;
  if (args.help || !cmd) {
    console.log(
      'usage: bgz goal compile (--prompt "<short prompt>" | --file <spec.json>) [--summary "<STE summary>"] [--domain software|ui|research|legal|marketing|personal] [--display plain_only|plain_plus_spec] [--dir <project>] | check-ste --text "<user-facing text>" | lock --file <spec.json> [--dir <project>] | status [--dir <project>] | check-decision (--decision "<q>" --options "<A|B>" | --clear) [--dir <project>] | set-wait (--job-id <id> | --clear) [--dir <project>] | withdraw-item --id <id> --reason "<why>" --superseded-by "<ref>" [--dir <project>]',
    );
    process.exit(0);
  } else if (cmd === 'compile') {
    const baseSpec = args.file ? JSON.parse(fs.readFileSync(path.resolve(root, args.file), 'utf8')) : {};
    res = await compileGoalFromPlainEnglish(
      {
        ...baseSpec,
        ...(args.prompt ? { prompt: args.prompt } : {}),
        ...(args.summary ? { plainEnglishSummary: args.summary } : {}),
        ...(args.domain ? { domain: args.domain } : {}),
        ...(args.display ? { displayPreference: args.display } : {}),
      },
      { root },
    );
  } else if (cmd === 'check-ste') {
    res = await checkStePlainEnglish({ text: args.text });
  } else if (cmd === 'lock') {
    const spec = JSON.parse(fs.readFileSync(path.resolve(root, args.file), 'utf8'));
    res = lockGoalContract(spec, { root });
  } else if (cmd === 'status') {
    res = goalStatus({ root });
  } else if (cmd === 'check-decision') {
    res = await checkGoalDecisionEscalation(
      { decision: args.decision, options: args.options, context: args.context, clear: args.clear },
      { root },
    );
  } else if (cmd === 'set-wait') {
    res = setGoalWaitState({ jobId: args['job-id'], clear: args.clear }, { root });
  } else if (cmd === 'withdraw-item') {
    res = withdrawGoalItem({ id: args.id, reason: args.reason, supersededBy: args['superseded-by'] }, { root });
  } else {
    res = { ok: false, reason: `Unknown subcommand: ${cmd}` };
  }
  console.log(JSON.stringify(res, null, 2));
  if (res.ok === false) process.exitCode = 2;
}
