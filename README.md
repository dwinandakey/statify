# Statify

**Statify** adalah Aplikasi analisis statistik berbasis web yang berfungsi untuk mendukung proses pembelajaran mata kuliah di bidang statistik di lingkungan **Politeknik Statistika STIS**. **Statify** memudahkan pengguna untuk mengunggah data dan melakukan analisis statistik. Dibangun dengan Next.js untuk frontend dan Express.js untuk backend, dengan penyimpanan data menggunakan IndexedDB di browser.

## Riwayat Pengembangan

| Angkatan | Cakupan | Dokumentasi |
|---|---|---|
| 63 | Enam modul yang dikembangkan paralel | [README_Statify_63.md](README_Statify_63.md) |
| 64 | Sebelas modul yang dikembangkan paralel | [README_Statify_64.md](README_Statify_64.md) |

## Fitur

### Manajemen data

- **Impor**: file SPSS (`.sav`), CSV, Excel (`.xlsx`), clipboard, dan contoh dataset.
- **Ekspor**: CSV dan Excel, serta cetak (Print).
- **Data**: Aggregate, Sort Cases/Variables, Select Cases, Weight Cases, Transpose, Restructure, Duplicate Cases, Unusual Cases, Define Variable Properties, Set Measurement Level, Define Date/Time.
- **Transform**: Compute Variable, Rank Cases, Recode (into same/different variables), String to Word Vector.
- **Edit**: Find and Replace, Go To.
- **Penyimpanan otomatis** ke IndexedDB di browser (Dexie), sehingga data dan hasil analisis tetap ada setelah halaman dimuat ulang.

### Analisis statistik

Modul berikut ada di `frontend/components/Modals/Analyze/`. Sebagian item di menu masih berstatus nonaktif.

| Kelompok | Isi |
|---|---|
| Descriptive Statistics | Descriptives, Frequencies, Explore, Crosstabs |
| Compare Means | One-Sample T Test, Independent-Samples T Test, Paired-Samples T Test, One-Way ANOVA, Bartlett Test |
| Correlate | Bivariate |
| Regression | Linear, Binary Logistic, Multinomial Logistic, Ordinal, Curve Estimation |
| General Linear Model | Univariate, Multivariate, Repeated Measures, Variance Components |
| Nonparametric Tests | Legacy Dialogs |
| Classify | Naive Bayes, Nearest Neighbor, Discriminant, Decision Tree, ROC Analysis/Curve, K-Means, K-Medoids, Hierarchical, Two-Step Cluster, Apply Model |
| Dimension Reduction | Factor, Correspondence Analysis, Optimal Scaling |
| Time Series | Smoothing, Decomposition, Autocorrelation, Unit Root Test, Box-Jenkins, ARDL, ECM, Heteroskedasticity Models, Homoscedasticity Test |
|| Text Analytics | String to Word Vector (menu Transform) dan analisis teks (worker `TextAnalytics`) |
### Visualisasi

- **Chart Builder** dan **Legacy Dialogs** di menu Graphs, dengan Chart.js, ECharts, D3, dan Recharts.

### Antarmuka

-- Tampilan hasil bergaya SPSS (tabel output, catatan kaki, interpretasi singkat) dan log analisis.
- Halaman **Help** berisi panduan statistik dan penggunaan modul.
- Tur fitur interaktif pada dialog analisis (misalnya Regresi Logistik Biner).
## Arsitektur

```
Dialog (React)  ->  Web Worker  ->  WASM (Rust)  ->  Formatter (TypeScript)  ->  IndexedDB  ->  Halaman Result
 input variabel     siapkan data    hitung statistik   susun tabel gaya SPSS      simpan log,       tampilkan tabel
 dan opsi           (cleaning,      (IRLS, uji, dll.)                             analytic,         dan grafik
                    pengodean)                                                    statistic
```

- **Frontend (Next.js)** menjalankan seluruh alur di atas di browser. Worker berada di `frontend/public/workers/`, sedangkan sumber Rust berada di folder `rust/` atau `wasm/` pada tiap modul.
- **Backend (Express.js)** hanya melayani file `.sav`:
  - `POST /api/sav/upload`: membaca file `.sav` menjadi data dan metadata variabel.
  - `POST /api/sav/create`: membuat file `.sav` dari data.
  - `GET /api-docs`: dokumentasi Swagger.
