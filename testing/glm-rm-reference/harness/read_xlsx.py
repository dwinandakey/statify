"""Reads an .xlsx workbook with the Python standard library only (zipfile +
ElementTree), for the SPSS 27 OUTPUT EXPORT files in spss-output/.

    python read_xlsx.py <file.xlsx> [--json out.json]

Prints every sheet as tab-separated rows (numbers at full stored precision).
With --json, writes {sheet: [[cell, ...], ...]} for other scripts.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def col_index(ref):
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_workbook(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = {r.get("Id"): r.get("Target") for r in rels.iter(f"{REL}Relationship")}
    out = {}
    for sheet in wb.find("m:sheets", NS):
        rid = sheet.get(f"{{{NS['r']}}}id")
        file = "xl/" + target[rid].lstrip("/").replace("xl/", "")
        root = ET.fromstring(z.read(file))
        rows = []
        for row in root.iter(f"{{{NS['m']}}}row"):
            cells = {}
            for c in row.findall("m:c", NS):
                t = c.get("t")
                v = c.find("m:v", NS)
                if t == "s" and v is not None:
                    val = shared[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter(f"{{{NS['m']}}}t"))
                elif v is not None:
                    try:
                        val = float(v.text)
                    except ValueError:
                        val = v.text
                else:
                    continue
                cells[col_index(c.get("r"))] = val
            if cells:
                width = max(cells) + 1
                rows.append([cells.get(i, "") for i in range(width)])
        out[sheet.get("name")] = rows
    return out


if __name__ == "__main__":
    book = read_workbook(sys.argv[1])
    if "--json" in sys.argv:
        with open(sys.argv[sys.argv.index("--json") + 1], "w", encoding="utf8") as f:
            json.dump(book, f, ensure_ascii=False, indent=0)
    else:
        for name, rows in book.items():
            print(f"=== sheet: {name} ({len(rows)} rows)")
            for r in rows:
                print("\t".join(repr(x) if isinstance(x, float) else str(x) for x in r))
