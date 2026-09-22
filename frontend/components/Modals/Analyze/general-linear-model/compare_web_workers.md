# Perbandingan Eksekusi GLM: Main Thread vs Web Worker

> **Status:** rencana, belum diimplementasikan · **Dibuat:** 2026-09-21
> **Cakupan:** GLM Multivariate & GLM Repeated Measures (Univariate memakai pola yang sama, tetapi di luar cakupan dokumen ini)

Dokumen ini merangkum tiga hal:

1. **Kondisi sekarang:** perhitungan GLM berjalan di main thread, tanpa Web Worker.
2. **Rencana pengembangan:** memindahkan perhitungan ke Web Worker.
3. **Rancangan pengujian:** membandingkan kedua kondisi untuk menjawab apakah Web Worker berpengaruh terhadap responsivitas antarmuka.

---

## 1. Latar Belakang

Tujuan penelitian nomor 2:

> *Memastikan modul yang dikembangkan tidak mengganggu responsivitas antarmuka pengguna, meskipun melakukan perhitungan matriks yang kompleks.*

JavaScript di browser menjalankan logika halaman, rendering, dan penanganan input pada **satu thread utama** (main thread). Selama perhitungan berat berjalan di thread itu, halaman tidak bisa digambar ulang dan tidak bisa merespons klik. Web Worker menyediakan thread terpisah untuk menjalankan skrip di latar belakang. Menurut spesifikasi HTML (WHATWG, §10), Web Worker:

> *"allows long tasks to be executed without yielding to keep the page responsive."*

Web Worker **tidak mempercepat** perhitungan. Yang dicapai adalah main thread tetap bebas selama perhitungan berlangsung.

---

## 2. Kondisi Sekarang (Tanpa Web Worker)

### 2.1 Alur eksekusi

Kedua modul memakai pola yang sama. Seluruh tahap berjalan di main thread:

```
[Dialog] klik OK
   │  multivariate-main.tsx / repeated-measures-main.tsx
   ▼
saveFormData(...)                         ← IndexedDB
   ▼
analyzeMultivariate / analyzeRepeatedMeasures      (services/*-analysis.ts)
   ├─ getSlicedData, getVarDefs           ← persiapan data (TS)
   ├─ await init()                        ← inisialisasi WASM
   ├─ new MultivariateAnalysis(...)       ┐
   │  / new RepeatedMeasureAnalysis(...)  │  PERHITUNGAN BERAT (Rust/WASM),
   ├─ get_formatted_results()             │  sinkron, memblokir main thread
   ├─ get_all_errors()                    ┘
   ├─ transform…Result(...)               ← formatter → tabel (TS)
   └─ result…Analysis(...)                ← tulis ke useResultStore (Zustand)
```

Berkas terkait:

| Modul | Dialog pemicu | Service |
|---|---|---|
| Multivariate | [multivariate-main.tsx](multivariate/dialogs/multivariate-main.tsx) | [multivariate-analysis.ts](multivariate/services/multivariate-analysis.ts) |
| Repeated Measures | [repeated-measures-main.tsx](repeated-measures/dialogs/repeated-measures-main.tsx) | [repeated-measures-analysis.ts](repeated-measures/services/repeated-measures-analysis.ts) |

> **Catatan penamaan.** File `multivariate/types/multivariate-worker.ts` hanya berisi kontrak tipe payload/hasil. Kata "worker" di namanya adalah sisa pola lama dan tidak berarti modul ini sudah memakai Web Worker.

### 2.2 Baseline: waktu perhitungan WASM

Diukur dengan performance test Jest yang sudah ada, dua kali berturut-turut pada 2026-09-21:

| Modul | Data uji | Run 1 | Run 2 |
|---|---|---|---|
| Multivariate | 500 kasus × 5 DV × 3 faktor | 4.982 ms | 4.575 ms |
| Repeated Measures | 1000 subjek × 5 timepoint | 1.045 ms | 1.042 ms |

**Lingkungan uji:** Windows 11 Home, Intel Core i7-12700H, RAM 24 GB, Node.js v20.19.0, Jest 30 (jsdom).
**Sumber:** [multivariate.performance.test.ts](multivariate/__test__/multivariate.performance.test.ts) dan [repeated-measures.performance.test.ts](repeated-measures/__test__/repeated-measures.performance.test.ts).

Batasan angka ini:
- Angka diukur di Node.js, bukan di browser. Keduanya memakai engine V8, tetapi angka di browser bisa berbeda.
- Yang diukur hanya bagian WASM (konstruktor + `get_formatted_results()`), belum termasuk persiapan data dan formatter.
- Ambang test Multivariate (`< 5000 ms`) sudah mepet. Test ini berisiko gagal secara acak di mesin yang lebih lambat.

### 2.3 Dampak ke antarmuka

