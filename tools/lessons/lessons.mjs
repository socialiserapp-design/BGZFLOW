#!/usr/bin/env node
import { add, due, review, status } from './lib.mjs';

const usage = `usage: bgz lessons <add|due|review|status> [roots...] [--json]
  add --project NAME --stage STAGE --what TEXT --key PATTERN [--root DIR]
      [--evidence PATH_OR_LINK] [--severity normal|high] [--id ID] [--date ISO]
  due [roots...]                    two open lessons per key, or one high
  review [roots...] --key PATTERN --outcome promoted|dismissed
      [--to HOOK_TEST_FIELD_OR_SKILL_PATH] [--reason TEXT]
  status [roots...]                counts and open groups
Defaults to the current project; storage: .bgzflow/lessons.jsonl.
Promoted requires --to; dismissed requires --reason. Review records existing
lesson IDs only; new occurrences remain open. No rules are edited by this tool.`;

export function main(argv = process.argv.slice(2)) {
  try {
    if (!argv.length || argv.includes('--help') || argv.includes('-h')) { console.log(usage); return; }
    const [command, ...args] = argv;
    const allowed = {
      add: ['project', 'stage', 'what', 'key', 'root', 'evidence', 'severity', 'id', 'date'],
      due: ['root'], status: ['root'], review: ['root', 'key', 'outcome', 'to', 'reason'],
    }[command];
    if (!allowed) throw new Error('Unknown lessons command');
    const opts = {}, roots = [];
    let asJson = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--json') { asJson = true; continue; }
      if (arg.startsWith('-')) {
        const name = arg.slice(2);
        if (!allowed.includes(name) || opts[name] !== undefined || i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error('Invalid or duplicate option; see --help');
        opts[name] = args[++i];
      } else roots.push(arg);
    }
    if (opts.root !== undefined) { roots.push(opts.root); delete opts.root; }
    if (!roots.length) roots.push(process.cwd());
    if (command === 'add' && roots.length !== 1) throw new Error('add requires exactly one project root');
    const result = command === 'add' ? add(roots[0], opts) : command === 'review' ? review(roots, opts) : command === 'due' ? due(roots) : status(roots);
    if (asJson || command === 'add' || command === 'review') console.log(JSON.stringify(result));
    else if (command === 'due') {
      console.log(`Lessons due for review: ${result.groups.length}`);
      for (const group of result.groups) console.log(`  ${group.key}: ${group.count} open${group.high ? ' (severity:high)' : ''}`);
    } else console.log(`Lessons: ${result.total} total, ${result.open} open, ${result.closed} closed, ${result.due} due, ${result.reviews} reviews`);
  } catch (error) {
    // Filesystem errors may include sensitive paths; validation errors are value-free.
    console.error(`lessons: ${error.code ? 'Storage operation failed; check the project root and permissions' : error.message}`);
    process.exitCode = 2;
  }
}

// Direct Node entry and the bgz dispatcher share the same parser.
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
