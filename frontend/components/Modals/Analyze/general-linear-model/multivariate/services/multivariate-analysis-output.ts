import type { MultivariateFinalResultType } from "@/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate-worker";
import type { Table } from "@/types/Table";
import { useResultStore } from "@/stores/useResultStore";

export async function resultMultivariateAnalysis({
    formattedResult,
}: MultivariateFinalResultType) {
    try {
        const { addLog, addAnalytic, addStatistic } = useResultStore.getState();

        const findTable = (key: string): Table | undefined =>
            formattedResult.tables.find((t: Table) => t.key === key);

        const multivariateAnalysisResult = async () => {
            const logId = await addLog({ log: "Multivariate Analysis" });
            await addAnalytic(logId, {
                title: "Multivariate Analysis Result",
                note: "",
            });

            // ── Between-Subjects Factors ──────────────────────────────────
            const betweenSubjectsFactors = findTable("between_subjects_factors");
            if (betweenSubjectsFactors) {
                const analyticId = await addAnalytic(logId, {
                    title: betweenSubjectsFactors.title,
                    note: betweenSubjectsFactors.note || "",
                });
                await addStatistic(analyticId, {
                    title: betweenSubjectsFactors.title,
                    description: betweenSubjectsFactors.interpretation || betweenSubjectsFactors.title,
                    output_data: JSON.stringify({ tables: [betweenSubjectsFactors] }),
                    components: betweenSubjectsFactors.title,
                });
            }

            // ── Descriptive Statistics (combined table) ───────────────────
            const descTables = formattedResult.tables.filter((t: Table) =>
                t.key === "descriptive_statistics" ||
                t.key.startsWith("descriptive_statistics_")
            );
            for (const table of descTables) {
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Box's M Test ──────────────────────────────────────────────
            const boxMTest = findTable("box_m_test");
            if (boxMTest) {
                const analyticId = await addAnalytic(logId, {
                    title: boxMTest.title,
                    note: boxMTest.note || "",
                });
                await addStatistic(analyticId, {
                    title: boxMTest.title,
                    description: boxMTest.interpretation || boxMTest.title,
                    output_data: JSON.stringify({ tables: [boxMTest] }),
                    components: boxMTest.title,
                });
            }

            // ── Bartlett's Test ───────────────────────────────────────────
            const bartlettTest = findTable("bartlett_test");
            if (bartlettTest) {
                const analyticId = await addAnalytic(logId, {
                    title: bartlettTest.title,
                    note: bartlettTest.note || "",
                });
                await addStatistic(analyticId, {
                    title: bartlettTest.title,
                    description: bartlettTest.interpretation || bartlettTest.title,
                    output_data: JSON.stringify({ tables: [bartlettTest] }),
                    components: bartlettTest.title,
                });
            }

            // ── Levene's Test (combined table) ───────────────────────────
            const leveneTables = formattedResult.tables.filter((t: Table) =>
                t.key === "levene_test" || t.key.startsWith("levene_test_")
            );
            for (const table of leveneTables) {
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Multivariate Tests (Pillai/Wilks/Hotelling/Roy) ───────────
            const multivariateTests = findTable("multivariate_tests");
            if (multivariateTests) {
                const analyticId = await addAnalytic(logId, {
                    title: multivariateTests.title,
                    note: multivariateTests.note || "",
                });
                await addStatistic(analyticId, {
                    title: multivariateTests.title,
                    description: multivariateTests.interpretation || multivariateTests.title,
                    output_data: JSON.stringify({ tables: [multivariateTests] }),
                    components: multivariateTests.title,
                });
            }

            // ── Tests of Between-Subjects Effects (combined table) ───────
            const tbsTable = findTable("tests_between_subjects_effects");
            if (tbsTable) {
                const analyticId = await addAnalytic(logId, {
                    title: tbsTable.title,
                    note: tbsTable.note || "",
                });
                await addStatistic(analyticId, {
                    title: tbsTable.title,
                    description: tbsTable.interpretation || tbsTable.title,
                    output_data: JSON.stringify({ tables: [tbsTable] }),
                    components: tbsTable.title,
                });
            }

            // ── Parameter Estimates ───────────────────────────────────────
            // Formatter emits ONE combined table (key
            // "parameter_estimates_combined") with a Dependent Variable
            // column at position 0, so a single flat navbar entry is
            // enough — per-DV subnavbar would just re-render the same
            // table repeatedly.
            const peCombined = findTable("parameter_estimates_combined");
            if (peCombined) {
                const analyticId = await addAnalytic(logId, {
                    title: peCombined.title,
                    note: peCombined.note || "",
                });
                await addStatistic(analyticId, {
                    title: peCombined.title,
                    description: peCombined.interpretation || peCombined.title,
                    output_data: JSON.stringify({ tables: [peCombined] }),
                    components: peCombined.title,
                });
            }

            // ── Between-Subjects SSCP ─────────────────────────────────────
            const sscpBsTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("between_subjects_sscp_")
            );
            for (const table of sscpBsTables) {
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Residual SSCP Matrix ──────────────────────────────────────
            const residualMatrix = findTable("residual_sscp_matrix");
            if (residualMatrix) {
                const analyticId = await addAnalytic(logId, {
                    title: residualMatrix.title,
                    note: residualMatrix.note || "",
                });
                await addStatistic(analyticId, {
                    title: residualMatrix.title,
                    description: residualMatrix.interpretation || residualMatrix.title,
                    output_data: JSON.stringify({ tables: [residualMatrix] }),
                    components: residualMatrix.title,
                });
            }

            // ── SSCP Matrices ─────────────────────────────────────────────
            const sscpTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("sscp_matrix_")
            );
            for (const table of sscpTables) {
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Contrast Coefficients ─────────────────────────────────────
            const contrastCoef = findTable("contrast_coefficients");
            if (contrastCoef) {
                const analyticId = await addAnalytic(logId, {
                    title: contrastCoef.title,
                    note: contrastCoef.note || "",
                });
                await addStatistic(analyticId, {
                    title: contrastCoef.title,
                    description: contrastCoef.interpretation || contrastCoef.title,
                    output_data: JSON.stringify({ tables: [contrastCoef] }),
                    components: contrastCoef.title,
                });
            }

            // ── Custom Hypothesis Tests (SPSS-compatible) ─────────────────
            //  Emitted by formatCustomHypothesisTests when the user picks any
            //  non-"none" contrast method against a single Fixed Factor.
            const customHypoKeys = [
                "contrast_results_k_matrix",
                "contrast_multivariate_tests",
                "contrast_univariate_tests",
            ];
            for (const key of customHypoKeys) {
                const table = findTable(key);
                if (!table) continue;
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── General Estimable Function ────────────────────────────────
            const gef = findTable("general_estimable_function");
            if (gef) {
                const analyticId = await addAnalytic(logId, {
                    title: gef.title,
                    note: gef.note || "",
                });
                await addStatistic(analyticId, {
                    title: gef.title,
                    description: gef.interpretation || gef.title,
                    output_data: JSON.stringify({ tables: [gef] }),
                    components: gef.title,
                });
            }

            // ── Post Hoc Tests ────────────────────────────────────────────
            // Group every per-factor Multiple Comparisons table under ONE
            // navbar entry so the sidebar reads
            //   Multiple Comparisons (Bonferroni)
            //     ├ faktorA
            //     └ faktorB
            // instead of a separate top-level entry per factor.
            const posthocTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("posthoc_tests_")
            );
            if (posthocTables.length > 0) {
                // Title format from the formatter:
                //   "Multiple Comparisons — {factor}( ({method}))?"
                // The trailing "(method)" is present only when every row in
                // that factor's table shares the same test_type (the common
                // case). Use the first table's method as the group label.
                const titlePattern = /^Multiple Comparisons — (.+?)(?: \((.+?)\))?$/;
                const firstMatch = posthocTables[0].title.match(titlePattern);
                const testMethod = firstMatch?.[2] || null;
                const parentTitle = testMethod
                    ? `Multiple Comparisons (${testMethod})`
                    : "Multiple Comparisons";

                const parentAnalyticId = await addAnalytic(logId, {
                    title: parentTitle,
                    note: posthocTables[0].note || "",
                });

                for (const table of posthocTables) {
                    const m = table.title.match(titlePattern);
                    const factorLabel = m?.[1]?.trim() || table.title;
                    await addStatistic(parentAnalyticId, {
                        title: factorLabel,
                        description: table.interpretation || table.title,
                        output_data: JSON.stringify({ tables: [table] }),
                        components: factorLabel,
                    });
                }
            }

            // ── Homogeneous Subsets ───────────────────────────────────────
            const homogSubsetsTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("homogeneous_subsets_")
            );
            for (const table of homogSubsetsTables) {
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Estimated Marginal Means ──────────────────────────────────
            const emmeansTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("emmeans_")
            );
            for (const table of emmeansTables) {
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Spread vs. Level ──────────────────────────────────────────
            const svrTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("spread_vs_level_")
            );
            for (const table of svrTables) {
                const analyticId = await addAnalytic(logId, {
                    title: table.title,
                    note: table.note || "",
                });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Observed × Predicted × Std. Residual Plot Matrix ──────────
            // Emitted by formatResidualPlots when the user ticks
            // "Residual plot" in the Options dialog. One Chart per DV,
            // chartType "Scatter Plot Matrix" — a 3×3 SPLOM rendered by
            // GeneralChartContainer via scatterMatrixUtils.
            //
            // Group every per-DV matrix under a single navbar entry so the
            // sidebar reads
            //   Observed × Predicted × Std. Residual Plots
            //     ├ ultimate torque
            //     └ ultimate strain
            // instead of one separate entry per DV.
            const residualCharts = (formattedResult.charts ?? []).filter(
                (c: any) =>
                    c?.chartType === "Scatter Plot Matrix" &&
                    typeof c?.chartMetadata?.title === "string" &&
                    c.chartMetadata.title.startsWith(
                        "Observed × Predicted × Std. Residual"
                    )
            );
            if (residualCharts.length > 0) {
                const parentAnalyticId = await addAnalytic(logId, {
                    title: "Observed × Predicted × Std. Residual Plots",
                    note: residualCharts[0]?.chartMetadata?.notes || "",
                });

                // Title format from the formatter:
                //   "Observed × Predicted × Std. Residual — {dvLabel}"
                const titlePattern = /— (.+)$/;
                for (const chart of residualCharts) {
                    const m = (chart.chartMetadata.title as string).match(
                        titlePattern
                    );
                    const dvLabel = m?.[1]?.trim() || chart.chartMetadata.title;
                    await addStatistic(parentAnalyticId, {
                        title: dvLabel,
                        description:
                            chart.chartMetadata.description ||
                            chart.chartMetadata.title,
                        output_data: JSON.stringify({ charts: [chart] }),
                        components: chart.chartType,
                    });
                }
            }

            // ── Error Table ───────────────────────────────────────────────
            const errorTable = findTable("error_table");
            if (errorTable) {
                const analyticId = await addAnalytic(logId, {
                    title: errorTable.title,
                    note: errorTable.note || "",
                });
                await addStatistic(analyticId, {
                    title: errorTable.title,
                    description: errorTable.interpretation || "Errors logs from the analysis.",
                    output_data: JSON.stringify({ tables: [errorTable] }),
                    components: "Errors Logs",
                });
            }
        };

        await multivariateAnalysisResult();
    } catch (e) {
        console.error(e);
    }
}
