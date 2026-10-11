# D. Perbandingan akurasi numerik: Statify, scikit-learn, dan WEKA

Dokumen ini melaporkan Track D evaluasi modul Text Analytics Statify: apakah jalur Raw Text Naive Bayes -> Export Model -> Apply Model pada Statify menghasilkan prediksi dan probabilitas yang sama dengan scikit-learn dan WEKA pada data dan konfigurasi yang setara. Semua angka pada tabel berasal dari eksekusi nyata; log mentah ada di `testing/text_analytics_eval/logs/` (nama berawalan `accuracy_`). Seluruh alur juga dijalankan ulang di Windows (laptop skripsi, `run_D.ps1`, Node 24, Python 3.13, scikit-learn 1.9.1) bersama tes Rust `eval_compare` dan Jest konfigurasi produksi; hasilnya sama (kelas prediksi dan metrik identik, hanya dua nilai galat parameter pada K5 yang berbeda pada digit terakhir), lihat bagian 9. Tabel di bawah dibangun dari eksekusi VM dan dicocokkan dengan log Windows.

## 1. Ringkasan

- Prediksi kelas Statify sama dengan scikit-learn pada **seluruh 24 konfigurasi** yang dijalankan (pilkada 13 konfigurasi x 270 dokumen, SMS Spam 7 x 1.673, SmSA 4 x 500; 17.221 prediksi, 0 selisih). Akurasi, Kappa, dan Macro F1 identik sampai 6 desimal pada semuanya.
- Probabilitas posterior keluaran Apply Model dibulatkan 4 desimal oleh wasm (`round4`), sehingga galat absolut maksimum terhadap scikit-learn selalu di bawah atau sama dengan 5,0e-5 (batas pembulatan) dan LRE terhadap `round4` scikit-learn adalah "≥ 15 (identik)". Untuk memeriksa presisi penuh, parameter model Statify (log-likelihood dan prior) dibandingkan langsung dengan `feature_log_prob_` scikit-learn: galat absolut maksimum 1,776e-15 pada VM (2,665e-15 pada Windows, konfigurasi K5), LRE minimum 15,21 (2.000 sampai 6.202 elemen per konfigurasi). Matriks bobot hasil STWV (K4, K5) cocok dengan scikit-learn/numpy dengan galat absolut maksimum 7,105e-15 (LRE minimum 14,96) dan tanpa selisih posisi elemen tak-nol.
- Terhadap WEKA 3.9.6: pada konfigurasi bawaan Words to Keep = 1.000, kelas prediksi sama pada 264 sampai 267 dari 270 dokumen (pilkada). Sebabnya terukur: WEKA mempertahankan **semua** kata yang berhitungan sama dengan ambang (1.042 kata), Statify memotong tepat 1.000. Bila kosakata disamakan (varian `m`: W = 1.042; varian `w`: seluruh kosakata), kelas prediksi sama pada 270/270 dan metrik identik pada semua pasangan yang diuji.
- K1 dan K3 identik byte demi byte pada pilkada (dua kelas seimbang: Complement setara Multinomial secara analitik). K6 (stopword Indonesia dan stemming Sastrawi) tidak punya pembanding eksternal; ditemukan **selisih kosakata 8 kata antara STWV mandiri dan resep yang dipakai Naive Bayes** (`BUGS_D.md`, D-01).

## 2. Lingkungan dan versi

| Butir | Nilai | Sumber |
|---|---|---|
| wasm STWV (`statify_string_to_word_bg.wasm`) | sha256 `94ef9c8b5693fb779112724225b297e2392a47ca0376ef1239d02332d7146669`, 1.464.043 B | `logs/accuracy_statify_pilkada_vm.txt` |
| wasm Naive Bayes (`public/workers/Classify/NaiveBayes/pkg/wasm_bg.wasm`) | sha256 `163a5b8f482ae84503cb81943dd958033be900dfbef05f8c242977e1615a1fd8`, 1.843.034 B | idem |
| wasm Apply Model (`public/workers/Classify/ApplyModel/pkg/wasm_bg.wasm`) | sha256 `036c9fd9dbd9f14baf84dcb031c1fe5e452f3b990511a39cfb5c66ab6592e3fc`, 1.627.140 B | idem |
| Menjalankan Statify | `testing/text_analytics_eval/headless/statify_wasm.mjs` (Node, tanpa npm); Node v22.23.2 (VM Linux perangkat), v22.22.0 (sandbox cloud) | log |
| Mesin | VM Linux di perangkat (kernel 6.8.0-138, 2 vCPU; CPU yang dilaporkan: AMD Ryzen 5 4600H). Bukan Windows 11 laptop skripsi. | `/proc/cpuinfo` VM |
| scikit-learn | 1.9.1; Python 3.13.16, numpy 2.5.3, scipy 1.18.1, pandas 3.0.5 (sandbox cloud, Linux) | `logs/accuracy_sklearn_*_cloud.txt`, `accuracy/out/sklearn_results.json` |
| Perbandingan (`compare_predictions.py`) | Python 3.10.12, numpy 2.2.6, pandas 2.3.3 (VM) | `logs/accuracy_compare_*_vm.txt` |
| WEKA | 3.9.6, OpenJDK 11.0.32.1 (VM), paket `complementNaiveBayes` 1.0.3; dijalankan agen WEKA (`weka/HASIL_WEKA.md`) | `weka/out/`, `weka/logs/` |

