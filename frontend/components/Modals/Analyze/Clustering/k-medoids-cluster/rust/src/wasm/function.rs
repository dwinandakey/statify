use wasm_bindgen::prelude::*;
use js_sys::{Float64Array, Uint32Array, Object, Reflect};
use serde_wasm_bindgen::{from_value, to_value};
use web_sys::console;

use crate::algorithms::pam::{run_pam, PAMConfig, run_pam_range, run_pam_with_progress};
use crate::algorithms::clara::{run_clara, CLARAConfig};
use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
use crate::models::{
    KMedoidsInput, KMedoidsOutput, KMedoidsRangeInput, KMedoidsRangeItem,
    StandardizeInput, StandardizeOutput, WcssInput, WcssOutput,
};
use crate::stats::normalization::{normalize_data, NormalizationMethod};
use crate::utils::distance::DistanceMetric;
use crate::utils::validation::validate_input;

#[cfg(feature = "threading")]
pub use wasm_bindgen_rayon::init_thread_pool;

/// Menginisialisasi panic hook agar pesan error di WASM lebih jelas.
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    console::log_1(&"K-Medoids WASM module v1.0.1 initialized with panic hook".into());
}

#[wasm_bindgen]
pub fn run_k_medoids(input_value: JsValue) -> Result<JsValue, JsValue> {
    console::log_1(&"Starting K-Medoids clustering...".into());

    let input: KMedoidsInput = from_value(input_value)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse input: {:?}", e)))?;

    validate_input(&input)
        .map_err(|e| JsValue::from_str(&e))?;

    console::log_1(&format!("[run_k_medoids] k-pipeline: n_clusters={} n={} method={}",
        input.n_clusters, input.data.len(), input.method).into());
    console::log_1(&format!("Processing {} data points with {} clusters (method: {})", 
        input.data.len(), input.n_clusters, input.method).into());

    let metric = parse_distance_metric(&input.distance_metric)
        .map_err(|e| JsValue::from_str(&e))?;

    console::log_1(&format!("[run_k_medoids] Calling method: {}", input.method).into());
    let output = match input.method.to_lowercase().as_str() {
        "pam" => run_pam_clustering(&input, metric)?,
        "clara" => run_clara_clustering(&input, metric)?,
        "clarans" => run_clarans_clustering(&input, metric)?,
        _ => return Err(JsValue::from_str(&format!(
            "Unknown method: {}. Supported: PAM, CLARA, CLARANS", input.method
        ))),
    };
    console::log_1(&"[run_k_medoids] Clustering successful".into());

    console::log_1(&format!("Clustering complete! Iterations: {}, Converged: {}",
        output.iterations, output.converged).into());

    to_value(&output)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize output: {:?}", e)))
}

fn parse_distance_metric(metric: &str) -> Result<DistanceMetric, String> {
    match metric.to_lowercase().as_str() {
        "euclidean" => Ok(DistanceMetric::Euclidean),
        "manhattan" => Ok(DistanceMetric::Manhattan),
        _ => Err(format!("Unknown distance metric: {}", metric)),
    }
}

fn run_pam_clustering(
    input: &KMedoidsInput,
    metric: DistanceMetric,
) -> Result<KMedoidsOutput, JsValue> {
    const PAM_HARD_MAX_N: usize = 10_000;
    if input.data.len() > PAM_HARD_MAX_N {
        return Err(JsValue::from_str(&format!(
            "PAM requires an O(n^2) distance matrix ({} rows x {} rows x 8 B = {:.0} MB). \
             Switch to CLARA for datasets larger than {} rows.",
            input.data.len(), input.data.len(),
            (input.data.len() as f64).powi(2) * 8.0 / 1_048_576.0,
            PAM_HARD_MAX_N,
        )));
    }

    let config = PAMConfig {
        k: input.n_clusters,
        metric,
        max_iterations: input.max_iterations,
        random_seed: input.random_seed,
        use_build_phase: input.use_build_phase.unwrap_or(true),
        // Jika convergence_tolerance dibiarkan 0.0 (default), pakai konvergensi
        // eksak (epsilon = 0.0) agar sama dengan perilaku pam() di R.
        // Toleransi positif dari pengguna diteruskan apa adanya.
        epsilon: if input.convergence_tolerance > 0.0 {
            input.convergence_tolerance
        } else {
            0.0
        },
        n_init: input.n_init,
        use_r_implementation: input.use_r_implementation.unwrap_or(true),
    };

    console::log_1(&"[run_pam_clustering] Starting PAM...".into());
    let result = run_pam(&input.data, &config)
        .map_err(|e| JsValue::from_str(&e))?;
    console::log_1(&"[run_pam_clustering] PAM finished".into());

    let medoids: Vec<Vec<f64>> = result.medoids.iter()
        .map(|&idx| input.data[idx].clone())
        .collect();

    // Jarak sudah dihitung di dalam PAMResult dari distance matrix, jadi
    // tidak perlu dihitung ulang dari data mentah.
    let distances_to_medoids = result.distances_to_medoids;

    Ok(KMedoidsOutput {
        cluster_assignments: result.assignments,
        medoids_indices: result.medoids,
        medoids,
        distances_to_medoids,
        total_distance: result.total_cost,
        avg_cost: if input.data.is_empty() {
            0.0
        } else {
            result.total_cost / input.data.len() as f64
        },
        total_cost_build: result.total_cost_build,
        total_cost_swap: result.total_cost_swap,
        iterations: result.iterations,
        converged: result.converged,
        cost_history: result.cost_history,
        silhouette_scores: result.silhouette_scores,
        medoid_history: result.medoid_history,
        sample_costs: vec![],
        sample_pam_iterations: vec![],
        clara_best_sample_index: 0,
    })
}

