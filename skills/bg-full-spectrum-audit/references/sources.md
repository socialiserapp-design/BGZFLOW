# Source map and method origins

This is an original synthesis of public guidance, reviewed 11 November 2026. Sources inform questions and methods; they do not certify the audit, establish universal thresholds or require every organisation's process. Check the applicable version and current capabilities before relying on a changing external interface. Select the relevant sources instead of loading all of them into every review.

## Product judgement and discovery

- [SVPG: four product risks](https://www.svpg.com/four-big-risks/) and [discovery judgement](https://www.svpg.com/discovery-judgement/): value, usability, feasibility and viability are different questions. Technical correctness alone cannot answer them.
- [GOV.UK: understand users and their needs](https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs), [solve a whole problem](https://www.gov.uk/service-manual/service-standard/point-2-solve-a-whole-problem) and [join up across channels](https://www.gov.uk/service-manual/service-standard/point-3-join-up-across-channels): investigate the actual problem and surrounding service, including gaps between organisations or channels. Apply the perspective without importing public-sector obligations into unrelated projects.
- [Google: HEART and user-centred metrics](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/) and [GOV.UK: define success](https://www.gov.uk/service-manual/service-standard/point-10-define-success-publish-performance-data): connect goals, signals and useful measures; combine performance evidence with research.
- BGZFLOW's [parallel concepts](../../research-owl-parallel-concepts/SKILL.md) and `principle-exhaust-the-design-space` provide existing methods for exploring distinct approaches and comparing them. The audit's proactive omission search, counterfactual questions and opportunity report are synthesis, not a claim that one source supplies a universal product score.

## Experience and accessibility

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Android accessibility testing](https://developer.android.com/guide/topics/ui/accessibility/testing) and [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): use applicable web and native guidance, with actual task testing as well as automation.
- [W3C internationalisation](https://www.w3.org/International/quicktips/): language, text direction, encoding and localisation foundations; choose concrete locale/data cases from the product's supported context.
- [Microsoft human-AI interaction](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/): evaluate initial use, ongoing interaction, error and adaptation over time.
- [Diataxis](https://diataxis.fr/) and [Command Line Interface Guidelines](https://clig.dev/): documentation and developer interfaces are part of the usable product. Test consumer tasks instead of counting pages or flags.

## Architecture and correctness

- [Google: what to look for in review](https://google.github.io/eng-practices/review/reviewer/looking-for.html) and [review standard](https://google.github.io/eng-practices/review/reviewer/standard.html): design, function, complexity, tests and context, with evidence rather than personal preference or perfectionism.
- [SEI ATAM](https://insights.sei.cmu.edu/library/the-architecture-tradeoff-analysis-method-2/) and [quality attribute workshops](https://www.sei.cmu.edu/library/quality-attribute-workshop-collection/): use concrete scenarios to examine competing quality attributes and business goals.
- [Azure architecture styles](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/) and [AWS Well-Architected pillars](https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html): compare suitable approaches and their operational, security, reliability, performance, cost and resource tradeoffs. Cloud-specific recommendations require a relevant environment.
- [Domain-Driven Design reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf): consistent meaning within bounded contexts and explicit translations between them.
- [Google AIP-180](https://google.aip.dev/180), [GitLab migration guidance](https://docs.gitlab.com/development/database/avoiding_downtime_in_migrations/), [AWS idempotent retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) and [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html): test compatibility, mixed versions, atomic operation identities and concurrency. Adapt database-specific details to the actual engine/version.

## Security, privacy and AI

- [OWASP ASVS](https://asvs.owasp.org/) (5.0.0 inspected) and [MASVS](https://mas.owasp.org/MASVS/): use relevant application/mobile security requirements, including real trust boundaries and platform storage/permissions.
- [NIST SSDF](https://csrc.nist.gov/pubs/sp/800/218/final) (1.1 final inspected) and [SLSA build track](https://slsa.dev/spec/v1.2/build-track-basics) (1.2 inspected): examine development and artifact provenance, not only dependency scanner output. Check draft versus final status before claiming conformance.
- [W3C privacy principles](https://www.w3.org/TR/privacy-principles/): data minimisation and agency across the data lifecycle. Legal applicability needs its own jurisdiction-specific source and expertise.
- [NIST generative AI profile](https://doi.org/10.6028/NIST.AI.600-1), [OWASP prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) and [excessive agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/): evaluate output, context, adversarial inputs and actual tool authority. A model-generated review is not a security boundary.

## Operations and test evidence

- Google SRE: [monitoring](https://sre.google/sre-book/monitoring-distributed-systems/), [reliability testing](https://sre.google/sre-book/testing-reliability/), [release engineering](https://sre.google/sre-book/release-engineering/) and [data integrity](https://sre.google/sre-book/data-integrity/): measure relevant behaviour and prove release/recovery claims.
- [DORA test automation](https://dora.dev/capabilities/test-automation/) and [Google coverage guidance](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html): fast, trustworthy evidence is more useful than a large brittle suite or an unsupported coverage target.

## Public review skills inspected

These influenced the review handoff and evidence discipline, not the entire product method. No third-party skill body is copied here.

- [David Ondrej's GPT review](https://github.com/davidondrej/skills/blob/ad5bedde50a6e92229d04938c4af263755a1c36e/skills/agent-orchestration/gpt-review/SKILL.md) (MIT): neutral independent scope, inspect the actual candidate, distinguish uncertainty and preserve the completed report. BGZFLOW chooses capable available reviewers dynamically; the author's fixed model, reasoning level, speed and host are not requirements.
- [Anthropic's code review](https://github.com/anthropics/claude-plugins-official/blob/c905cd8fec340e465dd66990b82b95b6e45db212/plugins/code-review/commands/code-review.md) (Apache-2.0): scoped instructions, finding validation and deduplication. Its deliberately narrow introduced-defect scope does not define this broader audit.
- [Superpowers requesting code review](https://github.com/obra/superpowers/blob/bb92a77741419a4ab5f06e711a283343f1ada0c3/skills/requesting-code-review/SKILL.md) (MIT): exact candidate, surrounding requirements and a fresh read-only checker. Existing project review depth governs when to dispatch.
- [Trail of Bits differential review](https://github.com/trailofbits/skills/blob/4b1b74b181e81cbcaa8d3b68a0e4ed867165b972/plugins/differential-review/skills/differential-review/SKILL.md) (CC-BY-SA-4.0): concrete attack scenarios, caller/history context and explicit coverage. This reference describes ideas; copying or adapting its text requires the relevant licence treatment.
