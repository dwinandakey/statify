# Eksperimen A/B GLM, CPU 1× (2026-09-22 03:23–06:28 WIB)

Protokol dan skrip ada di [../../experiment](../../experiment) dan [../../README.md](../../README.md).

## Isi folder

| Berkas | Isi |
|---|---|
| `runs.csv` | Satu baris per run (496 run = 8 sel × 62), berisi mode yang dimaksud dan mode aktual, fase (`startup`/`steady`), metrik, serta pemeriksaan keluaran (`data_rows`, `output_tables`, `logged_errors`) |
| `runs-raw.jsonl` | Data mentah per run: semua long task (start, durasi) dan *timestamp* frame rAF di jendela pengukuran, serta judul tabel keluaran |
| `environment-*.json` | Mesin, OS, Node.js, Playwright, Chromium, Next.js, commit git, dan hash isi berkas kode yang diuji |
| `analysis/` | Keluaran `analyze.py`: `tables.md`, `summary.csv`, `tests.csv`, `drift.csv`, `excluded-runs.csv`, `analysis.json` |
| `lt-position.txt`, `lt-phases.txt` | Posisi long task di dalam jendela pengukuran per sel dan mode |
| `data/` | CSV dataset yang diimpor |
| `log.txt`, `pagelog-*.txt`, `server.log`, `detached-status.txt` | Log runner, konsol halaman (hanya error/peringatan), server, dan skrip *detached* |

## Catatan untuk membaca data

- **Drift dalam satu sel.** Setiap analisis membuat aplikasi pindah ke `/dashboard/result` (`ResultNavigationObserver`), dan halaman itu merender semua keluaran yang sudah terkumpul. Akibatnya long task dan waktu total naik seiring nomor run di **kedua** mode (lihat `analysis/drift.csv`).
- **Run startup mode A.** Long Tasks API mencatat long task jauh lebih pendek daripada jeda frame (misalnya MV-2000: 193 ms berbanding 84.263 ms). Pada run steady-state, kedua metrik konsisten.
- **Run yang dibuang: 0.** Mode tidak sesuai: 0. `main-fallback`: 0. Error pada keluaran analisis: 0.
