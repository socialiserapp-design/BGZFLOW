import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { detect, projectFile, readProjectCommands, setup } from '../project-setup.mjs';

const cli = fileURLToPath(new URL('../project-setup.mjs', import.meta.url));
const made = [];

// A temp project folder holding the given files ({ 'path': 'text' }).
function project(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgz-setup-'));
  made.push(dir);
  for (const [name, text] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  }
  return dir;
}

function run(args, options = {}) {
  const env = { ...process.env, ...options.env };
  for (const name of ['BGZFLOW_PROJECT', 'CLAUDE_PROJECT_DIR', 'GROK_WORKSPACE_ROOT']) delete env[name];
  return spawnSync(process.execPath, [cli, ...args], { cwd: options.cwd, env, encoding: 'utf8' });
}

const pkg = (scripts, extra = {}) => JSON.stringify({ name: 'demo', scripts, ...extra });
const commandsOf = (files) => detect(project(files)).commands;

after(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

test('package.json scripts become npm commands when there is no lockfile', () => {
  const dir = project({ 'package.json': pkg({ build: 'tsc', test: 'node --test', lint: 'eslint .' }) });
  const { commands, from } = detect(dir);
  assert.deepEqual(commands, { build: 'npm run build', test: 'npm test', lint: 'npm run lint' });
  assert.equal(from.build, 'package.json scripts.build');
  assert.equal(from.test, 'package.json scripts.test');
  assert.equal(from.lint, 'package.json scripts.lint');
});

test('the lockfile picks the package manager', () => {
  const scripts = pkg({ build: 'x', test: 'y', lint: 'z' });
  assert.deepEqual(commandsOf({ 'package.json': scripts, 'pnpm-lock.yaml': '' }), { build: 'pnpm run build', test: 'pnpm test', lint: 'pnpm run lint' });
  assert.deepEqual(commandsOf({ 'package.json': scripts, 'yarn.lock': '' }), { build: 'yarn run build', test: 'yarn test', lint: 'yarn run lint' });
  assert.deepEqual(commandsOf({ 'package.json': scripts, 'bun.lockb': '' }), { build: 'bun run build', test: 'bun run test', lint: 'bun run lint' });
  assert.deepEqual(commandsOf({ 'package.json': scripts, 'bun.lock': '' }), { build: 'bun run build', test: 'bun run test', lint: 'bun run lint' });
  assert.deepEqual(commandsOf({ 'package.json': scripts, 'package-lock.json': '{}' }), { build: 'npm run build', test: 'npm test', lint: 'npm run lint' });
});

test('a packageManager field is used only when there is no lockfile', () => {
  const scripts = pkg({ test: 'x' }, { packageManager: 'pnpm@9.1.0' });
  assert.equal(commandsOf({ 'package.json': scripts }).test, 'pnpm test');
  assert.equal(commandsOf({ 'package.json': scripts, 'yarn.lock': '' }).test, 'yarn test');
});

test('missing scripts stay null and the npm init placeholder test is not a test', () => {
  const placeholder = 'echo "Error: no test specified" && exit 1';
  assert.deepEqual(commandsOf({ 'package.json': pkg({ test: placeholder, start: 'node .' }) }), { build: null, test: null, lint: null });
  assert.deepEqual(commandsOf({ 'package.json': pkg({ build: 'tsc' }) }), { build: 'npm run build', test: null, lint: null });
  assert.deepEqual(commandsOf({ 'package.json': '{ not json' }), { build: null, test: null, lint: null });
});

test('Cargo.toml gives cargo commands', () => {
  assert.deepEqual(commandsOf({ 'Cargo.toml': '[package]\nname = "demo"\n' }), { build: 'cargo build', test: 'cargo test', lint: 'cargo clippy' });
});

test('go.mod gives go commands', () => {
  assert.deepEqual(commandsOf({ 'go.mod': 'module demo\n\ngo 1.22\n' }), { build: 'go build ./...', test: 'go test ./...', lint: 'go vet ./...' });
});

test('python: pytest and linters only when configured or listed', () => {
  assert.equal(commandsOf({ 'pytest.ini': '[pytest]\n' }).test, 'pytest');
  assert.equal(commandsOf({ 'pyproject.toml': '[tool.pytest.ini_options]\naddopts = "-q"\n' }).test, 'pytest');
  assert.equal(commandsOf({ 'pyproject.toml': '[project]\nname = "d"\ndependencies = ["requests", "pytest>=7"]\n' }).test, 'pytest');
  assert.equal(commandsOf({ 'setup.cfg': '[tool:pytest]\ntestpaths = tests\n' }).test, 'pytest');
  assert.equal(commandsOf({ 'tox.ini': '[testenv]\ncommands = pytest\n' }).test, 'pytest');
  assert.equal(commandsOf({ 'requirements-dev.txt': 'requests\npytest==8.0\n' }).test, 'pytest');
  assert.equal(commandsOf({ 'pyproject.toml': '[tool.ruff]\nline-length = 100\n' }).lint, 'ruff check .');
  assert.equal(commandsOf({ 'requirements.txt': 'ruff\n' }).lint, 'ruff check .');
  assert.equal(commandsOf({ 'setup.cfg': '[flake8]\nmax-line-length = 100\n' }).lint, 'flake8');
  assert.equal(commandsOf({ '.flake8': '[flake8]\n' }).lint, 'flake8');
  assert.equal(commandsOf({ 'requirements.txt': 'flake8\n' }).lint, 'flake8');
  assert.equal(commandsOf({ 'pyproject.toml': '[tool.ruff]\n', 'setup.cfg': '[flake8]\n' }).lint, 'ruff check .', 'ruff wins over flake8');
});

test('python: a build command needs a declared build backend', () => {
  const backend = '[build-system]\nrequires = ["hatchling"]\nbuild-backend = "hatchling.build"\n';
  assert.equal(commandsOf({ 'pyproject.toml': backend }).build, 'python -m build');
  assert.deepEqual(commandsOf({ 'pyproject.toml': '[project]\nname = "d"\n' }), { build: null, test: null, lint: null });
  assert.deepEqual(commandsOf({ 'requirements.txt': 'requests\nflask\n' }), { build: null, test: null, lint: null });
});

test('Makefile targets are found and look-alikes are not', () => {
  const text = 'CC := gcc\n.PHONY: build test\nbuild: deps\n\t$(CC) main.c\ntest-unit:\n\t./t\nlint :\n\techo ok\n';
  assert.deepEqual(commandsOf({ Makefile: text }), { build: 'make build', test: null, lint: 'make lint' });
  assert.equal(commandsOf({ Makefile: 'all test: x\r\n\ttrue\r\n' }).test, 'make test');
  assert.deepEqual(commandsOf({ Makefile: 'test := 1\nbuild ?= 2\n' }), { build: null, test: null, lint: null });
});

test('a huge line is skipped and a file over 1 MB is not scanned, so neither can hang the scan', () => {
  const spaces = ' '.repeat(300000);
  const dir = project({
    Makefile: `build:\n\ttrue\n${spaces}\ntest:\n\ttrue\n`,
    'requirements.txt': `requests\nruff${spaces}\n`,
  });
  // A child process with a timeout: a hung scan fails the test instead of hanging the run.
  const r = spawnSync(process.execPath, [cli, dir, '--dry', '--json'], { encoding: 'utf8', timeout: 30000 });
  assert.equal(r.status, 0, r.stderr || String(r.error));
  const { commands } = JSON.parse(r.stdout);
  assert.equal(commands.build, 'make build');
  assert.equal(commands.test, 'make test', 'the lines around the long one are still read');
  assert.equal(commands.lint, null, 'the long requirements line is not read');

  const big = project({ Makefile: `${'# filler line\n'.repeat(90000)}test:\n\ttrue\n`, 'requirements-dev.txt': `${'# filler line\n'.repeat(90000)}pytest\n` });
  assert.ok(fs.statSync(path.join(big, 'Makefile')).size > 1024 * 1024);
  assert.deepEqual(detect(big).commands, { build: null, test: null, lint: null });
});

test('gradle: wrapper and build files, lint only when a lint tool is present', () => {
  assert.deepEqual(commandsOf({ gradlew: '#!/bin/sh\n', 'build.gradle': 'plugins { id "java" }\n' }), { build: './gradlew build', test: './gradlew test', lint: null });
  assert.deepEqual(commandsOf({ 'build.gradle.kts': 'plugins { id("io.gitlab.arturbosch.detekt") }\n' }), { build: 'gradle build', test: 'gradle test', lint: 'gradle detekt' });
  assert.equal(commandsOf({ gradlew: '', 'app/build.gradle': "plugins { id 'com.android.application' }\n" }).lint, './gradlew lint');
  assert.equal(commandsOf({ gradlew: '' }).build, './gradlew build');
});

test('maven pom.xml gives mvn package and test', () => {
  assert.deepEqual(commandsOf({ 'pom.xml': '<project></project>' }), { build: 'mvn -q package', test: 'mvn -q test', lint: null });
});

test('deno tasks, including a commented deno.jsonc', () => {
  const text = '{\n  // tasks\n  "tasks": { "test": "deno test -A", "lint": { "command": "deno lint" }, /* later */ "dev": "x", },\n}\n';
  assert.deepEqual(commandsOf({ 'deno.jsonc': text }), { build: null, test: 'deno task test', lint: 'deno task lint' });
  assert.equal(commandsOf({ 'deno.json': '{ "tasks": { "build": "deno compile main.ts" } }' }).build, 'deno task build');
});

test('the first ecosystem wins per kind and the rest fill the gaps', () => {
  const dir = project({
    'package.json': pkg({ build: 'tsc' }),
    'Cargo.toml': '[package]\nname = "d"\n',
    Makefile: 'lint:\n\ttrue\n',
  });
  const { commands, from } = detect(dir);
  assert.deepEqual(commands, { build: 'npm run build', test: 'cargo test', lint: 'cargo clippy' });
  assert.equal(from.test, 'Cargo.toml');
  const makeOnly = detect(project({ 'package.json': pkg({ build: 'tsc' }), Makefile: 'lint:\n\ttrue\n' }));
  assert.deepEqual(makeOnly.commands, { build: 'npm run build', test: null, lint: 'make lint' });
  assert.equal(makeOnly.from.lint, 'Makefile target lint');
});

test('project.json has the documented shape and no project command is run', () => {
  const dir = project({ 'package.json': pkg({ build: 'tsc', test: 'node -e "require(\'fs\').writeFileSync(\'ran.txt\', \'x\')"' }) });
  const r = run([dir]);
  assert.equal(r.status, 0, r.stderr);
  const doc = JSON.parse(fs.readFileSync(projectFile(dir), 'utf8'));
  assert.equal(doc.schema_version, 1);
  assert.match(doc.detected_at, /^\d{4}-\d\d-\d\dT.*Z$/);
  assert.deepEqual(Object.keys(doc.commands), ['build', 'test', 'lint']);
  assert.equal(doc.commands.build, 'npm run build');
  assert.equal(doc.commands.lint, null);
  assert.equal(doc.from.lint, null);
  assert.deepEqual(doc.manual, {});
  assert.equal(fs.existsSync(path.join(dir, 'ran.txt')), false);
});

test('a re-run refreshes detected values and keeps manual ones, which win when read', () => {
  const dir = project({ 'package.json': pkg({ build: 'tsc', test: 'x' }) });
  assert.equal(run([dir]).status, 0);
  const file = projectFile(dir);
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  doc.manual = { test: 'npm run test:ci', deploy: 'make ship' };
  fs.writeFileSync(file, JSON.stringify(doc));
  assert.deepEqual(readProjectCommands(dir), { build: 'npm run build', test: 'npm run test:ci', lint: null });

  fs.writeFileSync(path.join(dir, 'package.json'), pkg({ build: 'tsc', test: 'x', lint: 'eslint .' }));
  fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
  const r = run([dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /manual entries kept: test/);
  const after = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(after.manual, { test: 'npm run test:ci', deploy: 'make ship' });
  assert.deepEqual(after.commands, { build: 'pnpm run build', test: 'pnpm test', lint: 'pnpm run lint' });
  assert.deepEqual(readProjectCommands(dir), { build: 'pnpm run build', test: 'npm run test:ci', lint: 'pnpm run lint' });
});

test('readProjectCommands is all null for a missing or damaged file', () => {
  const none = { build: null, test: null, lint: null };
  assert.deepEqual(readProjectCommands(project()), none);
  assert.deepEqual(readProjectCommands(project({ '.bgzflow/project.json': '{ nope' })), none);
});

test('nothing detected: no file, no folder, one plain line, exit 0', () => {
  const dir = project({ 'README.md': 'hello\n' });
  const r = run([dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim().split('\n').length, 1);
  assert.match(r.stdout, /nothing written/);
  assert.equal(fs.existsSync(path.join(dir, '.bgzflow')), false);
  assert.deepEqual(fs.readdirSync(dir), ['README.md']);
});

test('--dry prints what would be saved and writes nothing', () => {
  const dir = project({ 'go.mod': 'module demo\n' });
  const r = run([dir, '--dry']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /dry run/);
  assert.match(r.stdout, /build: go build \.\/\.\.\./);
  assert.equal(fs.existsSync(path.join(dir, '.bgzflow')), false);
  const again = setup(dir, { dry: true });
  assert.equal(again.written, false);
  assert.equal(fs.existsSync(path.join(dir, '.bgzflow')), false);
});

test('CLAUDE.md and AGENTS.md stay byte-identical, and only .bgzflow is added', () => {
  const claude = Buffer.from('@AGENTS.md\r\n\x00odd bytes\xff', 'latin1');
  const agents = Buffer.from('# Rules\n\nrun things\n', 'utf8');
  const dir = project({ 'package.json': pkg({ test: 'x' }) });
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), claude);
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), agents);
  const before = fs.readdirSync(dir).sort();
  for (let i = 0; i < 2; i += 1) assert.equal(run([dir]).status, 0);
  assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md')).equals(claude));
  assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md')).equals(agents));
  assert.deepEqual(fs.readdirSync(dir).sort(), [...before, '.bgzflow'].sort());
  assert.deepEqual(fs.readdirSync(path.join(dir, '.bgzflow')), ['project.json']);
});

