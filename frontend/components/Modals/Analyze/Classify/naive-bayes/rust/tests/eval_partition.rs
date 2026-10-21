//! Tes tesis Track A (d) dan (e): pembagian stratified (holdout 70/30 dan k-fold) serta perilaku `KFolds = 1`.
//!
//! API yang diuji: `wasm::stats::partition::{stratified_train_holdout_split, stratified_k_fold,
//! training_test_split_for_fold, validate_fold_count}` (crate `wasm`, lib `wasm`; sama dengan yang dipakai
//! `wasm::wasm::function::run_analysis`).
//!
//! STATUS VERIFIKASI (jujur): `cargo test` penuh belum dijalankan (crate serde/wasm-bindgen tidak dapat diunduh di
//! sandbox). Sebagai gantinya berkas ini DIKOMPILASI dan DIJALANKAN dengan `rustc` 1.97 terhadap modul sumber asli
//! (`partition.rs`, `mersenne_twister.rs`, `classification_table.rs`, `prediction.rs`, `training.rs`, `class_prior.rs`,
//! `numerical_distribution.rs`, `categorical_distribution.rs`) lewat `#[path]`, dengan stub untuk bagian yang butuh
//! serde (`PreprocessedCase`, `NumericLikelihood`, `text_features`): pemeriksaan sandbox satu kali, lognya tidak disimpan sehingga BUKAN bukti resmi. Angka partisi eksak
//! (seed 42) dicocokkan dengan replika MT19937 di Python (`numpy.random.RandomState(42)` memberi keluaran awal yang
//! sama). Hasil resmi tetap berasal dari `cargo test --test eval_partition` di Windows.
//!
//! BUGS_A.md A-1 (KFolds = 1 diterima) SUDAH DIPERBAIKI: minimum fold kini 2, dan tes k1_* menegaskan penolakan.
//!
//! Sudah tercakup oleh tes inline `stats/partition.rs` (tidak diulang): holdout 80/20 (56/14), setiap indeks tepat
//! sekali, determinisme per seed, clamp persen di luar rentang, `validate_fold_count` (1/0/-3 diblok, folds > instance
//! diblok, peringatan, tanpa peringatan, 0 instance), k-fold menyekat tiap indeks tepat sekali, 3 kelas x 20 pada
//! 5 fold = 4 per kelas per fold, peringatan bila fold > kelas terkecil, `training_test_split_for_fold`.

use std::collections::HashMap;

use wasm::models::data::PreprocessedCase;
use wasm::stats::classification_table::compute_evaluation_metrics;
use wasm::stats::mersenne_twister::MersenneTwister;
use wasm::stats::partition::{
    stratified_k_fold, stratified_train_holdout_split, training_test_split_for_fold, validate_fold_count,
};
use wasm::stats::prediction::predict_case;
use wasm::stats::training::train_naive_bayes_model;

const SEEDS: [i64; 3] = [42, 1, 2024];

/// Label berurutan per kelas: `labels(&[("A", 3), ("B", 2)])` = A A A B B.
fn labels(spec: &[(&str, usize)]) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for (class, count) in spec {
        for _ in 0..*count {
            out.push(class.to_string());
        }
    }
    out
}

fn count_class(indices: &[usize], class_labels: &[String], class: &str) -> usize {
    indices.iter().filter(|&&i| class_labels[i] == class).count()
}

/// Pembulatan setengah-ke-atas dengan aritmetika bilangan bulat (independen dari float): round(pct% x n).
fn expected_train(n: usize, pct: usize) -> usize {
    (pct * n + 50) / 100
}

// ════════════════ (d) Holdout stratified 70/30 ════════════════════════════

/// Spesifikasi kelas yang menghindari hasil kali pas-setengah (mis. 70% x 5 = 3.5) agar pembulatan tak ambigu.
fn spesifikasi_holdout() -> Vec<Vec<(&'static str, usize)>> {
    vec![
        vec![("A", 80), ("B", 20)],
        vec![("A", 50), ("B", 30), ("C", 20)],
        vec![("pos", 120), ("neg", 60), ("neu", 20)],
        vec![("A", 13), ("B", 7), ("C", 3)],
        vec![("A", 12), ("B", 8), ("C", 9), ("D", 11)],
    ]
}

