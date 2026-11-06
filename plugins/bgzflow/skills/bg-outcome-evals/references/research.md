# Research informing the workflow

Reviewed 4 November 2026. These sources support particular design choices, not a
claim that one universal workflow or evaluator is best for every task.

- Anthropic, *Demystifying evals for AI agents* (9 January 2026): distinguish tool
  traces from real environment outcomes; combine appropriate graders and maintain
  meaningful task sets. https://www.anthropic.com/research/demystifying-evals-for-ai-agents
- *SWE-Clar* (22 October 2026): evaluates clarification understanding separately
  from implementation on real client commissions. Motivates checks that answers
  changed the implementation, not rewarding question count alone.
  https://arxiv.org/abs/2610.31854
- *AEVAL* (July 2026): separates skill execution and grading, retains first attempts
  and repairs. Its repeatable test protocol does not make sampled models deterministic.
  https://arxiv.org/abs/2607.16345
- *SkillsBench* (February 2026): skill usefulness varies; test selection and added
  value rather than assuming a larger bundle helps each task.
  https://arxiv.org/abs/2602.12670
- Anthropic, skill-creator evaluations (March 2026): test both whether a skill fires
  and whether its instructions improve work, using blind comparisons where suitable.
  https://claude.com/resources/articles/improving-skill-creator-test-measure-and-refine-agent-skills
- TypeSafe, skill suggestion cookbook: catalogue selection plus richer rechecking;
  selection still needs reliable delivery and actual behaviour checks.
  https://docs.typesafe.ai/cookbooks/skill_suggestion
- OpenAI, self-improving tax agents (May 2026): evidence-backed corrections become
  tests and candidate improvements. A domain case study, not proof for every field.
  https://openai.com/index/building-self-improving-tax-agents-with-codex/
- OpenAI, evaluation/production behaviour gap (3 November 2026): performance under
  evaluation need not reflect ordinary deployment; retain live observation.
  https://alignment.openai.com/eval-production-behavior-gap

No model score proves a statement true. For consequential claims require applicable
sources and direct checks where possible; explain uncertainty and obtain qualified
human judgment where the user's task calls for it.
