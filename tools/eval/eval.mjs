#!/usr/bin/env node
// BGZFLOW Universal 8-Domain Eval Engine (bgz eval)
// Enforces User-Standard Quality, Exhaustive Research/OSS Recall, Architecture & Build-vs-Buy,
// Claim/Citation/Precondition Lock (Zero Hallucinations), Math Cross-Footing, Chaos/Security/Perf,
// Visual/Copy Craft, and Closed-Loop Auto-Correction + Permanent User-Standard Learning.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { addContextGraphPrecedent } from '../engine/execution-graph.mjs';

export const UNIVERSAL_EVAL_DOMAINS = [
  {
    id: 'domain_1_codesign',
    name: 'Upfront Scout & Co-Designed User Eval Bar',
    cli: 'codesign',
    description: '30-second domain/file scout first, targeted branching-fact questions, and explicit pass/fail Task Eval Card before execution.',
  },
  {
    id: 'domain_2_research_oss',
    name: 'Exhaustive Research & Open-Source Discovery (4-Channel x 4-Angle Recall & Saturation)',
    cli: 'research',
    description: 'Verifies search across GitHub, X/Social Dev, HN/Reddit/Forums, and Package Registries/Papers across 4 query angles until saturation.',
  },
  {
    id: 'domain_3_architecture',
    name: 'Software Architecture, Build-vs-Buy & Structural Integrity',
    cli: 'architecture',
    description: 'Blocks reinventing commodity OSS primitives, god-files, boolean-soup state, duplicate truth stores, and non-idempotent mutations.',
  },
  {
    id: 'domain_4_claims_preconditions',
    name: 'Factual Grounding, Citation & Legal/Domain Precondition Lock (Zero Hallucinations)',
    cli: 'claims',
    description: 'Verifies every internal exhibit/fact against source files, checks statutory/technical preconditions against case facts, and enforces cross-pack agreement.',
  },
  {
    id: 'domain_5_math_data',
    name: 'Quantitative, Financial, Table & Data Cross-Footing',
    cli: 'math',
    description: 'Deterministically recalculates row/column sums, profit/cost/revenue totals, test count equations, and percentage/unit consistency.',
  },
  {
    id: 'domain_6_chaos_perf_security',
    name: 'Chaos, Interruption Recovery, Performance & Security Isolation',
    cli: 'chaos',
    description: 'Checks tab-close/network-drop/token-expiry recovery, startup/response latency budgets, secret safety, and user-A vs user-B isolation.',
  },
  {
    id: 'domain_7_craft_taste',
    name: 'Visual Craft, Copywriting, Media & Anti-Slop Taste Gate',
    cli: 'craft',
    description: 'Blocks AI clichés, leaked internal codenames on user screens, locked brand-token drift, and mobile/desktop viewport overlap.',
  },
  {
    id: 'domain_8_autocorrect_learn',
    name: 'Blinded Auto-Correction Gate & Permanent User-Standard Memory',
    cli: 'run',
    description: 'Mechanically blocks delivery on any failed eval, emits exact auto-correction directives, and turns user corrections into permanent eval rules.',
  },
];

export const REQUIRED_RESEARCH_CHANNELS = [
  'github',
  'social_dev',
  'community_forums',
  'registries_or_papers',
];

export const REQUIRED_QUERY_ANGLES = [
  'problem_symptom',
  'mechanism_architecture',
  'ecosystem_alternatives',
  'recent_breakout',
];

const AI_SLOP_PATTERNS = [
  /\bdelve(?:s|d|ing)?\b/i,
  /\btapestry\b/i,
  /\bunleash(?:ing|ed)?\b/i,
  /\belevate\s+your\b/i,
  /\bgame-changer\b/i,
  /\bnext-gen\s+synergy\b/i,
  /\brevolutionize\s+the\s+way\b/i,
  /\bin\s+conclusion,\s+it\s+is\s+important\s+to\s+remember\b/i,
  /\b\[citation\s+needed\]\b/i,
  /\bTODO:\s*insert\b/i,
];

function evalDir(projectDir = process.cwd()) {
  return path.join(path.resolve(projectDir), '.bgzflow', 'evals');
}

export function evalCardPath(projectDir = process.cwd()) {
  return path.join(evalDir(projectDir), 'eval-card.json');
}

export function userStandardsPath(projectDir = process.cwd()) {
  return path.join(evalDir(projectDir), 'user-standards.jsonl');
}

