// doctor: credential-shaped URLs and plugin cost, checked against fixture folders (never the real home folder).
//
// Token arithmetic used below: a skill, agent or command entry costs name + description + 8 characters, four
// characters make a token, and an MCP server or a desktop extension server is a nominal 150 tokens.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { ROOT, TEST_TIMEOUT_MS, cleanEnv, fake, makeProject, removeDir, write } from '../../../hooks/test/helpers.mjs';
import {
  collectExtensions,
  collectPlugins,
  parseFrontmatter,
  parseGitConfigRemotes,
  pluginReport,
  readGitRemotes,
  renderPlugins,
  renderUrls,
  scanPluginDir,
  scanUrls,
  scanUsage,
  tildify,
} from '../lib.mjs';

const DOCTOR = path.join(ROOT, 'tools', 'doctor', 'doctor.mjs');
// Fixtures live under <plugin>/.tmp, inside the plugin's own repository. Stop git looking above them, or it would
// read the plugin's own remotes instead of the fixture's.
process.env.GIT_CEILING_DIRECTORIES = path.join(ROOT, '.tmp');
const made = [];

// Every file under dir with its modification time, so a test can prove nothing was written.
function listing(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      out.push(`${path.relative(dir, full)}:${fs.statSync(full).mtimeMs}`);
      if (e.isDirectory()) walk(full);
    }
  };
  walk(dir);
  return out.sort();
}
const fixture = (prefix) => {
  const dir = makeProject(prefix);
  made.push(dir);
  return dir;
};
after(() => made.forEach(removeDir));

const run = (args, { cwd = ROOT, env = {} } = {}) =>
  spawnSync(process.execPath, [DOCTOR, ...args], { encoding: 'utf8', cwd, env: cleanEnv(env), timeout: TEST_TIMEOUT_MS });
const git = (dir, ...args) => spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
const hasGit = spawnSync('git', ['--version'], { encoding: 'utf8' }).status === 0;
const d = (n) => 'd'.repeat(n);

// A skill entry of exactly `chars` characters (name + description + 8).
function skill(root, name, chars) {
  write(root, `skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: ${d(chars - 8 - name.length)}\n---\n# Body, never counted\n${'z '.repeat(500)}\n`);
}

// Builds a fake Claude home and desktop folder. Costs: alpha 400, idle 25, loud 175, extensions 200; total 800.
function plugins() {
  const home = fixture('home');
  const desk = fixture('desk');
  const cache = (name) => path.join(home, 'plugins', 'cache', 'mkt', name, '1.0.0');
  // alpha: 2 skills (25 tokens each), 1 agent (25), 1 command (25), 2 MCP servers (300) = 400
  skill(cache('alpha'), 'one', 100);
  skill(cache('alpha'), 'two', 100);
  write(cache('alpha'), 'agents/helper.md', `---\nname: helper\ndescription: ${d(86)}\n---\nbody\n`);
  write(cache('alpha'), 'commands/go.md', `---\ndescription: ${d(90)}\n---\nbody\n`);
  write(cache('alpha'), '.mcp.json', JSON.stringify({ mcpServers: { one: { command: 'node' }, two: { url: 'https://mcp.example.invalid/sse' } } }));
  // idle: enabled, one skill = 25
  skill(cache('idle'), 'quiet-skill', 100);
  // beta: switched off, gamma: installed with no switch. Both would cost something if they loaded.
  skill(cache('beta'), 'b', 100);
  skill(cache('gamma'), 'g', 100);
  // synced plugins load unless switched off: loud (no switch, 25 + one server 150 = 175), quiet (off), and loud again in a second bucket
  const synced = (bucket, name) => path.join(home, 'plugins', 'synced', bucket, name);
  skill(synced('b1', 'loud'), 'ping', 100);
  write(synced('b1', 'loud'), '.mcp.json', JSON.stringify({ only: { command: 'node' } }));
  skill(synced('b1', 'quiet'), 'q', 100);
  skill(synced('b2', 'loud'), 'ping', 100);
  fs.mkdirSync(path.join(home, 'plugins', 'synced', '.bucket-b1'), { recursive: true });
  write(home, 'settings.json', JSON.stringify({ enabledPlugins: { 'alpha@mkt': true, 'idle@mkt': true, 'beta@mkt': false, 'quiet@synced': false } }));
  const entry = (name) => [{ scope: 'user', installPath: cache(name), version: '1.0.0' }];
  write(home, 'plugins/installed_plugins.json', JSON.stringify({ version: 2, plugins: { 'alpha@mkt': entry('alpha'), 'idle@mkt': entry('idle'), 'beta@mkt': entry('beta'), 'gamma@mkt': entry('gamma') } }));
  // desktop extensions: one enabled with 2 tools and a server (50 + 150), one switched off, one with no settings file and no tools (0)
  const tool = { name: 't1', description: 'x'.repeat(90) }; // 2 + 90 + 8 = 100 chars
  write(desk, 'Claude Extensions/ext.one/manifest.json', JSON.stringify({ name: 'one', tools: [tool, { ...tool, name: 't2' }], server: { type: 'node' } }));
  write(desk, 'Claude Extensions Settings/ext.one.json', JSON.stringify({ isEnabled: true }));
  write(desk, 'Claude Extensions/ext.off/manifest.json', JSON.stringify({ name: 'off', tools: [tool, tool, tool], server: { type: 'node' } }));
  write(desk, 'Claude Extensions Settings/ext.off.json', JSON.stringify({ isEnabled: false }));
  write(desk, 'Claude Extensions/ext.default/manifest.json', JSON.stringify({ name: 'default' }));
  return { home, desk };
}

