* Dataset (a) within-only, dua measure x waktu 3 level.
* Dibuat oleh testing/glm-rm-reference/generate.py (data identik dengan CSV di folder data/).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All.
SET DECIMAL=DOT.
NEW FILE.
DATA LIST FREE / subjek cemas1 cemas2 cemas3 stres1 stres2 stres3.
BEGIN DATA
1 30 26 21 22 22 17
2 27 20 25 23 20 17
3 30 27 19 21 25 20
4 38 30 28 26 27 24
5 42 30 32 29 23 26
6 31 27 23 25 23 21
7 35 29 29 25 23 21
8 29 28 26 29 22 20
9 27 28 23 23 21 17
10 18 23 15 21 19 13
11 29 33 25 23 25 19
12 33 26 26 20 22 21
13 34 33 31 25 23 26
14 35 28 30 27 26 23
15 29 27 28 25 24 21
16 24 24 22 26 25 20
END DATA.
DATASET NAME rm_a WINDOW=FRONT.
GLM cemas1 cemas2 cemas3 stres1 stres2 stres3
  /WSFACTOR=waktu 3 Polynomial
  /MEASURE=cemas stres
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=waktu.

* Opsional: simpan seluruh output ke Excel agar nilai bisa dibaca lengkap.
* Hapus tanda bintang di dua baris berikut dan sesuaikan folder tujuannya.
* OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
*   /XLSX DOCUMENTFILE='C:\statify-spss\rm_a.xlsx' OPERATION=CREATEFILE.
