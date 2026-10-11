# Eksperimen kedua, sel Repeated Measures 20000 dan 40000 dijalankan ulang lagi (2026-09-22 18:25–18:45 WIB)

Kedua sel ini dijalankan ulang karena sel yang sama di `../experiment-2026-09-22-cpu1-clean-rm-rerun/` terkena episode perlambatan mesin (semua run, mode A dan B, sekitar 2× lebih lambat selama beberapa menit). Folder itu tidak diubah.

Kode, build (`gitHead` `5fc6dc2c`, `BUILD_ID` `RrP5IPwIQNPBSbRur3Hj6`), protokol, dan argumen sama dengan folder itu, kecuali `--sizes-repeated-measures=20000,40000`. Dataset byte-identik dengan eksperimen kedua (`data-md5.txt`).

## Kualitas data

- **Run: 124** (2 sel × 62). **Dibuang: 0.** Status `ok` di semua run. Mode tidak sesuai: 0.
- Pemeriksaan sebelum OK: 124/124 run tercatat 0 (`analysis/clean-check.csv`). `clean_method`: `button` 122, `none` 2.
- Keluaran: 16 tabel dan 2 pesan Errors Logs (matriks galat singular: Multivariate Tests dan Mauchly) di semua run. Penjelasannya ada di README folder `-rm-rerun`.
- **Tidak ada episode perlambatan.** Waktu total steady-state: 539–1.072 ms (sel 20000, 1 run > 1,5× median) dan 966–1.205 ms (sel 40000, tidak ada). *Drift* kecil (`analysis/tables.md`).

## Ringkasan (median [IQR], steady-state, n = 30 per mode)

Kolom "Berpengaruh?" dan "Tujuan 2 tercapai?" tidak diisi.

| n | Long task terpanjang A (ms) | B (ms) | Waktu total A (ms) | B (ms) | p satu arah (LT) | Â₁₂ |
|---|---|---|---|---|---|---|
| 20000 | 460,0 [458,2–465,0] | 0,0 [0,0–0,0] | 574,8 [562,8–578,5] | 577,2 [571,6–592,5] | 1,2·10⁻¹² | 1,000 |
| 40000 | 893,0 [886,5–901,0] | 82,0 [80,0–85,0] | 995,3 [993,4–1.008,5] | 1.055,3 [1.042,0–1.060,4] | 1,5·10⁻¹¹ | 1,000 |

LoAF mode B pada 40000 (median 83,2 ms, maks 108,1 ms): semua 30 run teratribusi ke `IDBRequest.onsuccess` (`event-listener`) di chunk dashboard bersama (`9919.*.js`), sama dengan eksperimen kedua. Tidak ada yang teratribusi ke chunk glue WASM atau service GLM.
