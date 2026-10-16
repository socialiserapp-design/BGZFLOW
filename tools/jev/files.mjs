// Levels 8 and 9: cheap reads. `bgz jev file` asks one question of one file; `bgz jev files` asks the same question
// of many files in parallel and then picks the first file to open. The file text goes to Jev; only the answer comes back.
import fs from 'node:fs';
import path from 'node:path';
import { askDetailed, pool, questionFromFlags, safeText, shape } from './jev.mjs';
import { isSecretPath, refuseSecret, secretRefusal } from './secret-paths.mjs';

export const MAX_FILES = 255;
export const MAX_FILE_BYTES = 200 * 1024;
const PARALLEL = 8;
const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', '.svn', '.tmp', 'dist', 'build', '.next', '.cache', '__pycache__', '.venv', 'coverage', '.notes-map', '.codegraph']);
const BINARY_EXT = /\.(?:png|jpe?g|gif|webp|ico|bmp|tiff?|pdf|zip|gz|tgz|7z|rar|tar|exe|dll|so|dylib|bin|class|jar|wasm|mp[34]|mov|avi|mkv|wav|flac|ogg|woff2?|ttf|otf|eot|psd|sqlite3?|db|lock|map)$/i;

export function looksBinary(buf) {
  return buf.subarray(0, 4000).includes(0);
}

// A glob with * ? ** to a RegExp over forward-slash relative paths.
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[\\^$.|+()[\]{}]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

function walk(dir, visit, state) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (state.done) return;
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) state.skipped.dirs++;
      else walk(full, visit, state);
    } else if (e.isFile()) visit(full);
  }
}

// Prune in code: no node_modules or .git, no secret files, no binaries, nothing over 200 KB, at most 255 files.
// A secret file met in a sweep is skipped and counted; one named on its own is listed in `refused`.
export function collectFiles(targets, cwd = process.cwd(), { maxFiles = MAX_FILES } = {}) {
  const state = { done: false, skipped: { dirs: 0, secret: 0, binary: 0, large: 0, over_cap: 0, missing: 0 } };
  const found = [];
  const refused = [];
  const seen = new Set();
  // Judged on the path inside the project, so a parent folder outside it never counts.
  const secretAt = (abs) => {
    const rel = path.relative(cwd, abs);
    return isSecretPath(rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : abs);
  };
  const consider = (file) => {
    const abs = path.resolve(file);
    if (seen.has(abs)) return;
    seen.add(abs);
    if (secretAt(abs)) return void state.skipped.secret++;
    if (BINARY_EXT.test(abs)) return void state.skipped.binary++;
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      return void state.skipped.missing++;
    }
    if (st.size > MAX_FILE_BYTES) return void state.skipped.large++;
    if (found.length >= maxFiles) return void state.skipped.over_cap++;
    try {
      const fd = fs.openSync(abs, 'r');
      const head = Buffer.alloc(Math.min(st.size, 4000));
      fs.readSync(fd, head, 0, head.length, 0);
      fs.closeSync(fd);
      if (looksBinary(head)) return void state.skipped.binary++;
    } catch {
      return void state.skipped.missing++;
    }
    found.push(abs);
  };
  for (const target of targets) {
    const t = path.resolve(cwd, target);
    if (/[*?]/.test(target)) {
      const norm = target.replace(/\\/g, '/');
      const firstWild = norm.search(/[*?]/);
      const staticPart = norm.slice(0, norm.lastIndexOf('/', firstWild) + 1);
      const base = path.resolve(cwd, staticPart || '.');
      const rx = globToRegExp(norm.slice(staticPart.length));
      walk(base, (f) => {
        if (rx.test(path.relative(base, f).split(path.sep).join('/'))) consider(f);
      }, state);
    } else {
      let st;
      try {
        st = fs.statSync(t);
      } catch {
        state.skipped.missing++;
        continue;
      }
      if (st.isDirectory()) walk(t, consider, state);
      else if (secretAt(t)) refused.push(target);
      else consider(t);
    }
  }
  found.sort();
  return { files: found, skipped: state.skipped, refused };
}

