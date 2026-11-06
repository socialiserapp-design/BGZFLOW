import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareFixture } from './prepare.mjs';
import proof from './testing-proof.cjs';
const meaningful = `import test from 'node:test';import assert from 'node:assert/strict';import fc from 'fast-check';import {priceAfterDiscount} from './discount.mjs';test('nearest penny, half up',()=>{fc.assert(fc.property(fc.integer({min:0,max:1000000}),fc.integer({min:0,max:100}),(cents,percent)=>{const actual=priceAfterDiscount(cents,percent),residual=actual*100-cents*(100-percent);assert.ok(Number.isInteger(actual)&&actual>=0&&actual<=cents);assert.ok(residual>=-49&&residual<=50);}),{numRuns:200,seed:420123});});`;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-strength-proof-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workspace = prepareFixture(path.join(root, 'run'), { propertyTesting: true });
  const original = fs.readFileSync(path.join(workspace, 'discount.mjs'), 'utf8');
  fs.writeFileSync(path.join(workspace, 'discount.mjs'), original.replace('Math.floor', 'Math.round'));
  fs.writeFileSync(path.join(workspace, 'discount.property.test.mjs'), meaningful);
  return { root, workspace, original, verify: () => proof.verifyTestStrength(workspace, path.join(root, 'proofs')) };
}

test('test-strength evaluation proves library execution, original failure, repaired behavior and quote integration', t => {
  const f = fixture(t), result = f.verify();
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.ok(result.results.repaired.library.predicates >= 200);
  assert.equal(result.results.original.detected, true);
  assert.equal(result.results['always-round-up'].detected, true);
});

test('a nominal property plus one example is insufficient when a wrong round-up implementation survives', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.workspace, 'discount.property.test.mjs'), `import assert from 'node:assert/strict';import fc from 'fast-check';import {priceAfterDiscount} from './discount.mjs';fc.assert(fc.property(fc.integer(),()=>true),{numRuns:100});assert.equal(priceAfterDiscount(101,50),51);`);
  const result = f.verify();
  assert.equal(result.results.original.detected, true);
  assert.equal(result.results['always-round-up'].detected, false);
  assert.equal(result.passed, false);
});

test('property-testing labels and imported packages without execution cannot establish test quality', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.workspace, 'discount.property.test.mjs'), `import fc from 'fast-check';console.log('All properties passed');`);
  const result = f.verify();
  assert.equal(result.results.repaired.library.calls, 0);
  assert.equal(result.passed, false);
});

test('a repair that removes supported input validation fails independent evidence', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.workspace, 'discount.mjs'), 'export const priceAfterDiscount=(cents,percent)=>Math.round(cents*(100-percent)/100);');
  const result = f.verify();
  assert.equal(result.results.repaired.status, 0);
  assert.equal(result.results.unseen.status, 1);
  assert.equal(result.passed, false);
});

test('a real quote integration child is checked within the owned fixture', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.workspace, 'discount.property.test.mjs'), `\nimport {spawnSync} from 'node:child_process';test('quote integration',()=>{const result=spawnSync(process.execPath,['quote.mjs'],{input:JSON.stringify({items:[{unitCents:1,quantity:3,discountPercent:50}]}),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{lines:[2],totalCents:2});});`);
  const result = f.verify();
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.results.repaired.children.quoteCalls, 1);
});

test('the quote integration allowance rejects unrelated child code', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.workspace, 'discount.property.test.mjs'), `\nimport {spawnSync} from 'node:child_process';test('unrelated command',()=>{spawnSync(process.execPath,['-e','console.log(1)']);});`);
  const result = f.verify();
  assert.equal(result.results.repaired.children.quoteCalls, 0);
  assert.match(result.results.repaired.stdout + result.results.repaired.stderr, /BGZ_CHECKER_CHILD/);
  assert.equal(result.passed, false);
});
