import {realpathSync as canonicalTestPath} from 'node:fs'; // Resolve OS temp aliases before testing descendant link protection.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { discoverCatalog, readSkill } from '../catalog.mjs';

function fixture(t) { const dir = fs.mkdtempSync(path.join(canonicalTestPath(os.tmpdir()), 'bg-catalog-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
function skill(dir, name, description = 'A complete useful description', body = 'Real instructions') { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: >-\n  ${description}\n---\n${body}`); }

test('full descriptions and distinct same-name sources survive; generated overlays do not', (t) => {
  const root = fixture(t); const description = 'Preserve this full description. '.repeat(30);
  skill(path.join(root, 'one'), 'same-name', description);
  skill(path.join(root, 'two'), 'same-name', 'Different useful behaviour');
  skill(path.join(root, 'skills-overlay', 'fake'), 'fake');
  const entries = discoverCatalog({ roots: [root, root] });
  assert.equal(entries.length, 2); assert.notEqual(entries[0].id, entries[1].id);
  assert.ok(entries.some((e) => e.description.length > 220));
  assert.ok(readSkill(entries[0]).body.includes('Real instructions'));
});

test('nested symlink escape cannot admit another directory', (t) => {
  const root = fixture(t); const outside = fixture(t); skill(path.join(outside, 'secret'), 'outside');
  fs.symlinkSync(path.join(outside, 'secret'), path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.deepEqual(discoverCatalog({ roots: [root] }), []);
});

test('catalogue read rejects a changed file', (t) => {
  const root = fixture(t); skill(path.join(root, 'one'), 'one'); const [entry] = discoverCatalog({ roots: [root] });
  fs.appendFileSync(entry.path, '\nNew instructions'); assert.throws(() => readSkill(entry), /changed/);
});

test('installed registry admits its active version; Codex cache discovery selects latest fallback', (t) => {
  const home = fixture(t); const cache = path.join(home, '.codex', 'plugins', 'cache', 'vendor', 'package');
  skill(path.join(cache, '1.0.0', 'skills', 'old'), 'old'); skill(path.join(cache, '2.0.0', 'skills', 'new'), 'new');
  assert.deepEqual(discoverCatalog({ home }).map((e) => e.name), ['new']);
  const plugins = path.join(home, '.claude', 'plugins');
  skill(path.join(plugins, 'cache', 'v', 'p', '1', 'skills', 'registered'), 'registered');
  skill(path.join(plugins, 'cache', 'v', 'p', '2', 'skills', 'stale'), 'stale');
  fs.writeFileSync(path.join(plugins, 'installed_plugins.json'), JSON.stringify({ plugins: { 'p@v': [{ installPath: path.join(plugins, 'cache', 'v', 'p', '1') }] } }));
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({ enabledPlugins: { 'p@v': true } }));
  const names = discoverCatalog({ home }).map((e) => e.name); assert.ok(names.includes('registered')); assert.ok(!names.includes('stale'));
});

test('active foundation shadows stale same-owner copies while independent same-name skills remain', (t) => {
  const home = fixture(t), current = fixture(t);
  skill(path.join(current, 'skills', 'core'), 'core', 'Current foundation');
  skill(path.join(home, '.codex', 'plugins', 'cache', 'vendor', 'bgzflow', '1.0.0', 'skills', 'core'), 'core', 'Old foundation');
  skill(path.join(home, '.agents', 'skills', 'core'), 'core', 'Independent custom skill');
  const entries = discoverCatalog({ home, pluginRoot: current }).filter((e) => e.name === 'core');
  assert.equal(entries.length, 2); assert.ok(entries.some((e) => e.origin === 'bgzflow')); assert.ok(!entries.some((e) => e.description === 'Old foundation'));
});

test('current foundation excludes unique retired skills in old packs, not independent namesakes', (t) => {
  const home = fixture(t), current = fixture(t);
  skill(path.join(current, 'skills', 'current'), 'current');
  skill(path.join(home, '.grok', 'installed-plugins', 'bgzflow', 'skills', 'old-only'), 'old-only', 'Retired BGZFLOW machinery');
  skill(path.join(home, '.codex', 'plugins', 'cache', 'vendor', 'bgzflow', '1.0.0', 'skills', 'other-old'), 'other-old');
  skill(path.join(home, '.agents', 'skills', 'independent'), 'old-only', 'Independent user method');
  const entries = discoverCatalog({ home, pluginRoot: current });
  assert.ok(!entries.some((e) => e.description === 'Retired BGZFLOW machinery'));
  assert.ok(!entries.some((e) => e.name === 'other-old'));
  assert.ok(entries.some((e) => e.name === 'old-only' && e.description === 'Independent user method'));
});

test('explicitly disabled registered plugins are excluded', (t) => {
  const home = fixture(t), plugins = path.join(home, '.claude', 'plugins');
  const installed = path.join(plugins, 'cache', 'vendor', 'disabled', '1.0.0');
  skill(path.join(installed, 'skills', 'no'), 'no');
  fs.writeFileSync(path.join(plugins, 'installed_plugins.json'), JSON.stringify({ plugins: { 'disabled@vendor': [{ installPath: installed }] } }));
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({ enabledPlugins: { 'disabled@vendor': false } }));
  assert.deepEqual(discoverCatalog({ home }), []);
});

test('metadata cache notices edited skills, new skills and registry changes', (t) => {
  const root = fixture(t), cache = path.join(fixture(t), 'catalog.json');
  skill(path.join(root, 'one'), 'one');
  const first = discoverCatalog({ roots: [root], cacheFile: cache });
  assert.deepEqual(discoverCatalog({ roots: [root], cacheFile: cache }), first);
  fs.appendFileSync(first[0].path, '\nChanged instructions');
  const changed = discoverCatalog({ roots: [root], cacheFile: cache }); assert.notEqual(changed[0].version, first[0].version);
  skill(path.join(root, 'two'), 'two'); assert.equal(discoverCatalog({ roots: [root], cacheFile: cache }).length, 2);
});

test('native canonical catalogue identity survives path aliases and Windows case variants',t=>{
  const root=fixture(t);skill(path.join(root,'actual'),'canonical');
  fs.symlinkSync(path.join(root,'actual'),path.join(root,'alias'),process.platform==='win32'?'junction':'dir');
  const [entry]=discoverCatalog({roots:[root]});
  assert.equal(entry.path,fs.realpathSync.native(path.join(root,'actual','SKILL.md')));
  assert.equal(discoverCatalog({roots:[root]}).length,1);
  if(process.platform==='win32')assert.deepEqual(discoverCatalog({roots:[root.toUpperCase()]}),discoverCatalog({roots:[root]}));
  assert.match(readSkill(entry).body,/Real instructions/);
});
