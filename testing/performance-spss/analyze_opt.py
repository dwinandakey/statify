"""Phase 3: optimised WASM build (opt-level = 3, wasm-opt -O3) vs the
production build (opt-level = 0, no wasm-opt) and SPSS, compute only.

Inputs  spss/<base>/spss-runs.csv, spss-stats.json
        statify/<base>-compute/   production build (phase 2)
        statify/<opt>-compute/    optimised build (phase 3, same payloads)
Outputs results/<opt>/
        summary-opt.csv      per cell: medians (s) with min/max, ratio to SPSS,
                             speedup production / optimised
        equivalence-opt.csv  Wilks' Lambda (Value, F, Sig.) + RM between F:
                             optimised vs SPSS (|diff| <= 0.001)
        numeric-diff-opt.csv every numeric leaf of the results: optimised vs
                             production (max abs and max relative difference)
        waktu-vs-n-opt.png   log-log, SPSS / production / optimised
Usage: python analyze_opt.py [--base utama] [--opt opt]
"""
import argparse
import json
from collections import defaultdict

import numpy as np

import analyze as A

SERIES_OPT = [
    ("spss_elapsed", "SPSS (Elapsed Time)", "#2a78d6", "o", "-"),
    ("statify_compute", "Statify, build produksi", "#eb6834", "s", "--"),
    ("statify_compute_opt", "Statify, build teroptimasi", "#6250d6", "D", "-."),
]


def compute_runs(label):
    out = defaultdict(list)
    for r in A.read_csv(A.ROOT / "statify" / f"{label}-compute" / "runs.csv"):
        if r["phase"] == "measured" and r["valid"] == "1":
            out[(r["proc"], int(r["n"]))].append(float(r["in_worker_ms"]) / 1000)
    return out


def leaves(v, path=""):
    if isinstance(v, bool) or v is None:
        return
    if isinstance(v, (int, float)):
        yield path, float(v)
    elif isinstance(v, list):
        for i, x in enumerate(v):
            yield from leaves(x, f"{path}[{i}]")
    elif isinstance(v, dict):
        for k in sorted(v):
            yield from leaves(v[k], f"{path}.{k}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="utama")
    ap.add_argument("--opt", default="opt")
    a = ap.parse_args()
    out = A.ROOT / "results" / a.opt
    out.mkdir(parents=True, exist_ok=True)

    spss = defaultdict(list)
    for r in A.read_csv(A.ROOT / "spss" / a.base / "spss-runs.csv"):
        if r["phase"] == "measured":
            spss[(r["proc"], int(r["n"]))].append(float(r["elapsed_ms"]) / 1000)
    prod, opt = compute_runs(a.base), compute_runs(a.opt)

    rows, summary = [], {}
    for key in sorted(opt):
        s, p, o = A.stats(spss[key]), A.stats(prod[key]), A.stats(opt[key])
        summary[(key[0], key[1], "spss_elapsed")] = s
        summary[(key[0], key[1], "statify_compute")] = p
        summary[(key[0], key[1], "statify_compute_opt")] = o
        rows.append({
            "proc": key[0], "n": key[1], "runs_opt": o["runs"],
            "spss_median_s": f"{s['median']:.4f}",
            "prod_median_s": f"{p['median']:.4f}", "prod_min_s": f"{p['min']:.4f}", "prod_max_s": f"{p['max']:.4f}",
            "opt_median_s": f"{o['median']:.4f}", "opt_min_s": f"{o['min']:.4f}", "opt_max_s": f"{o['max']:.4f}",
            "ratio_opt_per_spss": f"{o['median'] / s['median']:.2f}" if s["median"] > 0 else "",
            "ratio_prod_per_spss": f"{p['median'] / s['median']:.2f}" if s["median"] > 0 else "",
            "speedup_prod_per_opt": f"{p['median'] / o['median']:.1f}",
            "catatan": "SPSS di bawah resolusi pengukuran" if s["median"] * 1000 < A.RESOLUTION_MS else "",
        })
    A.write_csv(out / "summary-opt.csv", rows, list(rows[0].keys()))

    # Wilks vs SPSS, and every numeric value vs the production build.
    sp = json.loads((A.ROOT / "spss" / a.base / "spss-stats.json").read_text(encoding="utf-8"))
    eq, nd = [], []
    for cell in sorted(sp):
        fo = A.ROOT / "statify" / f"{a.opt}-compute" / "results" / f"{cell}.json"
        fp = A.ROOT / "statify" / f"{a.base}-compute" / "results" / f"{cell}.json"
        if not fo.exists():
            continue
        ro = json.loads(fo.read_text(encoding="utf-8"))["results"]
        ref, got = A.spss_values(sp[cell]), A.statify_values(ro)
        for k in sorted(ref):
            s, t = ref[k], got.get(k)
            d = abs(s - t) if isinstance(s, float) and isinstance(t, (int, float)) else None
            eq.append({"cell": cell, "effect": k[0], "statistic": k[1], "spss": s, "statify_opt": t, "abs_diff": d, "pass": "ya" if d is not None and d <= A.TOL else "TIDAK"})
        if fp.exists():
            lp = dict(leaves(json.loads(fp.read_text(encoding="utf-8"))["results"]))
            lo = dict(leaves(ro))
            common = lp.keys() & lo.keys()
            diffs = [(abs(lp[k] - lo[k]), abs(lp[k] - lo[k]) / max(abs(lp[k]), 1e-300), k) for k in common if np.isfinite(lp[k]) and np.isfinite(lo[k])]
            worst = max(diffs) if diffs else (0, 0, "")
            worst_rel = max(diffs, key=lambda d: d[1] if abs(lp[d[2]]) > 1e-12 else 0) if diffs else (0, 0, "")
            nd.append({"cell": cell, "numeric_values": len(common), "only_in_prod": len(lp.keys() - lo.keys()), "only_in_opt": len(lo.keys() - lp.keys()),
                       "identical": sum(1 for d in diffs if d[0] == 0), "max_abs_diff": f"{worst[0]:.3e}", "at": worst[2],
                       "max_rel_diff": f"{worst_rel[1]:.3e}", "at_rel": worst_rel[2]})
    A.write_csv(out / "equivalence-opt.csv", eq, ["cell", "effect", "statistic", "spss", "statify_opt", "abs_diff", "pass"])
    if nd:
        A.write_csv(out / "numeric-diff-opt.csv", nd, list(nd[0].keys()))
    A.figure(summary, out / "waktu-vs-n-opt.png", series=SERIES_OPT)

    fails = [e for e in eq if e["pass"] != "ya"]
    print(f"equivalence opt vs SPSS: {len(eq)} comparisons, {len(fails)} outside {A.TOL}")
    for f in fails:
        print("  FAIL", f)
    for r in nd:
        print("  numeric", r)
    for r in rows:
        print("  ", r)


if __name__ == "__main__":
    main()
