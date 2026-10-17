import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  forgeSkill,
  checkHarmony,
  swapIn,
} from '../forge.mjs';

import {
  detectIdentityMode,
  lockIdentity,
  unlockForExploration,
  verifyExplorationRound,
  checkAntiSlop,
} from '../../taste/taste.mjs';

import {
  addFact,
  readFacts,
  searchFacts,
} from '../../facts/facts.mjs';

import {
  route,
  isDeterministicJob,
  leagueStandingsForRole,
} from '../../jev/rules.mjs';

import {
  checkHarmonyAndSanitization,
} from '../../jev/preflight.mjs';

const realHome = process.env.BGZFLOW_HOME || path.join(os.homedir(), '.bgzflow');
const realLucianEngineDir = path.join(realHome, 'lucian-engine');

describe('1. Deep-Source Skill Forge & Clean-Room REA Pipeline (Public Gate vs. Lucian Engine)', () => {
  let tmpDir;
  let envWithLucian;
  let envPublicOnly;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-forge-test-'));
    const lucianHome = path.join(tmpDir, 'bgz-home-lucian');
    const publicHome = path.join(tmpDir, 'bgz-home-public');
    fs.mkdirSync(path.join(lucianHome, 'lucian-engine'), { recursive: true });
    fs.mkdirSync(publicHome, { recursive: true });

    if (fs.existsSync(realLucianEngineDir)) {
      for (const f of fs.readdirSync(realLucianEngineDir)) {
        fs.copyFileSync(path.join(realLucianEngineDir, f), path.join(lucianHome, 'lucian-engine', f));
      }
    }
    envWithLucian = { ...process.env, BGZFLOW_HOME: lucianHome };
    envPublicOnly = { ...process.env, BGZFLOW_HOME: publicHome };
  });

  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('gates Deep-Source Skill Forging with lucianRequired=true when Lucian Engine is not installed (Public GitHub edition)', async () => {
    const res = await forgeSkill({
      name: 'public-test-skill',
      fromBook: 'some-book.md',
      env: envPublicOnly,
    });
    assert.equal(res.ok, false);
    assert.equal(res.lucianRequired, true);
    assert.match(res.err, /Lucian \(Coming Soon\)/);
  });

  it('forges a clean-room skill and spec from an REA target with observed/inferred/unknown tags when Lucian Engine is installed', async () => {
    const fakeSpec = path.join(tmpDir, 'sample-target-spec.md');
    fs.writeFileSync(
      fakeSpec,
      [
        '# Clean-Room Spec: Sample Target',
        '- Observed endpoint /api/v2/session returns status 200 with session state.',
        '- Likely uses optimistic state transitions before server confirmation.',
        '- Measure spring physics with stiffness: 320, damping: 28, mass: 1.',
        '- Verify layout contrast ratio >= 4.5 on mobile viewports.',
      ].join('\n'),
      'utf8'
    );

    const res = await forgeSkill({
      name: 'clean-checkout-flow',
      focus: 'session state and spring physics',
      fromRea: fakeSpec,
      projectDir: tmpDir,
      env: envWithLucian,
    });

    assert.equal(res.ok, true);
    assert.equal(res.valid, true);
    assert.equal(res.harmony.ok, true);
    assert.ok(res.cleanRoomSpecPath && fs.existsSync(res.cleanRoomSpecPath));
    assert.ok(res.epistemic.observed.length >= 1);
    assert.ok(res.epistemic.inferred.length >= 1);
    assert.ok(res.epistemic.unknown.length >= 1);
    assert.match(res.draft, /Epistemic grounding \(REA Clean-Room ledger\)/);
  });

  it('forges a viral content/ad playbook skill in REA content mode', async () => {
    const res = await forgeSkill({
      name: 'viral-hook-playbook',
      focus: 'short video ad hook retention and CTA',
      fromRea: 'competitor-reel-teardown',
      reaMode: 'content',
      projectDir: tmpDir,
      env: envWithLucian,
    });

    assert.equal(res.ok, true);
    assert.equal(res.valid, true);
    assert.match(res.draft, /Niche & Outlier Identification/);
    assert.match(res.draft, /Structural Hook Deconstruction/);
    assert.match(res.draft, /Brand Voice Layering/);
  });

  it('forges skills from book, video, paper, teardown, and source tokens while stripping foreign commands and bans', async () => {
    const bookFile = path.join(tmpDir, 'typography-chapter.md');
    const foreignCmd = `/${['claude-', 'flow'].join('')}:swarm`;
    fs.writeFileSync(
      bookFile,
      [
        `- Set body measure between 60ch and 70ch and verify line-height ratio >= 1.5 for long-form reading.`,
        `- Run ${foreignCmd} and never use serif fonts in any product.`,
        `--surface-elevated: #141619;`,
        `stiffness: 280, damping: 26`,
      ].join('\n'),
      'utf8'
    );

    const res = await forgeSkill({
      name: 'editorial-type-scale',
      focus: 'typography measure and ratio',
      fromBook: bookFile,
      projectDir: tmpDir,
      env: envWithLucian,
    });

    assert.equal(res.ok, true);
    assert.equal(res.valid, true);
    assert.equal(res.harmony.ok, true);
    assert.ok(!res.draft.includes(foreignCmd));
    assert.ok(!/never use serif/i.test(res.draft));

    const staged = swapIn({
      skill: res.skill,
      draftFile: res.draftFile,
      sourceKind: res.sourceKind,
      sourceLabel: res.sourceLabel,
      env: envWithLucian,
    });
    assert.equal(staged.ok, true);
    assert.ok(fs.existsSync(staged.liveTarget));
  });

  it('checkHarmony() flags foreign slash routers, competing task boards, blanket bans, and competitor copying', () => {
    const foreignRouter = `/${['ruf', 'lo'].join('')}:start`;
    const badDraft = [
      '---',
      'name: bad-skill',
      'description: Bad skill',
      '---',
      `1. Run ${foreignRouter} and create a new task board in todo.md.`,
      '2. Always use dark mode and copy the exact hex palette from Linear.',
    ].join('\n');
    const h = checkHarmony(badDraft);
    assert.equal(h.ok, false);
    assert.ok(h.issues.some((i) => i.kind === 'foreign-command-router'));
    assert.ok(h.issues.some((i) => i.kind === 'contradictory-ban-or-board'));
    assert.ok(h.issues.some((i) => i.kind === 'clean-room-violation'));
  });
});

