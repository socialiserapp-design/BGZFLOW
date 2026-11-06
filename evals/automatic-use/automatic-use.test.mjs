import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {cases} from './cases.mjs';
import {prepare} from './prepare.mjs';
import {grade,readWav,inspectSvg,paymentProbe,exportProbe,executedHelper} from './grade.mjs';
import {methodCoverage,preparedFromReviewedPackage} from './evidence.mjs';
import {parseArguments,applyCandidateConfig} from './run.mjs';
import {createHash} from 'node:crypto';

const plugin=path.resolve(import.meta.dirname,'../..');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'bgz-auto-owner-'));
function run(script,args){const result=spawnSync(process.execPath,[path.join(plugin,script),...args],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);}
const methods=names=>[{event:'UserPromptSubmit',message:'synthetic owner test'}, {event:'RouteSelected',selection:{status:'selected',selected:names.map(name=>({name})),stage:'investigate'}},{event:'MethodContextPrepared',delivery:{methods:names.map(name=>({name,provided:true,characters:300,bodyDigest:'a'.repeat(64)}))}}];

test('cases are ordinary public requests, not skill/script-name coaching; live usage requires explicit flag',()=>{
  assert.equal(cases.length,6);
  for(const c of cases)assert.doesNotMatch(c.request,/BGZFLOW|design-sound|design-svg|risky-changes|sound-sheet|svg-flipbook|Jev|principle-prove/);
  assert.throws(()=>parseArguments(['--plugin',plugin,'--output','new']),/--live/);
  assert.throws(()=>parseArguments(['--live','--plugin',plugin,'--output','new','--cases','made-up']),/Unknown/);
});
test('candidate provider and independent judge receive identical quoted activation overrides',()=>{
  const config={providers:[{config:{}}],tests:[{assert:[{}, {provider:{config:{}}}]}]};
  const args=parseArguments(['--live','--plugin',plugin,'--plugin-id','bgzflow@bgzflow-candidate','--output','new']);
  const overrides=applyCandidateConfig(config,{...args,run:'owned-run',workerProvider:'codex',judgeProvider:'codex',codexHome:'isolated-native-home'});
  assert.deepEqual(config.providers[0].config.cli_config,overrides);assert.deepEqual(config.tests[0].assert[1].provider.config.cli_config,overrides);
  assert.equal(overrides['plugins."bgzflow@bgzflow-live".enabled'],false);
  assert.match(config.tests[0].assert[1].provider.config.cli_env.BGZFLOW_CONTINUITY_HOME,/judge-continuity$/);
  assert.equal(config.providers[0].config.cli_env.CODEX_HOME,'isolated-native-home');
  assert.equal(config.tests[0].assert[1].provider.config.cli_env.CODEX_HOME,'isolated-native-home');
});
test('native prepared method must match actual candidate cache identity and reviewed body bytes',()=>{
  const root=temporary(),actual=path.join(root,'actual'),reviewed=path.join(root,'reviewed');
  for(const dir of [actual,reviewed]){fs.mkdirSync(path.join(dir,'skills/design-sound'),{recursive:true});fs.writeFileSync(path.join(dir,'skills/design-sound/SKILL.md'),'---\nname: design-sound\n---\nSynthetic method.\n');}
  const file=fs.realpathSync.native(path.join(actual,'skills/design-sound/SKILL.md')),body=fs.readFileSync(file,'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
  const event={event:'MethodContextPrepared',delivery:{methods:[{name:'design-sound',id:'skill-'+hash(file).slice(0,24),version:hash(body),bodyDigest:hash(body),characters:body.length,provided:true}]}};
  assert.equal(preparedFromReviewedPackage([event],['design-sound'],{actualRoot:actual,reviewedRoot:reviewed}),true);
  event.delivery.methods[0].id='skill-'+hash('wrong home copy').slice(0,24);assert.equal(preparedFromReviewedPackage([event],['design-sound'],{actualRoot:actual,reviewedRoot:reviewed}),false);
});
test('selected-only, empty body and fallback are not prepared specialist evidence',()=>{
  const events=methods(['design-sound']);assert.deepEqual(methodCoverage(events,['design-sound']),{selected:true,prepared:true,routeStages:['investigate']});
  assert.equal(methodCoverage(events.slice(0,2),['design-sound']).prepared,false);
  events[2].delivery.methods[0].characters=0;assert.equal(methodCoverage(events,['design-sound']).prepared,false);
  events[1].selection.status='fallback';assert.equal(methodCoverage(events,['design-sound']).selected,false);
});

test('partial comparison counts only actually checked methods and never deferred nominees',()=>{
 const events=methods(['design-sound']);events[1].selection.status='partial';events[1].selection.comparisonDeferred=[{name:'unassessed'}];
 assert.equal(methodCoverage(events,['design-sound']).selected,true);assert.equal(methodCoverage(events,['design-sound']).incompleteComparison,true);
 assert.equal(methodCoverage(events,['unassessed']).selected,false);assert.equal(methodCoverage(events,['unassessed']).prepared,false);
});
test('a helper filename echoed in successful output/input does not establish execution',()=>{
  assert.equal(executedHelper([{ok:true,input:'echo node installed/sound-sheet.mjs',output:'done'}],'sound-sheet.mjs'),false);
  assert.equal(executedHelper([{ok:true,input:'node installed/sound-sheet.mjs cues.json --out stem.wav',output:'done'}],'sound-sheet.mjs'),true);
  assert.equal(executedHelper([{ok:false,input:'node installed/sound-sheet.mjs cues.json',output:'failed'}],'sound-sheet.mjs'),false);
});
test('actual supplied SVG assembly passes; bad looping, absent reduced motion and missing geometry fail',()=>{
  const root=temporary(),workspace=path.join(root,'workspace');prepare(workspace,'supplied-vector-frames');
  for(const loop of [false,true]){
    const out=path.join(root,loop?'loop.svg':'once.svg');run('skills/design-svg/scripts/svg-flipbook.mjs',[path.join(workspace,'frames'),'--out',out,'--fps','4','--title','Parcel ready & waiting',...(!loop?['--no-loop']:[])]);
    const actual=fs.readFileSync(out,'utf8');assert.deepEqual(inspectSvg(actual,{loop}),[]);
    assert.ok(inspectSvg(actual.replace(/prefers-reduced-motion/g,'unrecognized-preference'),{loop}).length);
    assert.ok(inspectSvg(actual.replace('x="48"','x="47"'),{loop}).length);
    assert.ok(inspectSvg(actual,{loop:!loop}).length);
  }
});
test('real local sound replay passes; missing/silent/truncated audio and echo-only reuse fail',()=>{
  const root=temporary(),workspace=path.join(root,'workspace'),before=prepare(workspace,'local-sound');fs.mkdirSync(path.join(workspace,'output'));
  const sheet={canvas:{w:800,h:450},fps:30,duration:3,cues:[{id:'a',kind:'click',t:.4,x:150,y:230,w:40,h:40},{id:'b',kind:'land',t:1.3,x:400,y:220,w:220,h:100},{id:'c',kind:'click',t:2.4,x:650,y:200,w:60,h:60}]};
  const source=path.join(workspace,'output/cues.json');fs.writeFileSync(source,JSON.stringify(sheet));
  run('skills/design-sound/scripts/sound-sheet.mjs',[source,'--out',path.join(workspace,'output/stem.wav'),'--family',path.join(workspace,'output/family')]);
  const testcase=cases.find(c=>c.id==='local-sound'),input={testcase,workspace,before,events:methods(testcase.methods),calls:[{ok:true,input:'node installed/sound-sheet.mjs output/cues.json',output:'rendered'}],evidenceRoot:path.join(root,'replay'),pluginRoot:plugin};
  assert.equal(readWav(path.join(workspace,'output/stem.wav')).frames,132300);
  const good=grade(input);assert.equal(good.pass,true,JSON.stringify(good));
  assert.equal(grade({...input,evidenceRoot:path.join(root,'replay2'),calls:[{ok:true,input:'echo done',output:'sound-sheet.mjs'}]}).pass,false);
  const file=path.join(workspace,'output/stem.wav'),bytes=fs.readFileSync(file);fs.writeFileSync(file,bytes.subarray(0,40));assert.equal(grade({...input,evidenceRoot:path.join(root,'replay3')}).pass,false);
});
test('owner payment checks reject baseline, echo-green and oversimplified dedupe; accept real saved-effect repair',()=>{
  const root=temporary(),workspace=path.join(root,'workspace');prepare(workspace,'retry-payment');
  assert.equal(paymentProbe(workspace,path.join(root,'baseline')).pass,false);
  const file=path.join(workspace,'payment.mjs'),source=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,'export function pay(){return {receipt:"done"}}');assert.equal(paymentProbe(workspace,path.join(root,'echo')).pass,false);
  const fixed=source.replace(" if(failBeforeSave)"," const existing=ledger.find(row=>row.operationId===operationId);if(existing){if(existing.purchaseId!==purchaseId||existing.amount!==amount)throw Error('Identity conflict');return existing;}\n if(failBeforeSave)");
  fs.writeFileSync(file,fixed);assert.equal(paymentProbe(workspace,path.join(root,'fixed')).pass,true);
  fs.writeFileSync(file,fixed.replace("if(existing.purchaseId!==purchaseId||existing.amount!==amount)throw Error('Identity conflict');",''));assert.equal(paymentProbe(workspace,path.join(root,'conflict')).pass,false);
});
test('stage outcome accepts real SDK reuse on unseen rows and rejects canned saved output',()=>{
  const root=temporary(),workspace=path.join(root,'workspace');prepare(workspace,'natural-stage-shift');
  const file=path.join(workspace,'export.mjs');
  fs.writeFileSync(file,'import fs from "node:fs";import {exportChannels} from "./vendor/channel-sdk.mjs";fs.writeFileSync("output/channels.json",JSON.stringify(exportChannels({channels:JSON.parse(fs.readFileSync("channels.json")),format:"rows"})));');
  assert.equal(exportProbe(workspace,path.join(root,'real')).pass,true);
  fs.renameSync(file,path.join(workspace,'export-channels.mjs'));
  assert.equal(exportProbe(workspace,path.join(root,'legitimate-name')).pass,true);
  fs.renameSync(path.join(workspace,'export-channels.mjs'),file);
  fs.writeFileSync(file,'import fs from "node:fs";// channel-sdk reused\nfs.writeFileSync("output/channels.json",JSON.stringify([{key:"lark",label:"Lark & Willow"},{key:"cedar",label:"Cedar Studio"}]));');
  assert.equal(exportProbe(workspace,path.join(root,'canned')).pass,false);
});
test('simple reply rejects unnecessary work, and recovery preserves latest wording and earlier scope',()=>{
  const root=temporary(),simple=path.join(root,'simple'),before=prepare(simple,'simple-reply');
  const base={testcase:cases.find(c=>c.id==='simple-reply'),workspace:simple,before,events:methods([]),calls:[],output:'56',evidenceRoot:root};assert.equal(grade(base).pass,true);assert.equal(grade({...base,calls:[{name:'Read',input:'anything',output:'anything',ok:true}]}).pass,false);
  const workspace=path.join(root,'recovery'),original=prepare(workspace,'follow-up-recovery');fs.writeFileSync(path.join(workspace,'labels.json'),JSON.stringify({button:'Keep draft',font:'system',layout:'compact',colour:'blue'}));
  const input={testcase:cases.find(c=>c.id==='follow-up-recovery'),workspace,before:original,events:[{event:'UserPromptSubmit',sessionId:'original',message:'Save draft'},{event:'UserPromptSubmit',sessionId:'same-resumed-session',message:'Keep draft'}],calls:[],output:'Changed label',evidenceRoot:root};assert.equal(grade(input).pass,true);
  fs.writeFileSync(path.join(workspace,'labels.json'),JSON.stringify({button:'Save draft',font:'system',layout:'compact',colour:'blue'}));assert.equal(grade(input).pass,false);
});
