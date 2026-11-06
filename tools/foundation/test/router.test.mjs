import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { discoverCatalog } from '../catalog.mjs';
import { selectRoute, loadSelectedSkills } from '../router.mjs';
import { createJevDecider } from '../jev-provider.mjs';

test('an explicitly requested master with specialists survives selection and provider failure',async t=>{
  const catalog=catalogFixture(t,3);
  const names=['bg-personal-product-design','design-content','design-system'];
  catalog.forEach((entry,index)=>{entry.name=names[index];entry.origin='bgzflow';});
  const request="Use BGZFLOW's bg-personal-product-design master with design-content and design-system for this small change. Preserve the approved look.";
  for(const decide of [async()=>({selectedIds:[],strategy:'single'}),async()=>{throw Error('offline');}]){
    const result=await selectRoute({request,catalog},{decide});
    assert.deepEqual(result.explicitIds,catalog.map(entry=>entry.id));
    assert.deepEqual(result.selected.map(entry=>entry.name),names);
    assert.equal(loadSelectedSkills(result).length,3);
  }
});

test('master references, alternatives and quoted instructions do not acquire explicit authority',async t=>{
  const catalog=catalogFixture(t,3),[a,b,c]=catalog.map(entry=>entry.name);
  const decide=async()=>({selectedIds:[],strategy:'single'});
  for(const request of [
    `Explain the ${a} master with ${b} and ${c}.`,
    `Do not use the ${a} master with ${b} and ${c}.`,
    `"Use the ${a} master with ${b} and ${c}."`,
    `> Use the ${a} master with ${b} and ${c}.`,
    `Use the ${a} master with ${b} or ${c}.`,
    `Use the ${a} master with ${b} and ${c} as a quoted example.`,
    `Use the ${a} master with improved spacing and colour.`
  ])assert.deepEqual((await selectRoute({request,catalog},{decide})).explicitIds,[],request);
  const excluded=await selectRoute({request:`Use the ${a} master with ${b}, but not ${c}.`,catalog},{decide});
  assert.deepEqual(excluded.explicitIds,catalog.slice(0,2).map(entry=>entry.id));
});

test('supporting-method comparisons receive actual excerpts and provenance without inventing tools',async()=>{
  let received;
  const decide=createJevDecider({client:{systemOne:async input=>{received=input;return{answers:{best:{choice:'none'}}};}}});
  const result=await decide({phase:'complement',context:{request:'Change one local JSON value',policy:{}},candidates:[{id:'ui5',name:'cards',description:'Analytical charts',origin:'ui5-provider',excerpt:'Only operate on UI5 integration cards.',requiredTools:['ui5-tool']}],selected:[{name:'terminal',description:'Use existing native shell',origin:'native',excerpt:'Read local files.',requiredTools:[]}]});
  assert.deepEqual(result.selectedIds,[]);
  assert.match(received.questions.best.instructions||JSON.stringify(received.questions.best),/instruction excerpts/);
  const encoded=JSON.stringify(received);assert.match(encoded,/Only operate on UI5 integration cards/);assert.match(encoded,/ui5-provider/);assert.match(encoded,/ui5-tool/);assert.ok(!encoded.includes('availableTools\":['));
});

test('explicit offline policy makes zero remote calls and preserves local fallback',async()=>{
  let calls=0;
  for(const policy of [{allowRemoteSelection:false},{offline:true}]){
    const result=await selectRoute({request:'Inspect a package',catalog:[],policy},{decide:async()=>{calls++;return{selectedIds:[],strategy:'single'};}});
    assert.equal(result.status,'fallback');assert.equal(result.calls,0);
  }
  assert.equal(calls,0);
});

