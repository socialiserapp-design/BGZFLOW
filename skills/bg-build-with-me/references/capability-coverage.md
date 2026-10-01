# Capability coverage before optional selection

Read this at admission and whenever the current or next stage changes. Decide coverage from the project's actual facts (surface, platform, domain, risk and approved task), for the current stage and the next stage separately. Optional search or selection adds candidates; it never sets or lowers the minimum.

Each row names a **capability**, not a particular skill. If an installed skill provides it, read that skill's full body and use it. Otherwise apply the pack's own short method below and label the record `pack method`. Well-known public skills are listed only as optional suggestions.

## Coverage table

Each applicable row adds coverage. Carry unchanged reads across stages.

| Class | Trigger | Required capability | Observable application | Optional skills if installed |
|---|---|---|---|---|
| Shared baseline | Every executor | [BG Efficiency](../../bg-efficiency/SKILL.md) | Complete outcome at the lowest cost; selected reads; precise evidence; supported tool fallback | — |
| Stage | Discovery/planning; building/debugging/integration; review; release; recovery | Respectively [discovery](../../bg-plain-english-builder/SKILL.md), [delivery](../../bg-finish-the-whole-job/SKILL.md), [checking](../../bg-check-it-before-release/SKILL.md), [release](../../bg-ship-and-recover/SKILL.md), [continuation](../../bg-continue-my-project/SKILL.md) | The stage artifact and acceptance from the [shared contract](decision-and-delivery-contract.md); the stage name grants no authority | — |
| Software planning | Planning | Written plan method | Dependency, ownership and acceptance plan using existing requirement and contract IDs | `writing-plans` |
| Changed behaviour | Building or debugging | [M1 test first](#m1-test-first) | A meaningful reproducer or test for the changed behaviour | `test-driven-development` |
| Evidence boundary | Building, debugging, integration, review, release | [M2 verify before claiming](#m2-verify-before-claiming) | Exact candidate and actual relevant checks; unchanged valid evidence reused | `verification-before-completion` |
| Reproduced failure | Debugging | [M3 systematic debugging](#m3-systematic-debugging) | Cause traced; failing-before and passing-after result; affected regression checks | `systematic-debugging` |
| Integration and review | Integration; independent review | [M4 review](#m4-review) | Integrated candidate; consolidated findings; builder and reviewer differ | `requesting-code-review`, `code-review` |
| Parallel execution | Two or more independently ready owned tasks | [M5 parallel work](#m5-parallel-work) | Disjoint writes, isolation, accepted dependencies, one integration owner | `dispatching-parallel-agents`, `using-git-worktrees` |
| Every substantive UI | UI on any surface, including desktop, native and chat | [Design skill](../../bg-personal-product-design/SKILL.md), [M6 accessibility](#m6-accessibility), a design-critique pass and the [final polish pass](../../bg-personal-product-design/references/techniques.md#final-polish) on every screen | Approved direction and tokens, complete states, reachable actions, accessible contrast and input, the actual rendered flow | `accessibility`, `impeccable`, `better-ui`, `gpt-taste` |
| Mobile UI | Mobile screen or component work | Platform conventions for flows, density, input, failure and empty states | Native patterns under the approved visual contract | `mobile-app-ui-design` |
| React Native / Expo | RN or Expo building or acceptance | Runtime and version match; one existing token/component authority | No automatic folder or theme replacement | `react-native-best-practices`, `expo-design-system` |
| Native specialists | Expo planning; native motion; native integration/review | Existing project layout; reduced-motion and UI-thread behaviour; measured target-device checks | Evidence from the target device | `expo-project-structure`, `expo-animation`, `expo-react-native-performance` |
| Android acceptance | Android building, debugging, integration, review or release | [M7 real-flow acceptance](#m7-real-flow-acceptance) on a constrained device | Visible test → repair → retest of the exact app and flows | `maestro-mobile-testing` |
| Web UI | Web UI; React web | Coherent approved experience; version-appropriate components and performance | Rendered pages at real viewports | `frontend-design`, `vercel-react-best-practices` |
| Web acceptance | Web or desktop-web building, debugging, integration, review or release | [M7 real-flow acceptance](#m7-real-flow-acceptance) in a visible browser | Customer flow, interactions and failure states; headless tests supplement this | `webapp-testing`, `playwright` |
| Security boundaries | Security, APIs, authentication, authorisation, tenant isolation, secrets; payments imply this row | [M8 security review](#m8-security-review) and [M9 misuse resistance](#m9-misuse-resistance) | Boundary, abuse, retry and failure cases; no certification claim | `security-and-hardening`, `sharp-edges`, `security-audit`, `differential-review` |
| Money and commercial defaults | Pricing, payments, billing, quota, credits, subscriptions, purchases | [M10 money and risky changes](#m10-money-and-risky-changes) with the security row | Approved-environment cases; taxes, fees, margin and entitlements; holds kept | `risky-changes` |
| Subscription provider | A named payments or subscription provider | The provider's own security, state and testing guidance | Purchase, restore, expiry and failure accepted on the target platform | the provider's official skills |
| Shared contracts and language | Shared API, data or component contracts; architecture | [M11 domain vocabulary](#m11-domain-vocabulary) and [M12 interface design](#m12-interface-design) | Existing glossary, C4 identifiers, interface/data versions and requirement IDs in every affected brief | `domain-modeling`, `api-and-interface-design`, `c4-codebase-architecture` |
| Consequential architecture | Explicit architecture work | The row above plus recorded trade-offs and observable quality and failure scenarios | Building workers receive the accepted boundaries | `software-architecture`, `codebase-design` |

Platform floor: Android work needs a verified acceptance profile (runner, device, flow checklist). iOS, desktop and chat surfaces add their own native or channel accessibility, testing, security and delivery requirements from the project contract. Chat facts alone do not imply browser testing: add channel rendering, buttons, length limits and fallbacks. Unknown or missing tooling is a named gap with an owner, an equivalent verification, or the affected acceptance blocked.

UI capability never approves every aesthetic in its sources. The product's approved tokens, component semantics and references stay authoritative. There is no universal dark, glass, bento, glow, scroll-animation or font default. Do not load mutually conflicting style presets to "cover" UI.

## Recording coverage

Write two labelled records, `required-current` and `required-next`, into the existing task packet. Keep every gap with an owner and next action; a tool exiting zero is not complete coverage. If a resolver tool is configured (see [skill selection](skill-selection.md#optional-catalogue-and-judgment-route)), run it once per stage with the full known facts; otherwise apply this table once by hand and label the result `manual`.

Carry the facts, required capabilities, missing coverage, contract versions and any optional selection into each brief. Each executor reads its selected bodies and records actual reads and tool use; the lead checks omissions before the affected stage. An excluded optional candidate never removes required accessibility, platform testing or security coverage. This table selects and reports only: it installs nothing, runs no tools, enforces no ceiling, accepts no candidate and grants no release or financial authority.

## Pack methods

### M1 Test first
Write the test for the changed behaviour and watch it fail (red); make it pass with the smallest change (green); then tidy. A regression test counts only if it fails without the fix. Test behaviour through public interfaces, not a mirror of trivial implementation.

### M2 Verify before claiming
Before any "done", "fixed" or "passing": name the command that proves it, run it fresh and complete, read the full output and exit code, then state only what the output shows. "The agent said it worked" means inspect the diff and run the check. Map requirements line by line; passing tests alone do not meet requirements.

### M3 Systematic debugging
Reproduce the failure; trace it to a cause; compare working and failing cases; test one hypothesis at a time; prove the fix with failing-before and passing-after evidence; rerun affected regression checks. Two repair rounds at most, then report the open findings.

### M4 Review
Review the integrated candidate's diff against the original requirements and the brief's required outputs. Give each finding a stable ID, severity, evidence, owner and closure condition. Consolidate findings per owner. The builder never reviews its own work.

### M5 Parallel work
Dispatch only independently ready tasks with disjoint owned paths. One worktree per writer, one integration owner, and accepted shared contracts before dependent work starts. Drain the ready queue as capacity frees; never exceed real host capacity or the agreed usage ceiling.

### M6 Accessibility
Aim for WCAG 2.2 AA or the platform equivalent. Every action works by keyboard or switch access with a visible focus indicator. Controls expose a label, role and state through native accessibility APIs. Text contrast is at least 4.5:1 (3:1 for large text and control boundaries), measured on the real composite. Text scales to 200% (or the largest platform size) without clipping. Touch targets are at least 44 pt / 48 dp. State is never shown by colour alone. Errors and phase changes are announced. Reduced motion and reduced transparency are honoured. Reading and focus order match the visual order.

### M7 Real-flow acceptance
Run the exact candidate on the target surface: a visible browser, a device or a release build. Exercise the complete customer journey plus loading, empty, error, retry, offline, permission and cancellation states. Test a constrained device separately from the judging device. Test, repair and retest visibly. Label emulator, headless and fixture evidence as such; missing hardware evidence stays an open gap.

### M8 Security review
Threat-model first: map trust boundaries (requests, uploads, webhooks, third-party responses, model output, and values handed over by other processes), name the assets, run STRIDE over each boundary, and write abuse cases as the first tests. Then check:
- input validated at the boundary; parameterised queries; output encoded; HTTPS everywhere;
- passwords hashed with bcrypt, scrypt or argon2; httpOnly, secure, sameSite session cookies; security headers set;
- authorisation (not only authentication) on every protected action; users reach only their own resources;
- server-side URL fetches allowlisted (no SSRF); destructive file operations resolve links, stay under an allowlisted root, sit below that root and carry ownership evidence read beforehand;
- secrets never in code, logs, prompts or URLs, referenced by name only, rotated if ever exposed;
- rate limits on authentication, counted in a shared store when more than one instance runs;
- one committed lockfile, the native audit triaged by reachability, dependency install scripts blocked unless approved, new dependencies reviewed for provenance and typosquats;
- personal data classified, collected for a stated purpose, with retention and a working export/delete path; consent before sharing;
- model output treated as untrusted input; tool permissions scoped; destructive actions confirmed.
Ask before adding authentication flows, new sensitive-data classes, new integrations, CORS changes, upload handlers or elevated roles when the brief does not already authorise them.

### M9 Misuse resistance
For each security-relevant choice point (algorithms, modes, timeouts, flags, constructor parameters), probe zero, empty, null and negative values, defaults, swapped parameters and error paths that silently succeed. Consider the malicious, the lazy and the confused developer. Make the secure path the default, validate configuration and reject dangerous combinations. Classify severity from critical (default use is insecure) to low (needs deliberate misuse).

### M10 Money and risky changes
Give every state-changing or paid operation a durable identity derived from the intent, not the attempt; claim it atomically with a unique constraint; reject a reused key with a different payload; treat every call as success, failure or **unknown**, recording intent before calling out and reconciling unknown outcomes before any retry; keep keys longer than the longest retry path. Release behind reversible flags or staged rollout. Prices include applicable taxes and meet the agreed margin after fees, discounts and landed costs. Test in approved sandbox environments; real charges, store submissions and live trading need the brief to name them.

### M11 Domain vocabulary
Keep one glossary (the [shared glossary](glossary.md) plus the project's own). Challenge terms that conflict with it, sharpen fuzzy ones, stress-test relationships with concrete edge scenarios and check that the code agrees. Update the glossary the moment a term is resolved. Record a decision (ADR or DECISIONS.md entry) only when it is hard to reverse, surprising without context and the result of a real trade-off.

### M12 Interface design
Define the contract (types, schemas, errors) before implementing it. Use one error shape everywhere, validate only at system boundaries, and treat third-party responses as untrusted. Change by addition: new fields optional, nothing removed or retyped without a migration. Keep naming predictable and paginate lists. Every observable behaviour becomes something a consumer relies on, so expose deliberately. State-changing endpoints honour an idempotency key or are documented as unsafe to retry.
