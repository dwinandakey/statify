/// Menggunakan crate `kmedoids` untuk komputasi inti PAM.
/// 
/// Referensi:
/// - Kaufman, L. and Rousseeuw, P.J. (1990)
///    "Finding Groups in Data: An Introduction to Cluster Analysis"
/// - https://github.com/cran/cluster/blob/master/src/pam.c

use crate::models::ClusteringResult;
use crate::utils::distance::{calculate_distance, DistanceMetric};
use crate::utils::validation::validate_clustering_input;
use ndarray::Array2;
#[cfg(target_arch = "wasm32")]
use web_sys::console;

const DIST_TIE_EPS: f64 = 1e-12;

#[cfg(target_arch = "wasm32")]
fn pam_debug_enabled() -> bool {
    // Toggle from JS with: globalThis.__PAM_DEBUG__ = true
    let g = js_sys::global();
    js_sys::Reflect::get(&g, &wasm_bindgen::JsValue::from_str("__PAM_DEBUG__"))
        .ok()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

#[cfg(not(target_arch = "wasm32"))]
fn pam_debug_enabled() -> bool {
    false
}

/// Konfigurasi algoritma PAM
#[derive(Debug, Clone)]
pub struct PAMConfig {
    /// Jumlah cluster (k)
    pub k: usize,
    
    /// Metode jarak yang digunakan
    pub metric: DistanceMetric,
    
    /// Maksimum iterasi pada fase SWAP
    pub max_iterations: usize,
    
    /// Seed acak untuk reproduktibilitas (opsional)
    pub random_seed: Option<u64>,
    
    /// Gunakan fase BUILD untuk inisialisasi
    /// Jika false, gunakan inisialisasi acak (lebih cepat, tetapi bisa kurang akurat)
    pub use_build_phase: bool,
    
    /// Early stopping: berhenti jika perbaikan < epsilon
    pub epsilon: f64,
    
    /// Jumlah pengulangan dengan seed berbeda (n_init)
    pub n_init: usize,

    /// Jika true, gunakan integrasi PAM gaya R (`cl_pam`) pada `run_pam`.
    ///
    /// Default false agar perilaku lama tetap kompatibel.
    pub use_r_implementation: bool,
}

impl Default for PAMConfig {
    fn default() -> Self {
        Self {
            k: 2,
            metric: DistanceMetric::Euclidean,
            max_iterations: 100,
            random_seed: None,
            use_build_phase: true,
            epsilon: 1e-6,
            n_init: 10,
            use_r_implementation: false,
        }
    }
}

/// Hasil clustering PAM
#[derive(Debug, Clone)]
pub struct PAMResult {
    /// Indeks medoid
    pub medoids: Vec<usize>,

    /// Penugasan cluster (indeks titik -> indeks cluster)
    pub assignments: Vec<usize>,

    /// Total cost (jumlah jarak ke medoid terdekat)
    pub total_cost: f64,

    /// Total cost setelah fase BUILD selesai (sebelum SWAP).
    pub total_cost_build: f64,

    /// Total cost setelah fase SWAP selesai (final).
    pub total_cost_swap: f64,

    /// Jumlah iterasi swap yang benar-benar dijalankan
    pub iterations: usize,

    /// Cost pada setiap iterasi (indeks 0 = cost awal sebelum swap)
    pub cost_history: Vec<f64>,

    /// Indeks medoid pada setiap langkah: [0] = medoid awal (setelah BUILD),
    /// [i] = medoid setelah swap ke-i. Susunannya mengikuti cost_history.
    pub medoid_history: Vec<Vec<usize>>,

    /// Silhouette score per objek yang dihitung dari matriks jarak yang sudah ada.
    /// Ini memanfaatkan ulang komputasi O(n^2) milik PAM sehingga tidak perlu
    /// menghitung ulang jarak tambahan.
    pub silhouette_scores: Vec<f64>,

    /// Jarak setiap titik ke medoid hasil assignment-nya, dibaca langsung dari
    /// matriks jarak hasil PAM tanpa hitung ulang dari data mentah.
    pub distances_to_medoids: Vec<f64>,

    /// True jika algoritma berhenti karena tidak ada swap yang memperbaiki
    /// cost (konvergen), false jika berhenti karena mencapai max_iterations.
    pub converged: bool,
}

#[derive(Debug, Clone)]
struct RStylePamRawResult {
    clu: Vec<usize>,
    med: Vec<usize>,
    obj: Vec<f64>,
    sylinf: Option<Vec<f64>>,
}

fn to_column_major(data: &[Vec<f64>]) -> Vec<f64> {
    if data.is_empty() {
        return Vec::new();
    }

    let n = data.len();
    let p = data[0].len();
    let mut out = Vec::with_capacity(n * p);

    for col in 0..p {
        for row in 0..n {
            out.push(data[row][col]);
        }
    }

    out
}

/// Validasi bentuk matriks data agar aman dipetakan ke column-major.
fn validate_rectangular_data(data: &[Vec<f64>]) -> Result<usize, String> {
    if data.is_empty() {
        return Err("No data provided".to_string());
    }

    let p = data[0].len();
    if p == 0 {
        return Err("Data must have at least one feature (column)".to_string());
    }

    for (row_idx, row) in data.iter().enumerate() {
        if row.len() != p {
            return Err(format!(
                "Non-rectangular data: row {} has {} columns, expected {}",
                row_idx,
                row.len(),
                p
            ));
        }
    }

    Ok(p)
}

#[allow(clippy::too_many_arguments)]
fn cl_pam(
    k: usize,
    n: usize,
    _do_swap: bool,
    x: &[f64],
    p: usize,
    _keep_data: bool,
    _weights: Option<&[f64]>,
    _cluster_only: bool,
    _trace_lev: i32,
    _med_given: bool,
    _nstart: usize,
    diss_kind: i32,
) -> Result<RStylePamRawResult, String> {
    if k == 0 {
        return Err("k must be at least 1".to_string());
    }
    if n == 0 {
        return Err("No data points provided".to_string());
    }
    if k > n {
        return Err(format!("k ({}) cannot exceed n ({})", k, n));
    }
    if p == 0 {
        return Err("Data must have at least one feature (column)".to_string());
    }
    if x.len() != n * p {
        return Err(format!(
            "Invalid column-major buffer length: got {}, expected {} (n*p)",
            x.len(),
            n * p
        ));
    }
    if diss_kind != 1 && diss_kind != 2 {
        return Err(format!(
            "Unsupported diss_kind {}. Only Euclidean (1) and Manhattan (2) are supported",
            diss_kind
        ));
    }

    let mut data = vec![vec![0.0_f64; p]; n];
    for col in 0..p {
        for row in 0..n {
            data[row][col] = x[col * n + row];
        }
    }

    let metric = match diss_kind {
        1 => DistanceMetric::Euclidean,
        _ => DistanceMetric::Manhattan,
    };

    let config = PAMConfig {
        k,
        metric: metric.clone(),
        max_iterations: 100,
        random_seed: None,
        use_build_phase: true,
        epsilon: 0.0,
        n_init: 1,
        use_r_implementation: false,
    };

    let dist = build_distance_matrix(&data, &metric);
    let result = run_pam_with_dist(&dist, n, &config, None, None)?;

    let init_total = result.cost_history.first().copied().unwrap_or(result.total_cost);
    let final_total = result.total_cost;

    Ok(RStylePamRawResult {
        clu: result.assignments.into_iter().map(|idx| idx + 1).collect(),
        med: result.medoids.into_iter().map(|idx| idx + 1).collect(),
        obj: vec![init_total, final_total],
        sylinf: Some(result.silhouette_scores),
    })
}

pub fn run_pam_r_style(data: &[Vec<f64>], config: &PAMConfig) -> Result<PAMResult, String> {
    validate_clustering_input(data, config.k)?;
    let p = validate_rectangular_data(data)?;
    let n = data.len();

    if config.k > n {
        return Err(format!("k ({}) cannot exceed n ({})", config.k, n));
    }

    let x = to_column_major(data);

    let diss_kind = match config.metric {
        DistanceMetric::Euclidean => 1,
        DistanceMetric::Manhattan => 2,
    };

    let raw = cl_pam(
        config.k,
        n,
        true,
        &x,
        p,
        true,
        None,
        true,
        0,
        false,
        0,
        diss_kind,
    )?;

    if raw.obj.len() < 2 {
        return Err("cl_pam returned invalid `obj`: expected at least 2 values".to_string());
    }

    // Konversi indeks 1-based (R/C) -> 0-based (Rust).
    let assignments: Vec<usize> = raw
        .clu
        .iter()
        .enumerate()
        .map(|(i, &cluster_1based)| {
            if cluster_1based == 0 || cluster_1based > config.k {
                Err(format!(
                    "Invalid 1-based cluster assignment at row {}: {} (expected 1..={})",
                    i,
                    cluster_1based,
                    config.k
                ))
            } else {
                Ok(cluster_1based - 1)
            }
        })
        .collect::<Result<Vec<_>, _>>()?;

    let medoids: Vec<usize> = raw
        .med
        .iter()
        .enumerate()
        .map(|(i, &medoid_1based)| {
            if medoid_1based == 0 || medoid_1based > n {
                Err(format!(
                    "Invalid 1-based medoid at position {}: {} (expected 1..={})",
                    i,
                    medoid_1based,
                    n
                ))
            } else {
                Ok(medoid_1based - 1)
            }
        })
        .collect::<Result<Vec<_>, _>>()?;

    if assignments.len() != n {
        return Err(format!(
            "Invalid clu length from cl_pam: got {}, expected {}",
            assignments.len(),
            n
        ));
    }

    // Hitung ulang jarak titik-ke-medoid dari data mentah agar independen
    // dari struktur internal keluaran cl_pam.
    let distances_to_medoids: Vec<f64> = assignments
        .iter()
        .enumerate()
        .map(|(i, &cluster_idx)| {
            let medoid_idx = *medoids.get(cluster_idx).ok_or_else(|| {
                format!(
                    "Cluster index {} at row {} has no corresponding medoid (k={})",
                    cluster_idx,
                    i,
                    medoids.len()
                )
            })?;
            Ok(calculate_distance(
                &data[i],
                &data[medoid_idx],
                &config.metric,
            ))
        })
        .collect::<Result<Vec<_>, String>>()?;

    let silhouette_scores = raw
        .sylinf
        .filter(|vals| vals.len() >= n)
        .map(|vals| vals.into_iter().take(n).collect())
        .unwrap_or_default();

    Ok(PAMResult {
        medoid_history: vec![medoids.clone()],
        medoids,
        assignments,
        total_cost: raw.obj[1],
        total_cost_build: raw.obj[0],
        total_cost_swap: raw.obj[1],
        iterations: 0,
        cost_history: vec![raw.obj[0], raw.obj[1]],
        silhouette_scores,
        distances_to_medoids,
        converged: true,
    })
}

/// Jalankan algoritma PAM dengan beberapa inisialisasi.
/// 
/// Jika n_init > 1, algoritma dijalankan berulang dengan seed acak berbeda,
/// lalu dipilih hasil terbaik (total cost paling kecil).
/// 
/// # Argumen
/// * `data` - Data input
/// * `config` - Konfigurasi PAM
/// 
/// # Keluaran
/// * `Ok(PAMResult)` - Hasil clustering terbaik dari semua percobaan
/// * `Err(String)` - Pesan error
pub fn run_pam(data: &[Vec<f64>], config: &PAMConfig) -> Result<PAMResult, String> {
    if config.use_r_implementation {
        return run_pam_r_style(data, config);
    }

    // Fase BUILD bersifat deterministik (mengabaikan seed acak), jadi mengulang
    // n_init kali akan menghasilkan output yang sama persis. Ini tidak efisien.
    // Multi-restart hanya dipakai saat inisialisasi acak (tanpa BUILD).
    let effective_n_init = if config.use_build_phase {
        1
    } else {
        config.n_init.max(1)
    };

    if effective_n_init <= 1 || config.random_seed.is_some() {
        return run_pam_single(data, config);
    }

    validate_clustering_input(data, config.k)?;
    let dist = build_distance_matrix(data, &config.metric);
    let n = data.len();

    let mut best_result: Option<PAMResult> = None;

    for i in 0..effective_n_init {
        let mut run_config = config.clone();
        run_config.random_seed = Some(i as u64);

        match run_pam_with_dist(&dist, n, &run_config, None, None) {
            Ok(result) => {
                if best_result.is_none()
                    || result.total_cost < best_result.as_ref().unwrap().total_cost
                {
                    best_result = Some(result);
                }
            }
            Err(e) => {
                eprintln!("Run {} failed: {}", i, e);
            }
        }
    }

    best_result.ok_or_else(|| "All initialization attempts failed".to_string())
}

fn run_pam_single(data: &[Vec<f64>], config: &PAMConfig) -> Result<PAMResult, String> {
    validate_clustering_input(data, config.k)?;
    let dist = build_distance_matrix(data, &config.metric);
    let n = data.len();
    run_pam_with_dist(&dist, n, config, None, None)
}

pub fn run_pam_with_progress(
    data: &[Vec<f64>],
    config: &PAMConfig,
    on_iter: Option<&dyn Fn(usize, f64)>,
    on_initial_medoids: Option<&dyn Fn(&[usize])>,
) -> Result<PAMResult, String> {
    if config.use_r_implementation {
        let result = run_pam_r_style(data, config)?;
        if let Some(cb) = on_initial_medoids {
            cb(&result.medoids);
        }
        let _ = on_iter;
        return Ok(result);
    }

    validate_clustering_input(data, config.k)?;
    let dist = build_distance_matrix(data, &config.metric);
    let n = data.len();
    run_pam_with_dist(&dist, n, config, on_iter, on_initial_medoids)
}

pub(crate) fn run_pam_with_dist(
    dist: &Array2<f64>,
    n: usize,
    config: &PAMConfig,
    on_iter: Option<&dyn Fn(usize, f64)>,
    on_initial_medoids: Option<&dyn Fn(&[usize])>,
) -> Result<PAMResult, String> {
    let k = config.k;

    #[cfg(target_arch = "wasm32")]
    console::log_1(
        &format!("[PAM BUILD entry] k={} n={} use_build={} epsilon={:e}",
            k, n, config.use_build_phase, config.epsilon).into()
    );

    if n < k {
        return Err(format!("Need at least {} points for k={}", k, k));
    }

    // Inisialisasi
    let mut medoids: Vec<usize> = if config.use_build_phase {
        let (_, _, initial_medoids): (f64, Vec<usize>, Vec<usize>) =
            kmedoids::pam_build(dist, k);
        if let Some(cb) = on_initial_medoids { cb(&initial_medoids); }
        initial_medoids
    } else {
        random_init_medoids(n, k, config.random_seed)
    };

    // Hitung cost awal dan simpan sebagai entri "Init" pada riwayat
    let init_cost = compute_total_cost(dist, &medoids, n);
    let mut cost_history = vec![init_cost];
    let mut medoid_history: Vec<Vec<usize>> = vec![medoids.clone()];
    let mut current_cost = init_cost;
    let mut n_iter = 0usize;

    let mut seen_states: Vec<Vec<usize>> = Vec::new();
    {
        let mut initial_state = medoids.clone();
        initial_state.sort_unstable();
        seen_states.push(initial_state);
    }

    let mut converged = false;
    for _ in 0..config.max_iterations {
        let (best_m_pos, best_x, best_delta) = find_best_swap(dist, &medoids, n);

        if best_delta >= -config.epsilon {
            // Tidak ada swap yang memperbaiki cost melebihi epsilon -> konvergen.
            converged = true;
            break; // n_iter tidak dinaikkan karena tidak ada swap yang terjadi.
        }

        medoids[best_m_pos] = best_x;

        let mut state = medoids.clone();
        state.sort_unstable();
        if seen_states.contains(&state) {
            converged = true;
            break;
        }
        seen_states.push(state);

        current_cost += best_delta;
        if current_cost < 0.0 { current_cost = 0.0; }
        cost_history.push(current_cost);
        medoid_history.push(medoids.clone());
        n_iter += 1;
        if let Some(cb) = on_iter { cb(n_iter, current_cost); }
    }

    let assignments = compute_assignments(dist, &medoids, n, k);

    let final_cost: f64 = (0..n)
        .map(|i| dist[[i, medoids[assignments[i]]]])
        .sum();

    if let Some(last) = cost_history.last_mut() {
        *last = final_cost;
    }
    let distances_to_medoids: Vec<f64> = (0..n)
        .map(|i| dist[[i, medoids[assignments[i]]]])
        .collect();

    let silhouette_scores = compute_silhouette_from_dist(dist, &assignments, n, k);

    #[cfg(target_arch = "wasm32")]
    console::log_1(
        &format!("[PAM DONE] k={} medoids.len()={} iters={} converged={} cost={:.4}",
            k, medoids.len(), n_iter, converged, final_cost).into()
    );
    debug_assert_eq!(medoids.len(), k, "PAM returned {} medoids for k={}", medoids.len(), k);

    Ok(PAMResult {
        medoids,
        assignments,
        total_cost: final_cost,
        total_cost_build: init_cost,
        total_cost_swap: final_cost,
        iterations: n_iter,
        cost_history,
        medoid_history,
        silhouette_scores,
        distances_to_medoids,
        converged,
    })
}

pub fn run_pam_range(
    data: &[Vec<f64>],
    k_min: usize,
    k_max: usize,
    base_config: &PAMConfig,
) -> Result<Vec<(usize, PAMResult)>, String> {
    if data.is_empty() {
        return Err("No data provided".to_string());
    }
    let n = data.len();
    if k_max > n {
        return Err(format!("k_max ({}) cannot exceed n ({})", k_max, n));
    }
    if k_min < 1 || k_min > k_max {
        return Err(format!("Invalid range: k_min={} k_max={}", k_min, k_max));
    }

    if base_config.use_r_implementation {
        let mut results = Vec::with_capacity(k_max - k_min + 1);
        for k in k_min..=k_max {
            let mut config = base_config.clone();
            config.k = k;
            match run_pam_r_style(data, &config) {
                Ok(result) => results.push((k, result)),
                Err(e) => return Err(format!("PAM failed for k={}: {}", k, e)),
            }
        }
        return Ok(results);
    }

    let dist = build_distance_matrix(data, &base_config.metric);

    let mut results = Vec::with_capacity(k_max - k_min + 1);
    for k in k_min..=k_max {
        let mut config = base_config.clone();
        config.k = k;
        match run_pam_with_dist(&dist, n, &config, None, None) {
            Ok(result) => results.push((k, result)),
            Err(e) => return Err(format!("PAM failed for k={}: {}", k, e)),
        }
    }

    Ok(results)
}

fn compute_nearest_and_second(
    dist: &Array2<f64>,
    medoids: &[usize],
    n: usize,
) -> (Vec<f64>, Vec<f64>, Vec<usize>) {
    let mut d_nearest = vec![f64::INFINITY; n];
    let mut d_second = vec![f64::INFINITY; n];
    let mut nearest_pos = vec![0usize; n];

    for j in 0..n {
        for (m_pos, &m_idx) in medoids.iter().enumerate() {
            let d = dist[[j, m_idx]];
            if d + DIST_TIE_EPS < d_nearest[j] {
                d_second[j] = d_nearest[j];
                d_nearest[j] = d;
                nearest_pos[j] = m_pos;
            } else if m_pos != nearest_pos[j] && d <= d_second[j] + DIST_TIE_EPS {
                d_second[j] = d;
            }
        }

        if !d_second[j].is_finite() {
            d_second[j] = d_nearest[j];
        }
    }

    (d_nearest, d_second, nearest_pos)
}

#[inline]
fn evaluate_swap_delta_exact(
    dist: &Array2<f64>,
    medoids: &[usize],
    n: usize,
    remove_pos: usize,
    candidate: usize,
    d_nearest: &[f64],
    d_second: &[f64],
    _nearest_pos: &[usize],
) -> f64 {
    let mut t_ih = 0.0_f64;
    let debug = pam_debug_enabled();

    for j in 0..n {
        let d_jh = dist[[j, candidate]];
        let d_j = d_nearest[j];
        let d_ji = dist[[j, medoids[remove_pos]]];

        let removed_is_nearest = d_ji <= d_j + DIST_TIE_EPS;

        let c_jih = if removed_is_nearest {
            d_jh.min(d_second[j]) - d_j
        } else {
            d_jh.min(d_j) - d_j
        };

        if debug {
            #[cfg(target_arch = "wasm32")]
            console::log_1(
                &format!(
                    "[PAM DEBUG] j={} remove_pos={} nearest_pos={} D_j={:.12} E_j={:.12} d(j,i)={:.12} d(j,h)={:.12} C_jih={:.12}",
                    j,
                    remove_pos,
                    _nearest_pos[j],
                    d_j,
                    d_second[j],
                    d_ji,
                    d_jh,
                    c_jih,
                )
                .into(),
            );
        }

        t_ih += c_jih;
    }

    if debug {
        #[cfg(target_arch = "wasm32")]
        console::log_1(
            &format!(
                "[PAM DEBUG] T_ih(remove_pos={}, candidate={}) = {:.12}",
                remove_pos, candidate, t_ih
            )
            .into(),
        );
    }

    t_ih
}

fn find_best_swap(dist: &Array2<f64>, medoids: &[usize], n: usize) -> (usize, usize, f64) {
    let k = medoids.len();
    let (d_nearest, d_second, nearest_pos) = compute_nearest_and_second(dist, medoids, n);

    let mut is_medoid = vec![false; n];
    for &m in medoids {
        is_medoid[m] = true;
    }

    let mut best_m_pos = 0usize;
    let mut best_candidate = 0usize;
    let mut best_delta = 0.0_f64; // hanya swap dengan T_ih < 0 yang diterima

    // Evaluasi semua pasangan (i in medoid, h in non-medoid)
    for remove_pos in 0..k {
        for candidate in 0..n {
            if is_medoid[candidate] {
                continue;
            }

            let delta = evaluate_swap_delta_exact(
                dist,
                medoids,
                n,
                remove_pos,
                candidate,
                &d_nearest,
                &d_second,
                &nearest_pos,
            );

            if delta < best_delta {
                best_delta = delta;
                best_m_pos = remove_pos;
                best_candidate = candidate;
            }
        }
    }

    (best_m_pos, best_candidate, best_delta)
}

/// Hitung total cost PAM untuk medoid tertentu: Σ_i min_m d(i, m).
fn compute_total_cost(dist: &Array2<f64>, medoids: &[usize], n: usize) -> f64 {
    (0..n)
        .map(|i| medoids.iter().map(|&m| dist[[i, m]]).fold(f64::INFINITY, f64::min))
        .sum()
}

/// Assign setiap titik ke medoid terdekat; hasilnya indeks cluster (0..k-1) per titik.
fn compute_assignments(dist: &Array2<f64>, medoids: &[usize], n: usize, k: usize) -> Vec<usize> {
    (0..n)
        .map(|i| {
            (0..k)
                .min_by(|&a, &b| {
                    dist[[i, medoids[a]]]
                        .partial_cmp(&dist[[i, medoids[b]]])
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .unwrap_or(0)
        })
        .collect()
}

/// Inisialisasi medoid acak sederhana (subset Fisher-Yates).
fn random_init_medoids(n: usize, k: usize, seed: Option<u64>) -> Vec<usize> {
    use rand::SeedableRng;
    use rand::seq::SliceRandom;
    use rand::rngs::StdRng;

    let mut rng: StdRng = match seed {
        Some(s) => StdRng::seed_from_u64(s),
        None    => StdRng::from_entropy(),
    };

    let mut indices: Vec<usize> = (0..n).collect();
    indices.shuffle(&mut rng);
    indices.truncate(k);
    indices
}

pub(crate) fn compute_silhouette_from_dist(
    dist: &Array2<f64>,
    assignments: &[usize],
    n: usize,
    k: usize,
) -> Vec<f64> {
    if k <= 1 || n == 0 {
        return vec![0.0; n];
    }

    // Build inverted index: cluster_indices[c] = sorted point indices in cluster c.
    let mut cluster_indices: Vec<Vec<usize>> = vec![vec![]; k];
    for (i, &c) in assignments.iter().enumerate() {
        if c < k {
            cluster_indices[c].push(i);
        }
    }

    let mut scores = vec![0.0f64; n];
    for i in 0..n {
        let ci = assignments[i];
        if ci >= k {
            continue;
        }
        let same = &cluster_indices[ci];
        if same.len() <= 1 {
            continue; // cluster berisi satu elemen -> silhouette tidak terdefinisi -> 0
        }

        // a(i): rata-rata jarak ke titik lain dalam cluster yang sama.
        // Baris i kontigu di memori -> baca berurutan -> ramah cache.
        let a_i: f64 = same
            .iter()
            .filter(|&&j| j != i)
            .map(|&j| dist[[i, j]])
            .sum::<f64>()
            / (same.len() - 1) as f64;

        // b(i): rata-rata jarak minimum ke cluster lain.
        let mut b_i = f64::INFINITY;
        for c in 0..k {
            if c == ci {
                continue;
            }
            let other = &cluster_indices[c];
            if other.is_empty() {
                continue;
            }
            let avg = other.iter().map(|&j| dist[[i, j]]).sum::<f64>()
                / other.len() as f64;
            if avg < b_i {
                b_i = avg;
            }
        }

        if b_i < f64::INFINITY {
            let denom = a_i.max(b_i);
            scores[i] = if denom == 0.0 { 0.0 } else { (b_i - a_i) / denom };
        }
    }
    scores
}

#[cfg(not(feature = "threading"))]
pub(crate) fn build_distance_matrix(data: &[Vec<f64>], metric: &DistanceMetric) -> Array2<f64> {
    let n = data.len();
    let mut dist = Array2::<f64>::zeros((n, n));

    for i in 0..n {
        for j in (i + 1)..n {
            let d = calculate_distance(&data[i], &data[j], metric);
            dist[[i, j]] = d;
            dist[[j, i]] = d;
        }
    }

    dist
}

#[cfg(feature = "threading")]
pub(crate) fn build_distance_matrix(data: &[Vec<f64>], metric: &DistanceMetric) -> Array2<f64> {
    use rayon::prelude::*;
    let n = data.len();

    let pairs: Vec<(usize, usize, f64)> = (0..n)
        .into_par_iter()
        .flat_map(|i| {
            ((i + 1)..n)
                .map(|j| (i, j, calculate_distance(&data[i], &data[j], metric)))
                .collect::<Vec<_>>()
        })
        .collect();

    let mut dist = Array2::<f64>::zeros((n, n));
    for (i, j, d) in pairs {
        dist[[i, j]] = d;
        dist[[j, i]] = d;
    }
    dist
}

impl From<PAMResult> for ClusteringResult {
    fn from(pam_result: PAMResult) -> Self {
        ClusteringResult {
            cluster_assignments: pam_result.assignments,
            medoid_indices: pam_result.medoids,
            total_cost: pam_result.total_cost,
            iterations: pam_result.iterations,
            converged: pam_result.converged,
        }
    }
}
