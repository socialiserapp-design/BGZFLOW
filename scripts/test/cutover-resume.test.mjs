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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-resume-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const kit = path.join(root, 'kit'), home = path.join(root, 'home'); fs.mkdirSync(kit); fs.mkdirSync(home);
  for (const name of modules) fs.copyFileSync(path.join(source, name), path.join(kit, name));
  const lib = await import(pathToFileURL(path.join(kit, 'cutover-lib.mjs')));
  const payload = path.join(kit, 'payload'); fs.mkdirSync(payload); const bytes = Buffer.from('candidate\r\n'); fs.writeFileSync(path.join(payload, 'index.mjs'), bytes);
  const release = { releaseCommit: 'fixture-release', releaseTree: 'fixture-tree', files: [{ name: 'index.mjs', sha256: lib.sha256(bytes),
    oid: crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') }] };
  fs.writeFileSync(path.join(kit, 'release-manifest.json'), JSON.stringify(release));
  const settings = path.join(home, '.claude/settings.json'); lib.writeOwned(settings, '{}\r\n');
  lib.writeOwned(path.join(home, '.codex/config.toml'), '[fixture]\nvalue = true\n');
  const marketplaceRoot = path.join(home, '.claude/marketplace');
  const m = lib.prepare({ home, profile: 'disposable', payload, marketplaceRoot, packageRoot: path.join(marketplaceRoot, release.releaseCommit),
    claudeExe: process.execPath, releaseCommit: release.releaseCommit, releaseTree: release.releaseTree }, [['home', home]]);
  const control = path.join(root, 'control.json'), log = path.join(root, 'calls.jsonl'), fake = path.join(root, 'fake-native.mjs'), preload = path.join(root, 'preload.mjs');
  fs.writeFileSync(fake, `import fs from 'node:fs';import path from 'node:path';
    const control=JSON.parse(fs.readFileSync(${JSON.stringify(control)},'utf8'));let args=process.argv.slice(2);
    const host=args[0]?.endsWith('codex-cli.mjs')?'codex':'claude';if(host==='codex')args=args.slice(1);
    const op=args[1]==='marketplace'?'marketplace-update':host==='codex'?'codex-plugin-'+args[1]:'plugin-'+args[1];
    fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({host,op})+'\\n');
    const config=host==='claude'?process.env.CLAUDE_CONFIG_DIR:process.env.CODEX_HOME;
    const installedPath=path.join(config,'plugins/cache/bgzflow-live/bgzflow/0.3.0');fs.mkdirSync(installedPath,{recursive:true});
    if(control.fail===op){fs.writeFileSync(path.join(config,'resume-sentinel'),'KEEP ISOLATED PARTIAL STATE');fs.writeFileSync(path.join(installedPath,'index.mjs'),'partial');
      process.stdout.write('Checking for updates…');if(control.kind==='exit')process.exit(9);else await new Promise(r=>setTimeout(r,6000));}
    fs.writeFileSync(path.join(installedPath,'index.mjs'),'candidate\\r\\n');
    if(host==='claude'){
      fs.mkdirSync(path.join(config,'plugins'),{recursive:true});fs.writeFileSync(path.join(config,'plugins/installed_plugins.json'),JSON.stringify({plugins:{'bgzflow@bgzflow-live':[{scope:'user',installPath:installedPath,version:'0.3.0'}]}}));
      fs.writeFileSync(path.join(config,'plugins/known_marketplaces.json'),'{}');
      process.stdout.write(args[1]==='list'?JSON.stringify([{id:'bgzflow@bgzflow-live',version:'0.3.0',enabled:true}]):'{}');
    }else process.stdout.write(JSON.stringify(args[1]==='list'?{installed:[{pluginId:'bgzflow@bgzflow-live',version:'0.3.0',enabled:true}]}:{version:'0.3.0',installedPath}));`);
  fs.writeFileSync(preload, `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';const original=cp.spawnSync;cp.spawnSync=(exe,args,options)=>original(process.execPath,[${JSON.stringify(fake)},...args],options);syncBuiltinESMExports();`);
  const set = (fail, kind = 'timeout') => fs.writeFileSync(control, JSON.stringify({ fail, kind })); set(null);
  const run = (script, args, folder = kit) => spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(folder, script), ...args],
    // Allow loaded desktops to start healthy Node children; the intentional six-second
    // stall above still exceeds this deadline and must produce a real ETIMEDOUT.
    { encoding: 'utf8', timeout: 30000, env: { ...process.env, BGZFLOW_NATIVE_TIMEOUT_MS: '5000' } });
  const calls = () => fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : [];
  async function codex() {
    assert.equal(run('apply.mjs', ['--apply']).status, 0);
    const refresh = path.join(kit, 'codex-refresh'); fs.mkdirSync(refresh);
    for (const name of modules) fs.copyFileSync(path.join(kit, name), path.join(refresh, name));
    fs.copyFileSync(path.join(kit, 'release-manifest.json'), path.join(refresh, 'release-manifest.json'));
    const cl = await import(pathToFileURL(path.join(refresh, 'cutover-lib.mjs')));
    cl.prepare({ home, profile: 'disposable-codex', payload, packageRoot: m.packageRoot, parentBackup: kit,
      codexCli: path.join(kit, 'codex-cli.mjs'), releaseCommit: m.releaseCommit, releaseTree: m.releaseTree },
      [['config', path.join(home, '.codex/config.toml')], ['cache', path.join(home, '.codex/plugins/cache/bgzflow-live')]]);
    return { refresh, cl };
  }
  return { root, kit, home, lib, m, settings, run, set, calls, codex };
}

