# BUGS_WEKA — perilaku yang tampak keliru atau berisiko (tidak diperbaiki)

Format: lokasi, langkah, dampak. Hanya yang ditemukan selama pekerjaan ini; tidak ada kode produksi Statify atau kode WEKA yang diubah.

## B1 — WEKA `ArffLoader` memakai charset bawaan platform
- **Lokasi:** `weka-src.jar` → `weka/core/converters/ArffLoader.java:1226` (`new BufferedReader(new InputStreamReader(in))`, tanpa charset).
- **Langkah:** jalankan filter atau classifier WEKA pada ARFF UTF-8 yang memuat karakter non-ASCII memakai Java 17 di Windows tanpa `-Dfile.encoding=UTF-8` (charset bawaan Cp1252).
- **Dampak:** karakter non-ASCII dibaca sebagai karakter lain → token dan hasil `toLowerCase()` berbeda. Data pilkada memuat 14 tweet non-ASCII (7 latih + 7 uji).
- **Status:** **dugaan dari pembacaan kode, belum direproduksi di Windows** (VM memakai UTF-8 sehingga tidak menunjukkan gejalanya). Mitigasi pada semua perintah di `00_ENV_dan_pemetaan_opsi.md`: `-Dfile.encoding=UTF-8`.

## B2 — `-classifications` menekan ringkasan evaluasi pada CLI
- **Lokasi:** keluaran `weka.classifiers.bayes.NaiveBayesMultinomial` 3.9.6 (bukti: `logs/07_classifications_stdout_K1.log` (hanya blok prediksi) vs `logs/smoke_K1_classify.log` (ringkasan, tanpa opsi tersebut)).
- **Langkah:** `NaiveBayesMultinomial -t train.arff -T test.arff -c first -classifications "weka.classifiers.evaluation.output.prediction.CSV -file pred.csv"`.
- **Dampak:** stdout hanya berisi blok `=== Predictions on test data ===`; tidak ada `=== Error on test data ===`. Bukan galat perhitungan, tetapi mudah terlewat; maka dua perjalanan per konfigurasi.
- **Status:** teramati; penyebab internal tidak diselidiki (bisa jadi perilaku yang disengaja).

## B3 — `NumericToNominal` mengubah nilai tak terlihat di latih menjadi missing
- **Lokasi:** `weka/filters/unsupervised/attribute/NumericToNominal.java:404–407`.
- **Langkah:** terapkan filter batch pada atribut yang di data latih hanya punya satu nilai (mis. kata yang ada di semua dokumen latih → hanya nilai 1) lalu pada data uji yang memuat nilai 0.
- **Dampak:** nilai 0 di data uji menjadi missing → NaiveBayes melewati atribut tersebut. Diperiksa pada `out/<dataset>/train_K2.arff`: **0** atribut bernilai tunggal (`{1}` atau `{0}`) pada pilkada (1043 atribut), SMS (1131) dan SmSA (1004), jadi tidak terpicu.
- **Status:** dibaca dari kode; kondisi pemicu tidak muncul di ketiga dataset ini.

## B4 — `StringToWordVector` gagal bila kata kosakata sama dengan nama atribut kelas
- **Lokasi:** `weka.filters.unsupervised.attribute.StringToWordVector` (pembentukan header keluaran; pesan dari `weka.core.Instances`/pemeriksaan nama unik).
- **Langkah:** ARFF SMS Spam dengan atribut kelas bernama `sentiment` (`@attribute sentiment {ham,spam}`), jalankan K1w/K5w (`-W 1000000 -O ...`). Kata "sentiment" ada di korpus SMS.
- **Dampak:** pengecualian `Attribute names are not unique! Causes: 'sentiment'`; konfigurasi dengan kosakata besar gagal total (K1/K5 dengan W=1000 tidak terkena karena kata itu tidak masuk 1000 teratas). Tidak terjadi pada pilkada/SmSA.
- **Penanganan (bukan perbaikan WEKA):** di `make_arff.py` atribut kelas SMS dinamai `'class label'`; hitungan tidak berubah. Statify tidak menunjukkan gejala serupa (kelas dipisah dari kata).
- **Status:** direproduksi di VM (log awal tertimpa saat dijalankan ulang; kondisi pemicu terkonfirmasi lewat pesan galat dan hilang setelah penggantian nama).

## B5 — Java 17+ tanpa `--add-opens` : `InaccessibleObjectException` dari `WekaPackageClassLoaderManager`
- **Lokasi:** `weka.core.WekaPackageClassLoaderManager` (refleksi pada `java.lang.ClassLoader.defineClass`); dilaporkan pengguna pada `weka.Run ... ComplementNaiveBayes -h` di Windows (Zulu 17); di Java 11 VM berupa peringatan `Illegal reflective access`.
- **Langkah:** `java -cp weka.jar weka.Run weka.classifiers.bayes.ComplementNaiveBayes -h` tanpa `--add-opens=java.base/java.lang=ALL-UNNAMED` pada Java 17+.
- **Dampak:** jejak tumpukan di keluaran; bantuan tetap tercetak (menurut keluaran yang ditempel pengguna). Risiko: pemuatan kelas paket bisa gagal pada konfigurasi lain.
- **Status:** dilaporkan pengguna di percakapan; **tidak ada log di `logs/`** dan belum direproduksi oleh saya (VM memakai Java 11). Mitigasi: opsi `--add-opens` ada di semua perintah bagian 7.

## Catatan perilaku (bukan bug)
- `ComplementNaiveBayes` paket 1.0.3 tidak mengimplementasikan `distributionForInstance` → `-distribution` pada `-classifications` menghasilkan one-hot (`*1,0`). Bukan galat, tetapi probabilitas tidak dapat dibandingkan dengan Statify.
- `ComplementNaiveBayes -N` menormalkan bobot per kelas dan **mengubah prediksi** (K3N ≠ K3 pada tiga dataset); Statify tidak punya padanannya.
- Kosakata `-W 1000` WEKA melebihi 1000 kata karena nilai seri di batas dipertahankan (`DictionaryBuilder.java:1763–1768`): pilkada 1042, SMS 1130, SmSA 1003.
- Rata-rata norma `-N 1` WEKA mencakup dokumen bernorma 0 (`DictionaryBuilder.java:1315–1333`); Statify hanya norma > 0 (`vectorizer.rs:225–240`). Beda 3,1e-03 pada SMS (1 dokumen latih kosong).

## Dugaan yang diuji dan **tidak** terbukti
- Pembacaan `DictionaryBuilder.normalizeInstance` (`DictionaryBuilder.java:1549–1552`: `i--` bila nilai 0) menimbulkan dugaan loop tak berhingga bila ada entri sparse bernilai 0 (mis. IDF = ln(N/N) = 0).
  Diuji dengan ARFF mini (4 dokumen, kata `a` ada di semua dokumen; `-C -I -N 1`): selesai kode keluar 0, kata `a` tidak muncul di keluaran, tanpa hang (`logs/05_bug_idf_nol_normalisasi.log`). **Bukan bug.**

## Statify
Tidak ditemukan perilaku Statify yang tampak salah pada bagian yang dibaca. Perbedaan desain terhadap WEKA (prior tanpa Laplace, pemotongan ketat `wordsToKeep`, rata-rata norma hanya baris norma > 0) dicatat di tabel pemetaan bagian 5, bukan sebagai bug.
