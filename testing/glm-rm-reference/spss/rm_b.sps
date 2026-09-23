* Dataset (b) desain campuran, waktu 4 level x kelompok 3 grup.
* Dibuat oleh testing/glm-rm-reference/generate.py (data identik dengan CSV di folder data/).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All.
SET DECIMAL=DOT.
NEW FILE.
DATA LIST FREE / subjek w1 w2 w3 w4 kelompok.
BEGIN DATA
1 65 70 67 73 1
2 58 59 60 65 1
3 44 57 49 52 1
4 56 57 59 59 1
5 52 51 52 52 1
6 51 56 51 63 1
7 41 39 48 41 1
8 48 49 57 58 1
9 65 58 60 65 2
10 44 51 53 50 2
11 59 62 59 57 2
12 67 60 56 63 2
13 55 63 57 62 2
14 58 55 53 53 2
15 57 53 51 57 2
16 58 58 59 65 2
17 54 59 61 58 3
18 55 53 57 56 3
19 65 58 60 62 3
20 47 46 48 49 3
21 56 55 60 63 3
22 55 54 53 58 3
23 70 58 62 55 3
24 65 63 66 62 3
END DATA.
VALUE LABELS kelompok 1 'K1' 2 'K2' 3 'K3'.
DATASET NAME rm_b WINDOW=FRONT.
GLM w1 w2 w3 w4 BY kelompok
  /WSFACTOR=waktu 4 Polynomial
  /MEASURE=skor
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=waktu
  /DESIGN=kelompok.

* Opsional: simpan seluruh output ke Excel agar nilai bisa dibaca lengkap.
* Hapus tanda bintang di dua baris berikut dan sesuaikan folder tujuannya.
* OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
*   /XLSX DOCUMENTFILE='C:\statify-spss\rm_b.xlsx' OPERATION=CREATEFILE.
