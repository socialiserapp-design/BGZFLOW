#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createEngine } from './runtime.mjs';
import { checkCurrentTruth } from './current-truth.mjs';
import { createLocalHostAdapter } from './local-host.mjs';
import { prepareRequest, methodGuidance, readMethod } from './method-policy.mjs';

const usage = `Usage: bgz engine <run|resume|recover|status|truth|prepare|method|harness2-example> [options]
  run     --spec <file.json>   Run an explicit goal and its local commands
  resume  --goal <id>          Reconcile and continue an existing goal
  recover --goal <id> --repair <file.json>
                               Apply an explicit caller-supplied repair to one failed step
  status  --goal <id>          Read durable historical goal state without running commands
  truth   --project <directory> Read back registered current evidence dependencies
  prepare [--text-file <file>] [--product bgzflow|lucian] [--vocabulary <file.json>]
                              Default guidance and method catalog; no model call
  method  --id <method> [--context <saved-file>] [--product bgzflow|lucian]
                              Read a full method from bundled or saved bytes
  harness2-example --harness <checkout> --python <executable> --evidence <NEW-dir>
                              Run the pinned offline improvement example (scripted proposer)
  run/resume/recover/status require --project <directory>
  --json                      Include the complete state in output
The repair file is { "recoveryId", "stepId", "command", "reason" }.
The standalone package provides the same commands as bgz-engine.`;

function parseArgs(args) {
  const [command, ...rest] = args;
  if (!command || command === '--help' || command === '-h') return { help: true };
  if (!['run', 'resume', 'recover', 'status'].includes(command)) throw new Error('Expected run, resume, recover or status.');
  const options = { command, json: false };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (flag === '--json') { options.json = true; continue; }
    if (!['--project', '--spec', '--goal', '--repair', '--product'].includes(flag)) throw new Error(`Unknown option: ${flag}`);
    const value = rest[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
    const key = flag.slice(2);
    if (Object.hasOwn(options, key)) throw new Error(`Repeated option: ${flag}`);
    options[key] = value;
  }
  if (!options.project) throw new Error('--project is required.');
  if (command === 'run' && (!options.spec || options.goal || options.repair)) throw new Error('run requires --spec and does not accept --goal or --repair.');
  if (command === 'recover' && (!options.goal || !options.repair || options.spec)) throw new Error('recover requires --goal and --repair and does not accept --spec.');
  if (['resume', 'status'].includes(command) && (!options.goal || options.spec || options.repair)) throw new Error(`${command} requires --goal and does not accept --spec or --repair.`);
  return options;
}

async function methodCommand(args, io) {
  const [command, ...rest] = args;
  const options = {};
  for (let index = 0; index < rest.length; index++) {
    const flag = rest[index];
    if (flag === '--json') { options.json = true; continue; }
    const allowed = command === 'prepare' ? ['--text-file', '--product', '--vocabulary'] : ['--id', '--context', '--product'];
    if (!allowed.includes(flag) || Object.hasOwn(options, flag)) throw new Error(`Unsupported or repeated method option: ${flag}`);
    const value = rest[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}.`);
    options[flag] = value;
  }
  if (options['--context'] && options['--product']) throw new Error('Saved context already identifies its product.');
  const text = options['--text-file'] ? await fs.readFile(path.resolve(options['--text-file']), 'utf8') : '';
  const saved = options['--context'] ? JSON.parse(await fs.readFile(path.resolve(options['--context']), 'utf8')) : null;
  const vocabulary = options['--vocabulary'] ? JSON.parse(await fs.readFile(path.resolve(options['--vocabulary']), 'utf8')) : undefined;
  const context = saved ? saved.methodContext ?? saved : await prepareRequest({ text, product: options['--product'] ?? 'bgzflow', vocabulary });
  if (command === 'method') {
    if (!options['--id']) throw new Error('method requires --id.');
    const method = readMethod(context, options['--id']);
    io.stdout.write(options.json ? JSON.stringify(method, null, 2) + '\n' : method.body + '\n');
  } else {
    io.stdout.write(JSON.stringify(options.json ? context : { product: context.product, requestSha256: context.requestSha256, sha256: context.sha256, guidance: methodGuidance(context), ...(context.vocabulary ? { vocabulary: context.vocabulary } : {}), methods: context.methods.map(({ body, ...metadata }) => metadata) }, null, 2) + '\n');
  }
  return 0;
}

export async function main(args = process.argv.slice(2), io = process) {
  let engine;
  try {
    if (args[0] === 'truth') {
      const rest = args.slice(1).filter(item => item !== '--json');
      if (rest.length !== 2 || rest[0] !== '--project') throw Error('truth requires --project <directory>.');
      const report = await checkCurrentTruth({ projectRoot: path.resolve(rest[1]) });
      io.stdout.write(JSON.stringify(report, null, 2) + '\n');
      return report.status === 'checked' || report.status === 'not-configured' ? 0 : 1;
    }
    if (args[0] === 'harness2-example') return await (await import('./harness2-example.mjs')).runHarness2Example(args.slice(1), io);
    if (['prepare', 'method'].includes(args[0])) return await methodCommand(args, io);
    const options = parseArgs(args);
    if (options.help) { io.stdout.write(`${usage}\n`); return 0; }
    const projectRoot = path.resolve(options.project);
    engine = await createEngine({ projectRoot, adapter: createLocalHostAdapter(), product: options.product ?? 'bgzflow' });
    let state;
    if (options.command === 'run') {
      const spec = JSON.parse(await fs.readFile(path.resolve(options.spec), 'utf8'));
      state = await engine.start(spec);
    } else if (options.command === 'resume') state = await engine.resume(options.goal);
    else if (options.command === 'recover') {
      const repair = JSON.parse(await fs.readFile(path.resolve(options.repair), 'utf8'));
      state = await engine.recover(options.goal, repair);
    } else state = await engine.status(options.goal);
    if (!state) throw new Error('Goal was not found in this project.');
    const result = options.json ? state : { id: state.id ?? state.spec?.id, status: state.status, acceptanceScope: state.acceptanceScope ?? 'declared-artifacts', wholeOutcomeStatus: state.wholeOutcomeStatus ?? 'not-assessed', freshness: state.freshness ?? 'historical', currentTruth: state.currentTruth ?? { status: 'not-configured', scope: 'declared-evidence-dependencies' }, acceptedAt: state.acceptedAt ?? null, integrity: state.integrity ? { checkedAt: state.integrity.checkedAt, matches: state.integrity.matches } : null, reason: state.reason ?? null };
    io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return state.status === 'busy' ? 3 : options.command === 'status' || state.status === 'accepted' ? 0 : 1;
  } catch (error) {
    io.stderr.write(`bgz engine: ${error.message}\n`);
    return 2;
  } finally {
    await engine?.dispose();
  }
}

if (process.argv[1] && await fs.realpath(process.argv[1]).catch(() => null) === await fs.realpath(fileURLToPath(import.meta.url))) {
  process.exitCode = await main();
}
