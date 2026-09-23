* Encoding: UTF-8.
* Uji Perbedaan Vektor Rata-rata Dua Populasi (Hotelling T2 dua populasi independen).
* Data: testing/glm-mv-reference/data/hotelling 2 populasi independen.sav
*   (67 baris: 64 pengamatan + 3 baris kosong di akhir; baris kosong TIDAK dihapus).
* Statify: Dependent Variables x1 x2 x3 x4, Fixed Factor jk, varians Equal (Pooled estimate of Sigma).
* SPSS: GLM x1 x2 x3 x4 BY jk. Baris kosong bernilai system-missing sehingga dikeluarkan (listwise), N = 64.
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
OUTPUT NEW NAME=mv2.
SET DECIMAL=DOT.
GET FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\data\hotelling 2 populasi independen.sav'.
DATASET NAME mv2 WINDOW=FRONT.

GLM x1 x2 x3 x4 BY jk
  /METHOD=SSTYPE(3)
  /INTERCEPT=INCLUDE
  /MISSING=EXCLUDE
  /PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY
  /CRITERIA=ALPHA(.05)
  /DESIGN=jk.

* Simpan output ke Excel (folder spss-output di repositori; sesuaikan bila repositori ada di tempat lain).
OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64\testing\glm-mv-reference\spss-output\mv2_dua_populasi.xlsx' OPERATION=CREATEFILE.
