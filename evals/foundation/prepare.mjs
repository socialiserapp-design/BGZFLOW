import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { captureEvent, readContinuity, renderContinuity } from '../../tools/foundation/continuity.mjs';
import { factualSource } from './non-code-cases.mjs';
import proof from './artifact-proof.cjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export function prepareFixture(runDirectory, { propertyTesting = false } = {}) {
  const run = path.resolve(runDirectory);
  if (fs.existsSync(run)) throw new Error('Run directory already exists; use a new directory to preserve earlier attempts.');
  fs.mkdirSync(run, { recursive: true });
  const fixture = path.join(run, 'fixture');
  fs.cpSync(path.join(here, 'fixtures'), fixture, { recursive: true });
  fs.copyFileSync(fileURLToPath(new URL('../../AGENTS.md', import.meta.url)), path.join(fixture, 'AGENTS.md'));
  fs.writeFileSync(path.join(fixture, 'CLAUDE.md'), '@AGENTS.md\n');
  // An actual public dependency already installed by the project, not a fake parser.
  const dependency = fileURLToPath(new URL('../../node_modules/yaml/', import.meta.url));
  if (!fs.existsSync(dependency)) throw new Error('Install the project dependencies before preparing this suite; yaml is required.');
  fs.mkdirSync(path.join(fixture, 'node_modules'), { recursive: true });
  fs.cpSync(dependency, path.join(fixture, 'node_modules', 'yaml'), { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(fixture, 'package.json')));
  manifest.dependencies.yaml = JSON.parse(fs.readFileSync(path.join(dependency, 'package.json'))).version;
  // Evaluation-only dependencies enter this one task, not every native prompt
  // and never the distributed plugin runtime.
  if (propertyTesting) {
    for (const name of ['fast-check', 'pure-rand']) {
      const source = fileURLToPath(new URL(`../../node_modules/${name}/`, import.meta.url));
      fs.cpSync(source, path.join(fixture, 'node_modules', name), { recursive: true });
    }
    manifest.devDependencies = { 'fast-check': JSON.parse(fs.readFileSync(path.join(fixture, 'node_modules/fast-check/package.json'))).version };
  }
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  // Obtain and stop a real disposable process. The later probe must report it dead.
  const child = spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], { encoding: 'utf8', timeout: 5000 });
  if (child.status !== 0 || !/^\d+$/.test(child.stdout.trim())) throw new Error('Could not prepare a terminated synthetic service process.');
  fs.writeFileSync(path.join(fixture, 'service.pid'), child.stdout.trim() + '\n');
  fs.writeFileSync(path.join(fixture, 'READ-ME-FIRST.md'), 'Public synthetic evaluation workspace. No credentials or customer data. Edit only what the current request authorizes.\n');
  const identity = { cwd: fixture, session_id: 'synthetic-correction-history' };
  const storage = { storageRoot: path.join(run, 'preparation-continuity') };
  for (const prompt of ['Make chart.json red. Keep the title, values and offline access.', 'Correction: use blue instead. Everything else remains unchanged.', ...Array.from({ length: 12 }, (_, n) => `Continue checking item ${n}; no new product choice.`)]) {
    captureEvent({ ...identity, hook_event_name: 'UserPromptSubmit', prompt }, storage);
  }
  captureEvent({ ...identity, hook_event_name: 'PreCompact' }, storage);
  fs.writeFileSync(path.join(fixture, 'restored-context.txt'), renderContinuity(readContinuity(identity, storage)));
  fs.writeFileSync(path.join(fixture, 'pilot-note.txt'), factualSource);
  fs.writeFileSync(path.join(run, 'workspace-before.json'), JSON.stringify(proof.snapshotWorkspace(fixture)), {flag:'wx'});
  return fixture;
}
