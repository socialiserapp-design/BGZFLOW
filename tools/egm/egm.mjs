#!/usr/bin/env node
// BGZFLOW Elephant-Goldfish & Proactive Co-Architect Engine (bgz egm)
// Solves the 8 root causes where user prompt underspecification, lack of domain experience,
// or AI agent sycophancy leads to local symptom patching and broken systems:
//   1. Stage 0 Whole-System X-Ray & Silent Black-Hole Audit (`bgz egm xray`)
//   2. Automatic "Unknown-Unknowns" Expert Requirement Expansion (`bgz egm expand`)
//   3. Anti-Sycophancy Pushback & Plain-English Architecture Mentor (`bgz egm mentor`)
//   4. Stateless Zero-Context 6-Lens Goldfish Pre-Code Review (`bgz egm goldfish`)
//   5. Zero-Bottleneck Autonomous Observability & Harness Self-Setup (`bgz egm autosetup`)
//   6. Post-Build Architectural & Output-Truncation Drift Detector (`bgz egm drift`)

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SYSTEM_LIFECYCLE_STAGES = Object.freeze([
  { id: 'inputs_and_steering', order: 1, name: 'Inputs & Owner Steering (UI, Chat, Toggles, Brand Kit)' },
  { id: 'state_and_exclusivity', order: 2, name: 'State Store, Mode Exclusivity & Config Integrity' },
  { id: 'queue_and_revision_epochs', order: 3, name: 'Scheduler / Queue & Revision Epoch Cancellation' },
  { id: 'generator_and_token_budget', order: 4, name: 'Worker / Generator, Chunking & Token-Ceiling Guard' },
  { id: 'delivery_and_fallbacks', order: 5, name: 'Publisher / Surface Delivery & Explicit Fallback Guard' },
  { id: 'telemetry_and_learner_loop', order: 6, name: 'Per-Execution Diagnostic Trace & Closed-Loop Learner' },
]);

export const GOLDFISH_SIX_LENSES = Object.freeze([
  {
    id: 'contrarian_yagni',
    name: 'Lens 1: Contrarian & Root-Cause vs Symptom',
    question: 'Does this design fix the underlying system root cause rather than adding a band-aid on a symptom?',
  },
  {
    id: 'state_and_concurrency',
    name: 'Lens 2: State Machine Exclusivity & Epoch Cancellation',
    question: 'What happens when the user changes direction mid-cycle, cancels, or enables competing modes at once?',
  },
  {
    id: 'ux_and_ergonomics',
    name: 'Lens 3: UX & Silent Black-Hole Prevention',
    question: 'Can a user end up with an active config that has zero targets/plan or produces zero accepted outputs silently?',
  },
  {
    id: 'cost_and_token_ceiling',
    name: 'Lens 4: Cost Cap & Output Token-Cutoff Guard',
    question: 'Are multi-item generations chunked so no single model call hits the output token limit or wastes spend on truncated items?',
  },
  {
    id: 'observability_and_tracing',
    name: 'Lens 5: Per-Execution Trace & Closed-Loop Learner',
    question: 'Does every execution write a structured trace (inputs, skills, model, script, output check) that feeds back into future picks?',
  },
  {
    id: 'migration_and_backward_compat',
    name: 'Lens 6: Existing User Migration & Rollback Safety',
    question: 'How are existing live configs/items backfilled or migrated safely without breaking active users?',
  },
]);

