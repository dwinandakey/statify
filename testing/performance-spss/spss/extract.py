"""Extracts the SPSS timings and reference statistics from the OMS OXML files.

  <dir>/oms/<cell>-notes.xml -> Elapsed Time and Processor Time of every GLM
                                run, in ms. OXML gives each time twice: the
                                displayed text hh:mm:ss.ss (10 ms steps) and a
                                `duration` attribute rounded to 2 significant
                                digits (pilot: text 00:00:01.11 -> PT0H0M1.1S,
                                text 00:00:00.05 -> PT0H0M0.047S). The finer
                                one is used: `duration` below 100 ms (1 ms
                                steps), the text otherwise. Both are kept.
  <dir>/oms/<cell>-full.xml  -> every pivot table of run 1, flattened to
                                (table, row path, column) -> number; used for
                                the equivalence check (Wilks' Lambda etc.).

Writes <dir>/spss-runs.csv and <dir>/spss-stats.json.
Usage: python extract.py <dir>
"""
import csv
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

NS = "{http://www.ibm.com/software/analytics/spss/xml/oms}"
DUR = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?")


def duration_ms(text: str) -> float:
    m = DUR.fullmatch(text)
    if not m:
        raise ValueError(f"unexpected duration {text!r}")
    h, mi, s = (float(x) if x else 0.0 for x in m.groups())
    return (h * 3600 + mi * 60 + s) * 1000.0


def text_ms(text: str) -> float:
    h, mi, s = text.split(":")
    return (int(h) * 3600 + int(mi) * 60 + float(s)) * 1000.0


def best_ms(cell) -> float:
    d = duration_ms(cell.get("duration"))
    return d if d < 100.0 else text_ms(cell.get("text"))


def notes(path: pathlib.Path):
    """[(run, elapsed_ms, processor_ms, elapsed_text, processor_text, created)]"""
    root = ET.parse(path).getroot()
    out = []
    for i, table in enumerate(root.iter(f"{NS}pivotTable"), start=1):
        if table.get("subType") != "Notes":
            continue
        vals = {}
        for cat in table.iter(f"{NS}category"):
            cell = cat.find(f"{NS}cell")
            if cell is None:
                continue
            vals[cat.get("text")] = cell
        el, pr = vals["Elapsed Time"], vals["Processor Time"]
        out.append({
            "run": len(out) + 1,
            "elapsed_ms": best_ms(el),
            "processor_ms": best_ms(pr),
            "elapsed_duration_ms": duration_ms(el.get("duration")),
            "processor_duration_ms": duration_ms(pr.get("duration")),
            "elapsed_text": el.get("text"),
            "processor_text": pr.get("text"),
            "created": vals["Output Created"].get("date"),
            "rows": vals.get("N of Rows in Working Data File").get("number") if vals.get("N of Rows in Working Data File") is not None else None,
        })
    return out


def flatten(table):
    """{(row path..., column): number} for one pivot table (path = the
    category/group texts from the outermost dimension to the cell)."""
    out = {}

    def walk(el, path):
        for child in el:
            tag = child.tag.replace(NS, "")
            if tag in ("dimension", "group", "category"):
                walk(child, path + ([child.get("text")] if tag != "dimension" else []))
            elif tag == "cell":
                num = child.get("number")
                out[" | ".join(path)] = float(num) if num is not None else child.get("text")
    walk(table, [])
    return out


def full(path: pathlib.Path):
    root = ET.parse(path).getroot()
    tables = {}
    for table in root.iter(f"{NS}pivotTable"):
        name = table.get("text")
        key = name
        k = 2
        while key in tables:
            key = f"{name} #{k}"
            k += 1
        tables[key] = {"subType": table.get("subType"), "cells": flatten(table)}
    return tables


def main():
    d = pathlib.Path(sys.argv[1]).resolve()
    rows, stats = [], {}
    for f in sorted((d / "oms").glob("*-notes.xml")):
        cell = f.name[: -len("-notes.xml")]
        proc, n = cell.split("-n")
        for r in notes(f):
            rows.append({"cell": cell, "proc": proc, "n": int(n), **r, "phase": "warmup" if r["run"] == 1 else "measured"})
        fp = d / "oms" / f"{cell}-full.xml"
        if fp.exists():
            stats[cell] = full(fp)
    with open(d / "spss-runs.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["cell", "proc", "n", "run", "phase", "elapsed_ms", "processor_ms", "elapsed_duration_ms", "processor_duration_ms", "elapsed_text", "processor_text", "created", "rows"])
        w.writeheader()
        w.writerows(rows)
    (d / "spss-stats.json").write_text(json.dumps(stats, indent=1), encoding="utf-8")
    for r in rows:
        print(f"{r['cell']:12} run {r['run']:2} rows={r['rows']} elapsed={r['elapsed_ms']:8.1f} ms ({r['elapsed_text']}) cpu={r['processor_ms']:8.1f} ms")


if __name__ == "__main__":
    main()
