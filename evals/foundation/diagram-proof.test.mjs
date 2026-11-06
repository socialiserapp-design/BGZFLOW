import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {verifyRecoveryDiagram}=require('./diagram-proof.cjs');
const valid=`stateDiagram-v2
  [*] --> Draft
  Draft --> Sending: send
  Sending --> Saved: saved result confirmed
  Sending --> Unknown: reply lost
  Unknown --> Saved: original saved result found
  Unknown --> Failed: original failure confirmed
  Failed --> Sending: retry original identity
`;
test('recovery diagram accepts real Mermaid syntax and rejects unconfirmed retry edges',()=>{
  assert.equal(verifyRecoveryDiagram(valid),true);
  assert.equal(verifyRecoveryDiagram(valid+'  Unknown --> Sending: retry now\n'),false);
  assert.equal(verifyRecoveryDiagram(valid.replace('Sending --> Unknown','Sending --> Failed')),false);
  assert.equal(verifyRecoveryDiagram(valid.replace('  Unknown --> Saved: original saved result found\n','')),false);
  assert.equal(verifyRecoveryDiagram(valid.replace('[*] --> Draft','[*] --> Sending')),false);
  assert.equal(verifyRecoveryDiagram('Diagram completed and verified.'),false);
});
