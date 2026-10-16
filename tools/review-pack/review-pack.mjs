#!/usr/bin/env node
// bgz review-pack — Blind Verifier Pack Generator (Priority 3, BGZFLOW 0.9.3).
// Strips the builder's handback prose, self-assessments and "done/passed" claims while keeping:
// 1. Raw git diff (including all code comments intact).
// 2. Requirements & decision files (DECISIONS.md, BRIEF.md).
// 3. Machine check/scan receipts (command argv, exitCode, counts, sha256).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROSE_KEYS = new Set([
  'summary',
  'narrative',
  'pitch',
  'explanation',
  'notes',
  'commentary',
  'selfAssessment',
  'whyItWorks',
  'builderClaim',
  'statusClaim',
  'verificationStatus',
]);

export function sanitizeHandbackForVerifier(handback) {
  if (!handback || typeof handback !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(handback)) {
    if (PROSE_KEYS.has(k)) continue;
    if (k === 'checks' && Array.isArray(v)) {
      clean.checks = v.map((c) => ({
        argv: c.argv,
        exitCode: c.exitCode,
        counts: c.counts,
        stdoutFile: c.stdoutFile,
      }));
      continue;
    }
    if (k === 'outcomeContract' && v && typeof v === 'object') {
      clean.outcomeContract = {
        used: v.used,
        surfaceEvidence: v.surfaceEvidence,
        surfaceStatus: v.surfaceStatus || 'available',
      };
      continue;
    }
    if (k === 'retiredGuards' && Array.isArray(v)) {
      clean.retiredGuards = v.map((g) => ({
        file: g.file,
        reason: g.reason,
        ...(g.replacementProof ? { replacementProof: g.replacementProof } : {}),
      }));
      continue;
    }
    if (['source', 'jobId', 'triageMode', 'operations'].includes(k)) {
      clean[k] = v;
    }
  }
  return clean;
}

export function buildReviewPack({ root = process.cwd(), baseSha = 'HEAD~1', headSha = 'HEAD', handbackFile, briefFile, decisionsFile = 'DECISIONS.md', outFile } = {}) {
  const diffRes = spawnSync('git', ['diff', '--no-ext-diff', baseSha, headSha, '--'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const rawDiff = diffRes.status === 0 ? diffRes.stdout : '';
  const filesRes = spawnSync('git', ['diff', '--name-only', '--no-renames', baseSha, headSha, '--'], {
    cwd: root,
    encoding: 'utf8',
  });
  const changedFiles = filesRes.status === 0 ? filesRes.stdout.trim().split(/\r?\n/).filter(Boolean) : [];

  let strippedHandback = null;
  if (handbackFile && fs.existsSync(path.resolve(root, handbackFile))) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(root, handbackFile), 'utf8'));
    strippedHandback = sanitizeHandbackForVerifier(raw);
  }

  const readOpt = (rel) => {
    if (!rel) return null;
    const p = path.resolve(root, rel);
    return fs.existsSync(p) && fs.statSync(p).isFile() ? fs.readFileSync(p, 'utf8').slice(0, 32768) : null;
  };

  const pack = {
    schema: 'bgzflow-review-pack-v1',
    createdAt: new Date().toISOString(),
    blindMode: 'builder-prose-stripped-source-and-comments-intact',
    baseSha,
    headSha,
    changedFiles,
    decisions: readOpt(decisionsFile),
    brief: readOpt(briefFile),
    machineHandback: strippedHandback,
    rawDiff,
  };

  if (outFile) {
    const dest = path.resolve(root, outFile);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(pack, null, 2) + '\n', 'utf8');
  }
  return pack;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--base') args.baseSha = argv[++i];
    else if (a === '--head') args.headSha = argv[++i];
    else if (a === '--handback') args.handbackFile = argv[++i];
    else if (a === '--brief') args.briefFile = argv[++i];
    else if (a === '--decisions') args.decisionsFile = argv[++i];
    else if (a === '--out' || a === '-o') args.outFile = argv[++i];
    else if (a === '--dir') args.root = path.resolve(argv[++i]);
  }
  return args;
}

const USAGE = `Usage: bgz review-pack [--base <ref>] [--head <ref>] [--handback <file.json>] [--brief <BRIEF.md>] [--decisions <DECISIONS.md>] [--out <pack.json>]`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const pack = buildReviewPack(args);
  console.log(JSON.stringify(pack, null, 2));
}
