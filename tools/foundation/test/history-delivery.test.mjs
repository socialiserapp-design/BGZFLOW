import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {historyDelivery} from '../history-delivery.mjs';

test('source delivery claims survive bounded reads and only real context resets replay them',t=>{
  const root=fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()),'history-delivery-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const dir=path.join(root,'events');fs.mkdirSync(dir);
  const initial={dir,events:[]};assert.equal(historyDelivery(initial)('a'),true);assert.equal(historyDelivery(initial)('a'),false);
  const compact={dir,events:[{event:'SessionStart',source:'compact',id:'actual-context-reset'}]};
  assert.equal(historyDelivery(compact)('a'),true);
  assert.equal(historyDelivery({dir,events:[]})('a'),false);
  assert.equal(historyDelivery({dir,events:[{event:'SessionStart',source:'resume',id:'resume'}]})('a'),false);
  assert.equal(historyDelivery({dir,events:[]})('new-correction'),true);
  assert.equal(historyDelivery(initial,{ephemeral:true})('a'),true);
  assert.equal(historyDelivery(initial,{ephemeral:true})('a'),true);
});
