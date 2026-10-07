# 00 — Lingkungan WEKA 3.9.6 dan pemetaan opsi Statify ↔ WEKA

Dokumen ini disusun dari perintah yang benar-benar dijalankan (log mentah di `logs/`) dan dari pembacaan kode sumber
(`weka-src.jar` WEKA 3.9.6 dan kode Statify). Tidak ada kode produksi Statify yang diubah. Bagian yang tidak bisa
dijalankan ditandai **NOT RUN** beserta alasannya. Pembaruan terakhir: paket `complementNaiveBayes` (dipasang pengguna) dan dua dataset tambahan (SMS Spam, SmSA) sudah dimasukkan; semua konfigurasi K1, K1w, K2, K3, K3N, K3w, K5, K5w sudah dijalankan pada tiga dataset (bagian 8). Yang masih NOT RUN: eksekusi di Windows/Zulu 17 (bagian 10).

## 1. Lingkungan

| Butir | Nilai | Bukti |
|---|---|---|
| Folder WEKA | `C:\Program Files\Weka-3-9-6\` | `weka.jar` (14.163.954 B), `weka-src.jar` (14.819.298 B) |
| `weka.core.Version` | **3.9.6** | `logs/01_env_java_version.log` |
| java.exe bawaan WEKA | `C:\Program Files\Weka-3-9-6\jre\zulu17.32.13-ca-fx-jre17.0.2-win_x64\bin\java.exe` — Zulu 17.0.2 (`JAVA_VERSION="17.0.2"`, `IMPLEMENTOR_VERSION="Zulu17.32+13-CA"`, OS_NAME Windows) | berkas `release` di folder JRE tersebut (dikutip di `logs/01_env_java_version.log`) |
| `java.exe -version` bawaan | **NOT RUN** — shell lokal sesi ini adalah Linux VM (OpenJDK 11.0.32) sehingga biner Windows tidak dapat dieksekusi; versi di atas dibaca dari berkas `release`, bukan dari keluaran `-version`. | — |
| Java yang dipakai untuk semua uji di sini | OpenJDK 64-Bit Server VM 11.0.32.1 (Ubuntu, Linux x86_64) + `weka.jar` 3.9.6 yang sama | `logs/01_env_java_version.log` |
| Memori | `-Xmx2g` di VM (RAM VM ±3,9 GB; `-Xmx4g` tidak aman di sana). Di Windows 16 GB gunakan `-Xmx4g`. Data ini kecil (≤ 3102 atribut) sehingga 2 GB cukup. | — |
| Perangkat keras/OS target (Windows 11 Home, Ryzen 5 4600H, 16 GB) | diberikan di instruksi, **tidak diverifikasi** dari sesi ini | — |

Catatan lingkungan yang berpengaruh pada hasil:

1. **Wajib `-Dfile.encoding=UTF-8`** pada setiap perintah `java`. `ArffLoader` membuat pembaca dengan `new InputStreamReader(in)` tanpa charset
   (`weka/core/converters/ArffLoader.java:1226`) sehingga memakai charset bawaan platform. Java 17 di Windows memakai Cp1252 (UTF-8 baru
   menjadi bawaan di Java 18+). Data pilkada berisi karakter non-ASCII (7 tweet latih dan 7 tweet uji; mis. `â€¦`), jadi tanpa opsi ini token dan
   `toLowerCase()` bisa berbeda. Lihat juga `BUGS_WEKA.md` butir B1.
2. Keluaran awal `Picked up JAVA_TOOL_OPTIONS: ...` dan peringatan `WARNING: Illegal reflective access` berasal dari lingkungan VM/Java 11, bukan dari WEKA.
   Di Java 17 Windows peringatan itu tidak muncul. Hasil numerik tidak terpengaruh.
3. Perbedaan Java 11 (VM) vs Java 17 (bawaan WEKA) tidak seharusnya mengubah hasil, karena rumus memakai aritmetika `double` dan
   `Math.log/exp`. Namun belum dibuktikan; **agen lain yang menjalankan evaluasi resmi di Windows sebaiknya mengulang
   `run_smoke.sh`-setara (bagian 8) dan membandingkan dengan tabel uji asap di bagian 8.3** untuk memastikan identik.
4. Repositori paket WEKA tidak dapat dijangkau dari sesi ini (HTTP 403 oleh kebijakan jaringan), sehingga `-list-packages` gagal (bagian 2). Paket dan dataset kemudian dipasang/diunduh sendiri oleh pengguna.
5. **Java 17+ langsung (`java -cp ...`) memerlukan `--add-opens=java.base/java.lang=ALL-UNNAMED`.** Pengguna melaporkan bahwa `weka.Run ... ComplementNaiveBayes -h` tetap mencetak bantuan tetapi didahului
   `InaccessibleObjectException` dari `WekaPackageClassLoaderManager` (refleksi `ClassLoader.defineClass`). Di Java 11 (VM ini) gejala yang sama berupa peringatan `Illegal reflective access`. Semua perintah Windows di bagian 7 memakai opsi ini.
   Keluaran yang ditempel pengguna di percakapan **tidak tersimpan sebagai berkas log** (lihat bagian 10, langkah untuk pengguna). Lihat `BUGS_WEKA.md` butir B5.

## 2. Ketersediaan kelas

Setiap kelas dijalankan dengan `-h` (`logs/02b_kelas_h.log`, keluaran lengkap tanpa pemotongan).

| Kelas | Hasil | Catatan |
|---|---|---|
| `weka.filters.unsupervised.attribute.StringToWordVector` | **ada** (exit 0) | opsi lengkap di log |
| `weka.classifiers.bayes.NaiveBayesMultinomial` | **ada** (exit 0) | |
| `weka.classifiers.bayes.NaiveBayes` | **ada** (exit 0) | |
| `weka.filters.unsupervised.attribute.NumericToNominal` | **ada** (exit 0) | |
| `weka.classifiers.bayes.ComplementNaiveBayes` | di `weka.jar` 3.9.6 saja: **TIDAK ADA** — `ClassNotFoundException` (exit 1; `logs/02b_kelas_h.log`). Setelah paket `complementNaiveBayes` 1.0.3 dipasang pengguna: **ada** (bantuan `-N`, `-S 1.0` dilaporkan pengguna; dipakai di K3/K3N/K3w dengan `-cp weka.jar:complementNaiveBayes.jar`). | di `weka-src.jar` hanya ikon `ComplementNaiveBayes.gif`; sumber ada di `C:\Users\DIJASAN\wekafiles\packages\complementNaiveBayes\src\main\java\weka\classifiers\bayes\ComplementNaiveBayes.java` (dibaca) |

**Paket ComplementNaiveBayes.** `java -cp weka.jar weka.core.WekaPackageManager -list-packages all` **gagal** dari sesi ini: repositori
`http://weka.sourceforge.io/packageMetaData/repo.zip` dan `packageList.txt` membalas HTTP 403 (`logs/02_list_packages_all.log`). Pemasangan **dilakukan oleh pengguna** (bukan oleh saya) dan dilaporkan di percakapan:

