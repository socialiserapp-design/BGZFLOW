#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {builtinModules} from 'node:module';
import {build} from 'esbuild';
import {isCommandEntry} from '../hooks/lib/command-entry.mjs';
import {inspectDocumentLinks} from './check-document-links.mjs';

const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Child-process entrypoints are not visible to an import-graph bundler.
const runtimeEntries=['tools/foundation/bgz.mjs','hooks/foundation.mjs','hooks/foundation-agy.mjs','hooks/mechanical-safety.mjs','tools/bg-mail/bg-mail.mjs','tools/engine/index.mjs','tools/engine/cli.mjs','tools/engine/operation-runner.mjs'];
const excludedLegacyFiles=new Set(['skills/bg-check-it-before-release/scripts/evidence_gate.py','skills/bg-check-it-before-release/scripts/adapt_host_review.cjs','skills/bg-check-it-before-release/scripts/capture_review_target.cjs','skills/bg-check-it-before-release/references/review-verdict.schema.json','skills/bg-finish-the-whole-job/scripts/admit_build.cjs']);
const inside=(root,target)=>{const relative=path.relative(root,target);return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};

export async function runtimeClosure(root) {
  const result=await build({absWorkingDir:root,entryPoints:runtimeEntries,bundle:true,packages:'external',platform:'node',format:'esm',outdir:path.join(root,'.tmp','dependency-analysis'),write:false,metafile:true,logLevel:'silent'});
  return Object.keys(result.metafile.inputs).map(file=>path.relative(root,path.resolve(root,file))).sort();
}

function inspectRelocatableTree(root) {
  if(fs.lstatSync(root).isSymbolicLink())throw new Error('Package root is a linked path.');
  const absolute=fs.realpathSync.native(root);
  function visit(directory){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const file=path.join(directory,entry.name),stat=fs.lstatSync(file);
      if(entry.name==='.git')throw new Error('A package containing Git metadata cannot be moved.');
      if(stat.isSymbolicLink()||Boolean((stat.fileAttributes||0)&0x400))throw new Error('Package contains a linked path; inspect it before moving.');
      if(!inside(absolute,fs.realpathSync.native(file)))throw new Error('Package path escapes its directory.');
      if(stat.isDirectory())visit(file);
    }
  }
  visit(absolute);
}

export async function validatePackage(directory,{antigravity=false}={}) {
  inspectRelocatableTree(directory);
  const metadata=JSON.parse(fs.readFileSync(path.join(directory,'plugin.json'),'utf8'));
  if(metadata.name!=='bgzflow')throw new Error('Unexpected package identity.');
  const analysis=await build({absWorkingDir:directory,entryPoints:runtimeEntries,bundle:true,platform:'node',format:'esm',outdir:path.join(directory,'.dependency-analysis'),write:false,metafile:true,logLevel:'silent'});
  const allowed=new Set(builtinModules.flatMap(name=>[name,`node:${name}`]));
  for(const output of Object.values(analysis.metafile.outputs))for(const dependency of output.imports)if(dependency.external&&!allowed.has(dependency.path))throw new Error(`Unbundled runtime dependency: ${dependency.path}`);
  for(const relative of excludedLegacyFiles)if(fs.existsSync(path.join(directory,relative)))throw new Error(`Dormant legacy gate remains: ${relative}`);
  const hookFile=path.join(directory,antigravity?'hooks.json':'hooks/hooks.json');
  if(!fs.existsSync(hookFile))throw new Error('Host hook manifest is missing.');
  if(fs.readFileSync(path.join(directory,'VERSION'),'utf8').trim()!==metadata.version)throw new Error('Package version mismatch.');
  const documents=inspectDocumentLinks(directory);
  if(documents.issues.length)throw new Error('Broken packaged instruction links:\n'+documents.issues.map(issue=>`${issue.file}:${issue.line} ${issue.target}: ${issue.reason}`).join('\n'));
  return {version:metadata.version,runtimeFiles:Object.keys(analysis.metafile.inputs).length,documents:{files:documents.files,links:documents.links}};
}

function promotePackage(staging,target) {
  const parent=fs.realpathSync.native(path.dirname(target));
  if(!inside(parent,path.resolve(target))||!inside(parent,fs.realpathSync.native(staging)))throw new Error('Build promotion escaped its selected output parent.');
  let backup;
  if(fs.existsSync(target)){
    inspectRelocatableTree(target);
    if(JSON.parse(fs.readFileSync(path.join(target,'plugin.json'),'utf8')).name!=='bgzflow')throw new Error('Existing output is not an owned BGZFLOW package.');
    const backups=path.join(parent,'.bgzflow-backups');fs.mkdirSync(backups,{recursive:true});
    if(fs.lstatSync(backups).isSymbolicLink()||!inside(parent,fs.realpathSync.native(backups)))throw new Error('Package backup directory is unsafe.');
    backup=path.join(backups,`${path.basename(target)}-${randomUUID()}`);
    fs.renameSync(target,backup);
  }
  try {fs.renameSync(staging,target);}catch(error){if(backup&&!fs.existsSync(target))fs.renameSync(backup,target);throw error;}
  return backup;
}

