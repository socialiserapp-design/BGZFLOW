# Native foundation hooks

The active [hook manifest](hooks.json) invokes `foundation.mjs` for supported lifecycle events and `mechanical-safety.mjs` around supported tool operations. `foundation-agy.mjs` adapts the supported Antigravity envelope; its build generates the matching host manifest.

The foundation records original task events in the owner’s private storage, restores useful context after native continuation and selects relevant methods when intent or stage changes. Selection and recorded tool output do not establish user approval, verified completion or a successful external effect. It does not run legacy clarity scores, receipt gates, fresh-chat requirements or reply-blocking Stop gates.

Mechanical checks cover a limited set of identifiable shell/file operations and obvious secret exposure. They are not a complete parser, sandbox or substitute for native host permissions. Read [the enforcement boundaries](../docs/enforcement-boundaries.md) and [host packaging instructions](../docs/packaging-and-hosts.md) before enabling hooks.

Build the appropriate host package from source, install through the host’s supported plugin interface and approve its current hooks where required. Installation alone does not prove activation. Verify real delivery on the actual host; missing or unsupported surfaces remain unverified. Do not install legacy hook scripts or bypass host trust.
