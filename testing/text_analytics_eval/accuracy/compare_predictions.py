"""compare_predictions.py — Track D: metrik per konfigurasi/perangkat dan tabel kesamaan numerik.

Hanya memakai numpy, pandas, dan pustaka standar (jalan di cloud, VM Linux, dan Windows).

Masukan (default relatif terhadap berkas ini):
  out/pred_statify_<K>.csv     Id,kelas_aktual,kelas_prediksi,prob_<kelas>...   (dari run_statify.mjs)
  out/pred_sklearn_<K>.csv     format sama                                       (dari sk_compare.py)
  ../weka/out/<dataset>/pred_<K>.csv   keluaran WEKA CSV (inst#,actual,predicted,error,distribution...) +
  ../weka/data/<dataset>_test_ids.csv  (inst# -> Id)
  out/model_statify_<K>.json, out/sklearn_params_<K>.json, out/stwv_train_statify_<K>.json,
  out/sklearn_train_matrix_<K>.json   (perbandingan tingkat parameter/vektor pada resolusi penuh)

Keluaran: out/compare_<dataset>.md dan out/compare_<dataset>.json (juga dicetak ke stdout).

ATURAN PERHITUNGAN (jujur, lihat catatan di keluaran):
  * x = Statify, c = pembanding. Galat absolut = |x - c|. LRE = -log10(|x - c| / |c|) per elemen, lalu MINIMUM.
    x == c persis -> elemen tak terhingga; bila semua identik ditulis "≥ 15 (identik)".
  * c = 0 : tidak dibagi nol. Bila x = 0 juga -> identik; bila x != 0 -> LRE tak terdefinisi, elemen dicatat
    (jumlahnya dilaporkan) dan dikeluarkan dari LRE (tetap masuk galat absolut).
  * Probabilitas Statify yang keluar dari Apply Model DIBULATKAN 4 DESIMAL oleh wasm (round4). Maka perbandingan
    probabilitas dilakukan pada resolusi itu: c diganti round4(c) untuk LRE ("†"); galat absolut dihitung terhadap
    c yang TIDAK dibulatkan (batas teoretis 5e-5). Resolusi penuh dilaporkan di tabel "tingkat parameter/vektor".
  * Probabilitas WEKA dicetak 16 desimal (nilai < 1e-16 menjadi 0). Elemen WEKA dengan |c| < 1e-10 dikeluarkan dari LRE.
"""
import argparse
import json
import math
import os
import sys
from collections import OrderedDict

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

# (konfigurasi Statify, konfigurasi WEKA atau None, catatan keabsahan perbandingan probabilitas WEKA)
# Aturan keabsahan dibaca dari weka/00_ENV_dan_pemetaan_opsi.md bagian 5 dan 3.
WEKA_MAP = OrderedDict([
    ("K1", "K1"), ("K1w", "K1w"), ("K1m", "K1"), ("K2", "K2"), ("K2m", "K2"), ("K3", "K3"), ("K3w", "K3w"), ("K5", "K5"), ("K5m", "K5"), ("K5w", "K5w"),
])
CONFIG_ORDER = ["K1", "K2", "K3", "K4", "K5", "K6", "K1w", "K2w", "K3w", "K4w", "K5w", "K1m", "K2m", "K5m"]


# ------------------------------------------------------------------------------------------------------------
# Pembacaan
# ------------------------------------------------------------------------------------------------------------
def read_pred(path):
    """Id,kelas_aktual,kelas_prediksi,prob_* -> (DataFrame, daftar kelas urut kolom prob)."""
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    classes = [c[len("prob_"):] for c in df.columns if c.startswith("prob_")]
    P = np.full((len(df), len(classes)), np.nan)
    for j, c in enumerate(classes):
        col = df["prob_" + c]
        P[:, j] = [float(v) if v != "" else np.nan for v in col]
    out = pd.DataFrame({"Id": df["Id"], "actual": df["kelas_aktual"], "pred": df["kelas_prediksi"]})
    return out, classes, P