export const EXPERT_UNKNOWN_UNKNOWNS_MATRIX = Object.freeze({
  software: [
    {
      id: 'exp-sw-oss-build-vs-buy-discovery',
      principle: '4-Channel x 4-Angle Open-Source Discovery Before Custom Code (Build-vs-Buy)',
      requirement: 'Before writing custom code for any non-trivial capability, run a 4-Channel (GitHub, X/Social Dev, HN/Reddit, Package Registries/Papers) x 4-Angle (symptom, mechanism, ecosystem alternatives, recent breakout) search to check if an existing permissive open-source tool, library, or skill can be downloaded, adopted, or forged via bgz skill-forge.',
      plainEnglishWhy: 'Writing custom code for solved problems wastes days of engineering and maintenance when a battle-tested open-source package or repo can be downloaded and wired in minutes.',
    },
    {
      id: 'exp-sw-single-source-of-truth',
      principle: 'Single Source of Truth & Mode Exclusivity',
      requirement: 'Mutually exclusive modes (e.g. manual targets vs automated growth loop) cannot both own the active schedule simultaneously.',
      plainEnglishWhy: 'When two features both try to steer the same schedule, they overwrite each other and confuse the user.',
    },
    {
      id: 'exp-sw-revision-epoch-fencing',
      principle: 'Epoch Fencing (Stale-Queue Cancellation)',
      requirement: 'Every queued or scheduled future job carries the planRevision number that created it; if the user updates their direction, any queued job with an older planRevision is automatically cancelled or refreshed.',
      plainEnglishWhy: 'Without revision fencing, old posts generated last week keep publishing even after you tell the system to change direction today.',
    },
    {
      id: 'exp-sw-silent-blackhole-guard',
      principle: 'Zero Silent Black Holes (Config Completeness Invariant)',
      requirement: 'An enabled automation config cannot sit active with zero targets, zero accepted briefs, or disconnected save handlers without surfacing an immediate setup prompt or auto-healing.',
      plainEnglishWhy: 'A system that looks "switched on" in the UI while silently doing nothing is the hardest bug for an owner to diagnose.',
    },
    {
      id: 'exp-sw-per-execution-trace',
      principle: 'Self-Contained Execution Lineage Trace',
      requirement: 'Every generated item or workflow execution records a single trace row (trigger source, active brand/config, skills loaded, model chosen, prompt/script, and output-vs-spec verification).',
      plainEnglishWhy: 'When an output looks wrong, a single trace record tells you in 5 seconds whether the bug was in the input config, the prompt, the model, or the renderer.',
    },
    {
      id: 'exp-sw-closed-loop-learner',
      principle: 'Closed-Loop Feedback Control',
      requirement: 'User approvals, rejections ("Not this one"), and live outcome metrics automatically feed back into the routing/selection ledger so future generations improve without manual retuning.',
      plainEnglishWhy: 'An AI system that does not wire user rejections and wins back into its picker repeats the same mistakes forever.',
    },
    {
      id: 'exp-sw-chunked-token-budget',
      principle: 'Bounded-Chunk Generation & Auto-Continuation',
      requirement: 'Multi-item generations (e.g. a full week of multi-shot video scripts) are generated per-item or with pre-calculated output token budgets and automatic truncation continuation, never cut off mid-sentence.',
      plainEnglishWhy: 'Asking one model call to write six long scripts at once hits the output token ceiling and leaves half your week unfinished.',
    },
  ],
  research: [
    {
      id: 'exp-res-4x4-saturation',
      principle: '4-Channel x 4-Angle Discovery Saturation',
      requirement: 'Search across GitHub, X/Social Dev, HN/Reddit forums, and package registries/papers across symptom, mechanism, ecosystem alternatives, and recent breakout repos until saturation.',
      plainEnglishWhy: 'Searching only one keyword on GitHub misses brand-new breakout tools and mature libraries that use different technical terminology.',
    },
    {
      id: 'exp-res-adversarial-counterevidence',
      principle: 'Disconfirming Evidence & Failure-Mode Audit',
      requirement: 'Actively search for known production failures, license traps, and maintenance stalls of the top candidate before recommending it.',
      plainEnglishWhy: 'Every library looks great in its own README; checking real user issues prevents adopting a tool that breaks at scale.',
    },
  ],
  legal: [
    {
      id: 'exp-leg-procedural-stage-gate',
      principle: 'Procedural Stage Precondition Lock',
      requirement: 'Verify exact procedural stage facts (e.g. arraignment, plea, indictment preferment, limitation dates) before recommending any statutory mechanism.',
      plainEnglishWhy: 'A legal remedy that is valid before arraignment becomes legally impossible the day after a plea is entered.',
    },
    {
      id: 'exp-leg-atomic-exhibit-grounding',
      principle: 'Primary Bundle & Exhibit Cross-Verification',
      requirement: 'Every exhibit code, seal number, date, and quantity in the draft is cross-checked against the primary bundle text and cross-footed mathematically.',
      plainEnglishWhy: 'One ungrounded exhibit code or arithmetic slip undermines the credibility of the entire legal submission.',
    },
  ],
});

