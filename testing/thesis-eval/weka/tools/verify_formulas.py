#!/usr/bin/env python3
"""Verifikasi independen (Python murni) bahwa rumus yang DIBACA dari kode Statify sama dengan keluaran WEKA.
Catatan penting: ini mereimplementasi rumus Statify (vectorizer.rs, nb_text.rs, class_prior.rs) di Python; BUKAN
menjalankan biner Statify. Dipakai sebagai pemeriksaan kewarasan sebelum membandingkan dengan Statify sungguhan.

Pemakaian: python tools/verify_formulas.py <dataset>   (butuh out/<dataset>/ dari run_all.sh)
Memeriksa: (a) kosakata + urutan atribut, (b) hitungan K1w, (c) nilai K5w (log1p x ln(N/df), doc_length),
(d) Multinomial: probabilitas vs WEKA (prior Laplace WEKA dan prior count/N Statify), (e) Complement: bobot dan prediksi,
(f) selisih tokenisasi delimiter WEKA vs \\s Unicode gaya Rust."""
import csv, math, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
ds = sys.argv[1]; O = os.path.join(ROOT, "out", ds); L = os.path.join(ROOT, "logs", ds); DATA = os.path.join(ROOT, "data")

def read_csv(p):
    with open(p, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f); rows = list(r)
    tk = "Text Tweet" if ds == "pilkada" else "Text"; lk = "Sentiment" if ds == "pilkada" else "Label"
    return [(x[tk], x[lk]) for x in rows]
tr_rows = read_csv(os.path.join(DATA, ds + "_train.csv")); te_rows = read_csv(os.path.join(DATA, ds + "_test.csv"))
classes = sorted({y for _, y in tr_rows}); K = len(classes); cidx = {c: i for i, c in enumerate(classes)}

WEKA_DELIM = " \r\n\t.,;:'\"()?!"
rx_weka = re.compile("[" + re.escape(WEKA_DELIM) + "]+")
RUST_WS = "\t\n\x0b\x0c\r \x85\xa0  -     　"
rx_rust = re.compile("[" + RUST_WS + re.escape(".,;:'\"()?!") + "]+")
def tok(s, rx): return [t for t in rx.split(s.lower()) if t]

# ---- (f) selisih tokenisasi
for name, rows in (("latih", tr_rows), ("uji", te_rows)):
    nd = sum(1 for t, _ in rows if tok(t, rx_weka) != tok(t, rx_rust))
    print("(f) tokenisasi WEKA vs gaya-Rust (%s): %d dari %d dokumen berbeda" % (name, nd, len(rows)))

# ---- ARFF sparse reader (WEKA)
def unq(s):
    if s and s[0] in "'\"":
        q = s[0]; out = []; i = 1
        while i < len(s) and s[i] != q:
            if s[i] == "\\" and i + 1 < len(s):
                i += 1; out.append({"n": "\n", "t": "\t", "r": "\r"}.get(s[i], s[i]))
            else: out.append(s[i])
            i += 1
        return "".join(out), s[i + 1:].strip()
    p = s.split(None, 1); return p[0], (p[1] if len(p) > 1 else "")
def read_arff(p):
    names = []; rows = []; data = False
    for line in open(p, encoding="utf-8"):
        line = line.rstrip("\n")
        if not data:
            if line.lower().startswith("@attribute"):
                nm, _ = unq(line[len("@attribute"):].strip()); names.append(nm)
            elif line.lower().startswith("@data"): data = True
            continue
        if not line.strip() or line.startswith("%"): continue
        body = line.strip()[1:-1]; cls = 0; vals = {}
        for part in (body.split(",") if body else []):
            i, v = part.split(" ", 1); i = int(i)
            if i == 0: cls = classes.index(v)
            else: vals[i - 1] = float(v)
        rows.append((cls, vals))
    return names, rows

# ---- (a) kosakata
c = Counter(); df = Counter(); n = len(tr_rows)
for t, _ in tr_rows:
    ts = tok(t, rx_weka); c.update(ts); df.update(set(ts))
vocab = sorted(c, key=lambda w: w.encode("utf-16-be"))
names, trw = read_arff(os.path.join(O, "train_K1w.arff")); _, tew = read_arff(os.path.join(O, "test_K1w.arff"))
print("(a) kosakata penuh: milik-sendiri=%d, WEKA=%d, urutan&isi identik=%s" % (len(vocab), len(names) - 1, vocab == names[1:]))
V = len(vocab); widx = {w: i for i, w in enumerate(vocab)}
def counts(rows):
    out = []
    for t, _ in rows:
        d = Counter(widx[w] for w in tok(t, rx_weka) if w in widx); out.append(dict(d))
    return out
ctr, cte = counts(tr_rows), counts(te_rows)
ok_b = all({k: float(v) for k, v in a.items()} == b[1] for a, b in zip(ctr, trw)) and all({k: float(v) for k, v in a.items()} == b[1] for a, b in zip(cte, tew))
print("(b) hitungan kata K1w (latih+uji) identik dengan ARFF WEKA: %s" % ok_b)

# ---- (c) K5w: ln(1+f) * ln(N/df), lalu doc_length
def k5(cnts, avg=None):
    rows = []
    for d in cnts:
        r = {}
        for k, f in d.items():
            v = math.log(1 + f) * math.log(n / df[vocab[k]])
            if v != 0.0: r[k] = v
        rows.append(r)
    return rows
