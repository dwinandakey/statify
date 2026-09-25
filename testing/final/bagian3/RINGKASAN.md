# Bagian 3: regresi pada build final

Build: `BUILD_ID` `LIBUcskLZhw3iEIArOeUX`, kode `73038fb3`. WASM MV `wasm_bg.f735bd9b.wasm` (md5 `03c58af4…`), RM `wasm_bg.2bc2b212.wasm` (md5 `f4c34490…`) (`build-id.txt`). Server `next start -p 3101`. Skrip: `testing/final/harness/regress-final.sh`.

| Pemeriksaan | Hasil | Berkas |
|---|---|---|
| SPSS MV (UI, worker, 23 konfigurasi lama) | 2339/2339 lulus (12 tanpa padanan), regresi 0 terhadap v5 | `compare-spss.txt`, `regress.txt` |
| Main = worker MV | 23 konfigurasi lama + 5 konfigurasi Σ diketahui byte-identik | `regress.txt`, `main-worker-known.txt` |
| Nilai mentah vs v5 | 23/23 konfigurasi (mv1–mv9, mv4ph, konfigurasi v4/v5): payload, respons, dan errors identik byte | `raw-vs-v5.txt` |
| Tabel tampil vs v5 | 23/23 identik | `display-vs-v5.txt` |
| Σ diketahui lewat UI | `known_covariance_test` mvK1–mvK4 = harness yang divalidasi R | `known-vs-r.txt` |
| Uji acuan MV (fixture dari run final) | 2339 lulus, 12 todo; fixture tidak berubah (`git diff` kosong) | `jest-reference.log`, `fixture-diff.txt` |
| Uji acuan RM | 1681 lulus | `rm/rm-reference.log` |
| Jest penuh | 49 suite gagal dari 279 = baseline 49; gagal di luar baseline 0 | `jest-summary.txt` |
| 8 sel eksperimen | Payload identik v1–v5–final (8/8). Final = v5 byte-identik (8/8). v1 vs final: RM identik; MV hanya Sig. dan Observed Power Wilks' Lambda (F1, F1*F3; 10 path, perubahan disengaja v5 B1) | `experiment-output-check.txt`, `experiment-v5-vs-final.txt`, `experiment-response-diff-v1-final.txt` |
| RM main = worker | 9 desain × 4 run byte-identik | `rm/rm-ui-main-worker*.json`, `rm/rm-hash-v5-final.txt` |
| Hash tabel RM vs step20-v5 | 8 dari 9 berbeda; semuanya terjelaskan oleh `944238f0` (titik penutup catatan sebelum catatan kaki berhuruf, dibuat sesudah step20-v5): hash v5 terbentuk kembali setelah titik itu dihapus (9/9) | `rm/rm-hash-v5-final-rekonstruksi.txt`, `testing/final/harness/rm-hash-reconstruct.mjs` |

**Kendala alat uji:** pada eksekusi pertama `regress-final.sh`, langkah 6 (pembandingan sel) dan 7 (RM) gagal karena path berspasi tidak dikutip di argumen skrip (`regress-final.log`). Tangkapan sel sudah selesai. Skrip diperbaiki, lalu langkah pembandingan dan langkah 7 dijalankan ulang secara terpisah dengan hasil di atas.
