#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""make_arff.py - menyiapkan data ARFF untuk perbandingan Statify vs WEKA 3.9.6.

Dijalankan ulang kapan saja (idempoten). Tidak memakai CSVLoader WEKA (agar teks tetap bertipe string).
Tidak mengubah kode produksi Statify.

Pemakaian (dari folder testing/thesis-eval/weka):
  python make_arff.py                      # pilkada (wajib) + SMS/SmSA bila berkasnya tersedia
  python make_arff.py --verify             # + baca ulang ARFF dengan WEKA (DumpArff) dan bandingkan dengan CSV
  python make_arff.py --java JAVA --weka-jar WEKA_JAR --verify

Masukan yang dicari:
  data/pilkada_train.csv, data/pilkada_test.csv   (kolom Id, Sentiment, Pasangan Calon, Text Tweet; WAJIB; tidak dibagi ulang)
  data/raw/SMSSpamCollection   atau data/raw/smsspamcollection.zip   (UCI SMS Spam Collection)
  data/raw/smsa/train_preprocess.tsv + data/raw/smsa/test_preprocess.tsv   (IndoNLU SmSA, TSV: text<TAB>label)
Keluaran di data/: *.arff, *_ids.csv, weka_roundtrip/*.csv (hasil baca ulang ARFF oleh WEKA), serta sms_spam_all/train/test.csv bila SMS tersedia.
"""
import argparse, csv, io, os, subprocess, sys, zipfile, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
SEED = 42

# ---------------------------------------------------------------- ARFF
_ESC = {"\\": "\\\\", "'": "\\'", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\x0b": "\\v", "\x0c": "\\f", "\x08": "\\b", "\x07": "\\a"}

def arff_quote(s):
    """Kutip nilai string ARFF dengan tanda kutip tunggal. Escape yang dipahami StreamTokenizer Java:
    backslash -> \\\\, kutip tunggal -> \\', CR/LF/TAB -> \\r \\n \\t, karakter kontrol lain -> oktal \\NNN."""
    out = ["'"]
    for ch in s:
        if ch in _ESC:
            out.append(_ESC[ch])
        elif ord(ch) < 0x20 or ord(ch) == 0x7f:
            out.append("\\%03o" % ord(ch))
        else:
            out.append(ch)
    out.append("'")
    return "".join(out)

def write_arff(path, relation, rows, classes, class_attr="sentiment"):
    """rows: list[(text,label)]. Header identik untuk train dan test karena memakai daftar kelas yang sama."""
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("@relation %s\n\n" % relation)
        f.write("@attribute text string\n")
        f.write("@attribute %s {%s}\n\n" % (class_attr, ",".join(classes)))
        f.write("@data\n")
        for text, label in rows:
            assert label in classes, "label di luar header: %r" % label
            f.write("%s,%s\n" % (arff_quote(text), label))

def write_ids(path, ids):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("Id\n")
        for i in ids:
            f.write("%s\n" % i)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()

# ---------------------------------------------------------------- pembaca
def read_pilkada(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        need = ["Id", "Sentiment", "Pasangan Calon", "Text Tweet"]
        if r.fieldnames != need:
            raise SystemExit("kolom tak terduga di %s: %r" % (path, r.fieldnames))
        return [(row["Id"], row["Text Tweet"], row["Sentiment"]) for row in r]

def class_dist(rows):
    d = {}
    for _, _, y in rows:
        d[y] = d.get(y, 0) + 1
    return dict(sorted(d.items()))

# ---------------------------------------------------------------- dataset
def build_pilkada(report):
    classes = ["negative", "positive"]
    tr = read_pilkada(os.path.join(DATA, "pilkada_train.csv"))
    te = read_pilkada(os.path.join(DATA, "pilkada_test.csv"))
    assert len(tr) == 630 and len(te) == 270, (len(tr), len(te))
    assert class_dist(tr) == {"negative": 315, "positive": 315}, class_dist(tr)
    assert class_dist(te) == {"negative": 135, "positive": 135}, class_dist(te)
    for name, rows in (("train", tr), ("test", te)):
        write_arff(os.path.join(DATA, "pilkada_%s.arff" % name), "pilkada_%s" % name, [(t, y) for _, t, y in rows], classes)
        write_ids(os.path.join(DATA, "pilkada_%s_ids.csv" % name), [i for i, _, _ in rows])
    report.append(("pilkada", len(tr), len(te), class_dist(tr), class_dist(te)))
    return {"pilkada": (os.path.join(DATA, "pilkada_train.csv"), os.path.join(DATA, "pilkada_test.csv"), "pilkada")}

def build_sms(report):
    raw = os.path.join(DATA, "raw", "SMSSpamCollection")
    zp = os.path.join(DATA, "raw", "smsspamcollection.zip")
    if os.path.exists(raw):
        blob = open(raw, "rb").read().decode("utf-8")
    elif os.path.exists(zp):
        with zipfile.ZipFile(zp) as z:
            blob = z.read("SMSSpamCollection").decode("utf-8")
    else:
        report.append(("sms_spam", "NOT RUN: data/raw/SMSSpamCollection (atau smsspamcollection.zip) tidak ada"))
        return {}
    rows = []
    for n, line in enumerate(blob.split("\n"), 1):
        if not line.strip():
            continue
        label, text = line.split("\t", 1)
        rows.append((str(len(rows) + 1), text, label))   # label: ham / spam
    classes = ["ham", "spam"]
    trc, tec = os.path.join(DATA, "sms_spam_train.csv"), os.path.join(DATA, "sms_spam_test.csv")
    try:
        import sklearn
        from sklearn.model_selection import train_test_split
        y = [r[2] for r in rows]
        tr_i, te_i = train_test_split(list(range(len(rows))), test_size=0.30, stratify=y, random_state=SEED)
        tr_i.sort(); te_i.sort()   # urutan asli dipertahankan
        tr = [rows[i] for i in tr_i]; te = [rows[i] for i in te_i]
        with open(os.path.join(DATA, "sms_spam_split_info.txt"), "w", encoding="utf-8", newline="\n") as f:
            f.write("scikit-learn %s; train_test_split(test_size=0.30, stratify=label, random_state=%d); n_all=%d n_train=%d n_test=%d\n"
                    % (sklearn.__version__, SEED, len(rows), len(tr), len(te)))
        for name, rr in (("all", rows), ("train", tr), ("test", te)):
            with open(os.path.join(DATA, "sms_spam_%s.csv" % name), "w", encoding="utf-8", newline="") as f:
                w = csv.writer(f); w.writerow(["Id", "Label", "Text"])
                for i, t, l in rr:
                    w.writerow([i, l, t])
    except ImportError:
        if not (os.path.exists(trc) and os.path.exists(tec)):
            report.append(("sms_spam", "NOT RUN: scikit-learn tidak terpasang dan sms_spam_train/test.csv belum ada"))
            return {}
        def rd(p):
            with open(p, "r", encoding="utf-8", newline="") as f:
                r = csv.reader(f); next(r); return [(x[0], x[2], x[1]) for x in r]
        tr, te = rd(trc), rd(tec)   # memakai pembagian yang sudah ada (tidak membagi ulang)
        report.append(("sms_spam", "scikit-learn tidak ada; memakai sms_spam_train/test.csv yang sudah ada"))
    for name, rr in (("train", tr), ("test", te)):
        # nama atribut kelas SMS sengaja 'class label' (berisi spasi, mustahil jadi token): kata "sentiment" ada di korpus SMS dan
        # bertabrakan dengan nama atribut kelas pada StringToWordVector penuh (lihat BUGS_WEKA.md B4)
        write_arff(os.path.join(DATA, "sms_spam_%s.arff" % name), "sms_spam_%s" % name, [(t, l) for _, t, l in rr], classes, "'class label'")
        write_ids(os.path.join(DATA, "sms_spam_%s_ids.csv" % name), [i for i, _, _ in rr])
    report.append(("sms_spam", len(tr), len(te), class_dist(tr), class_dist(te)))
    return {"sms_spam": (os.path.join(DATA, "sms_spam_train.csv"), os.path.join(DATA, "sms_spam_test.csv"), "sms")}

def build_smsa(report):
    trp = os.path.join(DATA, "raw", "smsa", "train_preprocess.tsv")
    tep = os.path.join(DATA, "raw", "smsa", "test_preprocess.tsv")
    if not (os.path.exists(trp) and os.path.exists(tep)):
        report.append(("smsa", "NOT RUN: data/raw/smsa/{train,test}_preprocess.tsv tidak ada"))
        return {}
    def rd(p):
        out = []
        with open(p, "r", encoding="utf-8", newline="") as f:
            for line in f.read().split("\n"):
                if not line.strip():
                    continue
                text, label = line.rsplit("\t", 1)
                out.append((str(len(out) + 1), text, label.strip()))
        return out
    tr, te = rd(trp), rd(tep)
    classes = ["negative", "neutral", "positive"]
    bad = sorted({l for _, _, l in tr + te} - set(classes))
    if bad:
        report.append(("smsa", "NOT RUN: label tak dikenal %r (mis. label test tertutup/masked)" % bad))
        return {}
    for name, rr in (("train", tr), ("test", te)):
        write_arff(os.path.join(DATA, "smsa_%s.arff" % name), "smsa_%s" % name, [(t, l) for _, t, l in rr], classes)
        write_ids(os.path.join(DATA, "smsa_%s_ids.csv" % name), [i for i, _, _ in rr])
        with open(os.path.join(DATA, "smsa_%s.csv" % name), "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f); w.writerow(["Id", "Label", "Text"])
            for i, t, l in rr:
                w.writerow([i, l, t])
    report.append(("smsa", len(tr), len(te), class_dist(tr), class_dist(te)))
    return {"smsa": (os.path.join(DATA, "smsa_train.csv"), os.path.join(DATA, "smsa_test.csv"), "smsa")}

# ---------------------------------------------------------------- verifikasi lewat WEKA
def read_csv_text_label(path, kind):
    out = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        r = csv.reader(f); hdr = next(r)
        if kind == "pilkada":
            ti, li = hdr.index("Text Tweet"), hdr.index("Sentiment")
        else:
            ti, li = hdr.index("Text"), hdr.index("Label")
        for row in r:
            out.append((row[ti], row[li]))
    return out

def verify(java, weka_jar, sets, logdir):
    os.makedirs(logdir, exist_ok=True)
    sep = ";" if os.name == "nt" else ":"
    cp = weka_jar + sep + os.path.join(HERE, "tools")
    ok_all = True
    lines = []
    for name, (trcsv, tecsv, kind) in sets.items():
        for part, csvp in (("train", trcsv), ("test", tecsv)):
            arff = os.path.join(DATA, "%s_%s.arff" % (name, part))
            os.makedirs(os.path.join(DATA, "weka_roundtrip"), exist_ok=True)
            back = os.path.join(DATA, "weka_roundtrip", "%s_%s_roundtrip.csv" % (name, part))
            cmd = [java, "-Dfile.encoding=UTF-8", "-Xmx2g", "-cp", cp, "DumpArff", arff, back]
            p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
            lines.append("$ " + " ".join(cmd)); lines.append(p.stdout); lines.append(p.stderr)
            if p.returncode != 0:
                ok_all = False; lines.append("GAGAL (kode %d)" % p.returncode); continue
            a = read_csv_text_label(csvp, kind)
            with open(back, "r", encoding="utf-8", newline="") as f:
                r = csv.reader(f); next(r); b = [(x[0], x[1]) for x in r]
            same = (a == b)
            first_diff = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), None)
            lines.append("VERIFIKASI %s_%s: n_csv=%d n_arff=%d identik=%s first_diff=%s" % (name, part, len(a), len(b), same, first_diff))
            ok_all &= same and len(a) == len(b)
    with open(os.path.join(logdir, "03_verifikasi_arff.log"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(l for l in lines if l.startswith("VERIFIKASI") or l.startswith("GAGAL")))
    return ok_all

def default_weka_jar():
    cands = [os.environ.get("WEKA_JAR", ""), r"C:\Program Files\Weka-3-9-6\weka.jar",
             os.path.expanduser("~/mnt/Weka-3-9-6/weka.jar")]
    return next((c for c in cands if c and os.path.exists(c)), "weka.jar")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--java", default=os.environ.get("JAVA", "java"))
    ap.add_argument("--weka-jar", default=default_weka_jar())
    a = ap.parse_args()
    os.makedirs(DATA, exist_ok=True)
    report, sets = [], {}
    sets.update(build_pilkada(report))
    sets.update(build_sms(report))
    sets.update(build_smsa(report))
    for r in report:
        print(r)
    for fn in sorted(os.listdir(DATA)):
        p = os.path.join(DATA, fn)
        if os.path.isfile(p) and fn.endswith((".arff", ".csv")):
            print("%s  %s" % (sha256(p)[:16], fn))
    if a.verify:
        ok = verify(a.java, a.weka_jar, sets, os.path.join(HERE, "logs"))
        print("VERIFIKASI SEMUA:", "OK" if ok else "GAGAL")
        sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
