// Tests for hooks H1 to H4 (context, read guard, checkpoint cap), the shared fail-open behaviour, the word
// budget and hooks.json. H5 (snapshot) and the credential-shape detector have their own files.
// Each test feeds the host's documented JSON on stdin to the real hook script.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { ROOT, TEST_TIMEOUT_MS, cleanEnv, fake, kb, makeProject, readLog, removeDir, runHook, words, write } from './helpers.mjs';
import { bigReadViolation } from '../lib/big-read.mjs';

const projects = [];
const project = (prefix) => {
  const dir = makeProject(prefix);
  projects.push(dir);
  return dir;
};
after(() => projects.forEach(removeDir));

const pad = (n) => String(n).padStart(2, '0');

describe('H4 clock (SessionStart, UserPromptSubmit)', () => {
  for (const event of ['SessionStart', 'UserPromptSubmit']) {
    test(`${event}: one context line with the real local date, time and timezone`, () => {
      const dir = project('h4');
      const before = new Date();
      const r = runHook('h4-clock.mjs', { hook_event_name: event, session_id: 's1', cwd: dir }, { project: dir });
      const after = new Date();
      assert.equal(r.status, 0);
      assert.equal(r.json.hookSpecificOutput.hookEventName, event);
      const text = r.json.hookSpecificOutput.additionalContext;
      const m = text.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) \(([^,]+), UTC([+-]\d{2}):(\d{2})\)/);
      assert.ok(m, `clock line not recognised: ${text}`);
      const stamp = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
      // the hook ran between `before` and `after`; allow one minute of rounding down plus the spawn time
      assert.ok(stamp.getTime() >= before.getTime() - 61000 && stamp.getTime() <= after.getTime() + 1000, `clock ${stamp} is not now ${before}`);
      const offsetMin = -before.getTimezoneOffset();
      const sign = offsetMin < 0 ? '-' : '+';
      assert.equal(`${m[7]}:${m[8]}`, `${sign}${pad(Math.floor(Math.abs(offsetMin) / 60))}:${pad(Math.abs(offsetMin) % 60)}`);
      assert.equal(m[6], Intl.DateTimeFormat().resolvedOptions().timeZone);
      assert.ok(words(text) <= 25, `clock line is ${words(text)} words`);
    });
  }

  test('Grok payload (camelCase plus the Claude-style event name) is understood', () => {
    const dir = project('h4');
    const r = runHook('h4-clock.mjs', { hookEventName: 'session_start', hook_event_name: 'SessionStart', sessionId: 'g1', cwd: dir, workspaceRoot: dir });
    assert.equal(r.status, 0);
    assert.equal(r.json.hookSpecificOutput.hookEventName, 'SessionStart');
  });

  test('a missing event name still yields a valid UserPromptSubmit context object', () => {
    const r = runHook('h4-clock.mjs', {});
    assert.equal(r.status, 0);
    assert.equal(r.json.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
    assert.match(r.json.hookSpecificOutput.additionalContext, /^Real clock: /);
  });
});