fn run_clara_clustering(
    input: &KMedoidsInput,
    metric: DistanceMetric,
) -> Result<KMedoidsOutput, JsValue> {
    let sample_size = input
        .clara_sample_size
        .unwrap_or(40 + 2 * input.n_clusters)
        .min(input.data.len());
    let config = CLARAConfig {
        k: input.n_clusters,
        metric,
        num_samples: input.clara_num_samples,
        sample_size,
        max_iterations: input.max_iterations,
        random_seed: input.random_seed,
        use_build_phase: true,
    };

    console::log_1(&"[run_clara_clustering] Starting CLARA...".into());
    let result = run_clara(&input.data, &config)
        .map_err(|e| JsValue::from_str(&e))?;
    console::log_1(&"[run_clara_clustering] CLARA finished".into());

    let medoids: Vec<Vec<f64>> = result.medoids.iter()
        .map(|&idx| input.data[idx].clone())
        .collect();

    let distances_to_medoids: Vec<f64> = result.assignments.iter()
        .enumerate()
        .map(|(point_idx, &cluster_idx)| {
            let medoid_idx = result.medoids[cluster_idx];
            crate::utils::distance::calculate_distance(
                &input.data[point_idx],
                &input.data[medoid_idx],
                &config.metric,
            )
        })
        .collect();

    let sample_costs: Vec<f64> = result.samples.iter().map(|s| s.cost).collect();
    let sample_pam_iterations: Vec<usize> = result.samples.iter().map(|s| s.pam_iterations).collect();
    let clara_best_sample_index = result.best_sample_index;

    for s in &result.samples {
        console::log_1(&format!(
            "[CLARA] Sample {}/{}: cost={:.4} pam_iters={}",
            s.sample_index, result.samples_tried, s.cost, s.pam_iterations
        ).into());
    }
    console::log_1(&format!(
        "[CLARA] Best sample: #{} cost={:.4}",
        clara_best_sample_index, result.total_cost
    ).into());

    Ok(KMedoidsOutput {
        cluster_assignments: result.assignments,
        medoids_indices: result.medoids,
        medoids,
        distances_to_medoids,
        total_distance: result.total_cost,
        avg_cost: if input.data.is_empty() {
            0.0
        } else {
            result.total_cost / input.data.len() as f64
        },
        total_cost_build: result.total_cost,
        total_cost_swap: result.total_cost,
        iterations: result.samples_tried,
        converged: true,
        // cost_history dipakai untuk membawa cost per sampel, supaya kode
        // TypeScript yang masih membaca result.cost_history tetap mendapat
        // data sebelum diperbarui ke field sample_costs.
        cost_history: sample_costs.clone(),
        // Silhouette dilewati di WASM untuk CLARA karena memakai sampling
        silhouette_scores: vec![],
        medoid_history: vec![],
        sample_costs,
        sample_pam_iterations,
        clara_best_sample_index,
    })
}

