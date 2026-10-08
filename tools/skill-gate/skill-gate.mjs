#!/usr/bin/env node
// skill-gate: a changed skill goes live only if its eval cases pass at least as often as on the previous plugin
// version, and no trigger case does worse than having no plugin at all.
//
//   skill-gate --skill <name> --candidate <result.json> --previous <result.json> [--none <result.json>]
//              [--threshold 1] [--out <report.json>] [--json]
//   skill-gate --run [--skill <name> ...] --previous <folder|git-ref> [--candidate <plugin-folder>]
//              [--runs N] [--threshold 1] [--model M] [--judge-model M] [--max-cost-usd N] [-j N]
//              [--allow-tools Write Edit ...] [--no-scaffold] [--work-dir <dir>] [--json]
//
// Exit 0: gate passed.  Exit 1: gate failed or a run could not finish.  Exit 2: bad usage.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compare, evalArgs, listSkillsWithEvals, loadResult, materialisePrevious, runEval, stagePlugin,
} from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function usage() {
  return [
    'usage: skill-gate --skill <name> --candidate <result.json> --previous <result.json> [--none <result.json>]',
    '                  [--threshold 1] [--out <report.json>] [--json]',
    '       skill-gate --run [--skill <name> ...] --previous <folder|git-ref> [--candidate <plugin-folder>]',
    '                  [--runs N] [--threshold 1] [--model M] [--judge-model M] [--max-cost-usd N] [-j N]',
    '                  [--allow-tools Write Edit ...] [--no-scaffold] [--work-dir <dir>] [--json]',
    '',
    'Compares `claude plugin eval` results for one skill: the candidate plugin, the previous plugin and no plugin',
    '(the candidate run\'s baseline arm unless --none is given). Passes only when the candidate\'s pass rate is at',
    'least the previous one\'s and no trigger-* case scores below no plugin. --run stages both plugin copies with',
    'the skill\'s cases from skills/<skill>/evals and runs them (real model calls on your account).',
    'Exit 0 = pass, 1 = fail, 2 = bad usage.',
  ].join('\n');
}

function parseArgs(argv) {
  const o = { skills: [], allowTools: null, scaffold: true, json: false, run: false, threshold: 1 };
  const need = (i, a) => {
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`${a} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--run') o.run = true;
    else if (a === '--json') o.json = true;
    else if (a === '--no-scaffold') o.scaffold = false;
    else if (a === '--skill') o.skills.push(need(i++, a));
    else if (a === '--allow-tools') {
      o.allowTools = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('-')) o.allowTools.push(argv[++i]);
    } else if (['--candidate', '--previous', '--none', '--out', '--model', '--judge-model', '--work-dir'].includes(a)) {
      o[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = need(i++, a);
    } else if (['--runs', '--threshold', '--max-cost-usd', '-j', '--concurrency'].includes(a)) {
      const v = Number(need(i++, a));
      if (!Number.isFinite(v) || v < 0) throw new Error(`${a} needs a number`);
      const key = { '--runs': 'runs', '--threshold': 'threshold', '--max-cost-usd': 'maxCostUsd', '-j': 'concurrency', '--concurrency': 'concurrency' }[a];
      o[key] = v;
    } else throw new Error(`unknown argument: ${a}`);
  }
  if (o.threshold > 1) throw new Error('--threshold is between 0 and 1');
  return o;
}

function writeReport(file, report) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
}

function compareMode(o) {
  if (o.skills.length !== 1 || !o.candidate || !o.previous) throw new Error('compare needs --skill, --candidate and --previous');
  const report = compare({
    skill: o.skills[0],
    candidate: loadResult(o.candidate),
    previous: loadResult(o.previous),
    none: o.none ? loadResult(o.none) : null,
    threshold: o.threshold,
  });
  const out = o.out || path.join(ROOT, '.tmp', 'skill-gate', `${o.skills[0]}-gate.json`);
  writeReport(out, { ...report, reportFile: out });
  return [{ ...report, reportFile: out }];
}

function runMode(o) {
  if (!o.previous) throw new Error('--run needs --previous <folder|git-ref>');
  const candidateRoot = path.resolve(o.candidate || ROOT);
  const skills = o.skills.length ? o.skills : listSkillsWithEvals(candidateRoot);
  if (!skills.length) throw new Error(`no skills/*/evals folders under ${candidateRoot}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const workDir = path.resolve(o.workDir || path.join(os.tmpdir(), `bgzflow-skill-gate-${stamp}`));
  fs.mkdirSync(workDir, { recursive: true });
  const log = (m) => process.stderr.write(`skill-gate: ${m}\n`);
  log(`work folder ${workDir}`);
  const previousRoot = materialisePrevious({ previous: o.previous, repoRoot: candidateRoot, workDir });

  const reports = [];
  for (const skill of skills) {
    const casesDir = path.join(candidateRoot, 'skills', skill, 'evals');
    if (!fs.existsSync(casesDir)) throw new Error(`no eval cases for ${skill} at ${casesDir}`);
    const files = {};
    for (const [side, src] of [['candidate', candidateRoot], ['previous', previousRoot]]) {
      const target = stagePlugin({ sourceRoot: src, casesDir, dest: path.join(workDir, skill, `${side}-plugin`) });
      const outputDir = path.join(workDir, skill, `${side}-results`);
      fs.mkdirSync(outputDir, { recursive: true });
      const jsonFile = path.join(outputDir, 'result.json');
      log(`${skill}: running ${side}`);
      runEval(
        evalArgs({
          target, jsonFile, outputDir, runs: o.runs, threshold: o.threshold, model: o.model, judgeModel: o.judgeModel,
          maxCostUsd: o.maxCostUsd, concurrency: o.concurrency, scaffold: o.scaffold, allowTools: o.allowTools ?? undefined,
        }),
        { jsonFile, log },
      );
      files[side] = jsonFile;
    }
    const report = compare({
      skill, candidate: loadResult(files.candidate), previous: loadResult(files.previous),
      none: o.none ? loadResult(o.none) : null, threshold: o.threshold,
    });
    const out = path.join(workDir, `${skill}-gate.json`);
    writeReport(out, { ...report, reportFile: out });
    reports.push({ ...report, reportFile: out });
  }
  return reports;
}

function main(argv) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`${e.message}\n${usage()}\n`);
    return 2;
  }
  if (o.help) {
    process.stdout.write(usage() + '\n');
    return 0;
  }
  let reports;
  try {
    reports = o.run ? runMode(o) : compareMode(o);
  } catch (e) {
    const bad = /needs|unknown argument/.test(e.message);
    process.stderr.write(`skill-gate: ${e.message}\n`);
    return bad ? 2 : 1;
  }
  const pass = reports.every((r) => r.verdict === 'pass');
  if (o.json) process.stdout.write(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2) + '\n');
  else {
    for (const r of reports) process.stdout.write(`${r.summary}\n  report: ${r.reportFile}\n`);
    if (reports.length > 1) process.stdout.write(`${pass ? 'PASS' : 'FAIL'}: ${reports.filter((r) => r.verdict === 'pass').length}/${reports.length} skills passed the gate.\n`);
  }
  return pass ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
