import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareFixture } from './prepare.mjs';
import { preparePrivateLearning } from './private-learning.mjs';
import { createFoundationSession } from '../../tools/foundation/session.mjs';
import assertions from './assertions.cjs';

test('private native preflight preserves real baseline and improvement artifacts and scopes adoption to one project', async t => {
  const root = fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()), 'bgz-private-native-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const run = path.join(root, 'run'), project = prepareFixture(run);
  const evidence = await preparePrivateLearning(project, run), owned = path.join(run, 'private-learning-owner');
  assert.equal(evidence.status, 'adopted');
  assert.deepEqual(evidence.unrelatedProjectMethods, []);
  const read = name => JSON.parse(fs.readFileSync(path.join(owned, name)));
  assert.equal(read('regression-candidate.json').status, 'paused');
  assert.equal(read('regression-baseline.json').status, 'open');
  assert.equal(read('unseen-candidate.json').status, 'closed');
  assert.equal(read('unseen-baseline.json').status, 'open');
  const later = createFoundationSession({ projectRoot: project, storageRoot: path.join(run, 'continuity'), sessionId: 'later-native-task' });
  assert.equal(later.privateCatalogue()[0].name, 'event-sequence-reconciliation');
  assert.equal(fs.existsSync(path.join(project, 'private-procedures.json')), false);
  fs.writeFileSync(path.join(project, 'status-summary.json'), JSON.stringify({ A: 'paused', B: 'open' }));
  assert.equal(assertions.evaluateArtifacts('private-tested-method-use', project, { runDirectory: run }), true);
  fs.writeFileSync(path.join(project, 'status-summary.json'), JSON.stringify({ A: 'closed', B: 'closed' }));
  assert.equal(assertions.evaluateArtifacts('private-tested-method-use', project, { runDirectory: run }), false);
});
