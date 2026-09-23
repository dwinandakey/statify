* Encoding: UTF-8.
* Two-Way MANOVA.
* Data: testing/glm-mv-reference/data/two-way manova.sav (32 pengamatan, faktorA 2 level x faktorB 4 level, 4 replikasi).
* Statify: Dependent Variables Y1A1 Y2A1, Fixed Factor faktorA faktorB (model Full factorial, Type III).
* SPSS: GLM Y1A1 Y2A1 BY faktorA faktorB dengan desain faktorial penuh.
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv5.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\two-way manova.sav'.
DATASET NAME mv5 WINDOW=FRONT.

GLM Y1A1 Y2A1 BY faktorA faktorB
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=faktorA faktorB faktorA*faktorB.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv5_two_way.xlsx' OPERATION=CREATEFILE.
