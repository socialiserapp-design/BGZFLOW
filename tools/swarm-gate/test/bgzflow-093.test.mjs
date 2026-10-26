import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, test } from 'node:test';
import { admitEvidence } from '../admission.mjs';
import { executeOutcomeVerification, verifyOutcome } from '../../verify/verify.mjs';
import { executeTwoCustomerProbe, scanFakeEffects, scanSecretsAndSql, validateTwoCustomerProbe } from '../../scan/scan.mjs';
import { buildReviewPack } from '../../review-pack/review-pack.mjs';
import { dedupeH3Level } from '../../../hooks/lib/compact-judge.mjs';

const roots = [];
after(() => roots.forEach((p) => fs.rmSync(p, { recursive: true, force: true })));

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../..');
const LESSONS_CLI = path.join(REPO_ROOT, 'tools/lessons/lessons.mjs');
const MAIL_CLI = path.join(REPO_ROOT, 'tools/bg-mail/bg-mail.mjs');

function makeTempGitRepo({ added = 'export const x = 1;\n' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz093-'));
  roots.push(root);
  const git = (...a) => {
    const r = spawnSync('git', a, { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git('init', '-q');
  fs.writeFileSync(path.join(root, 'README.md'), 'Base\n');
  git('add', '.');
  git('-c', 'user.name=BGZFLOW', '-c', 'user.email=bgzflow@users.noreply.github.com', 'commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'feature.mjs'), added);
  fs.writeFileSync(
    path.join(root, 'feature.test.mjs'),
    "import {test} from 'node:test';import assert from 'node:assert/strict';import {x} from './feature.mjs';test('x is 1',()=>assert.equal(x,1));\n",
  );
  git('add', '.');
  git('-c', 'user.name=BGZFLOW', '-c', 'user.email=bgzflow@users.noreply.github.com', 'commit', '-qm', 'slice');
  const sha = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'fast.log'), '# tests 1\n# pass 1\n# fail 0\n# skipped 0\n');
  const handback = {
    source: { baseSha: base, sha },
    jobId: 'worker-1',
    checks: [{ argv: ['node', '--test', 'feature.test.mjs'], exitCode: 0, stdoutFile: 'fast.log', counts: { tests: 1, pass: 1, fail: 0, skip: 0 } }],
    audit: { available: false, reason: 'not installed' },
  };
  return { root, base, sha, handback, git };
}

test('093-1: Verifier-only passed & unavailable surface stays BUILT in admission', () => {
  const f = makeTempGitRepo();
  // Builder self-certifying verificationStatus: 'passed' is rejected
  const selfPassed = admitEvidence(
    f.root,
    {
      ...f.handback,
      builder: 'claude-lead',
      outcomeContract: {
        used: 'User taps Start my week',
        surfaceEvidence: 'sim-shots/01.png',
        verificationStatus: 'passed',
      },
    },
    { baseSha: f.base, sha: f.sha },
  );
  assert.equal(selfPassed.allowed, false);
  assert.match(selfPassed.reason, /builder cannot self-certify/i);

  // Builder submitting unavailable surface is allowed at admission, and outcomeContract.verificationLevel stays BUILT (never USED)
  const unavail = admitEvidence(
    f.root,
    {
      ...f.handback,
      builder: 'claude-lead',
      outcomeContract: {
        used: 'User taps Start my week',
        surfaceEvidence: 'sim-shots/01.png',
        surfaceStatus: 'unavailable',
      },
    },
    { baseSha: f.base, sha: f.sha },
  );
  assert.equal(unavail.allowed, true, unavail.reason);
  assert.equal(unavail.outcomeContract.verificationLevel, 'BUILT');
});

test('093-2: Two-tier test governance blocks Tier-1 safety test retirement without verifierSignOff', () => {
  const f = makeTempGitRepo();
  const blocked = admitEvidence(
    f.root,
    {
      ...f.handback,
      triageMode: 'rebuild',
      retiredGuards: [{ file: 'tests/billing-charge-once.test.mjs', reason: 'Rebuilding checkout UI' }],
    },
    { baseSha: f.base, sha: f.sha },
  );
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /Tier-1 behavioural safety tests/i);

  const signedOff = admitEvidence(
    f.root,
    {
      ...f.handback,
      triageMode: 'rebuild',
      verifierSignOff: 'claude-reviewer',
      retiredGuards: [{ file: 'tests/billing-charge-once.test.mjs', reason: 'Replaced by new idempotency suite' }],
    },
    { baseSha: f.base, sha: f.sha },
  );
  assert.equal(signedOff.allowed, true, signedOff.reason);
});

test('093-3: Operations ledger required when paidOrExternalWrites is true', () => {
  const f = makeTempGitRepo();
  const missingOp = admitEvidence(
    f.root,
    {
      ...f.handback,
      paidOrExternalWrites: true,
    },
    { baseSha: f.base, sha: f.sha },
  );
  assert.equal(missingOp.allowed, false);
  assert.match(missingOp.reason, /operation record/i);

  const validOp = admitEvidence(
    f.root,
    {
      ...f.handback,
      paidOrExternalWrites: true,
      operations: [
        {
          id: 'op-meta-campaign-01',
          owner: 'claude-lead',
          intent: 'Pause Meta campaign 123',
          reconciliationMethod: 'GET /campaigns/123 status===PAUSED',
        },
      ],
    },
    { baseSha: f.base, sha: f.sha },
  );
  assert.equal(validOp.allowed, true, validOp.reason);
  assert.equal(validOp.operations.length, 1);
});

test('093-4: bgz scan catches all 4 rebuild fake-effect anti-patterns', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz093-scan-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'src/app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/components/ads'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/components/home'), { recursive: true });

  // Fake 1: Research step-by-step timer simulation
  fs.writeFileSync(path.join(root, 'src/app/research.tsx'), "const t = setTimeout(() => { setStep((s) => s + 1); }, 900); // research scan\n");
  // Fake 2a & 2b: WriteItForMe returning null + canned string
  fs.writeFileSync(path.join(root, 'src/components/ads/write-it-for-me.tsx'), 'export function WriteItForMe() { return null; }\n');
  fs.writeFileSync(path.join(root, 'src/components/ads/write-it-for-me-canned.tsx'), "export function WriteItForMe() { setCopy('Book your fresh cut today'); }\n");
  // Fake 3: Selfie verification setting state without backend read-back
  fs.writeFileSync(path.join(root, 'src/app/actors.tsx'), "function onSelfie() { setVerified(true); }\n");
  // Fake 4: Ads Off catch block swallowing errors
  fs.writeFileSync(
    path.join(root, 'src/components/home/ads-quick-sheet.tsx'),
    'async function turnOffAds() { try { await pauseCampaign(); } catch { } setAdsEnabled(false); }\n',
  );

  const findings = scanFakeEffects(
    [
      'src/app/research.tsx',
      'src/components/ads/write-it-for-me.tsx',
      'src/components/ads/write-it-for-me-canned.tsx',
      'src/app/actors.tsx',
      'src/components/home/ads-quick-sheet.tsx',
    ],
    { root },
  );

  assert.ok(findings.some((f) => f.rule === 'fake-timer-work'), 'Must detect fake timer work');
  assert.ok(findings.some((f) => f.rule === 'noop-ai-component'), 'Must detect noop AI component returning null');
  assert.ok(findings.some((f) => f.rule === 'canned-ai-output'), 'Must detect canned AI output');
  assert.ok(findings.some((f) => f.rule === 'fake-verification-state'), 'Must detect fake selfie verification state');
  assert.ok(findings.some((f) => f.rule === 'swallowed-error-on-effect'), 'Must detect swallowed error on effect');
});

test('093-5: bgz scan catches SQL RLS / security definer hazards and requires live 3-request HTTP execution for two-customer probes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz093-sql-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'supabase/migrations'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'supabase/migrations/001.sql'),
    'CREATE FUNCTION admin_helper() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1; $$; CREATE POLICY open_all ON posts FOR UPDATE USING (true);\n',
  );

  const sqlFindings = scanSecretsAndSql(['supabase/migrations/001.sql'], { root });
  assert.ok(sqlFindings.some((f) => f.rule === 'sql-security-definer-search-path'));
  assert.ok(sqlFindings.some((f) => f.rule === 'sql-permissive-mutation-policy'));

  const prodBlocked = validateTwoCustomerProbe({
    environment: 'production',
    targetUrl: 'https://api.example.com/v1/posts',
    testAccountA: 'user-a-real-791',
    testAccountB: 'user-b-real-882',
    crossReadBlocked: true,
    crossWriteBlocked: true,
  });
  assert.equal(prodBlocked.ok, false);
  assert.equal(prodBlocked.blocking, true);
  assert.match(prodBlocked.reason, /never on production/i);

  const stagingUnverifiedClaim = validateTwoCustomerProbe({
    environment: 'local',
    targetUrl: 'http://localhost:54321/rest/v1/posts',
    testAccountA: 'user-a-real-791',
    testAccountB: 'user-b-real-882',
    crossReadBlocked: true,
    crossWriteBlocked: true,
  });
  assert.equal(stagingUnverifiedClaim.ok, false);
  assert.equal(stagingUnverifiedClaim.runtimeExecuted, false);
  assert.equal(stagingUnverifiedClaim.status, 'unverified_claim');

  // Synchronous validateTwoCustomerProbe with pre-supplied receipts stays record_only / BUILT (never ok: true)
  const callerSuppliedReceipts = validateTwoCustomerProbe({
    environment: 'local',
    targetUrl: 'http://localhost:54321/rest/v1/posts',
    testAccountA: 'user-a-real-791',
    testAccountB: 'user-b-real-882',
    crossReadBlocked: true,
    crossWriteBlocked: true,
    readProbeReceipt: { status: 403, responseSha256: 'a'.repeat(64) },
    writeProbeReceipt: { status: 403, responseSha256: 'b'.repeat(64) },
  });
  assert.equal(callerSuppliedReceipts.ok, false);
  assert.equal(callerSuppliedReceipts.status, 'record_only');
  assert.equal(callerSuppliedReceipts.verificationLevel, 'BUILT');
  assert.equal(callerSuppliedReceipts.runtimeExecuted, false);

  // Live executeTwoCustomerProbe rejects when Account A self-read returns 0 rows
  const emptySelfRead = await executeTwoCustomerProbe({
    environment: 'local',
    targetUrl: 'http://localhost:54321/rest/v1/posts',
    testAccountA: 'user-a-real-791',
    testAccountB: 'user-b-real-882',
    tokenA: 'tok-a',
    tokenB: 'tok-b',
    fetchImpl: async () => ({
      status: 200,
      text: async () => '[]',
    }),
  });
  assert.equal(emptySelfRead.ok, false);
  assert.equal(emptySelfRead.verificationLevel, 'BUILT');
  assert.equal(emptySelfRead.runtimeExecuted, false);

  // Live executeTwoCustomerProbe succeeds when Account A has seeded rows and Account B is blocked on cross-read & cross-write
  const liveExecutedOk = await executeTwoCustomerProbe({
    environment: 'local',
    targetUrl: 'http://localhost:54321/rest/v1/posts',
    testAccountA: 'user-a-real-791',
    testAccountB: 'user-b-real-882',
    tokenA: 'tok-a',
    tokenB: 'tok-b',
    fetchImpl: async (_url, init) => {
      const auth = init?.headers?.authorization || init?.headers?.Authorization || '';
      if (auth === 'Bearer tok-a') {
        return {
          status: 200,
          text: async () => JSON.stringify([{ id: 'post-1', owner_id: 'user-a-real-791' }]),
        };
      }
      if (init?.method === 'GET') {
        return {
          status: 200,
          text: async () => '[]',
        };
      }
      return {
        status: 403,
        text: async () => JSON.stringify({ error: 'RLS policy violation' }),
      };
    },
  });
  assert.equal(liveExecutedOk.ok, true, liveExecutedOk.reason);
  assert.equal(liveExecutedOk.status, 'passed');
  assert.equal(liveExecutedOk.verificationLevel, 'USED');
  assert.equal(liveExecutedOk.runtimeExecuted, true);
  assert.equal(liveExecutedOk.actualNetworkFetches, 3);
});

