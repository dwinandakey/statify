### Tabel metrik per konfigurasi dan perangkat — dataset `sms_spam` (n uji = 1673)

| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |
|---|---|---|---|---|
| K1 | Statify | 0,982666 | 0,925682 | 0,962841 |
| K1 | scikit-learn | 0,982666 | 0,925682 | 0,962841 |
| K1 | WEKA | 0,983264 | 0,928379 | 0,964189 |
| K2 | Statify | 0,987448 | 0,944085 | 0,972036 |
| K2 | scikit-learn | 0,987448 | 0,944085 | 0,972036 |
| K2 | WEKA | 0,988643 | 0,949410 | 0,974699 |
| K3 | Statify | 0,967723 | 0,869222 | 0,934556 |
| K3 | scikit-learn | 0,967723 | 0,869222 | 0,934556 |
| K3 | WEKA | 0,967723 | 0,869222 | 0,934556 |
| K4 | Statify | 0,973102 | 0,874300 | 0,937062 |
| K4 | scikit-learn | 0,973102 | 0,874300 | 0,937062 |
| K1w | Statify | 0,984459 | 0,930906 | 0,965446 |
| K1w | scikit-learn | 0,984459 | 0,930906 | 0,965446 |
| K1w | WEKA | 0,984459 | 0,930906 | 0,965446 |
| K3w | Statify | 0,980873 | 0,917529 | 0,958765 |
| K3w | scikit-learn | 0,980873 | 0,917529 | 0,958765 |
| K3w | WEKA | 0,980873 | 0,917529 | 0,958765 |
| K4w | Statify | 0,958757 | 0,795552 | 0,897343 |
| K4w | scikit-learn | 0,958757 | 0,795552 | 0,897343 |

### Tabel kesamaan (Statify terhadap pembanding)

| Konfigurasi | Pembanding | Kelas prediksi sama (x/1673) | Galat absolut maksimum probabilitas | LRE minimum |
|---|---|---|---|---|
| K1 | scikit-learn | 1673/1673 | 5,000e-05 | ≥ 15 (identik)† |
| K1 | WEKA | 1672/1673 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |
| K2 | scikit-learn | 1673/1673 | 4,987e-05 | ≥ 15 (identik)† |
| K2 | WEKA | 1671/1673 | tidak dapat dibandingkan (kosakata berbeda: Statify memotong tepat W=1000, WEKA menyimpan semua kata seri di batas (>1000 kata); lihat varian w) | tidak dapat dibandingkan |
| K3 | scikit-learn | 1673/1673 | 4,999e-05 | ≥ 15 (identik)† |
| K3 | WEKA | 1669/1673 | tidak dapat dibandingkan (ComplementNaiveBayes WEKA mengeluarkan distribusi 0/1 (bukan softmax skor), tidak setara dengan posterior Statify) | tidak dapat dibandingkan |
| K4 | scikit-learn | 1673/1673 | 4,988e-05 | ≥ 15 (identik)† |
| K1w | scikit-learn | 1673/1673 | 4,956e-05 | ≥ 15 (identik)† |
| K1w | WEKA | 1673/1673 | tidak dapat dibandingkan (prior kelas Statify = count/N (tanpa Laplace) vs WEKA (n_c+1)/(N+K); hanya setara pada kelas seimbang) | tidak dapat dibandingkan |
| K3w | scikit-learn | 1673/1673 | 4,987e-05 | ≥ 15 (identik)† |
| K3w | WEKA | 1673/1673 | tidak dapat dibandingkan (ComplementNaiveBayes WEKA mengeluarkan distribusi 0/1 (bukan softmax skor), tidak setara dengan posterior Statify) | tidak dapat dibandingkan |
| K4w | scikit-learn | 1673/1673 | 4,999e-05 | ≥ 15 (identik)† |

† Probabilitas Statify dari Apply Model dibulatkan 4 desimal oleh wasm (round4), sehingga LRE dihitung terhadap round4(c); galat absolut dihitung terhadap c yang tidak dibulatkan (batas teoretis 5,0e-5). Untuk WEKA elemen dengan |c| < 1e-10 tidak diikutkan dalam LRE (WEKA mencetak 16 desimal).

### Matriks konfusi (baris = aktual, kolom = prediksi; urutan kelas: ham, spam)

| Konfigurasi | Perangkat | Matriks |
|---|---|---|
| K1 | Statify | [1433, 16] ; [13, 211] |
| K1 | scikit-learn | [1433, 16] ; [13, 211] |
| K1 | WEKA | [1433, 16] ; [12, 212] |
| K2 | Statify | [1447, 2] ; [19, 205] |
| K2 | scikit-learn | [1447, 2] ; [19, 205] |
| K2 | WEKA | [1448, 1] ; [18, 206] |
| K3 | Statify | [1405, 44] ; [10, 214] |
| K3 | scikit-learn | [1405, 44] ; [10, 214] |
| K3 | WEKA | [1405, 44] ; [10, 214] |
| K4 | Statify | [1447, 2] ; [43, 181] |
| K4 | scikit-learn | [1447, 2] ; [43, 181] |
| K1w | Statify | [1444, 5] ; [21, 203] |
| K1w | scikit-learn | [1444, 5] ; [21, 203] |
| K1w | WEKA | [1444, 5] ; [21, 203] |
| K3w | Statify | [1433, 16] ; [16, 208] |
| K3w | scikit-learn | [1433, 16] ; [16, 208] |
| K3w | WEKA | [1433, 16] ; [16, 208] |
| K4w | Statify | [1449, 0] ; [69, 155] |
| K4w | scikit-learn | [1449, 0] ; [69, 155] |