function egmDir(projectDir = process.cwd()) {
  return path.join(path.resolve(projectDir), '.bgzflow', 'egm');
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Pillar 1: Stage 0 Whole-System X-Ray & Silent Black-Hole Audit (`bgz egm xray`)
 * Inspects a project/system description or live files across all 6 lifecycle stages before asking questions or writing code.
 */
export function runSystemXRay({
  projectDir = process.cwd(),
  systemName = 'Target System',
  userPrompt = '',
  observedState = {},
  filesToScan = [],
} = {}) {
  const root = path.resolve(projectDir);
  fs.mkdirSync(egmDir(root), { recursive: true });

  const unaskedSystemIssues = [];
  const lifecycleAudit = [];

  // Scan provided files or state text for common structural hazards
  let combinedText = JSON.stringify(observedState || {});
  for (const rel of filesToScan) {
    const abs = path.resolve(root, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      combinedText += '\n' + fs.readFileSync(abs, 'utf8');
    }
  }

  // Stage 1 & 2: Inputs, Steering & Mode Exclusivity
  const hasCompetingModes =
    observedState.competingModes === true ||
    /competing\s+modes|both\s+on\s+at\s+once|running\s+together/i.test(combinedText) ||
    (/Quick\s*Targets/i.test(combinedText) && /Growth\s*Loop/i.test(combinedText));
  if (hasCompetingModes) {
    unaskedSystemIssues.push({
      stage: 'state_and_exclusivity',
      severity: 'high',
      issue: 'Competing steering modes can run simultaneously without a mutual-exclusion lock.',
      architecturalFix: 'Enforce a single active mode enum (e.g. mode: "quick_targets" | "growth_loop") so enabling one cleanly deactivates the other.',
    });
  }

  // Stage 2: Silent Black Hole configs (e.g. active configs with 0 targets/plans or 0 accepted outputs)
  if (
    observedState.emptyActiveConfigs > 0 ||
    observedState.zeroAcceptedOutputs === true ||
    /no\s+targets\/plan|never\s+produced\s+an\s+accepted/i.test(combinedText)
  ) {
    unaskedSystemIssues.push({
      stage: 'inputs_and_steering',
      severity: 'high',
      issue: 'Silent Black Hole detected: active user configurations exist with zero targets/plans or zero accepted briefs.',
      architecturalFix: 'Add a Config Completeness Guard on save/activation and backfill existing incomplete configs so no user sits in a silent no-op state.',
    });
  }

  // Stage 3: Queue & Revision Epochs (Stale items firing after user changes direction)
  const missingEpochCancellation =
    observedState.staleQueueItemsFiring === true ||
    observedState.hasRevisionEpochFencing === false ||
    /(?:despite|even\s+though)\s+rev\s+\d+\s+sa(?:ying|id)\s+stop|stale\s+queued|mid-week\s+refresh\s+of\s+unmade\s+items/i.test(combinedText);
  if (missingEpochCancellation) {
    unaskedSystemIssues.push({
      stage: 'queue_and_revision_epochs',
      severity: 'critical',
      issue: 'Stale Queue / Split-Brain State: queued future items continue firing after the user updates their direction or stops a theme.',
      architecturalFix: 'Stamp every queued item with `planRevision`; when the owner updates direction, increment `planRevision` and immediately invalidate/refresh all unmade future items.',
    });
  }

  // Stage 4: Generator Token Ceiling / Truncated Multi-Item Batches
  const hasTruncationRisk =
    observedState.truncatedOutputs === true ||
    /reached\s+the\s+response\s+limit|plan\s+is\s+incomplete|only\s+\d+\s+of\s+\d+\s+scripts\s+came\s+back/i.test(combinedText);
  if (hasTruncationRisk) {
    unaskedSystemIssues.push({
      stage: 'generator_and_token_budget',
      severity: 'critical',
      issue: 'Output Token-Ceiling Truncation: multi-item generation hit the model output token limit, leaving items incomplete.',
      architecturalFix: 'Decompose multi-day/multi-item generation into bounded per-item calls (Map-Reduce per day/post) with a deterministic completeness check before saving.',
    });
  }

  // Stage 5: Silent Degraded Fallback (e.g. motion-graphics failed so plain video posted silently)
  if (observedState.silentDegradedFallback === true || /render\s+FAILED,\s*so\s+it\s+posted\s+the\s+plain/i.test(combinedText)) {
    unaskedSystemIssues.push({
      stage: 'delivery_and_fallbacks',
      severity: 'high',
      issue: 'Silent Degraded Delivery: an effects/graphics render failed and the publisher silently shipped the unstyled fallback.',
      architecturalFix: 'Gate publishing on required render layers passing (or retry/alert before publishing a degraded asset).',
    });
  }

  // Stage 6: Telemetry Trace & Closed-Loop Learner
  if (
    observedState.hasExecutionTrace === false ||
    observedState.learnerConnected === false ||
    /Learner[\s\S]{0,40}NOT\s+connected|per-post\s+trace\s+record[\s\S]{0,60}not\s+started/i.test(combinedText)
  ) {
    unaskedSystemIssues.push({
      stage: 'telemetry_and_learner_loop',
      severity: 'high',
      issue: 'Open-Loop Blindness: per-execution diagnostic trace and/or feedback learner loop are not connected.',
      architecturalFix: 'Auto-provision a per-execution trace record (`source, config, skills, model, script, outputCheck`) and wire user approvals/rejections into the Jev learner.',
    });
  }

  for (const st of SYSTEM_LIFECYCLE_STAGES) {
    const stageIssues = unaskedSystemIssues.filter((i) => i.stage === st.id);
    lifecycleAudit.push({
      stageId: st.id,
      stageName: st.name,
      status: stageIssues.length === 0 ? 'healthy_or_unchecked' : 'issues_found',
      issues: stageIssues,
    });
  }

  const report = {
    schemaVersion: '1.0.0',
    xrayId: `xray-${createHash('sha256').update(`${systemName}:${Date.now()}`).digest('hex').slice(0, 8)}`,
    createdAtIso: new Date().toISOString(),
    systemName,
    userPrompt,
    wholeSystemSituationalAwareness: true,
    unaskedIssuesCount: unaskedSystemIssues.length,
    unaskedSystemIssues,
    lifecycleAudit,
  };

  fs.writeFileSync(path.join(egmDir(root), 'latest-xray.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  return report;
}

/**
 * Pillar 2 & 3: Anti-Sycophancy Co-Architect Mentor & Unknown-Unknowns Expander (`bgz egm mentor` / `bgz egm expand`)
 * Counteracts incomplete/novice prompts by pushing back against symptom-patching, teaching the architecture principle in plain English,
 * and injecting the expert requirements the user didn't know to ask for.
 */
export function buildCoArchitectMentorPacket({
  projectDir = process.cwd(),
  userPrompt = '',
  domain = 'software',
  xrayReport = null,
} = {}) {
  const root = path.resolve(projectDir);
  fs.mkdirSync(egmDir(root), { recursive: true });

  const prompt = String(userPrompt || '').trim();
  const activeXray = xrayReport || readJsonSafe(path.join(egmDir(root), 'latest-xray.json'), null);
  const expertPlaybook = EXPERT_UNKNOWN_UNKNOWNS_MATRIX[domain] || EXPERT_UNKNOWN_UNKNOWNS_MATRIX.software;

  // Detect if the prompt looks like a narrow symptom tweak or underspecified request
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  const isUnderspecifiedOrSymptomPrompt =
    wordCount < 35 ||
    /\b(?:just\s+fix|quick\s+fix|stop\s+day\s+\d+|hide\s+the|patch|tweak|why\s+did\s+it)\b/i.test(prompt) ||
    Boolean(activeXray && activeXray.unaskedIssuesCount > 0);

  const lessonsTaught = [];
  const diagnosticQuestions = [];

  if (activeXray && Array.isArray(activeXray.unaskedSystemIssues) && activeXray.unaskedSystemIssues.length > 0) {
    for (const item of activeXray.unaskedSystemIssues) {
      if (item.stage === 'queue_and_revision_epochs') {
        lessonsTaught.push({
          principle: 'Epoch Fencing (Revision Invalidation)',
          plainEnglishExplanation:
            'If we only delete or block one bad scheduled post, other pre-generated posts from the old plan will still fire later. In software engineering, we solve this with a "Revision Number" (Epoch): every time an owner changes direction, the plan revision goes up by 1, and any queued post with an older revision number is automatically cancelled or regenerated.',
        });
        diagnosticQuestions.push(
          'When an owner changes their direction or Brand Kit mid-week, should we automatically regenerate all unmade posts for the rest of the week using the new direction (Recommended), or pause them for review?'
        );
      }
      if (item.stage === 'state_and_exclusivity') {
        lessonsTaught.push({
          principle: 'Single Source of Truth (State Machine Exclusivity)',
          plainEnglishExplanation:
            'Allowing two steering modes (like Quick Targets and Growth Loop) to be switched on at the same time creates "Split-Brain State," where two planners fight over the same schedule. Making them mutually exclusive guarantees one clear owner of the schedule.',
        });
        diagnosticQuestions.push(
          'When an owner switches from Quick Targets to Growth Loop (or vice versa), should the new mode immediately take over the upcoming schedule?'
        );
      }
      if (item.stage === 'generator_and_token_budget') {
        lessonsTaught.push({
          principle: 'Bounded Map-Reduce Generation (Preventing Token Cutoffs)',
          plainEnglishExplanation:
            'Asking an AI model to write a whole week of detailed video scripts in one giant response hits the model output ceiling, cutting scripts off in the middle. Generating each day as its own bounded job (and verifying every shot is present before saving) guarantees 100% complete scripts.',
        });
      }
      if (item.stage === 'telemetry_and_learner_loop') {
        lessonsTaught.push({
          principle: 'Closed-Loop Observability & Feedback Control',
          plainEnglishExplanation:
            'Right now, when a post is created or rejected, the system does not record a single trace of which inputs/skills/model produced it, nor does it feed rejections back into future picks. Wiring a trace + learner turns a static generator into a self-improving system.',
        });
      }
    }
  }

  if (lessonsTaught.length === 0) {
    for (const exp of expertPlaybook.slice(0, 3)) {
      lessonsTaught.push({
        principle: exp.principle,
        plainEnglishExplanation: exp.plainEnglishWhy,
      });
    }
  }

  if (diagnosticQuestions.length === 0) {
    diagnosticQuestions.push(
      'What should happen to already-queued or in-flight items when a user changes their settings or cancels mid-way?',
      'If a downstream step (like media rendering or an external API) fails, should the system retry and hold delivery (Recommended) rather than shipping a degraded fallback?'
    );
  }

  const packet = {
    schemaVersion: '1.0.0',
    createdAtIso: new Date().toISOString(),
    userPrompt: prompt,
    domain,
    sycophancyGuardActive: true,
    isUnderspecifiedOrSymptomPrompt,
    antiSycophancyWarning: isUnderspecifiedOrSymptomPrompt
      ? 'STOP_ORDER_TAKER_MODE: Treating this prompt as a literal isolated patch will miss upstream/downstream system state. Use the Whole-System X-Ray and Co-Architect Mentor recommendations below.'
      : null,
    injectedExpertRequirements: expertPlaybook,
    architectureLessonsForUser: lessonsTaught,
    diagnosticQuestionsToAskUser: diagnosticQuestions,
  };

  fs.writeFileSync(path.join(egmDir(root), 'latest-mentor-packet.json'), JSON.stringify(packet, null, 2) + '\n', 'utf8');
  return packet;
}

/**
 * Pillar 4: Stateless Zero-Context 6-Lens Goldfish Pre-Code Review (`bgz egm goldfish`)
 * Enforces Google's Elephant-Goldfish Model: no implementation code is unlocked until the design spec
 * passes all 6 stateless Goldfish adversarial lenses with zero conversation bias.
 */
export function runGoldfishPreCodeReview({
  projectDir = process.cwd(),
  specText = '',
  specPath = null,
} = {}) {
  const root = path.resolve(projectDir);
  fs.mkdirSync(egmDir(root), { recursive: true });

  const content = specPath && fs.existsSync(path.resolve(root, specPath))
    ? fs.readFileSync(path.resolve(root, specPath), 'utf8')
    : String(specText || '');

  const lensChecks = [
    {
      id: 'contrarian_yagni',
      name: 'Lens 1: Root-Cause vs Symptom & YAGNI',
      passed: /\b(?:root\s*cause|lifecycle|invariants?|single\s+source\s+of\s+truth|exclusive)\b/i.test(content),
      missingHint: 'Spec must state the root-cause system invariant being fixed (not just a surface symptom patch).',
    },
    {
      id: 'state_and_concurrency',
      name: 'Lens 2: State Exclusivity & Stale-Queue Epoch Cancellation',
      passed: /\b(?:epoch|revision|cancel|invalidate|exclusive|idempoten|state\s+machine)\b/i.test(content),
      missingHint: 'Spec must define what happens when a user updates direction mid-cycle, cancels, or triggers competing modes.',
    },
    {
      id: 'ux_and_ergonomics',
      name: 'Lens 3: UX & Silent Black-Hole Prevention',
      passed: /\b(?:empty\s+config|zero\s+targets|validation|completeness|user\s+journey|plain\s+english)\b/i.test(content),
      missingHint: 'Spec must prevent silent no-op states (such as active configs with zero targets or unlinked chat plans).',
    },
    {
      id: 'cost_and_token_ceiling',
      name: 'Lens 4: Cost Cap & Output Token-Ceiling / Chunking Guard',
      passed: /\b(?:token|chunk|per-item|budget|cap|truncat|completeness)\b/i.test(content),
      missingHint: 'Spec must bound per-call output size (e.g. per-item chunking) and cost caps so responses never cut off mid-generation.',
    },
    {
      id: 'observability_and_tracing',
      name: 'Lens 5: Per-Execution Trace & Closed-Loop Learner',
      passed: /\b(?:trace|telemetry|lineage|learner|feedback\s+loop|audit\s+log)\b/i.test(content),
      missingHint: 'Spec must include a per-execution trace record (`inputs -> skills -> model -> script -> output check`) and learner feedback wiring.',
    },
    {
      id: 'migration_and_backward_compat',
      name: 'Lens 6: Existing Data Migration & Rollback Safety',
      passed: /\b(?:migrat|backfill|existing\s+users|existing\s+configs|rollback)\b/i.test(content),
      missingHint: 'Spec must state how existing live configs/items are backfilled or migrated safely and how to roll back.',
    },
  ];

  const failedLenses = lensChecks.filter((l) => !l.passed);
  const passed = content.trim().length >= 80 && failedLenses.length === 0;

  const review = {
    schemaVersion: '1.0.0',
    reviewId: `goldfish-${createHash('sha256').update(`${content}:${Date.now()}`).digest('hex').slice(0, 8)}`,
    reviewedAtIso: new Date().toISOString(),
    statelessZeroContextMode: true,
    noCodeRuleEnforced: true,
    codeUnlocked: passed,
    passedLensesCount: lensChecks.length - failedLenses.length,
    totalLenses: lensChecks.length,
    lensResults: lensChecks,
    blockingFindings: failedLenses.map((l) => `[${l.name}] ${l.missingHint}`),
  };

  fs.writeFileSync(path.join(egmDir(root), 'goldfish-review-receipt.json'), JSON.stringify(review, null, 2) + '\n', 'utf8');
  return review;
}

/**
 * Pillar 5: Zero-Bottleneck Autonomous System & Observability Self-Setup (`bgz egm autosetup`)
 * Classifies actions so the human is NEVER a bottleneck for setting up tracing, system maps, audits, or test harnesses,
 * and automatically provisions the project's diagnostic trace & map scaffold on Turn 1.
 */
export function runAutonomousSystemSetup({
  projectDir = process.cwd(),
  projectName = null,
  proposedAction = '',
} = {}) {
  const root = path.resolve(projectDir);
  const name = projectName || path.basename(root);
  const traceDir = path.join(root, '.bgzflow', 'traces');
  fs.mkdirSync(traceDir, { recursive: true });
  fs.mkdirSync(egmDir(root), { recursive: true });

  // Provision the per-execution trace ledger & schema automatically without waiting for user permission
  const traceSchemaFile = path.join(traceDir, 'execution-trace-schema.json');
  if (!fs.existsSync(traceSchemaFile)) {
    fs.writeFileSync(
      traceSchemaFile,
      JSON.stringify(
        {
          schemaVersion: '1.0.0',
          description: 'Auto-provisioned per-execution lineage trace (Zero-Bottleneck Self-Setup).',
          requiredFields: [
            'traceId',
            'timestampIso',
            'triggerSource',
            'planRevisionEpoch',
            'configSnapshot',
            'skillsLoaded',
            'modelSelected',
            'promptOrScriptHash',
            'outputCompletenessVerified',
            'learnerFeedbackLinked',
          ],
        },
        null,
        2
      ) + '\n',
      'utf8'
    );
  }

  // Classify any proposed action to prevent agents from unnecessarily blocking on the human
  const act = String(proposedAction || '').trim();
  const isTrueOwnerDecision =
    /\b(?:spend\s+£|charge\s+customer|publish\s+live|submit\s+to\s+app\s+store|delete\s+production|change\s+brand\s+identity|pricing)\b/i.test(act) &&
    !/\b(?:trace|audit|map|test|dry-run|local|healthcheck|xray|observability|schema)\b/i.test(act);

  const result = {
    schemaVersion: '1.0.0',
    projectName: name,
    projectDir: root,
    humanBottleneckEliminated: true,
    autoProvisionedArtifacts: [
      path.relative(root, traceSchemaFile),
      path.relative(root, egmDir(root)),
    ],
    actionClassification: isTrueOwnerDecision ? 'TRUE_OWNER_DECISION_ASK_HUMAN' : 'AUTO_EXECUTE_ZERO_BOTTLENECK',
    directive: isTrueOwnerDecision
      ? 'This action spends real money, publishes externally, or changes locked brand/product policy: ask the owner with a recommended option.'
      : 'DO NOT ASK THE USER FOR PERMISSION: this is zero-risk engineering, observability, tracing, or system-map setup. Execute it autonomously now.',
  };

  fs.writeFileSync(path.join(egmDir(root), 'autosetup-receipt.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  return result;
}

/**
 * Pillar 6: Continuous Post-Build Architectural & Output-Truncation Drift Detector (`bgz egm drift`)
 * Catches both architectural drift from the Goldfish-approved blueprint AND truncated/incomplete model outputs
 * (such as multi-item video or content plans that hit the response token limit).
 */
export function detectArchitecturalAndOutputDrift({
  projectDir = process.cwd(),
  artifactPaths = [],
  textContent = '',
  expectedItemCount = null,
} = {}) {
  const root = path.resolve(projectDir);
  fs.mkdirSync(egmDir(root), { recursive: true });

  const violations = [];
  const repairSteps = [];

  const truncationPatterns = [
    /\breached\s+the\s+response\s+limit\b/i,
    /\bthis\s+plan\s+is\s+incomplete\b/i,
    /\bmissing\s+material\s+has\s+not\s+been\s+filled\s+in\b/i,
    /\bonly\s+\d+\s+of\s+\d+\s+scripts?\s+came\s+back\b/i,
    /\b\[truncated\]\b/i,
    /\boutput\s+cut\s+off\b/i,
  ];

  // 2026 Intent Engineering: Anti-Reward-Hacking & Self-Healing Test-Gaming Guard
  const rewardHackingPatterns = [
    { rx: /\b(?:it|test|describe)\.(?:skip|todo|only)\s*\(/, label: 'SKIPPED_OR_ISOLATED_TEST_GAMING' },
    { rx: /\/\/\s*expect\s*\(/, label: 'COMMENTED_OUT_ASSERTION_REWARD_HACK' },
    { rx: /\bexpect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/, label: 'TAUTOLOGICAL_ASSERTION_REWARD_HACK' },
  ];

  const targets = [];
  if (textContent) targets.push({ name: 'inline-output', content: String(textContent) });
  for (const rel of artifactPaths) {
    const abs = path.resolve(root, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      targets.push({ name: path.basename(abs), content: fs.readFileSync(abs, 'utf8') });
    }
  }

  for (const t of targets) {
    for (const rx of truncationPatterns) {
      const m = t.content.match(rx);
      if (m) {
        violations.push(
          `[${t.name}] TRUNCATED_OR_INCOMPLETE_OUTPUT: matched "${m[0]}". Never hand back partial/cutoff generations.`
        );
        repairSteps.push(
          `[${t.name}] Split the generation into per-item calls (1 call per day/script) and auto-continue until 100% of items and shots are complete.`
        );
      }
    }

    for (const rh of rewardHackingPatterns) {
      const m = t.content.match(rh.rx);
      if (m) {
        violations.push(
          `[${t.name}] ${rh.label}: matched "${m[0]}". Never weaken, skip, or comment out tests/assertions to make a self-healing loop pass.`
        );
        repairSteps.push(
          `[${t.name}] Restore the full assertion/test and fix the underlying implementation so the locked spec passes genuinely.`
        );
      }
    }

    if (Number.isInteger(expectedItemCount) && expectedItemCount > 0) {
      const headings = t.content.match(/^##\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Day\s+\d+|Item\s+\d+|Script\s+\d+)/gim) || [];
      if (headings.length > 0 && headings.length < expectedItemCount) {
        violations.push(
          `[${t.name}] INCOMPLETE_BATCH_COUNT: found ${headings.length} completed items, but expected ${expectedItemCount}.`
        );
        repairSteps.push(
          `[${t.name}] Generate the remaining ${expectedItemCount - headings.length} items individually before marking complete.`
        );
      }
    }
  }

  const report = {
    schemaVersion: '1.0.0',
    checkedAtIso: new Date().toISOString(),
    passed: violations.length === 0,
    filesChecked: targets.length,
    violations,
    autoCorrectionDirective:
      violations.length === 0
        ? null
        : {
            action: 'AUTO_CONTINUE_TRUNCATED_ITEMS_AND_FIX_DRIFT',
            mandatoryRepairs: repairSteps,
          },
  };

  fs.writeFileSync(path.join(egmDir(root), 'latest-drift-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  return report;
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[k] = next;
        i += 1;
      } else {
        flags[k] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function printHelp() {
  console.log(`bgz egm — Elephant-Goldfish Model (EGM), Whole-System X-Ray, Co-Architect Mentor & Zero-Bottleneck Engine

Usage:
  bgz egm xray [--system "<name>"] [--prompt "<user prompt>"] [--files <f1,f2>] [--dir <path>]
      Stage 0 Whole-System Situational Awareness: audit all 6 system lifecycle stages and surface unasked broken links.

  bgz egm mentor --prompt "<user prompt>" [--domain software|research|legal] [--dir <path>]
      Anti-Sycophancy Co-Architect Mentor: block symptom-patching, inject unknown-unknown expert requirements, and teach the architecture principle in plain English.

  bgz egm goldfish (--spec <file.md> | --text "<spec>") [--dir <path>]
      Stateless Zero-Context 6-Lens Goldfish Pre-Code Critic: enforce "No Code Until All 6 Lenses Pass".

  bgz egm autosetup [--action "<proposed step>"] [--dir <path>]
      Zero-Bottleneck Self-Setup: auto-provision execution tracing & system maps without asking human permission.

  bgz egm drift [--files <f1,f2>] [--text "<output>"] [--expected-count <N>] [--dir <path>]
      Catch post-build architectural drift and truncated/incomplete model outputs (auto-continuation gate).
`);
}

export async function runCli(argv = process.argv.slice(2)) {
  const { flags, positional } = parseFlags(argv);
  const sub = positional[0] || 'help';
  const projectDir = flags.dir ? path.resolve(String(flags.dir)) : process.cwd();

  if (sub === 'help' || sub === '--help' || sub === '-h') {
    printHelp();
    return 0;
  }

  if (sub === 'xray') {
    const filesToScan = flags.files ? String(flags.files).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const res = runSystemXRay({
      projectDir,
      systemName: flags.system || path.basename(projectDir),
      userPrompt: flags.prompt || '',
      filesToScan,
    });
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  if (sub === 'mentor' || sub === 'expand') {
    const res = buildCoArchitectMentorPacket({
      projectDir,
      userPrompt: flags.prompt || '',
      domain: flags.domain || 'software',
    });
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  if (sub === 'goldfish') {
    const res = runGoldfishPreCodeReview({
      projectDir,
      specPath: flags.spec || null,
      specText: flags.text || '',
    });
    console.log(JSON.stringify(res, null, 2));
    return res.codeUnlocked ? 0 : 1;
  }

  if (sub === 'autosetup') {
    const res = runAutonomousSystemSetup({
      projectDir,
      proposedAction: flags.action || '',
    });
    console.log(JSON.stringify(res, null, 2));
    return 0;
  }

  if (sub === 'drift') {
    const artifactPaths = flags.files ? String(flags.files).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const expectedItemCount = flags['expected-count'] ? Number(flags['expected-count']) : null;
    const res = detectArchitecturalAndOutputDrift({
      projectDir,
      artifactPaths,
      textContent: flags.text || '',
      expectedItemCount,
    });
    console.log(JSON.stringify(res, null, 2));
    return res.passed ? 0 : 1;
  }

  console.error(`Unknown bgz egm subcommand: ${sub}`);
  printHelp();
  return 2;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runCli().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err?.message || err);
      process.exit(1);
    }
  );
}
