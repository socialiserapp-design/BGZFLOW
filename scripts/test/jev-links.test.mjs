// Task 20: bg-jev links at switch-on, removed on rollback. Runs only against a scratch home, never the real one.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { link, plan, status, unlink } from '../jev-links.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'jev-links.mjs');
const base = fs.mkdtempSync(path.join(process.env.BGZFLOW_TEST_TMP || os.tmpdir(), 'jevlinks-'));
after(() => fs.rmSync(base, { recursive: true, force: true }));

function scratchHome(name) {
  const home = path.join(base, name);
  const plugin = path.join(home, '.claude', 'bgzflow-plugin', 'current');
  fs.mkdirSync(path.join(plugin, 'skills', 'bg-jev'), { recursive: true });
  fs.writeFileSync(path.join(plugin, 'skills', 'bg-jev', 'SKILL.md'), '---\nname: bg-jev\n---\nbody\n');
  return { home, plugin };
}

describe('scripts/jev-links.mjs', () => {
  it('links all three places, reads through each, is safe to run twice, and unlinks only the links', () => {
    const { home, plugin } = scratchHome('a');
    const p = plan({ home });
    assert.deepEqual(p.links.map((l) => path.relative(home, l.link).split(path.sep).join('/')), ['.codex/BGZFLOW/bg-jev', '.codex/skills/bg-jev', '.claude/skills/bg-jev']);
    assert.equal(status({ home }).ok, false);

    const first = link({ home });
    assert.equal(first.ok, true, JSON.stringify(first));
    assert.deepEqual(first.results.map((r) => r.result), ['linked', 'linked', 'linked']);
    for (const l of p.links) assert.match(fs.readFileSync(path.join(l.link, 'SKILL.md'), 'utf8'), /name: bg-jev/);
    assert.equal(status({ home }).ok, true);
    assert.deepEqual(link({ home }).results.map((r) => r.result), ['already linked', 'already linked', 'already linked']);

    const back = unlink({ home });
    assert.equal(back.ok, true);
    assert.deepEqual(back.results.map((r) => r.result), ['removed the link', 'removed the link', 'removed the link']);
    for (const l of p.links) assert.equal(fs.existsSync(l.link), false);
    assert.ok(fs.existsSync(path.join(plugin, 'skills', 'bg-jev', 'SKILL.md')), 'the skill itself is untouched');
    assert.deepEqual(unlink({ home }).results.map((r) => r.result), ['not there', 'not there', 'not there']);
  });

  it('never replaces or removes a real folder that is already there', () => {
    const { home } = scratchHome('b');
    const own = path.join(home, '.claude', 'skills', 'bg-jev');
    fs.mkdirSync(own, { recursive: true });
    fs.writeFileSync(path.join(own, 'mine.txt'), 'keep');
    const r = link({ home });
    assert.equal(r.ok, false);
    assert.match(r.results[2].result, /^kept: a real folder/);
    const u = unlink({ home });
    assert.equal(u.ok, false);
    assert.match(u.results[0].result, /^kept: a real folder/);
    assert.equal(fs.readFileSync(path.join(own, 'mine.txt'), 'utf8'), 'keep');
  });

  it('refuses to link when the plugin has no bg-jev skill, and --dry changes nothing', () => {
    const home = path.join(base, 'c');
    fs.mkdirSync(home, { recursive: true });
    const r = link({ home });
    assert.equal(r.ok, false);
    assert.match(r.err, /no bg-jev\/SKILL\.md/);
    const s = scratchHome('d');
    const dry = link({ home: s.home, dry: true });
    assert.deepEqual(dry.results.map((x) => x.result), ['would link', 'would link', 'would link']);
    assert.equal(fs.existsSync(path.join(s.home, '.claude', 'skills', 'bg-jev')), false);
  });

  it('the command line takes --home and exits 0 on link and unlink', () => {
    const { home } = scratchHome('e');
    for (const cmd of ['link', 'status', 'unlink']) {
      const r = spawnSync(process.execPath, [SCRIPT, cmd, '--home', home], { encoding: 'utf8' });
      assert.equal(r.status, 0, `${cmd}: ${r.stdout}${r.stderr}`);
    }
    assert.equal(spawnSync(process.execPath, [SCRIPT, 'nope'], { encoding: 'utf8' }).status, 2);
  });
});
