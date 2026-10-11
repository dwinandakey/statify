// Uji χ² Σ diketahui (Bagian 1): jalankan get_known_covariance_test() paket
// WASM MV pada payload worker yang ditangkap (ui-run.cjs, *.raw.json) dan
// simpan hasilnya untuk dibandingkan dengan R (testing/final/r/known-sigma.R).
//
// Pemakaian (root repo):
//   node testing/final/harness/known-sigma-wasm.mjs [dir pkg] [out.json]
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const pkgDir = process.argv[2] ?? "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg";
const outFile = process.argv[3] ?? "testing/final/bagian1/known-sigma-statify.json";
const RAW = "testing/glm-mv-reference/results/fix-steps/step21-v5/worker";

const plain = (x) =>
    x instanceof Map ? Object.fromEntries([...x].map(([k, v]) => [k, plain(v)]))
        : Array.isArray(x) ? x.map(plain)
            : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)])) : x;

// Σ sebagai segitiga atas (termasuk diagonal), seperti diisi di dialog.
const full = (upper) => {
    const p = upper.length;
    return Array.from({ length: p }, (_, i) =>
        Array.from({ length: p }, (_, j) => (j >= i ? upper[i][j - i] : upper[j][i - j])));
};
const SIGMA_A = full([[36, -630, -320, -5], [15000, 6700, 107], [4700, 44], [1]]);
const SIGMA_B = full([[7, 6, 5, 5], [16, 8, 6], [29, 14], [22]]);
const SIGMA_1 = full([[5, 4.5, 6.5, 5], [13, 7, 6], [29, 14], [17]]);
const SIGMA_2 = full([[9, 7.5, 4.5, 4], [19, 9.5, 5.5], [29, 13], [28]]);
const SIGMA_D = full([[120, 17], [22]]);
const I = (p) => Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j ? 1 : 0)));

// Kovarians sampel (pembagi n − 1) per kelompok, dari payload.
function sampleCov(payload, level) {
    const dv = payload.config_data.main.DepVar;
    const ff = payload.config_data.main.FixFactor ?? [];
    const rows = [];
    const n = payload.dep_data[0].length;
    for (let r = 0; r < n; r++) {
        if (level !== undefined && String(payload.fix_factor_data[0][r]?.[ff[0]]) !== level) continue;
        const x = dv.map((name, k) => payload.dep_data[k][r]?.[name]);
        if (x.every((v) => typeof v === "number" && Number.isFinite(v))) rows.push(x);
    }
    const p = dv.length;
    const m = Array(p).fill(0);
    rows.forEach((x) => x.forEach((v, i) => (m[i] += v / rows.length)));
    return Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) =>
        rows.reduce((s, x) => s + (x[i] - m[i]) * (x[j] - m[j]), 0) / (rows.length - 1)));
}
function pooledCov(payload) {
    const s1 = sampleCov(payload, "1"), s2 = sampleCov(payload, "2");
    // mv2: n₁ = n₂ = 32 → pooled = rata-rata.
    return s1.map((r, i) => r.map((v, j) => (v + s2[i][j]) / 2));
}

