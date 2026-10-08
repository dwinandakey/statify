# Formulir hasil Statify (UI) vs WEKA — untuk diisi

Isi hanya sel bertanda `____`. Kolom lain sudah terisi dari hasil yang benar-benar dijalankan: **WEKA** = agen ini (Linux/OpenJDK 11; pilkada sudah dikonfirmasi identik di Windows), **Statify headless** = Track D (`claude/D_accuracy.md`, wasm via Node; bukan saya yang menjalankan). `—` = tidak ada acuan. Angka akurasi koma desimal; hitung akurasi = Benar ÷ Total × 100.

Aturan: bila hasil UI berbeda dari acuan, **jangan diperbaiki**; isi kolom Catatan dan lengkapi bagian E.

## A. Log tiap run Statify di antarmuka (satu baris per dataset × konfigurasi)

Kolom isian: jumlah term (dari output Naive Bayes), Scored dan Not scored (Case Processing Summary Apply Model), Benar (dari Evaluation/Confusion Matrix Apply Model), Akurasi.

### Pilkada (uji 270)

| Konfigurasi | Words to Keep | Term (UI) | Scored | Not scored | Benar (UI) | Akurasi % (UI) | Acuan benar Statify headless | Acuan benar WEKA | Sesuai acuan? (Ya/Tidak) | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|
| K1 | 1000 | ____ | ____ | ____ | ____ | ____ | 206 (76,30 %) | 206 (76,30 %) | ____ | ____ |
| K1w | 0 | ____ | ____ | ____ | ____ | ____ | 212 (78,52 %) | 212 (78,52 %) | ____ | ____ |
| K2 | 1000 | ____ | ____ | ____ | ____ | ____ | 197 (72,96 %) | 200 (74,07 %) | ____ | ____ |
| K3 | 1000 | ____ | ____ | ____ | ____ | ____ | 206 (76,30 %) | 206 (76,30 %) | ____ | ____ |
| K3w | 0 | ____ | ____ | ____ | ____ | ____ | 212 (78,52 %) | 212 (78,52 %) | ____ | ____ |
| K5 | 1000 | ____ | ____ | ____ | ____ | ____ | 204 (75,56 %) | 202 (74,81 %) | ____ | ____ |
| K5w | 0 | ____ | ____ | ____ | ____ | ____ | 200 (74,07 %) | 200 (74,07 %) | ____ | ____ |

### SMS Spam (uji 1673)

| Konfigurasi | Words to Keep | Term (UI) | Scored | Not scored | Benar (UI) | Akurasi % (UI) | Acuan benar Statify headless | Acuan benar WEKA | Sesuai acuan? (Ya/Tidak) | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|
| K1 | 1000 | ____ | ____ | ____ | ____ | ____ | 1644 (98,27 %) | 1645 (98,33 %) | ____ | ____ |
| K1w | 0 | ____ | ____ | ____ | ____ | ____ | 1647 (98,45 %) | 1647 (98,45 %) | ____ | ____ |
| K2 | 1000 | ____ | ____ | ____ | ____ | ____ | 1652 (98,74 %) | 1654 (98,86 %) | ____ | ____ |
| K3 | 1000 | ____ | ____ | ____ | ____ | ____ | 1619 (96,77 %) | 1619 (96,77 %) | ____ | ____ |
| K3w | 0 | ____ | ____ | ____ | ____ | ____ | 1641 (98,09 %) | 1641 (98,09 %) | ____ | ____ |
| K5 | 1000 | ____ | ____ | ____ | ____ | ____ | — | 1630 (97,43 %) | ____ | ____ |
| K5w | 0 | ____ | ____ | ____ | ____ | ____ | — | 1643 (98,21 %) | ____ | ____ |

### SmSA (uji 500)

