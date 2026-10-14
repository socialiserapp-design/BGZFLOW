# Two-way worker mailbox

`bg-mail` is a provider-neutral filesystem mailbox. It works with any worker that can run Node and share the configured state folder. A worker posts a concise question, states the safe default and continues waiting in the same job. The lead lists its inbox and replies. After the declared timeout the worker proceeds with the default instead of ending and requiring a restart.

```sh
node tools/bg-mail/bg-mail.mjs post --project launch --from worker-a --to lead --body "Use existing schema?" --default "yes" --wait-minutes 15
node tools/bg-mail/bg-mail.mjs list --project launch --to lead
node tools/bg-mail/bg-mail.mjs watch --project launch --to lead
node tools/bg-mail/bg-mail.mjs reply --project launch --id MESSAGE_ID --from lead --body "yes"
node tools/bg-mail/bg-mail.mjs wait --project launch --id MESSAGE_ID
```

Set `BG_MAIL_DIR` to a durable shared folder when lead and worker do not share a home. Messages contain no secrets. The lead runs `watch` in the background beside the job's single completion wait; a new open lead-bound message exits the watcher immediately. `wait` stays in the worker process until a reply or timeout, then returns the answer or safe default. Exit 0 means message/answer/default and exit 2 is misuse.

A sandboxed worker that cannot write the shared inbox still posts: the message goes to `.bgzflow/mail-spool/` in its working folder and `post` says so in one line. The lead imports it with `bg-mail collect --from <that folder>`, which is safe to repeat (one copy per message id) and copies by default; `--remove` deletes only the files that run imported. See [tools/bg-mail/README.md](../tools/bg-mail/README.md).

Every mailbox write checks the complete storage path using the shared linked-storage guard. Symlinks, junctions, hardlinked message files and linked lock files are refused before mutation. Replies retain the existing exclusive lock and atomic replacement.