fn run_clarans_clustering(
    input: &KMedoidsInput,
    metric: DistanceMetric,
) -> Result<KMedoidsOutput, JsValue> {
    let mut config = CLARANSConfig::new(input.n_clusters, input.data.len(), metric);
    
    config.num_local = input.clarans_num_local;
    if let Some(max_neighbors) = input.clarans_max_neighbors {
        config.max_neighbors = max_neighbors;
    }
    config.random_seed = input.random_seed;

    let result = run_clarans(&input.data, &config)
        .map_err(|e| JsValue::from_str(&e))?;

    let medoids: Vec<Vec<f64>> = result.medoids.iter()
        .map(|&idx| input.data[idx].clone())
        .collect();

    let distances_to_medoids: Vec<f64> = result.assignments.iter()
        .enumerate()
        .map(|(point_idx, &cluster_idx)| {
            let medoid_idx = result.medoids[cluster_idx];
            crate::utils::distance::calculate_distance(
                &input.data[point_idx],
                &input.data[medoid_idx],
                &config.metric,
            )
        })
        .collect();

    Ok(KMedoidsOutput {
        cluster_assignments: result.assignments,
        medoids_indices: result.medoids,
        medoids,
        distances_to_medoids,
        total_distance: result.total_cost,
        avg_cost: if input.data.is_empty() {
            0.0
        } else {
            result.total_cost / input.data.len() as f64
        },
        total_cost_build: result.total_cost,
        total_cost_swap: result.total_cost,
        iterations: result.local_searches,
        converged: true,
        cost_history: vec![],
        // Silhouette dilewati di WASM untuk CLARANS karena memakai pencarian acak
        silhouette_scores: vec![],
        medoid_history: vec![],
        sample_costs: vec![],
        sample_pam_iterations: vec![],
        clara_best_sample_index: 0,
    })
}

#[wasm_bindgen]
pub fn test_connection() -> String {
    "K-Medoids Cluster WASM module connected successfully!".to_string()
}

/// Standardisasi/normalisasi matriks numerik sebelum clustering.
///
/// Menggantikan fungsi JS `standardizeZScore` / `normalizeMinMax` di layer
/// service TypeScript, sehingga rumus penskalaan hanya punya satu implementasi
/// (`stats::normalization`), konsisten dengan rumus K-Medoids lain di Rust/WASM.
///
/// `method`: "zscore" | "minmax" | "none" (nilai lain dianggap "none").
/// Z-score memakai simpangan baku sampel (n-1), sama dengan `scale()` di R.
#[wasm_bindgen]
pub fn standardize_data(input_value: JsValue) -> Result<JsValue, JsValue> {
    let input: StandardizeInput = from_value(input_value)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse input: {:?}", e)))?;

    let method = NormalizationMethod::from_str(&input.method);

    let (matrix, _stats) = normalize_data(&input.data, method);

    to_value(&StandardizeOutput { matrix })
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize output: {:?}", e)))
}

/// Menghitung Within-Cluster Sum of Squares (WCSS) untuk metode Elbow.
///
/// Menggantikan `calculateWCSS` (k-medoids-cluster-analysis.ts) dan
/// `computeWCSS` (cluster-worker.ts) versi TypeScript yang duplikat dengan
/// satu implementasi Rust (`utils::distance::compute_wcss`).
#[wasm_bindgen]
pub fn calculate_wcss(input_value: JsValue) -> Result<JsValue, JsValue> {
    let input: WcssInput = from_value(input_value)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse input: {:?}", e)))?;

    let metric = parse_distance_metric(&input.distance_metric)
        .map_err(|e| JsValue::from_str(&e))?;

    let wcss = crate::utils::distance::compute_wcss(
        &input.data,
        &input.labels,
        &input.medoid_indices,
        &metric,
    );

    to_value(&WcssOutput { wcss })
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize output: {:?}", e)))
}

