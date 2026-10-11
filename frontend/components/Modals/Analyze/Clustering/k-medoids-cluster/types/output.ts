import type { Table } from "@/types/Table";

export interface KMedoidsSummary {
    numClusters: number;
    totalCost: number;
    avgCost: number;
    buildCost?: number;
    swapCost?: number;
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

export interface MedoidInfo {
    clusterLabel: number;
    objectId: number;
    objectName?: string;
    attributes: Record<string, number | string>;
    standardizedAttributes?: Record<string, number>;
    clusterSize: number;
    withinClusterDistance: number;
}

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

export interface IterationHistory {
    iteration: number;
    totalCost: number;
    improvement: number;
    swapsMade: number;
    medoids?: number[];
}

export interface ElbowPoint {
    k: number;
    totalCost: number;
    silhouetteScore: number;
}

export interface MedoidDistanceMatrix {
    clusterLabels: number[];
    distances: number[][];
}

export interface DistanceMatrix {
    labels: string[];
    clusters: number[];
    distances: number[][];
}

export interface SilhouetteClusterScore {
    clusterLabel: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    count: number;
}

export interface ClaraConvergenceInfo {
    numSamples: number;
    sampleSize: number;
    bestTotalCost: number;
    bestCost?: number;
    bestSampleIndex?: number;
    samplingCosts?: number[];
    samples?: Array<{
        sampleIndex: number;
        sampleSize: number;
        cost: number;
        pamIterations: number;
    }>;
    medoidFrequency?: {
        objectId: string;
        frequency: number;
    }[];
}

export interface KMedoidsOutput {
    summary: KMedoidsSummary;
    assignments: ObjectAssignment[];
    medoids: MedoidInfo[];
    clusterProfiles: ClusterProfile[];
    iterationHistory: IterationHistory[];
    algorithmMethod?: string;
    normalizationMethod?: "none" | "zscore" | "minmax";
    claraConvergence?: ClaraConvergenceInfo;
    elbowData?: ElbowPoint[];
    optimalKMethod?: "silhouette" | "elbow";
    clusterMode?: "manual" | "automatic";
    autoKMethod?: "silhouette" | "elbow";
    medoidDistanceMatrix: MedoidDistanceMatrix;
    distanceMatrix?: DistanceMatrix;
    silhouetteScores: {
        overall: number;
        perCluster: SilhouetteClusterScore[];
        perObject: number[];
    };
    tables: Table[];
    visualizationOptions?: {
        showPCAProjection: boolean;
        showClusterScatterPlot: boolean;
        showClusterSizeDistribution: boolean;
        showDistanceMatrixBetweenMedoids: boolean;
        showDistanceMatrixTable: boolean;
        showClusterMedoids: boolean;
        showObjectAssignments: boolean;
        showCaseCount: boolean;
        showTotalCost: boolean;
        showIterationHistory: boolean;
        showSilhouettePerObject: boolean;
        showOptimalKChart: boolean;
        showOptimalKTable: boolean;
        showOverallQualityAssessment: boolean;
        showConvergenceAlgorithm: boolean;
        showSamplingHistory: boolean;
        showConvergenceChart: boolean;
    };
    variables?: Array<{ name: string; label?: string }>;
    viewMode?:
        | "full"
        | "clusterMembershipOnly"
        | "clusterSizeDistributionOnly"
        | "silhouettePerObjectOnly"
        | "optimalKChartOnly"
        | "overallQualityOnly"
        | "pcaProjectionOnly"
        | "clusterScatterPlotOnly"
        | "distanceMatrixTableOnly"
        | "convergenceAlgorithmOnly"
        | "convergenceChartOnly";
}

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

export interface KMedoidsOutputProps {
    data: KMedoidsOutput;
    variables: { name: string; label?: string }[];
}