function catalogFixture(t, count = 2) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-route-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (let i = 0; i < count; i++) { const dir = path.join(root, `s${i}`); fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: skill-${i}\ndescription: ${i === 0 ? 'Edit existing slides in an unfamiliar provider' : 'Build new presentations'}\n---\nSpecific instruction ${i}`); }
  return discoverCatalog({ roots: [root] });
}
const chooseAll = async ({ candidates, phase }) => ({ selectedIds: candidates.map((e) => e.id), strategy: phase === 'verify' ? 'single' : undefined, modelIds: [] });

test('successful empty ranking needs no verification call when there is no model choice',async t=>{
  const catalog=catalogFixture(t),phases=[];
  const result=await selectRoute({request:'Read the existing local probe',catalog},{decide:async input=>{phases.push(input.phase);return{selectedIds:[],strategy:'single'};}});
  assert.equal(result.status,'selected');assert.deepEqual(result.selected,[]);assert.deepEqual(phases,['rank']);
  assert.equal(result.diagnostics.phases.rank.calls,1);assert.equal(result.diagnostics.phases.rank.candidates,catalog.length);
  assert.equal(result.diagnostics.phases.verify.calls,0);assert.ok(result.diagnostics.elapsedMs>=0);
});

test('empty shortlist preserves explicit skills and dependency checks without verification',async t=>{
  const catalog=catalogFixture(t);catalog[0].requiredTools=['browser'];const phases=[];
  const result=await selectRoute({catalog,explicitSkills:[catalog[0].id],policy:{availableTools:[]}},{decide:async input=>{phases.push(input.phase);return{selectedIds:[]};}});
  assert.equal(result.status,'selected');assert.deepEqual(result.selected.map(item=>item.id),[catalog[0].id]);
  assert.ok(result.missing.some(item=>item.tool==='browser'));assert.deepEqual(phases,['rank']);
});

test('an available model choice or failed ranking cannot take the empty-shortlist shortcut',async t=>{
  const catalog=catalogFixture(t),phases=[];
  const selected=await selectRoute({catalog,availableModels:[{id:'model',available:true}]},{decide:async input=>{phases.push(input.phase);return{selectedIds:[],strategy:'single',modelIds:input.phase==='verify'?['model']:[]};}});
  assert.deepEqual(phases,['rank','verify']);assert.equal(selected.modelChoices[0].id,'model');
  const failed=await selectRoute({catalog},{decide:async()=>{throw Error('rank unavailable');}});
  assert.equal(failed.status,'fallback');assert.equal(failed.diagnostics.phases.rank.calls,1);assert.equal(failed.diagnostics.phases.verify.calls,0);
  const controller=new AbortController();controller.abort();
  const cancelled=await selectRoute({catalog:[],signal:controller.signal},{decide:async()=>{throw Error('must not call');}});
  assert.equal(cancelled.status,'fallback');assert.equal(cancelled.calls,0);
});

test('large library batches safely then rich-rechecks an unfamiliar provider skill', async (t) => {
  const catalog = catalogFixture(t, 301); const wanted = catalog.find((c) => c.name === 'skill-0'); const calls = [];
  const result = await selectRoute({ request: 'Edit the existing deck', catalog }, { decide: async (input) => {
    calls.push(input); assert.ok(input.candidates.length <= 200);
    if (input.phase === 'verify') assert.ok(input.candidates[0].excerpt.includes('Specific instruction 0'));
    return { selectedIds: input.candidates.filter((c) => c.id === wanted.id).map((c) => c.id), strategy: 'single' };
  } });
  assert.equal(result.status, 'selected'); assert.equal(calls.length, 3); assert.equal(result.selected[0].id, wanted.id);
  assert.equal(loadSelectedSkills(result)[0].name, 'skill-0');
});

test('a no-skill request stays empty and explicit skills survive rejection without a four-skill cap', async (t) => {
  const catalog = catalogFixture(t, 8); const decide = async () => ({ selectedIds: [], strategy: 'single' });
  const empty = await selectRoute({ request: 'Thanks', catalog }, { decide }); assert.deepEqual(empty.selected, []);
  const explicit = await selectRoute({ request: 'Use these methods', catalog, explicitSkills: catalog.map((c) => c.id) }, { decide });
  assert.equal(explicit.selected.length, 8);
});

test('a possessive request for two skills preserves both when remote selection chooses none or fails',async t=>{
  const catalog=catalogFixture(t,2);
  catalog[0].name='bg-plain-english-builder';catalog[1].name='bg-personal-product-design';
  for(const entry of catalog)entry.origin='bgzflow';
  const request="Use BGZFLOW's bg-plain-english-builder and bg-personal-product-design skills together for this change. Change one label.";
  for(const decide of [async()=>({selectedIds:[],strategy:'single'}),async()=>{throw Error('offline');}]){
    const result=await selectRoute({request,catalog},{decide});
    assert.deepEqual(new Set(result.selected.map(e=>e.id)),new Set(catalog.map(e=>e.id)));
    assert.equal(result.explicitIds.length,2);
  }
});

test('namespaced commands and skill lists retain source identity without choosing a same-name copy',async t=>{
  const catalog=catalogFixture(t,3);catalog[0].origin='bgzflow';catalog[1].name=catalog[0].name;catalog[1].origin='another-pack';catalog[2].origin='.codex:bgzflow@installed';
  const decide=async()=>({selectedIds:[],strategy:'single'});
  for(const request of [`/bgzflow:${catalog[0].name} inspect this`,`Please use the bgzflow:${catalog[0].name} and bgzflow:${catalog[2].name} skills.`,`Could you use skills bgzflow:${catalog[0].name}, bgzflow:${catalog[2].name} for this task?`]){
    const result=await selectRoute({request,catalog},{decide});
    assert.ok(result.selected.some(e=>e.id===catalog[0].id));
    assert.ok(!result.selected.some(e=>e.id===catalog[1].id));
  }
  const ambiguous=await selectRoute({request:`Use ${catalog[0].name} skill.`,catalog},{decide});
  assert.equal(ambiguous.selected.length,0);assert.equal(ambiguous.missing[0].reason,'ambiguous-name-use-source-id');
});

test('references, exclusions, alternatives and quoted examples do not become explicit method requests',async t=>{
  const catalog=catalogFixture(t,2),[a,b]=catalog.map(e=>e.name),decide=async()=>({selectedIds:[],strategy:'single'});
  for(const request of [`Do not use ${a} skill.`,`Explain the ${a} skill.`,`"Use ${a} skill."`,`> Use ${a} skill.`,`\`\`\`text\n/${a}\nUse ${b} skill.\n\`\`\``,`Use an example from the ${a} skill.`,`Use ${a} or ${b} skills.`,`The example says: "First inspect it. Use ${a} skill."`,`Quoted example: "\nUse ${a} skill.\n"`,`Do not run the following commands:\n/${a}\n/${b}`,`Do not run these:\n\n/${a}\n/${b}`,`Use ${a} skill only as a quoted example, do not execute it.`]){
    const result=await selectRoute({request,catalog},{decide});assert.deepEqual(result.explicitIds,[],request);
  }
  const only=await selectRoute({request:`Use ${a} skill, but not ${b} skill.`,catalog},{decide});
  assert.deepEqual(only.explicitIds,[catalog[0].id]);
});

