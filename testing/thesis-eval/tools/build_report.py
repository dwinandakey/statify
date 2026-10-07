#!/usr/bin/env python3
"""build_report.py — membangun REPORT.md dari report/REPORT.template.md.

Direktif di templat (satu per baris):
    {{include: <berkas.md> | <awalan heading> | <level heading hasil> [| <label judul>]}}
        menyalin satu bagian dari dokumen track (sampai heading berikutnya yang sama/lebih tinggi), heading disesuaikan ke level hasil.
        Bila awalan heading diakhiri "*", semua bagian pada level yang sama yang berawalan itu disalin.
    {{auto:counts}}        tabel jumlah tes per track (dihitung dari logs/jest_*.json, logs/rust_*.txt, dan hitungan #[test])
    {{auto:jestfull}}      ringkasan eksekusi penuh Jest (logs/jest_final_*_[vm|win].json)
    {{auto:bugs}}          indeks temuan (dari BUGS.md)
    {{auto:status}}        kalimat status: log Windows apa saja yang sudah ada
    {{auto:notrun}}        daftar NOT RUN yang bergantung pada keberadaan log
Angka tidak diketik tangan: semua berasal dari log atau dari dokumen track yang sudah diisi apply_results.py.
Urutan menjalankan: apply_results.py -> merge_docs.py -> build_report.py.
Hanya pustaka standar Python 3.
"""
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
EVAL = os.path.dirname(HERE)
LOGS = os.path.join(EVAL, "logs")
REPO = os.path.abspath(os.path.join(EVAL, "..", ".."))
TEMPLATE = os.path.join(EVAL, "report", "REPORT.template.md")
OUT = os.path.join(EVAL, "REPORT.md")


def fmt(n):
    return f"{n:,}".replace(",", ".")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read().replace("\r\n", "\n")


def load_json(path):
    try:
        with open(path, encoding="utf-8-sig") as f:
            return json.load(f)
    except Exception:
        return None


def jest_counts(pattern):
    """-> (suites, total, passed, failed, n_files) dari semua berkas JSON jest yang cocok."""
    s = t = p = f = n = 0
    for path in sorted(glob.glob(os.path.join(LOGS, pattern))):
        d = load_json(path)
        if not d or "numTotalTests" not in d:
            continue
        n += 1
        s += d.get("numTotalTestSuites", 0)
        t += d.get("numTotalTests", 0)
        p += d.get("numPassedTests", 0)
        f += d.get("numFailedTests", 0)
    return s, t, p, f, n


# ---- include ---------------------------------------------------------------------------------------------------
def sections(text):
    lines = text.split("\n")
    heads = []
    fence = False
    for i, l in enumerate(lines):
        if l.lstrip().startswith("```"):
            fence = not fence
        m = re.match(r"^(#{1,6})\s+(.*)$", l)
        if m and not fence:
            heads.append((i, len(m.group(1)), m.group(2)))
    return lines, heads


def extract(fname, prefix, level, label=""):
    path = os.path.join(EVAL, fname)
    if not os.path.exists(path):
        return f"_(berkas {fname} tidak ada: NOT RUN)_\n"
    lines, heads = sections(read(path))
    allp = prefix.endswith("*")
    pref = prefix.rstrip("*").strip()
    out = []
    for idx, (i, lv, title) in enumerate(heads):
        if not (("#" * lv + " " + title).startswith(pref) or title.startswith(pref.lstrip("# "))):
            continue
        end = len(lines)
        for j, lv2, _ in heads[idx + 1:]:
            if lv2 <= lv:
                end = j
                break
        chunk = lines[i:end]
        shift = level - lv
        fixed, fence = [], False
        for l in chunk:
            if l.lstrip().startswith("```"):
                fence = not fence
            m = re.match(r"^(#{1,6})(\s.*)$", l)
            if m and not fence:
                l = "#" * max(1, min(6, len(m.group(1)) + shift)) + m.group(2)
            fixed.append(l)
        if label:
            m0 = re.match(r"^(#{1,6})\s+(?:\d+(?:\.\d+)*\.?\s+)?(.*)$", fixed[0])
            if m0:
                fixed[0] = f"{m0.group(1)} {label.strip()} {m0.group(2)}"
        out.append("\n".join(fixed).rstrip("\n"))
        if not allp:
            break
    if not out:
        return f"_(bagian \"{prefix}\" tidak ditemukan di {fname}: NOT RUN)_\n"
    return "\n\n".join(out) + "\n"


