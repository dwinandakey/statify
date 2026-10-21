# Laporan pembersihan tes Text Analytics (21 Oktober 2026)

> Dokumen historis (21 Okt 2026). Angka dan versi di sini sudah digantikan oleh laporan final `LAPORAN_UJI_ULANG_22Okt.md` (Rust 564 = 155/242/167; Jest 1.250 dalam 80 suite; rustc 1.99.1, Node 24.20.0, Jest 30.0.5).

Lingkungan: Windows 11 (perangkat skripsi), cargo/rustc 1.99.1, Jest 30.0.4, Node 22.23.2. Log: `logs/rust_pembersihan_21okt_*.txt`, `logs/jest_pembersihan_21okt_*_win.json`, `logs/coverage_pembersihan_21okt_*_win.json`, `logs/versi_pembersihan_21okt.txt`.

## 1. Asal angka 19 Oktober (586 Rust, 1.345 Jest)

- Rust 586 = 450 tes lama + 136 fungsi `eval_*.rs` paket evaluasi (inti +81, NB +42, AM +13). Tidak ada tes Rust baru dari perbaikan pasca-sidang. Log 19 Okt (`rust_revisi_19okt_*.txt`) dijalankan di Linux/WSL.
- Jest 1.345 (82 suite) = 817 tes lama (830 dikurangi 13 tes fitur yang dihapus pasca-sidang) + 454 paket evaluasi (453 + 1 tes rumus baru) + 26 tes tur bantuan baru + 9 tes B9 (12 Okt) + 39 tes dari dua berkas whitebox cadangan (`naive-bayes/hooks/__tests__/whitebox.*.test.ts`, commit 10 Okt "sampah, lg back up").
- Tes tur STWV "switches to the Options tab…" tidak stabil (gagal 3 dari 4 run): klik Next terkirim sebelum langkah selesai dirender setelah pindah tab.

## 2. Perubahan (disetujui Lewis, opsi B)

- Dihapus: dua berkas whitebox cadangan (39 tes). Pengganti untuk Lampiran white-box: `naive-bayes/hooks/__tests__/eval/whitebox.getNumericInputError.test.ts` (29 jalur, 29 lulus) dan `eval/whitebox.useNaiveBayesValidation.test.ts` (12 jalur, 12 lulus).
- Diperbaiki: tes tur STWV menunggu judul, target, dan tab aktif sebelum klik Next (lulus 6 dari 6 run berturut-turut).
- Dibuang: tes yang masukan dan harapannya sama dengan tes lain yang tetap ada (setiap kasus dicek ulang sebelum dihapus).
  - Rust inti (17): `s3_formulas.rs` 8, `characterization.rs` 5, `eval_vocab_limit.rs` 4 (salinan skenario data-driven di berkas yang sama). Blok assertion yang membandingkan kosakata dengan dirinya sendiri di `s3_formulas.rs` (temuan A-4) dibuang; tesnya tetap.
  - Rust NB (2): `eval_partition.rs` holdout saling lepas dan k-fold tepat satu fold (sudah diuji di `src/stats/partition.rs`).
  - Rust AM (2): `function.rs` `d1_d3_with_actual_adds_actual_unknown_class_warning_last`, `evaluation_is_none_when_actual_is_empty`.
  - Jest STWV (9): `buildColumnData.test.ts` 2, `config.test.ts` 2, `columnPrefix.test.ts` 5 baris `it.each`.
  - Jest NB (28): `useNaiveBayesValidation.test.ts` 8, `useNaiveBayesV2.test.ts` 8, `naiveBayesPayload.test.ts` 7, `options.test.tsx` 2, `raw-text-payload.test.ts` 1 (berkas dihapus), `naive-bayes-analysis-output.test.ts` 1, `text-feature-table-output.test.tsx` 1.
  - Jest AM (26): `model-loader.test.ts` 13, `useApplyModelMappingRules.test.ts` 4, `useApplyModelSaveRules.test.ts` 3, `naive-bayes-adapter-v2.test.ts` 2, `model-tab.test.tsx` 2, `save-tab.test.tsx` 1, `useApplyModelValidation.test.ts` 1.
