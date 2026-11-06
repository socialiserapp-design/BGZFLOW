# Source and modifications

Adapted from [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills/tree/def84a70fadc3490d80901295a4f1951fdb2cc69), revision `def84a70fadc3490d80901295a4f1951fdb2cc69`, inspected 5 November 2026. Original author/copyright: Thientan Soparat, 2026, MIT; preserve [UPSTREAM-LICENSE](UPSTREAM-LICENSE).

Substantive imported artifacts: `scripts/build_tokens.mjs` becomes `scripts/build-tokens.mjs`; `tokens/*.json` becomes `samples/tokens/*.json`. No upstream hook, host settings, default project instructions, paid service or dependency installer is included.

Changes: Windows-safe file-URL and basename handling; samples remain isolated from a project's active theme; unresolved aliases always fail before output replacement; empty unsupported sources fail; malformed input has a bounded error without echoing token data; absent dark overrides do not impose a dark-mode output block. Documentation scopes the actual supported input shapes and task authority. The serializer and alias/group mappings remain substantive upstream code, not a rewritten generic method. Local regression cases cover real sample output, alias/composite resolution and failed-input artifact preservation; these do not establish rendered accessibility.
