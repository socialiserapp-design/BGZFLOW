# Using BGZFLOW

## Build and install

Use Node.js 22 or newer. In a source checkout, install the locked dependencies and
build the package:

```sh
npm ci
node scripts/build-foundation.mjs
```

Install or load `dist/bgzflow` through your agent host's supported plugin interface.
For a local Claude Code trial, its documented `--plugin-dir` option accepts the
built directory. The repository's marketplace entry also points to that build, so
build first when adding this checkout as a local marketplace. A remote marketplace
release must include the corresponding built files.

For Antigravity, build `node scripts/build-foundation.mjs --antigravity` and use
`dist/bgzflow-antigravity` through its supported plugin interface. For Codex and
Grok, use the installed host's documented plugin controls. Confirm the new version
and a real start/prompt event before assuming native integration works. Do not
bypass hook trust, copy account credentials or silently switch accounts.

Host references: [Claude plugins](https://code.claude.com/docs/en/plugin-marketplaces),
[Grok plugins](https://docs.x.ai/build/features/skills-plugins-marketplaces).

## Optional Jev access

Supply your own TypeSafe key through `TYPESAFE_API_KEY`, a protected file selected
by `FAST_JEV_KEY_FILE`, or your protected home `.typesafe_key` file. Keep its value
out of chat, source control and command history. The runtime uses the official
TypeSafe SDK and sends sanitised selection context and method descriptions.

Jev is optional. Without available access, BGZFLOW reports that the current main
agent must choose methods from the catalogue. It does not invent a pass or block
ordinary work. See [TypeSafe's selection example](https://docs.typesafe.ai/cookbooks/skill_suggestion)
for the upstream method and its measured limits.

## Jev beyond routing

Invoke `bg-jev` with the outcome you want. It can combine useful judgments without
running every method. Six selective companions cover research/evidence, testing and
evaluation, context and records, scope/risk, composed workflows and app integration.
The [method guide](skills/bg-jev/references/methods.md) maps IndyDevDan's ten levels,
explains all four Jev question types and shows the shared on-demand helper.

The specialist names are `jev-research`, `jev-quality`, `jev-context`, `jev-risk`,
`jev-workflows` and `jev-build`. Start with `bg-jev` when you want it to choose the
useful combination. Loading one of these skills does not itself call the service.
For example: “Use bg-jev for our current task. Make a useful live Jev judgment
within the existing permissions and usage settings, tell me whether it answered
and how its answer helped, then continue using it selectively.” Check that the
current conversation can read the installed skills; use the host's supported
same-conversation refresh if it still has an older library.

`judge --stdin --live` performs authorised typed judgments; omitting `--live` gives
a local preview. This adds no automatic hook or new record store. Scores and routing
suggestions never grant permission or replace real outcome checks. Images and Box
are experimental; the main agent remains the fallback when Jev cannot help.

## Design specialists

Use `bg-personal-product-design` as the main design entry. It selects from
`design-direction`, `design-product-flows`, `design-system`,
`design-accessibility`, `design-content`, `design-motion` and `design-native`.
You can request a specialist directly. A clear wording edit does not require a
new visual direction; a native layout change does not require every platform.
The methods share existing decisions and evidence rather than seven workflows.
See [what was adapted and why](docs/design-skill-sources.md).

## Everyday work

Describe the result you want in ordinary language. State an important priority or
boundary when you know it. The agent should ask about consequential uncertainty,
inspect facts it can discover itself, choose useful methods, and execute within
your permissions. An explicitly named skill takes precedence over automatic picks.

Selection is reconsidered when the goal, stage, approach or available resources
materially change. Unchanged work reuses the relevant selection. A single provider
can do the whole job; independent workers or checks are used where they help and
where real capacity exists. Different model names do not mean separate allowances.

For consequential work, decide what observable result would count as success.
Agents must check the actual result, including relevant saved state or external
operation, and say what they could not verify. A skill being selected or a test
passing is not evidence that the intended product works.

## Optional commands

```sh
node tools/bgz.mjs --help
node tools/bgz.mjs catalog
node tools/bgz.mjs route --request "Investigate the existing failure without changing the product" --stage investigate
```

In an installed build, substitute `tools/foundation/bgz.mjs` for `tools/bgz.mjs`.
`route --stdin --json` accepts structured request context for application adapters.
It selects and loads methods; it does not execute the requested work.

Existing local mailbox callers can keep using `tools/bg-mail/bg-mail.mjs` with
the same project, sender and recipient arguments. `bgz mail` is a forwarding alias.
Preserve the existing mailbox location and pending messages when upgrading. This
local coordination facility is not permission to contact customers or other people.

## Upgrading from an older BGZFLOW

Keep a restorable copy of the currently active plugin and host settings. Replace
the active package with the current built package using the host's normal controls;
do not leave old hooks registered alongside the new ones. Check actual hook events,
context restoration and method delivery. Retain project decisions, mail and evidence.
Old score/receipt/council commands are retired rather than mapped to fake success.

[Enforcement boundaries](docs/enforcement-boundaries.md) explain what the portable
plugin can observe, and what requires an application's own trusted execution layer.
