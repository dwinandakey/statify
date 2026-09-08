# Development Steps — GLM Multivariate

Dokumen ini berisi langkah-langkah pengerjaan fitur **General Linear Model → Multivariate** dari kondisi saat ini hingga siap dipakai (numerik identik dengan SPSS). Dikerjakan secara berurutan per Tahap. Template acuan: [../univariate/](../univariate/) dan [../../Classify/k-means-cluster/](../../Classify/k-means-cluster/).

Kondisi awal folder (hasil audit):
- `constants/`, `dialogs/`, `types/` — substansial (9 dialog, default lengkap, `DepVar: string[]`).
- `rust/` — ~8.337 LOC, 24 modul `stats/`, **ada compile error** di `rust/src/wasm/function.rs` (variabel `executed_functions` tidak dideklarasikan — muncul di baris 142, 155, 167, 180, 195, 209, 222, 235, 249, 263, 284, 299, 314, 328, 353).
- `services/multivariate-analysis.ts` — baris 49–76 **di-comment** (instansiasi WASM dimatikan).
- `services/multivariate-analysis-formatter.ts` — **0 byte** (kosong).
- `services/multivariate-analysis-output.ts` — **0 byte** (kosong).
- `rust/pkg/` — **tidak ada** (belum pernah `wasm-pack build`).
- `hooks/`, `__test__/`, `README.md` — **tidak ada**.

---

## Tahap 0 — Recon (cek jejak developer sebelumnya)

Tujuan: tahu siapa kontributor sebelumnya, apakah ada catatan/branch yang belum dimerge, dan asumsi apa yang sudah dibuat.

### 0.1 Git blame per file kunci

Jalankan (dari root repo, `statify64/`) untuk setiap file berikut dan catat nama author + hash commit + tanggal:

```bash
git log --follow --pretty=format:"%h %an %ad %s" --date=short -- \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/wasm/function.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/wasm/constructor.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/lib.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/models/config.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/models/result.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis.ts" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis-formatter.ts" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis-output.ts" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/dialogs/multivariate-main.tsx" \
  "frontend/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate.ts"
```

Lalu `git blame` yang lebih detail per file (cari TODO/FIXME/placeholder):

```bash
git blame -- frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/wasm/function.rs
```

### 0.2 Scan TODO/FIXME/placeholder di kode

```bash
# pakai Grep tool di Claude Code, bukan rg manual
# pola: "TODO|FIXME|placeholder|not implemented|unimplemented|todo!"
```

Area yang sudah diketahui bermasalah / perlu dicek ulang:
- `rust/src/stats/box_m_test.rs` — verifikasi kalkulasi determinan & chi-square approximation.
- `rust/src/stats/between_subjects_effects.rs` — kabarnya ada placeholder di sekitar baris 171 dan 578.
- `rust/src/stats/homogeneous_subsets.rs` — TODO df approximation sekitar baris 831.
- `rust/src/stats/bootstrap.rs` — indikasi masih stub.

### 0.3 Cek branch & PR terkait

```bash
git branch -a | grep -i "multivar\|glm"
git log --all --oneline --grep="multivariate" -i
git log --all --oneline --grep="GLM" -i
```

Catat: branch apa yang tersentuh file multivariate, apakah ada PR yang belum dimerge, apakah ada merge conflict terpending.

### 0.4 Output yang dihasilkan Tahap 0

Buat catatan singkat (boleh di bawah dokumen ini sebagai apendiks) berisi:
- Daftar kontributor sebelumnya + kontribusi utamanya.
- Daftar TODO/placeholder yang ditemukan + lokasi (file:baris).
- Asumsi yang dibuat developer sebelumnya (baca dari commit message / komentar kode).

---

## Tahap 1 — Hidupkan Fitur (buat bisa di-build & di-run end-to-end)

**Target Tahap 1:** user bisa buka dialog Multivariate, pilih variabel, klik OK, dan hasil apa-pun muncul di result panel — belum peduli akurasi angka.

