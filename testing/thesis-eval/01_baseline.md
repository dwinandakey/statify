# 01 — Baseline pengujian yang sudah ada

**Tanggal eksekusi:** 7 Oktober 2026, sekitar pukul 12:43–12:46 UTC (19:43–19:46 WIB), pada komputer Windows pengguna, dengan HEAD repo `f82ddf0c85aaf69d5618baaee274b01b3ab8e4a9` (branch `dija-v2`; HEAD itu tidak berubah sejak log direkam sampai sesi ini; branch kerja evaluasi `thesis-eval` dibuat dari commit yang sama).

**Asal log.** Log baseline di bawah berasal dari eksekusi nyata `cargo test` dan `npx jest` di Windows yang sudah ada di `logs/` ketika sesi evaluasi ini dimulai (`unit_*.txt`, `jest_stwv|nb|am.txt`; waktu berkas tercatat pada tabel sumber). Log itu berkode UTF-16 dan memuat noise PowerShell (CLIXML), sehingga angka diekstrak dengan `tools/build_baseline.py` (regex pada keluaran `cargo test`/Jest), bukan diketik tangan. Sesi ini tidak dapat menjalankan `cargo` (tidak ada akses jaringan ke crates.io), jadi baseline Rust tidak dapat diulang di sandbox. `run_all.ps1` menjalankan ulang baseline dengan keluaran UTF-8 bersih (`logs/baseline_*.txt`); `build_baseline.py` akan otomatis memakai log baru itu bila ada.

**Definisi baseline.** Hanya tes yang sudah ada sebelum paket evaluasi: target `thesis_*` dan folder `__tests__/thesis/` tidak dihitung. Cakupan Jest diukur terbatas pada folder tiga menu (`--collectCoverageFrom`), kolom `% Lines` pada baris `All files`. Cakupan Rust: NOT RUN karena `cargo-llvm-cov` tidak terpasang/tidak dapat dijalankan di sesi ini; `run_all.ps1` mengukurnya bila alat itu ada di Windows.

Tabel dibangun oleh `tools/build_baseline.py` langsung dari log eksekusi (tidak ada angka diketik tangan). Baris Rust diisi dari keluaran `cargo test`; baris Jest dari ringkasan Jest (`Tests:` dan kolom `% Lines` pada baris `All files`).

| Lapisan | Lokasi pengujian | Jumlah kasus | Lulus | Gagal | Cakupan baris |
|---|---|---|---|---|---|
| Rust pustaka inti | `public/workers/TextAnalytics/statify-text-core/tests/` (5 berkas integrasi) + `src/` | 91 | 91 | 0 | NOT RUN (cargo-llvm-cov belum dijalankan) |
| Rust Naive Bayes | `naive-bayes/rust/src/` (tes unit dalam lib) | 203 | 203 | 0 | NOT RUN (cargo-llvm-cov belum dijalankan) |
| Rust Apply Model | `apply-model/rust/src/` + `rust/tests/text_scoring.rs` | 156 | 156 | 0 | NOT RUN (cargo-llvm-cov belum dijalankan) |
| Rust STWV | `StringToWordVector/rust/` (tidak ada tes) | 0 | 0 | 0 | NOT RUN (cargo-llvm-cov belum dijalankan) |
| Jest STWV | `Transform/StringToWordVector/__tests__/` (9 suite) | 111 | 111 | 0 | 52,24% |
| Jest Naive Bayes | `Classify/naive-bayes/**/__tests__/` (13 suite) | 253 | 253 | 0 | 86,64% |
| Jest Apply Model | `Classify/apply-model/**/__tests__/` (26 suite) | 466 | 466 | 0 | 97,21% |

## Sumber dan tanggal eksekusi

| Lapisan | Berkas log | Waktu berkas log (UTC) | Rincian |
|---|---|---|---|
| Rust pustaka inti | `logs/unit_core.txt` | 2026-10-07 12:43 UTC | lib: 0 lulus; characterization: 15 lulus; nb_text: 13 lulus; s2_pipeline: 16 lulus; s3_formulas: 25 lulus; s4_fit_transform: 22 lulus; doc-tests: 0 lulus |
| Rust Naive Bayes | `logs/unit_nb.txt` | 2026-10-07 12:43 UTC | lib: 203 lulus; doc-tests: 0 lulus |
| Rust Apply Model | `logs/unit_am.txt` | 2026-10-07 12:43 UTC | lib: 117 lulus; text_scoring: 39 lulus; doc-tests: 0 lulus |
| Rust STWV | `logs/unit_stwv.txt` | 2026-10-07 12:44 UTC | lib: 0 lulus; doc-tests: 0 lulus |
| Jest STWV | `logs/jest_stwv.txt` | 2026-10-07 12:44 UTC | 9 suite |
| Jest Naive Bayes | `logs/jest_nb.txt` | 2026-10-07 12:45 UTC | 13 suite |
| Jest Apply Model | `logs/jest_am.txt` | 2026-10-07 12:45 UTC | 26 suite |

## Pembanding silang di VM Linux (bukan perangkat skripsi)

Jest dijalankan ulang di VM lokal (Linux, Node 22.23.2) dengan `ts-jest` sebagai pengganti transformer SWC bawaan `next/jest` (biner SWC yang terpasang hanya versi Windows). Hasilnya konsisten dengan log Windows pada jumlah kasus: STWV 111 tes (9 suite, identik), Apply Model 466 tes (identik). Naive Bayes: 292 tes di VM karena menyertakan 39 tes white-box lama milik pengguna (`hooks/__tests__/whitebox.*.test.ts`, belum dilacak git) yang belum ada saat log Windows direkam (253 + 39 = 292). Cakupan baris di VM berbeda tipis karena instrumentasi berbeda: STWV 51,37% (Windows 52,24%), Naive Bayes 87,01% (86,64%), Apply Model 97,50% (97,21%). Sumber: `logs/coverage_jest_summary_vm.txt`. Angka resmi untuk buku tetap angka Windows di tabel atas.

## Berkas dengan cakupan di bawah 70% (terukur, Jest)

Dari pengukuran VM: STWV — `OptionsTab.tsx`, `StringToWordVectorModal.tsx`, `VariablesTab.tsx`, `stringToWord.processor.ts`, `hooks/useStringToWordVector.ts` (semuanya 0% baris, komponen UI dan hook yang memuat Worker); Naive Bayes — `components/export-model-output.tsx` (0%), `dialogs/validation.tsx` (17,94%); Apply Model — tidak ada. Pembahasan celah dan tes tambahan ada di `A_unit.md`.

**Pembaruan 8 Oktober 2026.** Eksekusi ulang di Windows oleh `run_all.ps1` (log `baseline_rust_*.txt`, `baseline_jest_*.txt`, `baseline_jest_*_win.json`, `baseline_coverage_*_win.json`) memberi jumlah tes yang sama (Rust 91/203/156/0; Jest 111/253/466) dan cakupan baris Jest STWV 52,24%, Naive Bayes 86,64%, Apply Model 97,21% (dua angka terakhir berbeda tipis dari eksekusi 7 Oktober karena himpunan berkas cakupan ditentukan oleh `--collectCoverageFrom`; angka di tabel di atas sudah memakai nilai eksekusi 8 Oktober).