Ketiga wasm di atas sama persis (sha256) pada sandbox cloud dan VM. Seluruh `pred_statify_*.csv` (14 pilkada dan 4 SmSA yang dibandingkan) identik byte demi byte antara Node 22.22 (cloud) dan Node 22.23 (VM) (diverifikasi ulang pada audit dokumen: jalan ulang `run_statify.mjs` di cloud lalu `cmp` terhadap `accuracy/out`, pilkada 14/14, SMS Spam 7/7, SmSA 4/4 identik; `logs/audit_rerun_trackD_cloud.txt`). `pred_sklearn_*.csv`, `sklearn_params_*.json`, dan `sklearn_train_matrix_*.json` (42 berkas di `accuracy/out`) identik byte demi byte dengan hasil jalan ulang `sk_compare.py` di sandbox cloud (scikit-learn 1.9.1; log audit yang sama). Bahwa salinan scikit-learn yang dipakai VM identik dengan salinan cloud tidak dapat diperiksa dari cloud.

## 3. Metode

### 3.1 Data
- **Pilkada**: `Claude outputs/pilkada_train.csv` (630 baris; negative 315, positive 315) dan `pilkada_test.csv` (270 baris; 135 per kelas). Kolom teks `Text Tweet`, kelas `Sentiment`; `Id` dan `Pasangan Calon` dikeluarkan dari prediktor. Berkas data tidak diubah dan tidak ada pembagian baru.
- **SMS Spam (UCI id 228)**: 5.574 pesan (ham 4.827, spam 747); pembagian berstrata 70/30, seed 42 (`train_test_split(test_size=0.30, stratify=label, random_state=42)` pada daftar indeks): 3.901 latih, 1.673 uji. CSV identik dengan yang dipakai agen WEKA.
- **SmSA (IndoNLU)**: pembagian resmi, 11.000 latih dan 500 uji (negative 204, neutral 88, positive 208); data validasi tidak dipakai.
- Asal berkas, sha256, dan lisensi: `accuracy/datasets/MANIFEST.md`. URL unduhan dan lisensi **belum diverifikasi dari sandbox** (jaringan keluar diblokir); berkas mentah diunduh pengguna.

### 3.2 Alur Statify (tanpa menulis ulang rumus)
Setiap konfigurasi dijalankan lewat wasm yang sama dengan aplikasi: (1) Naive Bayes dengan sumber teks Raw Text dan resep STWV dari data latih saja (`new NaiveBayesAnalysis`, pustaka `statify_wasm.mjs` meniru pembentukan payload TypeScript), (2) Export Model (`JSON.stringify(trained_model, null, 2)`), (3) Apply Model pada data uji (`new ApplyModelAnalysis`), (4) `pred_statify_<K>.csv` berisi `Id, kelas_aktual, kelas_prediksi, prob_<kelas>...`. Model akhir dilatih ulang pada seluruh baris latih (validasi holdout hanya untuk evaluasi). Kesetaraan pembangun payload dengan kode TypeScript aplikasi diperiksa dengan tes Jest `payload_equivalence` (3 dari 3 lulus di VM, bagian 9).

### 3.3 Konfigurasi

| Konfigurasi | Statify (STWV + Naive Bayes) | scikit-learn | WEKA 3.9.6 |
|---|---|---|---|
| K1 | Weka bawaan: huruf kecil, delimiter bawaan, Words to Keep (W) = 1.000, TF hitungan, tanpa IDF/normalisasi; Multinomial, alpha 1 | `MultinomialNB(alpha=1)` pada matriks hitungan | `StringToWordVector -W 1000 -O -L -C -M 1` + `NaiveBayesMultinomial` |
| K2 | K1 + Bernoulli | `BernoulliNB(alpha=1, binarize=0)` | `NaiveBayes` pada atribut biner nominal |
| K3 | K1 + Complement | `ComplementNB(alpha=1, norm=False)` | `ComplementNaiveBayes -S 1.0` (probabilitas satu-nol) |
| K4 | scikit-learn standar: hitungan, IDF smooth, L2; Multinomial | `TfidfVectorizer(smooth_idf, l2)` dengan kosakata eksplisit + `MultinomialNB` | tidak ada padanan |
| K5 | Weka: TF log(1+f), IDF ln(N/df), normalisasi panjang dokumen; Multinomial | numpy (log1p x ln(N/df) x normalisasi panjang dokumen) + `MultinomialNB` | `... -C -T -I -N 1` + `NaiveBayesMultinomial` |
| K6 | K1 + stopword Indonesia + stemming Sastrawi | tidak ada padanan | tidak ada padanan (dibandingkan hanya antarjalur Statify) |

Varian kosakata (pilkada; SMS dan SmSA hanya `w`): `w` = Words to Keep 0 (seluruh kosakata, 3.101 kata pada pilkada); `m` = Words to Keep 1.042 (jumlah kata yang dipertahankan WEKA pada `-W 1000 -O`; di WEKA, `K1m`, `K2m`, `K5m` adalah hasil K1, K2, K5 bawaan). Varian ditambahkan karena aturan seri di batas W berbeda (bagian 6.2).

### 3.4 scikit-learn (`accuracy/sk_compare.py`)
Tidak ada kebocoran data: kosakata, IDF, dan parameter hanya dari data latih (fungsi `assert_no_leak` memastikan tiap kata kosakata ada di data latih; dipanggil sebelum pelatihan setiap konfigurasi). Tokenisasi disamakan dengan Statify (huruf kecil, pemisah `[spasi Unicode White_Space . , ; : ' " ( ) ? !]+`, token kosong dibuang). Kosakata dipilih eksplisit dengan aturan Statify (urut total kemunculan menurun, seri menurut urutan alfabet byte, dipotong tepat W) lalu diberikan ke vektorizer; pemilihan `max_features` bawaan scikit-learn berbeda 26 kata pada W = 1.000 (aturan seri berbeda) sehingga tidak dipakai (tercatat sebagai `vocab_vs_native_max_features`). Probabilitas disimpan pada presisi penuh.

