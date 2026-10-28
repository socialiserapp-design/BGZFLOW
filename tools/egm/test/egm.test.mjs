import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runSystemXRay,
  buildCoArchitectMentorPacket,
  runGoldfishPreCodeReview,
  runAutonomousSystemSetup,
  detectArchitecturalAndOutputDrift,
} from '../egm.mjs';
import { compileGoalFromPlainEnglish } from '../../goal/goal.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-egm-test-'));
}

test('Pillar 1 (xray): detects competing modes, stale revision queues, empty configs, missing trace, learner gap, and truncated outputs', () => {
  const dir = makeTmpDir();
  const sampleHandoff = path.join(dir, 'handoff.md');
  const sampleOutput = path.join(dir, 'sample-week.md');

  fs.writeFileSync(
    sampleHandoff,
    [
      'Users have two competing modes (Quick Targets and Growth Loop) running together.',
      'Stale queued posts (Day 10/14/17) kept firing even though rev 8 said stop.',
      '249 users; 11 Autopilot configs, all with no targets/plan; Growth Loop has never produced an accepted brief.',
      'Reginald/Gaston video motion-graphics render FAILED, so it posted the plain film.',
      'Proposed but not started: a per-post trace record. Asked whether to start. No answer yet.',
      'Learner is NOT connected.',
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    sampleOutput,
    '3 video plans are incomplete because their replies reached the response limit. The received words and shots are shown below; missing material has not been filled in.',
    'utf8'
  );

  const report = runSystemXRay({
    projectDir: dir,
    systemName: 'Automated Scheduler',
    userPrompt: 'Fix why Autopilot videos are boring',
    filesToScan: ['handoff.md', 'sample-week.md'],
  });

  const brokenStages = report.lifecycleAudit.filter((s) => s.status === 'issues_found');
  assert.equal(brokenStages.length, 6, 'All 6 lifecycle stages should be flagged as broken');
  assert.ok(report.unaskedIssuesCount >= 6);
  assert.ok(fs.existsSync(path.join(dir, '.bgzflow', 'egm', 'latest-xray.json')));
});

test('Pillar 2 & 3 (mentor + goal compile): warns against symptom-patching, injects unknown-unknowns playbook, and teaches principles', async () => {
  const dir = makeTmpDir();
  const packet = buildCoArchitectMentorPacket({
    projectDir: dir,
    userPrompt: 'Just tweak the prompt so Autopilot schedules posts better',
    domain: 'software',
  });

  assert.equal(packet.sycophancyGuardActive, true);
  assert.equal(packet.isUnderspecifiedOrSymptomPrompt, true);
  assert.ok(packet.antiSycophancyWarning.includes('STOP_ORDER_TAKER_MODE'));
  assert.ok(packet.injectedExpertRequirements.length >= 5);
  assert.ok(packet.architectureLessonsForUser.length >= 3);
  assert.ok(packet.diagnosticQuestionsToAskUser.length >= 2);

  // Verify compileGoalFromPlainEnglish automatically attaches the full Expert Unknown-Unknowns Playbook
  const compiled = await compileGoalFromPlainEnglish(
    {
      prompt: 'Fix the scheduler',
      domain: 'software',
    },
    { root: dir }
  );
  assert.equal(compiled.ok, true);
  assert.ok(compiled.userFacing.standardQualityChecksAttached >= 6, 'Should inject all 6 software expert unknown-unknown standards automatically');
});

test('Pillar 4 (goldfish): enforces No-Code rule until all 6 stateless lenses pass', () => {
  const dir = makeTmpDir();

  const weakReview = runGoldfishPreCodeReview({
    projectDir: dir,
    specText: 'We will update the prompt string in the generator function.',
  });
  assert.equal(weakReview.codeUnlocked, false);
  assert.ok(weakReview.blockingFindings.length >= 4);

  const strongSpec = [
    'Root cause lifecycle invariant: establish a single source of truth exclusive state machine.',
    'State machine increments planRevision epoch and immediately cancels/invalidates stale queued jobs.',
    'UX validation blocks any empty config with zero targets and enforces plain English user journey completeness.',
    'Token and cost budget cap uses per-item chunking so no response hits truncation limits.',
    'Every run writes a per-execution lineage trace record and connects the feedback loop to the learner.',
    'Migration script backfills existing users and existing configs with safe rollback.',
  ].join(' ');

  const strongReview = runGoldfishPreCodeReview({
    projectDir: dir,
    specText: strongSpec,
  });
  assert.equal(strongReview.codeUnlocked, true);
  assert.equal(strongReview.passedLensesCount, 6);
});

test('Pillar 5 (autosetup): eliminates human bottleneck for tracing/maps/audits while asking human for real spend/external publish', () => {
  const dir = makeTmpDir();

  const traceSetup = runAutonomousSystemSetup({
    projectDir: dir,
    proposedAction: 'Create per-post execution trace record and run read-only Firestore config health audit',
  });
  assert.equal(traceSetup.actionClassification, 'AUTO_EXECUTE_ZERO_BOTTLENECK');
  assert.ok(fs.existsSync(path.join(dir, '.bgzflow', 'traces', 'execution-trace-schema.json')));

  const spendSetup = runAutonomousSystemSetup({
    projectDir: dir,
    proposedAction: 'Spend £500 on paid live campaign and publish live to App Store',
  });
  assert.equal(spendSetup.actionClassification, 'TRUE_OWNER_DECISION_ASK_HUMAN');
});

test('Pillar 6 (drift): blocks truncated outputs, incomplete batch counts, and reward-hacking test skips', () => {
  const dir = makeTmpDir();
  const cutoffFile = path.join(dir, 'cutoff.md');
  fs.writeFileSync(
    cutoffFile,
    '## Monday\nComplete.\n## Tuesday\n3 video plans are incomplete because their replies reached the response limit.\n',
    'utf8'
  );

  const driftRes = detectArchitecturalAndOutputDrift({
    projectDir: dir,
    artifactPaths: ['cutoff.md'],
    expectedItemCount: 6,
  });

  assert.equal(driftRes.passed, false);
  assert.ok(driftRes.violations.some((v) => v.includes('TRUNCATED_OR_INCOMPLETE_OUTPUT')));
  assert.ok(driftRes.violations.some((v) => v.includes('INCOMPLETE_BATCH_COUNT')));
  assert.equal(driftRes.autoCorrectionDirective.action, 'AUTO_CONTINUE_TRUNCATED_ITEMS_AND_FIX_DRIFT');

  // Verify Anti-Reward-Hacking check
  const hackedTestRes = detectArchitecturalAndOutputDrift({
    projectDir: dir,
    textContent: 'test.skip("should cancel stale queue items", () => { // expect(queue.length).toBe(0); });',
  });
  assert.equal(hackedTestRes.passed, false);
  assert.ok(hackedTestRes.violations.some((v) => v.includes('SKIPPED_OR_ISOLATED_TEST_GAMING')));
});
