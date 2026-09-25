# Sintaks SPSS yang harus dijalankan penulis

**Cara menjalankan:** buka tiap berkas `.sps` di SPSS 27 (Syntax Editor), lalu Run > All.

**Keluaran:** setiap sintaks sudah berisi `OUTPUT EXPORT … /XLSX DOCUMENTFILE=…`, jadi Excel tersimpan otomatis di folder tujuan. Formatnya sama dengan keluaran lama di `testing/glm-mv-reference/spss-output/`: `.xlsx` hasil Export (dipakai untuk perbandingan), dan `.spv` (File > Save As dari jendela Output) disimpan di folder yang sama dengan nama dasar yang sama.

**Path:** path di sintaks adalah path repo lokal (`D:\0.POLTSTAT STIS\…\statify64\…`). Sesuaikan bila repo ada di tempat lain.

| No | Sintaks | Data yang dibaca | Keluaran yang disimpan | Dipakai untuk |
|---|---|---|---|---|
| 1 | `testing/glm-mv-reference/spss/mv9_tiga_dv_empat_level.sps` | `testing/glm-mv-reference/data/one-way manova tiga dv empat level.csv` (GET DATA /TYPE=TXT) | `testing/glm-mv-reference/spss-output/mv9_tiga_dv_empat_level.xlsx` (+ `.spv`) | v5 B1: df2 pecahan Wilks' Lambda (Sig. dan Observed Power) pada mv9 |
| 2 | `testing/glm-mv-reference/spss/mv6_type_i_ii.sps` | `testing/glm-mv-reference/data/two-way manova tak seimbang.sav` | `testing/glm-mv-reference/spss-output/mv6_type_i_ii.xlsx` (+ `.spv`), berisi dua GLM (Type I dan Type II) | v5 B2: SS Intercept Type I dan Type II (Type II berstatus "menunggu SPSS") |
| 3 | `testing/fitur-v4/spss/mv2_delta0.sps` | `testing/glm-mv-reference/data/hotelling 2 populasi independen.sav` | `testing/fitur-v4/spss-output/mv2_delta0.xlsx` (+ `.spv`) | v4 δ₀ dua populasi (Pooled) pada data geser |
| 4 | `testing/fitur-v4/spss/mv3_delta0.sps` | `testing/glm-mv-reference/data/hotelling berpasangan (data asli).sav` | `testing/fitur-v4/spss-output/mv3_delta0.xlsx` (+ `.spv`) | v4 δ₀ berpasangan |

**Tidak ada sintaks SPSS untuk:**
- **Uji khi-kuadrat Σ diketahui (skripsi-final-v5, Bagian 1):** SPSS GLM tidak menyediakan uji dengan matriks kovarians populasi yang diketahui, sehingga validasinya memakai R dasar.
- **Uji Welch (Unequal):** tidak ada padanan di SPSS GLM.

**Status keluaran di repo** (diperiksa saat berkas ini dibuat, 2026-09-25): keempat keluaran belum ada.