### 3.5 Metrik dan LRE
Akurasi, Kappa Cohen (`(po - pe)/(1 - pe)` dari matriks konfusi), dan Macro F1 (rata-rata tak berbobot F1 per kelas), semuanya dihitung dari berkas prediksi oleh `compare_predictions.py` untuk ketiga perangkat dengan kode yang sama; dinyatakan 6 desimal dengan koma desimal. LRE (log relative error) per elemen = -log10(|x - c| / |c|) dengan c nilai pembanding; yang dilaporkan adalah minimum atas semua elemen. Bila x = c LRE dilaporkan "≥ 15 (identik)"; bila c = 0 tidak ada pembagian dengan nol (elemen identik dilewati, elemen berbeda diberi LRE 0). Karena probabilitas Apply Model dibulatkan 4 desimal, LRE dihitung terhadap `round4(c)` (ditandai †) dan galat absolut terhadap c yang tidak dibulatkan.

### 3.6 Empat tingkat perbandingan
1. **Kelas prediksi** (semua konfigurasi dan dataset).
2. **Probabilitas Apply Model** (resolusi 4 desimal; tabel kesamaan).
3. **Parameter model pada presisi penuh**: `log_weights` dan prior pada model hasil Export Model dibandingkan dengan `feature_log_prob_` dan prior scikit-learn.
4. **Vektor**: matriks bobot latih keluaran STWV wasm dibandingkan dengan perhitungan scikit-learn/numpy (K4, K5).

Probabilitas posterior presisi penuh dari sumber Rust diperiksa oleh tes opsional `eval_compare.rs`, yang dijalankan di Windows dan lulus (bagian 9).

## 4. Hasil dataset pilkada (630 latih, 270 uji)

### 4.1 K1 sampai K6 (Words to Keep = 1.000)

Tabel 1. Metrik per konfigurasi dan perangkat.

| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |
|---|---|---|---|---|
| K1 | Statify | 0,762963 | 0,525926 | 0,762963 |
| K1 | scikit-learn | 0,762963 | 0,525926 | 0,762963 |
| K1 | WEKA | 0,762963 | 0,525926 | 0,762846 |
| K2 | Statify | 0,729630 | 0,459259 | 0,729537 |
| K2 | scikit-learn | 0,729630 | 0,459259 | 0,729537 |
| K2 | WEKA | 0,740741 | 0,481481 | 0,740513 |
| K3 | Statify | 0,762963 | 0,525926 | 0,762963 |
| K3 | scikit-learn | 0,762963 | 0,525926 | 0,762963 |
| K3 | WEKA | 0,762963 | 0,525926 | 0,762846 |
| K4 | Statify | 0,766667 | 0,533333 | 0,766510 |
| K4 | scikit-learn | 0,766667 | 0,533333 | 0,766510 |
| K5 | Statify | 0,755556 | 0,511111 | 0,755556 |
| K5 | scikit-learn | 0,755556 | 0,511111 | 0,755556 |
| K5 | WEKA | 0,748148 | 0,496296 | 0,748148 |
| K6 | Statify | 0,722222 | 0,444444 | 0,721577 |

Tabel 2. Kesamaan Statify terhadap pembanding.

| Konfigurasi | Pembanding | Kelas prediksi sama (x/270) | Galat absolut maksimum probabilitas | LRE minimum |
|---|---|---|---|---|
| K1 | scikit-learn | 270/270 | 4,996e-05 | ≥ 15 (identik)† |
| K1 | WEKA | 264/270 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |
| K2 | scikit-learn | 270/270 | 4,979e-05 | ≥ 15 (identik)† |
| K2 | WEKA | 267/270 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |
| K3 | scikit-learn | 270/270 | 4,996e-05 | ≥ 15 (identik)† |
| K3 | WEKA | 264/270 | tidak dapat dibandingkan (ComplementNaiveBayes WEKA mengeluarkan distribusi 0/1 (bukan softmax skor), tidak setara dengan posterior Statify) | tidak dapat dibandingkan |
| K4 | scikit-learn | 270/270 | 4,940e-05 | ≥ 15 (identik)† |
| K5 | scikit-learn | 270/270 | 4,960e-05 | ≥ 15 (identik)† |
| K5 | WEKA | 264/270 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |

† Probabilitas Statify dari Apply Model dibulatkan 4 desimal oleh wasm (round4), sehingga LRE dihitung terhadap round4(c); galat absolut dihitung terhadap c yang tidak dibulatkan (batas teoretis 5,0e-5). Untuk WEKA elemen dengan |c| < 1e-10 tidak diikutkan dalam LRE (WEKA mencetak 16 desimal).

K6 tidak memiliki pembanding scikit-learn maupun WEKA. Statify K6 menghasilkan akurasi 0,722222 (195/270), lebih rendah daripada K1 (0,762963) pada data ini.

### 4.2 Varian kosakata `w` (seluruh kosakata) dan `m` (W = 1.042)

Tabel 3. Metrik varian.

| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |
|---|---|---|---|---|
| K1w | Statify | 0,785185 | 0,570370 | 0,784428 |
| K1w | scikit-learn | 0,785185 | 0,570370 | 0,784428 |
| K1w | WEKA | 0,785185 | 0,570370 | 0,784428 |
| K2w | Statify | 0,759259 | 0,518519 | 0,755145 |
| K2w | scikit-learn | 0,759259 | 0,518519 | 0,755145 |
| K3w | Statify | 0,785185 | 0,570370 | 0,784428 |
| K3w | scikit-learn | 0,785185 | 0,570370 | 0,784428 |
| K3w | WEKA | 0,785185 | 0,570370 | 0,784428 |
| K4w | Statify | 0,766667 | 0,533333 | 0,765247 |
| K4w | scikit-learn | 0,766667 | 0,533333 | 0,765247 |
| K5w | Statify | 0,740741 | 0,481481 | 0,740613 |
| K5w | scikit-learn | 0,740741 | 0,481481 | 0,740613 |
| K5w | WEKA | 0,740741 | 0,481481 | 0,740613 |
| K1m | Statify | 0,762963 | 0,525926 | 0,762846 |
| K1m | scikit-learn | 0,762963 | 0,525926 | 0,762846 |
| K1m | WEKA | 0,762963 | 0,525926 | 0,762846 |
| K2m | Statify | 0,740741 | 0,481481 | 0,740513 |
| K2m | scikit-learn | 0,740741 | 0,481481 | 0,740513 |
| K2m | WEKA | 0,740741 | 0,481481 | 0,740513 |
| K5m | Statify | 0,748148 | 0,496296 | 0,748148 |
| K5m | scikit-learn | 0,748148 | 0,496296 | 0,748148 |
| K5m | WEKA | 0,748148 | 0,496296 | 0,748148 |