# ---- auto ------------------------------------------------------------------------------------------------------
RUST_TRACKS = [
    ("A", "Unit (A)", ["thesis_formulas", "thesis_vocab_limit", "thesis_text_pipeline", "thesis_partition"]),
    ("C1", "Black-box STWV (C1)", ["thesis_blackbox_stwv"]),
    ("C2", "Black-box Naive Bayes (C2)", ["thesis_blackbox_nb"]),
    ("C3", "Black-box Apply Model (C3)", ["thesis_blackbox_am"]),
    ("D", "Akurasi (D)", ["thesis_compare"]),
    ("F", "Integrasi (F)", ["thesis_integration"]),
]
TARGET_DIRS = [
    "frontend/public/workers/TextAnalytics/statify-text-core/tests",
    "frontend/components/Modals/Analyze/Classify/naive-bayes/rust/tests",
    "frontend/components/Modals/Analyze/Classify/apply-model/rust/tests",
]


def rust_count(target):
    for d in TARGET_DIRS:
        p = os.path.join(REPO, d, target + ".rs")
        if os.path.exists(p):
            return len(re.findall(r"^\s*#\[test\]", read(p), re.M))
    return None


def rust_result(target):
    p = os.path.join(LOGS, f"rust_{target}.txt")
    if not os.path.exists(p):
        return None
    raw = open(p, "rb").read()
    text = raw.decode("utf-16", "replace") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8", "replace")
    if "could not compile" in text:
        return "GAGAL KOMPILASI"
    m = re.search(r"test result: (\w+)\. (\d+) passed; (\d+) failed", text)
    return f"{m.group(2)} lulus, {m.group(3)} gagal [Win]" if m else "log ada, hasil tidak terbaca"


def auto_counts():
    rows = ["| Track | Tes Jest | Lulus | Gagal | Sumber Jest | Fungsi tes Rust ditulis | Hasil Rust |", "|---|---|---|---|---|---|---|"]
    jest_tracks = [("A", "Unit (A)"), ("B", "White-box (B)"), ("C1", "Black-box STWV (C1)"), ("C2", "Black-box Naive Bayes (C2)"),
                   ("C3", "Black-box Apply Model (C3)"), ("D", "Akurasi (D)"), ("F", "Integrasi (F)")]
    rust_map = {k: (n, ts) for k, n, ts in RUST_TRACKS}
    tt = tp = tf = tr = 0
    for key, name in jest_tracks:
        win = load_json(os.path.join(LOGS, f"jest_{key}_win.json"))
        vm = load_json(os.path.join(LOGS, f"jest_{key}_vm.json"))
        if win and "numTotalTests" in win:
            d, src = win, "Windows"
        elif vm and "numTotalTests" in vm:
            d, src = vm, "VM Linux"
        else:
            d, src = None, "NOT RUN"
        if d:
            t, p, f = d["numTotalTests"], d["numPassedTests"], d["numFailedTests"]
            tt, tp, tf = tt + t, tp + p, tf + f
        else:
            t = p = f = "NOT RUN"
        if key in rust_map:
            ts = rust_map[key][1]
            cnt = sum(rust_count(x) or 0 for x in ts)
            tr += cnt
            res = [rust_result(x) for x in ts]
            rr = "BELUM DIJALANKAN" if all(r is None for r in res) else "; ".join(f"{x}: {r or 'BELUM DIJALANKAN'}" for x, r in zip(ts, res))
        else:
            cnt, rr = "-", "-"
        rows.append(f"| {name} | {t} | {p} | {f} | {src} | {cnt} | {rr} |")
    rows.append(f"| **Jumlah** | **{tt}** | **{tp}** | **{tf}** | | **{tr}** | |")
    return "\n".join(rows) + "\n"


def auto_jestfull():
    out = []
    for plat, pat in (("Windows", "jest_final_*_win.json"), ("VM Linux", "jest_final_*_vm.json")):
        s, t, p, f, n = jest_counts(pat)
        if n:
            out.append(f"| {plat} | {n} | {s} | {fmt(t)} | {fmt(p)} | {f} |")
        else:
            out.append(f"| {plat} | 0 | NOT RUN | NOT RUN | NOT RUN | NOT RUN |")
    head = ["| Platform | Jumlah potongan eksekusi | Suite | Tes | Lulus | Gagal |", "|---|---|---|---|---|---|"]
    return "\n".join(head + out) + "\n"


def auto_bugs():
    p = os.path.join(EVAL, "BUGS.md")
    if not os.path.exists(p):
        return "_(BUGS.md belum dibangun)_\n"
    t = read(p)
    m = re.search(r"(\| ID \| Tingkat.*?\n)\n", t, re.S)
    return (m.group(1) if m else "_(indeks tidak ditemukan)_") + "\n"


ALL_RUST = [t for _, _, ts in RUST_TRACKS for t in ts]
JEST_KEYS = ["A", "B", "C1", "C2", "C3", "D", "F"]


def win_state():
    rust_have = [t for t in ALL_RUST if os.path.exists(os.path.join(LOGS, f"rust_{t}.txt"))]
    jest_have = [k for k in JEST_KEYS if os.path.exists(os.path.join(LOGS, f"jest_{k}_win.json"))]
    return rust_have, jest_have


