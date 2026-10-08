#!/usr/bin/env python3
"""
Acuan independen BB-02 (Track C1): default Weka pada korpus acuan D.

Korpus D:
  D1 "Saya suka makan nasi"
  D2 "Saya tidak suka nasi!"
  D3 "Makan, makan, makan"
Pengaturan default aplikasi (STWV_DEFAULT_CONFIG): lowercase, delimiter regex [\\s.,;:'"()?!]+,
TF = hitungan (raw), tanpa IDF, tanpa normalisasi, Words to Keep = 1000, Min term frequency = 1.

Perhitungan ini TIDAK memakai kode Statify. Dua jalur:
  (1) Python murni (re.split + collections.Counter);
  (2) scikit-learn CountVectorizer dengan tokenizer yang sama (verifikasi silang).
Urutan kolom = alfabetis (aturan kosakata Statify; sklearn juga mengurutkan alfabetis).
Seed 42 (tidak ada proses acak di sini).
Pemakaian: python3 reference_bb02.py > ../logs/reference_bb02.txt
"""
import re
import sys
from collections import Counter

DOCS = ["Saya suka makan nasi", "Saya tidak suka nasi!", "Makan, makan, makan"]
DELIM = r"[\s.,;:'\"()?!]+"


def tokenize(doc):
    return [t for t in re.split(DELIM, doc.lower()) if t]


def pure_python():
    tokens = [tokenize(d) for d in DOCS]
    vocab = sorted({t for ts in tokens for t in ts})
    matrix = []
    for ts in tokens:
        c = Counter(ts)
        matrix.append([c.get(t, 0) for t in vocab])
    return tokens, vocab, matrix


def with_sklearn():
    import sklearn
    from sklearn.feature_extraction.text import CountVectorizer

    cv = CountVectorizer(tokenizer=tokenize, lowercase=False, token_pattern=None)
    x = cv.fit_transform(DOCS).toarray().tolist()
    return sklearn.__version__, list(cv.get_feature_names_out()), x


def main():
    tokens, vocab, matrix = pure_python()
    print("BB-02 acuan independen (Python murni)")
    print("python", sys.version.split()[0])
    for i, ts in enumerate(tokens, 1):
        print(f"D{i} token: {ts}")
    print("kosakata (urut alfabetis):", vocab, "| jumlah =", len(vocab))
    print("kolom dataset:", ["VEC_" + t for t in vocab])
    for i, row in enumerate(matrix, 1):
        print(f"D{i}:", row)
    ver, sk_vocab, sk_matrix = with_sklearn()
    print()
    print("Verifikasi silang scikit-learn", ver, "CountVectorizer (tokenizer sama):")
    print("kosakata:", sk_vocab)
    for i, row in enumerate(sk_matrix, 1):
        print(f"D{i}:", row)
    ok = sk_vocab == vocab and sk_matrix == matrix
    print("COCOK_PYTHON_SKLEARN =", ok)
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
