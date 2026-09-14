/**
 * Unit tests for Factor Analysis Output Helper Functions
 * Testing unique factor name generation logic
 */

describe("Factor Analysis Output - Unique Name Generation", () => {
    // Helper function extracted for testing
    function generateUniqueFactorNames(
        existingVariableNames: string[],
        factorScores: Array<{ variable_name: string; values: number[] }>
    ): Map<string, string> {
        const nameMap = new Map<string, string>();
        
        // Extract suffix numbers dari kolom existing yang match pattern FACx_y
        const factorPattern = /^FAC(\d+)_(\d+)$/;
        const maxSuffixByFactor = new Map<number, number>();
        
        for (const varName of existingVariableNames) {
            const match = varName.match(factorPattern);
            if (match) {
                const factorNum = parseInt(match[1]);
                const suffix = parseInt(match[2]);
                const currentMax = maxSuffixByFactor.get(factorNum) || 0;
                maxSuffixByFactor.set(factorNum, Math.max(currentMax, suffix));
            }
        }
        
        // Cari suffix tertinggi across all factors untuk consistency
        const maxSuffix = Math.max(0, ...Array.from(maxSuffixByFactor.values()));
        const newSuffix = maxSuffix + 1;
        
        // Generate new unique names dengan suffix yang sama untuk semua factor scores
        for (const score of factorScores) {
            const match = score.variable_name.match(factorPattern);
            if (match) {
                const factorNum = parseInt(match[1]);
                const newName = `FAC${factorNum}_${newSuffix}`;
                nameMap.set(score.variable_name, newName);
            } else {
                // Jika tidak match pattern (shouldn't happen), keep original name
                nameMap.set(score.variable_name, score.variable_name);
            }
        }
        
        return nameMap;
    }

    describe("generateUniqueFactorNames", () => {
        it("should generate FAC1_1, FAC2_1 when no existing factor columns", () => {
            const existingNames = ["var1", "var2", "var3"];
            const factorScores = [
                { variable_name: "FAC1_1", values: [1, 2, 3] },
                { variable_name: "FAC2_1", values: [4, 5, 6] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            expect(result.get("FAC1_1")).toBe("FAC1_1");
            expect(result.get("FAC2_1")).toBe("FAC2_1");
        });

        it("should generate FAC1_2, FAC2_2 when FAC1_1, FAC2_1 already exist", () => {
            const existingNames = ["var1", "FAC1_1", "FAC2_1", "var2"];
            const factorScores = [
                { variable_name: "FAC1_1", values: [1, 2, 3] },
                { variable_name: "FAC2_1", values: [4, 5, 6] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            expect(result.get("FAC1_1")).toBe("FAC1_2");
            expect(result.get("FAC2_1")).toBe("FAC2_2");
        });

        it("should generate FAC1_3, FAC2_3 when FAC1_2, FAC2_2 already exist", () => {
            const existingNames = ["FAC1_1", "FAC2_1", "FAC1_2", "FAC2_2"];
            const factorScores = [
                { variable_name: "FAC1_1", values: [1, 2, 3] },
                { variable_name: "FAC2_1", values: [4, 5, 6] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            expect(result.get("FAC1_1")).toBe("FAC1_3");
            expect(result.get("FAC2_1")).toBe("FAC2_3");
        });

        it("should handle mixed suffixes and use max suffix + 1", () => {
            const existingNames = ["FAC1_1", "FAC2_3", "FAC3_2"];
            const factorScores = [
                { variable_name: "FAC1_1", values: [1, 2, 3] },
                { variable_name: "FAC2_1", values: [4, 5, 6] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            // Max suffix is 3, so new suffix should be 4
            expect(result.get("FAC1_1")).toBe("FAC1_4");
            expect(result.get("FAC2_1")).toBe("FAC2_4");
        });

        it("should handle 3 factor scores", () => {
            const existingNames = ["FAC1_1", "FAC2_1", "FAC3_1"];
            const factorScores = [
                { variable_name: "FAC1_1", values: [1, 2, 3] },
                { variable_name: "FAC2_1", values: [4, 5, 6] },
                { variable_name: "FAC3_1", values: [7, 8, 9] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            expect(result.get("FAC1_1")).toBe("FAC1_2");
            expect(result.get("FAC2_1")).toBe("FAC2_2");
            expect(result.get("FAC3_1")).toBe("FAC3_2");
        });

        it("should handle non-factor columns mixed in", () => {
            const existingNames = ["var1", "FAC1_1", "var2", "FAC2_1", "var3", "FAC1_2"];
            const factorScores = [
                { variable_name: "FAC1_1", values: [1, 2, 3] },
                { variable_name: "FAC2_1", values: [4, 5, 6] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            expect(result.get("FAC1_1")).toBe("FAC1_3");
            expect(result.get("FAC2_1")).toBe("FAC2_3");
        });

        it("should keep original name for non-pattern matching names", () => {
            const existingNames = ["var1", "var2"];
            const factorScores = [
                { variable_name: "CustomScore", values: [1, 2, 3] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            expect(result.get("CustomScore")).toBe("CustomScore");
        });

        it("should handle empty existing names", () => {
            const existingNames: string[] = [];
            const factorScores = [
                { variable_name: "FAC1_1", values: [1, 2, 3] },
                { variable_name: "FAC2_1", values: [4, 5, 6] },
            ];

            const result = generateUniqueFactorNames(existingNames, factorScores);

            expect(result.get("FAC1_1")).toBe("FAC1_1");
            expect(result.get("FAC2_1")).toBe("FAC2_1");
        });
    });
});
