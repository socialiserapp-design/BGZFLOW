// Offline tests for tools/jev/preflight.mjs (`bgz preflight`): it flags a stray skill folder, a plugin overview over
// 4,000 characters and ANTHROPIC_API_KEY, and it is read-only. Everything runs against scratch homes and projects under
// <repo>/.tmp/; the developer's real ~/.claude and ~/.codex are never read (home is passed in, or USERPROFILE/HOME is
// pointed at the scratch home for the child process). No network, no key.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { ROOT, makeProject, removeDir, runNode, write } from '../../../hooks/test/helpers.mjs';
import { LIMIT_CHARS, preflight } from '../preflight.mjs';

const BGZ = path.join(ROOT, 'tools', 'bgz.mjs');
const FAKE_ANTHROPIC = ['sk-ant', '-api03-', 'NOT-A-REAL-KEY-0123456789'].join('');
const dirs = [];
const scratch = () => {
  const d = makeProject('jevpf');
  dirs.push(d);
  return d;
};
after(() => {
  for (const d of dirs) removeDir(d);
});

// A scratch home and a scratch project, side by side.
function fixture() {
  const d = scratch();
  const home = path.join(d, 'home');
  const project = path.join(d, 'project');
  fs.mkdirSync(home);
  fs.mkdirSync(project);
  return { d, home, project };
}
const skill = (root, name, description = 'Does a small thing.') =>
  write(root, path.join(name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\nBody.\n`);
const kinds = (res) => res.findings.map((f) => f.kind).sort();
const chars = (n, ch = 'a') => ch.repeat(n);

// A fingerprint of every file and folder under a root: path, size and content hash. Equal before and after means nothing
// was created, changed or removed.
function snapshot(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        out.push(`D ${path.relative(root, p)}`);
        walk(p);
      } else {
        out.push(`F ${path.relative(root, p)} ${fs.statSync(p).size} ${crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex')}`);
      }
    }
  };
  walk(root);
  return out.join('\n');
}

describe('preflight: a clean machine', () => {
  it('flags nothing when there are no skill folders, no overviews and no key', () => {
    const { home, project } = fixture();
    const res = preflight({ dir: project, env: {}, home });
    assert.deepEqual(res, { ok: true, findings: [] });
  });

  it('a healthy skill folder (SKILL.md with a short description) is not flagged', () => {
    const { home, project } = fixture();
    skill(path.join(home, '.claude', 'skills'), 'good-skill');
    skill(path.join(project, '.claude', 'skills'), 'project-skill');
    assert.equal(preflight({ dir: project, env: {}, home }).ok, true);
  });

  it('the limit is 4,000 characters, counted in code', () => {
    assert.equal(LIMIT_CHARS, 4000);
  });
});

