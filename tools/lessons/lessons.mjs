#!/usr/bin/env node
import { add, due, list, review, rework, status } from './lib.mjs';

const usage = `usage: bgz lessons <add|list|due|rework|review|status> [roots...] [--json]
  add --project NAME --stage STAGE --what TEXT --key PATTERN [--root DIR]
      [--evidence PATH_OR_LINK] [--severity normal|high] [--id ID] [--date ISO]
      [--system NAME] [--cause NAME] [--release VERSION]
      [--scope project|global] [--kind defect|preference|pattern]
      [--review-by YYYY-MM-DD] [--verified-by VERIFIER]
  list [roots...] [--open] [--key PATTERN]   every lesson: id, date, project, stage, key, severity, status
  due [roots...]                    two open lessons per key, or one high
  rework [roots...] [--since ISO]   repeat fixes: same system and cause recorded twice or more
  review [roots...] --key PATTERN --outcome promoted|dismissed
      [--to HOOK_TEST_FIELD_OR_SKILL_PATH] [--reason TEXT]
      [--scope project|global] [--review-by YYYY-MM-DD] [--verified-by VERIFIER]
  status [roots...]                counts and open groups
Defaults to the current project; storage: .bgzflow/lessons.jsonl.
list, due, rework and status only read: they need no write access.
Promoted requires --to; dismissed requires --reason. Global scope requires evidence, review-by and verified-by.
Preferences are never turned into blocking rules.`;

const OPTIONS = {
  add: ['project', 'stage', 'what', 'key', 'root', 'evidence', 'severity', 'id', 'date', 'system', 'cause', 'release', 'scope', 'kind', 'review-by', 'verified-by'],
  list: ['root', 'key'], due: ['root'], rework: ['root', 'since'], status: ['root'],
  review: ['root', 'key', 'outcome', 'to', 'reason', 'scope', 'review-by', 'verified-by'],
};
const FLAGS = { list: ['open'] };

function formatList(result) {
  const lines = [`Lessons: ${result.lessons.length}`];
  for (const row of result.lessons) lines.push(`  ${[row.id, row.date, row.project, row.stage, row.key, row.severity, row.status].join('  ')}`);
  return lines;
}
function formatRework(result) {
  const lines = [`Incidents${result.since ? ` since ${result.since.slice(0, 10)}` : ''}: ${result.incidents}; ${result.classified} name a system and a cause, ${result.unclassified} do not.`];
  if (!result.classified) lines.push('No repeat fixes can be found yet: record incidents with --system and --cause.');
  else lines.push(`Repeat fixes: ${result.repeatFixes} of ${result.classified} classified incidents (${Math.round(result.repeatShare * 1000) / 10}%), across ${result.repeatCauses} repeated cause${result.repeatCauses === 1 ? '' : 's'}.`);
  for (const group of result.groups) {
    lines.push(`  ${group.system} / ${group.cause}: ${group.count}${group.repeat ? ' (repeat)' : ''}  ${group.dates.map(d => d.slice(0, 10)).join(', ')}${group.releases.length ? `  releases ${group.releases.join(', ')}` : ''}`);
  }
  lines.push(`Not computed: ${result.notComputed.metrics.join(', ')}. ${result.notComputed.reason}`);
  return lines;
}

export function main(argv = process.argv.slice(2)) {
  try {
    if (!argv.length || argv.includes('--help') || argv.includes('-h')) { console.log(usage); return; }
    const [command, ...args] = argv;
    const allowed = Object.hasOwn(OPTIONS, command) ? OPTIONS[command] : undefined;
    if (!allowed) throw new Error('Unknown lessons command');
    const flags = FLAGS[command] ?? [];
    const opts = {}, roots = [];
    let asJson = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--json') { asJson = true; continue; }
      if (arg.startsWith('-')) {
        const name = arg.slice(2);
        if (flags.includes(name) && arg.startsWith('--')) {
          if (opts[name] !== undefined) throw new Error('Invalid or duplicate option; see --help');
          opts[name] = true;
          continue;
        }
        if (!allowed.includes(name) || opts[name] !== undefined || i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error('Invalid or duplicate option; see --help');
        opts[name] = args[++i];
      } else roots.push(arg);
    }
    if (opts.root !== undefined) { roots.push(opts.root); delete opts.root; }
    if (!roots.length) roots.push(process.cwd());
    if (command === 'add' && roots.length !== 1) throw new Error('add requires exactly one project root');
    const result = command === 'add' ? add(roots[0], opts)
      : command === 'review' ? review(roots, opts)
      : command === 'list' ? list(roots, { open: opts.open === true, key: opts.key })
      : command === 'rework' ? rework(roots, { since: opts.since })
      : command === 'due' ? due(roots) : status(roots);
    if (asJson || command === 'add' || command === 'review') console.log(JSON.stringify(result));
    else if (command === 'list') console.log(formatList(result).join('\n'));
    else if (command === 'rework') console.log(formatRework(result).join('\n'));
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