Tabel 4. Kesamaan varian.

| Konfigurasi | Pembanding | Kelas prediksi sama (x/270) | Galat absolut maksimum probabilitas | LRE minimum |
|---|---|---|---|---|
| K1w | scikit-learn | 270/270 | 4,990e-05 | ≥ 15 (identik)† |
| K1w | WEKA | 270/270 | 4,990e-05 | ≥ 15 (identik)† |
| K2w | scikit-learn | 270/270 | 4,963e-05 | ≥ 15 (identik)† |
| K3w | scikit-learn | 270/270 | 4,990e-05 | ≥ 15 (identik)† |
| K3w | WEKA | 270/270 | tidak dapat dibandingkan (ComplementNaiveBayes WEKA mengeluarkan distribusi 0/1 (bukan softmax skor), tidak setara dengan posterior Statify) | tidak dapat dibandingkan |
| K4w | scikit-learn | 270/270 | 4,979e-05 | ≥ 15 (identik)† |
| K5w | scikit-learn | 270/270 | 4,998e-05 | ≥ 15 (identik)† |
| K5w | WEKA | 270/270 | 4,999e-05 | ≥ 15 (identik)† |
| K1m | scikit-learn | 270/270 | 4,962e-05 | ≥ 15 (identik)† |
| K1m | WEKA | 270/270 | 4,962e-05 | ≥ 15 (identik)† |
| K2m | scikit-learn | 270/270 | 4,983e-05 | ≥ 15 (identik)† |
| K2m | WEKA | 270/270 | 4,983e-05 | ≥ 15 (identik)† |
| K5m | scikit-learn | 270/270 | 4,989e-05 | ≥ 15 (identik)† |
| K5m | WEKA | 270/270 | 4,989e-05 | ≥ 15 (identik)† |

Tabel 5. Tambahan tanpa Statify: scikit-learn terhadap WEKA pada resolusi penuh (WEKA mencetak probabilitas 16 desimal; berkas ARFF K5 menulis nilai bobot 6 desimal, sehingga K5 dibatasi sekitar 1e-7 oleh data masukan WEKA sendiri; LRE K1 sekitar 9 diduga karena probabilitas yang sangat kecil dicetak WEKA hanya 16 desimal, sehingga digit signifikannya berkurang, dan bukan karena perbedaan rumus).

| Konfigurasi | Pembanding | Kelas prediksi sama | Galat absolut maksimum probabilitas | LRE minimum |
|---|---|---|---|---|
| K1w | scikit-learn vs WEKA (resolusi penuh) | 270/270 | 1,354e-14 | 8,98 |
| K5w | scikit-learn vs WEKA (resolusi penuh) | 270/270 | 3,031e-07 | 5,50 |
| K1m | scikit-learn vs WEKA (resolusi penuh) | 270/270 | 1,310e-14 | 9,79 |
| K5m | scikit-learn vs WEKA (resolusi penuh) | 270/270 | 3,860e-07 | 5,28 |

### 4.3 Tingkat parameter model (presisi penuh)

Tabel 6. Model hasil Export Model Statify (wasm Naive Bayes) terhadap `feature_log_prob_` scikit-learn.

| Konfigurasi | Kosakata identik | Jumlah kata | Besaran | Elemen | Galat absolut maksimum | LRE minimum |
|---|---|---|---|---|---|---|
| K1 | ya | 1000 | log-likelihood (log_weights) | 2000 | 8,882e-16 | 15,66 |
| K1 | ya | 1000 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K2 | ya | 1000 | log-likelihood (log_weights) | 2000 | 8,882e-16 | 15,21 |
| K2 | ya | 1000 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K3 | ya | 1000 | log-likelihood (log_weights) | 2000 | 0 | ≥ 15 (identik) |
| K3 | ya | 1000 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K4 | ya | 1000 | log-likelihood (log_weights) | 2000 | 8,882e-16 | 15,75 |
| K4 | ya | 1000 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K5 | ya | 1000 | log-likelihood (log_weights) | 2000 | 1,776e-15 (VM); 2,665e-15 (Windows) | 15,47 (VM); 15,33 (Windows) |
| K5 | ya | 1000 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K1w | ya | 3101 | log-likelihood (log_weights) | 6202 | 1,776e-15 | 15,48 |
| K1w | ya | 3101 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K2w | ya | 3101 | log-likelihood (log_weights) | 6202 | 8,882e-16 | 15,21 |
| K2w | ya | 3101 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K3w | ya | 3101 | log-likelihood (log_weights) | 6202 | 8,882e-16 | 15,83 |
| K3w | ya | 3101 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K4w | ya | 3101 | log-likelihood (log_weights) | 6202 | 1,776e-15 | 15,54 |
| K4w | ya | 3101 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K5w | ya | 3101 | log-likelihood (log_weights) | 6202 | 1,776e-15 | 15,48 |
| K5w | ya | 3101 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K1m | ya | 1042 | log-likelihood (log_weights) | 2084 | 8,882e-16 | 15,66 |
| K1m | ya | 1042 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K2m | ya | 1042 | log-likelihood (log_weights) | 2084 | 8,882e-16 | 15,21 |
| K2m | ya | 1042 | prior kelas | 2 | 5,551e-17 | 15,95 |
| K5m | ya | 1042 | log-likelihood (log_weights) | 2084 | 1,776e-15 | 15,48 (VM); 15,52 (Windows) |
| K5m | ya | 1042 | prior kelas | 2 | 5,551e-17 | 15,95 |

