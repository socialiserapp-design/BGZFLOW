# AgentsORG import checks

Run `node --test evals/agentsorg-import/tools.test.mjs` from the source root.
These checks use Node only and create disposable synthetic fixtures in the OS
temporary directory. They do not delete prior attempts, contact providers,
install dependencies, play audio or open a browser.

The tests inspect actual generated PCM samples, WAV channel/rate/duration/peak,
deterministic cue output and onset report, SVG layers/holds/IDs/escaping/timing,
reduced-motion fallback, fresh-output behavior, linked output ancestry, preview
side effects, help and complete graph link closure. They do not certify perceived
sound quality, visual rendering, provider integration, browser policy or automatic
native skill selection. The release owner tests those surfaces separately.

The complete graph has 201 reference Markdown nodes at the pinned source revision.
Its control nodes are adapted to BGZFLOW; the technical pages are selectively read
reference material, not automatically injected instructions or a second router.
External tools and model-weight licence claims in source notes need current primary
verification before use. No such model, account or dependency is included.
