#!/usr/bin/env bash
set -eu
mkdir -p .bgzflow
cat > .bgzflow/CHECKPOINT.md <<'EOF'
# CHECKPOINT (invoicing service)

OUTCOME: invoices v2 live for all customers.
CANDIDATE: 4c1e9a7 (frozen; full suite passed once, evidence/run-17/full.log)

JOBS
- job-55 deploy-staging  RUNNING  operation id dep_9f2  started 21:40 by the lead's shell
- job-56 rehearsal       QUEUED   waits for job-55

OPEN FINDINGS: none.
NEXT ACTIONS
1. When job-55 finishes, run job-56 golden journeys and one rollback on staging.
EOF
echo "machine restarted at 22:05; no node or deploy processes survived" > .bgzflow/CRASH-NOTE.txt
