#!/usr/bin/env bash
# Builds a 6,000-line CI log with one real error buried near line 4,817.
set -eu
mkdir -p logs
awk 'BEGIN {
  for (i = 1; i <= 6000; i++) {
    if (i == 4817) print "03:12:44 ERROR [ledger] E4471 balance checksum mismatch for batch 2219 (expected 18233.50, got 18223.50)";
    else if (i % 400 == 0) printf "03:%02d:%02d WARN  [cache] slow lookup %d ms (retrying)\n", (i / 100) % 60, i % 60, 200 + i % 90;
    else printf "03:%02d:%02d INFO  [worker-%d] step %d ok\n", (i / 100) % 60, i % 60, i % 8, i;
  }
}' > logs/ci-run.log
