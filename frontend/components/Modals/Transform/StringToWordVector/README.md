# Pengembangan Modul "String to Word Vector"

Dokumen ini melacak sejarah pengembangan, arsitektur, dan ringkasan fitur komponen klasifikasi teks `StringToWordVector` pada aplikasi Statify.

## 📖 Apa itu "String to Word Vector"?

**String to Word Vector** adalah metode ekstraksi fitur dalam *Natural Language Processing* (NLP) yang diperuntukkan bagi Statify guna mengubah memori teks mentah (kolom klasifikasi berbasis string) ke dalam format matriks vektor berwujud numerik. Karena mayoritas model *Machine Learning* (seperti Naive Bayes, Regression, dll) tidak dapat memproses huruf abjad, metode pembedah kata dan kalkulasi kemunculan (*Term Frequency / Inverse Document Frequency*) menjadi sebuah kewajiban.

Fitur ini melingkupi metode pra-pemrosesan teks standar:
1. **Lowercase**: Penyeragaman huruf kecil.
2. **Stopwords Removal**: Penghapusan kata tidak bermakna ganda secara statis (Bahasa Indonesia & Inggris) maupun custom kata.
3. **Stemming**: Pemotongan imbuhan dasar menggunakan adaptasi Sastrawi (Indonesia) dan Porter (Inggris).
4. **Tokenizer**: Ekstraksi berbasis kata dasar (*Word*) hingga rangkaian *N-Gram*.
5. **Vectorization**: Transformasi matriks via *TF, IDF, TF-IDF*, maupun biner matriks (0/1). 

---

## 📅 Kronologi & Status Pengembangan
*Branch yang digunakan: `Dija`*

### ✅ Fase 1: Registrasi Modal (100% Selesai)
Fase ini berfokus pada integrasi *routing* dan menu dropdown dalam ekosistem kerangka dasar Statify.
- Pendaftaran identifier `StringToWordVector` pada tipe komponen Modal utama (`modalTypes.ts`).
- Pengelompokan Modal pada kategori transformasi agar dikenali oleh Sidebar Container.
- Injeksi menu klik pada `TransformMenu.tsx`.
- Pendaftaran komponen nyata ke dalam `TransformRegistry.ts` menggunakan target `container: "sidebar"`.

### ✅ Fase 2: Pembangunan UI & Worker Skeleton (100% Selesai)
Fase arsitektural antarmuka pengguna *(User Interface)* berlandaskan arsitektur React-Tailwind.
- Implementasi desain arsitektur modular dengan struktur layout *"2-Tabs"* layaknya fitur `BinaryLogistic`.
- Pembuatan sub-komponen pemilihan kolom variabel berbasis filter nominal `VariablesTab.tsx`.
- Pembuatan antarmuka seluruh parameter konfigurasi algoritma teks `OptionsTab.tsx` yang bersifat responsif *(Radio buttons, min-max input)*.
- Pengikatan *state management* (Data flow ekosistem variabel & opsi UI) secara menyeluruh melalui Hook `useStringToWordVector.ts`.
- Penyusunan kerangka file ekstrusi `vectorizer.worker.js` (Web Worker) yang meminimalisir interupsi *thread* utama JavaScript dalam perlintasan RAM.

### ✅ Fase 3: Pembuatan Mesin Rust & WebAssembly (100% Selesai)
Fase pembuatan mesin inti yang mengeksekusi ekstraksi dengan kecepatan native.
- **[Selesai]** Inisialisasi Environment: Pembuatan manifest dependensi `Cargo.toml`.
- **[Selesai]** Skeleton WASM Bindgen: Pembuatan fungsi inti pengolah `process_text_data` dan struct spesifikasi `VectorizerConfig` di `src/lib.rs`.
- **[Selesai]** Pipeline **Tokenisasi** di `src/tokenizer.rs`.
- **[Selesai]** Penyusunan map **Stopwords** di `src/stopwords.rs`.
- **[Selesai]** Logic engine pemisah sintaks **Stemming** di `src/stemmer.rs`.
- **[Selesai]** Logic utama pengumpul statistik matriks kata di `src/vectorizer.rs`.

### ✅ Fase 4: Integrasi & Build Automation (100% Selesai)
Fase integrasi hasil rakitan Rust kembali kepada Statify.
- **[Selesai]** Pembaruan skrip otomatis `build-wasm.sh` untuk menerjemahkan kode karat menjadi memori `.wasm`.
- **[Selesai]** Penyambungan fungsi Web Worker pemanggil `ArrayBuffer` dari berkas `wasm_bg.wasm`.
- **[Selesai]** Pengujian dan Unit Testing NLP Logics.
- **[Selesai]** *End-to-End* output: Memastikan kalkulasi matriks berhasil menambahkan kolom baru ke dalam *DataGrid* utama pengguna Statify.

### ✅ Fase 5: Penambahan Fitur "Words to Keep" mirip WEKA (100% Selesai)
Fase optimasi dimensi kosakata dan penambahan opsi prioritas penyimpanan kata.
- **[Selesai]** UI Integration: Menambahkan opsi *Words to Keep* di bawah metode vektorisasi dengan nilai default 1000.
- **[Selesai]** Vektor/Matriks Penyesuaian Prioritas: Mengubah prioritas perangkingan kata yang disimpan berdasarkan metode yang dipilih (Boolean menggunakan Document Frequency, TF-IDF menggunakan rerata TF-IDF, Natural TF menggunakan frekuensi total).
- **[Selesai]** Rust WASM Update: Implementasi logika kalkulasi skor kepentingan kata, pengurutan, pemotongan kosakata (*truncation*), dan penyusunan ulang kolom secara alfabetis di `rust/src/vectorizer.rs`.
- **[Selesai]** Re-compile: Sukses kompilasi ulang WebAssembly untuk runtime client-side.