### 1.1 Perbaiki compile error di `rust/src/wasm/function.rs`

Pilih salah satu strategi (rekomendasi: **strategi B** karena konsisten dengan Univariate):

**Strategi A — deklarasi vektor lokal**
Tambahkan di awal `run_analysis`:
```rust
let mut executed_functions: Vec<String> = Vec::new();
```
Dan pastikan hasilnya tertulis ke `MultivariateResult.executed_functions` di bagian bawah.

**Strategi B — standarkan ke `logger.add_log(...)` (direkomendasikan)**
Ganti setiap baris bentuk:
```rust
executed_functions.push("nama_fungsi".to_string());
```
menjadi:
```rust
logger.add_log("nama_fungsi");
```
Hapus field `executed_functions` dari `MultivariateResult` jika ada, karena log sudah diekspos lewat `get_all_log(logger)` (lihat `../univariate/rust/src/wasm/function.rs:219-221`).

Acuan pola: [../univariate/rust/src/wasm/function.rs](../univariate/rust/src/wasm/function.rs).

### 1.2 Build WASM pertama kali

```bash
cd "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust"
wasm-pack build --target web
```

Fix error yang muncul berurutan (biasanya: mismatched type, import hilang, field struct tidak sesuai). **Jangan** menambah `#[allow(dead_code)]` massal — beresin akarnya. Hasil sukses: folder `rust/pkg/` muncul berisi `*.js`, `*.d.ts`, `*.wasm`.

### 1.3 Aktifkan `services/multivariate-analysis.ts`

Uncomment kode terkait instansiasi WASM. Pastikan polanya **identik** dengan `../univariate/services/univariate-analysis.ts`:

- Tanda tangan: `export const analyzeMultivariate = async (config: MultivariateConfig) => { ... }`
- Ambil data dari store: `getSlicedData()` + `getVarDefs()`.
- `await init()` dari `rust/pkg`.
- Buat instance `new MultivariateAnalysis(...)` — jumlah & urutan parameter konstruktor harus cocok dengan `rust/src/wasm/constructor.rs`.
- Panggil: `analysis.run_analysis(...)`, `analysis.get_formatted_results()`, `analysis.get_all_errors()`, `analysis.get_all_log()`.
- Return nilai yang nanti dikonsumsi oleh output service.

Cocokkan baris per baris dengan [../univariate/services/univariate-analysis.ts](../univariate/services/univariate-analysis.ts).

### 1.4 Implementasi `services/multivariate-analysis-formatter.ts` (0 byte → lengkap)

Acuan: `../univariate/services/univariate-analysis-formatter.ts` plus `formatter_part1/2/3.ts`.

Tabel-tabel minimum yang wajib di-format untuk Multivariate:
- Between-Subjects Factors
- Descriptive Statistics (per DV)
- Box's M Test of Equality of Covariance Matrices
- Levene's Test of Equality of Error Variances (per DV)
- Bartlett's Test of Sphericity
- **Multivariate Tests** (Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root) — tabel inti.
- Tests of Between-Subjects Effects (per DV)
- Parameter Estimates (per DV)
- SSCP Matrices (Hypothesis + Error, per term jika diminta user)
- Residual SSCP Matrix
- EMMeans + Pairwise + Univariate tests
- Contrast Coefficients + Results
- Saved Variables (ringkasan)

Setiap tabel dibungkus dengan helper formatter yang sama bentuknya dengan Univariate (header → rows → notes → interpretation). Jaga key JSON konsisten dengan `MultivariateResult` di Rust.

### 1.5 Implementasi `services/multivariate-analysis-output.ts` (0 byte → lengkap)

Acuan: `../univariate/services/univariate-analysis-output.ts`.

Tugas file ini:
- Menerima hasil dari `analyzeMultivariate(...)`.
- Panggil `formatMultivariateResult(...)` dari formatter.
- Push ke `useResultStore`: `addLog(...)`, `addAnalytic(...)`, `addStatistic(...)`.
- Handle error state dari `ErrorCollector`.

