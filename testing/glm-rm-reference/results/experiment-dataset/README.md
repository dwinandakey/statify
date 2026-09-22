# Dataset RM eksperimen: varian nonsingular ("noise")

Dataset RM lama (`datasets.cjs` `repeatedMeasuresRows`) memakai 10 + 1,5·l + efek subjek + 0,7·sin(s + l). Variasi within-subject-nya hanya berpangkat 2, sehingga matriks galat kontras singular: Mauchly dan Multivariate Tests tidak bisa dihitung (2 pesan di Errors Logs).

Varian baru `repeatedMeasuresRowsNoise(n, L, M, seed = 20260927)`:
- rumus: y = 10 + 1,5·l + (s mod 50)·0,1 + 3·m + e;
- e ~ N(0, 0,7²) independen per subjek dan sel, dari mulberry32 + Box–Muller dengan seed tetap;
- nilai dibulatkan 6 desimal;
- dipakai lewat `writeDataset(…, { levels, measures, variant: "noise" })` → `repeated-measures-<n>-L<l>-M<m>-noise.csv`, atau runner `--rm-data=noise`.

**Dataset lama dan dataset Multivariate tidak berubah.** md5 hasil `writeDataset` sama dengan data eksperimen kedua: RM 5000 `139f0c0e…`, RM 10000 `0c30fb67…`, Multivariate 500 `4a941b50…`.

## Verifikasi n = 5000 (10 level, 1 measure, DescStats + EstEffectSize + ObsPower, kontras bawaan Polynomial)

| Pemeriksaan | Berkas | Dataset lama | Dataset *noise* |
|---|---|---|---|
| Node (`harness/experiment-dataset-check.mjs`) | `check-old-5000.json`, `check-noise-5000.json` | 2 pesan (Multivariate dan Mauchly singular); Multivariate Tests tidak ada; W = 0 | **0 pesan**; ketujuh tabel hasil terisi; Mauchly W 0,9918, χ² 40,964, df 44, Sig. 0,6025, GG 0,998; Multivariate "time"; kontras Linear … Order 9 |
| UI asli, main vs worker (desain `exp5000n`) | `ui-main-worker.json`, `ui-exp5000n-1-main.json` | 16 tabel dan 2 pesan (Tahap 5) | **17 tabel** (dengan Multivariate Tests), Errors Logs "No errors occurred.", byte-identik di 4 run |
