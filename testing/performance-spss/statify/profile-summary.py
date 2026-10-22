"""Summarises a Chromium trace recorded by run-compute.cjs --profile (the same
file opens in Chrome DevTools > Performance).

Takes the V8 CPU profile of the dedicated worker thread (Profile/ProfileChunk
events) and reports, from the samples:
  - total sampled time, and the time in (garbage collector)/(program)/(idle);
  - self time per function (top N);
  - inclusive time per analysis stage: every function whose name contains
    calculate_*, generate_plots, get_formatted_results or the analysis
    constructor; a sample counts once per stage on its stack, so nested stages
    overlap (e.g. calculate_observed_power inside calculate_multivariate_tests);
  - top-level stages (a partition): each sample goes to the OUTERMOST
    calculate_*/generate_plots frame on its stack, or to "(no stage: input
    parsing, setup)" when there is none, so the shares add up to 100%.
Function names come from the WASM name section (the GLM packages are built
without wasm-opt, so it is kept).

Usage: python profile-summary.py <trace.json> [--top 25] [--csv out.csv]
"""
import argparse
import csv
import json
import re
from collections import defaultdict

STAGE = re.compile(r"(calculate_[a-z0-9_]+|generate_plots|get_formatted_results|MultivariateAnalysis::new|RepeatedMeasureAnalysis::new|multivariateanalysis_new|repeatedmeasureanalysis_new)")


def short(name: str) -> str:
    name = re.sub(r"::h[0-9a-f]{16}$", "", name)
    name = re.sub(r"^_ZN|17h[0-9a-f]{16}E$", "", name)
    return name or "(anonymous)"


def load(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    return data["traceEvents"] if isinstance(data, dict) else data


def worker_profiles(events):
    names = {(e["pid"], e["tid"]): e["args"]["name"] for e in events if e.get("ph") == "M" and e.get("name") == "thread_name"}
    profiles = defaultdict(lambda: {"nodes": {}, "samples": [], "deltas": [], "thread": None})
    for e in events:
        if e.get("name") not in ("Profile", "ProfileChunk"):
            continue
        key = (e["pid"], e.get("id"))
        prof = profiles[key]
        prof["thread"] = prof["thread"] or names.get((e["pid"], e["tid"]))
        data = e.get("args", {}).get("data", {})
        cp = data.get("cpuProfile", {})
        for node in cp.get("nodes", []) or []:
            prof["nodes"][node["id"]] = {"name": node["callFrame"].get("functionName") or "(anonymous)", "url": node["callFrame"].get("url", ""), "parent": node.get("parent")}
        prof["samples"] += cp.get("samples", []) or []
        prof["deltas"] += data.get("timeDeltas", []) or []
    return {k: v for k, v in profiles.items() if v["thread"] and "Worker" in v["thread"] and v["samples"]}


def summarise(prof, top):
    nodes, samples, deltas = prof["nodes"], prof["samples"], prof["deltas"]
    # Weight of sample i = time to the next sample (µs); the last one gets the median.
    weights = deltas[1:] + [sorted(deltas)[len(deltas) // 2] if deltas else 0]
    self_t, stage_t, top_t = defaultdict(float), defaultdict(float), defaultdict(float)
    total = 0.0
    for sid, w in zip(samples, weights):
        w = max(w, 0) / 1000.0  # ms
        total += w
        node = nodes.get(sid)
        if not node:
            continue
        self_t[short(node["name"])] += w
        seen, cur, outer = set(), node, None
        while cur:
            m = STAGE.search(cur["name"])
            if m and m.group(1) not in seen:
                seen.add(m.group(1))
                stage_t[m.group(1)] += w
            if m and (m.group(1).startswith("calculate_") or m.group(1) == "generate_plots"):
                outer = m.group(1)
            cur = nodes.get(cur["parent"]) if cur["parent"] else None
        top_t[outer or "(no stage: input parsing, setup)"] += w
    return total, self_t, stage_t, top_t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("trace")
    ap.add_argument("--top", type=int, default=25)
    ap.add_argument("--csv")
    a = ap.parse_args()
    profs = worker_profiles(load(a.trace))
    if not profs:
        raise SystemExit("no worker CPU profile found in the trace")
    # The analysis worker is the busiest worker thread.
    prof = max(profs.values(), key=lambda p: len(p["samples"]))
    total, self_t, stage_t, top_t = summarise(prof, a.top)
    special = {k: self_t.get(k, 0.0) for k in ("(garbage collector)", "(program)", "(idle)")}
    print(f"thread: {prof['thread']}; sampled {total:.0f} ms; " + ", ".join(f"{k} {v:.0f} ms" for k, v in special.items()))
    print("\nstage (inclusive)                         ms      % of sampled")
    rows = []
    for k, v in sorted(stage_t.items(), key=lambda kv: -kv[1]):
        print(f"  {k:38} {v:9.1f}  {100 * v / total:6.1f}")
        rows.append({"kind": "stage_inclusive", "name": k, "ms": f"{v:.1f}", "pct": f"{100 * v / total:.1f}"})
    print("\ntop-level stage (partition)               ms      % of sampled")
    for k, v in sorted(top_t.items(), key=lambda kv: -kv[1]):
        print(f"  {k:38} {v:9.1f}  {100 * v / total:6.1f}")
        rows.append({"kind": "stage_top_level", "name": k, "ms": f"{v:.1f}", "pct": f"{100 * v / total:.1f}"})
    print(f"\nself time, top {a.top}")
    for k, v in sorted(self_t.items(), key=lambda kv: -kv[1])[: a.top]:
        print(f"  {v:9.1f} ms {100 * v / total:5.1f}%  {k[:110]}")
        rows.append({"kind": "self", "name": k, "ms": f"{v:.1f}", "pct": f"{100 * v / total:.1f}"})
    if a.csv:
        with open(a.csv, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=["kind", "name", "ms", "pct"])
            w.writeheader()
            w.writerow({"kind": "total_sampled", "name": prof["thread"], "ms": f"{total:.1f}", "pct": "100.0"})
            w.writerows(rows)


if __name__ == "__main__":
    main()
