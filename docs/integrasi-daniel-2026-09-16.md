# Pembaruan branch Daniel — 16 September 2026

Branch `daniel-integrasi-modul-statistik` menggabungkan pembaruan `origin/main`
hingga `b5d6e278`. Penggabungan mencakup 25 commit dan 68 file, terutama pada
regresi logistik biner/ordinal, diskriminan, dan analisis faktor.

## Perlindungan pekerjaan lokal

- Commit sebelum pembaruan: `6fbcd472`.
- Branch cadangan: `backup/daniel-sebelum-sync-20260916`.
- Snapshot 22 file lokal beserta hash SHA-256 disimpan di
  `.integration-local/20260916-before-sync/` (tidak diunggah).
- Merge otomatis selesai tanpa konflik. Daftar 68 file hasil merge sesuai
  dengan daftar pembaruan dari remote.
- Kode Bartlett, Explore, Crosstabs, dan worker DescriptiveStatistics tidak
  berubah dibandingkan commit sebelum pembaruan.
- Manifest dependensi dan lockfile tidak berubah, sehingga instalasi ulang
  dependensi tidak diperlukan.
- Perubahan otomatis `next-env.d.ts` akibat build dikembalikan ke salinan lokal
  sebelum pembaruan. File tambahan lokal tetap tersedia dan tidak ikut commit.

## Pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| Build frontend produksi | Lulus, termasuk TypeScript dan pembuatan halaman |
| Jest terarah, 12 suite | 9 lulus, 3 gagal |
| Jumlah tes | 227 lulus, 5 gagal, 3 dilewati; total 235 |
| Normalitas, Crosstabs, renderer tabel, dan proxy | Tes yang dijalankan lulus |
| Worker Bartlett | 15 lulus, 3 dilewati |
| Formatter ordinal dan matriks desain | Tes yang dijalankan lulus |

Pengujian menggunakan `npm test --workspace=frontend` dengan `--runInBand`,
`--silent`, `--json`, dan `--runTestsByPath` untuk lima suite analisis faktor,
dua suite ordinal, tiga suite worker statistik, serta dua suite integrasi
renderer/proxy. Build menggunakan `npm run build:frontend`.

Kelima kegagalan berada pada tiga suite analisis faktor:

- `factor-analysis-formatter-scores.test.ts`: tiga kegagalan terkait matriks
  kovarians skor komponen yang tidak muncul.
- `factor-analysis-formatter-total-variance.test.ts`: satu kegagalan terkait
  visibilitas hasil ekstraksi yang tidak berhasil.
- `factor-analysis-output-routing.test.ts`: satu kegagalan terkait tabel skor
  yang tetap muncul ketika ekstraksi tidak konvergen.

Kelima nama tes tersebut juga berstatus gagal dalam laporan pengujian
14 September 2026. Perbandingan disimpan dalam
`.integration-local/20260916/baseline-comparison.json`.

Log, hasil JSON, dan kode keluar pengujian/build disimpan di
`.integration-local/20260916/`. Direktori ini tidak diunggah.

Seluruh suite proyek tidak dijalankan ulang pada pembaruan ini. Hasil terarah
ini tidak membatalkan catatan 245 kegagalan pada pengujian penuh 14 September.
Lint dilewati oleh konfigurasi build proyek. Merge Request tetap Draft untuk
review dan tindak lanjut kegagalan sebelum digabungkan ke `main`.
