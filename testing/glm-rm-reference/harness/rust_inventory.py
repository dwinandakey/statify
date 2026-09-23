"""Inventory of the Repeated Measures Rust crate items at two git revisions,
for testing/glm-rm-reference/results/thesis-impact.md (factual comparison).

    python rust_inventory.py [OLD_REV] [NEW_REV] [--json out.json]

Per file in wasm/, models/, stats/, utils/ it lists structs (with fields),
enums (with variants), type aliases, free functions and methods (with the
impl type), then prints what was added, removed or changed between the
revisions. A simple line-based parser (the crate is formatted with one item
header per line), not a full Rust parser.
"""
import json
import re
import subprocess
import sys

SRC = "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src"
DIRS = ("wasm/", "models/", "stats/", "utils/")


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def files(rev):
    names = git("ls-tree", "-r", "--name-only", rev, SRC).splitlines()
    return sorted(n[len(SRC) + 1:] for n in names if n.endswith(".rs") and n[len(SRC) + 1:].startswith(DIRS))


def strip_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return "\n".join(re.sub(r"//.*$", "", line) for line in text.splitlines())


def parse(text):
    text = strip_comments(text)
    items = {"struct": {}, "enum": {}, "type": [], "fn": [], "method": []}
    lines = text.splitlines()
    impl_stack = []  # (type, depth at which impl body starts)
    depth = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        m = re.match(r"(?:pub(?:\([^)]*\))?\s+)?struct\s+(\w+)", s)
        if m and depth == 0:
            name = m.group(1)
            fields = []
            if "{" in s and "}" not in s:
                j = i + 1
                while j < len(lines) and not lines[j].strip().startswith("}"):
                    fm = re.match(r"\s*(?:pub(?:\([^)]*\))?\s+)?(\w+)\s*:", lines[j])
                    if fm:
                        fields.append(fm.group(1))
                    j += 1
            items["struct"][name] = fields
        m = re.match(r"(?:pub(?:\([^)]*\))?\s+)?enum\s+(\w+)", s)
        if m and depth == 0:
            name = m.group(1)
            variants = []
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("}"):
                vm = re.match(r"\s*(\w+)\s*[,({]?", lines[j])
                if vm and not lines[j].strip().startswith("#"):
                    variants.append(vm.group(1))
                j += 1
            items["enum"][name] = variants
        m = re.match(r"(?:pub(?:\([^)]*\))?\s+)?type\s+(\w+)", s)
        if m and depth == 0:
            items["type"].append(m.group(1))
        m = re.match(r"impl(?:<[^>]*>)?\s+(?:[\w:<>]+\s+for\s+)?(\w+)", s)
        if m and depth == 0:
            impl_stack.append((m.group(1), depth))
        m = re.match(r"(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)", s)
        if m:
            if impl_stack and depth >= 1:
                items["method"].append(f"{impl_stack[-1][0]}::{m.group(1)}")
            elif depth == 0:
                items["fn"].append(m.group(1))
        depth += line.count("{") - line.count("}")
        while impl_stack and depth <= impl_stack[-1][1] and "}" in line:
            impl_stack.pop()
        i += 1
    return items


def inventory(rev):
    out = {}
    for f in files(rev):
        out[f] = parse(git("show", f"{rev}:{SRC}/{f}"))
    return out


def diff(old, new):
    report = {}
    for f in sorted(set(old) | set(new)):
        a, b = old.get(f), new.get(f)
        if a is None:
            report[f] = {"file": "added", "items": b}
            continue
        if b is None:
            report[f] = {"file": "removed", "items": a}
            continue
        r = {}
        for kind in ("struct", "enum"):
            added = sorted(set(b[kind]) - set(a[kind]))
            removed = sorted(set(a[kind]) - set(b[kind]))
            changed = {n: {"added": [x for x in b[kind][n] if x not in a[kind][n]],
                           "removed": [x for x in a[kind][n] if x not in b[kind][n]]}
                       for n in set(a[kind]) & set(b[kind]) if a[kind][n] != b[kind][n]}
            changed = {n: c for n, c in changed.items() if c["added"] or c["removed"]}
            if added or removed or changed:
                r[kind] = {"added": {n: b[kind][n] for n in added}, "removed": removed, "changed": changed}
        for kind in ("type", "fn", "method"):
            added = sorted(set(b[kind]) - set(a[kind]))
            removed = sorted(set(a[kind]) - set(b[kind]))
            if added or removed:
                r[kind] = {"added": added, "removed": removed}
        if r:
            report[f] = r
    return report


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    old_rev, new_rev = (args + ["8e2ddbd2", "HEAD"])[:2]
    old, new = inventory(old_rev), inventory(new_rev)
    report = {"old": old_rev, "new": new_rev, "diff": diff(old, new),
              "counts": {rev: {f: {k: (len(v) if not isinstance(v, dict) else len(v)) for k, v in items.items()}
                               for f, items in inv.items()} for rev, inv in (("old", old), ("new", new))},
              "old_items": old, "new_items": new}
    if "--json" in sys.argv:
        with open(sys.argv[sys.argv.index("--json") + 1], "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=1, ensure_ascii=False)
    print(json.dumps(report["diff"], indent=1, ensure_ascii=False))
