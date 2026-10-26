#!/usr/bin/env node
// BGZFLOW First-Party Relay, Dynamic Quota Radar, Lifecycle Wrapper & Auto-Baton-Pass
// Model-independent: dynamically routes to whichever installed agent has live capacity and no active rate-limit cooldown.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();
const BGZ_RELAY_DIR = process.env.BGZ_RELAY_DIR || path.join(HOME, '.bgzflow', 'relay');
const SNAPSHOTS_DIR = path.join(BGZ_RELAY_DIR, 'snapshots');
const EVENTS_DIR = path.join(BGZ_RELAY_DIR, 'events');
const LOCKS_DIR = path.join(BGZ_RELAY_DIR, 'locks');
const STATE_PATH = path.join(BGZ_RELAY_DIR, 'agent-health.json');
const CONFIG_PATH = path.join(BGZ_RELAY_DIR, 'config.json');
const BG_MAIL = process.env.BGZ_RELAY_BG_MAIL ?? path.join(HOME, '.codex', 'BGZFLOW', 'tools', 'bg-mail.mjs');

const RATE_LIMIT_PATTERNS = [
  /RateLimitError/i,
  /rate_limit_error/i,
  /anthropic-ratelimit/i,
  /rate_limit_exceeded/i,
  /x-ratelimit/i,
  /RESOURCE_EXHAUSTED/i,
  /quota exceeded/i,
  /HTTP 429\b/i,
  /429 Too Many Requests/i,
  /usage limit reached/i,
];

const KNOWN_WIN_BINS = {
  grok: path.join(HOME, '.grok', 'bin', 'grok.exe'),
  agy: path.join(HOME, 'AppData', 'Local', 'agy', 'bin', 'agy.exe'),
  antigravity: path.join(HOME, 'AppData', 'Local', 'agy', 'bin', 'agy.exe'),
  codex: path.join(HOME, 'AppData', 'Roaming', 'npm', 'codex.cmd'),
  claude: path.join(HOME, '.local', 'bin', 'claude.exe'),
  kimi: path.join(HOME, '.local', 'bin', 'kimi.exe'),
  opencode: path.join(HOME, 'AppData', 'Roaming', 'npm', 'opencode.cmd'),
};

function resolveWindowsBinary(command) {
  const winExts = ['.exe', '.com', '.cmd', '.bat'];
  const extRank = (p) => {
    const idx = winExts.indexOf(path.extname(p).toLowerCase());
    return idx >= 0 ? idx : 99;
  };
  const expandCandidate = (p) => {
    const out = [];
    if (path.extname(p) === '') {
      for (const ext of winExts) {
        if (fs.existsSync(p + ext)) out.push(p + ext);
      }
    }
    if (fs.existsSync(p)) out.push(p);
    return out;
  };

  if (command.includes('/') || command.includes('\\') || path.isAbsolute(command)) {
    const found = expandCandidate(command).sort((a, b) => extRank(a) - extRank(b));
    if (found.length) return found[0];
    return command;
  }

  const whereRes = spawnSync('where.exe', [command], { encoding: 'utf8' });
  if (whereRes.status === 0 && whereRes.stdout) {
    const candidates = [];
    for (const raw of whereRes.stdout.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      for (const c of expandCandidate(line)) {
        if (!candidates.includes(c)) candidates.push(c);
      }
    }
    candidates.sort((a, b) => extRank(a) - extRank(b));
    if (candidates.length) return candidates[0];
  }

  const fallback = KNOWN_WIN_BINS[command.toLowerCase()];
  if (fallback && fs.existsSync(fallback)) return fallback;
  return command;
}

