import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import MarkdownIt from 'markdown-it';
import GithubSlugger from 'github-slugger';
import {coGrouping} from '../../skills/research-owl-card-sort-analysis/scripts/co-grouping.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const inventory=JSON.parse(fs.readFileSync(path.join(here,'inventory.json'),'utf8'));
const scenarios=JSON.parse(fs.readFileSync(path.join(here,'scenarios.json'),'utf8'));
const observations=JSON.parse(fs.readFileSync(path.join(here,'card-sort-input.json'),'utf8'));
const pair=(result,left,right)=>result.pairs.find(p=>p.left===left&&p.right===right);

test('complete fourteen-method design-research set and fourteen relevant strategy/validation methods are inventoried',()=>{
 assert.equal(inventory.length,28);assert.equal(inventory.filter(i=>i.source.startsWith('design-research/')).length,14);assert.equal(new Set(inventory.map(i=>i.name)).size,28);
 for(const item of inventory){const dir=path.join(root,'skills',item.name),text=fs.readFileSync(path.join(dir,'SKILL.md'),'utf8').replaceAll('\r','');const meta=parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);assert.equal(meta.name,item.name);assert.ok(meta.description.length>40);assert.ok(text.length>900,'method should retain its procedure');assert.match(fs.readFileSync(path.join(dir,'UPSTREAM-LICENSE'),'utf8'),/MIT License[\s\S]*MC Dean/);assert.ok(fs.readFileSync(path.join(dir,'SOURCES.md'),'utf8').includes(item.source));}
});

test('all imported Markdown references have real local files and heading targets',()=>{
 const parser=new MarkdownIt(),cache=new Map();
 function info(file){if(cache.has(file))return cache.get(file);const tokens=parser.parse(fs.readFileSync(file,'utf8'),{}),slugger=new GithubSlugger(),heads=new Set(),links=[];for(let i=0;i<tokens.length;i++){const token=tokens[i];if(token.type==='heading_open')heads.add(slugger.slug(tokens[i+1]?.content||''));for(const child of token.children||[])if(child.type==='link_open')links.push(child.attrGet('href'));}const result={heads,links};cache.set(file,result);return result;}
 for(const item of inventory)for(const name of ['SKILL.md','SOURCES.md']){const file=path.join(root,'skills',item.name,name);for(const link of info(file).links){if(/^[a-z][a-z0-9+.-]*:/.test(link))continue;const [rel,anchor]=link.split('#'),target=rel?path.resolve(path.dirname(file),decodeURIComponent(rel)):file;assert.ok(fs.existsSync(target),item.name+' '+link);if(anchor&&target.endsWith('.md'))assert.ok(info(target).heads.has(anchor),link);}}
});

test('real card-sort fixture uses observed pair denominators, preserving missing cards',()=>{
 const result=coGrouping(observations),ab=pair(result,'Invoices','Payments'),cd=pair(result,'Customers','Settings');
 assert.equal(result.participantCount,3);assert.deepEqual(ab,{left:'Invoices',right:'Payments',together:2,observed:3,similarity:2/3});assert.equal(cd.together,1);assert.equal(cd.observed,2);assert.equal(cd.similarity,0.5);assert.deepEqual(result.missingByParticipant,[{id:'P3',missing:['Settings']}]);
 // A plausible wrong implementation divides every pair by total participants.
 assert.notEqual(cd.similarity,cd.together/result.participantCount);
});
test('card-sort comparisons are invariant to group and participant ordering',()=>{
 const shuffled={cards:observations.cards,participants:[...observations.participants].reverse().map(p=>({...p,groups:[...p.groups].reverse()}))};assert.deepEqual(coGrouping(shuffled).pairs,coGrouping(observations).pairs);
});
test('a never-co-observed pair is missing evidence, not a zero similarity finding',()=>{
 const result=coGrouping({cards:['A','B'],participants:[{id:'P1',groups:[['A']]},{id:'P2',groups:[['B']]}]});assert.deepEqual(result.pairs,[{left:'A',right:'B',together:0,observed:0,similarity:null}]);
});
for(const [label,input] of [
 ['empty sample',{cards:['A'],participants:[]}],
 ['duplicate cards',{cards:['A','A'],participants:[{id:'P',groups:[['A']]}]}],
 ['unknown card',{cards:['A'],participants:[{id:'P',groups:[['B']]}]}],
 ['multiply assigned card',{cards:['A'],participants:[{id:'P',groups:[['A'],['A']]}]}],
 ['replayed participant',{cards:['A'],participants:[{id:'P',groups:[['A']]},{id:'P',groups:[['A']]}]}]
])test('invalid study observation rejected: '+label,()=>assert.throws(()=>coGrouping(input)));
test('actual read-only CLI produces observed counts from the real fixture',()=>{
 const script=path.join(root,'skills/research-owl-card-sort-analysis/scripts/co-grouping.mjs');const result=spawnSync(process.execPath,[script,path.join(here,'card-sort-input.json')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),coGrouping(observations));
});
test('CLI reports unavailable evidence for missing input rather than a successful empty matrix',()=>{
 const script=path.join(root,'skills/research-owl-card-sort-analysis/scripts/co-grouping.mjs');const result=spawnSync(process.execPath,[script],{encoding:'utf8'});assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/No result established/);
});
test('multi-method scenarios cover all imported methods and include an ordinary no-research reply',()=>{
 const names=new Set(inventory.map(i=>i.name)),used=new Set();for(const scenario of scenarios){assert.ok(scenario.input&&scenario.expected.length&&scenario.mustNot.length);for(const method of scenario.methods){assert.ok(names.has(method));used.add(method);}}
 assert.deepEqual([...names].filter(n=>!used.has(n)),[]);assert.ok(scenarios.some(s=>s.methods.length===0));
});