describe('frontmatter', () => {
  test('reads inline, quoted, folded, literal and continued values, and ignores a body', () => {
    assert.deepEqual(parseFrontmatter('---\nname: plain\ndescription: one line\n---\nbody: not this'), { name: 'plain', description: 'one line' });
    assert.equal(parseFrontmatter('---\nname: "quoted name"\n---\n').name, 'quoted name');
    assert.equal(parseFrontmatter("---\ndescription: 'single quoted'\n---\n").description, 'single quoted');
    assert.equal(parseFrontmatter('---\ndescription: >\n  folded text\n  on two lines\nname: n\n---\n').description, 'folded text on two lines');
    assert.equal(parseFrontmatter('---\ndescription: |\n  literal\n  block\n---\n').description, 'literal block');
    assert.equal(parseFrontmatter('---\ndescription: starts here\n  and continues\n---\n').description, 'starts here and continues');
    assert.equal(parseFrontmatter('﻿---\nname: bom\n---\n').name, 'bom');
  });

  test('a file without a frontmatter block, or an empty one, gives nothing', () => {
    assert.deepEqual(parseFrontmatter('# just a heading\n'), {});
    assert.deepEqual(parseFrontmatter(''), {});
    assert.deepEqual(parseFrontmatter(undefined), {});
  });
});

describe('paths', () => {
  test('paths under the home folder are shown as ~ and use forward slashes', () => {
    const home = path.join(ROOT, 'h');
    assert.equal(tildify(path.join(home, 'a', 'b'), home), '~/a/b');
    assert.equal(tildify(home, home), '~');
    assert.equal(tildify(path.join(ROOT, 'elsewhere', 'x'), home), path.join(ROOT, 'elsewhere', 'x').split(path.sep).join('/'));
    assert.equal(tildify(undefined), undefined);
  });
});

