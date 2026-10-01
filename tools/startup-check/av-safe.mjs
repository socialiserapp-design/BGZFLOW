// av-safe lint: shipped files must not carry the patterns that antivirus heuristics and reviewers treat as
// malware-like. A public plugin runs on other people's machines, so it ships Node (.mjs) and POSIX shell only:
// no Windows script launchers, no encoded or hidden commands, no download-and-run one-liners,
// no living-off-the-land binaries, no antivirus-settings edits.
//
// The words below are assembled from fragments so that this file passes its own lint.
import fs from 'node:fs';
import path from 'node:path';

const j = (...parts) => parts.join('');

const FORBIDDEN_EXTENSIONS = new Set(
  ['ps1', 'psm1', 'psd1', 'cmd', 'bat', 'vbs', 'vbe', 'wsf', 'hta', 'scr', 'lnk', 'exe', 'dll', 'msi', 'pif'].map((e) => '.' + e),
);
const CODE_EXTENSIONS = new Set(
  ['.mjs', '.cjs', '.js', '.ts', '.sh', '.bash', '.zsh', '.py', '.json', '.yml', '.yaml', '.toml'],
);
const SKIP_DIRS = new Set(['.git', 'node_modules', '.tmp', '.bgzflow', '.notes-map', '__pycache__', '.codegraph']);
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 20000;

export const RULES = [
  { id: 'win-shell', re: new RegExp(`\\b(?:${j('power', 'shell')}|${j('pw', 'sh')})(?:\\.exe)?\\b`, 'i'), why: 'no Windows shell scripting in shipped files' },
  { id: 'exec-policy', re: new RegExp(`-exec(?:utionpolicy)?\\s+(?:${j('by', 'pass')}|unrestricted)`, 'i'), why: 'never change the execution policy' },
  {
    id: 'hidden-window',
    re: new RegExp(`-w(?:indowstyle)?\\s+${j('hid', 'den')}|${j('windows', 'Hide')}\\s*:\\s*true|${j('CREATE_NO', '_WINDOW')}`, 'i'),
    why: 'never hide a window',
  },
  { id: 'encoded-command', re: /-enc(?:odedcommand)?\s+\S{12,}/i, why: 'never pass an encoded command' },
  { id: 'eval-string', re: new RegExp(`\\b(?:${j('invoke', '-expression')}|${j('i', 'ex')})\\b`, 'i'), why: 'never evaluate a string as a command' },
  { id: 'download-run', re: new RegExp(`${j('download', 'string')}|${j('download', 'file')}\\(`, 'i'), why: 'never download and run' },
  {
    id: 'lolbin',
    re: new RegExp(`\\b(?:${[j('cert', 'util'), j('bits', 'admin'), j('ms', 'hta'), j('run', 'dll32'), j('reg', 'svr32')].join('|')})(?:\\.exe)?\\b`, 'i'),
    why: 'no system binaries that malware commonly abuses',
  },
  {
    id: 'av-settings',
    re: new RegExp(`\\b(?:set|add)-${j('mp', 'preference')}\\b|${j('exclusion', 'path')}|${j('disable', 'realtime', 'monitoring')}`, 'i'),
    why: 'never edit antivirus settings',
  },
];

function isCodeFile(file, head) {
  if (CODE_EXTENSIONS.has(path.extname(file).toLowerCase())) return true;
  return path.extname(file) === '' && head.startsWith('#!');
}

function* walk(root) {
  const stack = [root];
  let count = 0;
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(full);
      } else if (e.isFile()) {
        if (++count > MAX_FILES) return;
        yield full;
      }
    }
  }
}

// Returns { ok, scanned, findings: [{ file, line, rule, why, text }] }.
export function lintAvSafe(root) {
  const base = path.resolve(root);
  const findings = [];
  let scanned = 0;
  for (const file of walk(base)) {
    const rel = path.relative(base, file).split(path.sep).join('/');
    const ext = path.extname(file).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      findings.push({ file: rel, line: 0, rule: 'file-type', why: `${ext} files are not shipped (Node .mjs and POSIX shell only)`, text: '' });
      continue;
    }
    let text;
    try {
      const stat = fs.statSync(file);
      if (stat.size > MAX_BYTES) continue;
      const buf = fs.readFileSync(file);
      if (buf.subarray(0, 4096).includes(0)) continue;
      text = buf.toString('utf8');
    } catch {
      continue;
    }
    if (!isCodeFile(file, text.slice(0, 2))) continue;
    scanned++;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      for (const rule of RULES) {
        if (rule.re.test(lines[i])) findings.push({ file: rel, line: i + 1, rule: rule.id, why: rule.why, text: lines[i].trim().slice(0, 120) });
      }
    }
  }
  return { ok: findings.length === 0, scanned, findings };
}