| Acuan | Ambang | Multivariate | Repeated Measures |
|---|---|---|---|
| Long task (W3C) | > 50 ms | ≈ 100× ambang | ≈ 20× ambang |
| RAIL: respons input | < 100 ms | terlampaui | terlampaui |
| Nielsen: alur pikir tidak terputus | ≤ 1 s | terlampaui (≈ 5 s) | di batas (≈ 1 s) |

Yang dialami pengguna saat ini:
- **Multivariate:** spinner toast *"Running Multivariate analysis..."* berhenti berputar sekitar 5 detik. Halaman tidak merespons klik maupun scroll.
- **Repeated Measures:** dialog tetap terbuka dan membeku sekitar 1 detik tanpa indikator apa pun.

**Dugaan awal:** pada kondisi sekarang, tujuan nomor 2 belum terpenuhi. Dugaan ini akan dikonfirmasi oleh pengujian di bagian 4, dengan kondisi sekarang sebagai mode A.

---

## 3. Rencana Pengembangan: Perhitungan di Web Worker

### 3.1 Prinsip

- **Engine Rust tidak diubah.** Yang dipindah hanya pemanggilan WASM-nya.
- **Satu binary WASM.** Worker memakai paket `rust/pkg` yang sama dengan yang diuji Jest. Dengan begitu, validasi numerik terhadap SPSS tetap berlaku untuk kode yang benar-benar dijalankan pengguna.
- **Pindahkan seminimal mungkin.** Tahap yang membutuhkan store atau DOM tetap di main thread.
- **Mode lama tetap tersedia** lewat saklar runtime, supaya kedua mode bisa dibandingkan pada build yang sama (lihat 3.4 dan 4.2).

### 3.2 Pembagian kerja

| Tahap | Sekarang | Setelah | Alasan |
|---|---|---|---|
| `getSlicedData`, `getVarDefs`, `buildDifferenceData` (paired) | main | main | Ringan; butuh data dari store |
| `init()` WASM | main | **worker** | Cukup sekali per worker (worker dipakai ulang) |
| `new …Analysis(...)`, `get_formatted_results()`, `get_all_errors()` | main | **worker** | Inilah beban utama |
| `transform…Result(...)` (formatter) | main | main* | *Dipindah ke worker hanya jika pengukuran menunjukkan formatter menghasilkan long task |
| `result…Analysis(...)` | main | main | Menulis ke `useResultStore` (Zustand), yang hanya ada di main thread |

### 3.3 Rujukan pola di repo

Dua modul di repo ini sudah menjalankan WASM di dalam Web Worker: **Discriminant** dan **K-Medoids**. Rujukan utamanya adalah **Discriminant**, karena modul ini dibangun dari template yang sama dengan GLM:

| Aspek | Discriminant | GLM Multivariate / Repeated Measures | K-Medoids |
|---|---|---|---|
| Struktur folder | `constants/ dialogs/ hooks/ rust/ services/ types/` | Sama | Berbeda (ada `components/ utils/ formula-tests/`) |
| Isi `rust/src` | `lib.rs, models/, stats/, test/, utils/, wasm/` | Sama | — |
| Kontrak tipe | `DiscriminantAnalysisType { configData, dataVariables, variables }` | Bentuk sama (`MultivariateAnalysisType`, dst.) | Berbeda |
| API WASM | Konstruktor kelas → `get_formatted_results()`, `get_all_errors()` | Sama | Fungsi lepas (`run_k_medoids(...)`) |

Discriminant juga menyimpan contoh **sebelum dan sesudah** migrasi dari template yang sama:
- **Sebelum:** [discriminant-analysis.ts](../Classify/discriminant/services/discriminant-analysis.ts), versi main thread yang sudah tidak dipanggil.
- **Sesudah:** [useDiscriminantState.ts](../Classify/discriminant/hooks/useDiscriminantState.ts), versi worker.

**Mekanisme worker kedua rujukan** (kondisi per 2026-09-21)

| Aspek | Discriminant | K-Medoids |
|---|---|---|
| File worker | [discriminant.worker.js](../../../../public/workers/Classify/Discriminant/discriminant.worker.js): JS biasa di `public/`, tidak dicek TypeScript | [cluster-worker.ts](../Clustering/k-medoids-cluster/services/cluster-worker.ts): TypeScript, di-bundle webpack |
| Cara membuat worker | `new Worker('/workers/…js', { type: 'module' })` | `new Worker(new URL('./cluster-worker.ts', import.meta.url), { type: 'module' })` |
| Sumber WASM | Salinan terpisah di `public/workers/Classify/Discriminant/pkg/` | `public/workers/Clustering/K-Medoids/` |
| Siklus hidup | Worker baru dibuat dan WASM dimuat ulang di setiap run, lalu di-terminate | Satu worker dipakai ulang; WASM diinisialisasi sekali |
| Kontrak pesan | Satu jenis permintaan; balasan `SUCCESS`/`ERROR` tanpa ID | Banyak jenis pesan + `requestId`, progress, cancel |
| Timeout / cancel | Tidak ada | Ada |
| Jalur cadangan ke main thread | Tidak ada | Ada (opsi `useWorker`) |
| Ukuran kode | 97 baris | 782 baris worker + 305 baris wrapper |

