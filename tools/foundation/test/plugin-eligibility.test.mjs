import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {discoverCatalog} from '../catalog.mjs';

function fixture(t) {
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'bgz-plugin-eligibility-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  return home;
}
function write(file,text) {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
function skill(directory,name) {write(path.join(directory,'SKILL.md'),`---\nname: ${name}\ndescription: A useful ${name} method\n---\nFollow the user's current task.\n`);}
function cached(home,marketplace,plugin,name,version='1.0.0') {
  const root=path.join(home,'.codex','plugins','cache',marketplace,plugin,version);
  skill(path.join(root,'skills',name),name);return root;
}
const names=options=>discoverCatalog(options).map(x=>x.name).sort();

test('Codex excludes the exact disabled marketplace plugin, not an enabled namesake or personal method',t=>{
  const home=fixture(t);
  cached(home,'unused-market','design','disabled-design');
  cached(home,'active-market','design','enabled-design');
  skill(path.join(home,'.agents','skills','personal-design'),'personal-design');
  write(path.join(home,'.codex','config.toml'),'[plugins."design@unused-market"]\nenabled = false\n[plugins."design@active-market"]\nenabled = true\n');
  assert.deepEqual(names({home}),['enabled-design','personal-design']);
});

test('Codex setting edits invalidate cached eligibility in both directions',t=>{
  const home=fixture(t),config=path.join(home,'.codex','config.toml'),cacheFile=path.join(home,'catalog.json');
  cached(home,'market','helper','helper');
  write(config,'[plugins."helper@market"]\nenabled = true\n');
  assert.deepEqual(names({home,cacheFile}),['helper']);
  write(config,'[plugins."helper@market"]\nenabled = false\n');
  assert.deepEqual(names({home,cacheFile}),[]);
  write(config,'[plugins."helper@market"]\nenabled = true\n# enabled again\n');
  assert.deepEqual(names({home,cacheFile}),['helper']);
});

test('project settings override user plugin state and Claude local settings override project settings',t=>{
  const home=fixture(t),projectRoot=path.join(home,'project');
  cached(home,'market','helper','codex-helper');
  write(path.join(home,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = false\n');
  write(path.join(projectRoot,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = true\n');
  const install=path.join(home,'.claude','plugins','cache','market','helper','1.0.0');
  skill(path.join(install,'skills','claude-helper'),'claude-helper');
  write(path.join(home,'.claude','plugins','installed_plugins.json'),JSON.stringify({plugins:{'helper@market':[{scope:'user',installPath:install}]}}));
  write(path.join(home,'.claude','settings.json'),JSON.stringify({enabledPlugins:{'helper@market':false}}));
  write(path.join(projectRoot,'.claude','settings.json'),JSON.stringify({enabledPlugins:{'helper@market':true}}));
  assert.deepEqual(names({home,projectRoot}),['claude-helper','codex-helper']);
  write(path.join(projectRoot,'.claude','settings.local.json'),JSON.stringify({enabledPlugins:{'helper@market':false}}));
  assert.deepEqual(names({home,projectRoot}),['codex-helper']);
});

test('a Claude installation scoped to another project is not imported as current',t=>{
  const home=fixture(t),projectRoot=path.join(home,'current');
  const install=path.join(home,'.claude','plugins','cache','market','scoped','1.0.0');
  skill(path.join(install,'skills','other-project'),'other-project');
  write(path.join(home,'.claude','settings.json'),JSON.stringify({enabledPlugins:{'scoped@market':true}}));
  write(path.join(home,'.claude','plugins','installed_plugins.json'),JSON.stringify({plugins:{'scoped@market':[{scope:'project',projectPath:path.join(home,'another'),installPath:install}]}}));
  assert.deepEqual(names({home,projectRoot}),[]);
});

test('Claude cached or registered plugins require activation; absence is not an enabled claim',t=>{
  const home=fixture(t),plugins=path.join(home,'.claude','plugins');
  const enabled=path.join(plugins,'cache','market','enabled','1.0.0');
  const inactive=path.join(plugins,'cache','market','inactive','1.0.0');
  skill(path.join(enabled,'skills','enabled'),'enabled');
  skill(path.join(inactive,'skills','inactive'),'inactive');
  write(path.join(plugins,'installed_plugins.json'),JSON.stringify({plugins:{'enabled@market':[{installPath:enabled}],'inactive@market':[{installPath:inactive}]}}));
  write(path.join(home,'.claude','settings.json'),JSON.stringify({enabledPlugins:{'enabled@market':true}}));
  assert.deepEqual(names({home}),['enabled']);
});

test('explicit library roots still admit deliberately included methods independently of plugin activation',t=>{
  const home=fixture(t),root=cached(home,'market','helper','deliberate-library');
  write(path.join(home,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = false\n');
  assert.deepEqual(names({home,roots:[path.join(root,'skills')]}),['deliberate-library']);
});

test('malformed project settings do not erase known user disables or personal methods',t=>{
  const home=fixture(t),projectRoot=path.join(home,'project');
  cached(home,'market','helper','disabled-helper');
  skill(path.join(home,'.agents','skills','personal'),'personal');
  write(path.join(home,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = false\n');
  write(path.join(projectRoot,'.codex','config.toml'),'[plugins. invalid toml');
  assert.deepEqual(names({home,projectRoot}),['personal']);
});

test('the current foundation keeps ownership when its exact installed path is discovered again',t=>{
  const home=fixture(t),pluginRoot=cached(home,'bgzflow-live','bgzflow','current-method');
  write(path.join(home,'.codex','config.toml'),'[plugins."bgzflow@bgzflow-live"]\nenabled = true\n');
  const entries=discoverCatalog({home,pluginRoot});
  assert.equal(entries.length,1);
  assert.equal(entries[0].name,'current-method');
  assert.equal(entries[0].origin,'bgzflow');
});

test('Codex applies repository-to-current-directory settings in order and revalidates ancestor changes',t=>{
  const home=fixture(t),repo=path.join(home,'repo'),projectRoot=path.join(repo,'src'),cacheFile=path.join(home,'catalog.json');
  cached(home,'market','helper','helper');
  write(path.join(home,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = true\n');
  write(path.join(repo,'.git','HEAD'),'ref: refs/heads/main\n');
  write(path.join(repo,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = false\n');
  fs.mkdirSync(projectRoot,{recursive:true});
  assert.deepEqual(names({home,projectRoot,cacheFile}),[]);
  write(path.join(projectRoot,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = true\n');
  assert.deepEqual(names({home,projectRoot,cacheFile}),['helper']);
  write(path.join(projectRoot,'.codex','config.toml'),'# inherit repository state\n');
  write(path.join(repo,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = true\n');
  assert.deepEqual(names({home,projectRoot,cacheFile}),['helper']);
  write(path.join(repo,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = false\n');
  assert.deepEqual(names({home,projectRoot,cacheFile}),[]);
});

test('Codex respects custom root markers and an explicit empty marker list',t=>{
  const home=fixture(t),repo=path.join(home,'repo'),projectRoot=path.join(repo,'src');
  cached(home,'market','helper','helper');
  write(path.join(home,'.codex','config.toml'),'project_root_markers = ["workspace.marker"]\n[plugins."helper@market"]\nenabled = true\n');
  write(path.join(repo,'workspace.marker'),'root');
  write(path.join(repo,'.codex','config.toml'),'[plugins."helper@market"]\nenabled = false\n');
  fs.mkdirSync(projectRoot,{recursive:true});
  assert.deepEqual(names({home,projectRoot}),[]);
  write(path.join(home,'.codex','config.toml'),'project_root_markers = []\n[plugins."helper@market"]\nenabled = true\n');
  assert.deepEqual(names({home,projectRoot}),['helper']);
});
