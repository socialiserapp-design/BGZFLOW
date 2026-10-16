# BGZFLOW hooks

Six small Node scripts cover one-page checkpoints, no whole-file reads of big notes, small chats, a real clock,
a second copy of project state, and lessons due for review. No dependencies beyond Node 18 or newer.

| Id | Script | Event (matcher) | What it does |
|----|--------|-----------------|--------------|
| H4 | `h4-clock.mjs` | SessionStart, UserPromptSubmit | Adds one line with the real local date, time and timezone. |
| H6 | `h6-lessons-due.mjs` | SessionStart | Reads only the resolved project's lessons and adds `Lessons due for review: N (bgz lessons due)` when N > 0. No writes or network. |
| H3 | `h3-chat-size.mjs` | UserPromptSubmit | If the transcript is over `BGZFLOW_CHAT_MB`, adds one line: write a handoff and continue in a fresh chat. |
| H2 | `h2-big-read-guard.mjs` | PreToolUse (`Read`) | Denies a whole-file read of a notes file (.md .txt .log .json .jsonl .csv) over `BGZFLOW_BIG_READ_KB`, and points to `notes-map ask` or a line range. Code files pass. |
| H1 | `h1-checkpoint-cap.mjs` | PostToolUse (`Write\|Edit\|MultiEdit`) | If `*CHECKPOINT*.md` is over `BGZFLOW_CHECKPOINT_KB`, or `HANDOFF*.md` over `BGZFLOW_HANDOFF_KB`, blocks with: keep one page, move history to ARCHIVE.md. |
| H5 | `h5-state-snapshot.mjs` | Stop | If a `CHECKPOINT*.md` exists in the project root or its handover folder, copies state files of 1 MB or less that changed and that git does not protect into `<project>/.bgzflow/snapshots/<UTC timestamp>/`. Keeps the newest 20 snapshots and deletes nothing else. |

`hooks.json` registers them with the command form `node "${CLAUDE_PLUGIN_ROOT}/hooks/<script>.mjs"` (timeout 10 s, 30 s for H5).

## Rules every hook follows

- **Fails open.** Any error is caught and the hook exits 0. H1–H5 append one line to `<project>/.bgzflow/hooks.log`; H6 stays silent and never writes. A broken or empty stdin body is treated as `{}`. A host that never closes stdin does not hang a hook.
- **Small.** Typically well under 200 ms beyond Node's own start-up. At most 60 words of context per turn in total (the clock line plus, rarely, the chat-size line).
- **Log hygiene.** The log holds a UTC timestamp, the hook id and a short message. Credentials in URLs are redacted. Environment variable values are never written anywhere, only names, and a name that could hold a secret (containing TOKEN, SECRET, KEY, PASSWORD, AUTH, COOKIE, SESSION or CREDENTIAL) is not even named. The same rule holds for the tools and the test helpers, and a test checks the sources.
- **Limits** (environment variable, then `<project>/.bgzflow/config.json`, then default). Zero, negative or non-numeric values are ignored with a log line. Optional: `BGZFLOW_STATE_DIRS` (extra state folders for H5) and `BGZFLOW_PROJECT` (project folder override).

| Variable | config.json key | Default |
|----------|-----------------|---------|
| `BGZFLOW_CHECKPOINT_KB` | `checkpoint_kb` | 8 |
| `BGZFLOW_HANDOFF_KB` | `handoff_kb` | 2 |
| `BGZFLOW_BIG_READ_KB` | `big_read_kb` | 64 |
| `BGZFLOW_CHAT_MB` | `chat_mb` | 15 |
| `BGZFLOW_STARTUP_WORDS` | `startup_words` | 3000 (read by `startup-check`) |

## Exact input and output per event (Claude Code format)