**Yang diambil dari masing-masing rujukan**
- **Dari Discriminant:**
  - Alur dan pembagian kerja: persiapan data dan penyimpanan hasil di main thread, sedangkan konstruktor WASM dan pemanggilan `get_*` di worker.
  - Bentuk payload yang dikirim ke worker.
- **Dari K-Medoids:**
  - Worker ditulis dalam TypeScript dan di-bundle lewat `new URL(…, import.meta.url)`.
  - Worker dipakai ulang.
  - Ada jalur cadangan ke main thread. Jalur ini sekaligus dipakai untuk mode A pada eksperimen.

**Yang tidak ditiru dari Discriminant, beserta alasannya**
1. **Salinan WASM terpisah di `public/`.** Per 2026-09-21, dua salinan WASM Discriminant isinya berbeda:

   | Salinan | Ukuran | Commit terakhir |
   |---|---|---|
   | `rust/pkg/wasm_bg.wasm` | 4.029.714 byte | 2026-06-25 |
   | `public/…/pkg/wasm_bg.wasm` (dipakai browser) | 4.065.013 byte | 2026-06-08 |

   Tidak ada skrip yang menyinkronkan keduanya. Belum dipastikan apakah perilakunya ikut berbeda. Kalau GLM meniru pola ini, test Jest yang memvalidasi kesamaan hasil dengan SPSS akan menguji binary yang berbeda dari yang dijalankan pengguna.
2. **WASM (sekitar 4 MB) dimuat ulang di setiap run.** Ini menambah waktu setiap analisis dan membuat metrik waktu total pada mode B bias.
3. **Tidak ada jalur main thread.** Padahal eksperimen A/B membutuhkan kedua mode tersedia di build yang sama.
4. **Hasil lengkap dicetak lewat `console.log`** di worker maupun di main thread. Mencetak objek besar juga memakan waktu main thread.

K-Medoids tidak dijadikan rujukan utama karena sebagian besar kompleksitasnya melayani kebutuhan yang tidak ada di GLM: pencarian range k, silhouette, progress per iterasi, dan thread pool Rayon.

### 3.4 Implementasi (kondisi per 2026-09-22)

> Bagian ini semula berisi rancangan. Isinya sudah diperbarui mengikuti implementasi yang benar-benar dibuat. Penyimpangan dari rancangan awal ditandai **(berubah)**.

**Berkas**

| Berkas | Isi |
|---|---|
| [shared/glm-execution.ts](shared/glm-execution.ts) **(baru)** | Pembacaan mode, `GlmWorkerClient` (siklus hidup worker), `executeGlmComputation` (pemilihan mode dan jalur cadangan), serta kedua `performance.mark` |
| [multivariate/services/multivariate-analysis-worker.ts](multivariate/services/multivariate-analysis-worker.ts) **(baru)** | Worker Multivariate: `init()` → konstruktor → `get_formatted_results()` / `get_all_errors()` → `free()` |
| [repeated-measures/services/repeated-measures-analysis-worker.ts](repeated-measures/services/repeated-measures-analysis-worker.ts) **(baru)** | Worker Repeated Measures, dengan pola yang sama |
| [multivariate-analysis.ts](multivariate/services/multivariate-analysis.ts), [repeated-measures-analysis.ts](repeated-measures/services/repeated-measures-analysis.ts) | Blok `init()` → konstruktor → `get_*` diganti satu pemanggilan `computeMultivariate` / `computeRepeatedMeasures`. Jalur lama dipindah ke `run…OnMainThread`, ditambah `free()` dalam `try/finally` **(berubah)**. |

- **Nama berkas worker (berubah):** memakai `*-analysis-worker.ts`, bukan `*.worker.ts`. Alasannya, `next.config.js` mengirim setiap berkas yang cocok dengan `/\.worker\.(js|ts)$/` ke `worker-loader`, dan ini merusak bundling `new Worker(new URL(...))`. Buktinya ada di 3.5.

  ```ts
  new Worker(new URL("./multivariate-analysis-worker.ts", import.meta.url), { type: "module" });
  ```

