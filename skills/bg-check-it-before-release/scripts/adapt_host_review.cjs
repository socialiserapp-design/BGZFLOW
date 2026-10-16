#!/usr/bin/env node
// OPTIONAL HOST ADAPTER EXAMPLE. Controller-side record adapter: no model calls, no approval and
// no host-state mutation. It turns one host's review output into the evidence gate's inputs
// (inspection result, receipt and controller capture) after checking that output against the
// pinned contract. Run it from the controller's protected folder, not from the builder's or the
// checker's writable workspace.
//
// It expects the input shapes described in references/inspection.md ("Optional host adapter
// example"): a raw review, the independent checker's coverage, the controller's observation and
// a normalised host record. For another host, write a small shim that produces the host record
// from that host's own stored job, or copy this file and change only the parsing; keep every check.
//
//   node adapt_host_review.cjs --root PROJECT --contract contract.json --contract-sha256 PIN
//     --raw raw-review.json --raw-sha256 HASH --assessment coverage.json --assessment-sha256 HASH
//     --observation observation.json --observation-sha256 HASH --out NEW_RELATIVE_FOLDER
//
// Adapter success is not a gate pass: run scripts/evidence_gate.py afterwards. Independent
// acceptance stays with the lead.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const text = x => typeof x === 'string' && x.trim() && !['unknown', 'pending'].includes(x.toLowerCase());
// Windows tools may write a UTF-8 byte-order mark; the Python gate tolerates it too.
const parse = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const same = (a, b, message) => assert.deepEqual(a, b, message);
const exactIds = (actual, expected, label) => {
  assert(Array.isArray(actual) && actual.every(text) && new Set(actual).size === actual.length, label);
  same([...actual].sort(), [...expected].sort(), label);
};

