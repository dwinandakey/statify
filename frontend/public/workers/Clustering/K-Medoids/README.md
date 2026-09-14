# K-Medoids Cluster - Rust-WASM Implementation

Implementasi algoritma K-Medoids clustering menggunakan Rust dan WebAssembly untuk performa optimal.

## Features

### ✅ Implemented Algorithms

1. **PAM (Partitioning Around Medoids)**
   - ✅ Classical K-Medoids algorithm
   - ✅ BUILD phase for optimal initialization
   - ✅ SWAP phase for iterative improvement
   - ⚡ Best quality but slower for large datasets
   - 📊 Time: O(k(n-k)²d × iterations)

2. **CLARA (Clustering LARge Applications)**
   - ✅ Sampling-based approach for large datasets
   - ✅ Multiple sample runs with best result selection
   - ⚡ Much faster than PAM with comparable quality
   - 📊 Time: O(num_samples × sample_size² × k × iterations)

3. **CLARANS (Clustering Large Applications based on RANdomized Search)**
   - ✅ Random search-based algorithm
   - ✅ Efficient neighbor exploration
   - ⚡ Great for spatial data
   - 📊 Time: O(n² × restarts × max_neighbors)

### 🎯 Distance Metrics

- ✅ Euclidean distance
- ✅ Manhattan distance
- ✅ Minkowski distance

### 📊 Evaluation Metrics

- ✅ Silhouette coefficient
- ✅ Total cost/distance
- ✅ Cluster quality metrics

### 🔧 Data Preprocessing

- ✅ Missing value handling (aligned with K-Means style)
- ℹ️ Normalization and outlier filtering are not part of the active K-Medoids preprocessing pipeline

## Prerequisites