- **Modul bersama (berubah):** pemilihan mode, siklus hidup worker, dan penanda waktu ditaruh di `shared/glm-execution.ts`. Tujuannya supaya kedua modul berperilaku identik, sehingga perbandingan di eksperimen adil. Titik integrasinya tetap hanya di kedua service. Dialog, formatter, dan penulisan ke `useResultStore` tidak berubah.
- **Sumber WASM (satu binary):**
  - Worker Multivariate memakai `// @ts-ignore` di atas `import init, { MultivariateAnalysis } from "../rust/pkg"`, sama seperti service-nya **(berubah)**. Tanpa itu, pemeriksaan tipe proyek penuh mengarahkan impor ini ke tipe paket GLM lain.
    - **Dugaan penyebab:** semua paket `rust/pkg` GLM bernama `wasm@0.1.0`, dan TypeScript memperlakukan paket bernama sama sebagai satu paket.
    - **Bukti pendukung (2026-09-22):** `tsc` penuh menunjukkan tipe Multivariate diarahkan ke Univariate. Ketika satu impor folder `rust/pkg` ditambahkan, arahnya berbalik dan `univariate-analysis.ts` gagal `next build`.
    - Mekanisme internal TypeScript-nya belum ditelusuri sampai tuntas, jadi status ini masih dugaan.
  - Worker Repeated Measures memakai `../rust/pkg/wasm`, sama seperti service-nya.
  - Di build produksi, aset `.wasm` kedua modul identik byte-per-byte dengan `rust/pkg`. Worker dan main thread memakai chunk *glue* yang sama.
- **Kontrak pesan:** permintaan `{ id, payload }`. Balasan `{ id, ok: true, results, errors }` atau `{ id, ok: false, error }`. `payload` berisi argumen konstruktor dengan nama parameter Rust (`dep_data`, …, `config_data`), mengikuti bentuk payload Discriminant.
- **Siklus hidup:**
  - Satu worker per modul, dibuat saat analisis pertama lalu dipakai ulang. WASM diinisialisasi sekali per worker.
  - **Timeout 10 menit** (`GLM_WORKER_TIMEOUT_MS`), sengaja longgar. Mode main tidak punya batas waktu, jadi worker tidak boleh memotong analisis yang di mode main akan selesai.
  - Worker di-`terminate()` dan dibuat ulang pada analisis berikutnya jika terjadi `onerror`, `onmessageerror`, timeout, **dan juga balasan `ok: false`** **(berubah)**. Alasan untuk `ok: false`: instance WASM bisa berada dalam keadaan tidak menentu setelah Rust *panic*. Semua permintaan yang masih menunggu ditolak saat reset.
  - Error dari worker dibungkus `GlmWorkerTaskError` yang `toString()`-nya mengembalikan teks asli, sehingga pesan di toast sama dengan mode main.
  - **`free()` di kedua jalur (berubah).** Worker dan jalur main sama-sama memanggil `free()` pada objek `MultivariateAnalysis` / `RepeatedMeasureAnalysis`, di dalam `try/finally`, setelah `get_formatted_results()` dan `get_all_errors()` dibaca. Objek tetap dibebaskan meskipun terjadi error.
    - Semula hanya worker yang memanggil `free()`, sedangkan jalur main mengikuti kode lama tanpa `free()`. Tanpa `free()`, objek Rust (berisi seluruh input dan tabel hasil) baru dibebaskan ketika garbage collector JS memfinalisasi pembungkusnya.
    - **Alasan perubahan:**
      1. Menghilangkan pertumbuhan memori WASM di mode main.
      2. Memastikan satu-satunya perbedaan antara mode A dan mode B adalah **letak eksekusi**.
    - **Hasil pengukuran** (build produksi, 10 run berturut-turut; [results/2026-09-22-free-main](../../../../../testing/glm-web-worker/results/2026-09-22-free-main/)):

      | Modul / data | Sebelum | Sesudah |
      |---|---|---|
      | Multivariate `perf500` | 3,81 → 15,44 MB (sekitar 1,5 MB per run) | 3,81 MB datar |
      | Repeated Measures 1000 subjek | 18,38 → 26,06 MB (satu lonjakan di run 3) | 18,38 MB datar |

      Waktu per run tidak berubah.
    - Keluaran mode main dan worker tetap identik setelah perubahan (13 dari 13 langkah verifikasi).
- **Saklar mode (A/B):**
  - `localStorage["glm-execution-mode"] = "main"` untuk mode main. Nilai lain, atau `localStorage` yang error, berarti mode worker.
  - Jalur cadangan `main-fallback` **hanya** dipakai jika konstruktor `Worker` gagal (atau `Worker` tidak tersedia), dan selalu disertai `console.warn`. Kegagalan memuat skrip worker (`onerror`) tidak jatuh ke main thread, melainkan menjadi error analisis.