#[test]
fn holdout_70_30_jumlah_training_tiap_kelas_sama_dengan_pembulatan_70_persen() {
    for spec in spesifikasi_holdout() {
        let ls = labels(&spec);
        for seed in SEEDS {
            let split = stratified_train_holdout_split(&ls, 70, Some(seed));
            for (class, n) in &spec {
                let tr = count_class(&split.training_indices, &ls, class);
                let ho = count_class(&split.holdout_indices, &ls, class);
                assert_eq!(tr, expected_train(*n, 70), "kelas {} dari {}, seed {}", class, n, seed);
                assert_eq!(tr + ho, *n, "kelas {}: training + holdout = jumlah kelas", class);
            }
        }
    }
}

#[test]
fn holdout_70_30_proporsi_tiap_kelas_menyimpang_paling_banyak_setengah_data_dari_70_persen() {
    for spec in spesifikasi_holdout() {
        let ls = labels(&spec);
        let split = stratified_train_holdout_split(&ls, 70, Some(42));
        for (class, n) in &spec {
            let tr = count_class(&split.training_indices, &ls, class) as f64;
            let n = *n as f64;
            assert!(
                (tr - 0.7 * n).abs() <= 0.5 + 1e-9,
                "kelas {}: training {} dari {} menyimpang > 0.5 data dari 70%",
                class,
                tr,
                n
            );
        }
        // Proporsi keseluruhan: simpangan total <= setengah data per kelas.
        let total = ls.len() as f64;
        let tr_total = split.training_indices.len() as f64;
        assert!((tr_total - 0.7 * total).abs() <= 0.5 * spec.len() as f64 + 1e-9);
        assert_eq!(split.training_indices.len() + split.holdout_indices.len(), ls.len());
    }
}

#[test]
fn holdout_persentase_lain_80_20_dan_60_40() {
    let spec = [("A", 50usize), ("B", 30), ("C", 20)];
    let ls = labels(&spec);
    for pct in [80usize, 60] {
        let split = stratified_train_holdout_split(&ls, pct as i32, Some(42));
        for (class, n) in &spec {
            assert_eq!(
                count_class(&split.training_indices, &ls, class),
                expected_train(*n, pct),
                "kelas {} pada {}%",
                class,
                pct
            );
        }
    }
}

#[test]
fn holdout_kelas_beranggota_satu_masuk_training_dan_holdout_tidak_memuatnya() {
    // Karakterisasi (komentar kode: "70% dari 1 instance round -> 1 training, 0 holdout").
    let ls = labels(&[("besar", 10), ("langka", 1)]);
    let split = stratified_train_holdout_split(&ls, 70, Some(42));
    assert_eq!(count_class(&split.training_indices, &ls, "langka"), 1);
    assert_eq!(count_class(&split.holdout_indices, &ls, "langka"), 0);
    assert_eq!(count_class(&split.training_indices, &ls, "besar"), 7);
    assert_eq!(count_class(&split.holdout_indices, &ls, "besar"), 3);
}

/// Nilai acuan eksak (seed 42) dihitung dengan replika independen MT19937 + Fisher-Yates + `next_below` (rejection
/// sampling) di Python, lalu dicocokkan dengan keluaran kode Rust. Dua keluaran awal MT19937 seed 42 juga sama dengan
/// `numpy.random.RandomState(42).randint(0, 2**32, dtype=uint32)`.
#[test]
fn mt19937_seed_42_dua_keluaran_awal_sama_dengan_numpy() {
    let mut rng = MersenneTwister::new(42);
    assert_eq!(rng.next_u32(), 1_608_637_542);
    assert_eq!(rng.next_u32(), 3_421_126_067);
}

#[test]
fn holdout_70_seed_42_indeks_eksak_sama_dengan_replika_python() {
    // A x5 (indeks 0..4), B x5 (5..9): tiap kelas 70% -> round(3.5) = 4 training, 1 holdout.
    let ls = labels(&[("A", 5), ("B", 5)]);
    let split = stratified_train_holdout_split(&ls, 70, Some(42));
    assert_eq!(split.training_indices, vec![0, 1, 3, 4, 5, 7, 8, 9]);
    assert_eq!(split.holdout_indices, vec![2, 6]);

    // A x8 (0..7), B x4 (8..11): A round(5.6) = 6, B round(2.8) = 3.
    let ls = labels(&[("A", 8), ("B", 4)]);
    let split = stratified_train_holdout_split(&ls, 70, Some(42));
    assert_eq!(split.training_indices, vec![0, 1, 3, 4, 5, 7, 9, 10, 11]);
    assert_eq!(split.holdout_indices, vec![2, 6, 8]);
}

