// Universal QA/QC & Inbox Non-Stop Enforcement Library (BGZFLOW 0.9.4)
// Enforces:
// 1. Unread bg-mail inbox catch & active peer-wait hold (so the user never has to type "check inbox" or "continue").
// 2. Universal locked checklist (.bgzflow/active-goal.json) across Software Factory, Research, Personal Assistant, Legal, Marketing.
// 3. Tamper-proof verifier-signed receipts (.bgzflow/verifications/<id>.json) — never trusting builder-edited status fields.
// 4. The 5 legitimate exit conditions (100% verified, registered background job, awaiting human authority for outward/paid action,
//    upfront interrogation / external blocker receipt, or owner redirect / read-only advisor role).
// 5. Bounded 2-strike rebuild/pivot breaker (Rule 22) + max continuation & time budget ceiling.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findProjectDir } from './project.mjs';

export const GOAL_REL_PATH = path.join('.bgzflow', 'active-goal.json');
export const LOOP_STATE_REL_PATH = path.join('.bgzflow', 'qa-loop-state.json');
export const VERIFICATIONS_REL_DIR = path.join('.bgzflow', 'verifications');
export const MAIL_ACK_REL_PATH = path.join('.bgzflow', 'mail-ack-state.json');

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export function resolveLocalSigningKey(env = process.env) {
  if (env.BGZFLOW_SIGNING_KEY && env.BGZFLOW_SIGNING_KEY.trim()) {
    return env.BGZFLOW_SIGNING_KEY.trim();
  }
  const home = env.BGZFLOW_HOME && env.BGZFLOW_HOME.trim() ? path.resolve(env.BGZFLOW_HOME) : path.join(os.homedir(), '.bgzflow');
  const keyFile = path.join(home, 'signing.key');
  try {
    if (fs.existsSync(keyFile)) {
      const k = fs.readFileSync(keyFile, 'utf8').trim();
      if (k.length >= 32) return k;
    }
    fs.mkdirSync(home, { recursive: true });
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyFile, `${generated}\n`, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return 'bgzflow-fallback-local-integrity-key';
  }
}

const hmac256 = (domainSalt, payload, env = process.env) =>
  crypto.createHmac('sha256', `${resolveLocalSigningKey(env)}:${domainSalt}`).update(String(payload)).digest('hex');

export function computeContractSignature(goalObj, secretSalt = 'bgzflow-0.9.5-contract-v1') {
  if (!goalObj || typeof goalObj !== 'object') return '';
  const canonical = JSON.stringify({
    goalId: goalObj.goalId || '',
    domain: goalObj.domain || 'universal',
    candidateSha: goalObj.candidateSha || null,
    authorRole: goalObj.authorRole || 'verifier',
    keepList: (goalObj.keepList || []).map((k) => ({
      id: k.id,
      behaviour: k.behaviour,
      sourceRef: k.sourceRef,
    })),
    forbidList: (goalObj.forbidList || []).map((f) => ({
      id: f.id,
      pattern: f.pattern,
      kind: f.kind || 'rendered_or_symbol',
      sourceRef: f.sourceRef,
    })),
    checklist: (goalObj.checklist || []).map((c) => ({
      id: c.id,
      requirement: c.requirement,
      sourceRef: c.sourceRef,
      requiresHumanAuthority: c.requiresHumanAuthority === true,
    })),
  });
  return hmac256(secretSalt, canonical);
}

export function computeReceiptSignature(receipt, secretSalt = 'bgzflow-0.9.5-receipt-v1') {
  if (!receipt || typeof receipt !== 'object') return '';
  const canonical = JSON.stringify({
    itemId: receipt.itemId || '',
    goalId: receipt.goalId || '',
    candidateSha: receipt.candidateSha || '',
    verifier: receipt.verifier || '',
    builder: receipt.builder || '',
    verificationLevel: receipt.verificationLevel || '',
    layer1DeterministicPass: receipt.layer1DeterministicPass === true,
    layer2AtomicJevPass: receipt.layer2AtomicJevPass === true,
    evidenceSha256: receipt.evidenceSha256 || '',
  });
  return hmac256(secretSalt, canonical);
}

