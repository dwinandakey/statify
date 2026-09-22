"""Extracts the SPSS 27 output of spss/*.sps (exported with OUTPUT EXPORT /XLSX
to spss-output/) into machine-readable reference values.

    python spss_extract.py            (from testing/glm-rm-reference/harness)

Writes
  spss-output/spss-tables.json  every pivot table per dataset (title, EM Means
                                section, measure, row labels, values by column)
  spss-output/spss-values.json  the values of the validated tables, keyed like
                                the "spss" slots of the Jest fixture (dataset,
                                table, measure, source, correction, field), each
                                with the file and table it was read from.

An export file may hold the output of several syntax files (OUTPUT EXPORT
writes the whole Viewer document), so tables are assigned to datasets by the
"[dataset]" line SPSS prints before each GLM output. When a dataset occurs in
several files, the copies must be identical and the one from its own file is
used. Numbers keep the full stored precision; cells SPSS prints with a
footnote letter (e.g. "26.223b") are stored as text by SPSS and keep only the
three displayed decimals.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from read_xlsx import read_workbook  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "spss-output")
FILES = ["rm_gambar51.xlsx", "rm_a.xlsx", "rm_b.xlsx", "rm_c.xlsx", "rm_d.xlsx", "rm_e.xlsx"]
DATASET = {"gambar51": "gambar51", "rm_a": "a", "rm_b": "b", "rm_c": "c", "rm_d": "d", "rm_e": "e"}
OWN_FILE = {"gambar51": "rm_gambar51.xlsx", "a": "rm_a.xlsx", "b": "rm_b.xlsx", "c": "rm_c.xlsx", "d": "rm_d.xlsx", "e": "rm_e.xlsx"}

TITLES = [
    "Within-Subjects Factors", "Between-Subjects Factors", "Descriptive Statistics",
    "Box's Test of Equality of Covariance Matrices", "Bartlett's Test of Sphericity",
    "Multivariate Tests", "Mauchly's Test of Sphericity", "Tests of Within-Subjects Effects",
    "Multivariate", "Univariate Tests", "Tests of Within-Subjects Contrasts",
    "Levene's Test of Equality of Error Variances", "Tests of Between-Subjects Effects",
    "Residual SSCP Matrix", "Estimates", "Pairwise Comparisons",
]
FIELDS = [
    "Value", "F", "Hypothesis df", "Error df", "Sig.", "Partial Eta Squared", "Noncent. Parameter",
    "Observed Power", "Type III Sum of Squares", "Sum of Squares", "df", "Mean Square", "Mauchly's W",
    "Approx. Chi-Square", "Epsilon", "Greenhouse-Geisser", "Huynh-Feldt", "Lower-bound",
    "Levene Statistic", "df1", "df2", "Mean", "Std. Deviation", "N", "Std. Error",
    "95% Confidence Interval", "95% Confidence Interval for Difference", "Lower Bound", "Upper Bound",
    "Mean Difference (I-J)", "Value Label", "Dependent Variable",
]
FOOTNOTE = re.compile(r"^(.*?)([a-z](?:,[a-z])*)$")
NUMBER = re.compile(r"^\s*(-?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*([a-z*]*)\s*$")
STOP = re.compile(r"^([a-z*]\. |Tests the null|Based on |The F tests|Each F tests|Computed using|\* |OUTPUT |GLM |DATASET |SET |NEW FILE|DATA LIST|BEGIN DATA|END DATA)")


def known(text, names):
    """Name without a trailing footnote marker when it is one of `names`."""
    text = text.strip()
    if text in names:
        return text
    m = FOOTNOTE.match(text)
    if m and m.group(1).strip() in names:
        return m.group(1).strip()
    return None


def number(cell):
    if isinstance(cell, float):
        return cell
    if isinstance(cell, str):
        m = NUMBER.match(cell)
        if m:
            return float(m.group(1))
    return None


def nonempty(row):
    return [c for c in row if c != ""]


def parse_tables(rows):
    """Yields (dataset, table dict) for every pivot table in a sheet."""
    dataset, section, target = None, "main", None
    i = 0
    while i < len(rows):
        row = rows[i]
        first = str(row[0]).strip() if row else ""
        m = re.match(r"^\[(\w+)\]$", first)
        if m and len(nonempty(row)) == 1:
            dataset, section, target = DATASET.get(m.group(1)), "main", None
            i += 1
            continue
        if dataset is None:
            i += 1
            continue
        if first == "Estimated Marginal Means" and len(nonempty(row)) == 1:
            section = "emmeans"
            i += 1
            continue
        title = known(first, TITLES) if len(nonempty(row)) == 1 else None
        implicit = False
        m = re.match(r"^\d+\. (.+)$", first)
        if section == "emmeans" and m and len(nonempty(row)) == 1:
            target = m.group(1).strip()
            nxt = rows[i + 1] if i + 1 < len(rows) else []
            if nxt and known(str(nxt[0]), TITLES):
                i += 1
                continue
            title, implicit = "Estimates", True
        if not title:
            i += 1
            continue
        table = {"title": title, "section": section, "target": target if section == "emmeans" else None,
                 "measure": None, "transformed": None, "rows": []}
        i += 1
        # Preamble lines ("Measure: <m>", "Transformed Variable: Average").
        while i < len(rows) and str(rows[i][0]).strip() in ("Measure:", "Transformed Variable:"):
            key = "measure" if str(rows[i][0]).strip() == "Measure:" else "transformed"
            table[key] = str(nonempty(rows[i])[1]).strip() if len(nonempty(rows[i])) > 1 else None
            i += 1
        if title in ("Box's Test of Equality of Covariance Matrices", "Bartlett's Test of Sphericity"):
            while i < len(rows) and len(nonempty(rows[i])) == 2 and not STOP.match(str(rows[i][0])):
                table["rows"].append({"labels": [str(rows[i][0]).strip()], "values": {"Value": number(rows[i][1])}})
                i += 1
            yield dataset, table
            continue
        # A title directly followed by another title is a group heading
        # (e.g. "Tests of Within-Subjects Effects" over "Multivariate" and
        # "Univariate Tests" for two measures).
        if i < len(rows) and len(nonempty(rows[i])) == 1 and known(str(rows[i][0]), TITLES):
            continue
        # Header rows: the first one after the title, then continuation rows
        # (first cell empty, only non-numeric text).
        header = [str(c) for c in rows[i]] if i < len(rows) else []
        i += 1
        while i < len(rows) and str(rows[i][0]) == "" and nonempty(rows[i]) and all(number(c) is None for c in nonempty(rows[i])) \
                and all(known(str(c), FIELDS) for c in nonempty(rows[i])):
            for j, c in enumerate(rows[i]):
                if c != "":
                    while len(header) <= j:
                        header.append("")
                    header[j] = str(c)
            i += 1
        if title == "Residual SSCP Matrix":
            cols = {j: h.strip() for j, h in enumerate(header) if h.strip()}
        else:
            cols = {j: known(h, FIELDS) for j, h in enumerate(header) if known(h, FIELDS)}
        if not cols:
            continue
        nlab = min(cols)
        carry = [""] * nlab
        while i < len(rows):
            r = rows[i]
            head = str(r[0]).strip() if r else ""
            if not nonempty(r) or STOP.match(head) or (len(nonempty(r)) == 1 and (known(head, TITLES) or re.match(r"^\d+\. ", head) or re.match(r"^\[\w+\]$", head) or head == "Estimated Marginal Means")):
                break
            labels = []
            for j in range(nlab):
                cell = str(r[j]).strip() if j < len(r) else ""
                if cell == "":
                    cell = carry[j]
                else:
                    carry[j] = cell
                    for k in range(j + 1, nlab):
                        carry[k] = ""
                labels.append(cell)
            values = {}
            for j, f in cols.items():
                cell = r[j] if j < len(r) else ""
                values[f] = number(cell) if f != "Value Label" else (str(cell).strip() or None)
            table["rows"].append({"labels": labels, "values": values})
            i += 1
        yield dataset, table
        _ = implicit


def load():
    per_file = {}
    for f in FILES:
        path = os.path.join(OUT_DIR, f)
        if not os.path.exists(path):
            continue
        book = read_workbook(path)
        for sheet in book.values():
            for ds, table in parse_tables(sheet):
                per_file.setdefault(ds, {}).setdefault(f, []).append(table)
    tables, notes = {}, []
    for ds, files in per_file.items():
        own = OWN_FILE[ds]
        chosen = files.get(own) or next(iter(files.values()))
        for f, t in files.items():
            if f != own and own in files:
                same = json.dumps(t, sort_keys=True) == json.dumps(files[own], sort_keys=True)
                notes.append(f"{ds}: copy in {f} {'identical to' if same else 'DIFFERS FROM'} {own}")
        tables[ds] = {"file": own if own in files else next(iter(files)), "tables": chosen}
    return tables, notes


def level_values(tables):
    """Value label -> value ("M1" -> "1") from the Between-Subjects Factors table."""
    out = {}
    for t in tables:
        if t["title"] == "Between-Subjects Factors":
            for r in t["rows"]:
                value = r["labels"][1]
                label = r["values"].get("Value Label") or value
                out[label] = str(int(float(value))) if number(value) is not None and float(value).is_integer() else value
    return out


SS = {"Type III Sum of Squares": "SS"}


def slot_values(ds, file, tables):
    vals = []
    levels = level_values(tables)
    lv = lambda s: levels.get(s, s)  # noqa: E731
    dvs = {}
    for t in tables:
        if t["title"] == "Within-Subjects Factors":
            # rows: [Measure?, level] -> Dependent Variable (text, not parsed as number)
            pass

    def add(table, measure, source, field, value, title, correction=None):
        e = {"dataset": ds, "table": table, "measure": measure, "source": source}
        if correction is not None:
            e["correction"] = correction
        e.update({"field": field, "value": value, "spss_source": f"SPSS 27, spss-output/{file}: {title}"})
        vals.append(e)

    for t in tables:
        title, main = t["title"], t["section"] == "main"
        if main and title == "Mauchly's Test of Sphericity":
            for r in t["rows"]:
                effect = r["labels"][0]
                measure = r["labels"][1] if len(r["labels"]) > 1 else t["measure"]
                for f, v in r["values"].items():
                    if f != "Epsilon":
                        add("mauchly", measure, effect, f, v, title)
        elif main and (title == "Tests of Within-Subjects Effects" or title == "Univariate Tests") and t["rows"]:
            for r in t["rows"]:
                if len(r["labels"]) == 3:
                    source, measure, corr = r["labels"]
                else:
                    (source, corr), measure = r["labels"], t["measure"]
                for f, v in r["values"].items():
                    if v is not None:
                        add("within_effects", measure, source, SS.get(f, f), v, title, corr)
        elif main and title == "Tests of Between-Subjects Effects":
            for r in t["rows"]:
                source = r["labels"][0]
                measure = r["labels"][1] if len(r["labels"]) > 1 else t["measure"]
                for f, v in r["values"].items():
                    if v is not None:
                        add("between_effects", measure, source, SS.get(f, f), v, title)
        elif main and title == "Tests of Within-Subjects Contrasts":
            for r in t["rows"]:
                if t["measure"]:
                    # One measure: Source, then one contrast column per
                    # within-subjects factor ("Linear | Linear" for two).
                    source, measure = r["labels"][0], t["measure"]
                    contrast = " | ".join(x for x in r["labels"][1:] if x)
                else:
                    source, measure, contrast = r["labels"]
                for f, v in r["values"].items():
                    if v is not None:
                        add("within_contrasts", measure, f"{source} | {contrast}", SS.get(f, f), v, title)
        elif main and title == "Multivariate":
            for r in t["rows"]:
                effect, stat = r["labels"][-2], r["labels"][-1]
                for f, v in r["values"].items():
                    add("within_multivariate", "", f"{effect} | {stat}", f, v, "Tests of Within-Subjects Effects: Multivariate")
        elif main and title == "Bartlett's Test of Sphericity":
            for r in t["rows"]:
                add("bartlett", "", "Bartlett", r["labels"][0], r["values"]["Value"], title)
        elif main and title == "Descriptive Statistics":
            for r in t["rows"]:
                dv = r["labels"][0]
                group = lv(r["labels"][1]) if len(r["labels"]) > 1 else ""
                for f, v in r["values"].items():
                    add("descriptives", dv, group, f, v, title)
        elif main and title == "Residual SSCP Matrix":
            for r in t["rows"]:
                kind, row = r["labels"]
                for col, v in r["values"].items():
                    add("residual_sscp", kind, f"{row} | {col}", "value", v, title)
        elif main and title == "Multivariate Tests":
            for r in t["rows"]:
                effect, stat = r["labels"][-2], r["labels"][-1]
                for f, v in r["values"].items():
                    add("multivariate", "", f"{effect} | {stat}", f, v, title)
        elif main and title == "Box's Test of Equality of Covariance Matrices":
            for r in t["rows"]:
                add("box_m", "", "Box's M", r["labels"][0], r["values"]["Value"], title)
        elif main and title == "Levene's Test of Equality of Error Variances":
            for r in t["rows"]:
                dv, basis = r["labels"]
                index = re.search(r"(\d+)$", dv).group(1)
                for f, v in r["values"].items():
                    add("levene", f"nilai|{index}", basis, f, v, title)
        elif t["section"] == "emmeans" and title == "Estimates":
            target = t["target"]
            for r in t["rows"]:
                if target == "Grand Mean":
                    source = "(OVERALL) | (OVERALL)"
                else:
                    source = f"{target} | {' · '.join(lv(x) for x in r['labels'])}"
                for f, v in r["values"].items():
                    if f in ("Mean", "Std. Error", "Lower Bound", "Upper Bound"):
                        add("emmeans", t["measure"], source, f, v, f"Estimated Marginal Means {target}")
        elif t["section"] == "emmeans" and title == "Pairwise Comparisons":
            for r in t["rows"]:
                i, j = (lv(x) for x in r["labels"])
                for f, v in r["values"].items():
                    add("emmeans_pairwise", t["measure"], f"{t['target']} | {i} - {j}",
                        "Mean Difference" if f == "Mean Difference (I-J)" else f, v, f"Pairwise Comparisons {t['target']}")
    return vals


def main():
    tables, notes = load()
    with open(os.path.join(OUT_DIR, "spss-tables.json"), "w", encoding="utf8") as f:
        json.dump(tables, f, ensure_ascii=False, indent=1)
    values = []
    for ds, x in tables.items():
        values += slot_values(ds, x["file"], x["tables"])
    with open(os.path.join(OUT_DIR, "spss-values.json"), "w", encoding="utf8") as f:
        json.dump(values, f, ensure_ascii=False, indent=1)
    for n in notes:
        print(n)
    for ds, x in tables.items():
        print(f"{ds} ({x['file']}): {len(x['tables'])} tables: " + "; ".join(
            f"{t['title']}{'[' + t['target'] + ']' if t['target'] else ''}({len(t['rows'])})" for t in x["tables"]))
    print(f"{len(values)} slot values -> spss-output/spss-values.json")


if __name__ == "__main__":
    main()
