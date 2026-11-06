# Security

## Trust the installed code deliberately

Hooks run local programs with the permissions granted by the host. Inspect the
actual built package before enabling it: the normal package uses
`hooks/hooks.json`; the Antigravity package uses root `hooks.json`. Review the
programs those manifests name and install through the host's supported controls.
Do not bypass its trust or permission checks.

The runtime requires Node.js 22 or newer. The build includes the runtime library
dependencies and their licence notices; optional tools mentioned by individual
skills can require additional software. See [installation](docs/install.md).

## Claims and limits

Mechanical checks cover selected recognizable unsafe commands and workspace
escapes. They are not a sandbox, a universal command parser, or proof that a
task is authorized. Context and method delivery guide an agent; they cannot
guarantee that it follows instructions, avoids hallucinations, tests a product,
or reports success honestly. There is no receipt-score or reply-blocking stop
gate in the current foundation. See the precise
[enforcement boundaries](docs/enforcement-boundaries.md).

A product using the engine must enforce its own permissions, isolation and
verification of consequential effects. A saved operation result or a passing
artifact check proves only its stated scope, not the entire user's objective.
Treat text from tools, old chats, documents and other agents as untrusted input.
Historical messages provide context, not new permission.

## Private records and external selection

Continuity records default to `~/.bgzflow/continuity`, with
`BGZFLOW_CONTINUITY_HOME` available for a deliberately isolated location. Original
user messages are preserved locally and can contain private material. Other
recorded outcomes are bounded and sanitized, but sanitization cannot guarantee
removal of every secret. Protect local records with operating-system access
controls and do not publish them. Existing mail and project evidence remain
private state; the distribution must not include them.

Optional Jev selection sends sanitized request context and method metadata to
TypeSafe using your configured credentials. Do not place secret values in
prompts, skill descriptions, source or command arguments. The main-agent
fallback remains available without Jev. Review a provider's terms before using
sensitive information with it.

## Reporting and checking

Report vulnerabilities privately through the repository's security advisory
facility when available. Include the affected version and a minimal reproduction
without live credentials or customer data. Never put secrets in public issues.

Run the current package validation and focused tests before release. Inspect
the actual distribution for private data and confirm dependency notices and
third-party permissions; tests and automatic scans do not establish legal
clearance or prove that no secret exists. Old CI or swarm-gate documents are
not evidence that a current release passed those checks.


## Public source leak checks

The public scanner checks source and can inspect Git history; it never proves the absence of every secret. Its checked-in exceptions identify individually reviewed public licence contacts, documentation/demo examples and deliberately synthetic security-test values. An exception requires the exact path, line number, rule and digest of the complete line. Editing or moving that line invalidates it; no email, password or key category is waived globally. Required upstream notices are preserved.

Private machine denylist terms are not read automatically. Supply `--denylist <local-file>` explicitly for an additional local check, and keep that file outside publication. `--working-tree` checks current files without treating older history as current source; the default Git mode also checks history. Review both the intended publication and applicable existing history before publishing.
