#!/usr/bin/env node
// Read-only view of local and overlay job records. Never cancels or rewrites a job.
import { collectStatus } from './lib.mjs';
import { status as gateStatus } from '../swarm-gate/swarm-gate.mjs';
import { findProjectDir } from '../../hooks/lib/project.mjs';

const usage = 'usage: swarm-status [project] [--hours <number>] [--json]';
try {
  const options = {};
  let json = false;
  let help = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') json = true;
    else if (arg === '--help' || arg === '-h') help = true;
    else if (arg === '--hours') {
      if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error('--hours needs a number');
      options.hours = Number(args[++i]);
    } else if (arg.startsWith('-')) throw new Error('unknown option');
    else if (options.project === undefined) options.project = arg;
    else throw new Error('only one project filter may be given');
  }
  if (help) console.log(usage);
  else {
    const result = collectStatus(options);
    result.gate = gateStatus(findProjectDir());
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Swarm jobs: active and uncertain records, plus results in the last ${result.hours}h. Remote liveness needs route evidence.`);
      const ids = (values) => `${values.length} (${values.join(', ') || 'none'})`;
      console.log(`Stale warnings: ${ids(result.staleIds)}; unknown records: ${ids(result.unknownIds)}; mirrored IDs counted once: ${ids(result.mirroredIds)}`);
      console.log(`Recent results: completed ${ids(result.completedIds)}, failed ${ids(result.failedIds)}, cancelled ${ids(result.cancelledIds)}`);
      for (const source of result.coverage) console.log(`COVERAGE: ${source.resource}: ${source.available ? 'record directory present' : 'unavailable'}; ${source.dir}`);
      console.log('Coverage is configured record roots only; providers without exported metadata are unobserved. Age and PID presence never prove job ownership.');
      const groups = new Map();
      for (const job of result.jobs) {
        if (!groups.has(job.project)) groups.set(job.project, []);
        groups.get(job.project).push(job);
      }
      if (!groups.size) console.log('No jobs in this window.');
      if (result.gate.active) {
        const g = result.gate;
        console.log(`GATE ${g.swarm}: jobs ${g.used.jobs}/${g.limit.jobs}; worker-hours ${g.used.workerHours.toFixed(2)}/${g.limit.workerHours}; reserve ${g.reserve.jobs} jobs/${g.reserve.workerHours}h; wave ${g.fixWaves}; release ${g.releaseOpen ? 'open' : 'closed'}`);
        for (const [step, b] of Object.entries(g.blocked)) console.log(`  BLOCKED ${step}: ${b.reason} Next: ${b.next}`);
        for (const [route, a] of Object.entries(g.allowance)) console.log(`  allowance ${route}: ${a.available ? a.usedPercent+'%' : 'unavailable'}`);
        console.log(`  escalated jobs ${g.escalated.jobs}; worker-hours ${g.escalated.workerHours.toFixed(2)}; monetary cost only when reported by a provider`);
        for(const p of g.escalated.reportedUsage)console.log(`  escalated provider usage ${p.id}: ${JSON.stringify(p.usage)}`);
        for(const [id,m]of Object.entries(g.modelMapping))console.log(`  models ${id}: age ${m.ageDays===null?'unknown':m.ageDays.toFixed(1)+'d'}; CLI ${m.cliVersion||'unknown'}; ${m.autoAdopted?'qualified change auto-adopted':m.proposal?'mapping proposal pending':'pinned mapping'}`);
        for(const j of g.judgments||[])console.log(`  Jev ${j.event}: ${j.decision}; model ${j.model||'unavailable'}; usage ${JSON.stringify(j.usage||'unavailable')}`);
        for(const w of (g.warnings||[]).slice(-3))console.log(`  WARNING: ${w.message}`);
      }
      for (const [project, jobs] of [...groups].sort()) {
        const count = (state) => jobs.filter((j) => j.status === state).length;
        console.log(`${project}: ${count('running')} running, ${count('queued')} queued, ${count('uncertain')} uncertain, ${count('completed')} done, ${count('failed')} failed`);
        for (const job of jobs) {
          const critical = job.criticalPath === null ? 'critical path unknown' : job.criticalPath ? 'critical path' : 'independent';
          console.log(`  ${job.status} ${job.id}: ${job.resource}; ${job.model || 'model unknown'}/${job.effort || 'effort unknown'}; ${critical}; owner ${job.owner || 'unknown'}`);
          if (job.summary) console.log(`    ${job.summary}`);
          if (job.waitingOn) console.log(`    waiting on: ${job.waitingOn}`);
          console.log(`    exit: ${job.exitCode ?? 'unknown'}; result: ${job.result || 'not recorded'}`);
          if (!job.active) console.log(`    result: ${job.resultFirstLine || '(no result text)'}; record: ${job.resultRecord}`);
          for (const flag of job.flags) console.log(`    ! ${flag}`);
        }
      }
      for (const gap of result.gaps) console.log(`GAP: ${gap}`);
      console.log('Only the recorded lead may stop its own jobs after reconciling identity and effects.');
    }
  }
} catch (err) {
  console.error(`swarm-status: ${err.message}\n${usage}`);
  process.exitCode = 2;
}
