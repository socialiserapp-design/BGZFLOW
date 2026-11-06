import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectAntigravityResult} from './antigravity-result.mjs';

test('native SUCCESS with a denied command cannot pass the recovery test', () => {
  // Shape observed from the real first turn; no private transcript is embedded.
  const result = inspectAntigravityResult({status: 'SUCCESS', response: '',
    denied_actions: [{action: 'command', display_name: 'RunCommand'}]}, 0);
  assert.equal(result.usable, false);
  assert.equal(result.reason, 'permission-required');
  assert.deepEqual(result.denied, [{action: 'command', name: 'RunCommand'}]);
});

test('a reassuring answer cannot override a denied action or failed process', () => {
  const answer = {status: 'SUCCESS', response: 'The inquiry has been saved.'};
  assert.equal(inspectAntigravityResult({...answer,
    denied_actions: [{action: 'command'}]}, 0).usable, false);
  assert.equal(inspectAntigravityResult(answer, 1).usable, false);
  assert.equal(inspectAntigravityResult({...answer, status: 'TIMEOUT'}, 0).usable, false);
});

test('missing and empty native answers remain inconclusive', () => {
  for (const response of [undefined, {}, {status: 'SUCCESS', response: '  '}]) {
    assert.equal(inspectAntigravityResult(response, 0).usable, false);
  }
});

test('an available answer still requires the independent effect checks', () => {
  assert.deepEqual(inspectAntigravityResult({status: 'SUCCESS', response: 'Red.'}, 0),
    {usable: true, reason: 'answer-available', denied: []});
});
