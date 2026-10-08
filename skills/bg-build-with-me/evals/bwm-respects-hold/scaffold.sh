#!/usr/bin/env bash
set -eu
mkdir -p .bgzflow
cat > .bgzflow/CHECKPOINT.md <<'EOF'
# CHECKPOINT (booking app)

OUTCOME: customers can book, pay a deposit and get reminders.

CURRENT RULES
- HOLD H-3: no payments or deposit work until the refund policy is decided (decision D-12, open).

OWNERS
- lead: this chat. reminders package: builder job-31 (running).

CANDIDATE: none frozen yet.
OPEN FINDINGS: none.
NEXT ACTIONS
1. Reminders package: integrate when job-31 hands back.
2. D-12 refund policy: founder to choose (recommendation: full refund up to 24 h before the booking).
EOF