describe('plugin cost: one plugin folder', () => {
  test('counts skills, agents, commands and MCP servers and prices them', () => {
    const { home } = plugins();
    const alpha = scanPluginDir(path.join(home, 'plugins', 'cache', 'mkt', 'alpha', '1.0.0'));
    assert.deepEqual([alpha.skills, alpha.agents, alpha.commands, alpha.mcpServers], [2, 1, 1, 2]);
    assert.equal(alpha.chars, 400);
    assert.equal(alpha.tokens, 100 + 300);
  });

  test('only the first bytes of a skill are read: a huge body costs nothing', () => {
    const root = fixture('huge');
    write(root, 'skills/big/SKILL.md', `---\nname: big\ndescription: ${d(89)}\n---\n${'body '.repeat(200000)}`);
    assert.equal(scanPluginDir(root).tokens, 25);
  });

  test('an empty or missing plugin folder is free, and a plugin with a session hook is flagged', () => {
    const empty = fixture('emptyp');
    assert.equal(scanPluginDir(empty).tokens, 0);
    assert.equal(scanPluginDir(path.join(empty, 'missing')).tokens, 0);
    write(empty, 'hooks/hooks.json', JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node x.mjs' }] }], Stop: [] } }));
    assert.deepEqual(scanPluginDir(empty).contextHooks, ['SessionStart']);
  });

  test('nested skill folders and MCP servers named in the manifest are found', () => {
    const root = fixture('nested');
    write(root, 'skills/group/inner/SKILL.md', `---\nname: inner\ndescription: ${d(87)}\n---\n`);
    write(root, '.claude-plugin/plugin.json', JSON.stringify({ name: 'nested', mcpServers: { srv: { command: 'node' } } }));
    const c = scanPluginDir(root);
    assert.equal(c.skills, 1);
    assert.equal(c.mcpServers, 1);
  });
});

describe('plugin cost: which plugins load', () => {
  test('installed plugins need a true switch; synced plugins load unless switched off; a synced name in two buckets counts once', () => {
    const { home } = plugins();
    const { plugins: list, duplicates } = collectPlugins(home);
    const state = Object.fromEntries(list.map((p) => [p.key, p.enabled]));
    assert.deepEqual(state, { 'alpha@mkt': true, 'beta@mkt': false, 'gamma@mkt': false, 'idle@mkt': true, 'loud@synced': true, 'quiet@synced': false });
    assert.equal(duplicates, 1);
  });

  test('a home folder with nothing in it is a valid empty answer', () => {
    const home = fixture('nohome');
    const { plugins: list, hasSettings } = collectPlugins(home);
    assert.deepEqual(list, []);
    assert.equal(hasSettings, false);
    const r = pluginReport({ home, desktop: path.join(home, 'nowhere') });
    assert.equal(r.alwaysOnTokens.total, 0);
    assert.match(renderPlugins(r), /enabled plugins: 0 of 0/);
  });

  test('desktop extensions: on unless their settings file says off; tools and a server are priced', () => {
    const { desk } = plugins();
    const ext = Object.fromEntries(collectExtensions(desk).map((e) => [e.id, e]));
    assert.deepEqual([ext['ext.one'].enabled, ext['ext.off'].enabled, ext['ext.default'].enabled], [true, false, true]);
    assert.equal(ext['ext.one'].tokens, 50 + 150);
    assert.equal(ext['ext.one'].tools, 2);
    assert.equal(ext['ext.default'].tokens, 0);
    assert.deepEqual(collectExtensions(undefined), []);
  });

  test('the report adds only what is on: 400 + 25 + 175 for plugins, 200 for extensions', () => {
    const { home, desk } = plugins();
    const r = pluginReport({ home, desktop: desk });
    assert.equal(r.alwaysOnTokens.plugins, 600);
    assert.equal(r.alwaysOnTokens.extensions, 200);
    assert.equal(r.alwaysOnTokens.total, 800);
    assert.deepEqual([r.counts.enabled, r.counts.disabledOrIdle, r.counts.duplicates, r.counts.extensions, r.counts.extensionsEnabled], [3, 3, 1, 3, 2]);
    const off = r.plugins.find((p) => p.key === 'beta@mkt');
    assert.equal(off.tokens, undefined, 'a plugin that is off is not priced');
    const text = renderPlugins(r);
    assert.match(text, /always-on estimate: ~800 tokens/);
    assert.match(text, /alpha@mkt\s+400\s+2\s+1\s+1\s+2/);
    assert.match(text, /desktop extensions enabled: 2/);
  });

  test('a budget turns the estimate into a pass or a fail', () => {
    const { home, desk } = plugins();
    assert.equal(pluginReport({ home, desktop: desk, budget: 799 }).overBudget, true);
    assert.equal(pluginReport({ home, desktop: desk, budget: 800 }).overBudget, false);
    assert.match(renderPlugins(pluginReport({ home, desktop: desk, budget: 799 })), /^FAIL always-on estimate is over the 799-token budget/m);
  });
});

describe('plugin cost: usage from chats', () => {
  function chats(home) {
    const lines = [
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"alpha:one"}}]}}',
      '{"type":"user","message":{"content":"<command-name>/alpha:go</command-name>"}}',
      '{"input":{"subagent_type":"beta:helper","prompt":"x"}}',
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"mcp__plugin_loud_srv__lookup","input":{}}]}}',
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"mcp__claude_ai_Something__lookup","input":{}}]}}',
      '{"type":"user","message":{"content":"a plain sentence that mentions alpha but no invocation"}}',
    ];
    write(home, 'projects/proj/chat.jsonl', lines.join('\n') + '\n');
  }

  test('counts skill, subagent, slash-command and plugin MCP use by plugin name, and flags an enabled plugin nobody used', () => {
    const { home, desk } = plugins();
    chats(home);
    const u = scanUsage(home);
    assert.equal(u.counts.get('alpha'), 2);
    assert.equal(u.counts.get('beta'), 1);
    assert.equal(u.counts.get('loud'), 1);
    assert.equal(u.counts.get('idle'), undefined);
    assert.equal(u.files, 1);
    const r = pluginReport({ home, desktop: desk, usage: true });
    assert.deepEqual(r.plugins.filter((p) => p.unused).map((p) => p.key), ['idle@mkt']);
    assert.match(renderPlugins(r), /unused in that window \(1\): idle@mkt/);
  });

  test('a name that straddles a read boundary is counted once, and one inside the overlap is not counted twice', () => {
    const home = fixture('boundary');
    const CHUNK = 4 * 1024 * 1024;
    const inside = '"skill":"loud:one"';
    const straddle = '"skill":"alpha:one"';
    const text = 'x'.repeat(CHUNK - 100) + inside + 'x'.repeat(100 - inside.length - 8) + straddle + 'x'.repeat(50);
    write(home, 'projects/p/big.jsonl', text);
    assert.equal(text.indexOf(straddle), CHUNK - 8);
    const u = scanUsage(home);
    assert.equal(u.counts.get('alpha'), 1);
    assert.equal(u.counts.get('loud'), 1);
  });

  test('old chats are skipped, and a read limit is reported instead of read past', () => {
    const { home } = plugins();
    chats(home);
    const file = path.join(home, 'projects', 'proj', 'chat.jsonl');
    const old = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    fs.utimesSync(file, old, old);
    assert.equal(scanUsage(home, { days: 30 }).files, 0);
    assert.equal(scanUsage(home, { days: 120 }).files, 1);
    const limited = scanUsage(home, { days: 120, maxBytes: 10 });
    assert.equal(limited.truncated, true);
    assert.equal(limited.files, 0);
  });

  test('no projects folder is fine', () => {
    assert.equal(scanUsage(fixture('noproj')).files, 0);
  });
});