def read_weka(path, ids_path, class_order):
    """CSV prediksi WEKA -> (DataFrame Id/actual/pred, P[n,K] sesuai class_order).
    Kolom: inst#,actual,predicted,error,distribution(,...) dengan nilai 'k:label'; distribusi per kelas dalam urutan
    atribut kelas pada ARFF, kelas prediksi ditandai '*'. Jumlah kolom distribusi = jumlah kelas."""
    ids = pd.read_csv(ids_path, dtype=str)["Id"].tolist()
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        header = f.readline()
        for line in f:
            line = line.rstrip("\r\n")
            if not line:
                continue
            parts = line.split(",")
            inst, actual, predicted = parts[0], parts[1], parts[2]
            dist = [p for p in parts[4:] if p != ""]
            rows.append((int(inst), actual.split(":", 1)[1], predicted.split(":", 1)[1], [float(d.lstrip("*")) for d in dist]))
    rows.sort()
    n_cls = len(rows[0][3])
    if n_cls != len(class_order):
        raise ValueError(f"{path}: {n_cls} kolom distribusi != {len(class_order)} kelas")
    df = pd.DataFrame({"Id": [ids[r[0] - 1] for r in rows], "actual": [r[1] for r in rows], "pred": [r[2] for r in rows]})
    # urutan distribusi WEKA = urutan header ARFF (alfabetis, sama dengan Statify)
    P = np.array([r[3] for r in rows], dtype=float)
    return df, P


# ------------------------------------------------------------------------------------------------------------
# Metrik
# ------------------------------------------------------------------------------------------------------------
def metrics(actual, pred, labels):
    idx = {l: i for i, l in enumerate(labels)}
    K = len(labels)
    cm = np.zeros((K, K), dtype=int)
    n_unscored = 0
    for a, p in zip(actual, pred):
        if a not in idx:
            continue
        if p not in idx:  # tak diprediksi (NotScored) dihitung salah
            n_unscored += 1
            continue
        cm[idx[a], idx[p]] += 1
    n = len(actual)
    correct = int(np.trace(cm))
    acc = correct / n
    row, col = cm.sum(1), cm.sum(0)
    # Cohen's kappa: (po - pe) / (1 - pe); pe dari marginal (baris tak diprediksi tidak masuk marginal kolom)
    pe = float((row * col).sum()) / (n * n)
    kappa = (acc - pe) / (1 - pe) if pe < 1 else float("nan")
    f1 = []
    for k in range(K):
        tp = cm[k, k]
        prec = tp / col[k] if col[k] else 0.0
        rec = tp / row[k] if row[k] else 0.0
        f1.append(2 * prec * rec / (prec + rec) if (prec + rec) else 0.0)
    return dict(n=n, correct=correct, accuracy=acc, kappa=kappa, macro_f1=float(np.mean(f1)), confusion=cm.tolist(),
                labels=list(labels), not_scored=n_unscored)


def fmt6(x):
    return f"{x:.6f}".replace(".", ",")


def fmt_sci(x):
    return "0" if x == 0 else f"{x:.3e}".replace(".", ",")


# ------------------------------------------------------------------------------------------------------------
# Selisih numerik
# ------------------------------------------------------------------------------------------------------------
def round4(x):
    # sama dengan Rust: (x * 10000.0).round() / 10000.0  ; f64::round = setengah menjauhi nol
    y = np.asarray(x, dtype=float) * 10000.0
    return np.sign(y) * np.floor(np.abs(y) + 0.5) / 10000.0