### 4.4 Tingkat vektor (presisi penuh)

Tabel 7. Matriks bobot latih STWV (wasm) terhadap scikit-learn/numpy.

| Konfigurasi | Kosakata identik | Elemen tak-nol bersama | Posisi tak-nol berbeda | Galat absolut maksimum | LRE minimum |
|---|---|---|---|---|---|
| K4 | ya | 6644 | 0 | 1,110e-16 | 15,43 |
| K5 | ya | 6644 | 0 | 5,329e-15 | 14,96 |
| K4w | ya | 8783 | 0 | 1,110e-16 | 15,53 |
| K5w | ya | 8783 | 0 | 5,329e-15 | 14,99 |
| K5m | ya | 6724 | 0 | 7,105e-15 | 14,96 |

### 4.5 Matriks konfusi K1 sampai K6

Baris = aktual, kolom = prediksi; urutan kelas: negative, positive. Matriks varian ada di `accuracy/out/compare_pilkada.md`.

| Konfigurasi | Perangkat | Matriks |
|---|---|---|
| K1 | Statify | [103, 32] ; [32, 103] |
| K1 | scikit-learn | [103, 32] ; [32, 103] |
| K1 | WEKA | [100, 35] ; [29, 106] |
| K2 | Statify | [96, 39] ; [34, 101] |
| K2 | scikit-learn | [96, 39] ; [34, 101] |
| K2 | WEKA | [96, 39] ; [31, 104] |
| K3 | Statify | [103, 32] ; [32, 103] |
| K3 | scikit-learn | [103, 32] ; [32, 103] |
| K3 | WEKA | [100, 35] ; [29, 106] |
| K4 | Statify | [100, 35] ; [28, 107] |
| K4 | scikit-learn | [100, 35] ; [28, 107] |
| K5 | Statify | [102, 33] ; [33, 102] |
| K5 | scikit-learn | [102, 33] ; [33, 102] |
| K5 | WEKA | [101, 34] ; [34, 101] |
| K6 | Statify | [91, 44] ; [31, 104] |

## 5. Dataset tambahan

### 5.1 SMS Spam (3.901 latih, 1.673 uji; ham 1.449, spam 224 pada data uji)

Konfigurasi K1 sampai K4 (K5 dan K6 tidak dijalankan pada dataset ini sesuai rancangan) ditambah varian `w`. WEKA hanya tersedia untuk K1, K2, K3 dan varian `w`-nya.

Tabel 8. Metrik.

| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |
|---|---|---|---|---|
| K1 | Statify | 0,982666 | 0,925682 | 0,962841 |
| K1 | scikit-learn | 0,982666 | 0,925682 | 0,962841 |
| K1 | WEKA | 0,983264 | 0,928379 | 0,964189 |
| K2 | Statify | 0,987448 | 0,944085 | 0,972036 |
| K2 | scikit-learn | 0,987448 | 0,944085 | 0,972036 |
| K2 | WEKA | 0,988643 | 0,949410 | 0,974699 |
| K3 | Statify | 0,967723 | 0,869222 | 0,934556 |
| K3 | scikit-learn | 0,967723 | 0,869222 | 0,934556 |
| K3 | WEKA | 0,967723 | 0,869222 | 0,934556 |
| K4 | Statify | 0,973102 | 0,874300 | 0,937062 |
| K4 | scikit-learn | 0,973102 | 0,874300 | 0,937062 |
| K1w | Statify | 0,984459 | 0,930906 | 0,965446 |
| K1w | scikit-learn | 0,984459 | 0,930906 | 0,965446 |
| K1w | WEKA | 0,984459 | 0,930906 | 0,965446 |
| K3w | Statify | 0,980873 | 0,917529 | 0,958765 |
| K3w | scikit-learn | 0,980873 | 0,917529 | 0,958765 |
| K3w | WEKA | 0,980873 | 0,917529 | 0,958765 |
| K4w | Statify | 0,958757 | 0,795552 | 0,897343 |
| K4w | scikit-learn | 0,958757 | 0,795552 | 0,897343 |

Tabel 9. Kesamaan.

| Konfigurasi | Pembanding | Kelas prediksi sama (x/1673) | Galat absolut maksimum probabilitas | LRE minimum |
|---|---|---|---|---|
| K1 | scikit-learn | 1673/1673 | 5,000e-05 | ≥ 15 (identik)† |
| K1 | WEKA | 1672/1673 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |
| K2 | scikit-learn | 1673/1673 | 4,987e-05 | ≥ 15 (identik)† |
| K2 | WEKA | 1671/1673 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |
| K3 | scikit-learn | 1673/1673 | 4,999e-05 | ≥ 15 (identik)† |
| K3 | WEKA | 1669/1673 | tidak dapat dibandingkan (ComplementNaiveBayes WEKA mengeluarkan distribusi 0/1 (bukan softmax skor), tidak setara dengan posterior Statify) | tidak dapat dibandingkan |
| K4 | scikit-learn | 1673/1673 | 4,988e-05 | ≥ 15 (identik)† |
| K1w | scikit-learn | 1673/1673 | 4,956e-05 | ≥ 15 (identik)† |
| K1w | WEKA | 1673/1673 | tidak dapat dibandingkan (prior kelas Statify = count/N (tanpa Laplace) vs WEKA (n_c+1)/(N+K); hanya setara pada kelas seimbang) | tidak dapat dibandingkan |
| K3w | scikit-learn | 1673/1673 | 4,987e-05 | ≥ 15 (identik)† |
| K3w | WEKA | 1673/1673 | tidak dapat dibandingkan (ComplementNaiveBayes WEKA mengeluarkan distribusi 0/1 (bukan softmax skor), tidak setara dengan posterior Statify) | tidak dapat dibandingkan |
| K4w | scikit-learn | 1673/1673 | 4,999e-05 | ≥ 15 (identik)† |