- Dipertahankan dengan sengaja: pasangan v1/v2 Apply Model (skema 1.0/1.1 masih didukung), tes `gaussian_minstd` di mesin Rust NB (mesin masih mendukungnya untuk model lama), dan tumpang tindih di dalam paket evaluasi antar-track.

## 3. Hasil akhir (21 Oktober 2026, Windows)

| | Tes lama | Paket evaluasi | Total | Lulus |
|---|---|---|---|---|
| Rust inti (`statify-text-core/tests`) | 78 | 77 | 155 | 155 |
| Rust Naive Bayes (`naive-bayes/rust`) | 203 | 40 | 243 | 243 |
| Rust Apply Model (`apply-model/rust`) | 154 | 13 | 167 | 167 |
| **Rust** | **435** | **130** | **565** | **565** |
| Jest STWV (15 suite) | 102 | 65 | 167 | 167 |
| Jest Naive Bayes (24 suite) | 240 | 145 | 385 | 385 |
| Jest Apply Model (40 suite) | 447 | 244 | 691 | 691 |
| **Jest (79 suite)** | **789** | **454** | **1.243** | **1.243** |

- Pembagian per modul Jest menurut folder berkas tes. Tes adapter `apply-model/adapters/__tests__/naive-bayes-adapter*.test.ts` termasuk Apply Model.
- Crate Rust STWV tidak punya tes; build-nya diblokir oleh kebijakan Application Control Windows saat run ini (bukan kegagalan tes).
- Cakupan baris Jest (semua tes, termasuk paket evaluasi): STWV 72,45%, NB 94,75%, AM 97,80%. Angka 52,24/86,64/97,21% pada baseline 7–8 Okt diukur tanpa paket evaluasi, jadi tidak setara.
- `cargo test` menulis ulang `accuracy/out/pred_statify_rust_K*.csv`; selisihnya hanya pembulatan float (maks 2,2e-16, label prediksi sama), lalu dikembalikan ke versi commit.

## 4. Catatan di folder ini yang masih menyebut tes yang dibuang

Diperbarui 21 Oktober 2026 atas keputusan Lewis (angka di catatan mengikuti hasil terbaru). Buku juga diputuskan mengikuti analisis white-box `eval/` (WB-1 7 jalur, WB-2 29, WB-3 V(G) = 13 dengan 12 jalur layak, WB-4 6; total 54 jalur), sehingga dua berkas white-box lama tidak dikembalikan. Tes rumus baru (+1, `formula-output.eval.test.ts`) termasuk Track A, jadi Jest Track A menjadi 106 dan total paket evaluasi 454. Daftar di bawah adalah lokasi yang diperbarui.

- `eval_vocab_limit` 4 tes: `A_unit.md` 168–175, `templates/A_unit.md` 168–175, `REPORT.md` 249–256, `HANDOFF_PENULISAN_SKRIPSI.md` 515–522.
- `eval_partition` 2 tes dan jumlah 18 → 16, total Track A Rust 66 → 60 (eval_formulas 15 + eval_vocab_limit 9 + eval_text_pipeline 20 + eval_partition 16): `A_unit.md` 10, 144, 200, 207; `HANDOFF_PENULISAN_SKRIPSI.md` 51, 130, 287, 491, 547, 554, 1544, 1566; `REPORT.md` 21, 281, 288; `BUGS.md` 42, 64; `BUGS_A.md` 3, 25; `AUDIT_DOCS.md` 35; `report/HANDOFF.part1.md` 51; `report/HANDOFF.part3.md` 8.
- Daftar "sudah dicakup tes lama": `A_unit.md` 278–284, `unit/A_unit.template.md` 105–111.
- Temuan A-4 (blok assertion diri sendiri, kini dibuang): `BUGS_A.md` 58, 60; `BUGS.md` 12, 97, 99; `A_unit.md` 279, 314; `REPORT.md` 1177; `HANDOFF_PENULISAN_SKRIPSI.md` 1443, 1514, 1599, 1601.
- `model-loader.test.ts` disebut menguji ekstensi, ukuran, parse, dan tipe model (kini hanya di WB-4/BB-29/model-loader.eval): `B_whitebox.md` 338, `REPORT.md` 671, `HANDOFF_PENULISAN_SKRIPSI.md` 937.
