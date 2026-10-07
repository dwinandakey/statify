# Panduan menjalankan Statify untuk perbandingan dengan WEKA

Disusun dari `naive-bayes/README_V2.md` dan `apply-model/DOKUMENTASI.md` (jalur **Raw Text**). Belum dicoba lewat antarmuka oleh saya; label menu bisa sedikit berbeda.

## Mengapa alurnya "latih → ekspor model → terapkan ke data uji"
Tab Validation Naive Bayes hanya menyediakan holdout acak atau k-fold pada satu dataset, tidak menerima berkas uji terpisah. Model akhir dilatih pada **seluruh baris valid** dataset yang dibuka. Maka: buka berkas latih, latih, Export Model, buka berkas uji, Apply Model. Dengan begitu pembagian 630/270 (dan dua lainnya) dipakai apa adanya, dan kosakata/IDF/rata-rata norma hanya dihitung dari data latih, sama seperti WEKA (`-b`).

Gunakan **Raw Text Variable**, bukan Word-Vector (jalur Word-Vector menghitung kosakata dari seluruh dokumen, termasuk uji, sehingga tidak sebanding).

## Tabel setelan per konfigurasi (7 model per dataset; K3N dilewati)
Setelan sama untuk semua: Lowercase ON; Stopwords None; Stemming None; Tokenizer Word; Delimiters bawaan `[\s.,;:'"()?!]+`; Formula standard **Weka**; Min term frequency 1; Text Alpha 1; Validation holdout dengan seed 42.

| Konfigurasi | TF | IDF | Normalization | Words to Keep | Text likelihood | Name prefix (Apply Model) |
|---|---|---|---|---|---|---|
| K1 | Word count | None | None | 1000 | Multinomial | K1 |
| K1w | Word count | None | None | 0 | Multinomial | K1w |
| K2 | Presence (0/1) | None | None | 1000 | Bernoulli | K2 |
| K3 | Word count | None | None | 1000 | Complement | K3 |
| K3w | Word count | None | None | 0 | Complement | K3w |
| K5 | log(1 + f) | ln(N / df) | Normalize document length | 1000 | Multinomial | K5 |
| K5w | log(1 + f) | ln(N / df) | Normalize document length | 0 | Multinomial | K5w |

## Langkah per konfigurasi
1. Buka berkas latih (`data\<dataset>_train.csv`). Kolom: pilkada `Id,Sentiment,Pasangan Calon,Text Tweet`; SMS dan SmSA `Id,Label,Text`. Jangan buka-simpan di Excel (merusak encoding).
2. Analyze → Classify → Naive Bayes → Variables: Target = Sentiment/Label; **Raw Text Variable** = Text Tweet/Text. Pastikan tidak ada prediktor lain (Id dan Pasangan Calon tidak boleh ikut; di WEKA hanya teks).
3. Text Preprocessing dan Options: isi sesuai tabel.
4. Validation: Training and Holdout Partition, centang Use random seed = 42. Angka holdout hanya syarat dialog dan tidak dipakai untuk perbandingan.
5. OK. Catat dari output: jumlah term (K1w pilkada harus 3101) dan akurasi holdout (tidak dipakai).
6. Export Model → simpan `statify_models\<dataset>_<K>.json`.
7. Buka berkas uji (`data\<dataset>_test.csv`) sebagai dataset aktif.
8. Analyze → Classify → Apply Model: Model = JSON tadi; Variables: Raw Text Variable → Text Tweet/Text, Actual target = Sentiment/Label; Save: Predicted value ON, Predicted probability for each class ON, **Name prefix = nilai kolom terakhir tabel**; Output: aktifkan metrik evaluasi dan confusion matrix.
9. Catat dari output: Not scored (harus 0), Scored (270 / 1673 / 500), akurasi.
10. Ulangi langkah 1–9 untuk konfigurasi lain. Karena prefix berbeda, semua kolom hasil menumpuk di dataset uji yang sama (untuk membuka dataset latih lagi, simpan dulu hasil ekspor).
11. Setelah ketujuh konfigurasi: File → Export CSV (UTF-8, sertakan `Id`) → `statify_out\statify_pred_<dataset>.csv`.

## Pilot dulu (disarankan)
Jalankan hanya **pilkada K1w**. Saya sudah membuktikan lewat replika Python bahwa Statify seharusnya menghasilkan 0 label berbeda dari WEKA pada K1w, K3w, dan K5w, jadi akurasi uji harus **212/270 (78,52 %)** untuk K1w dan K3w, **200/270 (74,07 %)** untuk K5w. Bila cocok, lanjutkan; bila tidak, berhenti dan kirim ke saya, jangan diperbaiki.

## Yang perlu dipahami
- Probabilitas yang ditulis Statify dibulatkan 4 desimal; selisih terhadap WEKA ≤ 5e-5 itu wajar. Untuk K3 bandingkan label saja (WEKA one-hot).
- Konfigurasi dengan Words to Keep 1000 (K1, K2, K3, K5) **diharapkan berbeda** sedikit dari WEKA karena WEKA menyimpan 1042 / 1130 / 1003 kata (nilai seri), Statify tepat 1000. Itu bukan galat.
- SMS Spam dan SmSA: prior Statify `count/N` vs WEKA Laplace bisa menggeser peluang hingga 4e-4; label diperkirakan tetap sama.
- SmSA (11000 baris, kosakata 17898 pada varian w) bisa berat di browser; kerjakan terakhir. Bila gagal (mis. kehabisan memori), tulis NOT RUN beserta pesan galatnya.
- Bila ada perilaku aneh di Statify, catat (lokasi, langkah, dampak) di `BUGS_WEKA.md`; jangan ubah kode produksi.

## Yang dikirim ke saya
`statify_out\statify_pred_<dataset>.csv` (tiga berkas), ringkasan Case Processing/Evaluation tiap run (salin teks atau tangkapan layar), dan `statify_models\*.json` bila ada. Letakkan di `testing\thesis-eval\weka\` lalu beri tahu saya.
