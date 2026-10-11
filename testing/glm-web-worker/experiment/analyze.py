"""Statistical analysis of the A/B experiment (compare_web_workers.md §4.4).

Usage: python analyze.py <runs.csv> [<runs.csv> ...] --out <folder>

- Only runs with valid == 1 and status == "ok" are analysed; every other run is
  listed in excluded-runs.csv with its reason.
- Startup runs (pair 1) are reported separately; steady-state runs are the
  data for the descriptive statistics and the tests.
- Descriptive statistics per cell and mode: median, Q1, Q3, IQR
  (numpy.percentile, linear interpolation), mean and a 95% confidence interval
  (z = 1.96 for n >= 30, Student t for n < 30, per Georges et al. 2007).
- Test on the longest long task: one-sided Mann–Whitney U with H1 "mode B is
  smaller than mode A" (scipy.stats.mannwhitneyu(B, A, alternative="less")).
- Effect size: Vargha–Delaney A12 = P(A > B) + 0.5·P(A = B), i.e. the
  probability that a random mode-A run has a longer longest long task than a
  random mode-B run (0.5 = no difference; ≥ 0.71 = "large").
The decision columns of §4.6 ("Berpengaruh?", "Tujuan 2 tercapai?") are NOT
filled in here: the report only states the values.

Second experiment (clean protocol, runs.csv with extra columns), optional:
    python analyze.py <runs.csv> --out <folder> --raw <runs-raw.jsonl> --env <environment-*.json | chunk-map.json>
- longest_loaf_ms (long-animation-frame) is added as a metric when present;
  its Mann–Whitney test is reported as a supplementary table (not a §4.5 criterion).
- The pre-run check (stored results = 0 before OK) is summarised per cell.
- LoAF script attribution (runs-raw.jsonl) is grouped by the chunk tags that
  run-experiment.cjs stored in environment-*.json (WASM glue, GLM service,
  React framework, Handsontable, Result page, ...).
"""
import csv
import json
import math
import platform
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import scipy
from scipy import stats

METRICS = [
    ("longest_longtask_ms", "Long task terpanjang (ms)"),
    ("total_blocking_ms", "Total blocking (ms)"),
    ("max_frame_gap_ms", "Jeda frame terpanjang (ms)"),
    ("total_time_ms", "Waktu total (ms)"),
]
MODULE_LABEL = {"multivariate": "Multivariate", "repeated-measures": "Repeated Measures"}
MODE_LABEL = {"main": "A", "worker": "B"}


LOAF_METRIC = ("longest_loaf_ms", "LoAF terpanjang (ms)")


def arg(argv, name):
    return argv[argv.index(name) + 1] if name in argv else None


