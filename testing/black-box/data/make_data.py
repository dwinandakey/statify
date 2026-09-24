"""Dataset kecil untuk skenario black-box yang tidak punya padanan di repo.

    python testing/black-box/data/make_data.py

Semua berkas diturunkan secara deterministik dari dataset acuan yang sudah
ada (tanpa bilangan acak):

- bb-mv-singular.csv: data mv4 (testing/glm-mv-reference/data/one-way manova.csv)
  ditambah y3 = y1 + y2. Dengan DV y1, y2, y3 matriks SSCP galat singular
  (y3 kombinasi linear), sehingga uji multivariat tidak dapat dihitung.
- bb-mv-no-complete.csv: data mv4 dengan y1 dikosongkan pada baris ganjil dan
  y2 pada baris genap: setiap kasus punya nilai hilang (listwise membuang
  semua kasus).
- bb-rm-listwise.csv: data rm_b (testing/glm-rm-reference/data/rm_b.csv)
  dengan w2 subjek ke-3 dan w4 subjek ke-10 dikosongkan (2 subjek dibuang
  listwise).
"""
import csv
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
MV4 = os.path.join(REPO, "testing", "glm-mv-reference", "data", "one-way manova.csv")
RMB = os.path.join(REPO, "testing", "glm-rm-reference", "data", "rm_b.csv")


def read(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    return rows[0], rows[1:]


def write(name, header, rows):
    with open(os.path.join(HERE, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)
    print(name, len(rows), "baris")


def num(x):
    v = float(x)
    return str(int(v)) if v.is_integer() else repr(v)


header, rows = read(MV4)
i1, i2 = header.index("y1"), header.index("y2")
write("bb-mv-singular.csv", header + ["y3"], [r + [num(float(r[i1]) + float(r[i2]))] for r in rows])

nc = []
for k, r in enumerate(rows, start=1):
    r = list(r)
    r[i1 if k % 2 == 1 else i2] = ""
    nc.append(r)
write("bb-mv-no-complete.csv", header, nc)

header, rows = read(RMB)
iw2, iw4 = header.index("w2"), header.index("w4")
lw = [list(r) for r in rows]
lw[2][iw2] = ""
lw[9][iw4] = ""
write("bb-rm-listwise.csv", header, lw)