1. **Rust** - Install dari [rustup.rs](https://rustup.rs/)
2. **wasm-pack** - Install dengan:
   ```bash
   cargo install wasm-pack
   ```

## Build & Development

### Build WASM Module

```bash
# Build untuk production
wasm-pack build --target web --out-dir pkg

# Build untuk development (tanpa optimasi)
wasm-pack build --target web --out-dir pkg --dev
```

### Run Tests

```bash
# Run semua unit tests (33 tests)
cargo test

# Run dengan output verbose
cargo test -- --nocapture

# Run specific algorithm tests
cargo test test_pam
cargo test test_clara
cargo test test_clarans
```

### Development Workflow

1. Modifikasi kode Rust di folder `src/`
2. Run tests: `cargo test`
3. Build WASM: `wasm-pack build --target web --out-dir pkg`
4. Test di browser: buka `test-algorithms.html`

## Project Structure

```
rust/
├── Cargo.toml          # Project configuration & dependencies
├── src/
│   ├── lib.rs          # Main entry point
│   ├── algorithms/     # Clustering algorithms
│   │   ├── pam.rs      # PAM implementation ✅
│   │   ├── clara.rs    # CLARA implementation ✅
│   │   └── clarans.rs  # CLARANS implementation ✅
│   ├── models/         # Data structures
│   ├── utils/          # Utility functions (distance, validation)
│   ├── stats/          # Statistical calculations
│   ├── wasm/           # WebAssembly interface
│   └── test/           # Unit tests
├── pkg/                # Compiled WASM output (generated)
├── test-algorithms.html # Algorithm comparison test
└── test-debug.html     # Debug test UI
```

## Usage

### JavaScript/TypeScript

```javascript
import init, { run_k_medoids } from "./pkg/wasm.js";

// Initialize WASM
await init();

// Prepare input
const input = {
  data: [
    [1.0, 2.0],
    [1.5, 1.8],
    [5.0, 8.0],
    // ... more data points
  ],
  n_clusters: 3,
  method: "PAM", // or "CLARA", "CLARANS"
  max_iterations: 100,
  distance_metric: "euclidean",
  random_seed: 42, // optional
};

// Run clustering
const result = run_k_medoids(input);

console.log("Medoids:", result.medoids_indices);
console.log("Assignments:", result.cluster_assignments);
console.log("Total cost:", result.total_distance);
```

## Algorithm Comparison

| Algorithm   | Best For               | Speed  | Quality | Memory     |
| ----------- | ---------------------- | ------ | ------- | ---------- |
| **PAM**     | Small datasets (<1000) | Slow   | Highest | O(n²)      |
| **CLARA**   | Large datasets (>1000) | Fast   | Good    | O(sample²) |
| **CLARANS** | Spatial/medium data    | Medium | Good    | O(n²)      |

### When to Use Each Algorithm

#### PAM

- ✅ Dataset < 1000 points
- ✅ Need best quality
- ✅ Computational time not critical
- ❌ Large datasets (too slow)

#### CLARA

- ✅ Large datasets (>1000 points)
- ✅ Need fast results
- ✅ Good quality acceptable
- ❌ Very small datasets (overhead not worth it)

#### CLARANS

- ✅ Medium-sized datasets
- ✅ Spatial data
- ✅ Balance between speed and quality
- ✅ When PAM too slow but CLARA sampling not ideal

## Testing

### Browser Tests

1. Start HTTP server:

```bash
python -m http.server 8080
```

2. Open in browser:

- `http://localhost:8080/test-algorithms.html` - Compare all algorithms
- `http://localhost:8080/test-debug.html` - Detailed debugging

### Unit Tests Results

```
✅ 33 tests passed
  - PAM: 7 tests
  - CLARA: 4 tests
  - CLARANS: 6 tests
  - Utilities: 16 tests
```

## Performance Optimization

- ✅ Distance matrix precomputation
- ✅ Efficient neighbor sampling (CLARANS)
- ✅ Smart sample size calculation (CLARA)
- ✅ Early convergence detection
- 🔄 SIMD operations (future)
- 🔄 Parallel processing with rayon (future)
- Memory-efficient data structures

## Integration dengan Frontend

Setelah build, file WASM akan ter-generate di `pkg/`:

- `wasm.js` - JavaScript glue code
- `wasm_bg.wasm` - Compiled WebAssembly
- `wasm.d.ts` - TypeScript definitions

Import di TypeScript/JavaScript:

```typescript
import init, { run_k_medoids, test_connection } from "./rust/pkg/wasm";

// Initialize WASM module
await init();

// Test connection
console.log(test_connection());

// Run K-Medoids
const result = run_k_medoids({
  data: [
    [1, 2],
    [3, 4],
    [5, 6],
  ],
  n_clusters: 2,
  method: "PAM",
  max_iterations: 100,
  distance_metric: "euclidean",
  random_seed: null,
});
```

## 🚀 Web Worker Support

**NEW**: Clustering dapat berjalan di background thread untuk menghindari UI blocking!

### Quick Start

```typescript
import { analyzeKMedoidsCluster } from "./services/k-medoids-cluster-analysis";

// Run clustering in background thread
await analyzeKMedoidsCluster({
  configData: yourConfig,
  dataVariables: yourData,
  variables: yourVariables,
  useWorker: true, // Enable web worker (default)
  onProgress: (progress) => {
    console.log(`${progress.message} (${progress.progress}%)`);
  },
});
```

### Benefits

- ✅ **UI Responsive** - Interface tidak freeze saat clustering
- ✅ **Progress Updates** - Real-time feedback ke user
- ✅ **Cancellation** - Bisa stop operasi yang sedang berjalan
- ✅ **Better UX** - Especially untuk CLARA/CLARANS dengan dataset besar

### Testing

```bash
# Test web worker implementation
python -m http.server 8000
# Open: http://localhost:8000/test-worker.html
```

Test page features:

- Worker initialization check
- Progress tracking visualization
- Worker vs Direct execution comparison
- Cancellation support
- Multiple algorithm testing

### Documentation

Lihat [WEB_WORKER_GUIDE.md](WEB_WORKER_GUIDE.md) untuk:

- Detailed implementation guide
- Usage examples with React
- Performance comparison
- Troubleshooting tips
- Best practices

### When to Use Worker

| Dataset Size | Algorithm | Recommendation      |
| ------------ | --------- | ------------------- |
| < 100 points | PAM       | Direct (optional)   |
| 100-1000     | PAM/CLARA | Worker recommended  |
| 1000-5000    | CLARA     | Worker **required** |
| 5000+        | CLARA     | Worker **required** |
| Any size     | CLARANS   | Worker recommended  |

**Rule of thumb**: Always use worker for production. Only use direct execution for testing/debugging.

## References

- [PAM Algorithm](https://en.wikipedia.org/wiki/K-medoids)
- [FastPAM Paper](https://arxiv.org/abs/2008.05171)
- [wasm-bindgen Documentation](https://rustwasm.github.io/docs/wasm-bindgen/)