def read_runs(paths):
    rows = []
    for p in paths:
        with open(p, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                r["_source"] = str(p)
                rows.append(r)
    return rows


def describe(values):
    x = np.asarray(values, dtype=float)
    n = len(x)
    q1, med, q3 = np.percentile(x, [25, 50, 75])
    mean = float(np.mean(x))
    sd = float(np.std(x, ddof=1)) if n > 1 else float("nan")
    crit = stats.norm.ppf(0.975) if n >= 30 else stats.t.ppf(0.975, n - 1)
    half = crit * sd / math.sqrt(n) if n > 1 else float("nan")
    return {"n": n, "median": float(med), "q1": float(q1), "q3": float(q3), "iqr": float(q3 - q1),
            "mean": mean, "sd": sd, "ci_low": mean - half, "ci_high": mean + half,
            "ci_method": "z" if n >= 30 else "t", "min": float(np.min(x)), "max": float(np.max(x))}


def a12(a, b):
    a = np.asarray(a, dtype=float)[:, None]
    b = np.asarray(b, dtype=float)[None, :]
    return float(((a > b).sum() + 0.5 * (a == b).sum()) / (a.size * b.size))


def fmt(v, d=1):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "—"
    return f"{v:,.{d}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def fmt_p(p):
    if p is None or math.isnan(p):
        return "—"
    return f"{p:.3e}".replace(".", ",") if p < 0.001 else fmt(p, 4)


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252
    argv = sys.argv[1:]
    out = Path(argv[argv.index("--out") + 1]) if "--out" in argv else Path(".")
    paths = [a for a in argv if a.endswith(".csv")]
    out.mkdir(parents=True, exist_ok=True)
    rows = read_runs(paths)
    global METRICS
    has_loaf = bool(rows) and all(r.get("longest_loaf_ms") not in (None, "") for r in rows if r["status"] == "ok")
    has_clean = bool(rows) and "pre_logs" in rows[0]
    if has_loaf:
        METRICS = METRICS + [LOAF_METRIC]

    excluded, startup, steady = [], defaultdict(list), defaultdict(list)
    for r in rows:
        key = (r["module"], int(r["size"]), float(r["cpu"]), r["mode_intended"])
        ok = r["valid"] == "1" and r["status"] == "ok"
        if not ok:
            reason = r["status"] if r["status"] != "ok" else f"mode mismatch: intended {r['mode_intended']}, actual {r['mode_actual']}"
            excluded.append({**{k: r[k] for k in ("module", "size", "cpu", "run_index", "phase", "mode_intended", "mode_actual")}, "reason": reason})
            continue
        (startup if r["phase"] == "startup" else steady)[key].append(r)

    cells = sorted({k[:3] for k in list(steady) + list(startup)}, key=lambda c: (c[2], c[0], c[1]))
    summary, tests = [], []
    for module, size, cpu in cells:
        per_mode = {}
        for mode in ("main", "worker"):
            data = steady.get((module, size, cpu, mode), [])
            per_mode[mode] = data
            for metric, _ in METRICS:
                vals = [float(r[metric]) for r in data]
                if vals:
                    summary.append({"module": module, "size": size, "cpu": cpu, "mode": mode, "metric": metric, **describe(vals)})
        a = [float(r["longest_longtask_ms"]) for r in per_mode["main"]]
        b = [float(r["longest_longtask_ms"]) for r in per_mode["worker"]]
        if a and b:
            res = stats.mannwhitneyu(b, a, alternative="less", method="auto")
            ties = len(set(a + b)) < len(a + b)
            tests.append({"module": module, "size": size, "cpu": cpu, "n_A": len(a), "n_B": len(b),
                          "U_B": float(res.statistic), "U_A": float(len(a) * len(b) - res.statistic),
                          "p_one_sided": float(res.pvalue), "A12_A_vs_B": a12(a, b),
                          "ties_present": ties,
                          "median_B_longest": float(np.median(b)), "max_B_longest": float(np.max(b)),
                          "median_A_longest": float(np.median(a))})
        if has_loaf and a and b:
            la = [float(r["longest_loaf_ms"]) for r in per_mode["main"]]
            lb = [float(r["longest_loaf_ms"]) for r in per_mode["worker"]]
            res = stats.mannwhitneyu(lb, la, alternative="less", method="auto")
            tests[-1].update({"loaf_U_B": float(res.statistic), "loaf_p_one_sided": float(res.pvalue), "loaf_A12_A_vs_B": a12(la, lb),
                              "loaf_median_A": float(np.median(la)), "loaf_median_B": float(np.median(lb)), "loaf_max_B": float(np.max(lb))})

    # Drift check: does a metric change with the run index inside a cell?
    # Spearman rho and an ordinary least-squares slope (ms per run) per cell × mode × metric.
    drift = []
    for module, size, cpu in cells:
        for mode in ("main", "worker"):
            data = steady.get((module, size, cpu, mode), [])
            if len(data) < 3:
                continue
            idx = np.array([int(r["run_index"]) for r in data], dtype=float)
            for metric, _ in METRICS:
                y = np.array([float(r[metric]) for r in data])
                if np.all(y == y[0]):
                    rho, p = float("nan"), float("nan")
                else:
                    rho, p = stats.spearmanr(idx, y)
                slope = float(np.polyfit(idx, y, 1)[0])
                drift.append({"module": module, "size": size, "cpu": cpu, "mode": mode, "metric": metric,
                              "spearman_rho": float(rho), "spearman_p": float(p), "slope_ms_per_run": slope,
                              "first5_median": float(np.median(y[:5])), "last5_median": float(np.median(y[-5:]))})
    with open(out / "drift.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(drift[0].keys()) if drift else ["module"])
        w.writeheader(); w.writerows(drift)

    # ── Clean protocol check: stored results before OK, results after the run ──
    clean = []
    if has_clean:
        for module, size, cpu in cells:
            cell_rows = [r for r in rows if r["module"] == module and int(r["size"]) == size and float(r["cpu"]) == cpu]
            checked = [r for r in cell_rows if r.get("pre_logs") not in (None, "")]
            zero = [r for r in checked if all(r[k] == "0" for k in ("pre_logs", "pre_analytics", "pre_statistics", "pre_dom_logs"))]
            clean.append({"module": module, "size": size, "cpu": cpu, "runs": len(cell_rows),
                          "pre_checked": len(checked), "pre_all_zero": len(zero),
                          "post_logs_1": sum(1 for r in cell_rows if r.get("post_logs") == "1"),
                          "post_dom_logs_1": sum(1 for r in cell_rows if r.get("post_dom_logs") == "1")})
        with open(out / "clean-check.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(clean[0].keys()) if clean else ["module"])
            w.writeheader(); w.writerows(clean)

    # ── LoAF script attribution (runs-raw.jsonl + chunk tags of the build) ──
    attribution, run_attr = [], []
    raw_path, env_path = arg(argv, "--raw"), arg(argv, "--env")
    if raw_path and env_path:
        from urllib.parse import urlparse
        tags = json.loads(Path(env_path).read_text(encoding="utf-8")).get("chunks", {}).get("tags", {})
        ok_keys = {(r["module"], r["size"], r["run_index"]) for r in rows if r["valid"] == "1" and r["status"] == "ok"}

        def category(url, module):
            if not url:
                return "(tanpa sourceURL)"
            t = tags.get(urlparse(url).path, [])
            name = urlparse(url).path.rsplit("/", 1)[-1]
            for want, label in ((f"wasm-glue:{module}", "glue WASM modul"), (f"glm-service:{module}", "service GLM modul"),
                                ("react-dom", "react-dom"), ("react-framework", "React (framework)"),
                                ("modal-registry", "chunk dashboard bersama (registry modal, Handsontable)"),
                                ("result-page", "halaman Result"), ("next-runtime", "Next.js runtime"),
                                ("handsontable", "chunk ber-Handsontable")):
                if want in t:
                    return f"{label} ({name})"
            return "lainnya: " + name

        agg = defaultdict(lambda: {"scripts": 0, "duration": 0.0, "runs": set()})
        with open(raw_path, encoding="utf-8") as f:
            for line in f:
                j = json.loads(line)
                if (j["module"], str(j["size"]), str(j["run_index"])) not in ok_keys or "loafs" not in j:
                    continue
                module, mode, phase = j["module"], j["mode_intended"], j["phase"]
                longest = max(j["loafs"], key=lambda x: x["duration"], default=None)
                dominant = ""
                if longest and longest.get("scripts"):
                    s0 = max(longest["scripts"], key=lambda x: x.get("duration") or 0)
                    dominant = category(s0.get("sourceURL"), module)
                cats = set()
                for lf in j["loafs"]:
                    for sc in lf.get("scripts") or []:
                        c = category(sc.get("sourceURL"), module)
                        cats.add(c)
                        a = agg[(module, int(j["size"]), mode, phase, c, sc.get("invokerType") or "")]
                        a["scripts"] += 1
                        a["duration"] += float(sc.get("duration") or 0)
                        a["runs"].add(j["run_index"])
                run_attr.append({"module": module, "size": int(j["size"]), "mode": mode, "phase": phase, "run_index": j["run_index"],
                                 "loaf_count": len(j["loafs"]), "longest_loaf_ms": longest["duration"] if longest else 0,
                                 "longest_loaf_dominant_source": dominant,
                                 "glue_in_any_loaf": int(any(c.startswith("glue WASM modul") for c in cats)),
                                 "service_in_any_loaf": int(any(c.startswith("service GLM modul") for c in cats))})
        for (module, size, mode, phase, c, inv), a in sorted(agg.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2], kv[0][3], -kv[1]["duration"])):
            attribution.append({"module": module, "size": size, "mode": mode, "phase": phase, "source": c, "invokerType": inv,
                                "scripts": a["scripts"], "script_duration_ms": round(a["duration"], 1), "runs": len(a["runs"])})
        for name, data in (("loaf-attribution.csv", attribution), ("loaf-runs.csv", run_attr)):
            with open(out / name, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=list(data[0].keys()) if data else ["module"])
                w.writeheader(); w.writerows(data)

    versions = {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__,
                "mannwhitneyu": "scipy.stats.mannwhitneyu(B, A, alternative='less', method='auto'); "
                                "with ties SciPy uses the normal approximation with tie correction and continuity correction"}
    (out / "analysis.json").write_text(json.dumps({"versions": versions, "inputs": paths, "summary": summary,
                                                    "tests": tests, "drift": drift, "excluded": excluded,
                                                    **({"clean_check": clean} if has_clean else {}),
                                                    **({"loaf_attribution": attribution} if attribution else {})}, indent=2), encoding="utf-8")
    with open(out / "summary.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(summary[0].keys()) if summary else ["module"])
        w.writeheader(); w.writerows(summary)
    with open(out / "tests.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(tests[0].keys()) if tests else ["module"])
        w.writeheader(); w.writerows(tests)
    with open(out / "excluded-runs.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["module", "size", "cpu", "run_index", "phase", "mode_intended", "mode_actual", "reason"])
        w.writeheader(); w.writerows(excluded)

    # ── Markdown tables in the §4.6 layout ──
    S = {(s["module"], s["size"], s["cpu"], s["mode"], s["metric"]): s for s in summary}
    md = ["## Ringkasan metrik (steady-state; median [IQR])", "",
          "| Modul | n data | CPU | Mode | n run | " + " | ".join(l for _, l in METRICS) + " |",
          "|---|---|---|---|---|" + "---|" * len(METRICS)]
    for module, size, cpu in cells:
        for mode in ("main", "worker"):
            first = S.get((module, size, cpu, mode, METRICS[0][0]))
            if not first:
                continue
            cellvals = []
            for m, _ in METRICS:
                s = S[(module, size, cpu, mode, m)]
                cellvals.append(f"{fmt(s['median'])} [{fmt(s['q1'])}–{fmt(s['q3'])}]")
            md.append(f"| {MODULE_LABEL[module]} | {size} | {fmt(cpu, 0)}× | {MODE_LABEL[mode]} | {first['n']} | " + " | ".join(cellvals) + " |")
    md += ["", "## Mean dan CI 95% (steady-state)", "",
           "| Modul | n data | CPU | Mode | " + " | ".join(l for _, l in METRICS) + " |",
           "|---|---|---|---|" + "---|" * len(METRICS)]
    for module, size, cpu in cells:
        for mode in ("main", "worker"):
            if (module, size, cpu, mode, METRICS[0][0]) not in S:
                continue
            vals = []
            for m, _ in METRICS:
                s = S[(module, size, cpu, mode, m)]
                vals.append(f"{fmt(s['mean'])} ({fmt(s['ci_low'])}–{fmt(s['ci_high'])})")
            md.append(f"| {MODULE_LABEL[module]} | {size} | {fmt(cpu, 0)}× | {MODE_LABEL[mode]} | " + " | ".join(vals) + " |")
    md += ["", "## Uji statistik (long task terpanjang, H₁: B < A)", "",
           "| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median B (ms) | Maks B (ms) | Berpengaruh? | Tujuan 2 tercapai? |",
           "|---|---|---|---|---|---|---|---|---|---|---|"]
    for t in tests:
        md.append(f"| {MODULE_LABEL[t['module']]} | {t['size']} | {fmt(t['cpu'], 0)}× | {t['n_A']} / {t['n_B']} | {fmt(t['U_B'], 1)} | "
                  f"{fmt_p(t['p_one_sided'])} | {fmt(t['A12_A_vs_B'], 3)} | {fmt(t['median_B_longest'])} | {fmt(t['max_B_longest'])} | "
                  f"tidak diisi | tidak diisi |")
    if has_loaf:
        md += ["", "## Uji tambahan (LoAF terpanjang, H₁: B < A; bukan kriteria §4.5)", "",
               "| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |",
               "|---|---|---|---|---|---|---|---|---|---|"]
        for t in tests:
            if "loaf_U_B" in t:
                md.append(f"| {MODULE_LABEL[t['module']]} | {t['size']} | {fmt(t['cpu'], 0)}× | {t['n_A']} / {t['n_B']} | {fmt(t['loaf_U_B'], 1)} | "
                          f"{fmt_p(t['loaf_p_one_sided'])} | {fmt(t['loaf_A12_A_vs_B'], 3)} | {fmt(t['loaf_median_A'])} | {fmt(t['loaf_median_B'])} | {fmt(t['loaf_max_B'])} |")
    md += ["", "## Run startup (pasangan pertama; n = 1 per mode)", "",
           "| Modul | n data | CPU | Mode | " + " | ".join(l for _, l in METRICS) + " |",
           "|---|---|---|---|" + "---|" * len(METRICS)]
    for module, size, cpu in cells:
        for mode in ("main", "worker"):
            for r in startup.get((module, size, cpu, mode), []):
                md.append(f"| {MODULE_LABEL[module]} | {size} | {fmt(cpu, 0)}× | {MODE_LABEL[mode]} | " +
                          " | ".join(fmt(float(r[m])) for m, _ in METRICS) + " |")
    md += ["", "## Drift terhadap nomor run (steady-state; Spearman ρ, kemiringan ms/run, median 5 run pertama → 5 terakhir)", "",
           "| Modul | n data | Mode | Metrik | ρ | kemiringan (ms/run) | median awal → akhir (ms) |",
           "|---|---|---|---|---|---|---|"]
    label = dict(METRICS)
    for d in drift:
        if d["metric"] not in ("longest_longtask_ms", "total_time_ms", "longest_loaf_ms"):
            continue
        md.append(f"| {MODULE_LABEL[d['module']]} | {d['size']} | {MODE_LABEL[d['mode']]} | {label[d['metric']]} | "
                  f"{fmt(d['spearman_rho'], 2)} | {fmt(d['slope_ms_per_run'], 1)} | {fmt(d['first5_median'])} → {fmt(d['last5_median'])} |")
    if clean:
        md += ["", "## Verifikasi protokol bersih (semua run sel, termasuk startup)", "",
               "| Modul | n data | Run | Dicek sebelum OK | Tersimpan = 0 sebelum OK | Log tersimpan = 1 setelah run | Log dirender = 1 setelah run |",
               "|---|---|---|---|---|---|---|"]
        for c in clean:
            md.append(f"| {MODULE_LABEL[c['module']]} | {c['size']} | {c['runs']} | {c['pre_checked']} | {c['pre_all_zero']} | {c['post_logs_1']} | {c['post_dom_logs_1']} |")
    if run_attr:
        md += ["", "## LoAF per run: skrip glue WASM / service GLM di main thread (steady-state)", "",
               "| Modul | n data | Mode | Run | Run dgn skrip glue WASM | Run dgn skrip service GLM | Sumber skrip terlama di LoAF terpanjang (jumlah run) |",
               "|---|---|---|---|---|---|---|"]
        groups = defaultdict(list)
        for r in run_attr:
            if r["phase"] == "steady":
                groups[(r["module"], r["size"], r["mode"])].append(r)
        for (module, size, mode), rs in sorted(groups.items()):
            dom = defaultdict(int)
            for r in rs:
                dom[r["longest_loaf_dominant_source"] or "(tanpa LoAF/skrip)"] += 1
            doms = "; ".join(f"{k} ({v})" for k, v in sorted(dom.items(), key=lambda kv: -kv[1]))
            md.append(f"| {MODULE_LABEL[module]} | {size} | {MODE_LABEL[mode]} | {len(rs)} | {sum(r['glue_in_any_loaf'] for r in rs)} | "
                      f"{sum(r['service_in_any_loaf'] for r in rs)} | {doms} |")
        md += ["", "## Atribusi skrip LoAF mode B (steady-state; total durasi skrip per sumber, 5 teratas per sel)", "",
               "| Modul | n data | Sumber | invokerType | Skrip | Durasi skrip total (ms) | Run |",
               "|---|---|---|---|---|---|---|"]
        top = defaultdict(list)
        for a in attribution:
            if a["mode"] == "worker" and a["phase"] == "steady":
                top[(a["module"], a["size"])].append(a)
        for (module, size), items in sorted(top.items()):
            for a in sorted(items, key=lambda x: -x["script_duration_ms"])[:5]:
                md.append(f"| {MODULE_LABEL[module]} | {size} | {a['source']} | {a['invokerType']} | {a['scripts']} | {fmt(a['script_duration_ms'])} | {a['runs']} |")
    md += ["", f"Run yang dibuang: {len(excluded)} (lihat excluded-runs.csv).", "",
           f"Pustaka: Python {versions['python']}, NumPy {versions['numpy']}, SciPy {versions['scipy']}."]
    (out / "tables.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print("\n".join(md))


if __name__ == "__main__":
    main()
