# Adaptive questioning and informed choices

`bg-plain-english-builder`, `grill-me` and `4x4` use one
[shared procedure](../skills/bg-plain-english-builder/references/question-round.md).
Their names express different entry points, not three interviews or three sets
of records. Four areas help discover important omissions: outcome, approach,
practical delivery and failure. They do not impose a count. More than sixteen
questions is appropriate when meaningful unknowns remain; the number itself
is neither a quality measure nor a stopping rule.

Start open-ended when the purpose or taste is unknown. Later, compare credible
choices fairly through their real outcome, upside, downside, reversibility and
uncertainty. Explain why advice fits the user's stated priorities and when another
option wins. Preserve original answers in the supported native records, apply
them to the actual work, and revisit affected decisions after new evidence.
No silence, vague answer or recommendation creates permission.

## Sources and deliberate adaptations

- **David Ondrej, 4x4:** [pinned source](https://github.com/davidondrej/skills/blob/ec0b0c87d016d0db0260b0c7368624897baaea39/skills/thinking-and-docs/4x4/SKILL.md),
  MIT; notice beside the new skill. Retained the four coverage areas and adapting
  later questions to earlier answers. Replaced the fixed question count, no-options
  rule, research ban, ban on success questions, guessing vague answers and follow-up
  limit. The current authorised task determines what happens after questioning.
- **Matt Pocock, grilling:** [source](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling),
  MIT. Inspected the local upstream clone and licence. Adopted the idea that a
  decision exposes dependent questions and that discoverable facts are the agent's
  work. Did not adopt wording every question so “yes” accepts the recommendation,
  mandatory fresh subagents, an exhaustive frontier or a final approval ritual.
- **Superpowers, brainstorming:** [source](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md).
  Inspected the current instructions. Used open-ended discovery before offering
  choices, checking existing context and concrete approaches. This is a method
  influence, not a copied workflow; its mandatory design-document approval,
  forced writing-plans handoff and one-question format are not imported.
- **Anthropic, 27 October 2026:** [How AI agents shape experts' judgment calls](https://www.anthropic.com/research/agents-judgment-calls).
  Fifty analysts used agents deliberately given hidden preferences on a statistical
  task. Their choices often followed those preferences. This motivates getting the
  user's own view and explaining the strongest case for alternatives. It does not
  prove this procedure eliminates bias: the study strengthened the agents' preferences
  and used one task, field and model. Balanced presentation here is a design choice
  to test, not an experimentally established remedy.
- **REVOIR, September 2026:** [Rational Clarification by Assistive Agents via Value-of-Information Reasoning](https://arxiv.org/abs/2609.37588).
  This preprint argues for judging a question by how its answer changes task success,
  rather than reducing uncertainty indiscriminately. Its results concern two assistive
  benchmarks and it is under review. BGZFLOW adopts that practical evaluation question;
  it does not implement or claim the paper's inference method or reported performance.
- **CIGAsk, EMNLP 2026:** [When and How Should an Agent Clarify?](https://aclanthology.org/2026.findings-emnlp.314/).
  Separates choosing whether to ask from asking a disambiguating question. Its training
  recipe and benchmark gains are not implemented here; prompt instructions alone are
  not represented as equivalent to its reinforcement learning.
- **AskBench, ACL 2026:** [When and What to Ask](https://aclanthology.org/2026.findings-acl.845/).
  Evaluates missing intent and false premises in multi-turn interactions. BGZFLOW uses
  those as useful test categories, not as a claim of reproducing the benchmark or its
  trained policy.

## Acceptance examples

These are review scenarios, not evidence that native models were run in this change.
Judge resulting questions and subsequent actions, not keyword counts.

1. A vague new product: first elicit the desired outcome without a leading menu;
   later compare real approaches using the user's answer.
2. Seventeen consequential open decisions: continue to the next needed question
   rather than stop at sixteen; do not add trivia to reach a target count.
3. An informed choice: each option exposes a concrete outcome and material downside;
   the recommendation states its basis and when an alternative is preferable.
4. “I'm not sure”: identify missing facts or demonstrate the difference; do not treat
   uncertainty as acceptance of spending or a product choice.
5. A false premise: verify it, explain the correction and reframe the choice instead
   of asking which misleading option the user prefers.
6. A late correction or prototype finding: change affected actions, preserve unrelated
   settled decisions and ask the newly consequential follow-up.
7. Several questioning skills selected: use one shared procedure and existing answers;
   no duplicate interviews, new ledgers or repeated approval of a summary.
8. An already clear small task: proceed within authority; do not force four categories
   of questions or pause independent work for an unrelated unknown.
