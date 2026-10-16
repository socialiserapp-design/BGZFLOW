import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  computeContractSignature,
  computeReceiptSignature,
  evaluateUniversalStop,
} from '../lib/universal-stop.mjs';
import { verifyUniversalChecklist, verifyVisualWithJev } from '../../tools/verify/verify.mjs';
import {
  checkGoalDecisionEscalation,
  checkStePlainEnglish,
  compileGoalFromPlainEnglish,
} from '../../tools/goal/goal.mjs';
import { hook as swarmGateHook } from '../../tools/swarm-gate/swarm-gate.mjs';

function makeTempDir(prefix = 'bgz-universal-stop-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(dir, '.bgzflow'), { recursive: true });
  return dir;
}

describe('universal-stop, STE compiler & multimodal Jev gate (BGZFLOW 0.9.5)', () => {
  it('blocks Stop when an unread bg-mail message is waiting for the agent role (solves "check inbox" idle problem)', () => {
    const cwd = makeTempDir('bgz-cwd-');
    const mailRoot = makeTempDir('bgz-mail-');
    const projectDir = path.join(mailRoot, 'demo-app');
    fs.mkdirSync(projectDir, { recursive: true });

    const msg = {
      id: '1792120000001-999-1-claude-reviewer',
      project: 'demo-app',
      from: 'claude-reviewer',
      to: 'claude-lead',
      kind: 'question',
      subject: 'Review feedback on Home drawer',
      body: 'Please verify the raised + Create button and reply.',
      state: 'open',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(projectDir, `${msg.id}.json`), JSON.stringify(msg, null, 2), 'utf8');

    const res = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
        },
      }
    );

    assert.equal(res.decision, 'block');
    assert.equal(res.code, 'unread-bg-mail');
    assert.match(res.reason, /unread bg-mail message/);
    assert.match(res.reason, /claude-reviewer/);
  });

  it('injects PostToolUse additionalContext when an unread bg-mail message arrives mid-turn', () => {
    const cwd = makeTempDir('bgz-cwd-');
    const mailRoot = makeTempDir('bgz-mail-');
    const projectDir = path.join(mailRoot, 'demo-app');
    fs.mkdirSync(projectDir, { recursive: true });

    const msg = {
      id: '1792120000002-999-1-argon-reviewer',
      project: 'demo-app',
      from: 'argon-reviewer',
      to: 'grokbot-extra-lead',
      kind: 'review',
      subject: 'Consensus check',
      body: 'Consensus verdict ready for review.',
      state: 'open',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(projectDir, `${msg.id}.json`), JSON.stringify(msg, null, 2), 'utf8');

    const res = swarmGateHook(
      { hook_event_name: 'PostToolUse', cwd },
      {
        BG_MAIL_DIR: mailRoot,
        BGZFLOW_MAIL_PROJECT: 'demo-app',
        BGZFLOW_AGENT_ROLE: 'grokbot-extra-lead',
      }
    );

    assert.ok(res.hookSpecificOutput?.additionalContext);
    assert.match(res.hookSpecificOutput.additionalContext, /Incoming bg-mail/);
    assert.match(res.hookSpecificOutput.additionalContext, /argon-reviewer/);

    // Even after mid-turn notification, if the agent tries to Stop without acking/replying in bg-mail, Stop STILL blocks!
    const stopAfterUnackedMidTurn = swarmGateHook(
      { hook_event_name: 'Stop', cwd },
      {
        BG_MAIL_DIR: mailRoot,
        BGZFLOW_MAIL_PROJECT: 'demo-app',
        BGZFLOW_AGENT_ROLE: 'grokbot-extra-lead',
      }
    );
    assert.equal(stopAfterUnackedMidTurn.decision, 'block');
    assert.match(stopAfterUnackedMidTurn.reason, /unread bg-mail/);
  });

  it('coalesces queued progress/topic messages per sender and interrupts PreToolUse immediately on urgent/blocker messages', () => {
    const cwd = makeTempDir('bgz-coalesce-');
    const mailRoot = makeTempDir('bgz-mail-');
    const projectDir = path.join(mailRoot, 'demo-app');
    fs.mkdirSync(projectDir, { recursive: true });

    // 3 progress messages from worker-1 on the same topic -> coalesced to only the newest one
    for (let i = 1; i <= 3; i++) {
      const m = {
        id: `179212000010${i}-w1`,
        project: 'demo-app',
        from: 'worker-1',
        to: 'claude-lead',
        kind: 'progress',
        topic: 'home-slice',
        body: `Step ${i} progress update`,
        default: null,
        waitMinutes: 15,
        createdAt: new Date(Date.now() - (4 - i) * 1000).toISOString(),
        state: 'open',
      };
      fs.writeFileSync(path.join(projectDir, `${m.id}.json`), JSON.stringify(m, null, 2), 'utf8');
    }

    const postRes = swarmGateHook(
      { hook_event_name: 'PostToolUse', cwd },
      {
        BG_MAIL_DIR: mailRoot,
        BGZFLOW_MAIL_PROJECT: 'demo-app',
        BGZFLOW_AGENT_ROLE: 'claude-lead',
      }
    );
    assert.ok(postRes.hookSpecificOutput?.additionalContext);
    assert.match(postRes.hookSpecificOutput.additionalContext, /2 older status updates coalesced/);
    assert.match(postRes.hookSpecificOutput.additionalContext, /Step 3 progress update/);
    assert.doesNotMatch(postRes.hookSpecificOutput.additionalContext, /Step 1 progress update/);

    // Urgent course-correction message interrupts PreToolUse before the next non-bg-mail command runs!
    const urgentMsg = {
      id: '1792120000200-urgent',
      project: 'demo-app',
      from: 'claude-reviewer',
      to: 'claude-lead',
      kind: 'correction',
      priority: 'urgent',
      body: 'STOP: Do not remove the raised + Create button on the bottom bar!',
      default: null,
      waitMinutes: 15,
      createdAt: new Date().toISOString(),
      state: 'open',
    };
    fs.writeFileSync(path.join(projectDir, `${urgentMsg.id}.json`), JSON.stringify(urgentMsg, null, 2), 'utf8');

    const preRes = swarmGateHook(
      {
        hook_event_name: 'PreToolUse',
        cwd,
        tool_name: 'Bash',
        tool_input: { command: 'npm run build' },
      },
      {
        BG_MAIL_DIR: mailRoot,
        BGZFLOW_MAIL_PROJECT: 'demo-app',
        BGZFLOW_AGENT_ROLE: 'claude-lead',
      }
    );
    assert.equal(preRes.hookSpecificOutput?.permissionDecision, 'deny');
    assert.match(preRes.hookSpecificOutput?.permissionDecisionReason, /URGENT bg-mail/);
    assert.match(preRes.hookSpecificOutput?.permissionDecisionReason, /raised \+ Create button/);
  });

  it('blocks Stop when agent sent an open outbound message and BGZFLOW_HOLD_ON_PEER_MAIL is enabled (solves "continue" idle problem)', () => {
    const cwd = makeTempDir('bgz-cwd-');
    const mailRoot = makeTempDir('bgz-mail-');
    const projectDir = path.join(mailRoot, 'demo-app');
    fs.mkdirSync(projectDir, { recursive: true });

    const outMsg = {
      id: '1792120000003-999-1-claude-lead',
      project: 'demo-app',
      from: 'claude-lead',
      to: 'claude-reviewer',
      kind: 'review',
      subject: 'Ready for slice review',
      body: 'Please review slice 1.',
      state: 'open',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(projectDir, `${outMsg.id}.json`), JSON.stringify(outMsg, null, 2), 'utf8');

    const res = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
          BGZFLOW_HOLD_ON_PEER_MAIL: '1',
        },
      }
    );

    assert.equal(res.decision, 'block');
    assert.equal(res.code, 'waiting-on-peer-mail');
    assert.match(res.reason, /open bg-mail request/);
    assert.match(res.reason, /bg-mail\.mjs wait/);
  });

  it('enforces locked active-goal.json even when no swarm ledger exists and even when stop_hook_active is true', () => {
    const cwd = makeTempDir('bgz-goal-');
    const mailRoot = makeTempDir('bgz-mail-');

    const contract = {
      goalId: 'goal-demo-home',
      objective: 'Rebuild Home screen with raised + Create button',
      domain: 'software',
      active: true,
      boundAgentRole: 'claude-lead',
      checklist: [
        {
          id: 'item-1',
          requirement: 'Bottom bar keeps raised + Create button',
          sourceRef: 'DECISIONS.md#nav',
        },
      ],
    };
    contract.contractSignature = computeContractSignature(contract);
    fs.writeFileSync(
      path.join(cwd, '.bgzflow', 'active-goal.json'),
      JSON.stringify(contract, null, 2),
      'utf8'
    );

    const res = swarmGateHook(
      { hook_event_name: 'Stop', cwd, stop_hook_active: true },
      {
        BG_MAIL_DIR: mailRoot,
        BGZFLOW_MAIL_PROJECT: 'demo-app',
        BGZFLOW_AGENT_ROLE: 'claude-lead',
      }
    );

    assert.equal(res.decision, 'block');
    assert.match(res.reason, /BGZFLOW QA\/QC Stop Gate/);
    assert.match(res.reason, /item-1/);
  });

  it('rejects self-certified receipts (verifier === builder) and blocks Stop', () => {
    const cwd = makeTempDir('bgz-self-cert-');
    const mailRoot = makeTempDir('bgz-mail-');
    fs.mkdirSync(path.join(cwd, '.bgzflow', 'verifications'), { recursive: true });

    const contract = {
      goalId: 'goal-1',
      objective: 'Test non-self-certifying receipt',
      domain: 'software',
      active: true,
      boundAgentRole: 'claude-lead',
      checklist: [
        {
          id: 'item-1',
          requirement: 'File exists',
          sourceRef: 'DECISIONS.md#1',
        },
      ],
    };
    contract.contractSignature = computeContractSignature(contract);
    fs.writeFileSync(
      path.join(cwd, '.bgzflow', 'active-goal.json'),
      JSON.stringify(contract, null, 2),
      'utf8'
    );

    const badReceipt = {
      goalId: 'goal-1',
      itemId: 'item-1',
      candidateSha: 'a'.repeat(40),
      verifier: 'claude-lead', // illegal self-certification!
      builder: 'claude-lead',
      role: 'verifier',
      verificationLevel: 'USED',
      layer1DeterministicPass: true,
      layer2AtomicJevPass: true,
      evidenceSha256: 'b'.repeat(64),
    };
    badReceipt.receiptSignature = computeReceiptSignature(badReceipt);
    fs.writeFileSync(
      path.join(cwd, '.bgzflow', 'verifications', 'item-1.json'),
      JSON.stringify(badReceipt, null, 2),
      'utf8'
    );

    const res = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
        },
      }
    );

    assert.equal(res.decision, 'block');
    assert.equal(res.code, 'qa-checklist-incomplete');
    assert.match(res.reason, /self-certified by builder/);
  });

  it('triggers Rule 22 two-strike rebuild/pivot breaker when an item fails verification twice', () => {
    const cwd = makeTempDir('bgz-2strike-');
    const mailRoot = makeTempDir('bgz-mail-');

    const contract = {
      goalId: 'goal-2strike',
      objective: 'Test 2-strike Rule 22 breaker',
      domain: 'software',
      active: true,
      boundAgentRole: 'claude-lead',
      checklist: [
        {
          id: 'item-broken',
          requirement: 'Working drawer sheet',
          sourceRef: 'DECISIONS.md#drawer',
        },
      ],
    };
    contract.contractSignature = computeContractSignature(contract);
    fs.writeFileSync(
      path.join(cwd, '.bgzflow', 'active-goal.json'),
      JSON.stringify(contract, null, 2),
      'utf8'
    );

    // Strike 1
    const first = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
        },
      }
    );
    assert.equal(first.decision, 'block');
    assert.equal(first.code, 'qa-checklist-incomplete');

    // Strike 2 -> triggers Rule 22 2-strike pivot
    const second = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
        },
      }
    );
    assert.equal(second.decision, 'block');
    assert.equal(second.code, 'qa-two-strike-rebuild-required');
    assert.match(second.reason, /RULE 22 2-STRIKE PIVOT REQUIRED/);
  });

  it('verifies checklist items (software + research citation locator), writes signed receipts, and allows Stop when all items pass', async () => {
    const cwd = makeTempDir('bgz-pass-');
    const mailRoot = makeTempDir('bgz-mail-');
    const sha = '1234567890abcdef1234567890abcdef12345678';

    const contract = {
      goalId: 'goal-research-and-code',
      objective: 'Verify primary-source research quote and claim',
      domain: 'research',
      active: true,
      candidateSha: sha,
      boundAgentRole: 'claude-lead',
      checklist: [
        {
          id: 'cite-1',
          requirement: 'Quote matches primary clinical trial paper',
          sourceRef: 'trial-paper-2026',
        },
      ],
    };
    contract.contractSignature = computeContractSignature(contract);
    fs.writeFileSync(
      path.join(cwd, '.bgzflow', 'active-goal.json'),
      JSON.stringify(contract, null, 2),
      'utf8'
    );

    const verifyRes = await verifyUniversalChecklist(
      {
        verifier: 'claude-reviewer',
        builder: 'claude-lead',
        candidateSha: sha,
        observations: {
          'cite-1': {
            sourceText:
              '# Clinical Trial Results\nThe treatment group achieved a 42% reduction in relapse rate over 12 months compared to placebo.\n',
            citation: {
              quote: '42% reduction in relapse rate over 12 months',
              claim: 'The trial reported a 42% reduction in relapse rate over one year.',
            },
          },
        },
      },
      {
        root: cwd,
        askJevImpl: async () => ({
          ok: true,
          answers: {
            'cite-1': {
              type: 'choice',
              choice: 'supports',
              confidence: 0.97,
            },
          },
        }),
      }
    );

    assert.equal(verifyRes.ok, true);
    assert.equal(verifyRes.verificationLevel, 'USED');
    assert.equal(verifyRes.items.length, 1);
    assert.equal(verifyRes.items[0].status, 'passed');

    const stopRes = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
        },
      }
    );

    assert.equal(stopRes.decision, 'allow');
    assert.equal(stopRes.exitKind, 'all_verified');
  });

  it('uses Jev decision-escalation score (>= 0.65) to allow asking the user on major forks while blocking Stop on routine (< 0.65) choices', async () => {
    const cwd = makeTempDir('bgz-decision-');
    const mailRoot = makeTempDir('bgz-mail-');

    const contract = {
      goalId: 'goal-demo-pricing',
      objective: 'Build trial & plan onboarding flow',
      domain: 'software',
      active: true,
      boundAgentRole: 'claude-lead',
      checklist: [
        {
          id: 'item-trial',
          requirement: '3-day free trial screen works end-to-end',
          sourceRef: 'DECISIONS.md#trial',
        },
      ],
    };
    contract.contractSignature = computeContractSignature(contract);
    fs.writeFileSync(
      path.join(cwd, '.bgzflow', 'active-goal.json'),
      JSON.stringify(contract, null, 2),
      'utf8'
    );

    // 1. Routine technical choice (score 0.22 < 0.65) -> must NOT stop to ask the user
    const routineRes = await checkGoalDecisionEscalation(
      {
        decision: 'Should we use React Context or Zustand for local sheet open state?',
        options: ['React Context (Recommended)', 'Zustand'],
      },
      {
        root: cwd,
        scoreImpl: async () => ({ ok: true, value: 0.22, parts: {} }),
      }
    );
    assert.equal(routineRes.shouldAskUser, false);
    assert.equal(routineRes.action, 'DECIDE_AUTONOMOUSLY_AND_CONTINUE');

    const stopAfterRoutine = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
        },
      }
    );
    assert.equal(stopAfterRoutine.decision, 'block');

    // 2. High-stakes product/money/UX fork (score 0.84 >= 0.65) -> unlocks Stop so AI asks the user!
    const highStakesRes = await checkGoalDecisionEscalation(
      {
        decision: 'When a user skips linking social accounts during onboarding, should the free First Ad preview generate from their website URL or pause until an account is linked?',
        options: [
          'Generate from website URL immediately (Recommended)',
          'Require at least one social account before preview',
        ],
      },
      {
        root: cwd,
        scoreImpl: async () => ({ ok: true, value: 0.84, parts: {} }),
      }
    );
    assert.equal(highStakesRes.shouldAskUser, true);
    assert.equal(highStakesRes.action, 'ASK_USER_FOR_CLARIFICATION');

    const stopAfterHighStakes = evaluateUniversalStop(
      { cwd },
      {
        projectDir: cwd,
        env: {
          BG_MAIL_DIR: mailRoot,
          BGZFLOW_MAIL_PROJECT: 'demo-app',
          BGZFLOW_AGENT_ROLE: 'claude-lead',
        },
      }
    );
    assert.equal(stopAfterHighStakes.decision, 'allow');
    assert.equal(stopAfterHighStakes.exitKind, 'pending_human_decision');
    assert.equal(stopAfterHighStakes.jevEscalationScore, 0.84);
  });

  it('enforces STE Plain-English gate (>= 0.85) and compiles short prompts into locked formal domain specs with user-chosen display mode', async () => {
    const cwd = makeTempDir('bgz-ste-compile-');

    const jargonCheck = await checkStePlainEnglish(
      { text: 'Should we run bgz goal lock before hydrating the RPC schema on the Stop hook?' },
      { scoreImpl: async () => ({ ok: true, value: 0.25, parts: { no_internal_jargon: { norm: 0.1 } } }) }
    );
    assert.equal(jargonCheck.passesSte, false);
    assert.equal(jargonCheck.action, 'REWRITE_IN_STE_PLAIN_ENGLISH');

    const cleanSteCheck = await checkStePlainEnglish(
      { text: 'Should we save your changes automatically when you close the sheet?' },
      { scoreImpl: async () => ({ ok: true, value: 0.94, parts: { no_internal_jargon: { norm: 1.0 } } }) }
    );
    assert.equal(cleanSteCheck.passesSte, true);
    assert.equal(cleanSteCheck.action, 'SHOW_TO_USER');

    // Compile short prompt with plain_only display (default) vs plain_plus_spec (user choice)
    const compiledPlain = await compileGoalFromPlainEnglish(
      {
        prompt: 'fix the home screen so it fits on one screen without scrolling',
        plainEnglishSummary: 'Make the Home screen fit on one screen with no scrolling.',
        domain: 'ui',
        displayPreference: 'plain_only',
      },
      {
        root: cwd,
        scoreImpl: async () => ({ ok: true, value: 0.95, parts: {} }),
      }
    );
    assert.equal(compiledPlain.ok, true);
    assert.equal(compiledPlain.displayPreference, 'plain_only');
    assert.equal(compiledPlain.compiledSpec, undefined);
    assert.equal(compiledPlain.userFacing.standardQualityChecksAttached, 1);

    const compiledWithSpec = await compileGoalFromPlainEnglish(
      {
        prompt: 'fix the home screen so it fits on one screen without scrolling',
        plainEnglishSummary: 'Make the Home screen fit on one screen with no scrolling.',
        domain: 'ui',
        displayPreference: 'plain_plus_spec',
      },
      {
        root: cwd,
        scoreImpl: async () => ({ ok: true, value: 0.95, parts: {} }),
      }
    );
    assert.equal(compiledWithSpec.ok, true);
    assert.equal(compiledWithSpec.displayPreference, 'plain_plus_spec');
    assert.ok(compiledWithSpec.compiledSpec);
    assert.equal(compiledWithSpec.compiledSpec.checklist.length, 2);
    assert.equal(compiledWithSpec.compiledSpec.checklist[0].origin, 'user_explicit');
    assert.equal(compiledWithSpec.compiledSpec.checklist[1].origin, 'standard_quality_check');
  });

  it('verifies visual screenshots and bounding boxes using Jev 1.14 multimodal support', async () => {
    const cwd = makeTempDir('bgz-visual-jev-');
    // Create a valid 320x480 PNG header buffer for testing loadImageAsset + verifyVisualWithJev
    const pngHeader = Buffer.alloc(64);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(pngHeader, 0);
    pngHeader.writeUInt32BE(320, 16);
    pngHeader.writeUInt32BE(480, 20);
    const shotPath = path.join(cwd, 'screen.png');
    const mockPath = path.join(cwd, 'mockup.png');
    fs.writeFileSync(shotPath, pngHeader);
    fs.writeFileSync(mockPath, pngHeader);

    const visualRes = await verifyVisualWithJev(
      {
        screenshotPath: 'screen.png',
        mockupPath: 'mockup.png',
        findBox: 'the Start my week button',
        requirement: 'Home screen fits on one screen and matches approved layout',
      },
      {
        root: cwd,
        askJevImpl: async ({ assets, questions }) => {
          assert.equal(Object.keys(assets).length, 2);
          assert.equal(questions.target_box.type, 'box');
          return {
            ok: true,
            model: 'jev-1.14.0',
            cost: 0.00012,
            ms: 340,
            answers: {
              has_visible_ui: { type: 'noul', noul: 0.99 },
              has_broken_or_clipped_layout: { type: 'noul', noul: 0.04 },
              matches_approved_mockup: { type: 'noul', noul: 0.92 },
              satisfies_visual_requirement: { type: 'noul', noul: 0.95 },
              target_visible: { type: 'noul', noul: 0.98 },
              target_box: {
                type: 'box',
                box: { top: 0.72, bottom: 0.81, left: 0.08, right: 0.92 },
                confidence: 0.91,
              },
            },
          };
        },
      }
    );

    assert.equal(visualRes.ok, true);
    assert.equal(visualRes.status, 'passed');
    assert.equal(visualRes.model, 'jev-1.14.0');
    assert.deepEqual(visualRes.dimensions, { width: 320, height: 480 });
    assert.deepEqual(visualRes.targetBox.box, { top: 0.72, bottom: 0.81, left: 0.08, right: 0.92 });
  });
});