- Paket: **`complementNaiveBayes` 1.0.3** (metadata resmi: rilis 2013-12-03, mensyaratkan `weka (>=3.7.11)`, penulis kelas Ashraf M. Kibriya; `https://weka.sourceforge.io/packageMetaData/complementNaiveBayes/Latest.html`).
- Lokasi terpasang (dibaca dari sesi ini, tanpa mengubah): `C:\Users\DIJASAN\wekafiles\packages\complementNaiveBayes\` (`complementNaiveBayes.jar`, `src/`, `doc/`, `Description.props`).
- Saya tidak menjalankan pemasangan apa pun. Sumber paket dibaca langsung (bagian 3.3), jadi butir 3c kini **terverifikasi dari sumber**.

## 3. Rumus WEKA 3.9.6 (dibaca dari `weka-src.jar`)

Sumber diekstrak ke folder sementara di luar repo (`~/wsrc/src/main/java/...` di VM). Semua nomor baris di bawah merujuk ke jalur di dalam `weka-src.jar`
(`src/main/java/weka/...`). Notasi: `V` = jumlah kata (atribut non-kelas), `K` = jumlah kelas, `N` = jumlah dokumen latih,
`n_c` = jumlah dokumen kelas c, `N_cw` = jumlah kemunculan kata w pada dokumen kelas c, `x_w` = nilai fitur kata w pada dokumen yang diprediksi.

### 3.1 NaiveBayesMultinomial (`weka/classifiers/bayes/NaiveBayesMultinomial.java`)

| Hal | Rumus | Baris |
|---|---|---|
| Prior kelas — **ada Laplace** | `P(c) = (n_c + 1) / (N + K)`. Setiap `m_probOfClass[c]` diinisialisasi 1,0; `+= weight` per dokumen; lalu `Utils.normalize` membagi dengan jumlahnya. | 190–194, 213, 240 |
| Peluang kata — **Laplace 1** | `P(w|c) = (N_cw + 1) / (Σ_w' N_cw' + V)`. Disimpan sebagai log: `log(count) − log(wordsPerClass + m_numAttributes − 1)`. `m_numAttributes` (baris 179) termasuk atribut kelas, maka `−1` menghasilkan `V` persis (benar untuk kelas di posisi mana pun). | 182–188, 220–221, 232–237 |
| Skor dokumen | `log P(d|c) = Σ_w x_w · log P(w|c)` (hanya entri non-nol; faktorial multinomial dibuang). `x_w` boleh pecahan (dipakai untuk K5), tidak boleh negatif (baris 218–219 melempar pengecualian). | 289–300 |
| Posterior | `m = max_c log P(d|c)`; `p_c = exp(log P(d|c) − m) · P(c)`; lalu dinormalkan `p_c / Σ p`. Jadi prior dikalikan di ruang linear setelah pengurangan max. | 261–269 |
| Kelas prediksi | argmax distribusi oleh kode evaluasi WEKA (`Evaluation`/`Utils.maxIndex`; **baris tidak dibaca**, diasumsikan seri → indeks kelas terkecil menurut urutan header ARFF). | tidak dibaca |

### 3.2 NaiveBayes untuk atribut nominal (`weka/classifiers/bayes/NaiveBayes.java`, `weka/estimators/DiscreteEstimator.java`)

Opsi bawaan (tanpa `-K`, tanpa `-D`): atribut nominal memakai `DiscreteEstimator`.

| Hal | Rumus | Baris |
|---|---|---|
| Estimator atribut nominal | `new DiscreteEstimator(numValues, true)` per (atribut, kelas); `laplace=true` menginisialisasi tiap hitungan = 1 dan jumlah total = `numSymbols` | `NaiveBayes.java:289–292`; `DiscreteEstimator.java:72–83` |
| Peluang atribut — **Laplace 1** | `P(a=v|c) = (count_cv + 1) / (n_c + numValues)`. Untuk atribut biner `{0,1}` hasilnya `(n + 1)/(n_c + 2)` untuk kedua nilai (nilai 0 dan nilai 1 sama-sama ikut menghitung, mirip Bernoulli NB penuh). | `DiscreteEstimator.java:109–112` (addValue), `121–127` (getProbability) |
| Prior kelas — **ada Laplace** | `m_ClassDistribution = new DiscreteEstimator(numClasses, true)` → `P(c) = (n_c + 1)/(N + K)` | `NaiveBayes.java:246, 331, 351` |
| Posterior | `p_c = P(c) · Π_atribut max(1e-75, P(a|c)^bobotAtribut)` (bobot atribut = 1 bila tidak diatur); bila maksimum `< 1e-75` semua dikali `1e75` (anti-underflow); lalu `Utils.normalize`. Dilakukan di ruang linear (bukan log). | `NaiveBayes.java:349–384` |
| Catatan | Atribut kelas tidak ikut dalam perkalian (`enumerateAttributes` melewati kelas). Dalam format sparse, nilai 0 tetap dibaca sebagai nilai "0" sehingga ikut dikalikan. | 353–380 |

### 3.3 ComplementNaiveBayes (paket 1.0.3; `weka/classifiers/bayes/ComplementNaiveBayes.java` di `packages/complementNaiveBayes/src/main/java/`)

Dibaca dari sumber paket. Notasi: `C_cw` = jumlah kemunculan kata w pada semua kelas **selain** c, `ΣC_c = Σ_w C_cw` (total kata di kelas selain c), `α` = parameter `-S`, `V = numAttributes − 1`.

| Hal | Rumus | Baris |
|---|---|---|
| Opsi | `-S` smoothing, bawaan `1.0`; `-N` normalisasi bobot, bawaan **false** | 105, 108 |
| Jumlah penghalus | `sumOfSmoothingParams = (numAttributes − 1)·α = V·α` | 344 |
| Bobot kata | `W_cw = ln( (C_cw + α) / (ΣC_c + α·V) )` (kelas c ≥ 1 pada 381–388; kelas 0 pada 393–402) | 381–402 |
| Normalisasi `-N` | `W_cw ← W_cw / Σ_w' abs(W_cw')` per kelas (hanya bila `-N`) | 406–420 |
| Skor dokumen | `s_c = Σ_w x_w · W_cw` (hanya entri sparse non-nol; `x_w` = nilai fitur apa adanya) | 443–458 |
| Kelas prediksi | **argmin** `s_c`, pembanding `<` ketat → seri jatuh ke indeks kelas terkecil | 462–468 |
| Prior | **tidak ada** (baris `log(probOfClass[c]) − …` dikomentari) | 460 |
| Distribusi probabilitas | kelas **tidak** menimpa `distributionForInstance` (tidak ada di berkas) → memakai bawaan `AbstractClassifier`, yaitu vektor **one-hot** dari `classifyInstance`. Terkonfirmasi: kolom distribusi `pred_K3*.csv` hanya berisi `*1` dan `0`. | — |

Kesetaraan dengan Statify (`nb_text.rs:127–152`: `L = −ln θ̃`, `θ̃ = (C + α)/(ΣC + αV)`, skor `Σ x·L`, argmax, tanpa prior untuk K ≥ 2): karena `W = ln θ̃ = −L`, **argmin Σ x·W ≡ argmax Σ x·L**. Maka **K3 = ComplementNaiveBayes tanpa `-N`, `-S 1.0`**.
Diuji empiris (`tools/verify_formulas.py`, `logs/08_verify_formulas_*.log`): selisih maksimum bobot `ln θ̃` Statify vs `W` WEKA = 0 (pilkada, 3101 kata), 0 (SMS, 7568 kata), 8,9e-16 (SmSA, 17898 kata), dan 0 prediksi berbeda pada tiga dataset (270, 1673, 500 dokumen uji; varian K3w).
Konsekuensi: **probabilitas posterior Statify untuk Complement tidak dapat dibandingkan dengan WEKA** (WEKA hanya one-hot); bandingkan label dan, bila perlu, skor `Σ x·W` dihitung sendiri dari bobot. Opsi `-N` mengubah prediksi (K3N ≠ K3 pada ketiga dataset, bagian 8.2) dan **tidak** dipakai Statify.

### 3.4 StringToWordVector (`weka/filters/unsupervised/attribute/StringToWordVector.java` + `weka/core/DictionaryBuilder.java`)

Pada 3.9.6 filter mendelegasikan pekerjaan ke `DictionaryBuilder`. `StringToWordVector.setInputFormat` memanggil `setSortDictionary(true)` (`StringToWordVector.java:615`) sehingga kamus memakai `TreeMap`.

| Hal | Perilaku | Baris |
|---|---|---|
| Kosakata per kelas vs `-O` | Tanpa `-O`: satu kamus **per kelas** (bila kelas nominal diset), `wordsToKeep` dan `minTermFreq` diterapkan per kelas lalu digabung. Dengan `-O`: `m_numClasses = 1`, satu kamus global. | `DictionaryBuilder.java:1133–1135`, `1576–1582` |
| Statistik kamus | per dokumen: `counts[0]` = frekuensi kata (total kemunculan), `counts[1]` = 1 (jumlah dokumen). Peringkat memakai **total kemunculan** (bukan df). | `1599–1606`, `1616–1622` |
| Ambang `wordsToKeep` | untuk tiap kamus: urutkan semua hitungan; bila jumlah kata `< W` ambang = `minTermFreq`; selain itu ambang = `max(minTermFreq, hitungan_terurut[len − W])`. Kata dipertahankan bila hitungan `>= ambang`. | `1755–1770`, `1777` |
| **Nilai seri di batas** | karena `>=`, **semua kata yang hitungannya sama dengan ambang ikut dipertahankan**, sehingga jumlah kata bisa **melebihi W**. Terukur pada data pilkada latih: `-W 1000 -O` menghasilkan **1042** kata (ambang hitungan 2; 441 kata berhitungan tepat 2); `-W 1000000` menghasilkan seluruh kosakata **3101** kata (`logs/smoke_K1_filter.log`, `out/train_K1.arff`, `out/train_K1w.arff`; replikasi independen di `tools/tie_analysis.py` → `logs/04_tie_analysis.log` memberi angka yang sama). | `1763–1768`, `1777` |
| Minimum frekuensi `-M` | `m_minFrequency` bawaan 1; berlaku pada total kemunculan (`counts[0]`) | `138`, `1764–1768` |
| Huruf kecil `-L` | `word.toLowerCase()` (**locale bawaan JVM**) sebelum stemmer/stopword; bawaan `m_lowerCaseTokens=false` bila `-L` tidak diberikan | `117`, `1442`, `1591` |
| Delimiter bawaan `WordTokenizer` | `" \r\n\t.,;:'\"()?!"` (spasi, CR, LF, TAB, `. , ; : ' " ( ) ? !`) dan `java.util.StringTokenizer` (token kosong tidak dihasilkan) | `CharacterDelimitedTokenizer.java:41`; `WordTokenizer.java:95–97` |
| `-C` (hitungan kata) | tanpa `-C` nilai = 1 (biner); dengan `-C` nilai = jumlah kemunculan dalam dokumen | `1449–1461` |
| `-T` (TF transform) | `v ← ln(v + 1)` untuk atribut kata saja. Tanpa `-C` semua nilai 1 menjadi konstanta ln 2, jadi `-T` hanya bermakna bersama `-C`. | `1467–1476` |
| `-I` (IDF transform) | `v ← v · ln(N / df)`; `N = m_count` = jumlah dokumen latih yang diproses, `df` = jumlah dokumen berisi kata (dari kamus latih). Diterapkan **setelah** TF. Kata dengan `df = N` bernilai 0 (entri sparse hilang pada keluaran). | `1478–1497`, `1632` |
| `-N 1` (normalisasi) | panjang vektor dokumen = norma L2 dari vektor yang **sudah** ber-TF/IDF; `avg` = **rata-rata norma L2 seluruh dokumen latih** (dibagi `numInstances`, dokumen berpanjang 0 ikut dihitung sebagai 0); tiap dokumen (latih dan uji) diskalakan `v · avg / ‖v‖₂`. `avg` dihitung dari data latih dan dipakai ulang untuk data uji. `-N 2` = hanya data uji (tidak dipakai). | `1315–1333`, `1527–1555`; `StringToWordVector.java:150–167`, `683–685` |
| **Urutan atribut keluaran** | atribut yang **tidak** dipilih `-R` (di sini kelas) disalin **lebih dulu**, lalu kata-kata. Jadi dengan teks di posisi 1 dan kelas di posisi 2, **kelas menjadi atribut PERTAMA** setelah filter (terkonfirmasi: `@attribute sentiment` di baris 3 `out/train_K1.arff`). Urutan kata: dengan `-O` urut leksikografis `String.compareTo` (unit UTF-16) karena `TreeMap`; tanpa `-O` kata disambung per kelas (tiap kelas terurut, gabungan tidak terurut global). | `DictionaryBuilder.java:1234–1250`, `1773–1788` |
| Mode batch (`-b`, `-r`, `-s`) | kamus, `N`, `df`, dan `avg` dihitung hanya dari berkas latih; berkas uji divektorisasi dengan kamus itu (kata di luar kamus diabaikan) | `StringToWordVector.java:631–648`, `659–705` |