- **Pencatatan mode:** `performance.mark("glm-analysis-start")` di awal analisis, dan `performance.mark("glm-analysis-end", { detail: { module, mode } })` setelah hasil ditulis ke store. Jika analisis gagal, *mark* akhir tidak dibuat.
- **Transfer data:** lewat *structured clone*, yang mendukung `Map` keluaran `serde_wasm_bindgen`.
- **Logging:** hasil lengkap tidak dicetak ke `console`.
- **Status pengujian jalur kegagalan:**
  - Yang sudah terverifikasi: jalur `ok: false` (teks error sama dengan mode main, worker dibuat ulang), jalur `main-fallback`, dan kegagalan `localStorage`.
  - **Jalur timeout dan `onerror` belum teruji langsung.**

### 3.5 Risiko teknis dan hasil spike

**Risiko awal:** belum diverifikasi bahwa paket wasm-bindgen (`--target web`) di `rust/pkg` bisa dimuat dari dalam worker yang di-bundle webpack pada Next.js 15. K-Medoids dan Discriminant sama-sama menaruh WASM di `public/`, dan K-Medoids mencatat alasannya: *"avoids brittle relative URL resolution when worker chunks are relocated"* ([cluster-worker.ts](../Clustering/k-medoids-cluster/services/cluster-worker.ts)).

**Hasil spike (2026-09-21/22).** Dua varian worker dengan isi identik diuji; keduanya mengimpor WASM langsung dari `rust/pkg`:

| Varian | `next dev` | Build produksi |
|---|---|---|
| `spike-plain.ts` (nama tidak cocok dengan aturan `worker-loader`) | Berhasil; `init()` 74–87 ms | Berhasil; `init()` 50 ms |
| `spike.worker.ts` (nama sesuai rancangan awal) | Gagal: setiap halaman yang dikompilasi sesudahnya error 500 (*clientReferenceManifest invariant*) | Gagal: chunk worker hanya 195 byte, tanpa handler `onmessage`, dan tidak pernah membalas |

- **Kesimpulan:** risiko resolusi URL WASM **tidak terjadi**. Yang gagal adalah nama berkas, karena aturan `worker-loader` di `next.config.js`. Rencana cadangan (WASM di `public/`, disalin otomatis, ditambah test hash) **tidak dipakai**, karena tidak menyelesaikan masalah nama berkas dan justru melemahkan prinsip satu binary.
- **Risiko tambahan yang ditemukan:** kerapuhan pemeriksaan tipe akibat nama paket `wasm@0.1.0` yang sama di semua GLM (lihat 3.4). Perbaikan akarnya, misalnya memberi nama paket yang unik per modul, menyentuh konfigurasi paket Rust dan berada di luar cakupan implementasi ini.
- **Bukti dan skrip:** [testing/glm-web-worker/](../../../../../testing/glm-web-worker/README.md), dengan hasil di `results/2026-09-22-implementation/`.

### 3.6 Dampak ke test yang ada

Test Jest (correctness dan performance) memanggil WASM secara langsung, tidak lewat worker, sehingga **tidak terpengaruh**. Karena worker memakai `rust/pkg` yang sama, apa pun yang diuji Jest berlaku juga untuk binary yang dijalankan di browser.

**Test Jest bukan validasi akurasi terhadap acuan eksternal.** Kondisi `multivariate.test.ts` per diagnosis 2026-09-22 ([results/2026-09-22-multivariate-test](../../../../../testing/glm-web-worker/results/2026-09-22-multivariate-test/)):

- **Dataset sintetis.** Test ini memakai dataset sintetis yang dibangkitkan di dalam kode test. Nilai harapannya **bukan berasal dari SPSS** maupun dari perhitungan manual yang terdokumentasi.
- **Fixture SPSS belum ada.** README di `multivariate/__test__/fixtures/spss/dataset-a…c` masih berstatus *"waiting for official SPSS export"*.
- **4 dari 23 assertion gagal**, dan sudah gagal sejak sebelum implementasi Web Worker. Test ditulis 2026-05-02 (`5773f1dfd`) dan belum diperbarui sejak perbaikan rumus di `2ec8a5ae` (2026-06-01) dan `696808e77` (2026-06-08).

  | Dataset | Assertion | Harapan | Didapat | Asal nilai harapan |
  |---|---|---|---|---|
  | C | Box's M `.f` | 1,54974 | 1,54850 | **Terbukti** salinan keluaran engine sebelum perbaikan. Rumus lama di `box_m_test.rs` pada `5773f1dfd`, yaitu `(1 − c1)·M/df1` dengan df2 = N − k, menghasilkan tepat nilai harapan ini. Nilai sekarang cocok tepat dengan rumus Box (1949). |
  | C | Box's M `.significance` | 0,19756 | 0,15801 | Sama seperti di atas. |
  | A | Pillai's Trace (Group) `.value` | 0 | 0,99990 | Belum dapat dipastikan. Nilai engine cocok dengan perhitungan independen. Signifikansinya (1,1·10⁻⁷) akan lolos `toBeCloseTo(0, 6)`, jadi mungkin yang dimaksud test adalah `.significance`. Engine versi lama tidak dapat dijalankan ulang untuk memeriksa. |
  | B | Pillai's Trace (Group) `.f` | 0 | 17,663 | Belum dapat dipastikan, dengan pola yang sama seperti A. Selain itu ada indikasi terpisah bahwa uji multivariat engine untuk Dataset B tidak memperhitungkan kovariat Cov1 (df galat 54), padahal tabel univariatnya memakai df galat 53. Ini perlu dicek terhadap SPSS. |

