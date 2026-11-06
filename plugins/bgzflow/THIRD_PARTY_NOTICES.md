# Third-party methods and licences

BGZFLOW's original code is MIT-licensed. That does not relicense imported work.
Individual imported skill directories carry their own upstream licence and the
source record in `docs/testing-skill-sources.json` identifies the revision and changes.

The design master and seven specialist adaptations also use inspected methods from
Anthropic frontend-design and Impeccable (Apache-2.0), Interface Design, Vercel Web
Interface Guidelines and SwiftUI Expert (MIT). Complete notices, including the
Impeccable NOTICE and its referenced platform-design MIT notice, are retained under
`skills/bg-personal-product-design/licenses`. The adaptations change scope,
selection, style mandates, records and verification. See
[design sources](docs/design-skill-sources.md) and its pinned source manifest;
the upstream libraries are not installed or executed wholesale.

- Matt Pocock, diagnosing-bugs: MIT; copyright notice retained in its directory.
- Trail of Bits, property-based-testing, mutation-testing and sharp-edges:
  Creative Commons Attribution-ShareAlike 4.0 International. Those imported and
  adapted skill files and their references remain under that licence.
- TypeSafe JavaScript SDK: MIT. Used as a dependency; copyright/licence included
  in runtime dependency notices when bundled.
- YAML: ISC. Used to read standard skill metadata.
- [smol-toml](https://github.com/squirrelchat/smol-toml): BSD-3-Clause.
  Used to read native Codex plugin settings; the parser and complete notice ship
  with the runtime, so installations do not need another package download.

## David Ondrej methods

The `4x4` skill adapts the four-area interview structure from
[David Ondrej's skills](https://github.com/davidondrej/skills/tree/main/skills/thinking-and-docs/4x4).
The review guidance also uses the separate harm and occurrence questions from
that repository's `gpt-review` and `total-review` skills. Source work is MIT,
copyright 2026 David Ondrej; the full notice is retained with `4x4`.
BGZFLOW changes question depth, option explanations, record integration and
evidence-based ratings. It does not adopt fixed providers, permission expansion,
mandatory reviewer counts or the upstream restrictions on follow-up questions.

## Cursor plugin methods

The following retained or adapted methods come from
[cursor/plugins](https://github.com/cursor/plugins). Each listed directory retains
the applicable complete MIT notice in `UPSTREAM-LICENSE`.

- Cursor Team Kit (manifest author Eric Zakariasson; copyright 2026 Cursor):
  `control-cli`, `control-ui`, `deslop`, `verify-this`.
- pstack (copyright 2026 Lauren Tan): `architect` reference material,
  `create-verification-skill`, `how` reference material,
  `maintain-verification-skill`, `principle-prove-it-works`, `tdd`, and
  `statechart`. The statechart copy is based on the older JavaScript implementation,
  not the current upstream TypeScript implementation. Historical source was
  inspected at `70cfb966c374f092f04d37375d2417b622d0c2cc`.
- Advisor (copyright 2026 Cursor): `advisor`, extensively rewritten for scoped
  optional consultation.
- Grok Voice (manifest author Eric Zakariasson; copyright 2026 Cursor):
  `grok-voice`, adapted to preserve product scope and require real voice testing.

Local changes align authority, selective loading, native continuation, dependency
setup and outcome verification. Identification of a source is not a claim that the
local copy equals the current upstream release. See
[the skill audit](docs/skill-harmony-audit.md) for the file-level distinction.

The remaining general workflow procedures are BGZFLOW-authored or rewritten
syntheses. Cited research and professional techniques are influences, not claims
of copied implementation or endorsement. Original BGZFLOW text is MIT-licensed;
the separate imported notices above and the CC BY-SA methods remain applicable.

Additional existing attributions remain in `ATTRIBUTION.md` and individual source
directories. Research citations explain influences; they do not imply endorsement,
validated superiority, or that a paper's full system has been implemented.

The Jev method expansion adapts MIT-licensed guidance by TypeSafe AI, IndyDevDan /
AgenticEngineer.com, aaddrick, n23eos and Jev Skills contributors. Their complete
notices are in [Jev licences](skills/bg-jev/UPSTREAM-LICENSES.md); exact sources and
integration changes are in [Jev provenance](skills/bg-jev/references/sources.md).

The evaluation runner is an optional development dependency. It is not loaded in
ordinary user tasks. Its own dependency licences apply when installed for evaluation.

The substantive design expansion imports MIT-licensed specifications and code by
Thientan Soparat (plugin87), Emil Kowalski and olzn, and Apache-2.0 material from
Google Labs Stitch. Each new method retains the full applicable licence and pinned
source/adaptation notes in its directory. See [design expansion](docs/design-expansion.md).

The later [Taste/AgentsORG/Owl import](docs/design-library-imports.md) retains
MIT source notices for Leonxlnx, HKTITAN and MC Dean in their respective skill
directories. Taste photographs/icons also retain their distinct asset-specific
licences, attribution and source metadata; they are not all MIT. The aggregate
identifier [LicenseRef-Taste-Assets](LICENSES/LicenseRef-Taste-Assets.txt) points to
the complete per-file terms, copied with every full runtime export.

Recoverable assignment and follow-up patterns adapt the MIT-licensed DeepSeek
Harness Team SuperAgent prototype, revision 8c32a9dc5d72c033816c6a8110b37f40cf94fba4.
The full notice is in [DeepSeek licence](LICENSES/DeepSeek-SuperAgent-MIT.txt);
[adaptation and boundaries](docs/automatic-methods.md) distinguish implemented
patterns from optional host integration and unadopted policies.
