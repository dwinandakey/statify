#!/usr/bin/env python3
"""Oracle independen Track C3 (BB-33, BB-35): menghitung ulang, dengan Python murni (math, re),
skor Naive Bayes Apply Model dan metrik evaluasi, TANPA memanggil kode Statify.

Rumus mengikuti apply-model/AGENTS.md S5.4-S5.7 (log-skor, log-sum-exp, argmax tie-break
byte-wise, pembulatan 4 desimal) dan classification_table (precision/recall/F1/akurasi per kelas,
rata-rata macro/weighted/micro, Cohen's Kappa overall).

Dua kasus:
  A. Model D1 (schema 1.1; Outlook categorical + Temp numerical) pada dataset D3 (6 baris) dengan
     kolom Actual Play = No,Yes,Yes,No,Yes,Maybe.
  B. Model teks Raw (fixture nb-model-v2_0-raw.json) pada 4 dokumen, Actual = pos,pos,pos,neg.

Pemakaian: python3 c3_am_oracle.py            -> mencetak nilai yang dipakai sebagai literal di tes
           python3 c3_am_oracle.py --json     -> keluaran JSON
Tidak butuh paket pihak ketiga.
"""
import json
import math
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FIX = REPO / "frontend/components/Modals/Analyze/Classify/apply-model/services/__fixtures__"


def round4(x):
    # Rust: (x * 10000.0).round() / 10000.0  (round half away from zero)
    v = x * 10000.0
    r = math.floor(v + 0.5) if v >= 0 else -math.floor(-v + 0.5)
    return r / 10000.0


def posterior(scores):
    m = max(scores)
    e = [math.exp(s - m) for s in scores]
    z = sum(e)
    return [x / z for x in e]


def argmax_bytewise(classes, scores):
    order = sorted(range(len(classes)), key=lambda i: classes[i].encode("utf-8"))
    best = None
    best_i = None
    for i in order:
        if best is None or scores[i] > best:
            best, best_i = scores[i], i
    return best_i


def safe_ln(p):
    return math.log(p) if p > 0 else math.log(sys.float_info.min)


def metrics(actual, predicted, classes):
    k = len(classes)
    idx = {c: i for i, c in enumerate(classes)}
    cm = [[0] * k for _ in range(k)]
    for a, p in zip(actual, predicted):
        cm[idx[a]][idx[p]] += 1
    n = sum(sum(r) for r in cm)
    row = [sum(r) for r in cm]
    col = [sum(cm[i][j] for i in range(k)) for j in range(k)]
    per = []
    for i, c in enumerate(classes):
        tp = cm[i][i]
        fp = col[i] - tp
        fn = row[i] - tp
        tn = n - tp - fp - fn
        prec = tp / (tp + fp) if tp + fp else 0.0
        rec = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
        acc = (tp + tn) / n if n else 0.0
        per.append(dict(cls=c, accuracy=acc, precision=prec, recall=rec, f1=f1, support=row[i]))
    macro = {key: sum(p[key] for p in per) / k for key in ("precision", "recall", "f1")}
    wsum = sum(p["support"] for p in per)
    weighted = {key: sum(p[key] * p["support"] for p in per) / wsum for key in ("precision", "recall", "f1")}
    po = sum(cm[i][i] for i in range(k)) / n
    pe = sum((row[i] / n) * (col[i] / n) for i in range(k))
    kappa = (po - pe) / (1 - pe) if abs(1 - pe) > 1e-12 else 0.0
    micro = {"precision": po, "recall": po, "f1": po}
    return dict(matrix=cm, row=row, col=col, n=n, per=per, macro=macro, weighted=weighted,
                micro=micro, accuracy=po, kappa=kappa)