### 3.5 NumericToNominal (`weka/filters/unsupervised/attribute/NumericToNominal.java`)

Nilai nominal dibentuk dari **nilai-nilai berbeda yang terlihat pada batch pertama** (latih), diurutkan, dengan label `Utils.doubleToString` (`295–359`). Pada batch berikutnya, nilai yang tidak pernah muncul di latih
menjadi **missing** (`404–407`). Untuk fitur biner K2 terkonfirmasi semua 1042 atribut kata berbentuk `{0,1}` baik di latih maupun uji (`out/train_K2.arff`, `out/test_K2.arff`).
Kewaspadaan: bila suatu kata ada di **semua** dokumen latih (df = N) atribut hanya `{1}` dan nilai 0 di data uji menjadi missing; untuk pilkada latih tidak ada kata seperti itu (`df==N` = 0 kata), tetapi periksa kembali untuk SMS/SmSA.
Gunakan `-R 2-last` (kelas sudah di posisi 1) agar atribut kelas tidak tersentuh.

## 4. Nilai bawaan "standard Weka" yang sebenarnya dipakai Statify

Jalur kode: `frontend/public/workers/TextAnalytics/statify-text-core/src/` (disingkat `core/`),
`frontend/components/Modals/Transform/StringToWordVector/` (disingkat `stwv/`), dan `frontend/components/Modals/Analyze/Classify/` (disingkat `cls/`).

| Aspek | Nilai bawaan Statify (preset Weka) | Berkas:baris |
|---|---|---|
| Standar rumus bawaan | `formulaStandard = "weka"`; TF `raw`, IDF `none`, normalisasi `none` | `stwv/config.ts:62–67`; `stwv/constants/formula-standards.ts:60–68`; `core/config.rs:25–32` (Rust `#[default] Weka`) |
| Pilihan sah pada standar Weka | TF: `binary`, `raw`, `log1p`; IDF: `none`, `standard`; normalisasi: `none`, `doc_length` | `stwv/constants/formula-standards.ts:64–66` |
| Delimiters | regex `[\s.,;:'"()?!]+` (di TS ditulis `"[\\s.,;:'\"()?!]+"`). Bila string kosong, cadangan `[\s\p{P}]+` | `stwv/config.ts:61`; `core/tokenizer.rs:23–29` |
| Lowercase | `true` (`doc.to_lowercase()` Rust, Unicode penuh, tak bergantung locale) | `stwv/config.ts:48`; `core/tokenizer.rs:9–13` |
| Stopword / stemming | `none` / `none` (setara `Null` dan `NullStemmer` WEKA) | `stwv/config.ts:49–55` |
| Tokenizer | `word` (n-gram tidak dipakai; `ngramMin/Max` hanya bila tipe `ngram`) | `stwv/config.ts:56–60` |
| `wordsToKeep` | 1000 (0 = semua). **Global** (tanpa per kelas). Peringkat = total kemunculan menurun; **seri → alfabetis byte-wise naik; dipotong ketat tepat W** (`candidates.truncate`). Standar `custom` meranking dengan Σ TF×IDF. | `stwv/config.ts:68`; `core/vectorizer.rs:147–182` (baris 173–181 untuk Weka/sklearn) |
| `minTermFreq` | 1; kata dengan total kemunculan `< min` dibuang **sebelum** pemeringkatan | `stwv/config.ts:69`; `core/vectorizer.rs:136–139` |
| Urutan kolom | alfabetis byte-wise (UTF-8) | `core/vectorizer.rs:184–186` |
| TF | `raw`: `f`; `binary`: 1 bila `f>0`; `log1p`: `ln(1+f)` | `core/vectorizer.rs:359–367` |
| IDF | `standard`: `ln(N/df)`; `none`: 1. `df` = jumlah dokumen latih berisi kata (dihitung per dokumen) | `core/vectorizer.rs:122–123`, `370–377` |
| Urutan operasi | `tf → × idf → normalisasi` | `core/vectorizer.rs:77`, `344–350` |
| Normalisasi `doc_length` | `v · avg / ‖v‖₂`; `avg` = rata-rata ‖v‖₂ latih **hanya dari baris dengan norma > 0**, disimpan di model dan dipakai untuk data uji; baris nol tetap nol | `core/vectorizer.rs:225–240`, `318–324` |
| Likelihood teks, `alpha` | `TextAlpha` bawaan **1,0** | `cls/naive-bayes/rust/src/models/config.rs:115–117` |
| Multinomial | `θ_ct = (N_ct + α)/(Σ_t N_ct + αV)`, `L = ln θ`; skor `Σ x·L` | `core/nb_text.rs:104–113`, `187–191` |
| Bernoulli (K2 padanan) | `p_ct = (n_ct + α)/(n_c + 2α)`, `n_ct` = jumlah dokumen dengan `x>0`; skor `Σ A + Σ_{b=1}(L−A)` | `core/nb_text.rs:114–126`, `192–200` |
| Complement | `C_ct = total_t − N_ct`; `θ̃ = (C_ct + α)/(Σ_t C_ct + αV)`; `L = −ln θ̃`; **tanpa prior bila K ≥ 2** | `core/nb_text.rs:127–152` |
| Prior kelas | `P(c) = count(c)/N` — **tanpa Laplace** (`class_prior.rs` menyatakan "definisi standar"). Skor akhir = `ln P(c)` + kontribusi teks. | `cls/naive-bayes/rust/src/stats/class_prior.rs:6–9, 42–49`; `cls/apply-model/rust/src/scoring/naive_bayes.rs:1046–1054, 1138–1141` |
| Posterior | log-sum-exp: `p_c = exp(s_c − m)/Σ exp(s_j − m)` | `cls/apply-model/rust/src/stats/posterior.rs:10–35` |
| Seri argmax | kelas pertama menurut urutan alfabetis byte-wise (`>` ketat) | `cls/apply-model/rust/src/stats/posterior.rs:43–60` |

