#!/usr/bin/env python3
"""build_baseline.py — membangun tabel baseline (01_baseline.md) dari LOG eksekusi nyata.

Sumber (prioritas): logs/baseline_*.txt (UTF-8, dari run_all.ps1 di Windows) -> logs/legacy (unit_*.txt, jest_{stwv,nb,am}.txt;
log Windows sebelum paket ini, berkode UTF-16 + noise CLIXML PowerShell) -> logs/baseline_vm_*.txt|json (VM Linux, pembanding).
Tidak ada angka yang diketik tangan: semua diekstrak dengan regex dari keluaran `cargo test` dan Jest.
Pemakaian:  python tools/build_baseline.py            (menulis 01_baseline.md)
            python tools/build_baseline.py --print    (hanya cetak)
"""
import glob
import json
import os
import re
import sys
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
EVAL = os.path.dirname(HERE)
LOGS = os.path.join(EVAL, "logs")


def read_text(path):
    raw = open(path, "rb").read()
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return raw.decode("utf-16", "replace")
    try:
        t = raw.decode("utf-8-sig")
        if "\x00" in t[:400]:
            return raw.decode("utf-16", "replace")
        return t
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def mtime(path):
    return datetime.datetime.fromtimestamp(os.path.getmtime(path), datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def parse_cargo(path):
    text = read_text(path)
    total = passed = failed = ignored = 0
    per = []
    target = None
    for line in text.splitlines():
        m = re.search(r"Running (?:unittests (.+?)|tests[\\/]([\w\-]+)\.rs)\s", line)
        if m:
            target = ("lib" if m.group(1) else m.group(2))
        if "Doc-tests" in line:
            target = "doc-tests"
        m = re.match(r"test result: (\w+)\. (\d+) passed; (\d+) failed; (\d+) ignored", line)
        if m:
            p, f, i = int(m.group(2)), int(m.group(3)), int(m.group(4))
            passed += p
            failed += f
            ignored += i
            total += p + f + i
            per.append((target or "doc-tests", p, f, i))
    compile_err = bool(re.search(r"could not compile", text))
    return {"total": total, "passed": passed, "failed": failed, "ignored": ignored, "per": per, "compile_error": compile_err, "mtime": mtime(path), "file": os.path.relpath(path, EVAL)}


def parse_jest(path):
    text = read_text(path)
    out = {"mtime": mtime(path), "file": os.path.relpath(path, EVAL)}
    m = re.search(r"Test Suites:\s+(?:(\d+) failed, )?(\d+) passed, (\d+) total", text)
    if m:
        out["suites"] = int(m.group(3))
    m = re.search(r"Tests:\s+(?:(\d+) failed, )?(?:(\d+) skipped, )?(\d+) passed, (\d+) total", text)
    if m:
        out["failed"] = int(m.group(1) or 0)
        out["passed"] = int(m.group(3))
        out["total"] = int(m.group(4))
    m = re.search(r"^All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)", text, re.M)
    if m:
        out["cov"] = {"stmts": m.group(1), "branch": m.group(2), "funcs": m.group(3), "lines": m.group(4)}
    return out


def fmt_pct(v):
    return (v + "%").replace(".", ",") if v is not None else "NOT RUN"


def pick(*names):
    for n in names:
        p = os.path.join(LOGS, n)
        if os.path.exists(p):
            return p
    return None


def main():
    rows = []
    cargo_specs = [
        ("Rust pustaka inti", "`public/workers/TextAnalytics/statify-text-core/tests/` (5 berkas integrasi) + `src/`", ("baseline_rust_core.txt", "unit_core.txt"), ("baseline_cov_core.txt",)),
        ("Rust Naive Bayes", "`naive-bayes/rust/src/` (tes unit dalam lib)", ("baseline_rust_nb.txt", "unit_nb.txt"), ("baseline_cov_nb.txt",)),
        ("Rust Apply Model", "`apply-model/rust/src/` + `rust/tests/text_scoring.rs`", ("baseline_rust_am.txt", "unit_am.txt"), ("baseline_cov_am.txt",)),
        ("Rust STWV", "`StringToWordVector/rust/`", ("baseline_rust_stwv.txt", "unit_stwv.txt"), ("baseline_cov_stwv.txt",)),
    ]
    jest_specs = [
        ("Jest STWV", "`Transform/StringToWordVector/__tests__/`", ("baseline_jest_stwv.txt", "jest_stwv.txt")),
        ("Jest Naive Bayes", "`Classify/naive-bayes/**/__tests__/`", ("baseline_jest_nb.txt", "jest_nb.txt")),
        ("Jest Apply Model", "`Classify/apply-model/**/__tests__/`", ("baseline_jest_am.txt", "jest_am.txt")),
    ]
    prov = []
    for name, loc, logs, covlogs in cargo_specs:
        p = pick(*logs)
        if not p:
            rows.append((name, loc, "NOT RUN", "NOT RUN", "NOT RUN", "NOT RUN"))
            continue
        r = parse_cargo(p)
        cov = "NOT RUN (cargo-llvm-cov belum dijalankan)"
        cp = pick(*covlogs)
        if cp:
            t = read_text(cp)
            m = re.search(r"^TOTAL\s+.*?([\d.]+)%\s*$", t, re.M)
            lines = re.findall(r"^TOTAL\s+(.*)$", t, re.M)
            if lines:
                nums = re.findall(r"([\d.]+)%", lines[-1])
                cov = fmt_pct(nums[2]) if len(nums) >= 3 else "lihat " + os.path.basename(cp)
        note = "" if r["total"] else " (tidak ada tes)"
        rows.append((name, loc + note, str(r["total"]), str(r["passed"]), str(r["failed"]), cov))
        prov.append((name, r["file"], r["mtime"], "; ".join(f"{t}: {pp} lulus" for t, pp, ff, ii in r["per"])))
    for name, loc, logs in jest_specs:
        p = pick(*logs)
        if not p:
            rows.append((name, loc, "NOT RUN", "NOT RUN", "NOT RUN", "NOT RUN"))
            continue
        r = parse_jest(p)
        cov = fmt_pct(r["cov"]["lines"]) if "cov" in r else "NOT RUN"
        rows.append((name, loc + f" ({r.get('suites', '?')} suite)", str(r.get("total", "?")), str(r.get("passed", "?")), str(r.get("failed", "?")), cov))
        prov.append((name, r["file"], r["mtime"], f"{r.get('suites','?')} suite"))

    md = []
    md.append("# 01 — Baseline pengujian yang sudah ada (sebelum penambahan paket evaluasi)\n")
    md.append("Tabel dibangun oleh `tools/build_baseline.py` langsung dari log eksekusi (tidak ada angka diketik tangan). "
              "Baris Rust diisi dari keluaran `cargo test`; baris Jest dari ringkasan Jest (`Tests:` dan kolom `% Lines` pada baris `All files`).\n")
    md.append("| Lapisan | Lokasi pengujian | Jumlah kasus | Lulus | Gagal | Cakupan baris |")
    md.append("|---|---|---|---|---|---|")
    for r in rows:
        md.append("| " + " | ".join(r) + " |")
    md.append("")
    md.append("## Sumber dan tanggal eksekusi\n")
    md.append("| Lapisan | Berkas log | Waktu berkas log (UTC) | Rincian |")
    md.append("|---|---|---|---|")
    for n, f, t, d in prov:
        md.append(f"| {n} | `{f}` | {t} | {d} |")
    md.append("")
    out = "\n".join(md)
    if "--print" in sys.argv:
        print(out)
    else:
        with open(os.path.join(EVAL, "01_baseline_tabel.md"), "w", encoding="utf-8", newline="\n") as f:
            f.write(out)
        print("ditulis 01_baseline_tabel.md")
        print(out)


if __name__ == "__main__":
    main()
