"""sk_compare.py — pembanding scikit-learn untuk Track D (akurasi numerik Statify vs scikit-learn vs WEKA).

Pengganti `Claude outputs/sk_compare.py`. Perbedaan penting dari skrip lama:
  * TIDAK membuat split baru dan TIDAK menulis ulang berkas data. Membaca berkas latih/uji yang sudah ada.
  * Kosakata, df/IDF, dan rata-rata norma HANYA dihitung dari data latih (`fit` pada latih, `transform` pada uji).
    Tidak ada statistik dari data uji yang dipakai (pemeriksaan kebocoran: lihat fungsi `assert_no_leak`).
  * Keluaran per konfigurasi: pred_sklearn_<K>.csv (Id, kelas_aktual, kelas_prediksi, prob_<kelas>... presisi penuh),
    sklearn_params_<K>.json (kosakata, log prior, feature_log_prob_ -> perbandingan tingkat parameter),
    sklearn_train_matrix_<K>.json (matriks fitur latih sparse -> perbandingan tingkat vektor), sklearn_results.json.

Tokenisasi: SENGAJA disamakan dengan Statify supaya selisih angka mencerminkan implementasi, bukan tokenisasi.
  Statify (tokenizer.rs): lowercase Unicode penuh, lalu split regex `[\\s.,;:'"()?!]+` (di Rust `\\s` = White_Space
  Unicode), token kosong dibuang. Di sini diberikan sebagai `tokenizer=` kustom pada CountVectorizer/TfidfVectorizer
  (lowercase=True memakai str.lower(), sama dengan String::to_lowercase untuk teks ini; kelas `\\s` Rust ditulis
  eksplisit karena `\\s` Python memuat U+001C..U+001F yang bukan White_Space).
  Pemilihan kosakata Words-to-Keep (W=1000): total kemunculan menurun, seri -> alfabetis (urutan byte UTF-8) naik,
  dipotong tepat W — aturan yang SAMA dengan Statify (vectorizer.rs). Dipilih eksplisit (bukan max_features=1000)
  karena CountVectorizer(max_features) memutus seri dengan np.argsort quicksort yang tidak stabil; selisih
  kosakata terhadap max_features asli dilaporkan di `vocab_vs_native_max_features`.
  Varian "m" (K1m, K2m, K5m; khusus pilkada): W=1042 = kosakata WEKA (semua kata berhitungan >= 2); batas jatuh di ujung
  kelompok seri sehingga himpunan kata tidak bergantung pada aturan pemutus seri.
  Varian "w" (K1w, K2w, K3w, K4w, K5w): kosakata = seluruh kata (tanpa pemangkasan) => tidak ada aturan seri,
  dan tidak ada kode seleksi kosakata kustom.

K5 (TF log(1+f) x ln(N/df), normalisasi panjang dokumen Weka) tidak ada padanannya di scikit-learn; fitur dihitung
  dengan numpy (independen dari Rust) lalu MultinomialNB scikit-learn dipakai sebagai pengklasifikasi.
K6 (stopword + Sastrawi) tidak dibandingkan ke scikit-learn (tidak ada Sastrawi).

Pemakaian:
  python sk_compare.py [--dataset pilkada|sms_spam|smsa] [--configs K1,K2,...] [--outdir DIR]
Hanya butuh numpy, scipy, pandas, scikit-learn.
"""
import argparse
import csv
import json
import os
import platform
import re
import sys
from collections import Counter

import numpy as np
import pandas as pd
import scipy
import sklearn
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics import accuracy_score, cohen_kappa_score, confusion_matrix, precision_recall_fscore_support
from sklearn.naive_bayes import BernoulliNB, ComplementNB, MultinomialNB

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

DATASETS = {
    "pilkada": dict(train=os.path.join(REPO, "Claude outputs", "pilkada_train.csv"),
                    test=os.path.join(REPO, "Claude outputs", "pilkada_test.csv"),
                    id="Id", text="Text Tweet", label="Sentiment", out=os.path.join(HERE, "out"),
                    default_configs="K1,K2,K3,K4,K5,K1w,K2w,K3w,K4w,K5w,K1m,K2m,K5m"),
    "sms_spam": dict(train=os.path.join(HERE, "datasets", "sms_spam_train.csv"),
                     test=os.path.join(HERE, "datasets", "sms_spam_test.csv"),
                     id="Id", text="Text", label="Label", out=os.path.join(HERE, "out", "sms_spam"),
                     default_configs="K1,K2,K3,K4,K1w,K3w,K4w"),
    "smsa": dict(train=os.path.join(HERE, "datasets", "smsa_train.csv"),
                 test=os.path.join(HERE, "datasets", "smsa_test.csv"),
                 id="Id", text="Text", label="Label", out=os.path.join(HERE, "out", "smsa"),
                 default_configs="K1,K4,K1w,K4w"),
}

# --- Tokenisasi yang sama dengan Statify (tokenizer.rs + delimiter default config.ts) --------------------------
RUST_WHITE_SPACE = "\t\n\x0b\x0c\r \x85\xa0  -     　"
DELIM = re.compile("[" + RUST_WHITE_SPACE + r".,;:'\"()?!" + "]+")