## 5. Tabel pemetaan Statify ↔ WEKA 3.9.6

Singkatan: `T`=`core/tokenizer.rs`, `V`=`core/vectorizer.rs`, `NT`=`core/nb_text.rs`, `CP`=`.../naive-bayes/rust/src/stats/class_prior.rs`,
`SN`=`.../apply-model/rust/src/scoring/naive_bayes.rs`, `DB`=`weka/core/DictionaryBuilder.java`, `STWV`=`StringToWordVector.java`, `NBM`=`NaiveBayesMultinomial.java`, `NB`=`NaiveBayes.java`.

| Aspek | Statify (berkas:baris) | WEKA 3.9.6 (kelas:baris) | Opsi WEKA yang dipakai | Bisa disamakan? | Dampak bila tidak |
|---|---|---|---|---|---|
| Pemisah token | regex `[\s.,;:'"()?!]+` (`config.ts:61`; `T:15–18`); `\s` Rust = **White_Space Unicode** (spasi, TAB, LF, CR, VT, FF, NBSP U+00A0, U+2028, dst.) | `StringTokenizer` dengan `" \r\n\t.,;:'\"()?!"` (`CharacterDelimitedTokenizer:41`; `WordTokenizer:95–97`) | bawaan WordTokenizer (tanpa `-tokenizer`) | **Ya untuk data ini**: 0 dari 630 tweet latih dan 0 dari 270 tweet uji memuat spasi Unicode di luar `" \r\n\t"` (diperiksa dengan skrip Python; ada TAB di 3+2 tweet, ditangani sama). Tidak setara umum untuk data lain (NBSP, VT, FF). | Teks dengan NBSP/VT/FF/U+2028 menjadi satu token di WEKA tetapi terpecah di Statify → kosakata dan hitungan berbeda |
| Huruf kecil | `to_lowercase()` Unicode penuh (`T:9–13`) | `String.toLowerCase()` locale JVM (`DB:1442, 1591`) | `-L` | Ya (locale Inggris/Indonesia tidak mengubah huruf Latin; ada pengecualian locale Turki/Azeri untuk `I`) | Hanya bila locale JVM Turki/Azeri atau karakter khusus (mis. `İ`): token berbeda |
| Stopword, stemming | `none`, `none` (`config.ts:49–55`) | `Null`, `NullStemmer` (`DB:120, 123`) | bawaan | Ya | — |
| Cakupan kosakata | global, satu kamus (`V:109–127`, `148–182`) | per kelas bila tanpa `-O` (`DB:1133–1135`) | `-O` | Ya | Tanpa `-O` kosakata WEKA ≠ Statify (gabungan top-W per kelas) |
| Aturan seri di batas `wordsToKeep` | urut (hitungan menurun, **alfabet naik**) lalu **potong tepat W** (`V:174–181`) | simpan semua kata dengan hitungan `>=` ambang (`DB:1763–1768, 1777`); jumlah kata bisa **> W** | tidak ada opsi untuk memotong tepat W | **Tidak** untuk W=1000 pada pilkada: WEKA 1042 kata, Statify 1000; 42 kata WEKA tidak ada di Statify, 0 kebalikannya (`logs/04_tie_analysis.log`). **Ya** lewat varian Wall (`-W 1000000` WEKA dan `wordsToKeep = 0` Statify → seluruh 3101 kata). | Vektor fitur, parameter NB, dan prediksi sedikit berbeda karena himpunan kata berbeda; selisih akurasi tidak bisa dipisahkan dari perbedaan implementasi lain. Varian Wall menetralkan ini. |
| Peringkat kata | total kemunculan (`V:174–179`) | total kemunculan `counts[0]` (`DB:1599–1606`) | bawaan | Ya | — |
| `minTermFreq` | total kemunculan `>= min` sebelum peringkat (`V:136–139`) | `>= max(min, ambang)` (`DB:1764–1768`) | `-M 1` | Ya (keduanya 1) | — |
| Urutan kolom kosakata | byte-wise UTF-8 (`V:185`); kelas terpisah | `String.compareTo` UTF-16 dengan `-O` (`DB:1248`); **kelas menjadi atribut pertama** (`DB:1234–1245`) | `-O` | Tidak identik pada karakter suplementer vs U+E000–U+FFFF (tidak ada di data ini); urutan tidak memengaruhi prediksi kecuali selisih pembulatan penjumlahan ±1e-16 | Hanya selisih numerik ≈ 1e-16 pada probabilitas |
| TF | `raw`/`binary`/`log1p` (`V:359–367`) | hitungan `-C`; biner bila tanpa `-C` (`DB:1449–1461`); `-T`: `ln(v+1)` (`DB:1467–1476`) | K1: `-C`; K2: tanpa `-C`; K5: `-C -T` | Ya | — |
| IDF | `ln(N/df)` (`V:370–377`); `df` per dokumen latih (`V:122–123`) | `v·ln(N/df)`, `N=m_count` (`DB:1478–1497`, `1632`) | `-I` (K5) | Ya (hanya ke kata kosakata akhir; sama) | — |
| Normalisasi panjang dokumen | `v·avg/‖v‖₂`, `avg` = rata-rata ‖v‖₂ **baris dengan norma > 0** (`V:225–240`, `318–324`) | `v·avg/‖v‖₂`, `avg` = rata-rata atas **semua** dokumen latih termasuk norma 0 (`DB:1315–1333`, `1547`) | `-N 1` (K5) | Ya bila tidak ada dokumen latih bernorma 0. Pilkada: 0 dari 630 dokumen latih tanpa kata di kosakata (K1, K1w, K5, K5w, K2); 1 dari 270 dokumen uji tanpa kata (tidak memengaruhi `avg`) (`logs/06_dokumen_kosong.log`) | Bila ada dokumen kosong, `avg` WEKA lebih kecil → semua nilai berbeda skala (mis. SMS/SmSA) |
| Estimasi Multinomial | `θ=(N+α)/(Σ+αV)`, `α=1,0` (`NT:104–113`; `config.rs:115–117`) | `(N+1)/(Σ+V)` (`NBM:182–188, 232–237`) | `NaiveBayesMultinomial` bawaan | Ya (α=1) | — |
| Prior kelas (teks) | `count/N`, **tanpa Laplace** (`CP:42–49`; `SN:1050–1051`) | `(n_c+1)/(N+K)` (`NBM:190–194, 240`) | tidak ada opsi untuk mematikan | **Hanya ekuivalen pada kelas seimbang**: pilkada 315/315 dan 135/135 → keduanya 0,5. Tidak ekuivalen untuk data tidak seimbang (SMS spam). | Pada SMS spam prior berbeda → probabilitas dan sebagian prediksi berbeda |
| Posterior | `ln prior + Σ x·L`, lalu log-sum-exp (`SN:1138–1141`; `posterior.rs:16–35`) | `exp(s−max)·prior` lalu normalisasi (`NBM:261–269`) | — | Ya secara matematis; selisih numerik ≈ 1e-16 | Selisih ≈ 1e-16 pada probabilitas |
| K2 (biner + NaiveBayes nominal) vs Statify Bernoulli | `p=(n+α)/(n_c+2α)`; skor memuat `ln(1−p)` untuk kata absen (`NT:114–126`, `192–200`); prior tanpa Laplace | `DiscreteEstimator` Laplace 1: `(count+1)/(n_c+2)` untuk nilai 0 dan 1 (`NB:289–292`; `DiscreteEstimator:72–83, 121–127`); prior Laplace (`NB:246`) | `NaiveBayes` bawaan (tanpa `-K`, `-D`) + `NumericToNominal -R 2-last` | Ya untuk likelihood (α=1); prior sama hanya bila seimbang | Sama seperti baris prior |
| Perilaku pada probabilitas sangat kecil | `safe_ln` mengganti ≤0 dengan `ln(MIN_POSITIVE)` (`NT:42–48`) | lantai `1e-75` per faktor + rescale (`NB:360–377`) — hanya NaiveBayes nominal | — | Tidak relevan untuk Laplace > 0 (tidak ada nol) | — |
| Complement (K3) | `L=−ln θ̃`, `θ̃` dari hitungan komplemen, tanpa prior K≥2 (`NT:127–152`) | paket `complementNaiveBayes` 1.0.3 `ComplementNaiveBayes.java:381–402` (bobot), `443–468` (argmin, tanpa prior); distribusi one-hot (tidak ada `distributionForInstance`) | `-S 1.0`, **tanpa** `-N` | **Ya** untuk label dan bobot (selisih bobot ≤ 8,9e-16; 0 prediksi berbeda, tiga dataset). **Tidak** untuk probabilitas (WEKA one-hot). | Dengan `-N` prediksi berbeda dari Statify (K3N); membandingkan probabilitas Complement tidak bermakna |
| Charset berkas | UTF-8 (WASM/JS) | `ArffLoader` memakai charset platform (`ArffLoader:1226`) | `-Dfile.encoding=UTF-8` | Ya | Tanpa opsi di Java 17 Windows: karakter non-ASCII rusak → token berbeda |
| Dokumen tanpa token di kosakata | baris nol; `ln prior` saja (`V:344–350`; `SN:1138–1141`) | instans sparse kosong; NBM → hanya prior (`NBM:289–300`) | — | Ya | — |
| Seri argmax | kelas pertama alfabetis, `>` ketat (`posterior.rs:43–60`) | kelas dengan indeks terkecil (urutan header ARFF `{negative,positive}` = alfabetis) | — | Ya (header disusun alfabetis di `make_arff.py`) | — |