def lre_stats(x, c, floor_c=None):
    """Mengembalikan dict: n, max_abs, lre_min (None bila semua identik), identical(bool), n_c0_mismatch, n_excluded, n_diff."""
    x = np.asarray(x, dtype=float).ravel()
    c = np.asarray(c, dtype=float).ravel()
    ok = ~(np.isnan(x) | np.isnan(c))
    x, c = x[ok], c[ok]
    d = np.abs(x - c)
    n = x.size
    identical_mask = (x == c)
    n_diff = int((~identical_mask).sum())
    res = dict(n=int(n), max_abs=float(d.max()) if n else float("nan"), n_diff=n_diff)
    use = ~identical_mask
    n_c0 = int((use & (c == 0)).sum())
    use &= (c != 0)
    n_excl = 0
    if floor_c is not None:
        small = use & (np.abs(c) < floor_c)
        n_excl = int(small.sum())
        use &= ~small
    res["n_c0_mismatch"], res["n_excluded"] = n_c0, n_excl
    if use.any():
        rel = d[use] / np.abs(c[use])
        with np.errstate(divide="ignore"):
            lre = -np.log10(rel)
        res["lre_min"] = float(lre.min())
    else:
        res["lre_min"] = None  # tidak ada elemen berbeda yang bisa dihitung
    return res


def fmt_lre(s, dagger=False):
    mark = "†" if dagger else ""
    if s["lre_min"] is None:
        return ("≥ 15 (identik)" + mark) if s["n_diff"] - s["n_c0_mismatch"] - s["n_excluded"] == 0 else "tak terdefinisi"
    return (f"{s['lre_min']:.2f}".replace(".", ",")) + mark


# ------------------------------------------------------------------------------------------------------------
# Tingkat parameter dan vektor (resolusi penuh)
# ------------------------------------------------------------------------------------------------------------
def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def param_level(outdir, k):
    """Bandingkan model ekspor Statify (NB wasm) dengan scikit-learn: kosakata, prior, log-likelihood. Resolusi penuh."""
    mp, sp = os.path.join(outdir, f"model_statify_{k}.json"), os.path.join(outdir, f"sklearn_params_{k}.json")
    if not (os.path.exists(mp) and os.path.exists(sp)):
        return None
    m, s = load_json(mp), load_json(sp)
    t = m["text"]
    st_terms, st_classes = t["terms"], m["target"]["classes"]
    sk_terms, sk_classes = s["vocabulary"], s["classes"]
    out = dict(config=k, vocab_identik=(st_terms == sk_terms), n_terms_statify=len(st_terms), n_terms_sklearn=len(sk_terms),
              kelas_identik=(st_classes == sk_classes))
    if not (out["vocab_identik"] and out["kelas_identik"]):
        common = [w for w in st_terms if w in set(sk_terms)]
        out["n_common_terms"] = len(common)
        out["only_statify"] = len(set(st_terms) - set(sk_terms))
        out["only_sklearn"] = len(set(sk_terms) - set(st_terms))
        sk_idx = {w: i for i, w in enumerate(sk_terms)}
        st_idx = {w: i for i, w in enumerate(st_terms)}
        cols = [(st_idx[w], sk_idx[w]) for w in common]
    else:
        cols = [(i, i) for i in range(len(st_terms))]
    ci = {c: i for i, c in enumerate(sk_classes)}
    A = np.array([[t["log_weights"][c][a] for a, _ in cols] for c in st_classes])
    B = np.array([[s["feature_log_prob"][ci[c]][b] for _, b in cols] for c in st_classes])
    out["log_weights"] = lre_stats(A, B)
    pri_st = np.array(m["target"]["class_priors"])
    pri_sk = np.exp(np.array([s["class_log_prior"][ci[c]] for c in st_classes]))
    out["class_priors"] = lre_stats(pri_st, pri_sk)
    return out


