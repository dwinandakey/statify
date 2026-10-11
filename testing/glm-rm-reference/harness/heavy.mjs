// Synthetic within-only designs of the Web Worker experiment
// (testing/glm-web-worker/experiment/datasets.cjs), e.g. "L10M1" = time with
// 10 levels × 1 measure, "L10M2" = 10 levels × 2 measures, n = 2500 by default,
// options DescStats + EstEffectSize + ObsPower (experiment 2 configuration).
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { repeatedMeasuresRows, repeatedMeasuresColumns } = require("../../glm-web-worker/experiment/datasets.cjs");

export function heavyDesign(key, n = 2500) {
    const m = key.match(/^L(\d+)M(\d+)(?:n(\d+))?$/);
    if (!m) throw new Error(`unknown design ${key}`);
    const L = Number(m[1]), M = Number(m[2]);
    if (m[3]) n = Number(m[3]);
    const { rows } = repeatedMeasuresRows(n, L, M);
    const cols = repeatedMeasuresColumns(L, M);
    const measures = Array.from({ length: M }, (_, i) => ({
        name: i === 0 ? "score" : `score${i + 1}`,
        columns: cols.slice(i * L, (i + 1) * L),
    }));
    return {
        rows,
        design: {
            factors: [{ name: "time", levels: L }],
            measures,
            options: { DescStats: true, EstEffectSize: true, ObsPower: true },
        },
    };
}
