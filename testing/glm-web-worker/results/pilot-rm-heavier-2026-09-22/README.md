# Pilot Bagian B — beban GLM Repeated Measures yang lebih berat (2026-09-22)

Tujuan: mencari konfigurasi Repeated Measures (RM) yang realistis dan masih dalam
cakupan modul, dengan waktu komputasi mode A (main thread) **paling sedikit sekitar
1 detik pada ukuran terbesar**, dan keluaran tanpa error. Konfigurasi ini dipakai
untuk sel RM pada eksperimen kedua (Bagian C).

Batas: hanya desain **within-subjects**. Desain campuran (faktor between) tidak
dipakai karena Bagian A menunjukkan desain itu gagal (`Empty matrices provided
for multiplication`) dan tabelnya dihitung dengan model lain
(`../diagnosis-rm-between-2026-09-22/README.md`). Kode aplikasi dan Rust tidak diubah.

## 1. Urutan percobaan (sesuai instruksi)

Semua langkah pakai satu binary `repeated-measures/rust/pkg` dan bentuk config
yang sama dengan payload dialog asli (`template/capture-n12-g2-worker.json`,
ditangkap dari UI; `BetSubVar: []`).

### 1.1 Node, median 3 kali (`diagnosis/rm-heavier/pilot-node.mjs`)

| Langkah | Level × measure | Opsi | n = 2000 | 5000 | 10000 | 20000 | Keluaran |
|---|---|---|---|---|---|---|---|
| 0 | 5 × 1 | default dialog | 77 ms | 123 | 208 | 381 | tanpa error |
| 1a | 5 × 1 | Descriptive statistics + Estimates of effect size + Observed power | 77 | 174 | 370 | 668 | tanpa error |
| 1b | 5 × 1 | 1a + Homogeneity tests | 122 | 215 | 373 | 692 | **error**: `calculate_bartlett_test: At least two dependent variables are required for Bartlett's test` |
| 1c | 5 × 1 | 1a + EMMeans `time` | — | — | — | — | **panic** Rust (`RuntimeError: unreachable`) |
| 1d | 5 × 1 | 1a + EMMeans `time`, compare main effects (Bonferroni) | — | — | — | — | **panic** |
| 2a/2b/3 | 8 × 1, 10 × 1, 10 × 2 | 1c | — | — | — | — | **panic** |
| 2a′ | 8 × 1 | 1a | 98 | 169 | 300 | 550 | tanpa error |
| 2b′ | 10 × 1 | 1a | 174 | 338 | 611 | 1110 | tanpa error |
| 3′ | 10 × 2 | 1a | 311 | 633 | 1179 | 2334 | tanpa error tercatat (lihat §2) |
| 4a | 10 × 2 | 1a + EMMeans `(OVERALL)` | — | — | — | — | **panic** |
| 4b | 10 × 2 | 1a + EMMeans `(OVERALL)` + compare (Bonferroni) | — | — | — | — | **panic** |

Berkas: `pilot-node.json` (putaran 1), `pilot-node-round2.json` (2a′–3′),
`pilot-node-round3.json` (4a–4b).

### 1.2 EMMeans lewat dialog asli

- Pada desain within-only, dialog **EM Means** hanya menawarkan `(OVERALL)`
  (`SrcList` diisi dari faktor between saja, `repeated-measures-main.tsx`), jadi
  EMMeans untuk `time` tidak bisa dipilih dari UI.
- `(OVERALL)` dipilih lewat dialog (10 × 2, n = 200): di **kedua mode** analisis
  berhenti dengan panic Rust (`RuntimeError: unreachable` di `wasm_bg.02fad085.wasm`;
  di mode B dilaporkan sebagai `GlmWorkerTaskError`). Tidak ada output tersimpan dan
  tidak ada mark `glm-analysis-end`. Berkas: `ui/pilot-ui-L10-M2-emmeans-overall.json`.
- Homogeneity tests hanya dicoba di Node (payload sama dengan dialog).

Jadi opsi dialog yang bisa dipakai tanpa error: **Descriptive statistics,
Estimates of effect size, Observed power**.

## 2. Temuan: keluaran berubah antar-komputasi dalam instance WASM yang sama

