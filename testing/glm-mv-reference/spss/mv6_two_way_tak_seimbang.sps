* Encoding: UTF-8.
* Two-Way MANOVA tak seimbang (validasi lanjutan, Langkah 7).
* Data: testing/glm-mv-reference/data/two-way manova tak seimbang.sav, dibuat oleh make_derived.R:
*   two-way manova.sav tanpa kasus 4, 11, 12, 21, 26, 31 (nomor kasus asli).
*   Ukuran sel faktorA x faktorB: A1 = 3, 4, 2, 4; A2 = 4, 3, 3, 3 (N = 26, tidak ada sel kosong).
* Statify: Dependent Variables Y1A1 Y2A1, Fixed Factor faktorA faktorB (Full factorial, Type III).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv6.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\two-way manova tak seimbang.sav'.
DATASET NAME mv6 WINDOW=FRONT.

GLM Y1A1 Y2A1 BY faktorA faktorB
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=faktorA faktorB faktorA*faktorB.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv6_two_way_tak_seimbang.xlsx' OPERATION=CREATEFILE.