export function computeEscalationSignature(decisionObj, secretSalt = 'bgzflow-0.9.5-escalation-v1') {
  if (!decisionObj || typeof decisionObj !== 'object') return '';
  const canonical = JSON.stringify({
    goalId: decisionObj.goalId || '',
    question: decisionObj.question || '',
    options: Array.isArray(decisionObj.options) ? decisionObj.options : [],
    jevEscalationScore: Number(decisionObj.jevEscalationScore) || 0,
  });
  return hmac256(secretSalt, canonical);
}

export function resolveMailDir(env = process.env) {
  return (
    env.BG_MAIL_DIR ||
    env.BGZFLOW_MAIL_ROOT ||
    path.join(env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'bgzflow', 'mail')
  );
}

export function resolveAgentRole(projectDir, input = {}, env = process.env) {
  if (env.BGZFLOW_AGENT_ROLE && env.BGZFLOW_AGENT_ROLE.trim()) {
    return env.BGZFLOW_AGENT_ROLE.trim();
  }
  if (input.agent_role && String(input.agent_role).trim()) {
    return String(input.agent_role).trim();
  }
  if (projectDir) {
    try {
      const roleFile = path.join(projectDir, '.bgzflow', 'agent-role.txt');
      if (fs.existsSync(roleFile)) {
        const r = fs.readFileSync(roleFile, 'utf8').trim();
        if (r) return r;
      }
    } catch {
      // ignore
    }
    try {
      const goalFile = path.join(projectDir, GOAL_REL_PATH);
      if (fs.existsSync(goalFile)) {
        const g = JSON.parse(fs.readFileSync(goalFile, 'utf8'));
        if (g.boundAgentRole) return String(g.boundAgentRole).trim();
      }
    } catch {
      // ignore
    }
  }
  return '';
}

export function resolveProjectName(projectDir, env = process.env) {
  if (env.BGZFLOW_MAIL_PROJECT && env.BGZFLOW_MAIL_PROJECT.trim()) return env.BGZFLOW_MAIL_PROJECT.trim();
  if (env.BG_PROJECT && env.BG_PROJECT.trim()) return env.BG_PROJECT.trim();
  if (projectDir) {
    try {
      const goalFile = path.join(projectDir, GOAL_REL_PATH);
      if (fs.existsSync(goalFile)) {
        const g = JSON.parse(fs.readFileSync(goalFile, 'utf8'));
        if (g.project) return String(g.project).trim();
      }
    } catch {
      // ignore
    }
    const base = path.basename(projectDir).toLowerCase();
    return base.replace(/[^a-z0-9._-]+/g, '-');
  }
  return '';
}

function readMailState(projectDir) {
  if (!projectDir) return { notifiedMidTurnIds: new Set(), stopBlockedIds: new Set() };
  try {
    const p = path.join(projectDir, MAIL_ACK_REL_PATH);
    if (!fs.existsSync(p)) return { notifiedMidTurnIds: new Set(), stopBlockedIds: new Set() };
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return {
      notifiedMidTurnIds: new Set(Array.isArray(data.notifiedMidTurnIds) ? data.notifiedMidTurnIds : []),
      stopBlockedIds: new Set(Array.isArray(data.deliveredIds) ? data.deliveredIds : []),
    };
  } catch {
    return { notifiedMidTurnIds: new Set(), stopBlockedIds: new Set() };
  }
}

function recordMailState(projectDir, { midTurnIds = [], stopIds = [] } = {}) {
  if (!projectDir || (!midTurnIds.length && !stopIds.length)) return;
  try {
    const p = path.join(projectDir, MAIL_ACK_REL_PATH);
    const state = readMailState(projectDir);
    for (const id of midTurnIds) state.notifiedMidTurnIds.add(id);
    for (const id of stopIds) state.stopBlockedIds.add(id);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          notifiedMidTurnIds: [...state.notifiedMidTurnIds].slice(-500),
          deliveredIds: [...state.stopBlockedIds].slice(-500),
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
  } catch {
    // non-fatal
  }
}

