"""Dataset tergeser manual untuk validasi δ₀ (fitur v4).

    python testing/fitur-v4/data/make_data.py

- mv2-geser.csv: "hotelling 2 populasi independen.csv" dengan δ₀ = (3, 2, 10, 1)
  dikurangkan dari x1..x4 pada setiap baris jk = 1 (level pertama). Uji dua
  populasi Statify dengan δ₀ = 0 pada data ini harus sama dengan uji Statify
  dengan δ₀ = (3, 2, 10, 1) pada data asli, dan dengan SPSS pada data geser
  (spss/mv2_delta0.sps, spss/mv2w_delta0.sps).
- mv3-geser.csv: "hotelling berpasangan (data asli).csv" dengan kedalaman1 − 8
  dan ukuran1 − 3, sehingga selisih pasangan menjadi d − δ₀ dengan δ₀ = (8, 3).
  Uji berpasangan δ₀ = 0 pada data ini harus sama dengan δ₀ = (8, 3) pada data
  asli, dan dengan SPSS pada d − δ₀ (spss/mv3_delta0.sps).

Baris kosong di berkas asli dipertahankan (dibuang listwise saat analisis).
"""
import csv
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
SRC = os.path.join(REPO, "testing", "glm-mv-reference", "data")

DELTA_TWO = {"x1": 3, "x2": 2, "x3": 10, "x4": 1}
DELTA_PAIRED = {"kedalaman1": 8, "ukuran1": 3}


def num(x):
    v = float(x)
    return str(int(v)) if v.is_integer() else repr(v)


def shift(src, dst, delta, cond):
    with open(os.path.join(SRC, src), newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header, body = rows[0], rows[1:]
    out = []
    for r in body:
        r = list(r)
        rec = dict(zip(header, r))
        if cond(rec):
            for col, d in delta.items():
                i = header.index(col)
                if r[i].strip() != "":
                    r[i] = num(float(r[i]) - d)
        out.append(r)
    with open(os.path.join(HERE, dst), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(out)
    print(dst, len(out), "baris")


shift("hotelling 2 populasi independen.csv", "mv2-geser.csv", DELTA_TWO,
      lambda rec: rec.get("jk", "").strip() != "" and float(rec["jk"]) == 1)
shift("hotelling berpasangan (data asli).csv", "mv3-geser.csv", DELTA_PAIRED,
      lambda rec: True)
