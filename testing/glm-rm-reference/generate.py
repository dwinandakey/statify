"""Reference datasets for fixing GLM Repeated Measures (Tahap 0).

Writes, for each dataset, a CSV to import into Statify and an SPSS 27 syntax
file with the same data inline (DATA LIST FREE), so the syntax runs without
any file path. Deterministic: Python's random.Random with a fixed seed, values
rounded to integers (like the Gambar 51 dataset). Re-running this script
rewrites identical files.

  (a) within-only, two measures (cemas, stres) x factor waktu (3 levels), n = 16
  (b) mixed: within waktu (4 levels) x between kelompok (3 groups), n = 24
  (c) mixed with EMMeans and homogeneity tests: within sesi (3 levels) x
      between metode (2 groups, different spreads), n = 20

Usage: python generate.py   (from this folder)
"""
import random
from pathlib import Path

HERE = Path(__file__).parent
DATA = HERE / "data"
SPSS = HERE / "spss"


def rows_a():
    rnd = random.Random(20260923)
    rows = []
    for s in range(1, 17):
        base = rnd.gauss(0, 4)
        cemas = [round(30 + base + d + rnd.gauss(0, 2.5)) for d in (0, -3, -5)]
        stres = [round(24 + 0.6 * base + d + rnd.gauss(0, 2.0)) for d in (0, -1, -4)]
        rows.append([s, *cemas, *stres])
    return ["subjek", "cemas1", "cemas2", "cemas3", "stres1", "stres2", "stres3"], rows


def rows_b():
    rnd = random.Random(20260924)
    effect = {1: (0, 2, 4, 6), 2: (0, 1, 1, 2), 3: (0, -1, 0, 1)}  # waktu x kelompok interaction
    rows, s = [], 0
    for g in (1, 2, 3):
        for _ in range(8):
            s += 1
            base = rnd.gauss(0, 5)
            vals = [round(50 + 3 * g + base + e + rnd.gauss(0, 3)) for e in effect[g]]
            rows.append([s, *vals, g])
    return ["subjek", "w1", "w2", "w3", "w4", "kelompok"], rows


def rows_c():
    rnd = random.Random(20260925)
    rows, s = [], 0
    for g, spread, trend in ((1, 2.0, (0, 3, 5)), (2, 4.5, (0, 1, 1))):
        for _ in range(10):
            s += 1
            base = rnd.gauss(0, 3 if g == 1 else 6)
            vals = [round(60 + base + t + rnd.gauss(0, spread)) for t in trend]
            rows.append([s, *vals, g])
    return ["subjek", "p1", "p2", "p3", "metode"], rows


def spss_header(title, cols, rows):
    data = "\n".join(" ".join(str(v) for v in r) for r in rows)
    return (
        f"* {title}.\n"
        "* Dibuat oleh testing/glm-rm-reference/generate.py (data identik dengan CSV di folder data/).\n"
        "* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All.\n"
        "SET DECIMAL=DOT.\n"
        "NEW FILE.\n"
        f"DATA LIST FREE / {' '.join(cols)}.\n"
        f"BEGIN DATA\n{data}\nEND DATA.\n"
    )


SYNTAX = {
    "a": ("Dataset (a) within-only, dua measure x waktu 3 level",
          """DATASET NAME rm_a WINDOW=FRONT.
GLM cemas1 cemas2 cemas3 stres1 stres2 stres3
  /WSFACTOR=waktu 3 Polynomial
  /MEASURE=cemas stres
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=waktu.
"""),
    "b": ("Dataset (b) desain campuran, waktu 4 level x kelompok 3 grup",
          """VALUE LABELS kelompok 1 'K1' 2 'K2' 3 'K3'.
DATASET NAME rm_b WINDOW=FRONT.
GLM w1 w2 w3 w4 BY kelompok
  /WSFACTOR=waktu 4 Polynomial
  /MEASURE=skor
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=waktu
  /DESIGN=kelompok.
"""),
    "c": ("Dataset (c) desain campuran dengan EMMeans dan homogeneity tests, sesi 3 level x metode 2 grup",
          """VALUE LABELS metode 1 'M1' 2 'M2'.
DATASET NAME rm_c WINDOW=FRONT.
GLM p1 p2 p3 BY metode
  /WSFACTOR=sesi 3 Polynomial
  /MEASURE=nilai
  /METHOD=SSTYPE(3)
  /EMMEANS=TABLES(OVERALL)
  /EMMEANS=TABLES(metode) COMPARE ADJ(BONFERRONI)
  /EMMEANS=TABLES(sesi) COMPARE ADJ(BONFERRONI)
  /EMMEANS=TABLES(metode*sesi)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY RSSCP
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=sesi
  /DESIGN=metode.
"""),
}

EXPORT = """
* Opsional: simpan seluruh output ke Excel agar nilai bisa dibaca lengkap.
* Hapus tanda bintang di dua baris berikut dan sesuaikan folder tujuannya.
* OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
*   /XLSX DOCUMENTFILE='C:\\statify-spss\\rm_{k}.xlsx' OPERATION=CREATEFILE.
"""


GAMBAR51 = """DATASET NAME gambar51 WINDOW=FRONT.
GLM perlakuan1 perlakuan2 perlakuan3 perlakuan4
  /WSFACTOR=perlakuan 4 Polynomial
  /MEASURE=anjing
  /METHOD=SSTYPE(3)
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=perlakuan.
"""


def write_gambar51():
    # Gambar 51 dataset (exported from "dataset/repeated measures.sav"): only
    # the syntax is generated here, the CSV is not rewritten.
    lines = (DATA / "gambar51.csv").read_text(encoding="utf-8").strip().splitlines()
    cols = lines[0].split(",")
    rows = [line.split(",") for line in lines[1:]]
    (SPSS / "gambar51.sps").write_text(
        spss_header("Dataset Gambar 51 (repeated measures.sav), perlakuan 4 level, 15 subjek", cols, rows)
        + GAMBAR51 + EXPORT.format(k="gambar51"), encoding="utf-8")


def main():
    DATA.mkdir(exist_ok=True)
    SPSS.mkdir(exist_ok=True)
    write_gambar51()
    for key, make in (("a", rows_a), ("b", rows_b), ("c", rows_c)):
        cols, rows = make()
        (DATA / f"rm_{key}.csv").write_text(
            ",".join(cols) + "\n" + "\n".join(",".join(str(v) for v in r) for r in rows) + "\n", encoding="utf-8")
        title, glm = SYNTAX[key]
        (SPSS / f"rm_{key}.sps").write_text(spss_header(title, cols, rows) + glm + EXPORT.format(k=key), encoding="utf-8")
        print(f"rm_{key}: {len(rows)} subjek, kolom {cols}")


if __name__ == "__main__":
    main()
