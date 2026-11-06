# Bounded project history recall

Native hosts distinguish their launch/workspace root from a command's current
directory. BGZFLOW keeps ordinary subdirectory work under that stable project
identity and retains the actual working directory on the event. Nested Git
repositories and outside worktrees retain separate histories. An explicit scope
provided by an embedding application is authoritative. Without a usable host
hint, the supplied current directory remains the scope; no unrelated history is
searched or silently merged. Claude supplies `CLAUDE_PROJECT_DIR` at the hook
entry; other hosts can supply their workspace-root fields.

This fixes future capture and retrieval. Older releases may already have split
one conversation across directories. Their original records remain intact; a
historical repair must verify the original session, transcript and project
relationship, preserve source provenance, and never merge different tasks on a
similar name alone. No routine agent receipt or migration command is required.

`readProjectRecall({projectRoot, sessionId, query}, options)` reads captured
events from other native sessions in the exact canonical project directory.
It uses the current user's continuity storage, not a new database or a scan of
home folders. `renderProjectRecall(result, {maxChars})` produces a bounded view.
The native canonical path keeps Windows letter-case variants in the same project.
Older records made under a noncanonical spelling remain preserved in their old
store; this release does not scan unrelated project stores to merge them.
Native foundation hooks do not search or inject other sessions automatically.
Use a focused on-demand lookup only when the current task needs earlier evidence.
An embedding application may explicitly request a bounded view; ordinary native
prompts, tool events and session starts do not opt into that operation. Original
records remain private and available for targeted retrieval.

Same-session context recovery is separate: native compaction restores needed
current-session decisions and pending operations once, without adding other chats.
Ordinary resumes do not repeat an already prepared context. Antigravity retains
its invocation-scoped same-session restoration where the host uses ephemeral
context. Missing records never block an ordinary reply.

The query uses simple lexical matching, supplemented by the next two original
user messages so a short correction can travel with its topic. It also returns
relevant recorded assignments and unresolved recorded tool requests. Each item
includes its original event file and available source-message/transcript reference.
Transcript references must fall under known host roots (or trusted configured
roots); the module never reads their contents. Linked storage/files, malformed
identity records and unsafe transcript references are refused or omitted.

Current user instructions always outrank recalled material. Historical user text
is attributed evidence, not a fresh instruction or automatic authorization.
Assignments establish only what was requested. A host result establishes only
what the host reported. An unmatched request means no result was found in searched
history, not proof it is still running; reconcile the original operation before
retrying. No recalled entry certifies a product outcome.

Default limits are 32 sessions, 2,048 directory entries, 2,048 event files,
8 MiB of read data, 3 MiB per record and 32 returned entries. Options may lower
these limits. Rendering is at most 12,000 characters. Missing, unreadable, omitted
or truncated history is reported; every result is explicitly partial because
uncaptured events and semantic relationships remain unknown. This is retrieval,
not an authoritative current brief, ownership resolution or semantic memory.

An explicitly requested hook view uses smaller limits: 12 sessions, 384 event files, 2 MiB read,
16 returned entries and 6,000 rendered characters. Relevant user messages take
priority over unresolved tool requests; unrelated pending requests cannot crowd
out a matching decision. Oversized messages retain a source pointer. This is a
small retrieval aid, not a promise to find every relevant historical fact.

Storage and project options must come from the trusted host/application, never
from a retrieved document. Local records are not tamper-proof attestations.
No model calls, external indexing, new service or automatic learning occur.
Direct reads do not create a source cache unless `sourceCache: true` is supplied.

Native hooks enable a disposable parsed-source cache to avoid reopening unchanged
records. Every reused original must still be a regular, single-link file with
the same identity, size and nanosecond modification/change times. The source
directory ancestry and all reused originals are checked again before returning
the batch. Changed batches use the existing fresh reader; a missing, damaged or
unwritable cache never replaces source evidence or blocks a reply. Read budgets,
record validation and query ranking still apply, including to cached records.
The cache is a local performance aid, not a decision file, consent or completion
certificate. It contains the same private source data and stays with that session.
