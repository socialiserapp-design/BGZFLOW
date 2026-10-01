#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""notes-map: a small graft-style map for project NOTES (markdown and text).

AI agents read a short map, then only the lines they need, instead of opening
whole 100+ KB handover files.  graft/CodeGraph stay the tools for code.

  notes-map build <root>                  index every .md/.txt under <root>, write <root>/.notes-map/
  notes-map ask "plain words" [<root>]    best sections for a question   [-n 8] [--source] [--max-lines 60] [--in SUBPATH]
  notes-map show <file>:<start>-<end>     print exactly those lines (200 max)   [--root ROOT]

Python standard library only (sqlite3 with FTS5); the shims require Python 3.10 or newer.  Writes only <root>/.notes-map/
and one `.notes-map/` line in the git info/exclude file of the enclosing repo.
Line numbers are 1-based and split on \\n only, so they match `rg -n` and `sed -n`.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sqlite3
import sys
import time

__version__ = "1.0"

# ----------------------------------------------------------------------------
# Constants
# ----------------------------------------------------------------------------
SCHEMA_VERSION = 5                        # bump when parsing/summary logic changes: old indexes rebuild themselves
SKIP_DIRS = {".git", "node_modules", ".notes-map", ".bgzflow", "graft", ".codegraph"}
EXTS = (".md", ".txt")
MAX_FILE_BYTES = 5 * 1024 * 1024          # skip files over 5 MB
SPLIT_OVER = 150                          # a headed section longer than this is split ...
CHUNK = 120                               # ... into parts of at most this many lines
SUMMARY_WORDS = 30
BODY_INDEX_CAP = MAX_FILE_BYTES           # whole section body is searchable (files over 5 MB are skipped anyway)
MAP_MAX_BYTES = 40_000                    # NOTES-MAP.md hard cap (spec: 40 KB or less)
MAP_RECENT_FILES = 12
MAP_LINES_PER_FILE = 30
SHOW_MAX_LINES = 200
SHOW_MAX_LINE_CHARS = 2000
SOURCE_MAX_LINE_CHARS = 300
ASK_TOTAL_LINES = 400                     # output cap for `ask --source`
W_HEADING, W_SUMMARY, W_BODY, W_CONTEXT = 5.0, 2.0, 1.0, 1.5
NEAR_WINDOW = 20                          # FTS5 NEAR(): max tokens between the query words for the proximity bonus
NEAR_BONUS = 0.5                          # weight of that bonus (bm25 of the NEAR query) added to the main bm25 score
RECENT_HOURS = 48.0
RECENT_BOOST = 0.15                       # up to +15% for a file modified just now, fading to 0 at 48 h
SEP = " \u203a "                          # heading path separator  (Parent > Child)
DASH = " \u2014 "

STOPWORDS = set(
    "a an and any are as at be been but by can could did do does for from had has have how i if in into is it "
    "its me my of on or our so than that the their them then there these they this to us was we were what when "
    "where which who whom why will with would you your about all also just not no more most some such very".split()
)

FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
HEAD_RE = re.compile(r"^ {0,3}(#{1,6})(?:[ \t]+(.*))?$")
CLOSING_HASHES_RE = re.compile(r"(?:^|[ \t]+)#+[ \t]*$")
LINK_RE = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
AUTOLINK_RE = re.compile(r"<((?:https?|mailto|ftp):[^>\s]+)>")
# real HTML tags and comments only: placeholders such as <slug> or <start>-<end> are text and must survive
TAG_RE = re.compile(
    r"</?(?:a|abbr|b|blockquote|br|center|code|del|details|div|em|figcaption|figure|font|h[1-6]|hr|i|img|ins|kbd|li|"
    r"mark|ol|p|pre|s|small|span|strike|strong|sub|summary|sup|table|tbody|td|th|thead|tr|tt|u|ul)"
    r"(?:\s[^>\n]{0,300})?/?>|<!--.*?-->", re.I)
WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)


class NotesMapError(Exception):
    """A user-facing error (printed as one line, exit code 2)."""


# ----------------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------------
def posix(p: str) -> str:
    return p.replace("\\", "/")


def fix_posix_drive(p: str) -> str:
    """Turn a POSIX-style drive path (/c/dir or /mnt/c/dir) into a drive-letter path on Windows (agents mix shells)."""
    if os.name == "nt":
        m = re.match(r"^/(?:mnt/)?([a-zA-Z])(?:/(.*))?$", p)
        if m and not os.path.exists(p):
            return m.group(1).upper() + ":/" + (m.group(2) or "")
    return p


def long_path(p: str) -> str:
    """Windows extended-length path when needed (paths >= 240 chars)."""
    if os.name == "nt":
        ap = os.path.abspath(p)
        if len(ap) >= 240 and not ap.startswith("\\\\?\\"):
            if ap.startswith("\\\\"):
                return "\\\\?\\UNC\\" + ap[2:]
            return "\\\\?\\" + ap
    return p


def eprint(*a) -> None:
    sys.stderr.write(" ".join(str(x) for x in a) + "\n")


def fmt_kb(nbytes: int) -> str:
    return "%.1f" % (nbytes / 1024.0)


def fmt_mb(nbytes: int) -> str:
    return "%.2f MB" % (nbytes / 1048576.0)


def fmt_time(mtime_ns: int, with_time: bool = True) -> str:
    try:
        t = dt.datetime.fromtimestamp(mtime_ns / 1e9)
        return t.strftime("%Y-%m-%d %H:%M" if with_time else "%Y-%m-%d")
    except (OverflowError, OSError, ValueError):
        return "?"


def setup_stdio() -> None:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace", newline="\n")  # type: ignore[attr-defined]
        except Exception:
            try:
                s.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
            except Exception:
                pass


def find_root(start: str):
    """Nearest ancestor (or self) of `start` that contains a .notes-map/ folder."""
    d = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(d, ".notes-map")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


# ----------------------------------------------------------------------------
# Reading files
# ----------------------------------------------------------------------------
def decode_bytes(b: bytes):
    """bytes -> str. BOM sniffing, BOM-less UTF-16, UTF-8, cp1252 fallback. None = binary."""
    text = _decode_bytes(b)
    if text is not None and text.startswith("﻿"):
        text = text[1:]                                    # stray BOM char left after decoding
    return text


