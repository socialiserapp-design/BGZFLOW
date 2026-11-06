# Native recovery after a lost reply

This public synthetic fixture uses an actual loopback HTTP service. A submission
is persisted in an owner-controlled directory and its socket is then closed before
the client receives a result. The first native host receives a correction to the
requested colour and makes one attempt. A fresh conversation in a different host
must recover the current decision and original operation, inspect the saved effect
and avoid another submission.

Keep service state outside the worker workspace. Preserve the service's original
submission/persistence observations, both native transcripts and continuity events.
Check the actual saved colour, original operation identity, one submission only,
on-demand cross-session retrieval and the worker's honest final claim. Preserve failed
attempts. This fixture does not certify a production service, real payment or device.

The owner prepares the workspace and starts/stops its service. Native hosts retain
their existing permissions: no automatic trust grant or bypass flag is part of the
test. A missing host permission or hook event remains an explicit coverage limit.

Native host transport status is checked separately from the task result. An actual
Antigravity turn returned `SUCCESS` with an empty answer and a denied terminal
action after reading the draft. `antigravity-result.mjs` rejects this outcome;
the original turn remains preserved. An available answer is still insufficient
without the saved-effect, correction, continuity and duplicate-attempt checks.
