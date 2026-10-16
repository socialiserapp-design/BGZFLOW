import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

function list() {
  return spawnSync(process.execPath, ["scripts/test-all.mjs", "--list"], { cwd: root, encoding: "utf8" });
}

test("--list finds every suite without running any", () => {
  const r = list();
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split("\n").map((l) => l.trim());
  for (const suite of [
    "node hooks/test",
    "node scripts/test",
    "node tools/bg-heavy/test",
    "node tools/bg-rounds/test",
    "node tools/bg-swarm/test",
    "node tools/doctor/test",
    "node tools/notes-map/test",
    "node tools/lessons/test",
    "node tools/startup-check/test",
    "node tools/test",
    "python tools/notes-map/test_notes_map.py",
    "python skills/bg-check-it-before-release/tests/test_evidence_gate.py",
  ]) {
    assert.ok(lines.some((l) => l.startsWith(`${suite} `) || l === suite), `missing suite: ${suite}\n${r.stdout}`);
  }
});

test("--list runs a folder with a package.json main as one entry", () => {
  const lines = list().stdout.split("\n");
  for (const dir of ["tools/bg-heavy/test", "tools/bg-swarm/test"]) {
    const line = lines.find((l) => l.startsWith(`node ${dir} `));
    assert.ok(line, `missing ${dir}`);
    assert.ok(line.endsWith(` -> ${dir}/index.mjs`), line);
  }
});

test("an unknown argument is a usage error", () => {
  const r = spawnSync(process.execPath, ["scripts/test-all.mjs", "--nope"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: node scripts\/test-all\.mjs/);
});