export function latestEvalReceiptPath(projectDir = process.cwd()) {
  return path.join(evalDir(projectDir), 'latest-eval-receipt.json');
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonlSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Domain 1: Upfront Scout + Co-Designed Task Eval Card
 */
export function compileTaskEvalCard({
  projectDir = process.cwd(),
  taskSummary = '',
  taskKind = 'general',
  scoutFindings = [],
  branchingQuestionsAsked = [],
  userAnswers = {},
  unresolvedBranchingUnknowns = [],
  customCriteria = [],
} = {}) {
  const root = path.resolve(projectDir);
  fs.mkdirSync(evalDir(root), { recursive: true });

  // Pull standing user standards from DECISIONS.md / FOUNDER.md (plus overlay founder-files.json) and permanent user-standards.jsonl
  const learnedStandards = readJsonlSafe(userStandardsPath(root));
  const decisionCandidateNames = [
    process.env.BGZFLOW_DECISIONS_FILE || 'DECISIONS.md',
    'FOUNDER.md',
  ];
  try {
    const home = process.env.BGZFLOW_HOME || path.join(process.env.HOME || process.env.USERPROFILE || '', '.bgzflow');
    const overlayCfg = path.join(home, 'overlay', 'founder-files.json');
    if (fs.existsSync(overlayCfg)) {
      const parsed = JSON.parse(fs.readFileSync(overlayCfg, 'utf8'));
      if (Array.isArray(parsed.files)) {
        for (const f of parsed.files) {
          if (typeof f === 'string' && f.trim() && !decisionCandidateNames.includes(f.trim())) {
            decisionCandidateNames.unshift(f.trim());
          }
        }
      }
    }
  } catch {}
  const standingSources = decisionCandidateNames.filter((name) => fs.existsSync(path.join(root, name)));

  const unresolved = Array.isArray(unresolvedBranchingUnknowns)
    ? unresolvedBranchingUnknowns.filter(Boolean)
    : [];

  const defaultDomainMap = {
    coding: ['domain_1_codesign', 'domain_3_architecture', 'domain_5_math_data', 'domain_6_chaos_perf_security', 'domain_7_craft_taste'],
    architecture: ['domain_1_codesign', 'domain_2_research_oss', 'domain_3_architecture', 'domain_6_chaos_perf_security'],
    research: ['domain_1_codesign', 'domain_2_research_oss', 'domain_4_claims_preconditions', 'domain_5_math_data', 'domain_7_craft_taste'],
    'oss-search': ['domain_1_codesign', 'domain_2_research_oss', 'domain_3_architecture'],
    report: ['domain_1_codesign', 'domain_4_claims_preconditions', 'domain_5_math_data', 'domain_7_craft_taste'],
    legal: ['domain_1_codesign', 'domain_2_research_oss', 'domain_4_claims_preconditions', 'domain_5_math_data', 'domain_7_craft_taste'],
    financial: ['domain_1_codesign', 'domain_4_claims_preconditions', 'domain_5_math_data', 'domain_7_craft_taste'],
    general: UNIVERSAL_EVAL_DOMAINS.map((d) => d.id),
  };

  const activeDomains = defaultDomainMap[taskKind] || defaultDomainMap.general;
  const criteria = [
    ...customCriteria.map((c, idx) =>
      typeof c === 'string'
        ? { id: `custom_${idx + 1}`, rule: c, required: true }
        : { id: c.id || `custom_${idx + 1}`, rule: c.rule || String(c), required: c.required !== false }
    ),
    ...learnedStandards.map((s) => ({
      id: s.id,
      rule: s.rule,
      domain: s.domain || 'user_standard',
      forbiddenPattern: s.forbiddenPattern || null,
      requiredPattern: s.requiredPattern || null,
      required: true,
    })),
  ];

  const readyToExecute = Boolean(taskSummary && taskSummary.trim()) && unresolved.length === 0 && scoutFindings.length > 0;

  const card = {
    schemaVersion: '1.0.0',
    cardId: `evalcard-${createHash('sha256').update(`${taskSummary}:${Date.now()}`).digest('hex').slice(0, 8)}`,
    createdAtIso: new Date().toISOString(),
    taskSummary: String(taskSummary || '').trim(),
    taskKind,
    standingSources,
    scoutFindings,
    branchingQuestionsAsked,
    userAnswers,
    unresolvedBranchingUnknowns: unresolved,
    activeDomains,
    criteria,
    readyToExecute,
    blockingReasons: [
      ...(!taskSummary || !taskSummary.trim() ? ['Missing taskSummary in Task Eval Card.'] : []),
      ...(scoutFindings.length === 0
        ? ['Pre-Flight Ground-Truth Scout has not recorded any findings yet (scout first before asking questions or executing).']
        : []),
      ...(unresolved.length > 0
        ? [`Unresolved branching questions must be answered by the user before execution: ${unresolved.join('; ')}`]
        : []),
    ],
  };

  fs.writeFileSync(evalCardPath(root), JSON.stringify(card, null, 2) + '\n', 'utf8');
  return card;
}

/**
 * Domain 2: Exhaustive Research & Open-Source Discovery Eval (4-Channel x 4-Angle Recall & Saturation)
 */
export function evaluateResearchAndOssDiscovery(packet = {}) {
  const violations = [];
  const repairSteps = [];

  const channelsSearched = Object.keys(packet.channels || {}).filter(
    (k) => Array.isArray(packet.channels[k]) && packet.channels[k].length > 0
  );
  const missingChannels = REQUIRED_RESEARCH_CHANNELS.filter((c) => !channelsSearched.includes(c));
  if (missingChannels.length > 0) {
    violations.push(
      `Missing required search channels (${missingChannels.join(', ')}). Searches must cover all 4 channels: ${REQUIRED_RESEARCH_CHANNELS.join(', ')}.`
    );
    repairSteps.push(
      `Run targeted queries across missing channels: ${missingChannels
        .map((c) => {
          if (c === 'github') return 'GitHub (topic/code search, trending, awesome-* lists)';
          if (c === 'social_dev') return 'X/Twitter & developer posts (where new breakout OSS repos appear first)';
          if (c === 'community_forums') return 'Hacker News (Algolia) & Reddit technical communities';
          return 'Package registries (npm/PyPI/crates.io) & arXiv/official docs';
        })
        .join('; ')}.`
    );
  }

  const anglesUsed = Object.keys(packet.queryAngles || {}).filter(
    (k) => Array.isArray(packet.queryAngles[k]) && packet.queryAngles[k].length > 0
  );
  const missingAngles = REQUIRED_QUERY_ANGLES.filter((a) => !anglesUsed.includes(a));
  if (missingAngles.length > 0) {
    violations.push(
      `Missing orthogonal query angles (${missingAngles.join(', ')}). Must expand queries across all 4 angles: ${REQUIRED_QUERY_ANGLES.join(', ')}.`
    );
    const topic = packet.topic || 'target capability';
    repairSteps.push(
      `Expand search queries for "${topic}" using missing angles: ${missingAngles
        .map((a) => {
          if (a === 'problem_symptom') return `problem/symptom terms ("${topic} latency/workflow/automation")`;
          if (a === 'mechanism_architecture') return `underlying technical mechanism ("${topic} statechart/DAG/CRDT/protocol")`;
          if (a === 'ecosystem_alternatives') return `ecosystem alternatives ("awesome-${topic}", "alternative to ...", "... vs ...")`;
          return `recent breakout repos ("${topic}" created/updated within last 180 days)`;
        })
        .join('; ')}.`
    );
  }

  const candidates = Array.isArray(packet.candidates) ? packet.candidates : [];
  if (candidates.length === 0) {
    violations.push('Zero candidates evaluated in research packet.');
    repairSteps.push('Record evaluated OSS/research candidates with URL, license, recency, and fit trade-offs.');
  } else {
    for (const c of candidates) {
      if (!c.name || !c.url) {
        violations.push(`Candidate "${c.name || 'unnamed'}" is missing a primary URL.`);
      }
      if (!c.license) {
        violations.push(`Candidate "${c.name || c.url}" is missing license verification (e.g. MIT, Apache-2.0).`);
      }
      if (!c.lastUpdated && !c.lastCommitDate) {
        violations.push(`Candidate "${c.name || c.url}" is missing maintenance recency (lastUpdated / lastCommitDate).`);
      }
      if (!c.fitSummary && !c.tradeoff) {
        violations.push(`Candidate "${c.name || c.url}" is missing fitSummary / tradeoff analysis.`);
      }
    }
  }

  if (packet.saturationReached !== true) {
    violations.push(
      'Search saturation not proven (saturationReached !== true). Agent stopped before verifying that additional query angles yield no higher-fit candidates.'
    );
    repairSteps.push(
      'Run at least one saturation expansion wave across unexplored synonyms/awesome-lists and set saturationReached: true once no higher-fit repo emerges.'
    );
  }

  return {
    domain: 'domain_2_research_oss',
    passed: violations.length === 0,
    channelsCovered: channelsSearched,
    anglesCovered: anglesUsed,
    candidateCount: candidates.length,
    violations,
    autoCorrectionDirective:
      violations.length === 0
        ? null
        : {
            action: 'EXPAND_SEARCH_AND_VERIFY_CANDIDATES',
            summary: 'Research / OSS search failed recall and saturation requirements.',
            mandatoryRepairs: repairSteps,
          },
  };
}

/**
 * Domain 3: Software Architecture, Build-vs-Buy & Structural Integrity Eval
 */
export function evaluateArchitectureAndCode({
  files = [],
  projectDir = process.cwd(),
  buildVsBuyJustification = null,
  maxFileLines = 800,
} = {}) {
  const root = path.resolve(projectDir);
  const violations = [];
  const repairSteps = [];

  const commodityReinventPatterns = [
    { name: 'custom hand-rolled state machine', regex: /\bswitch\s*\(\s*state\s*\)\s*\{[\s\S]{1200,}/i },
    { name: 'custom regex URL/HTML parser', regex: /new\s+RegExp\s*\(\s*['"`]<[a-z]+[\s\S]{80,}/i },
  ];

  for (const rel of files) {
    const abs = path.resolve(root, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    const content = fs.readFileSync(abs, 'utf8');
    const lines = content.split(/\r?\n/);

    if (lines.length > maxFileLines) {
      violations.push(
        `File "${rel}" has ${lines.length} lines (exceeds modular architecture cap of ${maxFileLines} lines).`
      );
      repairSteps.push(`Split "${rel}" into focused single-responsibility modules (<=${maxFileLines} lines).`);
    }

    // Check for boolean-soup state (>4 boolean useState/let isX flags in same component/module without explicit status union)
    const boolStateMatches = content.match(/\b(?:useState\s*<\s*boolean\s*>\s*\(|useState\s*\(\s*(?:true|false)\s*\)|let\s+is[A-Z][A-Za-z0-9_]*\s*=\s*(?:true|false))/g) || [];
    if (boolStateMatches.length >= 5 && !/\b(?:statechart|xstate|status\s*:\s*['"`])/i.test(content)) {
      violations.push(
        `File "${rel}" defines ${boolStateMatches.length} separate boolean state flags ("boolean soup") without an explicit state machine or status union.`
      );
      repairSteps.push(`Refactor boolean flags in "${rel}" into an explicit state union or statechart.`);
    }

    for (const pat of commodityReinventPatterns) {
      if (pat.regex.test(content) && !buildVsBuyJustification) {
        violations.push(
          `File "${rel}" appears to hand-roll a ${pat.name} without a buildVsBuyJustification proving why vetted MIT/Apache-2.0 OSS libraries were rejected.`
        );
        repairSteps.push(`Use a vetted MIT/Apache-2.0 library or record a buildVsBuyJustification for "${rel}".`);
      }
    }
  }

  return {
    domain: 'domain_3_architecture',
    passed: violations.length === 0,
    filesChecked: files.length,
    violations,
    autoCorrectionDirective:
      violations.length === 0
        ? null
        : {
            action: 'REFACTOR_ARCHITECTURE_AND_BUILD_VS_BUY',
            summary: 'Architecture / Build-vs-Buy check blocked structural issues.',
            mandatoryRepairs: repairSteps,
          },
  };
}

/**
 * Domain 4: Factual Grounding, Citation & Legal/Domain Precondition Lock (Zero Hallucinations)
 */
export function evaluateDocumentClaimsAndPreconditions({
  documentPaths = [],
  sourcePaths = [],
  caseFacts = {},
  customPreconditionRules = [],
} = {}) {
  const violations = [];
  const repairSteps = [];
  const verifiedExhibits = new Set();
  const unverifiedExhibits = [];

  // Load all primary source texts
  let combinedSourceText = '';
  for (const sp of sourcePaths) {
    if (fs.existsSync(sp) && fs.statSync(sp).isFile()) {
      combinedSourceText += '\n' + fs.readFileSync(sp, 'utf8');
    }
  }

  // Built-in Legal & Domain Precondition Rules + Custom Rules
  const preconditionRules = [
    {
      id: 'uk_crown_court_post_arraignment_sch3_dismissal_closed',
      when: (facts) => facts.arraigned === true || facts.pleaEntered === true,
      affirmativeClaimRegex: /\b(?:apply|application|move|invite\s+the\s+court|seek)\b[\s\S]{0,80}\bdismiss(?:al)?\b[\s\S]{0,80}\b(?:Schedule\s+3|Sch\.?\s*3)\b|\b(?:Schedule\s+3|Sch\.?\s*3)[\s\S]{0,120}\b(?:available|open\s+to\s+the\s+defence|should\s+be\s+made|apply\s+to\s+dismiss)\b/i,
      validNegationRegex: /\b(?:Schedule\s+3|Sch\.?\s*3)[\s\S]{0,160}\b(?:closed|no\s+longer\s+open|inapplicable|only\s+before\s+(?:the\s+defendant\s+is\s+)?arraigned|cannot\s+be\s+used)\b/i,
      violationMessage:
        'PRECONDITION_VIOLATION (Hallucinated Procedural Route): Document recommends or treats Schedule 3 paragraph 2 CDA 1998 dismissal as open, but caseFacts confirm the defendant has already been arraigned (Sch 3 para 2 is legally closed once arraigned).',
      correctionDirective:
        'Remove any recommendation to apply for Schedule 3 paragraph 2 dismissal; state explicitly that Schedule 3 dismissal is closed post-arraignment and replace with a continuing Full Code Test review under para 3.6 of the Code for Crown Prosecutors inviting the Crown to offer no evidence under s.17 Criminal Justice Act 1967.',
    },
    {
      id: 'uk_crown_court_post_preferment_s23a_discontinuance_closed',
      when: (facts) => facts.indictmentPreferred === true || facts.arraigned === true,
      affirmativeClaimRegex: /\b(?:discontinue|discontinuance)\b[\s\S]{0,80}\b(?:section|s\.?)\s*23A\b|\b(?:section|s\.?)\s*23A\s+(?:of\s+the\s+)?Prosecution\s+of\s+Offences\s+Act\s+1985[\s\S]{0,120}\b(?:invite\s+the\s+CPS\s+to\s+discontinue|request\s+discontinuance|applicable\s+here)\b/i,
      validNegationRegex: /\b(?:section|s\.?)\s*23A[\s\S]{0,180}\b(?:closed|inapplicable|no\s+longer\s+open|only\s+before\s+(?:the\s+)?indictment\s+is\s+preferred|cannot\s+discontinue\s+under)\b/i,
      violationMessage:
        'PRECONDITION_VIOLATION (Hallucinated Statutory Power): Document invites or relies on s.23A Prosecution of Offences Act 1985 discontinuance after the indictment has been preferred (s.23A is legally closed once the indictment is preferred).',
      correctionDirective:
        'Mark s.23A Prosecution of Offences Act 1985 as closed post-indictment preferment and frame the termination request as a Full Code Test review (Code for Crown Prosecutors para 3.6) inviting the Crown to offer no evidence under s.17 Criminal Justice Act 1967.',
    },
    ...customPreconditionRules,
  ];

  const activeDocs = [];
  for (const dp of documentPaths) {
    if (!fs.existsSync(dp) || !fs.statSync(dp).isFile()) continue;
    const text = fs.readFileSync(dp, 'utf8');
    const firstLine = (text.split(/\r?\n/)[0] || '').trim();
    const isSuperseded = /^SUPERSEDED\b/i.test(firstLine);
    activeDocs.push({ path: dp, name: path.basename(dp), text, isSuperseded });

    if (isSuperseded) continue;

    // 1. Check domain/statutory preconditions against caseFacts
    for (const rule of preconditionRules) {
      if (typeof rule.when === 'function' && rule.when(caseFacts)) {
        const hasAffirmative = rule.affirmativeClaimRegex && rule.affirmativeClaimRegex.test(text);
        const hasValidNegation = rule.validNegationRegex && rule.validNegationRegex.test(text);
        if (hasAffirmative && !hasValidNegation) {
          violations.push(`[${path.basename(dp)}] ${rule.violationMessage}`);
          repairSteps.push(`[${path.basename(dp)}] ${rule.correctionDirective}`);
        }
      }
    }

    // 2. Check internal exhibit / bundle references against primary source text (if sources provided)
    if (combinedSourceText.length > 0) {
      const exhibitMatches = text.match(/\b(?:[A-Z]{2,4}\/\d+[A-Z]?|[A-Z]{3,4}\d{8}|[A-Z]{2}\d{2}\s*\d{6}|\d{2}\/[A-Z]{2}\/\d+\/\d+)\b/g) || [];
      for (const ex of new Set(exhibitMatches)) {
        const normalized = ex.replace(/\s+/g, ' ').trim();
        const withoutTrailingSubExhibit = normalized.replace(/([0-9])[A-Z]$/, '$1');
        if (
          combinedSourceText.includes(normalized) ||
          combinedSourceText.includes(normalized.replace(/\s+/g, '')) ||
          combinedSourceText.includes(withoutTrailingSubExhibit)
        ) {
          verifiedExhibits.add(normalized);
        } else {
          unverifiedExhibits.push({ file: path.basename(dp), exhibit: normalized });
          violations.push(
            `[${path.basename(dp)}] UNGROUNDED_EXHIBIT_OR_FACT: "${normalized}" does not appear in any provided primary source file.`
          );
          repairSteps.push(
            `[${path.basename(dp)}] Verify "${normalized}" against the primary source files or remove the ungrounded reference.`
          );
        }
      }
    }

    // 3. Check for placeholder citations or unverified markers
    if (/\b(?:citation\s+needed|insert\s+case\s+name|\[?\?\?\?\]|TBD\s+statute)\b/i.test(text)) {
      violations.push(`[${path.basename(dp)}] Contains unresolved citation placeholder.`);
      repairSteps.push(`[${path.basename(dp)}] Replace all citation placeholders with verified primary authorities.`);
    }
  }

  // 4. Cross-Document Pack Consistency Check
  // If one non-superseded doc says Schedule 3 / s.23A is closed and another non-superseded doc recommends it without negation
  const nonSuperseded = activeDocs.filter((d) => !d.isSuperseded);
  const docsSayingClosed = nonSuperseded.filter((d) =>
    /\b(?:Schedule\s+3|s\.?\s*23A)[\s\S]{0,160}\b(?:closed|inapplicable|no\s+longer\s+open)\b/i.test(d.text)
  );
  const docsSayingOpen = nonSuperseded.filter(
    (d) =>
      /\b(?:Schedule\s+3|s\.?\s*23A)\b/i.test(d.text) &&
      !/\b(?:Schedule\s+3|s\.?\s*23A)[\s\S]{0,180}\b(?:closed|inapplicable|no\s+longer\s+open|only\s+before)\b/i.test(
        d.text
      )
  );
  if (docsSayingClosed.length > 0 && docsSayingOpen.length > 0) {
    violations.push(
      `CROSS_DOCUMENT_CONTRADICTION: (${docsSayingClosed.map((d) => d.name).join(', ')}) state Schedule 3 / s.23A is closed, while non-superseded (${docsSayingOpen.map((d) => d.name).join(', ')}) reference it without marking it closed or marking the file SUPERSEDED.`
    );
    repairSteps.push(
      `Reconcile (${docsSayingOpen.map((d) => d.name).join(', ')}) with the canonical procedural position or mark outdated drafts with "SUPERSEDED" on line 1.`
    );
  }

  return {
    domain: 'domain_4_claims_preconditions',
    passed: violations.length === 0,
    documentsChecked: activeDocs.length,
    verifiedExhibitsCount: verifiedExhibits.size,
    unverifiedExhibits,
    violations,
    autoCorrectionDirective:
      violations.length === 0
        ? null
        : {
            action: 'BLOCK_AND_CORRECT_HALLUCINATED_OR_INAPPLICABLE_CLAIMS',
            summary: 'Document Claim & Precondition Lock blocked ungrounded facts or invalid statutory/domain preconditions.',
            mandatoryRepairs: repairSteps,
          },
  };
}

/**
 * Domain 5: Quantitative, Financial, Table & Data Cross-Footing Eval
 */
export function evaluateMathAndDataTables({ text = '', tables = [] } = {}) {
  const violations = [];
  const repairSteps = [];

  // 1. Check explicit numeric objects passed in `tables`
  // e.g. { name: 'Financial Summary', rows: [{ revenue: 1200, cost: 700, profit: 500 }], totals: { revenue: 3600, cost: 2100, profit: 1500 } }
  for (const tbl of tables) {
    const label = tbl.name || 'Table';
    if (Array.isArray(tbl.rows) && tbl.rows.length > 0) {
      for (let i = 0; i < tbl.rows.length; i++) {
        const r = tbl.rows[i];
        if (typeof r.revenue === 'number' && typeof r.cost === 'number' && typeof r.profit === 'number') {
          const expectedProfit = Number((r.revenue - r.cost).toFixed(6));
          if (Math.abs(expectedProfit - r.profit) > 1e-4) {
            violations.push(
              `[${label} row ${i + 1}] Math mismatch: revenue (${r.revenue}) - cost (${r.cost}) = ${expectedProfit}, but profit is stated as ${r.profit}.`
            );
            repairSteps.push(`Correct profit in [${label} row ${i + 1}] to ${expectedProfit}.`);
          }
        }
        if (typeof r.passed === 'number' && typeof r.failed === 'number' && typeof r.total === 'number') {
          const skipped = typeof r.skipped === 'number' ? r.skipped : 0;
          const expectedTotal = r.passed + r.failed + skipped;
          if (expectedTotal !== r.total) {
            violations.push(
              `[${label} row ${i + 1}] Count mismatch: passed (${r.passed}) + failed (${r.failed}) + skipped (${skipped}) = ${expectedTotal}, but total is stated as ${r.total}.`
            );
            repairSteps.push(`Correct total count in [${label} row ${i + 1}] to ${expectedTotal}.`);
          }
        }
      }
      if (tbl.totals && typeof tbl.totals === 'object') {
        for (const [col, statedTotal] of Object.entries(tbl.totals)) {
          if (typeof statedTotal !== 'number') continue;
          const sum = Number(
            tbl.rows.reduce((acc, r) => acc + (typeof r[col] === 'number' ? r[col] : 0), 0).toFixed(6)
          );
          if (Math.abs(sum - statedTotal) > 1e-4) {
            violations.push(
              `[${label}] Column "${col}" cross-footing mismatch: sum of rows is ${sum}, but stated total is ${statedTotal}.`
            );
            repairSteps.push(`Update stated total for "${col}" in [${label}] from ${statedTotal} to ${sum}.`);
          }
        }
      }
    }
  }

  // 2. Check inline unit-currency multiplications in prose (e.g. "120 £20 notes ... £2,400")
  const noteMatches = [...String(text || '').matchAll(/(\d+)\s+£(\d+)\s+notes[\s\S]{0,80}?£([\d,]+)/gi)];
  for (const m of noteMatches) {
    const count = Number(m[1]);
    const denom = Number(m[2]);
    const stated = Number(m[3].replace(/,/g, ''));
    if (count > 0 && denom > 0 && stated > 0 && count * denom !== stated) {
      // Check if there is an additive breakdown like "119 £20 notes ... and 1 £20 note ... £2,400"
      const hasAdditiveBreakdown = /(\d+)\s+£\d+\s+notes[\s\S]{0,40}and\s+(\d+)\s+£\d+\s+note/i.test(m[0]);
      if (!hasAdditiveBreakdown) {
        violations.push(
          `Inline math mismatch: ${count} x £${denom} = £${count * denom}, but text states £${stated}.`
        );
        repairSteps.push(`Recalculate and fix inline currency multiplication (${count} x £${denom} = £${count * denom}).`);
      }
    }
  }

  return {
    domain: 'domain_5_math_data',
    passed: violations.length === 0,
    violations,
    autoCorrectionDirective:
      violations.length === 0
        ? null
        : {
            action: 'RECALCULATE_AND_FIX_MATH_DISCREPANCIES',
            summary: 'Quantitative / Table cross-footing eval caught arithmetic mismatches.',
            mandatoryRepairs: repairSteps,
          },
  };
}

/**
 * Domain 6: Chaos, Interruption Recovery, Performance & Security Isolation Eval
 */
export function evaluateChaosPerfAndSecurity(receipt = {}) {
  const violations = [];
  const repairSteps = [];

  if (receipt.requiresRuntimeProof !== false) {
    if (!receipt.interruptionRecoveryTested) {
      violations.push('Missing interruption/failure-injection proof (tab close, network drop, expired auth, or duplicate submit).');
      repairSteps.push('Run at least one interruption/failure-injection probe on the real surface and record interruptionRecoveryTested: true.');
    }
    if (!receipt.performanceWithinBudget) {
      violations.push('Missing performance budget verification (startup/response latency and memory/disk bounds).');
      repairSteps.push('Measure startup/response latency on the target surface and set performanceWithinBudget: true.');
    }
    if (!receipt.securityAndIsolationVerified) {
      violations.push('Missing security and per-user data isolation verification.');
      repairSteps.push('Run bgz scan and verify user/account data isolation before marking securityAndIsolationVerified: true.');
    }
  }

  return {
    domain: 'domain_6_chaos_perf_security',
    passed: violations.length === 0,
    violations,
    autoCorrectionDirective:
      violations.length === 0
        ? null
        : {
            action: 'RUN_CHAOS_PERF_AND_SECURITY_PROBES',
            summary: 'Runtime chaos, performance, or security isolation proof is incomplete.',
            mandatoryRepairs: repairSteps,
          },
  };
}

/**
 * Domain 7: Visual Craft, Copywriting, Media & Anti-Slop Taste Gate
 */
export function evaluateCraftAndAntiSlop({
  texts = [],
  customerFacingTexts = [],
  forbiddenCustomerTerms = [],
  viewportProofs = {},
  requireViewportProofs = false,
} = {}) {
  const violations = [];
  const repairSteps = [];

  for (const item of texts) {
    const label = typeof item === 'object' ? item.name || 'text' : 'text';
    const content = typeof item === 'object' ? item.content || '' : String(item || '');
    for (const rx of AI_SLOP_PATTERNS) {
      const m = content.match(rx);
      if (m) {
        violations.push(`[${label}] Contains banned AI-slop phrase or placeholder: "${m[0]}".`);
        repairSteps.push(`[${label}] Rewrite "${m[0]}" in direct, natural plain English.`);
      }
    }
  }

  const defaultForbiddenCustomerTerms = ['SUBSCRIPTION_ACCOUNTS_PATH', 'providerId:', 'TODO_PLACEHOLDER', ...forbiddenCustomerTerms];
  for (const item of customerFacingTexts) {
    const label = typeof item === 'object' ? item.name || 'ui-surface' : 'ui-surface';
    const content = typeof item === 'object' ? item.content || '' : String(item || '');
    for (const term of defaultForbiddenCustomerTerms) {
      if (term && content.includes(term)) {
        violations.push(`[${label}] Customer-facing surface leaks internal technical term: "${term}".`);
        repairSteps.push(`[${label}] Replace internal token "${term}" with plain user-facing wording.`);
      }
    }
  }

  if (requireViewportProofs) {
    if (!viewportProofs.mobile390x844) {
      violations.push('Missing mobile viewport (390x844) layout/overlap verification proof.');
      repairSteps.push('Verify layout at 390x844 mobile viewport with zero overlapping drawers/popovers.');
    }
    if (!viewportProofs.desktop1280x720) {
      violations.push('Missing desktop viewport (1280x720) layout verification proof.');
      repairSteps.push('Verify layout at 1280x720 desktop viewport.');
    }
  }

  return {
    domain: 'domain_7_craft_taste',
    passed: violations.length === 0,
    violations,
    autoCorrectionDirective:
      violations.length === 0
        ? null
        : {
            action: 'FIX_CRAFT_SLOP_OR_VIEWPORT_ISSUES',
            summary: 'Craft & Anti-Slop gate caught AI clichés, leaked internal terms, or missing viewport proof.',
            mandatoryRepairs: repairSteps,
          },
  };
}

/**
 * Domain 8 (Part A): Record a Permanent User-Standard Rule from User Feedback (`bgz eval learn`)
 */
export function recordUserStandardEvalRule({
  projectDir = process.cwd(),
  domain = 'user_standard',
  rule = '',
  forbiddenPattern = null,
  requiredPattern = null,
  sourceFeedback = '',
} = {}) {
  if (!rule || !String(rule).trim()) {
    throw new Error('recordUserStandardEvalRule requires a non-empty rule description.');
  }
  const root = path.resolve(projectDir);
  fs.mkdirSync(evalDir(root), { recursive: true });
  const entry = {
    id: `ustd-${createHash('sha256').update(`${rule}:${Date.now()}`).digest('hex').slice(0, 8)}`,
    createdAtIso: new Date().toISOString(),
    domain,
    rule: String(rule).trim(),
    forbiddenPattern: forbiddenPattern ? String(forbiddenPattern) : null,
    requiredPattern: requiredPattern ? String(requiredPattern) : null,
    sourceFeedback: String(sourceFeedback || '').trim(),
  };
  fs.appendFileSync(userStandardsPath(root), JSON.stringify(entry) + '\n', 'utf8');

  // Also record into the Context Graph so every future slice sees this precedent automatically
  try {
    addContextGraphPrecedent(root, {
      topic: `User Quality Standard (${domain})`,
      goalSummary: entry.rule,
      optionsEvaluated: [entry.rule],
      chosenOption: entry.rule,
      verifiedPracticeOrFix: entry.forbiddenPattern
        ? `Never allow pattern /${entry.forbiddenPattern}/i; enforce: ${entry.rule}`
        : entry.rule,
      evidenceReceiptPath: '.bgzflow/evals/user-standards.jsonl',
    });
  } catch {
    // Non-fatal if graph dir is read-only
  }

  return entry;
}

/**
 * Domain 8 (Part B): Run Universal Multi-Domain Eval Suite (`bgz eval run`)
 */
export function runUniversalEvalSuite({
  projectDir = process.cwd(),
  taskKind = 'general',
  researchPacket = null,
  architectureInput = null,
  claimsInput = null,
  mathInput = null,
  chaosInput = null,
  craftInput = null,
  targetTexts = [],
} = {}) {
  const root = path.resolve(projectDir);
  fs.mkdirSync(evalDir(root), { recursive: true });

  const results = [];
  const allViolations = [];
  const allCorrectionDirectives = [];

  if (researchPacket) {
    const r = evaluateResearchAndOssDiscovery(researchPacket);
    results.push(r);
    allViolations.push(...r.violations);
    if (r.autoCorrectionDirective) allCorrectionDirectives.push(r.autoCorrectionDirective);
  }

  if (architectureInput) {
    const r = evaluateArchitectureAndCode({ ...architectureInput, projectDir: root });
    results.push(r);
    allViolations.push(...r.violations);
    if (r.autoCorrectionDirective) allCorrectionDirectives.push(r.autoCorrectionDirective);
  }

  if (claimsInput) {
    const r = evaluateDocumentClaimsAndPreconditions(claimsInput);
    results.push(r);
    allViolations.push(...r.violations);
    if (r.autoCorrectionDirective) allCorrectionDirectives.push(r.autoCorrectionDirective);
  }

  if (mathInput) {
    const r = evaluateMathAndDataTables(mathInput);
    results.push(r);
    allViolations.push(...r.violations);
    if (r.autoCorrectionDirective) allCorrectionDirectives.push(r.autoCorrectionDirective);
  }

  if (chaosInput) {
    const r = evaluateChaosPerfAndSecurity(chaosInput);
    results.push(r);
    allViolations.push(...r.violations);
    if (r.autoCorrectionDirective) allCorrectionDirectives.push(r.autoCorrectionDirective);
  }

  if (craftInput) {
    const r = evaluateCraftAndAntiSlop(craftInput);
    results.push(r);
    allViolations.push(...r.violations);
    if (r.autoCorrectionDirective) allCorrectionDirectives.push(r.autoCorrectionDirective);
  }

  // Evaluate against permanent learned User Standards in `.bgzflow/evals/user-standards.jsonl`
  const learnedStandards = readJsonlSafe(userStandardsPath(root));
  const combinedTargetText = targetTexts
    .map((t) => (typeof t === 'object' ? t.content || '' : String(t || '')))
    .join('\n');

  const userStandardViolations = [];
  for (const std of learnedStandards) {
    if (std.forbiddenPattern && combinedTargetText) {
      const rx = new RegExp(std.forbiddenPattern, 'i');
      if (rx.test(combinedTargetText)) {
        const msg = `Violated learned User Standard [${std.id}]: "${std.rule}" (matched forbidden pattern /${std.forbiddenPattern}/i).`;
        userStandardViolations.push(msg);
        allViolations.push(msg);
      }
    }
    if (std.requiredPattern && combinedTargetText) {
      const rx = new RegExp(std.requiredPattern, 'i');
      if (!rx.test(combinedTargetText)) {
        const msg = `Violated learned User Standard [${std.id}]: "${std.rule}" (missing required pattern /${std.requiredPattern}/i).`;
        userStandardViolations.push(msg);
        allViolations.push(msg);
      }
    }
  }

  if (userStandardViolations.length > 0) {
    allCorrectionDirectives.push({
      action: 'FIX_LEARNED_USER_STANDARD_VIOLATIONS',
      summary: 'Output violated one or more permanent User Standards recorded from past feedback.',
      mandatoryRepairs: userStandardViolations,
    });
  }

  const passed = allViolations.length === 0;
  const receipt = {
    schemaVersion: '1.0.0',
    evalReceiptId: `evalrcpt-${createHash('sha256').update(`${root}:${Date.now()}:${allViolations.length}`).digest('hex').slice(0, 10)}`,
    evaluatedAtIso: new Date().toISOString(),
    projectDir: root,
    taskKind,
    passed,
    deliveryBlocked: !passed,
    totalViolations: allViolations.length,
    domainResults: results,
    learnedStandardsChecked: learnedStandards.length,
    violations: allViolations,
    autoCorrectionDirectives: allCorrectionDirectives,
  };

  fs.writeFileSync(latestEvalReceiptPath(root), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  return receipt;
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function printHelp() {
  console.log(`bgz eval — Universal 8-Domain Quality, Research, Architecture & Zero-Hallucination Eval Engine

Usage:
  bgz eval domains
      List all 8 Universal Eval Domains enforced by BGZFLOW.

  bgz eval codesign --task "<summary>" [--kind <kind>] [--scout "<finding1;finding2>"] [--questions "<q1;q2>"] [--unresolved "<u1>"] [--dir <path>]
      Compile a Task Eval Card after running the 30-second Pre-Flight Ground-Truth Scout and targeted user questions.

  bgz eval research --packet <packet.json> [--dir <path>]
      Run the 4-Channel x 4-Angle Research & Open-Source Discovery Recall and Saturation Eval.

  bgz eval claims --docs <file1,file2> [--sources <src1,src2>] [--facts <json-or-file>] [--dir <path>]
      Run the Factual Grounding, Citation & Legal/Domain Precondition Lock on documents/reports.

  bgz eval math [--file <json-or-md>] [--dir <path>]
      Run the Quantitative, Financial & Table Cross-Footing Eval.

  bgz eval learn --rule "<user standard>" [--domain <domain>] [--forbid "<regex>"] [--require "<regex>"] [--dir <path>]
      Turn a user correction or preference into a permanent executable eval rule and Context Graph precedent.

  bgz eval status [--dir <path>]
      Show the current Task Eval Card, learned user standards count, and latest eval receipt.
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

  if (sub === 'domains') {
    if (flags.json) {
      console.log(JSON.stringify(UNIVERSAL_EVAL_DOMAINS, null, 2));
    } else {
      for (const d of UNIVERSAL_EVAL_DOMAINS) {
        console.log(`${d.id} (${d.cli}): ${d.name}\n  ${d.description}\n`);
      }
    }
    return 0;
  }

  if (sub === 'codesign') {
    const scoutFindings = flags.scout
      ? String(flags.scout).split(';').map((s) => s.trim()).filter(Boolean)
      : [];
    const branchingQuestionsAsked = flags.questions
      ? String(flags.questions).split(';').map((s) => s.trim()).filter(Boolean)
      : [];
    const unresolvedBranchingUnknowns = flags.unresolved
      ? String(flags.unresolved).split(';').map((s) => s.trim()).filter(Boolean)
      : [];
    const card = compileTaskEvalCard({
      projectDir,
      taskSummary: flags.task || flags.goal || '',
      taskKind: flags.kind || 'general',
      scoutFindings,
      branchingQuestionsAsked,
      unresolvedBranchingUnknowns,
    });
    console.log(JSON.stringify(card, null, 2));
    return card.readyToExecute ? 0 : 1;
  }

  if (sub === 'research') {
    if (!flags.packet) {
      console.error('bgz eval research requires --packet <packet.json>');
      return 2;
    }
    const packetPath = path.resolve(projectDir, String(flags.packet));
    const packet = readJsonSafe(packetPath, {});
    const res = evaluateResearchAndOssDiscovery(packet);
    console.log(JSON.stringify(res, null, 2));
    return res.passed ? 0 : 1;
  }

  if (sub === 'claims') {
    const docs = flags.docs
      ? String(flags.docs).split(',').map((s) => path.resolve(projectDir, s.trim())).filter(Boolean)
      : [];
    const sources = flags.sources
      ? String(flags.sources).split(',').map((s) => path.resolve(projectDir, s.trim())).filter(Boolean)
      : [];
    let caseFacts = {};
    if (flags.facts) {
      const fStr = String(flags.facts).trim();
      if (fStr.startsWith('{')) {
        try {
          caseFacts = JSON.parse(fStr);
        } catch {
          // Handle PowerShell quote-stripped JSON like {arraigned:true,pleaEntered:true}
          const repaired = fStr.replace(/([{,])\s*([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
          caseFacts = JSON.parse(repaired);
        }
      } else if (fStr.includes('=')) {
        for (const pair of fStr.split(',')) {
          const [k, v] = pair.split('=').map((s) => s.trim());
          if (k) caseFacts[k] = v === 'true' ? true : v === 'false' ? false : v;
        }
      } else {
        caseFacts = readJsonSafe(path.resolve(projectDir, fStr), {});
      }
    }
    const res = evaluateDocumentClaimsAndPreconditions({
      documentPaths: docs,
      sourcePaths: sources,
      caseFacts,
    });
    console.log(JSON.stringify(res, null, 2));
    return res.passed ? 0 : 1;
  }

  if (sub === 'math') {
    let input = {};
    if (flags.file) {
      const fp = path.resolve(projectDir, String(flags.file));
      if (fp.endsWith('.json')) {
        input = readJsonSafe(fp, {});
      } else if (fs.existsSync(fp)) {
        input = { text: fs.readFileSync(fp, 'utf8') };
      }
    }
    const res = evaluateMathAndDataTables(input);
    console.log(JSON.stringify(res, null, 2));
    return res.passed ? 0 : 1;
  }

  if (sub === 'learn') {
    if (!flags.rule) {
      console.error('bgz eval learn requires --rule "<user standard>"');
      return 2;
    }
    const entry = recordUserStandardEvalRule({
      projectDir,
      domain: flags.domain || 'user_standard',
      rule: String(flags.rule),
      forbiddenPattern: flags.forbid || null,
      requiredPattern: flags.require || null,
      sourceFeedback: flags.feedback || '',
    });
    console.log(JSON.stringify(entry, null, 2));
    return 0;
  }

  if (sub === 'status') {
    const card = readJsonSafe(evalCardPath(projectDir), null);
    const standards = readJsonlSafe(userStandardsPath(projectDir));
    const latestReceipt = readJsonSafe(latestEvalReceiptPath(projectDir), null);
    console.log(
      JSON.stringify(
        {
          projectDir,
          hasTaskEvalCard: Boolean(card),
          readyToExecute: card ? card.readyToExecute : false,
          learnedUserStandardsCount: standards.length,
          latestEvalReceipt: latestReceipt
            ? {
                evalReceiptId: latestReceipt.evalReceiptId,
                evaluatedAtIso: latestReceipt.evaluatedAtIso,
                passed: latestReceipt.passed,
                totalViolations: latestReceipt.totalViolations,
              }
            : null,
        },
        null,
        2
      )
    );
    return 0;
  }

  console.error(`Unknown bgz eval subcommand: ${sub}`);
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
