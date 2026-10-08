#!/usr/bin/env python3
"""Membangkitkan tabel pada A_unit.md dari logs/jest_A_vm.json (Jest) dan fungsi #[test] pada tests/eval_*.rs (Rust).
Menulis testing/text_analytics_eval/A_unit.md dari unit/A_unit.template.md (teks tetap) ditambah tabel yang dibangkitkan.
Pemakaian: python3 -X utf8 -I testing/text_analytics_eval/unit/build_A_unit.py
Status TIDAK diketik di sini: kolom Status berisi penanda yang diganti oleh tools/apply_results.py dari log."""
import json
import re
from pathlib import Path

EVAL = Path(__file__).resolve().parents[1]
REPO = EVAL.parents[1]
CORE = REPO / "frontend/public/workers/TextAnalytics/statify-text-core"
NBR = REPO / "frontend/components/Modals/Analyze/Classify/naive-bayes/rust"
RUST_FILES = [
    ("eval_formulas", CORE / "tests/eval_formulas.rs", "statify-text-core"),
    ("eval_vocab_limit", CORE / "tests/eval_vocab_limit.rs", "statify-text-core"),
    ("eval_text_pipeline", CORE / "tests/eval_text_pipeline.rs", "statify-text-core"),
    ("eval_partition", NBR / "tests/eval_partition.rs", "naive-bayes (crate wasm)"),
]


def esc(s):
    return s.replace("|", "\\|").replace("\n", " ")


def jest_table():
    j = json.loads((EVAL / "logs/jest_A_vm.json").read_text(encoding="utf-8"))
    rows = []
    for suite in sorted(j["testResults"], key=lambda s: s["name"]):
        fname = Path(suite["name"]).name
        for a in suite["assertionResults"]:
            anc = " > ".join(a.get("ancestorTitles", []))
            rows.append((fname, a["fullName"], anc, a["title"]))
    out = ["| Berkas | Nama tes | Perilaku yang diuji | Status |", "|---|---|---|---|"]
    for fname, full, anc, title in rows:
        out.append(f"| `{fname}` | {esc(title)} | {esc(anc)} | ⟦jest:{fname}::{full}⟧ |")
    return out, len(rows)


def rust_table():
    out = ["| Berkas | Nama tes | Perilaku yang diuji | Status |", "|---|---|---|---|"]
    n = 0
    for target, path, crate in RUST_FILES:
        text = path.read_text(encoding="utf-8")
        for m in re.finditer(r"#\[test\]\s*\n\s*fn\s+([A-Za-z0-9_]+)", text):
            name = m.group(1)
            n += 1
            perilaku = name.replace("_", " ")
            out.append(f"| `{path.name}` ({crate}) | `{name}` | {perilaku} | ⟦rust:{target}::{name}⟧ |")
    return out, n


def count_tests(files):
    n = 0
    for f in files:
        n += len(re.findall(r"#\[test\]", Path(f).read_text(encoding="utf-8", errors="replace")))
    return n


if __name__ == "__main__":
    jt, jn = jest_table()
    rt, rn = rust_table()
    core_old = count_tests(p for p in (CORE / "tests").glob("*.rs") if not p.name.startswith("eval_"))
    core_new = count_tests(p for p in (CORE / "tests").glob("eval_*.rs") if p.name in ("eval_formulas.rs", "eval_vocab_limit.rs", "eval_text_pipeline.rs"))
    nb_old = count_tests((NBR / "src").rglob("*.rs"))
    nb_new = count_tests([NBR / "tests/eval_partition.rs"])
    am_old = count_tests((REPO / "frontend/components/Modals/Analyze/Classify/apply-model/rust/src").rglob("*.rs"))
    t = (Path(__file__).parent / "A_unit.template.md").read_text(encoding="utf-8")
    for k, v in {"JEST_TABLE": "\n".join(jt), "RUST_TABLE": "\n".join(rt), "JEST_N": str(jn), "RUST_N": str(rn),
                 "CORE_OLD": str(core_old), "CORE_NEW": str(core_new), "NB_OLD": str(nb_old), "NB_NEW": str(nb_new),
                 "AM_OLD": str(am_old)}.items():
        t = t.replace("{{" + k + "}}", v)
    out = EVAL / "A_unit.md"
    out.write_text(t, encoding="utf-8")
    print(f"ditulis {out} (Jest {jn}, Rust {rn})")