| Konfigurasi | Words to Keep | Term (UI) | Scored | Not scored | Benar (UI) | Akurasi % (UI) | Acuan benar Statify headless | Acuan benar WEKA | Sesuai acuan? (Ya/Tidak) | Catatan |
|---|---|---|---|---|---|---|---|---|---|---|
| K1 | 1000 | ____ | ____ | ____ | ____ | ____ | 299 (59,80 %) | 300 (60,00 %) | ____ | ____ |
| K1w | 0 | ____ | ____ | ____ | ____ | ____ | 323 (64,60 %) | 323 (64,60 %) | ____ | ____ |
| K2 | 1000 | ____ | ____ | ____ | ____ | ____ | — | 275 (55,00 %) | ____ | ____ |
| K3 | 1000 | ____ | ____ | ____ | ____ | ____ | — | 282 (56,40 %) | ____ | ____ |
| K3w | 0 | ____ | ____ | ____ | ____ | ____ | — | 317 (63,40 %) | ____ | ____ |
| K5 | 1000 | ____ | ____ | ____ | ____ | ____ | — | 302 (60,40 %) | ____ | ____ |
| K5w | 0 | ____ | ____ | ____ | ____ | ____ | — | 327 (65,40 %) | ____ | ____ |

Catatan term: pada varian `w` jumlah term harus sama dengan seluruh kosakata data latih (pilkada 3101, SMS Spam 7568, SmSA 17898). Pada Words to Keep 1000, Statify tepat 1000 term (WEKA menyimpan 1042 / 1130 / 1003).

## B. Perbandingan akhir Statify vs WEKA (format buku; koma desimal)

Isi kolom UI setelah Bagian A selesai. Kolom "Label berbeda" = jumlah dokumen uji dengan label prediksi Statify ≠ WEKA (akan dihitung `compare_statify_weka.py`; boleh diisi sementara dari acuan Track D). Untuk K3 hanya label yang dibandingkan.

| Dataset | Konfigurasi | Akurasi Statify (UI) | Akurasi WEKA | Selisih (poin) | Label berbeda (UI) | Acuan label berbeda (Track D) | Penyebab selisih (isi) |
|---|---|---|---|---|---|---|---|
| Pilkada | K1 | ____ | 76,30 | ____ | ____ | 6 dari 270 | ____ |
| Pilkada | K1w | ____ | 78,52 | ____ | ____ | 0 dari 270 | ____ |
| Pilkada | K2 | ____ | 74,07 | ____ | ____ | 3 dari 270 | ____ |
| Pilkada | K3 | ____ | 76,30 | ____ | ____ | 6 dari 270 | ____ |
| Pilkada | K3w | ____ | 78,52 | ____ | ____ | 0 dari 270 | ____ |
| Pilkada | K5 | ____ | 74,81 | ____ | ____ | 6 dari 270 | ____ |
| Pilkada | K5w | ____ | 74,07 | ____ | ____ | 0 dari 270 | ____ |
| SMS Spam | K1 | ____ | 98,33 | ____ | ____ | 1 dari 1673 | ____ |
| SMS Spam | K1w | ____ | 98,45 | ____ | ____ | 0 dari 1673 | ____ |
| SMS Spam | K2 | ____ | 98,86 | ____ | ____ | 2 dari 1673 | ____ |
| SMS Spam | K3 | ____ | 96,77 | ____ | ____ | 4 dari 1673 | ____ |
| SMS Spam | K3w | ____ | 98,09 | ____ | ____ | 0 dari 1673 | ____ |
| SMS Spam | K5 | ____ | 97,43 | ____ | ____ | — | ____ |
| SMS Spam | K5w | ____ | 98,21 | ____ | ____ | — | ____ |
| SmSA | K1 | ____ | 60,00 | ____ | ____ | 1 dari 500 | ____ |
| SmSA | K1w | ____ | 64,60 | ____ | ____ | 0 dari 500 | ____ |
| SmSA | K2 | ____ | 55,00 | ____ | ____ | — | ____ |
| SmSA | K3 | ____ | 56,40 | ____ | ____ | — | ____ |
| SmSA | K3w | ____ | 63,40 | ____ | ____ | — | ____ |
| SmSA | K5 | ____ | 60,40 | ____ | ____ | — | ____ |
| SmSA | K5w | ____ | 65,40 | ____ | ____ | — | ____ |