// data/delta0 untuk R: berkas CSV asli dan δ₀ (ui-run.cjs).
const CASES = [
    { id: "K1", cfg: "mv1", csv: "hotelling 1 populasi.csv", design: "one_sample", sigma: SIGMA_A, note: "satu populasi, Σ_A" },
    { id: "K1-a10", cfg: "mv1ci10", csv: "hotelling 1 populasi.csv", design: "one_sample", sigma: SIGMA_A, note: "satu populasi, Σ_A, α = 0,10" },
    { id: "K1-S", cfg: "mv1", csv: "hotelling 1 populasi.csv", design: "one_sample", sigma: "S", note: "sifat: Σ = S → χ² = T²" },
    { id: "K1-I", cfg: "mv1", csv: "hotelling 1 populasi.csv", design: "one_sample", sigma: "I", note: "sifat: Σ = I → χ² = n·Σ(x̄ − μ₀)²" },
    { id: "K2", cfg: "mv2", csv: "hotelling 2 populasi independen.csv", design: "two_sample_common", sigma: SIGMA_B, delta0: [0, 0, 0, 0], note: "dua populasi, Σ₁ = Σ₂ = Σ_B" },
    { id: "K2-d", cfg: "mv2d", csv: "hotelling 2 populasi independen.csv", design: "two_sample_common", sigma: SIGMA_B, delta0: [3, 2, 10, 1], note: "dua populasi, Σ_B, δ₀ = [3, 2, 10, 1]" },
    { id: "K2-S", cfg: "mv2", csv: "hotelling 2 populasi independen.csv", design: "two_sample_common", sigma: "Spooled", delta0: [0, 0, 0, 0], note: "sifat: Σ = S_pooled → χ² = T² dua populasi" },
    { id: "K3", cfg: "mv2", csv: "hotelling 2 populasi independen.csv", design: "two_sample_separate", sigma1: SIGMA_1, sigma2: SIGMA_2, delta0: [0, 0, 0, 0], note: "dua populasi, Σ₁ dan Σ₂" },
    { id: "K3-d", cfg: "mv2wd", csv: "hotelling 2 populasi independen.csv", design: "two_sample_separate", sigma1: SIGMA_1, sigma2: SIGMA_2, delta0: [3, 2, 10, 1], note: "dua populasi, Σ₁ dan Σ₂, δ₀ = [3, 2, 10, 1]" },
    { id: "K4", cfg: "mv3d", csv: "hotelling berpasangan (data asli).csv", design: "one_sample", paired: true, sigma: SIGMA_D, note: "berpasangan, Σd, δ₀ = [8, 3]" },
    { id: "K4-0", cfg: "mv3", csv: "hotelling berpasangan (data asli).csv", design: "one_sample", paired: true, sigma: SIGMA_D, note: "berpasangan, Σd, δ₀ = 0" },
    { id: "K4-S", cfg: "mv3d", csv: "hotelling berpasangan (data asli).csv", design: "one_sample", paired: true, sigma: "S", note: "sifat: Σd = Sd → χ² = T² berpasangan" },
];

const bytes = fs.readFileSync(path.resolve(pkgDir, "wasm_bg.wasm"));
const mod = await import(pathToFileURL(path.resolve(pkgDir, "wasm.js")).href);
await mod.default({ module_or_path: bytes });

const out = [];
for (const c of CASES) {
    const raw = JSON.parse(fs.readFileSync(path.join(RAW, `${c.cfg}.raw.json`), "utf8"));
    const p = raw.request.payload;
    const known = { design: c.design };
    if (c.design === "two_sample_separate") {
        known.sigma1 = c.sigma1;
        known.sigma2 = c.sigma2;
    } else {
        known.sigma = c.sigma === "S" ? sampleCov(p) : c.sigma === "Spooled" ? pooledCov(p) : c.sigma === "I" ? I(p.config_data.main.DepVar.length) : c.sigma;
    }
    const a = new mod.MultivariateAnalysis(p.dep_data, p.fix_factor_data, p.covar_data, p.wls_data, p.dep_data_defs, p.fix_factor_data_defs, p.covar_data_defs, p.wls_data_defs, p.config_data);
    const results = plain(a.get_formatted_results());
    const test = plain(a.get_known_covariance_test(known));
    const errors = a.get_all_errors();
    a.free();
    const effects = results?.multivariate_tests?.effects ?? {};
    const effectName = c.design === "one_sample" ? "Intercept" : (p.config_data.main.FixFactor ?? [])[0];
    const trace = effects?.[effectName]?.["Hotelling's Trace"]?.value;
    // T² dari Multivariate Tests: (n − 1)·trace (satu sampel), (n₁ + n₂ − 2)·trace (dua sampel, Pooled).
    const nTot = (test?.sample_sizes ?? []).reduce((s, v) => s + v, 0);
    // Mode Welch: nilai Hotelling's Trace sudah berupa T² (Krishnamoorthy–Yu).
    const welch = p.config_data.main.VarianceMode === "Welch" && c.design !== "one_sample";
    const t2 = !Number.isFinite(trace) ? null : welch ? trace : trace * (c.design === "one_sample" ? nTot - 1 : nTot - 2);
    out.push({
        ...c,
        sigma: known.sigma ?? null,
        mu0: p.config_data.main.TestValues ?? null,
        alpha: p.config_data.options.SigLevel ?? 0.05,
        pairs: c.paired ? [["kedalaman1", "kedalaman2"], ["ukuran1", "ukuran2"]] : null,
        dep: c.paired ? null : p.config_data.main.DepVar,
        factor: (p.config_data.main.FixFactor ?? [])[0] ?? null,
        statify: test,
        t2_multivariate_tests: t2,
        errors: String(errors),
    });
    console.log(`${c.id}: χ² = ${test?.chi_square}, Sig. = ${test?.significance}${t2 !== null ? `, T² (Multivariate Tests) = ${t2}` : ""}`);
}
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`ditulis: ${outFile}`);