export async function buildFoundation(options={}) {
const root=path.resolve(options.sourceRoot||sourceRoot);
const agyBuild=options.antigravity===true;
const target=path.resolve(options.outputDirectory||path.join(root,'dist',agyBuild?'bgzflow-antigravity':'bgzflow'));
if(target===root||inside(target,root))throw new Error('Output must not contain or replace the source repository.');
fs.mkdirSync(path.dirname(target),{recursive:true});
const stagingParent=path.join(path.dirname(target),'.bgzflow-builds');fs.mkdirSync(stagingParent,{recursive:true});
if(fs.lstatSync(stagingParent).isSymbolicLink()||!inside(fs.realpathSync.native(path.dirname(target)),fs.realpathSync.native(stagingParent)))throw new Error('Package staging directory is unsafe.');
const output=path.join(stagingParent,`${path.basename(target)}-${randomUUID()}`);
const version=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('VERSION must be a release version');
const json=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function copy(relative,destination=relative){
  const source=path.join(root,relative),target=path.join(output,destination);
  if(!fs.existsSync(source))throw new Error(`Required source is missing: ${relative}`);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.cpSync(source,target,{recursive:true,filter:file=>{
    if(/(?:^|[\\/])(?:node_modules|\.git|\.tmp|test|tests|evals)(?:[\\/]|$)/.test(file)||file.endsWith('.log'))return false;
    if(excludedLegacyFiles.has(path.relative(root,file).replaceAll('\\','/')))return false;
    if(fs.lstatSync(file).isSymbolicLink())throw new Error('A linked source asset must be resolved deliberately before packaging.');
    const dest=path.join(target,path.relative(source,file));
    try {if(fs.statSync(file).isFile()&&fs.statSync(dest).isFile()&&fs.readFileSync(file).equals(fs.readFileSync(dest)))return false;}catch{}
    return true;
  }});
}
fs.mkdirSync(output,{recursive:true});
for(const file of await runtimeClosure(root))copy(file);
for(const resource of ['tools/engine/method-assets','tools/engine/improvement/harness2-example','tools/engine/package.json','tools/engine/README.md','tools/engine/LICENSE','tools/engine/THIRD_PARTY_NOTICES.md','tools/bg-mail/README.md'])copy(resource);
const skillNames=new Set();
for(const entry of fs.readdirSync(path.join(root,'skills'),{withFileTypes:true}).filter(e=>e.isDirectory())){
  const name=agyBuild?(fs.readFileSync(path.join(root,'skills',entry.name,'SKILL.md'),'utf8').match(/^name:\s*["']?([a-z0-9-]+)/m)?.[1]||entry.name):entry.name;
  if(skillNames.has(name))throw new Error(`Two skills map to the same host directory: ${name}`);
  skillNames.add(name);
  copy(`skills/${entry.name}`,`skills/${name}`);
}
copy('AGENTS.md',agyBuild?'rules/AGENTS.md':'AGENTS.md');
copy('docs/automatic-review.md');
for(const file of ['hooks/foundation.mjs','hooks/foundation-agy.mjs','hooks/mechanical-safety.mjs','LICENSE','THIRD_PARTY_NOTICES.md','ATTRIBUTION.md','SECURITY.md','HOW-TO-USE.md','docs/install.md','docs/adaptive-foundation.md','docs/enforcement-boundaries.md','docs/testing-skill-sources.json','docs/project-recall.md','docs/packaging-and-hosts.md','docs/skill-harmony-audit.md','docs/foundation-session.md','docs/questioning-method.md','docs/mailbox.md','docs/testing-ladder.md','templates/CHECKPOINT.md','templates/PROJECT-AGENTS.md','templates/DECISIONS.md','templates/LIVE-MANIFEST.md'])copy(file);
for(const file of ['docs/native-learning.md','docs/automatic-methods.md','LICENSES/DeepSeek-SuperAgent-MIT.txt','docs/design-skill-sources.md','docs/design-skill-sources.json','docs/design-expansion.md','docs/design-library-imports.md','LICENSES/LicenseRef-Taste-Assets.txt'])copy(file);
fs.writeFileSync(path.join(output,'VERSION'),version+'\n');
fs.mkdirSync(path.join(output,'vendor'),{recursive:true});
for(const [name,contents] of [['typesafe',"export {TypeSafeClient,noul,choice,score,box,Image,image,withAssets} from '@typesafe-ai/sdk';"],['yaml',"export {parse} from 'yaml';"],['toml',"export {parse} from 'smol-toml';"]]){
  await build({stdin:{contents,resolveDir:root,sourcefile:`${name}-entry.mjs`},outfile:path.join(output,'vendor',`${name}.mjs`),bundle:true,platform:'node',target:'node22',format:'esm',legalComments:'eof',banner:{js:"import { createRequire as bgzCreateRequire } from 'node:module'; const require = bgzCreateRequire(import.meta.url);"}});
}
for(const [file,from,to] of [['tools/foundation/jev-provider.mjs',"'@typesafe-ai/sdk'","'../../vendor/typesafe.mjs'"],['tools/foundation/jev-judgment.mjs',"'@typesafe-ai/sdk'","'../../vendor/typesafe.mjs'"],['tools/foundation/catalog.mjs',"'yaml'","'../../vendor/yaml.mjs'"],['tools/foundation/catalog.mjs',"'smol-toml'","'../../vendor/toml.mjs'"]]){
  const target=path.join(output,file);fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace(from,to));
}
for(const [name,relative] of [['typesafe','node_modules/@typesafe-ai/sdk/LICENSE'],['yaml','node_modules/yaml/LICENSE'],['toml','node_modules/smol-toml/LICENSE']]){
  if(fs.existsSync(path.join(root,relative)))fs.copyFileSync(path.join(root,relative),path.join(output,'vendor',`${name}.LICENSE`));
}
const description='Adaptive AI workflow: relevant skills, preserved intent, real outcome checks and optional multi-agent coordination.';
const metadata={name:'bgzflow',version,description,author:{name:'Simeon Kontogeorges'},homepage:'https://github.com/socialiserapp-design/BGZFLOW',repository:'https://github.com/socialiserapp-design/BGZFLOW',license:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).license,keywords:['agents','skills','testing','workflow']};
json(path.join(output,'plugin.json'),metadata);
if(!agyBuild)json(path.join(output,'.claude-plugin/plugin.json'),metadata);
json(path.join(output,'package.json'),{name:'bgzflow',version,type:'module',description,license:metadata.license,bin:{bgz:'tools/foundation/bgz.mjs'},engines:{node:'>=22'}});
const command=file=>`node "\${CLAUDE_PLUGIN_ROOT}/${file}"`;
const hook=(file,timeout=20)=>({type:'command',command:command(file),timeout});
const events=['SessionStart','UserPromptSubmit','PreToolUse','PostToolUse','PostToolUseFailure','PreCompact','PostCompact','SubagentStart','SubagentStop','Stop','SessionEnd'];
const hooks={};
for(const event of events){
  const items=[];
  if(event==='PreToolUse'||event==='PostToolUse')items.push(hook('hooks/mechanical-safety.mjs',8));
  items.push(hook('hooks/foundation.mjs',event==='UserPromptSubmit'?30:15));
  hooks[event]=[{...(event.includes('Tool')?{matcher:'.*'}:{}),hooks:items}];
}
if(!agyBuild)json(path.join(output,'hooks/hooks.json'),{description:'Native continuity, selective methods and narrow mechanical safety. No reply-blocking stop gates.',hooks});
const agy={};
for(const event of ['SessionStart','PreInvocation','PreToolUse','PostToolUse','Stop']) {
  const handler={type:'command',command:`node ./hooks/foundation-agy.mjs --event ${event}`,timeout:event==='PreInvocation'?30:15};
  agy[event]=event.includes('Tool')?[{matcher:'.*',hooks:[handler]}]:[handler];
}
if(agyBuild)json(path.join(output,'hooks.json'),{'bgzflow-foundation':agy});
if(!agyBuild){
  fs.mkdirSync(path.join(output,'commands'),{recursive:true});
  copy('commands/bg-mail.md');
  fs.writeFileSync(path.join(output,'commands','route.md'),'---\ndescription: Select relevant skills for the current task or changed stage.\n---\n\nUse the current request, relevant decisions and task stage with the foundation selector. Run `node "${CLAUDE_PLUGIN_ROOT}/tools/foundation/cli.mjs" route --request "<current task and stage>"` and apply the returned relevant methods. A selection does not grant new permissions or establish completion.\n');
}
fs.writeFileSync(path.join(output,'README.md'),`# BGZFLOW ${version}\n\n${description}\n\nThis installable package contains the large skill library and local runtime dependencies. Only relevant methods are delivered to the agent. The general bg-jev skill and six specialists use the official TypeSafe connection for selection and useful on-demand judgments. Use your own Jev key (TYPESAFE_API_KEY or your protected .typesafe_key); if unavailable, the main agent continues with the catalogue and available evidence. A local preview makes no service call. See HOW-TO-USE.md for everyday use and the specialist names.\n\nNative hook activation and capabilities differ by host. Install through the host's supported plugin system and approve its current hooks where the host requires it. Do not bypass hook trust. See docs/adaptive-foundation.md and docs/enforcement-boundaries.md for precise behaviour and limitations.\n\nEvaluation frameworks and original project history are not runtime dependencies. The source repository contains the optional evaluation suite.\n`);
const validation=await validatePackage(output,{antigravity:agyBuild});
const backup=options.promote===false?undefined:promotePackage(output,target);
return {directory:options.promote===false?output:target,staging:output,backup,version,skills:skillNames.size,...validation};
}

if(isCommandEntry(import.meta.url)){
  try{
    const result=await buildFoundation({antigravity:process.argv.includes('--antigravity'),promote:!process.argv.includes('--stage-only')});
    console.log(`Built and validated BGZFLOW ${result.version}: ${result.skills} discoverable skill directories. Output: ${result.directory}${result.backup?`; previous package retained: ${result.backup}`:''}`);
  }catch(error){console.error(`BGZFLOW build failed; existing package preserved. ${error.message}`);process.exitCode=1;}
}