/// Menjalankan PAM untuk rentang nilai k dalam satu panggilan.
/// Distance matrix O(n²) dibangun **sekali** dan dipakai ulang untuk semua k,
/// sehingga menghilangkan bottleneck terbesar pada pemilihan k otomatis.
#[wasm_bindgen]
pub fn run_k_medoids_range(input_value: JsValue) -> Result<JsValue, JsValue> {
    let input: KMedoidsRangeInput = from_value(input_value)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse range input: {:?}", e)))?;

    console::log_1(&format!(
        "[range] n={} k={}..{} metric={}",
        input.data.len(), input.k_min, input.k_max, input.distance_metric
    ).into());

    let metric = parse_distance_metric(&input.distance_metric)
        .map_err(|e| JsValue::from_str(&e))?;

    let base_config = PAMConfig {
        // Ditimpa per-k di dalam run_pam_range
        k: input.k_min,
        metric,
        max_iterations: input.max_iterations,
        random_seed: input.random_seed,
        use_build_phase: true,
        // Konvergensi eksak (sama dengan pam() di R) jika toleransi tidak diisi
        epsilon: if input.convergence_tolerance > 0.0 {
            input.convergence_tolerance
        } else {
            0.0
        },
        // Tahap eksplorasi, tidak perlu banyak inisialisasi
        n_init: 1,
        use_r_implementation: true,
    };

    let range_results = run_pam_range(&input.data, input.k_min, input.k_max, &base_config)
        .map_err(|e| JsValue::from_str(&e))?;

    let items: Vec<KMedoidsRangeItem> = range_results
        .into_iter()
        .map(|(k, pam)| {
            // Rata-rata silhouette dari skor per objek yang sudah ada di PAMResult
            let silhouette_overall = if pam.silhouette_scores.is_empty() {
                0.0
            } else {
                pam.silhouette_scores.iter().sum::<f64>() / pam.silhouette_scores.len() as f64
            };
            KMedoidsRangeItem {
                k,
                cluster_assignments: pam.assignments,
                medoids_indices:     pam.medoids,
                total_distance:      pam.total_cost,
                iterations:          pam.iterations,
                converged:           true,
                cost_history:        pam.cost_history,
                silhouette_overall,
            }
        })
        .collect();

    console::log_1(&format!("[range] done: {} results", items.len()).into());

    to_value(&items)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize range output: {:?}", e)))
}

// Jalur cepat dengan typed array.
//
// `run_k_medoids_typed` melewati `serde_wasm_bindgen` untuk array input/output
// yang besar dengan memakai helper typed-array dari js_sys.
//
// Hasil benchmark (n=1000, d=10):
//   jalur serde  ≈ 35 ms hanya untuk (de)serialisasi
//   jalur typed  ≈  2 ms
//
// Pemanggil sebaiknya memakai `Float64Array` untuk data dan mengirim buffer-nya
// sebagai transferable lewat postMessage agar structured clone tanpa salinan.

/// Menyalin `&[f64]` Rust ke `Float64Array` baru milik JS.
/// Pola `view()` unsafe + `.set()` adalah idiom wasm-bindgen; aman selama
/// tidak ada alokasi heap WASM di antara `view()` dan `set()`.
#[inline]
fn rust_to_float64(data: &[f64]) -> Float64Array {
    let arr = Float64Array::new_with_length(data.len() as u32);
    let view = unsafe { Float64Array::view(data) };
    arr.set(view.as_ref(), 0);
    arr
}

/// Menyalin `&[usize]` Rust ke `Uint32Array` baru milik JS.
#[inline]
fn rust_to_uint32(data: &[usize]) -> Uint32Array {
    let u32s: Vec<u32> = data.iter().map(|&x| x as u32).collect();
    let arr = Uint32Array::new_with_length(u32s.len() as u32);
    let view = unsafe { Uint32Array::view(&u32s) };
    arr.set(view.as_ref(), 0);
    arr
}