#[test]
fn kfold_seed_42_indeks_eksak_sama_dengan_replika_python() {
    let ls = labels(&[("A", 5), ("B", 5)]);
    let kf = stratified_k_fold(&ls, 3, Some(42)).expect("k-fold harus sukses");
    assert_eq!(kf.folds, vec![vec![3, 4, 7, 8], vec![0, 2, 5, 6], vec![1, 9]]);

    let ls = labels(&[("A", 8), ("B", 4)]);
    let kf = stratified_k_fold(&ls, 4, Some(42)).expect("k-fold harus sukses");
    assert_eq!(kf.folds, vec![vec![1, 5, 11], vec![0, 4, 10], vec![2, 3, 9], vec![6, 7, 8]]);
}

// ════════════════ (d) K-fold stratified ═══════════════════════════════════

fn spesifikasi_kfold() -> Vec<Vec<(&'static str, usize)>> {
    vec![
        vec![("A", 80), ("B", 20)],
        vec![("A", 23), ("B", 17), ("C", 10)],
        vec![("A", 37), ("B", 13), ("C", 5)],
        vec![("x", 11), ("y", 11), ("z", 11)],
    ]
}

#[test]
fn kfold_selisih_jumlah_per_kelas_antar_fold_paling_banyak_satu() {
    for spec in spesifikasi_kfold() {
        let ls = labels(&spec);
        for k in [2i32, 3, 5, 10] {
            for seed in SEEDS {
                let kf = stratified_k_fold(&ls, k, Some(seed)).expect("k-fold harus sukses");
                assert_eq!(kf.folds.len(), k as usize);
                for (class, n) in &spec {
                    let counts: Vec<usize> = kf.folds.iter().map(|f| count_class(f, &ls, class)).collect();
                    let lo = n / (k as usize);
                    let hi = (n + (k as usize) - 1) / (k as usize);
                    for c in &counts {
                        assert!(
                            *c >= lo && *c <= hi,
                            "kelas {} (n={}) pada k={}: jumlah per fold {:?} di luar [{}, {}]",
                            class,
                            n,
                            k,
                            counts,
                            lo,
                            hi
                        );
                    }
                    let maks = counts.iter().max().copied().unwrap_or(0);
                    let mins = counts.iter().min().copied().unwrap_or(0);
                    assert!(maks - mins <= 1, "kelas {} k={}: selisih {:?} > 1", class, k, counts);
                }
            }
        }
    }
}

#[test]
fn kfold_ukuran_total_fold_berselisih_paling_banyak_jumlah_kelas() {
    // Tiap kelas menyumbang floor(n_c/k) atau ceil(n_c/k) ke tiap fold, sehingga ukuran total fold berselisih
    // paling banyak sebanyak kelas (C). Klaim "selisih <= 1 data" berlaku PER KELAS, bukan untuk ukuran total.
    for spec in spesifikasi_kfold() {
        let ls = labels(&spec);
        for k in [2i32, 3, 5, 10] {
            let kf = stratified_k_fold(&ls, k, Some(42)).expect("k-fold harus sukses");
            let ukuran: Vec<usize> = kf.folds.iter().map(|f| f.len()).collect();
            let selisih = ukuran.iter().max().unwrap() - ukuran.iter().min().unwrap();
            assert!(selisih <= spec.len(), "k={} ukuran {:?} selisih {} > {} kelas", k, ukuran, selisih, spec.len());
        }
    }
}

