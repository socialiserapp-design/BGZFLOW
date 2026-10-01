# Host manifests

Checked on 2026-09-29 against the installed CLIs and the official docs. When a doc and a CLI disagreed, the CLI is the one this repository follows. Tests used a temporary copy of the plugin (one dummy skill and an empty `hooks/hooks.json`) under this worktree's ignored temp folder. Claude used `CLAUDE_CONFIG_DIR`. Codex used `CODEX_HOME`. Both homes were temporary folders. The real Claude, Codex, and Grok homes were left untouched.

Versions that day:

- Claude Code 2.1.284
- Codex CLI 0.159.0
- Grok 1.0.44 (`5b807183dd79`)

`VERSION` is the only version source. `node scripts/build-manifests.mjs` writes the manifests below; `--check` exits 1 on drift. The current candidate is `bgzflow` version `0.2.0`, MIT. Its public author is `BGZFLOW contributors`, marketplace owner is `socialiserapp-design`, and homepage, repository and every marketplace source point to [socialiserapp-design/BGZFLOW](https://github.com/socialiserapp-design/BGZFLOW). The earlier installation observations below belong to `0.1.0`; the [0.2.0 receipt](evidence/candidate-2-hosts.json) separately records the local-source gate installation. Remote-source installation is untested. No author email is written in the manifests.

## Claude Code

Docs: https://code.claude.com/docs/en/plugins-reference and https://code.claude.com/docs/en/plugins/marketplace-reference

CLI: `claude plugin validate --help`, `claude plugin marketplace --help`, `claude plugin install --help`, `claude plugin update --help`, `claude plugin uninstall --help`, `claude plugin details --help`.

A manifest is optional. When it exists, Claude reads `.claude-plugin/plugin.json`. Skill, command, and hook files live at the plugin root. They do not live inside `.claude-plugin/`.

The only required key is `name`, in kebab-case. Useful keys are `version` (not checked as semver), `description`, `author` (`name` is required when `author` is present; `email` and `url` are optional), `license`, `keywords`, `displayName`, `defaultEnabled` (default true), and `metadata`. A `homepage` value must parse as a URL or the plugin fails to load. `repository` is not validated. `$schema` is ignored at load. Unrecognized top-level keys are warnings and are stripped. `claude plugin validate --strict` turns warnings into failures. A missing `version`, `description`, or `author` is a warning.

Component paths must start with `./` and must exist inside the plugin root. The `skills` key also accepts `.` and `./`. Claude still scans a root `skills/` directory when the key is omitted. Hooks in the manifest merge with `hooks/hooks.json`. This repository omits an explicit hooks path, because default discovery already reads `hooks/hooks.json`. The manifest names no commands either: Claude scans `commands/` by default. With Claude Code 2.1.284, a command listed by path in the manifest did not appear in `claude plugin details`, while the same command found by the default scan did (as a skill).

`claude plugin validate` accepts `--json` and `--strict`. When a directory contains both `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`, validating the directory checks the marketplace file. Validate the plugin by passing the `plugin.json` path. On 2026-09-29 both files passed `claude plugin validate --strict` with no warnings.

A marketplace file needs `name`, `owner.name`, and `plugins`. Each entry needs `name` and `source`. The docs say a relative source starts with `./`, unless it is a bare directory under `metadata.pluginRoot`. The CLI accepted `"."` at the marketplace root in strict validation and a real install of `0.1.0`. Version `0.2.0` uses the public repository URL as its source. Entry display fields override `plugin.json` for a relative source. An entry `version` warns when the plugin also sets one, so the entry omits it. A missing marketplace `description` warns, so this file includes one.

Reserved marketplace names include `claude-code-marketplace`, names starting with `anthropic-` or `claudeai-`, and `agent-skills`, `skills-dir`, `builtin`, `inline`, `npm`, `pip`, `uv`, `cargo`, `github`, `gh`, and `claude-plugin-test`. `bgzflow` is not reserved. The install id is `bgzflow@bgzflow`.

`claude plugin marketplace add` accepts a local directory or a GitHub `owner/repo` shorthand, with `--scope user`, `project`, or `local` (default `user`). `claude plugin install` takes the same scopes, plus `--yes` and `--json`. `claude plugin details` takes an installed name, not a path.

Throwaway run, user scope: marketplace add of the temporary copy, then `claude plugin install bgzflow@bgzflow --yes`, succeeded. Details reported version `0.1.0`, one skill, and Hooks (0). An empty hooks object (`{"hooks":{}}`) is not counted as a hook. `claude plugin update bgzflow@bgzflow` reported that `0.1.0` was already current. `claude plugin uninstall bgzflow@bgzflow --yes` removed it. `claude plugin marketplace update` and `claude plugin marketplace remove` are real subcommands. Marketplace remove was not executed.

Hook environment variables from the docs: `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR`.

## Codex

Docs: https://developers.openai.com/codex/plugins/build

Schema: https://agent-plugins.org/schemas/1.0.0/plugin.schema.json

CLI: `codex plugin --help` and `codex plugin marketplace --help`. There is no `codex plugin validate` subcommand. Acceptance was checked by installing into a temporary `CODEX_HOME`.

The portable manifest is `plugin.json` at the repository root. The schema requires `$schema` and `name` (`name` is kebab-case, at most 64 characters). Additional properties are rejected. There is no `skills` field. Skills are discovered from the root `skills/` directory. Optional keys include `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, and `extensions`. OpenAI presentation and hook overrides go in `extensions` under `com.openai`. That object replaces `.codex-plugin/plugin.json` when it is present. This repository sets neither, and it does not add a compatibility `.codex-plugin/plugin.json`. Default hook discovery is `hooks/hooks.json`.

The marketplace file is `.agents/plugins/marketplace.json`. Codex also reads a legacy `.claude-plugin/marketplace.json`. A personal marketplace can live at `~/.agents/plugins/marketplace.json`. Docs show `{ "source": "local", "path": "./plugins/my-plugin" }`; a plain string path also works. The CLI accepted a root `"path": "./"` in the earlier local-source test. The current source is `{ "source": "url", "url": "https://github.com/socialiserapp-design/BGZFLOW" }`, with the plugin at the repository root. Each entry includes `policy.installation` (`AVAILABLE`, `INSTALLED_BY_DEFAULT`, or `NOT_AVAILABLE`), `policy.authentication` (`ON_INSTALL`), and `category` (`Productivity`). `interface.displayName` is the marketplace title.

`codex plugin marketplace add` accepts a local path, `owner/repo[@ref]`, or an HTTPS or SSH git URL. `codex plugin list` accepts `--json`, `--available`, and `--marketplace`. Other commands used here are `codex plugin add`, `codex plugin remove`, `codex plugin marketplace remove`, and `codex plugin marketplace upgrade`. Upgrade refreshes configured git marketplace snapshots. A local-path upgrade was not run.

Throwaway run: `codex plugin marketplace add` of the temporary copy, then `codex plugin add bgzflow@bgzflow`, succeeded. The listed version was `0.1.0` and the auth policy was `ON_INSTALL`. The cache contained the root manifest, both marketplace files, the Grok marketplace file, the dummy skill, and the empty hooks file. Policy fields in the list matched `.agents/plugins/marketplace.json`. The Claude marketplace file has no policy block, so Codex used the `.agents` file for policy. Which file wins when the two disagree was not isolated. `codex plugin remove bgzflow@bgzflow` and `codex plugin marketplace remove bgzflow` both succeeded.

Hook environment variables from the docs: `PLUGIN_ROOT`, `PLUGIN_DATA`, `CLAUDE_PLUGIN_ROOT`, and `CLAUDE_PLUGIN_DATA`. Enabling the plugin for one repo is a local `.codex/config.toml` entry. This repository does not ship that file.

## Grok

Docs: https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/09-plugins.md (retrieved from the raw doc on 2026-09-29).

CLI: `grok plugin --help`, `grok plugin validate --help`, `grok plugin marketplace --help`, `grok plugin install --help`, `grok plugin update --help`, `grok plugin uninstall --help`.

A catalog needs `.grok-plugin/marketplace.json`. Grok also accepts `.grok-plugin/plugin.json` and the `.claude-plugin/` equivalents. Load order is the Grok marketplace file, then the Grok plugin file, then `.claude-plugin/marketplace.json`, then `.claude-plugin/plugin.json`. Keep the Grok and Claude plugin lists identical in name and description. The `source` shape differs by host.

The doc example source is `{ "type": "local", "path": "./plugins/gdrive" }`. A plain string also works, as do source objects for git, GitHub and local directories. A remote entry accepts `source: "url"`, a URL and an optional pinned commit. The earlier `grok plugin validate` accepted a combined temporary tree with `{ "type": "local", "path": "./" }`; that form was not validated alone and root-path installation was not run. The current generator writes the public repository URL instead. No `.grok-plugin/plugin.json` is required; the earlier validation passed without one.

`grok plugin validate` defaults to the current directory. On the temporary copy it exited 0 and reported name `bgzflow`, version `0.1.0`, one skill directory, no command directories, no agent directories, and hooks. The same empty hooks file was reported as Hooks (0) by Claude details. `grok plugin details` takes an installed name, not a path. It was not run.

`grok plugin marketplace add` accepts a git URL, GitHub `owner/repo` shorthand or local directory, with `--force` to skip a reachability probe. `grok plugin install` accepts those sources, with `--trust`. The public install is `grok plugin install socialiserapp-design/BGZFLOW` after `grok plugin marketplace add socialiserapp-design/BGZFLOW`. That repository ID differs from `bgzflow@bgzflow`. Update names one plugin or all; uninstall accepts `--confirm` and `--keep-data`.

`grok --help` has no home override and no config-dir override. The isolation flag used for validate was `--leader-socket`, pointed at a socket under the worktree temp folder. Marketplace add and install were not run, because they would write the real Grok home.

Hook environment variables from the docs: `GROK_PLUGIN_ROOT` and `GROK_PLUGIN_DATA`, plus the `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` aliases. Discovery paths are `--plugin-dir`, `.grok/plugins/`, `~/.grok/plugins/`, and `[plugins] paths` in `~/.grok/config.toml`. Settings may also be read from `~/.grok/settings.json` or `~/.claude/settings.json`.

## Tool commands

The nine tools live in `tools/<name>/<name>.mjs` and run with Node on every host. Each host reaches them differently:

| Host | How an agent runs a tool |
| --- | --- |
| Claude Code | Slash commands such as `/bgzflow:startup-check`, from `commands/`. They are for the user to type (`disable-model-invocation`), so they add nothing to the always-on skill list. Claude fills in `${CLAUDE_PLUGIN_ROOT}` inside skill and command text, so the command the skills name is a full path. |
| Codex | Codex plugins cannot bundle commands or put files on `PATH`, and Codex does not fill in `${CLAUDE_PLUGIN_ROOT}` inside skill text. The skills say the plugin root is two folders above the skill's folder. |
| Grok | Grok reads Claude-format `commands/` (`grok plugin validate` counts one command dir) and the same skill text. |

A top-level `bin/` folder would put the `tools/bin` shims on Claude Code's `PATH` as bare commands, but claude.ai and Cowork refuse to install a plugin that has one, so this repository does not ship it. Users who want bare commands in their own shell add `<plugin root>/tools/bin` to `PATH`.

## Earlier integrated 0.1.0 tree check (2026-09-30)

The full plugin was exported from git into an ignored temp folder and installed into throwaway homes, with the same CLI versions as above.

- Claude Code: `claude plugin validate --strict` passed for `plugin.json` and the marketplace. Marketplace add from the local path, install and uninstall succeeded. `claude plugin details` listed 14 skills (the eight skills and the six tool commands) and hooks on SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop. Its always-on estimate (about 670 tokens) still counts the tool commands, although with `disable-model-invocation` their descriptions are not placed in context.
- Codex: marketplace add and `codex plugin add bgzflow@bgzflow` succeeded; `codex plugin list` showed version `0.1.0`, `AVAILABLE` and `ON_INSTALL`. The installed copy held `skills/`, `hooks/`, `tools/` and `commands/`. Remove and marketplace remove succeeded.
- Grok: `grok plugin validate` passed with 1 skill dir, 1 command dir and hooks. Install was not run, because Grok 1.0.44 has no home or config-folder switch and install would write the real Grok home.

## Local-source 0.2.0 gate installation

The [candidate-2 host receipt](evidence/candidate-2-hosts.json) identifies the tested implementation commit, installed gate bytes, versions, exits and four hook decisions. Both Claude strict manifests, Claude installation/uninstallation, Codex marketplace add/installation and Grok validation passed. The scratch marketplace pointed to the local candidate clone. Real user homes were not changed; Grok installation was not attempted. The hook smoke invoked the installed gate with host event payloads and local fixture state, without starting a real provider or production release.

The optional `claude plugin details NAME --json` probe exited 1 because this version has no such option. Directory validation chooses the marketplace when both manifests exist; the plugin manifest was therefore validated explicitly by its file path. These observations do not prove a remote-source install or automatic hook interception on a non-Claude lead, which must use the required CLI steps.

## What the generator writes

| File | Role |
| --- | --- |
| `.claude-plugin/plugin.json` | Claude plugin manifest. No hooks or commands paths; default discovery finds both. |
| `commands/<tool>.md` | One slash command per tool, for Claude Code and Grok, generated from the tool list in the script. |
| `.claude-plugin/marketplace.json` | Claude marketplace. Public URL source, owner `socialiserapp-design`; no entry version. |
| `plugin.json` | Codex / Agent Plugins manifest. `$schema` is the first key. |
| `.agents/plugins/marketplace.json` | Codex marketplace. Public URL source; policy `AVAILABLE` / `ON_INSTALL`, category `Productivity`. |
| `.grok-plugin/marketplace.json` | Grok marketplace. Public URL source, owner `socialiserapp-design`. |

Every current marketplace source is `{ "source": "url", "url": "https://github.com/socialiserapp-design/BGZFLOW" }`. Both plugin manifests include the same homepage and repository URL.

Line endings are LF for every text file. `.gitattributes` sets `* text=auto eol=lf`. The repository ships no `.cmd`, `.bat` or `.ps1` files.

## Gaps

- Grok has no home override, so install, update, uninstall, and marketplace add were not executed.
- The Grok marketplace source was accepted only as part of the combined tree.
- Codex has no validate command. The `.agents` file supplied the policy that list printed. A split test of `.agents` against `.claude-plugin/marketplace.json` was not run.
- Codex marketplace upgrade was not run against the local path.
- Claude marketplace remove was confirmed from help and was not executed.
- `owner/repo` marketplace add was confirmed from help. It was not executed, because this repository is not published.
- Whether Grok fills in `${CLAUDE_PLUGIN_ROOT}` inside command text was not checked. Each command says what to use when the path is not filled in.