describe('git remotes are read from the config file, not by running git', () => {
  const remote = (name, ...lines) => `[remote "${name}"]\n${lines.map((l) => `\t${l}`).join('\n')}\n`;

  test('url and pushurl are read; quotes, comments, case and other sections are handled like git does', () => {
    const text = [
      '[core]',
      '\trepositoryformatversion = 0',
      '\turl = https://not-a-remote.example.invalid/x',
      remote('origin', 'url = https://example.invalid/a.git', 'fetch = +refs/heads/*:refs/remotes/origin/*'),
      '[REMOTE "deploy"]',
      '\tURL = "https://example.invalid/b.git" # a comment',
      '\tpushurl = https://example.invalid/c.git ; another comment',
      '[remote "same line"] url = https://example.invalid/d.git',
      '[remote "we\\"ird"]',
      '\turl = https://example.invalid/e.git',
      '# [remote "commented"]',
      '; url = https://example.invalid/f.git',
      '[branch "main"]',
      '\tremote = origin',
    ].join('\n');
    const expected = [
      ['origin', 'url', 'https://example.invalid/a.git'],
      ['deploy', 'url', 'https://example.invalid/b.git'],
      ['deploy', 'pushurl', 'https://example.invalid/c.git'],
      ['same line', 'url', 'https://example.invalid/d.git'],
      ['we"ird', 'url', 'https://example.invalid/e.git'],
    ];
    const rows = (t) => parseGitConfigRemotes(t).map((r) => [r.name, r.kind, r.value]);
    assert.deepEqual(rows(text), expected);
    assert.deepEqual(rows(text.replace(/\n/g, '\r\n')), expected, 'Windows line endings');
    assert.deepEqual(parseGitConfigRemotes(''), []);
    assert.deepEqual(parseGitConfigRemotes(undefined), []);
  });

  test('a repository is found from a subfolder, and the ceiling stops the search where git would', () => {
    const outer = fixture('outer');
    write(outer, '.git/config', remote('origin', 'url = https://example.invalid/outer.git'));
    const inner = path.join(outer, 'a', 'b');
    fs.mkdirSync(inner, { recursive: true });
    const ceiling = (dir) => ({ GIT_CEILING_DIRECTORIES: dir });
    assert.deepEqual(readGitRemotes(inner, ceiling(path.dirname(outer))).remotes.map((r) => r.value), ['https://example.invalid/outer.git']);
    assert.deepEqual(readGitRemotes(inner, ceiling(outer)), { remotes: [] }, 'the ceiling folder itself is not entered');
    assert.deepEqual(readGitRemotes(fixture('nogit'), ceiling(path.dirname(outer))), { remotes: [] });
  });

  test('a worktree (.git is a file) reads the shared config and its own config.worktree', () => {
    const main = fixture('wt-main');
    write(main, '.git/config', remote('origin', 'url = https://example.invalid/shared.git'));
    write(main, '.git/worktrees/w1/commondir', '../..\n');
    write(main, '.git/worktrees/w1/config.worktree', remote('mine', 'url = https://example.invalid/mine.git'));
    const tree = fixture('wt-tree');
    write(tree, '.git', `gitdir: ${path.join(main, '.git', 'worktrees', 'w1')}\n`);
    const names = readGitRemotes(tree, { GIT_CEILING_DIRECTORIES: path.dirname(tree) }).remotes.map((r) => r.name).sort();
    assert.deepEqual(names, ['mine', 'origin']);
  });

  test('an unreadable config is reported, not mistaken for "no remotes"', () => {
    const dir = fixture('badcfg');
    fs.mkdirSync(path.join(dir, '.git', 'config'), { recursive: true }); // a directory where the file should be
    const r = scanUrls(dir);
    assert.equal(r.remotes, 0);
    assert.equal(r.problems.length, 1);
    assert.match(r.problems[0], /^git remotes could not be read \(\w+\)$/);
    assert.match(renderUrls(r), /^WARN git remotes could not be read/m);
  });

  test('a token in a remote is found with no git process involved, and never printed', () => {
    const dir = fixture('urls-nogit');
    write(dir, '.git/config', remote('origin', `url = ${fake.userOnlyUrl('someuser')}`) + remote('deploy', `url = ${fake.tokenUrl('github.com')}`, `pushurl = ${fake.passwordUrl('example.invalid')}`));
    const r = scanUrls(dir, { env: { GIT_CEILING_DIRECTORIES: path.dirname(dir), PATH: '' } });
    assert.equal(r.ok, false);
    assert.equal(r.remotes, 3);
    assert.deepEqual(r.problems, []);
    assert.deepEqual(r.findings.map((f) => [f.where, f.kind]), [['git remote deploy (url)', 'token'], ['git remote deploy (pushurl)', 'user:password']]);
    const text = renderUrls(r) + JSON.stringify(r);
    for (const secret of [fake.ghToken(), fake.password()]) assert.ok(!text.includes(secret), 'the secret reached the report');
  });
});

