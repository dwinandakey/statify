"""Ekstrak keluaran SPSS 27 dari sintaks di testing/SPSS-TODO.md (Bagian 2)
ke testing/final/bagian2/spss-values-bagian2.json, memakai parse/cells dari
testing/glm-mv-reference/harness/spss_extract.py (berkas spss-values.json
acuan regresi tidak disentuh).

    python testing/final/harness/spss_bagian2.py
"""
import json
import os
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(REPO, "testing", "glm-mv-reference", "harness"))
import spss_extract as sx  # noqa: E402

FILES = {
    "mv9": "testing/glm-mv-reference/spss-output/mv9_tiga_dv_empat_level.xlsx",
    "mv6-typeI-II": "testing/glm-mv-reference/spss-output/mv6_type_i_ii.xlsx",
    "mv2-delta0": "testing/fitur-v4/spss-output/mv2_delta0.xlsx",
    "mv3-delta0": "testing/fitur-v4/spss-output/mv3_delta0.xlsx",
}
values = []
for config, rel in FILES.items():
    book = sx.read_workbook(os.path.join(REPO, rel))
    rows = [r for sheet in book.values() for r in sheet]
    # Tabel dengan judul yang sama (mis. dua GLM dalam satu berkas) diberi urutan.
    seen = {}
    for title, body in sx.parse(rows):
        seen[title] = seen.get(title, 0) + 1
        for labels, field, value, display in sx.cells(title, body):
            values.append({"config": config, "table": title, "occurrence": seen[title], "labels": labels, "field": field,
                           "value": value, "display": display, "source": f"spss: {rel}, {title} #{seen[title]}"})
out = os.path.join(REPO, "testing", "final", "bagian2", "spss-values-bagian2.json")
with open(out, "w", encoding="utf8") as f:
    json.dump(values, f, ensure_ascii=False, indent=1)
by = {}
for v in values:
    k = (v["config"], v["table"], v["occurrence"])
    by[k] = by.get(k, 0) + 1
for k, n in by.items():
    print(*k, n)
print("total", len(values))