test('source ownership and eligibility changes invalidate a prior selection even with unchanged file identity',async t=>{
  const catalog=catalogFixture(t,1);catalog[0].origin='bgzflow';
  const request=`Use bgzflow:${catalog[0].name} skill.`,decide=async()=>({selectedIds:[],strategy:'single'});
  const previous=await selectRoute({request,catalog},{decide});assert.equal(previous.explicitIds.length,1);
  const changed=catalog.map(entry=>({...entry,origin:'other-owner'}));
  const result=await selectRoute({request,catalog:changed,previous},{decide});
  assert.notEqual(result.reused,true);assert.deepEqual(result.explicitIds,[]);assert.deepEqual(result.selected,[]);
  const automatic=await selectRoute({request:'Work',catalog},{decide:chooseAll});
  const nowManual=await selectRoute({request:'Work',catalog:catalog.map(entry=>({...entry,manualOnly:true})),previous:automatic},{decide:chooseAll});
  assert.notEqual(nowManual.reused,true);assert.deepEqual(nowManual.selected,[]);
});

test('manual-only metadata is respected unless explicitly invoked, including native slash requests', async (t) => {
  const catalog = catalogFixture(t); catalog[0].manualOnly = true;
  const automatic = await selectRoute({ request: 'Do some work', catalog }, { decide: chooseAll }); assert.ok(!automatic.selected.some((e) => e.id === catalog[0].id));
  const explicit = await selectRoute({ request: `/${catalog[0].name} do some work`, catalog }, { decide: chooseAll }); assert.ok(explicit.selected.some((e) => e.id === catalog[0].id));
});

