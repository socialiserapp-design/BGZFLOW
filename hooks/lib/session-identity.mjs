// Session identity map (BGZFLOW 0.9.8+20261020.3, fix round 2)
// Many chats share one folder (Lucian has 6+), so a folder alone cannot say which role a chat plays.
//
// How a chat learns its own role (pending-claim design, fix round 1):
// 1. A SUCCESSFUL `bg-mail post` (or `bg-mail register --project P --role R`) writes only a PENDING claim
//    { claimId: { project, role, at, source } } into the session file named by the host session id in its
//    environment (CLAUDE_CODE_SESSION_ID in Claude Code). claimId is the message id, or a random nonce for
//    register. Subagents inherit the parent's CLAUDE_CODE_SESSION_ID, so the claim alone proves nothing.
// 2. The PostToolUse hook promotes a claim to the chat's identity only when ALL of these hold (fix round 2):
//    - the hook fires on the MAIN thread (no agent_id; Claude Code sets agent_id only inside subagents);
//    - the tool call succeeded;
//    - the tool call's OWN command is that bg-mail post/register: a `node <script> post|register` or
//      `bg-mail post|register` simple command whose --project and --from/--role equal the claim's;
//    - its output carries that claim's own confirmation line (the posted open message, or register's ok line);
//    - the session has no confirmed identity yet, or the claim names the same project and role.
//    So received mail (get, list, collect, wait) never confirms a claim. A worker process started from this
//    chat's shell inherits CLAUDE_CODE_SESSION_ID and its posts claim into this chat's file; such a claim can
//    never rename the chat. A deliberate role change needs the strict one-plain-command path in 3.
//    A subagent's PostToolUse deletes every claim whose id its output shows instead.
//    Claims expire after 10 minutes, at most 50 are kept, and a promoted claim is removed, so an old id that is
//    echoed later is never promoted again.
// 3. Codex sets no session variable for shell children (fix round 1 evidence), so for it (and for any chat's
//    deliberate role change) a STRICT command-text learner remains: one plain `node .../bg-mail.mjs post|register ...` (or `bg-mail post|register ...`) with no
//    pipes, chaining, redirection, substitution, heredocs or comments, that succeeded and printed its own
//    confirmation line for the same project and role. It is skipped inside subagents.
// Received mail never changes identity: only a chat's own successful post/register command and its own output can.
//
// Per hook session id we store ~/.local/state/bgzflow/sessions/<key>.json, where <key> is a readable sanitised
// prefix plus the sha256 of the full original id (collision resistant, traversal safe):
//   { sessionId, project, role, learnedAt, source, pendingClaims, notifiedMidTurnIds, deliveredIds, peerWake }
// A stored record is used only when its sessionId equals the requested id exactly.
// Every function here fails open: a broken or missing file never blocks a hook or a post.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const NAME_RE = /^[A-Za-z0-9._-]+$/;
const CLAIM_ID_RE = /^[A-Za-z0-9._:-]{8,200}$/;
const MAX_SESSION_ID_LENGTH = 4096;
export const PENDING_CLAIM_TTL_MS = 10 * 60 * 1000;
export const MAX_PENDING_CLAIMS = 50;

// Host env vars that carry the chat's own hook session id into shell children, in order.
// Codex 0.162.0: no such variable was found (fix round 1 evidence), so none is listed for it.
export const HOST_SESSION_ENV_VARS = ['CLAUDE_CODE_SESSION_ID'];

const validName = (value) => typeof value === 'string' && NAME_RE.test(value) && value !== '.' && value !== '..';
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function resolveSessionsDir(env = process.env) {
  if (env.BGZFLOW_SESSIONS_DIR && String(env.BGZFLOW_SESSIONS_DIR).trim()) {
    return path.resolve(String(env.BGZFLOW_SESSIONS_DIR).trim());
  }
  return path.join(env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'bgzflow', 'sessions');
}

function normaliseSessionId(sessionId) {
  const raw = String(sessionId ?? '').trim();
  if (!raw || raw.length > MAX_SESSION_ID_LENGTH) return '';
  return raw;
}