def auto_status():
    rust_have, jest_have = win_state()
    return (f"Saat REPORT.md ini dibangun, log eksekusi Windows tersedia untuk {len(rust_have)} dari {len(ALL_RUST)} target Rust thesis "
            f"dan {len(jest_have)} dari {len(JEST_KEYS)} berkas hasil Jest Windows (`jest_<track>_win.json`). "
            "Status yang tidak berasal dari log Windows diberi label [VM] (VM Linux) atau BELUM DIJALANKAN.")


def auto_notrun():
    rust_have, jest_have = win_state()
    rows = ["| Butir | Status | Alasan |", "|---|---|---|"]
    for t in ALL_RUST:
        if t not in rust_have:
            rows.append(f"| Tes Rust `{t}` (`cargo test --test {t}`) | NOT RUN | Tidak ada toolchain/crate di lingkungan penulisan "
                        "(tanpa jaringan ke crates.io); berkas belum pernah dikompilasi. Dijalankan oleh `run_all.ps1` di Windows. |")
    for k in JEST_KEYS:
        if k not in jest_have:
            rows.append(f"| Jest konfigurasi produksi Windows, Track {k} (`jest_{k}_win.json`) | NOT RUN | Hanya ada hasil [VM] (ts-jest); "
                        "konfigurasi produksi (next/jest) dijalankan oleh `run_{0}.ps1`. |".format(k))
    ep = os.path.join(EVAL, "E_performance.md")
    if os.path.exists(ep) and "BELUM DIJALANKAN (perangkat skripsi)" in read(ep):
        rows.append("| Tabel waktu eksekusi Track E pada perangkat skripsi (peramban dan headless) | NOT RUN | Harus diukur di Lenovo IdeaPad Gaming 3 "
                    "(Windows 11); hasil sandbox/VM hanya uji asap dan tidak dipakai sebagai angka buku. |")
    rows.append("| Dataset >= 20.000 dokumen (Track E) | NOT RUN | Sumber nyata yang tersedia hanya 17.974 dokumen; 20 Newsgroups tidak dapat diunduh "
                "(tanpa jaringan). Skrip mencoba mengunduhnya di Windows. |")
    rows.append("| Pengujian manual M-01..M-36 (`C_manual_checklist.md`) dan MF-01..MF-05 (`F_manual_checklist.md`) | MANUAL, belum dijalankan | "
                "Memerlukan aplikasi nyata (WASM, Data Editor, Output Viewer) dan tangkapan layar oleh Yedija. |")
    rows.append("| Playwright end-to-end aplikasi penuh (`perf/e2e_full_app.spec.ts`) | NOT RUN | Ditulis tetapi tidak divalidasi: server Next.js tidak dijalankan di sandbox. |")
    rows.append("| Cakupan Rust (`cargo llvm-cov`) | NOT RUN | `cargo-llvm-cov` belum terpasang di Windows; hanya estimasi statis celah (A_unit.md 4.2), bukan cakupan terukur. |")
    rows.append("| SMS Spam dan SmSA pada WEKA di Windows (Track D) | NOT RUN | Hanya dijalankan pada OpenJDK 11 di VM Linux; pengulangan di Windows hanya untuk pilkada (catatan agen WEKA, log tidak ada di salinan ini). |")
    rows.append("| STWV + Sastrawi pada SMS Spam dan gabungan (Track E) | GAGAL (bukan NOT RUN) | Wasm panic `unreachable` pada sastrawi-rs 0.5.1, lihat BUGS.md E-01. |")
    return "\n".join(rows) + "\n"


def render(text):
    def inc(m):
        a = [x.strip() for x in m.group(1).split("|")]
        if len(a) not in (3, 4):
            return f"_(direktif include salah: {m.group(0)})_"
        return extract(a[0], a[1], int(a[2]), a[3] if len(a) == 4 else "").rstrip("\n")
    text = re.sub(r"\{\{include:\s*(.*?)\}\}", inc, text)
    text = text.replace("{{auto:counts}}", auto_counts().rstrip("\n"))
    text = text.replace("{{auto:jestfull}}", auto_jestfull().rstrip("\n"))
    text = text.replace("{{auto:bugs}}", auto_bugs().rstrip("\n"))
    text = text.replace("{{auto:status}}", auto_status())
    text = text.replace("{{auto:notrun}}", auto_notrun().rstrip("\n"))
    return text


def main():
    if not os.path.exists(TEMPLATE):
        raise SystemExit(f"templat tidak ada: {TEMPLATE}")
    out = render(read(TEMPLATE))
    left = re.findall(r"\{\{.*?\}\}", out)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(out.rstrip("\n") + "\n")
    print(f"ditulis REPORT.md ({out.count(chr(10)) + 1} baris); direktif tersisa: {len(left)}")
    if re.search(r"⟦(?:jest|rust):[^⟦⟧<>]*::", out):
        print("PERINGATAN: masih ada penanda ⟦…⟧ (jalankan apply_results.py lebih dulu)")


if __name__ == "__main__":
    main()