Checked against the official Claude Code hooks reference on 2026-09-29: <https://code.claude.com/docs/en/hooks>
(plugin layout: <https://code.claude.com/docs/en/plugins-reference>).

| Event | Fields read from stdin | Output printed |
|-------|------------------------|----------------|
| SessionStart | `hook_event_name`, `cwd` | `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}` |
| UserPromptSubmit | `hook_event_name`, `cwd`, `transcript_path` | `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}` |
| PreToolUse (`Read`) | `tool_name`, `tool_input.file_path`, `tool_input.offset` / `limit`, `cwd` | to deny: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}`; to allow: nothing |
| PostToolUse (`Write`, `Edit`, `MultiEdit`) | `tool_name`, `tool_input.file_path`, `cwd` | to block: `{"decision":"block","reason":"..."}`; otherwise nothing |
| Stop | `cwd` | `{}` (never blocks the stop) |

A hook prints at most one JSON object. Exit code is always 0. The additionalContext text is far below the 10,000-character cap.

H6 uses the same project override and host/cwd resolution as the other hooks; it never searches other projects for lessons. It reuses the lessons CLI's exact-key due logic. Missing, malformed, unreadable or larger-than-1-MB logs produce no context; use `bgz lessons due` for explicit diagnosis or larger histories. It runs only at SessionStart, not on every prompt.

## Which host runs which hook

"Yes" means the host documents the event, matcher and output the hook uses. "Tested" means a test feeds that host's stdin shape.
No hook has been run inside Claude Code or Grok itself; only Codex was run end to end (see below).

| Hook | Claude Code | Codex | Grok |
|------|-------------|-------|------|
| H4 clock | Yes | Yes (UserPromptSubmit context observed reaching the model) | **Gap.** SessionStart output is ignored and the context of an allowing UserPromptSubmit hook is discarded. |
| H6 lessons | Same SessionStart format as H4; fixture tested | Same SessionStart format as H4; fixture tested, not live-installed | **Gap.** SessionStart context is ignored; use `bgz lessons due`. |
| H3 chat size | Yes | Yes when the host sends `transcript_path` (it does) | **Gap.** Same reason as H4. |
| H2 big-read guard | Yes | **Gap.** Codex has no `Read` tool. Reads are shell commands (matched as `Bash`) or an MCP tool with its own name. | Yes. `Read` maps to Grok's `read_file`; both deny spellings are accepted. Tested with a Grok-shaped payload. |
| H1 checkpoint cap | Yes | Yes. `apply_patch` matches `Edit` and `Write`; H1 reads the touched files from the patch text. The same block shape reached the model in the recorded run. | Yes. A `block` reason is delivered next to the tool result; it cannot undo the write. Tested with a Grok-shaped payload. |
| H5 snapshot | Yes | Yes (Stop fires; empty output accepted) | Yes. Grok also fires an extra observe-only Stop at session end; with nothing changed it copies nothing. |

### Claude Code

Nothing to add: the plugin's `hooks/hooks.json` is loaded when the plugin is enabled. Command hooks run through bash by default, or
through PowerShell on Windows when Git Bash is not installed; the shipped `node "<path>"` form works in both. The docs also describe an
exec form (`"command": "node", "args": [...]`) that avoids the shell; the shipped form is kept because Codex and Grok read the same file.

### Codex

Sources, read 2026-09-29: <https://developers.openai.com/codex/hooks> and <https://developers.openai.com/codex/plugins/build>
(section on bundled lifecycle hooks). Tested with Codex CLI 0.159.0.

- Codex discovers `hooks/hooks.json` in an installed plugin by default, so the same file is used. Nothing else to configure.
- **Trust.** Installing or enabling a plugin does not trust its hooks. Codex skips them until the user reviews and trusts them with `/hooks`
  (trust is tied to the hook's hash, so a changed `hooks.json` needs review again). `--dangerously-bypass-hook-trust` skips this for one
  run and is meant only for automation that already vets the source.
- Install (not run here): `codex plugin marketplace add <path-or-git-url>`, then `codex plugin add bgzflow@<marketplace-name>`.
- Codex substitutes `${CLAUDE_PLUGIN_ROOT}` (and `${PLUGIN_ROOT}`) in the command text.
- Optional explicit declaration in the plugin manifest (only needed to override the default file):

```json
{ "extensions": { "com.openai": { "hooks": "./hooks/hooks.json" } } }
```

- Without the plugin, for one machine, put the hooks in `~/.codex/hooks.json` with an absolute path (forward slashes are fine on Windows):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "node \"<absolute path>/hooks/h4-clock.mjs\"", "timeout": 10 } ] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "node \"<absolute path>/hooks/h1-checkpoint-cap.mjs\"", "timeout": 10 } ] }
    ]
  }
}
```

