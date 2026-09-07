/**
 * K-Medoids Clustering Output Types
 * Comprehensive structure for all analysis results
 */

import type { Table } from "@/types/Table";

/**
 * Summary statistics for K-Medoids clustering
 */
export interface KMedoidsSummary {
    numClusters: number;
    totalCost: number;
    /** Objective average cost shown as primary metric: totalCost / numCases. */
    avgCost: number;
    /** Cost after the BUILD phase (initial medoid selection), before any SWAP. */
    buildCost?: number;
    /** Cost after the SWAP phase converges — same as totalCost. */
    swapCost?: number;
    /** Convergence tolerance/criterion used by the algorithm (from iterate settings). */
    convergenceTolerance?: number;
    averageSilhouetteScore: number;
    totalIterations: number;
    converged: boolean;
    largestCluster: {
        id: number;
        size: number;
    };
    smallestCluster: {
        id: number;
        size: number;
    };
    numCases: number;
    numVariables: number;
}

/**
 * Object assignment with detailed information
 */
export interface ObjectAssignment {
    objectId: number;
    objectName?: string;
    clusterLabel: number;
    distanceToMedoid: number;
    isMedoid: boolean;
    silhouetteScore: number;
    attributes: Record<string, number | string>;
    standardizedAttributes?: Record<string, number>;
}

/**
 * Medoid information with full attributes
 */
export interface MedoidInfo {
    clusterLabel: number;
    objectId: number;
    objectName?: string;
    attributes: Record<string, number | string>;
    standardizedAttributes?: Record<string, number>;
    clusterSize: number;
    withinClusterDistance: number;
}

/**
 * Cluster profile and characteristics
 */
export interface ClusterProfile {
    clusterLabel: number;
    size: number;
    percentage: number;
    meanAttributes: Record<string, number>;
    medoidId: number;
    withinClusterDistance: number;
    silhouetteScore: number;
    descriptiveLabel?: string;
}

/**
 * Iteration history for convergence tracking
 */
export interface IterationHistory {
    iteration: number;
    totalCost: number;
    improvement: number;
    swapsMade: number;
    /** Medoid indices (0-based) active at this iteration step.
     *  [0] = initial medoids after BUILD; [i] = medoids after swap i. */
    medoids?: number[];
}

/**
 * Elbow method data point
 */
export interface ElbowPoint {
    k: number;
    totalCost: number;
    silhouetteScore: number;
}

/**
 * Distance matrix between medoids
 */
export interface MedoidDistanceMatrix {
    clusterLabels: number[];
    distances: number[][];
}

/**
 * Full distance matrix for all valid cases (sorted by cluster)
 */
export interface DistanceMatrix {
    labels: string[];
    clusters: number[];
    distances: number[][];
}

/**
 * Silhouette score details per cluster
 */
export interface SilhouetteClusterScore {
    clusterLabel: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    count: number;
}

/**
 * CLARA-specific convergence summary for output panel.
 */
export interface ClaraConvergenceInfo {
    numSamples: number;
    sampleSize: number;
    bestTotalCost: number;
    bestCost?: number;
    /** 1-based sample number with the best (minimum) cost. */
    bestSampleIndex?: number;
    /** Optional per-sampling costs, if available from runtime/build. */
    samplingCosts?: number[];
    /** Detailed sampling history with PAM iterations per sample. */
    samples?: Array<{
        sampleIndex: number;
        sampleSize: number;
        cost: number;
        pamIterations: number;
    }>;
    /** Medoid stability tracking: how often each object was selected as medoid across samples. */
    medoidFrequency?: {
        objectId: string;
        frequency: number;
    }[];
}

/**
 * Complete K-Medoids output data structure
 */
export interface KMedoidsOutput {
    // Core results
    summary: KMedoidsSummary;
    
    // Object assignments
    assignments: ObjectAssignment[];
    
    // Medoid information
    medoids: MedoidInfo[];
    
    // Cluster profiles
    clusterProfiles: ClusterProfile[];
    
    // Iteration history
    iterationHistory: IterationHistory[];

    // Algorithm metadata (for output routing)
    algorithmMethod?: string;

    // Normalization method used for preprocessing
    normalizationMethod?: "none" | "zscore" | "minmax";

    // CLARA convergence details (shown instead of PAM iteration panel)
    claraConvergence?: ClaraConvergenceInfo;
    
    // Elbow method (if automatic k)
    elbowData?: ElbowPoint[];

    // Method used for automatic k selection
    optimalKMethod?: "silhouette" | "elbow";

    // Cluster mode (manual or automatic k selection)
    clusterMode?: "manual" | "automatic";

    // Method used in automatic k selection (for routing chart display logic)
    autoKMethod?: "silhouette" | "elbow";
    
    // Distance matrix
    medoidDistanceMatrix: MedoidDistanceMatrix;

    // Full distance matrix (optional)
    distanceMatrix?: DistanceMatrix;
    
    // Silhouette scores
    silhouetteScores: {
        overall: number;
        perCluster: SilhouetteClusterScore[];
        perObject: number[];
    };
    
    // Raw data for tables
    tables: Table[];

    // Visualization options for renderer toggles
    visualizationOptions?: {
        showPCAProjection: boolean;
        showClusterScatterPlot: boolean;
        showClusterSizeDistribution: boolean;
        showClusterAttributeProfile: boolean;
        showDistanceMatrixBetweenMedoids: boolean;
        showDistanceMatrixTable: boolean;
        showClusterMedoids: boolean;
        showObjectAssignments: boolean;
        showCaseCount: boolean;
        showTotalCost: boolean;
        showIterationHistory: boolean;
        showSilhouettePerObject: boolean;
        showSilhouetteByCluster: boolean;
        showOptimalKChart: boolean;
        showOverallQualityAssessment: boolean;
        showConvergenceAlgorithm: boolean;
        showSamplingHistory: boolean;
    };
    
    // Variable information (for rendering)
    variables?: Array<{ name: string; label?: string }>;
}

/**
 * Chart data formats for visualizations
 */
export interface ClusterScatterData {
    x: number;
    y: number;
    cluster: number;
    objectId: number;
    isMedoid: boolean;
}

export interface ClusterDonutData {
    cluster: string;
    count: number;
    percentage: number;
}

export interface ClusterRadarData {
    attribute: string;
    [clusterKey: string]: number | string; // cluster_1, cluster_2, etc.
}

export interface ConvergenceLineData {
    iteration: number;
    cost: number;
}

export interface ElbowChartData {
    k: number;
    cost: number;
    silhouette?: number;
}

export interface SilhouetteBarData {
    cluster: string;
    score: number;
    interpretation: "Very Strong" | "Strong" | "Moderate" | "Weak";
}

/**
 * Props for K-Medoids output components
 */
export interface KMedoidsOutputProps {
    data: KMedoidsOutput;
    variables: { name: string; label?: string }[];
}