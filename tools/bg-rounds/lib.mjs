// bg-rounds ledger: counts repair rounds per work package so a repair loop cannot run past its cap.
// Repair loops ran 11 rounds because nothing counted them. Finding IDs are stable across rounds.
//
//   round 0  the check that opened the findings
//   round 1  first repair round      (free)
//   round 2  second repair round     (free)
//   round 3+ needs an explicit approval line, which is recorded in the ledger
//
// Ledger file: <project>/.bgzflow/rounds.json. Every time comes from the real clock.
import fs from 'node:fs';
import path from 'node:path';

export const FREE_ROUNDS = 2;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const LOCK_WAIT_MS = 3000;
const LOCK_STALE_MS = 30000;

export class LedgerError extends Error {}

export const ledgerPath = (projectDir) => path.join(projectDir, '.bgzflow', 'rounds.json');

export function validId(id, what = 'id') {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new LedgerError(`${what} "${String(id).slice(0, 40)}" is not valid (letters, digits, . _ - ; up to 64 characters)`);
  }
  return id;
}

export function readLedger(projectDir) {
  let text;
  try {
    text = fs.readFileSync(ledgerPath(projectDir), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { version: 1, packages: {} };
    throw new LedgerError(`cannot read ${ledgerPath(projectDir)}: ${err.message}`);
  }
  try {
    const ledger = JSON.parse(text);
    if (!ledger || typeof ledger !== 'object' || typeof ledger.packages !== 'object' || ledger.packages === null) throw new Error('missing "packages"');
    return ledger;
  } catch (err) {
    // Never reset a damaged ledger: that would silently restart the round count.
    throw new LedgerError(`${ledgerPath(projectDir)} is damaged (${err.message}); restore it from .bgzflow/snapshots/ instead of deleting it`);
  }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Read-modify-write under a lock file so two agents do not lose each other's update.
export function updateLedger(projectDir, mutate) {
  const file = ledgerPath(projectDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  const start = Date.now();
  let fd;
  for (;;) {
    try {
      fd = fs.openSync(lock, 'wx');
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.rmSync(lock, { force: true });
      } catch {
        // the lock vanished: try again
      }
      if (Date.now() - start > LOCK_WAIT_MS) throw new LedgerError('the ledger is locked by another process; try again');
      sleepSync(40);
    }
  }
  try {
    const ledger = readLedger(projectDir);
    const result = mutate(ledger);
    if (result && result.save === false) return result;
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, file);
    return result;
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lock, { force: true });
  }
}

const nowIso = () => new Date().toISOString();

function packageOf(ledger, name, create) {
  validId(name, 'package');
  if (!ledger.packages[name]) {
    if (!create) throw new LedgerError(`package "${name}" has no findings yet; run: bg-rounds open ${name} <finding-id>...`);
    ledger.packages[name] = { round: 0, findings: {}, history: [] };
  }
  return ledger.packages[name];
}

export const openIds = (pkg) => Object.keys(pkg.findings).filter((id) => pkg.findings[id].status === 'open');

// Open findings (or note that they are still open). Stable IDs: an existing ID keeps its identity and history.
export function openFindings(projectDir, name, ids) {
  if (!ids.length) throw new LedgerError('give at least one finding ID');
  ids.forEach((id) => validId(id, 'finding ID'));
  return updateLedger(projectDir, (ledger) => {
    const pkg = packageOf(ledger, name, true);
    const report = [];
    for (const id of new Set(ids)) {
      const f = pkg.findings[id];
      if (!f) {
        pkg.findings[id] = { status: 'open', openedRound: pkg.round, openedAt: nowIso(), seenInRounds: [pkg.round] };
        report.push({ id, change: 'opened' });
      } else {
        const wasClosed = f.status === 'closed';
        f.status = 'open';
        delete f.closedRound;
        delete f.closedAt;
        if (!f.seenInRounds.includes(pkg.round)) f.seenInRounds.push(pkg.round);
        if (wasClosed) f.reopened = (f.reopened || 0) + 1;
        report.push({ id, change: wasClosed ? 'reopened' : 'still open' });
      }
    }
    return { report, round: pkg.round, open: openIds(pkg) };
  });
}

export function closeFindings(projectDir, name, ids) {
  if (!ids.length) throw new LedgerError('give at least one finding ID');
  return updateLedger(projectDir, (ledger) => {
    const pkg = packageOf(ledger, name, false);
    const unknown = ids.filter((id) => !pkg.findings[id]);
    if (unknown.length) throw new LedgerError(`unknown finding ID(s) in ${name}: ${unknown.join(', ')}`);
    for (const id of new Set(ids)) {
      const f = pkg.findings[id];
      if (f.status !== 'closed') Object.assign(f, { status: 'closed', closedRound: pkg.round, closedAt: nowIso() });
    }
    return { round: pkg.round, open: openIds(pkg) };
  });
}

// Start the next repair round. Refused (status "refused") when it would be round 3 or later without approval.
export function nextRound(projectDir, name, { approvedBy, dryRun = false } = {}) {
  const approval = typeof approvedBy === 'string' ? approvedBy.trim() : '';
  if (approvedBy !== undefined && (approval.length < 3 || approval.length > 200)) {
    throw new LedgerError('--approved-by needs who and when, for example --approved-by "Founder, 2026-01-31 14:05"');
  }
  return updateLedger(projectDir, (ledger) => {
    const pkg = packageOf(ledger, name, false);
    const open = openIds(pkg);
    if (!open.length) return { status: 'nothing-to-repair', round: pkg.round, open, save: false };
    const round = pkg.round + 1;
    if (round > FREE_ROUNDS && !approval) {
      return { status: 'refused', round, open, save: false };
    }
    if (dryRun) return { status: 'would-start', round, open, approved: round > FREE_ROUNDS ? approval : undefined, save: false };
    pkg.round = round;
    const entry = { round, at: nowIso(), open };
    if (round > FREE_ROUNDS) {
      entry.approvedBy = approval;
      entry.approvedAt = entry.at;
    }
    pkg.history.push(entry);
    for (const id of open) if (!pkg.findings[id].seenInRounds.includes(round)) pkg.findings[id].seenInRounds.push(round);
    return { status: 'started', round, open, approved: entry.approvedBy };
  });
}

export function summarize(ledger, only) {
  const names = Object.keys(ledger.packages).filter((n) => !only || n === only).sort();
  if (only && !names.length) throw new LedgerError(`package "${only}" is not in the ledger`);
  return names.map((name) => {
    const pkg = ledger.packages[name];
    const open = openIds(pkg);
    const nextNeedsApproval = pkg.round + 1 > FREE_ROUNDS;
    return {
      package: name,
      round: pkg.round,
      open,
      closed: Object.keys(pkg.findings).filter((id) => pkg.findings[id].status === 'closed'),
      nextRound: open.length ? pkg.round + 1 : undefined,
      nextNeedsApproval: open.length ? nextNeedsApproval : false,
      findings: pkg.findings,
      history: pkg.history,
    };
  });
}