describe('preflight: stray skill folders', () => {
  it('a folder with no SKILL.md under a skills root is a stray-skill-folder, with its path', () => {
    const { home, project } = fixture();
    const stray = path.join(home, '.claude', 'skills', 'half-copied');
    fs.mkdirSync(stray, { recursive: true });
    write(stray, 'notes.txt', 'left over');
    skill(path.join(home, '.claude', 'skills'), 'real-skill');
    const res = preflight({ dir: project, env: {}, home });
    assert.equal(res.ok, false);
    assert.deepEqual(kinds(res), ['stray-skill-folder']);
    assert.equal(res.findings[0].path, stray);
    assert.match(res.findings[0].note, /SKILL\.md/);
  });

  it('every skills root is checked: ~/.claude, ~/.codex, ~/.agents and the project .claude and .agents', () => {
    const { home, project } = fixture();
    const roots = [
      path.join(home, '.claude', 'skills'),
      path.join(home, '.codex', 'skills'),
      path.join(home, '.agents', 'skills'),
      path.join(project, '.claude', 'skills'),
      path.join(project, '.agents', 'skills'),
    ];
    for (const [i, r] of roots.entries()) fs.mkdirSync(path.join(r, `stray-${i}`), { recursive: true });
    const res = preflight({ dir: project, env: {}, home });
    assert.equal(res.findings.length, 5);
    assert.deepEqual(res.findings.map((f) => f.path).sort(), roots.map((r, i) => path.join(r, `stray-${i}`)).sort());
  });

  it('a dot-folder (such as .system) is managed by the host and is not flagged; a loose file is not a folder', () => {
    const { home, project } = fixture();
    const root = path.join(home, '.codex', 'skills');
    fs.mkdirSync(path.join(root, '.system'), { recursive: true });
    write(root, 'README.txt', 'not a skill folder');
    assert.equal(preflight({ dir: project, env: {}, home }).ok, true);
  });

  it('a missing skills root is fine', () => {
    const { home, project } = fixture();
    assert.equal(preflight({ dir: path.join(project, 'does-not-exist'), env: {}, home: path.join(home, 'nope') }).ok, true);
  });

  // The module header says "the same skill name in two places" is flagged too. It is a warning line, never a block.
  it('the same skill name in two different folders is reported as a warning that does not make ok false', () => {
    const { home, project } = fixture();
    skill(path.join(home, '.claude', 'skills'), 'dup-skill');
    skill(path.join(project, '.claude', 'skills'), 'dup-skill');
    const res = preflight({ dir: project, env: {}, home });
    assert.deepEqual(kinds(res), ['duplicate-skill-name']);
    const f = res.findings[0];
    assert.equal(f.warn, true);
    assert.equal(f.path, path.join(project, '.claude', 'skills', 'dup-skill'));
    assert.equal(f.other, path.join(home, '.claude', 'skills', 'dup-skill'));
    assert.match(f.note, /dup-skill/);
    assert.equal(res.ok, true, 'a duplicate is a warning, not a block');
  });

  it('the name comes from the SKILL.md front matter, so two folders with different names but one skill name are duplicates', () => {
    const { home, project } = fixture();
    write(path.join(home, '.claude', 'skills'), path.join('copy-a', 'SKILL.md'), '---\nname: same-name\ndescription: A.\n---\n');
    write(path.join(home, '.codex', 'skills'), path.join('copy-b', 'SKILL.md'), '---\nname: same-name\ndescription: B.\n---\n');
    assert.deepEqual(kinds(preflight({ dir: project, env: {}, home })), ['duplicate-skill-name']);
  });

  it('links (junctions or symlinks) to one real skill folder are the same skill, not a duplicate', () => {
    const { d, home, project } = fixture();
    const real = skill(path.join(d, 'plugin', 'skills'), 'linked-skill');
    for (const root of [path.join(home, '.claude', 'skills'), path.join(home, '.codex', 'skills')]) {
      fs.mkdirSync(root, { recursive: true });
      fs.symlinkSync(path.dirname(real), path.join(root, 'linked-skill'), 'junction');
    }
    assert.deepEqual(preflight({ dir: project, env: {}, home }), { ok: true, findings: [] });
  });

  it('the CLI prints a duplicate as a warning line and --strict still exits 0', async () => {
    const { home, project } = fixture();
    skill(path.join(home, '.claude', 'skills'), 'dup-skill');
    skill(path.join(home, '.agents', 'skills'), 'dup-skill');
    const r = await runNode([BGZ, 'preflight', '--dir', project, '--strict'], { project, cwd: project, env: { USERPROFILE: home, HOME: home, ANTHROPIC_API_KEY: '' } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /warning: duplicate-skill-name/);
  });
});

describe('preflight: overviews over 4,000 characters', () => {
  it('a skill description over 4,000 characters is a long-overview with its length', () => {
    const { home, project } = fixture();
    const f = skill(path.join(home, '.claude', 'skills'), 'wordy', chars(LIMIT_CHARS + 50));
    const res = preflight({ dir: project, env: {}, home });
    assert.deepEqual(kinds(res), ['long-overview']);
    assert.equal(res.findings[0].path, path.join(path.dirname(f), 'SKILL.md'));
    assert.equal(res.findings[0].chars, LIMIT_CHARS + 50);
  });

  it('a folded (>) multi-line description is measured as one line of text', () => {
    const { home, project } = fixture();
    const body = Array.from({ length: 70 }, () => chars(59)).join('\n  '); // 70 lines of 59 chars + single spaces ~ 4,129
    write(path.join(home, '.claude', 'skills'), path.join('folded', 'SKILL.md'), `---\nname: folded\ndescription: >\n  ${body}\n---\nBody.\n`);
    const res = preflight({ dir: project, env: {}, home });
    assert.deepEqual(kinds(res), ['long-overview']);
    assert.ok(res.findings[0].chars > LIMIT_CHARS);
  });

  it('a description of exactly 4,000 characters is allowed; one more is not', () => {
    const { home, project } = fixture();
    skill(path.join(home, '.claude', 'skills'), 'edge', chars(LIMIT_CHARS));
    assert.equal(preflight({ dir: project, env: {}, home }).ok, true);
    skill(path.join(home, '.claude', 'skills'), 'edge', chars(LIMIT_CHARS + 1));
    assert.deepEqual(kinds(preflight({ dir: project, env: {}, home })), ['long-overview']);
  });

  it('the project AGENTS.md and CLAUDE.md and the home CLAUDE.md / AGENTS.md are checked', () => {
    const { home, project } = fixture();
    write(project, 'AGENTS.md', chars(LIMIT_CHARS + 1));
    write(project, 'CLAUDE.md', chars(LIMIT_CHARS));
    write(home, path.join('.claude', 'CLAUDE.md'), chars(LIMIT_CHARS + 200));
    write(home, path.join('.codex', 'AGENTS.md'), chars(100));
    const res = preflight({ dir: project, env: {}, home });
    const flagged = res.findings.filter((f) => f.kind === 'long-overview').map((f) => f.path).sort();
    assert.deepEqual(flagged, [path.join(project, 'AGENTS.md'), path.join(home, '.claude', 'CLAUDE.md')].sort());
    const agents = res.findings.find((f) => f.path === path.join(project, 'AGENTS.md'));
    assert.equal(agents.chars, LIMIT_CHARS + 1);
    assert.match(agents.note, /4000/);
  });

  it('a plugin overview (AGENTS.md or CLAUDE.md next to plugin.json, or in a .claude-plugin folder) over 4,000 characters is flagged', () => {
    const { home, project } = fixture();
    const plugins = path.join(home, '.claude', 'plugins');
    write(plugins, path.join('cache', 'acme', 'tools', '1.0.0', 'plugin.json'), '{}');
    write(plugins, path.join('cache', 'acme', 'tools', '1.0.0', 'AGENTS.md'), chars(LIMIT_CHARS + 10));
    write(plugins, path.join('cache', 'acme', 'other', '2.0.0', '.claude-plugin', 'plugin.json'), '{}');
    write(plugins, path.join('cache', 'acme', 'other', '2.0.0', 'CLAUDE.md'), chars(LIMIT_CHARS + 20));
    write(plugins, path.join('cache', 'acme', 'small', '1.0.0', 'plugin.json'), '{}');
    write(plugins, path.join('cache', 'acme', 'small', '1.0.0', 'CLAUDE.md'), chars(200));
    const res = preflight({ dir: project, env: {}, home });
    assert.deepEqual(kinds(res), ['long-overview', 'long-overview']);
    const paths = res.findings.map((f) => f.path).sort();
    assert.deepEqual(paths, [path.join(plugins, 'cache', 'acme', 'other', '2.0.0', 'CLAUDE.md'), path.join(plugins, 'cache', 'acme', 'tools', '1.0.0', 'AGENTS.md')].sort());
  });

  it('a long file inside node_modules or a skills folder under plugins is not walked into', () => {
    const { home, project } = fixture();
    const plugins = path.join(home, '.claude', 'plugins');
    write(plugins, path.join('node_modules', 'x', 'plugin.json'), '{}');
    write(plugins, path.join('node_modules', 'x', 'AGENTS.md'), chars(LIMIT_CHARS * 2));
    assert.equal(preflight({ dir: project, env: {}, home }).ok, true);
  });
});

describe('preflight: ANTHROPIC_API_KEY', () => {
  it('flags it when set, and never shows the value', () => {
    const { home, project } = fixture();
    const res = preflight({ dir: project, env: { ANTHROPIC_API_KEY: FAKE_ANTHROPIC }, home });
    assert.equal(res.ok, false);
    assert.deepEqual(kinds(res), ['anthropic-api-key-set']);
    assert.ok(!JSON.stringify(res).includes(FAKE_ANTHROPIC), 'the key value must not appear in the findings');
    assert.match(res.findings[0].note, /value not shown/);
  });

  it('an empty or whitespace-only variable is treated as not set', () => {
    const { home, project } = fixture();
    assert.equal(preflight({ dir: project, env: { ANTHROPIC_API_KEY: '' }, home }).ok, true);
    assert.equal(preflight({ dir: project, env: { ANTHROPIC_API_KEY: '   ' }, home }).ok, true);
    assert.equal(preflight({ dir: project, env: {}, home }).ok, true);
  });

  it('is reported together with the other findings', () => {
    const { home, project } = fixture();
    fs.mkdirSync(path.join(home, '.claude', 'skills', 'stray'), { recursive: true });
    write(project, 'AGENTS.md', chars(LIMIT_CHARS + 1));
    const res = preflight({ dir: project, env: { ANTHROPIC_API_KEY: FAKE_ANTHROPIC }, home });
    assert.deepEqual(kinds(res), ['anthropic-api-key-set', 'long-overview', 'stray-skill-folder']);
  });
});

describe('preflight: read-only', () => {
  it('leaves every file and folder in the home and the project exactly as it was', () => {
    const { d, home, project } = fixture();
    fs.mkdirSync(path.join(home, '.claude', 'skills', 'stray'), { recursive: true });
    write(home, path.join('.claude', 'skills', 'stray', 'leftover.txt'), 'keep me');
    skill(path.join(home, '.claude', 'skills'), 'wordy', chars(LIMIT_CHARS + 500));
    write(project, 'AGENTS.md', chars(LIMIT_CHARS + 1));
    write(home, path.join('.claude', 'plugins', 'p', 'plugin.json'), '{}');
    write(home, path.join('.claude', 'plugins', 'p', 'CLAUDE.md'), chars(LIMIT_CHARS + 1));
    const before = snapshot(d);
    const res = preflight({ dir: project, env: { ANTHROPIC_API_KEY: FAKE_ANTHROPIC }, home });
    assert.equal(res.ok, false);
    assert.equal(res.findings.length, 5);
    assert.equal(snapshot(d), before, 'nothing may be created, changed or deleted');
  });
});

describe('bgz preflight (CLI)', () => {
  // USERPROFILE (Windows) and HOME (POSIX) are pointed at the scratch home so the real ~/.claude is never read.
  const run = (args, { home, project, env = {} }) =>
    runNode([BGZ, 'preflight', ...args], { project, cwd: project, env: { USERPROFILE: home, HOME: home, ANTHROPIC_API_KEY: '', ...env } });

  it('prints "nothing flagged" and exits 0 on a clean machine', async () => {
    const { home, project } = fixture();
    const r = await run(['--dir', project], { home, project });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /nothing flagged/);
  });

  it('lists each finding, never shows the key, and still exits 0 without --strict', async () => {
    const { home, project } = fixture();
    fs.mkdirSync(path.join(home, '.claude', 'skills', 'stray'), { recursive: true });
    const r = await run(['--dir', project], { home, project, env: { ANTHROPIC_API_KEY: FAKE_ANTHROPIC } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /2 thing\(s\) flagged \(read-only; nothing was changed\)/);
    assert.match(r.stdout, /stray-skill-folder/);
    assert.match(r.stdout, /anthropic-api-key-set/);
    assert.ok(!r.stdout.includes(FAKE_ANTHROPIC) && !r.stderr.includes(FAKE_ANTHROPIC), 'the key value is never printed');
  });

  it('--strict exits 1 when anything is flagged and 0 when nothing is', async () => {
    const { home, project } = fixture();
    const clean = await run(['--dir', project, '--strict'], { home, project });
    assert.equal(clean.status, 0, clean.stderr);
    write(project, 'CLAUDE.md', chars(LIMIT_CHARS + 1));
    const dirty = await run(['--dir', project, '--strict'], { home, project });
    assert.equal(dirty.status, 1);
    assert.match(dirty.stdout, /long-overview/);
  });

  it('--json prints the findings as JSON with ok:false and the length', async () => {
    const { home, project } = fixture();
    write(project, 'AGENTS.md', chars(LIMIT_CHARS + 7));
    const r = await run(['--dir', project, '--json'], { home, project });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.findings.length, 1);
    assert.equal(r.json.findings[0].kind, 'long-overview');
    assert.equal(r.json.findings[0].chars, LIMIT_CHARS + 7);
  });

  it('leaves the scratch home and project untouched', async () => {
    const { d, home, project } = fixture();
    fs.mkdirSync(path.join(home, '.claude', 'skills', 'stray'), { recursive: true });
    write(project, 'AGENTS.md', chars(LIMIT_CHARS + 1));
    const before = snapshot(d);
    const r = await run(['--dir', project, '--strict'], { home, project, env: { ANTHROPIC_API_KEY: FAKE_ANTHROPIC } });
    assert.equal(r.status, 1);
    assert.equal(snapshot(d), before);
  });
});
