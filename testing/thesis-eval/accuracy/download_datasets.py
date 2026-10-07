"""download_datasets.py — Track D: mengunduh dataset tambahan, membuat split SEKALI (disimpan sebagai CSV), dan
mencatat URL, lisensi, jumlah baris, serta sha256 ke datasets/MANIFEST.md.

Dataset:
  1. SMS Spam Collection (UCI id 228) — doi 10.24432/C5CC84, lisensi CC BY 4.0, 5.574 pesan (ham/spam).
     Split: stratified 70/30, seed 42 = sklearn.model_selection.train_test_split(test_size=0.30, stratify=label,
     random_state=42) pada daftar indeks baris; urutan asli dipertahankan (indeks diurut naik); Id = nomor baris asli.
     Hasil dipakai SAMA oleh scikit-learn, Statify, dan WEKA (CSV yang sama).
  2. IndoNLU SmSA (doc-sentiment-prosa) — lisensi MIT, 11.000 latih / 1.260 validasi / 500 uji
     (negative/neutral/positive). Pembagian RESMI dipakai apa adanya: train -> test (validasi tidak dipakai).

STATUS PENGUNDUHAN: URL di bawah adalah URL yang diyakini benar; TIDAK dapat diverifikasi dari sandbox sesi
penulisan (jaringan keluar diblokir: HTTP 403 pada archive.ics.uci.edu dan raw.githubusercontent.com).
Skrip mencatat hasil unduhan yang sebenarnya (kode HTTP / galat) di MANIFEST.md. Bila unduhan gagal, gunakan
--from-local DIR berisi: smsspamcollection.zip (atau SMSSpamCollection), train_preprocess.tsv, test_preprocess.tsv
(opsional valid_preprocess.tsv).

Pemakaian:
  python download_datasets.py --download              # unduh ke datasets/raw/ lalu bangun split + MANIFEST
  python download_datasets.py --from-local <folder>   # pakai berkas lokal (tanpa jaringan)
Hanya pustaka standar + scikit-learn (untuk train_test_split; versi dicatat di MANIFEST).
"""
import argparse
import csv
import datetime
import hashlib
import io
import os
import sys
import urllib.request
import zipfile
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "datasets")
RAW = os.path.join(DATA, "raw")
SEED = 42

