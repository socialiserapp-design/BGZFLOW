# Optional design routing evaluation

Development-only public synthetic requests cover the imported design specialists,
plus arithmetic, a server retry investigation and a literal configuration edit.
The positive cases require an appropriate **primary** specialist, not merely
the broad master somewhere in the selected set. Clear existing specialist
alternatives are accepted. Every selected method must have a real loaded body.
The negatives allow other relevant methods or an empty completed selection, but
reject design methods. Fallback is reported as a failure to demonstrate live
routing, never as proof the actual user task cannot be completed.

Local grader checks make no network/model calls:

```powershell
node --test evals/design/grade.test.mjs
```

After separately reviewing/building the plugin, explicitly opt into existing Jev
usage and name a **new** output directory:

```powershell
node evals/design/run.mjs --plugin E:/path/to/reviewed/built-plugin --output E:/path/to/new-evidence-directory --live
```

Without `--live`, the runner refuses before provider imports or calls. It uses
only the supplied build's `discoverCatalog`, `selectRoute`, `loadSelectedSkills`
and official SDK-backed `createJevDecider`. The catalogue is scoped to that build,
not the user's broader installed libraries. It supplies no invented worker/model
availability and performs no design implementation. Existing credential handling
is left to the existing decider; no keys are copied or printed.

After installing the reviewed candidate, `--catalogue installed` also checks the
actual global skill libraries alongside that installed plugin. It reads their
catalogue metadata and relevant candidate excerpts through the normal authorised
selector; it loads no private project history and executes no selected method.
Keep that evidence private. Use `--cases id,id` for a unique subset of known cases
when repeating the complete suite would add no useful coverage. The default is
still the package-only catalogue.

The output preserves invocation, sanitized raw selections, successful decision
phases, body identity/length, per-case grades, the first failed case and summary.
Existing directories are refused. Each case runs once; no silent retry or repair.
There is no new selection-count cap. Existing router budgets and the decider's
no-retry transport remain in effect. Local graded examples demonstrate the grader;
only an explicit live run tests Jev. Neither proves design quality or improvement
over a controlled baseline.
