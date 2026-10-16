import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import { journalWrite, journalCopy, sealChanges } from './owned-changes.mjs';

export const backup=path.dirname(fileURLToPath(import.meta.url));
export const manifestFile=path.join(backup,'manifest.json');
export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function inside(root,file){const rel=path.relative(path.resolve(root),path.resolve(file));if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw new Error('Path escapes owned root: '+file);}
export function guard(file){let current=path.resolve(file),canonicalChecked=false;for(;;){try{const s=fs.lstatSync(current);if(s.isSymbolicLink())throw new Error('Refusing linked path: '+current);if(s.isFile()&&s.nlink!==1)throw new Error('Refusing hard-linked path: '+current);if(!canonicalChecked){if(path.resolve(fs.realpathSync.native(current)).toLowerCase()!==current.toLowerCase())throw new Error('Refusing redirected path: '+current);canonicalChecked=true;}}catch(e){if(e.code!=='ENOENT')throw e;}const parent=path.dirname(current);if(parent===current)break;current=parent;}return path.resolve(file);}
export function hostVolatile(file) {
  const normalized = path.resolve(file).replaceAll('\\', '/');
  const flags = process.platform === 'win32' ? 'i' : '';
  if (new RegExp('(?:^|/)\\.claude/backups/\\.claude\\.json\\.backup\\.[^/]*$', flags).test(normalized)) return true;
  const cache = new RegExp('(?:^|/)\\.(?:claude|codex)/plugins/cache/(.*)$', flags).exec(normalized);
  return !!cache && cache[1].split('/').some(name => (flags ? name.toLowerCase() : name) === '.in_use');
}
export function cacheVersion(file) {
  const normalized = path.resolve(file).replaceAll('\\', '/');
  const match = new RegExp('^(.*?/\\.(?:claude|codex)/plugins/cache/[^/]+/[^/]+/[^/]+)(?:/|$)',
    process.platform === 'win32' ? 'i' : '').exec(normalized);
  return match ? path.resolve(match[1]) : null;
}
export function cacheVersionInUse(version) {
  try { fs.lstatSync(path.join(version, '.in_use')); return true; }
  catch (e) { return e.code !== 'ENOENT'; } // An unreadable host marker conservatively retains the version.
}
export function state(file, { ignoreVolatile = false } = {}) {
  if (ignoreVolatile && hostVolatile(file)) return { exists: false };
  guard(file); if (!fs.existsSync(file)) return { exists: false };
  const s = fs.lstatSync(file);
  if (s.isFile()) { const b = fs.readFileSync(file); return { exists: true, type: 'file', bytes: b.length, sha256: sha256(b) }; }
  if (!s.isDirectory()) throw new Error('Special path refused');
  const entries = {}; let files = 0;
  function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name); inside(file, full);
      if (ignoreVolatile && hostVolatile(full)) continue;
      guard(full);
      const child = fs.lstatSync(full), key = path.relative(file, full).replaceAll('\\', '/');
      if (child.isDirectory()) { entries[key] = { type: 'directory' }; walk(full); }
      else if (child.isFile()) { const b = fs.readFileSync(full); entries[key] = { type: 'file', bytes: b.length, sha256: sha256(b) }; files++; }
      else throw new Error('Link or special file refused');
    }
  }
  walk(file); return { exists: true, type: 'directory', files, sha256: sha256(JSON.stringify(entries)), entries };
}
export function assertCurrent(file, wanted, options) {
  if (!equal(state(file, options), wanted)) throw new Error('Target changed; refusing overwrite: ' + file);
}
export function verifyTargets(m) {
  for (const t of m.targets) assertCurrent(t.path, t.before, { ignoreVolatile: m.volatilePolicyVersion === 1 });
}
export function volatileInventory(m) {
  const entries = new Map();
  function walk(file, inherited = false) {
    const volatile = inherited || hostVolatile(file); let stat;
    try { if (!volatile) guard(file); stat = fs.lstatSync(file); }
    catch (e) {
      if (e.code === 'ENOENT') return;
      if (!volatile) throw e;
      entries.set(file, { path: file, type: 'unavailable', error: e.code || 'UNKNOWN' }); return;
    }
    if (volatile) entries.set(file, { path: file,
      type: stat.isSymbolicLink() ? 'link' : stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'special',
      bytes: stat.size, mtimeMs: stat.mtimeMs });
    // Observe metadata only. Never follow a host marker link or read backup contents.
    if (stat.isDirectory()) {
      let names; try { names = fs.readdirSync(file).sort(); } catch (e) {
        if (e.code === 'ENOENT') return;
        if (!volatile) throw e;
        entries.set(file, { ...entries.get(file), error: e.code || 'UNKNOWN' }); return;
      }
      for (const name of names) walk(path.join(file, name), volatile);
    }
  }
  for (const t of m.targets) walk(t.path);
  return { at: new Date().toISOString(), entries: [...entries.values()].sort((a, b) => a.path.localeCompare(b.path)),
    disposition: 'host-owned-observation-only; never journalled or restored' };
}
export function captureVolatileAtApplyStart(m) {
  m.volatileAtApplyStart = volatileInventory(m); writeManifest(m);
}
export function writeOwned(file,bytes,m){if(m)return journalWrite(m,file,bytes);guard(file);fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.bgzflow-'+process.pid+'.tmp';if(fs.existsSync(temp))throw new Error('Temporary path occupied');fs.writeFileSync(temp,bytes,{flag:'wx'});try{guard(file);fs.renameSync(temp,file);}catch(e){fs.unlinkSync(temp);throw e;}}
export function copyRaw(source,destination,m,options={}){if(m)return journalCopy(m,source,destination);if(options.ignoreVolatile&&hostVolatile(source))return;guard(source);guard(destination);const s=fs.lstatSync(source);if(s.isDirectory()){fs.mkdirSync(destination,{recursive:true});for(const name of fs.readdirSync(source).sort())copyRaw(path.join(source,name),path.join(destination,name),undefined,options);}else if(s.isFile()){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);}else throw new Error('Unsupported source');}
export function removeOwned(root,current=root){inside(root,current);guard(current);if(!fs.existsSync(current))return;const s=fs.lstatSync(current);if(s.isDirectory()){for(const name of fs.readdirSync(current))removeOwned(root,path.join(current,name));fs.rmdirSync(current);}else if(s.isFile()){fs.chmodSync(current,0o666);fs.unlinkSync(current);}else throw new Error('Special removal refused');}
function within(root, file) { const rel = path.relative(root, file); return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel)); }
function encodeManifest(value, root) {
  if (typeof value === 'string' && path.isAbsolute(value) && within(root, path.resolve(value))) {
    return { kitRelative: path.relative(backup, value).replaceAll('\\', '/') || '.' };
  }
  if (Array.isArray(value)) return value.map(item => encodeManifest(item, root));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeManifest(item, root)]));
  return value;
}
function decodeManifest(value, root) {
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && typeof value.kitRelative === 'string') {
    if (path.isAbsolute(value.kitRelative) || value.kitRelative.includes('\0')) throw new Error('Invalid relative kit path');
    const resolved = path.resolve(root, value.kitRelative); inside(path.dirname(root), resolved); return resolved;
  }
  if (Array.isArray(value)) return value.map(item => decodeManifest(item, root));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeManifest(item, root)]));
  return value;
}
export function readManifest(file = manifestFile) { return decodeManifest(JSON.parse(fs.readFileSync(file, 'utf8')), path.dirname(path.resolve(file))); }
export function writeManifest(m) {
  const root = m.parentBackup === path.dirname(backup) ? m.parentBackup : backup;
  writeOwned(manifestFile, JSON.stringify(encodeManifest({ ...m, kitLocation: '.' }, root), null, 2) + '\n');
}
export function checksumText(m,side){const lines=[];for(const t of m.targets){const s=t[side];if(!s.exists){lines.push('# absent '+t.path);continue;}if(s.type==='file')lines.push(s.sha256+'  '+t.path+(side==='before'?'  backup='+t.backup:''));else for(const [name,e]of Object.entries(s.entries))if(e.type==='file')lines.push(e.sha256+'  '+path.join(t.path,name)+(side==='before'?'  backup='+path.join(t.backup,name):''));}return lines.join('\n')+'\n';}
export function prepare(config, targets, protectedPaths = []) {
  guard(backup);
  if (fs.existsSync(manifestFile)) throw new Error('Already prepared');
  const owned = [], ancestors = new Map();
  for (const [label, file] of targets) {
    const before = state(file, { ignoreVolatile: true }), entry = { label, path: path.resolve(file), before, after: before };
    if (before.exists) {
      entry.backup = path.join(backup, 'before', label); inside(backup, entry.backup);
      copyRaw(file, entry.backup, undefined, { ignoreVolatile: true }); assertCurrent(entry.backup, before);
    }
    for (let parent = path.dirname(entry.path); !fs.existsSync(parent); parent = path.dirname(parent)) {
      guard(parent);
      if (!config.home) throw new Error('Missing target parent needs an owned home');
      inside(config.home, parent);
      ancestors.set(parent, { path: parent, before: { exists: false } });
    }
    owned.push(entry);
  }
  for (let i = 0; i < owned.length; i++) for (let j = i + 1; j < owned.length; j++) {
    const a = owned[i].path.toLowerCase(), b = owned[j].path.toLowerCase();
    if (a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep)) throw new Error('Overlapping owned targets');
  }
  const m = { schemaVersion: 3, phase: 'prepared', createdAt: new Date().toISOString(), ...config,
    targets: owned, ancestorDirectories: [...ancestors.values()], changes: [], foreign: [], volatilePolicyVersion: 1,
    protectedPaths: protectedPaths.map(file => ({ path: path.resolve(file), state: state(file) })) };
  m.volatileAtStage = volatileInventory(m);
  writeManifest(m); writeOwned(path.join(backup, 'SHA256SUMS.before.txt'), checksumText(m, 'before'));
  return m;
}
export function verifyBackup(m){for(const t of m.targets)if(t.before.exists){inside(backup,t.backup);assertCurrent(t.backup,t.before);}}
export function verifyProtected(m){for(const t of m.protectedPaths)assertCurrent(t.path,t.state);}
export function verifyPayload(m,root=m.payload){guard(root);const expected=JSON.parse(fs.readFileSync(path.join(backup,'release-manifest.json'),'utf8'));if(expected.releaseCommit!==m.releaseCommit||expected.releaseTree!==m.releaseTree)throw new Error('Release identity drift');const actual=state(root,{ignoreVolatile:true});if(!actual.exists||actual.type!=='directory'||actual.files!==expected.files.length)throw new Error('Payload inventory mismatch');for(const e of expected.files){const b=fs.readFileSync(path.join(root,e.name));if(sha256(b)!==e.sha256||crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')!==e.oid)throw new Error('Release payload changed: '+e.name);}return expected.files.length;}
export function childEnv(m){const env={...process.env};for(const key of Object.keys(env))if(/(?:TOKEN|API_KEY|PASSWORD|SECRET|CREDENTIAL)/i.test(key))delete env[key];for(const key of ['BGZFLOW_PROJECT','CLAUDE_PROJECT_DIR','GROK_WORKSPACE_ROOT','BGZFLOW_OVERLAY','CLAUDE_PLUGIN_ROOT'])delete env[key];const runtime=path.join(backup,'runtime');for(const d of [runtime,path.join(runtime,'appdata'),path.join(runtime,'localappdata')])fs.mkdirSync(d,{recursive:true});return {...env,USERPROFILE:m.home,HOME:m.home,HOMEDRIVE:path.parse(m.home).root.slice(0,2),HOMEPATH:m.home.slice(2),CLAUDE_CONFIG_DIR:path.join(m.home,'.claude'),CODEX_HOME:path.join(m.home,'.codex'),APPDATA:path.join(runtime,'appdata'),LOCALAPPDATA:path.join(runtime,'localappdata'),PSModuleAnalysisCachePath:path.join(runtime,'module-cache'),TEMP:runtime,TMP:runtime,XDG_CONFIG_HOME:path.join(runtime,'config'),XDG_CACHE_HOME:path.join(runtime,'cache'),XDG_STATE_HOME:path.join(runtime,'state'),BG_MAIL_DIR:path.join(runtime,'mail'),BG_HEAVY_DIR:path.join(runtime,'heavy'),BG_SWARM_DIR:path.join(runtime,'swarm'),BGZFLOW_OVERLAY:path.join(runtime,'overlay'),DO_NOT_TRACK:'1',DISABLE_TELEMETRY:'1',DISABLE_ERROR_REPORTING:'1',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY:'1',CODEGRAPH_TELEMETRY:'0'};}
export function nativeTimeout(env = process.env, explicit) {
  const value = explicit ?? env.BGZFLOW_NATIVE_TIMEOUT_MS ?? 600000;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 2147483647) {
    throw new Error('BGZFLOW_NATIVE_TIMEOUT_MS / native timeout must be a positive integer in milliseconds');
  }
  return Number(value);
}
export function native(m, label, args, { allowFailure = false, input, cwd = m.home, exe = m.claudeExe, env = childEnv(m), timeout } = {}) {
  const timeoutMs = nativeTimeout(env, timeout), startedAt = new Date().toISOString();
  const r = spawnSync(exe, args, { cwd, env, input, encoding: 'utf8', timeout: timeoutMs,
    maxBuffer: 4 * 1024 ** 2, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
  const directory = path.join(backup, 'receipts'); guard(directory); fs.mkdirSync(directory, { recursive: true });
  let attempt = 1, file = path.join(directory, label + '.json');
  while (fs.existsSync(file)) { guard(file); file = path.join(directory, label + '-attempt-' + (++attempt) + '.json'); }
  const receipt = { exe, args, cwd, startedAt, endedAt: new Date().toISOString(), timeoutMs,
    exitCode: r.status, error: r.error?.code || null, signal: r.signal || null, pid: r.pid || null,
    stdout: r.stdout || '', stderr: r.stderr || '', attempt, receiptFile: file };
  writeOwned(file, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ check: label, exitCode: r.status, error: receipt.error, timeoutMs, attempt }));
  if (!allowFailure && (r.status !== 0 || r.error)) {
    const error = new Error(label + ' failed; see receipt: ' + file); error.receipt = receipt; throw error;
  }
  return receipt;
}
export function seal(m,phase){sealChanges(m);for(const t of m.targets)t.after=state(t.path,{ignoreVolatile:m.volatilePolicyVersion===1});m.phase=phase;m.updatedAt=new Date().toISOString();writeManifest(m);writeOwned(path.join(backup,'SHA256SUMS.after.txt'),checksumText(m,'after'));}
