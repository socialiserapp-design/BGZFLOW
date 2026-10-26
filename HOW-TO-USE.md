# How to Use BGZFLOW

**Created by [Simeon Kontogeorges](https://github.com/socialiserapp-design)** · LinkedIn: [Simeon Kontogeorges](https://www.linkedin.com/in/simeon-konto-soclo/) · X: [@socloapp](https://x.com/socloapp) · Email: [simeon@socialiser.app](mailto:simeon@socialiser.app)

BGZFLOW turns one or more AI coding agents into a coordinated product team that takes a short plain-English request all the way to a verified, working launch. It is provider-agnostic and works whether you run a single AI model or a multi-agent setup across Claude Code, Codex, Grok, or another host.

---

## 1. Install BGZFLOW

Requirements: Node.js 18 or newer and your AI agent CLI. BGZFLOW uses zero external npm dependencies.

### Claude Code
```shell
claude plugin marketplace add socialiserapp-design/BGZFLOW
claude plugin install bgzflow@bgzflow
```

### Codex
```shell
codex plugin marketplace add socialiserapp-design/BGZFLOW
codex plugin add bgzflow@bgzflow
```

### Grok
```shell
grok plugin marketplace add socialiserapp-design/BGZFLOW
grok plugin install socialiserapp-design/BGZFLOW
```

---

## 2. Start a Project in 60 Seconds

Open your project folder in your AI agent and say what you want in everyday English:

```text
/bgzflow:swarm Build a one-screen checkout page with Apple Pay and test it end to end
```

*(If your host does not use plugin slash commands yet, tell the agent: `Read the installed BGZFLOW commands/swarm.md and run that workflow for this goal: <your goal>`.)*

On first run, `bgz setup` automatically detects your build, test, and lint commands and saves them in `.bgzflow/project.json`.

---

## 3. How the BGZFLOW Loop Works End-to-End

### Step 1 — Plain-English Goal Expansion (`bgz goal compile` & `bgz goal lock`)
You do not need to write long technical prompts. Write a short prompt in plain English:
- For small, obvious tasks, the agent starts immediately.
- For larger or ambiguous goals, BGZFLOW expands your request into a clear plain-English summary and asks only high-impact product, design, or money questions (`bgz goal check-decision`). Routine technical choices are made autonomously.
- Once agreed, the goal checklist is cryptographically locked in `.bgzflow/active-goal.json`.

### Step 2 — Lightweight Point-of-Contact (Lead) & Parallel Builders
One chat acts as your **Point of Contact (Lead)** and maintains a single live `LAUNCH-BOARD.md` (your single source of truth showing who is doing what, the active candidate branch/manifest, and verified progress):
- **The Lead stays lightweight**: it delegates coding, builds, and walkthroughs to worker chats instead of dumping raw build logs into its own context window, preventing context compaction loops and drift.
- **Builders work in complete vertical slices**: every slice is built and wired end-to-end (`BUILT -> REACHED -> USED`) in its own worktree and merged into a single release candidate.

### Step 3 — Continuous Independent Walkthrough & Real-Surface Verification (`bgz verify`)
A dedicated **Verifier / Walker** chat (a separate chat or model from the builder, `verifier !== builder`) continuously walks the integrated candidate on the real app, browser, or device:
- When the walker finds a bug, it posts a short structured defect row to the project inbox (`bg-mail post`) and **keeps walking the rest of the app without stopping**.
- Builders pick up the defect, fix it in their slice, and hand the updated candidate back for incremental re-verification.
- Visual layouts and screenshots can be verified automatically against approved mockups (`bgz verify --visual`).

### Step 4 — Bounded Inbox & Automatic Stop Enforcement
- **Bounded Inbox (`bg-mail`)**: `bg-mail list --project <slug>` returns a compact summary (`< 2 KB`, latest 10 items, bodies truncated to 240 characters) so inbox checks never bloat an agent's context window. Use `bg-mail get --project <slug> --id <msgId>` to read a specific full message.
- **Universal Stop Gate**: Builders cannot go idle while checklist items or unread inbox messages remain open. Meanwhile, the Lead chat yields cleanly (`lead_delegated_to_workers`) while waiting on delegated workers so it never spins in place.
- **Computer Use Wake-Up**: When using desktop or browser automation to wake an idle chat or click a stuck prompt after a turn ends, always verify that the target window/tab matches the project (`--project`) and has no unsent human draft before interacting.

---

## 4. Essential CLI Reference

Run commands via `node "<plugin-root>/tools/bgz.mjs" <command>` (or ask your agent to run them):

| Command | Purpose |
|---|---|
| `bgz setup` | Auto-detect build, test, and lint commands into `.bgzflow/project.json` |
| `bgz graph` | Compile, validate, and run Google Graph Engineering execution graphs, 2-failure circuit breakers (`assess`), and Context Graph precedents |
| `bgz eval` | Run the Universal 8-Domain Eval Engine (`codesign`, `research`, `architecture`, `claims`, `math`, `chaos`, `craft`, `learn`, `run`, `status`) |
| `bgz goal compile` | Expand a short plain-English prompt into a structured goal checklist |
| `bgz goal lock` | Lock `.bgzflow/active-goal.json` with an HMAC signature |
| `bgz goal check-decision` | Score whether a question is material enough (`>= 0.65`) to ask the user |
| `bgz verify` | Run independent deterministic, semantic, and visual (`--visual`) verification and write signed `USED` receipts |
| `bgz taste` | Check or lock project visual identity (`LOCKED_IDENTITY` default on existing projects) and run `anti-slop` UI checks |
| `bgz facts search` | Search project facts using SQLite FTS5 BM25 ranking, file-glob boost, and 90-day recency decay |
| `bgz scan` | Scan for stubs, dead handlers, or unapproved customer-facing blocks |
| `bgz map` | Show repositories, worktrees, deployments, and in-flight changes |
| `bgz lessons status` | View recorded failure patterns and promote repeated lessons into rules |
| `bg-mail list --project <id>` | List the latest 10 messages in compact form (`< 2 KB`) |
| `bg-mail get --project <id> --id <msgId>` | Fetch the full body of a single message |
| `bg-mail post --project <id> --from <role> --to <role> --body "..."` | Send a durable message to another agent role |
| `bg-mail reply --project <id> --id <msgId> --from <role> --body "..."` | Reply to a message and mark it answered |

---

## 5. Going Further: What Lives in Lucian (Coming Soon)

Open-source BGZFLOW gives your CLI agents the full coordination, identity-locking, and real-surface verification loop. Capabilities that go beyond standalone CLI plugins are built natively into **Lucian** (coming soon):

- **Deep-Source Skill Forge & Clean-Room Reverse Engineering (`REA`)**: Instead of relying on generic public skills that every other user downloads, Lucian distills proprietary, harmonized skills directly from books, eBooks, lecture videos, research papers, live app/binary teardowns, and viral content/ad hooks (`bgz skill-forge`).
- **Cross-Project Taste & Anti-Repetition Memory**: Remembers the visual directions, layout anatomies, and motion physics you have shipped across projects (`bgz taste verify-round`) so new products never repeat generic AI templates, while keeping established brand identities mechanically locked.
- **One Workspace for All Your AI & Current Subscriptions**: Connects the AI models and monthly subscriptions you already pay for (Claude, Codex, Grok, and specialist models) into one unified system — routing each task to the model with the highest proven first-time pass rate, running mechanical tasks at zero token cost, and eliminating terminal switching, compaction stalls, and wasted subscription allowance.

---

## Creator

Designed and created by **Simeon Kontogeorges**.

- **GitHub**: [socialiserapp-design](https://github.com/socialiserapp-design)
- **LinkedIn**: [Simeon Kontogeorges](https://www.linkedin.com/in/simeon-konto-soclo/)
- **X**: [@socloapp](https://x.com/socloapp)
- **Email**: [simeon@socialiser.app](mailto:simeon@socialiser.app)
