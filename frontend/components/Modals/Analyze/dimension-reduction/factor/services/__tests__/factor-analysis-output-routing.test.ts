import {resultFactorAnalysis} from "../factor-analysis-output";

const addLog = jest.fn().mockResolvedValue("log-1");
const addAnalytic = jest.fn().mockResolvedValue("analytic-1");
const addStatistic = jest.fn().mockResolvedValue(undefined);
const addVariableColumns = jest.fn().mockResolvedValue({
    startColumnIndex: 10,
    endColumnIndex: 10,
});
const registerVariableMetadata = jest.fn().mockResolvedValue(undefined);
const saveVariables = jest.fn().mockResolvedValue(undefined);

jest.mock("@/stores/useResultStore", () => ({
    useResultStore: {
        getState: jest.fn(() => ({
            addLog,
            addAnalytic,
            addStatistic,
        })),
    },
}));

jest.mock("@/stores/useDataStore", () => ({
    useDataStore: {
        getState: jest.fn(() => ({
            addVariableColumns,
        })),
    },
}));

jest.mock("@/stores/useVariableStore", () => ({
    useVariableStore: {
        getState: jest.fn(() => ({
            variables: [{ name: "FAC1_1" }],
            registerVariableMetadata,
            saveVariables,
        })),
    },
}));

jest.mock("../factor-log-generator", () => ({
    generateFactorAnalysisLog: jest.fn(() => "FACTOR LOG"),
}));

function makeTable(key: string, title: string) {
    return {
        key,
        title,
        interpretation: `${title} description`,
        columnHeaders: [],
        rows: [],
    };
}

function buildFormattedResult(status: { isConverged: boolean; extractedFactors: number }) {
    return {
        tables: [
            makeTable("descriptive_statistics", "Descriptive Statistics"),
            makeTable("correlation_matrix", "Correlation Matrix"),
            makeTable("total_variance_explained", "Total Variance Explained"),
            makeTable("component_matrix", "Factor Matrixᵃ"),
            makeTable("goodness_of_fit_test", "Goodness-of-fit Test"),
            makeTable("reproduced_correlations", "Reproduced Correlations"),
            makeTable("rotated_component_matrix", "Rotated Factor Matrixᵃ"),
            makeTable("component_transformation_matrix", "Factor Transformation Matrix"),
            makeTable("pattern_matrix", "Pattern Matrixᵃ"),
            makeTable("structure_matrix", "Structure Matrix"),
            makeTable("component_correlation_matrix", "Factor Correlation Matrix"),
            makeTable("component_score_coefficient_matrix", "Factor Score Coefficient Matrix"),
            makeTable("component_score_covariance_matrix", "Factor Score Covariance Matrix"),
        ],
        analysisStatus: {
            isConverged: status.isConverged,
            extractedFactors: status.extractedFactors,
            terminatedEarly: !status.isConverged,
            terminationReason: status.isConverged ? undefined : "Extraction terminated before convergence.",
        },
        screePlotChart: {
            component_numbers: [1, 2],
            eigenvalues: [2.3, 0.7],
        },
        loadingPlotChart: {
            axis_labels: ["Component 1", "Component 2"],
            loadings: [[0.8, 0.1]],
        },
        factorScores: [
            {
                variable_name: "FAC1_1",
                values: [0.2, 0.4],
            },
        ],
    };
}

const baseConfigData = {
    extraction: {
        Method: "MaxLikelihood",
        Scree: false,
        Covariance: false,
        Correlation: true,
    },
    scores: {
        DisplayFactor: true,
        SaveVar: true,
    },
    rotation: {
        loading_plot: true,
    },
};

describe("resultFactorAnalysis routing", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("suppresses later-stage tables and factor-score writes when extraction does not converge", async () => {
        await resultFactorAnalysis({
            formattedResult: buildFormattedResult({ isConverged: false, extractedFactors: 0 }),
            configData: baseConfigData as any,
        } as any);

        const titles = addStatistic.mock.calls.map(([, payload]) => payload.title);

        expect(titles).toContain("Descriptive Statistics");
        expect(titles).toContain("Correlation Matrix");
        expect(titles).toContain("Total Variance Explained");
        expect(titles).toContain("Factor Matrixᵃ");
        expect(titles).not.toContain("Goodness-of-fit Test");
        expect(titles).not.toContain("Reproduced Correlations");
        expect(titles).not.toContain("Rotated Factor Matrixᵃ");
        expect(titles).not.toContain("Factor Transformation Matrix");
        expect(titles).not.toContain("Pattern Matrix");
        expect(titles).not.toContain("Structure Matrix");
        expect(titles).not.toContain("Factor Correlation Matrix");
        expect(titles).not.toContain("Factor Score Coefficient Matrix");
        expect(titles).not.toContain("Factor Score Covariance Matrix");
        expect(titles).not.toContain("Loading Plot");

        expect(addVariableColumns).not.toHaveBeenCalled();
        expect(registerVariableMetadata).not.toHaveBeenCalled();
        expect(saveVariables).not.toHaveBeenCalled();
    });

    it("renders later-stage tables and saves scores when extraction converges, even for ML", async () => {
        await resultFactorAnalysis({
            formattedResult: buildFormattedResult({ isConverged: true, extractedFactors: 2 }),
            configData: baseConfigData as any,
        } as any);

        const titles = addStatistic.mock.calls.map(([, payload]) => payload.title);

        expect(titles).toContain("Goodness-of-fit Test");
        expect(titles).toContain("Reproduced Correlations");
        expect(titles).toContain("Rotated Factor Matrixᵃ");
        expect(titles).toContain("Factor Transformation Matrix");
        expect(titles).toContain("Pattern Matrix");
        expect(titles).toContain("Structure Matrix");
        expect(titles).toContain("Factor Correlation Matrix");
        expect(titles).toContain("Factor Score Coefficient Matrix");
        expect(titles).toContain("Factor Score Covariance Matrix");
        expect(titles).toContain("Loading Plot");

        expect(addVariableColumns).toHaveBeenCalledTimes(1);
        expect(registerVariableMetadata).toHaveBeenCalledTimes(1);
        expect(saveVariables).toHaveBeenCalledTimes(1);
    });
});
