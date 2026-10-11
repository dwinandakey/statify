# Validasi SPSS tambahan: (d) kontras Repeated dan (e) dua faktor within

Keluaran SPSS 27 pengguna: `spss-output/rm_d.xlsx` dan `rm_e.xlsx` (beserta `.spv`), dari `spss/rm_d.sps` dan `spss/rm_e.sps`. Keduanya diekstrak dengan `harness/spss_extract.py` bersama keluaran sebelumnya.

## (d) Kontras Repeated: diperbaiki dan tervalidasi

Data (b) dengan `/WSFACTOR=waktu 4 Repeated` (271 nilai).

- **Tests of Within-Subjects Contrasts** (Level 1 vs. Level 2, …, untuk `waktu` dan `waktu * kelompok`): sama dengan Statify sejak awal. SPSS memakai koefisien selisih apa adanya, tidak dinormalisasi, seperti Statify.
- **Tests of Between-Subjects Effects: berbeda pada awalnya.**
  - Dengan kontras selain Polynomial, variabel transformasi "Average" SPSS adalah rata-rata Σy/k, bukan Σy/√k. Karena itu SS dan MS = SS(Polynomial)/k. Contoh (d): Intercept 308.833,594/4 = 77.208,398.
  - F, Sig., η², dan power tidak berubah.
  - Perbaikan di `RmModel::average`: skala √k untuk Polynomial, k untuk Repeated.
- Tabel lain (Descriptive Statistics, Multivariate Tests, Mauchly, Tests of Within-Subjects Effects) tidak bergantung pada jenis kontras, dan sama dengan (b).

Hasil presisi penuh (`compare-spss.txt`), dataset d:

| Tabel | Nilai | Selisih maks |
|---|---|---|
| Descriptive Statistics | 48 | 7,1·10⁻¹⁵ |
| Multivariate Tests | 64 | 3,0·10⁻⁴ (F tiga desimal SPSS) |
| Mauchly | 7 | 5,3·10⁻¹⁵ |
| Tests of Within-Subjects Effects | 76 | 1,5·10⁻¹¹ |
| Tests of Within-Subjects Contrasts (Repeated) | 57 | 1,9·10⁻¹¹ |
| Tests of Between-Subjects Effects | 19 | 2,9·10⁻¹¹ |

## (e) Dua faktor within (kondisi 2 × waktu 3): tidak cocok, diblokir

Modul lama, yang dipakai untuk desain lebih dari satu faktor within, memperlakukan keenam sel sebagai **satu** faktor berlevel 6:
- Multivariate hanya untuk "kondisi", dengan df 5/10;
- satu uji Mauchly, dengan df 14;
- kontras "Level 1 vs. Level 2 … Level 5 vs. Level 6", berlabel measure;
- SS between pada skala rata-rata.

SPSS menghitung tiga efek within (kondisi, waktu, kondisi * waktu), masing-masing dengan Mauchly, uji univariat (empat koreksi), kontras polinomial per faktor, dan uji multivariat. **Tidak ada satu nilai pun yang sebanding.**

Perbaikannya berarti menggeneralisasi `RmModel` ke banyak faktor within:
- kontras Kronecker per suku;
- Mauchly, uji efek, multivariat, dan kontras per suku;
- kunci Mauchly per suku;
- pemformat kontras multi-kolom;
- harness UI multi-faktor;
- validasi ulang.

Perkiraannya lebih dari setengah hari, sehingga sesuai instruksi desain ini **diblokir**:
- **Dialog Define** (`dialogs/define/repeated-measures-dialog.tsx`): faktor within kedua tidak bisa ditambahkan, dan Define ditolak bila ada > 1 faktor (misalnya dari dialog tersimpan). Pesannya: "Designs with more than one within-subjects factor are not supported in this version."
- **Mesin** (`wasm/function.rs`): bila `RmModel::build` gagal (di antaranya karena > 1 faktor within), analisis berhenti setelah tabel Within-Subjects Factors, dengan alasan di Errors Logs. Modul lama tidak lagi dipakai sebagai cadangan, sehingga tidak ada angka keliru.
- Nilai SPSS (e) (332 nilai terisi; Sig. Mauchly "kondisi" kosong karena df 0) disimpan di `fixture.spss_blocked.e` sebagai acuan bila desain ini diimplementasikan nanti. Test "Two within-subjects factors (dataset e): blocked" memastikan mesin berhenti dengan pesan itu dan tanpa tabel.

## Pemeriksaan

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| Build WASM RM, `next build` | — | Berhasil |
| Test acuan RM | `__test__/repeated-measures-reference.test.ts` | 1687 lulus: nilai SPSS **1318/1318** (1047 + 271 dari d), test jenis kontras, dan test blokir (e) |
| Jest penuh | `jest-summary.txt`, `jest-failed-suites.txt` | 49 gagal = baseline |
| Regresi Gambar 51 | `regression-g51.txt` | Sama dengan baseline dan SPSS |
| Blokir di UI asli | `ui-block-multi.json` | Faktor kedua tidak ditambahkan dan pesan tampil |
| Main vs worker, UI asli | `ui-main-worker.json`, `ui-cRep-1-main.json` | 8 desain byte-identik. `cRep`: Between Intercept 75.153,800 = 225.461,400/3 (skala rata-rata, seperti SPSS dengan Repeated) |