test('N01 native default is 600 seconds, environment overrides it, explicit timeout wins, and bad values refuse', async t => {
  const f = await fixture(t), probe = path.join(f.root, 'timeout-probe.mjs');
  fs.writeFileSync(probe, `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';cp.spawnSync=(exe,args,options)=>({status:0,stdout:String(options.timeout),stderr:''});syncBuiltinESMExports();const lib=await import(${JSON.stringify(pathToFileURL(path.join(f.kit, 'cutover-lib.mjs')).href)});const m=lib.readManifest();const explicit=process.argv[2];const r=lib.native(m,'probe',[],{env:process.env,...(explicit?{timeout:Number(explicit)}:{})});console.log(JSON.stringify({timeout:Number(r.stdout),receiptTimeout:r.timeoutMs}));`);
  const probeRun = (envValue, explicit) => {
    const env = { ...process.env }; delete env.BGZFLOW_NATIVE_TIMEOUT_MS; if (envValue !== undefined) env.BGZFLOW_NATIVE_TIMEOUT_MS = envValue;
    return spawnSync(process.execPath, [probe, ...(explicit ? [explicit] : [])], { encoding: 'utf8', env });
  };
  for (const [value, explicit, wanted] of [[undefined, undefined, 600000], ['730000', undefined, 730000], ['730000', '1700', 1700]]) {
    const r = probeRun(value, explicit); assert.equal(r.status, 0, r.stderr); const result = JSON.parse(r.stdout.trim().split('\n').at(-1));
    assert.equal(result.timeout, wanted); assert.equal(result.receiptTimeout, wanted);
  }
  assert.notEqual(probeRun('invalid').status, 0);
});

test('N02 actual fake Claude command times out; resume reuses the stage and continues only from plugin-update', async t => {
  const f = await fixture(t); f.set('plugin-update'); const failed = f.run('apply.mjs', ['--apply']);
  assert.notEqual(failed.status, 0); const m = f.lib.readManifest(); assert.equal(m.phase, 'failed'); assert.equal(m.failure.operation, 'plugin-update');
  const receipt = JSON.parse(fs.readFileSync(path.join(f.kit, 'receipts/plugin-update.json'))); assert.equal(receipt.error, 'ETIMEDOUT');
  assert.equal(fs.readFileSync(f.settings, 'utf8'), '{}\r\n');
  f.set(null); const result = f.run('apply.mjs', ['--resume']); assert.equal(result.status, 0, result.stderr);
  const resumed = f.lib.readManifest(); assert.equal(resumed.phase, 'applied'); assert.equal(resumed.hostStages.claude.home, m.hostStages.claude.home);
  assert.equal(fs.readFileSync(path.join(resumed.hostStages.claude.config, 'resume-sentinel'), 'utf8'), 'KEEP ISOLATED PARTIAL STATE');
  assert.equal(f.calls().filter(c => c.op === 'marketplace-update').length, 1);
  assert.equal(f.calls().filter(c => c.op === 'plugin-update').length, 2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.kit, 'receipts/plugin-update.json'))).error, 'ETIMEDOUT');
  assert.equal(f.lib.verifyPayload(resumed, resumed.installedPath), 1);
  assert.equal(f.run('undo.mjs', ['--apply']).status, 0); assert.equal(fs.readFileSync(f.settings, 'utf8'), '{}\r\n');
});

for (const owned of [false, true]) test('N03 Claude resume refuses ' + (owned ? 'journalled' : 'ordinary') + ' live drift before any new native command and points at UNDO', async t => {
  const f = await fixture(t); f.set('plugin-update', 'exit'); assert.notEqual(f.run('apply.mjs', ['--apply']).status, 0);
  const m = f.lib.readManifest(), file = owned ? path.join(f.m.marketplaceRoot, '.claude-plugin/marketplace.json') : f.settings;
  fs.appendFileSync(file, '\nFOREIGN LIVE WRITE'); const calls = f.calls().length, current = f.lib.state(f.home); f.set(null);
  const r = f.run('apply.mjs', ['--resume']); assert.notEqual(r.status, 0); assert.match(r.stderr, /resume refused[\s\S]*UNDO/i);
  assert.equal(f.calls().length, calls); assert.ok(f.lib.equal(f.lib.state(f.home), current)); assert.equal(f.lib.readManifest().phase, m.phase);
});

