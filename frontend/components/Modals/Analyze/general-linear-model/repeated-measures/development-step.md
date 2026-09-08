# Development Steps — GLM Repeated Measures

Dokumen ini berisi langkah-langkah pengerjaan fitur **General Linear Model → Repeated Measures** dari kondisi saat ini hingga siap dipakai (numerik identik dengan SPSS). Dikerjakan secara berurutan per Tahap. Template acuan: [../univariate/](../univariate/) dan [../multivariate/development-step.md](../multivariate/development-step.md).

Kondisi awal folder (hasil audit):
- `constants/`, `types/` — substansial (default lengkap untuk main + define + 8 sub-dialog).
- `dialogs/` — substansial (10 file): `dialog.tsx`, `repeated-measures-main.tsx`, `model.tsx`, `contrast.tsx`, `plots.tsx`, `posthoc.tsx`, `emmeans.tsx`, `save.tsx`, `options.tsx`, plus `dialogs/define/` (`repeated-measures-define.tsx`, `repeated-measures-dialog.tsx`) — **wajib dilewati sebelum main dialog** (struktur within-subjects factor harus didefinisikan dulu). Tidak ada `bootstrap.tsx` (umumnya tidak relevan untuk RM).
- `rust/` — ~50 file source, 19 modul `stats/`. **Tidak ada compile error** yang mencolok seperti Multivariate (Rust di RM sudah declare `executed_functions = Vec::new()` dengan benar di [rust/src/wasm/function.rs:20](rust/src/wasm/function.rs#L20)). Hanya ada warning kecil: import `ContrastMethod` di [rust/src/wasm/function.rs:3](rust/src/wasm/function.rs#L3) tidak terpakai → akan jadi warning saat build.
- `services/repeated-measures-analysis.ts` — 67 baris, baris **39–66 di-comment** (instansiasi WASM dimatikan), plus `console.log(configData)` debug di baris 37 yang harus dibersihkan.
- `services/repeated-measures-analysis-formatter.ts` — **0 byte** (kosong).
- `services/repeated-measures-analysis-output.ts` — **0 byte** (kosong).
- `rust/pkg/` — **tidak ada** (belum pernah `wasm-pack build`).
- `hooks/`, `__test__/`, `README.md` — **tidak ada**.

> **Catatan penting:** struct WASM Rust bernama `RepeatedMeasureAnalysis` (singular "Measure") di [rust/src/wasm/constructor.rs:12](rust/src/wasm/constructor.rs#L12), sementara folder dan tipe TS pakai nama jamak `repeated-measures`. Inkonsistensi ini bukan blocker tapi perlu dipatuhi saat import dari `rust/pkg`.

---

## Tahap 0 — Recon (cek jejak developer sebelumnya)

Tujuan: tahu siapa kontributor sebelumnya, apakah ada catatan/branch yang belum dimerge, dan asumsi apa yang sudah dibuat.

### 0.1 Git blame per file kunci

Jalankan (dari root repo, `statify64/`) untuk setiap file berikut dan catat nama author + hash commit + tanggal:

```bash
git log --follow --pretty=format:"%h %an %ad %s" --date=short -- \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/wasm/function.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/wasm/constructor.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/lib.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/models/config.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/models/result.rs" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/services/repeated-measures-analysis.ts" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/services/repeated-measures-analysis-formatter.ts" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/services/repeated-measures-analysis-output.ts" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/repeated-measures-main.tsx" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/dialogs/define/repeated-measures-define.tsx" \
  "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/types/repeated-measures.ts"
```

Lalu `git blame` yang lebih detail per file (cari TODO/FIXME/placeholder):

```bash
git blame -- frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/wasm/function.rs
```

### 0.2 Scan TODO/FIXME/placeholder di kode

Pakai Grep tool di Claude Code dengan pola: `TODO|FIXME|placeholder|not implemented|unimplemented|todo!`.

Area yang sudah diketahui bermasalah / perlu dicek ulang:
- `rust/src/stats/mauchly_test.rs` — verifikasi formula sphericity W = det(Σ̂) / (trace(Σ̂)/k)^k dan epsilon corrections (Greenhouse-Geisser, Huynh-Feldt, Lower-bound). **Ini fitur paling khas RM**, harus presisi.
- `rust/src/stats/within_subjects_effects.rs` — verifikasi penerapan epsilon-corrected df (df_corrected = df_original × ε) untuk Sphericity Assumed / GG / HF / LB rows.
- `rust/src/stats/multivariate_tests.rs` — verifikasi rumus Pillai/Wilks/Hotelling/Roy untuk konteks RM (denominator df beda dengan MANOVA standar).
- `rust/src/stats/profile_plots.rs:166` & `:247` — placeholder point handling (cek apakah hanya untuk plot saja, atau menyentuh statistik).
- `rust/src/stats/between_subjects_effects.rs` — verifikasi mean-of-measures aggregation (RM uses subject-mean across timepoints sebagai DV).
- `rust/src/stats/posthoc.rs` — sub-modul mana saja yang masih stub.

Bersihkan juga:
- Unused import `ContrastMethod` di [rust/src/wasm/function.rs:3](rust/src/wasm/function.rs#L3).
- `console.log(configData)` di [services/repeated-measures-analysis.ts:37](services/repeated-measures-analysis.ts#L37).

### 0.3 Cek branch & PR terkait

```bash
git branch -a | grep -i "repeat\|measur\|glm"
git log --all --oneline --grep="repeated" -i
git log --all --oneline --grep="mauchly\|sphericity\|within-subjects" -i
```

Catat: branch apa yang tersentuh file repeated-measures, apakah ada PR yang belum dimerge, apakah ada merge conflict terpending.

### 0.4 Output yang dihasilkan Tahap 0

Buat catatan singkat (boleh di bawah dokumen ini sebagai apendiks) berisi:
- Daftar kontributor sebelumnya + kontribusi utamanya.
- Daftar TODO/placeholder yang ditemukan + lokasi (file:baris).
- Asumsi yang dibuat developer sebelumnya (baca dari commit message / komentar kode), khususnya:
  - Cara mapping Define dialog → variabel dataset.
  - Pilihan default epsilon correction (kemungkinan Greenhouse-Geisser).

---

## Tahap 1 — Hidupkan Fitur (buat bisa di-build & di-run end-to-end)

**Target Tahap 1:** user bisa melalui Define dialog, masuk ke dialog Repeated Measures utama, pilih variabel per kombinasi level, klik OK, dan hasil apa-pun muncul di result panel — belum peduli akurasi angka.

### 1.1 Bersihkan warning kecil di Rust

- Hapus `use crate::models::config::ContrastMethod;` di [rust/src/wasm/function.rs:3](rust/src/wasm/function.rs#L3) (tidak terpakai).
- Tidak perlu pengubahan pola `executed_functions` karena RM sudah pakai pola `Vec` lokal yang konsisten.

### 1.2 Build WASM pertama kali

```bash
cd "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust"
wasm-pack build --target web
```

Fix error yang muncul berurutan (biasanya: mismatched type, import hilang, field struct tidak sesuai). **Jangan** menambah `#[allow(dead_code)]` massal — beresin akarnya. Hasil sukses: folder `rust/pkg/` muncul berisi `*.js`, `*.d.ts`, `*.wasm` dengan ekspor class **`RepeatedMeasureAnalysis`** (singular).

### 1.3 Aktifkan `services/repeated-measures-analysis.ts`

Uncomment kode terkait instansiasi WASM. Pola yang harus dipenuhi (cocokkan dengan [../univariate/services/univariate-analysis.ts](../univariate/services/univariate-analysis.ts) dan [../multivariate/services/multivariate-analysis.ts](../multivariate/services/multivariate-analysis.ts) untuk gaya yang konsisten):

- Hapus `console.log(configData)` debug di baris 37.
- Import dari `rust/pkg`:
  ```ts
  import init, { RepeatedMeasureAnalysis } from "@/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg";
  ```
- `await init()` sebelum membuat instance.
- **Konstruktor 7 parameter** (lihat [rust/src/wasm/constructor.rs:22-30](rust/src/wasm/constructor.rs#L22-L30)):
  ```
  subject_data, factors_data, covar_data,
  subject_data_defs, factors_data_defs, covar_data_defs,
  config_data
  ```
  Catatan: **tidak ada WLS Weight** (berbeda dari Univariate yang 11 params dan Multivariate yang 9 params).
- Panggil: `analysis.get_formatted_results()`, `analysis.get_all_errors()`, `analysis.get_executed_functions()` (perhatikan: RM menggunakan `get_executed_functions` bukan `get_all_log` seperti Univariate/Multivariate).
- Parse error string ke array seperti yang dilakukan di multivariate.

### 1.4 Implementasi `services/repeated-measures-analysis-formatter.ts` (0 byte → lengkap)

Acuan: [../multivariate/services/multivariate-analysis-formatter.ts](../multivariate/services/multivariate-analysis-formatter.ts) (paling dekat strukturnya). Tabel-tabel minimum yang wajib di-format untuk Repeated Measures (semua dari [rust/src/models/result.rs:5-23](rust/src/models/result.rs#L5-L23)):

- **Within-Subjects Factors** — daftar faktor within + jumlah level + nama variabel per kombinasi level (KHAS RM).
- **Descriptive Statistics** — mean, SD, N per kombinasi level within × between (jika opsi `desc_stats`).
- **Bartlett's Test of Sphericity** — jika opsi `homogen_test`.
- **Multivariate Tests** — Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root (untuk within-subjects effects).
- **Mauchly's Test of Sphericity** — KHAS RM. Tabel ini paling penting karena menentukan epsilon correction yang dipakai. Format: per within-subjects effect, kolom Mauchly's W, Approx. Chi-Square, df, Sig., Greenhouse-Geisser ε, Huynh-Feldt ε, Lower-bound ε.
- **Tests of Within-Subjects Effects** — KHAS RM. Per effect ada **4 baris** (Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, Lower-bound) dengan SS, df (corrected), MS, F, Sig, partial η², noncent, observed power. Plus Error rows yang sama 4 baris.
- **Tests of Within-Subjects Contrasts** — KHAS RM. Polynomial / Helmert / Difference / Repeated / Simple / Deviation contrasts per level. Format: per effect × contrast type, dengan SS, df, MS, F, Sig.
- **Tests of Between-Subjects Effects** — gabungkan ke satu tabel (Source × Dependent Variable / atau "Measure" untuk RM), ikuti pola yang sudah dibenarkan di Multivariate (single combined table dengan source order: Intercept, [factor], Error).
- **Parameter Estimates** — jika opsi `param_est`.
- **General Estimable Function** — jika opsi `general_fun`.
- **Within-Subjects SSCP / Between-Subjects SSCP / Residual SSCP / SSCP Matrix** — jika opsi terkait.
- **Univariate Tests** — di RM ini adalah univariate F per timepoint (bukan duplikat Tests of Between-Subjects Effects seperti di Multivariate).
- **Post Hoc Tests** — jika user pilih factor.
- **Estimated Marginal Means** — jika user isi target_list.

Helper formatter mengikuti gaya Univariate/Multivariate (header → rows → notes → interpretation). Wajib `interpretation` untuk setiap tabel agar kolom Description di output muncul (lihat lesson learned di multivariate).

> **Pelajaran dari Multivariate yang sudah diterapkan & wajib diikuti di RM:**
> - Source label hanya muncul di baris pertama tiap grup (merge cell SPSS-style).
> - Field non-applicable (F/Sig/η²/Noncent/Power untuk Error/Total/Corrected Total) → kosong, jangan `0`.
> - Sintesis "Total" source jika Rust tidak compute.
> - Filter contrast_coefficients table jika user tidak pilih contrast method.

### 1.5 Implementasi `services/repeated-measures-analysis-output.ts` (0 byte → lengkap)

Acuan: [../multivariate/services/multivariate-analysis-output.ts](../multivariate/services/multivariate-analysis-output.ts).

Tugas file ini:
- Menerima `formattedResult` dari formatter.
- `addLog({ log: "Repeated Measures Analysis" })`.
- Untuk tiap tabel: `addAnalytic(logId, { title, note })` lalu `addStatistic(analyticId, { title, description: table.interpretation || table.title, output_data: JSON.stringify({ tables: [t] }), components: title })`.
- Khusus error log: ikuti pola univariate/multivariate (single row "No errors occurred." vs Context+Message rows).

### 1.6 Filter expected warning di `repeated-measures-analysis.ts`

Sama seperti yang dilakukan di Multivariate ([../multivariate/services/multivariate-analysis.ts:69-101](../multivariate/services/multivariate-analysis.ts#L69-L101)):
- Parse error string menjadi `{ context, messages[] }` groups.
- Suppress `calculate_posthoc_tests` warnings jika user tidak pilih test method aktif.
- Fallback ke `["No errors occurred."]` jika setelah filter tidak ada group tersisa.

### 1.7 Tambah `hooks/` (tour guide)

Copy dari `../multivariate/hooks/` (atau `../univariate/hooks/`):
- `useTourGuide.ts` (generic, tidak perlu diubah).
- `tourConfig.ts` — adaptasi: ubah prefix `targetId` jadi `repeated-measures-*`, sesuaikan teks ke konteks RM (jelaskan Define step, Mauchly, epsilon corrections).

Pastikan `repeated-measures-main.tsx` memanggil `useTourGuide(repeatedMeasuresTourSteps)` dan render `<TourPopup>`. Lihat pola di [../multivariate/dialogs/dialog.tsx](../multivariate/dialogs/dialog.tsx).

### 1.8 Verifikasi registrasi modal & menu

- [GeneralLinearModelRegistry.tsx](../GeneralLinearModelRegistry.tsx) — pastikan `ModalType.ModalRepeatedMeasures` punya entry.
- [general-linear-model-menu.tsx](../general-linear-model-menu.tsx) — pastikan menu item Repeated Measures **tidak `disabled`** (saat ini di-disable, lihat baris 30-35).

### 1.9 Smoke test manual

1. `bun run dev` (frontend).
2. Load dataset contoh repeated measures (mis. dataset Pre-test/Post-test/Follow-up).
3. Open Analyze → General Linear Model → Repeated Measures.
4. **Define step:** isi nama within-subjects factor (mis. "time"), jumlah level (mis. 3), klik Add → Define.
5. **Main dialog:** map level 1/2/3 ke variabel pre/post/followup. Optional: tambah between-subjects factor / covariate.
6. Klik OK.
7. **Kriteria lulus Tahap 1:** tidak ada error console, result panel menampilkan ≥1 tabel hasil (terutama Within-Subjects Factors + Mauchly + Tests of Within-Subjects Effects). Angka belum perlu cocok SPSS.

---

## Tahap 2 — Numerical Validation vs SPSS (inti skripsi)

**Target Tahap 2:** setiap angka di output Repeated Measures identik (atau beda dalam toleransi 1e-6) dengan output SPSS untuk dataset yang sama & konfigurasi yang sama.

### 2.1 Siapkan dataset uji

Minimum 3 dataset, urutan dari sederhana ke kompleks:
1. **Dataset A (toy):** 1 within-subjects factor 3 level (mis. time), tanpa between-subjects, n=20 subjek, balanced.
2. **Dataset B (moderate):** 1 within-subjects factor 4 level + 1 between-subjects factor 2 level + 1 covariate, n=40 subjek, balanced.
3. **Dataset C (real / doubly multivariate):** 2 within-subjects factor (mis. time × treatment) + 1 between-subjects factor, dataset publik (mis. dari Field's "Discovering Statistics Using SPSS" atau Maxwell & Delaney), unbalanced.

Untuk tiap dataset, jalankan SPSS lalu **simpan** output lengkap (semua tabel, terutama **Mauchly's Test** dan **Tests of Within-Subjects Effects** dengan keempat baris epsilon) sebagai ground truth. Simpan di `__test__/fixtures/spss/<dataset>/`.

### 2.2 Buat `__test__/repeated-measures.test.ts`

Pola mengikuti `../univariate/__test__/` (jika ada) atau `../multivariate/__test__/`. Struktur tiap test:

```ts
it("Dataset A — Mauchly's Test matches SPSS", () => {
  const result = analyzeRepeatedMeasures(datasetA, configA);
  expect(result.mauchly_test.time.mauchly_w).toBeCloseTo(0.7234, 4);
  expect(result.mauchly_test.time.approx_chi_square).toBeCloseTo(5.612, 3);
  expect(result.mauchly_test.time.df).toBe(2);
  expect(result.mauchly_test.time.epsilon.greenhouse_geisser).toBeCloseTo(0.7834, 4);
  expect(result.mauchly_test.time.epsilon.huynh_feldt).toBeCloseTo(0.8521, 4);
  expect(result.mauchly_test.time.epsilon.lower_bound).toBeCloseTo(0.5, 4);
});

it("Dataset A — Tests of Within-Subjects Effects (GG row)", () => {
  const result = analyzeRepeatedMeasures(datasetA, configA);
  const ggRow = result.tests_within_subjects.time.greenhouse_geisser;
  expect(ggRow.df).toBeCloseTo(1.567, 3);  // df_original × ε
  expect(ggRow.f).toBeCloseTo(12.45, 2);
  expect(ggRow.significance).toBeCloseTo(0.0008, 4);
});
```

Hardcode setiap angka dari output SPSS. Minimal tabel yang diuji:
- Mauchly's Test (W, χ², df, sig, 3 epsilon).
- Tests of Within-Subjects Effects (4 epsilon rows × stats).
- Tests of Within-Subjects Contrasts (per polynomial order).
- Multivariate Tests (4 statistik).
- Tests of Between-Subjects Effects.
- Parameter Estimates.

### 2.3 Audit & fix modul stats yang dicurigai placeholder

Berdasarkan audit Tahap 0, prioritaskan (update daftar ini setelah Tahap 0 selesai):

- **`rust/src/stats/mauchly_test.rs`** — pastikan:
  - W = `|S| / (tr(S)/p)^p` dengan S = covariance pooled across-subject diff.
  - χ² approx Box: `-(n - 1 - (2p²+p+2)/(6p)) × ln(W)` dengan df = `p(p+1)/2 - 1`.
  - Greenhouse-Geisser: `ε = (tr(S))² / (p × tr(S²))`.
  - Huynh-Feldt: `ε_HF = min(1, (n×(p-1)×ε_GG - 2) / ((p-1)×(n-1) - (p-1)²×ε_GG))`.
  - Lower-bound: `1/(p-1)`.
- **`rust/src/stats/within_subjects_effects.rs`** — pastikan epsilon dipakai untuk koreksi df, bukan untuk koreksi F (F tetap, df dikalikan ε).
- **`rust/src/stats/multivariate_tests.rs`** — verifikasi df_error untuk RM (use sphericity-corrected denominator).
- **`rust/src/stats/profile_plots.rs:166,247`** — verifikasi placeholder point hanya untuk plotting visual, bukan menyentuh statistik output table.
- **`rust/src/stats/between_subjects_effects.rs`** — pastikan menggunakan subject-mean across timepoints, bukan summed.
- **`rust/src/stats/posthoc.rs`** — semua sub-test method (Bonferroni, Sidak, dll.) — bandingkan dengan implementasi di `../univariate/rust/src/stats/posthoc.rs`.

### 2.4 Loop test-fix

Untuk setiap test yang gagal:
1. Print output WASM vs output SPSS berdampingan.
2. Telusuri modul Rust yang menghasilkan angka tsb.
3. Banding rumus di kode dengan IBM SPSS Algorithms manual (search "Repeated Measures" / "GLM Within-Subjects").
4. Fix, rebuild WASM, re-test.
5. Commit per-modul (jangan satu commit besar).

### 2.5 Test performa (opsional tapi sangat disarankan)

Tambah `__test__/repeated-measures.performance.test.ts`:
- Dataset 5k subjek × 6 timepoints × 2 measures × 2 between-subjects factor.
- Assert durasi analisis < threshold (mis. 5 detik).
- Profile bagian `mauchly_test.rs` (eigen-decomposition Σ̂ bisa jadi bottleneck) dan `within_subjects_effects.rs`.

---

## Tahap 3 — Finishing

### 3.1 `README.md`

Buat `README.md` di folder ini, mengikuti format `../univariate/README.md`. Isi minimum:
- Ringkasan fitur Repeated Measures + apa bedanya dengan Univariate/Multivariate.
- Daftar tabel output (tekankan Mauchly + Within-Subjects Effects sebagai signature).
- Diagram alur: Define dialog → Main dialog → Sub-dialogs (Model/Contrast/Plots/PostHoc/EMMeans/Save/Options).
- Struktur folder.
- Cara build WASM (`wasm-pack build --target web`).
- Cara menjalankan test.
- Referensi statistik:
  - IBM SPSS Statistics Algorithms (bagian "GLM Repeated Measures").
  - Maxwell & Delaney "Designing Experiments and Analyzing Data" (bab Repeated Measures).
  - Rencher "Methods of Multivariate Analysis" (bab Profile Analysis).
  - Field "Discovering Statistics Using IBM SPSS Statistics" (chapter Repeated-Measures ANOVA).

### 3.2 Review komentar & dead code

- Hapus komentar bekas debugging dan komentar `// await init() ...` yang sudah di-uncomment.
- Hapus `console.log(configData)` jika belum dihapus di 1.3.
- Hapus fungsi yang tidak terpakai (jangan disimpan "for later" — biarkan git yang ingat).
- Pastikan tidak ada `println!`/`web_sys::console::log_1` (lihat baris 17 & 23 di `function.rs`) yang lolos ke production.

### 3.3 Integrasi akhir

- Cek `GeneralLinearModelRegistry.tsx` sudah daftarkan Repeated Measures.
- Cek `general-linear-model-menu.tsx` menu-nya **aktif** (saat ini disabled).
- Cek IndexedDB persistence: buka Define → isi → close → reopen → struktur within-subjects masih terisi; buka Main → isi mapping → close → reopen → mapping masih ada.
- Cek skenario edge case: hanya 1 within-subjects factor dengan 2 level (Mauchly tidak applicable — tabel harus tetap valid atau di-skip dengan note yang benar).
- Cek i18n (jika repo mendukung) — label bahasa Indonesia/Inggris lengkap, terutama untuk Define dialog yang kompleks.

### 3.4 Demo end-to-end untuk sidang

- Siapkan 1 dataset demo classic RM (mis. ukuran kepuasan pre/post/follow-up dengan 2 grup treatment).
- Script demo 3–5 menit: open Define → set within-factor → Define → map variabel → tunjukkan setiap sub-dialog (terutama Options → Display → SSCP/parameter estimates) → klik OK → walk-through hasil dengan urutan: Within-Subjects Factors → Descriptive → **Mauchly** (jelaskan epsilon) → **Within-Subjects Effects** (tunjukkan 4 baris ε) → Within-Subjects Contrasts (tunjukkan polynomial trend) → Between-Subjects Effects → EMMeans.
- Side-by-side screenshot Statify vs SPSS untuk: Mauchly + Within-Subjects Effects + Within-Subjects Contrasts (3 tabel signature RM).

---

## Checklist ringkas (centang saat selesai)

- [ ] 0.1 Git blame file kunci selesai, catatan dibuat.
- [ ] 0.2 Scan TODO/FIXME selesai, daftar final dibuat.
- [ ] 0.3 Cek branch/PR terkait selesai.
- [ ] 1.1 Warning kecil Rust dibersihkan (unused import).
- [ ] 1.2 `wasm-pack build --target web` sukses.
- [ ] 1.3 `repeated-measures-analysis.ts` aktif (WASM uncomment, debug log dibersihkan, 7 params benar).
- [ ] 1.4 `repeated-measures-analysis-formatter.ts` ditulis (≥17 tabel, semua punya `interpretation`).
- [ ] 1.5 `repeated-measures-analysis-output.ts` ditulis (pola error logs identik univariate).
- [ ] 1.6 Filter expected warning diterapkan.
- [ ] 1.7 `hooks/` ditambah & tour disetel ke `repeated-measures-*` selectors.
- [ ] 1.8 Modal/menu registry diaktifkan (menu item tidak disabled).
- [ ] 1.9 Smoke test manual lolos (Define → Main → OK → ada tabel keluar).
- [ ] 2.1 Dataset A/B/C + SPSS ground truth disiapkan.
- [ ] 2.2 `__test__/repeated-measures.test.ts` ditulis (≥1 test per tabel; minimal Mauchly + 4 epsilon row di Within-Subjects Effects).
- [ ] 2.3 Modul stats placeholder semua di-fix (prioritas: `mauchly_test.rs`, `within_subjects_effects.rs`).
- [ ] 2.4 Semua test Tahap 2 hijau (toleransi 1e-6).
- [ ] 2.5 Performance test (opsional).
- [ ] 3.1 `README.md` ditulis.
- [ ] 3.2 Review komentar & dead code.
- [ ] 3.3 Integrasi akhir diverifikasi (terutama Define ↔ Main persistence).
- [ ] 3.4 Materi demo sidang siap.

---

## Catatan

- **Jangan ubah template Univariate / Multivariate** selama pengerjaan ini. Kalau perlu pattern baru, copy ke Repeated Measures lalu modifikasi di sana.
- **Yang paling khas RM dan sering jadi pembeda dengan SPSS:**
  - Mauchly's W formula (cek determinant + trace dari covariance dari pairwise differences, bukan dari raw data).
  - Greenhouse-Geisser ε formula (gunakan covariance matrix yang sudah di-double-centered).
  - Penerapan ε hanya pada df, bukan pada SS atau MS.
  - Lower-bound = `1/(p-1)` yang konstan untuk semua dataset.
- **Define dialog**: pelajari baik-baik [dialogs/define/repeated-measures-define.tsx](dialogs/define/repeated-measures-define.tsx) — ini gateway sebelum main dialog. Dataform di sini menentukan struktur yang dipakai di Rust (`config.main.measures` dan `config.main.factors`).
- **Doubly multivariate** (>1 measure dengan within-subjects factor sama, mis. measures = {systolic, diastolic}, factor = time × 3 level): Rust harus handle nested loop di formatter. Tabel jadi `Within-Subjects Effects — measure: systolic`, dst.
- **Commit kecil-kecil** per sub-langkah, message deskriptif.
- Kalau ragu antara "ikuti SPSS" vs "statistik yang lebih benar" — **ikuti SPSS** (syarat skripsi = numerik identik SPSS).
- Acuan rumus utama: IBM SPSS Statistics Algorithms (cari PDF resmi IBM, bagian "GLM Repeated Measures"), Maxwell & Delaney "Designing Experiments and Analyzing Data", Rencher "Methods of Multivariate Analysis".
