<!-- The decisions index for this project. Two lists, both with stable IDs: never renumber, reuse or delete.
     A later decision supersedes an earlier one by ID; keep both rows.
     Verify accepted IDs against the candidate at integration (composition) and again at the independent check.
     Never re-ask a settled decision. Take dates from the system clock.
     The founder's own words stay in the founder's decisions file; this file indexes those decisions and the engineering records.
     Cross-project decisions live in the private overlay's FOUNDER.md. -->
# Decisions: <project>

## Founder decisions

| ID | Date | Decision | Scope | Status | Source |
|---|---|---|---|---|---|
| DEC-001 | <yyyy-mm-dd> | <what was decided, in one sentence> | <screens, modules, all> | proposed / accepted / superseded by DEC-00n | <who, where: chat, question round, prototype> |

## Engineering decisions (ADRs)

One file each in the code repo at `docs/adr/NNNN-title.md` ([template](ADR.md)). This table is the index; the file holds the reasoning. Supersede an old record with a new one, never delete it.

| ADR | Date | Decision | Owner | Status | Supersedes / superseded by |
|---|---|---|---|---|---|
| ADR-0001 | <yyyy-mm-dd> | <one sentence> | <role or lane> | Proposed / Accepted / Superseded | <ADR-NNNN or none> |