for (const step of ['codex-plugin-add', 'codex-plugin-list']) test('N04 Codex timeout at ' + step + ' resumes from that isolated operation', async t => {
  const f = await fixture(t), { refresh, cl } = await f.codex(); f.set(step);
  assert.notEqual(f.run('codex-apply.mjs', ['--apply', '--codex-app-closed'], refresh).status, 0);
  const m = cl.readManifest(); assert.equal(m.phase, 'failed');
  assert.equal(JSON.parse(fs.readFileSync(path.join(refresh, 'receipts', step + '.json'))).error, 'ETIMEDOUT');
  f.set(null); const r = f.run('codex-apply.mjs', ['--resume', '--codex-app-closed'], refresh); assert.equal(r.status, 0, r.stderr);
  assert.equal(cl.readManifest().phase, 'applied');
  assert.equal(f.calls().filter(c => c.host === 'codex' && c.op === 'codex-plugin-add').length, step === 'codex-plugin-add' ? 2 : 1);
});

test('N05 Codex resume refuses drift in live config and preserves every byte', async t => {
  const f = await fixture(t), { refresh, cl } = await f.codex(); f.set('codex-plugin-add', 'exit');
  assert.notEqual(f.run('codex-apply.mjs', ['--apply', '--codex-app-closed'], refresh).status, 0);
  fs.appendFileSync(path.join(f.home, '.codex/config.toml'), '\n# OTHER WRITER\n'); const before = f.lib.state(f.home), calls = f.calls().length; f.set(null);
  const r = f.run('codex-apply.mjs', ['--resume', '--codex-app-closed'], refresh);
  assert.notEqual(r.status, 0); assert.match(r.stderr, /resume refused[\s\S]*UNDO/i); assert.equal(f.calls().length, calls);
  assert.ok(f.lib.equal(before, f.lib.state(f.home))); assert.equal(cl.readManifest().phase, 'failed');
});

test('N06 a non-zero isolated command can resume; a live-commit failure and an in-flight manifest cannot', async t => {
  const f = await fixture(t); f.set('plugin-update', 'exit'); assert.notEqual(f.run('apply.mjs', ['--apply']).status, 0);
  f.set(null); const failed = f.lib.readManifest(); failed.operation = 'commit-native-claude'; failed.failure.operation = failed.operation; f.lib.writeManifest(failed);
  const calls = f.calls().length, r = f.run('apply.mjs', ['--resume']); assert.notEqual(r.status, 0); assert.match(r.stderr, /resume refused[\s\S]*UNDO/i); assert.equal(f.calls().length, calls);
  failed.operation = 'plugin-update'; failed.failure.operation = failed.operation; f.lib.writeManifest(failed);
  assert.equal(f.run('apply.mjs', ['--resume']).status, 0);
  const applied = f.lib.readManifest(); applied.phase = 'applying'; f.lib.writeManifest(applied);
  const inFlight = f.run('apply.mjs', ['--resume']); assert.notEqual(inFlight.status, 0); assert.match(inFlight.stderr, /resume refused[\s\S]*UNDO/i);
});

test('N07 a real live-commit collision cannot resume or claim the foreign cache file', async t => {
  const f = await fixture(t), destination = path.join(f.home, '.claude/plugins/cache/bgzflow-live/bgzflow/0.3.0/index.mjs');
  const preload = path.join(f.root, 'preload.mjs');
  fs.appendFileSync(preload, `\nimport fs from 'node:fs';import path from 'node:path';const routed=cp.spawnSync;cp.spawnSync=(exe,args,options)=>{const r=routed(exe,args,options);if(args[1]==='list'){fs.mkdirSync(path.dirname(${JSON.stringify(destination)}),{recursive:true});fs.writeFileSync(${JSON.stringify(destination)},'FOREIGN CACHE BYTES');}return r;};syncBuiltinESMExports();`);
  assert.notEqual(f.run('apply.mjs', ['--apply']).status, 0);
  const m = f.lib.readManifest(); assert.equal(m.phase, 'failed'); assert.equal(m.failure.operation, 'commit-native-claude');
  assert.equal(m.changes.some(c => c.path === destination), false); const calls = f.calls().length;
  const r = f.run('apply.mjs', ['--resume']); assert.notEqual(r.status, 0); assert.match(r.stderr, /resume refused[\s\S]*UNDO/i);
  assert.equal(f.calls().length, calls); assert.equal(fs.readFileSync(destination, 'utf8'), 'FOREIGN CACHE BYTES');
});

test('N08 repeated isolated failures retain every native receipt and can subsequently resume', async t => {
  const f = await fixture(t); f.set('plugin-update', 'exit');
  assert.notEqual(f.run('apply.mjs', ['--apply']).status, 0);
  assert.notEqual(f.run('apply.mjs', ['--resume']).status, 0);
  for (const name of ['plugin-update.json', 'plugin-update-attempt-2.json']) {
    const receipt = JSON.parse(fs.readFileSync(path.join(f.kit, 'receipts', name)));
    assert.equal(receipt.exitCode, 9); assert.match(receipt.stdout, /Checking for updates/);
  }
  f.set(null); assert.equal(f.run('apply.mjs', ['--resume']).status, 0);
  assert.equal(f.lib.readManifest().resumes.length, 2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.kit, 'receipts/plugin-update-attempt-3.json'))).exitCode, 0);
  assert.equal(f.calls().filter(c => c.op === 'marketplace-update').length, 1);
});
