#!/usr/bin/env python3
"""aggregate_perf.py - Track E: mengagregasi CSV mentah perf/raw/*.csv menjadi tabel markdown berformat prompt.

Hanya pustaka standar Python 3.8+. Koma desimal dan titik ribuan (format Indonesia).

Tabel buku (kolom persis seperti prompt):
  | Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
- Rata-rata dan simpangan baku SAMPEL (n-1) dari 5 pengukuran (run 1..5; run 0 = pemanasan, tidak dipakai).
- Untuk tiap sel (jalur, label perangkat, skenario, dataset) dipakai run_id TERBARU (menurut timestamp).
- Baris berlabel "PERANGKAT-SKRIPSI ..." diperlakukan sebagai hasil perangkat skripsi. Selama belum ada berkasnya, tabel perangkat
  skripsi berisi "BELUM DIJALANKAN (perangkat skripsi)". Hasil dari sandbox/VM selalu ditampilkan di bagian TERPISAH dengan label
  "UJI ASAP ... BUKAN HASIL PERANGKAT SKRIPSI".

Pemakaian:
  python aggregate_perf.py                      # cetak ke stdout dan tulis perf/tables_generated.md
  python aggregate_perf.py --inject ../E_performance.md
      # mengganti isi antara <!-- BEGIN:perf_tables --> dan <!-- END:perf_tables --> di berkas tersebut (idempoten)
"""
import argparse
import csv
import glob
import math
import os
import statistics
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))

# Harus sinkron dengan SCENARIOS / DATASET_ORDER di common.mjs
SCENARIOS = [
    ("stwv_default", "String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi)"),
    ("stwv_sw_stem", "String to Word Vector, stopword Indonesia + stemming Sastrawi"),
    ("nb_holdout70", "Naive Bayes, Raw Text, holdout 70% (seed 42)"),
    ("nb_kfold10", "Naive Bayes, Raw Text, 10-fold CV (seed 42)"),
    ("am_raw", "Apply Model, Raw Text (model NB Multinomial, data yang sama)"),
]
BOOK_DATASETS = ["pilkada_900", "sms_5574", "smsa_11000", "besar_ge20000"]
EXTRA_DATASETS = ["gabungan", "sms_5574_ascii", "gabungan_ascii", "besar_ge20000_ascii"]
DS_NAME = {
    "pilkada_900": "Pilkada",
    "sms_5574": "SMS Spam",
    "smsa_11000": "SmSA",
    "gabungan": "Gabungan Pilkada+SMS+SmSA",
    "besar_ge20000": "Dataset ≥ 20.000 dokumen",
    "sms_5574_ascii": "SMS Spam, varian ASCII",
    "gabungan_ascii": "Gabungan, varian ASCII",
    "besar_ge20000_ascii": "≥ 20.000 dokumen, varian ASCII",
}
ONLY = {"sms_5574_ascii": ["stwv_sw_stem"], "gabungan_ascii": ["stwv_sw_stem"], "besar_ge20000_ascii": ["stwv_sw_stem"]}
PENDING = "BELUM DIJALANKAN (perangkat skripsi)"
JALUR = [
    ("peramban-worker-asli (Playwright)", "Jalur (a): di peramban (Worker asli aplikasi + harness statis)"),
    ("headless-wasm-node", "Jalur (b): headless (Node + wasm yang sama, tanpa Worker)"),
]
E2E_JALUR = ("e2e-aplikasi-penuh", "Jalur (c), opsional: aplikasi penuh (`npm run dev`), klik OK sampai toast sukses; hanya baris yang ada")
OVERHEAD_SUFFIX = "__overhead"


def num(v, dec=1):
    """Format Indonesia: titik ribuan, koma desimal."""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "-"
    s = f"{v:,.{dec}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def inum(v):
    return f"{int(v):,}".replace(",", ".")


def sd_sample(a):
    return statistics.stdev(a) if len(a) >= 2 else float("nan")


def load_rows(raw_dir):
    rows = []
    for f in sorted(glob.glob(os.path.join(raw_dir, "*.csv"))):
        with open(f, encoding="utf-8", newline="") as fh:
            for r in csv.DictReader(fh):
                r["_file"] = os.path.basename(f)
                rows.append(r)
    return rows


def latest_cells(rows):
    """{(jalur, label, skenario, dataset): [rows dari run_id terbaru]}"""
    groups = defaultdict(lambda: defaultdict(list))
    for r in rows:
        groups[(r["jalur"], r["perangkat_label"], r["skenario_id"], r["dataset"])][r["run_id"]].append(r)
    out = {}
    for key, runs in groups.items():
        best = max(runs.items(), key=lambda kv: max(x["timestamp"] for x in kv[1]))
        out[key] = best[1]
    return out


