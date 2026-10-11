* Encoding: UTF-8.
* One-Way MANOVA, 3 DV, faktor 4 level tak seimbang (v5 B1: df2 pecahan Wilks' Lambda).
* Data: testing/glm-mv-reference/data/one-way manova tiga dv empat level.csv (dibuat make_mv9.R;
*   26 pengamatan, kelompok 1-4: n = 5, 7, 6, 8).
* Statify: Dependent Variables y1 y2 y3, Fixed Factor kelompok, Options: Estimates of effect size, Observed power.
* SPSS: GLM y1 y2 y3 BY kelompok.
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv9.
SET DECIMAL=DOT.
GET DATA /TYPE=TXT
  /FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\one-way manova tiga dv empat level.csv'
  /ENCODING='UTF8'
  /DELCASE=LINE
  /DELIMITERS=","
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=y1 F8.1 y2 F8.1 y3 F8.1 kelompok F2.0.
DATASET NAME mv9 WINDOW=FRONT.

GLM y1 y2 y3 BY kelompok
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=kelompok.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv9_tiga_dv_empat_level.xlsx' OPERATION=CREATEFILE.
