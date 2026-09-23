"""Function-level changes of the GLM Multivariate module between two revisions.

    python testing/glm-mv-reference/harness/fn_changes.py [OLD_REV] [NEW_REV|WORKTREE] [--json out.json]

For every .rs file under rust/src and every .ts file under services/ it
extracts the functions of both revisions (Rust `fn`, with the enclosing
`impl` type for methods; TypeScript `function` declarations, top level) and
their bodies by brace matching that skips strings, char literals and
comments. It prints, per file, the functions that were added, removed or
whose text changed (line endings and trailing whitespace ignored), with the
visibility (pub or private) of Rust items. Defaults: 82a63b45 vs WORKTREE.
"""
import json
import os
import re
import subprocess
import sys

MV = "frontend/components/Modals/Analyze/general-linear-model/multivariate"
ROOTS = [(MV + "/rust/src", ".rs"), (MV + "/services", ".ts")]
REPO = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()


def files_at(rev):
    out = set()
    for root, ext in ROOTS:
        if rev == "WORKTREE":
            for d, _, fs in os.walk(os.path.join(REPO, root)):
                out.update(os.path.relpath(os.path.join(d, f), REPO).replace("\\", "/") for f in fs if f.endswith(ext))
        else:
            ls = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", rev, root], text=True, cwd=REPO)
            out.update(f for f in ls.split() if f.endswith(ext))
    return out


def read(rev, path):
    if rev == "WORKTREE":
        with open(os.path.join(REPO, path), encoding="utf-8") as fh:
            return fh.read()
    return subprocess.check_output(["git", "show", f"{rev}:{path}"], cwd=REPO).decode("utf-8")


def code_mask(src, rust):
    """Copy of src where string, char and comment contents are blanked, so
    braces can be matched on it (positions are kept)."""
    out, i, n = list(src), 0, len(src)
    while i < n:
        c, nxt = src[i], src[i + 1] if i + 1 < n else ""
        if c == "/" and nxt == "/":
            j = src.find("\n", i)
            j = n if j < 0 else j
            out[i:j] = " " * (j - i)
            i = j
        elif c == "/" and nxt == "*":
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out[i:j] = [ch if ch == "\n" else " " for ch in src[i:j]]
            i = j
        elif c in "\"`" or (c == "'" and not rust):
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == "\\" else 1
            out[i + 1:j] = [ch if ch == "\n" else " " for ch in src[i + 1:j]]
            i = j + 1
        elif rust and c == "'" and re.match(r"'(\\.|[^\\'])'", src[i:i + 4]):
            m = re.match(r"'(\\.|[^\\'])'", src[i:i + 4])
            out[i + 1:i + m.end() - 1] = " " * (m.end() - 2)
            i += m.end()
        else:
            i += 1
    return "".join(out)


def block_end(mask, start):
    depth = 0
    for k in range(start, len(mask)):
        if mask[k] == "{":
            depth += 1
        elif mask[k] == "}":
            depth -= 1
            if depth == 0:
                return k + 1
    raise ValueError("unbalanced braces")


RUST_FN = re.compile(r"^(?P<ind>[ \t]*)(?P<vis>pub(?:\([^)]*\))?\s+)?(?:const\s+|async\s+|unsafe\s+)*fn\s+(?P<name>\w+)", re.M)
RUST_IMPL = re.compile(r"^[ \t]*impl(?:<[^>]*>)?\s+(?:[\w:<>, ]+\s+for\s+)?(?P<ty>\w+)[^{;]*\{", re.M)
TS_FN = re.compile(r"^(?P<vis>export\s+)?(?:async\s+)?function\s+(?P<name>\w+)", re.M)


def functions(src, rust):
    mask = code_mask(src, rust)
    impls = []
    if rust:
        for m in RUST_IMPL.finditer(mask):
            brace = mask.index("{", m.start())
            impls.append((brace, block_end(mask, brace), m.group("ty")))
    found = {}
    for m in (RUST_FN if rust else TS_FN).finditer(mask):
        brace = mask.find("{", m.end())
        semi = mask.find(";", m.end())
        if brace < 0 or (0 <= semi < brace):
            continue  # declaration without body (trait item)
        end = block_end(mask, brace)
        owner = next((ty for s, e, ty in impls if s < m.start() < e), None) if rust else None
        name = f"{owner}::{m.group('name')}" if owner else m.group("name")
        vis = "pub" if (m.group("vis") or "").strip() else "privat"
        text = "\n".join(line.rstrip() for line in src[m.start():end].replace("\r\n", "\n").split("\n"))
        found[name] = {"vis": vis, "text": text, "lines": text.count("\n") + 1}
    return found


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    old, new = (args + ["82a63b45", "WORKTREE"])[:2] if len(args) < 2 else args[:2]
    if len(args) == 1:
        old, new = args[0], "WORKTREE"
    report = {"old": old, "new": new, "files": {}}
    for path in sorted(files_at(old) | files_at(new)):
        rust = path.endswith(".rs")
        a = functions(read(old, path), rust) if path in files_at(old) else {}
        b = functions(read(new, path), rust) if path in files_at(new) else {}
        changes = {
            "added": [f"{k} ({b[k]['vis']})" for k in b if k not in a],
            "removed": [f"{k} ({a[k]['vis']})" for k in a if k not in b],
            "changed": [f"{k} ({b[k]['vis']})" for k in b if k in a and a[k]["text"] != b[k]["text"]],
            "vis_changed": [k for k in b if k in a and a[k]["vis"] != b[k]["vis"]],
            "count": [len(a), len(b)],
        }
        if changes["added"] or changes["removed"] or changes["changed"]:
            report["files"][path.replace(MV + "/", "")] = changes
    for path, c in report["files"].items():
        print(f"{path}: fungsi {c['count'][0]} -> {c['count'][1]}")
        for kind in ("added", "removed", "changed", "vis_changed"):
            if c[kind]:
                print(f"  {kind}: {', '.join(c[kind])}")
    if "--json" in " ".join(sys.argv):
        out = next(a.split("=", 1)[1] if "=" in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv if a.startswith("--json"))
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
