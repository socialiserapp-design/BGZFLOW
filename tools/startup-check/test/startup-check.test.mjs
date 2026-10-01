// startup-check: the compulsory start-up chain, the checkpoint, and the av-safe lint.
// Problems it exists for: start-up reading of 145-175 KB, orders to read a whole chat log, pointers to files that
// do not exist, a checkpoint that grew to 140 KB, roles nobody defined.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { ROOT, TEST_TIMEOUT_MS, cleanEnv, fake, kb, makeProject, removeDir, write } from '../../../hooks/test/helpers.mjs';
import { lintAvSafe } from '../av-safe.mjs';
import { avSafeFailures, checkCheckpoints, checkStartup, checkpointRoles, claudeImports, requiredPointers, wordCount } from '../lib.mjs';

const CLI = path.join(ROOT, 'tools', 'startup-check', 'startup-check.mjs');
const made = [];
const project = (prefix = 'sc') => {
  const dir = makeProject(prefix);
  made.push(dir);
  return dir;
};
after(() => made.forEach(removeDir));

const j = (...parts) => parts.join('');
const check = (dir, env = {}, opts = {}) => checkStartup(dir, { env, ...opts });
const codes = (result) => result.failures.map((f) => f.code);
const cli = (args, env = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: cleanEnv(env), timeout: TEST_TIMEOUT_MS });
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('word count and pointers', () => {
  test('a word is any run of non-blank characters', () => {
    assert.equal(wordCount('a-b c\nd\te'), 4);
    assert.equal(wordCount(''), 0);
    assert.equal(wordCount('   \n\t '), 0);
  });

  test('@imports count outside code, quotes and inline code, and an address is not an import', () => {
    const at = '@';
    const text = [
      '@docs/one.md',
      'see @docs/two.md for more',
      '```',
      '@docs/fenced.md',
      '```',
      '> @docs/quoted.md',
      '    @docs/indented.md',
      'inline `@docs/inline.md` code',
      `mail name${at}example.test`,
      'built from `main` @1a2b3c4d5e6f (a revision, not a file)',
    ].join('\n');
    assert.deepEqual(claudeImports(text), ['docs/one.md', 'docs/two.md']);
  });

  test('required reading: a heading section, a "Required reading:" line and @imports, not links elsewhere or web links', () => {
    const text = [
      '# Title',
      '[not required](docs/other.md)',
      '## Required reading',
      '- [Rules](docs/rules.md)',
      '- `docs/plan.md`',
      '- [Web](https://example.test/page)',
      '### Deeper',
      '- [Nested](docs/nested.md)',
      '## Notes',
      '- [After the section](docs/after.md)',
      'Must read: [Line rule](docs/line.md)',
      '@docs/imported.md',
    ].join('\n');
    const refs = requiredPointers(text).map((p) => p.ref);
    assert.deepEqual(refs.sort(), ['docs/imported.md', 'docs/line.md', 'docs/nested.md', 'docs/plan.md', 'docs/rules.md']);
  });
});