- **Validasi akurasi dilakukan terpisah.** Validasi akurasi terhadap acuan eksternal (keluaran SPSS) dilakukan **terpisah dari test Jest**. Sesuai judulnya (*"Wasm smoke and numeric regression"*), test Jest di atas hanya berfungsi sebagai uji asap (*smoke test*) dan uji regresi terhadap keluaran engine sebelumnya.

---

## 4. Rancangan Pengujian Perbandingan

### 4.1 Pengujian dilakukan di browser, bukan di Jest

- Jest di proyek ini memakai `testEnvironment: 'jsdom'` ([jest.config.js](../../../../jest.config.js)), dan jsdom tidak menyediakan `Worker`.
- Yang diuji adalah responsivitas UI, yang membutuhkan event loop browser, rendering, dan input pengguna. Jest tidak punya UI.
- Pengujian ini memakai **Playwright + Chromium**. `@playwright/test` sudah terpasang di [package.json](../../../../package.json).

Dengan begitu pengujian terbagi menjadi dua lapis. Keduanya termasuk karakteristik *performance efficiency → time behaviour* (ISO/IEC 25010:2023):

| Lapis | Tool | Yang diukur |
|---|---|---|
| Benchmark engine (sudah ada) | Jest | Waktu perhitungan WASM |
| Uji responsivitas (baru) | Playwright + Chromium | Pemblokiran main thread: mode A vs mode B |

### 4.2 Desain: eksperimen komparatif (A/B)

**Variabel bebas**

| Variabel | Level |
|---|---|
| Mode eksekusi | **A** = main thread (kondisi sekarang) · **B** = Web Worker |
| Ukuran data | 100, 500, 1000, 2000 kasus (Multivariate) / subjek (Repeated Measures) |
| Kecepatan CPU (opsional) | 1× dan 4×, via CDP `Emulation.setCPUThrottlingRate`. Angka 4× adalah default Lighthouse untuk mensimulasikan perangkat kelas menengah. |

Kedua mode diuji pada **build yang sama**. Mode dipilih lewat saklar runtime (key `localStorage`, lihat 3.4), bukan lewat build terpisah. Setiap run mencatat mode yang benar-benar dipakai, supaya run yang jatuh ke main thread tidak terhitung sebagai mode B.

**Variabel terikat (metrik)**

| Metrik | Cara ukur | Acuan | Sumber |
|---|---|---|---|
| **Long task terpanjang** (metrik utama) | `PerformanceObserver` dengan tipe `longtask` | > 50 ms = long task | W3C Long Tasks API |
| Total waktu blocking | Σ(durasi − 50 ms) dari setiap long task selama analisis | Makin kecil makin baik | Cara hitung TBT (web.dev) |
| Jeda frame terpanjang | Selisih waktu antar callback `requestAnimationFrame` | ≈ 16 ms per frame (60 fps) | RAIL |
| Waktu total sampai hasil tampil | `performance.now()` dari klik OK sampai hasil muncul | Tidak ada ambang; dipakai untuk melihat overhead worker | — |

> TBT resmi didefinisikan untuk jendela waktu muat halaman (setelah FCP). Pengujian ini **mengadopsi cara hitungnya** untuk jendela waktu analisis.

**Kontrol eksperimen**

- Gunakan build produksi (`next build` lalu `next start`), bukan `next dev`.
- Gunakan mesin, versi Chromium, dan dataset yang sama untuk semua kondisi, dan catat spesifikasinya.
- Lakukan **minimal 30 pengulangan per sel**. Georges et al. (2007): untuk n ≥ 30, interval kepercayaan dihitung dengan z; untuk n < 30, dengan t.
- Laporkan run pertama terpisah dari run berikutnya. Pada mode B, run pertama mencakup pembuatan worker dan inisialisasi WASM; run berikutnya memakai worker yang sama. Georges et al. membedakan performa awal (*startup*) dan performa stabil (*steady-state*).
- Jalankan mode A dan B secara **bergantian**, supaya kondisi mesin (suhu, proses latar belakang) tidak menguntungkan salah satu mode.

### 4.3 Langkah pengujian (per run)

