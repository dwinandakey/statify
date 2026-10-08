# ENV — Lingkungan pengujian

Semua versi di bawah berasal dari perintah/berkas yang benar-benar dibaca; sumbernya ditulis di kolom "Sumber". Yang tidak dapat diverifikasi ditulis apa adanya. Paket evaluasi dijalankan di **tiga lingkungan berbeda**; setiap angka di laporan menyebut lingkungannya.

## 1. Perangkat uji skripsi (Windows) — lingkungan acuan untuk hasil buku

| Butir | Nilai | Sumber |
|---|---|---|
| Perangkat | Lenovo IdeaPad Gaming 3 15ARH05 | diberikan pengguna (prompt) |
| CPU | AMD Ryzen 5 4600H, 6 inti / 12 thread | diberikan pengguna; model CPU juga terlihat dari VM (§3) |
| RAM | 16 GB DDR4 3200 MHz | diberikan pengguna (belum diverifikasi sesi ini) |
| OS | Windows 11 Home 64-bit | diberikan pengguna |
| rustc / cargo | rustc 1.93.0 (254b59607 2026-01-19), host `x86_64-pc-windows-msvc`, toolchain `stable-x86_64-pc-windows-msvc` | berkas `target/.rustc_info.json` hasil build Windows di repo |
| WEKA | 3.9.6, `C:\Program Files\Weka-3-9-6\` (JRE bawaan Zulu 17.0.2) | `testing/text_analytics_eval/weka/00_ENV_dan_pemetaan_opsi.md` (dibaca dari berkas `release` JRE) |
| Peramban terpasang | Google Chrome, Brave (daftar aplikasi komputer) | daftar aplikasi dari pengakses komputer; versi: lihat `logs/env_windows.txt` |
| node, npm, jest, wasm-pack, python, scikit-learn, numpy, pandas, java, graphviz, git, versi peramban | **belum dicatat oleh sesi ini** | dicatat otomatis oleh `run_all.ps1` → `tools/capture_env.ps1` → `logs/env_windows.txt` |

Versi paket Node yang dipakai (dari `node_modules` repo, berlaku di Windows maupun VM): jest 30.0.5, ts-jest 29.4.1, typescript 5.9.2, jest-environment-jsdom 30.0.5, @testing-library/react 16.3.0, react 18.3.1, next 15.5.9, @playwright/test 1.57.0, playwright 1.57.0, fake-indexeddb 6.0.1 (dibaca dari `node_modules/*/package.json`).

## 2. Sandbox cloud (penulisan, scikit-learn, graphviz) — bukan perangkat skripsi

| Butir | Nilai | Sumber |
|---|---|---|
| OS / kernel | Linux 6.18.44-fc-v77 | `uname -sr` |
| CPU / RAM | Intel Xeon @ 2,10 GHz, 2 vCPU; 8 GB | `lscpu`, `free -m` |
| Node.js | v22.22.0 | `node -v` |
| Python | 3.13.16 | `python3 -V` |
| numpy / pandas / scikit-learn / scipy | 2.5.3 / 3.0.5 / **1.9.1** / 1.18.1 | `python3 -c "import …"` |
| matplotlib | 3.11.2 | idem |
| Graphviz `dot` | 2.43.0 | `dot -V` |
| Playwright / Chromium | 1.56.0 (versi yang tercatat saat pengukuran Track E; instalasi global lain di sandbox melaporkan 1.56.1, tidak dipakai pengukuran) / Chromium 141.0.7390.37 (build `chromium-1194`) | `logs/perf_device_info_sandbox.txt` (baris `playwright`), `logs/perf_browser_sandbox.txt` |
| rustc / cargo | 1.97.0 / 1.97.0 (terpasang tetapi **tidak dipakai**: tidak ada crate) | `rustc -V` |

## 3. VM Linux lokal (Jest, Node headless) — berjalan di laptop pengguna, bukan Windows asli

VM ini adalah pembantu eksekusi Linux yang terhubung ke folder repo Windows; hypervisor tercatat "Microsoft" dan model CPU yang terlihat sama dengan laptop pengguna, tetapi hanya 2 vCPU dan ±3,9 GB RAM.

| Butir | Nilai | Sumber |
|---|---|---|
| OS / kernel | Linux 6.8.0-138-generic (Ubuntu 22.04) | `uname -a` |
| CPU / RAM | AMD Ryzen 5 4600H with Radeon Graphics, 2 vCPU, hypervisor Microsoft; 3,9 GB | `lscpu`, `free -m`; `logs/perf_device_info_vm.txt` |
| Node.js / npm | v22.23.2 / 10.9.8 | `node -v`, `npm -v` |
| Python | 3.10.12; numpy 2.2.6; pandas 2.3.3 (tanpa scikit-learn) | `python3 …` |
| Java | OpenJDK 11.0.32.1 (Ubuntu) | `java -version` |
| Graphviz / git | 2.43.0 / 2.34.1 | `dot -V`, `git --version` |
| Jest runner | `testing/text_analytics_eval/tools/run_jest_linux.sh` (ts-jest, `unrs-resolver-shim.js`, salinan lokal `node_modules`) | berkas di repo |

## 4. Penyimpangan lingkungan yang berpengaruh pada hasil

1. **Tidak ada akses jaringan** dari sandbox cloud dan VM ke npm, crates.io, PyPI, GitHub, UCI, HuggingFace (ditolak kebijakan egress: respons `403 host_not_allowed`/gagal resolusi DNS). Akibatnya: `cargo build/test` tidak dapat dijalankan di sesi penulisan; semua tes Rust baru dikompilasi dan dijalankan pertama kali di Windows (lihat `logs/rust_eval_*.txt`); dataset SMS Spam, SmSA, 20 Newsgroups tidak dapat diunduh (lihat `accuracy/datasets/MANIFEST.md` untuk asal berkas yang ada).
2. **Jest di VM memakai `ts-jest`**, bukan transformer SWC dari `next/jest` (biner SWC terpasang hanya `swc-win32-x64-msvc`), dan shim resolver karena biner `unrs-resolver` Linux tidak terpasang. Kesetaraannya diuji: jumlah kasus Jest STWV (111 tes, 9 suite) dan Apply Model (466 tes) di VM sama dengan log Windows. Hasil final untuk buku sebaiknya dari `jest_*_win.json` (config produksi); `apply_results.py` mengutamakan hasil Windows.
3. **Biner WebAssembly** yang dipakai skrip Node/Jest headless adalah `pkg/*.wasm` yang sudah ada di repo (sha256 dicatat di `headless/README.md` dan di tiap log), bukan hasil build baru. Kesesuaiannya dengan sumber Rust terkini diperiksa oleh `eval_compare.rs` (Apply Model), yang lulus di Windows (`logs/rust_eval_compare.txt`).
4. **Waktu eksekusi** yang diukur di sandbox cloud/VM adalah uji asap dan bukan hasil perangkat skripsi (lihat `E_performance.md`).
5. Pemasangan `npm install` di sandbox cloud sempat dicoba dan diblokir (403) untuk paket `eslint-plugin-testing-library`/`@types/node`; salinan kerja cloud tidak dipakai untuk menjalankan Jest. Repo pengguna tidak diubah oleh percobaan itu.