## 6. Data ARFF

Dibuat oleh `make_arff.py` (dapat dijalankan ulang; idempoten) dengan Python (tanpa `CSVLoader` WEKA sehingga teks tetap bertipe `string`).
Pembagian data **tidak diulang**: memakai `data/pilkada_train.csv` (630 baris) dan `data/pilkada_test.csv` (270 baris) apa adanya.

> Catatan sumber: berkas CSV ini tidak ada di `testing/thesis-eval/weka/data/` saat tugas dimulai. Saya menyalinnya (`cp -n`, tanpa menimpa) dari
> `Claude outputs/pilkada_train.csv` dan `Claude outputs/pilkada_test.csv` di repo (hasil `sk_compare.py`: stratified 70/30, seed 42). Berkas aslinya tidak diubah.

Header ARFF (identik di latih dan uji, diverifikasi):

```
@relation pilkada_train            (pilkada_test pada berkas uji)
@attribute text string
@attribute sentiment {negative,positive}
@data
'<teks dengan escape>',negative
```

Escape: `\` → `\\`, `'` → `\'`, LF/CR/TAB → `\n \r \t`, karakter kontrol lain → oktal `\NNN`; berkas ditulis UTF-8. Uji mandiri `arff_quote` pada teks sintetis
(kutip tunggal, backslash, newline, tab, karakter kontrol, emoji, `%`, `{}`) lolos bolak-balik lewat pembaca WEKA (dijalankan, tidak disimpan sebagai berkas repo).

Berkas keluaran di `data/` (SHA-256 16 karakter awal dari run ini):

| Berkas | Isi | SHA-256 (awal) |
|---|---|---|
| `pilkada_train.arff`, `pilkada_test.arff` | 630 dan 270 instans | `6f37f1e298de8862`, `e30ead6dcc4665eb` |
| `pilkada_train_ids.csv`, `pilkada_test_ids.csv` | kolom `Id` sesuai urutan baris ARFF (`inst#` pada keluaran WEKA = baris ke-n berkas ini) | `a823f7f92ce91545`, `26028d451126e0a7` |
| `weka_roundtrip/pilkada_{train,test}_roundtrip.csv` | ARFF dibaca ulang oleh WEKA (`tools/DumpArff`) lalu ditulis ke CSV | — |

Verifikasi (`python make_arff.py --verify`, log `logs/03_verifikasi_arff.log`):

| Pemeriksaan | Hasil |
|---|---|
| Jumlah baris | latih **630**, uji **270** |
| Distribusi kelas | latih negative **315** / positive **315**; uji negative **135** / positive **135** |
| Teks tiap baris vs CSV (setelah dibaca ulang oleh WEKA `ConverterUtils.DataSource`) | latih `identik=True`, uji `identik=True`, `first_diff=None` |
| Header nominal | `sentiment {negative,positive}` identik pada kedua berkas (WEKA melaporkan `values=[negative, positive]`) |
| Ciri data | 0 tweet berisi `'`, `\`, atau baris baru; 3 (latih) dan 2 (uji) berisi TAB; 7 dan 7 berisi karakter non-ASCII (mojibake `â€¦` dan sejenis) |

### 6.1 SMS Spam Collection dan IndoNLU SmSA (diunduh pengguna; sudah diproses)

Pengguna mengunduh sendiri berkas berikut ke `data/` (jaringan sesi ini tetap diblokir; tidak ada yang diunduh oleh saya). Salinan kerja ada di `data/raw/` (`cp -n`; berkas asli di `data/` tidak diubah).

| Dataset | Sumber (URL dari pengguna) | Berkas | SHA-256 (awal) | Lisensi |
|---|---|---|---|---|
| SMS Spam Collection (UCI) | `https://archive.ics.uci.edu/static/public/228` | `sms+spam+collection.zip` → `data/raw/smsspamcollection.zip` | `1587ea43e58e82b1…` | **belum dicatat**: baca halaman UCI/`readme` di dalam zip dan tulis sendiri di bab data (lihat bagian 10) |
| IndoNLU SmSA | `https://raw.githubusercontent.com/IndoNLP/indonlu/master/dataset/smsa_doc-sentiment-prosa/{train,test}_preprocess.tsv` | `train_preprocess.tsv`, `test_preprocess.tsv` → `data/raw/smsa/` | train `50f38ceed9b31521…`, test `4e8016daa8e4e1b1…` | **tidak diketahui**; periksa repositori IndoNLU dan sumber asli (Purwarianti & Crisdayanti 2019) |

Perlakuan dan hasil verifikasi (`python make_arff.py --verify`, `logs/03_verifikasi_arff.log`; teks tiap baris sama dengan CSV setelah dibaca ulang oleh WEKA, `identik=True`, `first_diff=None` pada keempat berkas):

| Dataset | Pembagian | Latih | Uji | Distribusi latih | Distribusi uji | Header kelas |
|---|---|---|---|---|---|---|
| SMS Spam | stratified 70/30, `train_test_split(test_size=0.30, stratify=label, random_state=42)`, scikit-learn 1.9.1, indeks diurutkan (`data/sms_spam_split_info.txt`); total 5574 baris | 3901 | 1673 | ham 3378 / spam 523 | ham 1449 / spam 224 | `@attribute 'class label' {ham,spam}` |
| SmSA | train dan test resmi apa adanya (valid 1260 tidak dipakai); tanpa pembagian ulang | 11000 | 500 | negative 3436 / neutral 1148 / positive 6416 | negative 204 / neutral 88 / positive 208 | `@attribute sentiment {negative,neutral,positive}` |

Catatan penting:

- **Nama atribut kelas SMS = `class label`, bukan `sentiment`**, karena `sentiment` adalah kata nyata di korpus SMS dan `StringToWordVector` melempar `Attribute names are not unique! Causes: 'sentiment'` bila kata kosakata sama dengan nama kelas (`BUGS_WEKA.md` B4). Nama atribut kelas tidak memengaruhi perhitungan.
- File test publik IndoNLU berlabel (500 baris dengan label); `make_arff.py` menolak label di luar header.
- Hash 16 karakter awal ARFF: `sms_spam_train.arff 42331cb96b652ef2`, `sms_spam_test.arff 720c2d335256b7e2`, `smsa_train.arff 1a2d474efeaca4ad`, `smsa_test.arff 6d10fadeb4f802ae` (CSV: `sms_spam_train.csv f9dc63b0562e7857`, `sms_spam_test.csv 6dddf491bd464184`, `smsa_train.csv 0b8bbbdc40933afa`, `smsa_test.csv b1a4d4ca3c75be7b`). Berkas id: `*_ids.csv` (kolom `Id`, urutan = urutan baris ARFF = `inst#` di `pred_*.csv`).
- Ukuran kosakata K1/K2/K5 (W = 1000, dengan seri di batas): pilkada 1042, SMS 1130, SmSA 1003; varian Wall: pilkada 3101, SMS 7568, SmSA 17898.

## 7. Perintah CLI final

Konvensi (Windows `cmd`, dijalankan dari `testing\thesis-eval\weka`; semua perintah satu baris):

> **Penting: perintah di bagian ini sintaks Command Prompt (`cmd.exe`), BUKAN PowerShell.** Di PowerShell `set` adalah `Set-Variable`, `%VAR%` tidak diperluas, dan opsi seperti `-Dfile.encoding` dibaca sebagai parameter PowerShell (galat `A parameter cannot be found that matches parameter name 'Dfile'`). Jalankan `cmd` di PowerShell (prompt berubah menjadi `E:\...>`), lalu tempel perintah; ketik `exit` untuk kembali. Jangan memakai `PS>` untuk blok ini.