export function checkInboxAndPeerWait({
  projectDir,
  agentRole,
  projectName,
  markDelivered = false,
  markMidTurnNotified = false,
  onlyUnnotifiedMidTurn = false,
  env = process.env,
} = {}) {
  const mailRoot = resolveMailDir(env);
  const proj = projectName || resolveProjectName(projectDir, env);
  const role = agentRole || resolveAgentRole(projectDir, {}, env);
  if (!proj || !role) return { unread: [], urgent: [], waitingOutbound: [], coalescedDroppedCount: 0 };

  const boxDir = path.join(mailRoot, proj);
  if (!fs.existsSync(boxDir)) return { unread: [], urgent: [], waitingOutbound: [], coalescedDroppedCount: 0 };

  let files = [];
  try {
    files = fs.readdirSync(boxDir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return { unread: [], urgent: [], waitingOutbound: [], coalescedDroppedCount: 0 };
  }

  const mailState = readMailState(projectDir);
  const rawUnread = [];
  const waitingOutbound = [];
  const now = Date.now();

  for (const f of files.slice(-80)) {
    try {
      const msg = JSON.parse(fs.readFileSync(path.join(boxDir, f), 'utf8'));
      if (!msg || msg.state !== 'open') continue;

      const ageMinutes = (now - Date.parse(msg.createdAt || '')) / 60000;
      const maxWait = Number.isFinite(msg.waitMinutes) && msg.waitMinutes > 0 ? msg.waitMinutes : 15;
      // Ignore expired messages with a safe default or stale messages > 120 minutes old so old queue items never jam agents
      if (ageMinutes > maxWait && (msg.default !== null || ageMinutes > 120)) {
        continue;
      }

      const toMatch =
        msg.to &&
        (msg.to.toLowerCase() === role.toLowerCase() ||
          msg.to.toLowerCase() === 'all' ||
          msg.to.toLowerCase() === 'broadcast');
      if (toMatch && msg.from?.toLowerCase() !== role.toLowerCase()) {
        if (onlyUnnotifiedMidTurn && mailState.notifiedMidTurnIds.has(msg.id)) continue;
        if (!onlyUnnotifiedMidTurn && mailState.stopBlockedIds.has(msg.id)) continue;
        rawUnread.push(msg);
      }
      if (msg.from && msg.from.toLowerCase() === role.toLowerCase() && msg.state === 'open') {
        if (ageMinutes >= 0 && ageMinutes <= maxWait) {
          waitingOutbound.push(msg);
        }
      }
    } catch {
      // ignore malformed message file
    }
  }

  // Coalesce duplicate status/progress/topic messages from the same sender so only the latest per (from, topic/kind) is delivered
  const seenKeys = new Set();
  const unreadReversed = [];
  let coalescedDroppedCount = 0;
  for (const msg of [...rawUnread].reverse()) {
    const canCoalesce = Boolean(msg.topic || msg.kind === 'progress' || msg.kind === 'status' || msg.kind === 'info');
    const key = `${(msg.from || '').toLowerCase()}:${msg.topic || msg.kind || 'msg'}`;
    if (canCoalesce && seenKeys.has(key)) {
      coalescedDroppedCount++;
      continue;
    }
    if (canCoalesce) seenKeys.add(key);
    unreadReversed.push(msg);
  }
  const unread = unreadReversed.reverse();
  const urgent = unread.filter(
    (m) =>
      m.priority === 'urgent' ||
      m.kind === 'blocker' ||
      m.kind === 'correction' ||
      m.kind === 'stop',
  );

  if (projectDir && rawUnread.length) {
    recordMailState(projectDir, {
      midTurnIds: markMidTurnNotified ? rawUnread.map((m) => m.id) : [],
      stopIds: markDelivered ? rawUnread.map((m) => m.id) : [],
    });
  }

  return { unread, urgent, waitingOutbound, coalescedDroppedCount };
}

function loadLoopState(projectDir, goalId) {
  const file = path.join(projectDir, LOOP_STATE_REL_PATH);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data && data.goalId === goalId) return data;
  } catch {
    // ignore
  }
  return {
    goalId,
    startedAt: new Date().toISOString(),
    stopContinuations: 0,
    itemFailures: {},
  };
}

function saveLoopState(projectDir, state) {
  const file = path.join(projectDir, LOOP_STATE_REL_PATH);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n', 'utf8');
  } catch {
    // ignore
  }
}

