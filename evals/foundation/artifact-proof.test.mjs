import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { prepareFixture } from './prepare.mjs';
const require = createRequire(import.meta.url);
const { snapshotWorkspace, workspaceMatches, verifyConverterOnUnseenInputs } = require('./artifact-proof.cjs');

function fixture(t) {
  const parent = fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()), 'bgz-artifact-proof-'));
  t.after(() => {
    assert.ok(fs.realpathSync(parent).startsWith(fs.realpathSync(os.tmpdir()) + path.sep));
    fs.rmSync(parent, { recursive: true, force: true });
  });
  return { work: prepareFixture(path.join(parent, 'attempt')), parent };
}

test('read-only outcomes reject edits to instructions, context and installed dependencies', t => {
  const { work } = fixture(t), baseline = snapshotWorkspace(work);
  assert.equal(workspaceMatches(work, baseline), true);
  for (const name of ['AGENTS.md', 'restored-context.txt', 'node_modules/yaml/package.json']) {
    const file = path.join(work, name), original = fs.readFileSync(file);
    fs.appendFileSync(file, '\nchanged');
    assert.equal(workspaceMatches(work, baseline), false, name);
    fs.writeFileSync(file, original);
  }
  fs.mkdirSync(path.join(work, 'unasked-plan'));
  assert.equal(workspaceMatches(work, baseline), false);
});

test('only explicitly authorised produced files or edits are accepted', t => {
  const { work } = fixture(t), baseline = snapshotWorkspace(work);
  fs.writeFileSync(path.join(work, 'report.md'), 'A supported report.');
  assert.equal(workspaceMatches(work, baseline), false);
  assert.equal(workspaceMatches(work, baseline, { added: ['report.md'] }), true);
  fs.appendFileSync(path.join(work, 'chart.json'), '\n');
  assert.equal(workspaceMatches(work, baseline, { added: ['report.md'] }), false);
  assert.equal(workspaceMatches(work, baseline, { added: ['report.md'], changed: ['chart.json'] }), true);
});

test('unseen converter inputs pass with actual package use and reject a decorative import', t => {
  const { work, parent } = fixture(t);
  fs.writeFileSync(path.join(work, 'convert.mjs'), "import fs from 'node:fs'; import {parse} from 'yaml'; fs.writeFileSync('output.json',JSON.stringify(parse(fs.readFileSync('input.yaml','utf8'), {merge:true})));");
  const before = snapshotWorkspace(work);
  assert.equal(verifyConverterOnUnseenInputs(work, path.join(parent, 'evidence')), true);
  assert.equal(workspaceMatches(work, before), true, 'checking unseen inputs must preserve original artifacts');
  fs.writeFileSync(path.join(work, 'convert.mjs'), "import 'yaml'; import fs from 'node:fs'; fs.writeFileSync('output.json',JSON.stringify({calendar:{mode:'offline',colours:['blue','green'],title:'Community\\ncalendar\\n',enabled:true}}));");
  assert.equal(verifyConverterOnUnseenInputs(work, path.join(parent, 'evidence')), false);
});
