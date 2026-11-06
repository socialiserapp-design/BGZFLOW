import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isCommandEntry } from './lib/command-entry.mjs';
import { containsObviousSecret } from './lib/obvious-secret.mjs';

const within = (root, file) => { const r=path.relative(root,file); return r==='' || (r!=='..'&&!r.startsWith(`..${path.sep}`)&&!path.isAbsolute(r)); };
function canonical(file) {
  let p=path.resolve(file), suffix=[];
  while(!fs.existsSync(p)) { const parent=path.dirname(p); if(parent===p) break; suffix.unshift(path.basename(p)); p=parent; }
  return path.join(fs.realpathSync.native(p),...suffix);
}
const deny = message => ({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:message}});
const context = (event,message) => ({hookSpecificOutput:{hookEventName:event,additionalContext:message}});

// Native custom apply_patch input is text; command-tool inputs can wrap that text
// in input/patch, and Antigravity supplies the same arguments via toolCall.args.
// This intentionally does not interpret shell commands or arbitrary action DSLs.
function toolArguments(input) {
  const raw=input.tool_input??input.toolInput??input.toolCall?.args??input.toolCall?.arguments??{};
  if(typeof raw==='string'&&raw.trimStart().startsWith('{')) {
    try {return JSON.parse(raw);} catch {return raw;}
  }
  return raw;
}
function patchActions(text) {
  if(typeof text!=='string')return null;
  const lines=text.trim().replaceAll('\r\n','\n').split('\n');
  if(lines[0]?.trim()!=='*** Begin Patch')return null;
  const actions=[];let current=null,ended=false;
  for(let index=1;index<lines.length;index++) {
    const line=lines[index];
    if(line==='*** End Patch') {ended=true;break;}
    const header=/^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
    if(header) {
      current={path:header[2],savedPath:header[1]==='Delete'?null:header[2],content:[]};
      actions.push(current);continue;
    }
    if(line.startsWith('*** Move to: ')) {
      if(!current||current.savedPath===null)return null;
      current.savedPath=line.slice('*** Move to: '.length);continue;
    }
    if(current&&line.startsWith('+'))current.content.push(line.slice(1));
  }
  return ended&&actions.length?actions:null;
}
function fileActions(tool,args) {
  if(/(?:^|[.:]|__)apply_patch$/i.test(tool))return patchActions(typeof args==='string'?args:args?.input??args?.patch);
  if(!/(?:^|[.:]|__)(?:Write|Edit|MultiEdit|write_file|edit_file)$/i.test(tool))return undefined;
  if(!args||typeof args!=='object'||Array.isArray(args))return null;
  const file=args.file_path??args.filePath??args.path;
  // Claude MultiEdit applies edits to its one file; each replacement is checked,
  // while apply_patch above supplies the native multi-file operation format.
  const content=args.content??args.new_string??args.new_text??(Array.isArray(args.edits)?args.edits.map(e=>e?.new_string??e?.new_text??'').join('\n'):'');
  return typeof file==='string'?[{path:file,savedPath:file,content:[content]}]:null;
}

/** A narrow accident guard, not a shell parser or replacement for host permissions. */
export function inspectMechanicalSafety(input={}, {env=process.env,check=spawnSync}={}) {
  const event=input.hook_event_name||input.hookEventName||input.event;
  const tool=input.tool_name||input.toolName||input.toolCall?.name||'';
  const args=toolArguments(input);
  const actions=fileActions(tool,args);
  const write=actions!==undefined;
  if(event==='PreToolUse'&&actions) {
    if(actions.some(action=>containsObviousSecret(action.content.join('\n'))))return deny('The proposed file write contains a credential-shaped value. Use the approved credential store or an environment reference instead.');
  }
  if(event==='PreToolUse' && /(?:^|[.:]|__)(?:Bash|Shell|PowerShell|exec_command)$/i.test(tool)) {
    const command=String(args.command??args.cmd??'');
    const destructive=/(?:^|[;&|]\s*)(?:rm|rmdir|rd|del|erase|Remove-Item|rimraf)(?:\.exe)?\s+[^\r\n]*(?:-rf|-fr|-r\b|-Recurse\b|--recursive\b|\/s\b)/i.test(command);
    const rootTarget=/(?:^|\s)["']?(?:[a-z]:[\\/]\*?|\/(?:\*)?|~(?:\/\*)?|\$HOME(?:\/\*)?|\$env:USERPROFILE)["']?(?=\s|$)/i.test(command);
    if(destructive&&rootTarget) return deny('This command appears to recursively delete a drive, system or home root. Use a specific verified target within the authorised task.');
  }
  if(event==='PreToolUse' && write && env.BGZFLOW_WRITE_ROOTS) {
    // Only a host/operator-provided allowlist activates this additional path boundary.
    try {
      const roots=JSON.parse(env.BGZFLOW_WRITE_ROOTS);
      if(!Array.isArray(roots)||!roots.length||roots.some(r=>typeof r!=='string'||!path.isAbsolute(r))) throw new Error('invalid roots');
      if(!actions) return deny('The file targets in this write could not be identified. Use a supported typed file edit within the host-configured write locations.');
      const locations=roots.map(canonical);
      for(const file of new Set(actions.flatMap(action=>[action.path,action.savedPath].filter(Boolean)))) {
        const target=canonical(path.resolve(input.cwd||process.cwd(),file));
        if(!locations.some(root=>within(root,target))) return deny('This file is outside the write locations configured by the host. Keep the change within the authorised locations or obtain the missing access.');
      }
    } catch { return deny('The host write-location configuration cannot be verified. Correct that configuration before this file write.'); }
  }
  if(event==='PostToolUse' && actions) {
    const problems=new Set();
    for(const file of new Set(actions.map(action=>action.savedPath).filter(file=>typeof file==='string'&&/\.(?:mjs|cjs|js)$/i.test(file)))) {
    try {
      const target=path.resolve(input.cwd||process.cwd(),file);
      if(!fs.statSync(target).isFile()) {problems.add('An edited JavaScript target is not a saved file and still needs verification.');continue;}
      const result=check(process.execPath,['--check',target],{encoding:'utf8',timeout:5000,windowsHide:true,maxBuffer:128*1024,env:{...env}});
      if(result.error) problems.add('The JavaScript syntax check could not complete. This file still needs verification.');
      else if(result.status!==0) problems.add('An edited JavaScript file failed the local syntax check. Inspect and fix the syntax before relying on the change.');
    } catch {problems.add('An edited JavaScript file could not be checked. Verify the actual saved file before claiming it works.');}
    }
    if(problems.size)return context(event,[...problems].join(' '));
  }
  return {};
}

if(isCommandEntry(import.meta.url)) {
  try { const raw=fs.readFileSync(0,'utf8'); process.stdout.write(JSON.stringify(raw.length<=2*1024*1024?inspectMechanicalSafety(JSON.parse(raw||'{}')):{})); }
  catch { process.stdout.write('{}'); }
}