1. Buka aplikasi (build produksi) dan muat dataset uji.
2. Pasang pengamat melalui `page.addInitScript`: `PerformanceObserver('longtask')` dan probe `requestAnimationFrame`.
3. Atur mode (A/B) dan, bila dipakai, *throttling* CPU melalui CDP session.
4. Buka dialog Multivariate atau Repeated Measures, isi variabel, lalu klik OK. Catat `t0`.
5. Tunggu hasil muncul di output. Catat `t1`.
6. Kumpulkan data long task, jeda frame, dan `t1 − t0`, lalu simpan sebagai satu baris CSV.

### 4.4 Hipotesis dan analisis statistik

Untuk setiap kombinasi modul × ukuran data × CPU:

- **H₀:** distribusi durasi long task terpanjang pada mode B sama dengan pada mode A.
- **H₁:** durasi long task terpanjang pada mode B lebih kecil daripada pada mode A.

Analisis yang dipakai:

| Langkah | Metode | Sumber |
|---|---|---|
| Deskriptif | Median, IQR, mean ± CI 95% | Georges et al. (2007) |
| Uji beda | Mann–Whitney U satu arah, α = 0,05 (nonparametrik, karena data waktu umumnya menceng) | Mann & Whitney (1947); Arcuri & Briand (2011) |
| Effect size | Vargha–Delaney Â₁₂ | Vargha & Delaney (2000); Arcuri & Briand (2011) |
| Pendukung | Perbandingan tumpang tindih CI antar mode | Georges et al. (2007) |
| Opsional | ANOVA untuk interaksi mode × ukuran data | Georges et al. (2007) |

### 4.5 Kriteria keputusan

Dua pertanyaan dijawab secara terpisah:

**(a) Apakah Web Worker berpengaruh?** Ya, jika pada suatu kombinasi kondisi:
- Mann–Whitney U memberi p < 0,05, **dan**
- Â₁₂ ≥ 0,71 (kategori *besar* menurut Vargha & Delaney).

**(b) Apakah tujuan nomor 2 tercapai?** Ya, jika pada mode B, di semua ukuran data yang diuji:
- median long task terpanjang < 100 ms (batas respons RAIL), **dan**
- tidak ada long task yang bersumber dari perhitungan WASM.

Metrik waktu total (sampai hasil tampil) dilaporkan untuk menunjukkan overhead worker, tetapi **tidak menjadi kriteria**, karena worker memang tidak dimaksudkan untuk mempercepat perhitungan.

### 4.6 Template hasil

Tabel ini diisi setelah eksperimen dijalankan.

**Ringkasan metrik** (median [IQR], n = 30 per sel)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) |
|---|---|---|---|---|---|---|---|
| Multivariate | 500 | 1× | A | — | — | — | — |
| Multivariate | 500 | 1× | B | — | — | — | — |
| Repeated Measures | 1000 | 1× | A | — | — | — | — |
| Repeated Measures | 1000 | 1× | B | — | — | — | — |
| … | … | … | … | … | … | … | … |

**Uji statistik** (long task terpanjang, A vs B)

| Modul | n data | CPU | U | p-value | Â₁₂ | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|
| Multivariate | 500 | 1× | — | — | — | — | — |
| Repeated Measures | 1000 | 1× | — | — | — | — | — |
| … | … | … | … | … | … | … | … |

### 4.7 Keterbatasan

- Long Tasks API hanya didukung browser berbasis Chromium, sehingga hasil terbatas pada Chromium.
- Pengujian bersifat sintetis (otomatis), bukan pengguna nyata. INP hanya dipakai sebagai acuan ambang, tidak diukur di lapangan.
- Pada mode B, main thread tetap menjalankan persiapan data, formatter, dan penulisan hasil. Pengujian mengukur alur penuh, jadi long task kecil dari tahap-tahap tersebut tetap dilaporkan apa adanya.
- *Throttling* CPU hanya emulasi, bukan pengganti pengujian di perangkat fisik yang lebih lemah.

---

## 5. Status dan Langkah Berikutnya

- [x] Ukur baseline waktu WASM (Jest), lihat 2.2
- [x] Tentukan rujukan pola: Discriminant untuk alur, K-Medoids untuk mekanisme worker (lihat 3.3)
- [ ] Konsultasikan metode pengujian dengan dosen pembimbing
- [x] Uji coba (*spike*) memuat WASM dari `rust/pkg` di dalam worker, di `next dev` dan build produksi (lihat 3.5). Hasil: **berhasil di kedua lingkungan**, jadi rencana cadangan 3.5 tidak dipakai. Nama berkas `*.worker.ts` dari 3.4 ternyata bentrok dengan aturan `worker-loader` di `next.config.js`:
  - di `next dev`, setiap halaman yang dikompilasi sesudahnya error 500;
  - di build produksi, worker yang dihasilkan kosong dan tidak pernah membalas.

  Karena itu berkas worker dinamai `*-analysis-worker.ts`.
