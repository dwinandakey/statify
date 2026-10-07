# AUDIT_DOCS — audit dokumen paket evaluasi

Lingkup: 01_baseline, ENV, A_unit, B_whitebox, C_blackbox_C1/C2/C3, C_manual_checklist_C*, D_accuracy, E_performance, F_integration, F_manual_checklist, BUGS_A..F.
Aturan: `AGENT_COMMON.md` dan `PROMPT_Evaluasi_Modul_Text_Analytics.md`. Kode produksi dan tes tidak diubah; tidak ada git; tidak ada berkas dihapus.
Hasil `python3 testing/thesis-eval/tools/apply_results.py --check` (hanya `--check`), setelah semua perbaikan: Jest 453 tes dikenali, Rust 0 tes (belum pernah dikompilasi), total penanda BELUM DIJALANKAN = 136 (semua Rust), Lulus = 453 (semua Jest, [VM]). Tidak ada penanda rusak (`⟦` tanpa `⟧`) dan tidak ada nama berkas/tes Jest yang hilang dari log. Ke-136 penanda Rust cocok dengan nama `fn` di sumber.

## Temuan dan tindakan

| Dokumen | Temuan | Tindakan |
|---|---|---|
| `tools/apply_results.py` | Regex penanda menolak `<` dan `>` pada nama tes (mis. `->`), sehingga lebih dari 100 penanda tidak dikenali. Lulus hanya 253 dari 453. | Regex `_M` dan `MARK` diperbaiki. Hasil `--check` kini 453 Lulus. Salinan asli ada di scratchpad (`apply_results.orig.py`). |
| `A_unit.md`, `unit/A_unit.template.md` | (a) Baris baseline §6 untuk tes Rust lama "BELUM DIJALANKAN", padahal log Windows ada (`logs/unit_*.txt`: 91/91/0, 203/203/0, 156/156/0). (b) Klaim harness `k1_*` dan ukuran fold seolah dieksekusi, tanpa log. (c) Kalimat `rustfmt` terbaca seperti kompilasi. | (a) Diganti angka Windows berlabel [Win]. (b) Ditulis ulang: tidak dieksekusi di jalur terdokumentasi, tidak dihitung. (c) Dinyatakan hanya parse sintaks (`logs/audit_rustfmt_syntax_cloud.txt`), bukan kompilasi. Label [VM]/[Win] dipertegas. `A_unit.md` diregenerasi lewat `unit/build_A_unit.py` dan sama dengan keluaran generator (Jest 105, Rust 66). |
| `B_whitebox.md`, `tools/wb_doc.py` | Sel "Kasus lulus" di Rekap tanpa label lingkungan. | Tiap sel diakhiri " [VM]" di dokumen dan di generator. |
| `C_blackbox_C1.md`, `C_blackbox_C3.md` | Teks prosa baris 7 memuat contoh penanda `⟦jest:...⟧`/`⟦rust:...⟧` yang bisa disalahganti oleh apply. | Diganti ke placeholder `⟦jest:<berkas>::<nama tes>⟧` dan `⟦rust:<target>::<fungsi>⟧`. |
| `C_blackbox_C2.md` | (a) 8 kasus Jest tanpa penanda (1 di BB-18, 7 di BB-21). (b) Catatan bug C2-04 dan C2-05 tidak ada di dokumen padahal ada di `BUGS_C2.md`. (c) Baris status Rust dan butir keterbatasan menyebut tes Rust "lulus" lewat `rustc`. | (a) Penanda ditambahkan; semua 453 tes Jest kini bermarka tepat sekali. (b) C2-04 dan C2-05 ditambahkan. (c) Ditulis ulang: Rust BELUM DIJALANKAN; harness `rustc` tidak punya log dan tidak dipakai sebagai bukti. |
| `BUGS_C2.md` | Baris "Batas lingkungan" mengklaim tes Rust lulus via `rustc`. | Ditulis ulang tanpa klaim lulus. |
| `BUGS_A.md` | Paragraf kepala dan keyakinan A-1/A-2/A-3 bersandar pada harness `rustc` yang tidak punya log (juga tidak konsisten: 18 vs 15 tes). | Ditulis ulang: status Rust BELUM DIJALANKAN; keyakinan "analisis kode, menunggu `cargo test`". |
| `F_integration.md` | (a) Tanda `\|acuan - keluaran\|` di IT-03 K1..K5 memecah sel (baris 7 sel, bukan 6). (b) Bukti IT-01a tanpa penanda provenans. | (a) Pipa di-escape; tiap baris 6 sel. (b) Penanda IT-01-a ditambahkan. ID IT-01..05 konsisten dengan prompt. |
| `D_accuracy.md` | (a) Klaim identik cloud vs VM tanpa log. (b) §9: penanda tidak berada di kolom Status. (c) Catatan WEKA Windows tidak terhubung ke sumbernya. | (a) Dirujuk ke `logs/audit_rerun_trackD_cloud.txt` (prediksi dan berkas sklearn identik byte). (b) Penanda dipindah ke kolom Status (jest x3, rust x1). (c) Keterbatasan 7: sumber `weka/00_ENV_dan_pemetaan_opsi.md` §8.4, tidak diverifikasi dari cloud. |
| `ENV.md` | Playwright tertulis versi lain dari yang dipakai pada log Track E. | Diubah ke 1.56.0 (sesuai log Track E; instal 1.56.1 tidak dipakai). Versi sisi Windows (rustc 1.93.0, node_modules, git HEAD) tidak bisa diverifikasi dari cloud. |
| `01_baseline.md` | Diperiksa: angka cocok dengan log Windows dan hitungan statis (core 91, NB src 203, AM src 117 + text_scoring 39). | Tidak ada perubahan. |
| `E_performance.md` | Diperiksa: tabel sama dengan keluaran `perf/aggregate_perf.py`; tabel perangkat skripsi BELUM DIJALANKAN (tidak ada data perangkat). Tidak ada klaim waktu sandbox sebagai perangkat skripsi. | Tidak ada perubahan. |
| `BUGS_D/E/F`, `F_manual_checklist`, `C_manual_checklist_C*` | Diperiksa: nama bug, ID, dan kode galat konsisten dengan dokumen dan sumber. Panic E-01 diverifikasi ulang: 34 panic, 483 karakter non-ASCII (`logs/audit_e01_panic_scan_cloud.txt`). | Tidak ada perubahan. |
| Lintas dokumen | Jumlah tes per track, BB-01..36, IT-01..05, nama bug A-1, C2-01.., D-01, E-01, F-01 sudah konsisten setelah perbaikan di atas. | Tidak ada tindakan tambahan. |