Matriks konfusi (urutan kelas: ham, spam).

| Konfigurasi | Perangkat | Matriks |
|---|---|---|
| K1 | Statify | [1433, 16] ; [13, 211] |
| K1 | scikit-learn | [1433, 16] ; [13, 211] |
| K1 | WEKA | [1433, 16] ; [12, 212] |
| K2 | Statify | [1447, 2] ; [19, 205] |
| K2 | scikit-learn | [1447, 2] ; [19, 205] |
| K2 | WEKA | [1448, 1] ; [18, 206] |
| K3 | Statify | [1405, 44] ; [10, 214] |
| K3 | scikit-learn | [1405, 44] ; [10, 214] |
| K3 | WEKA | [1405, 44] ; [10, 214] |
| K4 | Statify | [1447, 2] ; [43, 181] |
| K4 | scikit-learn | [1447, 2] ; [43, 181] |
| K1w | Statify | [1444, 5] ; [21, 203] |
| K1w | scikit-learn | [1444, 5] ; [21, 203] |
| K1w | WEKA | [1444, 5] ; [21, 203] |
| K3w | Statify | [1433, 16] ; [16, 208] |
| K3w | scikit-learn | [1433, 16] ; [16, 208] |
| K3w | WEKA | [1433, 16] ; [16, 208] |
| K4w | Statify | [1449, 0] ; [69, 155] |
| K4w | scikit-learn | [1449, 0] ; [69, 155] |

### 5.2 SmSA (11.000 latih, 500 uji; tiga kelas)

Konfigurasi K1 dan K4 ditambah varian `w`. WEKA tersedia untuk K1 dan K1w.

Tabel 10. Metrik.

| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |
|---|---|---|---|---|
| K1 | Statify | 0,598000 | 0,350288 | 0,531114 |
| K1 | scikit-learn | 0,598000 | 0,350288 | 0,531114 |
| K1 | WEKA | 0,600000 | 0,353504 | 0,533227 |
| K4 | Statify | 0,624000 | 0,377714 | 0,546609 |
| K4 | scikit-learn | 0,624000 | 0,377714 | 0,546609 |
| K1w | Statify | 0,646000 | 0,414140 | 0,565987 |
| K1w | scikit-learn | 0,646000 | 0,414140 | 0,565987 |
| K1w | WEKA | 0,646000 | 0,414140 | 0,565987 |
| K4w | Statify | 0,650000 | 0,405199 | 0,488640 |
| K4w | scikit-learn | 0,650000 | 0,405199 | 0,488640 |

Tabel 11. Kesamaan.

| Konfigurasi | Pembanding | Kelas prediksi sama (x/500) | Galat absolut maksimum probabilitas | LRE minimum |
|---|---|---|---|---|
| K1 | scikit-learn | 500/500 | 4,999e-05 | ≥ 15 (identik)† |
| K1 | WEKA | 499/500 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |
| K4 | scikit-learn | 500/500 | 5,000e-05 | ≥ 15 (identik)† |
| K1w | scikit-learn | 500/500 | 4,993e-05 | ≥ 15 (identik)† |
| K1w | WEKA | 500/500 | tidak dapat dibandingkan (prior kelas Statify = count/N (tanpa Laplace) vs WEKA (n_c+1)/(N+K); hanya setara pada kelas seimbang) | tidak dapat dibandingkan |
| K4w | scikit-learn | 500/500 | 4,998e-05 | ≥ 15 (identik)† |

Matriks konfusi (urutan kelas: negative, neutral, positive).

| Konfigurasi | Perangkat | Matriks |
|---|---|---|
| K1 | Statify | [198, 3, 3] ; [34, 30, 24] ; [109, 28, 71] |
| K1 | scikit-learn | [198, 3, 3] ; [34, 30, 24] ; [109, 28, 71] |
| K1 | WEKA | [198, 3, 3] ; [34, 30, 24] ; [108, 28, 72] |
| K4 | Statify | [183, 1, 20] ; [33, 20, 35] ; [88, 11, 109] |
| K4 | scikit-learn | [183, 1, 20] ; [33, 20, 35] ; [88, 11, 109] |
| K1w | Statify | [197, 1, 6] ; [44, 21, 23] ; [94, 9, 105] |
| K1w | scikit-learn | [197, 1, 6] ; [44, 21, 23] ; [94, 9, 105] |
| K1w | WEKA | [197, 1, 6] ; [44, 21, 23] ; [94, 9, 105] |
| K4w | Statify | [152, 0, 52] ; [28, 2, 58] ; [37, 0, 171] |
| K4w | scikit-learn | [152, 0, 52] ; [28, 2, 58] ; [37, 0, 171] |

## 6. Penjelasan selisih yang teramati

### 6.1 Selisih probabilitas Statify dan scikit-learn
Galat absolut maksimum 4,94e-05 sampai 5,000e-05 adalah galat pembulatan 4 desimal (`round4`) pada Apply Model, bukan perbedaan perhitungan: setelah scikit-learn dibulatkan dengan cara yang sama, seluruh elemen sama (LRE ≥ 15), dan pada presisi penuh parameter berbeda paling banyak 1,776e-15 (Tabel 6).

