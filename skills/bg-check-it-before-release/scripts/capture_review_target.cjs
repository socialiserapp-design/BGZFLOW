#!/usr/bin/env node
// Controller-owned capture of the reviewed commit. Run it from the controller's protected
// folder, outside the builder's and the checker's writable workspace. It calls no model,
// changes no host state and needs only Node.js and Git.
//
// 1. Before the checker starts (pins the contract revision and the launch time):
//    node capture_review_target.cjs --phase launch --contract contract.json --contract-sha256 PIN
//      --out review-launch.json
// 2. After the checker's job has completed (binds the job identity and the unchanged HEAD):
//    node capture_review_target.cjs --phase completion --launch review-launch.json --launch-sha256 PIN
//      --host host-record.json --host-sha256 PIN --out review-target.json
//
// Keep the printed SHA-256 of each output in the controller's receipt. host-record.json is the
// completed job's record from the host, in the normalised shape described in
// references/inspection.md ("Optional host adapter example"); a per-host shim produces it.
const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const text = x => typeof x === 'string' && x.trim() && !['unknown', 'pending'].includes(x.toLowerCase());
const head = repository => cp.execFileSync('git', ['-C', repository, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
function capture(options) {
  const read = (file, pin) => {
    const bytes = fs.readFileSync(file);
    assert.equal(hash(bytes), pin, 'controller pin mismatch');
    return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  };
  let value;
  if (options.phase === 'launch') {
    const c = read(options.contract, options['contract-sha256']);
    const revision = head(c.source.repository);
    assert.equal(revision, c.source.revision, 'launch HEAD differs from contract revision');
    value = {schema_version: 2, task_id: c.task_id, contract_sha256: options['contract-sha256'],
      repository: c.source.repository, launch_head: revision, captured_at: new Date().toISOString()};
  } else {
    assert.equal(options.phase, 'completion', 'phase must be launch or completion');
    const launch = read(options.launch, options['launch-sha256']);
    const host = read(options.host, options['host-sha256']);
    const response = host.response, stored = host.stored;
    assert(response && stored, 'host record needs response and stored parts');
    assert.equal(response.status, 'completed', 'host must be completed');
    assert(text(response.id) && text(response.thread_id), 'observed job and thread identity required');
    assert.equal(response.id, stored.id, 'host identity mismatch');
    assert.equal(response.thread_id, stored.thread_id, 'host thread mismatch');
    assert(Date.parse(launch.captured_at) <= Date.parse(stored.started_at), 'launch capture must precede review');
    assert(Date.parse(stored.completed_at) <= Date.now(), 'completion capture must follow review');
    const revision = head(launch.repository);
    assert.equal(revision, launch.launch_head, 'HEAD changed during review');
    value = {...launch, completion_head: revision, job_id: response.id, thread_id: response.thread_id,
      launch_sha256: options['launch-sha256'], completed_at: new Date().toISOString()};
  }
  const bytes = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(options.out, bytes, {flag: 'wx'});
  return {path: options.out, sha256: hash(bytes)};
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2), options = {};
    assert(args.length % 2 === 0, 'expected --name value pairs');
    for (let i = 0; i < args.length; i += 2) {
      assert(args[i].startsWith('--'), 'expected option'); options[args[i].slice(2)] = args[i + 1];
    }
    console.log(JSON.stringify(capture(options)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {capture};
