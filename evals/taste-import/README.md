# Taste asset import checks

Run `node --test evals/taste-import/import.test.mjs` from the source workspace.
No models, browsers, packages, downloads or running services are needed by these
checks. Existing esbuild is used only to parse and bundle the actual browser
modules with `write:false`; it does not execute browser code.

Checks cover all pinned source bytes, metadata pagination and real file results,
actual colour arithmetic and shader-name diagnostics, static JavaScript dependency
closure, retained dynamic effect modules, per-file third-party rights, complete
fresh-directory export, overwrite/link/path refusal and corrupted source detection.
The export test writes a disposable library copy and preserves its credits.

They do not establish browser rendering, GPU compilation, animation behaviour,
accessibility, image suitability, third-party endorsement or independent ownership
verification of every upstream photograph. Source licence evidence and modification
records are retained; project-specific use still needs the applicable context.
