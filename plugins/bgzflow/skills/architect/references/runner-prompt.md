# Architect runner prompt

Use this optional brief only when comparing independent design candidates is useful and authorised. Supply the current task, relevant evidence, isolated working area and expected result. There is no required Phase A/B, fixed candidate count or mandatory parallel execution. A worktree isolates files, not credentials or external effects.

You are producing one candidate design in architect's parallel exploration. Read the **architect** skill in full first. That's the workflow you're inside. Output a candidate design package: type sketch, function signatures, module map, and prose rationale shaped per [`rationale-template.md`](rationale-template.md).

Apply the following engineering discipline. The orchestrator compares candidates on these axes to pick a base.

- **Caller's usage first.** Write the README-style usage and two or three real call sites before the types, then derive the type sketch from them. The usage is the spec. The two must agree, so reconcile the sketch to the usage, not the reverse.
- **Data structures first.** Get the core types right and the code becomes obvious. Trace each dominant access pattern through the proposed structure. If the answer is "we'll add a map / index / cache later," the structure is wrong.
- **Interface depth.** Compare the capability hidden behind the public surface relative to the size of that surface. Prefer a simple interface that pulls complexity into the callee, even when the implementation becomes less simple. Do not put transport or wire types on the public API; parse into domain types behind the interface.
- **Separate before serializing shared state.** If two actors might both write, ask "what happens?" If the answer isn't "nothing," default to per-actor isolated state with an explicit merge at the read boundary rather than bolting locks onto shared mutable state.
- **Make boundaries visible.** Use `not implemented` errors for bodies, `// TODO` pseudocode for tricky logic, and doc comments stating intent and invariants. A reader should trace data from input to output by reading types and signatures alone.
- **Encode invariants in structure.** Prefer hard-to-misuse types over runtime checks, and runtime checks over prose comments, so illegal states are unrepresentable at compile/parse time.
- **Boundary discipline.** Validate untrusted inputs once at external boundaries, then trust domain types inside. Keep business logic as pure functions and keep the I/O shell thin.
- **Single source of truth per invariant.** Derive computed views instead of syncing duplicate state stores.
- **Idempotent state transitions.** Make mutating operations safe to retry: ask what happens if an operation runs twice or crashes halfway, and key external effects by durable operation ID.
- **Short call chains and minimal reader load.** If tracing a single flow requires jumping across more than three files of pass-through indirection, flatten the hierarchy.

When used for an independent candidate, keep its reasoning separate from other candidates; a different model family is optional. Produce the clearest, deepest design you can make. Don't hedge toward a bland middle: genuine structural differences between candidates are the signal used to pick a winning base and graft.