```
set JAVA="C:\Program Files\Weka-3-9-6\jre\zulu17.32.13-ca-fx-jre17.0.2-win_x64\bin\java.exe"
set WEKA="C:\Program Files\Weka-3-9-6\weka.jar"
set CNB=C:\Users\DIJASAN\wekafiles\packages\complementNaiveBayes\complementNaiveBayes.jar
set JOPT=--add-opens=java.base/java.lang=ALL-UNNAMED -Dfile.encoding=UTF-8 -Xmx4g
set J=%JAVA% %JOPT% -cp %WEKA%
set JC=%JAVA% %JOPT% -cp %WEKA%;%CNB%
set FA=weka.filters.unsupervised.attribute
set CB=weka.classifiers.bayes
set CSVOPT=weka.classifiers.evaluation.output.prediction.CSV -distribution -decimals 16
mkdir out logs
```

Fakta yang sudah dikonfirmasi dan menentukan bentuk perintah:

- Setelah filter, **kelas adalah atribut pertama** → classifier memakai **`-c first`**. Untuk filter `-c last` dipakai pada ARFF mentah (kelas di posisi 2 = terakhir).
- Dua perintah per konfigurasi: (1) filter batch `-b -i ... -o ... -r ... -s ...`, (2) classifier. Dengan opsi `-classifications "...CSV ... -file ..."` WEKA 3.9.6 hanya mencetak blok prediksi (ke layar) dan **tidak mencetak ringkasan akurasi**;
  maka ringkasan diambil dari perjalanan terpisah tanpa `-classifications`. Keduanya memakai model yang sama (deterministik; `-s 42` diberikan sesuai aturan tetapi tidak dipakai karena tidak ada proses acak atau validasi silang saat `-T` diberikan).
- Berkas prediksi CSV: kolom `inst#,actual,predicted,error,distribution` (distribusi dua kolom: peluang kelas `negative` lalu `positive`; tanda `*` menandai kelas prediksi), 16 desimal; `inst#` = urutan baris `data\pilkada_test_ids.csv`. Nilai lebih kecil dari 1e-16 tercetak 0.
- `-M 1` adalah bawaan filter; ditulis eksplisit agar setara dengan `minTermFreq = 1` di Statify.

**K1 — Multinomial, hitungan kata**

```
%J% %FA%.StringToWordVector -b -i data\pilkada_train.arff -o out\train_K1.arff -r data\pilkada_test.arff -s out\test_K1.arff -c last -R first -W 1000 -O -L -C -M 1
%J% %CB%.NaiveBayesMultinomial -t out\train_K1.arff -T out\test_K1.arff -c first -s 42 > logs\K1_summary.txt
%J% %CB%.NaiveBayesMultinomial -t out\train_K1.arff -T out\test_K1.arff -c first -s 42 -classifications "%CSVOPT% -file out\pred_K1.csv" > nul
```

**K2 — biner, NumericToNominal, NaiveBayes**

```
%J% %FA%.StringToWordVector -b -i data\pilkada_train.arff -o out\train_K2b.arff -r data\pilkada_test.arff -s out\test_K2b.arff -c last -R first -W 1000 -O -L -M 1
%J% %FA%.NumericToNominal -b -i out\train_K2b.arff -o out\train_K2.arff -r out\test_K2b.arff -s out\test_K2.arff -R 2-last
%J% %CB%.NaiveBayes -t out\train_K2.arff -T out\test_K2.arff -c first -s 42 > logs\K2_summary.txt
%J% %CB%.NaiveBayes -t out\train_K2.arff -T out\test_K2.arff -c first -s 42 -classifications "%CSVOPT% -file out\pred_K2.csv" > nul
```

`-R 2-last` karena kelas sudah di posisi 1; semua 1042 atribut kata menjadi `{0,1}` dan header uji sama dengan latih (diperiksa).

**K3 — ComplementNaiveBayes (paket 1.0.3), K3N (dengan `-N`), K3w (kosakata penuh)**

K3 memakai ARFF K1; K3w memakai ARFF K1w (jalankan dulu K1w di bawah). `JC` menambahkan jar paket ke classpath; kelas ada di paket sehingga `weka.jar` saja tidak cukup.
`-S 1.0` = `alpha 1,0`; **tanpa `-N`** setara Statify (bagian 3.3). `K3N` hanya sebagai pembanding.

```
%JC% %CB%.ComplementNaiveBayes -t out\train_K1.arff -T out\test_K1.arff -c first -s 42 -S 1.0 > logs\K3_summary.txt
%JC% %CB%.ComplementNaiveBayes -t out\train_K1.arff -T out\test_K1.arff -c first -s 42 -S 1.0 -classifications "%CSVOPT% -file out\pred_K3.csv" > nul
%JC% %CB%.ComplementNaiveBayes -t out\train_K1.arff -T out\test_K1.arff -c first -s 42 -S 1.0 -N > logs\K3N_summary.txt
%JC% %CB%.ComplementNaiveBayes -t out\train_K1.arff -T out\test_K1.arff -c first -s 42 -S 1.0 -N -classifications "%CSVOPT% -file out\pred_K3N.csv" > nul
%JC% %CB%.ComplementNaiveBayes -t out\train_K1w.arff -T out\test_K1w.arff -c first -s 42 -S 1.0 > logs\K3w_summary.txt
%JC% %CB%.ComplementNaiveBayes -t out\train_K1w.arff -T out\test_K1w.arff -c first -s 42 -S 1.0 -classifications "%CSVOPT% -file out\pred_K3w.csv" > nul
```

Kolom distribusi `pred_K3*.csv` selalu one-hot (`*1`,`0`) karena kelas tidak mengimplementasikan `distributionForInstance`.

**K5 — Multinomial, TF log(1+f) × IDF, normalisasi panjang dokumen**

```
%J% %FA%.StringToWordVector -b -i data\pilkada_train.arff -o out\train_K5.arff -r data\pilkada_test.arff -s out\test_K5.arff -c last -R first -W 1000 -O -L -C -T -I -N 1 -M 1
%J% %CB%.NaiveBayesMultinomial -t out\train_K5.arff -T out\test_K5.arff -c first -s 42 > logs\K5_summary.txt
%J% %CB%.NaiveBayesMultinomial -t out\train_K5.arff -T out\test_K5.arff -c first -s 42 -classifications "%CSVOPT% -file out\pred_K5.csv" > nul
```

**Varian Wall** (seluruh kosakata; netralkan perbedaan nilai seri di batas `wordsToKeep`): sama dengan K1 dan K5 tetapi `-W 1000000`, berkas `K1w` dan `K5w`; di Statify setel `wordsToKeep = 0`.

```
%J% %FA%.StringToWordVector -b -i data\pilkada_train.arff -o out\train_K1w.arff -r data\pilkada_test.arff -s out\test_K1w.arff -c last -R first -W 1000000 -O -L -C -M 1
%J% %CB%.NaiveBayesMultinomial -t out\train_K1w.arff -T out\test_K1w.arff -c first -s 42 > logs\K1w_summary.txt
%J% %CB%.NaiveBayesMultinomial -t out\train_K1w.arff -T out\test_K1w.arff -c first -s 42 -classifications "%CSVOPT% -file out\pred_K1w.csv" > nul
%J% %FA%.StringToWordVector -b -i data\pilkada_train.arff -o out\train_K5w.arff -r data\pilkada_test.arff -s out\test_K5w.arff -c last -R first -W 1000000 -O -L -C -T -I -N 1 -M 1
%J% %CB%.NaiveBayesMultinomial -t out\train_K5w.arff -T out\test_K5w.arff -c first -s 42 > logs\K5w_summary.txt
%J% %CB%.NaiveBayesMultinomial -t out\train_K5w.arff -T out\test_K5w.arff -c first -s 42 -classifications "%CSVOPT% -file out\pred_K5w.csv" > nul
```

Padanan setelan Statify untuk tiap konfigurasi (formula standard = Weka, delimiter bawaan, lowercase aktif, stopword/stemming none, `minTermFreq = 1`, `alpha = 1,0`):

| Konfigurasi | TF | IDF | Normalisasi | `wordsToKeep` | Likelihood |
|---|---|---|---|---|---|
| K1 | raw | none | none | 1000 | Multinomial |
| K1w | raw | none | none | 0 | Multinomial |
| K2 | binary | none | none | 1000 | Bernoulli |
| K3 | raw | none | none | 1000 | Complement |
| K5 | log1p | standard | doc_length | 1000 | Multinomial |
| K5w | log1p | standard | doc_length | 0 | Multinomial |