describe('2. Mechanical Identity Lock vs. Explore Mode (`tools/taste/taste.mjs`)', () => {
  let tmpDir;
  let envWithLucian;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-taste-test-'));
    const lucianHome = path.join(tmpDir, 'bgz-home');
    fs.mkdirSync(path.join(lucianHome, 'lucian-engine'), { recursive: true });
    if (fs.existsSync(realLucianEngineDir)) {
      for (const f of fs.readdirSync(realLucianEngineDir)) {
        fs.copyFileSync(path.join(realLucianEngineDir, f), path.join(lucianHome, 'lucian-engine', f));
      }
    }
    envWithLucian = { ...process.env, BGZFLOW_HOME: lucianHome };
  });

  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('defaults to LOCKED_IDENTITY when DECISIONS.md or taste-lock.json exists, blocking unrequested full redesign rounds', async () => {
    const existingProj = path.join(tmpDir, 'existing-app');
    fs.mkdirSync(existingProj, { recursive: true });
    fs.writeFileSync(path.join(existingProj, 'DECISIONS.md'), '# Product vision locked\n', 'utf8');

    const mode = detectIdentityMode(existingProj, envWithLucian);
    assert.equal(mode.mode, 'LOCKED_IDENTITY');

    const round = await verifyExplorationRound({ candidates: [], dir: existingProj, env: envWithLucian });
    assert.equal(round.ok, false);
    assert.equal(round.mode, 'LOCKED_IDENTITY');
    assert.match(round.err, /LOCKED/);
  });

  it('locks identity, detects unapproved hex drift in checkAntiSlop, and unlocks only with explicit --explore', async () => {
    const proj = path.join(tmpDir, 'locked-brand');
    fs.mkdirSync(proj, { recursive: true });
    const locked = await lockIdentity({
      dir: proj,
      project: 'locked-brand',
      palette: ['#FAF7F2', '#18181B', '#E11D48'],
      fonts: ['Plus Jakarta Sans', 'Inter'],
      layout: 'no-scroll-4-row-card',
      axes: { theme: 'light', density: 'compact', typography: 'humanist', navigation: 'bottom-tabs' },
      env: envWithLucian,
    });
    assert.equal(locked.ok, true);
    assert.equal(locked.mode, 'LOCKED_IDENTITY');

    const uiFile = path.join(proj, 'Screen.tsx');
    fs.writeFileSync(
      uiFile,
      `export const Screen = () => <div style={{ color: '#FF00FF', transition: 'all 200ms' }}>Unleash your synergy</div>;`,
      'utf8'
    );

    const slop = checkAntiSlop(uiFile, { dir: proj, env: envWithLucian });
    assert.equal(slop.ok, false);
    assert.ok(slop.findings.some((f) => f.kind === 'locked-palette-drift'));
    assert.ok(slop.findings.some((f) => f.kind === 'ai-cliche-copy'));
    assert.ok(slop.findings.some((f) => f.kind === 'transition-all'));

    const unlocked = unlockForExploration({ dir: proj, reason: 'Owner requested new brand exploration' });
    assert.equal(unlocked.mode, 'EXPLORE_NEW');
    assert.equal(detectIdentityMode(proj, envWithLucian).mode, 'EXPLORE_NEW');
  });

  it('enforces >= 8 directions, >= 4 layouts, >= 3 light/dark, and >= 3 axis differences from recent history in EXPLORE_NEW mode', async () => {
    const greenfield = path.join(tmpDir, 'new-product');
    fs.mkdirSync(greenfield, { recursive: true });
    assert.equal(detectIdentityMode(greenfield, envWithLucian).mode, 'EXPLORE_NEW');

    const candidates = [
      { id: 'd1', layout: 'editorial-split', axes: { theme: 'light', density: 'airy', typography: 'serif-editorial', navigation: 'top-rail', surface: 'paper', motion: 'subtle', grid: 'asymmetric', accent: 'cobalt' } },
      { id: 'd2', layout: 'dense-workbench', axes: { theme: 'dark', density: 'dense', typography: 'mono-technical', navigation: 'left-command', surface: 'matte-slate', motion: 'snappy', grid: '12-col', accent: 'amber' } },
      { id: 'd3', layout: 'canvas-spatial', axes: { theme: 'light', density: 'balanced', typography: 'geometric-sans', navigation: 'floating-dock', surface: 'warm-stone', motion: 'spring', grid: 'freeform', accent: 'emerald' } },
      { id: 'd4', layout: 'timeline-stream', axes: { theme: 'dark', density: 'spacious', typography: 'grotesk-display', navigation: 'split-pane', surface: 'obsidian', motion: 'cinematic', grid: 'single-column', accent: 'crimson' } },
      { id: 'd5', layout: 'editorial-split', axes: { theme: 'light', density: 'dense', typography: 'humanist-sans', navigation: 'drawer', surface: 'linen', motion: 'crisp', grid: 'modular', accent: 'indigo' } },
      { id: 'd6', layout: 'dense-workbench', axes: { theme: 'dark', density: 'airy', typography: 'serif-editorial', navigation: 'top-rail', surface: 'charcoal', motion: 'gentle', grid: 'asymmetric', accent: 'teal' } },
      { id: 'd7', layout: 'canvas-spatial', axes: { theme: 'light', density: 'spacious', typography: 'mono-technical', navigation: 'split-pane', surface: 'ivory', motion: 'snappy', grid: '12-col', accent: 'vermilion' } },
      { id: 'd8', layout: 'timeline-stream', axes: { theme: 'dark', density: 'balanced', typography: 'geometric-sans', navigation: 'floating-dock', surface: 'ink', motion: 'spring', grid: 'modular', accent: 'gold' } },
    ];

    const res = await verifyExplorationRound({ candidates, dir: greenfield, env: envWithLucian });
    assert.equal(res.ok, true);
    assert.equal(res.candidates, 8);
    assert.equal(res.distinctLayouts, 4);
    assert.equal(res.lightCount, 4);
    assert.equal(res.darkCount, 4);
  });
});

