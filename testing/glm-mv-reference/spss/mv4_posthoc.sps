* Encoding: UTF-8.
* One-Way MANOVA dengan uji post hoc (Multiple Comparisons) LSD, Bonferroni, Sidak.
* Data: testing/glm-mv-reference/data/one-way manova.sav (8 pengamatan, 3 perlakuan: n = 3, 2, 3).
* Statify: Dependent Variables y1 y2, Fixed Factor treatment; dialog Post Hoc: Post Hoc Tests for = treatment, centang LSD, Bonferroni, Sidak.
* SPSS: GLM y1 y2 BY treatment dengan /POSTHOC; tabel lain sama dengan mv4.
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv4posthoc.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\one-way manova.sav'.
DATASET NAME mv4posthoc WINDOW=FRONT.

GLM y1 y2 BY treatment
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /POSTHOC=treatment(LSD BONFERRONI SIDAK)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=treatment.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv4_posthoc.xlsx' OPERATION=CREATEFILE.
