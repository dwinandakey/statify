import { transformFactorAnalysisResult } from "../factor-analysis-formatter";

describe("transformFactorAnalysisResult - total variance visibility", () => {
    const baseConfig = {
        extraction: { Method: "PrincipalComp" },
        scores: { DisplayFactor: false, SaveVar: false },
    };

    const makeResult = (isConverged: boolean) => ({
        analysis_status: {
            is_converged: isConverged,
            extracted_factors: isConverged ? 2 : 0,
            terminated_early: !isConverged,
            termination_reason: isConverged ? null : "Extraction terminated before convergence.",
        },
        total_variance_explained: {
            initial: {
                headers: ["Total", "% of Variance", "Cumulative %"],
                rows: [
                    [2.4, 24.0, 24.0],
                    [1.6, 16.0, 40.0],
                ],
            },
            extraction: {
                headers: ["Total", "% of Variance", "Cumulative %"],
                rows: [
                    [2.4, 24.0, 24.0],
                    [1.6, 16.0, 40.0],
                ],
            },
            rotation: {
                headers: ["Total", "% of Variance", "Cumulative %"],
                rows: [
                    [2.0, 20.0, 20.0],
                    [2.0, 20.0, 40.0],
                ],
            },
        },
    });

    it("shows only Initial Eigenvalues when extraction is not successful", () => {
        const result = transformFactorAnalysisResult(makeResult(false), baseConfig as any);
        const table = result.tables.find((entry) => entry.key === "total_variance_explained");

        expect(table).toBeDefined();
        expect(table?.columnHeaders.some((header) => header.header === "Extraction Sums of Squared Loadings")).toBe(false);
        expect(table?.columnHeaders.some((header) => header.header === "Rotation Sums of Squared Loadings")).toBe(false);
        expect(table?.interpretation).toContain("did not converge");
        expect(table?.rows[0].initial_0).toBeDefined();
        expect(table?.rows[0].extraction_0).toBeUndefined();
        expect(table?.rows[0].rotation_0).toBeUndefined();
    });

    it("shows extraction and rotation columns when extraction is successful", () => {
        const result = transformFactorAnalysisResult(makeResult(true), baseConfig as any);
        const table = result.tables.find((entry) => entry.key === "total_variance_explained");

        expect(table).toBeDefined();
        expect(table?.columnHeaders.some((header) => header.header === "Extraction Sums of Squared Loadings")).toBe(true);
        expect(table?.columnHeaders.some((header) => header.header === "Rotation Sums of Squared Loadings")).toBe(true);
        expect(table?.rows[0].extraction_0).toBeDefined();
        expect(table?.rows[0].rotation_0).toBeDefined();
    });

    it("adds the selection filter description to every output table", () => {
        const result = transformFactorAnalysisResult(makeResult(true), {
            ...baseConfig,
            main: { ValueTarget: "Attrition" },
            value: { Selection: "Yes" },
        } as any);

        expect(result.tables.length).toBeGreaterThan(0);
        result.tables.forEach((table) => {
            expect(table.interpretation).toContain(
                'This analysis stage processes only data with a Attrition value of "Yes".'
            );
            expect(table.interpretation).not.toContain(
                '<br><br>This analysis stage processes only data'
            );
        });
    });

    it("does not add a selection description when no filter is configured", () => {
        const result = transformFactorAnalysisResult(makeResult(true), baseConfig as any);

        result.tables.forEach((table) => {
            expect(table.interpretation ?? "").not.toContain(
                "This analysis stage processes only data"
            );
        });
    });
});