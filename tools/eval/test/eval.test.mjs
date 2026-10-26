import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  compileTaskEvalCard,
  evaluateResearchAndOssDiscovery,
  evaluateArchitectureAndCode,
  evaluateDocumentClaimsAndPreconditions,
  evaluateMathAndDataTables,
  evaluateChaosPerfAndSecurity,
  evaluateCraftAndAntiSlop,
  recordUserStandardEvalRule,
  runUniversalEvalSuite,
} from '../eval.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
const bgzCli = path.join(rootDir, 'tools', 'bgz.mjs');

test('Domain 1 (codesign): blocks execution if scout findings are empty or branching questions are unanswered, passes when resolved', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-eval-d1-'));
  try {
    const blocked = compileTaskEvalCard({
      projectDir: tmpDir,
      taskSummary: 'Draft Crown Court PTR strategy pack',
      taskKind: 'legal',
      scoutFindings: [],
      unresolvedBranchingUnknowns: ['Has the defendant already been arraigned and entered a plea?'],
    });
    assert.equal(blocked.readyToExecute, false);
    assert.equal(blocked.blockingReasons.length, 2);

    const ready = compileTaskEvalCard({
      projectDir: tmpDir,
      taskSummary: 'Draft Crown Court PTR strategy pack',
      taskKind: 'legal',
      scoutFindings: ['Indictment preferred; Sch 3 para 2 and s.23A depend on arraignment/preferment status'],
      branchingQuestionsAsked: ['Have you already been arraigned and entered a plea?'],
      userAnswers: { arraigned: true, plea: 'Not Guilty' },
      unresolvedBranchingUnknowns: [],
      customCriteria: ['Zero post-arraignment Sch 3 or s.23A recommendations; use Full Code Test + s.17 CJA 1967'],
    });
    assert.equal(ready.readyToExecute, true);
    assert.equal(ready.blockingReasons.length, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Domain 2 (research & OSS discovery): blocks lazy 1-channel search and passes full 4-Channel x 4-Angle saturated search', () => {
  const lazySearch = evaluateResearchAndOssDiscovery({
    topic: 'generative UI statechart runtime',
    channels: {
      github: ['https://github.com/example/old-ui'],
    },
    queryAngles: {
      problem_symptom: ['generative UI library'],
    },
    candidates: [
      {
        name: 'old-ui',
        url: 'https://github.com/example/old-ui',
      },
    ],
    saturationReached: false,
  });

  assert.equal(lazySearch.passed, false);
  assert.ok(lazySearch.violations.some((v) => v.includes('social_dev')));
  assert.ok(lazySearch.violations.some((v) => v.includes('mechanism_architecture')));
  assert.ok(lazySearch.violations.some((v) => v.includes('license')));
  assert.ok(lazySearch.autoCorrectionDirective);

  const thoroughSearch = evaluateResearchAndOssDiscovery({
    topic: 'generative UI statechart runtime',
    channels: {
      github: ['github.com/ThesysDev/openui', 'github.com/statelyai/xstate'],
      social_dev: ['x.com search: openui generative surfaces min_faves:50'],
      community_forums: ['hn.algolia.com: openui xstate agent workflow'],
      registries_or_papers: ['npmjs.com/package/@openuidev/react-lang', 'npmjs.com/package/xstate'],
    },
    queryAngles: {
      problem_symptom: ['streaming LLM structured UI without broken markdown'],
      mechanism_architecture: ['finite state machine actor statechart DAG execution'],
      ecosystem_alternatives: ['awesome-generative-ui alternatives to vercel ai rsc'],
      recent_breakout: ['github created:>2026-04-01 generative UI schema'],
    },
    candidates: [
      {
        name: '@openuidev/react-lang',
        url: 'https://github.com/ThesysDev/openui',
        license: 'MIT',
        lastCommitDate: '2026-10-20',
        fitSummary: 'Purpose-built streaming generative UI parser and component renderer with MIT license.',
      },
      {
        name: 'xstate',
        url: 'https://github.com/statelyai/xstate',
        license: 'MIT',
        lastCommitDate: '2026-10-24',
        fitSummary: 'Industry-standard statechart and actor runtime preventing boolean-soup state bugs.',
      },
    ],
    saturationReached: true,
  });

  assert.equal(thoroughSearch.passed, true, JSON.stringify(thoroughSearch.violations));
  assert.equal(thoroughSearch.autoCorrectionDirective, null);
});

test('Domain 3 (architecture): blocks boolean-soup state and oversized god-files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-eval-d3-'));
  try {
    const badFile = path.join(tmpDir, 'BadWidget.tsx');
    fs.writeFileSync(
      badFile,
      [
        'export function BadWidget() {',
        '  const [a, setA] = useState(false);',
        '  const [b, setB] = useState(true);',
        '  const [c, setC] = useState(false);',
        '  const [d, setD] = useState(false);',
        '  const [e, setE] = useState(true);',
        '  return null;',
        '}',
      ].join('\n'),
      'utf8'
    );

    const res = evaluateArchitectureAndCode({
      projectDir: tmpDir,
      files: ['BadWidget.tsx'],
    });
    assert.equal(res.passed, false);
    assert.ok(res.violations.some((v) => v.includes('boolean soup')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Domain 4 (claims & preconditions): blocks hallucinated post-arraignment Sch 3 / s.23A legal brief and passes the corrected post-arraignment legal pack', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-eval-d4-'));
  try {
    // 1. Negative test: unguarded draft recommending Schedule 3 dismissal and s.23A discontinuance after arraignment
    const hallucinatedBrief = path.join(tmpDir, 'Hallucinated_PTR_Note.md');
    fs.writeFileSync(
      hallucinatedBrief,
      [
        '# PTR Strategy Note',
        'We should apply to dismiss the charge under Schedule 3 paragraph 2 of the Crime and Disorder Act 1998.',
        'We also invite the CPS to discontinue the proceedings under section 23A of the Prosecution of Offences Act 1985.',
        'Also inspect exhibit EXH/99 which was found in the annex.',
      ].join('\n'),
      'utf8'
    );
    const dummySource = path.join(tmpDir, 'Bundle_Source.txt');
    fs.writeFileSync(dummySource, 'Exhibits logged: EXH/01, EXH/01A, EXH/04, EXH/05 under seal SEAL10203040.', 'utf8');

    const badEval = evaluateDocumentClaimsAndPreconditions({
      documentPaths: [hallucinatedBrief],
      sourcePaths: [dummySource],
      caseFacts: { arraigned: true, pleaEntered: true, indictmentPreferred: true },
    });

    assert.equal(badEval.passed, false);
    assert.ok(badEval.violations.some((v) => v.includes('Schedule 3 paragraph 2')));
    assert.ok(badEval.violations.some((v) => v.includes('23A')));
    assert.ok(badEval.violations.some((v) => v.includes('EXH/99')));
    assert.ok(badEval.autoCorrectionDirective);
    assert.equal(badEval.autoCorrectionDirective.mandatoryRepairs.length, 3);

    // 2. Positive test: corrected post-arraignment pack with SUPERSEDED draft and grounded exhibits
    const supersededDraft = path.join(tmpDir, 'Old_Draft_PTR.md');
    fs.writeFileSync(
      supersededDraft,
      'SUPERSEDED - Use canonical pack.\nHistorical note mentioning Schedule 3 dismissal.',
      'utf8'
    );
    const correctedPack = path.join(tmpDir, '03_CPS_Full_Code_Representations.md');
    fs.writeFileSync(
      correctedPack,
      [
        '# Written Representations for CPS Full Code Test Review (Section 17 CJA 1967)',
        'Schedule 3 paragraph 2 dismissal is closed post-arraignment, and section 23A POA 1985 is inapplicable post-preferment.',
        'We invite a continuing review under paragraph 3.6 of the Code for Crown Prosecutors and section 17 CJA 1967 regarding exhibits EXH/01, EXH/01A, EXH/04, and EXH/05 under seal SEAL10203040.',
      ].join('\n'),
      'utf8'
    );

    const goodEval = evaluateDocumentClaimsAndPreconditions({
      documentPaths: [supersededDraft, correctedPack],
      sourcePaths: [dummySource],
      caseFacts: { arraigned: true, pleaEntered: true, indictmentPreferred: true },
    });
    assert.equal(goodEval.passed, true, JSON.stringify(goodEval.violations));
    assert.ok(goodEval.verifiedExhibitsCount >= 4);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Domain 5 (math & tables): catches table cross-footing errors and inline currency multiplication errors', () => {
  const badMath = evaluateMathAndDataTables({
    text: 'The invoice lists 120 £20 notes with a stated value of £2,500.',
    tables: [
      {
        name: 'Q3 Breakdown',
        rows: [
          { revenue: 1200, cost: 700, profit: 500 },
          { revenue: 2400, cost: 1400, profit: 900 }, // wrong profit (should be 1000)
        ],
        totals: { revenue: 3600, cost: 2100, profit: 1500 },
      },
    ],
  });
  assert.equal(badMath.passed, false);
  assert.equal(badMath.violations.length, 3); // row profit mismatch, column profit sum mismatch, and inline 120x20=2400!=2500

  const goodMath = evaluateMathAndDataTables({
    text: 'The invoice lists 120 £20 notes with a face value of £2,400.',
    tables: [
      {
        name: 'Q3 Breakdown',
        rows: [
          { revenue: 1200, cost: 700, profit: 500 },
          { revenue: 2400, cost: 1400, profit: 1000 },
        ],
        totals: { revenue: 3600, cost: 2100, profit: 1500 },
      },
    ],
  });
  assert.equal(goodMath.passed, true, JSON.stringify(goodMath.violations));
});

