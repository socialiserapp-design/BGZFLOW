#!/usr/bin/env bash
set -eu
mkdir -p .bgzflow apps/mobile services/api services/billing services/video-worker db/migrations
cat > .bgzflow/CHECKPOINT.md <<'EOF'
# CHECKPOINT (photo-to-video app)

OUTCOME: a customer picks a photo, pays credits and receives a finished video.

CURRENT RULES
- Money stays in provider test mode until the brief names real charges.

OWNERS
- lead: this chat. No lanes started yet.

LAYOUT
- apps/mobile: customer app (screens, upload).
- services/api: HTTP API the app calls.
- services/billing: credits, quotes, charges, refunds.
- services/video-worker: makes the video with an outside provider.
- db/migrations: shared database schema.

CANDIDATE: none frozen yet.
OPEN FINDINGS: none.
NEXT ACTIONS
1. New feature: "photo to paid video" end to end.
EOF
