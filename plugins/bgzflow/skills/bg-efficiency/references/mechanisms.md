# Sources and integration decisions

BG Efficiency is BGZFLOW's coordinated implementation, designed by Simeon Kontogeorges. These are source-linked design influences and optional integrations, not a claim that all packages are installed or run. This release adds original guidance and delivery code; it does not vendor these external implementations.

| Source | Use in BGZFLOW | Boundary |
|---|---|---|
| [OpenAI skill guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) and [Agent Skills](https://agentskills.io/specification) | Small master and selectively read resources | No giant prompt or duplicated specialist catalogue |
| [Anthropic extension guidance](https://code.claude.com/docs/en/features-overview) | Separate guidance from executable hooks | Injected hook output still costs context; host support differs |
| [TokenEconomizer](https://github.com/microsoft/TokenEconomizer) | Existing repository lessons and failure-loop handling | No duplicate judge; count its model calls; restore pruned tools when needed |
| [RTK](https://github.com/rtk-ai/rtk) | Suitable shell-output filtering | Preserve original evidence and command semantics |
| [Headroom](https://github.com/headroomlabs-ai/headroom) | Recoverable result reduction, stable cached prefix | No double lossy filtering or automatic proxy installation |
| [Context Mode](https://github.com/mksglu/context-mode) and [Anthropic code execution](https://www.anthropic.com/research/code-execution-with-mcp) | Local processing, indexed originals, narrow retrieval | No copied source-available implementation or extra memory daemon |
| [Requesty caching](https://docs.requesty.ai/features/auto-caching) | Provider-aware caching and honest accounting where we own API calls | Not Requestly API-testing software; no service dependency or endpoint switch |
| Existing Ponytail guidance | Reuse and smallest complete implementation | No mandatory persona, terse fragments or reduced outcome |
| Existing Graphify/CodeGraph evaluation | Fresh targeted code relationships | No universal index winner; dynamic callers require source checks |
| [Formin token-saver](https://github.com/formin/token-saver), [token-efficiency](https://github.com/mohvfx/claude-code-token-efficiency), [Octopus](https://github.com/angwdev/octopus) | Compared tool division, targeted reads and deterministic work | Exclude fixed model tiers, forced fresh chats, routine reports and mandatory workers |
| [JetBrains trial](https://blog.jetbrains.com/ai/2026/07/rtk-claude-code-token-savings/) | Measure completed-task cost and quality | Output reduction is not a bill-saving benchmark |

Specialists are referenced directly from the master. Automatic baseline delivery requires an enabled supported hook, uses no model calls and is claimed once per native context/worker. No skill can guarantee model judgement; executable invariants and observed outcomes are tested separately.