- [x] Implementasi worker: Multivariate (`multivariate/services/multivariate-analysis-worker.ts`)
- [x] Implementasi worker: Repeated Measures (`repeated-measures/services/repeated-measures-analysis-worker.ts`)
- [x] Saklar runtime mode A/B (`localStorage["glm-execution-mode"] = "main"`) + pencatatan mode aktual per run (`worker` / `main` / `main-fallback`), di `shared/glm-execution.ts`
- [x] Penanda waktu `glm-analysis-start` / `glm-analysis-end` (detail `{ module, mode }`) untuk skenario Playwright
- [x] Verifikasi kesetaraan dan jalur eksekusi (dev dan build produksi), diuji pada 13 langkah:
  - keluaran `get_formatted_results()` mode main dan worker identik;
  - output yang ditulis ke store juga identik;
  - tidak ada pemanggilan WASM di main thread pada mode worker;
  - jalur cadangan tercatat sebagai `main-fallback`.
- [ ] Skenario Playwright + probe metrik
- [ ] Jalankan eksperimen, isi tabel 4.6
- [ ] Analisis statistik dan kesimpulan: berpengaruh atau tidak

---

## 6. Referensi

**Standar dan spesifikasi**

1. W3C. (2026, 19 Maret). *Long Tasks API* (W3C Working Draft; editor N. Rosenthal). https://www.w3.org/TR/longtasks-1/
2. WHATWG. *HTML Living Standard*, §10 "Web workers". https://html.spec.whatwg.org/multipage/workers.html
3. ISO/IEC 25010:2023. *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model*. https://www.iso.org/standard/78176.html

**Metodologi benchmark dan statistik**

4. Georges, A., Buytaert, D., & Eeckhout, L. (2007). Statistically rigorous Java performance evaluation. *Proceedings of OOPSLA '07*, 57–76. https://doi.org/10.1145/1297027.1297033
5. Kalibera, T., & Jones, R. (2013). Rigorous benchmarking in reasonable time. *Proceedings of ISMM '13*, 63–74. https://doi.org/10.1145/2464157.2464160
6. Arcuri, A., & Briand, L. (2011). A practical guide for using statistical tests to assess randomized algorithms in software engineering. *Proceedings of ICSE '11*, 1–10. https://doi.org/10.1145/1985793.1985795
7. Mann, H. B., & Whitney, D. R. (1947). On a test of whether one of two random variables is stochastically larger than the other. *The Annals of Mathematical Statistics, 18*(1), 50–60. https://doi.org/10.1214/aoms/1177730491
8. Vargha, A., & Delaney, H. D. (2000). A critique and improvement of the CL common language effect size statistics of McGraw and Wong. *Journal of Educational and Behavioral Statistics, 25*(2), 101–132. https://doi.org/10.3102/10769986025002101

**Ambang waktu respons (HCI)**

9. Nielsen, J. (1993). *Usability Engineering* (Bab 5). Academic Press. Ringkasan: https://www.nngroup.com/articles/response-times-3-important-limits/
10. Miller, R. B. (1968). Response time in man-computer conversational transactions. *Proceedings of AFIPS Fall Joint Computer Conference, 33*, 267–277.
11. Card, S. K., Robertson, G. G., & Mackinlay, J. D. (1991). The information visualizer: An information workspace. *Proceedings of CHI '91*, 181–188.

**Dokumentasi industri** (pendukung; untuk ambang utama, kutip sumber primer di atas)

12. Google Chrome Team. (2020). *Measure performance with the RAIL model*. web.dev. https://web.dev/articles/rail
13. Walton, P., & Pollard, B. (2019; diperbarui 2025). *Total Blocking Time (TBT)*. web.dev. https://web.dev/articles/tbt
14. Wagner, J., & Pollard, B. (2022; diperbarui 2025). *Interaction to Next Paint (INP)*. web.dev. https://web.dev/articles/inp

**Landasan teori**

15. Verdú, J., & Pajuelo, A. (2016). Performance scalability analysis of JavaScript applications with web workers. *IEEE Computer Architecture Letters, 15*(2), 105–108. https://doi.org/10.1109/LCA.2015.2494585
16. Haas, A., Rossberg, A., Schuff, D., Titzer, B. L., Gohman, D., Wagner, L., Zakai, A., Bastien, J. F., & Holman, M. (2017). Bringing the web up to speed with WebAssembly. *Proceedings of PLDI '17*, 185–200. https://doi.org/10.1145/3062341.3062363

**Dokumentasi tool**

17. Playwright. *CDPSession*. https://playwright.dev/docs/api/class-cdpsession
18. Chrome DevTools Protocol. *Emulation.setCPUThrottlingRate*. https://chromedevtools.github.io/devtools-protocol/tot/Emulation/
19. Google Lighthouse. *Throttling*. https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md
