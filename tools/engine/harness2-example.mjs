import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Explicit offline mechanism example; never starts a model, learner daemon or live controller. */
export async function runHarness2Example(args, io = process) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!['--harness', '--python', '--evidence'].includes(flag) || Object.hasOwn(options, flag)) throw new Error('Expected distinct --harness, --python and --evidence options.');
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
    options[flag] = path.resolve(value);
  }
  if (Object.keys(options).length !== 3) throw new Error('harness2-example needs --harness, --python and a NEW --evidence directory.');
  const directory = fileURLToPath(new URL('./improvement/harness2-example/', import.meta.url));
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'upstream-manifest.json'), 'utf8'));
  for (const item of manifest.files) {
    const data = await fs.readFile(path.join(options['--harness'], item.path));
    if (createHash('sha256').update(data).digest('hex') !== item.sha256) throw new Error('Harness2 source differs from the accepted example pin; no trial started.');
  }
  try { await fs.access(options['--evidence']); throw new Error('Example evidence directory already exists; inspect its original result rather than replaying it.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const result = spawnSync(options['--python'], ['-B', path.join(directory, 'prove.py'), '--harness', options['--harness'], '--engine', fileURLToPath(new URL('./cli.mjs', import.meta.url)), '--node', process.execPath, '--evidence', options['--evidence']], { cwd: directory, encoding: 'utf8' });
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) throw result.error;
  return result.status ?? 1;
}