def l2(r): return math.sqrt(sum(x * x for x in r.values()))
rtr = k5(ctr); rte = k5(cte)
norms = [l2(r) for r in rtr]
avg_all = sum(norms) / len(norms); pos = [x for x in norms if x > 0]; avg_pos = sum(pos) / len(pos)
def scale(rows, avg): return [{k: v * avg / l2(r) for k, v in r.items()} if l2(r) > 0 else {} for r in rows]
_, w5tr = read_arff(os.path.join(O, "train_K5w.arff")); _, w5te = read_arff(os.path.join(O, "test_K5w.arff"))
def maxdiff(mine, weka):
    m = 0.0
    for a, (_, b) in zip(mine, weka):
        for k in set(a) | set(b): m = max(m, abs(a.get(k, 0.0) - b.get(k, 0.0)))
    return m
print("(c) K5w: avg_norm semua dokumen=%.12f, hanya norma>0=%.12f (selisih %.3e; dokumen latih bernorma 0: %d)" % (avg_all, avg_pos, abs(avg_all - avg_pos), len(norms) - len(pos)))
print("    maks|selisih| nilai K5w vs ARFF WEKA (latih/uji) memakai avg semua-dokumen (WEKA): %.3e / %.3e" % (maxdiff(scale(rtr, avg_all), w5tr), maxdiff(scale(rte, avg_all), w5te)))
print("    ... memakai avg hanya-norma>0 (gaya Statify): %.3e / %.3e" % (maxdiff(scale(rtr, avg_pos), w5tr), maxdiff(scale(rte, avg_pos), w5te)))

# ---- (d) Multinomial pada K1w
ytr = [y for y, _ in trw]; yte = [y for y, _ in tew]
N_ct = [[0.0] * V for _ in range(K)]; ndoc = [0] * K
for y, v in trw:
    ndoc[y] += 1
    for k, f in v.items(): N_ct[y][k] += f
logth = []
for ci in range(K):
    den = sum(N_ct[ci]) + 1.0 * V; logth.append([math.log((x + 1.0) / den) for x in N_ct[ci]])
def post(rows, prior):
    out = []
    for _, v in rows:
        s = [math.log(prior[ci]) + sum(f * logth[ci][k] for k, f in v.items()) for ci in range(K)]
        m = max(s); e = [math.exp(x - m) for x in s]; z = sum(e); out.append([x / z for x in e])
    return out
prior_weka = [(ndoc[ci] + 1) / (n + K) for ci in range(K)]; prior_stat = [ndoc[ci] / n for ci in range(K)]
def read_pred(p):
    out = []
    for r in csv.reader(open(p)):
        if r and r[0].isdigit(): out.append(([float(x.lstrip("*")) for x in r[4:4 + K]], int(r[2].split(":")[0]) - 1))
    return out
pw = read_pred(os.path.join(O, "pred_K1w.csv"))
pa = post(tew, prior_weka); pb = post(tew, prior_stat)
d_a = max(abs(x - y) for a, (b, _) in zip(pa, pw) for x, y in zip(a, b)); d_b = max(abs(x - y) for a, (b, _) in zip(pb, pw) for x, y in zip(a, b))
lab = lambda P: [max(range(K), key=lambda i: p[i]) for p in P]
print("(d) Multinomial K1w: prior WEKA %s vs Statify %s" % (["%.6f" % p for p in prior_weka], ["%.6f" % p for p in prior_stat]))
print("    maks|selisih peluang| vs WEKA: prior Laplace-WEKA=%.3e ; prior count/N-Statify=%.3e" % (d_a, d_b))
la, lb, lw = lab(pa), lab(pb), [l for _, l in pw]
print("    prediksi berbeda dari WEKA: prior-WEKA=%d ; prior-Statify=%d (dari %d dokumen uji)" % (sum(x != y for x, y in zip(la, lw)), sum(x != y for x, y in zip(lb, lw)), len(lw)))

# ---- (e) Complement pada K1w
tot = [sum(N_ct[ci][k] for ci in range(K)) for k in range(V)]
Wc = []
for ci in range(K):
    comp = [tot[k] - N_ct[ci][k] for k in range(V)]; den = sum(comp) + 1.0 * V
    Wc.append([math.log((x + 1.0) / den) for x in comp])   # = -L_ct Statify
lines = open(os.path.join(L, "K3w_summary.log"), encoding="utf-8").read().split("\n")
st = next(i for i, l in enumerate(lines) if l.startswith("The word weights for each class")) + 3
wk = {}
for l in lines[st:]:
    p = l.split("\t")
    if len(p) >= K + 1 and p[0] != "": 
        try: wk[p[0]] = [float(x) for x in p[1:1 + K]]
        except ValueError: pass
md = max(abs(Wc[ci][widx[w]] - wk[w][ci]) for w in vocab for ci in range(K))
print("(e) Complement: maks|selisih bobot| (ln theta-tilde Statify vs W WEKA, %d kata): %.3e" % (V, md))
pc = read_pred(os.path.join(O, "pred_K3w.csv")); lc = [l for _, l in pc]
def cnb_pred(rows):
    out = []
    for _, v in rows:
        sc = [sum(f * -Wc[ci][k] for k, f in v.items()) for ci in range(K)]   # Statify: argmax sum x*L, L=-ln theta~
        out.append(max(range(K), key=lambda i: (sc[i], -i)))                  # seri -> kelas pertama
    return out
cp = cnb_pred(tew)
print("    prediksi Complement Statify-formula vs WEKA K3w berbeda: %d dari %d" % (sum(x != y for x, y in zip(cp, lc)), len(lc)))