test('Domain 6, 7 & 8 (chaos, craft, learn & runUniversalEvalSuite): learns permanent user standards and blocks violations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-eval-d8-'));
  try {
    const learned = recordUserStandardEvalRule({
      projectDir: tmpDir,
      domain: 'legal_and_reports',
      rule: 'Never leave internal model codenames like Argon or DeepSeek-v4 on customer-facing surfaces',
      forbiddenPattern: '\\b(?:Argon-Internal|RAW_BB_TOKEN)\\b',
      sourceFeedback: 'Founder feedback: keep internal jargon off customer screens',
    });
    assert.ok(learned.id.startsWith('ustd-'));

    const failedSuite = runUniversalEvalSuite({
      projectDir: tmpDir,
      taskKind: 'report',
      craftInput: {
        texts: [{ name: 'summary.md', content: 'Let us delve into this tapestry of next-gen synergy.' }],
        customerFacingTexts: [{ name: 'HomeScreen', content: 'Connected to SUBSCRIPTION_ACCOUNTS_PATH' }],
      },
      targetTexts: [{ name: 'HomeScreen', content: 'Model: Argon-Internal' }],
    });

    assert.equal(failedSuite.passed, false);
    assert.equal(failedSuite.deliveryBlocked, true);
    assert.ok(failedSuite.violations.some((v) => v.includes('delve')));
    assert.ok(failedSuite.violations.some((v) => v.includes('SUBSCRIPTION_ACCOUNTS_PATH')));
    assert.ok(failedSuite.violations.some((v) => v.includes('Argon-Internal')));
    assert.ok(failedSuite.autoCorrectionDirectives.length >= 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('bgz eval CLI subcommands work end-to-end via bgz.mjs', () => {
  const doms = spawnSync(process.execPath, [bgzCli, 'eval', 'domains', '--json'], { encoding: 'utf8' });
  assert.equal(doms.status, 0, doms.stderr);
  const parsed = JSON.parse(doms.stdout);
  assert.equal(parsed.length, 8);
});