Berkas `run_smoke.sh` (bash, hanya pilkada) menjalankan K1, K1w, K2, K5, K5w. `run_all.sh <dataset>` (bash) menjalankan **K1, K1w, K5, K5w, K2, K3, K3N, K3w** untuk `pilkada`, `sms_spam`, atau `smsa`
(variabel `WEKA_JAR`, `CNB_JAR`, `JAVA`, `JOPTS`, `KS`; keluaran `out/<dataset>/`, log `logs/<dataset>/<K>_{filter,summary}.log`).

**Untuk SMS Spam dan SmSA** pakai perintah yang sama dengan mengganti `data\pilkada_train.arff`/`data\pilkada_test.arff` menjadi `data\sms_spam_*.arff` atau `data\smsa_*.arff`. Filter tetap memakai `-c last` (kelas di posisi terakhir pada ARFF mentah) dan `-R first` (atribut teks).
Pada K2 `NumericToNominal -R 2-last` tetap benar (kelas menjadi atribut 1 setelah filter).

## 8. Uji asap perintah (bukan hasil evaluasi resmi)

Tujuan: memastikan setiap perintah berjalan dan posisi atribut kelas benar. Dijalankan dengan `run_smoke.sh` di Linux VM (OpenJDK 11.0.32, `-Xmx2g`), **bukan** di java.exe bawaan Windows. Perintah `cmd` di bagian 7
adalah terjemahan dari skrip bash tersebut dan **belum dijalankan di Windows**.

| Konfigurasi | Jumlah kata di kosakata | Benar di uji (dari 270) | Akurasi uji | Log mentah |
|---|---|---|---|---|
| K1 | 1042 | 206 | 76,2963 % | `logs/smoke_K1_classify.log` |
| K1w | 3101 | 212 | 78,5185 % | `logs/smoke_K1w_classify.log` |
| K2 | 1042 | 200 | 74,0741 % | `logs/smoke_K2_classify.log` |
| K5 | 1042 | 202 | 74,8148 % | `logs/smoke_K5_classify.log` |
| K5w | 3101 | 200 | 74,0741 % | `logs/smoke_K5w_classify.log` |
| K3 | 1042 (ARFF K1) | 206 | 76,2963 % | `logs/pilkada/K3_summary.log` (lihat 8.2) |

Jumlah "benar di uji" juga dihitung ulang dari `out/pred_<K>.csv` dan cocok dengan ringkasan WEKA. Angka-angka ini adalah titik rujukan: bila agen lain menjalankan perintah yang sama di Windows dan hasilnya berbeda, periksa Java/charset terlebih dahulu.
Log filter (`logs/smoke_*_filter.log`, `smoke_K2b_filter.log`, `smoke_K2_nominal.log`) hanya berisi peringatan JVM; tidak ada pengecualian WEKA.

### 8.2 Hasil WEKA semua konfigurasi (data uji; dijalankan di OpenJDK 11 Linux, bukan Windows)

Sumber: `tools/summarize_results.py` → `HASIL_WEKA.md`, dari `logs/<dataset>/<K>_summary.log` (blok `=== Error on test data ===`). F1-makro dihitung dari matriks konfusi pada log yang sama. Bukan hasil Statify; ini sisi WEKA.
Catatan: pada log yang sama ada blok `Error on training data`, **jangan tertukar** (akurasi latih jauh lebih tinggi).

#### Pilkada (270 uji)

| Konfigurasi | Benar/Total | Akurasi (%) | F1-makro (%) | Kappa |
|---|---|---|---|---|
| K1 | 206/270 | 76,30 | 76,28 | 0,5259 |
| K1w | 212/270 | 78,52 | 78,44 | 0,5704 |
| K2 | 200/270 | 74,07 | 74,05 | 0,4815 |
| K3 | 206/270 | 76,30 | 76,28 | 0,5259 |
| K3N | 202/270 | 74,81 | 74,46 | 0,4963 |
| K3w | 212/270 | 78,52 | 78,44 | 0,5704 |
| K5 | 202/270 | 74,81 | 74,81 | 0,4963 |
| K5w | 200/270 | 74,07 | 74,06 | 0,4815 |

#### SMS Spam (1673 uji)

| Konfigurasi | Benar/Total | Akurasi (%) | F1-makro (%) | Kappa |
|---|---|---|---|---|
| K1 | 1645/1673 | 98,33 | 96,42 | 0,9284 |
| K1w | 1647/1673 | 98,45 | 96,54 | 0,9309 |
| K2 | 1654/1673 | 98,86 | 97,47 | 0,9494 |
| K3 | 1619/1673 | 96,77 | 93,46 | 0,8692 |
| K3N | 1621/1673 | 96,89 | 93,68 | 0,8736 |
| K3w | 1641/1673 | 98,09 | 95,88 | 0,9175 |
| K5 | 1630/1673 | 97,43 | 94,65 | 0,8930 |
| K5w | 1643/1673 | 98,21 | 96,16 | 0,9233 |

#### SmSA (500 uji)

| Konfigurasi | Benar/Total | Akurasi (%) | F1-makro (%) | Kappa |
|---|---|---|---|---|
| K1 | 300/500 | 60,00 | 53,32 | 0,3535 |
| K1w | 323/500 | 64,60 | 56,60 | 0,4141 |
| K2 | 275/500 | 55,00 | 49,34 | 0,2934 |
| K3 | 282/500 | 56,40 | 45,90 | 0,2766 |
| K3N | 299/500 | 59,80 | 53,66 | 0,3587 |
| K3w | 317/500 | 63,40 | 57,10 | 0,4023 |
| K5 | 302/500 | 60,40 | 56,04 | 0,3717 |
| K5w | 327/500 | 65,40 | 62,44 | 0,4503 |


### 8.3 Verifikasi rumus independen (replikasi gaya-Statify di Python vs keluaran WEKA)

`tools/verify_formulas.py` menghitung ulang tokenisasi (regex Statify `[\s.,;:'"()?!]+`), kosakata penuh, hitungan K1w, normalisasi K5w, Multinomial dengan prior Laplace-WEKA dan prior `count/N`-Statify, serta bobot dan prediksi Complement, lalu membandingkan dengan ARFF/prediksi WEKA.

`logs/08_verify_formulas_pilkada.log` (`python tools/verify_formulas.py pilkada`):

```
(f) tokenisasi WEKA vs gaya-Rust (latih): 0 dari 630 dokumen berbeda
(f) tokenisasi WEKA vs gaya-Rust (uji): 0 dari 270 dokumen berbeda
(a) kosakata penuh: milik-sendiri=3101, WEKA=3101, urutan&isi identik=True
(b) hitungan kata K1w (latih+uji) identik dengan ARFF WEKA: True
(c) K5w: avg_norm semua dokumen=12.389609969904, hanya norma>0=12.389609969904 (selisih 0.000e+00; dokumen latih bernorma 0: 0)
    maks|selisih| nilai K5w vs ARFF WEKA (latih/uji) memakai avg semua-dokumen (WEKA): 4.999e-07 / 4.999e-07
    ... memakai avg hanya-norma>0 (gaya Statify): 4.999e-07 / 4.999e-07
(d) Multinomial K1w: prior WEKA ['0.500000', '0.500000'] vs Statify ['0.500000', '0.500000']
    maks|selisih peluang| vs WEKA: prior Laplace-WEKA=9.881e-15 ; prior count/N-Statify=9.881e-15
    prediksi berbeda dari WEKA: prior-WEKA=0 ; prior-Statify=0 (dari 270 dokumen uji)
(e) Complement: maks|selisih bobot| (ln theta-tilde Statify vs W WEKA, 3101 kata): 0.000e+00
    prediksi Complement Statify-formula vs WEKA K3w berbeda: 0 dari 270
```

`logs/08_verify_formulas_sms_spam.log` (`python tools/verify_formulas.py sms_spam`):

```
(f) tokenisasi WEKA vs gaya-Rust (latih): 0 dari 3901 dokumen berbeda
(f) tokenisasi WEKA vs gaya-Rust (uji): 0 dari 1673 dokumen berbeda
(a) kosakata penuh: milik-sendiri=7568, WEKA=7568, urutan&isi identik=True
(b) hitungan kata K1w (latih+uji) identik dengan ARFF WEKA: True
(c) K5w: avg_norm semua dokumen=12.248966035208, hanya norma>0=12.252106795730 (selisih 3.141e-03; dokumen latih bernorma 0: 1)
    maks|selisih| nilai K5w vs ARFF WEKA (latih/uji) memakai avg semua-dokumen (WEKA): 5.000e-07 / 5.000e-07
    ... memakai avg hanya-norma>0 (gaya Statify): 3.141e-03 / 3.141e-03
(d) Multinomial K1w: prior WEKA ['0.865744', '0.134256'] vs Statify ['0.865932', '0.134068']
    maks|selisih peluang| vs WEKA: prior Laplace-WEKA=4.774e-15 ; prior count/N-Statify=4.032e-04
    prediksi berbeda dari WEKA: prior-WEKA=0 ; prior-Statify=0 (dari 1673 dokumen uji)
(e) Complement: maks|selisih bobot| (ln theta-tilde Statify vs W WEKA, 7568 kata): 0.000e+00
    prediksi Complement Statify-formula vs WEKA K3w berbeda: 0 dari 1673
```