describe('the chain', () => {
  test('a small project passes; the chain follows required files, including nested ones, and a cycle does not loop', () => {
    const dir = project();
    write(dir, 'AGENTS.md', ['# Project', '', '## Required reading', '', '- [Rules](docs/a.md)', '', '@CLAUDE-extra.md', ''].join('\n'));
    write(dir, 'CLAUDE-extra.md', 'Extra rules.\n');
    write(dir, 'docs/a.md', 'Rule A.\n\nRequired reading: [B](b.md)\n');
    write(dir, 'docs/b.md', 'Rule B.\n\nRequired reading: [back to the start](../AGENTS.md)\n');
    const r = check(dir);
    assert.equal(r.ok, true, JSON.stringify(r.failures));
    assert.deepEqual(r.files.map((f) => f.path).sort(), ['AGENTS.md', 'CLAUDE-extra.md', 'docs/a.md', 'docs/b.md']);
    assert.equal(r.words, r.files.reduce((n, f) => n + f.words, 0));
    assert.equal(r.files.find((f) => f.path === 'docs/b.md').via, 'required line in docs/a.md');
  });

  test('over the word budget fails, whether set by --budget, the environment or config.json', () => {
    const dir = project();
    write(dir, 'AGENTS.md', `${words(60)}\n`);
    assert.equal(check(dir).ok, true);
    assert.deepEqual(codes(check(dir, {}, { budgetOverride: 50 })), ['words']);
    assert.deepEqual(codes(check(dir, { BGZFLOW_STARTUP_WORDS: '40' })), ['words']);
    write(dir, '.bgzflow/config.json', JSON.stringify({ startup_words: 30 }));
    const r = check(dir);
    assert.deepEqual(codes(r), ['words']);
    assert.match(r.failures[0].message, /60 words, over the 30 word budget/);
    assert.equal(check(dir, { BGZFLOW_STARTUP_WORDS: '100' }).ok, true, 'the environment wins over config.json');
  });

  test('a pointer that does not resolve fails and names the file that holds it', () => {
    const dir = project();
    write(dir, 'AGENTS.md', '## Required reading\n- [Gone](docs/WORK-GRAPH.md)\n');
    const r = check(dir);
    assert.deepEqual(codes(r), ['pointer']);
    assert.match(r.failures[0].message, /AGENTS\.md requires docs\/WORK-GRAPH\.md/);
  });

  test('a compulsory file over the big-read cap fails (an order to read a huge log)', () => {
    const dir = project();
    write(dir, 'AGENTS.md', '## Required reading\n- [Log](notes/handover.md)\n');
    write(dir, 'notes/handover.md', kb(70));
    const r = check(dir);
    assert.deepEqual(codes(r), ['big-file']);
    assert.match(r.failures[0].message, /70 KB, over the 64 KB cap/);
    assert.equal(check(dir, { BGZFLOW_BIG_READ_KB: '80' }).ok, true);
  });

  test('a credential-shaped URL in a compulsory file fails without printing the secret; a username alone passes', () => {
    const dir = project();
    write(dir, 'AGENTS.md', `Clone: ${fake.userOnlyUrl()}\n`);
    assert.equal(check(dir).ok, true);
    write(dir, 'AGENTS.md', `Clone: ${fake.passwordUrl()}\n`);
    const r = check(dir);
    assert.deepEqual(codes(r), ['secret']);
    assert.match(r.failures[0].message, /user:password at example\.invalid/);
    assert.ok(!JSON.stringify(r).includes(fake.password()));
  });

  test('the private overlay is searched last; a name that is nowhere fails', () => {
    const dir = project();
    const overlay = project('overlay');
    write(overlay, 'house-rules.md', 'Overlay rules.\n');
    write(dir, 'AGENTS.md', '## Required reading\n- [House](house-rules.md)\n');
    assert.deepEqual(codes(check(dir)), ['pointer']);
    const r = check(dir, { BGZFLOW_OVERLAY: overlay });
    assert.equal(r.ok, true, JSON.stringify(r.failures));
    assert.equal(r.files.length, 2);
  });

  test('no AGENTS.md or CLAUDE.md is a warning, not a failure', () => {
    const dir = project();
    const r = check(dir);
    assert.equal(r.ok, true);
    assert.equal(r.words, 0);
    assert.match(r.warnings[0].message, /no AGENTS\.md or CLAUDE\.md/);
  });

  test('a binary file in the chain is reported and not counted', () => {
    const dir = project();
    write(dir, 'AGENTS.md', '## Required reading\n- [Blob](docs/blob.md)\n');
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, 'docs', 'blob.md'), Buffer.from([0x50, 0x4b, 0, 3, 4, 0, 0]));
    const r = check(dir);
    assert.equal(r.files.find((f) => f.path === 'docs/blob.md').words, 0);
    assert.ok(r.warnings.some((w) => w.code === 'binary'));
  });
});