# ----------------------------------------------------------------------------- Kasus A
def case_a():
    classes = ["No", "Yes"]
    prior = {"No": 0.5, "Yes": 0.5}
    cats = ["Overcast", "Rain", "Sunny"]
    dist = {"No": [0.5, 1 / 6, 1 / 3], "Yes": [1 / 6, 1 / 3, 0.5]}
    totals = {"No": 3, "Yes": 3}
    alpha, k = 1.0, 3
    mean = {"No": 84.0, "Yes": 72.0}
    var = {"No": 56 / 3, "Yes": 8 / 3}
    rows = [("Overcast", 85.0), ("Sunny", 71.0), ("Foggy", 72.0), ("Sunny", None), ("", None), (None, 80.0)]
    actual = ["No", "Yes", "Yes", "No", "Yes", "Maybe"]

    out = []
    for outlook, temp in rows:
        o_missing = outlook is None or str(outlook).strip() == ""
        if o_missing and temp is None:
            out.append(None)
            continue
        scores = []
        unseen = False
        for c in classes:
            s = safe_ln(prior[c])
            if temp is not None:
                v = max(var[c], sys.float_info.min)
                s += -0.5 * math.log(2 * math.pi * v) - (temp - mean[c]) ** 2 / (2 * v)
            label = "(Missing)" if o_missing else outlook
            if label in cats:
                p = dist[c][cats.index(label)]
            else:
                unseen = True
                p = alpha / (totals[c] + alpha * k)
            s += safe_ln(p)
            scores.append(s)
        post = posterior(scores)
        pi = argmax_bytewise(classes, scores)
        out.append(dict(scores=scores, post=post, pred=classes[pi], pi=pi, unseen=unseen,
                        missing=o_missing or temp is None))
    return classes, out, actual


# ----------------------------------------------------------------------------- Kasus B
def case_b():
    m = json.loads((FIX / "nb-model-v2_0-raw.json").read_text(encoding="utf-8"))
    classes = m["target"]["classes"]
    priors = m["target"]["class_priors"]
    t = m["text"]
    terms = t["terms"]
    lw = t["log_weights"]
    docs = ["makan nasi enak", "Saya tidak suka nasi!", "", "Makan, makan, makan"]
    actual = ["pos", "pos", "pos", "neg"]
    split = re.compile(r"[\s.,;:'\"()?!]+")
    res = []
    for d in docs:
        if d.strip() == "":
            res.append(None)
            continue
        toks = [w for w in split.split(d.lower()) if w]
        x = [toks.count(term) for term in terms]
        scores = [math.log(priors[i]) + sum(xj * lw[c][j] for j, xj in enumerate(x)) for i, c in enumerate(classes)]
        post = posterior(scores)
        pi = argmax_bytewise(classes, scores)
        res.append(dict(x=x, scores=scores, post=post, pred=classes[pi], pi=pi))
    return classes, res, actual


def evaluate(classes, rows, actual):
    a, p = [], []
    not_scored = unknown = 0
    for r, act in zip(rows, actual):
        if r is None:
            not_scored += 1
            continue
        if act not in classes:
            unknown += 1
            continue
        a.append(act)
        p.append(r["pred"])
    return dict(evaluated=len(a), not_scored=not_scored, unknown=unknown, **metrics(a, p, classes))


def main():
    as_json = "--json" in sys.argv
    result = {}
    for name, fn in (("A", case_a), ("B", case_b)):
        classes, rows, actual = fn()
        ev = evaluate(classes, rows, actual)
        scored = [r for r in rows if r is not None]
        counts = [sum(1 for r in scored if r["pred"] == c) for c in classes]
        result[name] = dict(
            classes=classes,
            rows=[None if r is None else dict(scores=r["scores"], post=r["post"],
                                              post4=[round4(x) for x in r["post"]], pred=r["pred"])
                  for r in rows],
            counts=counts,
            percentages=[c / len(scored) * 100 for c in counts],
            not_scored=len(rows) - len(scored),
            evaluation=ev,
        )
    if as_json:
        print(json.dumps(result, indent=1, default=float))
        return
    for name, r in result.items():
        print("=== Kasus", name, r["classes"])
        for i, row in enumerate(r["rows"], 1):
            if row is None:
                print(" baris", i, "NotScored")
            else:
                print(" baris", i, row["pred"], "P=", row["post4"], "skor=", [round(s, 10) for s in row["scores"]])
        print(" counts", r["counts"], "pct", r["percentages"], "not_scored", r["not_scored"])
        ev = r["evaluation"]
        print(" evaluated", ev["evaluated"], "excl_not_scored", ev["not_scored"], "excl_unknown", ev["unknown"])
        print(" matrix", ev["matrix"], "row", ev["row"], "col", ev["col"], "n", ev["n"])
        for p in ev["per"]:
            print("  ", p["cls"], {k: round(v, 12) if isinstance(v, float) else v for k, v in p.items() if k != "cls"})
        print(" macro", ev["macro"], "\n weighted", ev["weighted"], "\n micro", ev["micro"])
        print(" accuracy", ev["accuracy"], "kappa", ev["kappa"])


if __name__ == "__main__":
    main()
