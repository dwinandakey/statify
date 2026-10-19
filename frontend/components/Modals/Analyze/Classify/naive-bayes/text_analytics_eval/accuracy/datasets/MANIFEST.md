# MANIFEST dataset tambahan Track D

Dibuat oleh `download_datasets.py` pada 2026-10-07T21:49:01 (scikit-learn 1.9.1).

## Sumber mentah

| Berkas | URL (belum diverifikasi dari sandbox penulisan; unduhan dilakukan pengguna) | Lisensi | Hasil unduhan / sumber berkas | Bytes | sha256 |
|---|---|---|---|---|---|
| smsspamcollection.zip | https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip | CC BY 4.0 | berkas lokal: `weka/data/sms+spam+collection.zip` (diunduh pengguna) | 203415 | 1587ea43e58e82b14ff1f5425c88e17f8496bfcdb67a583dbff9eefaf9963ce3 |
| train_preprocess.tsv | https://raw.githubusercontent.com/IndoNLP/indonlu/master/dataset/smsa_doc-sentiment-prosa/train_preprocess.tsv | MIT (lisensi repositori IndoNLU) | berkas lokal: `weka/data/train_preprocess.tsv` (diunduh pengguna) | 2186718 | 50f38ceed9b31521bf1581e126620532cc9b790712938159a2cdcf6906977a9b |
| valid_preprocess.tsv | https://raw.githubusercontent.com/IndoNLP/indonlu/master/dataset/smsa_doc-sentiment-prosa/valid_preprocess.tsv | MIT (lisensi repositori IndoNLU) | tidak ada (tidak dipakai) | - | - |
| test_preprocess.tsv | https://raw.githubusercontent.com/IndoNLP/indonlu/master/dataset/smsa_doc-sentiment-prosa/test_preprocess.tsv | MIT (lisensi repositori IndoNLU) | berkas lokal: `weka/data/test_preprocess.tsv` (diunduh pengguna) | 75949 | 4e8016daa8e4e1b193f2a28a79d3a7804dd4e3f926a3ab7e8a64264f5f416a6f |

Halaman sumber: https://archive.ics.uci.edu/dataset/228/sms+spam+collection  (doi 10.24432/C5CC84); https://github.com/IndoNLP/indonlu/tree/master/dataset/smsa_doc-sentiment-prosa  (sebelumnya IndobenchmarkTeam/indonlu)

## Asal berkas mentah dan status verifikasi

- Sandbox penulisan tidak dapat mengunduh (HTTP 403 pada `archive.ics.uci.edu` dan `raw.githubusercontent.com`). Berkas mentah di atas
  BUKAN diunduh oleh skrip ini, melainkan disalin dari `testing/thesis-eval/weka/data/` (diunduh pengguna dan dicatat oleh agen WEKA di
  `weka/00_ENV_dan_pemetaan_opsi.md` bagian 6.1). sha256 ketiga berkas sama dengan yang dicatat agen WEKA.
- `download_datasets.py --download` hanya mencatat hasil unduhan yang sebenarnya; URL pada tabel BELUM diverifikasi dari sandbox.
- Lisensi pada tabel adalah yang tertera pada halaman sumber menurut pengetahuan penulis skrip dan BELUM diverifikasi ulang di sini.
  Untuk SmSA, MIT adalah lisensi repositori IndoNLU; lisensi korpus asal (Purwarianti dan Crisdayanti, 2019) perlu diperiksa pengguna sebelum
  dicantumkan di naskah.
- `valid_preprocess.tsv` (1.260 baris) tidak tersedia dan tidak dipakai (pembagian resmi: latih -> uji).
- CSV turunan SMS Spam dan SmSA identik sha256 dengan CSV pada `weka/data/` (split yang sama dipakai Statify, scikit-learn, dan WEKA).

## Berkas turunan (split)

| Berkas | Jumlah baris data | Sebaran kelas | sha256 |
|---|---|---|---|
| sms_spam_all.csv | 5574 | {'ham': 4827, 'spam': 747} | 532358bbe93a962a9ad1846c3b52cb72df548c45596c19e22575015b1272735c |
| sms_spam_train.csv | 3901 | {'ham': 3378, 'spam': 523} | f9dc63b0562e7857e72f201595d6fdc9c7b284e07de6563054f0c21efd5a8fb7 |
| sms_spam_test.csv | 1673 | {'spam': 224, 'ham': 1449} | 6dddf491bd46418469bdf368f36421ff833fea1e3ad879eca70e577e83f6c6dd |
| smsa_train.csv | 11000 | {'positive': 6416, 'neutral': 1148, 'negative': 3436} | 0b8bbbdc40933afac26bdb586bc47dd10d5f64cb3080a06b0b153431eca7fdaf |
| smsa_test.csv | 500 | {'negative': 204, 'positive': 208, 'neutral': 88} | b1a4d4ca3c75be7b6ab415574e0b05f4e6c38aa2c201f869bc55ff9e38efc5b3 |

## Catatan

- SMS Spam: split stratified 70/30 seed 42 (`train_test_split(test_size=0.30, stratify=label, random_state=42)` pada daftar indeks), urutan asli dipertahankan; Id = nomor baris asli (1-based).
- SmSA: pembagian resmi train -> test; validasi (1.260) tidak dipakai. Id = nomor baris berkas.
- Kolom CSV: `Id,Label,Text` (UTF-8, kutip RFC 4180).