Aplikasi memakai ulang instance WASM (worker yang sama di mode B; modul yang sama
di main thread pada mode A). `diagnosis/rm-heavier/output-stability.mjs` menghitung
payload yang sama beberapa kali di satu instance, lalu di instance baru:

| Konfigurasi | Opsi | Instance sama: identik byte | Instance sama: nilai sama (urutan diabaikan, 12 digit) | Instance baru: identik | Tabel yang nilainya berbeda |
|---|---|---|---|---|---|
| 5 × 1, n = 2000 (desain eksperimen 1) | default | 0/3 | 3/3 | ya | — |
| 5 × 1, n = 2500 | 1a | 0/3 | 3/3 | ya | — |
| 10 × 1, n = 2500 | 1a | 0/3 | 3/3 | ya | — |
| 10 × 1, n = 40000 | 1a | 0/2 | 2/2 | ya | — |
| 5 × 2, n = 2500 | 1a | 0/3 | 0/3 | ya | Multivariate Tests, Mauchly, Tests of Within-Subjects Effects |
| 10 × 2, n = 2500 | 1a | 0/3 | 1/3 | ya | idem |
| 10 × 2, n = 2500 | default | 0/3 | 0/3 | ya | idem |

- Dengan **1 measure**, perbedaannya hanya **urutan** entri (urutan iterasi
  `HashMap` Rust). Nilainya sama. Ini juga berlaku untuk desain eksperimen 1
  (5 × 1, opsi default), jadi output RM eksperimen 1 konsisten secara nilai.
- Dengan **2 measure**, **nilainya** ikut berubah. Contoh: `mauchly_test/tests/time/chi_square`
  berbeda 5,78·10⁵ (relatif 1,04), dan `multivariate_tests/effects/time/Hotelling's
  Trace/noncent_parameter` berbeda 6,46·10²² antara komputasi ke-1 dan ke-2. Jadi
  hasil multi-measure bergantung pada berapa kali instance sudah dipakai. Tidak
  ada error yang tercatat. Instance baru selalu memberi hasil yang sama.
- Di browser (`ui-final/pilot-ui-L10-M2.json`) A dan B dalam satu pasangan selalu
  identik byte, karena kedua instance sudah dipakai sama banyak. Antar-pasangan,
  nilai Mauchly/Multivariate/Within-Subjects Effects (dan sekali Between-Subjects) berbeda.

Catatan skrip: di `ui/` dan `ui-n40000/`, flag identik dihitung per judul tabel.
Cara itu keliru karena aplikasi menyimpan satu tabel "Descriptive Statistics" per
variabel dependen dengan judul yang sama, jadi hanya tabel terakhir yang terbaca.
Karena itu flag `identical` di dua berkas itu **tidak valid**; angka waktunya tetap
valid. Di `ui-final/` perbandingannya memakai multiset `judul|hash` semua tabel.

## 3. Pilot browser (UI asli, build produksi, protokol bersih)

`diagnosis/rm-heavier/pilot-ui.cjs`: satu konteks per ukuran, impor CSV, lalu run
bergantian A, B (3 pasangan). Sebelum setiap run semua hasil dihapus lewat tombol
hapus-semua di halaman Result, dan `pre` (log/analytics/statistics di IndexedDB +
log yang dirender) dicek = 0 sebelum OK. Semua run di bawah: `pre` = 0, setelah run
1 log tersimpan dan 1 log dirender, 0 error tercatat. "Komputasi" = `glm-analysis-start`
→ `glm-analysis-end`. Pasangan pertama termasuk startup (nilai maks biasanya dari run itu).

**10 level × 1 measure, opsi 1a** (`ui-final/pilot-ui-L10-M1.json`; semua output
identik antar-run dan antar-mode di setiap ukuran):

| n subjek | Mode | Komputasi median [min–maks] (ms) | Long task terpanjang median (ms) | LoAF terpanjang median (ms) | Tabel |
|---|---|---|---|---|---|
| 5000 | A | 239 [229–724] | 130 | 140 | 17 |
| 5000 | B | 248 [234–273] | 0 | 0 | 17 |
| 10000 | A | 653 [605–734] | 450 | 451 | 17 |
| 10000 | B | 650 [411–691] | 0 | 0 | 17 |
| 20000 | A | 1066 [1048–1633] | 844 | 857 | 17 |
| 20000 | B | 1182 [1148–1345] | 69 | 71 | 17 |
| 40000 | A | 1858 [1814–2594] | 1613 | 1640 | 17 |
| 40000 | B | 1940 [1843–2200] | 168 | 170 | 17 |