def _decode_bytes(b: bytes):
    if b.startswith(b"\xef\xbb\xbf"):
        return b[3:].decode("utf-8", "replace")
    if b.startswith((b"\xff\xfe\x00\x00", b"\x00\x00\xfe\xff")):
        try:
            return b.decode("utf-32")
        except UnicodeError:
            pass
    if b.startswith((b"\xff\xfe", b"\xfe\xff")):
        return b.decode("utf-16", "replace")
    head = b[:4096]
    if b"\x00" in head:
        half = max(1, len(head) // 2)
        even, odd = head[0::2].count(0), head[1::2].count(0)
        if odd > 0.3 * half and even < 0.05 * half:
            return b.decode("utf-16-le", "replace")
        if even > 0.3 * half and odd < 0.05 * half:
            return b.decode("utf-16-be", "replace")
        return None
    try:
        return b.decode("utf-8")
    except UnicodeDecodeError:
        return b.decode("cp1252", "replace")


def split_lines(text: str):
    """Split on \\n only (CRLF tolerated), so line numbers match rg -n / sed -n / editors."""
    if "\n" in text:
        lines = text.split("\n")
    elif "\r" in text:
        lines = text.split("\r")
    else:
        lines = [text]
    if lines and lines[-1] == "":
        lines.pop()
    return [ln[:-1] if ln.endswith("\r") else ln for ln in lines]


def read_lines(path: str):
    with open(long_path(path), "rb") as f:
        data = f.read()
    text = decode_bytes(data)
    if text is None:
        return None
    return split_lines(text)


# ----------------------------------------------------------------------------
# Parsing a file into sections
# ----------------------------------------------------------------------------
def clean_inline(s: str) -> str:
    s = LINK_RE.sub(r"\1", s)
    s = AUTOLINK_RE.sub(r"\1", s)
    s = TAG_RE.sub(" ", s)
    s = s.replace("`", "").replace("**", "").replace("~~", "")
    return re.sub(r"\s+", " ", s).strip()


def clean_heading(s: str, cap: int = 100) -> str:
    s = clean_inline(s)
    return s if len(s) <= cap else s[: cap - 1].rstrip() + "\u2026"


_LIST_RE = re.compile(r"^(?:[-*+]\s+|\d{1,3}[.)]\s+)")
_CHECK_RE = re.compile(r"^\[[ xX]\]\s+")


def summary_words(lines, skip, lo: int, hi: int, limit: int = SUMMARY_WORDS) -> str:
    """First non-empty, non-heading line(s) of lines[lo:hi], cleaned, `limit` words or fewer."""
    words = []
    truncated = False
    for i in range(lo, hi):
        if i in skip:
            continue
        s = lines[i][:600].strip()
        if not s:
            continue
        s = re.sub(r"^(?:>\s*)+", "", s)
        s = _LIST_RE.sub("", s)
        s = _CHECK_RE.sub("", s)
        s = clean_inline(s).strip("| ").strip()
        if not any(ch.isalnum() for ch in s):
            continue                       # rules, table separators, bare punctuation
        for w in s.split():
            if w == "|":
                continue
            if len(words) >= limit:
                truncated = True
                break
            words.append(w)
        if truncated or len(words) >= limit:
            # look no further; mark truncation only if more text really follows
            if not truncated:
                for j in range(i + 1, hi):
                    if j not in skip and lines[j].strip() and any(c.isalnum() for c in lines[j][:80]):
                        truncated = True
                        break
            break
    out = " ".join(words)
    return out + "\u2026" if truncated and out else out


def scan_structure(lines):
    """Return (headings, fence_marker_idx, fence_pairs). Headings inside code fences are ignored."""
    n = len(lines)
    heads = []                   # (idx, level, text)
    markers = set()
    pairs = []
    i = 0
    if n and lines[0].strip() == "---":                  # YAML front matter
        for j in range(1, min(n, 200)):
            if lines[j].strip() in ("---", "..."):
                i = j + 1
                break
    failed = {}                  # fence char -> smallest fence length that found no closer
    while i < n:
        line = lines[i]
        fm = FENCE_RE.match(line) if line[:4].lstrip(" ")[:1] in ("`", "~") else None
        if fm:
            fch, flen, info = fm.group(1)[0], len(fm.group(1)), fm.group(2)
            if not (fch == "`" and "`" in info) and not (fch in failed and flen >= failed[fch]):
                found = -1
                for j in range(i + 1, n):
                    cm = FENCE_RE.match(lines[j])
                    if cm and cm.group(1)[0] == fch and len(cm.group(1)) >= flen and not cm.group(2).strip():
                        found = j
                        break
                if found >= 0:
                    markers.add(i)
                    markers.add(found)
                    pairs.append((i, found))
                    i = found + 1
                    continue
                failed[fch] = min(failed.get(fch, flen), flen)   # unclosed: treat the opener as plain text
        if line.lstrip(" ")[:1] == "#":
            hm = HEAD_RE.match(line.rstrip())
            if hm and hm.group(2) is not None:
                text = CLOSING_HASHES_RE.sub("", hm.group(2)).strip()
                if text:
                    heads.append((i, len(hm.group(1)), text))
        i += 1
    return heads, markers, pairs


def split_ranges(lines, s: int, e: int, fenced):
    """Split lines[s:e] into k = ceil(len/CHUNK) balanced parts, each <= CHUNK lines,
    preferring cuts after a blank line and never inside a code fence."""
    length = e - s
    k = -(-length // CHUNK)
    if k <= 1:
        return [(s, e)]
    parts = []
    cur = s
    for cut_no in range(1, k):
        remaining_parts = k - cut_no + 1
        ideal = cur + int(round((e - cur) / float(remaining_parts)))
        lo = max(cur + 1, e - CHUNK * (remaining_parts - 1))
        hi = min(cur + CHUNK, e - 1)
        ideal = min(max(ideal, lo), hi)
        best = None
        for c in range(max(lo, ideal - 15), min(hi, ideal + 15) + 1):
            inside = fenced[c] and fenced[c - 1]
            if inside:
                continue
            blank_before = not lines[c - 1].strip()
            key = (0 if blank_before else 1, abs(c - ideal))
            if best is None or key < best[0]:
                best = (key, c)
        cut = best[1] if best else ideal
        parts.append((cur, cut))
        cur = cut
    parts.append((cur, e))
    return parts


def build_sections(lines, stem: str):
    """-> list of dict(start,end (1-based inclusive), level, heading, index_heading, summary, body, title)."""
    n = len(lines)
    heads, markers, pairs = scan_structure(lines)
    head_idx = {h[0] for h in heads}
    skip = head_idx | markers
    fenced = bytearray(n + 1)
    for a, b in pairs:
        for x in range(a, b + 1):
            fenced[x] = 1

    h1s = [h for h in heads if h[1] == 1]
    doc_title = clean_heading(heads[0][2]) if heads and heads[0][1] == 1 and len(h1s) == 1 else None

    # 1. raw blocks: preamble + one block per heading (path = ancestors + self)
    blocks = []
    first = heads[0][0] if heads else n
    if first > 0:
        blocks.append(dict(start=0, end=first, level=0, path=[stem], headed=False))
    stack = []
    for k, (i, lv, tx) in enumerate(heads):
        while stack and stack[-1][0] >= lv:
            stack.pop()
        stack.append((lv, clean_heading(tx)))
        end = heads[k + 1][0] if k + 1 < len(heads) else n
        blocks.append(dict(start=i, end=end, level=lv, path=[t for _, t in stack], headed=True))

    # 2. trim; fold heading-only blocks into the next block that has text
    secs = []
    pend = None
    for b in blocks:
        s, e = b["start"], b["end"]
        body_from = s + 1 if b["headed"] else s
        last = e - 1
        while last >= body_from and not lines[last].strip():
            last -= 1
        if not b["headed"]:
            while s <= last and not lines[s].strip():
                s += 1
            if s > last:
                continue                                    # blank preamble
        elif last < body_from:                              # heading-only: fold into the next section
            if pend is None:
                pend = s
            continue
        start = pend if pend is not None else s
        pend = None
        secs.append(dict(start=start, end=last + 1, level=b["level"], path=b["path"], headed=b["headed"]))

    if not secs and any(ln.strip() for ln in lines):        # only headings, no text at all
        s = 0
        while not lines[s].strip():
            s += 1
        e = n
        while not lines[e - 1].strip():
            e -= 1
        secs.append(dict(start=s, end=e, level=0, path=[stem], headed=False))

    # 3. split long sections into parts; build summary/body per part
    out = []
    for sec in secs:
        s, e = sec["start"], sec["end"]
        limit = SPLIT_OVER if sec["headed"] else CHUNK
        parts = split_ranges(lines, s, e, fenced) if (e - s) > limit else [(s, e)]
        path = sec["path"]
        idx_path = path[1:] if (doc_title and len(path) > 1 and path[0] == doc_title) else path
        for pn, (ps, pe) in enumerate(parts, 1):
            leaf = path[-1]
            if len(parts) > 1:
                shown = SEP.join(path[:-1] + ["%s (part %d)" % (leaf, pn)])
            else:
                shown = SEP.join(path)
            body = "\n".join(lines[j] for j in range(ps, pe) if j not in head_idx)
            out.append(dict(
                start=ps + 1, end=pe, level=sec["level"], heading=shown,
                index_heading=SEP.join(idx_path),
                summary=summary_words(lines, skip, ps, pe),
                body=body[:BODY_INDEX_CAP],
                title=doc_title or "",
            ))
    return out


# ----------------------------------------------------------------------------
# Database
# ----------------------------------------------------------------------------
DDL = [
    "CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)",
    "CREATE TABLE files (id INTEGER PRIMARY KEY, path TEXT NOT NULL UNIQUE, size INTEGER NOT NULL, "
    "mtime_ns INTEGER NOT NULL, nsections INTEGER NOT NULL DEFAULT 0, nlines INTEGER NOT NULL DEFAULT 0, "
    "title TEXT NOT NULL DEFAULT '')",
    "CREATE TABLE sections (id INTEGER PRIMARY KEY, file_id INTEGER NOT NULL, start_line INTEGER NOT NULL, "
    "end_line INTEGER NOT NULL, level INTEGER NOT NULL, heading TEXT NOT NULL, summary TEXT NOT NULL, "
    "sig TEXT NOT NULL DEFAULT '')",
    "CREATE INDEX sections_file ON sections(file_id, start_line)",
    "CREATE VIRTUAL TABLE notes_fts USING fts5(heading, summary, body, context, "
    "tokenize='porter unicode61 remove_diacritics 2')",
]


def connect(dbp: str) -> sqlite3.Connection:
    conn = sqlite3.connect(dbp, timeout=30.0, isolation_level=None)
    try:
        conn.execute("PRAGMA synchronous=NORMAL")
        ver = conn.execute("PRAGMA user_version").fetchone()[0]
        if ver != SCHEMA_VERSION:
            conn.execute("BEGIN IMMEDIATE")
            try:
                if conn.execute("PRAGMA user_version").fetchone()[0] != SCHEMA_VERSION:
                    for t in ("notes_fts", "sections", "files", "meta"):
                        conn.execute("DROP TABLE IF EXISTS " + t)
                    for stmt in DDL:
                        conn.execute(stmt)
                    conn.execute("PRAGMA user_version=%d" % SCHEMA_VERSION)
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise
    except BaseException:
        conn.close()          # a failed open must not keep the file handle: Windows cannot delete a held file
        raise
    return conn


def needs_rebuild(ex: Exception) -> bool:
    """True when the index file itself is damaged (safe to delete and re-create: it is only a cache).
    Busy / locked / disk-full / read-only errors are NOT damage and must not trigger a delete."""
    if not isinstance(ex, sqlite3.DatabaseError):
        return False
    m = str(ex).lower()
    if isinstance(ex, sqlite3.OperationalError):
        return "no such table" in m or "no such column" in m or "malformed" in m
    return True               # DatabaseError proper: "file is not a database", "database disk image is malformed"


def scan_tree(root: str):
    """-> ({relpath: (size, mtime_ns)}, [too-large relpaths]). Skips SKIP_DIRS, symlinks/junctions."""
    files = {}
    too_large = []
    stack = [(root, "")]
    while stack:
        d, rel_dir = stack.pop()
        try:
            it = os.scandir(long_path(d))
        except OSError:
            continue
        with it:
            for e in it:
                try:
                    name = e.name
                    if e.is_dir(follow_symlinks=False):
                        if name.lower() in SKIP_DIRS:
                            continue
                        if e.is_symlink() or getattr(e.stat(follow_symlinks=False), "st_reparse_tag", 0) in (
                            0xA000000C, 0xA0000003
                        ):
                            continue                     # symlink / junction: never follow (loop safety)
                        stack.append((os.path.join(d, name), rel_dir + name + "/"))
                        continue
                    if not name.lower().endswith(EXTS) or not e.is_file():
                        continue
                    # os.stat, not DirEntry.stat(): on NTFS the directory entry can lag behind
                    # for files another process is still writing (running job logs).
                    st = os.stat(long_path(os.path.join(d, name)))
                except OSError:
                    continue
                rel = rel_dir + name
                if st.st_size > MAX_FILE_BYTES:
                    too_large.append(rel)
                    continue
                files[rel] = (st.st_size, st.st_mtime_ns)
    return files, too_large


def _delete_file_sections(conn, fid: int) -> None:
    ids = [r[0] for r in conn.execute("SELECT id FROM sections WHERE file_id=?", (fid,))]
    if ids:
        conn.executemany("DELETE FROM notes_fts WHERE rowid=?", [(i,) for i in ids])
        conn.execute("DELETE FROM sections WHERE file_id=?", (fid,))


def _index_file(conn, root: str, rel: str, size: int, mtime_ns: int):
    """Parse one file and (re)write its rows. Returns 'ok' | 'binary'; raises OSError if unreadable."""
    lines = read_lines(os.path.join(root, rel.replace("/", os.sep)))
    row = conn.execute("SELECT id FROM files WHERE path=?", (rel,)).fetchone()
    if row:
        fid = row[0]
        _delete_file_sections(conn, fid)
    if lines is None:
        secs, nlines, status = [], 0, "binary"
    else:
        stem = os.path.splitext(rel.rsplit("/", 1)[-1])[0]
        secs, nlines, status = build_sections(lines, stem), len(lines), "ok"
    title = secs[0]["title"] if secs else ""
    if row:
        conn.execute("UPDATE files SET size=?, mtime_ns=?, nsections=?, nlines=?, title=? WHERE id=?",
                     (size, mtime_ns, len(secs), nlines, title, fid))
    else:
        fid = conn.execute("INSERT INTO files(path,size,mtime_ns,nsections,nlines,title) VALUES (?,?,?,?,?,?)",
                           (rel, size, mtime_ns, len(secs), nlines, title)).lastrowid
    path_words = os.path.splitext(rel)[0]
    import hashlib                                         # lazy: only indexing needs it
    for s in secs:
        sig = hashlib.md5((s["heading"] + "\x00" + s["body"]).encode("utf-8", "replace")).hexdigest()
        sid = conn.execute(
            "INSERT INTO sections(file_id,start_line,end_line,level,heading,summary,sig) VALUES (?,?,?,?,?,?,?)",
            (fid, s["start"], s["end"], s["level"], s["heading"], s["summary"], sig)).lastrowid
        conn.execute("INSERT INTO notes_fts(rowid,heading,summary,body,context) VALUES (?,?,?,?,?)",
                     (sid, s["index_heading"], s["summary"], s["body"], path_words + " " + s["title"]))
    return status


class Stats:
    def __init__(self):
        self.new = self.changed = self.deleted = self.unchanged = 0
        self.unreadable = []
        self.binary = 0
        self.too_large = []

    @property
    def touched(self) -> bool:
        return bool(self.new or self.changed or self.deleted)


def _diff(disk, known):
    new = sorted(p for p in disk if p not in known)
    changed = sorted(p for p in disk if p in known and known[p] != disk[p])
    deleted = sorted(p for p in known if p not in disk)
    return new, changed, deleted


def refresh(conn, root: str) -> Stats:
    """Bring the index in line with the tree. Fast path (nothing changed) takes no write lock."""
    st = Stats()
    disk, too_large = scan_tree(root)
    st.too_large = too_large
    known = {p: (s, m) for p, s, m in conn.execute("SELECT path,size,mtime_ns FROM files")}
    new, changed, deleted = _diff(disk, known)
    if not (new or changed or deleted):
        st.unchanged = len(disk)
        _set_meta_if_differs(conn, "skipped_large", str(len(too_large)))
        return st
    conn.execute("BEGIN IMMEDIATE")
    try:
        known = {p: (s, m) for p, s, m in conn.execute("SELECT path,size,mtime_ns FROM files")}
        new, changed, deleted = _diff(disk, known)         # re-check: another process may have done it
        for rel in deleted:
            row = conn.execute("SELECT id FROM files WHERE path=?", (rel,)).fetchone()
            if row:
                _delete_file_sections(conn, row[0])
                conn.execute("DELETE FROM files WHERE id=?", (row[0],))
        for rel in new + changed:
            size, mtime_ns = disk[rel]
            try:
                status = _index_file(conn, root, rel, size, mtime_ns)
            except OSError as ex:
                st.unreadable.append("%s (%s)" % (rel, ex.__class__.__name__))
                continue
            if status == "binary":
                st.binary += 1
            if rel in known:
                st.changed += 1
            else:
                st.new += 1
        st.deleted = len(deleted)
        st.unchanged = len(disk) - len(new) - len(changed)
        _set_meta(conn, "skipped_large", str(len(too_large)))
        _set_meta(conn, "refreshed", str(int(time.time())))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return st


def _set_meta(conn, key: str, value: str) -> None:
    conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES (?,?)", (key, value))


def _set_meta_if_differs(conn, key: str, value: str) -> None:
    row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    if not row or row[0] != value:
        try:
            _set_meta(conn, key, value)
        except sqlite3.OperationalError:
            pass


def _get_meta(conn, key: str, default: str = "") -> str:
    row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row[0] if row else default


def open_index(root: str, rebuild: bool = False):
    """Open (creating if needed) the index and refresh it. Returns (conn, Stats, created)."""
    nm = os.path.join(root, ".notes-map")
    os.makedirs(nm, exist_ok=True)
    dbp = os.path.join(nm, "index.sqlite")
    created = not os.path.exists(dbp)
    if rebuild and not created:
        _remove_index_files(dbp)
        created = True
    for attempt in (1, 2):
        conn = None
        try:
            conn = connect(dbp)
            return conn, refresh(conn, root), created
        except sqlite3.DatabaseError as ex:
            # corrupt / not a database: it is only a cache, so rebuild it once from the notes
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
            if attempt == 2 or not needs_rebuild(ex):
                raise
            _remove_index_files(dbp)
            created = True
    raise NotesMapError("could not open index")


def _remove_index_files(dbp: str) -> None:
    for suffix in ("", "-journal", "-wal", "-shm"):
        try:
            os.remove(dbp + suffix)
        except FileNotFoundError:
            pass
        except OSError as ex:
            raise NotesMapError("cannot remove index file %s: %s (close other notes-map processes and retry)"
                                % (posix(dbp + suffix), ex))


# ----------------------------------------------------------------------------
# NOTES-MAP.md
# ----------------------------------------------------------------------------
def _words_cap(text: str, cap: int) -> str:
    if cap <= 0 or not text:
        return ""
    w = text.split()
    if len(w) <= cap:
        return text
    return " ".join(w[:cap]).rstrip("\u2026") + "\u2026"


def _outline_pick(rows, cap: int):
    """More sections than fit. Notes are often append-style (newest at the bottom), so keep the last third
    (the latest entries) plus the shallowest headings of the rest (structure), shown in file order."""
    tail_n = max(1, cap // 3)
    tail = rows[-tail_n:]
    head = sorted(rows[:-tail_n], key=lambda r: (r[2], r[0]))[: cap - tail_n]
    return sorted(head + tail, key=lambda r: r[0])


def _render_lists(files, sects, cap_lines: int, cap_words: int) -> str:
    out = ["## Sections of the %d newest files" % len(files), ""]
    for fid, path, size, mtime_ns, _n, title in files:
        rows = sects[fid]
        block = "### %s (%s KB, modified %s)" % (path, fmt_kb(size), fmt_time(mtime_ns))
        if title:
            block += DASH + "title: " + clean_heading(title, 90)
        out.append(block)
        if not rows:
            out.append("(no text sections)")
        chosen = rows if len(rows) <= cap_lines else _outline_pick(rows, cap_lines)
        prefix = title + SEP if title else None
        for s, e, _lv, heading, summary in chosen:
            if prefix and heading.startswith(prefix):
                heading = heading[len(prefix):]            # the file's title is shown once, in the block header
            line = "L%d-%d %s" % (s, e, heading)
            sm = _words_cap(summary, cap_words)
            if sm:
                line += DASH + sm
            out.append(line)
        if len(rows) > len(chosen):
            out.append('+%d more sections (notes-map ask "..." --in %s)' % (len(rows) - len(chosen), path))
        out.append("")
    return "\n".join(out)


def render_map(conn, root: str) -> str:
    files = conn.execute("SELECT id,path,size,mtime_ns,nsections,title FROM files ORDER BY mtime_ns DESC, path").fetchall()
    nsec = conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0]
    total = sum(f[2] for f in files)
    skipped = int(_get_meta(conn, "skipped_large", "0") or 0)
    built = dt.datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %z")
    header = "\n".join([
        "# NOTES-MAP",
        "",
        "- root: %s" % posix(root),
        "- built: %s (refreshed automatically by `notes-map ask` / `build`)" % built,
        "- files: %d indexed, %s, %d sections%s" % (
            len(files), fmt_mb(total), nsec, ", %d skipped (over 5 MB)" % skipped if skipped else ""),
        '- use: `notes-map ask "plain words" [--source]` finds sections; `notes-map show <file>:<start>-<end>` '
        "prints exact lines (200 max). Read only the lines you need, not whole files.",
        "",
    ])
    recent = files[:MAP_RECENT_FILES]
    sects = {f[0]: conn.execute(
        "SELECT start_line,end_line,level,heading,summary FROM sections WHERE file_id=? ORDER BY start_line",
        (f[0],)).fetchall() for f in recent}

    def table_rows(rows):
        return ["| %s | %s | %s | %d |" % (p.replace("|", "\\|"), fmt_kb(sz), fmt_time(mt), ns)
                for _i, p, sz, mt, ns, _t in rows]

    table_head = ["## Files (newest first)", "", "| path | KB | modified | sections |", "|---|---:|---|---:|"]
    full_table = "\n".join(table_head + table_rows(files)) + "\n"
    hb = len(header.encode("utf-8"))
    table_min = min(len(full_table.encode("utf-8")), 16_000)
    list_budget = MAP_MAX_BYTES - hb - table_min - 300

    lists = ""
    configs = [(30, 30), (30, 18), (30, 12), (24, 12), (18, 12), (18, 8), (12, 8), (12, 5), (8, 5), (5, 5), (5, 0)]
    for cl, cw in configs:
        lists = _render_lists(recent, sects, min(cl, MAP_LINES_PER_FILE), cw)
        if len(lists.encode("utf-8")) <= list_budget:
            break
    else:
        for k in range(len(recent) - 1, 0, -1):            # still too big: fewer files
            lists = _render_lists(recent[:k], sects, 5, 0)
            if len(lists.encode("utf-8")) <= list_budget:
                break
    if not recent:
        lists = ""
    table_budget = MAP_MAX_BYTES - hb - len(lists.encode("utf-8")) - 200
    rows = table_rows(files)
    head_bytes = len(("\n".join(table_head) + "\n").encode("utf-8"))
    used, kept = head_bytes, 0
    reserve = 60
    for r in rows:
        b = len(r.encode("utf-8")) + 1
        if used + b + reserve > table_budget and kept < len(rows):
            break
        used += b
        kept += 1
    table = table_head + rows[:kept]
    if kept < len(rows):
        table.append("+%d more files (not listed; use `notes-map ask`)" % (len(rows) - kept))
    text = header + "\n" + "\n".join(table) + "\n\n" + lists
    text = text.rstrip("\n") + "\n"
    while len(text.encode("utf-8")) > MAP_MAX_BYTES:        # cannot happen with the budgets above; safety net
        text = text[: int(len(text) * 0.95)].rsplit("\n", 1)[0] + "\n"
    return text


def write_map(conn, root: str):
    path = os.path.join(root, ".notes-map", "NOTES-MAP.md")
    text = render_map(conn, root)
    tmp = path + ".tmp%d" % os.getpid()
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    try:
        os.replace(tmp, path)
    except OSError:
        try:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(text)
        finally:
            try:
                os.remove(tmp)
            except OSError:
                pass
    return path, len(text.encode("utf-8"))


# ----------------------------------------------------------------------------
# git exclude
# ----------------------------------------------------------------------------
_EXCLUDE_OK = {".notes-map/", ".notes-map", "/.notes-map/", "/.notes-map", "**/.notes-map/", "**/.notes-map"}


def ensure_git_exclude(root: str) -> str:
    """Add `.notes-map/` to $(git rev-parse --git-common-dir)/info/exclude if missing."""
    import subprocess                                      # lazy: only build / first-time ask need git
    try:
        cp = subprocess.run(["git", "-C", root, "rev-parse", "--git-common-dir"], capture_output=True,
                            text=True, encoding="utf-8", errors="replace", timeout=20)
    except (OSError, subprocess.SubprocessError):
        return "git not available (nothing to exclude)"
    out = cp.stdout.strip().splitlines()
    if cp.returncode != 0 or not out:
        return "not inside a git repo"
    gd = out[0].strip()
    if not os.path.isabs(gd):
        gd = os.path.join(root, gd)                        # git prints it relative to -C dir
    excl = os.path.normpath(os.path.join(gd, "info", "exclude"))
    existing = ""
    try:
        with open(excl, "r", encoding="utf-8", errors="replace") as f:
            existing = f.read()
    except FileNotFoundError:
        pass
    except OSError as ex:
        return "could not read %s (%s)" % (posix(excl), ex)
    if any(ln.strip() in _EXCLUDE_OK for ln in existing.splitlines()):
        return "already in " + posix(excl)
    try:
        os.makedirs(os.path.dirname(excl), exist_ok=True)
        with open(excl, "a", encoding="utf-8", newline="\n") as f:
            if existing and not existing.endswith("\n"):
                f.write("\n")
            f.write(".notes-map/\n")
    except OSError as ex:
        return "could not write %s (%s)" % (posix(excl), ex)
    return "added `.notes-map/` to " + posix(excl)


# ----------------------------------------------------------------------------
# ask
# ----------------------------------------------------------------------------
def build_match(query: str):
    """Plain words -> (safe FTS5 MATCH string with every term quoted and ORed, content terms, NEAR expression or None).
    The NEAR expression (all content words within NEAR_WINDOW tokens) is run as a separate query whose bm25 score is
    added to the main score with weight NEAR_BONUS, so proximity boosts a section without drowning heading matches."""
    tokens, chunk_phrases = [], []
    for chunk in query.split():
        toks = [t.lower() for t in WORD_RE.findall(chunk)]
        if not toks:
            continue
        tokens.extend(toks)
        if (len(toks) >= 2 and toks not in chunk_phrases
                and any(t not in STOPWORDS and (len(t) > 1 or t.isdigit()) for t in toks)):
            chunk_phrases.append(toks)                     # F-72, snake_case, path/like.this -> adjacent phrase
    seen, terms = set(), []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            terms.append(t)
    content = [t for t in terms if t not in STOPWORDS and (len(t) > 1 or t.isdigit())] or terms
    content = content[:20]
    if not content:
        return None, [], None
    clauses = []
    near = None
    if 2 <= len(content) <= 8:
        # the whole question as an adjacent phrase, but only in heading/summary/path: rewards sections that are
        # ABOUT the topic, not ones that mention it in passing ("... is not a release blocker")
        clauses.append('{heading summary context} : "%s"' % " ".join(content))
        # proximity bonus (plain bm25 ignores word distance). Measured on the real notes with known-item queries:
        # rank-1 hit rate for remembered phrases, measured on three real project note sets: 56% -> ~72%, 41% -> ~60%, 87% -> ~95%
        near = "NEAR(%s, %d)" % (" ".join('"%s"' % t for t in content), NEAR_WINDOW)
    for p in chunk_phrases[:5]:
        if p != content:
            clauses.append('"%s"' % " ".join(p))           # identifiers like F-72 match anywhere, adjacent
    clauses += ['"%s"' % t for t in content]
    return " OR ".join(clauses), content, near


def _norm_sub(sub: str, root: str) -> str:
    s = posix(sub.strip())
    if os.path.isabs(sub) or re.match(r"^[A-Za-z]:/", s):
        r = posix(root).rstrip("/") + "/"
        if s.lower().startswith(r.lower()):
            s = s[len(r):]
    while s.startswith("./"):
        s = s[2:]
    return s.strip("/").lower()


def _source_lines(cache, root, rel, s, e, cap):
    """Lines s..e (1-based) of a file, at most `cap`; returns (lines, total_available_in_range)."""
    if rel not in cache:
        try:
            cache[rel] = read_lines(os.path.join(root, rel.replace("/", os.sep))) or []
        except OSError:
            cache[rel] = []
    ls = cache[rel][s - 1:e]
    return ls[:cap], len(ls)


def _clip(line: str, cap: int) -> str:
    return line if len(line) <= cap else line[:cap] + " \u2026[+%d chars]" % (len(line) - cap)


def _ranked_sql(with_near: bool, filtered: bool) -> str:
    cols = "%s, %s, %s, %s" % (W_HEADING, W_SUMMARY, W_BODY, W_CONTEXT)
    if with_near:
        # score = bm25(main query) + NEAR_BONUS * bm25(NEAR query); bm25 is negative, more negative = better
        score = "bm25(notes_fts, %s) + %r * COALESCE(nr.ns, 0.0)" % (cols, float(NEAR_BONUS))
        join = ("LEFT JOIN (SELECT rowid AS rid, bm25(notes_fts, %s) AS ns FROM notes_fts WHERE notes_fts MATCH ?) nr "
                "ON nr.rid = s.id " % cols)
    else:
        score, join = "bm25(notes_fts, %s)" % cols, ""
    return ("SELECT f.path, f.mtime_ns, s.start_line, s.end_line, s.heading, s.summary, %s AS score, s.sig "
            "FROM notes_fts JOIN sections s ON s.id = notes_fts.rowid JOIN files f ON f.id = s.file_id %s"
            "WHERE notes_fts MATCH ? %s ORDER BY score, f.path, s.start_line LIMIT ?"
            % (score, join, "AND inpath(f.path)" if filtered else ""))


def _query_index(root: str, match: str, terms, sub, cand: int, rebuild: bool = False, near=None):
    """Open + refresh the index, rewrite the map if anything changed, run the ranked query.
    -> (conn, Stats, created, n_files, n_sections, rows)"""
    conn, st, created = open_index(root, rebuild=rebuild)
    try:
        if st.touched or created:
            write_map(conn, root)
        nfiles = conn.execute("SELECT COUNT(*) FROM files").fetchone()[0]
        nsec = conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0]
        if sub is not None:
            conn.create_function("inpath", 1, lambda p: 1 if (p.lower() == sub or p.lower().startswith(sub + "/")
                                                            or not sub) else 0)
        try:
            if near:
                rows = conn.execute(_ranked_sql(True, sub is not None), (near, match, cand)).fetchall()
            else:
                rows = conn.execute(_ranked_sql(False, sub is not None), (match, cand)).fetchall()
        except sqlite3.OperationalError:                   # FTS5 rejected an expression: plain ORed terms instead
            safe = " OR ".join('"%s"' % t for t in terms)
            rows = conn.execute(_ranked_sql(False, sub is not None), (safe, cand)).fetchall()
    except BaseException:
        conn.close()
        raise
    return conn, st, created, nfiles, nsec, rows


def cmd_ask(args) -> int:
    words = list(args.words)
    root_arg = args.root
    if not root_arg and len(words) >= 2:
        last = fix_posix_drive(words[-1])
        if os.path.isdir(os.path.expanduser(last)):
            root_arg = words.pop()
        elif re.search(r"[\\/]|^[A-Za-z]:", words[-1]) and len(words) == 2:
            raise NotesMapError("root not found: " + words[-1])
    query = " ".join(words).strip()
    if root_arg:
        root = os.path.abspath(os.path.expanduser(fix_posix_drive(root_arg)))
        if not os.path.isdir(root):
            raise NotesMapError("root not found: " + root_arg)
    else:
        root = find_root(os.getcwd())
        if not root:
            raise NotesMapError("no .notes-map/ in %s or any parent; run `notes-map build <root>` first, or pass <root>"
                                % posix(os.getcwd()))
    n = max(1, min(args.n, 100))
    max_lines = max(1, min(args.max_lines, ASK_TOTAL_LINES))

    match, terms, near = build_match(query)
    if not match:
        raise NotesMapError("no searchable words in the query: %r" % query)

    sub = _norm_sub(args.in_path, root) if args.in_path else None
    cand = max(120, n * 15)                                # room to collapse identical copies and still fill n
    for attempt in (1, 2):
        try:
            conn, st, created, nfiles, nsec, rows = _query_index(root, match, terms, sub, cand,
                                                                 rebuild=(attempt == 2), near=near)
            break
        except sqlite3.DatabaseError as ex:
            if attempt == 2 or not needs_rebuild(ex):
                raise
            eprint("notes-map: index damaged (%s); rebuilding it from the notes" % ex)
    if created:
        eprint("notes-map: built new index in %s" % posix(os.path.join(root, ".notes-map")))
        ensure_git_exclude(root)

    now = time.time()

    def boosted(row):
        score, mtime_ns = row[6], row[1]
        age_h = max(0.0, (now - mtime_ns / 1e9) / 3600.0)
        boost = 1.0 + RECENT_BOOST * (1.0 - age_h / RECENT_HOURS) if age_h < RECENT_HOURS else 1.0
        return score * boost if score < 0 else score

    rows.sort(key=lambda r: (boosted(r), r[0], r[2]))
    # Handover folders hold many identical copies (packets, evidence dirs): one hit per distinct text,
    # the best-ranked copy sets the rank, the shallowest/newest path is shown, the others are listed.
    groups, order = {}, []
    for r in rows:
        if r[7] not in groups:
            groups[r[7]] = []
            order.append(r[7])
        groups[r[7]].append(r)
    hits = []
    for sig in order[:n]:
        members = groups[sig]
        rep = min(members, key=lambda r: (r[0].count("/"), -r[1], r[0], r[2]))
        hits.append((rep, [m for m in members if m is not rep]))

    refreshed = ""
    if st.touched:
        refreshed = "; refreshed: %d new, %d changed, %d deleted" % (st.new, st.changed, st.deleted)
    head = 'notes-map ask "%s" -- %d hit%s in %s (%d files, %d sections%s)' % (
        query.replace('"', "'"), len(hits), "" if len(hits) == 1 else "s", posix(root), nfiles, nsec, refreshed)
    if sub:
        head += " [in %s]" % (posix(args.in_path.strip()).strip("/") or sub)      # show it as typed; match lower-cased
    out = [head]
    if st.unreadable:
        out.append("warning: unreadable, skipped: " + "; ".join(st.unreadable[:5]))

    if not hits:
        lits = " ".join("-e %s" % _shquote(t) for t in terms)
        out.append("No sections match those words. Try a literal search: rg -n -i -F %s %s"
                   % (lits, _shquote(posix(root) + ("/" + sub if sub else ""))))
        sys.stdout.write("\n".join(out) + "\n")
        return 0

    budget = ASK_TOTAL_LINES - 3 if args.source else 10 ** 9
    used = len(out)
    cache = {}
    omitted = 0
    for idx, ((path, mtime_ns, s, e, heading, summary, _score, _sig), others) in enumerate(hits):
        if args.source and used + 3 > budget:
            omitted = len(hits) - idx
            break
        out.append("%s:%d-%d  %s  (modified %s)%s" % (
            path, s, e, heading, fmt_time(mtime_ns),
            "  [bm25 %.3f, ranked %.3f]" % (_score, boosted((path, mtime_ns, s, e, heading, summary, _score, _sig)))
            if args.scores else ""))
        out.append("    " + (summary if summary else "(no text)"))
        used += 2
        if others:
            also = "; ".join("%s:%d-%d" % (m[0], m[2], m[3]) for m in others[:2])
            if len(others) > 2:
                also += " (+%d more)" % (len(others) - 2)
            out.append("    identical text also at: " + also)
            used += 1
        if args.source:
            remaining = budget - used
            total = e - s + 1
            if total <= min(max_lines, remaining):
                shown_n = total
            else:
                shown_n = max(0, min(max_lines, remaining - 1))
            ls, avail = _source_lines(cache, root, path, s, e, shown_n)
            for ln in ls:
                out.append("    " + _clip(ln, SOURCE_MAX_LINE_CHARS))
            used += len(ls)
            if avail > len(ls):
                out.append("    \u2026 +%d more lines (notes-map show %s:%d-%d)" % (avail - len(ls), path, s + len(ls), e))
                used += 1
    if omitted:
        out.append("(output cap of %d lines reached; %d more hit%s not shown -- lower -n or use show)"
                   % (ASK_TOTAL_LINES, omitted, "" if omitted == 1 else "s"))
    cwd_root = find_root(os.getcwd())
    if cwd_root and os.path.normcase(cwd_root) == os.path.normcase(root):
        out.append("Read exact lines: notes-map show <path>:<start>-<end>")
    else:
        out.append('Read exact lines: notes-map show <path>:<start>-<end> --root "%s"' % posix(root))
    sys.stdout.write("\n".join(out) + "\n")
    return 0


def _shquote(s: str) -> str:
    return '"%s"' % s.replace("\\", "\\\\").replace('"', '\\"')


# ----------------------------------------------------------------------------
# build / show
# ----------------------------------------------------------------------------
def cmd_build(args) -> int:
    root = os.path.abspath(os.path.expanduser(fix_posix_drive(args.root)))
    if not os.path.isdir(root):
        raise NotesMapError("not a directory: " + args.root)
    t0 = time.time()
    conn, st, created = open_index(root, rebuild=args.rebuild)
    mp, msize = write_map(conn, root)
    gitmsg = ensure_git_exclude(root)
    nfiles = conn.execute("SELECT COUNT(*) FROM files").fetchone()[0]
    nsec = conn.execute("SELECT COUNT(*) FROM sections").fetchone()[0]
    dbp = os.path.join(root, ".notes-map", "index.sqlite")
    conn.close()
    lines = [
        "notes-map build %s" % posix(root),
        "  files: %d indexed (new %d, changed %d, deleted %d, unchanged %d); sections: %d; skipped over 5 MB: %d; "
        "binary: %d; unreadable: %d" % (nfiles, st.new, st.changed, st.deleted, st.unchanged, nsec,
                                         len(st.too_large), st.binary, len(st.unreadable)),
        "  time: %.2f s   map: %s (%s KB)   index: %s KB" % (
            time.time() - t0, posix(mp), fmt_kb(msize), fmt_kb(os.path.getsize(dbp))),
        "  git: %s" % gitmsg,
    ]
    if st.unreadable:
        lines.append("  unreadable (retried on next refresh): " + "; ".join(st.unreadable[:5]))
    sys.stdout.write("\n".join(lines) + "\n")
    return 0


def cmd_show(args) -> int:
    m = re.match(r"^(.*):(\d+)(?:-(\d+))?$", args.spec)
    if not m:
        raise NotesMapError("usage: notes-map show <file>:<start>-<end>   (got %r)" % args.spec)
    p, a = fix_posix_drive(m.group(1)), int(m.group(2))
    b = int(m.group(3)) if m.group(3) else a
    if b < a:
        a, b = b, a
    if a < 1:
        raise NotesMapError("line numbers start at 1")
    tried = []
    cands = []
    if os.path.isabs(p):
        cands.append(p)
    else:
        rooted = []
        r = os.path.abspath(os.path.expanduser(fix_posix_drive(args.root))) if args.root else find_root(os.getcwd())
        if r:
            rooted.append(os.path.join(r, p.replace("/", os.sep)))
        cwd_rel = os.path.abspath(p)
        cands = ([cwd_rel] + rooted) if p.startswith(("./", "../", ".\\", "..\\")) else (rooted + [cwd_rel])
    path = None
    for c in cands:
        tried.append(c)
        if os.path.isfile(long_path(c)):
            path = c
            break
    if not path:
        raise NotesMapError("file not found: %s (looked in: %s)" % (m.group(1), "; ".join(posix(t) for t in tried)))
    lines = read_lines(path)
    if lines is None:
        raise NotesMapError("binary file: " + posix(path))
    if a > len(lines):
        raise NotesMapError("%s has only %d lines" % (posix(path), len(lines)))
    b = min(b, len(lines))
    end = min(b, a + SHOW_MAX_LINES - 1)
    out = [_clip(ln, SHOW_MAX_LINE_CHARS) for ln in lines[a - 1:end]]
    sys.stdout.write("\n".join(out) + "\n")               # stdout: only file lines, never more than 200
    sys.stdout.flush()
    if end < b:                                            # the clip notice goes to stderr (still shown to agents)
        eprint("[notes-map: showing lines %d-%d of the %d-%d asked (200-line cap); continue with %s:%d-%d]"
               % (a, end, a, b, m.group(1), end + 1, b))
    return 0


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------
def make_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        prog="notes-map",
        description="Graft-style map for project NOTES (.md/.txt): read a map, then only the lines you need.",
        epilog='examples:\n  notes-map build "my-project/notes"\n  notes-map ask "what is blocked" -n 5 --source\n'
               '  notes-map show docs/plan.md:120-160',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", action="version", version="notes-map " + __version__)
    sub = ap.add_subparsers(dest="cmd", metavar="{build,ask,show}")
    sub.required = True

    b = sub.add_parser("build", help="index <root> and write <root>/.notes-map/ (incremental)")
    b.add_argument("root", nargs="?", default=".", help="notes folder (default: current directory)")
    b.add_argument("--rebuild", action="store_true", help="drop the index and reindex everything")
    b.set_defaults(func=cmd_build)

    a = sub.add_parser("ask", help='best sections for a question, e.g. ask "release blockers" [<root>]')
    a.add_argument("words", nargs="+", metavar="query [root]", help="the question in plain words, then optionally the root")
    a.add_argument("-n", type=int, default=8, help="hits to return (default 8)")
    a.add_argument("--source", action="store_true", help="also print each section's text")
    a.add_argument("--max-lines", type=int, default=60, help="source lines per hit (default 60; 400 lines total cap)")
    a.add_argument("--in", dest="in_path", metavar="SUBPATH", help="only files under this path (relative to the root)")
    a.add_argument("--root", help="notes root (default: nearest ancestor of the cwd with .notes-map/)")
    a.add_argument("--scores", action="store_true", help="show raw bm25 and boosted score per hit (debugging)")
    a.set_defaults(func=cmd_ask)

    s = sub.add_parser("show", help="print exactly lines <start>-<end> of <file> (200 max)")
    s.add_argument("spec", metavar="file:start-end")
    s.add_argument("--root", help="notes root for relative paths (default: nearest ancestor of the cwd with .notes-map/)")
    s.set_defaults(func=cmd_show)
    return ap


def main(argv=None) -> int:
    setup_stdio()
    args = make_parser().parse_args(argv)
    try:
        rc = args.func(args) or 0
        sys.stdout.flush()
        return rc
    except NotesMapError as ex:
        eprint("notes-map: %s" % ex)
        return 2
    except BrokenPipeError:
        try:
            sys.stdout = open(os.devnull, "w")
        except Exception:
            pass
        return 0
    except KeyboardInterrupt:
        return 130
    except sqlite3.OperationalError as ex:
        eprint("notes-map: database error: %s" % ex)
        return 1


if __name__ == "__main__":
    sys.exit(main())
