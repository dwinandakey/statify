/** @jest-environment node */

import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import init, {
    KNNAnalysis,
} from "@/components/Modals/Analyze/Classify/nearest-neighbor/rust/pkg/wasm";

type PerformanceSummary = {
    rowCount: number;
    featureCount: number;
    runs: number;
    minimumMs: number;
    maximumMs: number;
    averageMs: number;
    medianMs: number;
};

type PerformanceResult = {
    metadata: {
        generatedAt: string;
        warmupRuns: number;
        measuredRuns: number;
        rowCounts: number[];
        featureCounts: number[];
    };
    results: Record<
        number,
        Record<
            number,
            {
                executionTimesMs: number[];
                summary: PerformanceSummary;
            }
        >
    >;
};

const performanceResultsPath = path.join(
    __dirname,
    "performance-results-constructor-all-runs.json"
);

const parseNumberList = (value: string | undefined, fallback: number[]) =>
    value
        ? value
              .split(",")
              .map(Number)
              .filter((item) => Number.isFinite(item) && item > 0)
        : fallback;

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const variableDefinition = (name: string, columnIndex: number) => ({
    id: columnIndex + 1,
    columnIndex,
    name,
    type: "NUMERIC",
    width: 8,
    decimals: 2,
    label: `Variable ${name}`,
    values: [],
    missing: [],
    columns: 8,
    align: "right",
    measure: "scale",
    role: "input",
});

const generateDummyData = (rowCount: number, featureCount: number) => {
    const featureNames = Array.from(
        { length: featureCount },
        (_, index) => `VAR${index + 1}`
    );
    const targetData = [
        Array.from({ length: rowCount }, (_, rowIndex) => ({
            target: (rowIndex % 10) + 1,
        })),
    ];
    const featuresData = featureNames.map((featureName, featureIndex) =>
        Array.from({ length: rowCount }, (_, rowIndex) => ({
            [featureName]:
                ((rowIndex + 1) * (featureIndex + 3) + featureIndex * 7) % 101,
        }))
    );

    return {
        targetData,
        featuresData,
        targetDefs: [[variableDefinition("target", 0)]],
        featuresDefs: featureNames.map((name, index) => [
            variableDefinition(name, index + 1),
        ]),
        featureNames,
    };
};

const createConfig = (featureNames: string[]) => ({
    main: {
        TargetVar: "target",
        FeatureVar: featureNames,
        CaseIdenVar: null,
        FocalCaseIdenVar: null,
        NormCovar: true,
    },
    neighbors: {
        Specify: true,
        AutoSelection: false,
        SpecifyK: 3,
        MinK: null,
        MaxK: null,
        MetricEucli: true,
        MetricManhattan: false,
        Weight: false,
        PredictionsMean: true,
        PredictionsMedian: false,
    },
    features: {
        ForwardSelection: null,
        ForcedEntryVar: null,
        FeaturesToEvaluate: 0,
        ForcedFeatures: 0,
        PerformSelection: false,
        MaxReached: true,
        BelowMin: false,
        MaxToSelect: null,
        MinChange: 0.01,
    },
    partition: {
        SrcVar: null,
        PartitioningVariable: null,
        UseRandomly: false,
        UseVariable: false,
        VFoldPartitioningVariable: null,
        VFoldUseRandomly: false,
        VFoldUsePartitioningVar: false,
        TrainingNumber: 70,
        NumPartition: 10,
        SetSeed: false,
        Seed: null,
    },
    save: {
        AutoName: true,
        CustomName: false,
        MaxCatsToSave: null,
        HasTargetVar: false,
        IsCateTargetVar: false,
        RandomAssignToPartition: false,
        RandomAssignToFold: false,
    },
    output: {
        CaseSummary: false,
        FeatureSelectionSummary: false,
        KSelectionChart: false,
        PredictorSpace: false,
        PredictionResults: false,
        ConfusionMatrix: false,
        ShowNeighborDetail: false,
        ChartAndTable: true,
        ExportModelXML: false,
        XMLFilePath: null,
        ExportDistance: false,
        CreateDataset: false,
        WriteDataFile: false,
        NewDataFilePath: null,
        DatasetName: null,
    },
});

const createAnalysis = (
    dummyData: ReturnType<typeof generateDummyData>,
    config: ReturnType<typeof createConfig>
) =>
    new KNNAnalysis(
        dummyData.targetData,
        dummyData.featuresData,
        [],
        null,
        dummyData.targetDefs,
        dummyData.featuresDefs,
        [],
        null,
        config
    );

const summarize = (
    rowCount: number,
    featureCount: number,
    executionTimesMs: number[]
): PerformanceSummary => {
    const sorted = [...executionTimesMs].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    const medianMs =
        sorted.length % 2 === 0
            ? (sorted[middle - 1] + sorted[middle]) / 2
            : sorted[middle];

    return {
        rowCount,
        featureCount,
        runs: executionTimesMs.length,
        minimumMs: sorted[0],
        maximumMs: sorted[sorted.length - 1],
        averageMs:
            executionTimesMs.reduce((total, value) => total + value, 0) /
            executionTimesMs.length,
        medianMs,
    };
};

describe("KNNAnalysis Constructor Performance Test", () => {
    const ROW_COUNTS = parseNumberList(
        process.env.KNN_PERF_ROW_COUNTS,
        [10, 100, 1000]
    );
    const FEATURE_COUNTS = parseNumberList(
        process.env.KNN_PERF_FEATURE_COUNTS,
        [5, 10]
    );
    const NUM_RUNS = parsePositiveInteger(process.env.KNN_PERF_RUNS, 100);
    const WARMUP_RUNS = parsePositiveInteger(process.env.KNN_PERF_WARMUP_RUNS, 3);
    const performanceResults: PerformanceResult = {
        metadata: {
            generatedAt: "",
            warmupRuns: WARMUP_RUNS,
            measuredRuns: NUM_RUNS,
            rowCounts: ROW_COUNTS,
            featureCounts: FEATURE_COUNTS,
        },
        results: {},
    };

    beforeAll(async () => {
        const wasmPath = path.resolve(__dirname, "../rust/pkg/wasm_bg.wasm");
        const wasmBuffer = fs.readFileSync(wasmPath);
        await init({ module_or_path: wasmBuffer });
    }, 60000);

    afterAll(() => {
        performanceResults.metadata.generatedAt = new Date().toISOString();
        fs.writeFileSync(
            performanceResultsPath,
            JSON.stringify(performanceResults, null, 2)
        );
    });

    ROW_COUNTS.forEach((rowCount) => {
        describe(`dengan ${rowCount} baris`, () => {
            FEATURE_COUNTS.forEach((featureCount) => {
                test(`mengukur konstruktor untuk ${featureCount} feature selama ${NUM_RUNS} eksekusi`, () => {
                    const dummyData = generateDummyData(rowCount, featureCount);
                    const config = createConfig(dummyData.featureNames);

                    for (let run = 0; run < WARMUP_RUNS; run++) {
                        createAnalysis(dummyData, config).free();
                    }

                    const executionTimesMs: number[] = [];
                    for (let run = 0; run < NUM_RUNS; run++) {
                        const startTime = performance.now();
                        const analysis = createAnalysis(dummyData, config);
                        const endTime = performance.now();

                        analysis.free();
                        executionTimesMs.push(endTime - startTime);
                    }

                    performanceResults.results[rowCount] ??= {};
                    performanceResults.results[rowCount][featureCount] = {
                        executionTimesMs,
                        summary: summarize(
                            rowCount,
                            featureCount,
                            executionTimesMs
                        ),
                    };

                }, 300000);
            });
        });
    });
});
