# Install the current BGZFLOW

Project decisions use the generic `DECISIONS.md` by default. An existing project
does not need to rename its records: an owner may set `decisionFiles` in the
private `~/.bgzflow/context.json`, for example `{"decisionFiles":["OWNER.md"]}`.
Only Markdown filenames inside the project are read. Embedding hosts can supply
the same `decisionFiles` option. This preference is local and is never bundled
with the public plugin; user corrections and project instructions still govern.

The supported instructions are [HOW-TO-USE](../HOW-TO-USE.md). The current
release number is in `VERSION`. Earlier swarm commands, receipt gates and Node 18
installation instructions do not describe this release.

Use Node.js 22 or newer for the installed runtime. Building from source also
requires the development dependencies and their supported Node version. Run
`npm ci`, then `node scripts/build-foundation.mjs`. The resulting normal package
is `dist/bgzflow`. The build validates a clean candidate before replacing an old
package, retaining the previous package in a sibling backup directory.

For Antigravity, run `node scripts/build-foundation.mjs --antigravity` and use
`dist/bgzflow-antigravity`. Its manifest and rules layout differ from the normal
package. `--stage-only` validates a candidate without replacing either package.

Install the appropriate built directory using the host's supported plugin
controls. Claude Code supports a local trial with `--plugin-dir`. For Codex,
Grok and Antigravity, follow the installed host's documented plugin workflow.
A source checkout, discoverable skill or accepted manifest alone does not prove
hooks run. Verify the displayed version, a real native event, relevant method
delivery and continuity restoration. Desktop Chat, Code and Cowork can expose
different capabilities; do not assume a test in one proves another.

Review changed hooks in the exact host installation that will run the work.
A desktop application and a shell command can use different installed versions;
trust shown by one is not proof that the other will execute a hook. After an
upgrade, confirm an actual new task records its native events and receives the
selected methods. Review only the intended plugin's hooks; never trust unrelated
hooks merely to clear a warning.

Keep a restorable copy of existing settings and the active package before an
upgrade. Remove the old hook registrations through the host's controls; do not
run old gates beside this release. Retain existing project decisions, mailbox
messages and evidence. Do not copy authentication stores or bypass hook trust.
Use the host's supported reload mechanism when available; an application restart
is not a general installation requirement.

Jev access is optional and uses your own protected TypeSafe credentials. Without
it, method selection falls back to the current main agent. Optional skill tools
may need additional software; consult the selected skill before installing it.
See [packaging and host limits](packaging-and-hosts.md),
[enforcement boundaries](enforcement-boundaries.md), and [security](../SECURITY.md).

Historical setup documents describe earlier releases and are not current
installation or acceptance instructions.
