#!/usr/bin/env node
import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const forbidden=['context/','CLOUD-BRIEF.md','.bgzflow/','overlay/','overlays/'];
const r=spawnSync('git',['ls-files','-z'],{encoding:'utf8'});if(r.status!==0){console.error(r.stderr);process.exit(2)}
const tracked=r.stdout.split('\0').filter(Boolean);const shipped=tracked.filter(x=>!forbidden.some(p=>x===p.replace(/\/$/,'')||x.startsWith(p)));
if(process.argv.includes('--check')){const bad=shipped.filter(x=>forbidden.some(p=>x===p.replace(/\/$/,'')||x.startsWith(p)));if(bad.length){console.error(`private files in package: ${bad.join(', ')}`);process.exit(1)}if(shipped.some(x=>x.startsWith('context/'))){process.exit(1)}console.log(`package-safe ${shipped.length} files; context excluded`);}else process.stdout.write(shipped.join('\n')+'\n');