describe('the checkpoint', () => {
  // The OWNERS block: a table whose first column is the role. `extra` rows go inside the same table.
  const owners = (...extra) => ['## OWNERS', '| Role | Name |', '|---|---|', '| Lead | Ada |', '| Integration writer | Bo |', ...extra, ''];
  const tasks = (...rows) => ['## Tasks', '| Task | Owner |', '|---|---|', ...rows.map((r) => `| ${r[0]} | ${r[1]} |`), ''];

  test('over its cap fails, at or under passes, and the cap can be changed', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', `${owners().join('\n')}\n${kb(9)}\n`);
    const r = check(dir);
    assert.deepEqual(codes(r), ['checkpoint-size']);
    assert.match(r.failures[0].message, /over its 8 KB cap.*move history to ARCHIVE\.md/);
    write(dir, 'CHECKPOINT.md', `${owners().join('\n')}\n${kb(7)}\n`);
    assert.equal(check(dir).ok, true);
    assert.equal(check(dir, { BGZFLOW_CHECKPOINT_KB: '4' }).ok, false);
  });

  test('a role named in the checkpoint but missing from OWNERS fails; defining it fixes it', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', [...owners(), ...tasks(['build', 'Lead'], ['review', 'Operations lead'])].join('\n'));
    const r = check(dir);
    assert.deepEqual(codes(r), ['unknown-role']);
    assert.match(r.failures[0].message, /"operations lead".*not in its OWNERS block/);
    write(dir, 'CHECKPOINT.md', [...owners('| Operations lead | Cy |'), ...tasks(['build', 'Lead'], ['review', 'Operations lead'])].join('\n'));
    assert.equal(check(dir).ok, true);
  });

  test('role matching ignores case, emphasis and a parenthetical, and accepts a longer or shorter form', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', [...owners(), ...tasks(['a', '**LEAD**'], ['b', 'Lead (Ada)'], ['c', 'integration writer'], ['d', 'Lead, Integration writer'])].join('\n'));
    assert.equal(check(dir).ok, true);
  });

  test('roles named with no OWNERS block fail; a checkpoint that names nobody only warns', () => {
    const dir = project();
    write(dir, 'CHECKPOINT.md', '# Checkpoint\nOwner: Release manager\n');
    const r = check(dir);
    assert.deepEqual(codes(r), ['unknown-role']);
    assert.match(r.failures[0].message, /has no OWNERS block/);
    write(dir, 'CHECKPOINT.md', '# Checkpoint\nAll quiet.\n');
    const quiet = check(dir);
    assert.equal(quiet.ok, true);
    assert.ok(quiet.warnings.some((w) => w.code === 'no-owners'));
  });

  test('placeholder cells and roles inside code fences are ignored; OWNERS as a bullet list works', () => {
    const roles = checkpointRoles(['## Owners', '- **Lead**: Ada', '- Integration writer - Bo', '', '## Tasks', '| Task | Owner |', '|---|---|', '| a | TBD |', '| b | <role> |', '| c | - |', '', '```', 'Owner: Ghost', '```'].join('\n'));
    assert.deepEqual(roles.owners.sort(), ['integration writer', 'lead']);
    assert.deepEqual(roles.referenced, []);
    assert.equal(roles.hasOwnersBlock, true);
  });

  test('a handoff over its cap is a warning; every CHECKPOINT*.md file is checked', () => {
    const dir = project();
    write(dir, 'HANDOFF-next.md', kb(3));
    write(dir, 'CHECKPOINT-2026.md', kb(9));
    const r = checkCheckpoints(dir, { checkpointKb: 8, handoffKb: 2 });
    assert.deepEqual(r.warnings.map((w) => w.code).sort(), ['handoff-size', 'no-owners']);
    assert.deepEqual(r.failures.map((f) => f.code), ['checkpoint-size']);
  });
});

