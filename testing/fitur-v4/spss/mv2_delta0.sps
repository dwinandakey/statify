* Encoding: UTF-8.
* Validasi fitur v4: uji dua populasi dengan delta0 (H0: mu(jk=1) - mu(jk=2) = delta0), varians Equal (Pooled).
* delta0 = (3, 2, 10, 1) untuk x1..x4. Setara dengan GLM biasa pada data yang digeser:
*   setiap pengamatan jk = 1 (level pertama) dikurangi delta0.
* Data: testing/glm-mv-reference/data/hotelling 2 populasi independen.sav (sama dengan mv2); pergeseran dilakukan di sini.
*   Salinan CSV data geser untuk Statify: testing/fitur-v4/data/mv2-geser.csv.
* Statify: Dependent Variables x1 x2 x3 x4, Fixed Factor jk, Equal (Pooled estimate of Sigma),
*   Test Values (delta0) = 3 2 10 1 (konfigurasi mv2d).
* Yang dibandingkan: Multivariate Tests baris jk dan Tests of Between-Subjects Effects baris jk
*   (juga baris Intercept, karena Statify menjalankan GLM pada data geser yang sama).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv2_delta0.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\hotelling 2 populasi independen.sav'.
DATASET NAME mv2_delta0 WINDOW=FRONT.

IF (jk = 1) x1 = x1 - 3.
IF (jk = 1) x2 = x2 - 2.
IF (jk = 1) x3 = x3 - 10.
IF (jk = 1) x4 = x4 - 1.
EXECUTE.

GLM x1 x2 x3 x4 BY jk
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=jk.

* Simpan output ke Excel (folder testing/fitur-v4/spss-output; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\fitur-v4\spss-output\mv2_delta0.xlsx' OPERATION=CREATEFILE.
