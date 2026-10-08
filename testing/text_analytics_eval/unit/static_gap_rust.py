#!/usr/bin/env python3
"""
static_gap_rust.py - ESTIMASI STATIS celah cakupan Rust (BUKAN cakupan terukur).

Cakupan Rust tidak dapat diukur di sandbox (tidak ada cargo/crate). Skrip ini hanya memperkirakan fungsi `pub fn`
yang TIDAK dirujuk oleh satu pun tes, dengan metode grep berikut:

  1. Daftar kandidat: setiap deklarasi `pub fn <nama>` (juga `pub async fn`, bukan `pub(crate)`) di src/**/*.rs
     tiap crate, kecuali yang berada di dalam blok `#[cfg(test)]`.
  2. Teks tes suatu crate = (a) seluruh berkas tests/*.rs crate itu, dan (b) bagian `#[cfg(test)] ... EOF` dari
     setiap berkas src/**/*.rs crate itu (tes inline; pendekatan: modul tes selalu di akhir berkas, sesuai konvensi repo).
  3. Fungsi dianggap "dirujuk" bila `\\b<nama>\\b` muncul pada teks tes (di luar baris definisinya sendiri) pada:
       - crate sendiri               -> kolom "tes crate sendiri"
       - crate lain yang bergantung  -> kolom "tes crate lain" (core dipakai oleh NB dan AM)
  4. Hitungan dilakukan dua kali: tanpa berkas `eval_*.rs` (keadaan sebelum Track A) dan dengan berkas Track A saja
     (eval_formulas, eval_vocab_limit, eval_text_pipeline, eval_partition; berkas evaluasi track lain diabaikan).
  5. Teks setelah `//` pada tiap baris diabaikan (komentar tidak dihitung sebagai rujukan).

KETERBATASAN (penting untuk pembaca buku):
  - Rujukan nama != cakupan baris. Fungsi yang dirujuk tes bisa saja hanya sebagian cabangnya dieksekusi; fungsi yang tidak
    dirujuk bisa saja tereksekusi tak langsung lewat fungsi lain. Hasil ini hanya penunjuk celah awal.
  - Nama generik (new, default, from, ...) memberi positif palsu; ditandai "umum" dan tidak dihitung sebagai celah.
  - Fungsi #[wasm_bindgen] tidak dapat diuji secara native; ditandai terpisah.
Cakupan terukur Rust: tidak terukur di sesi ini, lihat run_A.ps1 (cargo llvm-cov bila terpasang).

Pemakaian (dari akar repo):  python3 testing/text_analytics_eval/unit/static_gap_rust.py > testing/text_analytics_eval/logs/static_gap_rust.txt
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FE = REPO / "frontend"
CRATES = {
    "core": FE / "public/workers/TextAnalytics/statify-text-core",
    "naive-bayes": FE / "components/Modals/Analyze/Classify/naive-bayes/rust",
    "apply-model": FE / "components/Modals/Analyze/Classify/apply-model/rust",
    "stwv-wrapper": FE / "components/Modals/Transform/StringToWordVector/rust",
}
DEPENDENTS = {"core": ["naive-bayes", "apply-model", "stwv-wrapper"]}
GENERIC = {"new", "default", "from", "into", "clone", "fmt", "len", "is_empty", "iter", "get", "set", "as_str",
           "to_string", "build", "run", "init", "with", "from_json_value", "from_json_str"}

TRACK_A = {"eval_formulas", "eval_vocab_limit", "eval_text_pipeline", "eval_partition"}
FN_RE = re.compile(r"^\s*pub\s+(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)")


def split_prod_test(text):
    lines = text.splitlines()
    for i, ln in enumerate(lines):
        if ln.strip().startswith("#[cfg(test)]"):
            return lines[:i], lines[i:]
    return lines, []


def read_crate(name):
    root = CRATES[name]
    src_files = sorted((root / "src").rglob("*.rs")) if (root / "src").exists() else []
    test_files = sorted((root / "tests").glob("*.rs")) if (root / "tests").exists() else []
    prod, inline_tests = {}, {}
    for f in src_files:
        p, t = split_prod_test(f.read_text(encoding="utf-8", errors="replace"))
        prod[f] = p
        inline_tests[f] = t
    ext = {f: f.read_text(encoding="utf-8", errors="replace") for f in test_files}
    return root, prod, inline_tests, ext


def collect_fns(prod):
    out = []
    for f, lines in prod.items():
        wasm_attr = False
        for ln in lines:
            s = ln.strip()
            if s.startswith("#[wasm_bindgen"):
                wasm_attr = True
                continue
            m = FN_RE.match(ln)
            if m:
                out.append((f, m.group(1), wasm_attr))
                wasm_attr = False
            elif s and not s.startswith("#[") and not s.startswith("///") and not s.startswith("//"):
                wasm_attr = False
    return out


def count_refs(name, texts):
    pat = re.compile(r"\b%s\b" % re.escape(name))
    n = 0
    for t in texts:
        for ln in t.splitlines():
            ln = ln.split("//", 1)[0]  # abaikan komentar (// dan ///), agar nama dalam komentar tidak dihitung
            if pat.search(ln) and not re.search(r"\bfn\s+%s\b" % re.escape(name), ln):
                n += 1
    return n


def main():
    data = {c: read_crate(c) for c in CRATES}

    def test_texts(crate, include_eval):
        root, _prod, inline, ext = data[crate]
        texts = ["\n".join(v) for v in inline.values()]
        for f, t in ext.items():
            if not f.name.startswith("eval_") or (include_eval and f.stem in TRACK_A):
                texts.append(t)
        return texts

    print("ESTIMASI STATIS celah cakupan Rust (BUKAN cakupan terukur) - lihat docstring static_gap_rust.py untuk metode")
    print("Cakupan terukur Rust: tidak terukur di sesi ini, lihat run_A.ps1 (cargo llvm-cov bila terpasang).\n")
    summary = []
    for crate in CRATES:
        root, prod, inline, ext = data[crate]
        fns = collect_fns(prod)
        rows = []
        for f, name, wasm in fns:
            own_old = count_refs(name, test_texts(crate, False))
            own_new = count_refs(name, test_texts(crate, True))
            oth_old = oth_new = 0
            for dep in DEPENDENTS.get(crate, []):
                oth_old += count_refs(name, test_texts(dep, False))
                oth_new += count_refs(name, test_texts(dep, True))
            rows.append((f.relative_to(root), name, wasm, own_old, oth_old, own_new, oth_new))
        total = len(rows)
        real = [r for r in rows if not r[2] and r[1] not in GENERIC]
        gap_old = [r for r in real if r[3] + r[4] == 0]
        gap_new = [r for r in real if r[5] + r[6] == 0]
        wasm_n = sum(1 for r in rows if r[2])
        summary.append((crate, total, len(real), wasm_n, len(gap_old), len(gap_new)))
        print("=" * 110)
        print(f"Crate {crate}  ({root.relative_to(REPO)})")
        print(f"  pub fn terdeteksi: {total}; dapat dihitung (bukan wasm_bindgen, bukan nama umum): {len(real)}; wasm_bindgen: {wasm_n}")
        print(f"  TIDAK dirujuk tes SEBELUM Track A: {len(gap_old)}   |   SETELAH Track A (termasuk 4 berkas evaluasi Track A): {len(gap_new)}")
        if gap_new:
            print("  Daftar celah yang masih tersisa (estimasi statis):")
            for r in gap_new:
                print(f"    - {str(r[0]):45s} pub fn {r[1]}")
        closed = [r for r in gap_old if r not in gap_new]
        if closed:
            print("  Celah yang ditutup tes tesis Track A (kini dirujuk):")
            for r in closed:
                print(f"    + {str(r[0]):45s} pub fn {r[1]}")
        wasm_rows = [r for r in rows if r[2]]
        if wasm_rows:
            print("  Fungsi #[wasm_bindgen] (tidak dapat diuji secara native):")
            for r in wasm_rows:
                print(f"    * {str(r[0]):45s} pub fn {r[1]}")
        # tingkat berkas: berkas yang tidak satu pun pub fn-nya dirujuk
        by_file = {}
        for r in real:
            by_file.setdefault(str(r[0]), []).append(r)
        berkas_kosong = [fp for fp, rs in by_file.items() if all(x[5] + x[6] == 0 for x in rs)]
        if berkas_kosong:
            print("  Berkas yang tidak satu pun pub fn-nya dirujuk tes (estimasi):", ", ".join(sorted(berkas_kosong)))
    print("\n" + "=" * 110)
    print("RINGKASAN (estimasi statis)")
    print(f"{'crate':14s} {'pub fn':>7s} {'dihitung':>9s} {'wasm':>5s} {'celah sebelum':>14s} {'celah sesudah':>14s}")
    for s in summary:
        print(f"{s[0]:14s} {s[1]:7d} {s[2]:9d} {s[3]:5d} {s[4]:14d} {s[5]:14d}")


if __name__ == "__main__":
    sys.exit(main())
