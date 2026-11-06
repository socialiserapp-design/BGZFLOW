# Sources, adopted methods and limits

BGZFLOW is an adaptive workflow foundation: it selects relevant methods from a
large library, supports current user intent, preserves useful task context and
helps verify actual outcomes. It can support one agent or multiple available
agents. No fixed provider, team size or five-guide bundle defines the workflow.

The current behavior contract is [AGENTS.md](AGENTS.md), with the design and
acceptance boundaries in [adaptive-foundation.md](docs/adaptive-foundation.md).
[Enforcement boundaries](docs/enforcement-boundaries.md) distinguish native host
controls, implemented helpers and instructions that still depend on the agent.

## What is reused

- The catalogue discovers installed skill metadata and loads selected bodies.
  The selector uses the official TypeSafe SDK when available, with the current
  main agent as fallback. Selection is advice about relevance, not authorization
  or proof that an executor applied a method.
- Native lifecycle adapters preserve task messages and relevant observed events.
  They use host-supported hooks and native continuation. This is not a replacement
  conversation engine, semantic memory guarantee or forced fresh-chat policy.
- Focused mechanical checks cover supported operations; the host's permissions
  remain the security boundary. They are not a complete shell sandbox.
- Specialist skill content includes retained upstream methods and local adaptations.
  [The attribution overview](ATTRIBUTION.md), per-skill notices and
  [testing-source records](docs/testing-skill-sources.json) describe known provenance.
  Installation alone does not establish a redistribution licence.

## Research informs design; it does not certify implementation

Google's Elephant-Goldfish, Harness research, CaMeL and co-scientist work; Microsoft
TokenEconomizer; Anthropic's agent and evaluation guidance; and upstream skill
libraries offer useful hypotheses or methods. Their presence in historical notes
does not mean BGZFLOW implements those complete systems or reproduces their results.

The relevant ideas include preserving stable task context, choosing tools and
expertise by need, isolating independent work, verifying sources and effects, and
measuring outcomes before adopting changes. Each proposed technique needs tests
in its actual host and task. Consult [primary design references](docs/adaptive-foundation.md#primary-design-references)
when present and the original authors' sources; do not treat an old description as
a current capability or a guarantee of improvement.

## Test and improve

Use direct assertions for observable facts and independent assessment for judgments
where useful. Test that checks reject realistic failures. Compare candidate changes
with retained cases and appropriate unseen cases, including regressions and usage.
A model score alone is insufficient to declare success.

Shared improvements require appropriate public evidence and meaningful tests.
Private user or team history stays private. The connected session API now supports
task-driven private text-procedure candidates, owner-configured regression and
unseen checks, adoption into the same selector, and rollback. These methods stay
in the originating private project. This does not implement an always-running
autonomous research lab or guarantee that a growing library gets better.
Do not claim eliminated hallucinations, guaranteed savings or commercial success.

## Historical material

Private historical overviews and retired workflow descriptions are excluded from this public tree. Historical source claims do not establish current behaviour or redistribution rights.

Before publishing a package, review the actual included files for licences, notices,
private information and working references. Keep private operational history outside
public distribution. A source-only correction does not establish deployment or
successful execution in an already running session.
