"""Extracts the SPSS 27 output of spss/mv*.sps (OUTPUT EXPORT /XLSX to
spss-output/) into reference values.

    python testing/glm-mv-reference/harness/spss_extract.py

Writes spss-output/spss-values.json: one entry per numeric cell of the tables
Statify also produces (plus the MEANS "Report" of mv1), each with

  config   mv1..mv5 (the syntax file)
  table    SPSS table title (footnote letter removed)
  labels   row labels, filled down from the rows above (SPSS leaves repeated
           labels blank), e.g. ["Intercept", "Pillai's Trace"]
  field    column header, e.g. "Sig."
  value    number at the precision stored in the xlsx
  display  true when SPSS stored the cell as text with a footnote letter
           (e.g. "2.436b"): only the printed decimals are available
  source   "spss: spss-output/<file>.xlsx, <table>"

Also writes spss-output/spss-tables.json (the parsed tables) for the report of
SPSS tables without a Statify counterpart.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "glm-rm-reference", "harness"))
from read_xlsx import read_workbook  # noqa: E402

OUT_DIR = os.path.join(HERE, "..", "spss-output")
FILES = {"mv1": "mv1_satu_populasi.xlsx", "mv2": "mv2_dua_populasi.xlsx", "mv3": "mv3_berpasangan.xlsx",
         "mv4": "mv4_one_way.xlsx", "mv5": "mv5_two_way.xlsx"}
TITLES = ["Report", "Case Processing Summary", "Between-Subjects Factors", "Descriptive Statistics",
          "Box's Test of Equality of Covariance Matrices", "Multivariate Tests",
          "Levene's Test of Equality of Error Variances", "Tests of Between-Subjects Effects"]
SKIP = {"Case Processing Summary"}
NUMBER = re.compile(r"^\s*(-?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*([a-z](?:,[a-z])*)?\s*$")
STOP = re.compile(r"^([a-z]\. |Tests the null|\* |OUTPUT |GLM |MEANS |General Linear Model|Notes$|Means$)")


def title_of(cell):
    text = str(cell).strip()
    for t in TITLES:
        if text == t or re.fullmatch(re.escape(t) + r"[a-z]", text):
            return t
    return None


def number(cell):
    """(value, display) for a numeric cell, None for text."""
    if isinstance(cell, float):
        return cell, False
    if isinstance(cell, str):
        m = NUMBER.match(cell)
        if m:
            return float(m.group(1)), True
    return None


def strip_note(text):
    """Header without a trailing footnote letter ("Observed Powerc")."""
    text = str(text).strip()
    for known in ("Observed Power",):
        if re.fullmatch(re.escape(known) + r"[a-z]", text):
            return known
    return text


def parse(rows):
    tables = []
    i = 0
    while i < len(rows):
        row = rows[i]
        nonempty = [c for c in row if c != ""]
        title = title_of(row[0]) if len(nonempty) == 1 else None
        if not title:
            i += 1
            continue
        i += 1
        body = []
        while i < len(rows):
            r = rows[i]
            ne = [c for c in r if c != ""]
            if not ne or (len(ne) == 1 and title_of(r[0])) or STOP.match(str(r[0])):
                break
            body.append(r)
            i += 1
        if title not in SKIP:
            tables.append((title, body))
    return tables


def cells(title, body):
    """Yields (labels, field, value, display)."""
    if title == "Box's Test of Equality of Covariance Matrices":
        for r in body:
            v = number(r[1])
            if v:
                yield [], str(r[0]).strip(), v[0], v[1]
        return
    # Header rows: until the first row holding a number.
    first_data = next(k for k, r in enumerate(body) if any(number(c) for c in r[1:]))
    header = {}
    for r in body[:first_data]:
        for j, c in enumerate(r):
            if c != "":
                header[j] = strip_note(c)
    if title == "Report":  # MEANS: rows = statistic, columns = variables
        for r in body[first_data:]:
            for j, c in enumerate(r[1:], start=1):
                v = number(c)
                if v:
                    yield [header[j]], str(r[0]).strip(), v[0], v[1]
        return
    data_cols = sorted(j for j, h in header.items() if h and j > 0 and any(
        number(r[j]) for r in body[first_data:] if j < len(r)))
    # Label columns: before the first data column (Between-Subjects Factors:
    # factor, level code; "Value Label" is text and kept as a label).
    first_col = data_cols[0] if data_cols else len(header)
    if title == "Between-Subjects Factors":
        first_col = max(j for j, h in header.items() if h == "N")
    carry = []
    for r in body[first_data:]:
        labels = []
        for j in range(first_col):
            c = r[j] if j < len(r) else ""
            if c == "" and j < len(carry):
                c = carry[j]
            labels.append(str(c).strip() if not isinstance(c, float) else f"{c:g}")
        # A new label in column j resets the carried labels right of it.
        for j in range(first_col):
            if j < len(r) and r[j] != "":
                labels[j + 1:] = [str(x).strip() if not isinstance(x, float) else f"{x:g}" for x in r[j + 1:first_col]]
                break
        carry = labels
        for j in range(first_col, len(r)):
            if j not in header:
                continue
            v = number(r[j])
            if v:
                yield [x for x in labels if x != ""], header[j], v[0], v[1]


def main():
    values, all_tables = [], []
    for config, file in FILES.items():
        book = read_workbook(os.path.join(OUT_DIR, file))
        rows = [r for sheet in book.values() for r in sheet]
        for title, body in parse(rows):
            all_tables.append({"config": config, "table": title, "rows": len(body)})
            for labels, field, value, display in cells(title, body):
                values.append({"config": config, "table": title, "labels": labels, "field": field, "value": value,
                               "display": display, "source": f"spss: spss-output/{file}, {title}"})
    with open(os.path.join(OUT_DIR, "spss-values.json"), "w", encoding="utf8") as f:
        json.dump(values, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT_DIR, "spss-tables.json"), "w", encoding="utf8") as f:
        json.dump(all_tables, f, ensure_ascii=False, indent=1)
    by = {}
    for v in values:
        by.setdefault((v["config"], v["table"]), 0)
        by[(v["config"], v["table"])] += 1
    for k, n in by.items():
        print(k[0], k[1], n)
    print("total", len(values))


if __name__ == "__main__":
    main()
