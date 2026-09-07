import type {
    KMedoidsClusterIterateType,
    KMedoidsClusterMainType,
    KMedoidsClusterOptionsType,
    KMedoidsClusterResultsType,
    KMedoidsClusterEvaluationType,
    KMedoidsClusterSaveType,
    KMedoidsClusterType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import {
    KMedoidsMethod,
    DistanceMetric,
    InitialMedoidsStrategy,
    ClusterMode,
    AutoKMethod,
    NormalizationMethod,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";

/**
 * ========================================
 * K-MEDOIDS DEFAULT VALUES
 * ========================================
 * Default values berdasarkan best practices clustering statistik
 */

export const KMedoidsClusterMainDefault: KMedoidsClusterMainType = {
    TargetVar: null,
    CaseTarget: null,
    IterateClassify: true,
    ClassifyOnly: false,
    // --- Mode pemilihan klaster ---
    ClusterMode: ClusterMode.Manual,
    Cluster: 2,
    AutoKMin: 2,
    AutoKMax: 10,
    AutoKMethod: AutoKMethod.Silhouette,
    // --- Ukuran jarak ---
    DistanceMetric: DistanceMetric.Euclidean, // Euclidean sebagai default standar
    OpenDataset: true,
    ExternalDatafile: false,
    NewDataset: true,
    DataFile: false,
    OpenDatasetMethod: null,
    NewData: null,
};

/**
 * Iterate defaults - mengikuti best practices PAM
 */
export const KMedoidsClusterIterateDefault: KMedoidsClusterIterateType = {
    Method: KMedoidsMethod.PAM, // PAM sebagai default (kualitas optimal)
    InitialStrategy: InitialMedoidsStrategy.Random, // Inisialisasi acak
    MaximumIterations: 300, // PAM biasanya konvergen dengan cepat
    ConvergenceCriterion: 0, // Berhenti jika tidak ada improvement
    SeedMode: "default",
    RandomSeed: null, // nilai digunakan hanya saat SeedMode = custom
    NumberOfInitializations: 10, // 10 inisialisasi untuk hasil optimal
    SampleSize: null, // Hanya untuk CLARA: akan di-set otomatis = 40 + 2*k
    NumSamples: 5, // Hanya untuk CLARA: jumlah iterasi sampling
    NumLocal: 2, // Hanya untuk CLARANS: jumlah local minima
    MaxNeighbor: null, // Hanya untuk CLARANS: akan di-set otomatis = max(250, 1.25% dari n*(k-1))
    Standardize: false, // Default: no normalization unless user selects
    NormalizationMethod: NormalizationMethod.None,
};

/**
 * Results defaults - tampilkan output utama
 */
export const KMedoidsClusterResultsDefault: KMedoidsClusterResultsType = {
    ShowFinalMedoids: true, // Wajib tampilkan (setara Final Cluster Centers)
    ShowClusterMedoids: true, // Tabel Cluster Medoids pada Data Tables
    ShowClusterMembership: true, // Wajib tampilkan (per kasus)
    ShowCaseCount: true, // Wajib tampilkan (Jumlah Kasus)
    ShowIterationHistory: false, // Detail opsional
    ShowTotalCost: true, // Metrik transparansi
    ShowConvergenceAlgorithm: true, // Default aktif: tampilkan tab & panel konvergensi algoritma
    ShowSamplingHistory: true, // Default aktif: tampilkan histori sampling khusus untuk CLARA
};

/**
 * Evaluation defaults - minimal Silhouette wajib
 */
export const KMedoidsClusterEvaluationDefault: KMedoidsClusterEvaluationType = {
    ComputeSilhouette: true,   // Wajib (pengganti ANOVA untuk clustering)
    ShowSilhouettePlot: false, // Opsional: visualisasi bar-chart silhouette per kasus
    ShowSilhouetteByCluster: true, // Opsional: panel ringkas silhouette per klaster
    ShowElbowPlot: false,      // Opsional: grafik SSE vs k (Metode Elbow)
    ShowOptimalKChart: false,  // Opsional: gabungan chart Silhouette + Elbow
    ShowOverallQualityAssessment: true, // Opsional: ringkasan kualitas clustering secara keseluruhan
};

export const KMedoidsClusterSaveDefault: KMedoidsClusterSaveType = {
    ClusterMembership: false,
    DistanceClusterCenter: false,
};

export const KMedoidsClusterOptionsDefault: KMedoidsClusterOptionsType = {
    InitialCluster: true, // Tampilkan medoid awal
    ClusterInfo: false, // Detail opsional per kasus
    ShowPCAProjection: true, // Tampilkan PCA Projection di hasil visualisasi
    ShowClusterScatterPlot: false, // Default nonaktif: tampilkan hanya jika dipilih pengguna
    ShowClusterSizeDistribution: false, // Default nonaktif: tampilkan hanya jika dipilih pengguna
    ShowClusterAttributeProfile: false, // Default nonaktif: tampilkan hanya jika dipilih pengguna
    ShowDistanceMatrixBetweenMedoids: false, // Default nonaktif: tampilkan hanya jika dipilih pengguna
    ShowDistanceMatrixTable: false, // Default nonaktif: tampilkan hanya jika dipilih pengguna
    ExcludeListWise: true, // Default: penghapusan listwise
    ExcludePairWise: false,
    Standardize: false, // Default: tanpa normalisasi kecuali dipilih pengguna
    NormalizationMethod: NormalizationMethod.None,
};

export const KMedoidsClusterDefault: KMedoidsClusterType = {
    main: KMedoidsClusterMainDefault,
    iterate: KMedoidsClusterIterateDefault,
    results: KMedoidsClusterResultsDefault,
    evaluation: KMedoidsClusterEvaluationDefault,
    save: KMedoidsClusterSaveDefault,
    options: KMedoidsClusterOptionsDefault,
};
