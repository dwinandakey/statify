/** @jest-environment node */

import {
    transformMultivariateResult,
    type MultivariateFormatterOptions,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis-formatter";

// Synthetic Rust-output payload that mirrors what the WASM pipeline produces
// for the Modul 4A APG STIS dataset analysed in long format with `jenispelapis`
// as a single Fixed Factor (2 levels × 15 lokasi = 30 rows, 2 DVs).
// All numeric values are taken straight from the user's SPSS Custom Hypothesis
// Tests output and the matching Statify GLM Multivariate run.
function makeApgModul4aData() {
    return {
        between_subjects_factors: {
            jenispelapis: {
                value_counts: { "1": 15, "2": 15 },
            },
        },
        descriptive_statistics: {
            kedalaman: {
                groups: [
                    { factor_value: "1", stats: { mean: 54.2, std_deviation: 11.0, n: 15 } },
                    { factor_value: "2", stats: { mean: 46.2, std_deviation: 11.2, n: 15 } },
                ],
            },
            ukuran: {
                groups: [
                    { factor_value: "1", stats: { mean: 26.2, std_deviation: 7.2, n: 15 } },
                    { factor_value: "2", stats: { mean: 23.133, std_deviation: 8.9, n: 15 } },
                ],
            },
        },
        tests_of_between_subjects_effects: {
            effects: {
                kedalaman: {
                    jenispelapis: {
                        sum_of_squares: 480.0,
                        df: 1,
                        mean_square: 480.0,
                        f_value: 3.839,
                        significance: 0.0600,
                    },
                    Error: {
                        sum_of_squares: 3500.8,
                        df: 28,
                        mean_square: 125.029,
                    },
                },
                ukuran: {
                    jenispelapis: {
                        sum_of_squares: 70.533,
                        df: 1,
                        mean_square: 70.533,
                        f_value: 1.069,
                        significance: 0.3100,
                    },
                    Error: {
                        sum_of_squares: 1848.133,
                        df: 28,
                        mean_square: 66.005,
                    },
                },
            },
        },
        multivariate_tests: {
            effects: {
                jenispelapis: {
                    "Pillai's Trace": {
                        value: 0.151,
                        f: 2.408,
                        hypothesis_df: 2,
                        error_df: 27,
                        significance: 0.109,
                    },
                    "Wilks' Lambda": {
                        value: 0.849,
                        f: 2.408,
                        hypothesis_df: 2,
                        error_df: 27,
                        significance: 0.109,
                    },
                    "Hotelling's Trace": {
                        value: 0.178,
                        f: 2.408,
                        hypothesis_df: 2,
                        error_df: 27,
                        significance: 0.109,
                    },
                    "Roy's Largest Root": {
                        value: 0.178,
                        f: 2.408,
                        hypothesis_df: 2,
                        error_df: 27,
                        significance: 0.109,
                    },
                },
            },
        },
        // Trigger formatContrastCoefficients too so the standard L matrix table
        // keeps appearing alongside the new K matrix.
        contrast_coefficients: {
            parameter: ["Intercept", "jenispelapis=1", "jenispelapis=2"],
            coefficients: [1, -1, 1],
        },
    };
}

describe("Custom Hypothesis Tests — Modul 4A APG STIS", () => {
    const baseOptions: MultivariateFormatterOptions = {
        contrastInfo: {
            factor: "jenispelapis",
            method: "difference",
            first: false,
        },
    };

    it("emits the K-Matrix with SPSS-matching numbers", () => {
        const res = transformMultivariateResult(
            makeApgModul4aData(),
            [],
            baseOptions
        );
        const kMatrix = res.tables.find(
            (t) => t.key === "contrast_results_k_matrix"
        );
        expect(kMatrix).toBeDefined();
        // 7 rows × 1 contrast row (Level 2 vs Level 1).
        expect(kMatrix!.rows).toHaveLength(7);

        const byLabel = (lbl: string) =>
            kMatrix!.rows.find((r) => r.stat_label === lbl);
        const num = (x: unknown): number => Number(x);

        // Contrast Estimate: kedalaman = μ_L2 − μ_L1 = 46.2 − 54.2 = −8.000
        const estimate = byLabel("Contrast Estimate")!;
        expect(estimate.contrast_label).toBe("Level 2 vs. Level 1");
        expect(num(estimate.dv_kedalaman)).toBeCloseTo(-8.0, 3);
        // ukuran = 23.133 − 26.2 = −3.067
        expect(num(estimate.dv_ukuran)).toBeCloseTo(-3.067, 3);

        const hypothesised = byLabel("Hypothesized Value")!;
        expect(num(hypothesised.dv_kedalaman)).toBe(0);

        // Difference equals the contrast estimate (hyp value = 0).
        const diff = byLabel("Difference (Estimate − Hypothesized)")!;
        expect(num(diff.dv_kedalaman)).toBeCloseTo(-8.0, 3);

        // Std. Error: √(125.029 × 2/15) = 4.083
        const se = byLabel("Std. Error")!;
        expect(num(se.dv_kedalaman)).toBeCloseTo(4.083, 3);
        // ukuran: √(66.005 × 2/15) = 2.967
        expect(num(se.dv_ukuran)).toBeCloseTo(2.967, 3);

        // Sig.: t = −8/4.083 = −1.960, p two-sided df=28 ≈ .060
        const sig = byLabel("Sig.")!;
        // formatSig may strip the leading zero — read with parseFloat.
        expect(parseFloat(String(sig.dv_kedalaman))).toBeCloseTo(0.06, 2);
        expect(parseFloat(String(sig.dv_ukuran))).toBeCloseTo(0.31, 2);

        // 95% CI: −8 ± 2.0484×4.083 = (−16.364, .364)
        const lower = byLabel("95% Confidence Interval — Lower Bound")!;
        const upper = byLabel("95% Confidence Interval — Upper Bound")!;
        // CI bounds depend on the same SE rounded in the SPSS fixture; allow
        // 0.01 tolerance for the ukuran DV whose mean carries only 3 decimals.
        expect(num(lower.dv_kedalaman)).toBeCloseTo(-16.364, 3);
        expect(num(upper.dv_kedalaman)).toBeCloseTo(0.364, 3);
        expect(num(lower.dv_ukuran)).toBeCloseTo(-9.143, 2);
        expect(num(upper.dv_ukuran)).toBeCloseTo(3.010, 2);
    });

    it("emits the Multivariate Test Results table reusing the factor's joint test", () => {
        const res = transformMultivariateResult(
            makeApgModul4aData(),
            [],
            baseOptions
        );
        const mv = res.tables.find(
            (t) => t.key === "contrast_multivariate_tests"
        );
        expect(mv).toBeDefined();
        expect(mv!.rows).toHaveLength(4);

        const pillai = mv!.rows.find((r) => r.test_name === "Pillai's trace")!;
        expect(Number(pillai.f)).toBeCloseTo(2.408, 3);
        expect(Number(pillai.hypothesis_df)).toBe(2);
        expect(Number(pillai.error_df)).toBe(27);
        expect(parseFloat(String(pillai.significance))).toBeCloseTo(0.109, 3);
    });

    it("emits the Univariate Test Results table partitioned per DV", () => {
        const res = transformMultivariateResult(
            makeApgModul4aData(),
            [],
            baseOptions
        );
        const u = res.tables.find(
            (t) => t.key === "contrast_univariate_tests"
        );
        expect(u).toBeDefined();
        // 2 contrast rows (kedalaman + ukuran) + 2 error rows = 4 total
        expect(u!.rows).toHaveLength(4);

        const kContrast = u!.rows[0];
        expect(kContrast.source).toBe("Contrast");
        expect(kContrast.dependent_variable).toBe("kedalaman");
        expect(Number(kContrast.sum_of_squares)).toBeCloseTo(480.0, 3);
        expect(String(kContrast.df)).toBe("1");
        expect(Number(kContrast.mean_square)).toBeCloseTo(480.0, 3);
        expect(Number(kContrast.f_value)).toBeCloseTo(3.839, 3);

        const uContrast = u!.rows[1];
        expect(uContrast.source).toBe("");
        expect(uContrast.dependent_variable).toBe("ukuran");
        expect(Number(uContrast.sum_of_squares)).toBeCloseTo(70.533, 3);

        const kError = u!.rows[2];
        expect(kError.source).toBe("Error");
        expect(Number(kError.sum_of_squares)).toBeCloseTo(3500.8, 1);
        expect(String(kError.df)).toBe("28");
    });

    it("does NOT emit the custom hypothesis tables when contrast method is 'none'", () => {
        const res = transformMultivariateResult(
            makeApgModul4aData(),
            [],
            {
                contrastInfo: {
                    factor: "jenispelapis",
                    method: "none",
                    first: false,
                },
            }
        );
        expect(
            res.tables.find((t) => t.key === "contrast_results_k_matrix")
        ).toBeUndefined();
        expect(
            res.tables.find((t) => t.key === "contrast_multivariate_tests")
        ).toBeUndefined();
        expect(
            res.tables.find((t) => t.key === "contrast_univariate_tests")
        ).toBeUndefined();
    });

    it("does NOT emit the custom hypothesis tables when contrastInfo is null", () => {
        const res = transformMultivariateResult(makeApgModul4aData(), [], {});
        expect(
            res.tables.find((t) => t.key === "contrast_results_k_matrix")
        ).toBeUndefined();
    });

    it("does NOT emit the custom hypothesis tables for the factor without between-subjects data", () => {
        const data = makeApgModul4aData();
        // Mimic a paired-mode run where Rust never emits between_subjects_factors.
        (data as any).between_subjects_factors = undefined;
        const res = transformMultivariateResult(data, [], baseOptions);
        expect(
            res.tables.find((t) => t.key === "contrast_results_k_matrix")
        ).toBeUndefined();
    });

    it("handles HashMap-as-Map serialisation from serde_wasm_bindgen", () => {
        // serde_wasm_bindgen sometimes returns Rust HashMaps as `Map` instances
        // rather than plain objects. The formatter must walk those transparently.
        const data = makeApgModul4aData();
        const asMap = (obj: Record<string, any>): Map<string, any> => {
            const m = new Map<string, any>();
            Object.entries(obj).forEach(([k, v]) => m.set(k, v));
            return m;
        };
        // Convert every level that the formatter touches into a Map.
        const bsf = data.between_subjects_factors.jenispelapis;
        (data as any).between_subjects_factors = asMap({
            jenispelapis: {
                ...bsf,
                value_counts: asMap(bsf.value_counts as any),
            },
        });
        (data as any).descriptive_statistics = asMap(data.descriptive_statistics as any);
        (data as any).tests_of_between_subjects_effects.effects = asMap(
            Object.fromEntries(
                Object.entries(
                    data.tests_of_between_subjects_effects.effects
                ).map(([dv, sources]) => [dv, asMap(sources as any)])
            )
        );
        (data as any).multivariate_tests.effects = asMap({
            jenispelapis: asMap(
                data.multivariate_tests.effects.jenispelapis as any
            ),
        });

        const res = transformMultivariateResult(data, [], baseOptions);
        const kMatrix = res.tables.find(
            (t) => t.key === "contrast_results_k_matrix"
        );
        expect(kMatrix).toBeDefined();
        expect(kMatrix!.rows).toHaveLength(7);

        const estimate = kMatrix!.rows.find(
            (r) => r.stat_label === "Contrast Estimate"
        )!;
        expect(Number(estimate.dv_kedalaman)).toBeCloseTo(-8.0, 3);
        expect(Number(estimate.dv_ukuran)).toBeCloseTo(-3.067, 3);

        const mv = res.tables.find(
            (t) => t.key === "contrast_multivariate_tests"
        );
        expect(mv).toBeDefined();
        expect(mv!.rows).toHaveLength(4);

        const u = res.tables.find(
            (t) => t.key === "contrast_univariate_tests"
        );
        expect(u).toBeDefined();
        expect(u!.rows).toHaveLength(4);
    });
});
