# Pemeriksaan fungsional sebelum sel Multivariate final (2026-09-23 22:08–22:10 WIB)

**Bukan hasil.** Folder ini adalah run singkat untuk memastikan build `omPbTrx0Tb3XkYhgNYbYW` (kode `ab21928c`) berjalan dengan protokol sel final sebelum run penuh `../experiment-2026-09-23-cpu1-mv-pcore/` dimulai. Yang dipastikan:
- dialog Multivariate terisi 5 DV / 3 faktor;
- mode main dan worker sama-sama `ok`, dengan 4 tabel dan 0 pesan Errors Logs;
- *affinity* `0xFFF` tercatat.

Argumen: `-Modules multivariate -Sizes 100,2000 -Runs 2 -Affinity FFF -Extra "--clean=true --loaf=true"`. Hasilnya 8 run, semuanya `ok`.

Saat run ini berjalan, SPSS (`spssengine`, `stats`), Chrome, dan Word masih terbuka. Karena itu angka waktunya tidak dianalisis. Angka ini hanya dipakai sebagai acuan kasar pengecekan perlambatan di README sel final (LT A steady: MV-100 168 ms, MV-2000 2.529 ms).