test('selected skills surface unavailable tool dependencies rather than imply they exist', async (t) => {
  const catalog = catalogFixture(t); catalog[0].requiredTools = ['browser'];
  const unknown = await selectRoute({ catalog }, { decide: chooseAll }); assert.ok(unknown.missing.some((m) => m.tool === 'browser'));
  const available = await selectRoute({ catalog, policy: { availableTools: ['browser'] } }, { decide: chooseAll }); assert.ok(!available.missing.some((m) => m.tool === 'browser'));
});

test('complement choices see known selected bodies and stop when none adds distinct coverage', async (t) => {
  const catalog = catalogFixture(t, 4); const phases = [];
  const result = await selectRoute({ request: 'Build safely', catalog }, { decide: async (input) => {
    phases.push(input.phase);
    if (input.phase === 'rank') return { selectedIds: input.candidates.map((c) => c.id) };
    if (input.phase === 'verify') return { selectedIds: [input.candidates[0].id], strategy: 'single' };
    assert.ok(input.selected.every((entry) => entry.excerpt.includes('Specific instruction')));
    return { selectedIds: input.selected.length === 1 ? [input.candidates[0].id] : [] };
  } });
  assert.equal(result.selected.length, 2); assert.equal(result.calls, 4);
  assert.deepEqual(phases, ['rank', 'verify', 'complement', 'complement']);
});

test('call budget retains checked recommendations without turning them into user authority', async (t) => {
  const catalog = catalogFixture(t, 3);
  const result = await selectRoute({ catalog, budget: { maxCalls: 2 } }, { decide: async (input) => ({ selectedIds: input.phase === 'rank' ? input.candidates.map((c) => c.id) : [input.candidates[0].id], strategy: 'single' }) });
  assert.equal(result.status, 'partial'); assert.equal(result.calls, 2); assert.equal(result.selected.length, 1);
  assert.deepEqual(result.explicitIds,[]);assert.equal(result.comparisonDeferred.length,2);assert.equal(result.provisional.length,2);
});

test('late routing failure never promotes inferred methods into explicit user requests', async t => {
  const catalog = catalogFixture(t, 8);
  const request = 'Improve this public demonstration workflow end to end: review the methods for conflicting instructions, preserve source-based records, assess reusable tooling, and verify a coherent integrated result. Keep routing selective and preserve the full agreed scope.';
  const result = await selectRoute({ request, catalog }, { decide: async input => {
    if (input.phase === 'rank') return { selectedIds: input.candidates.map(entry => entry.id) };
    if (input.phase === 'verify') return { selectedIds: [input.candidates[0].id], strategy: 'single' };
    if (input.selected.length < 7) return { selectedIds: [input.candidates[0].id] };
    throw new Error('late complement outage');
  } });
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.explicitIds, []);
  assert.equal(result.selected.length,1);
  assert.equal(result.provisional.length,7);assert.equal(result.comparisonDeferred.length,7);
});

test('real explicit method requests remain selected during an outage without a fixed count cap', async t => {
  const catalog = catalogFixture(t, 8);
  const result = await selectRoute({ request: `/${catalog[0].name} apply it`, explicitSkills: catalog.slice(1).map(entry => entry.id), catalog }, { decide: async () => { throw new Error('offline'); } });
  assert.equal(result.status, 'fallback');
  assert.equal(result.selected.length, 8);
  assert.equal(result.explicitIds.length, 8);
  assert.deepEqual(result.provisional, []);
});

test('outage, invented choice and malformed answer produce honest main-agent fallback', async (t) => {
  const catalog = catalogFixture(t);
  for (const decide of [async () => { throw new Error('offline'); }, async () => ({ selectedIds: ['invented'] }), async () => ({ success: true })]) {
    const result = await selectRoute({ request: 'Work', catalog, explicitSkills: [catalog[0].id] }, { decide });
    assert.equal(result.status, 'fallback'); assert.equal(result.selected.length, 1); assert.match(result.next, /main agent/);
  }
});