test('093-6: bgz verify enforces served buildSha, verifier !== builder, synchronous BUILT cap, and live HTTP executeOutcomeVerification -> USED', async () => {
  const f = makeTempGitRepo();
  // Same builder and verifier -> blocked (stays BUILT_READY_FOR_VERIFIER)
  const selfVerify = verifyOutcome(
    {
      builder: 'claude-lead',
      verifier: 'claude-lead',
      buildSha: f.sha,
      backendVersion: 'v1',
      surface: 'ios-simulator',
      surfaceStatus: 'available',
      journeys: [{ id: 'j1', effectObserved: 'Campaign row paused in DB', readBackEvidence: 'SELECT status FROM campaigns WHERE id=1 -> paused' }],
    },
    { root: f.root },
  );
  assert.equal(selfVerify.ok, false);
  assert.equal(selfVerify.verificationLevel, 'BUILT_READY_FOR_VERIFIER');

  // Mount-only effect -> blocked
  const mountOnly = verifyOutcome(
    {
      builder: 'claude-lead',
      verifier: 'claude-reviewer',
      buildSha: f.sha,
      backendVersion: 'v1',
      surface: 'ios-simulator',
      surfaceStatus: 'available',
      journeys: [{ id: 'j1', effectObserved: 'mounted', readBackEvidence: 'rendered' }],
    },
    { root: f.root },
  );
  assert.equal(mountOnly.ok, false);
  assert.equal(mountOnly.verificationLevel, 'BUILT');

  // Unavailable surface -> status: unavailable, verificationLevel: BUILT, routableHandback: true
  const unavail = verifyOutcome(
    {
      builder: 'claude-lead',
      verifier: 'claude-reviewer',
      buildSha: f.sha,
      backendVersion: 'v1',
      surface: 'ios-simulator',
      surfaceStatus: 'unavailable',
    },
    { root: f.root },
  );
  assert.equal(unavail.ok, false);
  assert.equal(unavail.status, 'unavailable');
  assert.equal(unavail.verificationLevel, 'BUILT');
  assert.equal(unavail.routableHandback, true);

  // Self-declared text WITHOUT probeCommand or evidenceFile -> stays BUILT (partial), never USED
  const textOnly = verifyOutcome(
    {
      builder: 'claude-lead',
      verifier: 'claude-reviewer',
      buildSha: f.sha,
      backendVersion: 'v1',
      surface: 'ios-simulator',
      surfaceStatus: 'available',
      journeys: [
        {
          id: 'j1',
          effectObserved: 'Campaign 123 status changed to paused in Supabase and UI pill updated to Off',
          readBackEvidence: 'GET /rest/v1/ad_campaigns?id=eq.123 returned status=paused',
        },
      ],
    },
    { root: f.root },
  );
  assert.equal(textOnly.ok, false);
  assert.equal(textOnly.status, 'partial');
  assert.equal(textOnly.verificationLevel, 'BUILT');
  assert.equal(textOnly.runtimeExecuted, false);

  // Synchronous verifyOutcome with local probeCommand and explicit probeAuthor tops out at BUILT (never USED)
  const syncLocalCheck = verifyOutcome(
    {
      builder: 'claude-lead',
      verifier: 'claude-reviewer',
      probeAuthor: 'claude-reviewer',
      buildSha: f.sha,
      backendVersion: 'v1',
      surface: 'ios-simulator',
      surfaceStatus: 'available',
      journeys: [
        {
          id: 'j1',
          effectObserved: 'Campaign 123 status changed to paused in Supabase and UI pill updated to Off',
          readBackEvidence: 'GET /rest/v1/ad_campaigns?id=eq.123 returned status=paused',
          probeCommand: `console.log(JSON.stringify({ buildSha: '${f.sha}', journeyId: 'j1', status: 'paused', stateReadBackSha256: '${'c'.repeat(64)}' }))`,
          expectedOutputPattern: 'paused',
        },
      ],
    },
    { root: f.root },
  );
  assert.equal(syncLocalCheck.ok, false);
  assert.equal(syncLocalCheck.status, 'partial');
  assert.equal(syncLocalCheck.verificationLevel, 'BUILT');
  assert.equal(syncLocalCheck.runtimeExecuted, false);
  assert.equal(syncLocalCheck.localChecksPassed, 1);

  // Live executeOutcomeVerification performing real HTTP read-back fetch -> USED
  const liveValid = await executeOutcomeVerification(
    {
      builder: 'claude-lead',
      verifier: 'claude-reviewer',
      probeAuthor: 'claude-reviewer',
      buildSha: f.sha,
      backendVersion: 'v1',
      surface: 'ios-simulator',
      surfaceStatus: 'available',
      journeys: [
        {
          id: 'j1',
          effectObserved: 'Campaign 123 status changed to paused in Supabase and UI pill updated to Off',
          readBackEvidence: 'GET /rest/v1/ad_campaigns?id=eq.123 returned status=paused',
          readBackUrl: 'http://127.0.0.1:8787/autopilot/ads/campaigns?id=123',
          expectedReadBackPattern: '"status":"paused"',
        },
      ],
    },
    {
      root: f.root,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: '123', status: 'paused', buildSha: f.sha }),
      }),
    },
  );
  assert.equal(liveValid.ok, true, liveValid.reason);
  assert.equal(liveValid.status, 'passed');
  assert.equal(liveValid.verificationLevel, 'USED');
  assert.equal(liveValid.runtimeExecuted, true);
  assert.equal(liveValid.actualNetworkFetches, 1);
});

