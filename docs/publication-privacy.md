# Publication privacy

The release-tree check scans the complete current source and ready-to-install
package, using only individually reviewed public licence, demonstration and
security-fixture exceptions tied to their exact path, line, rule and line digest.
Changing an excepted line invalidates its exception. It never automatically reads
a private home denylist; a local operator can explicitly supply one.

This release preserves the existing public repository's ancestry. A separate
full-history run of `node scripts/leak-check.mjs` currently reports ten legacy
contact/context lines from earlier public material, including removed files.
Those findings were retained; the current release tree passes. Current-tree
sanitation does not remove already-published historical text or certify that
ancestry is private. Rewriting published history is a separate owner decision.

CI checks the current release tree and also runs the existing Gitleaks action.
The default local scanner still checks the whole Git history and reports those
legacy findings; no historical or new-line exceptions were added to hide them.
