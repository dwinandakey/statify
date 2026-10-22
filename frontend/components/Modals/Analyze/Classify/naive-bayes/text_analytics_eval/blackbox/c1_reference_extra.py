#!/usr/bin/env python3
"""
Acuan independen tambahan Track C1 (BB-04, BB-07, BB-09, BB-10, BB-12).
TIDAK memakai kode Statify: Python murni (re, collections, math) dan scikit-learn (TfidfVectorizer)
sebagai verifikasi silang. Pemakaian: python3 c1_reference_extra.py > ../logs/reference_bb_c1_extra.txt
"""
import json
import math
import os
import re
import sys
from collections import Counter

import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer

HERE = os.path.dirname(os.path.abspath(__file__))
DELIM = r"[\s.,;:'\"()?!]+"
D = ["Saya suka makan nasi", "Saya tidak suka nasi!", "Makan, makan, makan"]
INDO = [
    "Saya sedang memakan nasi goreng di warung itu.",
    "Makanan ini sangat enak dan murah.",
    "Dimakan oleh kucing peliharaan saya!",
    "Kucing itu berlari-lari mengejar tikus.",
    "MAKAN nasi goreng setiap hari? Tentu saja!",
    "Kucing, tikus, dan anjing adalah hewan.",
    "berlari berlari berlari.",
    "   ",
    "Apakah kamu suka makan nasi uduk?",
    "Nasi goreng dimakan kucing berlari.",
]


def tok(doc, stop=()):
    return [t for t in re.split(DELIM, doc.lower()) if t and t not in stop]


def ngrams(tokens, lo, hi):
    out = []
    for n in range(lo, hi + 1):
        for i in range(len(tokens) - n + 1):
            out.append(" ".join(tokens[i:i + n]))
    return out


def matrix_of(token_docs, vocab):
    rows = []
    for ts in token_docs:
        c = Counter(ts)
        rows.append([c.get(t, 0) for t in vocab])
    return rows


def section(title):
    print()
    print("=" * 78)
    print(title)
    print("=" * 78)


print("python", sys.version.split()[0], "| numpy", np.__version__, "| scikit-learn", sklearn.__version__)

# ---------------------------------------------------------------- BB-04
section("BB-04  n-gram min=1 max=2 pada korpus D (Weka raw/none/none)")
docs = [ngrams(tok(d), 1, 2) for d in D]
vocab = sorted({t for ts in docs for t in ts})
print("jumlah term:", len(vocab))
print("kosakata:", vocab)
print("unigram:", [t for t in vocab if " " not in t])
print("bigram :", [t for t in vocab if " " in t])
for i, row in enumerate(matrix_of(docs, vocab), 1):
    print(f"D{i}:", row)

# ---------------------------------------------------------------- BB-07
section("BB-07  stopword pada korpus D")
with open(os.path.join(HERE, "data", "c1_stopwords_indonesian.json"), encoding="utf-8") as f:
    sw_id = set(json.load(f))
print("ukuran daftar Indonesian =", len(sw_id), "| 'saya' di daftar:", "saya" in sw_id,
      "| 'tidak' di daftar:", "tidak" in sw_id)
for name, stop in [("Indonesian", sw_id), ("Custom {suka}", {"suka"})]:
    td = [tok(d, stop) for d in D]
    v = sorted({t for ts in td for t in ts})
    print(f"[{name}] kosakata:", v)
    for i, row in enumerate(matrix_of(td, v), 1):
        print(f"  D{i}:", row)

# ---------------------------------------------------------------- BB-09
section("BB-09  scikit-learn standard (raw / smooth / L2) pada korpus D")
tv = TfidfVectorizer(tokenizer=lambda s: tok(s), lowercase=False, token_pattern=None,
                     use_idf=True, smooth_idf=True, norm="l2", sublinear_tf=False)
x = tv.fit_transform(D).toarray()
print("kosakata:", list(tv.get_feature_names_out()))
print("idf_ (sklearn):", [repr(float(v)) for v in tv.idf_])
for i, row in enumerate(x, 1):
    print(f"D{i}:", [repr(float(v)) for v in row])
# Rumus manual independen
vocab_d = sorted({t for d in D for t in tok(d)})
n = len(D)
df = [sum(1 for d in D if t in tok(d)) for t in vocab_d]
idf = [math.log((1 + n) / (1 + k)) + 1 for k in df]
man = []
for d in D:
    c = Counter(tok(d))
    v = [c.get(t, 0) * idf[j] for j, t in enumerate(vocab_d)]
    nrm = math.sqrt(sum(a * a for a in v))
    man.append([a / nrm if nrm > 0 else 0.0 for a in v])
print("df:", df, "| idf manual:", [round(v, 12) for v in idf])
print("selisih maks manual vs sklearn:", float(np.max(np.abs(np.array(man) - x))))
print("norma L2 tiap baris (sklearn):", [round(float(np.linalg.norm(r)), 12) for r in x])

# ---------------------------------------------------------------- BB-10
EN = [
    "I am running to the beautiful park!",
    "The parks are very beautiful today.",
    "She ran away from the running dog.",
    "DOGS, cats, and birds are animals.",
    "He is playing a game of chess.",
    "Played games, play games, playing games.",
    "To be or not to be, that is the question.",
    "beautiful beautiful beautiful park.",
    "Stop running! she shouted.",
    "A game of chess is played by two players.",
]


def bb10(title, docs_raw, keep=10, minf=2):
    section(title)
    td = [tok(d) for d in docs_raw]
    total = Counter(t for ts in td for t in ts)
    print("jumlah term unik (semua):", len(total))
    cand = [t for t, c in total.items() if c >= minf]
    ranked = sorted(cand, key=lambda t: (-total[t], t))
    print(f"kandidat total>={minf}: {len(cand)}")
    print("urutan peringkat (hitungan turun, tie alfabetis):", [(t, total[t]) for t in ranked])
    kept = sorted(ranked[:keep])
    print(f"kosakata akhir (alfabetis, <= {keep}):", kept, "| jumlah =", len(kept))
    m = matrix_of(td, kept)
    for i, row in enumerate(m, 1):
        print(f"baris {i}:", row)
    print("total frekuensi tiap term:", [sum(r[j] for r in m) for j in range(len(kept))])
    print("baris nol:", [i + 1 for i, r in enumerate(m) if sum(r) == 0])


bb10("BB-10  Words to Keep=10, Min term frequency=2 pada dataset_inggris_testing (10 baris)", EN)
bb10("BB-10b batas: dataset_indonesia_testing (tepat 10 kandidat)", INDO)

# ---------------------------------------------------------------- BB-12
section("BB-12  sel kosong pada korpus D (disisipkan '' dan '   ')")
docs12 = ["Saya suka makan nasi", "", "Saya tidak suka nasi!", "   ", "Makan, makan, makan"]
td = [tok(d) for d in docs12]
v = sorted({t for ts in td for t in ts})
print("kosakata:", v)
for i, row in enumerate(matrix_of(td, v), 1):
    print(f"baris {i}:", row)
print("jumlah baris:", len(docs12), "| baris nol:", [i + 1 for i, r in enumerate(matrix_of(td, v)) if sum(r) == 0])