test('093-11: Negative control (bgzflow-093-negative-control-2049, 2130 & c358c82-control) rejects all local-only prints, files, and caller-supplied receipts', () => {
  const f = makeTempGitRepo();
  fs.writeFileSync(path.join(f.root, 'note.txt'), 'sixteen bytes of local text\n');

  // Control 1: tapLookingPrint
  const tapLookingPrint = verifyOutcome(
    {
      surface: 'web',
      buildSha: f.sha,
      backendVersion: 'candidate-probe',
      builder: 'implementation-owner',
      verifier: 'control-author',
      journeys: [
        {
          id: 'tap-print',
          effectObserved: 'Campaign was paused according to supplied text.',
          readBackEvidence: 'Campaign was paused according to another supplied text.',
          probeCommand: `node -e "console.log('# pass 1\\n# fail 0')"`,
        },
      ],
    },
    { root: f.root },
  );
  assert.equal(tapLookingPrint.ok, false);
  assert.equal(tapLookingPrint.verificationLevel, 'BUILT');
  assert.equal(tapLookingPrint.runtimeExecuted, false);

  // Control 2: selfPrintedJsonReceipt
  const selfPrintedJsonReceipt = verifyOutcome(
    {
      surface: 'web',
      buildSha: f.sha,
      backendVersion: 'candidate-probe',
      builder: 'implementation-owner',
      verifier: 'control-author',
      probeAuthor: 'control-author',
      journeys: [
        {
          id: 'self-json',
          effectObserved: 'Campaign was paused according to supplied text.',
          readBackEvidence: 'Campaign was paused according to another supplied text.',
          probeCommand: `node -e "console.log(JSON.stringify({buildSha:'${f.sha}',journeyId:'self-json',responseSha256:'0'.repeat(64)}))"`,
        },
      ],
    },
    { root: f.root },
  );
  assert.equal(selfPrintedJsonReceipt.ok, false);
  assert.equal(selfPrintedJsonReceipt.verificationLevel, 'BUILT');
  assert.equal(selfPrintedJsonReceipt.runtimeExecuted, false);

  // Control 3: anyFileOnDisk
  const anyFileOnDisk = verifyOutcome(
    {
      surface: 'web',
      buildSha: f.sha,
      backendVersion: 'candidate-probe',
      builder: 'implementation-owner',
      verifier: 'control-author',
      probeAuthor: 'control-author',
      journeys: [
        {
          id: 'disk-note',
          effectObserved: 'Campaign was paused according to supplied text.',
          readBackEvidence: 'Campaign was paused according to another supplied text.',
          evidenceFile: 'note.txt',
        },
      ],
    },
    { root: f.root },
  );
  assert.equal(anyFileOnDisk.ok, false);
  assert.equal(anyFileOnDisk.verificationLevel, 'BUILT');
  assert.equal(anyFileOnDisk.runtimeExecuted, false);

  // Control 4: typedHttpReceipts with UUID-shaped repeated digits or caller-supplied receipts
  const typedHttpReceipts = validateTwoCustomerProbe(
    {
      environment: 'preview',
      targetUrl: 'http://localhost:65534',
      testAccountA: '11111111-2222-3333-4444-555555555555',
      testAccountB: '66666666-7777-8888-9999-000000000000',
      crossReadBlocked: true,
      crossWriteBlocked: true,
      readProbeReceipt: { status: 200, rowsReturned: 0, responseSha256: 'a'.repeat(64) },
      writeProbeReceipt: { status: 403, responseSha256: 'b'.repeat(64) },
    },
    { root: f.root },
  );
  assert.equal(typedHttpReceipts.ok, false);
  assert.equal(typedHttpReceipts.verificationLevel, 'BUILT');
  assert.equal(typedHttpReceipts.runtimeExecuted, false);

  // Also check .astro scanning: browser navigation redirect in download.astro is not flagged, while fake timer state in .astro IS flagged
  fs.mkdirSync(path.join(f.root, 'marketing-site-astro/src/pages'), { recursive: true });
  fs.writeFileSync(
    path.join(f.root, 'marketing-site-astro/src/pages/download.astro'),
    "--- // QR scan page\n---\n<script>window.setTimeout(() => window.location.replace(destination), 120);</script>\n",
  );
  fs.writeFileSync(
    path.join(f.root, 'marketing-site-astro/src/pages/fake-scan.astro'),
    "--- // fake scan\n---\n<script>setTimeout(() => { setStep((s) => s + 1); }, 900);</script>\n",
  );
  const astroRedirectFindings = scanFakeEffects(['marketing-site-astro/src/pages/download.astro'], { root: f.root });
  assert.equal(astroRedirectFindings.length, 0);
  const astroFakeFindings = scanFakeEffects(['marketing-site-astro/src/pages/fake-scan.astro'], { root: f.root });
  assert.equal(astroFakeFindings.length, 1);
  assert.equal(astroFakeFindings[0].rule, 'fake-timer-work');
});

