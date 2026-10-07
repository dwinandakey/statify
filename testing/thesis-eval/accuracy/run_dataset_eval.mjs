// run_dataset_eval.mjs — Track D: orkestrasi evaluasi pada dataset tambahan (SMS Spam UCI dan IndoNLU SmSA).
// Untuk tiap dataset: (1) run_statify.mjs (wasm yang sama dengan aplikasi), (2) sk_compare.py (scikit-learn),
// (3) compare_predictions.py (metrik, kesamaan, matriks konfusi; WEKA dibandingkan bila berkas WEKA ada).
//   - SMS Spam: pembagian stratified 70/30, seed 42 (datasets/sms_spam_{train,test}.csv), konfigurasi K1-K4 (+ varian w).
//   - SmSA   : pembagian resmi IndoNLU (datasets/smsa_{train,test}.csv), konfigurasi K1 dan K4 (+ varian w).
// Pemakaian (dari akar repo):
//   node testing/thesis-eval/accuracy/run_dataset_eval.mjs [--datasets sms_spam,smsa] [--tag win|vm|cloud]
//                                                          [--skip-sklearn] [--skip-compare]
// Log mentah ditulis ke testing/thesis-eval/logs/accuracy_<langkah>_<dataset>_<tag>.txt (UTF-8) bila --tag diberikan;
// tanpa --tag keluaran hanya dicetak. Hanya modul bawaan Node. Tidak menghapus apa pun; berkas keluaran ditimpa.
// Bila python tidak ada atau scikit-learn tidak terpasang, langkah 2 dicatat sebagai "BELUM DIJALANKAN" (bukan gagal diam-diam)
// dan pred_sklearn_*.csv yang sudah ada tetap dipakai oleh langkah 3.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const evalRoot = path.resolve(here, "..");
const repoRoot = path.resolve(evalRoot, "..", "..");
const logDir = path.join(evalRoot, "logs");

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const datasets = arg("--datasets", "sms_spam,smsa").split(",").map((s) => s.trim()).filter(Boolean);
const tag = arg("--tag", null);
const skipSklearn = argv.includes("--skip-sklearn");
const skipCompare = argv.includes("--skip-compare");

function findPython() {
  for (const exe of process.platform === "win32" ? ["python", "py"] : ["python3", "python"]) {
    const r = spawnSync(exe, ["-c", "import sys; print(sys.version.split()[0])"], { encoding: "utf8" });
    if (r.status === 0) return { exe, version: r.stdout.trim() };
  }
  return null;
}

function hasModules(py, mods) {
  const r = spawnSync(py.exe, ["-c", mods.map((m) => `import ${m}`).join(";")], { encoding: "utf8" });
  return r.status === 0;
}

function step(name, ds, exe, args) {
  const t0 = Date.now();
  const r = spawnSync(exe, args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: "1" } });
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  const code = r.status ?? (r.error ? 127 : 1);
  const footer = `\n=== THESIS-EVAL: exit_code=${code} elapsed_s=${((Date.now() - t0) / 1000).toFixed(2)} cmd=${exe} ${args.join(" ")} cwd=${repoRoot} ===\n`;
  process.stdout.write(out + footer);
  if (tag) {
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(path.join(logDir, `accuracy_${name}_${ds}_${tag}.txt`), out + footer, "utf8");
  }
  return code;
}

const results = {};
const py = findPython();
const pyOk = py && hasModules(py, ["numpy", "pandas"]);
const skOk = py && hasModules(py, ["numpy", "pandas", "scipy", "sklearn"]);
console.log(`=== run_dataset_eval.mjs datasets=${datasets.join(",")} tag=${tag ?? "-"} node=${process.version} python=${py ? py.version : "tidak ada"} sklearn=${skOk ? "ada" : "tidak ada"}`);

for (const ds of datasets) {
  const trainCsv = path.join(here, "datasets", `${ds}_train.csv`);
  if (!fs.existsSync(trainCsv)) {
    console.log(`[${ds}] BELUM DIJALANKAN: ${trainCsv} tidak ada (jalankan accuracy/download_datasets.py)`);
    results[`${ds}/statify`] = "BELUM DIJALANKAN (dataset tidak ada)";
    continue;
  }
  const rel = (p) => path.relative(repoRoot, p);
  results[`${ds}/statify`] = step("statify", ds, process.execPath, [rel(path.join(here, "run_statify.mjs")), "--dataset", ds]);
  if (skipSklearn) {
    results[`${ds}/sklearn`] = "dilewati (--skip-sklearn)";
  } else if (!skOk) {
    results[`${ds}/sklearn`] = "BELUM DIJALANKAN (python/scikit-learn tidak tersedia di mesin ini)";
    console.log(`[${ds}] sk_compare.py BELUM DIJALANKAN: python/scikit-learn tidak tersedia; pred_sklearn_*.csv yang ada dipakai.`);
  } else {
    results[`${ds}/sklearn`] = step("sklearn", ds, py.exe, ["-X", "utf8", rel(path.join(here, "sk_compare.py")), "--dataset", ds, "--no-params"]);
  }
  if (skipCompare) {
    results[`${ds}/compare`] = "dilewati (--skip-compare)";
  } else if (!pyOk) {
    results[`${ds}/compare`] = "BELUM DIJALANKAN (python/numpy/pandas tidak tersedia)";
  } else {
    results[`${ds}/compare`] = step("compare", ds, py.exe, ["-X", "utf8", rel(path.join(here, "compare_predictions.py")), "--dataset", ds]);
  }
}

console.log("\n=== ringkasan run_dataset_eval ===");
let bad = 0;
for (const [k, v] of Object.entries(results)) {
  console.log(`  ${k.padEnd(20)} ${v}`);
  if (typeof v === "number" && v !== 0) bad++;
}
process.exit(bad ? 1 : 0);
