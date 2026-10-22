"""Analysis of one measurement label (../README.md).

Inputs  spss/<label>/spss-runs.csv, spss-stats.json   (spss/extract.py)
        statify/<label>-e2e/runs.csv, results/*.json  (statify/run-e2e.cjs)
        statify/<label>-compute/runs.csv, results/*.json (statify/run-compute.cjs, optional)
Outputs results/<label>/
        runs-all.csv        every measured run, long format (seconds)
        summary.csv         per cell and measure: n runs, median, Q1, Q3, min, max (s)
        ratio.csv           median Statify compute-only / median SPSS Elapsed Time,
                            flagged "di bawah resolusi pengukuran" when the SPSS
                            median is below 3 Windows clock ticks (3 x 15.625 ms)
        e2e-breakdown.csv   medians of the end-to-end components
        equivalence.csv     Wilks' Lambda (Value, F, Sig.) and the between-subjects
                            F of RM: SPSS vs Statify (e2e and compute), |diff| <= 0.001
        determinism.csv     distinct result hashes per cell (all runs identical?)
        waktu-vs-n.png      log-log time vs n per procedure (300 dpi, 14 cm wide)
Usage: python analyze.py <label> [--e2e-label X] [--compute-label Y]
"""
import argparse
import csv
import json
import math
import pathlib
from collections import defaultdict

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent
TICK_MS = 15.625
RESOLUTION_MS = 3 * TICK_MS
TOL = 0.001
PROC_NAME = {"mv1": "One-Way MANOVA", "mv2": "Two-Way MANOVA", "rm": "Pengukuran Berulang"}
MEASURES = [
    ("spss_elapsed", "SPSS Elapsed Time"),
    ("spss_processor", "SPSS Processor Time"),
    ("statify_compute", "Statify komputasi saja (di dalam worker)"),
    ("statify_compute_roundtrip", "Statify komputasi + transfer worker"),
    ("statify_e2e", "Statify ujung ke ujung"),
]