### 6.2 Selisih Statify dan WEKA pada bawaan W = 1.000
`StringToWordVector` WEKA menerapkan ambang `hitungan >= ambang`, sehingga semua kata yang berhitungan sama dengan ambang ikut dipertahankan: pada data latih pilkada diperoleh 1.042 kata (601 kata berhitungan ≥ 3 dan 441 kata berhitungan tepat 2). Statify mengurutkan berdasarkan total kemunculan menurun, memutus seri menurut urutan alfabet byte, dan memotong tepat pada W = 1.000. Kedua kosakata berbeda sehingga kelas prediksi berbeda pada 3 sampai 6 dari 270 dokumen pada pilkada (K1: 6, K2: 3, K3: 6, K5: 6), pada 1, 2, dan 4 dari 1.673 dokumen pada SMS Spam (K1, K2, K3), dan pada 1 dari 500 dokumen pada SmSA (K1) dan probabilitas tidak dibandingkan (ditandai "tidak dapat dibandingkan (kosakata berbeda ...)"). Dengan kosakata sama (varian `m` dan `w`) selisih ini hilang. Ini perbedaan perilaku fitur "Words to Keep", bukan galat hitung.

### 6.3 Prior kelas
Statify memakai prior `count/N`, sedangkan WEKA `(n_c + 1)/(N + K)`. Keduanya sama hanya bila kelas seimbang (pilkada). Pada SMS Spam dan SmSA probabilitas Statify dan WEKA karenanya tidak dibandingkan walaupun kosakata sama; kelas prediksi tetap sama pada varian `w` (1.673/1.673 dan 500/500).

### 6.4 K1 sama dengan K3
Pada pilkada (dua kelas seimbang, tanpa prior pada Complement) skor Complement dan Multinomial memiliki selisih antarkelas yang sama sehingga kelas dan probabilitas keduanya sama; `pred_statify_K1.csv` dan `pred_statify_K3.csv` identik byte demi byte (sha256 sama) dan K1w = K3w. Pada SMS Spam (kelas tak seimbang) K1 dan K3 berbeda (akurasi 0,982666 vs 0,967723).

### 6.5 ComplementNaiveBayes WEKA
Kelas WEKA tidak mengganti `distributionForInstance`, sehingga keluarannya vektor satu-nol; probabilitas tidak setara dengan posterior Statify dan dilaporkan "tidak dapat dibandingkan". Kelas prediksi WEKA K3 sama dengan Statify pada varian `w` (270/270, 1.673/1.673).

### 6.6 K6: kosakata STWV mandiri berbeda dari resep Naive Bayes
Pada data latih pilkada, resep yang dibuat Naive Bayes (dipakai Apply Model) dan keluaran STWV mandiri (konfigurasi yang sama) masing-masing 1.000 kata tetapi berbeda 8 kata: hanya di STWV `#mencaripemimpin, #menolaklupa, anggap, apa, ilu, tua, ubah, uji`; hanya di Naive Bayes `malu, milu, nanti, nilai, rubah, sadar, sapa, tunjuk`. Pada K1 sampai K5 (tanpa stemming) kosakata keduanya identik. Rincian dan dugaan penyebab (versi `sastrawi-rs` pada `Cargo.lock`) ada di `BUGS_D.md` D-01. Alur Raw Text (K6 pada tabel di atas) memakai wasm Naive Bayes dan Apply Model yang konsisten satu sama lain.

## 7. Interpretasi

Pada seluruh 24 konfigurasi dan tiga dataset, kelas yang diprediksi Statify sama persis dengan scikit-learn (17.221 dari 17.221 prediksi), dan parameter model serta matriks bobot STWV cocok dengan scikit-learn pada sekitar 15 digit signifikan; selisih probabilitas pada keluaran Apply Model sepenuhnya dijelaskan oleh pembulatan 4 desimal. Terhadap WEKA, kelas prediksi sama pada 270/270 (pilkada) bila kosakata disamakan, dan hanya berbeda pada 1 sampai 6 dokumen bila memakai pengaturan Words to Keep bawaan, karena WEKA mempertahankan semua kata seri di batas. Perbedaan yang tersisa antara Statify dan WEKA adalah perbedaan definisi (aturan seri Words to Keep, prior ber-Laplace, keluaran satu-nol pada Complement), bukan galat numerik. Selisih akurasi antarkonfigurasi pada data uji 270 dokumen (galat baku sekitar 2,6 poin persentase pada akurasi 0,76) lebih kecil daripada beberapa selisih yang ditampilkan, sehingga tabel ini tidak dipakai untuk menyimpulkan konfigurasi terbaik.

## 8. Keterbatasan