## Log audit baru (`logs/`)
`audit_rerun_trackD_cloud.txt`, `audit_e01_panic_scan_cloud.txt`, `audit_rustfmt_syntax_cloud.txt`.

## Belum terselesaikan atau tidak dapat diverifikasi
1. `logs/jest_final_*_vm.json` TIDAK ada. Angka 1.322 tes / 77 suite / 0 gagal konsisten secara aritmetika (869 + 453; 50 + 27 suite) tetapi tidak ada dokumen yang mengklaimnya dan tidak ada log untuk dirujuk. Jangan dikutip di skripsi sebelum berkasnya ada.
2. Komentar di berkas tes Rust (`thesis_partition.rs`: "15 dari 15 tes lulus"; `thesis_blackbox_nb.rs`) masih memuat klaim lulus dari harness `rustc` tanpa log. Berkas tes tidak boleh diubah oleh auditor. Pemilik tes sebaiknya menghapus atau mengubah komentar itu. Semua dokumen sudah tidak mengutipnya.
3. Seluruh tes Rust Track A/B/C/D/F (136 penanda) BELUM DIJALANKAN; tidak boleh ditulis "lulus" sampai `cargo test` di Windows menghasilkan `logs/rust_*.txt`.
4. `templates/` kosong. Template dibuat saat apply pertama; bila `templates/<nama>.md` sudah ada nanti, dokumen aktif harus diregenerasi/disamakan agar tidak menimpa perbaikan ini.
5. Hasil Windows (versi rustc, node_modules, git HEAD) dan log WEKA Windows tidak dapat diperiksa dari cloud.
6. Selama audit ada penyuntingan paralel oleh pihak lain (`AGENT_COMMON.md`, `BUGS_A.md`, `BUGS_C2.md`, `thesis_partition.rs`; jumlah tes 15 menjadi 18, Rust Track A = 66). Perbaikan dilakukan dengan penggantian terarah; periksa ulang dengan `--check` setelah penggabungan.
