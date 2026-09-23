# Sel RM dengan dataset *noise*, TANPA pin P-core (2026-09-22 23:23–2026-09-23 00:02 WIB): catatan, bukan hasil final

Hasil final ada di `../experiment-2026-09-23-cpu1-rm-noise-pcore/`. Folder ini disimpan sebagai catatan.

- Kode, build (`MHninJmEe45iPpG1SPYZ3`), protokol, argumen, dan dataset sama dengan run final (md5 di `data-md5.txt`; CSV ada di folder final). Mode daya *Best performance*. **Tanpa** `-Affinity`.
- Kualitas: 248 run, 0 dibuang, semua `ok`, 17 tabel dan 0 pesan Errors Logs, pemeriksaan sebelum OK 248/248 = 0.
- **Episode perlambatan ~1,7–2× yang berselang-seling di kedua mode**:
  - sel 5000 run 3–14;
  - sebagian besar sel 10000;
  - sel 20000 run 3–5, 21, 30–32;
  - hampir seluruh sel 40000 (long task A 1.329–1.844 ms, dibanding ~990 ms dengan pin).

  Mesin tidak menjalankan proses berat lain (beban CPU 1–6% sebelum run). Penyebab yang paling mungkin: thread berpindah antara P-core dan E-core (lihat `core-bench.json` di folder pilot ber-pin). Karena itu keempat sel dijalankan ulang dengan pin P-core.
- Median [IQR] steady-state (ms), `analysis/tables.md`:

  | n | LT A | LT B | Waktu total A | Waktu total B |
  |---|---|---|---|---|
  | 5000 | 129,5 [124,0–140,5] | 0,0 | 239,4 | 240,9 |
  | 10000 | 356,0 [321,5–405,8] | 0,0 | 527,9 | 555,5 |
  | 20000 | 492,5 [477,2–518,0] | 0,0 | 606,2 | 627,5 |
  | 40000 | 1.449,0 [1.379,5–1.492,0] | **111,5** [102,5–125,5] | 1.618,9 | 1.590,5 |

  Pada kondisi terganggu ini, median long task mode B sel 40000 **> 100 ms**.
