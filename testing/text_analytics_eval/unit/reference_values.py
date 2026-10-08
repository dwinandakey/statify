#!/usr/bin/env python3
"""
reference_values.py - nilai acuan INDEPENDEN untuk tes unit Track A (modul Text Analytics Statify).

Prinsip: seluruh angka dihitung ulang di sini (Python + numpy) dari DEFINISI rumus yang
tertulis di kode sumber / dokumentasi, BUKAN dengan menyalin keluaran Rust. Definisi yang
diimplementasikan (kutipan dari
frontend/public/workers/TextAnalytics/statify-text-core/src/vectorizer.rs, fungsi fit_tokens,
tf_value, idf_value, finish_rows, serta PLAN_FIX.md S3.2):

  Urutan nilai sel : tf -> x idf -> normalisasi baris
  TF  binary       : 1 bila count > 0, selain itu 0
  TF  raw          : count
  TF  log1p        : ln(1 + count)                 (TFTransform Weka)
  TF  sublinear    : 1 + ln(count)  bila count > 0 (sklearn sublinear_tf; alias lama "log")
  TF  normalized   : count / T(d)   T(d) = jumlah SEMUA token dokumen (setelah n-gram, sebelum
                     pemangkasan kosakata); 0 bila T(d) = 0
  IDF none         : 1
  IDF standard     : ln(N / df)
  IDF smooth       : ln((1 + N) / (1 + df)) + 1
  IDF plus1        : ln(N / df) + 1
  Norm none        : (tidak diubah)
  Norm l1          : v / sum|v|     bila sum|v| > 0
  Norm l2          : v / ||v||_2    bila ||v||_2 > 0
  Norm doc_length  : v * avg_norm / ||v||_2 bila ||v||_2 > 0, dengan avg_norm = rata-rata
                     ||v||_2 baris LATIH yang normanya > 0 (dihitung SEBELUM normalisasi,
                     sekali saat fit). 0 bila tidak ada baris bernorma > 0.
  Kosakata         : (1) buang term dengan total count < min_term_freq; (2) bila words_to_keep > 0
                     dan jumlah term > words_to_keep: rangking (weka/sklearn: total count turun;
                     custom: sum_d TF(d) x IDF, IDF = 1 bila none) dengan seri -> alfabetis
                     (byte-wise) naik, lalu potong KETAT; (3) urut kolom alfabetis byte-wise.

Korpus D: D1 "Saya suka makan nasi", D2 "Saya tidak suka nasi!", D3 "Makan, makan, makan".
Delimiter tokenizer: [\\s.,;:'"()?!]+  (sama dengan konfigurasi dasar tes Rust), lowercase.

Pemakaian (dari akar repo):
  python3 testing/text_analytics_eval/unit/reference_values.py            # cetak ke stdout + tulis berkas data
  python3 testing/text_analytics_eval/unit/reference_values.py > testing/text_analytics_eval/logs/reference_values.txt

Berkas data yang ditulis (dipakai tes Rust via include_str!):
  frontend/public/workers/TextAnalytics/statify-text-core/tests/eval_data/
    formula_grid.json        80 kombinasi TF x IDF x Norm pada korpus D
    vocab_limit_cases.json   skenario Words to Keep / Min term frequency (seri)
    pipeline_cases.json      skenario stopword (ID/EN/kustom) dan n-gram 1-5
    stopwords_id.json        salinan INDONESIAN_STOPWORDS dari constants/stopwords.ts
    stopwords_en.json        salinan ENGLISH_STOPWORDS dari constants/stopwords.ts
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[3]
CORE_TESTS_DATA = REPO / "frontend/public/workers/TextAnalytics/statify-text-core/tests/eval_data"
STOPWORDS_TS = REPO / "frontend/components/Modals/Transform/StringToWordVector/constants/stopwords.ts"

DELIM = r"[\s.,;:'\"()?!]+"
CORPUS_D = ["Saya suka makan nasi", "Saya tidak suka nasi!", "Makan, makan, makan"]

TFS = ["binary", "raw", "log1p", "sublinear", "normalized"]
IDFS = ["none", "standard", "smooth", "plus1"]
NORMS = ["none", "l1", "l2", "doc_length"]

WEKA_OK = ({"binary", "raw", "log1p"}, {"none", "standard"}, {"none", "doc_length"})
SKLEARN_OK = ({"binary", "raw", "sublinear"}, {"none", "smooth", "plus1"}, {"none", "l2", "l1"})


def tokenize(doc, lowercase=True):
    text = doc.lower() if lowercase else doc
    return [t for t in re.split(DELIM, text) if t]


def tf_value(method, count, total):
    if method == "binary":
        return 1.0 if count > 0 else 0.0
    if method == "raw":
        return float(count)
    if method == "log1p":
        return math.log(1.0 + count)
    if method == "sublinear":
        return 1.0 + math.log(count) if count > 0 else 0.0
    if method == "normalized":
        return count / total if total > 0 else 0.0
    raise ValueError(method)


def idf_value(method, n, df):
    if method == "none":
        return 1.0
    if method == "standard":
        return math.log(n / df)
    if method == "smooth":
        return math.log((1.0 + n) / (1.0 + df)) + 1.0
    if method == "plus1":
        return math.log(n / df) + 1.0
    raise ValueError(method)


def byte_sorted(items):
    return sorted(items, key=lambda s: s.encode("utf-8"))


def fit_vocabulary(token_docs, standard, tf, idf, keep, min_tf):
    """Pemilihan kosakata menurut aturan terdokumentasi (lihat docstring modul)."""
    n = len(token_docs)
    total, df = {}, {}
    for toks in token_docs:
        for t in toks:
            total[t] = total.get(t, 0) + 1
        for t in set(toks):
            df[t] = df.get(t, 0) + 1
    cand = [t for t in total if total[t] >= min_tf]
    if not cand:
        return None
    if keep > 0 and len(cand) > keep:
        if standard == "custom":
            score = {t: 0.0 for t in total}
            for toks in token_docs:
                cnt = {}
                for t in toks:
                    cnt[t] = cnt.get(t, 0) + 1
                for t, c in cnt.items():
                    score[t] += tf_value(tf, c, len(toks))
            for t in cand:
                score[t] *= idf_value(idf, n, df[t]) if idf != "none" else 1.0
            # skor turun, seri -> alfabetis byte-wise naik
            cand = sorted(cand, key=lambda t: (-score[t], t.encode("utf-8")))
        else:
            cand = sorted(cand, key=lambda t: (-total[t], t.encode("utf-8")))
        cand = cand[:keep]
    return byte_sorted(cand)


def matrix_for(token_docs, vocab, tf, idf, norm):
    n = len(token_docs)
    col = {t: j for j, t in enumerate(vocab)}
    df = np.zeros(len(vocab))
    for toks in token_docs:
        for t in set(toks):
            if t in col:
                df[col[t]] += 1
    idf_vec = np.array([idf_value(idf, n, d) for d in df])
    m = np.zeros((n, len(vocab)))
    for i, toks in enumerate(token_docs):
        cnt = {}
        for t in toks:
            if t in col:
                cnt[t] = cnt.get(t, 0) + 1
        for t, c in cnt.items():
            m[i, col[t]] = tf_value(tf, c, len(toks))
    m = m * idf_vec
    if norm == "l1":
        s = np.abs(m).sum(axis=1, keepdims=True)
        m = np.divide(m, s, out=np.zeros_like(m), where=s > 0)
    elif norm == "l2":
        s = np.sqrt((m ** 2).sum(axis=1, keepdims=True))
        m = np.divide(m, s, out=np.zeros_like(m), where=s > 0)
    elif norm == "doc_length":
        s = np.sqrt((m ** 2).sum(axis=1, keepdims=True))
        pos = s[s > 0]
        avg = pos.mean() if pos.size else 0.0
        m = np.divide(m * avg, s, out=np.zeros_like(m), where=s > 0)
    return m, idf_vec, df


def fmt_row(r):
    return "[" + ", ".join(f"{x:.6f}" for x in r) + "]"


# ---------------------------------------------------------------------------------------------
# 1. Grid rumus pada korpus D
# ---------------------------------------------------------------------------------------------
def section_formulas():
    print("=" * 100)
    print("BAGIAN 1 - Rumus TF x IDF x Normalisasi pada korpus D (N = 3)")
    token_docs = [tokenize(d) for d in CORPUS_D]
    vocab = fit_vocabulary(token_docs, "weka", "raw", "none", 1000, 1)
    print("Token D1..D3:", token_docs)
    print("Kosakata (alfabetis):", vocab)
    print("T(d) =", [len(t) for t in token_docs])
    _, idf_dummy, df = matrix_for(token_docs, vocab, "raw", "standard", "none")
    print("df           =", dict(zip(vocab, df.astype(int).tolist())))
    for name in IDFS:
        print(f"IDF {name:9s} =", fmt_row([idf_value(name, 3, d) for d in df]))
    print("TF untuk count c: ", end="")
    for tf in TFS:
        print(f"{tf}(c=1,T=4)={tf_value(tf,1,4):.6f} {tf}(c=3,T=3)={tf_value(tf,3,3):.6f}; ", end="")
    print()

    entries = []
    for tf in TFS:
        for idf in IDFS:
            for norm in NORMS:
                m, _, _ = matrix_for(token_docs, vocab, tf, idf, norm)
                entries.append({"tf": tf, "idf": idf, "norm": norm, "matrix": m.tolist(),
                                "weka_ok": tf in WEKA_OK[0] and idf in WEKA_OK[1] and norm in WEKA_OK[2],
                                "sklearn_ok": tf in SKLEARN_OK[0] and idf in SKLEARN_OK[1] and norm in SKLEARN_OK[2]})
    out = {"corpus": CORPUS_D, "delimiters": DELIM, "vocabulary": vocab, "entries": entries}
    CORE_TESTS_DATA.mkdir(parents=True, exist_ok=True)
    (CORE_TESTS_DATA / "formula_grid.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"-> formula_grid.json: {len(entries)} kombinasi "
          f"({sum(e['weka_ok'] for e in entries)} sah Weka, {sum(e['sklearn_ok'] for e in entries)} sah sklearn)")

    print("\nMatriks acuan kelompok TF (idf=none, norm=none):")
    for tf in TFS:
        m, _, _ = matrix_for(token_docs, vocab, tf, "none", "none")
        print(f"  TF {tf}:"); [print("    ", fmt_row(r)) for r in m]
    print("\nMatriks acuan kelompok IDF (tf=raw, norm=none):")
    for idf in IDFS[1:]:
        m, _, _ = matrix_for(token_docs, vocab, "raw", idf, "none")
        print(f"  IDF {idf}:"); [print("    ", fmt_row(r)) for r in m]
    print("\nMatriks acuan kelompok Normalisasi (tf=raw, idf=smooth):")
    for norm in NORMS[1:]:
        m, _, _ = matrix_for(token_docs, vocab, "raw", "smooth", norm)
        print(f"  Norm {norm}:"); [print("    ", fmt_row(r)) for r in m]
        if norm == "doc_length":
            m0, _, _ = matrix_for(token_docs, vocab, "raw", "smooth", "none")
            norms = np.sqrt((m0 ** 2).sum(axis=1))
            print("     norma L2 baris sebelum normalisasi:", fmt_row(norms), " avg_norm =", f"{norms[norms>0].mean():.6f}")

    # Verifikasi silang dengan scikit-learn untuk kombinasi yang ada padanannya.
    try:
        from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer
        worst = 0.0
        checked = 0
        for e in entries:
            if not e["sklearn_ok"]:
                continue
            cv = CountVectorizer(lowercase=True, token_pattern=r"[^\s.,;:'\"()?!]+", binary=(e["tf"] == "binary"))
            counts = cv.fit_transform(CORPUS_D)
            assert list(cv.get_feature_names_out()) == vocab
            use_idf = e["idf"] != "none"
            tt = TfidfTransformer(norm=None if e["norm"] == "none" else e["norm"], use_idf=use_idf,
                                  smooth_idf=(e["idf"] == "smooth"), sublinear_tf=(e["tf"] == "sublinear"))
            ref = tt.fit_transform(counts).toarray()
            worst = max(worst, float(np.abs(ref - np.array(e["matrix"])).max()))
            checked += 1
        print(f"\nVerifikasi silang scikit-learn (versi sklearn terpasang): {checked} kombinasi sah-sklearn, "
              f"selisih maksimum = {worst:.3e}")
        assert worst < 1e-12, "implementasi acuan menyimpang dari scikit-learn"
    except ImportError:
        print("\nscikit-learn tidak terpasang: verifikasi silang dilewati")
    return entries


def section_normalized_total():
    """TF normalized memakai T(d) = jumlah SEMUA token dokumen (termasuk n-gram), SEBELUM pemangkasan
    kosakata (komentar di vectorizer.rs, langkah 6). Diuji pada 2 dokumen dengan n-gram 1-2."""
    print("\nTF normalized: T(d) termasuk n-gram dan tidak berubah oleh pemangkasan kosakata")
    docs = ["a b c", "a a"]
    toks = [ngrams(tokenize(d), 1, 2) for d in docs]
    print("  token+ngram:", toks, " T(d) =", [len(t) for t in toks])
    vocab = fit_vocabulary(toks, "custom", "normalized", "none", 1000, 2)   # min_term_freq = 2
    m, _, _ = matrix_for(toks, vocab, "normalized", "none", "none")
    print("  min_term_freq=2 -> kosakata", vocab, " matriks", m.tolist())
    assert vocab == ["a"]
    assert abs(m[0, 0] - 1 / 5) < 1e-15 and abs(m[1, 0] - 2 / 3) < 1e-15
    print("  nilai acuan: [[%.6f], [%.6f]]  (bukan [[1/1],[2/2]] seandainya T(d) dihitung hanya dari kosakata akhir)"
          % (m[0, 0], m[1, 0]))


# ---------------------------------------------------------------------------------------------
# 2. Words to Keep / Min term frequency (seri)
# ---------------------------------------------------------------------------------------------
def vocab_case(name, docs, expected, keep, min_tf=1, standard="weka", tf="raw", idf="none",
               lowercase=True, note=""):
    tokens = [tokenize(d, lowercase) for d in docs]
    got = fit_vocabulary(tokens, standard, tf, idf, keep, min_tf)
    assert got == expected, f"[{name}] harapan manual {expected} != hitungan acuan {got}"
    overrides = {"words_to_keep": keep, "min_term_freq": min_tf, "lowercase": lowercase}
    if standard != "weka":
        overrides.update({"formula_standard": standard, "tf_method": tf, "idf_method": idf})
    elif tf != "raw" or idf != "none":
        overrides.update({"tf_method": tf, "idf_method": idf})
    return {"name": name, "docs": docs, "overrides": overrides, "expected_vocabulary": expected, "note": note}


def section_vocab():
    print("\n" + "=" * 100)
    print("BAGIAN 2 - Words to Keep dan Min term frequency pada kasus nilai seri")
    cases = [
        vocab_case("seri_tiga_arah_di_batas", ["c b a", "z z"], ["a", "z"], keep=2,
                   note="z=2 menang; a=b=c=1 seri -> 'a' (alfabetis), bukan urutan kemunculan (c lebih dulu)"),
        vocab_case("seri_semua_keep3", ["f e d c b a"], ["a", "b", "c"], keep=3,
                   note="enam term seri count 1 -> tiga pertama alfabetis"),
        vocab_case("seri_bukan_urutan_kemunculan", ["zeta alpha mu", "beta"], ["alpha", "beta"], keep=2,
                   note="semua count 1; alfabetis alpha < beta < mu < zeta"),
        vocab_case("seri_bytewise_huruf_besar_dulu", ["Zebra apple Mango"], ["Mango", "Zebra"], keep=2,
                   lowercase=False, note="byte-wise: 'M'(77) < 'Z'(90) < 'a'(97)"),
        vocab_case("seri_potong_ketat_keep1", ["a b c d"], ["a"], keep=1,
                   note="Statify memotong ketat (Weka asli menyimpan semua term seri)"),
        vocab_case("keep_sama_dengan_jumlah_kandidat", CORPUS_D, ["makan", "nasi", "saya", "suka", "tidak"], keep=5),
        vocab_case("keep_melebihi_jumlah_kandidat", CORPUS_D, ["makan", "nasi", "saya", "suka", "tidak"], keep=6),
        vocab_case("keep3_pada_D", CORPUS_D, ["makan", "nasi", "saya"], keep=3,
                   note="makan=4; nasi=saya=suka=2 seri -> nasi, saya"),
        vocab_case("keep3_pada_D_sklearn", CORPUS_D, ["makan", "nasi", "saya"], keep=3, standard="sklearn",
                   idf="smooth", note="sklearn merangking dengan total count seperti Weka"),
        vocab_case("mtf_batas_sama_dipertahankan", ["x x x y y z"], ["x", "y"], keep=1000, min_tf=2,
                   note="count == min_term_freq dipertahankan (>=); z=1 dibuang"),
        vocab_case("mtf3_hanya_x", ["x x x y y z"], ["x"], keep=1000, min_tf=3),
        vocab_case("mtf_memakai_total_bukan_df", ["x x x", "y", "y"], ["x"], keep=1000, min_tf=3,
                   note="x: total 3, df 1 -> lolos; y: total 2, df 2 -> gugur"),
        vocab_case("mtf_lalu_keep_seri", ["a a b b c c d"], ["a", "b"], keep=2, min_tf=2,
                   note="d dibuang oleh mtf; a=b=c=2 seri -> a, b"),
        vocab_case("custom_normalized_beda_dari_weka", ["a", "b b b x x x x x x x"], ["a", "x"], keep=2,
                   standard="custom", tf="normalized", idf="none",
                   note="skor a=1.0, x=0.7, b=0.3; Weka (total count) memilih b,x"),
        vocab_case("weka_pembanding_custom_normalized", ["a", "b b b x x x x x x x"], ["b", "x"], keep=2,
                   note="total count a=1, b=3, x=7"),
        vocab_case("custom_skor_seri_alfabetis", ["d c b a"], ["a", "b"], keep=2,
                   standard="custom", tf="binary", idf="none", note="semua skor 1.0 -> alfabetis"),
    ]
    for c in cases:
        print(f"  {c['name']:38s} keep={c['overrides']['words_to_keep']:<4} mtf={c['overrides']['min_term_freq']} "
              f"-> {c['expected_vocabulary']}   {c['note']}")
    (CORE_TESTS_DATA / "vocab_limit_cases.json").write_text(json.dumps({"delimiters": DELIM, "cases": cases}, indent=1),
                                                            encoding="utf-8")
    print(f"-> vocab_limit_cases.json: {len(cases)} skenario (harapan manual dicocokkan dengan hitungan acuan)")


# ---------------------------------------------------------------------------------------------
# 3. Stopword dan n-gram
# ---------------------------------------------------------------------------------------------
def load_ts_list(name):
    s = STOPWORDS_TS.read_text(encoding="utf-8")
    m = re.search(r"export const %s\s*=\s*\[(.*?)\]\s*;" % name, s, re.S)
    return [json.loads('"%s"' % x) for x in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))]


def ngrams(tokens, lo, hi):
    out = []
    if lo == 1 and hi == 1:
        return list(tokens)
    for n in range(lo, hi + 1):
        for i in range(len(tokens) - n + 1):
            out.append(" ".join(tokens[i:i + n]))
    return out


def section_pipeline():
    print("\n" + "=" * 100)
    print("BAGIAN 3 - Stopword Indonesia/Inggris/kustom dan n-gram 1-5")
    sw_id = load_ts_list("INDONESIAN_STOPWORDS")
    sw_en = load_ts_list("ENGLISH_STOPWORDS")
    (CORE_TESTS_DATA / "stopwords_id.json").write_text(json.dumps(sw_id, ensure_ascii=False), encoding="utf-8")
    (CORE_TESTS_DATA / "stopwords_en.json").write_text(json.dumps(sw_en, ensure_ascii=False), encoding="utf-8")
    print(f"Daftar ID: {len(sw_id)} entri ({len(set(sw_id))} unik); EN: {len(sw_en)} entri ({len(set(sw_en))} unik)")
    for w in ["saya", "tidak", "yang", "dan", "suka", "makan", "nasi", "enak", "kaya"]:
        print(f"   '{w}' di daftar ID: {w in sw_id}", end=";")
    print()
    for w in ["the", "and", "is", "not", "dog", "fox", "quick", "jumps"]:
        print(f"   '{w}' di daftar EN: {w in sw_en}", end=";")
    print()

    def filt(doc, sw, lowercase=True):
        sset = {w.lower() for w in sw}
        return [t for t in tokenize(doc, lowercase) if t.lower() not in sset]

    stop_cases = []
    for name, lang, lst, doc in [
        ("id_kalimat_1", "indonesian", sw_id, "Saya tidak suka makan nasi goreng yang pedas dan asin"),
        ("id_kalimat_2", "indonesian", sw_id, "Pemerintah akan membangun jalan baru di kota itu"),
        ("en_kalimat_1", "english", sw_en, "The quick brown fox jumps over the lazy dog and it is not here"),
        ("en_kalimat_2", "english", sw_en, "This product was very good but the delivery was slow"),
    ]:
        stop_cases.append({"name": name, "method": lang, "doc": doc, "lowercase": True,
                           "expected_tokens": filt(doc, lst)})
    stop_cases.append({"name": "id_huruf_besar_tanpa_lowercase", "method": "indonesian",
                       "doc": "SAYA Tidak Suka NASI", "lowercase": False,
                       "expected_tokens": filt("SAYA Tidak Suka NASI", sw_id, lowercase=False)})
    for c in stop_cases:
        print(f"  {c['name']:34s} {c['doc']!r} -> {c['expected_tokens']}")

    ng_tokens = ["a", "b", "c", "d", "e", "f", "g"]
    ng_cases = []
    for lo in range(1, 6):
        for hi in range(lo, 6):
            exp = ngrams(ng_tokens, lo, hi)
            assert len(exp) == sum(len(ng_tokens) - n + 1 for n in range(lo, hi + 1))
            ng_cases.append({"min": lo, "max": hi, "tokens": ng_tokens, "expected": exp})
    # kasus tepi: token kurang dari ngram_min
    edge = [{"min": 3, "max": 3, "tokens": ["a", "b"], "expected": []},
            {"min": 2, "max": 4, "tokens": ["a", "b", "c"], "expected": ngrams(["a", "b", "c"], 2, 4)},
            {"min": 5, "max": 5, "tokens": ["a", "b", "c", "d", "e"], "expected": ["a b c d e"]}]
    ng_cases += edge
    print(f"  n-gram: {len(ng_cases)} kasus; contoh (1,3) pada 'a'..'g' = {ngrams(ng_tokens,1,3)}")
    print(f"  jumlah n-gram untuk L=7: " + ", ".join(f"({lo},{hi})={len(ngrams(ng_tokens,lo,hi))}"
                                                  for lo, hi in [(1,1),(1,2),(1,3),(1,4),(1,5),(2,2),(3,5)]))

    (CORE_TESTS_DATA / "pipeline_cases.json").write_text(
        json.dumps({"delimiters": DELIM, "stopword_cases": stop_cases, "ngram_cases": ng_cases}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    print("-> pipeline_cases.json, stopwords_id.json, stopwords_en.json ditulis")


def main():
    print("reference_values.py - python", sys.version.split()[0], "numpy", np.__version__)
    section_formulas()
    section_normalized_total()
    section_vocab()
    section_pipeline()
    print("\nSELESAI: semua pernyataan self-check lolos.")


if __name__ == "__main__":
    main()
