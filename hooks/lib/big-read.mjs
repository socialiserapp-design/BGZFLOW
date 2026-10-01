// H2 map-first reading: a whole large notes file is not read into the chat; ask the map or read a line range.
// Mandatory full reads of 7 to 12 MB logs made every worker compact 3 to 5 times before any code edit.
// Code files always pass. Only notes-type files over BGZFLOW_BIG_READ_KB are guarded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolFilePath } from './io.mjs';

export const NOTES_EXTENSIONS = new Set(['.md', '.txt', '.log', '.json', '.jsonl', '.csv']);
// A read with an explicit line limit above this is treated as a whole-file read.
export const MAX_RANGE_LINES = 1000;

const READ_TOOLS = /^(read|read_file|readfile|view|view_file)$/i;

export function isReadTool(name) {
  return typeof name !== 'string' || !name || READ_TOOLS.test(name);
}

function num(value) {
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// True when the call names a bounded slice of the file.
export function isRangedRead(ti) {
  const limit = num(ti.limit ?? ti.line_count ?? ti.lineCount ?? ti.max_lines ?? ti.maxLines);
  if (limit !== undefined) return limit >= 1 && limit <= MAX_RANGE_LINES;
  const start = num(ti.start_line ?? ti.startLine ?? ti.line_start ?? ti.from_line ?? ti.fromLine);
  const end = num(ti.end_line ?? ti.endLine ?? ti.line_end ?? ti.to_line ?? ti.toLine);
  if (start !== undefined && end !== undefined) return end >= start && end - start + 1 <= MAX_RANGE_LINES;
  return false;
}

// notes-map indexes these; other notes types are searched with rg -n.
const MAP_EXTENSIONS = new Set(['.md', '.txt']);

// Where the notes-map tool lives (forward slashes so the hint works in any shell).
export function toolsDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', 'tools').replace(/\\/g, '/');
}

// True when a .notes-map/ folder exists in the file's folder or any parent (how notes-map finds its root).
export function hasNotesMap(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    try {
      if (fs.statSync(path.join(dir, '.notes-map')).isDirectory()) return true;
    } catch {
      // not here
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

// Returns { reason, file, bytes } to deny, or undefined to allow.
export function bigReadViolation({ toolName, toolInput, cwd }, cfg) {
  if (!isReadTool(toolName)) return undefined;
  const filePath = toolFilePath(toolInput || {});
  if (!filePath) return undefined;
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(cwd || process.cwd(), filePath);
  if (!NOTES_EXTENSIONS.has(path.extname(abs).toLowerCase())) return undefined;
  let bytes;
  try {
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return undefined;
    bytes = stat.size;
  } catch {
    return undefined;
  }
  if (bytes <= cfg.bigReadKb * 1024) return undefined;
  if (isRangedRead(toolInput || {})) return undefined;
  const kb = Math.round(bytes / 1024);
  const tools = toolsDir();
  const quoted = (p) => `"${p}"`; // shell-safe whether or not the plugin folder contains spaces
  const runner = `(${quoted(`${tools}/bin/notes-map`)}, or node ${quoted(`${tools}/notes-map/notes-map.mjs`)})`;
  let advice;
  if (!MAP_EXTENSIONS.has(path.extname(abs).toLowerCase())) {
    advice = `notes-map ask "<question>" covers .md and .txt notes ${runner}; for this file type search with rg -n "<words>".`;
  } else if (hasNotesMap(path.dirname(abs))) {
    advice = `Run notes-map ask "<question>" ${runner}.`;
  } else {
    advice = `No notes map yet: run notes-map build "<project folder>" once, then notes-map ask "<question>" ${runner}.`;
  }
  const reason = `${path.basename(abs)} is ${kb} KB, over the ${cfg.bigReadKb} KB whole-file read cap. ${advice} Or read a line range with offset and limit.`;
  return { reason, file: abs, bytes };
}
