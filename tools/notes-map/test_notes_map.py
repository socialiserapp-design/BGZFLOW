"""Tests for notes-map: build, ask and show on a small folder that git treats as outside any repository.

Run: python -m unittest tools/notes-map/test_notes_map.py   (standard library only)
The folder name contains a space on purpose, since paths with spaces are the usual way a tool breaks.
"""
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "notes-map.py"
# Scratch lives in the plugin's own .tmp/ folder, never the system temp folder; BGZFLOW_TEST_SCRATCH overrides it.
# GIT_CEILING_DIRECTORIES keeps git from walking up into this plugin's repository, so each test folder
# stays outside any repository and notes-map never edits a real info/exclude file.
SCRATCH = Path(os.environ.get("BGZFLOW_TEST_SCRATCH") or HERE.parent.parent / ".tmp")

NOTES = (
    "# Alpha\nintro line\n\n## Payments\nStripe webhook retries use idempotency keys.\nSecond line about payments.\n\n"
    "## Deploys\nRollback uses the previous release tag.\n"
)


def run(*args):
    ceiling = os.pathsep.join(part for part in (os.environ.get("GIT_CEILING_DIRECTORIES"), str(SCRATCH)) if part)
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8", GIT_CEILING_DIRECTORIES=ceiling)
    r = subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True, encoding="utf-8", env=env)
    return r.returncode, r.stdout, r.stderr


def load_module():
    spec = importlib.util.spec_from_file_location("notes_map_under_test", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class NotesMapTest(unittest.TestCase):
    def setUp(self):
        SCRATCH.mkdir(parents=True, exist_ok=True)
        self._tmp = tempfile.TemporaryDirectory(prefix="nm test ", dir=SCRATCH)
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        (self.root / "notes.md").write_text(NOTES, encoding="utf-8")
        (self.root / "crlf.md").write_bytes(b"# Crlf\r\nline two\r\nline three\r\n\r\n## Next\r\nfinal words here\r\n")
        (self.root / "log.txt").write_text("plain text log\nunique-token-xyzzy appears here\n", encoding="utf-8")
        (self.root / "code.py").write_text("# only-in-code-marker\n", encoding="utf-8")

    def snapshot(self):
        return {str(p.relative_to(self.root)): p.read_bytes() for p in self.root.rglob("*") if p.is_file() and ".notes-map" not in p.parts}

    def test_ask_returns_the_section_with_exact_line_numbers_and_its_heading_path(self):
        code, out, _ = run("ask", "idempotency keys for webhook", self.root)
        self.assertEqual(code, 0)
        self.assertIn("notes.md:4-6", out)
        self.assertIn("Alpha", out)
        self.assertIn("Payments", out)
        self.assertIn("notes-map show", out)

    def test_show_prints_exactly_those_lines(self):
        code, out, _ = run("show", f"{self.root / 'notes.md'}:4-6")
        self.assertEqual(code, 0)
        self.assertEqual(out, "## Payments\nStripe webhook retries use idempotency keys.\nSecond line about payments.\n")

    def test_show_takes_a_relative_file_with_root(self):
        code, out, _ = run("show", "notes.md:8-9", "--root", self.root)
        self.assertEqual(code, 0)
        self.assertEqual(out, "## Deploys\nRollback uses the previous release tag.\n")

    def test_line_numbers_are_one_based_and_split_on_newline_only(self):
        code, out, _ = run("show", f"{self.root / 'crlf.md'}:2-3")
        self.assertEqual(code, 0)
        self.assertEqual(out.replace("\r", ""), "line two\nline three\n")

    def test_show_stops_at_200_lines_and_says_where_to_continue(self):
        (self.root / "big.md").write_text("# Big\n" + "\n".join(f"line {i}" for i in range(1, 400)) + "\n", encoding="utf-8")
        code, out, err = run("show", f"{self.root / 'big.md'}:1-300")
        self.assertEqual(code, 0)
        self.assertEqual(len(out.splitlines()), 200)
        self.assertIn("200-line cap", err)
        self.assertIn(":201-300", err)

    def test_a_missing_file_is_an_error_not_an_empty_answer(self):
        code, out, err = run("show", f"{self.root / 'missing.md'}:1-3")
        self.assertEqual(code, 2)
        self.assertEqual(out, "")
        self.assertIn("file not found", err)

    def test_notes_and_plain_text_are_indexed_and_code_is_not(self):
        code, out, _ = run("ask", "xyzzy", self.root)
        self.assertEqual(code, 0)
        self.assertIn("log.txt:1-2", out)
        code, out, _ = run("ask", "only-in-code-marker", self.root)
        self.assertNotIn("code.py", out)

    def test_no_match_says_so_and_offers_a_literal_search(self):
        code, out, _ = run("ask", "zzzznotpresent", self.root)
        self.assertEqual(code, 0)
        self.assertIn("0 hits", out)
        self.assertIn("rg -n", out)

    def test_the_index_follows_edits_and_deletions(self):
        run("ask", "xyzzy", self.root)
        (self.root / "notes.md").write_text("# Alpha\nchanged: refund policy is thirty days\n", encoding="utf-8")
        code, out, _ = run("ask", "refund policy", self.root)
        self.assertIn("notes.md:1-2", out)
        self.assertIn("1 changed", out)
        (self.root / "log.txt").unlink()
        code, out, _ = run("ask", "xyzzy", self.root)
        self.assertIn("0 hits", out)
        self.assertIn("1 deleted", out)

    def test_it_writes_only_its_own_folder(self):
        before = self.snapshot()
        run("build", self.root)
        run("ask", "payments", self.root)
        self.assertEqual(self.snapshot(), before, "a source file was changed")
        made = sorted(p.name for p in (self.root / ".notes-map").iterdir())
        self.assertEqual(made, ["NOTES-MAP.md", "index.sqlite"])
        extra = sorted(p.name for p in self.root.iterdir() if p.name not in before and p.name != ".notes-map")
        self.assertEqual(extra, [])

    def test_version(self):
        code, out, _ = run("--version")
        self.assertEqual(code, 0)
        self.assertRegex(out, r"^notes-map \d+\.\d+")

    def test_a_posix_style_drive_path_is_translated_on_windows_and_left_alone_elsewhere(self):
        module = load_module()
        if os.name == "nt":
            self.assertEqual(module.fix_posix_drive("/c/no-such-folder/x").lower(), "c:/no-such-folder/x")
            self.assertEqual(module.fix_posix_drive("/mnt/d/no-such-folder").lower(), "d:/no-such-folder")
        else:
            self.assertEqual(module.fix_posix_drive("/c/no-such-folder/x"), "/c/no-such-folder/x")

    def test_the_source_holds_no_machine_path(self):
        text = SCRIPT.read_text(encoding="utf-8")
        for needle in ("C:/Users", "C:\\Users", "/home/", "/Users/"):
            self.assertNotIn(needle, text, f"{needle} found in notes-map.py")


if __name__ == "__main__":
    unittest.main()
