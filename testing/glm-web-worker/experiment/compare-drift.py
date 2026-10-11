"""Drift of experiment 1 next to experiment 2 (Spearman rho of a metric vs run index).

Usage: python compare-drift.py <exp1/analysis/drift.csv> <exp2/analysis/drift.csv> [metric ...]

Cells are paired by module and by the position of the size (1st..4th size of the
module), because the Repeated Measures sizes differ between the experiments.
Prints one Markdown table per metric (default: longest_longtask_ms, total_time_ms).
"""
import csv
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
MODULE = {"multivariate": "Multivariate", "repeated-measures": "Repeated Measures"}
MODE = {"main": "A", "worker": "B"}
LABEL = {"longest_longtask_ms": "long task terpanjang", "total_time_ms": "waktu total", "longest_loaf_ms": "LoAF terpanjang"}


def fmt(v, d=1):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return "—"
    if x != x:
        return "—"
    return f"{x:,.{d}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def load(path):
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    sizes = defaultdict(set)
    for r in rows:
        sizes[r["module"]].add(int(r["size"]))
    order = {m: sorted(s) for m, s in sizes.items()}
    return {(r["module"], order[r["module"]].index(int(r["size"])), r["mode"], r["metric"]): r for r in rows}, order


def main():
    exp1, order1 = load(sys.argv[1])
    exp2, order2 = load(sys.argv[2])
    metrics = sys.argv[3:] or ["longest_longtask_ms", "total_time_ms"]
    for metric in metrics:
        print(f"\n**Drift {LABEL.get(metric, metric)}** (steady-state, ρ Spearman terhadap nomor run; median 5 run pertama → 5 terakhir)\n")
        print("| Modul | Mode | n data (eks. 1) | ρ eks. 1 | awal → akhir eks. 1 (ms) | n data (eks. 2) | ρ eks. 2 | awal → akhir eks. 2 (ms) |")
        print("|---|---|---|---|---|---|---|---|")
        for module in ("multivariate", "repeated-measures"):
            for mode in ("main", "worker"):
                for i in range(max(len(order1.get(module, [])), len(order2.get(module, [])))):
                    a = exp1.get((module, i, mode, metric))
                    b = exp2.get((module, i, mode, metric))
                    cell = lambda r: (f"{fmt(r['spearman_rho'], 2)} | {fmt(r['first5_median'])} → {fmt(r['last5_median'])}" if r else "— | —")
                    size = lambda r: r["size"] if r else "—"
                    print(f"| {MODULE[module]} | {MODE[mode]} | {size(a)} | {cell(a)} | {size(b)} | {cell(b)} |")


if __name__ == "__main__":
    main()