describe('urls', () => {
  test('git remotes: a username alone passes, a token or a password fails, and the report never prints the secret', { skip: !hasGit }, () => {
    const dir = fixture('urls');
    git(dir, 'init', '-q');
    git(dir, 'remote', 'add', 'origin', fake.userOnlyUrl('someuser'));
    let r = scanUrls(dir);
    assert.equal(r.ok, true);
    assert.equal(r.remotes, 1);
    git(dir, 'remote', 'add', 'deploy', fake.tokenUrl('github.com'));
    git(dir, 'remote', 'add', 'mirror', fake.passwordUrl('example.invalid'));
    r = scanUrls(dir);
    assert.equal(r.ok, false);
    assert.deepEqual(r.findings.map((f) => [f.where, f.kind, f.host]), [
      ['git remote deploy (url)', 'token', 'github.com'],
      ['git remote mirror (url)', 'user:password', 'example.invalid'],
    ]);
    const text = renderUrls(r) + JSON.stringify(r);
    for (const secret of [fake.ghToken(), fake.password()]) assert.ok(!text.includes(secret), 'the secret reached the report');
  });

  test('text files: real secrets are found with their line, placeholders and usernames are not', () => {
    const dir = fixture('files');
    write(dir, 'CHECKPOINT.md', [`remote: ${fake.passwordUrl()}`, `fine: ${fake.userOnlyUrl()}`, 'placeholder: https://alice:' + '${TOKEN}' + '@host.example/x', `query: ${fake.queryUrl('token', fake.longRandom())}`].join('\n') + '\n');
    write(dir, '.env', `DATABASE_URL=${fake.passwordUrl('db.example.invalid')}\n`);
    write(dir, 'node_modules/pkg/README.md', `${fake.passwordUrl()}\n`);
    write(dir, '.tmp/skip.md', `${fake.passwordUrl()}\n`);
    write(dir, 'notes.bin', `${fake.passwordUrl()}\n`);
    const r = scanUrls(dir);
    const found = new Set(r.findings.map((f) => `${f.where}:${f.line}:${f.kind}`));
    assert.deepEqual(found, new Set(['.env:1:user:password', 'CHECKPOINT.md:1:user:password', 'CHECKPOINT.md:4:query-token']));
    assert.equal(r.findings.length, 3);
    assert.equal(r.findings.find((f) => f.kind === 'query-token').param, 'token');
  });

  test('a large file is skipped and counted; a folder with nothing wrong passes', () => {
    const dir = fixture('big');
    write(dir, 'huge.md', `${'line of text\n'.repeat(60000)}`);
    write(dir, 'small.md', 'nothing here\n');
    const r = scanUrls(dir);
    assert.equal(r.ok, true);
    assert.equal(r.skippedLarge, 1);
    assert.match(renderUrls(r), /^PASS no credential-shaped URLs/m);
  });

  test('extra files can be added to the scan', () => {
    const dir = fixture('extra');
    const other = fixture('other');
    const file = write(other, 'settings.txt', `${fake.passwordUrl()}\n`);
    assert.equal(scanUrls(dir).ok, true);
    assert.equal(scanUrls(dir, { extraFiles: [file] }).ok, false);
  });
});