def fnum(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return float("nan")


def cell_stats(rs):
    """Ringkasan satu sel dari baris mentahnya."""
    meas = [r for r in rs if r["run"] not in ("", None) and int(r["run"]) >= 1 and r["status"] == "OK"]
    ms = [fnum(r["ms"]) for r in meas]
    bad = [r for r in rs if r["status"] not in ("OK",)]
    first_ok = next((r for r in rs if r["status"] == "OK"), None)
    n = next((r["n_dokumen"] for r in rs if r["n_dokumen"] not in ("", None)), "")
    d = {
        "n": int(n) if n else None, "k": len(ms), "mean": statistics.mean(ms) if ms else float("nan"), "sd": sd_sample(ms) if ms else float("nan"),
        "terms": first_ok["jumlah_term"] if first_ok else "", "bad": bad[0] if bad else None, "ms": ms,
        "warm": next((fnum(r["ms"]) for r in rs if r["run"] == "0" and r["status"] == "OK"), float("nan")),
    }
    for col in ("longtask_count", "longtask_max_ms", "longtask_total_ms", "frame_p95_ms", "frame_max_ms", "idle_frame_p95_ms"):
        vals = [fnum(r[col]) for r in meas if r.get(col) not in ("", None)]
        d[col] = vals
    return d


def short(msg, n=70):
    msg = (msg or "").replace("|", "/").replace("\n", " ")
    return msg if len(msg) <= n else msg[: n - 1] + "…"


def ds_cell(ds, st):
    name = DS_NAME.get(ds, ds)
    if st and st["n"]:
        return f"{name} ({inum(st['n'])})"
    if ds == "pilkada_900":
        return f"{name} (900)"
    if ds == "sms_5574":
        return f"{name} (5.574)"
    if ds == "smsa_11000":
        return f"{name} (11.000)"
    return name


def book_row(sc_id, sc_label, ds, st, pending_text=None):
    if pending_text is not None:
        return f"| {sc_label} | {ds_cell(ds, None)} | {pending_text} | {pending_text} | {pending_text} |"
    if st is None:
        return f"| {sc_label} | {ds_cell(ds, None)} | NOT RUN | NOT RUN | NOT RUN |"
    bad = st["bad"]
    if bad is not None and bad["status"] == "NOT RUN":
        return f"| {sc_label} | {ds_cell(ds, None)} | NOT RUN | NOT RUN ({short(bad['pesan_galat'], 60)}) | - |"
    if bad is not None or st["k"] == 0:
        why = f"{bad['status']}: {short(bad['pesan_galat'])}" if bad else "tidak ada pengukuran"
        return f"| {sc_label} | {ds_cell(ds, st)} | - | {why} | - |"
    terms = inum(st["terms"]) if str(st["terms"]).isdigit() else (st["terms"] or "-")
    return f"| {sc_label} | {ds_cell(ds, st)} | {terms} | {num(st['mean'])} | {num(st['sd'])} |"


def book_table(cells, jalur, label, datasets, skeleton, only_existing=False):
    head = "| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |\n|---|---|---|---|---|"
    lines = [head]
    for sc_id, sc_label in SCENARIOS:
        for ds in datasets:
            if sc_id not in ONLY.get(ds, [sc_id]):
                continue
            rs = cells.get((jalur, label, sc_id, ds)) if label else None
            if skeleton:
                lines.append(book_row(sc_id, sc_label, ds, None, pending_text=PENDING))
            elif rs is None:
                if ds in BOOK_DATASETS and not only_existing:
                    lines.append(book_row(sc_id, sc_label, ds, None))
            else:
                lines.append(book_row(sc_id, sc_label, ds, cell_stats(rs)))
    return "\n".join(lines)


def resp_table(cells, jalur, label):
    head = ("| Menu dan konfigurasi | Dataset | Long task (rata-rata jumlah per proses) | Long task terpanjang (ms) | "
            "Jeda frame p95 (ms) | Jeda frame terpanjang (ms) | Jeda frame p95 saat diam (ms) | UI responsif (long task < 200 ms)? |\n|---|---|---|---|---|---|---|---|")
    lines = [head]
    for sc_id, sc_label in SCENARIOS:
        for ds in BOOK_DATASETS + EXTRA_DATASETS:
            rs = cells.get((jalur, label, sc_id, ds))
            if rs is None:
                continue
            st = cell_stats(rs)
            if st["k"] == 0:
                continue
            lc, lm = st["longtask_count"], st["longtask_max_ms"]
            fp, fm, idle = st["frame_p95_ms"], st["frame_max_ms"], st["idle_frame_p95_ms"]
            worst = max(lm) if lm else float("nan")
            verdict = "-" if math.isnan(worst) else ("Ya" if worst < 200 else f"Tidak (maks {num(worst, 0)} ms)")
            lines.append(f"| {sc_label} | {ds_cell(ds, st)} | {num(statistics.mean(lc)) if lc else '-'} | {num(worst, 0)} | "
                         f"{num(statistics.mean(fp)) if fp else '-'} | {num(max(fm), 0) if fm else '-'} | {num(statistics.mean(idle)) if idle else '-'} | {verdict} |")
    return "\n".join(lines)


def overhead_table(cells, jalur, label):
    head = "| Menu dan konfigurasi | Dokumen | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |\n|---|---|---|---|---|"
    lines = [head]
    for sc_id, sc_label in SCENARIOS:
        for (j, lab, sid, ds), rs in cells.items():
            if j == jalur and lab == label and sid == sc_id and OVERHEAD_SUFFIX in ds:
                st = cell_stats(rs)
                if st["k"]:
                    lines.append(f"| {sc_label} | {st['n']} (subsampel merata {ds.split('__')[0]}) | {inum(st['terms']) if str(st['terms']).isdigit() else '-'} | {num(st['mean'])} | {num(st['sd'])} |")
    return "\n".join(lines) if len(lines) > 1 else ""


def warmup_table(cells, label):
    """Pemanasan (run 0) vs rata-rata, kedua jalur; run 0 BUKAN bagian tabel buku."""
    jb, jh = JALUR[0][0], JALUR[1][0]
    head = ("| Menu dan konfigurasi | Dataset | Headless: pemanasan (ms) | Headless: rata-rata (ms) | Peramban: pemanasan (ms) | Peramban: rata-rata (ms) |\n"
            "|---|---|---|---|---|---|")
    lines = [head]
    for sc_id, sc_label in SCENARIOS:
        for ds in ["pilkada_900", "sms_5574", "smsa_11000", "gabungan"]:
            h, b = cells.get((jh, label, sc_id, ds)), cells.get((jb, label, sc_id, ds))
            sh = cell_stats(h) if h else None
            sb = cell_stats(b) if b else None
            if not ((sh and sh["k"]) or (sb and sb["k"])):
                continue
            def f(st, key):
                return num(st[key]) if st and st["k"] else "-"
            n = (sh or sb)["n"]
            lines.append(f"| {sc_label} | {DS_NAME[ds]} ({inum(n)}) | {f(sh, 'warm')} | {f(sh, 'mean')} | {f(sb, 'warm')} | {f(sb, 'mean')} |")
    return "\n".join(lines) if len(lines) > 1 else ""


def e2e_block(cells, label):
    if not any(k[0] == E2E_JALUR[0] and k[1] == label for k in cells):
        return ""
    return f"**{E2E_JALUR[1]}**\n\n" + book_table(cells, E2E_JALUR[0], label, BOOK_DATASETS + EXTRA_DATASETS, skeleton=False, only_existing=True) + "\n"


def env_of(cells, label):
    envs = {rs[0]["lingkungan"] for (j, lab, s, d), rs in cells.items() if lab == label and rs}
    brs = {rs[0]["peramban"] for (j, lab, s, d), rs in cells.items() if lab == label and rs and rs[0]["peramban"] not in ("", "-")}
    return sorted(envs), sorted(brs)


def build(raw_dir):
    rows = load_rows(raw_dir)
    cells = latest_cells(rows)
    known = {j for j, _ in JALUR} | {E2E_JALUR[0]}
    labels = sorted({k[1] for k in cells if k[0] in known})
    skripsi = [l for l in labels if l.startswith("PERANGKAT-SKRIPSI")]
    others = [l for l in labels if not l.startswith("PERANGKAT-SKRIPSI")]
    out = []
    out.append("### Tabel perangkat skripsi (hasil yang masuk buku)\n")
    if not skripsi:
        out.append(f"Status: **{PENDING}**. Jalankan `testing\\thesis-eval\\run_E.ps1` di perangkat skripsi, lalu `python testing\\thesis-eval\\perf\\aggregate_perf.py --inject testing\\thesis-eval\\E_performance.md` (dijalankan otomatis oleh skrip bila Python ada).\n")
        for jalur, title in JALUR:
            out.append(f"**{title}**\n")
            out.append(book_table(cells, jalur, None, BOOK_DATASETS, skeleton=True) + "\n")
    for lab in skripsi:
        envs, brs = env_of(cells, lab)
        out.append(f"Label perangkat: {lab}\n\nLingkungan tercatat: {'; '.join(envs)}" + (f"\n\nPeramban: {'; '.join(brs)}" if brs else "") + "\n")
        if not any("4600H" in e for e in envs):
            out.append("> PERINGATAN: baris ini berlabel perangkat skripsi tetapi CPU yang tercatat BUKAN Ryzen 5 4600H. Periksa sebelum dipakai di buku.\n")
        for jalur, title in JALUR:
            out.append(f"**{title}**\n")
            if not any(k[0] == jalur and k[1] == lab for k in cells):
                out.append(f"Jalur ini belum dijalankan pada perangkat skripsi (tidak ada berkas CSV mentahnya).\n")
                out.append(book_table(cells, jalur, None, BOOK_DATASETS, skeleton=True) + "\n")
                continue
            out.append(book_table(cells, jalur, lab, BOOK_DATASETS, skeleton=False) + "\n")
            extra = book_table(cells, jalur, lab, EXTRA_DATASETS, skeleton=False)
            if extra.count("\n") > 1:
                out.append("Baris tambahan (bukan baris utama buku):\n\n" + extra + "\n")
        if any(k[0] == JALUR[0][0] and k[1] == lab for k in cells):
            out.append("**Responsivitas UI (jalur peramban)**\n")
            out.append(resp_table(cells, JALUR[0][0], lab) + "\n")
        oh = overhead_table(cells, JALUR[0][0], lab)
        if oh:
            out.append("**Overhead tetap Worker (jalur peramban, 40 dokumen)**\n\n" + oh + "\n")
        wt = warmup_table(cells, lab)
        if wt:
            out.append("**Run pemanasan (run 0) dibanding rata-rata run 1\u20135** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)\n\n" + wt + "\n")
        out.append(e2e_block(cells, lab))
    for lab in others:
        envs, brs = env_of(cells, lab)
        out.append(f"### UJI ASAP — BUKAN HASIL PERANGKAT SKRIPSI: {lab}\n")
        out.append(f"Lingkungan tercatat: {'; '.join(envs)}" + (f"\n\nPeramban: {'; '.join(brs)}" if brs else "") + "\n")
        for jalur, title in JALUR:
            if not any(k[0] == jalur and k[1] == lab for k in cells):
                continue
            out.append(f"**{title}**\n")
            out.append(book_table(cells, jalur, lab, BOOK_DATASETS, skeleton=False) + "\n")
            extra = book_table(cells, jalur, lab, EXTRA_DATASETS, skeleton=False)
            if extra.count("\n") > 1:
                out.append("Baris tambahan (bukan baris utama buku):\n\n" + extra + "\n")
        if any(k[0] == JALUR[0][0] and k[1] == lab for k in cells):
            out.append("**Responsivitas UI (jalur peramban)**\n")
            out.append(resp_table(cells, JALUR[0][0], lab) + "\n")
            oh = overhead_table(cells, JALUR[0][0], lab)
            if oh:
                out.append("**Overhead tetap Worker (jalur peramban, 40 dokumen)**\n\n" + oh + "\n")
        wt = warmup_table(cells, lab)
        if wt:
            out.append("**Run pemanasan (run 0) dibanding rata-rata run 1\u20135** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)\n\n" + wt + "\n")
        out.append(e2e_block(cells, lab))
    return "\n".join(out), rows, cells


def inject(path, text):
    b, e = "<!-- BEGIN:perf_tables -->", "<!-- END:perf_tables -->"
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    i, j = src.find(b), src.find(e)
    if i < 0 or j < 0 or j < i:
        sys.exit(f"penanda {b} ... {e} tidak ditemukan di {path}")
    new = src[: i + len(b)] + "\n\n" + text.rstrip() + "\n\n" + src[j:]
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(new)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw-dir", default=os.path.join(HERE, "raw"))
    ap.add_argument("--out", default=os.path.join(HERE, "tables_generated.md"))
    ap.add_argument("--inject", default=None, help="berkas markdown dengan penanda BEGIN/END:perf_tables")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    text, rows, cells = build(a.raw_dir)
    with open(a.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    if a.inject:
        inject(a.inject, text)
    if not a.quiet:
        sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None
        print(text)
    print(f"[aggregate_perf] {len(rows)} baris mentah, {len(cells)} sel -> {a.out}" + (f"; disuntikkan ke {a.inject}" if a.inject else ""), file=sys.stderr)


if __name__ == "__main__":
    main()