// Rank the per-file answers and name the file to open first. Yes-probability and score rank by size;
// a choice ranks by how sure Jev is of the wanted option (--want), or of its top option when none is named.
export function pickFirstFile(results, { type, want } = {}) {
  const usable = results.filter((r) => r.answer);
  const keyOf = (r) => {
    const a = r.answer;
    if (type === 'noul') return a.p_yes;
    if (type === 'score') return a.of ? a.score / a.of : a.score;
    if (want) return a.probabilities && a.probabilities[want] !== undefined ? a.probabilities[want] : a.choice === want ? a.confidence : 0;
    return a.confidence;
  };
  const ranked = usable.map((r) => ({ file: r.file, key: Math.round(keyOf(r) * 1000) / 1000, answer: r.answer })).sort((a, b) => b.key - a.key);
  return { first: ranked.length ? ranked[0].file : null, ranked };
}

async function askFile(file, question, timeoutMs, env, caller) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { file, error: 'unreadable' };
  }
  const r = await askDetailed({ caller, state: { file: path.basename(file), text: safeText(text, 50000) }, questions: { q: question }, timeoutMs, env });
  if (!r.ok) return { file, error: r.err };
  return { file, answer: shape(question, r.answers.q, 'q'), cost: r.cost, ms: r.ms };
}

export async function runFile({ flags, rest, timeoutMs, env }) {
  const file = rest[0];
  if (!file) throw new Error('usage: bgz jev file <path> --q "..." [--type noul|choice|score] [--options a,b,c | --levels "l0|l1"]');
  const question = questionFromFlags(flags);
  refuseSecret(file);
  const abs = path.resolve(file);
  let size;
  try {
    size = fs.statSync(abs).size;
  } catch {
    throw new Error(`cannot read ${file}`);
  }
  if (size > MAX_FILE_BYTES * 2) throw new Error(`${path.basename(file)} is ${Math.round(size / 1024)} KB; a file question takes up to ${MAX_FILE_BYTES * 2 / 1024} KB. Search it with rg first.`);
  const r = await askFile(abs, question, timeoutMs, env, 'jev-file');
  if (r.error) return { ok: false, err: r.error, file };
  return { ok: true, file: abs, ...r.answer, ms: r.ms, cost_usd: r.cost };
}

export async function runFiles({ flags, rest, timeoutMs, env }) {
  if (!rest.length) throw new Error('usage: bgz jev files <globs|dirs...> --q "..." [--type ...] [--want <option>]');
  const question = questionFromFlags(flags);
  const { files, skipped, refused } = collectFiles(rest, process.cwd());
  const refusedNote = refused.length ? { refused: refused.map(secretRefusal) } : {};
  if (!files.length) return { ok: false, err: refused.length ? 'refused: secret files only' : 'no files left after pruning', skipped, ...refusedNote };
  const results = await pool(files, PARALLEL, (f) => askFile(f, question, timeoutMs, env, 'jev-files'));
  const answered = results.filter((r) => r.answer);
  const failed = results.filter((r) => r.error).map((r) => ({ file: r.file, err: r.error }));
  const pick = pickFirstFile(results, { type: question.type, want: typeof flags.want === 'string' ? flags.want : undefined });
  const cost = results.reduce((n, r) => n + (r.cost || 0), 0);
  return {
    ok: answered.length > 0,
    asked: files.length,
    answered: answered.length,
    skipped,
    ...refusedNote,
    first: pick.first,
    ranked: pick.ranked.slice(0, 15).map((r) => ({ file: r.file, key: r.key })),
    failed: failed.slice(0, 15),
    cost_usd: Math.round(cost * 1e7) / 1e7,
  };
}
