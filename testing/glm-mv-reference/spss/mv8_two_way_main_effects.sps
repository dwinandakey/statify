* Encoding: UTF-8.
* Two-Way MANOVA tanpa interaksi (model efek utama).
* Data: testing/glm-mv-reference/data/two-way manova.sav (sama dengan mv5: 32 pengamatan, faktorA 2 level x faktorB 4 level, 4 replikasi).
* Statify: Dependent Variables Y1A1 Y2A1, Fixed Factor faktorA faktorB; dialog Model: Build Terms, Model = faktorA, faktorB (Type III).
* SPSS: GLM Y1A1 Y2A1 BY faktorA faktorB dengan /DESIGN tanpa faktorA*faktorB; tabel yang diminta sama dengan mv5.
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv8.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\two-way manova.sav'.
DATASET NAME mv8 WINDOW=FRONT.

GLM Y1A1 Y2A1 BY faktorA faktorB
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=faktorA faktorB.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv8_two_way_main_effects.xlsx' OPERATION=CREATEFILE.
