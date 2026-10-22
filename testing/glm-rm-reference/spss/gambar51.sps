* Dataset Gambar 51 (repeated measures.sav), perlakuan 4 level, 15 subjek.
* Dibuat oleh testing/glm-rm-reference/generate.py (data identik dengan CSV di folder data/).
* SPSS 27: buka berkas ini di Syntax Editor lalu Run > All.
SET DECIMAL=DOT.
NEW FILE.
DATA LIST FREE / perlakuan1 perlakuan2 perlakuan3 perlakuan4.
BEGIN DATA
426 609 556 600
253 236 392 395
359 433 349 357
432 431 522 600
405 426 513 513
324 438 507 539
310 312 410 456
326 326 350 504
375 447 547 548
286 286 403 422
349 382 473 497
429 410 488 547
348 377 447 514
412 473 472 446
347 326 455 468
END DATA.
DATASET NAME gambar51 WINDOW=FRONT.
GLM perlakuan1 perlakuan2 perlakuan3 perlakuan4
  /WSFACTOR=perlakuan 4 Polynomial
  /MEASURE=anjing
  /METHOD=SSTYPE(3)
  /CRITERIA=ALPHA(.05)
  /WSDESIGN=perlakuan.

* Opsional: simpan seluruh output ke Excel agar nilai bisa dibaca lengkap.
* Hapus tanda bintang di dua baris berikut dan sesuaikan folder tujuannya.
* OUTPUT EXPORT /CONTENTS EXPORT=ALL LAYERS=VISIBLE MODELVIEWS=PRINTSETTING
*   /XLSX DOCUMENTFILE='C:\statify-spss\rm_gambar51.xlsx' OPERATION=CREATEFILE.
