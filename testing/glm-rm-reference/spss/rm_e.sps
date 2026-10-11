* Dataset (e) dua faktor within tanpa faktor between, kondisi 2 level x waktu 3 level.
* Dibuat oleh testing/glm-rm-reference/generate.py (data identik dengan CSV di folder data/).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All.
OUTPUT NEW NAME=rm_e.
SET DECIMAL=DOT.
NEW FILE.
DATA LIST FREE / subjek k1w1 k1w2 k1w3 k2w1 k2w2 k2w3.
BEGIN DATA
1 41 43 48 42 46 47
2 46 46 49 42 49 50
3 37 38 40 42 47 49
4 42 47 42 46 52 48
5 44 42 42 39 47 49
6 36 37 40 39 42 42
7 45 50 49 47 48 54
8 39 38 42 38 47 51
9 39 39 42 42 53 47
10 33 41 41 38 44 48
11 34 33 32 34 35 44
12 33 38 40 35 37 46
13 38 47 52 48 53 54
14 38 42 41 40 39 49
15 39 38 41 39 39 45
END DATA.
DATASET NAME rm_e WINDOW=FRONT.
GLM k1w1 k1w2 k1w3 k2w1 k2w2 k2w3
  /WSFACTOR=kondisi 2 Polynomial waktu 3 Polynomial
  /MEASURE=skor
  /METHOD=SSTYPE(3)
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=kondisi waktu kondisi*waktu.

* Simpan output ke Excel, ke folder spss-output di repositori (sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-rm-reference\spss-output\rm_e.xlsx' OPERATION=CREATEFILE.
