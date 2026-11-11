# Automatic completion reviews

Ask for the result in ordinary language: "Finish the export feature" or "Fix the duplicate booking." You do not need to name a review skill. The build and finish methods apply the appropriate [audit](../skills/bg-full-spectrum-audit/SKILL.md) before reporting a software feature or repair complete.

The agent chooses the scope from the work and its consequences:

- A feature: the complete user journey, surrounding system effects, missing needs and better approaches.
- A repair: the cause, all affected callers and states, and meaningful regression checks.
- A whole-product or codebase audit: the wider request, or a demonstrated broader issue that needs investigation. A small repair does not automatically become a whole-product redesign.

The existing review and release policy still applies. Reuse relevant unchanged evidence. Verify a repair without starting an unnecessary second release review. A recommendation does not grant permission to change the product.

## What the code does

The existing foundation hook supplies a short local completion-review reminder after a recognised direct edit returns without a reported error. It delivers once per substantive request and native context generation. Failed and explicit no-change results do not qualify. The reminder is restored after supported compaction. Antigravity receives it at its next supported invocation because its PostToolUse response cannot carry that context.

The hook does not decide that a feature is finished. It does not establish that a review happened, that tests passed, or that a customer outcome works. It makes no paid selection call and adds no Stop gate. The agent reads the actual audit skill and chooses the appropriate scope. Complex shell writes and generic execution wrappers are not parsed into asserted edits; the build/finish instructions still require the appropriate review.

## Expo stays separate

[Expo testing](../skills/bg-expo-testing/SKILL.md) is an independently usable method for an app's end-to-end tests. An audit can use Expo evidence when relevant; an Expo run does not need a full audit. Neither method requires the other.

Once an app has a suitable workflow, test accounts/data and permission for the cloud use, the agent can include that existing workflow while checking a relevant feature or repair. Set up triggers through the project's supported CI configuration when requested. Missing setup or access remains an explicit coverage gap; other authorised checks continue. Merely installing BGZFLOW does not configure an Expo account or schedule paid runs.

## Installation and evidence

The reminder requires the updated runtime hook as well as the new skills. A personal skill loader supplies a method but cannot upgrade a running host's hooks. Use the host's supported package update and reload process; do not claim a current conversation has new behaviour just because a candidate package builds.

Automated tests cover native context delivery, failed and no-change results, deduplication, compaction and Antigravity deferral. Those tests prove the delivery mechanism. Real review quality and real app outcomes need their own evidence. See [enforcement boundaries](enforcement-boundaries.md).
