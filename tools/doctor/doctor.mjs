#!/usr/bin/env node
// doctor: read-only health reports. It never edits a setting, deletes a file or sends anything anywhere.
//
//   doctor [<dir>]                      both reports (urls for <dir> or the current folder, then plugins)
//   doctor urls [<dir>] [--json]        credential-shaped URLs in git remotes and text files
//   doctor plugins [--usage] [--usage-days <n>] [--top <n>] [--budget <tokens>] [--home <dir>] [--desktop-dir <dir>] [--json]
//                                       what enabled plugins and desktop extensions cost every session
//
// Exit 0: nothing to fix. Exit 1: a credential-shaped URL was found, or the plugin estimate is over --budget.
// Exit 2: bad usage or an unexpected error.
import { pluginReport, renderPlugins, renderUrls, scanUrls } from './lib.mjs';

const HELP = `usage:
  doctor [<dir>]
  doctor urls [<dir>] [--json]
  doctor plugins [--usage] [--usage-days <n>] [--top <n>] [--budget <tokens>] [--home <dir>] [--desktop-dir <dir>] [--json]
urls     finds a token or password inside a URL (git remote, notes, config). A username alone is fine.
plugins  estimates the tokens that enabled plugins and desktop extensions add to every session.
         --usage also counts plugin use in the last --usage-days (default 30) of chats: it reads plugin names only.
doctor only reads. Exit: 0 fine, 1 finding or over budget, 2 bad usage.`;

class UsageError extends Error {}

function parse(argv) {
  const out = { positional: [], flags: {} };
  const withValue = new Set(['--usage-days', '--top', '--budget', '--home', '--desktop-dir']);
  const boolean = new Set(['--json', '--usage', '-h', '--help']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.startsWith('--') ? a.indexOf('=') : -1;
    const name = eq === -1 ? a : a.slice(0, eq);
    if (boolean.has(name) && eq === -1) out.flags[name.replace(/^-+/, '')] = true;
    else if (withValue.has(name)) {
      const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (value === undefined || value === '') throw new UsageError(`${name} needs a value`);
      out.flags[name.replace(/^-+/, '')] = value;
    } else if (a.startsWith('-') && a !== '-') throw new UsageError(`unknown option ${a}`);
    else out.positional.push(a);
  }
  return out;
}

function positiveInt(value, name) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new UsageError(`${name} needs a whole number above 0`);
  return n;
}

function main(argv) {
  const { positional, flags } = parse(argv);
  if (flags.h || flags.help) {
    process.stdout.write(HELP + '\n');
    return 0;
  }
  const command = ['urls', 'plugins'].includes(positional[0]) ? positional.shift() : 'all';
  if (command === 'plugins' && positional.length) throw new UsageError(`unexpected argument "${positional[0]}"`);
  if (positional.length > 1) throw new UsageError(`unexpected argument "${positional[1]}"`);
  const options = {
    home: flags.home,
    desktop: flags['desktop-dir'],
    usage: Boolean(flags.usage),
    usageDays: positiveInt(flags['usage-days'], '--usage-days'),
    budget: positiveInt(flags.budget, '--budget'),
  };
  const top = positiveInt(flags.top, '--top');
  let code = 0;
  const json = {};
  const sections = [];
  if (command === 'urls' || command === 'all') {
    const r = scanUrls(positional[0]);
    json.urls = r;
    sections.push(renderUrls(r));
    if (!r.ok) code = 1;
  }
  if (command === 'plugins' || command === 'all') {
    const r = pluginReport(options);
    json.plugins = r;
    sections.push(renderPlugins(r, top ? { top } : undefined));
    if (r.overBudget) code = 1;
  }
  process.stdout.write((flags.json ? JSON.stringify(command === 'all' ? json : json[command], null, 2) : sections.join('\n\n')) + '\n');
  return code;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  process.stderr.write(`doctor: ${err && err.message ? err.message : err}\n`);
  if (err instanceof UsageError) process.stderr.write('run: doctor --help\n');
  process.exitCode = 2;
}