export function verifySignedReceipt(projectDir, item, goal) {
  const verDir = path.join(projectDir, VERIFICATIONS_REL_DIR);
  const receiptPath = path.join(verDir, `${item.id}.json`);
  if (!fs.existsSync(receiptPath)) {
    return { ok: false, reason: `No verifier receipt in .bgzflow/verifications/${item.id}.json` };
  }
  try {
    const r = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    const expectedSig = computeReceiptSignature(r);
    if (!r.receiptSignature || r.receiptSignature !== expectedSig) {
      return { ok: false, reason: `Receipt signature invalid or tampered for ${item.id}.` };
    }
    if (r.goalId !== goal.goalId) {
      return { ok: false, reason: `Receipt goalId (${r.goalId}) does not match active goal (${goal.goalId}).` };
    }
    if (goal.candidateSha && r.candidateSha !== goal.candidateSha) {
      return {
        ok: false,
        reason: `Receipt candidateSha (${r.candidateSha}) is stale; frozen goal candidateSha is ${goal.candidateSha}.`,
      };
    }
    if (!r.verifier || (r.builder && r.verifier.toLowerCase() === r.builder.toLowerCase()) || r.role === 'builder' || r.role === 'executor') {
      return { ok: false, reason: `Item ${item.id} receipt was self-certified by builder (${r.verifier}); independent verifier required.` };
    }
    if (r.verificationLevel !== 'USED' || r.layer1DeterministicPass !== true || r.layer2AtomicJevPass !== true) {
      return {
        ok: false,
        reason: `Item ${item.id} is not fully verified (level=${r.verificationLevel}, layer1=${r.layer1DeterministicPass}, layer2Jev=${r.layer2AtomicJevPass}).`,
      };
    }
    if (!/^[a-f0-9]{64}$/i.test(r.evidenceSha256 || '') || /^0+$/.test(r.evidenceSha256 || '')) {
      return { ok: false, reason: `Item ${item.id} receipt is missing a valid 64-hex evidenceSha256.` };
    }
    return { ok: true, receipt: r };
  } catch (err) {
    return { ok: false, reason: `Unreadable receipt for ${item.id}: ${err.message}` };
  }
}

