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
  (d) the data of (b) with /WSFACTOR=waktu 4 Repeated (Repeated contrasts);
      no CSV of its own, Statify uses data/rm_b.csv
  (e) two within-subjects factors, no between factor: kondisi (2) x
      waktu (3), one measure skor, n = 15

Usage (from this folder):
  python generate.py d e             write the given datasets
  python generate.py gambar51 a b c d e
A syntax file that already exists with other content (e.g. edited in SPSS
with the user's export folder) is NOT overwritten unless --force is given.
"""
import random
import sys
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


def rows_e():
    # kondisi x waktu with main effects, an interaction, a subject effect and
    # independent noise per cell.
    rnd = random.Random(20260926)
    effect = {(1, 1): 0, (1, 2): 2, (1, 3): 4, (2, 1): 1, (2, 2): 5, (2, 3): 9}
    rows = []
    for s in range(1, 16):
        base = rnd.gauss(0, 4)
        vals = [round(40 + base + effect[(k, w)] + rnd.gauss(0, 2.5)) for k in (1, 2) for w in (1, 2, 3)]
        rows.append([s, *vals])
    return ["subjek", "k1w1", "k1w2", "k1w3", "k2w1", "k2w2", "k2w3"], rows


def spss_header(title, cols, rows, new_output=None):
    data = "\n".join(" ".join(str(v) for v in r) for r in rows)
    return (
        f"* {title}.\n"
        "* Dibuat oleh testing/glm-rm-reference/generate.py (data identik dengan CSV di folder data/).\n"
        "* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All.\n"
        + (f"OUTPUT NEW NAME={new_output}.\n" if new_output else "")
        + "SET DECIMAL=DOT.\n"
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
    "d": ("Dataset (d) = data (b) dengan kontras Repeated, waktu 4 level x kelompok 3 grup",
          """VALUE LABELS kelompok 1 'K1' 2 'K2' 3 'K3'.
DATASET NAME rm_d WINDOW=FRONT.
GLM w1 w2 w3 w4 BY kelompok
  /WSFACTOR=waktu 4 Repeated
  /MEASURE=skor
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=waktu
  /DESIGN=kelompok.
"""),
    "e": ("Dataset (e) dua faktor within tanpa faktor between, kondisi 2 level x waktu 3 level",
          """DATASET NAME rm_e WINDOW=FRONT.
GLM k1w1 k1w2 k1w3 k2w1 k2w2 k2w3
  /WSFACTOR=kondisi 2 Polynomial waktu 3 Polynomial
  /MEASURE=skor
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=kondisi waktu kondisi*waktu.
"""),
}

# (d) and (e) open their own output window (OUTPUT NEW), so the export holds
# only that syntax, and the export to spss-output/ is active. Adjust the folder
# if the repository is somewhere else.
EXPORT_ACTIVE = """
* Simpan output ke Excel, ke folder spss-output di repositori (sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\\0.POLTSTAT STIS\\Tugas Kuliah\\Skripsi\\topik baru statify\\statify64\\testing\\glm-rm-reference\\spss-output\\rm_{k}.xlsx' OPERATION=CREATEFILE.
"""

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


FORCE = "--force" in sys.argv


def write_syntax(path, text):
    """Writes a syntax file unless it exists with other content (user edits)."""
    if path.exists() and path.read_text(encoding="utf-8") != text and not FORCE:
        print(f"  {path.name}: sudah ada dengan isi lain (mis. diubah di SPSS), TIDAK ditimpa (pakai --force)")
        return
    path.write_text(text, encoding="utf-8")


def write_gambar51():
    # Gambar 51 dataset (exported from "dataset/repeated measures.sav"): only
    # the syntax is generated here, the CSV is not rewritten.
    lines = (DATA / "gambar51.csv").read_text(encoding="utf-8").strip().splitlines()
    cols = lines[0].split(",")
    rows = [line.split(",") for line in lines[1:]]
    write_syntax(SPSS / "gambar51.sps",
                 spss_header("Dataset Gambar 51 (repeated measures.sav), perlakuan 4 level, 15 subjek", cols, rows)
                 + GAMBAR51 + EXPORT.format(k="gambar51"))


def main():
    keys = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not keys:
        sys.exit("Sebutkan dataset, mis.: python generate.py d e   (gambar51 a b c d e)")
    DATA.mkdir(exist_ok=True)
    SPSS.mkdir(exist_ok=True)
    if "gambar51" in keys:
        write_gambar51()
    makers = {"a": rows_a, "b": rows_b, "c": rows_c, "d": rows_b, "e": rows_e}
    for key in [k for k in keys if k in makers]:
        cols, rows = makers[key]()
        if key != "d":  # (d) reuses data/rm_b.csv
            (DATA / f"rm_{key}.csv").write_text(
                ",".join(cols) + "\n" + "\n".join(",".join(str(v) for v in r) for r in rows) + "\n", encoding="utf-8")
        title, glm = SYNTAX[key]
        new = key in ("d", "e")
        write_syntax(SPSS / f"rm_{key}.sps",
                     spss_header(title, cols, rows, new_output=f"rm_{key}" if new else None) + glm
                     + (EXPORT_ACTIVE if new else EXPORT).format(k=key))
        print(f"rm_{key}: {len(rows)} subjek, kolom {cols}")


if __name__ == "__main__":
    main()
