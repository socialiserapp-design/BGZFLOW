#!/usr/bin/env bash
set -eu
mkdir -p .bgzflow
cat > .bgzflow/CHECKPOINT.md <<'EOF'
# CHECKPOINT (social posting app)

OUTCOME: scheduled posts go out on time on the customer's accounts.

CURRENT RULES
- Company-owned test accounts only for live checks.

OWNERS
- lead: this chat. publishing fixes: builder job-52 (finished).

INCIDENTS (this month)
- 3 Oct: posts stopped, cause: token refresh failed, fixed by retrying the refresh.
- 9 Oct: posts stopped, cause: token refresh failed, fixed by lengthening the refresh window.
- 13 Oct: posts stopped, cause: token refresh failed, fixed by clearing a stuck queue entry.

CANDIDATE: none frozen yet.
OPEN FINDINGS: none.
NEXT ACTIONS
1. 14 Oct: posts stopped again, same token refresh failure. Carry on.
EOF
