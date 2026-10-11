# Bartlett's Test of Homogeneity of Variances - Tests

Direktori ini berisi pengujian untuk komponen Bartlett Test dan hook terkait.

## File Test

- `BartlettTest.test.tsx`: Pengujian untuk komponen utama
- `VariablesTab.test.tsx`: Pengujian untuk komponen tab variabel
- `formatters.test.ts`: Pengujian untuk fungsi utilitas formatter
- `useBartlettAnalysis.test.ts`: Pengujian untuk hook analisis yang menangani komunikasi worker dan pemrosesan hasil
- `useVariableSelection.test.ts`: Pengujian untuk hook pemilihan variabel yang mengelola variabel available, test, dan factor
- `useTourGuide.test.ts`: Pengujian untuk hook tour guide yang mengelola tour interaktif

## Menjalankan Test

Untuk menjalankan test ini, gunakan:

```bash
npm test -- --testPathPattern=BartlettTest
```

## Cakupan Test

Test ini mencakup:

1. **Rendering Komponen**
   - Rendering komponen utama dan perpindahan tab
   - Rendering tab variabel dan interaksi
   - Rendering tab opsi dan interaksi
   - Status tombol berdasarkan pemilihan variabel

2. **Logika Analisis**
   - Komunikasi worker untuk beberapa variabel
   - Pemrosesan dan agregasi hasil
   - Penanganan error
   - Penanganan beberapa variabel dengan factor variable

3. **Pemilihan Variabel**
   - Memindahkan variabel antara daftar available, test, dan factor
   - Mengurutkan ulang test variables
   - Reset pemilihan
   - Menangani variabel yang disabled
   - Mengelola pemilihan factor variable

4. **Pengaturan Test**
   - Mengatur confidence level
   - Toggle opsi include descriptives
   - Reset pengaturan

5. **Pemformatan Data**
   - Memformat tabel Bartlett Test
   - Memformat tabel statistik deskriptif
   - Menangani edge case dan data kosong

6. **Tour Guide**
   - Memulai dan mengakhiri tour
   - Navigasi step (next/prev)
   - Tab switching otomatis
   - Penanganan container type (dialog/sidebar)

## Strategi Mock

Test menggunakan Jest mock untuk mengisolasi komponen dari dependensi eksternal:

- Web Workers di-mock untuk mensimulasikan komunikasi worker
- Zustand stores di-mock untuk menyediakan data test yang terkontrol
- Operasi result store di-mock untuk memverifikasi penyimpanan data yang benar
- Komponen UI di-mock untuk menyederhanakan pengujian

## Perbedaan Kunci dari One-Way ANOVA

1. **Tujuan Analisis**: Bartlett Test menguji homogenitas varians, bukan perbedaan rata-rata
2. **Output**: Menghasilkan Chi-Square statistic dan p-value
3. **Tab yang Lebih Sederhana**: Hanya Variables dan Options (tanpa Post Hoc)
4. **Statistik**: Fokus pada varians kelompok dan pooled variance
5. **Hasil**: Interpretasi berbasis pada uji signifikansi varians

## Menambahkan Test Baru

Saat menambahkan test baru:

1. Ikuti pola yang ada untuk mocking dependensi
2. Pastikan setiap test fokus pada satu perilaku
3. Gunakan nama test yang deskriptif yang menjelaskan apa yang diuji
4. Pertimbangkan kebutuhan khusus analisis Bartlett Test
5. Uji skenario variabel tunggal dan ganda
6. Verifikasi penanganan yang tepat untuk constraint factor variable
