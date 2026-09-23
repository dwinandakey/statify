* Encoding: UTF-8.
* Uji Perbedaan Vektor Rata-rata Berpasangan (Hotelling T2 berpasangan).
* Data: testing/glm-mv-reference/data/hotelling berpasangan (data asli).sav (15 lokasi, format lebar).
* Statify: dialog Paired, pasangan (kedalaman1, kedalaman2) dan (ukuran1, ukuran2), delta0 = 0 0.
*   Statify membentuk d = v1 - v2 per baris lalu menjalankan model intercept-only pada d.
* SPSS: model intercept-only pada variabel selisih yang sama (d = pelapis 1 - pelapis 2).
*   Kolom kd dan uk di berkas berisi selisih yang sama; di sini dihitung ulang dari data mentah.
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv3.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\hotelling berpasangan (data asli).sav'.
DATASET NAME mv3 WINDOW=FRONT.

COMPUTE d_kedalaman = kedalaman1 - kedalaman2.
COMPUTE d_ukuran = ukuran1 - ukuran2.
VARIABLE LABELS d_kedalaman 'kedalaman1 - kedalaman2' d_ukuran 'ukuran1 - ukuran2'.
EXECUTE.

GLM d_kedalaman d_ukuran
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05).

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv3_berpasangan.xlsx' OPERATION=CREATEFILE.
