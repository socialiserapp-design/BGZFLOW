---
name: design-token-build
description: Compile an existing compatible DTCG token source into concrete CSS variables, including aliases, composite values and source-defined dark overrides; inspect the output before integrating it.
---
# Build design tokens from their real source

Use this when the requested web change needs an actual token build, not simply because it uses CSS. Recover the approved tokens and current build first. Prefer an existing suitable compiler; this bundled implementation is a concrete alternative for the supported schema described in [usage](references/usage.md).

Run the bundled script with `--in` pointing at the authorised token file or directory. Without `--out` it prints CSS; use an owned destination only when a write is authorised. It needs Node 22 or later and no external package, network, model or key. The bundled samples are optional upstream example values, never a new product theme.

Preserve the current token names and semantics or explicitly map a requested migration. Do not impose dark mode, spacing, fonts, breakpoints or a component architecture. This compiler emits source-defined groups; it is not a universal DTCG validator or a native-code generator. Native projects should use their existing appropriate format/toolchain.

Compilation fails for malformed input, unresolved aliases or no recognised groups. Inspect emitted variables and compare affected rendered components, supported theme modes and accessible state pairs. A generated file alone does not prove the real app loaded it or that its colours are readable. Retain actual results in the existing records; no receipt, new design file or release gate is introduced.

The user's current task and host permissions govern all writes and integration. See [source and modifications](SOURCES.md).