test('093-7: bgz review-pack strips builder prose while preserving raw diff and code comments', () => {
  const f = makeTempGitRepo({ added: '// Why: preserve idempotency across retries\nexport const x = 1;\n' });
  const hbPath = path.join(f.root, 'handback.json');
  fs.writeFileSync(
    hbPath,
    JSON.stringify({
      jobId: 'worker-1',
      summary: 'Everything works great, trust me!',
      narrative: 'I carefully rebuilt the whole flow.',
      checks: f.handback.checks,
    }),
  );
  const pack = buildReviewPack({
    root: f.root,
    baseSha: f.base,
    headSha: f.sha,
    handbackFile: 'handback.json',
  });
  assert.equal(pack.schema, 'bgzflow-review-pack-v1');
  assert.equal(pack.machineHandback.summary, undefined);
  assert.equal(pack.machineHandback.narrative, undefined);
  assert.equal(pack.machineHandback.jobId, 'worker-1');
  assert.match(pack.rawDiff, /Why: preserve idempotency across retries/);
});

test('093-8: bgz lessons enforces --scope global requirements and blocks preference from global/high', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz093-lessons-'));
  roots.push(root);

  // Preference lesson with high severity or global scope is rejected
  const prefGlobal = spawnSync(
    process.execPath,
    [
      LESSONS_CLI,
      'add',
      '--root',
      root,
      '--project',
      'demo-app',
      '--stage',
      'build',
      '--key',
      'style-pref',
      '--scope',
      'global',
      '--kind',
      'preference',
      '--severity',
      'high',
      '--what',
      'Prefer blue buttons',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(prefGlobal.status, 0);
  assert.match(prefGlobal.stderr, /preference/i);

  // Global defect lesson without verifiedBy / reviewBy / evidence is rejected
  const globalMissing = spawnSync(
    process.execPath,
    [
      LESSONS_CLI,
      'add',
      '--root',
      root,
      '--project',
      'demo-app',
      '--stage',
      'build',
      '--key',
      'fake-effect',
      '--scope',
      'global',
      '--kind',
      'defect',
      '--what',
      'Never swallow catch on Off',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(globalMissing.status, 0);
  assert.match(globalMissing.stderr, /global/i);

  // Global defect lesson with evidence, review-by, and verified-by succeeds
  const globalOk = spawnSync(
    process.execPath,
    [
      LESSONS_CLI,
      'add',
      '--root',
      root,
      '--project',
      'demo-app',
      '--stage',
      'build',
      '--key',
      'fake-effect',
      '--scope',
      'global',
      '--kind',
      'defect',
      '--evidence',
      'SIM-VS-SPEC-14',
      '--review-by',
      '2026-11-15',
      '--verified-by',
      'claude-reviewer',
      '--what',
      'Never swallow catch on Off switch',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(globalOk.status, 0, globalOk.stderr);
});

test('093-9: bg-mail supports ack (acknowledged) and act (acted_upon) states', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz093-mail-'));
  roots.push(root);
  // bg-mail reads BG_MAIL_DIR (BGZFLOW_MAIL_ROOT alone left this test writing to the real inbox); sessions stay temp too.
  const env = { ...process.env, BGZFLOW_MAIL_ROOT: path.join(root, 'inbox'), BG_MAIL_DIR: path.join(root, 'inbox'), BGZFLOW_SESSIONS_DIR: path.join(root, 'sessions') };

  const post = spawnSync(
    process.execPath,
    [MAIL_CLI, 'post', '--project', 'demo-app', '--from', 'argon-reviewer', '--to', 'claude-lead', '--body', 'Verify slice 1'],
    { encoding: 'utf8', env },
  );
  assert.equal(post.status, 0, post.stderr);
  const msg = JSON.parse(post.stdout);
  assert.equal(msg.state, 'open');

  const ack = spawnSync(
    process.execPath,
    [MAIL_CLI, 'ack', '--project', 'demo-app', '--id', msg.id, '--from', 'claude-lead'],
    { encoding: 'utf8', env },
  );
  assert.equal(ack.status, 0, ack.stderr);
  const ackMsg = JSON.parse(ack.stdout);
  assert.equal(ackMsg.state, 'acknowledged');

  const act = spawnSync(
    process.execPath,
    [MAIL_CLI, 'act', '--project', 'demo-app', '--id', msg.id, '--from', 'claude-lead', '--effect', 'Verified on simulator build ddd474'],
    { encoding: 'utf8', env },
  );
  assert.equal(act.status, 0, act.stderr);
  const actMsg = JSON.parse(act.stdout);
  assert.equal(actMsg.state, 'acted_upon');
  assert.equal(actMsg.acted.effect, 'Verified on simulator build ddd474');
});

test('093-10: H3 dedupeH3Level fires once per size band per transcript and always allows request', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz093-h3-'));
  roots.push(root);
  const transcript = '/tmp/chat-1.jsonl';

  assert.equal(dedupeH3Level(root, transcript, 'notice'), 'notice');
  assert.equal(dedupeH3Level(root, transcript, 'notice'), 'silent');
  assert.equal(dedupeH3Level(root, transcript, 'recommend'), 'recommend');
  assert.equal(dedupeH3Level(root, transcript, 'recommend'), 'silent');
  assert.equal(dedupeH3Level(root, transcript, 'notice'), 'silent');
  assert.equal(dedupeH3Level(root, transcript, 'request'), 'request');
  assert.equal(dedupeH3Level(root, transcript, 'request'), 'request');
});