def read_csv(p):
    with open(p, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def stats(values):
    a = np.asarray(values, dtype=float)
    return {
        "runs": len(a), "median": float(np.median(a)), "q1": float(np.percentile(a, 25)),
        "q3": float(np.percentile(a, 75)), "min": float(a.min()), "max": float(a.max()),
        "mean": float(a.mean()), "sd": float(a.std(ddof=1)) if len(a) > 1 else 0.0,
        # Relative spread: robust (IQR / median) and classical (SD / mean, sample SD).
        "cv_iqr": float((np.percentile(a, 75) - np.percentile(a, 25)) / np.median(a)) if np.median(a) > 0 else float("nan"),
        "cv_sd": float(a.std(ddof=1) / a.mean()) if len(a) > 1 and a.mean() > 0 else float("nan"),
    }


def load_runs(label, e2e_label, compute_label):
    runs = []  # (measure, proc, n, run, seconds)
    invalid = []
    sp = ROOT / "spss" / label / "spss-runs.csv"
    for r in read_csv(sp):
        if r["phase"] != "measured":
            continue
        runs.append(("spss_elapsed", r["proc"], int(r["n"]), int(r["run"]), float(r["elapsed_ms"]) / 1000))
        runs.append(("spss_processor", r["proc"], int(r["n"]), int(r["run"]), float(r["processor_ms"]) / 1000))
    e2e = ROOT / "statify" / f"{e2e_label}-e2e" / "runs.csv"
    breakdown = defaultdict(lambda: defaultdict(list))
    for r in read_csv(e2e):
        if r["phase"] != "measured":
            continue
        if r["valid"] != "1":
            invalid.append(("statify_e2e", r["cell"], r["run"], r["status"]))
            continue
        runs.append(("statify_e2e", r["proc"], int(r["n"]), int(r["run"]), float(r["e2e_ms"]) / 1000))
        for k in ("prep_ms", "serialize_ms", "worker_ms", "post_ms", "e2e_ms"):
            breakdown[(r["proc"], int(r["n"]))][k].append(float(r[k]))
    comp = ROOT / "statify" / f"{compute_label}-compute" / "runs.csv"
    if comp.exists():
        for r in read_csv(comp):
            if r["phase"] != "measured":
                continue
            if r["valid"] != "1":
                invalid.append(("statify_compute", r["cell"], r["run"], r["status"]))
                continue
            runs.append(("statify_compute", r["proc"], int(r["n"]), int(r["run"]), float(r["in_worker_ms"]) / 1000))
            runs.append(("statify_compute_roundtrip", r["proc"], int(r["n"]), int(r["run"]), float(r["roundtrip_ms"]) / 1000))
    return runs, breakdown, invalid


def determinism(label, e2e_label, compute_label):
    out = []
    for kind, d in (("statify_e2e", f"{e2e_label}-e2e"), ("statify_compute", f"{compute_label}-compute")):
        p = ROOT / "statify" / d / "runs.csv"
        if not p.exists():
            continue
        hashes, sorted_hashes = defaultdict(set), defaultdict(set)
        for r in read_csv(p):
            if r.get("results_sha1"):
                hashes[r["cell"]].add(r["results_sha1"])
            if r.get("results_sorted_sha1"):
                sorted_hashes[r["cell"]].add(r["results_sorted_sha1"])
        for cell, hs in sorted(hashes.items()):
            out.append({"measure": kind, "cell": cell, "distinct_result_hashes": len(hs),
                        "distinct_sorted_key_hashes": len(sorted_hashes[cell]) if sorted_hashes[cell] else "",
                        "hashes": " ".join(sorted(h[:12] for h in hs))})
    return out


# ───────────── spikes ─────────────
# A measured run is flagged in a stage when its value is at least twice the
# median of the OTHER measured runs of the cell in that stage (leave-one-out,
# so the spike does not raise its own reference) AND exceeds it by at least
# SPIKE_MIN_MS (SPSS: 3 clock ticks). Flagged runs stay in every statistic;
# min/max show them.
SPIKE_MIN_MS = 100.0
SOURCES = [
    ("statify_e2e", "statify/{e2e}-e2e/runs.csv", ["e2e_ms", "prep_ms", "serialize_ms", "worker_ms", "post_ms"]),
    ("statify_compute", "statify/{compute}-compute/runs.csv", ["in_worker_ms", "post_ms", "roundtrip_ms"]),
    ("spss", "spss/{label}/spss-runs.csv", ["elapsed_ms", "processor_ms"]),
]


def spikes(label, e2e_label, compute_label, out):
    found = []
    for kind, pattern, stages in SOURCES:
        p = ROOT / pattern.format(label=label, e2e=e2e_label, compute=compute_label)
        if not p.exists():
            continue
        rows = read_csv(p)
        measured = defaultdict(list)
        for r in rows:
            if r["phase"] == "measured" and r.get("valid", "1") == "1":
                measured[r["cell"]].append(r)
        def others_median(r, s):
            vals = [float(o[s]) for o in measured[r["cell"]] if o is not r and o[s] != ""]
            return float(np.median(vals)) if vals else None
        floor = 3 * TICK_MS if kind == "spss" else SPIKE_MIN_MS
        for r in rows:
            marks = []
            if r["phase"] == "measured":
                for s in stages:
                    med = others_median(r, s)
                    if med is None or r[s] == "":
                        continue
                    v = float(r[s])
                    if v >= 2 * med and v - med >= floor:
                        marks.append(f"{s}={v:.0f}ms (median {med:.0f})")
                        found.append({"source": kind, "cell": r["cell"], "run": r["run"], "stage": s, "ms": f"{v:.1f}", "median_other_runs_ms": f"{med:.1f}", "ratio_to_median": f"{v / med:.1f}" if med else ""})
            r["lonjakan"] = "; ".join(marks)
        write_csv(out / f"{kind}-runs-annotated.csv", rows, list(rows[0].keys()))
    write_csv(out / "spikes.csv", found, ["source", "cell", "run", "stage", "ms", "median_other_runs_ms", "ratio_to_median"])
    return found


# ───────────── equivalence ─────────────
def spss_values(cells):
    """{(effect, statistic): value} from the flattened SPSS tables."""
    out = {}
    mt = cells.get("Multivariate Tests", {}).get("cells", {})
    for key, v in mt.items():
        parts = key.split(" | ")
        if len(parts) == 3 and parts[1] == "Wilks' Lambda" and parts[2] in ("Value", "F", "Sig."):
            out[(f"Wilks {parts[0]}", parts[2])] = v
    bse = cells.get("Tests of Between-Subjects Effects", {}).get("cells", {})
    for key, v in bse.items():
        parts = key.split(" | ")  # RM: score | Average | <source> | <column>
        if len(parts) == 4 and parts[0] == "score" and parts[2] == "group" and parts[3] in ("F", "Sig."):
            out[("Between group", parts[3])] = v
    return out


def statify_values(results):
    out = {}
    effects = (results.get("multivariate_tests") or {}).get("effects") or {}
    for eff, tests in effects.items():
        w = tests.get("Wilks' Lambda")
        if not w:
            continue
        name = eff if " * " in eff else eff.replace("*", " * ")
        out[(f"Wilks {name}", "Value")] = w.get("value")
        out[(f"Wilks {name}", "F")] = w.get("f")
        out[(f"Wilks {name}", "Sig.")] = w.get("significance")
    bse = ((results.get("tests_of_between_subjects_effects") or {}).get("effects") or {})
    row = (bse.get("score") or {}).get("group") if isinstance(bse.get("score"), dict) else None
    if row:
        out[("Between group", "F")] = row.get("f_value")
        out[("Between group", "Sig.")] = row.get("significance")
    return out


def equivalence(label, e2e_label, compute_label):
    sp = json.loads((ROOT / "spss" / label / "spss-stats.json").read_text(encoding="utf-8"))
    rows = []
    for cell in sorted(sp):
        ref = spss_values(sp[cell])
        for kind, d in (("statify_e2e", f"{e2e_label}-e2e"), ("statify_compute", f"{compute_label}-compute")):
            f = ROOT / "statify" / d / "results" / f"{cell}.json"
            if not f.exists():
                continue
            got = statify_values(json.loads(f.read_text(encoding="utf-8"))["results"])
            for key in sorted(ref):
                s, t = ref[key], got.get(key)
                diff = abs(s - t) if isinstance(s, float) and isinstance(t, (int, float)) else None
                rows.append({
                    "cell": cell, "source": kind, "effect": key[0], "statistic": key[1],
                    "spss": s, "statify": t, "abs_diff": diff,
                    "pass": "ya" if diff is not None and diff <= TOL else "TIDAK",
                })
    return rows


# ───────────── figure ─────────────
# Fixed categorical order (dataviz reference palette) plus a distinct marker
# and line style per series, so print in grey still works. A series keeps its
# colour in every figure (colour follows the entity).
SERIES_MAIN = [
    ("spss_elapsed", "SPSS (Elapsed Time)", "#2a78d6", "o", "-"),
    ("statify_compute", "Statify komputasi saja", "#eb6834", "s", "--"),
    ("statify_e2e", "Statify ujung ke ujung", "#1baf7a", "^", ":"),
]


def figure(summary, out_png, series=SERIES_MAIN):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.rcParams.update({
        "font.family": "DejaVu Sans", "font.size": 8, "axes.titlesize": 8, "axes.labelsize": 8,
        "xtick.labelsize": 8, "ytick.labelsize": 8, "legend.fontsize": 8,
        "axes.edgecolor": "#52514e", "axes.linewidth": 0.6, "xtick.color": "#52514e", "ytick.color": "#52514e",
        "text.color": "#0b0b0b", "axes.labelcolor": "#0b0b0b",
    })
    procs = [p for p in ("mv1", "mv2", "rm") if any(k[0] == p for k in summary)]
    sizes = sorted({k[1] for k in summary})
    from matplotlib.lines import Line2D
    from matplotlib.ticker import NullLocator

    cm = 1 / 2.54
    fig, axes = plt.subplots(1, len(procs), figsize=(14 * cm, 7.0 * cm), sharey=True)
    axes = np.atleast_1d(axes)
    res_style = dict(color="#9a9890", linewidth=0.8, linestyle=(0, (1, 2)))
    for ax, proc in zip(axes, procs):
        for key, name, color, marker, ls in series:
            pts = sorted((n, s) for (p, n, m), s in summary.items() if p == proc and m == key)
            if not pts:
                continue
            ns = [n for n, _ in pts]
            med = np.array([s["median"] for _, s in pts])
            lo = med - np.array([s["q1"] for _, s in pts])
            hi = np.array([s["q3"] for _, s in pts]) - med
            ax.errorbar(ns, med, yerr=[lo, hi], color=color, marker=marker, markersize=4, linestyle=ls,
                        linewidth=1.4, capsize=2, elinewidth=0.8, label=name)
        ax.axhline(RESOLUTION_MS / 1000, **res_style)
        ax.set_xscale("log")
        ax.set_yscale("log")
        if len(sizes) == 1:
            ax.set_xlim(sizes[0] / 3, sizes[0] * 3)
        # One tick per measured n (powers of ten here), no minor ticks.
        ax.set_xticks(sizes)
        ax.set_xticklabels([f"$10^{{{int(round(np.log10(n)))}}}$" if np.isclose(np.log10(n), round(np.log10(n))) else f"{n:,}".replace(",", ".") for n in sizes])
        ax.xaxis.set_minor_locator(NullLocator())
        ax.set_title(PROC_NAME[proc])
        ax.set_xlabel("Jumlah kasus (n)")
        ax.grid(True, which="major", color="#e4e3df", linewidth=0.5)
        ax.set_axisbelow(True)
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
    axes[0].set_ylabel("Waktu (detik, median)")
    handles, labels = axes[0].get_legend_handles_labels()
    handles.append(Line2D([], [], **res_style))
    labels.append("Batas resolusi SPSS (≈ 0,047 detik)")
    fig.legend(handles, labels, loc="lower center", ncol=2, frameon=False, bbox_to_anchor=(0.5, 0.0),
               columnspacing=1.5, handlelength=2.5)
    fig.tight_layout(rect=(0, 0.17, 1, 1))
    fig.savefig(out_png, dpi=300)
    plt.close(fig)


def write_csv(path, rows, fields):
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("label")
    ap.add_argument("--e2e-label")
    ap.add_argument("--compute-label")
    a = ap.parse_args()
    e2e_label, compute_label = a.e2e_label or a.label, a.compute_label or a.label
    out = ROOT / "results" / a.label
    out.mkdir(parents=True, exist_ok=True)

    runs, breakdown, invalid = load_runs(a.label, e2e_label, compute_label)
    write_csv(out / "runs-all.csv", [{"measure": m, "proc": p, "n": n, "run": r, "seconds": f"{s:.6f}"} for m, p, n, r, s in runs],
              ["measure", "proc", "n", "run", "seconds"])
    grouped = defaultdict(list)
    for m, p, n, r, s in runs:
        grouped[(p, n, m)].append(s)
    summary = {k: stats(v) for k, v in grouped.items()}
    label_of = dict(MEASURES)
    write_csv(out / "summary.csv", [
        {"proc": p, "n": n, "measure": m, "measure_label": label_of[m], **{k: (f"{v:.4f}" if isinstance(v, float) else v) for k, v in s.items()}}
        for (p, n, m), s in sorted(summary.items(), key=lambda kv: (kv[0][0], kv[0][1], [x for x, _ in MEASURES].index(kv[0][2])))
    ], ["proc", "n", "measure", "measure_label", "runs", "median", "q1", "q3", "min", "max", "mean", "sd", "cv_iqr", "cv_sd"])

    ratios = []
    for (p, n, m), s in sorted(summary.items()):
        if m != "spss_elapsed":
            continue
        comp = summary.get((p, n, "statify_compute"))
        below = s["median"] * 1000 < RESOLUTION_MS
        ratios.append({
            "proc": p, "n": n, "spss_median_s": f"{s['median']:.4f}",
            "statify_compute_median_s": f"{comp['median']:.4f}" if comp else "",
            "ratio_statify_per_spss": f"{comp['median'] / s['median']:.2f}" if comp and s["median"] > 0 else "",
            "catatan": "di bawah resolusi pengukuran" if below else "",
        })
    write_csv(out / "ratio.csv", ratios, ["proc", "n", "spss_median_s", "statify_compute_median_s", "ratio_statify_per_spss", "catatan"])

    bd = []
    for (p, n), comps in sorted(breakdown.items()):
        med = {k: float(np.median(v)) for k, v in comps.items()}
        bd.append({"proc": p, "n": n, **{f"median_{k}": f"{v:.1f}" for k, v in med.items()},
                   "share_worker_pct": f"{100 * med['worker_ms'] / med['e2e_ms']:.1f}",
                   "share_post_pct": f"{100 * med['post_ms'] / med['e2e_ms']:.1f}"})
    if bd:
        write_csv(out / "e2e-breakdown.csv", bd, list(bd[0].keys()))

    eq = equivalence(a.label, e2e_label, compute_label)
    write_csv(out / "equivalence.csv", eq, ["cell", "source", "effect", "statistic", "spss", "statify", "abs_diff", "pass"])
    det = determinism(a.label, e2e_label, compute_label)
    write_csv(out / "determinism.csv", det, ["measure", "cell", "distinct_result_hashes", "distinct_sorted_key_hashes", "hashes"])
    figure(summary, out / "waktu-vs-n.png")
    sp = spikes(a.label, e2e_label, compute_label, out)
    print(f"spikes: {len(sp)}")
    for s in sp:
        print("  SPIKE", s)

    print(f"summary: {len(summary)} cell×measure, invalid measured runs: {len(invalid)}")
    for i in invalid:
        print("  INVALID", i)
    fails = [e for e in eq if e["pass"] != "ya"]
    print(f"equivalence: {len(eq)} comparisons, {len(fails)} outside tolerance {TOL}")
    for e in fails:
        print("  FAIL", e)
    for r in ratios:
        print("  ratio", r)


if __name__ == "__main__":
    main()
