#!/usr/bin/env python3
"""Replikasi independen pemilihan kosakata (-O -L -M 1, delimiter bawaan WordTokenizer) untuk mengukur
efek nilai seri di batas wordsToKeep. Hasil dibandingkan dengan jumlah atribut keluaran WEKA (out/train_K1.arff)."""
import csv, re, sys, os
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, "..", "data")
DELIM = " \r\n\t.,;:'\"()?!"
rx = re.compile("[" + re.escape(DELIM) + "]+")
def tok(s): return [t for t in rx.split(s.lower()) if t]
rows = list(csv.DictReader(open(os.path.join(DATA, "pilkada_train.csv"), encoding="utf-8-sig", newline="")))
c = Counter(); df = Counter()
for r in rows:
    t = tok(r["Text Tweet"]); c.update(t); df.update(set(t))
W = 1000
counts_sorted = sorted(c.values())
thr = max(1, counts_sorted[len(counts_sorted) - W]) if len(counts_sorted) >= W else 1
weka_keep = [w for w, n in c.items() if n >= thr]
strict = sorted(c.items(), key=lambda kv: (-kv[1], kv[0].encode("utf-8")))[:W]
print("vocab_penuh", len(c))
print("ambang_hitungan_WEKA(array[len-W])", thr)
print("kata_WEKA(>=ambang)", len(weka_keep))
print("kata_dengan_hitungan==ambang", sum(1 for n in c.values() if n == thr))
print("kata_Statify(top-W, seri alfabetis)", len(strict))
sset = {w for w, _ in strict}
print("kata_WEKA_tidak_di_Statify", len(set(weka_keep) - sset), "kata_Statify_tidak_di_WEKA", len(sset - set(weka_keep)))
print("df==N (idf=0) jumlah kata", sum(1 for w in c if df[w] == len(rows)))
