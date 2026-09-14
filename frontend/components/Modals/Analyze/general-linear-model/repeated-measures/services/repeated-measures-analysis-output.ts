import type { RepeatedMeasuresFinalResultType } from "@/components/Modals/Analyze/general-linear-model/repeated-measures/types/repeated-measures-worker";
import type { Table } from "@/types/Table";
import { useResultStore } from "@/stores/useResultStore";

export async function resultRepeatedMeasures({
    formattedResult,
}: RepeatedMeasuresFinalResultType) {
    try {
        const { addLog, addAnalytic, addStatistic } = useResultStore.getState();

        const findTable = (key: string): Table | undefined =>
            formattedResult.tables.find((t: Table) => t.key === key);

        const rmResult = async () => {
            const logId = await addLog({ log: "Repeated Measures Analysis" });
            await addAnalytic(logId, {
                title: "Repeated Measures (GLM) Result",
                note: "",
            });

            // ── Within-Subjects Factors ───────────────────────────────────
            const wsfTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("within_subjects_factors_")
            );
            for (const table of wsfTables) {
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Descriptive Statistics ────────────────────────────────────
            const descTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("descriptive_statistics_")
            );
            for (const table of descTables) {
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Bartlett's Test ───────────────────────────────────────────
            const bartlettTest = findTable("bartlett_test");
            if (bartlettTest) {
                const analyticId = await addAnalytic(logId, { title: bartlettTest.title, note: bartlettTest.note || "" });
                await addStatistic(analyticId, {
                    title: bartlettTest.title,
                    description: bartlettTest.interpretation || bartlettTest.title,
                    output_data: JSON.stringify({ tables: [bartlettTest] }),
                    components: bartlettTest.title,
                });
            }

            // ── Multivariate Tests ────────────────────────────────────────
            const multivariateTests = findTable("multivariate_tests");
            if (multivariateTests) {
                const analyticId = await addAnalytic(logId, { title: multivariateTests.title, note: multivariateTests.note || "" });
                await addStatistic(analyticId, {
                    title: multivariateTests.title,
                    description: multivariateTests.interpretation || multivariateTests.title,
                    output_data: JSON.stringify({ tables: [multivariateTests] }),
                    components: multivariateTests.title,
                });
            }

            // ── Mauchly's Test ────────────────────────────────────────────
            const mauchlyTest = findTable("mauchly_test");
            if (mauchlyTest) {
                const analyticId = await addAnalytic(logId, { title: mauchlyTest.title, note: mauchlyTest.note || "" });
                await addStatistic(analyticId, {
                    title: mauchlyTest.title,
                    description: mauchlyTest.interpretation || mauchlyTest.title,
                    output_data: JSON.stringify({ tables: [mauchlyTest] }),
                    components: mauchlyTest.title,
                });
            }

            // ── Tests of Within-Subjects Effects ──────────────────────────
            const wseTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("tests_within_subjects_effects_")
            );
            for (const table of wseTables) {
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Tests of Within-Subjects Contrasts ────────────────────────
            const wscTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("tests_within_subjects_contrasts_")
            );
            for (const table of wscTables) {
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Tests of Between-Subjects Effects ─────────────────────────
            const bseTables = findTable("tests_between_subjects_effects");
            if (bseTables) {
                const analyticId = await addAnalytic(logId, { title: bseTables.title, note: bseTables.note || "" });
                await addStatistic(analyticId, {
                    title: bseTables.title,
                    description: bseTables.interpretation || bseTables.title,
                    output_data: JSON.stringify({ tables: [bseTables] }),
                    components: bseTables.title,
                });
            }

            // ── Parameter Estimates ───────────────────────────────────────
            const peTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("parameter_estimates_")
            );
            for (const table of peTables) {
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
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
                const analyticId = await addAnalytic(logId, { title: gef.title, note: gef.note || "" });
                await addStatistic(analyticId, {
                    title: gef.title,
                    description: gef.interpretation || gef.title,
                    output_data: JSON.stringify({ tables: [gef] }),
                    components: gef.title,
                });
            }

            // ── Residual SSCP Matrix ──────────────────────────────────────
            const residualMatrix = findTable("residual_sscp_matrix");
            if (residualMatrix) {
                const analyticId = await addAnalytic(logId, { title: residualMatrix.title, note: residualMatrix.note || "" });
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
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Univariate Tests ──────────────────────────────────────────
            const uniTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("univariate_tests_")
            );
            for (const table of uniTables) {
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Post-Hoc Tests ────────────────────────────────────────────
            const posthocTables = formattedResult.tables.filter((t: Table) =>
                t.key.startsWith("posthoc_tests_")
            );
            for (const table of posthocTables) {
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
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
                const analyticId = await addAnalytic(logId, { title: table.title, note: table.note || "" });
                await addStatistic(analyticId, {
                    title: table.title,
                    description: table.interpretation || table.title,
                    output_data: JSON.stringify({ tables: [table] }),
                    components: table.title,
                });
            }

            // ── Error Table ───────────────────────────────────────────────
            const errorTable = findTable("error_table");
            if (errorTable) {
                const analyticId = await addAnalytic(logId, { title: errorTable.title, note: errorTable.note || "" });
                await addStatistic(analyticId, {
                    title: errorTable.title,
                    description: errorTable.interpretation || "Errors logs from the analysis.",
                    output_data: JSON.stringify({ tables: [errorTable] }),
                    components: "Errors Logs",
                });
            }
        };

        await rmResult();
    } catch (e) {
        console.error(e);
    }
}
