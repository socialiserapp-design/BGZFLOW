// H1 checkpoint cap: a CHECKPOINT or HANDOFF file that grew past its cap is sent back to be cut down.
// Append-only checkpoints reached 113 to 140 KB; nobody could read them at start-up.
import fs from 'node:fs';
import path from 'node:path';

const CHECKPOINT_NAME = /^.*CHECKPOINT.*\.md$/i;
const HANDOFF_NAME = /^HANDOFF.*\.md$/i;

export function capKindFor(filePath) {
  const base = path.basename(String(filePath || ''));
  if (HANDOFF_NAME.test(base)) return 'handoff';
  if (CHECKPOINT_NAME.test(base)) return 'checkpoint';
  return undefined;
}

// Files a write-type tool call touched. Handles the file tools (Write, Edit, MultiEdit) and
// Codex apply_patch, whose input is patch text with "*** Add File: path" / "*** Update File: path" lines.
export function touchedFiles(toolInput, cwd) {
  const out = [];
  const add = (p) => {
    if (typeof p !== 'string' || !p.trim()) return;
    const abs = path.isAbsolute(p) ? p : path.resolve(cwd || process.cwd(), p);
    if (!out.includes(abs)) out.push(abs);
  };
  const ti = toolInput && typeof toolInput === 'object' ? toolInput : {};
  for (const key of ['file_path', 'filePath', 'path', 'file', 'target_file', 'targetFile']) add(ti[key]);
  const patch = typeof ti.command === 'string' ? ti.command : typeof ti.patch === 'string' ? ti.patch : '';
  if (patch.includes('*** ')) {
    const re = /^\*\*\* (?:Add|Update) File:\s*(.+?)\s*$/gm;
    let m;
    while ((m = re.exec(patch)) !== null) add(m[1]);
    const move = /^\*\*\* Move to:\s*(.+?)\s*$/gm;
    while ((m = move.exec(patch)) !== null) add(m[1]);
  }
  return out;
}

const kbText = (bytes) => (bytes / 1024).toFixed(1);

// Returns { reason, file, kind, bytes, capKb } for the first over-cap file, or undefined.
export function checkpointViolation(files, cfg) {
  for (const file of files) {
    const kind = capKindFor(file);
    if (!kind) continue;
    let bytes;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile()) continue;
      bytes = stat.size;
    } catch {
      continue;
    }
    const capKb = kind === 'handoff' ? cfg.handoffKb : cfg.checkpointKb;
    if (bytes <= capKb * 1024) continue;
    const name = path.basename(file);
    const reason =
      `${name} is ${kbText(bytes)} KB, over its ${capKb} KB cap. Keep one page: CURRENT RULES, owners, state, next action. ` +
      'Move history to ARCHIVE.md, then rewrite this file.';
    return { reason, file, kind, bytes, capKb };
  }
  return undefined;
}
