# Pilot sel RM dataset *noise* dengan pin P-core (3 run per mode, 2026-09-23 00:04 WIB): acuan pengecekan 30%

Protokol sama dengan run final: `run-detached.ps1 -Affinity FFF` (CPU logis 0–11 = P-core), mode daya *Best performance*, `-Runs 3`. Build `MHninJmEe45iPpG1SPYZ3`.

- `core-bench.json` berasal dari `experiment/cpu-core-bench.ps1`: loop satu thread yang sama, dikunci ke setiap CPU logis, nilai tercepat dari 2 ulangan. CPU 0–11 butuh 1.362,7–1.452,7 ms (P-core), CPU 12–19 butuh 4.068,5–4.159,4 ms (E-core).
- 24 run `ok`, 17 tabel, 0 pesan. Median steady-state (`pilot-medians.json`), long task A: 163,5 / 327,5 / 590,5 / 1.164,5 ms (5000 / 10000 / 20000 / 40000).
- Dataset: `data-md5.txt` (CSV di folder final).