// The host's own stored job record, not the controller's observation, must show that the review
// ran on the pinned repository, base and candidate commit. contract.source.repository is the
// candidate's Git root path; base and revision are full commit SHAs.
function bindTarget(stored, source) {
  const target = stored.target || {};
  assert(target.base === source.base, 'host review base differs from pinned source');
  const real = dir => {
    assert(text(dir), 'host review repository missing');
    const p = fs.realpathSync.native(dir);
    return process.platform === 'win32' ? p.toLowerCase() : p;
  };
  const repo = real(source.repository);
  assert(real(stored.workspace_root) === repo && real(target.repository) === repo, 'host review repository differs from pinned source');
  const git = (...args) => cp.execFileSync('git', ['-C', repo, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  assert(/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(source.revision), 'pinned revision must be a full commit SHA');
  assert.equal(git('rev-parse', 'HEAD'), source.revision, 'host review repository is not at the pinned candidate');
  const mergeBase = git('merge-base', source.revision, source.base);
  assert.equal(target.merge_base, mergeBase, 'host review diff differs from pinned candidate range');
  const committed = Number(git('show', '-s', '--format=%ct', source.revision)) * 1000;
  const started = Date.parse(stored.started_at), completed = Date.parse(stored.completed_at);
  assert(started >= committed && completed >= started, 'host review predates the pinned candidate (stale review)');
}

function adapt(options) {
  const root = fs.realpathSync(options.root);
  const local = name => {
    assert(text(name) && !path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'relative evidence path required');
    const file = path.resolve(root, name);
    const real = fs.realpathSync(file);
    assert(real.startsWith(root + path.sep), 'evidence escapes root');
    return real;
  };
  const read = ref => {
    assert(ref && /^[a-f0-9]{64}$/.test(ref.sha256), 'SHA256 pin required');
    const bytes = fs.readFileSync(local(ref.path));
    assert.equal(hash(bytes), ref.sha256, 'evidence hash mismatch: ' + ref.path);
    return bytes;
  };
  const input = key => {
    const ref = {path: options[key], sha256: options[key + '-sha256']};
    const bytes = read(ref);
    return {ref, bytes, value: parse(bytes)};
  };
  const contractInput = input('contract'), rawInput = input('raw'), assessmentInput = input('assessment'), observedInput = input('observation');
  const c = contractInput.value, raw = rawInput.value, a = assessmentInput.value, o = observedInput.value;
  const binding = {schema_version: 2, task_id: c.task_id, contract_sha256: contractInput.ref.sha256};
  assert.equal(c.schema_version, 2, 'contract schema');
  assert.equal(c.skill, 'bg-check-it-before-release', 'adapter produces an assessment receipt');
  for (const value of [a, o]) for (const [key, expected] of Object.entries(binding)) same(value[key], expected, 'contract binding: ' + key);
  assert.equal(o.status, 'completed', 'host review must be completed');
  assert.equal(o.job_class, 'review', 'use observed review-class job');
  same(o.source, c.source, 'observed target differs from pinned source');
  const reviewer = o.reviewer;
  assert(reviewer && text(reviewer.provider) && reviewer.fresh === true && reviewer.read_only === true && reviewer.resumed === false, 'fresh read-only reviewer with an observed provider required');
  for (const key of ['job_id', 'thread_id']) assert(text(reviewer[key]) && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(reviewer[key]), 'observed reviewer identity required');
  assert(Array.isArray(c.builders) && c.builders.length, 'contributing builders required');
  for (const b of c.builders) {
    assert(text(b.job_id) && text(b.thread_id), 'builder identity required');
    assert(reviewer.job_id !== b.job_id && reviewer.thread_id !== b.thread_id, 'reviewer is same as contributing builder');
  }
  same(a.reviewer, reviewer, 'coverage reviewer must match observed checker');
  const host = parse(read(o.host_trace));
  for (const job of [host.response, host.stored]) {
    assert(job && job.id === reviewer.job_id && job.thread_id === reviewer.thread_id && job.status === 'completed', 'observed identity/status differs from host result');
    assert(job.job_class === 'review' && job.write === false, 'host must be a read-only review-class job');
  }
  assert.equal(host.stored.exit_code, 0, 'host review execution failed');
  assert.equal(host.stored.raw_output, rawInput.bytes.toString('utf8'), 'raw review differs from preserved host output');
  bindTarget(host.stored, c.source);
  // A host's target metadata records a merge-base, not the reviewed HEAD. Require
  // the controller's separately protected launch/completion capture as well.
  const target = parse(read(o.review_target));
  for (const [key, expected] of Object.entries(binding)) same(target[key], expected, 'review target binding: ' + key);
  same(target.repository, c.source.repository, 'review target repository');
  for (const key of ['job_id', 'thread_id']) same(target[key], reviewer[key], 'review target identity');
  for (const key of ['launch_head', 'completion_head']) same(target[key], c.source.revision, 'reviewed HEAD differs from contract revision: ' + key);
  assert(['approve', 'needs-attention'].includes(raw.verdict), 'invalid host verdict');
  assert(text(raw.summary) && Array.isArray(raw.findings) && Array.isArray(raw.next_steps) && raw.next_steps.every(text), 'malformed host review');
  const ids = [...c.required_checks, ...c.candidate_requirements];
  exactIds(ids, ids, 'duplicate contract IDs');
  assert(Array.isArray(a.coverage), 'independent coverage required');
  exactIds(a.coverage.map(r => r.id), ids, 'coverage must account for every done-when check');
  assert(Array.isArray(o.changed_files), 'controller changed-file inventory required');
  const files = [...new Set([...c.candidate_files.map(r => r.path), ...o.changed_files])];
  assert(Array.isArray(a.file_coverage), 'independent file coverage required');
  exactIds(a.file_coverage.map(r => r.path), files, 'file coverage must account for every candidate and changed file (including deletions)');
  for (const row of a.file_coverage) assert(text(row.conclusion) && Array.isArray(row.check_ids) && row.check_ids.length && row.check_ids.every(id => ids.includes(id)), 'file coverage needs conclusion and check bindings');
  for (const ref of [...c.candidate_files, ...(c.config_files || []), ...(c.environment_files || [])]) read(ref);
  assert(Array.isArray(a.findings) && Array.isArray(a.limitations) && a.limitations.every(text), 'findings and explicit limitations required');
  assert(Array.isArray(a.raw_finding_ids) && a.raw_finding_ids.length === raw.findings.length && new Set(a.raw_finding_ids).size === a.raw_finding_ids.length, 'every raw finding requires its own retained mapping');
  const findings = structuredClone(a.findings);
  const byId = new Map(findings.map(f => [f.id, f]));
  assert.equal(byId.size, findings.length, 'duplicate finding');
  for (const f of findings) {
    assert(['id', 'owner', 'next_action', 'closure_requirement'].every(k => text(f[k])), 'finding accountability');
    assert(['critical', 'high', 'medium', 'low'].includes(f.severity) && ['open', 'closed'].includes(f.status), 'finding state');
    assert(Array.isArray(f.requirement_ids) && f.requirement_ids.length && f.requirement_ids.every(id => ids.includes(id)), 'finding requirement bindings');
    if (f.status === 'closed') assert(Array.isArray(f.closure_check_ids) && f.closure_check_ids.length && f.closure_check_ids.every(id => a.coverage.some(r => r.id === id && r.status === 'pass')), 'closed finding needs passing checks');
  }
  raw.findings.forEach((f, i) => {
    const mapped = byId.get(a.raw_finding_ids[i]);
    assert(mapped && mapped.status === 'open' && mapped.severity === f.severity, 'raw finding cannot be dropped, closed or downgraded');
    assert(['title', 'body', 'file'].every(k => text(f[k])) && typeof f.recommendation === 'string' && Number.isInteger(f.line_start) && f.line_start > 0 && Number.isInteger(f.line_end) && f.line_end >= f.line_start && typeof f.confidence === 'number' && f.confidence >= 0 && f.confidence <= 1, 'malformed raw finding');
    mapped.host_finding = f;
  });
  for (const old of c.prior_findings) {
    const f = byId.get(old.id); assert(f, 'prior finding dropped');
    for (const key of ['owner', 'requirement_ids', 'closure_requirement']) same(f[key], old[key], 'prior finding lineage changed');
  }
  const artifacts = new Map();
  const fileRef = ref => { const bytes = read(ref); artifacts.set(ref.path + ':' + ref.sha256, ref); return bytes; };
  const evidence = (ref, id, status, depth = 0) => {
    assert(depth <= 1, 'nested evidence cycle');
    const item = parse(fileRef(ref));
    for (const [key, expected] of Object.entries(binding)) same(item[key], expected, 'evidence binding');
    same(item.check_id, id, 'evidence check'); same(item.status, status, 'evidence status');
    if (item.kind === 'document') { assert(Array.isArray(item.sources) && item.sources.length, 'document sources required'); item.sources.forEach(fileRef); }
    else if (item.kind === 'command') { fileRef(item.stdout); fileRef(item.stderr); }
    else if (item.kind === 'visual') {
      ['decision', 'approved_tokens', 'reference_screenshot', 'running_screenshot'].forEach(k => fileRef(item[k]));
      ['token_guard', 'overflow_check'].forEach(k => evidence(item[k], id, parse(read(item[k])).status, depth + 1));
    } else assert(item.kind === 'gap' && ['blocked', 'unknown'].includes(status), 'unsupported evidence kind');
  };
  for (const row of a.coverage) {
    assert(['pass', 'fail', 'blocked', 'unknown'].includes(row.status) && Array.isArray(row.evidence) && row.evidence.length, 'coverage status/evidence');
    row.evidence.forEach(ref => evidence(ref, row.id, row.status));
    if (row.status !== 'pass') {
      const f = byId.get(row.finding?.id);
      assert(f && f.status === 'open' && f.requirement_ids.includes(row.id), 'non-pass coverage needs open finding');
      for (const k of ['owner', 'next_action']) same(row.finding[k], f[k], 'finding ownership');
    }
  }
  const defect = raw.findings.length > 0 || a.coverage.some(r => r.status === 'fail') || findings.some(f =>
    f.status === 'open' && !f.requirement_ids.every(id => a.coverage.some(r => r.id === id && ['blocked', 'unknown'].includes(r.status))));
  const unavailable = a.coverage.some(r => ['blocked', 'unknown'].includes(r.status));
  const verdict = defect ? 'changes-required' : (unavailable || raw.verdict === 'needs-attention') ? 'blocked' : 'ready';
  if (raw.verdict === 'needs-attention' && !raw.findings.length) assert(a.limitations.length, 'unexplained host rejection');
  const out = options.out;
  assert(text(out) && !path.isAbsolute(out) && !out.split(/[\\/]/).includes('..'), 'relative new output directory required');
  const directory = path.resolve(root, out);
  assert(fs.realpathSync(path.dirname(directory)).startsWith(root + path.sep) || fs.realpathSync(path.dirname(directory)) === root, 'output escapes root');
  fs.mkdirSync(directory); // Never overwrite an earlier capture.
  const write = (name, bytes) => {
    fs.writeFileSync(path.join(directory, name), bytes, {flag: 'wx'});
    return {path: path.relative(root, path.join(directory, name)).split(path.sep).join('/'), sha256: hash(bytes)};
  };
  const json = (name, value) => write(name, JSON.stringify(value, null, 2) + '\n');
  const rawRef = write('raw-review.json', rawInput.bytes);
  const assessmentRef = write('independent-coverage.json', assessmentInput.bytes);
  const observationRef = write('host-observation.json', observedInput.bytes);
  const targetRef = write('review-target.json', read(o.review_target));
  const provenance = json('provenance.json', {raw_review: rawRef, independent_coverage: assessmentRef, host_observation: observationRef, original_host_trace: o.host_trace, review_target: targetRef});
  const checks = a.coverage.filter(r => c.required_checks.includes(r.id));
  const candidateChecks = a.coverage.filter(r => c.candidate_requirements.includes(r.id));
  const inspection = {...binding, status: 'completed', reviewer, verdict, coverage: [...checks, ...candidateChecks], findings,
    limitations: a.limitations, raw_review: rawRef, file_coverage: a.file_coverage};
  const result = json('inspection.json', inspection);
  const receipt = {...binding, checks, candidate_checks: candidateChecks, candidate_verdict: verdict, inspection: result};
  const receiptRef = json('receipt.json', receipt);
  const capture = json('capture.json', {...binding, status: 'completed', reviewer, host_trace: provenance, result, artifacts: [...artifacts.values()]});
  return {inspection: result, receipt: receiptRef, capture, verdict, meaning: 'Record adaptation only. Run the Python evidence gate; independent acceptance remains with the lead.'};
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2), options = {};
    assert(args.length % 2 === 0, 'expected --name value pairs');
    for (let i = 0; i < args.length; i += 2) { assert(args[i].startsWith('--'), 'expected option'); options[args[i].slice(2)] = args[i + 1]; }
    console.log(JSON.stringify(adapt(options)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {adapt};