test('plain output is at most 3 lines and --json is parseable', () => {
  const dir = project({ 'package.json': pkg({ build: 'a', test: 'b', lint: 'c' }), 'Cargo.toml': '' });
  const plain = run([dir]);
  assert.ok(plain.stdout.trim().split('\n').length <= 3);
  assert.match(plain.stdout, /saved \.bgzflow\/project\.json/);
  assert.match(plain.stdout, /build: npm run build; test: npm test; lint: npm run lint/);
  const json = JSON.parse(run([dir, '--json', '--dry']).stdout);
  assert.equal(json.found, true);
  assert.equal(json.written, false);
  assert.equal(json.file, '.bgzflow/project.json');
  assert.equal(json.commands.test, 'npm test');
  assert.equal(json.effective.lint, 'npm run lint');
  const none = JSON.parse(run([project(), '--json']).stdout);
  assert.equal(none.found, false);
});

test('without a folder it uses the current project', () => {
  const dir = project({ 'go.mod': 'module demo\n' });
  fs.mkdirSync(path.join(dir, '.git'));
  fs.mkdirSync(path.join(dir, 'sub'));
  const r = run([], { cwd: path.join(dir, 'sub') });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readProjectCommands(dir).test, 'go test ./...');
  assert.equal(fs.existsSync(path.join(dir, 'sub', '.bgzflow')), false);
});

test('bad usage exits 2', () => {
  const dir = project({ 'go.mod': 'module demo\n' });
  assert.equal(run([dir, '--nope']).status, 2);
  assert.equal(run([dir, dir]).status, 2);
  assert.equal(run([path.join(dir, 'missing')]).status, 2);
  assert.equal(run([path.join(dir, 'go.mod')]).status, 2);
  assert.equal(fs.existsSync(path.join(dir, '.bgzflow')), false);
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^usage: project-setup /);
});

test('a damaged project.json is left as it is', () => {
  const dir = project({ 'go.mod': 'module demo\n', '.bgzflow/project.json': '{ "manual": { "test": "x" ' });
  const r = run([dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not valid JSON/);
  assert.equal(fs.readFileSync(projectFile(dir), 'utf8'), '{ "manual": { "test": "x" ');
  assert.deepEqual(fs.readdirSync(path.join(dir, '.bgzflow')), ['project.json']);
});
