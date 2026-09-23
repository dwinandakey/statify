// Writes the Jest fixture of the GLM Multivariate reference test:
//   frontend/components/Modals/Analyze/general-linear-model/multivariate/__test__/fixtures/mv-reference-values.json
//
// - configs.<cfg>.payload: the worker payload the REAL dialog produced in the
//   UI run (statify-output/<cfg>.raw.json, request.payload), so the test feeds
//   the WASM exactly what the UI sent (sliced data, dialog config).
// - values: every SPSS value (spss-output/spss-values.json) with its source
//   and the Statify cell it is compared with (mapping.mjs). No expected value
//   comes from Statify.
// - not_covered: SPSS values without a Statify counterpart.
//
// Usage (repo root): node testing/glm-mv-reference/harness/make-fixture.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { locate } from "./mapping.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const RUN = path.join(ROOT, "results/spss-validation/statify-output");
const OUT = path.join(ROOT, "../../frontend/components/Modals/Analyze/general-linear-model/multivariate/__test__/fixtures/mv-reference-values.json");
const spss = JSON.parse(fs.readFileSync(path.join(ROOT, "spss-output/spss-values.json"), "utf8"));

// Options multivariate-analysis.ts passes to transformMultivariateResult for
// these dialog settings (only the Total row is read from the formatter).
const FORMATTER = {
    mv1: { testValues: [20, 200, 150, 3], varianceMode: "Pooled", factor: null, pairedMode: null },
    mv2: { testValues: null, varianceMode: "Pooled", factor: "jk", pairedMode: null },
    mv3: { testValues: [0, 0], varianceMode: "Pooled", factor: null, pairedMode: { pairs: [["kedalaman1", "kedalaman2"], ["ukuran1", "ukuran2"]], delta0: [0, 0] } },
    mv4: { testValues: null, varianceMode: "Pooled", factor: "treatment", pairedMode: null },
    mv5: { testValues: null, varianceMode: "Pooled", factor: null, pairedMode: null },
    mv6: { testValues: null, varianceMode: "Pooled", factor: null, pairedMode: null },
    mv7: { testValues: null, varianceMode: "Pooled", factor: "jk", pairedMode: null },
};
const SYNTAX = { mv1: "spss/mv1_satu_populasi.sps", mv2: "spss/mv2_dua_populasi.sps", mv3: "spss/mv3_berpasangan.sps", mv4: "spss/mv4_one_way.sps", mv5: "spss/mv5_two_way.sps", mv6: "spss/mv6_two_way_tak_seimbang.sps", mv7: "spss/mv7_one_way_nilai_hilang.sps" };

const configs = {};
for (const cfg of Object.keys(FORMATTER).filter((c) => fs.existsSync(path.join(RUN, `${c}.raw.json`)))) {
    const raw = JSON.parse(fs.readFileSync(path.join(RUN, `${cfg}.raw.json`), "utf8"));
    configs[cfg] = { spss_syntax: `testing/glm-mv-reference/${SYNTAX[cfg]}`, payload: raw.request.payload, formatter_options: FORMATTER[cfg] };
}
const values = [];
const notCovered = [];
for (const e of spss.filter((x) => configs[x.config])) {
    const loc = locate(e);
    const entry = { config: e.config, table: e.table, labels: e.labels, field: e.field, spss: e.value, spss_display: e.display, source: e.source };
    if (loc.missing) notCovered.push({ ...entry, reason: loc.missing });
    else values.push({ ...entry, statify: loc.path ? { path: loc.path } : { formatter: loc.formatter } });
}
const fixture = {
    description: "GLM Multivariate vs IBM SPSS 27 (testing/glm-mv-reference). Every expected value is SPSS output run by the user; payloads are the worker payloads of the UI run (worker mode, production build).",
    tolerance: 0.001,
    configs,
    values,
    not_covered: notCovered,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(fixture, null, 1) + "\n");
console.log(`values ${values.length}, not_covered ${notCovered.length} -> ${path.relative(process.cwd(), OUT)}`);