#[test]
fn kfold_karakterisasi_ukuran_fold_tidak_seimbang_pada_tiga_kelas_sama_besar() {
    // 3 kelas x 11 data, k = 5: tiap kelas membagi 11 -> [3,2,2,2,2] ke fold 0..4 (round-robin dari offset 0),
    // sehingga fold 0 menerima 3 x 3 = 9 data, fold lain 3 x 2 = 6. Deterministik untuk seed apa pun.
    // Pembanding (dijalankan di sandbox, scikit-learn StratifiedKFold shuffle=True random_state=42):
    // ukuran fold [7, 7, 7, 6, 6]. Lihat BUGS_A.md (catatan informasional, bukan kegagalan perhitungan).
    let ls = labels(&[("x", 11), ("y", 11), ("z", 11)]);
    for seed in SEEDS {
        let kf = stratified_k_fold(&ls, 5, Some(seed)).expect("k-fold harus sukses");
        let ukuran: Vec<usize> = kf.folds.iter().map(|f| f.len()).collect();
        assert_eq!(ukuran, vec![9, 6, 6, 6, 6], "seed {}", seed);
    }
}

#[test]
fn kfold_k_sama_dengan_jumlah_instance_menghasilkan_fold_kosong_dan_peringatan() {
    // Karakterisasi: k = n = 6 pada kelas 3 + 3. Pembagian round-robin dimulai dari fold 0 untuk TIAP kelas, sehingga
    // kelas dengan 3 anggota hanya mengisi fold 0..2; fold 3..5 kosong (bukan leave-one-out). Ukuran = [2,2,2,0,0,0].
    // k = n masih sah menurut validate_fold_count (k <= n) dan memunculkan peringatan karena k > kelas terkecil.
    let ls = labels(&[("A", 3), ("B", 3)]);
    let kf = stratified_k_fold(&ls, 6, Some(42)).expect("k = n harus sah");
    assert_eq!(kf.folds.len(), 6);
    let ukuran: Vec<usize> = kf.folds.iter().map(|f| f.len()).collect();
    assert_eq!(ukuran, vec![2, 2, 2, 0, 0, 0]);
    assert!(kf.warning.is_some());
    // k = n + 1 diblok.
    assert!(stratified_k_fold(&ls, 7, Some(42)).is_err());
}

// ════════════════ (e) KFolds = 1 ══════════════════════════════════════════
//
// PERILAKU SETELAH PERBAIKAN (BUGS_A.md A-1, disetujui pemilik): batas minimum jumlah fold kini 2. k = 1 dulu diterima
// dan menghasilkan evaluasi dengan data latih KOSONG tanpa galat maupun peringatan; kini ditolak di dua lapis:
//   UI getNumericInputError menolak folds < 2 (hooks/useNaiveBayesValidation.ts:254-256)
//   -> validate_fold_count menolak folds < 2, folds > n_instance, dan n_instance = 0 (partition.rs:179-206)
//   -> stratified_k_fold(labels, 1, seed) mengembalikan Err sehingga run_analysis tidak pernah melatih model pada
//      0 baris (jalur lama: training_test_split_for_fold(&folds, 0) = (training KOSONG, test = semua indeks)).

#[test]
fn k1_ditolak_validate_fold_count() {
    for (n, kecil) in [(10usize, 3usize), (1, 1), (10, 1)] {
        let e = validate_fold_count(1, n, kecil).unwrap_err();
        assert!(e.contains("Number of folds must be at least 2 (got 1)."), "pesan sekarang: {}", e);
    }
    let e0 = validate_fold_count(0, 10, 3).unwrap_err();
    assert!(e0.contains("at least 2 (got 0)"), "pesan sekarang: {}", e0);
    // k = 2 adalah batas bawah yang sah.
    assert_eq!(validate_fold_count(2, 10, 3), Ok(None));
}

#[test]
fn k1_ditolak_stratified_k_fold() {
    let ls = labels(&[("A", 4), ("B", 6)]);
    let e = stratified_k_fold(&ls, 1, Some(42)).expect_err("k = 1 harus ditolak");
    assert!(e.contains("at least 2"), "{}", e);
}

#[test]
fn k2_sebagai_pembanding_fold_latih_tidak_kosong() {
    let ls = labels(&[("A", 4), ("B", 6)]);
    let kf = stratified_k_fold(&ls, 2, Some(42)).expect("k = 2 sah");
    for f in 0..2 {
        let (latih, uji) = training_test_split_for_fold(&kf.folds, f);
        assert!(!latih.is_empty());
        assert_eq!(latih.len() + uji.len(), ls.len());
    }
}

