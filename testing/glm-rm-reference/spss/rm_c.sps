* Dataset (c) desain campuran dengan EMMeans dan homogeneity tests, sesi 3 level x metode 2 grup.
* Dibuat oleh testing/glm-rm-reference/generate.py (data identik dengan CSV di folder data/).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All.
SET DECIMAL=DOT.
NEW FILE.
DATA LIST FREE / subjek p1 p2 p3 metode.
BEGIN DATA
1 60 60 64 1
2 64 66 68 1
3 57 57 59 1
4 60 62 64 1
5 63 68 66 1
6 55 57 61 1
7 66 63 64 1
8 52 59 58 1
9 59 63 69 1
10 58 62 61 1
11 58 60 67 2
12 58 65 61 2
13 47 48 49 2
14 67 62 72 2
15 52 57 63 2
16 69 75 80 2
17 64 64 72 2
18 52 64 54 2
19 61 58 68 2
20 54 53 59 2
END DATA.
VALUE LABELS metode 1 'M1' 2 'M2'.
DATASET NAME rm_c WINDOW=FRONT.
GLM p1 p2 p3 BY metode
  /WSFACTOR=sesi 3 Polynomial
  /MEASURE=nilai
  /METHOD=SSTYPE(3)
  /EMMEANS=TABLES(OVERALL)
  /EMMEANS=TABLES(metode) COMPARE ADJ(BONFERRONI)
  /EMMEANS=TABLES(sesi) COMPARE ADJ(BONFERRONI)
  /EMMEANS=TABLES(metode*sesi)
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY RSSCP
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=sesi
  /DESIGN=metode.

* Opsional: simpan seluruh output ke Excel agar nilai bisa dibaca lengkap.
* Hapus tanda bintang di dua baris berikut dan sesuaikan folder tujuannya.
* OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
*   /XLSX DOCUMENTFILE='C:\statify-spss\rm_c.xlsx' OPERATION=CREATEFILE.