- Keamanan backend: Helmet, CORS dengan daftar origin yang diizinkan (`backend/server/config/constants.ts`), batas unggah 10 MB, dan rate limiting (dinonaktifkan secara default).

## Struktur Direktori

```
statify/
├── frontend/                       # Aplikasi web Next.js 15 (React 18, TypeScript)
│   ├── app/                        # App Router: landing, dashboard, help
│   ├── components/
│   │   └── Modals/                 # Seluruh dialog fitur
│   │       ├── Analyze/            # Modul analisis (lihat tabel di atas)
│   │       ├── Data/  Edit/  File/  Graphs/  Transform/
│   │       └── ModalRegistry.tsx   # Pendaftaran dialog -> komponen
│   ├── hooks/  lib/  services/  stores/  repositories/  types/  utils/
│   ├── public/workers/             # Web Worker + paket WASM hasil build
│   └── __tests__/  __mocks__/      # Pengujian dan mock frontend
├── backend/                        # Express.js: pemrosesan file .sav
│   ├── server/
│   │   ├── app.ts  index.ts        # Aplikasi Express dan entry point
│   │   ├── config/  routes/  controllers/  services/  types/
│   │   └── __tests__/
│   └── patches/                    # Patch untuk sav-reader (patch-package)
├├── 1. Panduan Penggunaan/          # Panduan penggunaan Statify (PDF)
── patches/                        # Patch untuk sav-reader di level root
├── docker-compose.yml              # Menjalankan frontend + backend lewat Docker
├── docker-compose.dokploy.yml      # Konfigurasi deployment Dokploy (Traefik)
├── README.md                       # Dokumen ini
├── README_Statify_63.md            # Kontributor dan modul angkatan 63
└── README_Statify_64.md            # Kontributor dan modul angkatan 64
```

Dokumentasi per bagian: [frontend/README.md](frontend/README.md), [backend/Readme.md](backend/Readme.md), [backend/server/README.md](backend/server/README.md), [frontend/components/Modals/README.md](frontend/components/Modals/README.md) (arsitektur modal), [frontend/components/Modals/Analyze/README.md](frontend/components/Modals/Analyze/README.md), dan [frontend/public/workers/README.md](frontend/public/workers/README.md) (pola worker).

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS, Radix UI, Framer Motion, Lucide |
| State dan data | Zustand, Dexie (IndexedDB), Handsontable (grid data), PapaParse, SheetJS (xlsx) |
| Komputasi | Rust, wasm-bindgen, wasm-pack (WASM di Web Worker), Math.js, jStat |
| Visualisasi | Chart.js, ECharts, D3, Recharts |
| Ekspor | jsPDF, SheetJS |
| Backend | Express.js 4, TypeScript, Zod, Formidable, Helmet, CORS, express-rate-limit, swagger-ui-express, sav-reader, sav-writer |
|| Pengujian | Jest, Testing Library, `cargo test` |
 Deployment | Docker, Docker Compose, Dokploy (Traefik) |

## Prasyarat

- **Node.js** 18.18 atau lebih baru (disyaratkan Next.js 15) dan **npm** 8+ (workspaces).
- **Git**.
- **Docker** (opsional) untuk menjalankan lewat container.
- **Rust** dan **wasm-pack** hanya diperlukan jika mengubah kode Rust. Hasil build WASM sudah ikut tersimpan di `frontend/public/workers/`.

## Menjalankan Secara Lokal

