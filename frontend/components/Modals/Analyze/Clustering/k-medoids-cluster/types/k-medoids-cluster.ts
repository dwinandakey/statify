import type React from "react";
import type { Variable } from "@/types/Variable";

export enum KMedoidsMethod {
    PAM = "PAM",
    CLARA = "CLARA",
    CLARANS = "CLARANS",
}

export enum DistanceMetric {
    Euclidean = "euclidean",
    Manhattan = "manhattan",
}

export enum InitialMedoidsStrategy {
    Random = "random",
    KMeansPlusPlus = "kmeans++",
    FirstK = "first_k",
    UserDefined = "user_defined",
}

export enum EvaluationMetric {
    Silhouette = "silhouette",
    DaviesBouldin = "davies_bouldin",
    DunnIndex = "dunn_index",
}

export enum ClusterMode {
    Manual = "manual",
    Automatic = "automatic",
}

export enum AutoKMethod {
    Silhouette = "silhouette",
    Elbow = "elbow",
}

export enum NormalizationMethod {
    None = "none",
    ZScore = "zscore",
    MinMax = "minmax",
}

export enum MissingValueMethod {
    Listwise = "listwise",
    Median = "median",
    Knn = "knn",
}

export type SeedMode = "default" | "random" | "custom";

export type KMedoidsClusterMainType = {
    TargetVar: string[] | null;
    CaseTarget: string | null;
    IterateClassify: boolean;
    ClassifyOnly: boolean;
    ClusterMode: ClusterMode;
    Cluster: number | null;
    AutoKMin: number | null;
    AutoKMax: number | null;
    AutoKMethod: AutoKMethod;
    DistanceMetric: DistanceMetric;
    OpenDataset: boolean;
    ExternalDatafile: boolean;
    NewDataset: boolean;
    DataFile: boolean;
    OpenDatasetMethod: string | null;
    NewData: string | null;
};

export type KMedoidsClusterDialogProps = {
    updateFormData: (
        field: keyof KMedoidsClusterMainType,
        value: string[] | string | boolean | number | ClusterMode | AutoKMethod | DistanceMetric | null
    ) => void;
    data: KMedoidsClusterMainType;
    globalVariables: Variable[];
};

export type KMedoidsClusterIterateType = {
    Method: KMedoidsMethod;
    InitialStrategy: InitialMedoidsStrategy;
    MaximumIterations: number | null;
    ConvergenceCriterion: number | null;
    SeedMode: SeedMode;
    RandomSeed: number | null;
    NumberOfInitializations: number | null;
    SampleSize: number | null;
    NumSamples: number | null;
    NumLocal: number | null;
    MaxNeighbor: number | null;
    Standardize: boolean;
    NormalizationMethod: NormalizationMethod;
};

export type KMedoidsClusterIterateProps = {
    updateFormData: (
        field: keyof KMedoidsClusterIterateType,
        value: string | boolean | number | null
    ) => void;
    data: KMedoidsClusterIterateType;
    mainData: KMedoidsClusterMainType;
    validRowCount?: number;
};

export type KMedoidsClusterResultsType = {
    ShowFinalMedoids: boolean;
    ShowClusterMedoids: boolean;
    ShowClusterMembership: boolean;
    ShowCaseCount: boolean;
    ShowIterationHistory: boolean;
    ShowTotalCost: boolean;
    ShowConvergenceAlgorithm: boolean;
    ShowConvergenceChart: boolean;
    ShowSamplingHistory: boolean;
};

export type KMedoidsClusterResultsProps = {
    updateFormData: (
        field: keyof KMedoidsClusterResultsType,
        value: boolean | null
    ) => void;
    data: KMedoidsClusterResultsType;
    iterateData: KMedoidsClusterIterateType;
};

export type KMedoidsClusterEvaluationType = {
    ComputeSilhouette: boolean;
    ShowSilhouettePlot: boolean;
    ShowElbowPlot: boolean;
    ShowOptimalKChart: boolean;
    ShowOptimalKTable: boolean;
    ShowOverallQualityAssessment: boolean;
};

export type KMedoidsClusterEvaluationProps = {
    updateFormData: (
        field: keyof KMedoidsClusterEvaluationType,
        value: boolean | null
    ) => void;
    data: KMedoidsClusterEvaluationType;
};

export type KMedoidsClusterSaveType = {
    ClusterMembership: boolean;
    DistanceClusterCenter: boolean;
};

export type KMedoidsClusterSaveProps = {
    updateFormData: (
        field: keyof KMedoidsClusterSaveType,
        value: string | boolean | null
    ) => void;
    data: KMedoidsClusterSaveType;
};

export type KMedoidsClusterOptionsType = {
    InitialCluster: boolean;
    ClusterInfo: boolean;
    ShowPCAProjection: boolean;
    ShowClusterScatterPlot: boolean;
    ShowClusterSizeDistribution: boolean;
    ShowDistanceMatrixBetweenMedoids: boolean;
    ShowDistanceMatrixTable: boolean;
    ShowOptimalKChart?: boolean;
    ShowConvergenceChart?: boolean;
    MissingValueMethod: MissingValueMethod;
    Standardize: boolean;
    NormalizationMethod: NormalizationMethod;
};

export type KMedoidsMissingStats = {
    rowsWithMissing: number;
    totalRows: number;
    missingPercent: string;
    topVariables: string;
    remainingVariables: number;
};

export type KMedoidsClusterOptionsProps = {
    updateFormData: (
        field: keyof KMedoidsClusterOptionsType,
        value: string | boolean | null
    ) => void;
    data: KMedoidsClusterOptionsType;
    missingStats?: KMedoidsMissingStats | null;
};

export type KMedoidsClusterType = {
    main: KMedoidsClusterMainType;
    iterate: KMedoidsClusterIterateType;
    results: KMedoidsClusterResultsType;
    evaluation: KMedoidsClusterEvaluationType;
    save: KMedoidsClusterSaveType;
    options: KMedoidsClusterOptionsType;
};

export type KMedoidsClusterContainerProps = {
    onClose: () => void;
};