function quoteWinArg(arg) {
  const s = String(arg);
  if (s.length > 0 && !/[\s"&|<>()^%]/.test(s)) return s;
  return '"' + s.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1') + '"';
}

function buildSpawnSpec(childArgv) {
  const [rawCmd, ...rawArgs] = childArgv;
  if (process.platform !== 'win32') {
    return { command: rawCmd, args: rawArgs, options: { stdio: ['inherit', 'pipe', 'pipe'], shell: false } };
  }
  const resolved = resolveWindowsBinary(rawCmd);
  const ext = path.extname(resolved).toLowerCase();
  if (ext === '.cmd' || ext === '.bat') {
    try {
      const content = fs.readFileSync(resolved, 'utf8');
      const dp0 = path.dirname(resolved);
      const nodeMatch = content.match(/["']%_prog%["']\s+["']%dp0%\\([^"']+)["']\s+%\*/i);
      if (nodeMatch) {
        const localNode = path.join(dp0, 'node.exe');
        const nodeBin = fs.existsSync(localNode) ? localNode : process.execPath;
        const scriptPath = path.resolve(dp0, nodeMatch[1]);
        if (fs.existsSync(scriptPath)) {
          return {
            command: nodeBin,
            args: [scriptPath, ...rawArgs],
            options: { stdio: ['inherit', 'pipe', 'pipe'], shell: false },
          };
        }
      }
      const exeMatch = content.match(/["']%dp0%\\([^"']+\.exe)["']\s+%\*/i);
      if (exeMatch) {
        const exePath = path.resolve(dp0, exeMatch[1]);
        if (fs.existsSync(exePath)) {
          return {
            command: exePath,
            args: rawArgs,
            options: { stdio: ['inherit', 'pipe', 'pipe'], shell: false },
          };
        }
      }
    } catch {}
    const comspec = process.env.COMSPEC || 'cmd.exe';
    const cmdLine = `"${[resolved, ...rawArgs].map(quoteWinArg).join(' ')}"`;
    return {
      command: comspec,
      args: ['/d', '/s', '/c', cmdLine],
      options: { stdio: ['inherit', 'pipe', 'pipe'], shell: false, windowsVerbatimArguments: true },
    };
  }
  return {
    command: resolved,
    args: rawArgs,
    options: { stdio: ['inherit', 'pipe', 'pipe'], shell: false },
  };
}

function ensureDirs() {
  for (const d of [BGZ_RELAY_DIR, SNAPSHOTS_DIR, EVENTS_DIR, LOCKS_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
  const defaultCfg = {
    schema: 2,
    system: 'BGZFLOW Relay',
    routingMode: 'dynamic-live-capacity',
    cooldownMinutesOnRateLimit: 30,
    debounceSeconds: 60,
    updatedAt: new Date().toISOString(),
  };
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultCfg, null, 2) + '\n', 'utf8');
  } else {
    try {
      const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8').replace(/^\uFEFF/, ''));
      if (existing.routingMode !== 'dynamic-live-capacity') {
        fs.writeFileSync(
          CONFIG_PATH,
          JSON.stringify({ ...defaultCfg, ...existing, routingMode: 'dynamic-live-capacity' }, null, 2) + '\n',
          'utf8'
        );
      }
    } catch {}
  }
}

function loadConfig() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8').replace(/^\uFEFF/, ''));
}

function loadHealthState() {
  ensureDirs();
  if (!fs.existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return {};
  }
}

function saveHealthState(state) {
  ensureDirs();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function markAgentRateLimited(agentId, reason) {
  const cfg = loadConfig();
  const state = loadHealthState();
  const cooldownMs = (cfg.cooldownMinutesOnRateLimit || 30) * 60 * 1000;
  state[agentId] = {
    status: 'rate_limited',
    lastRateLimitedAt: new Date().toISOString(),
    cooldownUntil: new Date(Date.now() + cooldownMs).toISOString(),
    reason,
  };
  saveHealthState(state);
}

function detectAgents() {
  const health = loadHealthState();
  const now = Date.now();
  const candidates = [
    { id: 'grok', bin: 'grok' },
    { id: 'antigravity', bin: path.join(HOME, 'AppData', 'Local', 'agy', 'bin', 'agy.exe') },
    { id: 'codex', bin: path.join(HOME, 'AppData', 'Roaming', 'npm', 'codex.cmd') },
    { id: 'claude', bin: path.join(HOME, '.local', 'bin', 'claude.exe') },
    { id: 'kimi', bin: path.join(HOME, '.local', 'bin', 'kimi.exe') },
    { id: 'opencode', bin: path.join(HOME, 'AppData', 'Roaming', 'npm', 'opencode.cmd') },
  ];
  return candidates.map((c) => {
    const installed = path.isAbsolute(c.bin)
      ? fs.existsSync(c.bin)
      : spawnSync('where.exe', [c.bin], { encoding: 'utf8' }).status === 0;
    const h = health[c.id];
    const coolingDown = h?.cooldownUntil && Date.parse(h.cooldownUntil) > now;
    return {
      id: c.id,
      installed,
      ready: installed && !coolingDown,
      status: !installed ? 'not_installed' : coolingDown ? 'cooling_down' : 'ready',
      cooldownUntil: coolingDown ? h.cooldownUntil : null,
      remainingPercent: typeof h?.remainingPercent === 'number' ? h.remainingPercent : null,
    };
  });
}

function selectNextAvailableAgent(excludeAgentId) {
  const agents = detectAgents().filter((a) => a.installed && a.id !== excludeAgentId);
  const ready = agents.filter((a) => a.ready);
  const pool = ready.length > 0 ? ready : agents;
  pool.sort((a, b) => (b.remainingPercent ?? 50) - (a.remainingPercent ?? 50));
  return pool[0]?.id || 'auto-available';
}

function checkQuotaRadar() {
  const agents = detectAgents();
  const cfg = loadConfig();
  return {
    at: new Date().toISOString(),
    system: 'BGZFLOW Quota & Relay Radar (Model-Independent)',
    routingMode: cfg.routingMode,
    nextRecommended: selectNextAvailableAgent(null),
    agents,
    snapshotsCount: fs.existsSync(SNAPSHOTS_DIR) ? fs.readdirSync(SNAPSHOTS_DIR).length : 0,
  };
}

function recordEvent(sessionId, event) {
  ensureDirs();
  const safeId = String(sessionId || 'default').replace(/[^A-Za-z0-9_-]/g, '_');
  const line = JSON.stringify({ ts: new Date().toISOString(), session: safeId, ...event }) + '\n';
  fs.appendFileSync(path.join(EVENTS_DIR, `${safeId}.jsonl`), line, 'utf8');
}

function createHandoffSnapshot({ project, fromRole, currentAgent, reason, contextSummary }) {
  ensureDirs();
  markAgentRateLimited(currentAgent, reason);
  const nextAgent = selectNextAvailableAgent(currentAgent);
  const snapId = `bgz-snap-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const snapPath = path.join(SNAPSHOTS_DIR, `${snapId}.json`);
  const payload = {
    schema: 2,
    snapshotId: snapId,
    createdAt: new Date().toISOString(),
    project,
    fromRole,
    fromAgent: currentAgent,
    nextAgent,
    routingMode: 'dynamic-live-capacity',
    reason,
    contextSummary,
  };
  fs.writeFileSync(snapPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  recordEvent(project, {
    type: 'rate_limited_handoff',
    snapshotId: snapId,
    fromAgent: currentAgent,
    nextAgent,
    reason,
  });
  if (BG_MAIL && fs.existsSync(BG_MAIL) && project && fromRole) {
    const body = `Agent message from ${fromRole} (BGZFLOW Relay): Rate-limit/quota signal on ${currentAgent} (${reason}). Snapshot saved at ${snapPath}. Dynamically selected next ready builder with live capacity: ${nextAgent}.`;
    spawnSync(
      process.execPath,
      [BG_MAIL, 'post', '--project', project, '--from', fromRole, '--to', 'lead', '--body', body],
      { encoding: 'utf8' }
    );
  }
  return payload;
}

const [, , cmd, ...args] = process.argv;

if (cmd === 'status' || cmd === 'quota' || !cmd) {
  console.log(JSON.stringify(checkQuotaRadar(), null, 2));
} else if (cmd === 'set-quota') {
  const [agentId, pctStr] = args;
  const state = loadHealthState();
  state[agentId] = { ...(state[agentId] || {}), remainingPercent: Number(pctStr), updatedAt: new Date().toISOString() };
  saveHealthState(state);
  console.log(JSON.stringify(checkQuotaRadar(), null, 2));
} else if (cmd === 'handoff') {
  const [project = 'lucian', fromRole = 'builder-1', currentAgent = 'grok', ...rest] = args;
  const result = createHandoffSnapshot({
    project,
    fromRole,
    currentAgent,
    reason: rest.join(' ') || 'rate_limited',
    contextSummary: 'Automatic BGZFLOW Relay snapshot',
  });
  console.log(JSON.stringify(result, null, 2));
} else if (cmd === 'wrap') {
  const sep = args.indexOf('--');
  const meta = sep >= 0 ? args.slice(0, sep) : [];
  const childArgv = sep >= 0 ? args.slice(sep + 1) : args;
  const [project = 'lucian', fromRole = 'builder-1', currentAgent = 'auto'] = meta;
  if (!childArgv.length) {
    console.error('Usage: bgz-relay wrap <project> <role> <agent> -- <command...>');
    process.exit(1);
  }
  recordEvent(project, { type: 'session_start', role: fromRole, agent: currentAgent, cmd: childArgv });
  const spec = buildSpawnSpec(childArgv);
  const child = spawn(spec.command, spec.args, spec.options);
  let handedOff = false;
  const inspectChunk = (chunk, stream) => {
    stream.write(chunk);
    const text = chunk.toString('utf8');
    if (!handedOff && RATE_LIMIT_PATTERNS.some((rx) => rx.test(text))) {
      handedOff = true;
      createHandoffSnapshot({
        project,
        fromRole,
        currentAgent,
        reason: 'rate_limited signal detected in live output',
        contextSummary: text.slice(-500),
      });
    }
  };
  child.stdout.on('data', (c) => inspectChunk(c, process.stdout));
  child.stderr.on('data', (c) => inspectChunk(c, process.stderr));
  child.on('error', (err) => {
    console.error(`bgz-relay wrap error: ${err.message}`);
    recordEvent(project, { type: 'session_stop', role: fromRole, agent: currentAgent, exitCode: 1, error: err.message });
    process.exit(1);
  });
  child.on('close', (code) => {
    recordEvent(project, { type: 'session_stop', role: fromRole, agent: currentAgent, exitCode: code });
    process.exit(code ?? 0);
  });
} else {
  console.log('BGZFLOW Relay commands: status | quota | set-quota <agent> <pct> | handoff <project> <role> <agent> [reason] | wrap <project> <role> <agent> -- <command...>');
}