def vector_level(outdir, k):
    """Bandingkan matriks fitur latih (wasm STWV) dengan matriks scikit-learn/numpy (hanya K4, K5 yang bernilai non-integer)."""
    a, b = os.path.join(outdir, f"stwv_train_statify_{k}.json"), os.path.join(outdir, f"sklearn_train_matrix_{k}.json")
    if not (os.path.exists(a) and os.path.exists(b)):
        return None
    sa, sb = load_json(a), load_json(b)
    if sa["vocabulary"] != sb["vocabulary"]:
        return dict(config=k, vocab_identik=False)
    xs, cs = [], []
    n_pos_mismatch = 0
    for ra, rb in zip(sa["rows"], sb["rows"]):
        da, db = dict((j, v) for j, v in ra), dict((j, v) for j, v in rb)
        for j in set(da) | set(db):
            if j in da and j in db:
                xs.append(da[j]); cs.append(db[j])
            else:
                n_pos_mismatch += 1
    st = lre_stats(np.array(xs), np.array(cs))
    return dict(config=k, vocab_identik=True, n_rows=len(sa["rows"]), elemen_tak_nol_bersama=len(xs), posisi_tak_nol_beda=n_pos_mismatch, **st)


# ------------------------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="pilkada")
    ap.add_argument("--outdir", default=None)
    ap.add_argument("--weka-dir", default=None, help="folder berisi pred_<K>.csv WEKA (default ../weka/out/<dataset>)")
    ap.add_argument("--weka-ids", default=None, help="CSV Id uji urut baris ARFF (default ../weka/data/<dataset>_test_ids.csv)")
    ap.add_argument("--configs", default=None)
    a = ap.parse_args()
    ds = a.dataset
    outdir = a.outdir or (os.path.join(HERE, "out") if ds == "pilkada" else os.path.join(HERE, "out", ds))
    weka_dir = a.weka_dir or os.path.join(HERE, "..", "weka", "out", ds)
    weka_ids = a.weka_ids or os.path.join(HERE, "..", "weka", "data", f"{ds}_test_ids.csv")
    configs = a.configs.split(",") if a.configs else [k for k in CONFIG_ORDER if os.path.exists(os.path.join(outdir, f"pred_statify_{k}.csv"))]

    md, js = [], OrderedDict(dataset=ds, configs=OrderedDict())
    P = lambda s="": md.append(s)

    perangkat_rows, sim_rows, notes = [], [], []
    classes_ref = None
    cms = []
    for k in configs:
        st_path = os.path.join(outdir, f"pred_statify_{k}.csv")
        if not os.path.exists(st_path):
            continue
        st, classes, Pst = read_pred(st_path)
        classes_ref = classes_ref or classes
        n = len(st)
        entry = js["configs"].setdefault(k, OrderedDict())
        devices = OrderedDict([("Statify", (st, Pst))])
        sk_path = os.path.join(outdir, f"pred_sklearn_{k}.csv")
        if os.path.exists(sk_path):
            sk, sk_classes, Psk = read_pred(sk_path)
            assert sk_classes == classes, "urutan kelas sklearn != Statify"
            assert list(sk["Id"]) == list(st["Id"]), "Id sklearn != Statify"
            devices["scikit-learn"] = (sk, Psk)
        wk_name = WEKA_MAP.get(k)
        wk_path = os.path.join(weka_dir, f"pred_{wk_name}.csv") if wk_name else None
        if wk_path and os.path.exists(wk_path) and os.path.exists(weka_ids):
            wk, Pwk = read_weka(wk_path, weka_ids, classes)
            assert list(wk["Id"]) == list(st["Id"]), f"Id WEKA != Statify ({k})"
            assert list(wk["actual"]) == list(st["actual"]), f"kelas aktual WEKA != Statify ({k})"
            devices["WEKA"] = (wk, Pwk)

        for dev, (df, _) in devices.items():
            m = metrics(df["actual"].tolist(), df["pred"].tolist(), classes)
            entry.setdefault("metrics", OrderedDict())[dev] = m
            perangkat_rows.append(f"| {k} | {dev} | {fmt6(m['accuracy'])} | {fmt6(m['kappa'])} | {fmt6(m['macro_f1'])} |")
            cms.append((k, dev, m))

        # --- kesamaan: Statify vs pembanding
        for dev in [d for d in devices if d != "Statify"]:
            df, Pc = devices[dev]
            same = int((st["pred"].to_numpy() == df["pred"].to_numpy()).sum())
            diff_ids = st["Id"][st["pred"].to_numpy() != df["pred"].to_numpy()].tolist()
            ok_prob, reason = True, ""
            if dev == "WEKA":
                if k in ("K3", "K3w"):
                    ok_prob, reason = False, "ComplementNaiveBayes WEKA mengeluarkan distribusi 0/1 (bukan softmax skor), tidak setara dengan posterior Statify"
                elif k[-1] not in "wm":
                    ok_prob, reason = False, "kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w"
                elif ds != "pilkada":  # pada dataset tak seimbang prior berbeda
                    ok_prob, reason = False, "prior kelas Statify = count/N (tanpa Laplace) vs WEKA (n_c+1)/(N+K); hanya setara pada kelas seimbang"
            rowname = f"| {k} | {dev} | {same}/{n} | "
            rec = dict(pembanding=dev, kelas_sama=same, n=n, kelas_beda_Id=diff_ids[:50])
            if ok_prob:
                x = Pst
                c = Pc
                s_abs = lre_stats(x, c)  # galat absolut terhadap c tak dibulatkan
                s_lre = lre_stats(x, round4(c), floor_c=(1e-10 if dev == "WEKA" else None))
                rec.update(max_abs=s_abs["max_abs"], lre=s_lre, n_elem=s_abs["n"])
                maxabs = fmt_sci(s_abs["max_abs"])
                sim_rows.append(rowname + f"{maxabs} | {fmt_lre(s_lre, dagger=True)} |")
                if s_lre["n_diff"]:
                    notes.append(f"{k} vs {dev}: {s_lre['n_diff']} dari {s_lre['n']} elemen probabilitas tidak persis sama dengan round4(c) "
                                 f"(c=0 berbeda: {s_lre['n_c0_mismatch']}, dikeluarkan karena |c|<1e-10: {s_lre['n_excluded']}).")
            else:
                rec.update(tidak_sebanding=reason)
                # tetap catat kelas sama; probabilitas tidak dibandingkan
                sim_rows.append(rowname + f"tidak dapat dibandingkan ({reason}) | tidak dapat dibandingkan |")
            entry.setdefault("kesamaan", OrderedDict())[dev] = rec

    # --- scikit-learn vs WEKA pada konfigurasi yang sah (informasi tambahan, resolusi penuh)
    extra_rows = []
    for k in configs:
        wk_name = WEKA_MAP.get(k)
        sk_path, wk_path = os.path.join(outdir, f"pred_sklearn_{k}.csv"), (os.path.join(weka_dir, f"pred_{wk_name}.csv") if wk_name else "")
        if wk_name and os.path.exists(sk_path) and os.path.exists(wk_path) and os.path.exists(weka_ids) and k in ("K1w", "K5w", "K1m", "K5m") and ds == "pilkada":
            sk, cls, Psk = read_pred(sk_path)
            wk, Pwk = read_weka(wk_path, weka_ids, cls)
            same = int((sk["pred"].to_numpy() == wk["pred"].to_numpy()).sum())
            s = lre_stats(Psk, Pwk, floor_c=1e-10)
            extra_rows.append(f"| {k} | scikit-learn vs WEKA (resolusi penuh) | {same}/{len(sk)} | {fmt_sci(s['max_abs'])} | {fmt_lre(s)} |")
            js["configs"][k]["sklearn_vs_weka"] = dict(kelas_sama=same, max_abs=s["max_abs"], lre=s)

    # --- tingkat parameter dan vektor
    plev, vlev = [], []
    for k in configs:
        r = param_level(outdir, k)
        if r:
            plev.append(r)
            js["configs"].setdefault(k, OrderedDict())["parameter_level"] = r
        v = vector_level(outdir, k)
        if v:
            vlev.append(v)
            js["configs"].setdefault(k, OrderedDict())["vector_level"] = v

    # ------------------------------ keluaran markdown ------------------------------
    P(f"### Tabel metrik per konfigurasi dan perangkat — dataset `{ds}` (n uji = {len(st)})")
    P()
    P("| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |")
    P("|---|---|---|---|---|")
    md.extend(perangkat_rows)
    P()
    P("### Tabel kesamaan (Statify terhadap pembanding)")
    P()
    P(f"| Konfigurasi | Pembanding | Kelas prediksi sama (x/{len(st)}) | Galat absolut maksimum probabilitas | LRE minimum |")
    P("|---|---|---|---|---|")
    md.extend(sim_rows)
    if extra_rows:
        P()
        P("Tambahan (tanpa Statify): scikit-learn terhadap WEKA pada resolusi penuh")
        P()
        P("| Konfigurasi | Pembanding | Kelas prediksi sama | Galat absolut maksimum probabilitas | LRE minimum |")
        P("|---|---|---|---|---|")
        md.extend(extra_rows)
    P()
    P("† Probabilitas Statify dari Apply Model dibulatkan 4 desimal oleh wasm (round4), sehingga LRE dihitung terhadap round4(c); "
      "galat absolut dihitung terhadap c yang tidak dibulatkan (batas teoretis 5,0e-5). Untuk WEKA elemen dengan |c| < 1e-10 tidak diikutkan dalam LRE "
      "(WEKA mencetak 16 desimal).")
    if notes:
        P()
        P("Catatan elemen tidak identik:")
        for t in notes:
            P(f"- {t}")
    if plev:
        P()
        P("### Tingkat parameter model (resolusi penuh): model ekspor Statify (wasm NB) vs `feature_log_prob_` scikit-learn")
        P()
        P("| Konfigurasi | Kosakata identik | Jumlah kata | Besaran | Elemen | Galat absolut maksimum | LRE minimum |")
        P("|---|---|---|---|---|---|---|")
        for r in plev:
            for nm, key in (("log-likelihood (log_weights)", "log_weights"), ("prior kelas", "class_priors")):
                s = r[key]
                P(f"| {r['config']} | {'ya' if r['vocab_identik'] else 'TIDAK'} | {r['n_terms_statify']} | {nm} | {s['n']} | {fmt_sci(s['max_abs'])} | {fmt_lre(s)} |")
    if vlev:
        P()
        P("### Tingkat vektor (resolusi penuh): matriks latih STWV (wasm) vs scikit-learn/numpy")
        P()
        P("| Konfigurasi | Kosakata identik | Elemen tak-nol bersama | Posisi tak-nol berbeda | Galat absolut maksimum | LRE minimum |")
        P("|---|---|---|---|---|---|")
        for v in vlev:
            if not v.get("vocab_identik"):
                P(f"| {v['config']} | TIDAK | - | - | - | - |")
            else:
                P(f"| {v['config']} | ya | {v['elemen_tak_nol_bersama']} | {v['posisi_tak_nol_beda']} | {fmt_sci(v['max_abs'])} | {fmt_lre(v)} |")
    P()
    P("### Matriks konfusi (baris = aktual, kolom = prediksi; urutan kelas: " + ", ".join(classes_ref or []) + ")")
    P()
    P("| Konfigurasi | Perangkat | Matriks |")
    P("|---|---|---|")
    for k, dev, m in cms:
        P(f"| {k} | {dev} | {' ; '.join('[' + ', '.join(map(str, r)) + ']' for r in m['confusion'])} |")

    text = "\n".join(md) + "\n"
    with open(os.path.join(outdir, f"compare_{ds}.md"), "w", encoding="utf-8") as f:
        f.write(text)
    with open(os.path.join(outdir, f"compare_{ds}.json"), "w", encoding="utf-8") as f:
        json.dump(js, f, indent=1, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    print(text)


if __name__ == "__main__":
    main()
