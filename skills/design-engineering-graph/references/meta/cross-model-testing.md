> BGZFLOW adaptation: use this technical reference only for the current requested outcome. Existing user decisions, actual project architecture and host permissions govern. Numeric examples and aesthetic opinions below are options, not universal rules, new gates or authority to redesign. External products, model weights and licences need current verification before use; none is installed by reading this page. Use the same brief and private project records; do not modify installed learning files.

---
title: cross-model-testing
summary: Test routing, delivered bodies and actual outcomes on the models and hosts the project really supports; report variation and unavailable coverage.
tags: [meta, testing, evals, models]
---

# Cross-model testing

Perplexity's Agents team: *"Sonnet and GPT behave quite differently when it comes to Skills."* What loads on one model may not load on another. What works on Opus may fail on Haiku. Routing precision is model-dependent.

This is non-obvious. Most skill authors test on one model (the one they happen to use) and assume the routing is universal. It isn't.

## What to test cross-model

For each model family you support:

1. **Loading recall** — Does the agent load relevant skills when needed? Use representative positive cases and report misses, uncertainty and actual delivered bodies; ten is not a required sample or proof of perfect recall.
2. **False positives** — Does the agent avoid irrelevant skills when none are needed? Use adjacent-but-distinct and ordinary no-skill cases to detect false positives; there is no fixed ten-case threshold.
3. **Progressive read targeting** — When the skill is loaded, does the agent open the right atomic node? Use meaningful cases mapped to relevant nodes; verify the agent reads that node.
4. **End-to-end output quality** — For a given input (e.g., "review this CSS"), does the agent produce the right output format? Test with the [review-format](review-format.md) table requirement.

## Models and hosts to cover

Use the actual supported provider/model/host pool and observed availability, accounting for shared account capacity. Do not buy calls, switch accounts or add providers solely to satisfy this method. A single-provider project can still test relevant routing and continuation cases; unavailable coverage remains explicit.

## How to run cross-model evals

The upstream repository describes these example evaluation files; they are not automatically installed or executable in this package:

- `loading.jsonl` — query + expected_load (true/false)
- `progressive-reads.jsonl` — query + expected_node
- `end-to-end.md` — sample tasks + expected output structure

To run them:

```bash
# Pseudo — depends on your harness. Common patterns:
agent-eval skills/design-engineering/evals/loading.jsonl --model claude-sonnet-4
agent-eval skills/design-engineering/evals/loading.jsonl --model claude-opus-4
agent-eval skills/design-engineering/evals/loading.jsonl --model gpt-5
```

Compare results across models. Investigate meaningful divergences with the sample size, variation and failure cause in view; five percentage points is not an automatic defect or authority to tune on the test set.

## Possible failure modes to test, not fixed claims about today’s models

1. **GPT loads on broader keywords** — GPT tends to route on noun matches ("CSS", "animation") more aggressively than Claude. If your description uses generic nouns, GPT may load on tangentially-related queries.
2. **Claude Sonnet skips on verbose descriptions** — Sonnet sometimes skips skills with descriptions over ~80 words. Tighten the description if Sonnet recall is low.
3. **Haiku doesn't load multi-node skills well** — Haiku can struggle with the MOC → leaf navigation. Often it stops at the SKILL.md and never opens references. If supporting Haiku, consider inlining critical nodes into SKILL.md.
4. **Opus over-reads** — Opus may open multiple atomic nodes "just in case." Token budget concern; not a routing bug.

## When to run

Run relevant evaluation when an authorised routing, host or method change could affect the requested outcome. Reuse unchanged evidence. No per-summary release gate, paid model council or quarterly schedule is imposed.

## Gotcha

Combine permitted real user cases with deliberate synthetic and adversarial regressions. Synthetic cases are useful when labelled and not mistaken for real-user performance. Source from real user queries (production logs, user feedback, hero queries). Synthetic queries have a flavor that biases the model toward the answer you expect — they tell you the description matches the queries you wrote, not whether it matches reality.

## Sources

- Perplexity Agents team — *"Designing, Refining, and Maintaining Agent Skills"*.
- Anthropic — eval harness patterns.
- Related: [gotchas](gotchas.md), [review-format](review-format.md), CONTRIBUTING.md (upstream companion; not bundled).
