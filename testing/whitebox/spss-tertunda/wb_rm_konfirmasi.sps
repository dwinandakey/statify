* Encoding: UTF-8.
* Konfirmasi dua temuan white-box RM (testing/whitebox/ringkasan-white-box.md, bagian Temuan).
* (1) gambar51 x 1e-5: Statify RmModel memberi GG = HF = 1; harapan (invarian skala) GG .7467, HF .8957.
* (2) n = k = 4: Statify memberi HF = GG = .6520; rumus HF (tervalidasi SPSS pada gambar51 dan a) memberi 1.
* SPSS 27: buka di Syntax Editor lalu Run > All. Sesuaikan path bila repositori ada di tempat lain.
SET DECIMAL=DOT.

GET DATA /TYPE=TXT /FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64-whitebox\testing\whitebox\spss-tertunda\gambar51_skala_1e-5.csv'
  /DELIMITERS="," /FIRSTCASE=2 /VARIABLES=perlakuan1 F20.12 perlakuan2 F20.12 perlakuan3 F20.12 perlakuan4 F20.12.
DATASET NAME skala WINDOW=FRONT.
GLM perlakuan1 perlakuan2 perlakuan3 perlakuan4
  /WSFACTOR=perlakuan 4 Polynomial
  /METHOD=SSTYPE(3)
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=perlakuan.

GET DATA /TYPE=TXT /FILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64-whitebox\testing\whitebox\spss-tertunda\n_sama_k.csv'
  /DELIMITERS="," /FIRSTCASE=2 /VARIABLES=x1 F8.2 x2 F8.2 x3 F8.2 x4 F8.2.
DATASET NAME nk WINDOW=FRONT.
GLM x1 x2 x3 x4
  /WSFACTOR=t 4 Polynomial
  /METHOD=SSTYPE(3)
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=t.

OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
  /XLSX DOCUMENTFILE='D:\0.POLTSTAT STIS\Tugas Kuliah\Skripsi\topik baru statify\statify64-whitebox\testing\whitebox\spss-tertunda\wb_rm_konfirmasi.xlsx' OPERATION=CREATEFILE.