Sesi sebelumnya dengan konfigurasi yang sama berjalan ~2× lebih cepat
(`ui/pilot-ui-L10-M1.json`, `ui-n40000/pilot-ui-L10-M1.json`). Mode A: n = 10000
334–598 ms, n = 20000 530–843 ms, n = 40000 967–1422 ms (long task A 826–874 ms;
long task B 93–130 ms). Mesin memakai AC dan skema daya "Performance" di kedua
sesi. Penyebab selisihnya tidak diketahui (kemungkinan kondisi termal/beban latar).

**10 level × 2 measure, opsi 1a** (`ui-final/pilot-ui-L10-M2.json`): n = 2500 A 855
[788–1336] ms, B 814 [764–932] ms; n = 20000 A 2262 [2228–3007] ms (long task 1726),
B 2482 [2385–2516] ms (long task 208). Nilai output berbeda antar-pasangan (§2).
Sesi pertama (`ui/pilot-ui-L10-M2.json`): n = 20000 A 1139–1523 ms.

Pengamatan tambahan dari LoAF: pada run startup mode A di `ui-final/pilot-ui-L10-M1.json`,
Long Tasks API melaporkan 0–126 ms, sedangkan LoAF terpanjang 377–1991 ms. Blok startup yang
tidak terlihat di eksperimen 1 tertangkap oleh LoAF.

## 4. Konfigurasi yang dipilih untuk Bagian C

- **Desain**: within-subjects saja; faktor `time` dengan **10 level**; **1 measure**
  (`score`); kolom `t1..t10`. Data dari `experiment/datasets.cjs`
  (`repeatedMeasuresRows(n, 10, 1)`, rumus sama dengan eksperimen 1).
- **Opsi dialog**: Descriptive statistics, Estimates of effect size, Observed power
  (`--rm-options=DescStats,EstEffectSize,ObsPower`). Opsi lain default.
- **Ukuran**: **n = 5000, 10000, 20000, 40000** subjek (kelipatan 2).

Alasan:
1. Semua opsi yang berjalan tanpa error sudah dipakai. Homogeneity tests memberi
   error Bartlett, dan EMMeans (`time` lewat payload, `(OVERALL)` lewat dialog) panic.
2. Level dinaikkan ke maksimum yang diminta (10).
3. Measure kedua **tidak** dipakai. Tidak ada error tercatat, tetapi nilainya berubah
   antar-komputasi dalam instance yang sama (§2), jadi keluarannya tidak bisa
   dipertanggungjawabkan.
4. Dengan 10 × 1, target ≥ ~1 s mode A tidak tercapai di n = 20000 pada sesi yang
   lebih cepat (530–843 ms). Karena itu ukuran terbesar dinaikkan ke **40000**,
   melewati contoh n (5000/10000/20000) di instruksi. Di kedua sesi, komputasi mode A
   pada n = 40000 ≥ ~1 s (967–2594 ms). Keempat ukuran dibuat kelipatan 2 dari 5000.
5. Di setiap ukuran output identik antar-run dan antar-mode, dan 0 error tercatat.

## 5. Berkas

| Berkas | Isi |
|---|---|
| `template/capture-n12-g2-worker.json` | payload dialog asli (within-only) sebagai template config |
| `pilot-node*.json` | waktu Node per langkah (§1.1) |
| `output-stability-*.json` | uji stabilitas output (§2) |
| `ui/`, `ui-n40000/` | sesi browser pertama (waktu valid; flag identik tidak valid, §2) |
| `ui-final/` + `ui-final.*.log` | sesi browser final (§3) |
| `ui-descriptive/` | tabel Descriptive Statistics per run (bukti artefak judul ganda) |

CSV yang dipakai pilot tidak disimpan. Semuanya bisa dibuat ulang secara
deterministik dengan `experiment/datasets.cjs`.
