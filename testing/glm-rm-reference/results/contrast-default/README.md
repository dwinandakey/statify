# Kontras bawaan: Polynomial (seperti SPSS)

Permintaan pengguna (Langkah 2): bawaan kontras dialog Repeated Measures menjadi **Polynomial**, sama dengan bawaan SPSS (`WSFACTOR … Polynomial`). **Repeated** tetap bisa dipilih.

## Perubahan

| Berkas | Perubahan |
|---|---|
| `constants/repeated-measures-default.ts` | `RepeatedMeasuresContrastDefault.ContrastMethod`: `"none"` → `"polynomial"` |
| `dialogs/repeated-measures-main.tsx` | Label bawaan `FactorList`: `"<faktor>(Polynomial)"` (sebelumnya `?? "Repeated"`, praktisnya `"<faktor>(None)"`) |
| `dialogs/contrast.tsx` | Pilihan: Polynomial (pertama, bawaan), Repeated. Catatan: "Only Polynomial (default) and Repeated contrasts are supported in this version." |
| `rust/src/stats/rm_model.rs` (`within_contrast_type`) | Tanpa entri, `"none"` (dialog lama yang tersimpan), atau `"polynomial"` → `WithinContrast::Polynomial`; `"repeated"` → `WithinContrast::Repeated`; jenis lain → pesan di Errors Logs |
| `__test__/repeated-measures-reference.test.ts` | 4 test baru "Tests of Within-Subjects Contrasts: contrast type" (tanpa entri, bawaan dialog, `"sesi(None)"` → Linear/Quadratic; `"sesi (repeated, Ref: Last)"` → Level 1 vs. Level 2, …) |

Tabel lain (Within/Between Effects, Multivariate, Mauchly, dan seterusnya) tidak bergantung pada jenis kontras, karena uji within memakai kontras ortonormal yang invarian.

## Pemeriksaan

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| Build WASM RM, `next build` | — | Berhasil |
| Test acuan RM | — | 1414 lulus; nilai SPSS **1047/1047 lulus**; 4 test jenis kontras lulus |
| Jest penuh | `jest-summary.txt`, `jest-failed-suites.txt` | 49 gagal = baseline |
| Regresi Gambar 51 | `regression-g51.txt` | Sama dengan baseline (Sig. berubah sengaja sejak validasi SPSS) dan dengan SPSS |
| Main vs worker, UI asli | `ui-main-worker.json`, `ui-c-1-main.json`, `ui-cRep-1-main.json`, `ui-exp5000-1-main.json` | 8 desain byte-identik di 4 run. Dialog menawarkan ["Polynomial", "Repeated"]. Bawaan (c, exp5000) → Linear, Quadratic, …; `cRep` (Repeated lewat dialog) → Level 1 vs. Level 2, … |

Konfigurasi sel RM eksperimen (exp5000) kini menghasilkan kontras polinomial secara bawaan, sehingga tabel kontras sel eksperimen berbeda dari eksperimen kedua dan eksperimen ulang sebelumnya. Sel RM dijalankan ulang di Langkah 6.