### 1.6 Tambah `hooks/` (tour guide)

Copy dari `../univariate/hooks/`:
- `useTourGuide.ts`
- `tourConfig.ts`

Adaptasi `tourConfig.ts`: ubah selector step agar menunjuk ke elemen dialog Multivariate (bukan Univariate), dan sesuaikan copy teks ke konteks MANOVA. Pastikan `multivariate-main.tsx` memanggil `useTourGuide()`.

### 1.7 Smoke test manual

1. `bun run dev` (frontend).
2. Load dataset contoh (mis. dataset iris atau dataset MANOVA klasik).
3. Open Analyze → General Linear Model → Multivariate.
4. Pilih ≥2 DV, ≥1 fixed factor.
5. Klik OK.
6. **Kriteria lulus Tahap 1:** tidak ada error console, result panel menampilkan ≥1 tabel hasil. Angka belum perlu cocok SPSS.

---

## Tahap 2 — Numerical Validation vs SPSS (inti skripsi)

**Target Tahap 2:** setiap angka di output Multivariate identik (atau beda dalam toleransi 1e-6) dengan output SPSS untuk dataset yang sama & konfigurasi yang sama.

### 2.1 Siapkan dataset uji

Minimum 3 dataset, urutan dari sederhana ke kompleks:
1. **Dataset A (toy):** 2 DV, 1 fixed factor 3 level, n=30, tanpa covariate, balanced.
2. **Dataset B (moderate):** 3 DV, 2 fixed factor (3×2 level), 1 covariate, n=60, balanced.
3. **Dataset C (real):** dataset publik MANOVA (mis. Iris untuk DV=Sepal.Length+Sepal.Width, factor=Species), unbalanced.

Untuk tiap dataset, jalankan SPSS lalu **simpan** output lengkap (semua tabel) sebagai ground truth. Simpan di `__test__/fixtures/spss/<dataset>/`.

### 2.2 Buat `__test__/multivariate.test.ts`

Pola mengikuti `../univariate/__test__/` (kalau ada) atau pattern test Jest/Vitest lain di repo. Struktur tiap test:

```ts
it("Dataset A — Multivariate Tests (Pillai) matches SPSS", () => {
  const result = analyzeMultivariate(datasetA, configA);
  expect(result.multivariate_tests.pillai.value).toBeCloseTo(0.4532, 6);
  expect(result.multivariate_tests.pillai.f).toBeCloseTo(3.211, 3);
  // dst
});
```

Hardcode setiap angka dari output SPSS. Minimal tabel yang diuji: Multivariate Tests (4 statistik), Box's M, Tests of Between-Subjects Effects, Parameter Estimates. Idealnya semua tabel.

### 2.3 Audit & fix modul stats yang dicurigai placeholder

Berdasarkan audit Tahap 0, prioritaskan (update daftar ini setelah Tahap 0 selesai):
- `rust/src/stats/box_m_test.rs` — verifikasi determinan matriks covariance (numerik stabil?) & chi-square approximation df-nya sesuai rumus SPSS (Box 1949).
- `rust/src/stats/between_subjects_effects.rs` — ganti placeholder di baris ~171 dan ~578 dengan kalkulasi sesungguhnya.
- `rust/src/stats/homogeneous_subsets.rs` — selesaikan TODO df approximation di baris ~831.
- `rust/src/stats/bootstrap.rs` — implementasi penuh (percentile + BCa + stratified).
- Modul multivariate-specific: Pillai, Wilks, Hotelling, Roy — verifikasi rumus eigenvalue & F-approximation (Rao, Pillai-Bartlett) cocok SPSS.

### 2.4 Loop test-fix

Untuk setiap test yang gagal:
1. Print output WASM vs output SPSS berdampingan.
2. Telusuri modul Rust yang menghasilkan angka tsb.
3. Banding rumus di kode dengan IBM SPSS Algorithms manual.
4. Fix, rebuild WASM, re-test.
5. Commit per-modul (jangan satu commit besar).

