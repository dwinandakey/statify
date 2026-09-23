* Encoding: UTF-8.
* Uji Vektor Rata-rata Satu Populasi (Hotelling T2 satu populasi).
* Data: testing/glm-mv-reference/data/hotelling 1 populasi.sav (32 mobil, mtcars).
* Statify: Dependent Variables mpg disp hp wt, tanpa Fixed Factor, Test Values = 20 200 150 3.
* SPSS: model intercept-only (GLM tanpa faktor) pada selisih d = x - mu0, sehingga
*   Intercept menguji H0: E[x - mu0] = 0, sama dengan H yang dihitung Statify dari (xbar - mu0).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv1.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\hotelling 1 populasi.sav'.
DATASET NAME mv1 WINDOW=FRONT.

* Selisih terhadap vektor uji mu0 = (20, 200, 150, 3) (sama dengan kolom d_* di berkas, dihitung ulang di sini).
COMPUTE mpg_mu0 = mpg - 20.
COMPUTE disp_mu0 = disp - 200.
COMPUTE hp_mu0 = hp - 150.
COMPUTE wt_mu0 = wt - 3.
VARIABLE LABELS mpg_mu0 'mpg - 20' disp_mu0 'disp - 200' hp_mu0 'hp - 150' wt_mu0 'wt - 3'.
EXECUTE.

* Descriptive Statistics variabel asli (Statify menampilkan mean/SD variabel asli, bukan selisih).
MEANS TABLES=mpg disp hp wt
  /CELLS=MEAN STDDEV COUNT.

GLM mpg_mu0 disp_mu0 hp_mu0 wt_mu0
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER
  /CRITERIA=ALPHA(.05).

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv1_satu_populasi.xlsx' OPERATION=CREATEFILE.