```bash
# 1. Clone dan install (workspaces frontend + backend, lalu patch-package otomatis berjalan)
git clone https://git.stis.ac.id/222212887/statify64.git
cd statify64
npm install

# 2. Environment
cp .env.example .env
cp frontend/.env.example frontend/.env.local   # NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# 3. Jalankan frontend dan backend sekaligus
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000 (dokumentasi API di http://localhost:5000/api-docs)

Backend tidak memerlukan file `.env`. Port 5000 diatur di `backend/server/config/constants.ts`, dan `NEXT_PUBLIC_FRONTEND_URL` hanya perlu diisi bila domain frontend belum ada di daftar origin yang diizinkan.

### Docker

```bash
cp .env.example .env     # pastikan NEXT_PUBLIC_BACKEND_URL sesuai
docker-compose up -d --build
```

- Frontend: http://localhost:3001
- Backend: http://localhost:5000

Untuk deployment di server, gunakan `docker-compose.dokploy.yml` (routing Traefik ke domain `statify-dev.student.stis.ac.id`).

### Build produksi

```bash
npm run build            # build frontend dan backend (workspaces)
```

## Mengubah Modul Berbasis Rust/WASM

Setiap modul yang menghitung dengan Rust memiliki crate sendiri (`rust/` atau `wasm/` di folder modulnya). Secara umum:

1. Ubah kode Rust, lalu jalankan `cargo test` di folder crate tersebut.
2. Build paket WASM: `wasm-pack build --target web`.
3. Salin berkas hasil build (`*.wasm`, `*.js`, `*.d.ts`, `package.json`) ke folder worker modul di `frontend/public/workers/...`.

Worker hanya membaca salinan di `public/workers`, sehingga langkah 3 tidak boleh terlewat. Contoh langkah lengkap ada di [README_Statify_64.md](README_Statify_64.md) pada bagian Regresi Logistik Biner.

## Pengujian

```bash
npm test                 # Jest untuk semua workspace
ncd frontend && npm test  # Jest frontend saja
cargo test               # di folder crate Rust modul terkait
```
## Alur Kontribusi

- Setiap kontributor bekerja di branch sendiri (per modul atau per fitur), lalu digabung ke `main` lewat merge request.
- Pesan commit mengikuti pola `jenis(modul): ringkasan`, misalnya `fix(glm-rm): ...`, `feat(glm-mv): ...`, `test(glm): ...`, `docs(...)`.
- Jalankan pengujian modul yang diubah sebelum membuat merge request.

## Troubleshooting

| Masalah | Penanganan |
|---|---|
| Frontend tidak terhubung ke backend | Periksa `NEXT_PUBLIC_BACKEND_URL` dan pastikan backend berjalan di port 5000. Cek juga daftar origin CORS di `backend/server/config/constants.ts`. |
| Upload `.sav` gagal | Pastikan berkas berformat `.sav` dan tidak lebih dari 10 MB. |
| Angka hasil analisis tidak berubah setelah mengubah kode Rust | Paket WASM di `frontend/public/workers/...` belum disalin ulang (lihat bagian Mengubah Modul Berbasis Rust/WASM). |
| Data atau hasil analisis tidak muncul | Bersihkan data situs di browser (IndexedDB) lewat DevTools > Application. |
| Install atau build gagal | Hapus `node_modules` lalu jalankan `npm install` ulang di root. |

## Lisensi

Proyek ini menggunakan **MIT License**. Lihat berkas [LICENSE](LICENSE).
arts, dan D3.js** - Library visualisasi data
- **TypeScript Team** - Type safety yang menjaga kode tetap maintainable
- **Zustand Team** - State management yang sederhana dan efektif
- **Semua kontributor open source** - Terima kasih atas library dan tools yang digunakan

---

**Statify** - Membuat analisis statistik menjadi mudah dan menyenangkan!

_Dibuat dengan komunitas open source_
rts, dan D3.js** - Library visualisasi data
- **TypeScript Team** - Type safety yang menjaga kode tetap maintainable
- **Zustand Team** - State management yang sederhana dan efektif
- **Semua kontributor open source** - Terima kasih atas library dan tools yang digunakan

---

**Statify** - Membuat analisis statistik menjadi mudah dan menyenangkan!

_Dibuat dengan komunitas open source_
arts, dan D3.js** - Library visualisasi data
- **TypeScript Team** - Type safety yang menjaga kode tetap maintainable
- **Zustand Team** - State management yang sederhana dan efektif
- **Semua kontributor open source** - Terima kasih atas library dan tools yang digunakan

---

**Statify** - Membuat analisis statistik menjadi mudah dan menyenangkan!

_Dibuat dengan komunitas open source_