def tokenize_statify(doc):
    """Dokumen sudah di-lowercase oleh vectorizer (lowercase=True); split lalu buang token kosong."""
    return [t for t in DELIM.split(doc) if t]


def utf8_key(term):
    return term.encode("utf-8")


def select_vocabulary(docs, words_to_keep):
    """Kosakata dari DATA LATIH SAJA. words_to_keep=0 -> semua. Aturan seri = Statify (lihat docstring modul)."""
    total = Counter()
    for d in docs:
        total.update(tokenize_statify(d.lower()))
    items = list(total.items())
    if words_to_keep and len(items) > words_to_keep:
        items.sort(key=lambda wc: (-wc[1], utf8_key(wc[0])))
        items = items[:words_to_keep]
    return sorted((w for w, _ in items), key=utf8_key), total


def native_max_features_vocab(docs, words_to_keep):
    """Kosakata CountVectorizer(max_features=W) asli scikit-learn — hanya untuk melaporkan selisih aturan seri."""
    cv = CountVectorizer(tokenizer=tokenize_statify, lowercase=True, token_pattern=None, max_features=words_to_keep)
    cv.fit(docs)
    return set(cv.vocabulary_)


def to_dense_rows(X):
    return X.toarray() if hasattr(X, "toarray") else np.asarray(X)


def sparse_rows(X):
    X = X.tocsr() if hasattr(X, "tocsr") else None
    out = []
    for i in range(X.shape[0]):
        s, e = X.indptr[i], X.indptr[i + 1]
        out.append([[int(j), float(v)] for j, v in zip(X.indices[s:e], X.data[s:e]) if v != 0.0])
    return out


def weka_features(Ctr, Cte, kind):
    """K5: TF log(1+f), IDF ln(N/df) dari latih, normalisasi panjang dokumen Weka (numpy murni). Latih & uji."""
    n = Ctr.shape[0]
    df = (Ctr > 0).sum(axis=0)
    idf = np.log(n / np.maximum(df, 1))

    def tf(C):
        return np.log1p(C)

    Vtr = tf(Ctr) * idf
    Vte = tf(Cte) * idf
    norms_tr = np.sqrt((Vtr ** 2).sum(axis=1))
    pos = norms_tr[norms_tr > 0]
    avg = float(pos.mean()) if pos.size else 0.0  # rata-rata norma latih (baris norma>0) — sama dengan Statify

    def normalize(V):
        nr = np.sqrt((V ** 2).sum(axis=1, keepdims=True))
        factor = np.divide(avg, nr, out=np.zeros_like(nr), where=nr > 0)
        return V * factor

    return normalize(Vtr), normalize(Vte), dict(avg_doc_norm=avg, n_train_zero_norm=int((norms_tr == 0).sum()))


def assert_no_leak(vocab, train_terms):
    """Setiap kata kosakata harus ada di data latih (kosakata tidak boleh berasal dari data uji)."""
    missing = [w for w in vocab if w not in train_terms]
    assert not missing, f"Kebocoran: {len(missing)} kata kosakata tidak ada di data latih"


