# Diagnosis lonjakan `mv1-n100000` run 2 (16-10-2026)

Skrip: [../../statify/diagnosis/spike-post.cjs](../../statify/diagnosis/spike-post.cjs). Protokolnya sama dengan `run-e2e.cjs` (konteks baru, impor CSV kode 100.000 baris, hapus-semua hasil sebelum setiap run, dialog Multivariate, OK), dengan build produksi fase 1 dan afinitas `0xFFF`. Kode produksi tidak diubah. Waktu penyelidikan dibatasi ±15 menit.

| Berkas | Isi |
|---|---|
| `spike-post.json` | Dua varian × 3 run: `capture` (payload direkam pada run 1, seperti di studi) dan `nocapture` |
| `threads/spike-post.json` | `nocapture` × 2 run, dengan waktu sibuk per *thread* di semua proses |

Setiap run mencatat *heap* JS (CDP `Performance.getMetrics`), `navigator.storage.estimate()`, dan *trace* Chromium. *Trace* hanya disimpan sebagai ringkasan jendela `post` (balasan worker → `glm-analysis-end`).

## Hasil

| Varian | Run | Tahap `post` (ms) | *Heap* JS (MB) | *Storage* (MB) | GC di jendela (ms) | IndexedDB di main thread (ms) |
|---|---:|---:|---|---|---:|---:|
| capture | 1 | 185 | 172,6 → 77,6 | 16,6 → 16,7 | 56 | 93 |
| capture | **2** | **8.877** | 58,9 → 55,0 | 16,7 → **22,3** | 249 | 522 |
| capture | 3 | 47 | 55,7 → 85,1 | 22,3 → 22,3 | 0 | 47 |
| nocapture | 1 | 131 | 149,3 → 77,2 | 17,2 → 17,3 | 48 | 80 |
| nocapture | **2** | **15.443** | 54,7 → 54,7 | 17,3 → **24,5** | 361 | 542 |
| nocapture | 3 | 45 | 54,5 → 82,2 | 24,5 → 24,5 | 0 | 43 |
| nocapture (threads) | **2** | **15.674** | – | 17,2 → **30,7** | 252 | 519 |

Pada run `threads` 2, waktu sibuk semua *thread* yang terekam selama jendela 15,7 dtk adalah: *renderer* main 2,3 dtk, *compositor* 0,4 dtk, GPU Viz 0,4 dtk, dan *worker* 0,02 dtk. Aktivitas LevelDB/IndexedDB di proses browser tidak tampak.

## Kesimpulan

**Penyebab tidak dapat dipastikan.** Yang bisa dinyatakan:
- Lonjakan terjadi di run 2 pada keempat percobaan: pilot, run utama, dan dua varian diagnosis. Run 1 dan run 3 normal.
- Lonjakan tidak bergantung pada perekaman payload.
- GC (≤ 0,36 dtk) dan tekanan memori (*heap* JS tidak naik) tidak menjelaskan 9–16 dtk.
- *Storage* IndexedDB hanya bertambah 5,6–13,5 MB pada run 2. Run 2 adalah run pertama setelah "hapus semua hasil" yang benar-benar menghapus data.
- Selama jendela itu hampir tidak ada *thread* yang bekerja, jadi aplikasi sedang menunggu operasi asinkron (kemungkinan I/O IndexedDB yang tidak terekam di *trace*, atau *timer*), bukan menghitung.

Dugaan, belum diuji: penulisan hasil run 2 tertahan oleh pemeliharaan basis data IndexedDB (berisi 100.000 baris data) setelah penghapusan pertama. Run tersebut tetap dimasukkan ke dalam statistik.
