# swarm-resources

Run `node tools/swarm-resources/swarm-resources.mjs [--json] [--swarm <task-id>]` to inspect resources. Save only the founder's explicit choice with `--swarm <task-id> --approve <id1,id2,...>`. The tool does not dispatch, log in, read credentials, call a network service or buy capacity.

It detects CLIs on PATH, cloud homes and private ROUTES.md resources. Custom routes use the [resource table](../../overlay-template/ROUTES.md). Installation, authentication, approval and proof remain separate. Refresh nonsecret provider status with `--observe <status.json>` as described in [the gate guide](../../docs/swarm-gate.md). Observations expire after five minutes; unknown, ambiguous or logged-out current identities cannot reuse cached proofs. Never export tokens or read credential files. A home and `Qualified: yes` are clues, not readiness. Only a dated passed job matching the observed current account/environment and configured settings makes a route available. Costs and entitlement are verified separately.

## Qualification

An approved unproven route gets one small qualifying job through its supported host route. Prove entitlement, effective filesystem/approval/network and service access, account/environment, effective model/effort and return. Cloud return must name the exact returned commit. Save the measured result:

```shell
node tools/swarm-resources/swarm-resources.mjs --save-proven <proof.json>
```

The proof object requires `id`, `at` (past ISO timestamp), `jobId`, `account`, `environment`, effective `model`/`effort`, `access`, `returnRef`, `evidence` and `result: "passed"`. Use private scope aliases, never secrets. A cloud `returnRef` is a full commit hash. Put exact supported model/effort and optional `Account`/`Environment` scope columns on the private route table: mismatches cannot become proven. Reuse only the same scope/capabilities and verify current access before dispatch. Proof over 30 days old gets a warning, not age-based invalidation. Failed/future/malformed proofs never overwrite valid evidence. No proof is fabricated by this tool.

Overlay: `BGZFLOW_OVERLAY`, otherwise `~/.bgzflow/overlay`. State: `swarm-resources-approved.json` and `swarm-proven-routes.json` under the directory resolved by `bg-swarm` (`BG_SWARM_DIR` overrides it). Saving creates the directory. Invalid state fails closed; invalid selections do not overwrite approval. Approval may include a configured unproven route for qualification, but never makes it dispatch-ready. Only matching workspace/swarm approval carries authority; the last set recommends only still-proven routes. Keep each swarm's approval, limits/ceiling/check-and-fix reserve, dispatch identities and persistent wave count in its checkpoint.

Exit 0: inspection/approval succeeded. Exit 2: bad arguments, invalid selection or unreadable/malformed configuration/state. Use `--help` for usage. Unit tests: `node --test tools/swarm-resources/test/swarm-resources.test.mjs`.

## Discovered tiers

`--refresh-models --policy <private-policy.json>` records each installed route's CLI version, listing/help evidence and proposed light/standard/heavy-write/heavy-read settings in `swarm-model-map.json`. Configure `listingCommand`/`versionCommand` argv arrays where the executable needs a supported wrapper. Provider default/flagship markers and user choices determine strength; the plugin has no model ranking. Missing catalogues retain existing maps and warn; explicit user choices still need qualification.

`swarm-gate refresh-models` starts small exact-flags qualification jobs only after approval, current account observation and budget checks. Native local probes retain real terminal exit/output and accepted flags. Other routes configure `qualificationCommand` and return their exact job proof through `record qualification`. No uncertain or failed probe is automatically retried. Every tier requires matching observed settings; thinking is checked where the provider uses it. New flagship adoption is opt-in, false by default. Running jobs and the swarm's original map stay pinned. See [the gate guide](../../docs/swarm-gate.md) for fallbacks and expiry triggers.