describe('the doctor command', () => {
  test('doctor plugins --json matches the report, and doctor changes nothing it reads', () => {
    const { home, desk } = plugins();
    write(home, 'projects/p/c.jsonl', '{"skill":"alpha:one"}\n');
    const before = [listing(home), listing(desk)];
    const r = run(['plugins', '--home', home, '--desktop-dir', desk, '--usage', '--json']);
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(r.stdout);
    assert.equal(json.alwaysOnTokens.total, 800);
    assert.equal(json.plugins.find((p) => p.key === 'alpha@mkt').uses, 1);
    assert.deepEqual([listing(home), listing(desk)], before, 'doctor wrote or touched something');
  });

  test('--budget sets the exit code; --usage lists unused plugins', () => {
    const { home, desk } = plugins();
    write(home, 'projects/p/c.jsonl', '{"input":{"skill":"alpha:one"}}\n');
    const over = run(['plugins', '--home', home, '--desktop-dir', desk, '--budget', '100']);
    assert.equal(over.status, 1);
    assert.match(over.stdout, /FAIL always-on estimate is over the 100-token budget/);
    const fine = run(['plugins', '--home', home, '--desktop-dir', desk, '--budget=100000', '--usage']);
    assert.equal(fine.status, 0, fine.stderr);
    assert.match(fine.stdout, /PASS always-on estimate is within/);
    assert.match(fine.stdout, /unused in that window/);
  });

  test('urls: exit 1 with file and line but no secret; exit 0 when clean; --json is parseable', () => {
    const bad = fixture('cli-bad');
    write(bad, 'AGENTS.md', `Clone with ${fake.passwordUrl()}\n`);
    const r = run(['urls', bad]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL AGENTS\.md:1\s+user:password at example\.invalid\s+\[redacted\]/);
    assert.ok(!r.stdout.includes(fake.password()) && !r.stderr.includes(fake.password()));
    const j = JSON.parse(run(['urls', bad, '--json']).stdout);
    assert.equal(j.ok, false);
    assert.equal(j.findings[0].line, 1);
    const good = fixture('cli-good');
    write(good, 'AGENTS.md', `Clone with ${fake.userOnlyUrl()}\n`);
    assert.equal(run(['urls', good]).status, 0);
  });

  test('no argument runs both reports; an environment value never reaches the output', () => {
    const { home, desk } = plugins();
    const dir = fixture('cli-all');
    const name = ['CLAUDE_CODE_MESSAGING', 'TOKEN'].join('_');
    const value = fake.longRandom();
    const r = run(['--home', home, '--desktop-dir', desk], { cwd: dir, env: { [name]: value, CLAUDE_CONFIG_DIR: home } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /PASS no credential-shaped URLs/);
    assert.match(r.stdout, /Plugin cost report/);
    assert.ok(!r.stdout.includes(value) && !r.stderr.includes(value), 'an environment value reached the output');
    assert.ok(!r.stdout.includes(name), 'a name that could hold a secret was printed');
  });

  test('bad usage exits 2 with a hint; --help exits 0', () => {
    for (const args of [['plugins', '--budget', 'abc'], ['plugins', 'extra'], ['--no-such-option'], ['plugins', '--top'], ['urls', 'a', 'b'], ['plugins', '--usage-days=0']]) {
      const r = run(args);
      assert.equal(r.status, 2, args.join(' '));
      assert.match(r.stderr, /^doctor: /m);
    }
    const help = run(['--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /doctor urls/);
  });
});
