// Overlay metadata is private input. Never execute commands from it or read credentials.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function overlayDir(env = process.env, home = os.homedir()) {
  return env.BGZFLOW_OVERLAY || path.join(home, '.bgzflow', 'overlay');
}

export function localPath(value, base, home = os.homedir()) {
  if (!value || value === '-' || /[<>]/.test(value)) return null;
  if (value === '~') return home;
  if (/^~[/\\]/.test(value)) return path.join(home, value.slice(2));
  return path.resolve(base, value);
}

export function readTables(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); }
  catch (err) { if (err.code === 'ENOENT') return []; throw err; }
  const rows = [];
  let headers = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) { headers = null; continue; }
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim().replace(/^`|`$/g, ''));
    if (cells.every((s) => /^:?-+:?$/.test(s))) continue;
    if (!headers) { headers = cells.map((s) => s.toLowerCase()); continue; }
    rows.push(Object.fromEntries(headers.map((name, i) => [name, cells[i] || ''])));
  }
  return rows;
}

export function readRoutes({ env = process.env, home = os.homedir(), overlay = overlayDir(env, home) } = {}) {
  const seen = new Set();
  return readTables(path.join(overlay, 'ROUTES.md')).filter((row) => row.resource || row.id).map((row) => {
    const id = row.resource || row.id;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) throw new Error('invalid resource ID in ROUTES.md');
    if (seen.has(id)) throw new Error(`duplicate resource ID: ${id}`);
    seen.add(id);
    const kind = row.kind || 'local';
    if (!['local', 'cloud'].includes(kind)) throw new Error(`invalid resource kind: ${id}`);
    const setting = (s) => !s || s === '-' || /[<>]/.test(s) ? null : s;
    return {
      id, name: row.name || id, kind, cli: setting(row.cli),
      home: localPath(row.home, overlay, home), jobsDir: localPath(row.jobs, overlay, home),
      dispatch: setting(row.dispatch), cost: setting(row.cost) || 'unknown; verify before dispatch',
      qualified: /^(yes|true)$/i.test(row.qualified), recommended: /^(yes|true)$/i.test(row.recommended),
      model: setting(row.model), effort: setting(row.effort),
      account: setting(row.account), environment: setting(row.environment),
    };
  });
}
