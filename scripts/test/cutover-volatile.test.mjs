import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { test } from 'node:test';

const source = fileURLToPath(new URL('../cutover/', import.meta.url));
const modules = ['cutover-lib.mjs', 'owned-changes.mjs', 'host-stage.mjs', 'apply.mjs', 'codex-apply.mjs', 'undo.mjs'];
async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-cutover-volatile-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const kit = path.join(root, 'kit'), home = path.join(root, 'home');
  fs.mkdirSync(kit); fs.mkdirSync(home);
  for (const file of modules) fs.copyFileSync(path.join(source, file), path.join(kit, file));
  const lib = await import(pathToFileURL(path.join(kit, 'cutover-lib.mjs')));
  const backups = path.join(home, '.claude/backups'), cache = path.join(home, '.claude/plugins/cache/bgzflow-live');
  const oldVersion = path.join(cache, 'bgzflow/0.2.0'), version = path.join(cache, 'bgzflow/0.3.0');
  fs.mkdirSync(backups, { recursive: true }); fs.mkdirSync(oldVersion, { recursive: true });
  fs.writeFileSync(path.join(backups, 'stable.json'), 'KEEP STABLE BACKUP\r\n');
  fs.writeFileSync(path.join(oldVersion, 'index.mjs'), 'old version\r\n');
  const settings = path.join(home, '.claude/settings.json'); fs.writeFileSync(settings, '{}\r\n');
  const payload = path.join(kit, 'payload'); fs.mkdirSync(payload);
  const bytes = Buffer.from('new version\r\n'); fs.writeFileSync(path.join(payload, 'index.mjs'), bytes);
  fs.writeFileSync(path.join(kit, 'release-manifest.json'), JSON.stringify({ releaseCommit: 'fixture-release', releaseTree: 'fixture-tree',
    files: [{ name: 'index.mjs', sha256: lib.sha256(bytes), oid: crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') }] }));
  const marketplaceRoot = path.join(home, '.claude/marketplace');
  const m = lib.prepare({ home, profile: 'disposable', candidate: 'fixture-candidate', payload,
    packageRoot: path.join(marketplaceRoot, 'fixture-release'), marketplaceRoot,
    releaseCommit: 'fixture-release', releaseTree: 'fixture-tree', claudeExe: process.execPath },
  [['backups', backups], ['cache', cache], ['settings', settings],
   ['installed', path.join(home, '.claude/plugins/installed_plugins.json')],
   ['marketplaces', path.join(home, '.claude/plugins/known_marketplaces.json')], ['marketplace', marketplaceRoot],
   ['unrelated', path.join(home, 'unrelated')]]);
  const run = (script, args = [], preload) => spawnSync(process.execPath,
    [...(preload ? ['--import', pathToFileURL(preload).href] : []), path.join(kit, script), ...args], { encoding: 'utf8', timeout: 20000 });
  return { root, kit, home, lib, m, backups, cache, oldVersion, version, settings, run };
}
function rotate(backups, start) {
  for (const name of fs.readdirSync(backups)) if (name.startsWith('.claude.json.backup.')) fs.unlinkSync(path.join(backups, name));
  for (let n = start; n < start + 5; n++) fs.writeFileSync(path.join(backups, '.claude.json.backup.' + n), `HOST ${n}\r\n`);
}
function marker(version, name = '22812') {
  const file = path.join(version, '.in_use', name); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'HOST MARKER\r\n'); return file;
}
function installed(f) {
  f.lib.writeOwned(path.join(f.version, 'index.mjs'), 'new version\r\n', f.m);
  f.lib.writeOwned(path.join(f.version, 'asset.txt'), 'new asset\r\n', f.m);
  f.lib.writeOwned(f.settings, '{"installed":true}\n', f.m);
}
function nativeFixture(f) {
  const preload = path.join(f.root, 'native-provider-fixture.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
    const backups=${JSON.stringify(f.backups)},oldVersion=${JSON.stringify(f.oldVersion)};
    cp.spawnSync=(exe,args,options)=>{const config=options.env.CLAUDE_CONFIG_DIR;
      if(args[1]==='marketplace'){
        for(const name of fs.readdirSync(backups))if(name.startsWith('.claude.json.backup.'))fs.unlinkSync(path.join(backups,name));
        for(let n=11;n<16;n++)fs.writeFileSync(path.join(backups,'.claude.json.backup.'+n),'HOST '+n+'\\r\\n');
        fs.mkdirSync(path.join(oldVersion,'.in_use'),{recursive:true});fs.writeFileSync(path.join(oldVersion,'.in_use','during-apply'),'HOST MARKER\\r\\n');
      }
      const cache=path.join(config,'plugins/cache/bgzflow-live/bgzflow/0.3.0');fs.mkdirSync(cache,{recursive:true});
      fs.writeFileSync(path.join(cache,'index.mjs'),'new version\\r\\n');
      fs.writeFileSync(path.join(config,'plugins/installed_plugins.json'),JSON.stringify({plugins:{'bgzflow@bgzflow-live':[{scope:'user',installPath:cache,version:'0.3.0'}]}}));
      fs.writeFileSync(path.join(config,'plugins/known_marketplaces.json'),'{}\\n');
      return {status:0,stdout:args[1]==='list'?JSON.stringify([{id:'bgzflow@bgzflow-live',version:'0.3.0',enabled:true}]):'{}',stderr:''};};syncBuiltinESMExports();`);
  return preload;
}

test('H01 rotated Claude backup names do not block the actual APPLY dry-run', async t => {
  const f = await fixture(t); rotate(f.backups, 6);
  const result = f.run('apply.mjs', ['--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readdirSync(f.backups).filter(n => n.startsWith('.claude.json.backup.')).length, 5);
  assert.equal(fs.readFileSync(path.join(f.backups, 'stable.json'), 'utf8'), 'KEEP STABLE BACKUP\r\n');
});

test('H02 a new old-version in-use marker does not block APPLY dry-run', async t => {
  const f = await fixture(t), file = marker(f.oldVersion);
  const result = f.run('apply.mjs', ['--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), 'HOST MARKER\r\n');
});

test('H01 APPLY cannot claim or overwrite a rotating host backup', async t => {
  const f = await fixture(t), file = path.join(f.backups, '.claude.json.backup.50');
  assert.throws(() => f.lib.writeOwned(file, 'INSTALLER', f.m), /host-owned volatile/i);
  assert.equal(fs.existsSync(file), false); assert.equal(f.m.changes.length, 0);
});

test('H02 APPLY cannot claim or overwrite an in-use marker', async t => {
  const f = await fixture(t), file = path.join(f.oldVersion, '.in_use/50');
  assert.throws(() => f.lib.writeOwned(file, 'INSTALLER', f.m), /host-owned volatile/i);
  assert.equal(fs.existsSync(file), false); assert.equal(f.m.changes.length, 0);
});

test('H01/H02 real APPLY path re-snapshots startup entries and tolerates rotation and markers during its native step', async t => {
  const f = await fixture(t); rotate(f.backups, 6); const atStart = marker(f.oldVersion, 'at-start');
  const result = f.run('apply.mjs', ['--apply'], nativeFixture(f));
  assert.equal(result.status, 0, result.stderr);
  const applied = f.lib.readManifest();
  assert.equal(applied.volatileAtApplyStart.entries.some(e => e.path.endsWith('.claude.json.backup.6')), true);
  assert.equal(applied.volatileAtApplyStart.entries.some(e => e.path === atStart), true);
  assert.equal(applied.changes.some(c => /\.in_use|\.claude\.json\.backup\./.test(c.path)), false);
  assert.equal(applied.foreign.some(c => /\.in_use|\.claude\.json\.backup\./.test(c.path)), false);
  const undone = f.run('undo.mjs', ['--apply']); assert.equal(undone.status, 0, undone.stderr);
  for (let n = 11; n < 16; n++) assert.equal(fs.readFileSync(path.join(f.backups, '.claude.json.backup.' + n), 'utf8'), `HOST ${n}\r\n`);
  assert.equal(fs.existsSync(path.join(f.backups, '.claude.json.backup.6')), false);
  assert.equal(fs.readFileSync(path.join(f.oldVersion, '.in_use/during-apply'), 'utf8'), 'HOST MARKER\r\n');
  assert.equal(fs.readFileSync(f.settings, 'utf8'), '{}\r\n');
});

test('H02 UNDO keeps the complete installed cache version marked in use during APPLY', async t => {
  const f = await fixture(t); installed(f); const file = marker(f.version, 'during-apply'); f.lib.seal(f.m, 'applied');
  const result = f.run('undo.mjs', ['--apply']); assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), 'HOST MARKER\r\n');
  assert.equal(fs.existsSync(path.join(f.version, 'index.mjs')), true, 'UNDO stripped the active version');
  assert.equal(fs.readFileSync(path.join(f.version, 'asset.txt'), 'utf8'), 'new asset\r\n');
  assert.equal(fs.readFileSync(f.settings, 'utf8'), '{}\r\n');
  const repeat = f.run('undo.mjs', ['--dry-run']); assert.equal(repeat.status, 0, repeat.stderr);
});

test('H02 a marker appearing after UNDO preflight retains its version and package files', async t => {
  const f = await fixture(t); installed(f);
  const trigger = path.join(f.home, 'unrelated', 'a'.repeat(45), 'b'.repeat(45), 'c'.repeat(45));
  f.lib.writeOwned(trigger, 'owned trigger', f.m); f.lib.seal(f.m, 'applied');
  const preload = path.join(f.root, 'marker-during-undo.mjs'), file = path.join(f.version, '.in_use/during-undo');
  fs.writeFileSync(preload, `import fs from 'node:fs';import path from 'node:path';const unlink=fs.unlinkSync;
    fs.unlinkSync=(file,...args)=>{const result=unlink(file,...args);if(path.resolve(file)===${JSON.stringify(trigger)}){fs.mkdirSync(${JSON.stringify(path.dirname(file))},{recursive:true});fs.writeFileSync(${JSON.stringify(file)},'HOST MARKER\\r\\n');}return result;};`);
  const result = f.run('undo.mjs', ['--apply'], preload); assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), 'HOST MARKER\r\n');
  assert.equal(fs.existsSync(path.join(f.version, 'index.mjs')), true, 'UNDO stripped a newly active version');
  assert.equal(fs.readFileSync(path.join(f.version, 'asset.txt'), 'utf8'), 'new asset\r\n');
  assert.equal(fs.existsSync(trigger), false);
});

test('H02 a marker arriving while its own version is being removed preserves the complete version', async t => {
  const f = await fixture(t); installed(f); f.lib.seal(f.m, 'applied');
  const first = path.join(f.version, 'index.mjs'), file = path.join(f.version, '.in_use/late-marker');
  const preload = path.join(f.root, 'late-marker.mjs');
  fs.writeFileSync(preload, `import fs from 'node:fs';import path from 'node:path';const unlink=fs.unlinkSync;let made=false;
    fs.unlinkSync=(file,...args)=>{const result=unlink(file,...args);if(!made&&path.resolve(file)===${JSON.stringify(first)}){made=true;fs.mkdirSync(${JSON.stringify(path.dirname(file))},{recursive:true});fs.writeFileSync(${JSON.stringify(file)},'HOST MARKER\\r\\n');}return result;};`);
  const result = f.run('undo.mjs', ['--apply'], preload); assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), 'HOST MARKER\r\n');
  assert.equal(fs.readFileSync(first, 'utf8'), 'new version\r\n');
  assert.equal(fs.readFileSync(path.join(f.version, 'asset.txt'), 'utf8'), 'new asset\r\n');
  assert.equal(fs.readFileSync(f.settings, 'utf8'), '{}\r\n');
});

test('H02 copying a native cache version never copies or journals its host markers', async t => {
  const f = await fixture(t), stage = path.join(f.root, 'native/.claude/plugins/cache/bgzflow-live/bgzflow/0.3.0');
  fs.mkdirSync(stage, { recursive: true }); fs.writeFileSync(path.join(stage, 'index.mjs'), 'package'); marker(stage, 'native-host');
  f.lib.copyRaw(stage, f.version, f.m);
  assert.equal(fs.existsSync(path.join(f.version, '.in_use')), false);
  assert.equal(f.m.changes.some(c => c.path.includes('.in_use')), false);
});

test('H02 the native host receives cache references in its own isolated profile', async t => {
  const f = await fixture(t), old = path.join(f.oldVersion, 'index.mjs'), file = marker(f.oldVersion);
  fs.writeFileSync(path.join(f.home, '.claude/plugins/installed_plugins.json'), JSON.stringify({ plugins: {
    'bgzflow@bgzflow-live': [{ scope: 'user', installPath: f.oldVersion, version: '0.2.0' }] } }));
  const host = await import(pathToFileURL(path.join(f.kit, 'host-stage.mjs'))), stage = host.hostStage(f.m, 'claude');
  const registry = JSON.parse(fs.readFileSync(path.join(stage.config, 'plugins/installed_plugins.json'), 'utf8'));
  const installedPath = registry.plugins['bgzflow@bgzflow-live'][0].installPath;
  assert.equal(installedPath.startsWith(path.join(stage.config, 'plugins/cache') + path.sep), true,
    'The native provider could mutate the destination cache through its old registry');
  assert.equal(fs.readFileSync(old, 'utf8'), 'old version\r\n');
  assert.equal(fs.readFileSync(file, 'utf8'), 'HOST MARKER\r\n');
});

test('H02 unavailable metadata for a host marker never blocks APPLY or UNDO', async t => {
  const f = await fixture(t), file = marker(f.oldVersion, 'locked-marker');
  const preload = path.join(f.root, 'locked-marker.mjs'), provider = nativeFixture(f);
  fs.writeFileSync(preload, `import ${JSON.stringify(pathToFileURL(provider).href)};import fs from 'node:fs';import path from 'node:path';
    const stat=fs.lstatSync;fs.lstatSync=(p,...args)=>{if(path.resolve(p)===${JSON.stringify(file)}){const e=new Error('Host marker is exclusively open');e.code='EPERM';throw e;}return stat(p,...args);};`);
  const result = f.run('apply.mjs', ['--apply'], preload); assert.equal(result.status, 0, result.stderr);
  const applied = f.lib.readManifest();
  assert.equal(applied.volatileAtApplyStart.entries.some(e => e.path === file && e.error === 'EPERM'), true);
  const undone = f.run('undo.mjs', ['--apply'], preload); assert.equal(undone.status, 0, undone.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), 'HOST MARKER\r\n');
});

test('H01/H02 every ordinary backup, cache file and lookalike path stays exact-match', async t => {
  const f = await fixture(t);
  fs.writeFileSync(path.join(f.backups, 'stable.json'), 'foreign change');
  const backup = f.run('apply.mjs', ['--dry-run']); assert.equal(backup.status, 1); assert.match(backup.stderr, /Target changed/);
  fs.writeFileSync(path.join(f.backups, 'stable.json'), 'KEEP STABLE BACKUP\r\n');
  fs.writeFileSync(path.join(f.oldVersion, 'index.mjs'), 'foreign change');
  const cache = f.run('apply.mjs', ['--dry-run']); assert.equal(cache.status, 1); assert.match(cache.stderr, /Target changed/);
  fs.writeFileSync(path.join(f.oldVersion, 'index.mjs'), 'old version\r\n');
  fs.mkdirSync(path.join(f.home, 'unrelated'), { recursive: true });
  fs.writeFileSync(path.join(f.home, 'unrelated/.claude.json.backup.50'), 'ordinary file');
  const lookalike = f.run('apply.mjs', ['--dry-run']); assert.equal(lookalike.status, 1); assert.match(lookalike.stderr, /Target changed/);
});

test('kit-owned before copies and payload resolve relative to a relocated kit', async t => {
  const f = await fixture(t), relocated = path.join(f.root, 'relocated-kit');
  fs.renameSync(f.kit, relocated);
  const moved = await import(pathToFileURL(path.join(relocated, 'cutover-lib.mjs'))), m = moved.readManifest();
  moved.verifyBackup(m); moved.verifyPayload(m);
  const raw = fs.readFileSync(path.join(relocated, 'manifest.json'), 'utf8');
  assert.equal(raw.includes(f.kit.replaceAll('\\', '\\\\')), false);
  assert.equal(m.payload, path.join(relocated, 'payload'));
});
