* Encoding: UTF-8.
* Two-Way MANOVA tak seimbang (mv6) dengan Sum of Squares Type I dan Type II (v5 B2).
* Tujuan: memastikan SS Intercept Type I (R(mu) = n * mean^2) dan Type II di SPSS 27.
*   Statify v5: Intercept Type I dan Type II = n * mean^2 (Type II "menunggu SPSS").
*   Nilai Statify v5 (Tests of Between-Subjects Effects, Intercept): Y1A1 1513.3342, Y2A1 183187.2985.
* Data: testing/glm-mv-reference/data/two-way manova tak seimbang.sav (sama dengan mv6_two_way_tak_seimbang.sps).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv6_type_i_ii.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\two-way manova tak seimbang.sav'.
DATASET NAME mv6 WINDOW=FRONT.

GLM Y1A1 Y2A1 BY faktorA faktorB
  /METHOD=SSTYPE(1)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /DESIGN=faktorA faktorB faktorA*faktorB.

GLM Y1A1 Y2A1 BY faktorA faktorB
  /METHOD=SSTYPE(2)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /DESIGN=faktorA faktorB faktorA*faktorB.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv6_type_i_ii.xlsx' OPERATION=CREATEFILE.
