# K-Medoids Cluster

Implementasi K-Medoids clustering menggunakan Rust/WASM dengan dukungan tiga algoritma (PAM, CLARA, CLARANS), pemilihan k otomatis, web worker, dan visualisasi output komprehensif.

---

## Struktur Folder

```
k-medoids-cluster/
├── dialogs/
│   ├── k-medoids-cluster-main.tsx   # Entry point modal
│   ├── dialog.tsx                    # Dialog utama (variable manager)
│   ├── iterate.tsx                   # Konfigurasi iterasi & distance metric
│   ├── save.tsx                      # Konfigurasi output yang disimpan
│   └── options.tsx                   # Opsi statistik dan plot
├── components/                       # Komponen output visualisasi
│   ├── OutputRenderer.tsx            # Main renderer
│   ├── SummaryCards.tsx
│   ├── ClusterProfiles.tsx
│   ├── DistanceMatrix.tsx
│   ├── ChartFormatters.tsx
│   └── ...
├── services/
│   ├── k-medoids-cluster-analysis.ts           # Main analysis service
│   ├── k-medoids-cluster-comprehensive-output.ts
│   └── cluster-worker.ts             # Web Worker implementation
├── types/
│   ├── k-medoids-cluster.ts
│   ├── output.ts
│   └── worker.ts
├── constants/
│   └── k-medoids-cluster-default.ts
└── rust/                             # Rust/WASM module
    ├── src/
    │   ├── algorithms/
    │   │   ├── pam.rs
    │   │   ├── clara.rs
    │   │   └── clarans.rs
    │   ├── models/
    │   ├── utils/          # distance, validation
    │   ├── stats/          # silhouette, preprocessing
    │   └── wasm/           # WebAssembly interface
    └── pkg/                # Compiled WASM output (generated)
```

---

## Algoritma

### PAM (Partitioning Around Medoids)

Algoritma klasik K-Medoids dengan dua fase:

- **BUILD Phase**: Pemilihan initial medoids secara greedy — O(k × n² × d)
- **SWAP Phase**: Iterative improvement dengan swap medoid — O(k(n-k)² × d × iter)

**Cocok untuk**: dataset < 5.000 titik, kualitas terbaik.

### CLARA (Clustering LARge Applications)

Pendekatan sampling untuk dataset besar:

1. Ambil beberapa random sample dari dataset
2. Jalankan PAM pada setiap sample
3. Evaluasi pada dataset penuh, pilih hasil terbaik

**Config default**: `num_samples=5`, `sample_size=40+2k`  
**Cocok untuk**: dataset > 1.000 titik, kecepatan lebih penting.

### CLARANS (Clustering Large Applications based on RANdomized Search)

Pencarian acak di ruang tetangga:

1. Mulai dengan medoids acak
2. Cek tetangga secara random, pindah jika ada perbaikan
3. Ulangi dengan beberapa local restart

**Config default**: `num_local=2`, `max_neighbors=max(250, 1.25% total neighbors)`  
**Cocok untuk**: data spasial, dataset menengah, keseimbangan kecepatan-kualitas.

### Perbandingan Algoritma

| Algoritma   | Dataset ideal      | Kecepatan | Kualitas | Memori     |
|-------------|-------------------|-----------|----------|------------|
| **PAM**     | < 1.000 titik     | Lambat    | Terbaik  | O(n²)      |
| **CLARA**   | > 1.000 titik     | Cepat     | Baik     | O(sample²) |
| **CLARANS** | 100–10.000 titik  | Sedang    | Baik     | O(n²)      |

---

## Distance Metrics

- **Euclidean**: √Σ(xi - yi)²
- **Manhattan**: Σ|xi - yi|
- **Minkowski**: (Σ|xi - yi|^p)^(1/p)

---

## Preprocessing

Pipeline preprocessing aktif hanya menangani **missing values** (konsisten dengan K-Means):

```rust
pub enum MissingValueStrategy {
    RemoveRow,
    ReplaceWithMean,
    ReplaceWithMedian,
    ReplaceWithConstant(f64),
    KeepAsIs,
}
```

Normalisasi dan outlier filtering **tidak** termasuk dalam pipeline aktif.

---

## Pemilihan K Otomatis

Mendukung dua metode evaluasi untuk menemukan k optimal dalam rentang [kMin, kMax]:

### Silhouette Score

```
s(i) = (b(i) - a(i)) / max(a(i), b(i))
```

- `a(i)`: rata-rata jarak ke sesama anggota cluster
- `b(i)`: rata-rata jarak ke cluster terdekat yang berbeda
- Range -1 (terburuk) hingga +1 (terbaik). **Higher is better.**
- Optimal k = k dengan silhouette score tertinggi
- Kompleksitas: O(n²) per k

### Elbow Method

- Hitung WCSS (Within-Cluster Sum of Squares) untuk tiap k
- Deteksi titik "siku" menggunakan second derivative approximation
- Kompleksitas: O(n) per k

### Interpretasi Silhouette Score

| Score     | Interpretasi                                    |
|-----------|-------------------------------------------------|
| 0.7 – 1.0 | Struktur cluster sangat kuat                    |
| 0.5 – 0.7 | Struktur cluster kuat                           |
| 0.3 – 0.5 | Struktur cluster moderat (pertimbangkan k lain) |
| < 0.3     | Struktur cluster lemah                          |

---

## Web Worker

Clustering dijalankan di background thread untuk menghindari UI freeze.

```typescript
import { analyzeKMedoidsCluster } from "./services/k-medoids-cluster-analysis";

await analyzeKMedoidsCluster({
  configData: yourConfig,
  dataVariables: yourData,
  variables: yourVariables,
  useWorker: true, // default
  onProgress: (progress) => {
    console.log(`${progress.message} (${progress.progress}%)`);
  },
});
```

