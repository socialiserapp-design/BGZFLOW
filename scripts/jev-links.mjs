#!/usr/bin/env node
// bg-jev skill links, made the same way as the other bg-* skills on an installed machine:
//   ~/.codex/BGZFLOW/bg-jev  -> <plugin>/skills/bg-jev
//   ~/.codex/skills/bg-jev   -> ~/.codex/BGZFLOW/bg-jev
//   ~/.claude/skills/bg-jev  -> ~/.codex/BGZFLOW/bg-jev
// <plugin> defaults to ~/.claude/bgzflow-plugin/current. Junctions on Windows, directory symlinks elsewhere.
//
//   node scripts/jev-links.mjs link   [--home <dir>] [--plugin <dir>] [--dry]
//   node scripts/jev-links.mjs unlink [--home <dir>] [--plugin <dir>] [--dry]
//   node scripts/jev-links.mjs status [--home <dir>] [--plugin <dir>]
//
// link never replaces anything that is already there: a matching link is left as it is, anything else is reported as
// "kept" and the command exits 1. unlink removes only links that point where link would point them; it never removes a
// real folder and never deletes recursively. Both are safe to run twice.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL = 'bg-jev';
const WIN = process.platform === 'win32';

export function plan({ home = os.homedir(), plugin } = {}) {
  const root = plugin ? path.resolve(plugin) : path.join(home, '.claude', 'bgzflow-plugin', 'current');
  const hub = path.join(home, '.codex', 'BGZFLOW', SKILL);
  return {
    source: path.join(root, 'skills', SKILL),
    links: [
      { link: hub, target: path.join(root, 'skills', SKILL) },
      { link: path.join(home, '.codex', 'skills', SKILL), target: hub },
      { link: path.join(home, '.claude', 'skills', SKILL), target: hub },
    ],
  };
}

const norm = (p) => {
  const r = path.resolve(String(p).replace(/^\\\\\?\\/, ''));
  return WIN ? r.toLowerCase() : r;
};

// 'missing', 'ours' (a link to the expected target), 'other-link' or 'not-a-link'.
export function stateOf({ link, target }) {
  let st;
  try {
    st = fs.lstatSync(link);
  } catch {
    return 'missing';
  }
  if (!st.isSymbolicLink()) return 'not-a-link';
  let to;
  try {
    to = fs.readlinkSync(link);
  } catch {
    return 'other-link';
  }
  return norm(path.resolve(path.dirname(link), to)) === norm(target) ? 'ours' : 'other-link';
}

export function link({ home, plugin, dry = false } = {}) {
  const p = plan({ home, plugin });
  if (!fs.existsSync(path.join(p.source, 'SKILL.md'))) return { ok: false, err: `no ${SKILL}/SKILL.md in the plugin at ${p.source}`, results: [] };
  const results = [];
  for (const l of p.links) {
    const s = stateOf(l);
    if (s === 'ours') results.push({ ...l, result: 'already linked' });
    else if (s !== 'missing') results.push({ ...l, result: `kept: ${s === 'not-a-link' ? 'a real folder or file' : 'a link to somewhere else'} is already there` });
    else if (dry) results.push({ ...l, result: 'would link' });
    else {
      fs.mkdirSync(path.dirname(l.link), { recursive: true });
      fs.symlinkSync(l.target, l.link, WIN ? 'junction' : 'dir');
      results.push({ ...l, result: 'linked' });
    }
  }
  return { ok: results.every((r) => !r.result.startsWith('kept')), results };
}

export function unlink({ home, plugin, dry = false } = {}) {
  const p = plan({ home, plugin });
  const results = [];
  for (const l of [...p.links].reverse()) {
    const s = stateOf(l);
    if (s === 'missing') results.push({ ...l, result: 'not there' });
    else if (s !== 'ours') results.push({ ...l, result: `kept: ${s === 'not-a-link' ? 'a real folder or file' : 'a link to somewhere else'}, not made by link` });
    else if (dry) results.push({ ...l, result: 'would remove the link' });
    else {
      // Removes the link itself; the folder it points at is untouched.
      if (WIN) fs.rmdirSync(l.link);
      else fs.unlinkSync(l.link);
      results.push({ ...l, result: 'removed the link' });
    }
  }
  return { ok: results.every((r) => !r.result.startsWith('kept')), results };
}

export function status({ home, plugin } = {}) {
  const p = plan({ home, plugin });
  const results = p.links.map((l) => ({ ...l, result: stateOf(l) }));
  return { ok: results.every((r) => r.result === 'ours'), source: p.source, results };
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const opt = (name) => {
    const i = rest.indexOf(name);
    return i !== -1 && rest[i + 1] ? rest[i + 1] : undefined;
  };
  const args = { home: opt('--home') ? path.resolve(opt('--home')) : os.homedir(), plugin: opt('--plugin'), dry: rest.includes('--dry') };
  const fn = { link, unlink, status }[cmd];
  if (!fn) {
    console.error('usage: node scripts/jev-links.mjs link|unlink|status [--home <dir>] [--plugin <dir>] [--dry]');
    process.exitCode = 2;
    return;
  }
  const res = fn(args);
  console.log(JSON.stringify(res, null, 2));
  if (!res.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
