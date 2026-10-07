# AGENT_COMMON — aturan bersama semua agen paket evaluasi (BACA DULU)

Sumber tugas: `testing/thesis-eval/PROMPT_Evaluasi_Modul_Text_Analytics.md` (baca bagian Peran, Aturan keras, dan track Anda).
Bahasa dokumen: Indonesia baku-akademik. Kolom tabel HARUS persis seperti di prompt.

## Realitas lingkungan (penting, berbeda dari asumsi prompt)
1. Sandbox cloud (`Bash`) DAN shell lokal (`device_bash`) TIDAK punya akses jaringan ke npm/crates.io/PyPI/GitHub/UCI/HuggingFace. Tidak ada `cargo build/test` yang bisa dijalankan di sini (tidak ada crate). Jadi kode Rust yang Anda tulis TIDAK bisa dikompilasi di sesi ini: tulis sangat hati-hati, baca API yang dipanggil di sumber, tiru gaya tes yang sudah ada, dan jangan memakai crate baru. Tes Rust baru ditaruh sebagai berkas integrasi TERPISAH `tests/thesis_<nama>.rs` supaya kegagalan kompilasi satu berkas tidak merusak berkas lain (skrip menjalankan `cargo test --test thesis_<nama>` satu per satu).
2. Jest BISA dijalankan di shell lokal (`device_bash`, Linux VM, mount repo di `$HOME/mnt/statify64`) lewat `testing/thesis-eval/tools/run_jest_linux.sh` (ts-jest + shim resolver; hasil 111 tes STWV identik dengan log Windows). Ini jalur validasi Anda.
3. Python + scikit-learn 1.9.1 + numpy + pandas + graphviz (`dot`) ada di sandbox cloud (`Bash`). Di VM lokal ada `dot` dan java, tapi TIDAK ada sklearn.
4. Pengguna (Yedija) menjalankan Rust, Jest standar (config produksi, Windows), Playwright, dan WEKA sendiri di Windows lewat skrip PowerShell yang Anda siapkan. Hasil dari perangkat itulah yang akan masuk buku. Sandbox cloud/VM BUKAN perangkat uji skripsi (Lenovo IdeaPad Gaming 3, Ryzen 5 4600H, Windows 11): jangan klaim waktu eksekusi dari sandbox sebagai hasil perangkat itu.

## Dua lokasi kerja
- **Cloud (penulisan)**: `/home/claude/statify64` adalah salinan kerja repo (tanpa node_modules/target). Tulis & edit berkas di sini dengan Write/Edit, path relatif repo SAMA dengan repo asli. Dataset: `/home/claude/statify64/Claude outputs/pilkada_{train,test}.csv` dan `dataset_untuk_text/`.
- **Perangkat (eksekusi Jest & tujuan akhir)**: repo asli di `E:\KULIAH\Skripsi\statify64`, di VM lokal `$HOME/mnt/statify64`.

### Mengirim berkas cloud -> perangkat (3 langkah)
1. `Bash`: `/home/claude/ship.sh <nama-agen-unik> <path-relatif-repo> [<path> ...]` (folder boleh; biner OK).
2. `device_commit_files` dengan `{"stagedPath":"/mnt/user-data/outputs/_ship/<nama>.tgz","devicePath":"E:\\KULIAH\\Skripsi\\statify64\\temp\\_thesis_transfer\\<nama>.tgz"}` dan `force:true`.
3. `device_bash`: `cd $HOME/mnt/statify64 && tar xzf temp/_thesis_transfer/<nama>.tgz --overwrite` (WAJIB `--overwrite`; tar biasa gagal menimpa berkas yang ada karena penghapusan tidak diizinkan).
Tidak ada penghapusan berkas di perangkat; jangan membuat berkas sampah di repo.

