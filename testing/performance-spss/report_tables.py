"""Markdown tables for results/laporan.md, generated from the CSV outputs of
analyze.py / analyze_opt.py (numbers are never typed by hand).

Writes results/tabel-laporan.md with:
  T1  main comparison (numeric factor codes): SPSS Elapsed Time vs Statify
      compute-only, median [min-max] and ratio; Statify end-to-end as extra info
  T2  supplementary RM series, string factors vs numeric codes (compute-only)
  T3  phase 3, optimised build (if results/<opt>/summary-opt.csv exists)
  T4  end-to-end breakdown (medians of the stages)
Usage: python report_tables.py [--main utama] [--rm-text rm-teks] [--opt opt]
"""
import argparse
import csv
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
PROC = {"mv1": "One-Way MANOVA", "mv2": "Two-Way MANOVA", "rm": "Pengukuran Berulang"}


def read(p):
    with open(p, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def num(x, d=3):
    """Indonesian decimal comma."""
    return f"{float(x):,.{d}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def n_id(n):
    return f"{int(n):,}".replace(",", ".")


def cell_time(s):
    """median [min–max] in seconds; 3 decimals below 10 s, 2 above."""
    d = 3 if float(s["median"]) < 10 else 2
    return f"{num(s['median'], d)} [{num(s['min'], d)}–{num(s['max'], d)}]"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--main", default="utama")
    ap.add_argument("--rm-text", default="rm-teks")
    ap.add_argument("--opt", default="opt")
    a = ap.parse_args()
    out = []
    summ = {(r["proc"], int(r["n"]), r["measure"]): r for r in read(ROOT / "results" / a.main / "summary.csv")}
    ratio = {(r["proc"], int(r["n"])): r for r in read(ROOT / "results" / a.main / "ratio.csv")}
    sizes = sorted({k[1] for k in summ})

    out.append("### T1. Waktu komputasi (detik), median [min–maks] dari 10 run terukur, faktor berkode angka\n")
    out.append("| Prosedur | n | SPSS Elapsed Time | Statify komputasi saja | Rasio Statify/SPSS | Statify ujung ke ujung (informasi tambahan) |")
    out.append("|---|---:|---:|---:|---:|---:|")
    for proc in ("mv1", "mv2", "rm"):
        for n in sizes:
            s, c, e = summ.get((proc, n, "spss_elapsed")), summ.get((proc, n, "statify_compute")), summ.get((proc, n, "statify_e2e"))
            if not s:
                continue
            r = ratio.get((proc, n), {})
            rt = num(r["ratio_statify_per_spss"], 1) + "×" if r.get("ratio_statify_per_spss") else "–"
            if r.get("catatan"):
                rt += "*"
            out.append(f"| {PROC[proc]} | {n_id(n)} | {cell_time(s)} | {cell_time(c) if c else '–'} | {rt} | {cell_time(e) if e else '–'} |")
    out.append("\n\\* Median SPSS di bawah 3 *tick* jam Windows (≈ 0,047 detik): rasio di bawah resolusi pengukuran.\n")

    rt_path = ROOT / "results" / a.rm_text / "summary.csv"
    if rt_path.exists():
        st = {(int(r["n"]), r["measure"]): r for r in read(rt_path) if r["proc"] == "rm"}
        out.append("### T2. Pengukuran Berulang: faktor teks vs kode angka (detik), median [min–maks]\n")
        out.append("| n | SPSS, teks | SPSS, kode | Statify komputasi, teks | Statify komputasi, kode | Selisih Statify (teks/kode) | Rasio Statify/SPSS, teks | Rasio, kode |")
        out.append("|---:|---:|---:|---:|---:|---:|---:|---:|")
        for n in sorted({k[0] for k in st}):
            ts, tc = st.get((n, "spss_elapsed")), st.get((n, "statify_compute"))
            ks, kc = summ.get(("rm", n, "spss_elapsed")), summ.get(("rm", n, "statify_compute"))
            if not (ts and tc):
                continue
            diff = f"+{num(100 * (float(tc['median']) / float(kc['median']) - 1), 1)}%" if kc else "–"
            r_t = f"{num(float(tc['median']) / float(ts['median']), 1)}×"
            r_k = f"{num(float(kc['median']) / float(ks['median']), 1)}×" if kc and ks else "–"
            out.append(f"| {n_id(n)} | {cell_time(ts)} | {cell_time(ks) if ks else '–'} | {cell_time(tc)} | {cell_time(kc) if kc else '–'} | {diff} | {r_t} | {r_k} |")
        out.append("\nn = 50.000 hanya ada pada seri teks; n = 100.000 hanya pada seri kode (impor CSV teks gagal di atas ±63.600 baris).\n")

    op = ROOT / "results" / a.opt / "summary-opt.csv"
    if op.exists():
        out.append("### T3. Build teroptimasi (opt-level = 3, wasm-opt -O3): komputasi saja (detik), median [min–maks]\n")
        out.append("| Prosedur | n | SPSS | Statify build produksi | Statify build teroptimasi | *Speedup* | Rasio teroptimasi/SPSS |")
        out.append("|---|---:|---:|---:|---:|---:|---:|")
        for r in read(op):
            prod = {"median": r["prod_median_s"], "min": r["prod_min_s"], "max": r["prod_max_s"]}
            opt = {"median": r["opt_median_s"], "min": r["opt_min_s"], "max": r["opt_max_s"]}
            mark = "*" if r["catatan"] else ""
            out.append(f"| {PROC[r['proc']]} | {n_id(r['n'])} | {num(r['spss_median_s'])} | {cell_time(prod)} | {cell_time(opt)} | {num(r['speedup_prod_per_opt'], 1)}× | {num(r['ratio_opt_per_spss'], 1)}×{mark} |")
        out.append("")

    bd = ROOT / "results" / a.main / "e2e-breakdown.csv"
    if bd.exists():
        out.append("### T4. Rincian waktu ujung ke ujung Statify (ms, median)\n")
        out.append("| Prosedur | n | Persiapan data | Serialisasi | Worker | Pemformatan dan penyimpanan | Total | Porsi worker |")
        out.append("|---|---:|---:|---:|---:|---:|---:|---:|")
        for r in read(bd):
            out.append(f"| {PROC[r['proc']]} | {n_id(r['n'])} | {num(r['median_prep_ms'], 1)} | {num(r['median_serialize_ms'], 1)} | {num(r['median_worker_ms'], 1)} | {num(r['median_post_ms'], 1)} | {num(r['median_e2e_ms'], 1)} | {num(r['share_worker_pct'], 1)}% |")
        out.append("")
    out.append("### T5. Sebaran relatif per sel: IQR/median dan SD/rata-rata (10 run terukur)\n")
    out.append("| Prosedur | n | SPSS IQR/median | SPSS SD/rata-rata | Statify komputasi IQR/median | Statify komputasi SD/rata-rata |")
    out.append("|---|---:|---:|---:|---:|---:|")
    pct = lambda r, k: f"{num(100 * float(r[k]), 1)}%"
    rows_cv = [(PROC[p], n, summ.get((p, n, "spss_elapsed")), summ.get((p, n, "statify_compute"))) for p in ("mv1", "mv2", "rm") for n in sizes]
    if rt_path.exists():
        rows_cv += [("Pengukuran Berulang (teks)", n, st.get((n, "spss_elapsed")), st.get((n, "statify_compute"))) for n in sorted({k[0] for k in st})]
    for name, n, s, c in rows_cv:
        if s and c:
            mark = "*" if float(s["median"]) * 1000 < 3 * 15.625 else ""
            out.append(f"| {name} | {n_id(n)} | {pct(s, 'cv_iqr')}{mark} | {pct(s, 'cv_sd')}{mark} | {pct(c, 'cv_iqr')} | {pct(c, 'cv_sd')} |")
    out.append("\n\\* Median SPSS di bawah resolusi pengukuran; sebaran relatif di sel ini terutama mencerminkan langkah waktu 1–10 ms.\n")

    (ROOT / "results" / "tabel-laporan.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print("\n".join(out))


if __name__ == "__main__":
    main()