1. Tabel utama dibangun dari eksekusi Linux (sandbox cloud dan VM). Eksekusi ulang di Windows 11 laptop skripsi (Node 24, Python 3.13, numpy 2.4.4, scikit-learn 1.9.1; `logs/accuracy_*_win.txt`) memberi kelas prediksi dan metrik identik pada ketiga dataset; satu-satunya selisih pada keluaran perbandingan adalah galat parameter K5 (2,665e-15 pada Windows, 1,776e-15 pada VM) dan K5m (LRE 15,52 pada Windows, 15,48 pada VM), yaitu selisih urutan operasi floating-point di numpy/scipy.
2. Biner wasm yang dipakai adalah yang ada di perangkat; apakah dibangun dari sumber Rust saat ini tidak dapat diverifikasi di sini. Tes `eval_compare.rs` dirancang untuk memeriksanya, tetapi tidak dikompilasi dan tidak dijalankan.
3. Probabilitas Apply Model hanya tersedia pada 4 desimal; ketepatan presisi penuh jalur posterior (log-sum-exp) hanya diperiksa secara tidak langsung (kesamaan parameter, vektor, dan hasil `round4`).
4. Satu pembagian data (seed 42 untuk SMS; pembagian tetap untuk pilkada dan SmSA); tidak ada validasi silang dan tidak ada uji signifikansi antarkonfigurasi.
5. Satu dokumen uji pilkada (Id 212) tidak memuat satu pun kata kosakata pada semua konfigurasi (`empty_test_docs` = 1 pada `sklearn_results.json`). Pada model Multinomial/Complement posteriornya 0,5/0,5 dan kedua perangkat memilih kelas pertama (`negative`); pada Bernoulli (K2) posteriornya 0,4986/0,5014 (`positive`) karena kata yang tidak muncul ikut menyumbang skor. Kelas prediksi tetap sama pada kedua perangkat (270/270). Dokumen ini salah klasifikasi pada konfigurasi Multinomial dan Complement.
6. Asal dan lisensi SMS Spam dan SmSA: URL belum diverifikasi dari sandbox, berkas diunduh pengguna; lisensi korpus SmSA perlu diperiksa sebelum dicantumkan.
7. WEKA dijalankan pada OpenJDK 11 di VM Linux, bukan JRE Zulu 17 bawaan WEKA di Windows (`weka/00_ENV_dan_pemetaan_opsi.md`). Menurut `weka/00_ENV_dan_pemetaan_opsi.md` bagian 8.4 (catatan agen WEKA dari transkrip pengguna; log `weka/logs/windows_pilkada/` tidak ada di salinan cloud ini sehingga tidak diverifikasi ulang di sini), konfigurasi pilkada diulang oleh pengguna di Windows/Zulu 17 dan identik; SMS Spam dan SmSA di Windows: NOT RUN. Probabilitas WEKA dicetak 16 desimal dan ARFF K5 menulis 6 desimal, sehingga perbandingan scikit-learn dan WEKA K5 dibatasi sekitar 1e-7 (Tabel 5).
8. K6 hanya dibandingkan antarjalur Statify; scikit-learn tidak memiliki stemmer Sastrawi dan WEKA tidak memakai daftar stopword Statify.
9. Waktu eksekusi pada log adalah waktu sandbox, bukan pengukuran perangkat skripsi, dan tidak dilaporkan di sini.

## 9. Status eksekusi

| Pemeriksaan | Status | Bukti |
|---|---|---|
| Uji kecil pustaka headless (`selftest.mjs`) | DIJALANKAN, lulus (VM) | `logs/accuracy_selftest_vm.txt` |
| Statify pilkada (14 konfigurasi), SMS Spam, SmSA | DIJALANKAN (VM; cloud untuk silang) | `logs/accuracy_statify_{pilkada,sms_spam,smsa}_vm.txt` |
| scikit-learn pilkada, SMS Spam, SmSA | DIJALANKAN (cloud) | `logs/accuracy_sklearn_{pilkada,sms_spam,smsa}_cloud.txt` |
| Perbandingan (`compare_predictions.py`) | DIJALANKAN (VM) | `logs/accuracy_compare_{pilkada,sms_spam,smsa}_vm.txt` |
| Orkestrator dataset tambahan (`run_dataset_eval.mjs`, tanpa langkah scikit-learn karena VM tidak punya scikit-learn) | DIJALANKAN (VM) | `logs/accuracy_{statify,compare}_{sms_spam,smsa}_vm_orch.txt` |
| Kesetaraan payload headless dan TypeScript, NB: payload yang dikirim ke worker identik dengan golden headless (`payload_equivalence.nb.test.ts`) | Lulus [Win] (ts-jest) | `logs/jest_D_vm.json` |
| NB: konfigurasi Text (toRustConfig) memuat daftar stopword Indonesia lengkap dan semua opsi vektorisasi | Lulus [Win] | idem |
| AM: payload ke worker identik dengan golden headless; kolom prediksi sama dengan prediksi golden (`payload_equivalence.am.test.ts`) | Lulus [Win] | idem |
| Tes Rust `eval_compare` (`eval_compare_pilkada_probabilitas_presisi_penuh_dan_wasm_tidak_basi`) | Lulus [Win] | `logs/rust_eval_compare.txt` |
| `run_D.ps1` di Windows (Node 24, Python 3.13) | DIJALANKAN, semua langkah keluar 0 (selftest, Statify, scikit-learn, perbandingan untuk tiga dataset, `eval_compare`, Jest) | `logs/accuracy_*_win.txt` |
| Jest konfigurasi produksi di Windows (`payload_equivalence`) | DIJALANKAN, 3 dari 3 lulus | `logs/jest_D_win.json` |

## 10. Berkas dan cara menjalankan ulang

- Pustaka: `testing/text_analytics_eval/headless/statify_wasm.mjs`, `README.md`, `selftest.mjs`, `make_payload_golden.mjs`, `payload_golden.json`.
- `testing/text_analytics_eval/accuracy/`: `run_statify.mjs`, `sk_compare.py`, `compare_predictions.py`, `download_datasets.py`, `run_dataset_eval.mjs`, `datasets.mjs`, `datasets/` (CSV dan `MANIFEST.md`), `out/` (prediksi, model, parameter, `compare_*.md/.json`).
- Tes: `frontend/components/Modals/Analyze/Classify/naive-bayes/services/__tests__/eval/payload_equivalence.nb.test.ts`, `.../apply-model/services/__tests__/eval/payload_equivalence.am.test.ts`, `.../apply-model/rust/tests/eval_compare.rs` (belum dikompilasi).
- Windows: `powershell -ExecutionPolicy Bypass -File testing\text_analytics_eval\run_D.ps1` (opsi `-SkipRust`, `-SkipJest`, `-SkipDatasets`). Langkah scikit-learn membutuhkan `python` dengan numpy, scipy, pandas, scikit-learn; bila tidak ada, `pred_sklearn_*.csv` yang sudah tersedia dipakai. Rust: dari `apply-model/rust`, `cargo test --test eval_compare -- --nocapture`.
- Temuan: `testing/text_analytics_eval/BUGS_D.md`.
