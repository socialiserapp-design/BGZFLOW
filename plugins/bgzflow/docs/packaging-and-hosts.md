# Packaging and host checks

Build from the source checkout with its locked development dependencies. The
runtime package requires Node.js 22 or newer; source development also depends on
the minimum Node version required by the locked build and evaluation tools.
The package includes the TypeSafe, YAML and TOML runtime dependencies and notices.
It does not bundle optional skill toolchains such as Java/TLC or a diagram renderer.

`node scripts/build-foundation.mjs --stage-only` creates and validates a new
candidate without changing the current distribution. Add `--antigravity` for the
Antigravity layout. Every build starts from an empty candidate directory. Only
modules reachable from the declared runtime entrypoints are included, together
with explicitly required resources and the current skill library.

Validation follows local Markdown file and heading links inside the actual staged
package. Referenced documents must be shipped; a source-tree copy is insufficient.
This includes optional continuity, decision and release examples, which do not
require agents to create new forms. Markdown parsing and heading checks run only
at build time and are not loaded into chats. External links are not fetched by
this check; factual accuracy and current external guidance need separate review.

Without `--stage-only`, a validated candidate replaces the selected distribution.
The previous package is renamed into the sibling `.bgzflow-backups` directory.
Neither failed candidates nor prior packages are silently deleted. A failed build
leaves the previous distribution in place. Promotion refuses linked package paths
or nested Git metadata; these require an owner to resolve them deliberately.

The normal package has the Claude-compatible plugin manifest and lifecycle hooks.
The Antigravity package has its native hook manifest and `rules/AGENTS.md`; install
the appropriate layout, not both. Native host trust and installation controls still
apply. Copying a directory does not prove the host loaded its hooks.

A supported update can invalidate previously trusted hooks even when their source
looks familiar. Use the host's own review controls for the authorised plugin only;
never trust all unrelated hooks or manufacture trust hashes. Confirm that the
current hooks are active and observe fresh native prompt/tool records after the
update. A historical trust entry or enabled plugin flag is insufficient. Keep the
failed activation evidence separate from the successful repair. On Codex hosts
that clamp SessionEnd timeouts, the host's effective timeout governs.

Use a fresh host process for this activation check. An already-running Codex
settings view can retain an older trust view after a plugin update. The native
evaluation runner reads the fresh host's hook status before starting its model
task, leaves unrelated pending hooks alone, and still requires actual prompt/tool
events afterwards. This is an evaluation check, not extra startup work or a new
permission grant for ordinary chats.

Grok can read Claude-compatible plugin settings. Check its effective configuration
with `grok inspect --json`, as well as its own plugin registry. The local Grok Build
1.0.70 inspection found the enabled BGZFLOW 2.3.2 plugin, all 54 skills and its hook
file through the Claude-compatible configuration even though `grok plugin list`
returned an empty list. That is discovery evidence, not proof that a model task
executed the hooks. Do not install a duplicate solely because one registry is empty.

Existing local compatibility aliases may be junctions to the current plugin.
Inspect their actual targets before calling them stale or replacing them. Prefer
the host's plugin-qualified skill name when it reports a name collision; resolve
the actual installed plugin location before following sibling references or running
its helper. Neither a directory's age nor its presence proves activation.

The runtime is JavaScript, but this is not evidence of identical host behavior on
Windows, macOS and Linux. Before claiming a host/platform works, check its actual
plugin discovery, Node executable, writable private state directory, native event
payloads, context restoration, tool effects and uninstall/rollback behavior.
Claude Desktop chat, Claude Desktop coding/Cowork, Claude Code, Codex, Grok and
Antigravity are distinct surfaces; success on one does not certify the others.

Run `node --test scripts/test/packaging.test.mjs` for isolated artifact checks.
These verify clean packaging, dependency closure, normal/Antigravity layouts and
retained rollback copies. They do not call a model or certify desktop behavior.

Public redistribution also requires provenance and applicable notices for each
included imported skill. Root MIT metadata does not relicense third-party content.
The package validator checks structural completeness; it is not legal clearance,
a secret scanner, or proof that all optional skill dependencies are installed.
