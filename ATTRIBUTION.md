# BGZFLOW attribution and reuse

This file describes known provenance for the current adaptive foundation. It is
not a blanket licence for every historical file or an assertion that every cited
research system has been implemented.

## First-party package

The repository's [LICENSE](LICENSE) governs its first-party work. Third-party files
retain their own notices and terms. Local adaptations must preserve applicable
attribution and share-alike obligations; the root licence does not override them.

The runtime has external dependencies. The package currently declares the official
`@typesafe-ai/sdk`, `yaml` and `smol-toml`; build and optional evaluation tooling are declared
separately in `package.json`. Distributable bundles must retain the corresponding
dependency notices and licences. Do not describe this package as zero-dependency
or universally offline: using Jev or another provider sends the supplied input to
that configured service.

## Verified testing-skill imports

[The source record](docs/testing-skill-sources.json) identifies upstream revisions,
paths, licences and local adaptations:

| Included skill | Source | Licence |
|---|---|---|
| property-based-testing | [Trail of Bits skills](https://github.com/trailofbits/skills) | CC BY-SA 4.0 |
| mutation-testing | [Trail of Bits skills](https://github.com/trailofbits/skills) | CC BY-SA 4.0 |
| sharp-edges | [Trail of Bits skills](https://github.com/trailofbits/skills) | CC BY-SA 4.0 |
| diagnosing-bugs | [Matt Pocock skills](https://github.com/mattpocock/skills) | MIT |

Per-skill upstream notices are retained. Integration changes align method selection,
authority and verification with the foundation; they do not replace upstream licence
terms. The remaining public skill library has per-skill source and licence records, with additional [design import records](docs/design-library-imports.md). Those records distinguish imported material, adaptations and original methods; installation alone never establishes redistribution rights.

## Jev expansion

The general `bg-jev` entry and six selective Jev specialists adapt the official
TypeSafe skill, IndyDevDan's Hyper Jev/ten-level repository, aaddrick's integration
guidance, n23eos's bounded workflows and laguagu's evidence-evaluation guidance.
[Source notes](skills/bg-jev/references/sources.md) identify what was reused and
changed; [upstream notices](skills/bg-jev/UPSTREAM-LICENSES.md) preserve their MIT terms.
The runtime uses the existing official SDK rather than importing competing clients,
hook systems, confidence gates or private logging defaults.

## Research and architectural influence

The questioning method adapts David Ondrej's `4x4` coverage and Matt Pocock's
dependency-aware grilling, alongside Superpowers' exploration of intent and
alternatives. BGZFLOW uses one shared interview procedure, preserves current
answers, explains trade-offs and permits necessary questions beyond sixteen.
The review method adapts Ondrej's separate harm and occurrence ratings with
BGZFLOW-authored evidence, recovery and urgency guidance. These are adapted
methods, not imports of their authors' complete orchestration systems.

Historical material cites Google research including Elephant-Goldfish, Harness,
CaMeL and co-scientist approaches; Microsoft TokenEconomizer; Anthropic guidance;
and open-source tool and skill libraries. Attribution to an idea does not establish
that its implementation was copied, licensed for redistribution, independently
reproduced or mechanically enforced here.

The current package implements a skill catalogue/selector, supported native lifecycle
adapters, scoped continuity records and limited mechanical checks. It must not claim
complete implementation of those research systems, guaranteed safe autonomy,
automatic learning or a zero-hallucination result.

The prior attribution document is retained in the source checkout's non-distributed
history solely as historical evidence. Its broad clean-room, enforcement and
performance claims are not current attestations. Private historical material is
not intended for public packaging; inspect the final distribution separately.
