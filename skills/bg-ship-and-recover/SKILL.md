---
name: bg-ship-and-recover
description: Use for exact-candidate real-platform rehearsal, a small authorised launch with an hour of live watching, and recovery without repeated reviews or lost data or money.
---

# BG Ship and Recover

Retain [BG Efficiency](../bg-efficiency/SKILL.md), original requirements, accepted decisions, actual release authority and surviving holds. The lead decides from evidence; workers execute within their brief. Candidate-only work stops at handback. Review or rehearsal never grants spending or release authority.

Why: repeated reviews missed real launch failures: "every failure was something no review could see" ? runtime, binding, provider, database and restart differences. Rehearse the actual platform before exposing customers.

1. **Bind the frozen candidate.** Match source SHA, artifact, dependencies, configuration, environment, target account and rollout scope. Build whole with fast worker checks, then run the combined full suite once. Keep actual output, exits/counts and failed/interrupted results. Never silently substitute a build.
2. **Rehearse and prove recovery.** Deploy the exact candidate to preview, staging or hidden production with matching runtime, bindings, database version, secrets and real provider accounts. Money stays in test mode; apps use TestFlight/internal tracks. Run all scripted golden journeys and one rollback. Inspect compatible schema, data, money, entitlements and in-flight operations: code rollback does not reverse irreversible effects. Record `swarm-gate record rehearsal` against the SHA with journey output and rollback evidence. Fix real failures in the same owner's job and rerun rehearsal on the repaired SHA until it passes. Use the [app-store ladder](references/app-store-release.md) and [OTA compatibility](references/ota-updates.md) where applicable.
3. **Use exactly one independent review per release.** Follow [BG Check It Before Release](../bg-check-it-before-release/SKILL.md). One fresh read-only review blocks only reproduced wrong money, data loss, security/privacy or missing rollback. Everything else goes after-launch, including reviewer design findings. Keep the stable release ID and finding IDs across repairs. Never dispatch a second review or review a repair. Rerunning rehearsal proves a repair; no `ready` verdict is needed.
4. **Complete the final design step for customer-visible changes.** The founder checks the verified build on their phone or a capable device using TestFlight, internal track or preview. Record their chat-authorised `matched` or `mismatch` result on this exact SHA. Only their "doesn't match the approved design" blocks on design. Reviewers never block design; non-UI releases have no design-check hold.
5. **Launch small and watch for an hour.** The lead accepts passing real-platform rehearsal with no open reproduced blocker, records it and continues without asking the founder to accept a review. Check `swarm-gate check-release` immediately before release. Carry actual authority, budget, owner and holds; use [flags and staged rollout](references/flags-and-staged-rollout.md). Launch behind switches or to a small group, verify deployed identity and customer flows, and watch live errors for the first hour. Widen only when healthy. Refer to credentials by name; keep values out of prompts, commands and logs.
6. **Fix forward or roll back.** Pause expansion on real failure and contain within authority. Reconcile durable operation IDs before retrying uncertain deployments, submissions or paid effects. Match the original job/thread/workspace, preserve work and repair with the same owner. Prove recovery and the repaired SHA with another rehearsal, never another review. Two fix waves are the limit; further waves need the founder's chat authority with open IDs and a recommendation. Continue authorised containment while escalating. Use the [incident runbook](references/incidents-and-postmortems.md).
7. **Hand back actual live evidence.** Record staged, deployed and verified-live identities separately, actual output, exit/timeouts, device/platform proof, monitoring and rollback. Update the bounded checkpoint with limits, next owner and action. Announcements/customer messages need existing authority. Local ledgers cannot certify semantic truth; inspect proof handbacks and whole rehearsal.

```text
Release: ID | SHA/artifact/config/environment | target/scope | actual authority
Rehearsal: golden journey output/exits | rollback proof | exact candidate
Review: one job/thread | reproduced blocker categories | other findings after-launch
UI only: founder design result | chat reference | phone/capable device | SHA
Launch: small group/switches | deployed identity | one hour live errors | expand/contain
Recovery: durable operation IDs | rollback/fix-forward | repaired-SHA rehearsal
Handback: evidence/gaps/holds | next owner/action
```
