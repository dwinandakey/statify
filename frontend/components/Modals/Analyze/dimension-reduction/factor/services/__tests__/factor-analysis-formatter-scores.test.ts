import { transformFactorAnalysisResult } from "../factor-analysis-formatter";

describe("transformFactorAnalysisResult - score matrix visibility", () => {
    const resultWithScoreMatrices = {
        analysis_status: {
            is_converged: true,
            extracted_factors: 2,
            terminated_early: false,
            termination_reason: null,
        },
        component_score_coefficient_matrix: {
            components: [
                { variable: "X1", values: [0.42, 0.11] },
                { variable: "X2", values: [0.25, 0.67] },
            ],
        },
        component_score_covariance_matrix: {
            components: [
                [1.0, 0.0],
                [0.0, 1.0],
            ],
        },
    };

    const getTableKeys = (configData: any) => {
        const result = transformFactorAnalysisResult(resultWithScoreMatrices, configData);
        return result.tables.map((table) => table.key);
    };

    it("shows both score matrices when DisplayFactor is enabled", () => {
        const configData = {
            extraction: { Method: "PrincipalComp" },
            scores: {
                SaveVar: false,
                DisplayFactor: true,
            },
        };

        const tableKeys = getTableKeys(configData);

        expect(tableKeys).toContain("component_score_coefficient_matrix");
        expect(tableKeys).toContain("component_score_covariance_matrix");
    });

    it("hides both score matrices when only SaveVar is enabled", () => {
        const configData = {
            extraction: { Method: "PrincipalComp" },
            scores: {
                SaveVar: true,
                DisplayFactor: false,
            },
        };

        const tableKeys = getTableKeys(configData);

        expect(tableKeys).not.toContain("component_score_coefficient_matrix");
        expect(tableKeys).not.toContain("component_score_covariance_matrix");
    });

    it("shows both score matrices when SaveVar and DisplayFactor are both enabled", () => {
        const configData = {
            extraction: { Method: "PrincipalComp" },
            scores: {
                SaveVar: true,
                DisplayFactor: true,
            },
        };

        const tableKeys = getTableKeys(configData);

        expect(tableKeys).toContain("component_score_coefficient_matrix");
        expect(tableKeys).toContain("component_score_covariance_matrix");
    });

    it("formats component score covariance values with 4 decimals and no scientific notation", () => {
        const configData = {
            extraction: { Method: "PrincipalComp" },
            scores: {
                SaveVar: false,
                DisplayFactor: true,
            },
        };

        const tinyCovarianceResult = {
            analysis_status: {
                is_converged: true,
                extracted_factors: 3,
                terminated_early: false,
                termination_reason: null,
            },
            component_score_covariance_matrix: {
                components: [
                    [1.0, -5.634e-15, 4.219e-15],
                    [-5.662e-15, 1.0, 1.804e-15],
                    [4.191e-15, 1.79e-15, 1.0],
                ],
            },
        };

        const result = transformFactorAnalysisResult(tinyCovarianceResult, configData as any);
        const covarianceTable = result.tables.find(
            (table) => table.key === "component_score_covariance_matrix"
        );

        expect(covarianceTable).toBeDefined();
        expect(covarianceTable?.rows[0]?.component_1).toBe("1.0000");
        expect(covarianceTable?.rows[0]?.component_2).toBe(".0000");
        expect(covarianceTable?.rows[0]?.component_3).toBe(".0000");
        expect(covarianceTable?.rows[1]?.component_1).toBe(".0000");
        expect(covarianceTable?.rows[2]?.component_2).toBe(".0000");
    });
});