describe('command line', () => {
  test('exit 0 with PASS, exit 1 with FAIL lines, and --json is parseable', () => {
    const good = project();
    write(good, 'AGENTS.md', 'Small.\n');
    const ok = cli([good]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /chain: 1 file\(s\), 1 of 3000 words/);
    assert.match(ok.stdout, /^PASS$/m);
    const bad = project();
    write(bad, 'AGENTS.md', '## Required reading\n- [x](nope.md)\n');
    const fail = cli([bad]);
    assert.equal(fail.status, 1);
    assert.match(fail.stdout, /FAIL \[pointer\]/);
    assert.match(fail.stdout, /^FAIL \(1 problem\)$/m);
    const json = JSON.parse(cli([bad, '--json']).stdout);
    assert.equal(json.ok, false);
    assert.equal(json.failures[0].code, 'pointer');
    assert.equal(json.budget, 3000);
  });

  test('--budget and the environment change the limit', () => {
    const dir = project();
    write(dir, 'AGENTS.md', `${words(60)}\n`);
    assert.equal(cli([dir, '--budget', '50']).status, 1);
    assert.equal(cli([dir], { BGZFLOW_STARTUP_WORDS: '50' }).status, 1);
    assert.equal(cli([dir], { BGZFLOW_STARTUP_WORDS: '500' }).status, 0);
  });

  test('bad usage exits 2 with the usage text; --help exits 0', () => {
    for (const args of [['--budget', 'abc'], ['--budget'], ['--nope'], ['a', 'b']]) {
      const r = cli(args);
      assert.equal(r.status, 2, args.join(' '));
      assert.match(r.stderr, /^startup-check: /);
      assert.match(r.stderr, /usage: startup-check/);
    }
    const help = cli(['--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /--av-safe/);
  });
});

describe('av-safe lint: a public plugin ships Node and POSIX shell only', () => {
  // Each pattern is assembled from pieces so this file passes its own lint.
  const patterns = {
    'win-shell': j('power', 'shell.exe -NoProfile -File run.ps'),
    'exec-policy': j('run -Execution', 'Policy By', 'pass now'),
    'hidden-window': j('run -Window', 'Style Hid', 'den now'),
    'hidden-window ': j('spawn(cmd, args, { windows', 'Hide: true })'),
    'encoded-command': j('run -en', 'c JABzAGMAcgBpAHAAdAA= now'),
    'eval-string': j('Invoke', '-Expression $text'),
    'eval-string ': j('i', 'ex $text'),
    'download-run': j('(New-Object Net.WebClient).Download', 'String("https://example.invalid/a")'),
    lolbin: j('cert', 'util -urlcache -f https://example.invalid/a a.bin'),
    'av-settings': j('Add-Mp', 'Preference -Exclusion', 'Path C:\\x'),
  };

  for (const [name, line] of Object.entries(patterns)) {
    test(`flags ${name.trim()}`, () => {
      const dir = project('av');
      write(dir, 'tool.mjs', `// ${line}\n`);
      const r = lintAvSafe(dir);
      assert.equal(r.ok, false);
      assert.ok(r.findings.some((f) => f.rule === name.trim() && f.file === 'tool.mjs' && f.line === 1), JSON.stringify(r.findings));
    });
  }

  test('Windows script and binary file types are refused whatever they contain', () => {
    const dir = project('av');
    for (const ext of ['ps1', 'cmd', 'bat', 'vbs', 'exe', 'dll', 'lnk']) write(dir, `x.${ext}`, 'hello\n');
    const r = lintAvSafe(dir);
    assert.deepEqual(r.findings.map((f) => f.rule), Array(7).fill('file-type'));
  });

  test('a clean folder passes; docs, dependencies, .tmp, .git and binaries are not linted', () => {
    const dir = project('av');
    write(dir, 'tools/run.mjs', 'export const ok = true;\n');
    write(dir, 'tools/run', '#!/bin/sh\nexec node "$1"\n');
    write(dir, 'README.md', `Windows users may see ${j('power', 'shell')} examples in other projects.\n`);
    write(dir, 'node_modules/x/index.js', `// ${patterns['win-shell']}\n`);
    write(dir, '.tmp/x.mjs', `// ${patterns['win-shell']}\n`);
    write(dir, '.git/hook.sh', `# ${patterns['win-shell']}\n`);
    fs.writeFileSync(path.join(dir, 'blob.js'), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(patterns['win-shell'])]));
    const r = lintAvSafe(dir);
    assert.deepEqual(r.findings, []);
    assert.equal(r.ok, true);
    assert.equal(r.scanned, 2);
  });

  test('the command line exits 1 on a finding and 0 when clean, in text and JSON', () => {
    const bad = project('av');
    write(bad, 'x.mjs', `// ${patterns['hidden-window']}\n`);
    const r = cli(['--av-safe', bad]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FAIL \[av-safe\] x\.mjs:1 \[hidden-window\]/);
    assert.equal(JSON.parse(cli(['--av-safe', bad, '--json']).stdout).failures[0].code, 'av-safe');
    const good = project('av');
    write(good, 'x.mjs', 'export {};\n');
    const ok = cli(['--av-safe', good]);
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /^av-safe PASS /);
    assert.deepEqual(avSafeFailures(good), []);
  });

  test('this plugin passes its own lint: no Windows launchers, hidden windows, encoded or download-and-run commands', () => {
    const r = lintAvSafe(ROOT);
    assert.deepEqual(r.findings, []);
    assert.ok(r.scanned > 15, `only ${r.scanned} files scanned`);
    assert.deepEqual(fs.readdirSync(path.join(ROOT, 'tools', 'bin')).filter((n) => /\.(?:cmd|bat|ps1)$/i.test(n)), []);
  });
});