### 2.5 Test performa (opsional tapi sangat disarankan)

Tambah `__test__/multivariate.performance.test.ts`:
- Dataset 10k baris × 5 DV × 3 factor.
- Assert durasi analisis < threshold (mis. 5 detik).
- Jika lambat → profile (mis. lihat operasi matriks di nalgebra yang bisa di-rayon-kan).

---

## Tahap 3 — Finishing

### 3.1 `README.md`

Buat `README.md` di folder ini, mengikuti format `../univariate/README.md`. Isi minimum:
- Ringkasan fitur.
- Daftar tabel output.
- Struktur folder.
- Cara build WASM (`wasm-pack build --target web`).
- Cara menjalankan test.
- Referensi statistik (Rencher, Johnson-Wichern, IBM SPSS Algorithms).

### 3.2 Review komentar & dead code

- Hapus komentar bekas debugging.
- Hapus fungsi yang tidak terpakai (jangan disimpan "for later" — biarkan git yang ingat).
- Pastikan tidak ada `println!` atau `console.log` yang lolos.

### 3.3 Integrasi akhir

- Cek `GeneralLinearModelRegistry.tsx` sudah daftarkan Multivariate (audit bilang sudah — verify ulang).
- Cek `general-linear-model-menu.tsx` menu-nya aktif.
- Cek IndexedDB persistence: buka dialog → isi form → close → reopen → form masih terisi.
- Cek i18n (jika repo mendukung) — label bahasa Indonesia/Inggris lengkap.

### 3.4 Demo end-to-end untuk sidang

- Siapkan 1 dataset demo yang nice-looking.
- Script demo 3–5 menit: buka dialog → pilih variabel → explain tiap tab → klik OK → walk-through hasil.
- Side-by-side screenshot Statify vs SPSS untuk 2–3 tabel kunci.

---

## Checklist ringkas (centang saat selesai)

- [ ] 0.1 Git blame file kunci selesai, catatan dibuat.
- [ ] 0.2 Scan TODO/FIXME selesai, daftar final dibuat.
- [ ] 0.3 Cek branch/PR terkait selesai.
- [x] 1.1 Compile error `function.rs` fixed.
- [x] 1.2 `wasm-pack build --target web` sukses.
- [x] 1.3 `multivariate-analysis.ts` aktif & cocok pola Univariate.
- [x] 1.4 `multivariate-analysis-formatter.ts` ditulis.
- [x] 1.5 `multivariate-analysis-output.ts` ditulis.
- [x] 1.6 `hooks/` di-copy & di-adaptasi.
- [ ] 1.7 Smoke test manual lolos.
- [ ] 2.1 Dataset A/B/C + SPSS ground truth disiapkan.
- [x] 2.2 `__test__/multivariate.test.ts` ditulis (≥1 test per tabel).
- [x] 2.3 Modul stats placeholder semua di-fix.
- [ ] 2.4 Semua test Tahap 2 hijau (toleransi 1e-6).
- [x] 2.5 Performance test (opsional).
- [x] 3.1 `README.md` ditulis.
- [x] 3.2 Review komentar & dead code.
- [x] 3.3 Integrasi akhir diverifikasi.
- [ ] 3.4 Materi demo sidang siap.

---

## Catatan

- **Jangan ubah template Univariate** selama pengerjaan ini. Kalau perlu pattern baru, copy ke Multivariate lalu modifikasi di sana.
- **Commit kecil-kecil** per sub-langkah, message deskriptif.
- Kalau ragu antara "ikuti SPSS" vs "statistik yang lebih benar" — **ikuti SPSS** (syarat skripsi = numerik identik SPSS).
- Acuan rumus: IBM SPSS Statistics Algorithms (cari PDF resmi IBM), Rencher "Methods of Multivariate Analysis", Johnson & Wichern "Applied Multivariate Statistical Analysis".