/// Entry-point PAM cepat yang menghindari `serde_wasm_bindgen` untuk array besar.
///
/// Parameter:
/// - `flat_data`: Float64Array row-major berukuran (n_rows × n_cols)
/// - `n_rows`, `n_cols`: bentuk matriks data
/// - `n_clusters`: k
/// - `method`: hanya "pam" yang didukung (pakai run_k_medoids untuk CLARA/CLARANS)
/// - `max_iterations`: iterasi SWAP maksimum
/// - `distance_metric`: "euclidean" | "manhattan"
/// - `random_seed`: i64; -1 berarti tanpa seed
/// - `convergence_tolerance`: berhenti saat Δcost lebih kecil dari nilai ini (0 = konvergensi eksak)
/// - `n_init`: jumlah inisialisasi (minimal 1)
/// - `on_progress`: callback JS opsional `(iteration, cost)`, dipanggil setelah
///   setiap langkah SWAP agar UI bisa menampilkan progres langsung
/// - `on_initial_medoids`: callback JS opsional `(medoids: Uint32Array)`, dipanggil
///   sekali setelah fase BUILD selesai dan sebelum SWAP dimulai, sehingga pusat
///   cluster awal bisa ditampilkan saat SWAP masih berjalan
///
/// Mengembalikan objek JS dengan field typed array sehingga worker bisa
/// mengirimnya sebagai Transferable lewat postMessage() (tanpa salinan):
///   { cluster_assignments: Uint32Array,
///     silhouette_scores:   Float64Array,
///     distances_to_medoids: Float64Array,
///     cost_history:        Float64Array,
///     medoids_indices:     Uint32Array,
///     total_distance:      number,
///     iterations:          number,
///     converged:           boolean }
#[wasm_bindgen]
pub fn run_k_medoids_typed(
    flat_data: &[f64],
    n_rows: usize,
    n_cols: usize,
    n_clusters: usize,
    method: &str,
    max_iterations: usize,
    distance_metric: &str,
    random_seed: i64,
    convergence_tolerance: f64,
    n_init: usize,
    on_progress: Option<js_sys::Function>,
    on_initial_medoids: Option<js_sys::Function>,
) -> Result<JsValue, JsValue> {
    if flat_data.len() != n_rows * n_cols {
        return Err(JsValue::from_str(&format!(
            "flat_data length {} != n_rows({}) × n_cols({})",
            flat_data.len(), n_rows, n_cols
        )));
    }
    if method.to_lowercase() != "pam" {
        return Err(JsValue::from_str(
            "run_k_medoids_typed only supports method='pam'. Use run_k_medoids for CLARA/CLARANS."
        ));
    }

    // Salinan O(n×d) dengan loop memcpy yang ketat, jauh lebih cepat daripada
    // traversal rekursif objek JS oleh serde_wasm_bindgen.
    let data: Vec<Vec<f64>> = (0..n_rows)
        .map(|i| flat_data[i * n_cols..(i + 1) * n_cols].to_vec())
        .collect();

    let on_iter: Option<Box<dyn Fn(usize, f64)>> = on_progress.map(|f| {
        Box::new(move |iter: usize, cost: f64| {
            let _ = f.call2(
                &JsValue::NULL,
                &JsValue::from_f64(iter as f64),
                &JsValue::from_f64(cost),
            );
        }) as Box<dyn Fn(usize, f64)>
    });

    let on_build: Option<Box<dyn Fn(&[usize])>> = on_initial_medoids.map(|f| {
        Box::new(move |medoids: &[usize]| {
            let arr = rust_to_uint32(medoids);
            let _ = f.call1(&JsValue::NULL, &arr.into());
        }) as Box<dyn Fn(&[usize])>
    });

    let metric = parse_distance_metric(distance_metric)
        .map_err(|e| JsValue::from_str(&e))?;

    let config = PAMConfig {
        k: n_clusters,
        metric,
        max_iterations,
        random_seed: if random_seed >= 0 { Some(random_seed as u64) } else { None },
        use_build_phase: true,
        epsilon: convergence_tolerance,
        n_init: n_init.max(1),
        use_r_implementation: true,
    };

    let result = run_pam_with_progress(&data, &config, on_iter.as_deref(), on_build.as_deref())
        .map_err(|e| JsValue::from_str(&e))?;

    // Susun output sebagai typed array (tanpa overhead serde untuk array besar)
    let obj = Object::new();

    let set = |key: &str, val: &JsValue| {
        Reflect::set(&obj, &JsValue::from_str(key), val).ok();
    };

    set("cluster_assignments",   &rust_to_uint32(&result.assignments).into());
    set("silhouette_scores",     &rust_to_float64(&result.silhouette_scores).into());
    set("distances_to_medoids",  &rust_to_float64(&result.distances_to_medoids).into());
    set("cost_history",          &rust_to_float64(&result.cost_history).into());
    set("medoids_indices",       &rust_to_uint32(&result.medoids).into());
    set("total_cost_build",      &JsValue::from_f64(result.total_cost_build));
    set("total_cost_swap",       &JsValue::from_f64(result.total_cost_swap));
    set("total_distance",        &JsValue::from_f64(result.total_cost));
    set(
        "avg_cost",
        &JsValue::from_f64(if n_rows == 0 {
            0.0
        } else {
            result.total_cost / n_rows as f64
        }),
    );
    set("iterations",            &JsValue::from_f64(result.iterations as f64));
    set("converged",             &JsValue::from_bool(result.converged));

    // medoid_history: Array JS berisi Uint32Array, satu snapshot per langkah
    let hist_arr = js_sys::Array::new();
    for snapshot in &result.medoid_history {
        hist_arr.push(&rust_to_uint32(snapshot).into());
    }
    set("medoid_history", &hist_arr.into());

    console::log_1(&format!(
        "[typed] n={} k={} iters={} converged={} cost={:.4}",
        n_rows, n_clusters, result.iterations, result.converged, result.total_cost
    ).into());

    Ok(obj.into())
}