def metrics(y_true, y_pred, labels):
    P, R, F, S = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    return dict(accuracy=float(accuracy_score(y_true, y_pred)), kappa=float(cohen_kappa_score(y_true, y_pred)),
                macro_f1=float(np.mean(F)), precision=dict(zip(labels, map(float, P))), recall=dict(zip(labels, map(float, R))),
                f1=dict(zip(labels, map(float, F))), support=dict(zip(labels, map(int, S))),
                confusion_actual_x_pred=cm.tolist(), classes=list(labels))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="pilkada", choices=list(DATASETS))
    ap.add_argument("--configs", default=None)
    ap.add_argument("--outdir", default=None)
    ap.add_argument("--no-params", action="store_true", help="jangan tulis sklearn_params/matrix (hemat ruang)")
    a = ap.parse_args()
    ds = DATASETS[a.dataset]
    outdir = a.outdir or ds["out"]
    os.makedirs(outdir, exist_ok=True)
    configs = (a.configs or ds["default_configs"]).split(",")

    tr = pd.read_csv(ds["train"], encoding="utf-8-sig", dtype=str, keep_default_na=False)
    te = pd.read_csv(ds["test"], encoding="utf-8-sig", dtype=str, keep_default_na=False)
    Xtr_t, Xte_t = tr[ds["text"]].tolist(), te[ds["text"]].tolist()
    ytr, yte = tr[ds["label"]].to_numpy(), te[ds["label"]].to_numpy()
    print(f"=== sk_compare.py dataset={a.dataset} train={len(tr)} test={len(te)} configs={configs}")
    print(f"python={sys.version.split()[0]} numpy={np.__version__} scipy={scipy.__version__} pandas={pd.__version__} scikit-learn={sklearn.__version__}")

    results = dict(
        versions=dict(python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__, pandas=pd.__version__,
                      scikit_learn=sklearn.__version__, platform=platform.platform()),
        dataset=a.dataset, train_file=os.path.relpath(ds["train"], REPO), test_file=os.path.relpath(ds["test"], REPO),
        n_train=len(tr), n_test=len(te), train_class=dict(Counter(ytr)), test_class=dict(Counter(yte)),
        tokenization="lowercase (str.lower) + split regex [White_Space.,;:'\"()?!]+ ; token kosong dibuang (sama dengan Statify)",
        configs={},
    )

    cache_vocab = {}
    for k in configs:
        wk = 0 if k.endswith("w") else (1042 if k.endswith("m") else 1000)  # m = 1042 kata (setara kosakata WEKA pada pilkada)
        base = k[:-1] if k[-1] in "wm" else k
        if base not in ("K1", "K2", "K3", "K4", "K5"):
            print(f"{k}: dilewati (tidak ada padanan scikit-learn)")
            continue
        if wk not in cache_vocab:
            vocab, train_terms = select_vocabulary(Xtr_t, wk)
            assert_no_leak(vocab, train_terms)
            cache_vocab[wk] = (vocab, train_terms)
        vocab, train_terms = cache_vocab[wk]
        info = dict(vocab_size=len(vocab), words_to_keep=wk)
        if wk:
            nat = native_max_features_vocab(Xtr_t, wk)
            info["vocab_vs_native_max_features"] = dict(only_ours=len(set(vocab) - nat), only_native=len(nat - set(vocab)))

        # --- fitur ---
        if base == "K4":
            tv = TfidfVectorizer(tokenizer=tokenize_statify, lowercase=True, token_pattern=None, vocabulary=vocab,
                                 use_idf=True, smooth_idf=True, norm="l2", sublinear_tf=False)
            Atr = tv.fit_transform(Xtr_t)  # fit HANYA pada latih
            Ate = tv.transform(Xte_t)
            clf = MultinomialNB(alpha=1.0)
        elif base == "K5":
            cv = CountVectorizer(tokenizer=tokenize_statify, lowercase=True, token_pattern=None, vocabulary=vocab)
            Ctr = cv.fit_transform(Xtr_t).toarray().astype(np.float64)
            Cte = cv.transform(Xte_t).toarray().astype(np.float64)
            Atr, Ate, extra = weka_features(Ctr, Cte, "log1p")
            info.update(extra)
            clf = MultinomialNB(alpha=1.0)
        else:
            cv = CountVectorizer(tokenizer=tokenize_statify, lowercase=True, token_pattern=None, vocabulary=vocab)
            Atr = cv.fit_transform(Xtr_t)
            Ate = cv.transform(Xte_t)
            clf = {"K1": MultinomialNB(alpha=1.0), "K2": BernoulliNB(alpha=1.0, binarize=0.0),
                   "K3": ComplementNB(alpha=1.0, norm=False)}[base]
        clf.fit(Atr, ytr)
        pred = clf.predict(Ate)
        proba = clf.predict_proba(Ate)
        classes = [str(c) for c in clf.classes_]
        m = metrics(yte, pred, list(clf.classes_))
        info.update(m)
        info["empty_test_docs"] = int((np.asarray((Ate != 0).sum(axis=1)).ravel() == 0).sum())

        df = pd.DataFrame({"Id": te[ds["id"]].to_numpy(), "kelas_aktual": yte, "kelas_prediksi": pred})
        for ci, c in enumerate(classes):
            df[f"prob_{c}"] = proba[:, ci]
        df.to_csv(os.path.join(outdir, f"pred_sklearn_{k}.csv"), index=False)  # float -> repr (round-trip penuh)

        if not a.no_params:
            params = dict(config=k, vocabulary=list(vocab), classes=classes,
                          class_log_prior=clf.class_log_prior_.tolist(), feature_log_prob=clf.feature_log_prob_.tolist())
            if hasattr(clf, "feature_count_"):
                params["feature_count"] = np.asarray(clf.feature_count_).tolist()
            json.dump(params, open(os.path.join(outdir, f"sklearn_params_{k}.json"), "w"))
            if base in ("K4", "K5"):
                M = Atr if hasattr(Atr, "tocsr") else __import__("scipy.sparse", fromlist=["csr_matrix"]).csr_matrix(Atr)
                json.dump(dict(config=k, vocabulary=list(vocab), rows=sparse_rows(M)),
                          open(os.path.join(outdir, f"sklearn_train_matrix_{k}.json"), "w"))
        results["configs"][k] = info
        print(f"{k}: acc={m['accuracy']:.6f} kappa={m['kappa']:.6f} macroF1={m['macro_f1']:.6f} vocab={len(vocab)} "
              f"{info.get('vocab_vs_native_max_features', '')} empty_test_docs={info['empty_test_docs']}")

    with open(os.path.join(outdir, "sklearn_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1, ensure_ascii=False)
    print("tulis:", os.path.join(outdir, "sklearn_results.json"))


if __name__ == "__main__":
    main()