describe('H3 chat size (UserPromptSubmit)', () => {
  test('a transcript over BGZFLOW_CHAT_MB adds the handoff line', () => {
    const dir = project('h3');
    const transcript = write(dir, 'chat.jsonl', kb(2 * 1024));
    const r = runHook('h3-chat-size.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: transcript }, { project: dir, env: { BGZFLOW_CHAT_MB: '1' } });
    assert.equal(r.status, 0);
    assert.equal(r.json.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
    assert.equal(
      r.json.hookSpecificOutput.additionalContext,
      'This chat is 2.0 MB. Write a handoff of 2 KB or less (templates/HANDOFF.md) and continue in a fresh chat.',
    );
    assert.match(readLog(dir), / H3 /);
  });

  test('a transcript within the cap adds nothing', () => {
    const dir = project('h3');
    const transcript = write(dir, 'chat.jsonl', kb(512));
    const r = runHook('h3-chat-size.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: transcript }, { project: dir, env: { BGZFLOW_CHAT_MB: '1' } });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  });

  test('the default cap is 15 MB', () => {
    const dir = project('h3');
    const transcript = write(dir, 'chat.jsonl', kb(14 * 1024));
    assert.equal(runHook('h3-chat-size.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: transcript }, { project: dir }).stdout, '');
    fs.appendFileSync(transcript, kb(2 * 1024));
    assert.match(runHook('h3-chat-size.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: transcript }, { project: dir }).json.hookSpecificOutput.additionalContext, /^This chat is 16\.0 MB\./);
  });

  test('missing, null or unreadable transcript paths add nothing and do not fail', () => {
    const dir = project('h3');
    for (const transcript_path of [undefined, null, '', path.join(dir, 'nope.jsonl'), dir]) {
      const r = runHook('h3-chat-size.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path }, { project: dir, env: { BGZFLOW_CHAT_MB: '1' } });
      assert.equal(r.status, 0);
      assert.equal(r.stdout, '');
    }
  });

  test('config.json supplies the limit and the environment overrides it', () => {
    const dir = project('h3');
    write(dir, '.bgzflow/config.json', JSON.stringify({ BGZFLOW_CHAT_MB: 1 }));
    const transcript = write(dir, 'chat.jsonl', kb(1536));
    const input = { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: transcript };
    assert.match(runHook('h3-chat-size.mjs', input, { project: dir }).stdout, /This chat is 1\.5 MB/);
    assert.equal(runHook('h3-chat-size.mjs', input, { project: dir, env: { BGZFLOW_CHAT_MB: '5' } }).stdout, '');
  });

  test('a bad limit is ignored with a log line, and the default applies', () => {
    const dir = project('h3');
    const transcript = write(dir, 'chat.jsonl', kb(2 * 1024));
    const r = runHook('h3-chat-size.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: transcript }, { project: dir, env: { BGZFLOW_CHAT_MB: '0' } });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    const log = readLog(dir);
    assert.match(log, /BGZFLOW_CHAT_MB ignored \(need a number above 0\)/);
    assert.doesNotMatch(log, /BGZFLOW_CHAT_MB=/, 'the value must not be logged');
  });
});

describe('H2 map-first reading (PreToolUse, Read)', () => {
  const read = (dir, file, extra = {}, env = {}) =>
    runHook('h2-big-read-guard.mjs', { hook_event_name: 'PreToolUse', tool_name: 'Read', cwd: dir, tool_input: { file_path: file, ...extra } }, { project: dir, env });

  for (const ext of ['md', 'txt', 'log', 'json', 'jsonl', 'csv']) {
    test(`a whole read of a large .${ext} file is denied`, () => {
      const dir = project('h2');
      const file = write(dir, `notes/big.${ext}`, kb(100));
      const r = read(dir, file);
      assert.equal(r.status, 0);
      const out = r.json.hookSpecificOutput;
      assert.equal(out.hookEventName, 'PreToolUse');
      assert.equal(out.permissionDecision, 'deny');
      assert.match(out.permissionDecisionReason, /notes-map ask "<question>"/);
      assert.match(out.permissionDecisionReason, /line range with offset and limit/);
      assert.match(out.permissionDecisionReason, /100 KB, over the 64 KB/);
      assert.ok(words(out.permissionDecisionReason) <= 60, `${words(out.permissionDecisionReason)} words`);
      assert.match(readLog(dir), / H2 deny whole read of big\./);
    });
  }

  for (const ext of ['js', 'mjs', 'ts', 'py', 'rs', 'go', 'html', 'css', 'yaml']) {
    test(`a large .${ext} code file is not guarded`, () => {
      const dir = project('h2');
      const r = read(dir, write(dir, `src/big.${ext}`, kb(200)));
      assert.equal(r.status, 0);
      assert.equal(r.stdout, '');
    });
  }

  test('a notes file at or under the cap passes', () => {
    const dir = project('h2');
    assert.equal(read(dir, write(dir, 'small.md', kb(64))).stdout, '');
    assert.equal(read(dir, write(dir, 'tiny.md', kb(1))).stdout, '');
  });

  test('a bounded line range passes; an unbounded or huge limit does not', () => {
    const dir = project('h2');
    const file = write(dir, 'big.md', kb(100));
    assert.equal(read(dir, file, { offset: 120, limit: 80 }).stdout, '');
    assert.equal(read(dir, file, { limit: 50 }).stdout, '');
    assert.equal(read(dir, file, { offset: 10 }).json.hookSpecificOutput.permissionDecision, 'deny');
    assert.equal(read(dir, file, { offset: 0, limit: 500000 }).json.hookSpecificOutput.permissionDecision, 'deny');
  });

  test('BGZFLOW_BIG_READ_KB changes the cap', () => {
    const dir = project('h2');
    const file = write(dir, 'mid.md', kb(10));
    assert.equal(read(dir, file).stdout, '');
    assert.equal(read(dir, file, {}, { BGZFLOW_BIG_READ_KB: '4' }).json.hookSpecificOutput.permissionDecision, 'deny');
  });

  test('a missing file, a directory and a non-Read tool pass', () => {
    const dir = project('h2');
    assert.equal(read(dir, path.join(dir, 'missing.md')).stdout, '');
    assert.equal(read(dir, dir).stdout, '');
    const bash = runHook('h2-big-read-guard.mjs', { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: dir, tool_input: { command: 'cat big.md' } }, { project: dir });
    assert.equal(bash.stdout, '');
  });

  test('a relative path is resolved against cwd', () => {
    const dir = project('h2');
    write(dir, 'docs/big.md', kb(100));
    assert.equal(read(dir, 'docs/big.md').json.hookSpecificOutput.permissionDecision, 'deny');
  });

  test('Grok payload (camelCase, read_file, path) is understood', () => {
    const dir = project('h2');
    const file = write(dir, 'big.md', kb(100));
    const r = runHook('h2-big-read-guard.mjs', { hookEventName: 'pre_tool_use', hook_event_name: 'PreToolUse', toolName: 'read_file', toolInput: { path: file }, cwd: dir, workspaceRoot: dir }, { project: dir });
    assert.equal(r.json.hookSpecificOutput.permissionDecision, 'deny');
  });

  test('the advice says to build a map first when none exists, and drops that once one does', (t) => {
    const dir = project('h2');
    const file = write(dir, 'big.md', kb(100));
    // Isolate absence from a developer's real map in any ancestor of the scratch folder.
    const stat = fs.statSync;
    const mapless = t.mock.method(fs, 'statSync', (name, ...args) => {
      if (path.basename(String(name)) === '.notes-map') throw Object.assign(new Error('fixture map absent'), { code: 'ENOENT' });
      return stat.call(fs, name, ...args);
    });
    try {
      assert.match(bigReadViolation({ toolName: 'Read', toolInput: { file_path: file }, cwd: dir }, { bigReadKb: 64 }).reason, /No notes map yet: run notes-map build/);
    } finally { mapless.mock.restore(); }
    fs.mkdirSync(path.join(dir, '.notes-map'));
    const reason = read(dir, file).json.hookSpecificOutput.permissionDecisionReason;
    assert.doesNotMatch(reason, /No notes map yet/);
    assert.match(reason, /Run notes-map ask "<question>"/);
  });

  test('file types notes-map does not index are pointed to rg -n', () => {
    const dir = project('h2');
    const reason = read(dir, write(dir, 'run.log', kb(100))).json.hookSpecificOutput.permissionDecisionReason;
    assert.match(reason, /covers \.md and \.txt notes/);
    assert.match(reason, /rg -n/);
  });

  test('the runner path in the advice points to files that exist', () => {
    const dir = project('h2');
    const reason = read(dir, write(dir, 'big.md', kb(100))).json.hookSpecificOutput.permissionDecisionReason;
    // the plugin folder used by these tests has spaces in its path, so both paths must be quoted
    const shim = reason.match(/\("?([^"]+?)\/bin\/notes-map"?, or node "?([^"]+?notes-map\.mjs)"?\)/);
    assert.ok(shim, reason);
    assert.match(reason, /\("[^"]+\/bin\/notes-map", or node "[^"]+\/notes-map\.mjs"\)/, 'paths with spaces must be quoted');
    assert.ok(fs.existsSync(path.join(shim[1], 'bin', 'notes-map')));
    assert.ok(fs.existsSync(shim[2]));
  });
});

describe('H1 checkpoint cap (PostToolUse, Write|Edit|MultiEdit)', () => {
  const written = (dir, file, tool = 'Write', env = {}) =>
    runHook('h1-checkpoint-cap.mjs', { hook_event_name: 'PostToolUse', tool_name: tool, cwd: dir, tool_input: { file_path: file, content: 'x' }, tool_response: { filePath: file, type: 'update' } }, { project: dir, env });

  test('a CHECKPOINT.md over 8 KB is sent back with the one-page instruction', () => {
    const dir = project('h1');
    const r = written(dir, write(dir, 'CHECKPOINT.md', kb(9)));
    assert.equal(r.status, 0);
    assert.equal(r.json.decision, 'block');
    assert.match(r.json.reason, /CHECKPOINT\.md is 9\.0 KB, over its 8 KB cap/);
    assert.match(r.json.reason, /one page: CURRENT RULES, owners, state, next action/);
    assert.match(r.json.reason, /Move history to ARCHIVE\.md/);
    assert.ok(words(r.json.reason) <= 45, `${words(r.json.reason)} words`);
    assert.match(readLog(dir), / H1 block CHECKPOINT\.md 9\.0 KB over 8 KB/);
  });

  test('a checkpoint within the cap passes', () => {
    const dir = project('h1');
    assert.equal(written(dir, write(dir, 'CHECKPOINT.md', kb(8))).stdout, '');
  });

  test('any file name containing CHECKPOINT and ending .md is covered, case-insensitively', () => {
    const dir = project('h1');
    for (const name of ['PROJECT-CHECKPOINT.md', 'checkpoint-2026-09.md', 'CHECKPOINT_v2.md']) {
      assert.equal(written(dir, write(dir, name, kb(9))).json.decision, 'block', name);
    }
  });

  test('HANDOFF*.md has its own 2 KB cap', () => {
    const dir = project('h1');
    const big = written(dir, write(dir, 'HANDOFF-stage2-2026-09-29.md', kb(3)));
    assert.equal(big.json.decision, 'block');
    assert.match(big.json.reason, /HANDOFF-stage2-2026-09-29\.md is 3\.0 KB, over its 2 KB cap/);
    assert.equal(written(dir, write(dir, 'HANDOFF.md', kb(2))).stdout, '');
  });

  test('other files, ARCHIVE.md and non-markdown checkpoint names are not capped', () => {
    const dir = project('h1');
    for (const name of ['ARCHIVE.md', 'notes.md', 'DECISIONS.md', 'CHECKPOINT.txt', 'CHECKPOINT.json']) {
      assert.equal(written(dir, write(dir, name, kb(50))).stdout, '', name);
    }
  });

  test('Edit and MultiEdit are covered too', () => {
    const dir = project('h1');
    const file = write(dir, 'CHECKPOINT.md', kb(9));
    assert.equal(written(dir, file, 'Edit').json.decision, 'block');
    assert.equal(written(dir, file, 'MultiEdit').json.decision, 'block');
  });

  test('BGZFLOW_CHECKPOINT_KB and BGZFLOW_HANDOFF_KB change the caps', () => {
    const dir = project('h1');
    const cp = write(dir, 'CHECKPOINT.md', kb(9));
    assert.equal(written(dir, cp, 'Write', { BGZFLOW_CHECKPOINT_KB: '20' }).stdout, '');
    const ho = write(dir, 'HANDOFF.md', kb(3));
    assert.equal(written(dir, ho, 'Write', { BGZFLOW_HANDOFF_KB: '4' }).stdout, '');
  });

  test('Codex apply_patch input is parsed for the files it touches', () => {
    const dir = project('h1');
    write(dir, 'CHECKPOINT.md', kb(9));
    const patch = '*** Begin Patch\n*** Update File: CHECKPOINT.md\n@@\n-old\n+new\n*** End Patch\n';
    const r = runHook('h1-checkpoint-cap.mjs', { hook_event_name: 'PostToolUse', tool_name: 'apply_patch', cwd: dir, tool_input: { command: patch } }, { project: dir });
    assert.equal(r.json.decision, 'block');
    assert.match(r.json.reason, /CHECKPOINT\.md is 9\.0 KB/);
  });

  test('Grok payload (camelCase, path) is understood', () => {
    const dir = project('h1');
    const file = write(dir, 'CHECKPOINT.md', kb(9));
    const r = runHook('h1-checkpoint-cap.mjs', { hookEventName: 'post_tool_use', hook_event_name: 'PostToolUse', toolName: 'search_replace', toolInput: { path: file }, cwd: dir }, { project: dir });
    assert.equal(r.json.decision, 'block');
  });

  test('a missing file and a missing path pass', () => {
    const dir = project('h1');
    assert.equal(written(dir, path.join(dir, 'CHECKPOINT.md')).stdout, '');
    assert.equal(runHook('h1-checkpoint-cap.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Write', cwd: dir, tool_input: {} }, { project: dir }).stdout, '');
  });
});

describe('every hook fails open', () => {
  const scripts = ['h1-checkpoint-cap.mjs', 'h2-big-read-guard.mjs', 'h3-chat-size.mjs', 'h4-clock.mjs', 'h5-state-snapshot.mjs'];
  const inputs = ['', '   ', 'not json at all', '[1,2,3]', 'null', '{"tool_input": "a string", "cwd": 5}', '{"cwd": "Z:/does/not/exist", "transcript_path": 42}', '{'.repeat(2000)];
  for (const script of scripts) {
    test(`${script}: broken input exits 0 with empty or valid JSON output`, () => {
      for (const input of inputs) {
        const r = runHook(script, input);
        assert.equal(r.status, 0, `${script} on ${JSON.stringify(input).slice(0, 30)}: ${r.stderr}`);
        if (r.stdout.trim()) assert.doesNotThrow(() => JSON.parse(r.stdout), `${script} printed non-JSON: ${r.stdout}`);
      }
    });
  }

  test('garbage limits in the environment do not break a hook', () => {
    const dir = project('fo');
    const r = runHook('h1-checkpoint-cap.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Write', cwd: dir, tool_input: { file_path: write(dir, 'CHECKPOINT.md', kb(9)) } }, {
      project: dir,
      env: { BGZFLOW_CHECKPOINT_KB: 'abc', BGZFLOW_HANDOFF_KB: '-3', BGZFLOW_BIG_READ_KB: '', BGZFLOW_CHAT_MB: 'NaN' },
    });
    assert.equal(r.status, 0);
    assert.equal(r.json.decision, 'block'); // the default 8 KB cap applies
    const log = readLog(dir);
    assert.match(log, /BGZFLOW_CHECKPOINT_KB ignored \(need a number above 0\)/);
    assert.doesNotMatch(log, /abc/, 'the value must not be logged');
  });

  test('environment values are never written to the log, even when they look like secrets', () => {
    const dir = project('fo');
    const secretLooking = fake.ghToken();
    const r = runHook('h4-clock.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir }, {
      project: dir,
      env: { BGZFLOW_CHAT_MB: secretLooking, BGZFLOW_HANDOFF_KB: fake.password(), BGZFLOW_STARTUP_WORDS: fake.longRandom() },
    });
    assert.equal(r.status, 0);
    const log = readLog(dir);
    assert.match(log, /BGZFLOW_CHAT_MB ignored/);
    for (const value of [secretLooking, fake.password(), fake.longRandom()]) {
      assert.ok(!log.includes(value), 'an environment value reached hooks.log');
      assert.ok(!r.stdout.includes(value) && !r.stderr.includes(value), 'an environment value reached the hook output');
    }
  });

  test('a name that could hold a secret is dropped before it is written', async () => {
    const { loggableEnvName, SENSITIVE_ENV_NAME } = await import('../lib/config.mjs');
    for (const name of ['GITHUB_TOKEN', 'AWS_SECRET_ACCESS_KEY', 'DB_PASSWORD', 'OAUTH_AUTH_HEADER', 'MY_COOKIE', 'CLAUDE_CODE_MESSAGING_TOKEN', 'SESSION_ID', 'GIT_CREDENTIAL_HELPER', 'api_key']) {
      assert.match(name, SENSITIVE_ENV_NAME);
      assert.equal(loggableEnvName(name), 'an environment variable', name);
    }
    for (const name of ['BGZFLOW_CHECKPOINT_KB', 'BGZFLOW_HANDOFF_KB', 'BGZFLOW_BIG_READ_KB', 'BGZFLOW_CHAT_MB', 'BGZFLOW_STARTUP_WORDS']) {
      assert.equal(loggableEnvName(name), name);
    }
    assert.equal(loggableEnvName('not a valid name; rm -rf'), 'an environment variable');
    assert.equal(loggableEnvName(undefined), 'an environment variable');
  });

  test('no shipped source writes environment values (static check of the hook and tool sources)', () => {
    const files = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          if (!['test', 'node_modules', '.tmp', '.git', '__pycache__'].includes(e.name)) walk(p);
        } else if (/\.(mjs|py)$/.test(e.name)) files.push(p);
      }
    };
    walk(path.join(ROOT, 'hooks'));
    walk(path.join(ROOT, 'tools'));
    assert.ok(files.length > 10);
    const offenders = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      // dumping the whole environment, or serialising it, is never allowed
      if (/JSON\.stringify\(\s*process\.env|Object\.(?:entries|values)\(\s*process\.env|console\.\w+\(\s*process\.env|os\.environ\s*\)|dict\(os\.environ\)|print\(\s*os\.environ/.test(text)) offenders.push(path.relative(ROOT, file));
    }
    assert.deepEqual(offenders, []);
  });

  test('a corrupt config.json is ignored with a log line', () => {
    const dir = project('fo');
    write(dir, '.bgzflow/config.json', '{ not json');
    const r = runHook('h4-clock.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir }, { project: dir });
    assert.equal(r.status, 0);
    assert.ok(r.json);
    assert.match(readLog(dir), /config\.json ignored/);
  });

  test('an unwritable .bgzflow (a file, not a folder) does not break a hook', () => {
    const dir = project('fo');
    fs.rmSync(path.join(dir, '.bgzflow'), { recursive: true });
    write(dir, '.bgzflow', 'i am a file');
    const r = runHook('h1-checkpoint-cap.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Write', cwd: dir, tool_input: { file_path: write(dir, 'CHECKPOINT.md', kb(9)) } }, { project: dir });
    assert.equal(r.status, 0);
    assert.equal(r.json.decision, 'block');
  });

  test('a host that never closes stdin does not hang the hook', () => {
    const hangAfterMs = Math.max(12000, Math.floor(TEST_TIMEOUT_MS / 2));
    const child = spawnSync(process.execPath, ['-e', `
      const { spawn } = require('node:child_process');
      const c = spawn(process.execPath, [${JSON.stringify(path.join(ROOT, 'hooks', 'h4-clock.mjs'))}], { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      c.stdout.on('data', (d) => (out += d));
      const t = Date.now();
      c.on('exit', (code) => { console.log(JSON.stringify({ code, ms: Date.now() - t, out })); process.exit(0); });
      setTimeout(() => { console.log(JSON.stringify({ code: 'hung' })); c.kill(); process.exit(0); }, ${hangAfterMs});
    `], { encoding: 'utf8', env: cleanEnv(), timeout: TEST_TIMEOUT_MS });
    const result = JSON.parse(child.stdout.trim());
    assert.equal(result.code, 0, 'the hook did not exit while its stdin stayed open');
    // The hook reads stdin for 1.5 s at most and has an 8 s watchdog, so an unloaded machine sees well under 8 s.
    if (process.env.BGZFLOW_SKIP_TIMING !== '1') assert.ok(result.ms < 8000, `took ${result.ms} ms`);
  });
});

describe('word budget: at most 60 words of context per turn', () => {
  test('a normal turn (clock) and the worst turn (clock plus chat size) stay within 60 words', () => {
    const dir = project('wb');
    const clock = runHook('h4-clock.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir }, { project: dir }).json.hookSpecificOutput.additionalContext;
    const transcript = write(dir, 'chat.jsonl', kb(2 * 1024));
    const size = runHook('h3-chat-size.mjs', { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: transcript }, { project: dir, env: { BGZFLOW_CHAT_MB: '1' } }).json.hookSpecificOutput.additionalContext;
    assert.ok(words(clock) <= 25, `clock ${words(clock)}`);
    assert.ok(words(clock) + words(size) <= 60, `clock + chat size = ${words(clock) + words(size)} words`);
  });

  test('a large read denial and a checkpoint block are each within 60 words', () => {
    const dir = project('wb');
    const deny = runHook('h2-big-read-guard.mjs', { hook_event_name: 'PreToolUse', tool_name: 'Read', cwd: dir, tool_input: { file_path: write(dir, 'big.log', kb(100)) } }, { project: dir });
    assert.ok(words(deny.json.hookSpecificOutput.permissionDecisionReason) <= 60);
    const block = runHook('h1-checkpoint-cap.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Write', cwd: dir, tool_input: { file_path: write(dir, 'CHECKPOINT.md', kb(9)) } }, { project: dir });
    assert.ok(words(block.json.reason) <= 60);
  });
});

describe('speed: a hook adds little to bare Node start-up', () => {
  // Best of several runs, not the median: a busy machine (test files run in parallel, and a swarm of workers may
  // share the CPU) can slow any run, but it cannot make a run faster than the hook's real cost.
  test('best-case overhead over an empty script is under 200 ms', { skip: process.env.BGZFLOW_SKIP_TIMING === '1' }, () => {
    const dir = project('sp');
    write(dir, 'CHECKPOINT.md', kb(3));
    const empty = path.join(dir, 'empty.mjs');
    fs.writeFileSync(empty, '');
    const time = (fn, n = 9) => Math.min(...Array.from({ length: n }, fn));
    const bare = () => {
      const t = process.hrtime.bigint();
      spawnSync(process.execPath, [empty], { input: '' });
      return Number(process.hrtime.bigint() - t) / 1e6;
    };
    const base = time(bare);
    const cases = {
      'h4-clock.mjs': { hook_event_name: 'UserPromptSubmit', cwd: dir },
      'h3-chat-size.mjs': { hook_event_name: 'UserPromptSubmit', cwd: dir, transcript_path: path.join(dir, 'CHECKPOINT.md') },
      'h2-big-read-guard.mjs': { hook_event_name: 'PreToolUse', tool_name: 'Read', cwd: dir, tool_input: { file_path: path.join(dir, 'CHECKPOINT.md') } },
      'h1-checkpoint-cap.mjs': { hook_event_name: 'PostToolUse', tool_name: 'Write', cwd: dir, tool_input: { file_path: path.join(dir, 'CHECKPOINT.md') } },
      'h5-state-snapshot.mjs': { hook_event_name: 'Stop', cwd: dir },
    };
    const report = [`bare node ${base.toFixed(0)} ms`];
    for (const [script, input] of Object.entries(cases)) {
      runHook(script, input, { project: dir }); // warm the file cache
      // Pair each sample with a fresh baseline so changing machine load is not counted as hook work.
      const samples = Array.from({ length: 9 }, () => {
        const baseline = bare(), ms = runHook(script, input, { project: dir }).ms;
        return { ms, baseline };
      });
      const ms = Math.min(...samples.map(s => s.ms));
      const localBase = Math.min(...samples.map(s => s.baseline));
      const overhead = ms-localBase;
      report.push(`${script} ${ms.toFixed(0)} ms (+${overhead.toFixed(0)})`);
      assert.ok(overhead < 200, `${script} adds ${overhead.toFixed(0)} ms over paired bare Node (${report.join('; ')})`);
    }
    console.log('# timing:', report.join('; '));
  });
});

describe('hooks.json', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const commands = [];
  for (const [event, groups] of Object.entries(hooks)) {
    for (const group of groups) for (const h of group.hooks) commands.push({ event, matcher: group.matcher, ...h });
  }

  test('registers each hook on the documented event with the documented matcher', () => {
    const find = (script) => commands.filter((c) => c.command.includes(script));
    assert.deepEqual(find('h4-clock.mjs').map((c) => c.event).sort(), ['SessionStart', 'UserPromptSubmit']);
    assert.deepEqual(find('h3-chat-size.mjs').map((c) => c.event), ['UserPromptSubmit']);
    assert.deepEqual(find('h2-big-read-guard.mjs').map((c) => [c.event, c.matcher]), [['PreToolUse', 'Read']]);
    assert.deepEqual(find('h1-checkpoint-cap.mjs').map((c) => [c.event, c.matcher]), [['PostToolUse', 'Write|Edit|MultiEdit']]);
    assert.deepEqual(find('h5-state-snapshot.mjs').map((c) => c.event), ['Stop']);
    assert.deepEqual(find('swarm-gate.mjs').map(c => c.event).sort(), ['PostToolUse', 'PostToolUseFailure', 'PreToolUse','Stop']);
    assert.equal(commands.length, 10);
  });

  test('every command uses the plugin-root placeholder, a real script and a short timeout', () => {
    for (const c of commands) {
      assert.equal(c.type, 'command');
      const m = c.command.match(/^node "\$\{CLAUDE_PLUGIN_ROOT\}\/(hooks\/[\w-]+\.mjs|tools\/swarm-gate\/swarm-gate\.mjs)"(?: hook)?$/);
      assert.ok(m, c.command);
      assert.ok(fs.existsSync(path.join(ROOT, m[1])), `${m[1]} is missing`);
      assert.ok(c.timeout >= 2 && c.timeout <= 30, `timeout ${c.timeout}`);
    }
  });

  // Claude Code (through bash, also Git Bash on Windows) and Codex (through its own shell) substitute
  // ${CLAUDE_PLUGIN_ROOT} in the command text before running it. This plugin folder has spaces in its path,
  // which is the case that breaks an unquoted command. Codex on Windows was checked separately with a real
  // Codex run (hooks/evidence/codex-windows-e2e-result.txt). The test suite never starts a Windows shell.
  const bashCandidates = [process.env.BGZFLOW_TEST_BASH, 'C:\\Program Files\\Git\\bin\\bash.exe', 'bash', '/bin/bash', '/bin/sh'].filter(Boolean);
  const bash = bashCandidates.find((b) => {
    try {
      // a WSL launcher named bash.exe has no node and no Windows paths, so it fails this probe and is skipped
      return spawnSync(b, ['-c', 'node --version'], { encoding: 'utf8' }).status === 0;
    } catch {
      return false;
    }
  });
  const roots = process.platform === 'win32' ? [ROOT, ROOT.replaceAll('\\', '/')] : [ROOT];

  test('every command runs through bash with the plugin root substituted (spaces in the path)', { skip: bash ? false : 'no bash with node on PATH' }, () => {
    const dir = project('hj');
    for (const root of roots) {
      for (const c of commands) {
        const command = c.command.replaceAll('${CLAUDE_PLUGIN_ROOT}', root);
        const input = JSON.stringify({ hook_event_name: c.event, session_id: 's', cwd: dir, tool_name: c.matcher ? c.matcher.split('|')[0] : undefined, tool_input: { file_path: path.join(dir, 'x.md') } });
        const r = spawnSync(bash, ['-c', command], { input, encoding: 'utf8', env: cleanEnv() });
        assert.equal(r.status, 0, `${command} -> ${r.stderr}`);
        if (r.stdout.trim()) assert.doesNotThrow(() => JSON.parse(r.stdout));
      }
    }
  });

  test('every command also runs as a direct node call (how a host without a shell would start it)', () => {
    const dir = project('hj');
    for (const c of commands) {
      const script = c.command.match(/"\$\{CLAUDE_PLUGIN_ROOT\}\/(.+)"/)[1];
      const input = JSON.stringify({ hook_event_name: c.event, session_id: 's', cwd: dir, tool_name: c.matcher ? c.matcher.split('|')[0] : undefined, tool_input: { file_path: path.join(dir, 'x.md') } });
      const r = spawnSync(process.execPath, [path.join(ROOT, ...script.split('/')), ...(c.command.endsWith(' hook') ? ['hook'] : [])], { input, encoding: 'utf8', env: cleanEnv(), cwd: dir });
      assert.equal(r.status, 0, `${script} -> ${r.stderr}`);
    }
  });
});