SOURCES = [
    dict(key="sms_zip", file="smsspamcollection.zip", license="CC BY 4.0",
         url="https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip",
         page="https://archive.ics.uci.edu/dataset/228/sms+spam+collection  (doi 10.24432/C5CC84)"),
    dict(key="smsa_train", file="train_preprocess.tsv", license="MIT (lisensi repositori IndoNLU)",
         url="https://raw.githubusercontent.com/IndoNLP/indonlu/master/dataset/smsa_doc-sentiment-prosa/train_preprocess.tsv",
         page="https://github.com/IndoNLP/indonlu/tree/master/dataset/smsa_doc-sentiment-prosa  (sebelumnya IndobenchmarkTeam/indonlu)"),
    dict(key="smsa_valid", file="valid_preprocess.tsv", license="MIT (lisensi repositori IndoNLU)",
         url="https://raw.githubusercontent.com/IndoNLP/indonlu/master/dataset/smsa_doc-sentiment-prosa/valid_preprocess.tsv",
         page="idem"),
    dict(key="smsa_test", file="test_preprocess.tsv", license="MIT (lisensi repositori IndoNLU)",
         url="https://raw.githubusercontent.com/IndoNLP/indonlu/master/dataset/smsa_doc-sentiment-prosa/test_preprocess.tsv",
         page="idem"),
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(src, log):
    os.makedirs(RAW, exist_ok=True)
    dst = os.path.join(RAW, src["file"])
    try:
        req = urllib.request.Request(src["url"], headers={"User-Agent": "statify-thesis-eval/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r, open(dst, "wb") as f:
            code = r.status
            f.write(r.read())
        log[src["key"]] = f"HTTP {code} (diunduh {datetime.datetime.now().isoformat(timespec='seconds')})"
        return dst
    except Exception as e:  # noqa: BLE001 — catat apa adanya
        log[src["key"]] = f"GAGAL: {type(e).__name__}: {e}"
        return None


def find_local(folder, name):
    for cand in (os.path.join(folder, name), os.path.join(folder, "raw", name)):
        if os.path.exists(cand):
            return cand
    return None


def read_sms(path):
    if path.endswith(".zip"):
        with zipfile.ZipFile(path) as z:
            blob = z.read("SMSSpamCollection").decode("utf-8")
    else:
        blob = open(path, "rb").read().decode("utf-8")
    rows = []
    for line in blob.split("\n"):
        if not line.strip():
            continue
        label, text = line.split("\t", 1)
        rows.append((str(len(rows) + 1), label, text))
    return rows


def read_smsa(path):
    out = []
    with open(path, "r", encoding="utf-8", newline="") as f:
        for line in f.read().split("\n"):
            if not line.strip():
                continue
            text, label = line.rsplit("\t", 1)
            out.append((str(len(out) + 1), label.strip(), text))
    return out


def write_csv(path, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Id", "Label", "Text"])
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--download", action="store_true")
    ap.add_argument("--from-local", default=None)
    a = ap.parse_args()
    os.makedirs(DATA, exist_ok=True)
    log, paths = {}, {}
    for src in SOURCES:
        if a.download:
            paths[src["key"]] = download(src, log)
        elif a.from_local:
            p = find_local(a.from_local, src["file"]) or (find_local(a.from_local, "SMSSpamCollection") if src["key"] == "sms_zip" else None)
            paths[src["key"]] = p
            log[src["key"]] = f"berkas lokal: {p}" if p else "TIDAK ADA di folder lokal"
        else:
            sys.exit("Pilih --download atau --from-local <folder>")
    report = []
    info = {}
    import sklearn
    from sklearn.model_selection import train_test_split

    # --- SMS Spam
    if paths.get("sms_zip"):
        rows = read_sms(paths["sms_zip"])
        y = [r[1] for r in rows]
        tr_i, te_i = train_test_split(list(range(len(rows))), test_size=0.30, stratify=y, random_state=SEED)
        tr_i.sort(); te_i.sort()
        tr, te = [rows[i] for i in tr_i], [rows[i] for i in te_i]
        write_csv(os.path.join(DATA, "sms_spam_all.csv"), rows)
        write_csv(os.path.join(DATA, "sms_spam_train.csv"), tr)
        write_csv(os.path.join(DATA, "sms_spam_test.csv"), te)
        info["sms"] = dict(n_all=len(rows), n_train=len(tr), n_test=len(te), dist_all=dict(Counter(y)),
                           dist_train=dict(Counter(r[1] for r in tr)), dist_test=dict(Counter(r[1] for r in te)),
                           sklearn=sklearn.__version__)
    else:
        report.append("SMS Spam: NOT RUN (berkas mentah tidak tersedia)")

    # --- SmSA
    if paths.get("smsa_train") and paths.get("smsa_test"):
        tr, te = read_smsa(paths["smsa_train"]), read_smsa(paths["smsa_test"])
        va = read_smsa(paths["smsa_valid"]) if paths.get("smsa_valid") else None
        bad = sorted({r[1] for r in tr + te} - {"negative", "neutral", "positive"})
        if bad:
            report.append(f"SmSA: NOT RUN (label tak dikenal {bad}; berkas uji tertutup?)")
        else:
            write_csv(os.path.join(DATA, "smsa_train.csv"), tr)
            write_csv(os.path.join(DATA, "smsa_test.csv"), te)
            info["smsa"] = dict(n_train=len(tr), n_valid=(len(va) if va else None), n_test=len(te),
                                dist_train=dict(Counter(r[1] for r in tr)), dist_test=dict(Counter(r[1] for r in te)))
    else:
        report.append("SmSA: NOT RUN (berkas mentah tidak tersedia)")

    # --- MANIFEST
    now = datetime.datetime.now().isoformat(timespec="seconds")
    L = [f"# MANIFEST dataset tambahan Track D", "", f"Dibuat oleh `download_datasets.py` pada {now} (scikit-learn {sklearn.__version__}).", "",
         "## Sumber mentah", "",
         "| Berkas | URL (belum diverifikasi dari sandbox penulisan) | Lisensi | Hasil unduhan / sumber berkas | Bytes | sha256 |", "|---|---|---|---|---|---|"]
    for src in SOURCES:
        p = paths.get(src["key"])
        L.append(f"| {src['file']} | {src['url']} | {src['license']} | {log.get(src['key'], '-')} | "
                 f"{os.path.getsize(p) if p else '-'} | {sha256(p) if p else '-'} |")
    L += ["", "Halaman sumber: " + "; ".join(f"{s['page']}" for s in SOURCES[:2]), "", "## Berkas turunan (split)", "",
          "| Berkas | Jumlah baris data | Sebaran kelas | sha256 |", "|---|---|---|---|"]
    for name in ("sms_spam_all", "sms_spam_train", "sms_spam_test", "smsa_train", "smsa_test"):
        p = os.path.join(DATA, name + ".csv")
        if os.path.exists(p):
            with open(p, encoding="utf-8", newline="") as f:
                rr = list(csv.reader(f))[1:]
            L.append(f"| {name}.csv | {len(rr)} | {dict(Counter(r[1] for r in rr))} | {sha256(p)} |")
    L += ["", "## Catatan", "",
          "- SMS Spam: split stratified 70/30 seed 42 (`train_test_split(test_size=0.30, stratify=label, random_state=42)` pada daftar indeks), "
          "urutan asli dipertahankan; Id = nomor baris asli (1-based).",
          "- SmSA: pembagian resmi train -> test; validasi (1.260) tidak dipakai. Id = nomor baris berkas.",
          "- Kolom CSV: `Id,Label,Text` (UTF-8, kutip RFC 4180)."]
    if report:
        L += ["", "## Status", ""] + [f"- {r}" for r in report]
    L.append("")
    with open(os.path.join(DATA, "MANIFEST.md"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(L))
    print("\n".join(L))


if __name__ == "__main__":
    main()
