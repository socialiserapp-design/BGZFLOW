#!/usr/bin/env node
import { isCommandEntry } from '../../hooks/lib/command-entry.mjs';
// bgz scan — Deterministic Security, Fake-Effect & Two-Customer Isolation Scanner (Priority 6, BGZFLOW 0.9.3).
// Catches:
// 1. Fake-effect anti-patterns (timers posing as work, canned AI text, fake selfie/verification state, swallowed catch on ads/money toggles, no-op handlers).
// 2. Live secrets and non-allowlisted public env keys.
// 3. SQL / RLS / owner-isolation hazards (security definer without search_path, using (true) on tenant tables).
// 4. Trust baseline changes (.mcp.json, hooks/hooks.json).
// 5. Two-customer cross-tenant isolation probe validation (preview/test accounts only; never production).

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { liveSecret } from '../../hooks/lib/jev-gates.mjs';

const PUBLIC_ALLOWLIST = /(?:ANON_KEY|PUBLISHABLE_KEY|PUBLIC_URL|SUPABASE_URL|POSTHOG_KEY|SENTRY_DSN|APP_ENV|API_URL|SITE_URL|GOOGLE_MAPS|STRIPE_PK)/i;
const PUBLIC_SECRET_BAD = /\b(?:EXPO_PUBLIC|NEXT_PUBLIC|VITE)_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|ADMIN_TOKEN|WEBHOOK_SECRET|DATABASE_URL)\b/;
const NETWORK_CALL = /\b(?:fetch|axios|supabase|rpc|useMutation|useQuery|apiClient|invoke|post|put|patch|delete|trpc|graphql|location\.(?:replace|assign|href))\b/i;
const TEST_FILE = /(?:^|[/\\])(?:tests?|__tests__|fixtures)(?:[/\\]|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i;

function readFileSafe(root, relPath) {
  try {
    const full = path.resolve(root, relPath);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
    if (fs.statSync(full).size > 524_288) return null;
    return fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
}

export function scanFakeEffects(files, { root = process.cwd() } = {}) {
  const findings = [];
  for (const file of files) {
    if (TEST_FILE.test(file) || !/\.(?:[cm]?[jt]sx?|astro|html)$/i.test(file)) continue;
    const content = readFileSafe(root, file);
    if (!content) continue;

    // 1. Timer posing as async research / verification / save work without a real network call in the handler/file
    if (/\b(?:setTimeout|setInterval)\s*\(/.test(content) && /(?:research|scan|verify|selfie|generate|write[-_]?it[-_]?for[-_]?me)/i.test(file + '\n' + content)) {
      if (!NETWORK_CALL.test(content)) {
        findings.push({
          rule: 'fake-timer-work',
          category: 'fake-effect',
          blocking: true,
          file,
          detail: 'setTimeout/setInterval used inside a research/scan/verify/AI flow with no real network, RPC or database call.',
        });
      }
    }

    // 2. Canned AI output or returning null in an AI generation component ("Write it for me")
    if (/write[-_]?it[-_]?for[-_]?me/i.test(file) || /\bWriteItForMe\b/.test(content)) {
      if (/return\s+null\s*;/.test(content) && !NETWORK_CALL.test(content)) {
        findings.push({
          rule: 'noop-ai-component',
          category: 'fake-effect',
          blocking: true,
          file,
          detail: 'WriteItForMe component returns null or has no backend AI invocation.',
        });
      } else if (!NETWORK_CALL.test(content) && /\b(?:setCopy|setHeadline|onApply|onSelect|setDraft)\s*\(\s*['"`]/.test(content)) {
        findings.push({
          rule: 'canned-ai-output',
          category: 'fake-effect',
          blocking: true,
          file,
          detail: 'AI copy generator sets hardcoded canned text without calling a backend AI route.',
        });
      }
    }

    // 3. Selfie / identity verification state flipped to verified without persistence/network call
    if (/(?:selfie|identity[-_]?verif|actor[-_]?verif)/i.test(file + '\n' + content)) {
      if (/(?:set(?:Selfie)?(?:Verified|Submitted)\s*\(\s*true\s*\)|status\s*:\s*['"]verified['"]|['"]Selfie verified['"])/i.test(content) && !NETWORK_CALL.test(content)) {
        findings.push({
          rule: 'fake-verification-state',
          category: 'fake-effect',
          blocking: true,
          file,
          detail: 'Verification/selfie state is marked verified in UI without recording or reading back from the server.',
        });
      }
    }

    // 4. Swallowed catch block on money / ads / autopilot / spend switch
    if (/\b(?:ads|autopilot|campaign|spend|billing|subscription|pause)\b/i.test(file + '\n' + content)) {
      const silentEmptyCatch = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/;
      const commentedEmptyCatch = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\s*)+\}/;
      if (silentEmptyCatch.test(content)) {
        findings.push({
          rule: 'swallowed-error-on-effect',
          category: 'fake-effect',
          blocking: true,
          file,
          detail: 'Silent empty catch {} block swallows errors in an ads/autopilot/billing flow instead of surfacing failure or rolling back state.',
        });
      } else if (commentedEmptyCatch.test(content)) {
        findings.push({
          rule: 'swallowed-error-on-effect-lead',
          category: 'fake-effect',
          blocking: false,
          disposition: 'advice',
          file,
          detail: 'Comment-only catch block in an ads/autopilot/billing file; verify fallback does not mask user-facing failure.',
        });
      }
    }
  }
  return findings;
}

export function scanKeepAndForbidContract(files, { root = process.cwd(), goal = null } = {}) {
  const findings = [];
  let activeGoal = goal;
  if (!activeGoal) {
    try {
      const gPath = path.join(root, '.bgzflow', 'active-goal.json');
      if (fs.existsSync(gPath)) activeGoal = JSON.parse(fs.readFileSync(gPath, 'utf8'));
    } catch {
      activeGoal = null;
    }
  }
  if (!activeGoal || activeGoal.active === false) return findings;

  const withdrawnIds = new Set(Array.isArray(activeGoal.withdrawnItems) ? activeGoal.withdrawnItems.map((w) => w.id) : []);
  const forbidList = (activeGoal.forbidList || []).filter((f) => f && f.id && !withdrawnIds.has(f.id));
  if (!forbidList.length) return findings;

  for (const file of files) {
    if (TEST_FILE.test(file)) continue;
    const content = readFileSafe(root, file);
    if (!content) continue;
    const normFile = file.replace(/\\/g, '/');

    for (const f of forbidList) {
      if (Array.isArray(f.scopedFiles) && f.scopedFiles.length > 0) {
        const matchesScope = f.scopedFiles.some((sf) => normFile.endsWith(sf.replace(/\\/g, '/')) || normFile.includes(sf.replace(/\\/g, '/')));
        if (!matchesScope) continue;
      }
      if (!f.pattern) continue;
      const re = new RegExp(f.pattern, 'i');
      if (re.test(content)) {
        findings.push({
          rule: 'forbid-list-violation',
          category: 'keep-forbid-contract',
          blocking: f.kind === 'symbol_import' || f.blocking !== false,
          itemId: f.id,
          sourceRef: f.sourceRef || '',
          file,
          detail: `Forbidden legacy symbol/placeholder "${f.pattern}" (${f.id}, ref: ${f.sourceRef || 'goal'}) found in ${file}.`,
        });
      }
    }
  }
  return findings;
}

export function scanSecretsAndSql(files, { root = process.cwd() } = {}) {
  const findings = [];
  for (const file of files) {
    if (TEST_FILE.test(file)) continue;
    const content = readFileSafe(root, file);
    if (!content) continue;

    const secret = liveSecret(content);
    if (secret) {
      findings.push({
        rule: 'live-secret',
        category: 'security',
        blocking: true,
        file,
        detail: `File contains an unmistakable ${secret}.`,
      });
    }

    const badPublic = PUBLIC_SECRET_BAD.exec(content);
    if (badPublic && !PUBLIC_ALLOWLIST.test(badPublic[0])) {
      findings.push({
        rule: 'public-secret-env',
        category: 'security',
        blocking: true,
        file,
        detail: `Client-exposed environment variable ${badPublic[0]} appears to hold a secret or service-role key.`,
      });
    }

    if (/\.sql$/i.test(file)) {
      if (/\bsecurity\s+definer\b/i.test(content) && !/\bset\s+search_path\b/i.test(content)) {
        findings.push({
          rule: 'sql-security-definer-search-path',
          category: 'security',
          blocking: false,
          disposition: 'advice',
          file,
          detail: 'SQL SECURITY DEFINER function should explicitly set search_path (e.g. SET search_path = public).',
        });
      }
      if (/\bcreate\s+policy\b[\s\S]{0,240}\bfor\s+(?:update|delete|all)\b[\s\S]{0,240}\busing\s*\(\s*true\s*\)/i.test(content)) {
        findings.push({
          rule: 'sql-permissive-mutation-policy',
          category: 'security',
          blocking: true,
          file,
          detail: 'RLS mutation policy uses USING (true) without an owner/tenant check (auth.uid()).',
        });
      }
    }
  }
  return findings;
}

export function checkTrustBaseline(root = process.cwd(), { update = false } = {}) {
  const watched = ['.mcp.json', '.claude/settings.json', 'hooks/hooks.json'];
  const current = {};
  for (const rel of watched) {
    const full = path.resolve(root, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      current[rel] = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }
  }
  const baselinePath = path.join(root, '.bgzflow', 'trust-baseline.json');
  if (update) {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify({ updatedAt: new Date().toISOString(), files: current }, null, 2) + '\n', 'utf8');
    return { ok: true, updated: true, files: current };
  }
  if (!fs.existsSync(baselinePath)) {
    return { ok: true, baselinePresent: false, files: current };
  }
  const saved = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const changed = [];
  for (const [rel, hash] of Object.entries(current)) {
    if (saved.files?.[rel] && saved.files[rel] !== hash) {
      changed.push(rel);
    }
  }
  return {
    ok: changed.length === 0,
    baselinePresent: true,
    changed,
    reason: changed.length ? `Trust-sensitive config changed since baseline: ${changed.join(', ')}` : undefined,
  };
}

function validHttpReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  const status = Number(receipt.status);
  const sha = String(receipt.responseSha256 || '').trim();
  const blockedStatus = status === 401 || status === 403 || status === 404 || (status === 200 && receipt.rowsReturned === 0);
  return blockedStatus && /^[a-f0-9]{64}$/i.test(sha) && !/^0+$/.test(sha);
}

export function validateTwoCustomerProbe(probe, { root = process.cwd() } = {}) {
  if (!probe || typeof probe !== 'object') {
    return { ok: false, blocking: false, verificationLevel: 'NOT_RUN', runtimeExecuted: false, reason: 'Probe spec must be a JSON object.' };
  }
  const env = String(probe.environment || '').trim().toLowerCase();
  const targetUrl = String(probe.targetUrl || '').trim().toLowerCase();
  // Condition from Claude Verdict #6: NEVER run on production customer rows.
  if (/(?:^|[^a-z])(?:prod|production|live)(?:[^a-z]|$)/i.test(env) || /(?:^|[^a-z])(?:prod|production|live)(?:[^a-z]|$)/i.test(targetUrl)) {
    return {
      ok: false,
      blocking: true,
      verificationLevel: 'NOT_RUN',
      runtimeExecuted: false,
      category: 'security',
      reason: 'Refused: two-customer isolation probe must run only on a preview, local or branch database with two test accounts, never on production.',
    };
  }
  const accountA = String(probe.testAccountA || '').trim();
  const accountB = String(probe.testAccountB || '').trim();
  if (!accountA || !accountB || accountA === accountB) {
    return {
      ok: false,
      blocking: false,
      verificationLevel: 'NOT_RUN',
      runtimeExecuted: false,
      reason: 'Two-customer probe requires two distinct test account IDs (testAccountA and testAccountB).',
    };
  }
  const crossReadBlocked = probe.crossReadBlocked === true;
  const crossWriteBlocked = probe.crossWriteBlocked === true;
  if (probe.crossReadBlocked === false || probe.crossWriteBlocked === false) {
    return {
      ok: false,
      blocking: true,
      verificationLevel: 'BUILT',
      runtimeExecuted: false,
      category: 'security',
      rule: 'cross-tenant-isolation',
      reason: `Cross-tenant isolation failure between ${accountA} and ${accountB} (crossReadBlocked=${crossReadBlocked}, crossWriteBlocked=${crossWriteBlocked}).`,
    };
  }

  const REPEATED_UUID_GROUP = /^([0-9a-f])\1{7}-([0-9a-f])\2{3}-([0-9a-f])\3{3}-([0-9a-f])\4{3}-([0-9a-f])\5{11}$/i;
  if (
    /^(?:synthetic|fake|placeholder)(?:[-_]|$)/i.test(accountA) ||
    /^(?:synthetic|fake|placeholder)(?:[-_]|$)/i.test(accountB) ||
    REPEATED_UUID_GROUP.test(accountA) ||
    REPEATED_UUID_GROUP.test(accountB) ||
    /invalid\.example|localhost:65534/i.test(targetUrl)
  ) {
    return {
      ok: false,
      blocking: false,
      refused: true,
      status: 'unverified_claim',
      verificationLevel: 'BUILT',
      runtimeExecuted: false,
      reason: 'Refused synthetic placeholder accounts or unreachable targetUrl; two-customer probe requires real preview/local execution via executeTwoCustomerProbe().',
    };
  }

  // Claude Verdict (23:06 BST):
  // Synchronous validateTwoCustomerProbe never sends network requests itself.
  // Caller-supplied booleans, typed HTTP receipts, or local commands top out at BUILT (record_only, ok: false, runtimeExecuted: false).
  // Isolation is proven only when async executeTwoCustomerProbe() sends live requests for both accounts itself (including Account A positive self-read).
  const hasReceiptOrCommand = Boolean(probe.readProbeReceipt || probe.writeProbeReceipt || probe.probeCommand || probe.evidenceFile);
  return {
    ok: false,
    blocking: false,
    status: hasReceiptOrCommand ? 'record_only' : 'unverified_claim',
    verificationLevel: 'BUILT',
    runtimeExecuted: false,
    environment: env || 'preview',
    testAccountA: accountA,
    testAccountB: accountB,
    reason: 'Synchronous validateTwoCustomerProbe checks record schema only (stays BUILT, runtimeExecuted: false); call async executeTwoCustomerProbe() so the tool sends authenticated requests for Account A (positive self-read) and Account B (cross-read/write blocked) itself.',
  };
}

export async function executeTwoCustomerProbe({
  environment = 'preview',
  targetUrl,
  selfReadUrl,
  readUrl,
  writeUrl,
  writeMethod = 'POST',
  writeBody = {},
  testAccountA,
  testAccountB,
  tokenA,
  tokenB,
  fetchImpl = globalThis.fetch,
} = {}) {
  const resolvedReadUrl = readUrl || targetUrl || '';
  const resolvedWriteUrl = writeUrl || targetUrl || '';
  const preCheck = validateTwoCustomerProbe({
    environment,
    targetUrl: targetUrl || resolvedReadUrl,
    testAccountA,
    testAccountB,
    crossReadBlocked: true,
    crossWriteBlocked: true,
  });
  if (preCheck.blocking || preCheck.refused) return preCheck;
  if (typeof fetchImpl !== 'function' || !resolvedReadUrl || !resolvedWriteUrl || !tokenA || !tokenB || tokenA === tokenB) {
    return {
      ok: false,
      blocking: false,
      verificationLevel: 'BUILT',
      runtimeExecuted: false,
      reason: 'executeTwoCustomerProbe requires distinct tokenA and tokenB, readUrl/targetUrl, writeUrl/targetUrl, and a live fetch implementation.',
    };
  }

  // 1. Positive self-read with tokenA: proves Account A's row actually exists (not a signed-out / empty table response)
  const headersA = { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' };
  const selfRes = await fetchImpl(selfReadUrl || resolvedReadUrl, { method: 'GET', headers: headersA });
  const selfText = await selfRes.text();
  let selfRows = 0;
  try {
    const parsed = JSON.parse(selfText);
    if (Array.isArray(parsed)) selfRows = parsed.length;
    else if (Array.isArray(parsed?.items)) selfRows = parsed.items.length;
    else if (parsed && typeof parsed === 'object' && parsed.ownerId === testAccountA) selfRows = 1;
  } catch {
    selfRows = 0;
  }
  if (selfRes.status !== 200 || selfRows < 1) {
    return {
      ok: false,
      blocking: false,
      verificationLevel: 'BUILT',
      runtimeExecuted: false,
      actualNetworkFetches: 1,
      reason: `Positive self-read for testAccountA (${testAccountA}) returned HTTP ${selfRes.status} with ${selfRows} rows; cannot prove isolation against an empty or unseeded account.`,
    };
  }
  const selfReadReceipt = {
    status: selfRes.status,
    rowsReturned: selfRows,
    responseSha256: createHash('sha256').update(selfText).digest('hex'),
  };

  // 2. Cross-tenant read with tokenB attempting to read Account A's resource
  const headersB = { authorization: `Bearer ${tokenB}`, 'content-type': 'application/json' };
  const readRes = await fetchImpl(resolvedReadUrl, { method: 'GET', headers: headersB });
  const readText = await readRes.text();
  let leakedAccountARows = 0;
  try {
    const parsed = JSON.parse(readText);
    if (Array.isArray(parsed)) {
      leakedAccountARows = parsed.filter((r) => !r?.ownerId || r.ownerId === testAccountA || r.user_id === testAccountA).length;
    } else if (Array.isArray(parsed?.items)) {
      leakedAccountARows = parsed.items.filter((r) => !r?.ownerId || r.ownerId === testAccountA || r.user_id === testAccountA).length;
    } else if (parsed?.ownerId === testAccountA) {
      leakedAccountARows = 1;
    }
  } catch {
    leakedAccountARows = 0;
  }
  const readBlocked = readRes.status === 401 || readRes.status === 403 || readRes.status === 404 || (readRes.status === 200 && leakedAccountARows === 0);
  const readProbeReceipt = {
    status: readRes.status,
    leakedAccountARows,
    responseSha256: createHash('sha256').update(readText).digest('hex'),
  };

  // 3. Cross-tenant write with tokenB attempting to mutate Account A's resource
  const writeRes = await fetchImpl(resolvedWriteUrl, { method: writeMethod, headers: headersB, body: JSON.stringify(writeBody) });
  const writeText = await writeRes.text();
  const writeBlocked = writeRes.status === 401 || writeRes.status === 403 || writeRes.status === 404;
  const writeProbeReceipt = {
    status: writeRes.status,
    responseSha256: createHash('sha256').update(writeText).digest('hex'),
  };

  if (!readBlocked || !writeBlocked) {
    return {
      ok: false,
      blocking: true,
      verificationLevel: 'BUILT',
      runtimeExecuted: true,
      actualNetworkFetches: 3,
      category: 'security',
      rule: 'cross-tenant-isolation',
      reason: `Cross-tenant isolation failure between ${testAccountA} and ${testAccountB} (readBlocked=${readBlocked}, writeBlocked=${writeBlocked}).`,
      executionProof: { mode: 'live_http_isolation', selfReadReceipt, readProbeReceipt, writeProbeReceipt },
    };
  }

  return {
    ok: true,
    blocking: false,
    status: 'passed',
    verificationLevel: 'USED',
    runtimeExecuted: true,
    actualNetworkFetches: 3,
    environment,
    testAccountA,
    testAccountB,
    crossReadBlocked: true,
    crossWriteBlocked: true,
    executionProof: {
      mode: 'live_http_isolation',
      selfReadReceipt,
      readProbeReceipt,
      writeProbeReceipt,
    },
  };
}

function runOptionalExternalScanners(root) {
  const results = {};
  for (const [name, args] of [
    ['gitleaks', ['detect', '--no-git', '--redact', '--source', root]],
    ['osv-scanner', ['scan', '--recursive', root]],
    ['semgrep', ['scan', '--quiet', '--error', root]],
  ]) {
    const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8', timeout: 3000 });
    if (which.status !== 0) {
      results[name] = { available: false };
      continue;
    }
    const r = spawnSync(name, args, { cwd: root, encoding: 'utf8', timeout: 20_000 });
    results[name] = { available: true, exitCode: r.status ?? 1, ok: r.status === 0 };
  }
  return results;
}

export function runScan({ root = process.cwd(), baseSha, files, probeFile, updateBaseline = false, runExternal = false } = {}) {
  let targetFiles = Array.isArray(files) && files.length ? files : [];
  if (!targetFiles.length && baseSha) {
    const r = spawnSync('git', ['diff', '--name-only', '--no-renames', baseSha, 'HEAD', '--'], { cwd: root, encoding: 'utf8' });
    if (r.status === 0) targetFiles = r.stdout.trim().split(/\r?\n/).filter(Boolean);
  }
  if (!targetFiles.length) {
    const r = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
    if (r.status === 0) targetFiles = r.stdout.trim().split(/\r?\n/).filter(Boolean).slice(0, 500);
  }

  const fakeEffects = scanFakeEffects(targetFiles, { root });
  const keepForbid = scanKeepAndForbidContract(targetFiles, { root });
  const security = scanSecretsAndSql(targetFiles, { root });
  const trust = checkTrustBaseline(root, { update: updateBaseline });
  const externalScanners = runExternal ? runOptionalExternalScanners(root) : undefined;
  let isolationProbe = null;
  if (probeFile) {
    const probeSpec = JSON.parse(fs.readFileSync(path.resolve(root, probeFile), 'utf8'));
    isolationProbe = validateTwoCustomerProbe(probeSpec, { root });
  }

  const findings = [...fakeEffects, ...keepForbid, ...security];
  if (!trust.ok) {
    findings.push({
      rule: 'trust-baseline-drift',
      category: 'security',
      blocking: false,
      disposition: 'advice',
      file: trust.changed.join(', '),
      detail: trust.reason,
    });
  }
  if (isolationProbe && !isolationProbe.ok) {
    findings.push({
      rule: isolationProbe.rule || 'two-customer-probe',
      category: 'security',
      blocking: isolationProbe.blocking === true,
      file: probeFile,
      detail: isolationProbe.reason,
    });
  }

  const blockers = findings.filter((f) => f.blocking === true);
  const advice = findings.filter((f) => f.blocking !== true);

  return {
    ok: blockers.length === 0,
    scannedFiles: targetFiles.length,
    blockers,
    advice,
    trustBaseline: trust,
    ...(externalScanners ? { externalScanners } : {}),
    ...(isolationProbe ? { isolationProbe } : {}),
  };
}

function parseArgs(argv) {
  const args = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--base') args.baseSha = argv[++i];
    else if (a === '--file' || a === '-f') args.files.push(argv[++i]);
    else if (a === '--probe') args.probeFile = argv[++i];
    else if (a === '--update-baseline') args.updateBaseline = true;
    else if (a === '--external') args.runExternal = true;
    else if (a === '--dir') args.root = path.resolve(argv[++i]);
  }
  return args;
}

const USAGE = `Usage: bgz scan [--base <git-ref>] [--file <path> ...] [--probe <two-customer-probe.json>] [--update-baseline] [--external] [--dir <project>]`;

if (isCommandEntry(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const result = runScan(args);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
}

