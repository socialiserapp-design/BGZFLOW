import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Patterns are built from pieces so this file does not contain the text it flags.
const privateKeyRe = new RegExp(
  `${["-----", "BEGIN "].join("")}(?:RSA |OPENSSH |EC )?${["PRIVATE ", "KEY-----"].join("")}`,
);
const passwordRe = new RegExp(`${["pass", "word"].join("")}\\s*=\\s*\\S+`, "i");
const windowsRe = new RegExp(
  `${String.fromCharCode(67)}:[\\\\/]${["Us", "ers"].join("")}[\\\\/][^\\\\/\\s]+`,
  "i",
);

const RULES = [
  { name: "private-key", re: privateKeyRe },
  { name: "aws-token", re: /(?:AKIA|ASIA)[A-Z0-9]{16}/ },
  { name: "github-token", re: /(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{20,}/ },
  { name: "anthropic-token", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "openai-token", re: /sk-(?:proj-)?(?!ant-)[A-Za-z0-9_-]{20,}/ },
  { name: "stripe-token", re: /(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { name: "slack-token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "xai-token", re: /xai-[A-Za-z0-9]{20,}/ },
  { name: "jwt", re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { name: "password", re: passwordRe },
  { name: "windows-user-path", re: windowsRe },
];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
}

function parseArgs(argv) {
  let json = false;
  let workingTree = false;
  let denylist;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--working-tree") {
      workingTree = true;
      continue;
    }
    if (arg === "--denylist") {
      denylist = argv[i + 1];
      i += 1;
      if (!denylist || denylist.startsWith("--")) return { error: "denylist path required" };
      continue;
    }
    return { error: "unknown argument" };
  }
  return { json, denylist, workingTree };
}

function resolveDenylist(explicit) {
  if (explicit !== undefined) {
    if (!existsSync(explicit)) return false;
    return explicit;
  }
  const overlay = process.env.BGZFLOW_OVERLAY;
  if (overlay) {
    const fromEnv = join(overlay, "denylist.txt");
    if (existsSync(fromEnv)) return fromEnv;
  }
  const fromHome = join(homedir(), ".bgzflow", "overlay", "denylist.txt");
  if (existsSync(fromHome)) return fromHome;
  return null;
}

function loadTerms(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const terms = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    terms.push(line.toLowerCase());
  }
  return terms;
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || !result.stdout) {
    return {
      ok: false,
      stdout: "",
      stderr: result.stderr ? result.stderr.toString("utf8") : "git failed",
    };
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout.toString("utf8"),
    stderr: result.stderr ? result.stderr.toString("utf8") : "",
  };
}

function badEmail(text) {
  EMAIL.lastIndex = 0;
  for (const match of text.matchAll(EMAIL)) {
    if (!match[0].toLowerCase().includes("noreply")) return true;
  }
  return false;
}

function gitPath(value) {
  let path = value.trim();
  if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
  if (path === "/dev/null") return null;
  if (path.startsWith("a/") || path.startsWith("b/")) return path.slice(2);
  return path;
}

function scanHistory(text, consider) {
  let sha = "";
  let phase = "none";
  let messageLine = 0;
  let oldLine = 0;
  let newLine = 0;
  let oldPath = null;
  let newPath = null;
  let inHunk = false;

  for (const raw of text.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    const commit = /^commit ([0-9a-f]{7,})\b/.exec(line);
    if (commit) {
      sha = commit[1];
      phase = "header";
      messageLine = 0;
      inHunk = false;
      oldPath = null;
      newPath = null;
      continue;
    }
    if (phase === "header") {
      if (line.startsWith("Author:")) consider(line, `git-author/${sha}`, 1);
      else if (line.startsWith("Commit:")) consider(line, `git-committer/${sha}`, 1);
      else if (line === "") phase = "message";
      continue;
    }
    if (phase === "message") {
      if (line.startsWith("diff --git ")) {
        phase = "diff";
        inHunk = false;
        continue;
      }
      messageLine += 1;
      if (line.startsWith("    ")) consider(line.slice(4), `commit/${sha}`, messageLine);
      continue;
    }
    if (phase !== "diff") continue;
    if (line.startsWith("diff --git ")) {
      inHunk = false;
      oldPath = null;
      newPath = null;
      continue;
    }
    if (!inHunk && line.startsWith("--- ")) {
      oldPath = gitPath(line.slice(4));
      continue;
    }
    if (!inHunk && line.startsWith("+++ ")) {
      newPath = gitPath(line.slice(4));
      continue;
    }
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;
    if (line.startsWith("+")) {
      consider(line.slice(1), newPath, newLine);
      newLine += 1;
      continue;
    }
    if (line.startsWith("-")) {
      consider(line.slice(1), oldPath, oldLine);
      oldLine += 1;
      continue;
    }
    if (line.startsWith("\\")) continue;
    if (line.startsWith(" ")) {
      oldLine += 1;
      newLine += 1;
    }
  }
}

function emit(findings, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify({ ok: findings.length === 0, findings })}\n`);
  } else {
    for (const hit of findings) {
      process.stdout.write(`${hit.path}:${hit.line} ${hit.rule} ***\n`);
    }
  }
  process.exitCode = findings.length === 0 ? 0 : 1;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.error) {
    fail(opts.error);
    return;
  }
  const denyFile = resolveDenylist(opts.denylist);
  if (denyFile === false) {
    fail("denylist file not found");
    return;
  }
  const terms = denyFile ? loadTerms(denyFile) : [];
  if (terms === null) {
    fail("denylist file unreadable");
    return;
  }

  const findings = [];
  const seen = new Set();
  function add(path, line, rule) {
    if (!path || !Number.isInteger(line) || line < 1) return;
    const key = `${path}\0${line}\0${rule}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ path, line, rule, masked: "***" });
  }
  function consider(text, path, line) {
    if (!path) return;
    for (const rule of RULES) {
      if (rule.re.test(text)) add(path, line, rule.name);
    }
    if (badEmail(text)) add(path, line, "email");
    const folded = text.toLowerCase();
    if (terms.some((term) => folded.includes(term))) add(path, line, "denylist");
  }

  // File-only checks include new untracked files; the default also audits all history below.
  const listed = runGit(opts.workingTree
    ? ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]
    : ["ls-files", "-z"]);
  if (!listed.ok) {
    fail("git ls-files failed");
    return;
  }
  for (const file of listed.stdout.split("\0")) {
    if (!file) continue;
    let data;
    try {
      data = readFileSync(file);
    } catch {
      fail("unreadable tracked file");
      return;
    }
    if (data.includes(0)) continue;
    const lines = data.toString("utf8").split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      consider(lines[i].replace(/\r$/, ""), file, i + 1);
    }
  }

  if (opts.workingTree) {
    emit(findings, opts.json);
    return;
  }

  const log = runGit([
    "--no-pager",
    "-c",
    "color.ui=false",
    "-c",
    "core.quotepath=false",
    "-c",
    "log.decorate=false",
    "-c",
    "diff.noprefix=false",
    "-c",
    "diff.mnemonicPrefix=false",
    "log",
    "--all",
    "--no-decorate",
    "-p",
    "--format=fuller",
  ]);
  if (!log.ok) {
    if (/does not have any commits/i.test(log.stderr)) {
      emit(findings, opts.json);
      return;
    }
    fail("git log failed");
    return;
  }
  scanHistory(log.stdout, consider);
  emit(findings, opts.json);
}

main();
