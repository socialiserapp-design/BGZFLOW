# Compiler scope and use

From the skill directory:

```text
node scripts/build-tokens.mjs --in samples/tokens
node scripts/build-tokens.mjs --in <owned-token-directory> --out <owned-output.css>
```

Use absolute script/input/output paths when running elsewhere. Input can be a directory containing `colors.json` and supporting JSON files, or a self-contained JSON file. Known colour groups are `primitive`, `semantic`, optional `component` and optional `dark`. Supported non-colour group mappings are listed in the script's `GROUPS`: typography, spacing, radius, elevation, focus rings, motion, sizing, opacity, blur, z-index, breakpoints and chart colours. Names follow the upstream compiler's mapping, not an arbitrary project's naming scheme.

Alias chains resolve across file prefixes and supported relative aliases. Composite font-family arrays, cubic-bezier arrays, shadows and transitions have concrete CSS serializers. Existing supported dark overrides are re-resolved into component colours and relevant shadows. No dark block is emitted when the source has no dark output. Not every DTCG type or arbitrary root shape is supported: inspect the source mapping and resulting CSS before adopting it. In particular this is not a colour-space conversion tool or a replacement for a general schema validator.

The sample directory retains the upstream full token set for a real end-to-end compile demonstration. Its palette, type scale and modes are proposals only. It has no host hook or automatic project-copy operation. `--check` is accepted for compatibility; failed aliases always fail, and validation occurs before output replacement. A successful compile still needs relevant browser and app-state verification.

Offline compiler regressions: `node --test test/build-tokens.test.mjs`. They use only a temporary directory inside this skill and remove their own files afterwards; no browser launches or dependency installs occur.
