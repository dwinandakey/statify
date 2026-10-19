#!/usr/bin/env python3
"""Ringkas hasil WEKA (data uji) dari logs/<ds>/<K>_summary.log -> HASIL_WEKA.md.
Semua angka dibaca/dihitung dari matriks konfusi pada log mentah (tanpa angka karangan).
Format koma desimal. Jalankan dari folder weka/:  python3 tools/summarize_results.py
"""
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DS = [("pilkada", "Pilkada (270 uji)"), ("sms_spam", "SMS Spam (1673 uji)"), ("smsa", "SmSA (500 uji)")]
KS = ["K1", "K1w", "K2", "K3", "K3N", "K3w", "K5", "K5w"]

def dec(x, n=2):
    return f"{x:.{n}f}".replace(".", ",")

def parse(path):
    txt = open(path, encoding="utf-8", errors="replace").read()
    i = txt.find("=== Error on test data ===")
    if i < 0:
        return None
    t = txt[i:]
    m = re.search(r"Correctly Classified Instances\s+(\d+)\s+([\d.]+)\s*%", t)
    n = int(re.search(r"Total Number of Instances\s+(\d+)", t).group(1))
    cm = []
    j = t.find("=== Confusion Matrix ===")
    for line in t[j:].splitlines():
        mm = re.match(r"\s*((?:\d+\s+)+)\|\s+\w = (.+)$", line)
        if mm:
            cm.append([int(v) for v in mm.group(1).split()])
    K = len(cm)
    f1s = []
    for c in range(K):
        tp = cm[c][c]
        fp = sum(cm[r][c] for r in range(K)) - tp
        fn = sum(cm[c]) - tp
        p = tp / (tp + fp) if tp + fp else 0.0
        r = tp / (tp + fn) if tp + fn else 0.0
        f1s.append(2 * p * r / (p + r) if p + r else 0.0)
    kappa = float(re.search(r"Kappa statistic\s+(-?[\d.]+)", t).group(1))
    return dict(correct=int(m.group(1)), n=n, acc=100 * int(m.group(1)) / n, macro_f1=100 * sum(f1s) / K, kappa=kappa)

out = ["# Hasil WEKA 3.9.6 pada data uji (diturunkan dari logs/<dataset>/<K>_summary.log)", "",
       "Akurasi dan F1-makro (%) dihitung dari matriks konfusi pada log mentah. "
       "Lingkungan: OpenJDK 11 (Linux VM), BUKAN Zulu 17 Windows bawaan WEKA; lihat 00_ENV_dan_pemetaan_opsi.md bagian 1 dan 10.", ""]
for d, title in DS:
    out += [f"## {title}", "", "| Konfigurasi | Benar/Total | Akurasi (%) | F1-makro (%) | Kappa |", "|---|---|---|---|---|"]
    for k in KS:
        p = os.path.join(ROOT, "logs", d, f"{k}_summary.log")
        r = parse(p) if os.path.exists(p) else None
        if r is None:
            out.append(f"| {k} | NOT RUN | NOT RUN | NOT RUN | NOT RUN |")
        else:
            out.append(f"| {k} | {r['correct']}/{r['n']} | {dec(r['acc'])} | {dec(r['macro_f1'])} | {dec(r['kappa'], 4)} |")
    out.append("")
open(os.path.join(ROOT, "HASIL_WEKA.md"), "w", encoding="utf-8").write("\n".join(out) + "\n")
print("\n".join(out))