Penyebab yang sudah diketahui (pilih salah satu atau tulis lain): (1) Words to Keep 1000: WEKA menyimpan kata seri di batas, Statify memotong tepat; (2) prior Laplace WEKA vs `count/N` Statify (hanya SMS dan SmSA); (3) rata-rata norma K5 bila ada dokumen latih bernorma 0 (SMS: 1); (4) K3: WEKA one-hot, hanya label dibandingkan; (5) pembulatan 4 desimal Apply Model (selisih probabilitas ≤ 5,0e-5). Selisih di luar daftar ini = temuan baru → bagian E.

## C. Pilot (isi lebih dulu): pilkada K1w, K3w, K5w

| Konfigurasi | Benar (UI) | Akurasi % (UI) | Harus | Cocok? |
|---|---|---|---|---|
| K1w | ____ | ____ | 212/270 (78,52 %) | ____ |
| K3w | ____ | ____ | 212/270 (78,52 %) | ____ |
| K5w | ____ | ____ | 200/270 (74,07 %) | ____ |

## D. Reproduksi WEKA di Windows (opsional) untuk SMS Spam dan SmSA

Jalankan blok perintah bagian 7 dengan `sms_spam_*.arff` atau `smsa_*.arff`; ambil jumlah benar dari baris `Correctly Classified Instances` di blok `Error on test data` (bukan blok `training data`).

| Dataset | Konfigurasi | Benar Windows | Benar Linux (acuan) | Sama? |
|---|---|---|---|---|
| SMS Spam | K1 | ____ | 1645/1673 | ____ |
| SMS Spam | K1w | ____ | 1647/1673 | ____ |
| SMS Spam | K2 | ____ | 1654/1673 | ____ |
| SMS Spam | K3 | ____ | 1619/1673 | ____ |
| SMS Spam | K3N | ____ | 1621/1673 | ____ |
| SMS Spam | K3w | ____ | 1641/1673 | ____ |
| SMS Spam | K5 | ____ | 1630/1673 | ____ |
| SMS Spam | K5w | ____ | 1643/1673 | ____ |
| SmSA | K1 | ____ | 300/500 | ____ |
| SmSA | K1w | ____ | 323/500 | ____ |
| SmSA | K2 | ____ | 275/500 | ____ |
| SmSA | K3 | ____ | 282/500 | ____ |
| SmSA | K3N | ____ | 299/500 | ____ |
| SmSA | K3w | ____ | 317/500 | ____ |
| SmSA | K5 | ____ | 302/500 | ____ |
| SmSA | K5w | ____ | 327/500 | ____ |

## E. Catatan perilaku aneh (tidak diperbaiki)

| No | Dataset/konfigurasi | Lokasi (menu/tab/berkas) | Langkah | Yang terjadi | Yang diharapkan | Dampak |
|---|---|---|---|---|---|---|
| 1 | ____ | ____ | ____ | ____ | ____ | ____ |
| 2 | ____ | ____ | ____ | ____ | ____ | ____ |
| 3 | ____ | ____ | ____ | ____ | ____ | ____ |

## F. Berkas yang diserahkan ke saya (centang)

- [ ] statify_out\statify_pred_pilkada.csv
- [ ] statify_out\statify_pred_sms_spam.csv
- [ ] statify_out\statify_pred_smsa.csv
- [ ] Salinan teks Case Processing Summary + Evaluation tiap run
- [ ] statify_models\*.json (opsional)
- [ ] Lisensi SMS Spam (kutipan halaman UCI/readme) dan lisensi SmSA
