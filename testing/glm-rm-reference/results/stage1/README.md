# Tahap 1: hasil tidak deterministik (dua measure) dan urutan baris

## Diagnosis

1. **Sumber ketidakdeterministikan: `std::collections::HashMap` di crate RM (141 pemakaian).**
   - Urutan iterasinya bergantung pada kunci hash acak. Di wasm32, kunci itu bergeser setiap kali map baru dibuat dalam instance modul yang sama.
   - Akibatnya instance yang dipakai ulang (worker yang sama, atau modul main-thread yang sama) mengiterasi data yang sama dengan urutan berbeda di setiap analisis. Instance baru selalu mulai dari urutan yang sama, sehingga hasilnya identik.
   - Ini bukan state yang tertinggal di struct, cache, objek statis, atau konfigurasi yang termutasi. Setiap analisis membuat struct `RepeatedMeasureAnalysis` baru dan crate tidak memakai `static`/`thread_local`.
   - Urutan hash hanya memengaruhi **urutan** pada satu measure, tetapi memengaruhi **nilai** pada dua measure, karena ada kunci yang bertabrakan:
     - `calculate_mauchly_test` menyimpan hasil dengan kunci **nama faktor within** (`waktu`), yang sama untuk semua measure. Hasil measure kedua menimpa yang pertama, dan measure mana yang tersisa bergantung pada urutan hash.
     - `calculate_tests_within_subjects_effects` mengambil epsilon GG/HF/LB dengan `mauchly.tests.get(<nama faktor>)`, sehingga **kedua measure memakai epsilon milik measure yang kebetulan tersimpan terakhir**.
     - Jalur within-only di `calculate_multivariate_tests` menghitung uji per measure lalu menyimpannya dengan kunci nama faktor, sehingga hasilnya juga saling menimpa.

## Perbaikan

- `utils/collections.rs`: alias `HashMap`/`HashSet` → `indexmap::IndexMap`/`IndexSet` (dependensi baru `indexmap` 2, fitur `serde`). Urutan iterasi = urutan sisip = urutan definisi variabel, faktor, dan measure. Semua `use std::collections::…` di crate diganti.
- `mauchly_test.rs`: hasil dikunci per **measure**, dan `effect` berisi nama faktor within.
- `within_subjects_effects.rs`: koreksi memakai epsilon measure yang bersangkutan.
- `multivariate_tests.rs`: desain within-only dengan ≥ 2 measure memakai uji **doubly multivariate** seperti SPSS: Intercept (rata-rata ternormalisasi semua measure bersama) dan faktor within (kontras ortonormal semua measure bersama). Subjek dengan nilai hilang dikeluarkan (listwise). Satu measure tetap memakai jalur lama.
- `glm_tests.rs` (baru): statistik multivariat SPSS dari H dan E (Pillai, Wilks/Rao F, Hotelling, Roy, η² parsial), serta *observed power* eksak dari distribusi F nonsentral. Saat ini hanya dipakai jalur doubly multivariate.
- Pemformat TS: kolom Measure pada tabel Mauchly diambil dari kunci baru. Tabel Between-Subjects mendapat kolom Measure bila ada > 1 measure.

## Bukti

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| 10× di instance yang sama + 10× di instance baru, sebelum perbaikan (pkg baseline) | (log sesi) | Gambar 51: 8 keluaran berbeda; (a), L10M1, L10M2: 10 keluaran berbeda |
| Sama, sesudah perbaikan | `determinism.json` | gambar51, a, b, L10M1, L10M2: **1 keluaran (byte-identik)**, instance sama = instance baru |
| Regresi Gambar 51 (Mauchly) | `regression-g51.txt` | Semua nilai identik dengan baseline pada presisi penuh |
| Main thread vs worker, UI asli, build produksi, 4 run per desain | `ui-main-worker.json` | Gambar 51 dan (a): tabel byte-identik di semua run |
| Jest penuh | `jest-summary.txt`, `jest-failed-suites.txt` | 274 suite, **49 gagal, daftarnya identik dengan baseline** |

Dataset (a) dibandingkan dengan pembanding R (`harness/compare-reference.mjs a …`):
- Mauchly 14/14 cocok, Multivariate Tests 64/64 cocok.
- Within-Subjects Effects: SS, df, MS, F, Sig., dan η² cocok.
- Yang belum cocok adalah kekurangan lama yang juga ada di jalur satu measure (Gambar 51), dan ditangani di Tahap 2:
  - *observed power* memakai aproksimasi normal;
  - noncentrality baris GG/HF/LB memakai df tak terkoreksi;
  - SS dan MS Between-Subjects memakai rata-rata, bukan jumlah/√k (selisih faktor k; F, p, dan η² tetap sama).

Catatan Gambar 51: baseline dan hasil sekarang sama-sama memberi chi-square 6,104 dan Sig. 0,296. Nilai acuan pengguna adalah 6,164 dan 0,298 (lihat `../../README.md`, catatan 1).