**Windows, no shim files.** Codex runs a hook command through Windows PowerShell (`-NoProfile -Command`), so a plain `node "<path>"`
needs no `.cmd`, `.bat` or `.ps1` wrapper. Measured on Codex CLI 0.159.0, Windows 11, in a throwaway home whose folder name has a space:
a probe plugin using the shipped command form fired on SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop (a user-level hook
also on SessionEnd), each receiving the documented stdin JSON. Forms that failed: `%CLAUDE_PLUGIN_ROOT%` (cmd-style percent signs are not
expanded) and a path relative to the project folder. Node must be on `PATH`. Full record: [`evidence/codex-windows-e2e-result.txt`](evidence/codex-windows-e2e-result.txt).

### Grok

Sources: <https://docs.x.ai/build/features/hooks> (page dated 2 July 2026, read 2026-09-29) and the hooks guide built into the `grok` CLI
(version 1.0.44). Grok reads Claude-format plugins including `hooks/hooks.json`. `grok plugin validate` on a throwaway copy of this
folder's layout (2026-09-30) printed: `Plugin manifest is valid ... components: 0 skill dir(s), 0 command dir(s), 0 agent dir(s), hooks`.

- Grok provides `CLAUDE_PLUGIN_ROOT` as an alias of `GROK_PLUGIN_ROOT` and expands `${VAR}` in commands.
- Stdin is camelCase (`hookEventName`, `toolName`, `toolInput`, `workspaceRoot`) and also carries the Claude-style `hook_event_name`. The hooks accept both spellings.
- Grok's default hook timeout is 5 seconds; `hooks.json` sets its own timeouts, which apply.
- Project hooks need trust (`/hooks-trust` or `--trust`).
- Install (not run here): `grok plugin install <git-url-or-local-path>`.
- Without the plugin, `~/.grok/hooks/bgzflow.json` (or `<project>/.grok/hooks/`):

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Read", "hooks": [ { "type": "command", "command": "node \"<absolute path>/hooks/h2-big-read-guard.mjs\"", "timeout": 10 } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "command", "command": "node \"<absolute path>/hooks/h5-state-snapshot.mjs\"", "timeout": 30 } ] }
    ]
  }
}
```

### Other hosts

No hook support is assumed. Use the fallbacks below.

## Gaps and fallbacks

| Gap | Fallback |
|-----|----------|
| H4 on Grok (no context injection) | The agent rules say to run `date` before writing any time. |
| H3 on Grok | The rules say to write a HANDOFF at natural breaks; the lead checks the size of the session file by hand. |
| H2 on Codex (reads are shell commands) | The rules say to run `notes-map ask "<question>"` or read a line range. `startup-check` catches oversized start-up notes. |
| Any host without hooks | The lead runs `startup-check` at the start of each session; it fails when the start-up chain, the checkpoint or the owners block breaks a rule. `bg-rounds` keeps the repair-round ledger by hand. |
| Codex hooks not yet trusted | Run `/hooks` and trust them; until then no BGZFLOW hook runs on Codex. |

## Tests

```
node --test hooks/test/*.test.mjs
```

`npm test` (the same as `node scripts/test-all.mjs`) runs this suite together with every other suite in the repository.

The hook tests feed each event's documented JSON on stdin and check the output, the fail-open paths, the word budget, a speed bound,
that no environment value reaches the log, and that every command in `hooks.json` starts (through bash with a path containing a space,
and as a direct `node` call). Set `BGZFLOW_SKIP_TIMING=1` on a loaded machine to skip the wall-clock test.
# Active swarm gate

The hook manifest also runs `tools/swarm-gate/swarm-gate.mjs hook` on recognizable worker launches and production releases, and collects launch replies/failures. It is active only while this project has an active swarm ledger. See [the gate guide](../docs/swarm-gate.md) for models, login observations, usage/reserve, diagnosis, ownership, ordered checks and release commands. Non-release internal errors warn and fail open; an unready active-swarm release fails closed. This exception applies to the gate; the original H1–H5 hooks retain their fail-open contracts.

Optional Jev judgment is off by default. Gate hooks allow up to seven seconds for a configured judgment timeout capped at five seconds plus local work. Stop first uses a free pre-filter; ordinary messages and `stop_hook_active` make no call. A definite improper human request blocks Stop once for a rewrite. Missing/error/timeout judgment warns and uses code-only checks, without a paid retry. Release judgment can add a journey-coverage block and cannot approve an unready ledger. Responses retain actual usage; no cost is inferred from token counts.
