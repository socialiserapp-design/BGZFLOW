# Third-party notices

## Google Research Harness2 optional example

The BGZFLOW-authored files in `improvement/harness2-example/` adapt the
substrate/benchmark interface of https://github.com/google-research/harness2,
supplied revision `1cfe254e8d25b15f37048c3730134686abe60335`.
Google's implementation is not bundled or relicensed here. Running the example
requires a separately supplied checkout; `upstream-manifest.json` checks the
accepted package-source and licence bytes before the local experiment. The
upstream code is copyright Google LLC, Apache License 2.0. BGZFLOW's adapter
does not invoke the reference launcher or add its permissions to the host.

The shared method assets are adaptations of existing BGZFLOW intent, evidence,
continuation and efficiency workflows. They share the package's MIT licence;
product names are metadata over the same underlying method bytes.

## Ruflo agent memory scopes

The explicit agent-scope and provenance-aware transfer design in
`scoped-context.mjs` is adapted from ruvnet/ruflo, pinned at commit
`b93144803bb171b12993b715fe7b2dd936b6edd5`:

- https://github.com/ruvnet/ruflo/blob/b93144803bb171b12993b715fe7b2dd936b6edd5/v3/%40claude-flow/memory/src/agent-memory-scope.ts
- https://github.com/ruvnet/ruflo/blob/b93144803bb171b12993b715fe7b2dd936b6edd5/v3/%40claude-flow/memory/src/agent-memory-scope.test.ts
- https://github.com/ruvnet/ruflo/blob/b93144803bb171b12993b715fe7b2dd936b6edd5/LICENSE

The implementation replaces ambient project discovery, name sanitization,
backend dependencies and bulk transfer defaults with explicit identities,
durable JSON records and explicit idempotent single-record transfers.

MIT License

Copyright (c) 2024-2026 ruvnet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Cursor Plugins & pstack MIT Skills (`skills/`) and Execution Graph (`execution-graph.mjs`)

- Bundled skills in `skills/` (`advisor`, `how`, `architect`, `statechart`, `interrogate`, `exhaust-the-design-space-and-deslop`, `deslop`, `grok-voice`, `create-verification-skill`, `maintain-verification-skill`, `control-ui`, `control-cli`, `verify-this`, `principle-prove-it-works`) are adapted from `cursor/plugins` (`advisor`, `pstack`, `cursor-team-kit`, `grok-voice`), MIT License.
- `execution-graph.mjs` implements the BGZFLOW & Lucian Google Graph Engineering specification (cyclic execution graphs with bounded retry edges, deterministic join gates, node-scoped context projections with stripped builder reasoning for independent verifiers, and Context Graph precedent traces).