// File key for a session id: readable prefix + sha256 of the full id. Distinct ids never share a key.
export function sessionKey(sessionId) {
  const raw = normaliseSessionId(sessionId);
  if (!raw) return '';
  const prefix = raw.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  const digest = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  return `${prefix}-${digest}`;
}

// Kept for callers of the first .3 build; now the collision-resistant key.
export const safeSessionId = sessionKey;

// Returns the original (trimmed) session id from hook input, or ''.
export function sessionIdFromInput(input = {}) {
  return normaliseSessionId(input?.session_id ?? input?.sessionId ?? '');
}

export function sessionFile(sessionId, env = process.env) {
  const key = sessionKey(sessionId);
  return key ? path.join(resolveSessionsDir(env), `${key}.json`) : '';
}

export function readSessionState(sessionId, env = process.env) {
  const id = normaliseSessionId(sessionId);
  const file = sessionFile(id, env);
  if (!file) return {};
  try {
    if (!fs.existsSync(file)) return {};
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!isObject(data)) return {};
    // A record that belongs to another session id is treated as unknown.
    if (data.sessionId !== id) return {};
    return data;
  } catch {
    return {};
  }
}

// Returns true only when the new state was written and renamed into place.
export function updateSessionState(sessionId, patch = {}, env = process.env) {
  const id = normaliseSessionId(sessionId);
  const file = sessionFile(id, env);
  if (!file) return false;
  try {
    const current = readSessionState(id, env);
    const next = { ...current, ...patch, sessionId: id, updatedAt: new Date().toISOString() };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

export function sessionIdentity(input = {}, env = process.env) {
  const id = sessionIdFromInput(input);
  if (!id) return { project: '', role: '' };
  const s = readSessionState(id, env);
  return {
    project: validName(s.project) ? s.project : '',
    role: validName(s.role) ? s.role : '',
  };
}

export function hostSessionId(env = process.env) {
  for (const name of HOST_SESSION_ENV_VARS) {
    const id = normaliseSessionId(env?.[name]);
    if (id) return id;
  }
  return '';
}

// Fresh, well-formed claims only; newest MAX_PENDING_CLAIMS kept.
function freshClaims(raw, now = Date.now()) {
  if (!isObject(raw)) return {};
  const kept = Object.entries(raw).filter(([claimId, c]) => {
    if (!CLAIM_ID_RE.test(claimId) || !isObject(c) || !validName(c.project) || !validName(c.role)) return false;
    const at = Date.parse(c.at || '');
    return Number.isFinite(at) && now - at >= -60_000 && now - at <= PENDING_CLAIM_TTL_MS;
  });
  kept.sort((a, b) => Date.parse(b[1].at) - Date.parse(a[1].at));
  return Object.fromEntries(kept.slice(0, MAX_PENDING_CLAIMS));
}

// Called by bg-mail after a successful post (claimId = message id) or by `bg-mail register` (claimId = nonce).
// Writes only a pending claim; it never sets the identity. Never throws. Returns { sessionId, claimId } or null.
export function recordPendingClaim({ claimId, project, role, source = 'bg-mail' } = {}, env = process.env) {
  try {
    if (!CLAIM_ID_RE.test(String(claimId || '')) || !validName(project) || !validName(role)) return null;
    const sessionId = hostSessionId(env);
    if (!sessionId) return null;
    const now = Date.now();
    const state = readSessionState(sessionId, env);
    const pendingClaims = freshClaims(
      { ...freshClaims(state.pendingClaims, now), [claimId]: { project, role, at: new Date(now).toISOString(), source: String(source).slice(0, 40) } },
      now,
    );
    if (!pendingClaims[claimId]) return null;
    return updateSessionState(sessionId, { pendingClaims }, env) ? { sessionId, claimId } : null;
  } catch {
    return null;
  }
}

// Kept for the first .3 build's callers: now records a pending claim for the posted message only.
export function registerPostIdentity({ project, from, id } = {}, env = process.env) {
  return recordPendingClaim({ claimId: id, project, role: from, source: 'bg-mail-post' }, env);
}

// ---- PostToolUse learner ---------------------------------------------------------------

function toolResponse(input) {
  return input?.tool_response ?? input?.toolResponse ?? input?.tool_output ?? input?.toolOutput ?? input?.output;
}

function textOf(value, depth = 0) {
  if (value == null || depth > 3) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map((v) => textOf(v, depth + 1)).join('\n');
  if (isObject(value)) {
    return ['stdout', 'stderr', 'output', 'text', 'content', 'result', 'aggregated_output', 'formatted_output']
      .map((k) => textOf(value[k], depth + 1))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

export function toolOutputText(input = {}) {
  return textOf(toolResponse(input));
}

// The tool call ran and exited 0 (as far as the host tells us). Unknown shapes count as success only when
// nothing marks them as failed; the confirmation-line check then still has to pass.
export function toolSucceeded(input = {}) {
  const r = toolResponse(input);
  if (r == null) return false;
  if (isObject(r)) {
    if (r.is_error === true || r.isError === true || r.interrupted === true || r.success === false) return false;
    if (r.error) return false;
    for (const k of ['exit_code', 'exitCode', 'returnCode', 'return_code', 'code']) {
      if (r[k] !== undefined && r[k] !== null && Number(r[k]) !== 0) return false;
    }
  }
  const text = textOf(r);
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith('{')) continue; // message bodies live in JSON lines; never read them as status
    if (/exit code:?\s*[1-9]\d*/i.test(line)) return false;
  }
  return true;
}

function agentIdOf(input) {
  const v = input?.agent_id ?? input?.agentId;
  return typeof v === 'string' ? v.trim() : v ? String(v) : '';
}

// Quote-aware split of one plain command. Returns null for anything that is not one simple command:
// pipes, chaining, redirection, background, substitution, heredocs, newlines or comments.
export function plainCommandTokens(command) {
  const src = String(command ?? '').trim();
  if (!src || src.length > 8000) return null;
  const tokens = [];
  let cur = '';
  let started = false;
  let quote = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote === "'") {
      if (ch === "'") quote = '';
      else cur += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = '';
      else if (ch === '`' || (ch === '$' && src[i + 1] === '(')) return null;
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
      continue;
    }
    if (/[|;&<>`\r\n]/.test(ch) || (ch === '$' && src[i + 1] === '(')) return null;
    if (/\s/.test(ch)) {
      if (started) tokens.push(cur);
      cur = '';
      started = false;
      continue;
    }
    if (ch === '#' && !started) return null; // a comment, or a token starting with #
    cur += ch;
    started = true;
  }
  if (quote) return null;
  if (started) tokens.push(cur);
  return tokens.length ? tokens : null;
}

function commandScript(input) {
  const raw = input?.tool_input?.command ?? input?.tool_input?.cmd ?? input?.toolInput?.command;
  if (Array.isArray(raw)) {
    const parts = raw.map((p) => String(p));
    const shell = path.basename(parts[0] || '').toLowerCase().replace(/\.exe$/, '');
    if (parts.length === 3 && ['bash', 'sh', 'zsh', 'pwsh', 'powershell', 'cmd'].includes(shell)
      && ['-c', '-lc', '-command', '/c'].includes(parts[1].toLowerCase())) return parts[2];
    return null; // argv arrays other than [shell, -c, script] are not parsed
  }
  return typeof raw === 'string' ? raw : null;
}

const base = (p) => String(p || '').split(/[\\/]/).pop().toLowerCase();

// Parses one plain bg-mail post/register command. Returns { sub, project, role } or null.
export function parsePlainBgMailCommand(command) {
  const tokens = plainCommandTokens(command);
  if (!tokens) return null;
  let i;
  if (['node', 'node.exe'].includes(base(tokens[0])) && base(tokens[1]) === 'bg-mail.mjs') i = 2;
  else if (['bg-mail', 'bg-mail.cmd', 'bg-mail.ps1'].includes(base(tokens[0]))) i = 1;
  else return null;
  const sub = tokens[i];
  if (sub !== 'post' && sub !== 'register') return null;
  return mailFlags(tokens, i + 1, sub);
}

// Reads --project and --from (post) / --role (register) after the subcommand. null on conflicts or bad names.
function mailFlags(tokens, start, sub) {
  const flags = {};
  for (let j = start; j < tokens.length; j++) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(tokens[j]);
    if (!m) continue;
    const name = m[1];
    if (!['project', 'from', 'role'].includes(name)) continue;
    const value = m[2] !== undefined ? m[2] : tokens[++j];
    if (value === undefined) return null;
    if (flags[name] !== undefined && flags[name] !== value) return null;
    flags[name] = value;
  }
  const project = flags.project;
  const role = sub === 'post' ? flags.from : flags.role;
  if (!validName(project) || !validName(role)) return null;
  return { sub, project, role };
}

// Quote-aware split of a shell script into simple commands (token lists). | || & && ; and newlines end a
// command; redirections ([n]>file, >>file, 2>&1, &>file, <file) are dropped; # comments are skipped.
// Returns null for command substitution, backticks, heredocs or unbalanced quotes (nothing is learned then).
export function shellSegments(script) {
  const src = String(script ?? '');
  if (!src.trim() || src.length > 8000) return null;
  const segments = [];
  let tokens = [];
  let cur = '';
  let started = false;
  let quote = '';
  let skipNext = false;
  const endToken = () => {
    if (started) {
      if (skipNext) skipNext = false;
      else tokens.push(cur);
    }
    cur = '';
    started = false;
  };
  const endSegment = () => {
    endToken();
    skipNext = false;
    if (tokens.length) segments.push(tokens);
    tokens = [];
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote === "'") {
      if (ch === "'") quote = '';
      else cur += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = '';
      else if (ch === '`' || (ch === '$' && src[i + 1] === '(')) return null;
      else if (ch === '\\' && /[$`"\\\n]/.test(src[i + 1] || '')) cur += src[++i];
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
      continue;
    }
    if (ch === '`' || (ch === '$' && src[i + 1] === '(')) return null;
    if (ch === '>' || ch === '<' || (ch === '&' && src[i + 1] === '>')) {
      if (ch === '<' && src[i + 1] === '<') return null; // heredoc
      if (started && /^\d+$/.test(cur)) {
        cur = '';
        started = false;
      } else {
        endToken();
      }
      let j = i + 1;
      if (ch === '&') j++; // &>
      if (src[j] === '>') j++; // >>
      if (src[j] === '&') { // 2>&1, >&-
        j++;
        while (/[\d-]/.test(src[j] || '')) j++;
      } else {
        skipNext = true; // the redirection target is the next word
      }
      i = j - 1;
      continue;
    }
    if (/[|;&\r\n]/.test(ch)) {
      endSegment();
      continue;
    }
    if (/\s/.test(ch)) {
      endToken();
      continue;
    }
    if (ch === '#' && !started) {
      while (i + 1 < src.length && src[i + 1] !== '\n') i++;
      continue;
    }
    cur += ch;
    started = true;
  }
  if (quote) return null;
  endSegment();
  return segments;
}

// Every bg-mail post/register that this tool call's own command runs: `bg-mail post|register ...` or
// `node <script> post|register ...` (the company launcher and similar wrappers pass the same arguments on).
// Leading VAR=value assignments are allowed. Returns [{ sub, project, role }] (empty when there is none).
export function ownMailInvocations(command) {
  const segments = typeof command === 'string' ? shellSegments(command) : null;
  if (!segments) return [];
  const found = [];
  for (const seg of segments) {
    let t = seg;
    while (t.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0])) t = t.slice(1);
    let i;
    if (['node', 'node.exe'].includes(base(t[0])) && t[1] && !t[1].startsWith('-')) i = 2;
    else if (['bg-mail', 'bg-mail.cmd', 'bg-mail.ps1', 'bg-mail.mjs'].includes(base(t[0]))) i = 1;
    else continue;
    const sub = t[i];
    if (sub !== 'post' && sub !== 'register') continue;
    const parsed = mailFlags(t, i + 1, sub);
    if (parsed) found.push(parsed);
  }
  return found;
}

function confirmationSeen(output, { sub, project, role }) {
  for (const line of String(output || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    try {
      const j = JSON.parse(t);
      if (!isObject(j) || j.project !== project) continue;
      if (sub === 'post' && j.from === role && typeof j.id === 'string' && j.id) return true;
      if (sub === 'register' && j.ok === true && j.command === 'register' && j.role === role) return true;
    } catch {
      // not a confirmation line
    }
  }
  return false;
}

function jsonLines(output) {
  const out = [];
  for (const line of String(output || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    try {
      const j = JSON.parse(t);
      if (isObject(j)) out.push(j);
    } catch {
      // not a JSON line
    }
  }
  return out;
}

const isRegisterClaim = (claimId, claim) => /register/.test(String(claim?.source || '')) || claimId.startsWith('reg-');

// The claim's own confirmation line, printed by the same command that made it: register's ok line, or the
// open message a post prints. A get/list/collect showing the same message is excluded by the command check.
function claimConfirmed(output, claimId, claim) {
  const register = isRegisterClaim(claimId, claim);
  return jsonLines(output).some((j) => j.project === claim.project && (register
    ? (j.claimId === claimId && j.ok === true && j.command === 'register' && j.role === claim.role)
    : (j.id === claimId && j.from === claim.role && j.state === 'open' && !j.ack && !j.reply && !j.acted)
  ));
}

// This tool call's own command is the post/register that made the claim (same kind, project and role).
function claimMadeByThisCommand(invocations, claimId, claim) {
  const sub = isRegisterClaim(claimId, claim) ? 'register' : 'post';
  return invocations.some((c) => c.sub === sub && c.project === claim.project && c.role === claim.role);
}

// PostToolUse: promote a pending claim (main thread only), else the strict Codex fallback. Never throws.
// Returns { sessionId, project, role, source } when the identity was set, else null.
export function learnSessionIdentity(input = {}, env = process.env) {
  try {
    const sessionId = sessionIdFromInput(input);
    if (!sessionId) return null;
    const now = Date.now();
    const output = toolOutputText(input);
    const state = readSessionState(sessionId, env);
    const stored = isObject(state.pendingClaims) ? state.pendingClaims : {};
    const pending = freshClaims(stored, now);
    const hits = output ? Object.keys(pending).filter((claimId) => output.includes(claimId)) : [];
    const remaining = Object.fromEntries(Object.entries(pending).filter(([claimId]) => !hits.includes(claimId)));
    const pruned = Object.keys(remaining).length !== Object.keys(stored).length;

    if (agentIdOf(input)) {
      // A subagent's own post: its claim must never name the parent chat.
      if (pruned) updateSessionState(sessionId, { pendingClaims: remaining }, env);
      return null;
    }

    // Promote only when this tool call's own command is the post/register that made the claim and printed its
    // confirmation line. Received mail (get/list/collect) never confirms a claim. A claim from a process that
    // merely inherited this session id (a worker started from this chat's shell) never overwrites an already
    // confirmed identity; a deliberate role change goes through the strict plain-command path below.
    const command = commandScript(input);
    const invocations = ownMailInvocations(command);
    const known = validName(state.project) && validName(state.role) ? { project: state.project, role: state.role } : null;
    const confirmed = toolSucceeded(input) && invocations.length
      ? hits.filter((claimId) => {
        const c = pending[claimId];
        if (known && (c.project !== known.project || c.role !== known.role)) return false;
        return claimMadeByThisCommand(invocations, claimId, c) && claimConfirmed(output, claimId, c);
      })
      : [];
    if (confirmed.length) {
      const claimId = confirmed.sort((a, b) => Date.parse(pending[b].at) - Date.parse(pending[a].at))[0];
      const c = pending[claimId];
      const identity = { project: c.project, role: c.role, learnedAt: new Date(now).toISOString(), source: `pending-claim:${c.source || 'bg-mail'}` };
      return updateSessionState(sessionId, { ...identity, pendingClaims: remaining }, env)
        ? { sessionId, project: c.project, role: c.role, source: identity.source }
        : null;
    }
    if (pruned) updateSessionState(sessionId, { pendingClaims: remaining }, env);

    // Strict fallback (Codex has no session variable for shell children).
    const parsed = parsePlainBgMailCommand(command);
    if (!parsed || !toolSucceeded(input) || !confirmationSeen(output, parsed)) return null;
    const source = `command:${parsed.sub}`;
    return updateSessionState(sessionId, { project: parsed.project, role: parsed.role, learnedAt: new Date(now).toISOString(), source }, env)
      ? { sessionId, project: parsed.project, role: parsed.role, source }
      : null;
  } catch {
    return null;
  }
}
