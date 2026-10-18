/** @jest-environment jsdom */
/**
 * GLM Multivariate against IBM SPSS 27 (validation/mv-spss).
 *
 * Datasets, SPSS syntax and mapping: testing/glm-mv-reference (README).
 * Fixture: __test__/fixtures/mv-reference-values.json, written by
 * testing/glm-mv-reference/harness/make-fixture.mjs:
 *  - configs.<cfg>.payload: the worker payload the real dialog produced in
 *    the UI run (worker mode, production build);
 *  - values: every SPSS value with its source ("spss: spss-output/<file>,
 *    <table>") and the Statify cell it is compared with. No expected value
 *    comes from Statify. Tolerance |Statify − SPSS| ≤ 0.001.
 *  - not_covered: SPSS values without a Statify counterpart (it.todo).
 */
import fs from "fs";
import path from "path";
import init, {
    MultivariateAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg/wasm";
import { transformMultivariateResult } from "@/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis-formatter";

type Step = string | Record<string, string>;
type Entry = {
    config: string;
    table: string;
    labels: string[];
    field: string;
    spss: number;
    spss_display: boolean;
    source: string;
    statify: { path?: Step[]; scale?: number; formatter?: { title: string; match: Record<string, string>; key: string } };
};

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/mv-reference-values.json"), "utf8"));
const TOL: number = fixture.tolerance;

function getPath(obj: any, steps: Step[]): unknown {
    let cur = obj;
    for (const step of steps) {
        if (cur === undefined || cur === null) return undefined;
        if (typeof step === "object") {
            if (!Array.isArray(cur)) return undefined;
            // Every field of the step must match.
            cur = cur.find((x: any) =>
                Object.entries(step).every(([k, v]) => x[k] === v || (k === "factor_value" && v === "" && x.factor_name === "Overall"))
            );
        } else {
            cur = cur[step];
        }
    }
    return cur;
}

/** Formatted table cell, with the merged (blank) label cells filled down. */
function formattedCell(formatted: any, spec: { title: string; match: Record<string, string>; key: string }): number | undefined {
    const table = formatted.tables.find((t: any) => t.title === spec.title);
    if (!table) return undefined;
    const keys = Object.keys(spec.match);
    const carry: Record<string, string> = {};
    for (const r of table.rows) {
        const row = { ...r };
        keys.forEach((k, i) => {
            if (r[k] !== "" && r[k] !== undefined) {
                carry[k] = r[k];
                keys.slice(i + 1).forEach((kk) => delete carry[kk]);
            }
            row[k] = carry[k];
        });
        if (keys.every((k) => row[k] === spec.match[k])) {
            const v = row[spec.key];
            return v === "" || v === undefined ? undefined : Number(v);
        }
    }
    return undefined;
}

const results: Record<string, { raw: any; formatted: any }> = {};

beforeAll(async () => {
    const wasm = fs.readFileSync(path.join(__dirname, "../rust/pkg/wasm_bg.wasm"));
    await init({ module_or_path: wasm });
    for (const [cfg, c] of Object.entries<any>(fixture.configs)) {
        const p = c.payload;
        const analysis = new MultivariateAnalysis(
            p.dep_data, p.fix_factor_data, p.covar_data, p.wls_data,
            p.dep_data_defs, p.fix_factor_data_defs, p.covar_data_defs, p.wls_data_defs,
            p.config_data
        );
        const raw = analysis.get_formatted_results();
        results[cfg] = { raw, formatted: transformMultivariateResult(raw, [], c.formatter_options) };
    }
});

const groups = new Map<string, Entry[]>();
for (const e of fixture.values as Entry[]) {
    const k = `${e.config} · ${e.table}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
}

describe("GLM Multivariate vs SPSS 27", () => {
    for (const [group, entries] of groups) {
        describe(group, () => {
            it.each(entries.map((e) => [`${e.labels.join(" / ")} · ${e.field}`, e] as const))("%s", (_name, e) => {
                const r = results[e.config];
                const atPath = e.statify.path ? (getPath(r.raw, e.statify.path) as number | undefined) : undefined;
                // scale: Multiple Comparisons (J, I) = −(I, J) (see mapping.mjs).
                const statify = e.statify.path
                    ? (typeof atPath === "number" && e.statify.scale ? atPath * e.statify.scale : atPath)
                    : formattedCell(r.formatted, e.statify.formatter!);
                expect(typeof statify).toBe("number");
                const diff = Math.abs((statify as number) - e.spss);
                if (diff > TOL) {
                    throw new Error(`|Statify − SPSS| = ${diff} > ${TOL}: Statify ${statify}, SPSS ${e.spss} (${e.source})`);
                }
            });
        });
    }
    describe("SPSS values without a Statify counterpart", () => {
        for (const e of fixture.not_covered) {
            it.todo(`${e.config} · ${e.table} · ${e.labels.join(" / ")} · ${e.field}: ${e.reason}`);
        }
    });
});
