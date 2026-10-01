import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const scanner = fileURLToPath(new URL("../leak-check.mjs", import.meta.url));
// Scratch repositories and homes live in this repository's ignored .tmp/ folder, never the system temp folder.
const scratch = fileURLToPath(new URL("../../.tmp/", import.meta.url));

function tmpdir() {
  mkdirSync(scratch, { recursive: true });
  return scratch;
}
const noreply = ["ci@", "users.noreply.github.com"].join("");

function piece(...parts) {
  return parts.join("");
}

function aws() {
  return piece("AKIA", "0".repeat(16));
}

function github() {
  return piece("ghp_", "a".repeat(36));
}

function openai() {
  return piece("sk-", "b".repeat(32));
}

function anthropic() {
  return piece("sk-ant-", "c".repeat(32));
}

function stripe() {
  return piece("sk_live_", "d".repeat(24));
}

function slack() {
  return piece("xoxb-", "1".repeat(12), "-", "e".repeat(24));
}

function xai() {
  return piece("xai-", "f".repeat(32));
}

function jwt() {
  return [piece("eyJ", "a".repeat(12)), "b".repeat(12), "c".repeat(12)].join(".");
}

function pem() {
  return piece("-----BEGIN ", "PRIVATE KEY-----\nAAAA\n-----END ", "PRIVATE KEY-----\n");
}

function password() {
  return piece("password", "=", "hunter");
}

function winPath(slash) {
  return piece("C:", slash, "Users", slash, "someone");
}

function mail() {
  return piece("person@", "example.test");
}

function term() {
  return piece("zephyr", "-token-", "sample");
}

function git(cwd, args, extra) {
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "Example",
    GIT_AUTHOR_EMAIL: noreply,
    GIT_COMMITTER_NAME: "Example",
    GIT_COMMITTER_EMAIL: noreply,
    ...extra,
  };
  const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function initRepo() {
  const dir = mkdtempSync(join(tmpdir(), "bgz-leak-"));
  git(dir, ["init"]);
  return dir;
}

function commit(dir, message) {
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", message]);
}

function run(dir, args = [], extraEnv = {}) {
  const home = mkdtempSync(join(tmpdir(), "bgz-home-"));
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    ...extraEnv,
  };
  delete env.BGZFLOW_OVERLAY;
  try {
    return spawnSync(process.execPath, [scanner, ...args], {
      cwd: dir,
      env,
      encoding: "utf8",
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function write(dir, rel, text) {
  const path = join(dir, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text.replace(/\r\n/g, "\n"));
}

test('working-tree mode scans current tracked and untracked files while the default retains history', () => {
  const dir = initRepo();
  try {
    write(dir, 'note.txt', `${github()}\n`);
    commit(dir, 'unsafe fixture');
    write(dir, 'note.txt', 'clean current content\n');
    commit(dir, 'replace fixture');
    const current = run(dir, ['--working-tree', '--json']);
    assert.equal(current.status, 0, current.stderr);
    assert.deepEqual(JSON.parse(current.stdout), { ok: true, findings: [] });
    assert.equal(run(dir, ['--json']).status, 1, 'history scanning remains the default');
    write(dir, 'untracked.txt', `${github()}\n`);
    const untracked = run(dir, ['--working-tree', '--json']);
    assert.equal(untracked.status, 1);
    assert.equal(JSON.parse(untracked.stdout).findings[0].path, 'untracked.txt');
    write(dir, 'untracked.txt', 'clean\n');
    write(dir, 'note.txt', `${github()}\n`);
    const dirty = run(dir, ['--working-tree', '--json']);
    assert.equal(dirty.status, 1);
    assert.equal(JSON.parse(dirty.stdout).findings[0].path, 'note.txt');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("allows a noreply address and prints clean json", () => {
  const dir = initRepo();
  try {
    write(dir, "note.txt", `hello ${noreply}\n`);
    commit(dir, "add note");
    const result = run(dir, ["--json", "--denylist", join(dir, "empty.txt")]);
    writeFileSync(join(dir, "empty.txt"), "");
    const again = run(dir, ["--json", "--denylist", join(dir, "empty.txt")]);
    assert.equal(again.status, 0, again.stdout + again.stderr);
    const body = JSON.parse(again.stdout);
    assert.equal(body.ok, true);
    assert.deepEqual(body.findings, []);
    assert.equal(result.status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("flags secrets, emails, profile paths, and denylist terms", () => {
  const dir = initRepo();
  const deny = join(dir, "deny.txt");
  try {
    write(
      dir,
      "secret.txt",
      [
        aws(),
        github(),
        openai(),
        anthropic(),
        stripe(),
        slack(),
        xai(),
        jwt(),
        pem(),
        password(),
        winPath("\\"),
        winPath("/"),
        mail(),
        term().toUpperCase(),
        noreply,
      ].join("\n") + "\n",
    );
    writeFileSync(deny, `# comment\n\n${term()}\n`);
    commit(dir, "add secret");
    const result = run(dir, ["--denylist", deny]);
    assert.equal(result.status, 1);
    const rules = [
      "aws-token",
      "github-token",
      "openai-token",
      "anthropic-token",
      "stripe-token",
      "slack-token",
      "xai-token",
      "jwt",
      "private-key",
      "password",
      "windows-user-path",
      "email",
      "denylist",
    ];
    for (const rule of rules) {
      assert.match(result.stdout, new RegExp(`secret\\.txt:\\d+ ${rule} \\*\\*\\*`));
    }
    assert.equal(result.stdout.includes(aws()), false);
    assert.equal(result.stdout.includes(mail()), false);
    assert.equal(result.stdout.includes(term()), false);
    assert.equal(result.stderr.includes(aws()), false);
    const json = run(dir, ["--json", "--denylist", deny]);
    const body = JSON.parse(json.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.findings.every((hit) => hit.masked === "***"), true);
    assert.equal(JSON.stringify(body).includes(aws()), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("flags a secret that remains only in history", () => {
  const dir = initRepo();
  const secret = aws();
  try {
    write(dir, "gone.txt", `${secret}\n`);
    commit(dir, "add secret");
    write(dir, "gone.txt", "clean\n");
    commit(dir, "remove secret");
    const result = run(dir, ["--json"]);
    assert.equal(result.status, 1);
    const body = JSON.parse(result.stdout);
    assert.equal(
      body.findings.some((hit) => hit.rule === "aws-token" && hit.path === "gone.txt"),
      true,
    );
    assert.equal(result.stdout.includes(secret), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("flags a non-noreply author email", () => {
  const dir = initRepo();
  const author = mail();
  try {
    write(dir, "ok.txt", "hello\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-m", "hello"], {
      GIT_AUTHOR_EMAIL: author,
      GIT_COMMITTER_EMAIL: author,
    });
    const result = run(dir, ["--json"]);
    assert.equal(result.status, 1);
    const body = JSON.parse(result.stdout);
    assert.equal(
      body.findings.some((hit) => hit.rule === "email" && hit.path.startsWith("git-author/")),
      true,
    );
    assert.equal(result.stdout.includes(author), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("still applies generic rules when the default denylist is absent", () => {
  const dir = initRepo();
  try {
    write(dir, "secret.txt", `${password()}\n`);
    commit(dir, "add password");
    const result = run(dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /password \*\*\*/);
    assert.equal(result.stdout.includes("hunter"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
