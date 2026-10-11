* Encoding: UTF-8.
* One-Way MANOVA (dua grup) dengan nilai hilang di tengah data (validasi lanjutan, Langkah 7).
* Data: testing/glm-mv-reference/data/hotelling 2 populasi independen dengan nilai hilang.sav, dibuat oleh make_derived.R:
*   hotelling 2 populasi independen.sav dengan x2 kasus 15 (jk = 1, semula 18) dan x4 kasus 45 (jk = 2, semula 28)
*   dikosongkan (system-missing). Semua nilai dan baris lain tetap, termasuk 3 baris kosong di akhir (67 baris).
*   SPSS mengeluarkan kasus dengan nilai hilang secara listwise: N = 62 (31 per grup).
* Statify: Dependent Variables x1 x2 x3 x4, Fixed Factor jk (varians Equal/Pooled).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv7.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\hotelling 2 populasi independen dengan nilai hilang.sav'.
DATASET NAME mv7 WINDOW=FRONT.

GLM x1 x2 x3 x4 BY jk
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=jk.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv7_one_way_nilai_hilang.xlsx' OPERATION=CREATEFILE.