### Menjalankan Jest di perangkat (validasi)
`device_bash` dengan `timeout_ms` 178000 (batas keras ~180 dtk per panggilan; proses latar belakang TIDAK bertahan antar panggilan):
```
cd $HOME/mnt/statify64 && timeout 170 testing/thesis-eval/tools/run_jest_linux.sh --runInBand \
  --json --outputFile=testing/thesis-eval/logs/jest_<track>_vm.json <path/berkas.test.ts> 2>&1 | grep -v "^\s*at " | tail -60
```
- Start-up ±45 dtk, jadi 1 panggilan memuat paling banyak 3-4 berkas tes. Hanya satu proses jest berjalan sekali waktu (flock); jika antre lama, ulangi.
- Simpan keluaran teks mentah juga: tambahkan `| tee testing/thesis-eval/logs/jest_<track>_vm.txt`.
- Lingkungan tes jsdom (default config) lambat dimuat; tes logika murni boleh memakai `/** @jest-environment node */` di baris pertama berkas.
- Pesan "Cannot find module X" (paket belum ada di salinan lokal) biasanya tetap berhasil lewat NODE_PATH ke mount; lambat tapi benar.

## Aturan keras (ringkas, lihat prompt)
- JANGAN ubah kode produksi. Hanya tambah berkas tes/skrip/dokumen baru. Bug -> catat di `testing/thesis-eval/BUGS_<track>.md` (lokasi file:baris, langkah reproduksi, dampak, usulan perbaikan); saya yang menggabungkan ke `BUGS.md`.
- JANGAN mengarang angka/status. Status "Lulus"/"Gagal" hanya dari eksekusi nyata yang lognya ada di `testing/thesis-eval/logs/`. Yang belum dijalankan: `BELUM DIJALANKAN` + alasan.
- Seed acak = 42. Toleransi numerik 1e-6 kecuali ditentukan lain.
- Tes TypeScript baru: `.../<menu>/**/__tests__/thesis/*.test.ts(x)`. Tes Rust baru: `<crate>/tests/thesis_*.rs`. Output laporan: `testing/thesis-eval/`.
- Cari kebenaran di KODE SUMBER (pesan, kode galat, rumus), bukan di tabel prompt; bila berbeda, pakai yang di kode dan beri catatan.
- Jangan commit/push git; saya yang mengurus git. Jangan menjalankan `git` di mount.

## Konvensi penanda hasil (agar status bisa diisi otomatis dari log)
Di sel "Hasil"/"Status" tabel Anda, tulis penanda alih-alih mengetik status sendiri bila hasilnya berasal dari tes otomatis:
- Jest:  `⟦jest:<nama berkas tes tanpa path>::<full test name persis seperti di JSON jest>⟧`
- Rust:  `⟦rust:<nama target tes>::<nama fungsi tes>⟧` (mis. `⟦rust:thesis_formulas::tf_binary_pada_korpus_d⟧`; untuk tes unit dalam lib: `⟦rust:lib::<path::modul::nama>⟧`)
Skrip `testing/thesis-eval/tools/apply_results.py` (dari koordinator) mengganti penanda dengan `Lulus`/`Gagal`/`BELUM DIJALANKAN` berdasarkan `logs/jest_*.json` dan `logs/rust_*.txt`. Anda tetap harus menjalankan Jest sendiri dan membaca hasilnya; penanda dipakai supaya angka final bisa diregenerasi setelah pengguna menjalankan semuanya di Windows. Jika Anda ingin menulis hasil Jest langsung dalam teks, tidak apa-apa (setelah dijalankan), tetapi tetap sertakan penandanya di kolom bukti.

## Skrip untuk Windows
Setiap agen menyediakan `testing/thesis-eval/run_<track>.ps1` (dot-source `tools/common.ps1`, gunakan `Invoke-Logged -Name <nama-log> -Command '<cmd>' -WorkDir <dir>`). Log Rust ke `logs/rust_<target>.txt` (nama berkas log memuat nama target agar apply_results bisa memetakan). Jest standar (config produksi): jalankan dari `frontend/` dengan `npx jest <path> --json --outputFile=..\testing\thesis-eval\logs\jest_<track>_win.json`. Skrip harus idempoten dan tidak menghapus apa pun.

## Keluaran akhir Anda (pesan terakhir ke koordinator)
Ringkas (≤ 25 baris): berkas yang dibuat (path), apa yang sudah DIJALANKAN (dengan angka lulus/gagal dan nama log) vs BELUM DIJALANKAN, bug yang ditemukan, asumsi/keputusan yang perlu saya ketahui, dan apa yang harus dijalankan pengguna di Windows.