test('reuse depends on context, current catalogue content and real model availability', async (t) => {
  const catalog = catalogFixture(t); const input = { request: 'Build', catalog, stage: 'build' };
  const first = await selectRoute(input, { decide: chooseAll });
  const cached = await selectRoute({ ...input, previous: first }, { decide: () => { throw new Error('must not call'); } }); assert.equal(cached.reused, true);
  assert.equal(cached.calls,0);assert.ok(first.diagnostics.phases.rank.calls>0);
  for(const phase of Object.values(cached.diagnostics.phases))assert.deepEqual(phase,{calls:0,candidates:0,callMs:0});
  assert.ok(cached.diagnostics.elapsedMs>=0);
  for (const change of [{ request: 'Do not build; explain only' }, { stage: 'check' }, { taskContext: { correction: 'no production writes' } }, { availableModels: [{ id: 'available', capacity: 1 }] }]) {
    const changed = await selectRoute({ ...input, ...change, previous: first }, { decide: chooseAll }); assert.notEqual(changed.cacheKey, first.cacheKey);
  }
});

test('single provider supports separate workers only with actual capacity; absent model cannot be selected', async (t) => {
  const catalog = catalogFixture(t); const decide = async ({ candidates }) => ({ selectedIds: candidates.map((c) => c.id), strategy: 'parallel', modelIds: ['model'] });
  const one = await selectRoute({ catalog, availableModels: [{ id: 'model', capacity: 1, resourcePool: 'account', capacityTrusted: true }] }, { decide }); assert.equal(one.strategy, 'single');
  const two = await selectRoute({ catalog, availableModels: [{ id: 'model', capacity: 2, resourcePool: 'account', capacityTrusted: true }] }, { decide }); assert.equal(two.strategy, 'parallel');
  const absent = await selectRoute({ catalog, availableModels: [{ id: 'model', available: false }] }, { decide }); assert.equal(absent.status, 'fallback');
});

test('alternate models on one account do not multiply capacity; unknown capacity stays unconfirmed', async (t) => {
  const catalog = catalogFixture(t); const decide = async () => ({ selectedIds: [], strategy: 'parallel', modelIds: [] });
  const models = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, resourcePool: 'shared-account', capacityTrusted: true, capacity: 1 }));
  const shared = await selectRoute({ catalog, availableModels: models }, { decide }); assert.equal(shared.strategy, 'single'); assert.ok(shared.missing.length);
  const unknown = await selectRoute({ catalog, availableModels: [{ id: 'm', capacity: 10 }] }, { decide }); assert.equal(unknown.strategy, 'single'); assert.ok(unknown.missing.length);
});

test('cancellation and total deadline do not hang on an unresponsive decider', async (t) => {
  const catalog = catalogFixture(t); const controller = new AbortController(); controller.abort();
  const stopped = await selectRoute({ catalog, signal: controller.signal }, { decide: chooseAll }); assert.equal(stopped.status, 'fallback');
  const timeout = await selectRoute({ catalog, budget: { timeoutMs: 50 } }, { decide: () => new Promise(() => {}) }); assert.equal(timeout.status, 'fallback');
});

test('official SDK adapter sanitizes the actual outgoing state and disables automatic retries', async () => {
  let received; const client = { systemOne: async (request, options) => { received = { request, options }; return { answers: { skill_0: { noul: 0.8 }, best: { choice: 's0' }, strategy: { choice: 'single' } } }; } };
  const decide = createJevDecider({ client });
  const result = await decide({ phase: 'verify', context: { password: 'do-not-disclose' }, candidates: [{ id: 's', description: 'Useful' }] });
  assert.equal(result.selectedIds[0], 's'); assert.ok(!JSON.stringify(received.request).includes('do-not-disclose')); assert.equal(received.options.retry.maxRetries, 0);
});

test('malformed raw SDK choices never become an affirmative no-more-methods decision',async()=>{
  const candidates=[{id:'one',name:'example',description:'A sample procedure'}];
  for(const phase of ['rank','verify','complement'])for(const bad of [undefined,'invented','s9',null]){
    const decide=createJevDecider({client:{systemOne:async()=>({answers:{best:{choice:bad},skill_0:{noul:0.8},strategy:{choice:'single'}}})}});
    await assert.rejects(()=>decide({phase,context:{},candidates}),/invalid-jev-choice/);
  }
  const none=createJevDecider({client:{systemOne:async()=>({answers:{best:{choice:'none'}}})}});
  assert.deepEqual((await none({phase:'complement',context:{},candidates})).selectedIds,[]);
});