export function evaluateUniversalStop(input = {}, { env = process.env, projectDir: explicitProjectDir } = {}) {
  if (/^(off|0|false|no)$/i.test(String(env.BGZFLOW_UNIVERSAL_STOP || '').trim())) {
    return { decision: 'allow', reason: 'BGZFLOW_UNIVERSAL_STOP is off.' };
  }

  const projectDir = explicitProjectDir || findProjectDir(input, env) || input.cwd || process.cwd();
  const agentRole = resolveAgentRole(projectDir, input, env);
  const projectName = resolveProjectName(projectDir, env);

  // 1. Check unread bg-mail messages first (prevents agent going idle while another AI has already messaged it)
  const mailCheck = checkInboxAndPeerWait({
    projectDir,
    agentRole,
    projectName,
    markDelivered: true,
    env,
  });
  if (mailCheck.unread.length > 0) {
    const summary = mailCheck.unread
      .map((m) => `[id=${m.id} from=${m.from}]: ${String(m.body || '').slice(0, 320)}`)
      .join(' | ');
    return {
      decision: 'block',
      code: 'unread-bg-mail',
      reason: `BGZFLOW Inbox Gate: You have ${mailCheck.unread.length} unread bg-mail message(s) waiting in your inbox (${summary}). Process and ack/reply to your inbox before going idle so the user never has to type "check inbox".`,
    };
  }

  // 2. Check active goal contract (.bgzflow/active-goal.json)
  const goalPath = path.join(projectDir, GOAL_REL_PATH);
  if (!fs.existsSync(goalPath)) {
    // Even if there is no active-goal.json, if waitOnPeerOnStop is explicitly enabled and there is an open outbound mail, notify once
    if (mailCheck.waitingOutbound.length > 0 && /^(1|true|yes)$/i.test(String(env.BGZFLOW_HOLD_ON_PEER_MAIL || '').trim())) {
      const m = mailCheck.waitingOutbound[0];
      return {
        decision: 'block',
        code: 'waiting-on-peer-mail',
        reason: `BGZFLOW Peer-Wait Gate: You have an open bg-mail request (${m.id} to ${m.to}). Run "bg-mail.mjs wait --project ${projectName} --id ${m.id}" (or continue parallel work) instead of going idle.`,
      };
    }
    return { decision: 'allow' };
  }

  let goal;
  try {
    goal = JSON.parse(fs.readFileSync(goalPath, 'utf8'));
  } catch (err) {
    return {
      decision: 'block',
      code: 'corrupt-active-goal',
      reason: `BGZFLOW QA/QC Gate: .bgzflow/active-goal.json is unreadable (${err.message}). Repair or re-lock the goal contract before stopping.`,
    };
  }

  if (!goal || goal.active === false) {
    return { decision: 'allow' };
  }

  // Allowed Exit Condition 5: Owner redirected/stopped, or current agent is a non-bound advisor/reviewer role
  if (goal.ownerStopped === true || goal.status === 'stopped_by_owner') {
    return { decision: 'allow', exitKind: 'owner_stopped' };
  }
  if (
    agentRole &&
    goal.boundAgentRole &&
    agentRole.toLowerCase() !== goal.boundAgentRole.toLowerCase() &&
    /reviewer|advisor|observer/i.test(agentRole)
  ) {
    return { decision: 'allow', exitKind: 'non_bound_reviewer_role' };
  }

  // Allowed Exit Condition 4a: Upfront goal interrogation phase
  if (goal.phase === 'interrogate') {
    return { decision: 'allow', exitKind: 'upfront_interrogation' };
  }

  // Allowed Exit Condition 2: Waiting on a registered background job/session ID (prevents polling, obeys Rule 17)
  if (goal.waitingOnJobId && String(goal.waitingOnJobId).trim()) {
    return { decision: 'allow', exitKind: 'waiting_background_job', jobId: goal.waitingOnJobId };
  }

  // Allowed Exit Condition 4b: Recorded human decision (must pass Jev decision-escalation >= 0.65) or external blocker with receipt
  if (goal.pendingHumanDecision && goal.pendingHumanDecision.question) {
    const phd = goal.pendingHumanDecision;
    const expectedEscSig = computeEscalationSignature(phd);
    const score = Number(phd.jevEscalationScore) || 0;
    if (score >= 0.65 && phd.escalationSignature && phd.escalationSignature === expectedEscSig) {
      return {
        decision: 'allow',
        exitKind: 'pending_human_decision',
        jevEscalationScore: score,
        question: phd.question,
      };
    }
    return {
      decision: 'block',
      code: 'routine-decision-decide-autonomously',
      reason: `BGZFLOW Decision Gate: pendingHumanDecision ("${String(phd.question).slice(0, 140)}") has jevEscalationScore=${score} (requires >= 0.65 via "bgz goal check-decision"). Routine technical choices must be decided autonomously by the AI and logged in DECISIONS.md without interrupting the user.`,
    };
  }
  if (goal.externalBlockerReceipt && goal.externalBlockerReceipt.evidenceSha256) {
    return { decision: 'allow', exitKind: 'external_blocker_receipt' };
  }

  // Tamper check on active-goal.json contract signature
  const expectedSig = computeContractSignature(goal);
  if (!goal.contractSignature || goal.contractSignature !== expectedSig) {
    return {
      decision: 'block',
      code: 'goal-contract-tampered',
      reason:
        'BGZFLOW QA/QC Gate: .bgzflow/active-goal.json signature mismatch. The builder cannot edit or weaken keepList, forbidList, or checklist items; re-lock via "bgz goal lock".',
    };
  }

  // Filter out any findings/items whose sourceRef was explicitly superseded by a newer owner decision entry
  const withdrawnIds = new Set(
    Array.isArray(goal.withdrawnItems) ? goal.withdrawnItems.map((w) => w.id) : [],
  );

  const allItems = [
    ...(goal.keepList || []).map((k) => ({ ...k, kind: 'keep' })),
    ...(goal.forbidList || []).map((f) => ({ ...f, kind: 'forbid' })),
    ...(goal.checklist || []).map((c) => ({ ...c, kind: 'checklist' })),
  ].filter((item) => !withdrawnIds.has(item.id));

  const unverified = [];
  const awaitingAuthority = [];

  for (const item of allItems) {
    if (item.requiresHumanAuthority === true && item.authorityState === 'awaiting_authority') {
      awaitingAuthority.push(item);
      continue;
    }
    const check = verifySignedReceipt(projectDir, item, goal);
    if (!check.ok) {
      unverified.push({ id: item.id, kind: item.kind, reason: check.reason, sourceRef: item.sourceRef || '' });
    }
  }

  // Allowed Exit Condition 1 & 3: All controllable items verified (remaining items, if any, are outward actions awaiting human authority)
  if (unverified.length === 0) {
    if (mailCheck.waitingOutbound.length > 0 && goal.waitOnPeerBeforeStop === true) {
      const m = mailCheck.waitingOutbound[0];
      return {
        decision: 'block',
        code: 'waiting-on-peer-mail',
        reason: `BGZFLOW Peer-Wait Gate: All local items are verified, but you have an open peer request (${m.id} to ${m.to}). Run "bg-mail.mjs wait --project ${projectName} --id ${m.id}" so you do not go idle before ${m.to} replies.`,
      };
    }
    return {
      decision: 'allow',
      exitKind: awaitingAuthority.length ? 'awaiting_human_authority' : 'all_verified',
      verifiedCount: allItems.length - awaitingAuthority.length,
      awaitingAuthorityCount: awaitingAuthority.length,
    };
  }

  // Track continuation attempts & 2-strike causal boundary rule (Rule 22)
  const loopState = loadLoopState(projectDir, goal.goalId);
  loopState.stopContinuations = (loopState.stopContinuations || 0) + 1;
  const twoStrikeItems = [];
  for (const u of unverified) {
    loopState.itemFailures[u.id] = (loopState.itemFailures[u.id] || 0) + 1;
    if (loopState.itemFailures[u.id] >= 2) {
      twoStrikeItems.push(u.id);
    }
  }
  saveLoopState(projectDir, loopState);

  const maxContinuations = Number.isInteger(goal.maxContinuations) ? goal.maxContinuations : 6;
  const maxMinutes = Number.isFinite(goal.maxElapsedMinutes) ? goal.maxElapsedMinutes : 120;
  const elapsedMinutes = (Date.now() - Date.parse(loopState.startedAt || new Date().toISOString())) / 60000;

  if (loopState.stopContinuations > maxContinuations || elapsedMinutes > maxMinutes) {
    return {
      decision: 'allow',
      exitKind: 'budget_ceiling_escalation',
      warning: `BGZFLOW QA/QC Escalation: Reached continuation ceiling (${loopState.stopContinuations}/${maxContinuations}) with unverified items [${unverified.map((u) => u.id).join(', ')}]. Report exact failing IDs and one recommended decision to the owner.`,
    };
  }

  const failList = unverified
    .slice(0, 8)
    .map((u) => `${u.id} (${u.kind}${u.sourceRef ? ', ref: ' + u.sourceRef : ''}): ${u.reason}`)
    .join('; ');

  const pivotDirective =
    twoStrikeItems.length > 0
      ? ` RULE 22 2-STRIKE PIVOT REQUIRED on [${twoStrikeItems.join(', ')}]: These items failed twice on the same boundary — stop patching legacy code and rebuild the affected slice cleanly from scratch against the approved spec (or escalate to the cross-model reviewer).`
      : '';

  return {
    decision: 'block',
    code: twoStrikeItems.length > 0 ? 'qa-two-strike-rebuild-required' : 'qa-checklist-incomplete',
    unverifiedIds: unverified.map((u) => u.id),
    twoStrikeItems,
    stopContinuations: loopState.stopContinuations,
    reason: `BGZFLOW QA/QC Stop Gate (${unverified.length} of ${allItems.length} items unverified, continuation ${loopState.stopContinuations}/${maxContinuations}): [${failList}].${pivotDirective} Fix the failing items and run "bgz verify" to record verifier-signed USED receipts before stopping.`,
  };
}