> **Catatan**: Web Workers saat ini di-fallback ke main thread di Next.js. UI mungkin freeze singkat (1–5 detik) untuk dataset besar.

### Rekomendasi Worker

| Dataset    | Algoritma  | Rekomendasi           |
|------------|------------|-----------------------|
| < 100      | PAM        | Direct (opsional)     |
| 100–1.000  | PAM/CLARA  | Worker recommended    |
| 1.000–5.000| CLARA      | Worker **required**   |
| 5.000+     | CLARA      | Worker **required**   |

---

## Performance Optimization

Untuk menghindari UI freeze saat generate output:

- **Async silhouette chunking**: Kalkulasi dibagi per 50 objek, yield ke browser antar chunk
- **Background output generation**: `setTimeout(..., 100)` setelah clustering selesai, UI update segera
- **Single output call**: Hanya `generateComprehensiveKMedoidsOutput()`, tidak ada duplikasi

### Alur Analisis

```
User klik OK
  → Web Worker mulai (clustering di background thread)
  → Clustering selesai → UI update SEGERA (dialog tutup, toast)
  → 100ms delay → Generate comprehensive output (background)
  → Silhouette calculation async (chunked, non-blocking)
  → Output tersimpan → Muncul di sidebar hasil
```

---

## Build & Development

### Prerequisites

- [Rust](https://rustup.rs/)
- wasm-pack: `cargo install wasm-pack`

### Build WASM

```bash
cd rust
wasm-pack build --target web --out-dir pkg
```

### Run Tests

```bash
cargo test           # 33 tests
cargo test -- --nocapture
```

### Browser Testing

```bash
python -m http.server 8080
# http://localhost:8080/test-algorithms.html   (algorithm comparison)
# http://localhost:8080/test-worker.html       (web worker test)
```

---

## Integrasi Frontend

### TypeScript Usage

```typescript
import init, { run_k_medoids } from "./rust/pkg/wasm";

await init();

const result = run_k_medoids({
  data: [[1, 2], [3, 4], [5, 6]],
  n_clusters: 2,
  method: "PAM", // "CLARA" | "CLARANS"
  max_iterations: 100,
  distance_metric: "euclidean",
  random_seed: null,
});
```

### Output WASM

```typescript
{
  cluster_assignments: number[],
  medoids_indices: number[],
  medoids: number[][],
  distances_to_medoids: number[],
  total_distance: number,
  iterations: number,
  converged: boolean,
}
```

### Struktur JSON Tersimpan

```json
{
  "type": "k-medoids-comprehensive",
  "data": {
    "summary": { "numClusters": 3, "totalCost": 125.45, "averageSilhouetteScore": 0.67, "converged": true, "iterations": 5 },
    "assignments": [ { "objectId": 1, "clusterId": 0, "distanceToMedoid": 12.34, "silhouetteScore": 0.72 } ],
    "medoids": [ { "clusterId": 0, "medoidId": 5, "attributes": {} } ],
    "clusterProfiles": [ { "clusterId": 0, "size": 45, "silhouetteScore": 0.68 } ],
    "iterationHistory": [ { "iteration": 1, "totalCost": 200.0 } ],
    "elbowData": [ { "k": 2, "cost": 250.0 } ],
    "medoidDistanceMatrix": { "distances": [[0, 45.2], [45.2, 0]] },
    "silhouetteScores": { "overall": 0.67, "perCluster": [], "perObject": [] }
  }
}
```

### Komponen Output

```tsx
import { KMedoidsSummaryCards } from "./components/SummaryCards";
import { ClusterProfilesComponent } from "./components/ClusterProfiles";
import { DistanceMatrixHeatmap } from "./components/DistanceMatrix";

<KMedoidsSummaryCards summary={output.summary} />
<ClusterProfilesComponent profiles={output.clusterProfiles} variables={variables} />
<DistanceMatrixHeatmap matrix={output.medoidDistanceMatrix} />
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| UI freeze saat output generation | Pastikan `generateComprehensiveKMedoidsOutput` dipanggil via `setTimeout`, bukan `await` langsung |
| Silhouette scores semua 0 | Cek WASM export silhouette_scores; fallback TS calculation harus aktif |
| Worker tidak inisialisasi | Cek path WASM, MIME type, CORS di console browser |
| CLARA lebih lambat dari ekspektasi | Naikkan `sample_size` atau kurangi `num_samples` |
| CLARANS tidak menemukan cluster baik | Naikkan `num_local` atau `max_neighbors` |
| Hasil tidak converge | Naikkan `max_iterations`, cek data quality (NaN/Inf) |
| Out of memory | Gunakan CLARA dengan `sample_size` lebih kecil |

---

## Related Files

- Modal Registry: `components/Modals/Analyze/Classify/ClassifyRegistry.tsx`
- Result Output: `components/Output/ResultOutput.tsx`
- IndexedDB Types: `hooks/useIndexedDB.ts` (`AnalysisType: "KMedoidsCluster"`)

---

## References

1. Kaufman & Rousseeuw (1990) — *Finding Groups in Data: An Introduction to Cluster Analysis* (PAM & CLARA)
2. Ng & Han (1994) — *Efficient and Effective Clustering Methods for Spatial Data Mining* (CLARANS)
3. Schubert & Rousseeuw (2019) — *Faster k-Medoids Clustering: Improving the PAM, CLARA, and CLARANS Algorithms*
4. Rousseeuw (1987) — *Silhouettes: A graphical aid to the interpretation and validation of cluster analysis*
