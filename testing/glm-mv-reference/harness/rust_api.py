"""Public API guard for the GLM Multivariate Rust crate (validation/mv-spss).

    python testing/glm-mv-reference/harness/rust_api.py [OLD_REV] [NEW_REV|WORKTREE] [--json out.json]

Per .rs file under rust/src it lists
  - pub fn (free functions) with their full signature,
  - struct / enum with visibility, fields (with visibility and type) or variants,
  - methods per impl type with visibility and full signature,
  - private (non-pub) free functions and methods (names only),
and prints the differences between the revisions: public items added,
removed or with a changed signature (must be empty under the rule "no new or
removed pub items, no signature change"), and private functions added or
removed. A line-based parser (one item header per line, rustfmt style), not
a full Rust parser. Defaults: 82a63b45 vs WORKTREE.
"""
import json
import os
import re
import subprocess
import sys

SRC = "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src"
VIS = r"(pub(?:\([^)]*\))?\s+)?"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def files(rev):
    if rev == "WORKTREE":
        out = []
        for root, _, names in os.walk(SRC):
            out += [os.path.relpath(os.path.join(root, n), SRC).replace("\\", "/") for n in names if n.endswith(".rs")]
        return sorted(out)
    names = git("ls-tree", "-r", "--name-only", rev, SRC).splitlines()
    return sorted(n[len(SRC) + 1:] for n in names if n.endswith(".rs"))


def read(rev, f):
    if rev == "WORKTREE":
        with open(os.path.join(SRC, f), encoding="utf-8") as fh:
            return fh.read()
    return git("show", f"{rev}:{SRC}/{f}")


def strip_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return "\n".join(re.sub(r"//.*$", "", line) for line in text.splitlines())


def signature(lines, i):
    """Signature from line i up to the body '{' or ';', whitespace-normalized."""
    parts = []
    j = i
    while j < len(lines):
        parts.append(lines[j])
        if "{" in lines[j] or lines[j].rstrip().endswith(";"):
            break
        j += 1
    sig = " ".join(parts)
    sig = sig.split("{")[0] if "{" in sig else sig
    return re.sub(r"\s+", " ", sig).replace("( ", "(").replace(" )", ")").strip()


def parse(text):
    text = strip_comments(text)
    items = {"pub_fn": {}, "priv_fn": [], "struct": {}, "enum": {}, "pub_method": {}, "priv_method": []}
    lines = text.splitlines()
    impl_stack, depth = [], 0
    for i, line in enumerate(lines):
        s = line.strip()
        m = re.match(VIS + r"struct\s+(\w+)", s)
        if m and depth == 0:
            fields = []
            if "{" in s and "}" not in s:
                j = i + 1
                while j < len(lines) and not lines[j].strip().startswith("}"):
                    fm = re.match(r"\s*" + VIS + r"(\w+)\s*:\s*(.+?),?\s*$", lines[j])
                    if fm:
                        fields.append(f"{(fm.group(1) or '').strip()} {fm.group(2)}: {fm.group(3)}".strip())
                    j += 1
            items["struct"][m.group(2)] = {"vis": (m.group(1) or "").strip(), "fields": fields}
        m = re.match(VIS + r"enum\s+(\w+)", s)
        if m and depth == 0:
            variants, j = [], i + 1
            while j < len(lines) and not lines[j].strip().startswith("}"):
                vm = re.match(r"\s*(\w+)", lines[j])
                if vm and not lines[j].strip().startswith("#"):
                    variants.append(vm.group(1))
                j += 1
            items["enum"][m.group(2)] = {"vis": (m.group(1) or "").strip(), "variants": variants}
        m = re.match(r"impl(?:<[^>]*>)?\s+(?:[\w:<>]+\s+for\s+)?(\w+)", s)
        if m and depth == 0:
            impl_stack.append((m.group(1), depth))
        m = re.match(VIS + r"(?:async\s+)?fn\s+(\w+)", s)
        if m:
            is_pub = bool(m.group(1))
            name = m.group(2)
            if impl_stack and depth >= 1:
                key = f"{impl_stack[-1][0]}::{name}"
                if is_pub:
                    items["pub_method"][key] = signature(lines, i)
                else:
                    items["priv_method"].append(key)
            elif depth == 0:
                if is_pub:
                    items["pub_fn"][name] = signature(lines, i)
                else:
                    items["priv_fn"].append(name)
        depth += line.count("{") - line.count("}")
        while impl_stack and depth <= impl_stack[-1][1] and "}" in line:
            impl_stack.pop()
    return items


def inventory(rev):
    return {f: parse(read(rev, f)) for f in files(rev)}


def diff(old, new):
    rep = {"public_changes": [], "private_added": [], "private_removed": []}
    for f in sorted(set(old) | set(new)):
        a, b = old.get(f), new.get(f)
        if a is None or b is None:
            rep["public_changes"].append(f"{f}: file {'added' if a is None else 'removed'}")
            continue
        for kind in ("pub_fn", "pub_method"):
            for n in sorted(set(a[kind]) | set(b[kind])):
                if n not in b[kind]:
                    rep["public_changes"].append(f"{f}: {kind} removed {n}")
                elif n not in a[kind]:
                    rep["public_changes"].append(f"{f}: {kind} added {b[kind][n]}")
                elif a[kind][n] != b[kind][n]:
                    rep["public_changes"].append(f"{f}: {kind} signature {a[kind][n]}  ->  {b[kind][n]}")
        for kind in ("struct", "enum"):
            for n in sorted(set(a[kind]) | set(b[kind])):
                if a[kind].get(n) != b[kind].get(n):
                    rep["public_changes"].append(f"{f}: {kind} {n}: {a[kind].get(n)}  ->  {b[kind].get(n)}")
        for kind in ("priv_fn", "priv_method"):
            rep["private_added"] += [f"{f}: {x}" for x in b[kind] if x not in a[kind]]
            rep["private_removed"] += [f"{f}: {x}" for x in a[kind] if x not in b[kind]]
    return rep


def counts(inv):
    return {
        "pub_fn_total": sum(len(v["pub_fn"]) for v in inv.values()),
        "pub_fn_common.rs": len(inv.get("stats/common.rs", {}).get("pub_fn", {})),
        "struct_result.rs": len(inv.get("models/result.rs", {}).get("struct", {})),
        "struct_total": sum(len(v["struct"]) for v in inv.values()),
        "enum_total": sum(len(v["enum"]) for v in inv.values()),
        "pub_method_total": sum(len(v["pub_method"]) for v in inv.values()),
    }


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--") and not a.endswith(".json")]
    old_rev, new_rev = (args + ["82a63b45", "WORKTREE"])[:2]
    old, new = inventory(old_rev), inventory(new_rev)
    report = {"old": old_rev, "new": new_rev, "counts_old": counts(old), "counts_new": counts(new), **diff(old, new)}
    if "--json" in sys.argv:
        with open(sys.argv[sys.argv.index("--json") + 1], "w", encoding="utf-8") as fh:
            json.dump({**report, "old_items": old, "new_items": new}, fh, indent=1, ensure_ascii=False)
    print(json.dumps(report, indent=1, ensure_ascii=False))
