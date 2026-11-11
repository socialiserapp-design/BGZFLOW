# BGZFLOW

**Product architecture and direction by [Simeon Kontogeorges](https://github.com/socialiserapp-design).**

[GitHub](https://github.com/socialiserapp-design) ·
[LinkedIn](https://www.linkedin.com/in/simeon-konto-soclo/) ·
[X](https://x.com/socloapp) ·
[Instagram](https://www.instagram.com/socloapp/)

**Make AI work worth shipping.**

An adaptive workflow foundation for getting useful, checked results from AI.
BGZFLOW connects a selectively loaded skill library, shared working rules,
context recovery, narrow safety hooks and outcome checks into one portable system.
Use one AI provider or several, within the capabilities of the host you choose.

Simeon's contribution is the system's product vision, workflow requirements and
integration direction: bringing these methods into a coherent working process,
identifying failures in real projects, and driving the adaptations and evaluation
work. Original implementation and substantial adaptations were developed with AI
assistance under his direction. See [authorship and contributions](AUTHORS.md).

## Install

The repository includes a ready-built plugin at `plugins/bgzflow`; ordinary users
do not need to install development dependencies. Use one copy in each host.

**Claude Code, including compatible Desktop Code sessions:**

```sh
claude plugin marketplace add socialiserapp-design/BGZFLOW
claude plugin install bgzflow@bgzflow
```

Reload plugins in an existing session using its supported reload command.

**Codex versions with native plugin support:**

```sh
codex plugin marketplace add socialiserapp-design/BGZFLOW
codex plugin add bgzflow@bgzflow
```

Review BGZFLOW's hooks through the host's normal trust controls. Host versions
differ; do not approve unrelated hooks to clear a warning. Antigravity uses its
separate package from [Releases](https://github.com/socialiserapp-design/BGZFLOW/releases).
See [installation](docs/install.md) and [host boundaries](docs/packaging-and-hosts.md).

## The workflow

1. Understand the intended outcome and clarify consequential unknowns.
2. Select relevant methods, inspect existing solutions and work within the user's authority.
3. Build or produce the requested result, adapting methods as the work changes.
4. Check the actual result and preserve decisions, corrections and remaining uncertainty.

The bundled library contains **103 skills** covering clarification, research,
engineering, product design, accessibility, sound, SVG, testing, risk and recovery.
It includes a design master, specialist design methods and research methods.
Large references and assets stay available on demand.

Explore the [interactive guide](docs/guide.html), [architecture](docs/architecture.md)
and [quality methods](skills/bg-outcome-evals/references/product-quality.md).
The guide is a self-contained HTML file: download it and open it in a browser.

### Quality beyond green tests

BGZFLOW challenges whether the product solves the right problem, finds relevant
external benchmarks and tests actual user outcomes. Its full-spectrum audit covers
product merit, experience, architecture, security, data, performance and AI quality.
Confirmed failures of required outcomes return to the existing repair loop.
Unknown evidence stays unverified; consequential product choices go to the owner.
Expo testing is an independent optional method using Expo's supported workflows.

Skills guide judgment. Hooks deliver context and record events. Trusted configured
checks enforce specific outcome and quality contracts. Installation alone cannot
make an agent autonomously deploy and verify every application: connect the
project's real release, completion receiver and observation tools. See
[enforcement boundaries](docs/enforcement-boundaries.md).

Optional Jev routing uses the official TypeSafe SDK and your own protected key.
Without it, the main agent selects from the same library. Jev can recommend
methods and an execution arrangement; the host supplies actual model capacity,
tools and permissions. A model catalogue does not create extra worker capacity.

## What makes the parts work together

The shared contract keeps the latest user decisions above method defaults.
Methods contribute expertise without granting authority, adding unrelated work or
forcing a separate process. Original source and attribution remain traceable.

```mermaid
flowchart LR
  A[User request] --> B[Scope and clarification]
  B --> C[Relevant method selection]
  J[Optional Jev] --> C
  C --> D[Agent work and real tools]
  H[Host permissions] --> D
  D --> E[Outcome checks]
  E --> F[Result and remaining limits]
  D --> R[Source-backed continuity]
  R --> B
```

BGZFLOW's integration work includes complete selected-procedure delivery,
stage-sensitive reselection without compulsory planning, native event-based
continuity, source-backed follow-up recovery, limited mechanical checks and tests
of saved outcomes. SuperAgent-inspired session interfaces separate delivery from
consumption and reconcile uncertain actions before replay; host integrations must
supply genuine observations. No manual success receipt is required.

## Evidence and limits

The [verification report](docs/verification-and-performance.md) separates local
regressions, actual host observations, routing measurements and unverified effects.
Tests inspect real files and hidden inputs; a model saying "done" is not proof.

Automatic selection is advisory and can be wrong. A large or unavailable method
must not discard other useful recommendations: incomplete comparisons are marked
**partial**, with the remaining sources available to the main agent. The agent
still needs to check domain, prerequisites and the user's actual task before
applying a method. External skill libraries have not all been rewritten or tested
as part of this bundle.

BGZFLOW cannot guarantee obedience, zero hallucinations or complete recovery in
every app. Hooks cannot intercept every arbitrary shell or embedded tool action.
Some worker controls need host support. Simple arithmetic smoke tests made zero
Jev calls; this does not prove a general speed or cost improvement.

## Develop and verify

```sh
npm ci
npm test
npm run build
npm run build:antigravity
```

Source builds are written to `dist/`. The committed ready-built plugin is a
release artifact. Normal use does not require running BGZFLOW commands manually.
See [the foundation design](docs/adaptive-foundation.md),
[enforcement boundaries](docs/enforcement-boundaries.md) and
[contributing](CONTRIBUTING.md).

## Licence and acknowledgements

Original BGZFLOW work uses the [MIT licence](LICENSE). Imported code, methods and
assets retain their own terms, including some copyleft and asset-specific terms.
The whole collection must not be described as universally MIT-licensed.

[Third-party notices](THIRD_PARTY_NOTICES.md), [source records](ATTRIBUTION.md) and
per-skill notices explain where material came from and how it was adapted.
Those sources underpin the work; BGZFLOW's original contribution is the integrated
workflow, its working contract, adaptations, host connections and evaluation design.
Research references do not imply endorsement or implementation of an entire paper.


Native private learning can retain source-linked proposals during ordinary work. Actual failed tools are recorded quietly; no background model job or manual user form is required. A preconfigured owner evaluator must prove a baseline failure corrected on regression and unseen cases before a procedure is adopted and delivered in later project sessions. Missing checks leave it unverified; this is not an always-on autonomous optimizer. See [native learning](docs/native-learning.md).

### Efficiency in 2.7.7

BG Efficiency now has a small automatically delivered baseline and focused references
for output/retrieval, routing/caching, learning/measurement and simple implementation.
The references load only when relevant; no additional always-visible specialist skill
entries, compressors or paid selectors are required. Existing tools remain optional.

Supported hooks deliver the baseline once per native context or worker and restore
it after compaction. Same-session recovery no longer prints overlapping native and
raw-history views or repeats the host's summary. Original records remain available.
Owner-disabled automatic paid routing and on-demand other-chat history are preserved.

Validation: 55 focused continuity/hook checks and three adapter/delivery checks passed;
both host packages passed dependency and instruction-link validation. These are local
checks, not a claim of lower bills or verified usage in every host. The host must enable
and load the updated plugin. See [efficiency sources and boundaries](skills/bg-efficiency/references/mechanisms.md).

### Jev consultations in 2.7.8

Choose locally first; consult Jev for a useful bounded judgment instead of running
catalogue-wide comparisons around every message or tool call. Automatic remote
selection requires explicit owner opt-in; it stays disabled on this installation.
The supported live judgment command now requires a stable original-task identity,
reserves one attempt before sending, reuses identical successful answers, and falls
back locally after a used or uncertain attempt. Workers must share the task identity;
changing working directory cannot mint another allowance. Ask before additional use.
This is enforcement in BGZFLOW's command path, not a provider-wide spending control
against arbitrary programs using the same API key. Embedding applications own task
identity and permissions. Cached answers report zero new token usage.
