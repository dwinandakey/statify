"""Pembanding black-box iterasi 7 resmi (build gabungan ilham).

Untuk setiap skenario, pengamatan iterasi 7 dipisah menjadi TEKS dan NILAI:
  - teks: status, langkah, toast, checks, judul/kolom/catatan kaki tabel, dan
    sel tabel yang bukan angka; dibandingkan dengan pengamatan teks terbaru di
    ilham (iterasi 3, ditimpa iterasi 4, 5, lalu 6);
  - nilai: setiap sel tabel yang berupa angka (termasuk "<.001");
    dibandingkan dengan uji awal v6 (iterasi-7-uji-awal-v6, branch
    fix-epsilon-v6, kode perhitungan sama).
Tabel dicocokkan berurutan (bukan per judul, lihat catatan bb-diff-iter.mjs
di laporan-v6.md §5).

Pemakaian (akar repositori):
  python testing/whitebox/v6/harness/bb-banding-final.py <iterasi baru> <keluaran.txt> <keluaran.json>
"""
import json
import os
import re
import sys

HE = "testing/black-box/hasil-eksekusi"
NUM = re.compile(r"^\s*(<\s*\.\d+|[-+−]?\d[\d,]*(\.\d+)?([eE][-+]?\d+)?|[-+−]?\.\d+)\s*$")


def load(d, i):
    p = os.path.join(HE, d, f"{i}.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None


def tables(o):
    out = []
    for ri, r in enumerate(o.get("runs", []) or []):
        for s in r.get("output") or []:
            for t in s["tables"]:
                out.append((ri, t))
    return out


def split(t):
    """(teks, nilai) sebuah tabel."""
    text = {"title": t.get("title"), "columns": t.get("columns"), "footnote": t.get("footnote"), "cells": []}
    vals = []
    for ri, row in enumerate(t.get("rows") or []):
        for k, v in row.items():
            if isinstance(v, (int, float)) or (isinstance(v, str) and NUM.match(v)):
                vals.append((ri, k, v))
            else:
                text["cells"].append((ri, k, v))
    return text, vals


def main():
    new_dir, out_txt, out_json = sys.argv[1:4]
    ids = sorted(f[:-5] for f in os.listdir(os.path.join(HE, new_dir)) if f.startswith("BB-") and f.endswith(".json"))
    lines, rep = [], {}
    n_text_same = n_val_same = 0
    for i in ids:
        new = load(new_dir, i)
        base_src = next(d for d in ("iterasi-6", "iterasi-5", "iterasi-4", "iterasi-3") if load(d, i))
        base = load(base_src, i)
        v6 = load("iterasi-7-uji-awal-v6", i)
        tdiff = []
        for k in ("status", "steps", "checks"):
            if json.dumps(base.get(k), sort_keys=True, ensure_ascii=False) != json.dumps(new.get(k), sort_keys=True, ensure_ascii=False):
                tdiff.append((k, base.get(k), new.get(k)))
        tb = [x["texts"] for x in base.get("toasts", [])]
        tn = [x["texts"] for x in new.get("toasts", [])]
        if tb != tn:
            tdiff.append(("toast", tb, tn))
        TB, TN, TV = tables(base), tables(new), tables(v6)
        if len(TB) != len(TN):
            tdiff.append(("jumlah tabel", len(TB), len(TN)))
        for (ra, a), (rb, b) in zip(TB, TN):
            xa, _ = split(a)
            xb, _ = split(b)
            for k in ("title", "columns", "footnote"):
                if xa[k] != xb[k]:
                    tdiff.append((f"tabel '{b.get('title')}' {k}", xa[k], xb[k]))
            ca, cb = dict(((r, c), v) for r, c, v in xa["cells"]), dict(((r, c), v) for r, c, v in xb["cells"])
            for key in sorted(set(ca) | set(cb), key=str):
                if ca.get(key) != cb.get(key):
                    tdiff.append((f"tabel '{b.get('title')}' sel {key}", ca.get(key), cb.get(key)))
        vdiff = []
        if len(TV) != len(TN):
            vdiff.append(("jumlah tabel", len(TV), len(TN)))
        n_vals = 0
        for (ra, a), (rb, b) in zip(TV, TN):
            _, va = split(a)
            _, vb = split(b)
            n_vals += len(vb)
            da, db = {(r, c): v for r, c, v in va}, {(r, c): v for r, c, v in vb}
            for key in sorted(set(da) | set(db), key=str):
                if da.get(key) != db.get(key):
                    vdiff.append((f"tabel '{b.get('title')}' sel {key}", da.get(key), db.get(key)))
        n_text_same += not tdiff
        n_val_same += not vdiff
        rep[i] = {"pembanding_teks": base_src, "beda_teks": tdiff, "beda_nilai": vdiff, "nilai_dibandingkan": n_vals}
        lines.append(f"## {i}: teks vs {base_src}: {'identik' if not tdiff else f'{len(tdiff)} beda'}; "
                     f"nilai vs uji awal v6: {'identik' if not vdiff else f'{len(vdiff)} beda'} ({n_vals} nilai)")
        for k, a, b in tdiff:
            lines.append(f"  - [teks] {k}:\n      lama {json.dumps(a, ensure_ascii=False)[:500]}\n      baru {json.dumps(b, ensure_ascii=False)[:500]}")
        for k, a, b in vdiff:
            lines.append(f"  - [nilai] {k}: v6 {a} | build ini {b}")
    head = [f"Black-box {new_dir} (build gabungan ilham)",
            f"skenario: {len(ids)}; teks identik dengan pengamatan terbaru ilham (iterasi 3/4/5/6): {n_text_same}; "
            f"nilai identik dengan uji awal v6: {n_val_same}", ""]
    open(out_txt, "w", encoding="utf-8").write("\n".join(head + lines) + "\n")
    json.dump(rep, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n".join(head))


if __name__ == "__main__":
    main()
