# bg-mail

A filesystem mailbox between a worker and its lead. The commands, message format and linked-storage rules are in [docs/mailbox.md](../../docs/mailbox.md). This page covers the spool for workers that cannot write the shared inbox.

## Spool and collect

A sandboxed worker (for example a Codex read-only sandbox, or a folder outside its writable area) may not be able to write `BG_MAIL_DIR`. When `post` fails because the inbox folder is not writable, it writes the same message to `<working folder>/.bgzflow/mail-spool/<id>.json`, prints the message JSON on stdout as usual and one line on stderr:

```
bg-mail: inbox not writable; message spooled to .bgzflow/mail-spool/<id>.json (lead: bg-mail collect --from <that folder>)
```

The worker's own `wait --id <id>` reads the spooled copy when the inbox has none, so it still ends at the safe default after its timeout. A link, junction or hardlink in the inbox path is still refused and is never worked around. If the spool folder cannot be written either, `post` exits 2 with a plain message.

The lead moves spooled messages into the inbox:

```sh
node tools/bg-mail/bg-mail.mjs collect --from /path/to/worker/.bgzflow/mail-spool
node tools/bg-mail/bg-mail.mjs collect --from /path/to/worker/.bgzflow/mail-spool --remove
```

`collect` prints one JSON line: `{ "imported": [], "skipped": [], "removed": [], "invalid": [], "failed": [] }` (message IDs, or file names for `invalid`).

- It is idempotent by message id. A message already in the inbox is skipped and never rewritten, so a reply the lead has already given survives repeated runs.
- It copies. Spool files stay unless `--remove` is given, and then only a file this run imported is removed, after the inbox copy reads back with the same id. Skipped, invalid and unrelated files are never deleted.
- A file is imported only if it is a regular file named `<id>.json` holding an open, unanswered message in the `post` format, with a project, sender and recipient that use letters, numbers, dots, underscores or dashes. Anything else is listed under `invalid` and left alone.
- Exit 2 if any message failed to import (for example a writer lock was held); run it again and the rest imports.

Errors name the failing check and replace the inbox, working-folder and home paths.
