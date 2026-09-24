* Encoding: UTF-8.
* Validasi fitur v4: uji berpasangan dengan delta0 (H0: mu_d = delta0), d = pelapis 1 - pelapis 2.
* delta0 = (8, 3) untuk (kedalaman1 - kedalaman2, ukuran1 - ukuran2). Setara dengan model intercept-only
*   pada d - delta0.
* Data: testing/glm-mv-reference/data/hotelling berpasangan (data asli).sav (sama dengan mv3).
*   Salinan CSV data geser untuk Statify: testing/fitur-v4/data/mv3-geser.csv (kedalaman1 - 8, ukuran1 - 3).
* Statify: dialog Paired, pasangan (kedalaman1, kedalaman2) dan (ukuran1, ukuran2), delta0 = 8 3 (konfigurasi mv3d).
* Yang dibandingkan: Multivariate Tests (baris Intercept SPSS = baris "Hotelling T² Berpasangan" Statify).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv3_delta0.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\hotelling berpasangan (data asli).sav'.
DATASET NAME mv3_delta0 WINDOW=FRONT.

COMPUTE d_kedalaman = kedalaman1 - kedalaman2 - 8.
COMPUTE d_ukuran = ukuran1 - ukuran2 - 3.
VARIABLE LABELS d_kedalaman 'kedalaman1 - kedalaman2 - 8' d_ukuran 'ukuran1 - ukuran2 - 3'.
EXECUTE.

GLM d_kedalaman d_ukuran
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05).

* Simpan output ke Excel (folder testing/fitur-v4/spss-output; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\fitur-v4\spss-output\mv3_delta0.xlsx' OPERATION=CREATEFILE.
