# Jev sources and local adaptations

Reviewed 5 November 2026. This is an adapted method set, not a claim that every
upstream program, benchmark or experimental capability has been reproduced.

- [Official TypeSafe skill](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md), MIT: question design, judgments versus application decisions, batched independent questions, current primitives, uncertain/absent outcomes and live evaluation.
- [IndyDevDan's Hyper Jev](https://github.com/disler/ten-levels-of-jev/tree/main/.claude/skills/hyper-jev), MIT: ten-level examples, combined judgments, agent-written questions and composed uses. [Video](https://www.youtube.com/watch?v=_U-O5lYhJ7Q). The source repository was inspected; this is not a claim to have watched the complete video.
- [aaddrick's building-with-typesafe-jev](https://github.com/aaddrick/building-with-typesafe-jev), MIT: prior-art discovery, concrete question criteria, distinct probability/score meanings and diagnosis of bad results. Its older model pin and generic concurrency/threshold suggestions are not adopted as universal defaults.
- [n23eos's fourteen-skill pack](https://github.com/n23eos/jev-skills), MIT: bounded selectors, first-test prioritisation, citation checks, review/CI triage, exact-value selection and evaluation-gap selection. BGZFLOW folds these into relevant specialists rather than installing another CLI, settings store and opt-in ritual.
- [laguagu's Jev skills](https://github.com/laguagu/jev-skills), MIT: current cookbook discovery and evidence evaluation, separating retrieval coverage, judgment quality and whole-task benefit. Unverified third-party model/provider claims are not added to BGZFLOW's available model catalogue.

The upstream MIT notices are retained in [licences](../UPSTREAM-LICENSES.md).
BGZFLOW adaptations use one task brief, authority model, SDK connection and native
record path. Skills do not require every method at once, grant permissions, replace
real tests, force fresh chats or create manual receipts. Public examples are synthetic.
This is authored integration guidance, not a wholesale import of the upstream runtimes.

Additional ready-made projects discovered: [jev-kit](https://github.com/jonathanavis96/jev-kit)
has document classification, file search and other infrastructure examples;
[jev-codes](https://github.com/kushwho/jev-codes) supplies a specialised code-audit
tool. Discovery is not an installation or endorsement. Review actual code, licence,
supported environment and data handling before embedding either runtime. They are
not necessary to activate the shared Jev skills and are not installed by this change.

Primary current references:

- [Models and limits](https://docs.typesafe.ai/models), [question API](https://docs.typesafe.ai/api/system-one), [confidence](https://docs.typesafe.ai/confidence).
- [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Score](https://docs.typesafe.ai/primitives/score), [Box](https://docs.typesafe.ai/primitives/box), [images](https://docs.typesafe.ai/images).
- [Parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions), [citations](https://docs.typesafe.ai/cookbooks/citation_check), [feature discovery](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery).
- [Independent benchmark, revised 29 October](https://arxiv.org/abs/2609.37647): evaluated Jev 1.13, including weak sequential-action results. It does not establish current BGZFLOW task success or Jev 1.14 accuracy.
- [JevSpawn](https://arxiv.org/abs/2610.00437): research on adapting finite action sets with feedback and retained alternatives. A useful research direction, not a drop-in skill or reproduced BGZFLOW benchmark.

The official organisation is `typesafe-ai`; the similarly named `TypeSafeAI`
community organisation states that it is unofficial.
