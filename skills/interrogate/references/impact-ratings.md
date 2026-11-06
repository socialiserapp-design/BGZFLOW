# Rate findings by harm and occurrence

Use this within the existing review, not as another review round or required
form. Give each material finding two separate ratings when the evidence supports
them: **harm 1–10** and **how often 1–10**. An unknown rating is valid. Explain
the consequence and basis in ordinary language; the numbers summarize judgment,
not measurement precision or permission to act.

## Harm if the problem occurs

Rate the credible demonstrated or supported consequence in the stated context.
Do not rate an imagined worst case without the chain of conditions that makes it
plausible. State the affected people, data, money, rights or work and the scale
of exposure separately.

| Harm | Plain-English anchor |
|---|---|
| 1–2 | Minor inconvenience or presentation defect, readily corrected, with no material loss or misleading conclusion. A style preference alone is not a defect. |
| 3–4 | A local, reversible mistake or extra work affecting a limited task or user; an ordinary workaround exists. |
| 5–6 | An important task fails or produces a materially wrong result; meaningful rework or recoverable loss follows. |
| 7–8 | Major disruption, substantial financial or data harm, sensitive disclosure, or a materially harmful professional or business decision; recovery is difficult. |
| 9–10 | Catastrophic or irreversible harm, such as serious safety consequences, loss of critical data or funds, or extensive sensitive disclosure. Explain the credible route to that consequence. |

Choose an integer or a justified band; do not manufacture decimal precision.
If harm cannot be assessed, state what is missing. Recovery and reversibility
must be described explicitly, even though they inform the harm judgment.

## How often in a named population and time period

Define the denominator before assigning a rating: eligible requests, sessions,
documents, people, deployments or another relevant exposure unit. Name the
platform/version and observation period where known. Distinguish observed counts
from an estimate of future occurrence. Do not turn a small test sample into a
claimed production percentage.

| How often | Qualitative anchor within the stated exposure scope |
|---|---|
| 1–2 | Exceptional occurrence under a supported rare combination of conditions. |
| 3–4 | Occasional occurrence in a minority of relevant uses. |
| 5–6 | Recurring occurrence in a common relevant scenario. |
| 7–8 | Frequent occurrence across most relevant journeys or conditions. |
| 9–10 | Almost every or every eligible use under the stated conditions. |

These are ordinal descriptions, not fixed probability or percentage bands.
Give raw observations when available, such as “2 failures in 20 eligible test
requests on this build”; label the rating an estimate if it generalizes beyond
them. Keep the conditional trigger and the overall exposure separate: a defect
may fail every retry after a rare timeout without affecting every request.
When the exposure rate or denominator is unknown, write **how often: unknown**
and name the observation needed. Unknown does not mean zero or 1/10.

## Evidence, recovery and action are separate

- **Confirmed:** a reproduction, direct source reasoning or a reliable observed
  record establishes this finding and its relevant trigger.
- **Probable:** evidence supports the concern but a material condition or causal
  link remains to be checked. Name it.
- **Unverified:** a hypothesis or report lacks adequate direct support. State
  the next check; do not present it as a proven defect.

Also state who or what is affected, whether damage can be undone, the available
recovery, and the recommended urgency and next action. Urgency depends on actual
exposure, timing, available containment and obligations as well as harm; it is
not another name for severity. A high-harm probable issue can warrant prompt
verification without being falsely called confirmed.

Prioritize credible actual harm and the strongest evidence. Keep a rare
catastrophic failure visible rather than averaging it away. Never multiply harm
by frequency into a single automatic pass/fail score, order issues by reviewer
vote count, or create a new release gate or customer restriction from a rating.
Existing authority and applicable release requirements still govern repairs.

One compact finding can carry the information without a new form: the problem
and evidence; harm and occurrence basis; affected scope and recovery; urgency
and next action. Merge duplicate reports of the same cause; multiple reviewers
repeating a claim are not independent proof of its truth.

## Apply the same questions outside software

For documents, research, marketing and professional work, examine unsupported
claims, misleading omissions, wrong calculations, outdated or inapplicable
sources, privacy exposure and actions readers may take. Define occurrence over
relevant documents, recipients or decisions rather than inventing request rates.
Distinguish a wrong conclusion from a stylistic preference; use qualified domain
expertise when the consequence calls for it.

For a security vulnerability requiring CVSS, use the applicable official CVSS
method and retain its vector and context. This BGZFLOW harm/occurrence rubric is
not CVSS. FIRST explains that a CVSS Base score measures vulnerability severity
and does not alone determine contextual risk.

## Sources and adaptation

The separate harm and occurrence questions are adapted from David Ondrej's
[gpt-review](https://github.com/davidondrej/skills/blob/main/skills/agent-orchestration/gpt-review/SKILL.md)
and [total-review](https://github.com/davidondrej/skills/blob/main/skills/agent-orchestration/total-review/SKILL.md),
under that repository's [MIT licence](https://github.com/davidondrej/skills/blob/main/LICENSE).
BGZFLOW supplies the anchors, evidence distinctions and domain adaptation here.
The upstream fixed models, permission mode, reviewer count, voting order and
approval-to-fix process are not adopted.

Security context: [FIRST CVSS v4.0 User Guide](https://www.first.org/cvss/v4.0/user-guide).
