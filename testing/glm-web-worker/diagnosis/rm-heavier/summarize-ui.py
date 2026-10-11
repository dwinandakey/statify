"""Median per size × mode of a pilot-ui JSON (Bagian B). Usage: python summarize-ui.py <pilot-ui-*.json>"""
import json
import statistics
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
data = json.load(open(sys.argv[1], encoding="utf-8"))
groups = defaultdict(list)
for r in data["results"]:
    groups[(r["n"], r["mode"])].append(r)
print("| n subjek | Mode | Run | Komputasi (ms) median [min–maks] | Klik→selesai (ms) median | Long task terpanjang (ms) median | LoAF terpanjang (ms) median | Tabel | Error tercatat |")
print("|---|---|---|---|---|---|---|---|---|")
for (n, mode), rs in sorted(groups.items()):
    ok = [r for r in rs if "computeMs" in r]
    if not ok:
        print(f"| {n} | {mode} | {len(rs)} | gagal: {rs[0].get('error', '')[:60]} | — | — | — | — | {rs[0].get('pageErrors', [''])[0][:60]} |")
        continue
    c = [r["computeMs"] for r in ok]
    med = lambda k: statistics.median(r[k] for r in ok)
    tables = sorted({len(r["tables"]) for r in ok})
    errs = sorted({json.dumps(r["loggedErrors"]) for r in ok})
    print(f"| {n} | {'A' if mode == 'main' else 'B'} ({mode}) | {len(ok)} | {statistics.median(c):.0f} [{min(c)}–{max(c)}] | {med('clickToEndMs'):.0f} | "
          f"{med('longestLongtaskMs'):.0f} | {med('longestLoafMs'):.0f} | {', '.join(map(str, tables))} | {', '.join(errs)} |")
print()
print("Output identik antar-run/antar-mode per ukuran:", json.dumps(data["env"].get("identical")))
if "emmeansDialog" in data["env"]:
    print("Dialog EM Means:", json.dumps(data["env"]["emmeansDialog"]))
print("Per run (urutan):")
for r in data["results"]:
    print(f"  n={r['n']} {r['mode']}: compute={r.get('computeMs')} LT={r.get('longestLongtaskMs')} LoAF={r.get('longestLoafMs')} pre={json.dumps(r.get('pre') or r.get('stored'))} {r.get('error', '')[:80]}")
