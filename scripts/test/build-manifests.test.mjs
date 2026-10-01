import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("build-manifests --check finds no drift in the committed files", () => {
  const r = spawnSync(process.execPath, ["scripts/build-manifests.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("tools and swarm workflows are found by the default commands/ scan", () => {
  const tools = readdirSync(join(root, "tools"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(root, "tools", e.name, `${e.name}.mjs`)))
    .map((e) => e.name)
    .sort();
  const commands = readdirSync(join(root, "commands"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
  const workflows = ['swarm', 'swarm-check', 'swarm-design', 'swarm-fix', 'swarm-research', 'swarm-ship'];
  assert.deepEqual(commands, [...tools, ...workflows].sort());
  for (const name of tools) {
    const body = readFileSync(join(root, "commands", `${name}.md`), "utf8");
    assert.ok(body.includes(`node "\${CLAUDE_PLUGIN_ROOT}/tools/${name}/${name}.mjs" $ARGUMENTS`), name);
    // User-invoked only: the skills already give agents the direct command, so these add no always-on context.
    assert.match(body, /^disable-model-invocation: true$/m, name);
  }
  // A `commands` key would replace the default scan, and listed commands did not load in Claude Code 2.1.284.
  const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(manifest.commands, undefined);
});

test("generation registers swarm helpers without overwriting authored workflows", () => {
  const dir = mkdtempSync(join(tmpdir(), 'swarm-manifests-'));
  try {
    mkdirSync(join(dir, 'scripts'));
    mkdirSync(join(dir, 'commands'));
    copyFileSync(join(root, 'scripts', 'build-manifests.mjs'), join(dir, 'scripts', 'build-manifests.mjs'));
    writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
    const authored = '# Owned workflow\nKeep this user-authored command.\n';
    writeFileSync(join(dir, 'commands', 'swarm.md'), authored);
    const generated = spawnSync(process.execPath, ['scripts/build-manifests.mjs'], { cwd: dir, encoding: 'utf8' });
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(existsSync(join(dir, 'commands', 'swarm-resources.md')), true);
    assert.equal(existsSync(join(dir, 'commands', 'swarm-status.md')), true);
    assert.equal(readFileSync(join(dir, 'commands', 'swarm.md'), 'utf8'), authored);
    const checked = spawnSync(process.execPath, ['scripts/build-manifests.mjs', '--check'], { cwd: dir, encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
    writeFileSync(join(dir, 'commands', 'swarm-status.md'), 'stale\n');
    assert.equal(spawnSync(process.execPath, ['scripts/build-manifests.mjs', '--check'], { cwd: dir }).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Catches generated installs fetching a scaffold or a different repository.
test('generated host manifests and marketplace sources use the public publishing identity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'public-manifests-'));
  try {
    mkdirSync(join(dir, 'scripts'));
    copyFileSync(join(root, 'scripts', 'build-manifests.mjs'), join(dir, 'scripts', 'build-manifests.mjs'));
    writeFileSync(join(dir, 'VERSION'), '0.2.0\n');
    const r = spawnSync(process.execPath, ['scripts/build-manifests.mjs'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const repo = 'https://github.com/socialiserapp-design/BGZFLOW';
    for (const file of ['plugin.json', '.claude-plugin/plugin.json']) {
      const manifest = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      assert.equal(manifest.version, '0.2.0');
      assert.equal(manifest.repository, repo);
      assert.equal(manifest.homepage, repo);
      assert.equal(manifest.license, 'MIT');
    }
    for (const file of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json', '.grok-plugin/marketplace.json']) {
      const marketplace = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      assert.deepEqual(marketplace.plugins[0].source, { source: 'url', url: repo });
      if (marketplace.owner) assert.equal(marketplace.owner.name, 'socialiserapp-design');
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('MBG1 regeneration preserves tier refresh, admission and reported-usage instructions',()=>{
  const dir=mkdtempSync(join(tmpdir(),'gate-manifests-'));
  try{mkdirSync(join(dir,'scripts'));copyFileSync(join(root,'scripts/build-manifests.mjs'),join(dir,'scripts/build-manifests.mjs'));writeFileSync(join(dir,'VERSION'),'0.2.0\n');
    assert.equal(spawnSync(process.execPath,['scripts/build-manifests.mjs'],{cwd:dir}).status,0);
    const gate=readFileSync(join(dir,'commands/swarm-gate.md'),'utf8');assert.match(gate,/refresh-models/);assert.match(gate,/admission/);
    assert.match(readFileSync(join(dir,'commands/swarm-resources.md'),'utf8'),/--refresh-models --policy/);
    assert.match(readFileSync(join(dir,'commands/swarm-status.md'),'utf8'),/escalated.*usage|escalated job\/hour usage/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
