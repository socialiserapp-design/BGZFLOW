<!-- What is live, in one page. Fill it before a release (BEFORE) and again after the switch (AFTER), then compare
     both with what is actually serving. Names only for secrets and settings, never values. Take times from the
     system clock. Keep one file per release in the project's handoff or release folder. -->
# Live manifest: <project> <release ID>

| Field | BEFORE (live now) | AFTER (this release) | Serving now (checked) |
|---|---|---|---|
| Source commit | <sha> | <sha> | <sha read from the running service> |
| Artifact (build, bundle, function version) | <id or hash> | <id or hash> | <id or hash seen live> |
| Configuration and feature switches | <names and states> | <names and states> | <names and states seen live> |
| Secret names in use (names only) | <NAME_A, NAME_B> | <NAME_A, NAME_B> | <names present in the live environment> |
| Database schema version | <migration ID> | <migration ID> | <migration ID applied live> |
| Oldest supported installed app version | <version> | <version> | <oldest version seen calling the server> |
| Rollback artifact (what to put back) | <id, where it is kept> | <id, where it is kept> | <proof it still deploys> |

Compare: <match / differs, and what differs>. A difference is a finding to explain before the hour of watching starts, not something to ignore.
Checked at: <yyyy-mm-dd hh:mm, system clock> by <role>. Evidence: <command output or link>.
