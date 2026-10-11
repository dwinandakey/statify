# Integrasi modul statistik Daniel — 14 September 2026

Progres modul lokal digabungkan dengan `origin/main` pada branch
`daniel-integrasi-modul-statistik`. Pengajuan harus tetap **Draft** karena
seluruh pengujian belum lulus. Branch `main` tidak diubah oleh proses ini.

## Titik pemulihan

- Basis pekerjaan lokal: `d9a1d93c` (branch `daniel`).
- Commit penyimpanan progres: `9aaa10bc`.
- Branch sebelum integrasi: `backup/daniel-sebelum-integrasi`.
- Pembaruan tim: `92cf9c2c`, mencakup 446 commit setelah basis lokal.
- Cadangan folder terpisah mencakup `.git`, konfigurasi lokal, dan file baru;
  dependensi serta hasil build dikecualikan. 2.798 file tersalin dan hash 135
  file perubahan/file baru cocok dengan cadangan.
- File lokal tambahan disimpan dalam stash bernama
  `File lokal tambahan sebelum integrasi 2026-09-14`.

## Perubahan dan penyelesaian konflik

Progres yang disimpan meliputi normalitas pada Explore, Bartlett,
Pearson Chi-Square pada Crosstabs, Jarque-Bera yang sudah ada dalam pekerjaan
lokal, pengujian, dokumentasi, dan data contoh kecil.

Tiga konflik diselesaikan secara manual:

- `Navbar.tsx`: mempertahankan menu terbaru tim dan menambahkan kembali Bartlett
  serta menu normalitas lokal.
- `DataTableRenderer.tsx`: mempertahankan dukungan `colSpan`, placeholder, dan
  pengelompokan header terbaru; penanganan baris/header tidak lengkap tetap tersedia.
- `next.config.js`: mempertahankan konfigurasi WebAssembly dan header isolasi dari
  tim; proxy mendukung backend lokal, Docker, dan URL konfigurasi dengan atau tanpa
  akhiran `/api`.

Whitespace pada file perubahan lokal dirapikan. Laporan benchmark yang dihasilkan
ulang saat pengujian tidak dimasukkan ke perubahan kode.

## Validasi

| Pemeriksaan | Hasil |
| --- | --- |
| `npm ci --no-audit --no-fund` | Lulus; 1.251 paket terpasang |
| `npm run build:frontend` | Lulus, termasuk pemeriksaan TypeScript dan pembuatan halaman |
| Seluruh Jest frontend, `--runInBand --silent --json` | 234 suite lulus, 51 gagal; total 285 |
| Jumlah tes | 3.167 lulus, 245 gagal, 3 dilewati; total 3.415 |
| Tes integrasi renderer tabel | 3/3 lulus |
| Tes integrasi proxy dan header WebAssembly | 5/5 lulus |
| Browser Chromium, produksi lokal | Menu Bartlett, pemilihan variabel, perhitungan, dan dua tabel hasil berhasil |

Pengujian browser memakai profil sementara dan 10 observasi sintetis dalam dua
kelompok. Hasil Bartlett yang ditampilkan: statistik 0.000, df 1, Sig. 1.000;
varians masing-masing kelompok 10.0000. Ini merupakan smoke test integrasi,
bukan validasi menyeluruh ketepatan statistik.

Browser juga mencatat `Cannot use import statement outside a module`.
Sumber error ini belum diisolasi; keberhasilan alur Bartlett tidak berarti
seluruh aplikasi bebas error runtime.

## Temuan yang masih perlu ditindaklanjuti

- `shared/mathPrecision.js` masih kosong sebagaimana sebelum integrasi, sehingga
  pengujian fungsi MathPrecision gagal.
- Tes formatter Crosstabs mengharapkan satu baris, sedangkan formatter menghasilkan
  baris Pearson dan N of Valid Cases. Ketidaksesuaian ini sudah ada pada snapshot
  lokal sebelum integrasi.
- Dua tes benchmark Bartlett gagal pada asumsi perubahan penggunaan memori;
  garbage collection dapat menghasilkan selisih heap negatif.
- Kegagalan lain meliputi mock store/komponen dan pengujian modul lain. Tidak semua
  kegagalan telah dibandingkan dengan baseline sebelum integrasi; jangan menganggap
  semuanya berasal dari perubahan tim maupun dari pekerjaan lokal.
- Build melewati lint sesuai konfigurasi proyek. Build lulus bukan bukti lint lulus.

Hasil lengkap, log instalasi/build/Jest, screenshot, dan script smoke test disimpan
lokal di `.integration-local/20260914/` dan tidak diunggah bersama kode.

Penggabungan ke `main` perlu menunggu peninjauan hasil integrasi dan tindak lanjut
kegagalan yang relevan.