describe('3. Hybrid SQLite FTS5 BM25 + Recency Decay Search (`tools/facts/facts.mjs`)', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-facts-fts-'));
  });

  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('ranks matching facts by FTS5 BM25 + path-glob boost + 90-day recency decay', async () => {
    const f1 = addFact(tmpDir, { text: 'Checkout webhook uses HMAC SHA-256 signature verification on raw body', paths: ['src/payments/**'], source: 'lead' });
    addFact(tmpDir, { text: 'Onboarding screen uses 4-row non-scrolling card layout', paths: ['src/onboarding/**'], source: 'lead' });

    const { facts } = readFacts(tmpDir);
    const res = await searchFacts(facts, { query: 'HMAC webhook signature', files: ['src/payments/webhook.ts'], limit: 5 });
    assert.ok(Array.isArray(res) && res.length >= 1);
    assert.equal(res[0].id, f1.added[0].id);
    assert.ok(typeof res[0].score === 'number');
  });
});

describe('4. League-Driven Router & Tier 0 Deterministic Bypass (`tools/jev/rules.mjs`)', () => {
  let tmpDir;
  let env;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-route-test-'));
    env = { ...process.env, BGZFLOW_HOME: tmpDir };
  });

  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('bypasses model calls with tier=deterministic for mechanical commands', async () => {
    assert.ok(isDeterministicJob('prettier --write src/index.ts'));
    const r = await route('sha256 checksum of dist/bundle.js', { env });
    assert.equal(r.ok, true);
    assert.equal(r.tier, 'deterministic');
    assert.equal(r.cost_usd, 0);
  });

  it('returns outcome-weighted role standings from performance.jsonl', async () => {
    const perfFile = path.join(tmpDir, 'performance.jsonl');
    fs.writeFileSync(
      perfFile,
      [
        JSON.stringify({ worker: 'claude-opus', role: 'ui-slice', total: 3.8, pass_first_time: true, rework: false, regression_within_7d: false }),
        JSON.stringify({ worker: 'claude-opus', role: 'ui-slice', total: 3.9, pass_first_time: true, rework: false, regression_within_7d: false }),
        JSON.stringify({ worker: 'codex-sol', role: 'ui-slice', total: 2.5, pass_first_time: false, rework: true, regression_within_7d: false }),
      ].join('\n') + '\n',
      'utf8'
    );

    const standings = leagueStandingsForRole('ui-slice', env);
    assert.equal(standings.length, 2);
    assert.equal(standings[0].worker, 'claude-opus');
    assert.ok(standings[0].leagueScore > standings[1].leagueScore);

    const routed = await route('build complex multi-screen ui-slice with animation', { role: 'ui-slice', env });
    assert.equal(routed.recommended_worker, 'claude-opus');
  });
});

describe('5. Cross-Skill Harmony & Sanitization Linter (`tools/jev/preflight.mjs --harmony`)', () => {
  it('verifies zero unsanitized external skill credits and zero contradictory global bans across skills/', () => {
    const res = checkHarmonyAndSanitization();
    assert.equal(res.ok, true, `Unexpected harmony/sanitization findings: ${JSON.stringify(res.findings)}`);
  });
});