fn kasus(target: &str, outlook: &str, temp: f64) -> PreprocessedCase {
    let mut factors: HashMap<String, String> = HashMap::new();
    factors.insert("Outlook".to_string(), outlook.to_string());
    let mut covariates: HashMap<String, Option<f64>> = HashMap::new();
    covariates.insert("Temp".to_string(), Some(temp));
    PreprocessedCase {
        target_class: target.to_string(),
        factors,
        covariates,
    }
}

#[test]
fn k1_ditolak_dan_alasannya_fold_tunggal_melatih_pada_nol_baris() {
    // ALASAN PERBAIKAN A-1 (k = 1 kini ditolak; fold tunggal di bawah dibentuk MANUAL karena stratified_k_fold menolak
    // k = 1): bila dibiarkan, model dilatih
    // pada 0 baris -> prior semua kelas 0.0 (class_prior.rs),
    // Gaussian jatuh ke fallback mean 0 / variance = floor untuk semua kelas (numerical_distribution.rs),
    // distribusi kategorik kosong sehingga probabilitas = 0.0 (categorical_distribution.rs / prediction.rs).
    // `safe_ln` menaikkan 0 ke ln(MIN_POSITIVE), jadi skor tiap kelas SAMA dan berhingga. Argmax memakai
    // `score > best` pada kelas terurut alfabetis -> SEMUA prediksi = kelas alfabetis pertama ("No").
    // Akibatnya akurasi "cross-validation 1-fold" = proporsi kelas "No" (3/9), Kappa = 0, tanpa galat apa pun.
    let data: Vec<PreprocessedCase> = vec![
        kasus("Yes", "Sunny", 70.0),
        kasus("Yes", "Sunny", 72.0),
        kasus("Yes", "Rain", 74.0),
        kasus("Yes", "Overcast", 75.0),
        kasus("Yes", "Rain", 71.0),
        kasus("Yes", "Overcast", 73.0),
        kasus("No", "Sunny", 80.0),
        kasus("No", "Overcast", 82.0),
        kasus("No", "Rain", 90.0),
    ];
    let ls: Vec<String> = data.iter().map(|c| c.target_class.clone()).collect();
    let kelas = vec!["No".to_string(), "Yes".to_string()];
    let faktor = vec!["Outlook".to_string()];
    let kovariat = vec!["Temp".to_string()];

    assert!(stratified_k_fold(&ls, 1, Some(42)).is_err(), "k = 1 harus ditolak");
    // Fold tunggal hipotetis (perilaku lama sebelum perbaikan): satu fold berisi semua indeks.
    let folds: Vec<Vec<usize>> = vec![(0..ls.len()).collect()];
    let mut aktual: Vec<String> = Vec::new();
    let mut prediksi: Vec<String> = Vec::new();
    for fold in 0..folds.len() {
        let (latih, uji) = training_test_split_for_fold(&folds, fold);
        assert!(latih.is_empty());
        let kasus_latih: Vec<PreprocessedCase> = latih.iter().map(|&i| data[i].clone()).collect();
        let model = train_naive_bayes_model(&kasus_latih, &kelas, &faktor, &kovariat, 1.0, 1e-9);
        for &i in &uji {
            let hasil = predict_case(&model, &data[i], 1.0);
            for skor in hasil.scores.values() {
                assert!(skor.is_finite(), "skor non-hingga: {}", skor);
            }
            let skor_no = hasil.scores["No"];
            let skor_yes = hasil.scores["Yes"];
            assert!((skor_no - skor_yes).abs() < 1e-9, "fold tunggal: skor kedua kelas sama ({} vs {})", skor_no, skor_yes);
            aktual.push(data[i].target_class.clone());
            prediksi.push(hasil.predicted_class.expect("model punya kelas"));
        }
    }
    assert_eq!(aktual.len(), 9);
    assert!(prediksi.iter().all(|p| p == "No"), "fold tunggal: semua prediksi = 'No': {:?}", prediksi);

    let (_matriks, metrik) = compute_evaluation_metrics(&aktual, &prediksi, &kelas);
    assert!((metrik.overall_accuracy - 3.0 / 9.0).abs() < 1e-12, "akurasi = proporsi kelas 'No'");
    assert!(metrik.cohens_kappa.abs() < 1e-12, "kappa = 0 (po = pe)");
    for m in &metrik.per_class {
        assert!(m.precision.is_finite() && m.recall.is_finite() && m.f1.is_finite());
    }
}
