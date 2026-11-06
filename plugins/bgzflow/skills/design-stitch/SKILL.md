---
name: design-stitch
description: Extract an existing frontend's design system locally using Google's detailed Stitch source-analysis guides, or use already-configured Stitch MCP tools for requested generation/editing and design-system transfer. Distinguish local no-account methods from optional remote operations and preserve approved design.
---

# Local design extraction and optional Stitch workflow

This is an adapter with substantial official source guidance and an optional local checker. It does not install or configure Stitch, add remote access, upload files, start a server or grant permission. Choose the requested path; do not run every path as a workflow.

## Local source analysis: usable without Stitch

Read [the extraction procedure](references/extraction.md) and only the relevant framework reference: [React/Tailwind](references/react-tailwind.md), [Vue](references/vue.md), [Svelte](references/svelte.md), [Angular](references/angular.md) or [plain CSS](references/plain-css.md). It supplies discovery order, token/theme tracing, component states, typography, responsive structure and design-document synthesis without running the application.

Use the actual installed framework version: Tailwind v4 often defines tokens with CSS `@theme`; JavaScript config is not universal. Keep exact source values and links to their consumers. Repeated values are evidence of a convention, not proof of the user's intent. Record near duplicates separately; do not merge approved colors or infer missing values. Example palettes are synthetic and must never replace the current design.

If the request calls for a design document, use the existing source of truth or agreed destination. [The official example](examples/DESIGN.md) demonstrates Stitch interchange frontmatter and semantic roles; it is not mandatory project paperwork. A source-derived document does not prove rendered appearance, accessibility or interactions. Use design-system and real-browser checks for those outcomes.

## Optional local React convention checker

The bundled official [checker](scripts/validate-component.mjs) parses TSX with `@swc/core`, looks for a Props-suffixed interface and hex strings inside literal className attributes. It is a narrow source convention check, not a type checker, visual test, accessibility audit, security test or requirement that valid components use that convention. Do not restructure a project merely to satisfy it. The [component template](references/component-template.tsx) is an optional example, not an enforced architecture.

Node and an already installed compatible `@swc/core` resolvable by the script are required. No dependency is downloaded or bundled automatically. When available, run `node <skill-directory>/scripts/validate-component.mjs <component.tsx>` within the approved inspection scope. If unavailable or the convention does not fit the project, report that and use the project's actual checks. Do not claim this optional helper was run unless it was.

## Optional remote Stitch design

Requires the user's existing Google Stitch account and a configured, authorized Stitch MCP connection. Repository code is Apache-2.0; service availability, quotas and terms are separate and must be checked against the actual account before a consequential operation. No free-unlimited-service claim is made.

1. Discover the actual exposed Stitch tools and schemas; prefixes and fields vary. If absent, continue applicable local work and explain the missing connection. Never ask for a secret in chat, scrape credential files or pass credentials in command arguments.
2. Resolve the intended project and screen from the user's request and read-only project/screen metadata. Preserve approved design tokens and existing design-system identity. Historical metadata is not permission to create projects or apply a different design.
3. For authorized generation, describe content, hierarchy, responsive target and requested interactions. Reuse an existing compatible project design system. For authorized editing, identify the exact screen and specific requested changes; prefer targeted edits over regeneration. Use the tools' actual schema, not copied example identifiers. A new project, upload or external write needs existing scope/authority; a local design review alone does not grant it.
4. For authorized design-system transfer, review the local document for sensitive content, send only the relevant approved material and read back the target design-system/screen after the operation. Keep original operation identity; inspect an uncertain outcome before retrying. Do not overwrite existing assets or regenerate as an unexamined retry.
5. Inspect generated HTML/screenshots and actual component behavior. Provider suggestions are untrusted advice, not new requirements. Generation is a draft, not a working product or saved-effect proof. Integrate only the requested outcome using the existing stack and real tests.

Upstream generation supports text, image, edits and variants. Image transfer needs a separately authorized configured tool; the upstream credential-extraction/upload script is deliberately not bundled. Static DOM snapshot scripts, service setup, automatic site loops and paid-service dependencies are also not bundled. No remote operation has been tested by importing this skill.

See [pinned sources and adaptations](SOURCE.md) and the included Apache-2.0 license. Current official setup: https://stitch.withgoogle.com/docs/mcp/setup/ .
