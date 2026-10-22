"""Writes the SPSS 27 syntax (.sps) and production job (.spj) of every cell.

One cell = procedure x size. Per cell:
  GET DATA (the CSV in ../data) -> CACHE + EXECUTE (the file is read here, so
  the first GLM does not include reading the CSV; Statify's import is not
  timed either) -> the same GLM repeated RUNS times (run 1 = warm-up).

OMS writes, in OXML:
  <cell>-notes.xml  the Notes table of every GLM run (Elapsed/Processor Time)
  <cell>-full.xml   every GLM table of run 1 only (equivalence check);
                    OMSEND for it right after run 1, so runs 2..RUNS carry
                    the same single OMS request.

Usage: python make_jobs.py <outDir> [sizes, default 100,1000,10000,100000] [runs, default 11] [dataDir, default ../data]
Factor columns are read as numeric (F1.0) when the CSV holds numeric codes
(data/generate.cjs --codes=numeric), otherwise as strings (A2).
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
DATA = HERE.parent / "data"
FACTORS = {"A", "B", "group"}
PRINT = "/PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY"

PROCS = {
    "mv1": {
        "vars": "Y1 F12.6 Y2 F12.6 Y3 F12.6 Y4 F12.6 A A2",
        "glm": f"GLM Y1 Y2 Y3 Y4 BY A\n  /METHOD=SSTYPE(3)\n  /INTERCEPT=INCLUDE\n  {PRINT}\n  /CRITERIA=ALPHA(.05)\n  /DESIGN=A.",
    },
    "mv2": {
        "vars": "Y1 F12.6 Y2 F12.6 Y3 F12.6 Y4 F12.6 A A2 B A2",
        "glm": f"GLM Y1 Y2 Y3 Y4 BY A B\n  /METHOD=SSTYPE(3)\n  /INTERCEPT=INCLUDE\n  {PRINT}\n  /CRITERIA=ALPHA(.05)\n  /DESIGN=A B A*B.",
    },
    "rm": {
        "vars": "t1 F12.6 t2 F12.6 t3 F12.6 t4 F12.6 group A2",
        "glm": f"GLM t1 t2 t3 t4 BY group\n  /WSFACTOR=time 4 Polynomial\n  /MEASURE=score\n  /METHOD=SSTYPE(3)\n  {PRINT}\n  /CRITERIA=ALPHA(.05)\n  /WSDESIGN=time\n  /DESIGN=group.",
    },
}


def win(p: pathlib.Path) -> str:
    return str(p.resolve()).replace("/", "\\")


def variables(spec: str, csv: pathlib.Path) -> str:
    """Factor format from the first data row: numeric codes -> F1.0."""
    with open(csv, encoding="utf-8") as fh:
        header = fh.readline().strip().split(",")
        first = dict(zip(header, fh.readline().strip().split(",")))
    toks = spec.split()
    out = []
    for name, fmt in zip(toks[::2], toks[1::2]):
        if name in FACTORS and first[name].replace(".", "", 1).isdigit():
            fmt = "F1.0"
        out += [name, fmt]
    return " ".join(out)


def syntax(proc: str, n: int, out: pathlib.Path, runs: int, data: pathlib.Path) -> str:
    cell = f"{proc}-n{n}"
    p = PROCS[proc]
    csv = data / (cell + ".csv")
    lines = [
        "* Encoding: UTF-8.",
        f"* Uji performa Statify vs SPSS: {cell}, {runs} run GLM (run 1 = pemanasan).",
        "* Dibuat oleh testing/performance-spss/spss/make_jobs.py.",
        "SET DECIMAL=DOT.",
        f"OMS /SELECT TABLES /IF COMMANDS=['GLM'] SUBTYPES=['Notes']\n  /DESTINATION FORMAT=OXML OUTFILE='{win(out / (cell + '-notes.xml'))}'\n  /TAG='notes'.",
        f"OMS /SELECT TABLES /IF COMMANDS=['GLM']\n  /DESTINATION FORMAT=OXML OUTFILE='{win(out / (cell + '-full.xml'))}'\n  /TAG='full'.",
        f"GET DATA /TYPE=TXT /FILE='{win(DATA / (cell + '.csv'))}' /ENCODING='UTF8'\n  /DELCASE=LINE /DELIMITERS=\",\" /ARRANGEMENT=DELIMITED /FIRSTCASE=2\n  /VARIABLES={p['vars']}.",
        "CACHE.",
        "EXECUTE.",
    ]
    for r in range(1, runs + 1):
        lines.append(f"* Run {r}{' (pemanasan)' if r == 1 else ''}.")
        lines.append(p["glm"])
        if r == 1:
            lines.append("OMSEND TAG=['full'].")
    lines.append("OMSEND.")
    return "\n".join(lines) + "\n"


def job(sps: pathlib.Path, viewer: pathlib.Path) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<job xmlns="http://www.ibm.com/software/analytics/spss/xml/production" codepageSyntaxFiles="false" '
        'print="false" syntaxErrorHandling="stop" syntaxFormat="interactive" unicode="true">\n'
        f'  <output outputFormat="text-utf8" outputPath="{win(viewer)}"/>\n'
        f'  <syntax syntaxPath="{win(sps)}"/>\n'
        "</job>\n"
    )


def main():
    out = pathlib.Path(sys.argv[1]).resolve()
    sizes = [int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else "100,1000,10000,100000").split(",")]
    runs = int(sys.argv[3]) if len(sys.argv) > 3 else 11
    data = pathlib.Path(sys.argv[4]).resolve() if len(sys.argv) > 4 else DATA
    (out / "jobs").mkdir(parents=True, exist_ok=True)
    (out / "oms").mkdir(parents=True, exist_ok=True)
    cells = []
    for n in sizes:
        for proc in PROCS:
            cell = f"{proc}-n{n}"
            sps = out / "jobs" / f"{cell}.sps"
            spj = out / "jobs" / f"{cell}.spj"
            sps.write_text(syntax(proc, n, out / "oms", runs, data), encoding="utf-8")
            spj.write_text(job(sps, out / "oms" / f"{cell}-viewer.txt"), encoding="utf-8")
            cells.append({"cell": cell, "proc": proc, "n": n, "runs": runs, "spj": str(spj)})
    (out / "jobs" / "cells.json").write_text(json.dumps(cells, indent=2) + "\n", encoding="utf-8")
    print(f"{len(cells)} cells -> {out}")


if __name__ == "__main__":
    main()
