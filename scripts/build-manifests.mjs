import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = readFileSync(join(root, "VERSION"), "utf8").trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("VERSION must be major.minor.patch");
  process.exit(2);
}

const description =
  "A free plugin that lets one founder run AI worker swarms from idea to launch.";
const author = { name: "BGZFLOW contributors" };
const repository = "https://github.com/socialiserapp-design/BGZFLOW";
const owner = { name: "socialiserapp-design" };
const source = { source: "url", url: repository };
const keywords = ["agents", "skills"];

// BGZFLOW's tools. Each one becomes a slash command (commands/<name>.md) for hosts that read
// Claude-format commands; the skills name the same `node .../tools/<name>/<name>.mjs` command for every host.
const tools = [
  {
    name: "bg-mail",
    hint: "<post|reply|wait|list> --project ID ...",
    about: "Exchange durable questions and replies between leads and workers without ending a job",
  },
  {
    name: "bg-governor",
    hint: "<disk|build-slots|archive-check|queued|reap> ...",
    about: "Guard disk, heavy processes, build concurrency and unsafe bulk thread archives",
  },
  {
    name: "bg-route",
    hint: "<record|verify> --job ID --provider NAME --account ALIAS",
    about: "Record and verify a non-secret proof of the account that actually ran a job",
  },
  {
    name: "bg-heavy",
    hint: "[--label TEXT] -- <command> [args...] | status",
    about: "Run one heavy command, such as a full test suite or a native build, at a time on this machine",
  },
  {
    name: "bg-swarm",
    hint: "<launch|status|stop|reap> [options]",
    about: "Launch, list, stop and clean up local background workers",
  },
  {
    name: "swarm-gate",
    hint: "start|refresh-models|dispatch|record|check-dispatch|check-suite|check-journey|check-rehearsal|check-review|check-release|status|presets",
    about: "Enforce the active swarm's resources, usage, ownership, retry, check and release rules",
    footer: "Read `docs/swarm-gate.md` for the ledger and CLI contracts. Blocks go to the lead with one next step. Non-Claude leads must reserve every dispatch with this CLI and run check-release before any named production release.\n\nUse `refresh-models` after phase-0 approval/start, `record qualification` for asynchronous exact-flags returns and `record piece` with a structured handback for admission. Jev is optional in private policy; status retains reported usage and warnings. Code decides exact rules. Use a stable releaseId, record rehearsal golden journeys/rollback against the SHA, and allow one read-only review per release, never repairs. No ready verdict is needed. UI changes require the founder final device design-match result.",
  },
  {
    name: "swarm-resources",
    hint: "[--json] [--swarm <id>] [--approve <ids> | --save-proven <proof.json> | --observe <nonsecret-status.json> | --refresh-models --policy <private-policy.json>]",
    about: "Inspect installed and proven worker routes, save explicit approval or dated qualification",
  },
  {
    name: "swarm-status",
    hint: "[project] [--hours <number>] [--json]",
    about: "Show swarm job activity, uncertainty, duplicates, route mismatches and recent results",
    intro: 'Read `${CLAUDE_PLUGIN_ROOT}/skills/bg-finish-the-whole-job/references/swarm-rules.md` and load `${CLAUDE_PLUGIN_ROOT}/skills/bg-efficiency/SKILL.md`. This command is read-only and needs no resource approval. Run the tool with the arguments given:',
    footer: "If `${CLAUDE_PLUGIN_ROOT}` remains literal, use the installed plugin folder containing `commands/` and `tools/`. With no arguments, show all projects.\n\nAlso run `node \"${CLAUDE_PLUGIN_ROOT}/tools/swarm-gate/swarm-gate.mjs\" status` in the current project. Report limit used/reserved, blocked steps and reasons, fix-wave count and whether release is open. Include tier-map age/version, proposals/auto-adoption, escalated job/hour usage separately, Jev's actual reported usage/cost and recent fallback warnings. Status makes no Jev call. Keep completed/failed/cancelled results and record pointers. Age and PID presence never prove job ownership. Only the owning lead may cancel its own jobs after reconciliation. Preserve original outputs; never rerun a job to recover filtered evidence.",
  },
  {
    name: "bg-rounds",
    hint: "<open|close|next|status> <package> [finding-id...]",
    about: "Keep the repair-round ledger; a third round needs recorded approval",
  },
  {
    name: "doctor",
    hint: "[<dir>] | urls [<dir>] | plugins [--usage]",
    about: "Read-only checks for secrets inside URLs and for the context cost of enabled plugins",
  },
  {
    name: "notes-map",
    hint: "<build|ask|show> ...",
    about: "Map a notes folder, then read only the lines a question needs",
  },
  {
    name: "startup-check",
    hint: "[<project-dir>] [--json] [--budget <words>]",
    about: "Check the start-up reading budget, the checkpoint and the owners block",
  },
];

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function command(tool) {
  return [
    "---",
    `description: ${JSON.stringify(tool.about)}`,
    `argument-hint: ${JSON.stringify(tool.hint)}`,
    // For the user to type; agents get the same command from the skills, so it adds no always-on context.
    "disable-model-invocation: true",
    "---",
    "",
    tool.intro || `Run BGZFLOW's \`${tool.name}\` tool with the arguments given, then show its output and exit code:`,
    "",
    "```sh",
    `node "\${CLAUDE_PLUGIN_ROOT}/tools/${tool.name}/${tool.name}.mjs" $ARGUMENTS`,
    "```",
    "",
    tool.footer || "If the path above still starts with a dollar sign, use this plugin's install folder, the one that holds `commands/` and `tools/`. With no arguments, run it with `--help` first.",
    "",
  ].join("\n");
}

const files = {
  ".claude-plugin/plugin.json": json({
    name: "bgzflow",
    version,
    description,
    author,
    homepage: repository,
    repository,
    license: "MIT",
    keywords,
    // No `commands` key: Claude Code scans commands/ by default. With Claude Code 2.1.284, commands the
    // manifest listed by path did not appear in `claude plugin details`; the default scan's did.
  }),
  ...Object.fromEntries(tools.map((tool) => [`commands/${tool.name}.md`, command(tool)])),
  ".claude-plugin/marketplace.json": json({
    name: "bgzflow",
    description,
    owner,
    plugins: [
      {
        name: "bgzflow",
        source,
        description,
        license: "MIT",
      },
    ],
  }),
  "plugin.json": json({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "bgzflow",
    version,
    description,
    author,
    homepage: repository,
    repository,
    license: "MIT",
    keywords,
  }),
  ".agents/plugins/marketplace.json": json({
    name: "bgzflow",
    interface: { displayName: "BGZFLOW" },
    plugins: [
      {
        name: "bgzflow",
        source,
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  }),
  ".grok-plugin/marketplace.json": json({
    name: "bgzflow",
    description,
    owner,
    plugins: [
      {
        name: "bgzflow",
        source,
        description,
      },
    ],
  }),
};

const check = process.argv.includes("--check");
let drift = false;

for (const [rel, body] of Object.entries(files)) {
  const path = join(root, rel);
  if (check) {
    let current = null;
    try {
      current = readFileSync(path, "utf8");
    } catch {
      current = null;
    }
    if (current !== body) {
      console.error(`drift ${rel}`);
      drift = true;
    }
    continue;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

if (drift) process.exit(1);