`logs/08_verify_formulas_smsa.log` (`python tools/verify_formulas.py smsa`):

```
(f) tokenisasi WEKA vs gaya-Rust (latih): 0 dari 11000 dokumen berbeda
(f) tokenisasi WEKA vs gaya-Rust (uji): 0 dari 500 dokumen berbeda
(a) kosakata penuh: milik-sendiri=17898, WEKA=17898, urutan&isi identik=True
(b) hitungan kata K1w (latih+uji) identik dengan ARFF WEKA: True
(c) K5w: avg_norm semua dokumen=15.863228897573, hanya norma>0=15.863228897573 (selisih 0.000e+00; dokumen latih bernorma 0: 0)
    maks|selisih| nilai K5w vs ARFF WEKA (latih/uji) memakai avg semua-dokumen (WEKA): 5.000e-07 / 4.999e-07
    ... memakai avg hanya-norma>0 (gaya Statify): 5.000e-07 / 4.999e-07
(d) Multinomial K1w: prior WEKA ['0.312369', '0.104426', '0.583205'] vs Statify ['0.312364', '0.104364', '0.583273']
    maks|selisih peluang| vs WEKA: prior Laplace-WEKA=1.243e-14 ; prior count/N-Statify=1.555e-04
    prediksi berbeda dari WEKA: prior-WEKA=0 ; prior-Statify=0 (dari 500 dokumen uji)
(e) Complement: maks|selisih bobot| (ln theta-tilde Statify vs W WEKA, 17898 kata): 8.882e-16
    prediksi Complement Statify-formula vs WEKA K3w berbeda: 0 dari 500
```

Ringkasan: tokenisasi, kosakata, hitungan kata, bobot Complement, dan prediksi identik pada tiga dataset. Prior Laplace-WEKA vs `count/N` Statify menimbulkan selisih peluang hingga **4,0e-04** pada SMS (3 kelas SmSA: 1,6e-04) tanpa mengubah label.
`avg_norm` (K5): beda 3,1e-03 pada SMS (1 dokumen latih bernorma 0 → WEKA merata-ratakan semua dokumen, Statify hanya norma > 0); tidak ada selisih pada pilkada dan SmSA. Pengaruh `avg_norm` gaya-Statify terhadap label tidak diuji di sini (**NOT RUN**); pada nilai fitur K5w selisih terhadap ARFF WEKA tetap ≤ 5e-07 (pembulatan ARFF) pada kedua pilihan `avg`.

### 8.4 Reproduksi di Windows (Zulu 17, dijalankan pengguna) — hanya pilkada

Pengguna menjalankan perintah bagian 7 di `cmd` Windows 11 dengan java.exe bawaan WEKA (Zulu 17.0.2) dan `--add-opens` + `-Dfile.encoding=UTF-8` + `-Xmx4g` (transkrip ada di percakapan; keluaran: `logs/K*_summary.txt`, `out/pred_K*.csv`, salinan di `logs/windows_pilkada/`).
Perbandingan dengan hasil Linux/OpenJDK 11 (`tools/compare_windows_linux.py`, `logs/09_bandingkan_windows_vs_linux_pilkada.log`; ARFF dan prediksi dibaca dengan CRLF dinormalkan):

```
Konfigurasi | beda baris pred | beda label | maks|selisih prob| | benar uji Windows | benar uji Linux | ARFF filter (latih,uji)
K1 | 0 | 0 | 0.00e+00 | 206 | 206 | identik
K1w | 0 | 0 | 0.00e+00 | 212 | 212 | identik
K2 | 0 | 0 | 0.00e+00 | 200 | 200 | identik
K3 | 0 | 0 | 0.00e+00 | 206 | 206 | identik
K3N | 0 | 0 | 0.00e+00 | 202 | 202 | identik
K3w | 0 | 0 | 0.00e+00 | 212 | 212 | identik
K5 | 0 | 0 | 0.00e+00 | 202 | 202 | identik
K5w | 0 | 0 | 0.00e+00 | 200 | 200 | identik
```

Hasil: ARFF hasil filter identik, prediksi identik (0 baris berbeda, selisih probabilitas 0,00e+00 pada 16 desimal) untuk K1, K1w, K2, K3, K3N, K3w, K5, K5w. Tidak ada `Exception` di log ringkasan.
Catatan: pada transkrip, baris K3w dijalankan **sebelum** K1w dibuat ulang, sehingga K3w memakai `out\train_K1w.arff` yang tersisa dari uji Linux; karena ARFF K1w Windows kemudian terbukti identik dengan versi Linux, hasil K3w tetap sahih, tetapi urutan yang benar adalah K1w lebih dulu.
**SMS Spam dan SmSA belum dijalankan di Windows (NOT RUN).**

## 9. Berkas yang dihasilkan (semua di `testing/thesis-eval/weka/`)

| Berkas | Fungsi |
|---|---|
| `00_ENV_dan_pemetaan_opsi.md` | dokumen ini |
| `make_arff.py` | membuat ARFF + berkas id + verifikasi (`--verify`); SMS/SmSA otomatis bila berkas ada |
| `tools/DumpArff.java` dan `.class` | membaca ARFF lewat jalur WEKA dan menulis CSV untuk verifikasi (dikompilasi `--release 8`) |
| `tools/tie_analysis.py` | replikasi independen pemilihan kosakata (efek nilai seri) |
| `run_smoke.sh` | uji asap K1, K1w, K2, K5, K5w (pilkada saja) |
| `run_all.sh` | K1, K1w, K5, K5w, K2, K3, K3N, K3w untuk `pilkada`/`sms_spam`/`smsa` |
| `tools/verify_formulas.py` | replikasi independen rumus Statify vs keluaran WEKA |
| `tools/compare_windows_linux.py` | membandingkan keluaran Windows vs Linux (pilkada) |
| `tools/summarize_results.py` | membuat `HASIL_WEKA.md` dari log ringkasan |
| `HASIL_WEKA.md` | tabel akurasi/F1-makro/kappa WEKA (koma desimal) |
| `data/` | CSV latih/uji (salinan), `pilkada_*`, `sms_spam_*`, `smsa_*` (`.arff`, `_ids.csv`, `.csv`), `sms_spam_split_info.txt`, `raw/`, `weka_roundtrip/`; berkas unduhan asli pengguna tetap di `data/` |
| `out/` | ARFF hasil filter dan `pred_<K>.csv` (uji asap pilkada di `out/`, semua dataset di `out/<dataset>/`; dapat ditimpa saat dijalankan ulang) |
| `logs/` | log mentah (`01`–`09`, `windows_pilkada/`, `smoke_*`, `logs/<dataset>/<K>_{filter,summary}.log`) |
| `BUGS_WEKA.md` | catatan perilaku yang tampak keliru/berisiko |

## 10. Ringkasan keterbatasan yang harus dibaca agen lain

1. **Windows/Zulu 17 baru dijalankan untuk pilkada** (bagian 8.4: identik dengan Linux). SMS Spam dan SmSA di Windows: **NOT RUN**. `java.exe -version` bawaan tetap tidak dijalankan.
2. Keluaran `weka.Run ... ComplementNaiveBayes -h` dari Windows hanya ada di percakapan, **bukan di `logs/`**.
3. Lisensi SMS Spam Collection dan SmSA **belum dicatat**; hash dan jumlah baris sudah dicatat (bagian 6.1).
4. Selisih desain yang tidak bisa disamakan lewat opsi WEKA: aturan seri `wordsToKeep` (netral lewat varian Wall); prior Laplace WEKA vs `count/N` Statify (netral pada kelas seimbang; selisih peluang hingga 4,0e-04 pada SMS, 0 label berbeda pada replika Python); rata-rata norma K5 (beda hanya bila ada dokumen latih bernorma 0; SMS: 1).
5. ComplementNaiveBayes WEKA tidak memberi probabilitas (one-hot): bandingkan label, bukan probabilitas.
6. Seluruh angka di bagian 8.2 adalah sisi WEKA. **Sisi Statify belum dijalankan** (di luar cakupan tugas ini; perlu ekspor prediksi per Id dari aplikasi).
