import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {after,test} from 'node:test';
import {makeProject,removeDir,write} from './helpers.mjs';import {takeSnapshot} from '../lib/snapshot.mjs';import {logLine} from '../lib/io.mjs';
const roots=[];const project=()=>{const root=makeProject('wave1-storage');roots.push(root);return root;};const linkDir=(target,link)=>fs.symlinkSync(target,link,process.platform==='win32'?'junction':'dir');after(()=>roots.forEach(removeDir));const noGit=()=>{throw new Error('fixture untracked');};
test('R1 snapshot retention preserves all 20 external backups behind a root junction',()=>{
 const root=project(),external=project(),link=path.join(root,'.bgzflow/snapshots');
 for(let i=0;i<20;i++)write(external,`20260929T1000${String(i).padStart(2,'0')}Z/backup.md`,'external backup\n');
 const before=fs.readdirSync(external).sort();linkDir(external,link);write(root,'CHECKPOINT.md','changed state\n');
 try {takeSnapshot({projectDir:root,now:new Date('2026-10-01T00:00:00Z'),runGit:noGit});assert.deepEqual(fs.readdirSync(external).sort(),before);for(const name of before.filter(n=>n!=='.bgzflow'))assert.equal(fs.readFileSync(path.join(external,name,'backup.md'),'utf8'),'external backup\n');}
 finally {if(fs.existsSync(link))fs.unlinkSync(link);}
});
test('R1 snapshot retention unlinks an old dated junction without deleting its backup target',()=>{
 const root=project(),external=project(),snap=path.join(root,'.bgzflow/snapshots');fs.mkdirSync(snap);write(external,'backup.md','keep me\n');const link=path.join(snap,'20200101T000000Z');linkDir(external,link);
 for(let i=0;i<20;i++)write(root,`.bgzflow/snapshots/20260929T1000${String(i).padStart(2,'0')}Z/CHECKPOINT.md`,'old state\n');write(root,'CHECKPOINT.md','new state\n');
 try {takeSnapshot({projectDir:root,now:new Date('2026-10-01T00:00:00Z'),runGit:noGit});assert.equal(fs.readFileSync(path.join(external,'backup.md'),'utf8'),'keep me\n');assert.equal(fs.existsSync(link),false);}
 finally {if(fs.existsSync(link))fs.unlinkSync(link);}
});
test('R2 linked hooks.log cannot append to or truncate a transcript',t=>{
 const root=project(),target=write(root,'transcript.jsonl','customer transcript\n'.repeat(16002)),before=fs.readFileSync(target),link=path.join(root,'.bgzflow/hooks.log');
 try {fs.symlinkSync(target,link,'file');}catch(e){
  if(process.platform!=='win32'||e.code!=='EPERM')throw e;
  // Without Windows symlink privilege, retain the real shared bytes and simulate its link stat.
  fs.linkSync(target,link);const lstat=fs.lstatSync;t.mock.method(fs,'lstatSync',(file,...args)=>{const stat=lstat(file,...args);if(path.resolve(file)===link)stat.isSymbolicLink=()=>true;return stat;});
 }
 try {logLine(root,'H5','snapshot complete');assert.equal(createHash('sha256').update(fs.readFileSync(target)).digest('hex'),createHash('sha256').update(before).digest('hex'));}finally {t.mock.restoreAll();fs.unlinkSync(link);}
});
test('R2 a junctioned log parent cannot escape the project log folder',()=>{
 const root=project(),external=project(),log=write(external,'hooks.log','external transcript\n'.repeat(16002)),before=fs.readFileSync(log),link=path.join(root,'.bgzflow');fs.rmdirSync(link);linkDir(external,link);
 try {logLine(root,'H5','snapshot complete');assert.equal(createHash('sha256').update(fs.readFileSync(log)).digest('hex'),createHash('sha256').update(before).digest('hex'));}finally {fs.unlinkSync(link);}
});
